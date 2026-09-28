const MIDDLEWARE = (import.meta as any).env.VITE_WEB3_MIDDLEWARE_URL || '/api';

export async function explainAddress(address: string, chainId = 91342): Promise<any> {
  const res = await fetch(`${MIDDLEWARE}/explorer/address/${address}?chain_id=${chainId}`);
  if (!res.ok) throw new Error('explain address failed');
  return res.json();
}

export async function explainTransaction(hash: string): Promise<any> {
  const res = await fetch(`${MIDDLEWARE}/explorer/tx/${hash}`);
  if (!res.ok) throw new Error('explain tx failed');
  return res.json();
}

export async function debugTransaction(hash: string): Promise<any> {
  const res = await fetch(`${MIDDLEWARE}/explorer/debug/${hash}`);
  if (!res.ok) throw new Error('debug failed');
  return res.json();
}

export async function discoverGiwaApps(category?: string): Promise<{ category: string; results: any[]; count: number }> {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  const res = await fetch(`${MIDDLEWARE}/explorer/discover${q}`);
  if (!res.ok) throw new Error('discover failed');
  return res.json();
}

export async function simulateBatch(steps: any[], from: string, chainId = 91342): Promise<any> {
  const res = await fetch(`${MIDDLEWARE}/chain/batch/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps, from, chainId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'batch simulation failed');
  return data;
}

export function getExplorerUrl(hashOrAddr: string, type: 'tx' | 'address' = 'tx', chainId = 91342): string {
  const base = chainId === 9134 ? 'https://explorer.giwa.io' : 'https://sepolia-explorer.giwa.io';
  return `${base}/${type}/${hashOrAddr}`;
}

// ✅ COMPLIES WITH: AGENTS.md §9, §10
// ✅ SERVICE: chat-pwa
