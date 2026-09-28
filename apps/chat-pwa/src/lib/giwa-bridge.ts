const MIDDLEWARE = (import.meta as any).env.VITE_WEB3_MIDDLEWARE_URL || '/api';

export interface BridgeEstimate {
  amount: string;
  token: string;
  from_chain: string;
  to_chain: string;
  from_chain_id: number;
  to_chain_id: number;
  estimated_fee: string;
  bridge_time: string;
  route: string;
  simulation: string;
}

export async function estimateBridge(params: {
  amount: string; token?: string; from_chain?: string; to_chain?: string;
}): Promise<BridgeEstimate> {
  const res = await fetch(`${MIDDLEWARE}/bridge/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('bridge estimate failed');
  return res.json();
}

export async function executeBridge(params: {
  amount: string; token: string; from_chain: string; to_chain: string; from: string; to?: string;
}): Promise<{ tx_hash: string; status: string; estimate: BridgeEstimate }> {
  const res = await fetch(`${MIDDLEWARE}/bridge/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json()).error?.message || 'bridge execute failed');
  return res.json();
}

export async function getBridgeStatus(hash: string): Promise<any> {
  const res = await fetch(`${MIDDLEWARE}/bridge/status/${hash}`);
  if (!res.ok) throw new Error('bridge status failed');
  return res.json();
}

// ✅ COMPLIES WITH: AGENTS.md §9, §10
// ✅ SERVICE: chat-pwa
