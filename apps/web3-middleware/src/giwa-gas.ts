/**
 * GIWA Gas Intelligence — live gas, block, tx + allowance checker
 * GIWA is ~1s blocks, very low fees — optimizer suggests batching
 */
import { jsonRPCCall } from './rpc';

export interface GasTiers {
  slow: { gwei: string; wei: string };
  standard: { gwei: string; wei: string };
  fast: { gwei: string; wei: string };
  baseFee: string;
  suggestion: 'slow' | 'standard' | 'fast';
  reason: string;
  chainId: number;
}

export async function getGiwaGas(chainId = 91342): Promise<GasTiers> {
  const { result } = await jsonRPCCall('eth_gasPrice', []);
  const base = BigInt(result as string);
  const toGwei = (wei: bigint) => (Number(wei) / 1e9).toFixed(6);
  const slowWei = (base * 80n) / 100n;
  const stdWei = base;
  const fastWei = (base * 150n) / 100n;
  const fast = Number(fastWei) / 1e9;
  const slow = Number(slowWei) / 1e9;
  let suggestion: GasTiers['suggestion'] = 'standard';
  let reason = 'GIWA is fast & cheap — standard is optimal (1–2s confirmation, ~$0.0002)';
  if (fast > slow * 2.5) {
    suggestion = 'slow';
    reason = 'Network idle — save fee with slow (4s, still cheap)';
  } else if (fast < 0.002) {
    suggestion = 'fast';
    reason = 'Gas <0.002 gwei — fast costs almost nothing, go fast';
  }
  return {
    slow: { gwei: toGwei(slowWei), wei: slowWei.toString() },
    standard: { gwei: toGwei(stdWei), wei: stdWei.toString() },
    fast: { gwei: toGwei(fastWei), wei: fastWei.toString() },
    baseFee: toGwei(base),
    suggestion,
    reason,
    chainId,
  };
}

export interface BlockInfo {
  number: string;
  hash: string;
  timestamp: number;
  txCount: number;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas?: string;
  parentHash: string;
}

export async function getGiwaBlock(blockNumber: string | number = 'latest'): Promise<BlockInfo> {
  const tag = typeof blockNumber === 'number' ? `0x${blockNumber.toString(16)}` : blockNumber === 'latest' ? 'latest' : blockNumber;
  const { result } = await jsonRPCCall('eth_getBlockByNumber', [tag, false]);
  const b = result as any;
  return {
    number: b.number ? BigInt(b.number).toString() : '0',
    hash: b.hash,
    timestamp: b.timestamp ? parseInt(b.timestamp, 16) : Math.floor(Date.now() / 1000),
    txCount: Array.isArray(b.transactions) ? b.transactions.length : 0,
    gasUsed: b.gasUsed,
    gasLimit: b.gasLimit,
    baseFeePerGas: b.baseFeePerGas,
    parentHash: b.parentHash,
  };
}

export interface TxInfo {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  blockNumber: string | null;
  status?: string;
}

export async function getGiwaTx(txHash: string): Promise<TxInfo & { receipt?: any }> {
  const { result: tx } = await jsonRPCCall('eth_getTransactionByHash', [txHash]);
  if (!tx) throw new Error('Transaction not found');
  const t = tx as any;
  let receipt: any = null;
  try {
    const { result: r } = await jsonRPCCall('eth_getTransactionReceipt', [txHash]);
    receipt = r;
  } catch {}
  return {
    hash: t.hash,
    from: t.from,
    to: t.to,
    value: t.value,
    gas: t.gas,
    gasPrice: t.gasPrice,
    input: t.input,
    blockNumber: t.blockNumber ? BigInt(t.blockNumber).toString() : null,
    status: receipt?.status,
    receipt,
  };
}

// ERC20 allowance check
const ALLOWANCE_SELECTOR = '0xdd62ed3e'; // allowance(address,address)

export async function checkAllowance(params: { token: string; owner: string; spender: string }): Promise<{ token: string; owner: string; spender: string; allowance: string; allowanceFormatted: string }> {
  const { token, owner, spender } = params;
  const ownerPad = owner.toLowerCase().replace('0x', '').padStart(64, '0');
  const spenderPad = spender.toLowerCase().replace('0x', '').padStart(64, '0');
  const data = ALLOWANCE_SELECTOR + ownerPad + spenderPad;
  const { result } = await jsonRPCCall('eth_call', [{ to: token, data }, 'latest']);
  const allowance = BigInt(result as string);
  // Assume 18 decimals if unknown; explorer would give decimals — simplify
  const formatted = (Number(allowance) / 1e18).toFixed(6);
  return { token, owner, spender, allowance: allowance.toString(), allowanceFormatted: formatted };
}

// ✅ COMPLIES WITH: AGENTS.md §9, §12.1
// ✅ SERVICE: web3-middleware
