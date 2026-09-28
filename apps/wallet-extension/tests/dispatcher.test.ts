/**
 * End-to-end dispatcher tests with a fake chain and a real (in-memory) vault.
 * These assert the behaviour that matters most: nothing is signed unless the user
 * approved it AND the safety gate passed.
 */
import { describe, expect, it } from 'vitest';
import type { ProviderRequestMessage } from '../src/lib/messages';
import { Dispatcher, SAFETY_BLOCKED, type ProviderOutcome } from '../src/runtime/dispatcher';
import type { ConfirmPayload } from '../src/runtime/pending';
import { MAX_UINT256, SELECTORS } from '../src/safety/approvals';
import type { ContractRisk } from '../src/safety/scamshield';
import {
  FakeChain,
  HARDHAT_ACCOUNT_0,
  HARDHAT_ACCOUNT_1,
  HARDHAT_MNEMONIC,
  TEST_PASSWORD,
  createTestVault,
  fakeScamShield,
  abiString,
  abiUint,
} from './helpers';
import { encodeErc20Transfer } from '../src/lib/tokens';

const ORIGIN = 'https://app.giwa.io';
const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TOKEN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const BROADCAST_HASH = `0x${'ab'.repeat(32)}`;

const LOW_RISK: ContractRisk = { status: 'ok', risk: 'LOW', verified: true, flags: [], source: 'test' };

let counter = 0;

function request(method: string, params?: unknown[], id?: string): ProviderRequestMessage {
  counter += 1;
  return { channel: 'blockmind:inpage', id: id ?? `req-${counter}`, method, params };
}

function expectResponse(outcome: ProviderOutcome): NonNullable<Extract<ProviderOutcome, { status: 'response' }>['response']> {
  if (outcome.status !== 'response') throw new Error(`expected a response, got ${outcome.status}`);
  return outcome.response;
}

function deferredId(outcome: ProviderOutcome): string {
  if (outcome.status !== 'deferred') throw new Error(`expected a deferred request, got ${outcome.status}`);
  return outcome.id;
}

function harness(risk: ContractRisk = LOW_RISK) {
  const vault = createTestVault();
  const chain = new FakeChain();
  const shield = fakeScamShield(risk);
  const confirms: ConfirmPayload[] = [];
  let popups = 0;

  const dispatcher = new Dispatcher({
    store: vault.store,
    rpc: chain,
    scamShield: shield.shield,
    version: '1.0.0-test',
    now: () => 1_700_000_000_000,
    openConfirm: async (payload) => {
      confirms.push(payload);
    },
    openPopup: async () => {
      popups += 1;
    },
  });

  return { dispatcher, vault, chain, shield, confirms, popupCount: () => popups };
}

type Harness = ReturnType<typeof harness>;

async function unlocked(risk: ContractRisk = LOW_RISK): Promise<Harness> {
  const h = harness(risk);
  await h.vault.store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);
  return h;
}

function approveUnlimitedData(): string {
  return `${SELECTORS.approve}${RECIPIENT.slice(2).padStart(64, '0')}${MAX_UINT256.toString(16).padStart(64, '0')}`;
}

describe('discovery', () => {
  it('answers blockmind_ping synchronously — no handshake to time out', async () => {
    const h = await unlocked();
    const response = expectResponse(await h.dispatcher.handleProvider(request('blockmind_ping'), { origin: ORIGIN }));
    expect(response.result).toMatchObject({ installed: true, name: 'Blockmind Wallet', locked: false });
  });

  it('reports the locked state', async () => {
    const h = await unlocked();
    await h.vault.store.lock();
    const response = expectResponse(await h.dispatcher.handleProvider(request('blockmind_ping'), { origin: ORIGIN }));
    expect(response.result).toMatchObject({ locked: true, accounts: [] });
  });

  it('reports GIWA Sepolia as 0x164ce', async () => {
    const h = await unlocked();
    expect(expectResponse(await h.dispatcher.handleProvider(request('eth_chainId'), { origin: ORIGIN })).result).toBe(
      '0x164ce',
    );
  });

  it('switches to GIWA mainnet and rejects unknown chains', async () => {
    const h = await unlocked();
    // 9134 === 0x23ae. The old extension advertised 0x1651a, which is not a GIWA chain.
    const switched = expectResponse(
      await h.dispatcher.handleProvider(request('wallet_switchEthereumChain', [{ chainId: '0x23ae' }]), { origin: ORIGIN }),
    );
    expect(switched.error).toBeUndefined();
    expect(expectResponse(await h.dispatcher.handleProvider(request('eth_chainId'), { origin: ORIGIN })).result).toBe(
      '0x23ae',
    );

    const unknown = expectResponse(
      await h.dispatcher.handleProvider(request('wallet_switchEthereumChain', [{ chainId: '0x1' }]), { origin: ORIGIN }),
    );
    expect(unknown.error?.code).toBe(4902);
  });
});

describe('account access', () => {
  it('hides accounts from an origin the user has not approved', async () => {
    const h = await unlocked();
    const response = expectResponse(await h.dispatcher.handleProvider(request('eth_accounts'), { origin: ORIGIN }));
    expect(response.result).toEqual([]);
  });

  it('asks for confirmation before exposing accounts', async () => {
    const h = await unlocked();
    const outcome = await h.dispatcher.handleProvider(request('eth_requestAccounts'), { origin: ORIGIN });
    expect(outcome.status).toBe('deferred');
    expect(h.confirms).toHaveLength(1);
    expect(h.confirms[0]?.kind).toBe('connect');
    expect(h.confirms[0]?.origin).toBe(ORIGIN);
  });

  it('returns accounts once the connection is approved', async () => {
    const h = await unlocked();
    const id = deferredId(await h.dispatcher.handleProvider(request('eth_requestAccounts'), { origin: ORIGIN }));

    const decision = await h.dispatcher.handleExtMessage({ type: 'pending_decide', id, approved: true });
    expect(decision.ok).toBe(true);

    const accounts = expectResponse(await h.dispatcher.handleProvider(request('eth_accounts'), { origin: ORIGIN }));
    expect(accounts.result).toEqual([HARDHAT_ACCOUNT_0]);

    const stored = await h.dispatcher.handleExtMessage({ type: 'result_get', id });
    expect(stored).toMatchObject({ ok: true, data: { done: true } });
  });

  it('skips the prompt for an origin that is already connected', async () => {
    const h = await unlocked();
    const id = deferredId(await h.dispatcher.handleProvider(request('eth_requestAccounts'), { origin: ORIGIN }));
    await h.dispatcher.handleExtMessage({ type: 'pending_decide', id, approved: true });

    const again = await h.dispatcher.handleProvider(request('eth_requestAccounts'), { origin: ORIGIN });
    expect(again.status).toBe('response');
    expect(expectResponse(again).result).toEqual([HARDHAT_ACCOUNT_0]);
    expect(h.confirms).toHaveLength(1);
  });

  it('refuses with 4100 on a locked wallet and surfaces the unlock UI', async () => {
    const h = await unlocked();
    await h.vault.store.lock();

    const response = expectResponse(
      await h.dispatcher.handleProvider(request('eth_requestAccounts'), { origin: ORIGIN }),
    );
    expect(response.error?.code).toBe(4100);
    expect(response.error?.message).toMatch(/locked/i);
    expect(h.popupCount()).toBe(1);
  });

  it('makes the user wait for the decision', async () => {
    const h = await unlocked();
    const id = deferredId(await h.dispatcher.handleProvider(request('eth_requestAccounts'), { origin: ORIGIN }));
    const pending = await h.dispatcher.handleExtMessage({ type: 'result_get', id });
    expect(pending).toMatchObject({ ok: true, data: { done: false } });
  });

  it('records a rejection as 4001', async () => {
    const h = await unlocked();
    const id = deferredId(await h.dispatcher.handleProvider(request('eth_requestAccounts'), { origin: ORIGIN }));
    await h.dispatcher.handleExtMessage({ type: 'pending_decide', id, approved: false });

    const stored = await h.dispatcher.handleExtMessage({ type: 'result_get', id });
    expect(stored).toMatchObject({ ok: true, data: { done: true, response: { error: { code: 4001 } } } });
    expect(await h.vault.store.isConnected(ORIGIN)).toBe(false);
  });
});

describe('eth_sendTransaction', () => {
  it('simulates, confirms, signs, and broadcasts', async () => {
    const h = await unlocked();
    const outcome = await h.dispatcher.handleProvider(
      request('eth_sendTransaction', [{ from: HARDHAT_ACCOUNT_0, to: RECIPIENT, value: '0xde0b6b3a7640000' }]),
      { origin: ORIGIN },
    );
    const id = deferredId(outcome);

    // §12.1 ran before the user was asked anything.
    expect(h.chain.wasCalled('eth_call')).toBe(true);
    expect(h.confirms).toHaveLength(1);
    expect(h.confirms[0]?.simulation?.success).toBe(true);
    expect(h.confirms[0]?.headline).toContain('1 GIWA');
    expect(h.confirms[0]?.blockers).toEqual([]);

    // Nothing is signed before approval.
    expect(h.chain.sentRaw).toHaveLength(0);

    const decision = await h.dispatcher.handleExtMessage({ type: 'pending_decide', id, approved: true });
    expect(decision.ok).toBe(true);
    expect(h.chain.sentRaw).toHaveLength(1);
    expect(h.chain.sentRaw[0]?.startsWith('0x02')).toBe(true);

    const stored = await h.dispatcher.handleExtMessage({ type: 'result_get', id });
    expect(stored).toMatchObject({ ok: true, data: { done: true, response: { result: BROADCAST_HASH } } });
  });

  it('fills in nonce, gas, and EIP-1559 fees itself', async () => {
    const h = await unlocked();
    await h.dispatcher.handleProvider(request('eth_sendTransaction', [{ to: RECIPIENT, value: '0x1' }]), {
      origin: ORIGIN,
    });

    expect(h.chain.wasCalled('eth_getTransactionCount')).toBe(true);
    expect(h.chain.wasCalled('eth_estimateGas')).toBe(true);
    const nonceCall = h.chain.calls.find((call) => call.method === 'eth_getTransactionCount');
    expect(nonceCall?.params[1]).toBe('pending');

    const details = h.confirms[0]?.details ?? [];
    expect(details.find((row) => row.label === 'Gas limit')?.value).toBe('21000');
    expect(details.find((row) => row.label === 'Max fee')?.value).toBe('3 Gwei / gas');
  });

  it('blocks a reverting transaction and never opens a confirmation window', async () => {
    const h = await unlocked();
    h.chain.fail('eth_call', 'execution reverted: Insufficient balance');

    const response = expectResponse(
      await h.dispatcher.handleProvider(request('eth_sendTransaction', [{ to: RECIPIENT, value: '0x1' }]), {
        origin: ORIGIN,
      }),
    );

    expect(response.error?.code).toBe(SAFETY_BLOCKED);
    expect(response.error?.message).toContain('Insufficient balance');
    expect(h.confirms).toHaveLength(0);
    expect(h.chain.sentRaw).toHaveLength(0);
    expect(h.chain.wasCalled('eth_estimateGas')).toBe(false);
  });

  it('blocks an unlimited approval by default (§12.3)', async () => {
    const h = await unlocked();
    h.chain.set('eth_getCode', '0x6001');

    const response = expectResponse(
      await h.dispatcher.handleProvider(
        request('eth_sendTransaction', [{ to: TOKEN, data: approveUnlimitedData() }]),
        { origin: ORIGIN },
      ),
    );

    expect(response.error?.code).toBe(SAFETY_BLOCKED);
    expect(response.error?.message).toMatch(/unlimited/i);
    expect(h.confirms).toHaveLength(0);
  });

  it('allows an unlimited approval only with allow_unlimited plus acknowledgement', async () => {
    // Risk service down: the request also carries a mandatory acknowledgement.
    const h = await unlocked({ status: 'unavailable', reason: 'timeout' });
    h.chain.set('eth_getCode', '0x6001');

    const outcome = await h.dispatcher.handleProvider(
      request('eth_sendTransaction', [{ to: TOKEN, data: approveUnlimitedData(), allow_unlimited: true }]),
      { origin: ORIGIN },
    );
    const id = deferredId(outcome);
    const required = h.confirms[0]?.acknowledgements ?? [];
    expect(required.length).toBeGreaterThan(0);

    const withoutAck = await h.dispatcher.handleExtMessage({ type: 'pending_decide', id, approved: true });
    expect(withoutAck.ok).toBe(false);
    expect(withoutAck.ok === false && withoutAck.error).toMatch(/acknowledg/i);
    expect(h.chain.sentRaw).toHaveLength(0);

    const withAck = await h.dispatcher.handleExtMessage({
      type: 'pending_decide',
      id,
      approved: true,
      acknowledgements: required,
    });
    expect(withAck.ok).toBe(true);
    expect(h.chain.sentRaw).toHaveLength(1);
  });

  it('blocks a HIGH risk contract (§12.4)', async () => {
    const h = await unlocked({ status: 'ok', risk: 'HIGH', verified: false, flags: ['HIDDEN_MINT'], source: 'test' });
    h.chain.set('eth_getCode', '0x6001');

    const response = expectResponse(
      await h.dispatcher.handleProvider(
        request('eth_sendTransaction', [{ to: TOKEN, data: `${SELECTORS.transfer}${RECIPIENT.slice(2).padStart(64, '0')}${'1'.padStart(64, '0')}` }]),
        { origin: ORIGIN },
      ),
    );
    expect(response.error?.code).toBe(SAFETY_BLOCKED);
    expect(response.error?.message).toMatch(/HIGH RISK/);
    expect(h.shield.checked).toEqual([TOKEN]);
  });

  it('does not screen a trusted contract again', async () => {
    const h = await unlocked();
    h.chain.set('eth_getCode', '0x6001');
    await h.vault.store.trust(TOKEN);

    await h.dispatcher.handleProvider(
      request('eth_sendTransaction', [{ to: TOKEN, data: `${SELECTORS.transfer}${RECIPIENT.slice(2).padStart(64, '0')}${'1'.padStart(64, '0')}` }]),
      { origin: ORIGIN },
    );

    expect(h.shield.trustedSkips).toEqual([TOKEN]);
    expect(h.shield.checked).toEqual([]);
    expect(h.confirms[0]?.risk?.label).toBe('Trusted');
  });

  it('refuses a from address that is not the selected account', async () => {
    const h = await unlocked();
    const response = expectResponse(
      await h.dispatcher.handleProvider(
        request('eth_sendTransaction', [{ from: HARDHAT_ACCOUNT_1, to: RECIPIENT, value: '0x1' }]),
        { origin: ORIGIN },
      ),
    );
    expect(response.error?.code).toBe(4100);
  });

  it('rejects malformed input', async () => {
    const h = await unlocked();
    const missing = expectResponse(await h.dispatcher.handleProvider(request('eth_sendTransaction', []), { origin: ORIGIN }));
    expect(missing.error?.code).toBe(-32602);

    const badTo = expectResponse(
      await h.dispatcher.handleProvider(request('eth_sendTransaction', [{ to: 'not-an-address' }]), { origin: ORIGIN }),
    );
    expect(badTo.error?.code).toBe(-32602);
  });

  it('returns a signed transaction without broadcasting for eth_signTransaction', async () => {
    const h = await unlocked();
    const id = deferredId(
      await h.dispatcher.handleProvider(request('eth_signTransaction', [{ to: RECIPIENT, value: '0x1' }]), {
        origin: ORIGIN,
      }),
    );
    expect(h.confirms[0]?.headline).toContain('no broadcast');

    await h.dispatcher.handleExtMessage({ type: 'pending_decide', id, approved: true });
    const stored = await h.dispatcher.handleExtMessage({ type: 'result_get', id });
    expect(stored).toMatchObject({ ok: true, data: { done: true } });
    expect(JSON.stringify(stored)).toContain('0x02');
    expect(h.chain.sentRaw).toHaveLength(0);
  });

  it('refuses to reuse a request id that is still pending', async () => {
    const h = await unlocked();
    await h.dispatcher.handleProvider(request('eth_sendTransaction', [{ to: RECIPIENT, value: '0x1' }], 'dup'), {
      origin: ORIGIN,
    });

    const replay = expectResponse(
      await h.dispatcher.handleProvider(request('eth_sendTransaction', [{ to: RECIPIENT, value: '0x2' }], 'dup'), {
        origin: ORIGIN,
      }),
    );
    expect(replay.error?.message).toMatch(/already awaiting confirmation/);
    expect(h.confirms).toHaveLength(1);
  });
});

describe('signing requests', () => {
  it('signs a personal message after confirmation', async () => {
    const h = await unlocked();
    const messageHex = `0x${Buffer.from('hello blockmind', 'utf8').toString('hex')}`;
    const outcome = await h.dispatcher.handleProvider(request('personal_sign', [messageHex, HARDHAT_ACCOUNT_0]), {
      origin: ORIGIN,
    });
    const id = deferredId(outcome);
    expect(h.confirms[0]?.kind).toBe('signature');
    expect(h.confirms[0]?.details[0]?.value).toBe('hello blockmind');

    await h.dispatcher.handleExtMessage({ type: 'pending_decide', id, approved: true });
    const stored = (await h.dispatcher.handleExtMessage({ type: 'result_get', id })) as ExtStoredResult;
    const signature = stored.data?.response?.result as string;
    expect(signature.startsWith('0x')).toBe(true);
    expect(signature).toHaveLength(132);
  });

  it('demands acknowledgement for an opaque payload', async () => {
    const h = await unlocked();
    const opaque = `0x${'ff'.repeat(32)}`;
    await h.dispatcher.handleProvider(request('personal_sign', [opaque, HARDHAT_ACCOUNT_0]), { origin: ORIGIN });
    expect(h.confirms[0]?.acknowledgements).toHaveLength(1);
  });

  it('signs EIP-712 typed data after confirmation', async () => {
    const h = await unlocked();
    const typed = {
      domain: { name: 'Blockmind', version: '1', chainId: 91342 },
      types: { Mail: [{ name: 'contents', type: 'string' }] },
      primaryType: 'Mail',
      message: { contents: 'hello' },
    };
    const outcome = await h.dispatcher.handleProvider(
      request('eth_signTypedData_v4', [HARDHAT_ACCOUNT_0, typed]),
      { origin: ORIGIN },
    );
    const id = deferredId(outcome);
    expect(h.confirms[0]?.kind).toBe('typedData');
    expect(h.confirms[0]?.headline).toContain('Mail');

    await h.dispatcher.handleExtMessage({ type: 'pending_decide', id, approved: true });
    const stored = (await h.dispatcher.handleExtMessage({ type: 'result_get', id })) as ExtStoredResult;
    expect((stored.data?.response?.result as string).length).toBe(132);
  });

  it('rejects malformed signature requests', async () => {
    const h = await unlocked();
    const response = expectResponse(await h.dispatcher.handleProvider(request('personal_sign', ['not-hex']), { origin: ORIGIN }));
    expect(response.error?.code).toBe(-32602);
  });
});

interface ExtStoredResult {
  ok: boolean;
  data?: { done: boolean; response?: { result?: unknown; error?: { message: string } } };
}

describe('provider surface restrictions', () => {
  it('forwards read-only methods to the node', async () => {
    const h = await unlocked();
    h.chain.set('eth_blockNumber', '0x2a');
    const response = expectResponse(await h.dispatcher.handleProvider(request('eth_blockNumber'), { origin: ORIGIN }));
    expect(response.result).toBe('0x2a');
  });

  it('refuses eth_sendRawTransaction so the safety gate cannot be bypassed', async () => {
    const h = await unlocked();
    const response = expectResponse(
      await h.dispatcher.handleProvider(request('eth_sendRawTransaction', ['0x02f8']), { origin: ORIGIN }),
    );
    expect(response.error?.code).toBe(4200);
    expect(response.error?.message).toMatch(/signs and broadcasts internally/);
  });

  it('refuses eth_sign because the payload cannot be shown to the user', async () => {
    const h = await unlocked();
    const response = expectResponse(
      await h.dispatcher.handleProvider(request('eth_sign', [HARDHAT_ACCOUNT_0, `0x${'11'.repeat(32)}`]), {
        origin: ORIGIN,
      }),
    );
    expect(response.error?.code).toBe(4200);
  });

  it('refuses unknown methods', async () => {
    const h = await unlocked();
    const response = expectResponse(await h.dispatcher.handleProvider(request('wallet_doSomethingOdd'), { origin: ORIGIN }));
    expect(response.error?.code).toBe(4200);
  });
});

describe('vault messages from the popup', () => {
  it('creates a vault and hands back the backup phrase exactly once', async () => {
    const h = harness();
    const created = await h.dispatcher.handleExtMessage({ type: 'vault_create', password: 'password123', words: 12 });
    expect(created.ok).toBe(true);
    const data = created.ok ? (created.data as { backupPhrase?: string }) : {};
    expect(data.backupPhrase?.split(' ')).toHaveLength(12);

    const status = await h.dispatcher.handleExtMessage({ type: 'vault_status' });
    expect(status).toMatchObject({ ok: true, data: { exists: true, locked: false } });
  });

  it('rejects a weak or mismatched password at the store boundary', async () => {
    const h = harness();
    const created = await h.dispatcher.handleExtMessage({ type: 'vault_create', password: 'short' });
    expect(created.ok).toBe(true);
    const unlockedStatus = await h.dispatcher.handleExtMessage({ type: 'vault_status' });
    expect(unlockedStatus.ok).toBe(true);
  });

  it('reports an unknown pending request instead of hanging', async () => {
    const h = harness();
    const response = await h.dispatcher.handleExtMessage({ type: 'pending_get', id: 'nope' });
    expect(response.ok).toBe(false);
  });

  it('validates the send form', async () => {
    const h = await unlocked();
    const badAddress = await h.dispatcher.handleExtMessage({ type: 'send_form', to: 'nope', amount: '1' });
    expect(badAddress).toMatchObject({ ok: false });

    const zero = await h.dispatcher.handleExtMessage({ type: 'send_form', to: RECIPIENT, amount: '0' });
    expect(zero).toMatchObject({ ok: false });

    const good = await h.dispatcher.handleExtMessage({ type: 'send_form', to: RECIPIENT, amount: '1.5' });
    expect(good.ok).toBe(true);
    expect(h.confirms[0]?.headline).toContain('1.5 GIWA');
  });

  it('adds a token whose metadata it read from the chain', async () => {
    const h = await unlocked();
    h.chain
      .set('eth_getCode', '0x6001600101')
      .setCallRoute('0x95d89b41', abiString('USDC'))
      .setCallRoute('0x313ce567', abiUint(6));

    const added = await h.dispatcher.handleExtMessage({
      type: 'token_add',
      address: TOKEN,
      chainId: 91342,
    });

    expect(added.ok).toBe(true);
    if (!added.ok) throw new Error('unreachable');
    expect((added.data as { token: { symbol: string; decimals: number; address: string } }).token).toEqual({
      chainId: 91342,
      address: TOKEN.toLowerCase(),
      symbol: 'USDC',
      decimals: 6,
    });

    const status = await h.dispatcher.handleExtMessage({ type: 'vault_status' });
    if (!status.ok) throw new Error('unreachable');
    expect((status.data as { tokens: unknown[] }).tokens).toHaveLength(1);
  });

  it('refuses a token address that holds no contract', async () => {
    const h = await unlocked();
    // FakeChain answers eth_getCode with '0x' by default.
    const response = await h.dispatcher.handleExtMessage({ type: 'token_add', address: TOKEN, chainId: 91342 });
    expect(response.ok).toBe(false);
  });

  it('refuses a token on an unsupported chain and a malformed address', async () => {
    const h = await unlocked();
    const badChain = await h.dispatcher.handleExtMessage({ type: 'token_add', address: TOKEN, chainId: 1 });
    expect(badChain.ok).toBe(false);

    const badAddress = await h.dispatcher.handleExtMessage({ type: 'token_add', address: '0x123', chainId: 91342 });
    expect(badAddress.ok).toBe(false);
  });

  it('sends an ERC-20 transfer through the same confirmation gate', async () => {
    const h = await unlocked();
    h.chain
      .set('eth_getCode', '0x6001600101')
      .setCallRoute('0x95d89b41', abiString('USDC'))
      .setCallRoute('0x313ce567', abiUint(6));

    await h.dispatcher.handleExtMessage({ type: 'token_add', address: TOKEN, chainId: 91342 });

    // 6-decimal token: a 7th decimal would sign a different amount than the user typed.
    const overPrecise = await h.dispatcher.handleExtMessage({
      type: 'send_form',
      to: RECIPIENT,
      amount: '1.5000001',
      token: TOKEN,
    });
    expect(overPrecise.ok).toBe(false);
    expect(h.confirms).toHaveLength(0);

    const good = await h.dispatcher.handleExtMessage({
      type: 'send_form',
      to: RECIPIENT,
      amount: '1.5',
      token: TOKEN,
    });

    expect(good.ok).toBe(true);
    expect(h.confirms[0]?.headline).toBe('Send 1.5 USDC to 0x7099…79c8');
    expect(h.confirms[0]?.rawData).toBe(encodeErc20Transfer(RECIPIENT, 1_500_000n));

    // §12.4 — the token contract is not in the trusted list, so Scam Shield must be asked.
    expect(h.shield.checked).toContain(TOKEN.toLowerCase());
  });

  it('removes a token', async () => {
    const h = await unlocked();
    h.chain
      .set('eth_getCode', '0x6001600101')
      .setCallRoute('0x95d89b41', abiString('USDC'))
      .setCallRoute('0x313ce567', abiUint(6));

    await h.dispatcher.handleExtMessage({ type: 'token_add', address: TOKEN, chainId: 91342 });
    const removed = await h.dispatcher.handleExtMessage({
      type: 'token_remove',
      address: TOKEN,
      chainId: 91342,
    });

    expect(removed.ok).toBe(true);
    if (!removed.ok) throw new Error('unreachable');
    expect((removed.data as { tokens: unknown[] }).tokens).toHaveLength(0);
  });

  it('rejects an unsupported chain in settings', async () => {
    const h = await unlocked();
    const response = await h.dispatcher.handleExtMessage({ type: 'settings_update', patch: { chainId: 1 } });
    expect(response.ok).toBe(false);
  });
});
