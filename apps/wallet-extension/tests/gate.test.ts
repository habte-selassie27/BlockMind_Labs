import { describe, expect, it } from 'vitest';
import { MAX_UINT256, SELECTORS } from '../src/safety/approvals';
import { decodeCall, type DecodedCall } from '../src/safety/calldata';
import { RULES, evaluateTransaction, type GateInput } from '../src/safety/gate';
import type { ContractRisk } from '../src/safety/scamshield';

const SPENDER = '70997970c51812dc3a010c7d01b50e0d17dc79c8';

function word(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

const approveUnlimited: DecodedCall = decodeCall({
  to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  data: `${SELECTORS.approve}${SPENDER.padStart(64, '0')}${word(MAX_UINT256)}`,
  symbol: 'USDC',
  decimals: 6,
});

const plainTransfer: DecodedCall = decodeCall({ to: `0x${SPENDER}`, value: 10n ** 17n });

const LOW_RISK: ContractRisk = {
  status: 'ok',
  risk: 'LOW',
  verified: true,
  flags: [],
  source: 'test',
};

function gate(overrides: Partial<GateInput> = {}): ReturnType<typeof evaluateTransaction> {
  return evaluateTransaction({
    chainId: 91342,
    origin: 'https://app.giwa.io',
    decoded: plainTransfer,
    simulation: { success: true, gasEstimate: 21_000n },
    risk: LOW_RISK,
    isTestnet: false,
    ...overrides,
  });
}

describe('§12.1 simulation gate', () => {
  it('blocks when the simulation reverts', () => {
    const result = gate({ simulation: { success: false, revertReason: 'insufficient balance' } });
    expect(result.canSign).toBe(false);
    expect(result.blockers[0]).toContain('insufficient balance');
    expect(result.rules).toContain(RULES.simulation);
  });

  it('blocks when gas cannot be estimated', () => {
    const result = gate({ simulation: { success: false, revertReason: 'Gas estimation failed' } });
    expect(result.canSign).toBe(false);
  });

  it('passes a successful simulation', () => {
    expect(gate().canSign).toBe(true);
  });
});

describe('§12.3 unlimited approvals', () => {
  it('blocks an unlimited approval by default', () => {
    const result = gate({ decoded: approveUnlimited });
    expect(result.canSign).toBe(false);
    expect(result.blockers.join(' ')).toMatch(/unlimited/i);
    expect(result.rules).toContain(RULES.unlimitedApproval);
  });

  it('allows it only with allow_unlimited, and demands acknowledgement', () => {
    const result = gate({ decoded: approveUnlimited, allowUnlimited: true });
    expect(result.canSign).toBe(true);
    expect(result.acknowledgements).toHaveLength(1);
    expect(result.warnings.join(' ')).toMatch(/unlimited/i);
  });

  it('never blocks an exact-amount approval', () => {
    const exact = decodeCall({
      to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      data: `${SELECTORS.approve}${SPENDER.padStart(64, '0')}${word(1_000_000n)}`,
      symbol: 'USDC',
      decimals: 6,
    });
    const result = gate({ decoded: exact });
    expect(result.canSign).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });
});

describe('§12.4 Scam Shield', () => {
  it('blocks a HIGH risk contract', () => {
    const result = gate({
      decoded: decodeCall({ to: '0xdead', data: `${SELECTORS.transfer}${SPENDER.padStart(64, '0')}${word(1n)}` }),
      risk: { status: 'ok', risk: 'HIGH', verified: false, flags: ['HIDDEN_MINT_FUNCTION'], source: 'test' },
    });
    expect(result.canSign).toBe(false);
    expect(result.blockers.join(' ')).toMatch(/HIGH RISK/);
    expect(result.rules).toContain(RULES.scamShield);
  });

  it('flags an unverified contract as an acknowledgement, not a silent pass', () => {
    const result = gate({
      decoded: decodeCall({ to: '0xdead', data: `${SELECTORS.transfer}${SPENDER.padStart(64, '0')}${word(1n)}` }),
      risk: { status: 'ok', risk: 'LOW', verified: false, flags: [], source: 'test' },
    });
    expect(result.canSign).toBe(true);
    expect(result.acknowledgements.length).toBeGreaterThan(0);
  });

  it('requires acknowledgement when the risk service is unreachable', () => {
    const result = gate({
      decoded: decodeCall({ to: '0xdead', data: `${SELECTORS.transfer}${SPENDER.padStart(64, '0')}${word(1n)}` }),
      risk: { status: 'unavailable', reason: 'timeout' },
    });
    expect(result.canSign).toBe(true);
    expect(result.acknowledgements.join(' ')).toMatch(/not screened/i);
    expect(result.warnings.join(' ')).toContain('timeout');
  });

  it('accepts a trusted contract without warnings', () => {
    const result = gate({
      decoded: decodeCall({ to: '0xdead', data: `${SELECTORS.transfer}${SPENDER.padStart(64, '0')}${word(1n)}` }),
      risk: { status: 'trusted' },
    });
    expect(result.canSign).toBe(true);
    expect(result.warnings.join(' ')).not.toMatch(/unverified/i);
  });
});

describe('labels and defaults', () => {
  it('notes testnet usage', () => {
    expect(gate({ isTestnet: true }).warnings.join(' ')).toMatch(/testnet/i);
  });

  it('warns when gas is missing but allows signing', () => {
    expect(gate({ simulation: { success: true } }).warnings.join(' ')).toMatch(/Gas could not be estimated/);
  });

  it('always records the confirmation requirement (§12.2)', () => {
    expect(gate().rules).toContain(RULES.confirmation);
  });

  it('reports the decoded summary as the headline', () => {
    expect(gate().headline).toBe(plainTransfer.summary);
  });
});
