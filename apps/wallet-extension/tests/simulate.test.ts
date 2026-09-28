import { describe, expect, it } from 'vitest';
import { decodeRevertData, extractRevertReason, simulateTransaction } from '../src/safety/simulate';
import { FakeChain } from './helpers';

function errorStringPayload(message: string): string {
  const hex = [...message].map((char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const length = message.length.toString(16).padStart(64, '0');
  const body = hex.padEnd(Math.ceil(hex.length / 64) * 64, '0');
  return `0x08c379a0${(32).toString(16).padStart(64, '0')}${length}${body}`;
}

describe('revert decoding', () => {
  it('decodes an ABI-encoded Error(string)', () => {
    expect(decodeRevertData(errorStringPayload('Insufficient balance'))).toBe('Insufficient balance');
  });

  it('ignores payloads that are not Error(string)', () => {
    expect(decodeRevertData('0xdeadbeef')).toBeUndefined();
    expect(decodeRevertData({})).toBeUndefined();
    expect(decodeRevertData(undefined)).toBeUndefined();
  });

  it('extracts reasons from RPC error shapes', () => {
    expect(extractRevertReason(new Error('execution reverted: Nope'))).toBe('Nope');
    expect(extractRevertReason({ data: { message: 'reverted by node' } })).toBe('reverted by node');
    expect(extractRevertReason({ data: errorStringPayload('Token paused') })).toBe('Token paused');
  });

  it('does not treat a user rejection as a revert', () => {
    expect(extractRevertReason(new Error('User rejected the request'))).toBeUndefined();
  });

  it('falls back to a generic message for a bare revert', () => {
    expect(extractRevertReason(new Error('execution reverted'))).toBe('The contract rejected this transaction');
  });
});

describe('simulateTransaction', () => {
  const tx = { from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', value: 10n ** 18n };

  it('passes when the call and the gas estimate succeed', async () => {
    const result = await simulateTransaction(new FakeChain(), 91342, tx);
    expect(result.success).toBe(true);
    expect(result.gasEstimate).toBe(21_000n);
  });

  it('sends the value as a hex quantity', async () => {
    const chain = new FakeChain();
    await simulateTransaction(chain, 91342, tx);
    const call = chain.calls.find((entry) => entry.method === 'eth_call');
    expect((call?.params[0] as { value: string }).value).toBe('0xde0b6b3a7640000');
  });

  it('fails when the contract reverts', async () => {
    const chain = new FakeChain().fail('eth_call', 'execution reverted: Insufficient balance');
    const result = await simulateTransaction(chain, 91342, tx);
    expect(result.success).toBe(false);
    expect(result.revertReason).toBe('Insufficient balance');
  });

  it('fails when only the gas estimate fails', async () => {
    const chain = new FakeChain().fail('eth_estimateGas', 'execution reverted: out of gas');
    const result = await simulateTransaction(chain, 91342, tx);
    expect(result.success).toBe(false);
    expect(result.revertReason).toBe('out of gas');
  });

  it('fails when the node is unreachable', async () => {
    const chain = new FakeChain().fail('eth_call', 'Cannot reach GIWA Sepolia RPC');
    const result = await simulateTransaction(chain, 91342, tx);
    expect(result.success).toBe(false);
    expect(result.revertReason).toContain('Cannot reach');
  });
});
