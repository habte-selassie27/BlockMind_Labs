import { describe, expect, it } from 'vitest';
import { decodeFunctionData, erc20Abi } from 'viem';
import { buildSignableTransaction, resolveToken } from '../tx-intent';

const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const SPENDER = '0x1111111111111111111111111111111111111111';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

function build(summary: Record<string, unknown>, from: string | null = WALLET) {
  return buildSignableTransaction({ from, chainId: 91342, summary });
}

function expectOk(result: ReturnType<typeof build>) {
  if (!result.ok) throw new Error(`expected a transaction, got: ${result.reason}`);
  return result.tx;
}

describe('resolveToken', () => {
  it('treats GIWA and the zero address as native', () => {
    expect(resolveToken('GIWA')?.address).toBe('0x0000000000000000000000000000000000000000');
    expect(resolveToken('0x0000000000000000000000000000000000000000')?.decimals).toBe(18);
  });

  it('resolves a known symbol case-insensitively', () => {
    expect(resolveToken('usdc')).toMatchObject({ symbol: 'USDC', decimals: 6 });
  });

  it('resolves a known address', () => {
    expect(resolveToken(USDC)?.symbol).toBe('USDC');
  });

  it('returns null for a token whose decimals it cannot verify', () => {
    expect(resolveToken('FAKECOIN')).toBeNull();
  });
});

describe('native transfer', () => {
  it('sends value to the recipient with empty calldata', () => {
    const tx = expectOk(build({ action: 'transfer_tokens', token: 'GIWA', amount: '1.5', to: RECIPIENT }));

    expect(tx.to).toBe(RECIPIENT);
    expect(tx.value).toBe(`0x${(1_500_000_000_000_000_000n).toString(16)}`);
    expect(tx.data).toBe('0x');
    expect(tx.chainId).toBe('0x164ce');
    expect(tx.from).toBe(WALLET);
  });
});

describe('ERC-20 transfer', () => {
  it('targets the token contract and encodes transfer() as calldata', () => {
    const tx = expectOk(build({ action: 'transfer_tokens', token: 'USDC', amount: '1.5', to: RECIPIENT }));

    expect(tx.to).toBe(USDC);
    // No native value moves in an ERC-20 transfer.
    expect(tx.value).toBe('0x0');
    expect(tx.data.startsWith('0xa9059cbb')).toBe(true);

    // Round-trip through viem's decoder: the wallet decodes with the same ABI, so if
    // these disagree the confirmation screen would show a different amount.
    const decoded = decodeFunctionData({ abi: erc20Abi, data: tx.data });
    expect(decoded.functionName).toBe('transfer');
    expect(decoded.args).toEqual([RECIPIENT, 1_500_000n]);
  });

  it('accepts the token as an address instead of a symbol', () => {
    const tx = expectOk(build({ action: 'transfer', token: USDC, amount: '2', to: RECIPIENT }));
    expect(tx.to).toBe(USDC);
  });

  it('honours the token decimals (6, not 18)', () => {
    const tx = expectOk(build({ action: 'transfer', token: 'USDC', amount: '1', to: RECIPIENT }));
    const decoded = decodeFunctionData({ abi: erc20Abi, data: tx.data });
    expect(decoded.args).toEqual([RECIPIENT, 1_000_000n]);
  });
});

describe('approve', () => {
  it('encodes approve() with the exact amount', () => {
    const tx = expectOk(build({ action: 'approve_token', token: 'USDC', amount: '100', spender: SPENDER }));

    expect(tx.to).toBe(USDC);
    expect(tx.value).toBe('0x0');

    const decoded = decodeFunctionData({ abi: erc20Abi, data: tx.data });
    expect(decoded.functionName).toBe('approve');
    expect(decoded.args).toEqual([SPENDER, 100_000_000n]);

    // §12.3 — never an unbounded allowance unless the user explicitly asked for one.
    const [, amount] = decoded.args as [string, bigint];
    expect(amount).not.toBe((1n << 256n) - 1n);
  });

  it('refuses to approve the native asset', () => {
    const result = build({ action: 'approve_token', token: 'GIWA', amount: '1', spender: SPENDER });
    expect(result.ok).toBe(false);
  });
});

describe('refusals', () => {
  it('refuses when no wallet is connected', () => {
    expect(build({ action: 'transfer_tokens', token: 'GIWA', amount: '1', to: RECIPIENT }, null).ok).toBe(false);
    expect(build({ action: 'transfer_tokens', token: 'GIWA', amount: '1', to: RECIPIENT }, 'nope').ok).toBe(false);
  });

  it('refuses an invalid recipient rather than sending to the zero address', () => {
    const result = build({ action: 'transfer_tokens', token: 'GIWA', amount: '1', to: 'not-an-address' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toContain('valid recipient');
  });

  it('refuses an unknown token instead of guessing its decimals', () => {
    const result = build({ action: 'transfer_tokens', token: 'FAKECOIN', amount: '1', to: RECIPIENT });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toContain('FAKECOIN');
  });

  it('refuses a non-positive or malformed amount', () => {
    for (const amount of ['0', '-1', '', 'abc', '1e18']) {
      expect(build({ action: 'transfer_tokens', token: 'USDC', amount, to: RECIPIENT }).ok).toBe(false);
    }
  });

  it('refuses more precision than the token supports', () => {
    // 6-decimal USDC: a 7th decimal would be rounded, silently changing the amount.
    expect(build({ action: 'transfer_tokens', token: 'USDC', amount: '1.0000001', to: RECIPIENT }).ok).toBe(false);
  });

  it('refuses actions it cannot build and verify, instead of signing an empty transfer', () => {
    const result = build({ action: 'swap_tokens', from_token: 'GIWA', to_token: 'USDC', amount: '1' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toContain('swap_tokens');
  });

  it('refuses a confirmation with no action', () => {
    expect(build({}).ok).toBe(false);
  });
});

describe('chain handling', () => {
  it('defaults to GIWA Sepolia when the wallet has no chain', () => {
    const tx = buildSignableTransaction({
      from: WALLET,
      chainId: null,
      summary: { action: 'transfer_tokens', token: 'GIWA', amount: '1', to: RECIPIENT },
    });
    expect(expectOk(tx).chainId).toBe('0x164ce');
  });
});

// ✅ COMPLIES WITH: AGENTS.md §12.2, §12.3
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: P1-WALLET-03 agent confirmation wiring
