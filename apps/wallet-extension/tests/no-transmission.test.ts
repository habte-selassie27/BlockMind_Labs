/**
 * ADR-011 invariant 4 — "No transmission".
 *
 * Invariants 1, 2, 3 and 5 are each guarded by unit tests. Invariant 4 was only ever
 * verified by reading the code and grepping for `console.` — i.e. by a human's attention.
 * This file turns it into a machine-checked guard.
 *
 * It wires the REAL `RpcClient` and the REAL Scam Shield implementation to a recording
 * fetch, drives the complete lifecycle the wallet supports (import → unlock → connect →
 * read → add token → contract interaction with simulation + Scam Shield → confirm → sign
 * → broadcast → message signature → key export), and then asserts that nothing that left
 * the process contains the mnemonic, any single mnemonic word, the derived private key, or
 * the vault password.
 *
 * If a future change routes key material through a network call or a log line, this fails.
 */
import { describe, expect, it, vi } from 'vitest';
import { bytesToHex } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { createMemoryStore } from '../src/lib/storage';
import type { ProviderRequestMessage } from '../src/lib/messages';
import { RpcClient } from '../src/lib/rpc';
import { encodeErc20Transfer } from '../src/lib/tokens';
import { Dispatcher, type ProviderOutcome } from '../src/runtime/dispatcher';
import { VaultStore } from '../src/runtime/vault-store';
import { createScamShield } from '../src/safety/scamshield';
import { abiString, abiUint } from './helpers';

const ORIGIN = 'https://app.giwa.io';
const BASE_URL = 'https://api.blockmind.ai';
const CHAIN_ID = 91342;
const TOKEN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

/**
 * A BIP-39 spec test vector, so the words are valid yet individually distinctive — the
 * Hardhat phrase is twelve copies of "test", which makes per-word checks meaningless.
 */
const MNEMONIC = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
const MNEMONIC_WORDS = [...new Set(MNEMONIC.split(' '))];
const PASSWORD = 'vault-passphrase-do-not-leak-9f3a';

const ACCOUNT = mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
const ACCOUNT_ADDRESS = ACCOUNT.address;

// @scure/bip32 hands back a Uint8Array; older viem versions typed it as Hex.
const RAW_KEY: unknown = ACCOUNT.getHdKey().privateKey;
const PRIVATE_KEY_HEX = (
  typeof RAW_KEY === 'string'
    ? RAW_KEY.replace(/^0x/, '')
    : RAW_KEY
      ? bytesToHex(RAW_KEY as Uint8Array).replace(/^0x/, '')
      : ''
).toLowerCase();

// ── The detector ────────────────────────────────────────────────────

/** Returns a description of every secret class found in `haystack`, or an empty array. */
function leakedSecrets(haystack: string): string[] {
  const lowered = haystack.toLowerCase();
  const found: string[] = [];

  if (haystack.includes(MNEMONIC)) found.push('the full mnemonic');
  if (haystack.includes(PASSWORD)) found.push('the vault password');
  if (lowered.includes(PRIVATE_KEY_HEX)) found.push('the derived private key');

  for (const word of MNEMONIC_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(lowered)) found.push(`mnemonic word "${word}"`);
  }

  return found;
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

// ── A recording fetch that also answers ─────────────────────────────

interface RecordedRequest {
  url: string;
  method?: string;
  body: string;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function rpcResult(method: string | undefined, params: unknown): unknown {
  if (method === 'eth_call') {
    const data = (params as { data?: string }[] | undefined)?.[0]?.data;
    const selector = typeof data === 'string' ? data.slice(0, 10).toLowerCase() : '';
    if (selector === '0x95d89b41') return abiString('USDC');
    if (selector === '0x313ce567') return abiUint(6);
    if (selector === '0x70a08231') return abiUint(1_000_000);
    return '0x';
  }

  if (method === 'eth_getCode') {
    const address = String((params as unknown[] | undefined)?.[0] ?? '').toLowerCase();
    // The token is a contract, so the Scam Shield path is exercised; the recipient is not.
    return address === TOKEN.toLowerCase() ? '0x60806040' : '0x';
  }

  switch (method) {
    case 'eth_getBlockByNumber':
      return { baseFeePerGas: '0x3b9aca00' };
    case 'eth_chainId':
      return '0x164ce';
    case 'eth_estimateGas':
      return '0x5208';
    case 'eth_gasPrice':
    case 'eth_maxPriorityFeePerGas':
      return '0x3b9aca00';
    // These are parsed with BigInt(), which throws on a bare '0x'.
    case 'eth_getBalance':
    case 'eth_getStorageAt':
    case 'eth_getTransactionCount':
      return '0x0';
    case 'eth_blockNumber':
      return '0x1';
    case 'eth_sendRawTransaction':
      return `0x${'ab'.repeat(32)}`;
    default:
      return '0x';
  }
}

function createRecordingFetch() {
  const recorded: RecordedRequest[] = [];

  const impl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const body = typeof init?.body === 'string' ? init.body : '';

    let method: string | undefined;
    let params: unknown;
    try {
      const parsed = JSON.parse(body) as { method?: string; params?: unknown };
      method = parsed.method;
      params = parsed.params;
    } catch {
      method = undefined;
    }
    recorded.push({ url, method, body });

    // The Scam Shield endpoint answers with a risk verdict.
    if (url.includes('/explorer/address/')) {
      return jsonResponse({ risk: 'LOW', is_verified: true, flags: [] });
    }

    return jsonResponse({ jsonrpc: '2.0', id: 1, result: rpcResult(method, params) });
  }) as typeof fetch;

  return { fetch: impl, recorded };
}

// ── Harness ─────────────────────────────────────────────────────────

interface Harness {
  dispatcher: Dispatcher;
  recorded: RecordedRequest[];
}

function harness(): Harness {
  const local = createMemoryStore();
  const session = createMemoryStore();
  const store = new VaultStore({ local, session, now: () => 1_700_000_000_000 });
  const { fetch, recorded } = createRecordingFetch();

  const dispatcher = new Dispatcher({
    store,
    rpc: new RpcClient(fetch),
    scamShield: createScamShield({ baseUrl: BASE_URL, fetchImpl: fetch, timeoutMs: 1_000 }),
    version: '1.0.0-test',
    now: () => 1_700_000_000_000,
    openConfirm: async () => {},
    openPopup: async () => {},
  });

  return { dispatcher, recorded };
}

let counter = 0;

function request(method: string, params?: unknown[]): ProviderRequestMessage {
  counter += 1;
  return { channel: 'blockmind:inpage', id: `leak-${counter}`, method, params };
}

function deferredId(outcome: ProviderOutcome): string {
  if (outcome.status !== 'deferred') throw new Error(`expected a deferred request, got ${outcome.status}`);
  return outcome.id;
}

/** Everything the wallet can do that touches the network, in one pass. */
async function runLifecycle(h: Harness): Promise<void> {
  await h.dispatcher.handleExtMessage({
    type: 'vault_import_mnemonic',
    password: PASSWORD,
    mnemonic: MNEMONIC,
  });

  // connect
  const connectId = deferredId(await h.dispatcher.handleProvider(request('eth_requestAccounts'), { origin: ORIGIN }));
  await h.dispatcher.handleExtMessage({ type: 'pending_decide', id: connectId, approved: true });

  // a plain read, with the public address as a parameter
  await h.dispatcher.handleProvider(request('eth_getBalance', [ACCOUNT_ADDRESS, 'latest']), { origin: ORIGIN });

  // reading a token's metadata straight off the contract
  await h.dispatcher.handleExtMessage({ type: 'token_add', address: TOKEN, chainId: CHAIN_ID });

  // a native send: simulate, confirm, sign, broadcast
  const nativeId = deferredId(
    await h.dispatcher.handleProvider(
      request('eth_sendTransaction', [{ to: RECIPIENT, value: '0xde0b6b3a7640000' }]),
      { origin: ORIGIN },
    ),
  );
  await h.dispatcher.handleExtMessage({ type: 'pending_decide', id: nativeId, approved: true });

  // an ERC-20 send against a new contract: the Scam Shield path (§12.4) runs here
  const tokenId = deferredId(
    await h.dispatcher.handleProvider(
      request('eth_sendTransaction', [{ to: TOKEN, data: encodeErc20Transfer(RECIPIENT, 1n) }]),
      { origin: ORIGIN },
    ),
  );
  await h.dispatcher.handleExtMessage({ type: 'pending_decide', id: tokenId, approved: true });

  // a message signature — signs, never broadcasts
  const signId = deferredId(
    await h.dispatcher.handleProvider(request('personal_sign', ['0x68656c6c6f2067697761', ACCOUNT_ADDRESS]), {
      origin: ORIGIN,
    }),
  );
  await h.dispatcher.handleExtMessage({ type: 'pending_decide', id: signId, approved: true });

  // key export hands the phrase to the user, locally
  const revealed = await h.dispatcher.handleExtMessage({ type: 'vault_reveal', password: PASSWORD });
  expect(revealed.ok).toBe(true);
}

describe('ADR-011 invariant 4 — no transmission', () => {
  it('derived a private key to look for', () => {
    // Guards against a silent derivation change making the sweep below vacuous.
    expect(PRIVATE_KEY_HEX).toHaveLength(64);
    expect(MNEMONIC_WORDS.length).toBeGreaterThan(5);
  });

  it('puts no key material on the wire across the whole lifecycle', async () => {
    const h = harness();
    await runLifecycle(h);

    expect(h.recorded.length).toBeGreaterThan(0);

    // The dangerous paths really ran.
    expect(h.recorded.some((r) => r.method === 'eth_sendRawTransaction')).toBe(true);
    expect(h.recorded.some((r) => r.url.includes('/explorer/address/'))).toBe(true);

    // Public data really did cross the wire, so the sweep is not vacuous.
    const wire = h.recorded.map((r) => `${r.url}\n${r.body}`).join('\n');
    expect(wire.toLowerCase()).toContain(ACCOUNT_ADDRESS.toLowerCase());

    for (const recorded of h.recorded) {
      expect(leakedSecrets(`${recorded.url}\n${recorded.body}`)).toEqual([]);
    }
  });

  it('broadcasts the signed transaction but never the key that signed it', async () => {
    const h = harness();
    await runLifecycle(h);

    const broadcast = h.recorded.find((r) => r.method === 'eth_sendRawTransaction');
    expect(broadcast).toBeDefined();

    const raw = (JSON.parse(broadcast!.body) as { params: string[] }).params[0] ?? '';
    expect(raw.startsWith('0x02')).toBe(true); // EIP-1559 — public by design
    expect(leakedSecrets(raw)).toEqual([]);

    // ...and the signature is not the private key.
    expect(raw.toLowerCase()).not.toContain(PRIVATE_KEY_HEX);
  });

  it('sends the Scam Shield only the public contract address', async () => {
    const h = harness();
    await runLifecycle(h);

    const checks = h.recorded.filter((r) => r.url.includes('/explorer/address/'));
    expect(checks.length).toBeGreaterThan(0);

    for (const check of checks) {
      expect(check.url.toLowerCase()).toContain(TOKEN.toLowerCase());
      expect(leakedSecrets(check.url)).toEqual([]);
      expect(check.body).toBe('');
    }
  });

  it('never logs key material', async () => {
    const methods = ['log', 'warn', 'error', 'info', 'debug'] as const;
    const spies = methods.map((method) => vi.spyOn(console, method).mockImplementation(() => {}));

    try {
      const h = harness();
      await runLifecycle(h);

      const lines = spies
        .flatMap((spy) => spy.mock.calls)
        .map((args) => args.map(stringify).join(' '));

      for (const line of lines) {
        expect(leakedSecrets(line)).toEqual([]);
      }
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});

describe('the leak detector itself', () => {
  it('fires on each class of secret when one is deliberately planted', () => {
    expect(leakedSecrets(`{"body":"${MNEMONIC}"}`)).toContain('the full mnemonic');
    expect(leakedSecrets(`{"password":"${PASSWORD}"}`)).toContain('the vault password');
    expect(leakedSecrets(`{"key":"0x${PRIVATE_KEY_HEX}"}`)).toContain('the derived private key');
    expect(leakedSecrets('a stray sausage in a log line')).toContain('mnemonic word "sausage"');
  });

  it('stays silent on the payloads the wallet legitimately sends', () => {
    const benign = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [ACCOUNT_ADDRESS, 'latest'],
    });
    const url = `${BASE_URL}/explorer/address/${TOKEN}?chain_id=${CHAIN_ID}`;

    expect(leakedSecrets(benign)).toEqual([]);
    expect(leakedSecrets(url)).toEqual([]);
  });
});

// ✅ COMPLIES WITH: AGENTS.md §7, §12.5 (ADR-011 invariant 4)
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
