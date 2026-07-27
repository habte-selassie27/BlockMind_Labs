import { getBalance, estimateGas, simulateTransaction } from './chain';
import { jsonRPCCall } from './rpc';
import type { TransactionRequest, TransactionResult } from './types';

const WALLET_SIGNER_URL = process.env.WALLET_SIGNER_URL || 'http://localhost:8004';

export async function buildTransaction(
  params: TransactionRequest
): Promise<{ tx: TransactionRequest; gasEstimate: string }> {
  // Estimate gas if not provided
  let gasLimit = params.gasLimit;
  if (!gasLimit) {
    const estimate = await estimateGas(params, params.chainId);
    gasLimit = estimate.gasLimit;
    params.maxFeePerGas = estimate.maxFeePerGas;
    params.maxPriorityFeePerGas = estimate.maxPriorityFeePerGas;
  }

  return {
    tx: { ...params, gasLimit },
    gasEstimate: gasLimit,
  };
}

export async function simulateAndBuild(
  params: TransactionRequest
): Promise<{ tx: TransactionRequest; simulation: { success: boolean; gasUsed: string; revertReason?: string } }> {
  // Simulate first (AGENTS.md §11.1)
  const simulation = await simulateTransaction(params);

  if (!simulation.success) {
    throw new Error(`Simulation failed: ${simulation.revertReason}`);
  }

  // Build with gas estimate
  const { tx } = await buildTransaction(params);

  return { tx, simulation };
}

export async function submitTransaction(
  signedTx: string
): Promise<TransactionResult> {
  const { result } = await jsonRPCCall('eth_sendRawTransaction', [signedTx]);

  return {
    hash: result as string,
    chainId: 9134,
    from: '0x0000000000000000000000000000000000000000',
    to: '0x0000000000000000000000000000000000000000',
    value: '0',
    status: 'submitted',
  };
}

export async function sendToSigner(
  tx: TransactionRequest,
  userId: string
): Promise<{ signed: boolean; txHash?: string; error?: string }> {
  try {
    const response = await fetch(`${WALLET_SIGNER_URL}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx, userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { signed: false, error: (error as any).message || 'Signer error' };
    }

    const data = await response.json();
    return { signed: true, txHash: (data as any).txHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signer unreachable';
    return { signed: false, error: message };
  }
}

// ✅ COMPLIES WITH: AGENTS.md §10, §9, §11
// ✅ SERVICE: web3-middleware
