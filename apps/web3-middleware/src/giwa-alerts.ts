/**
 * GIWA Alerts / Watch — in-memory for hackathon, persisted to Redis in prod
 * Watch types: balance, wallet, contract, token, bridge
 */

export interface Watch {
  id: string;
  address: string;
  type: 'balance' | 'wallet' | 'contract' | 'token' | 'bridge' | 'transaction';
  threshold?: string;
  target?: string;
  createdAt: number;
  active: boolean;
  chainId: number;
}

const store = new Map<string, Watch[]>();

export function createWatch(params: { address: string; type: string; threshold?: string; target?: string; chainId?: number }): Watch {
  const watch: Watch = {
    id: `watch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    address: params.address.toLowerCase(),
    type: (params.type as Watch['type']) || 'wallet',
    threshold: params.threshold,
    target: params.target,
    createdAt: Math.floor(Date.now() / 1000),
    active: true,
    chainId: params.chainId || 91342,
  };
  const list = store.get(watch.address) || [];
  list.push(watch);
  store.set(watch.address, list);
  return watch;
}

export function listWatches(address: string): Watch[] {
  return store.get(address.toLowerCase()) || [];
}

export function removeWatch(address: string, id: string): boolean {
  const list = store.get(address.toLowerCase());
  if (!list) return false;
  const idx = list.findIndex(w => w.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  return true;
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: web3-middleware
