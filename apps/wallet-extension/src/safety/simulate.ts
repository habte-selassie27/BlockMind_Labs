/**
 * AGENTS.md §12.1 — no transaction without simulation.
 *
 * Every state-changing request is dry-run through `eth_call` before the user is even
 * asked to approve it, and gas is estimated separately. A failing simulation is a
 * hard stop: the signer is never reached.
 */
import { bigIntToHex, type RpcCaller } from '../lib/rpc';

export interface SimulationResult {
  success: boolean;
  gasEstimate?: bigint;
  revertReason?: string;
}

export interface SimulationTx {
  from: string;
  to?: string;
  value?: bigint;
  data?: `0x${string}`;
}

/** ABI-decodes `Error(string)` revert payloads (0x08c379a0 + offset + length + data). */
export function decodeRevertData(data: unknown): string | undefined {
  if (typeof data !== 'string' || !data.startsWith('0x')) return undefined;
  if (!data.startsWith('0x08c379a0')) return undefined;

  const body = data.slice(10);
  if (body.length < 128) return undefined;

  const length = Number.parseInt(body.slice(64, 128), 16);
  if (!Number.isFinite(length) || length <= 0) return undefined;

  const hex = body.slice(128, 128 + length * 2);
  let text = '';
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const code = Number.parseInt(hex.slice(i, i + 2), 16);
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text || undefined;
}

/** Pulls a human-readable reason out of whatever an RPC threw. */
export function extractRevertReason(err: unknown): string | undefined {
  if (!err) return undefined;

  if (typeof err === 'object') {
    const withData = err as { data?: { message?: string } | string };
    if (typeof withData.data === 'object' && withData.data?.message) return withData.data.message;
    const decoded = decodeRevertData(withData.data);
    if (decoded) return decoded;
  }

  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : undefined;
  if (!message) return undefined;

  if (/user rejected|denied/i.test(message)) return undefined;

  const reverted = /execution reverted(?::\s*(.*))?/i.exec(message);
  if (reverted?.[1]) return reverted[1];
  if (/execution reverted/i.test(message)) return 'The contract rejected this transaction';

  const embedded = /0x08c379a0[0-9a-f]+/i.exec(message);
  if (embedded) return decodeRevertData(embedded[0]) ?? 'The contract rejected this transaction';

  return message;
}

export async function simulateTransaction(
  rpc: RpcCaller,
  chainId: number,
  tx: SimulationTx,
): Promise<SimulationResult> {
  const rpcTx: Record<string, string> = { from: tx.from };
  if (tx.to) rpcTx.to = tx.to;
  if (tx.value !== undefined && tx.value > 0n) rpcTx.value = bigIntToHex(tx.value);
  if (tx.data) rpcTx.data = tx.data;

  try {
    await rpc.call<`0x${string}`>(chainId, 'eth_call', [rpcTx, 'latest']);
  } catch (err) {
    return { success: false, revertReason: extractRevertReason(err) ?? 'Simulation failed' };
  }

  try {
    const gasHex = await rpc.call<`0x${string}`>(chainId, 'eth_estimateGas', [rpcTx]);
    return { success: true, gasEstimate: BigInt(gasHex) };
  } catch (err) {
    // eth_call passed but estimation failed — treat as a failed simulation, not a warning.
    return { success: false, revertReason: extractRevertReason(err) ?? 'Gas estimation failed' };
  }
}

// ✅ COMPLIES WITH: AGENTS.md §12.1
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
