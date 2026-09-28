import { describe, expect, it } from 'vitest';
import { SELECTORS } from '../src/safety/approvals';
import { decodeCall } from '../src/safety/calldata';
import {
  BALANCE_OF_SELECTOR,
  encodeBalanceOf,
  encodeErc20Transfer,
  isTokenAddress,
  normalizeTokenAddress,
  parseTokenAmount,
  readTokenBalance,
  readTokenMetadata,
  removeToken,
  tokensForChain,
  upsertToken,
  type TokenConfig,
} from '../src/lib/tokens';
import { abiString, abiUint, FakeChain } from './helpers';

const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

function token(overrides: Partial<TokenConfig> = {}): TokenConfig {
  return { chainId: 91342, address: USDC, symbol: 'USDC', decimals: 6, ...overrides };
}

describe('token amounts', () => {
  it('scales a decimal string to base units', () => {
    expect(parseTokenAmount('1', 18)).toBe(10n ** 18n);
    expect(parseTokenAmount('1.5', 6)).toBe(1_500_000n);
    expect(parseTokenAmount('0.1', 18)).toBe(10n ** 17n);
    expect(parseTokenAmount('0.000000000000000001', 18)).toBe(1n);
    expect(parseTokenAmount('  2.25  ', 2)).toBe(225n);
  });

  it('handles a zero-decimal token', () => {
    expect(parseTokenAmount('1', 0)).toBe(1n);
    expect(parseTokenAmount('1.', 0)).toBe(1n);
  });

  it('rejects amounts that are not a positive number', () => {
    expect(parseTokenAmount('0', 18)).toBeNull();
    expect(parseTokenAmount('0.0', 18)).toBeNull();
    expect(parseTokenAmount('', 18)).toBeNull();
    expect(parseTokenAmount('.', 18)).toBeNull();
    expect(parseTokenAmount('abc', 18)).toBeNull();
    expect(parseTokenAmount('-1', 18)).toBeNull();
    expect(parseTokenAmount('1e18', 18)).toBeNull();
  });

  it('rejects more precision than the token has', () => {
    // 6 decimals cannot represent a 7th decimal place; rounding it silently would
    // sign a different amount than the user typed.
    expect(parseTokenAmount('1.5000001', 6)).toBeNull();
    expect(parseTokenAmount('1.5', 6)).not.toBeNull();
  });
});

describe('token list', () => {
  it('validates and normalises addresses', () => {
    expect(isTokenAddress(RECIPIENT)).toBe(true);
    expect(isTokenAddress('0x123')).toBe(false);
    expect(isTokenAddress('')).toBe(false);
    expect(normalizeTokenAddress(' 0xA0b8  ')).toBe('0xa0b8');
  });

  it('upserts by chain + address, replacing the old entry', () => {
    const list = upsertToken([], token({ symbol: 'OLD' }));
    const replaced = upsertToken(list, token({ symbol: 'NEW' }));
    expect(replaced).toHaveLength(1);
    expect(replaced[0]?.symbol).toBe('NEW');
  });

  it('keeps the same address on a different chain', () => {
    const list = upsertToken([token()], token({ chainId: 9134 }));
    expect(list).toHaveLength(2);
  });

  it('removes case-insensitively without touching other chains', () => {
    const list = [token(), token({ chainId: 9134 })];
    const next = removeToken(list, 91342, USDC.toUpperCase());
    expect(next).toHaveLength(1);
    expect(next[0]?.chainId).toBe(9134);
  });

  it('filters by chain', () => {
    const list = [token(), token({ chainId: 9134 })];
    expect(tokensForChain(list, 91342)).toHaveLength(1);
    expect(tokensForChain(list, 1)).toHaveLength(0);
  });
});

describe('transfer encoding', () => {
  it('encodes transfer(address,uint256) with the amount after the selector', () => {
    const data = encodeErc20Transfer(RECIPIENT, 1_500_000n);
    expect(data).toBe(
      `${SELECTORS.transfer}` +
        '00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8' +
        '000000000000000000000000000000000000000000000000000000000016e360',
    );
  });

  it('encodes balanceOf(address)', () => {
    expect(encodeBalanceOf(RECIPIENT)).toBe(
      `${BALANCE_OF_SELECTOR}00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8`,
    );
  });

  it('round-trips through the confirmation-screen decoder', () => {
    // Guards the ARGS_OFFSET class of bug: if the encoder and decoder disagree by even
    // one byte, the user is shown the wrong recipient or amount.
    const decoded = decodeCall({
      to: USDC,
      data: encodeErc20Transfer(RECIPIENT, 1_500_000n),
      symbol: 'USDC',
      decimals: 6,
    });

    expect(decoded.kind).toBe('transfer');
    if (decoded.kind !== 'transfer') throw new Error('unreachable');
    expect(decoded.to.toLowerCase()).toBe(RECIPIENT.toLowerCase());
    expect(decoded.amount).toBe(1_500_000n);
    // `calldataAddress` decodes raw hex, so the summary carries the lower-case form.
    expect(decoded.summary).toBe('Send 1.5 USDC to 0x7099…79c8');
  });
});

describe('on-chain reads', () => {
  it('reads symbol and decimals from the contract', async () => {
    const chain = new FakeChain()
      .set('eth_getCode', '0x6001600101')
      .setCallRoute('0x95d89b41', abiString('USDC'))
      .setCallRoute('0x313ce567', abiUint(6));

    expect(await readTokenMetadata(chain, 91342, USDC)).toEqual({ symbol: 'USDC', decimals: 6 });
  });

  it('returns null when the address holds no contract', async () => {
    const chain = new FakeChain().set('eth_getCode', '0x');
    expect(await readTokenMetadata(chain, 91342, USDC)).toBeNull();
  });

  it('falls back to TOKEN/18 when the optional methods are missing', async () => {
    const chain = new FakeChain().set('eth_getCode', '0x6001');
    expect(await readTokenMetadata(chain, 91342, USDC)).toEqual({ symbol: 'TOKEN', decimals: 18 });
  });

  it('reads a balanceOf result as base units', async () => {
    const chain = new FakeChain().setCallRoute(BALANCE_OF_SELECTOR, abiUint(2_500_000n));
    expect(await readTokenBalance(chain, 91342, USDC, RECIPIENT)).toBe(2_500_000n);
  });

  it('returns null when the balance read fails', async () => {
    const chain = new FakeChain().fail('eth_call', 'execution reverted');
    expect(await readTokenBalance(chain, 91342, USDC, RECIPIENT)).toBeNull();
  });
});
