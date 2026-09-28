import { describe, expect, it } from 'vitest';
import { MAX_UINT256, SELECTORS } from '../src/safety/approvals';
import { decodeCall, formatNativeAmount, formatTokenAmount, shortAddress } from '../src/safety/calldata';

const TOKEN = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const RECIPIENT = '70997970c51812dc3a010c7d01b50e0d17dc79c8';

function word(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

describe('amount formatting', () => {
  it('scales by token decimals and trims trailing zeros', () => {
    expect(formatTokenAmount(1_500_000n, 6)).toBe('1.5');
    expect(formatTokenAmount(1_000_000n, 6)).toBe('1');
    expect(formatTokenAmount(0n, 18)).toBe('0');
    expect(formatTokenAmount(10n ** 18n, 18)).toBe('1');
  });

  it('keeps tiny amounts readable instead of rounding to zero', () => {
    expect(formatTokenAmount(1n, 18)).toBe('0.00000000');
  });

  it('labels native amounts', () => {
    expect(formatNativeAmount(10n ** 18n)).toBe('1 GIWA');
  });

  it('shortens addresses for display', () => {
    expect(shortAddress('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')).toBe('0xf39F…2266');
  });
});

describe('decodeCall', () => {
  it('describes a native transfer', () => {
    const decoded = decodeCall({ to: `0x${RECIPIENT}`, value: 10n ** 18n });
    expect(decoded.kind).toBe('nativeTransfer');
    expect(decoded.summary).toContain('1 GIWA');
  });

  it('describes a contract deployment', () => {
    expect(decodeCall({ data: '0x60806040' }).kind).toBe('contractDeploy');
  });

  it('describes an ERC-20 transfer with token metadata', () => {
    const decoded = decodeCall({
      to: TOKEN,
      data: `${SELECTORS.transfer}${RECIPIENT.padStart(64, '0')}${word(1_500_000n)}`,
      symbol: 'USDC',
      decimals: 6,
    });
    expect(decoded.kind).toBe('transfer');
    expect(decoded.summary).toBe('Send 1.5 USDC to 0x7099…79c8');
  });

  it('falls back to 18 decimals when metadata is unavailable', () => {
    const decoded = decodeCall({
      to: TOKEN,
      data: `${SELECTORS.transfer}${RECIPIENT.padStart(64, '0')}${word(10n ** 18n)}`,
    });
    expect(decoded.summary).toContain('1 TOKEN');
  });

  it('describes transferFrom', () => {
    const decoded = decodeCall({
      to: TOKEN,
      data: `${SELECTORS.transferFrom}${RECIPIENT.padStart(64, '0')}${RECIPIENT.padStart(64, '0')}${word(5n)}`,
      symbol: 'USDC',
      decimals: 6,
    });
    expect(decoded.kind).toBe('transferFrom');
    expect(decoded.summary).toContain('Move 0.000005 USDC');
  });

  it('warns loudly about an unlimited approval', () => {
    const decoded = decodeCall({
      to: TOKEN,
      data: `${SELECTORS.approve}${RECIPIENT.padStart(64, '0')}${word(MAX_UINT256)}`,
      symbol: 'USDC',
      decimals: 6,
    });
    expect(decoded.kind).toBe('approve');
    if (decoded.kind !== 'approve') throw new Error('unreachable');
    expect(decoded.unlimited).toBe(true);
    expect(decoded.summary).toContain('UNLIMITED');
  });

  it('reports an exact approval amount', () => {
    const decoded = decodeCall({
      to: TOKEN,
      data: `${SELECTORS.approve}${RECIPIENT.padStart(64, '0')}${word(2_500_000n)}`,
      symbol: 'USDC',
      decimals: 6,
    });
    expect(decoded.summary).toBe('Allow 0x7099…79c8 to spend 2.5 USDC');
  });

  it('describes a blanket NFT approval', () => {
    const decoded = decodeCall({
      to: TOKEN,
      data: `${SELECTORS.setApprovalForAll}${RECIPIENT.padStart(64, '0')}${word(1n)}`,
    });
    expect(decoded.summary).toContain('ALL your items');
  });

  it('is explicit that an unknown selector cannot be decoded', () => {
    const decoded = decodeCall({ to: TOKEN, data: `0xdeadbeef${word(1n)}` });
    expect(decoded.kind).toBe('contractCall');
    expect(decoded.summary).toContain('cannot be decoded');
  });
});
