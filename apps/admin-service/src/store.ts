import type { User, SystemHealth, AdminStats } from './types';

// In-memory stores (production: PostgreSQL)
const users = new Map<string, User>();

function generateId(): string {
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createUser(walletAddress: string, tier: User['tier'] = 'free', email: string | null = null): User {
  const user: User = {
    id: generateId(),
    wallet_address: walletAddress,
    tier,
    email,
    created_at: Math.floor(Date.now() / 1000),
    last_active: Math.floor(Date.now() / 1000),
    total_txs: 0,
    status: 'active',
  };
  users.set(user.id, user);
  return user;
}

export function getUserById(id: string): User | undefined {
  return users.get(id);
}

export function getUserByWallet(wallet: string): User | undefined {
  for (const user of users.values()) {
    if (user.wallet_address.toLowerCase() === wallet.toLowerCase()) return user;
  }
  return undefined;
}

export function getAllUsers(limit: number = 100): User[] {
  return Array.from(users.values()).slice(0, limit);
}

export function updateUser(id: string, updates: Partial<Pick<User, 'tier' | 'email' | 'status'>>): User | undefined {
  const user = users.get(id);
  if (!user) return undefined;
  Object.assign(user, updates);
  return user;
}

export function deleteUser(id: string): boolean {
  return users.delete(id);
}

export function incrementTxs(id: string): void {
  const user = users.get(id);
  if (user) {
    user.total_txs++;
    user.last_active = Math.floor(Date.now() / 1000);
  }
}

// System health
const SERVICES = [
  { name: 'api-gateway', url: 'http://localhost:3000' },
  { name: 'intent-service', url: 'http://localhost:8001' },
  { name: 'agent-runtime', url: 'http://localhost:8002' },
  { name: 'web3-middleware', url: 'http://localhost:8003' },
  { name: 'wallet-signer', url: 'http://localhost:8004' },
  { name: 'memory-service', url: 'http://localhost:8005' },
  { name: 'analytics-service', url: 'http://localhost:8006' },
  { name: 'notification-service', url: 'http://localhost:8007' },
  { name: 'sdk-proxy', url: 'http://localhost:8008' },
  { name: 'admin-service', url: 'http://localhost:8009' },
];

export async function checkServiceHealth(service: { name: string; url: string }): Promise<SystemHealth> {
  const start = Date.now();
  try {
    const res = await fetch(`${service.url}/health`, { signal: AbortSignal.timeout(3000) });
    const latency = Date.now() - start;
    return {
      service: service.name,
      status: res.ok ? 'healthy' : 'degraded',
      latency_ms: latency,
      last_check: Math.floor(Date.now() / 1000),
    };
  } catch {
    return {
      service: service.name,
      status: 'down',
      latency_ms: Date.now() - start,
      last_check: Math.floor(Date.now() / 1000),
    };
  }
}

export async function getSystemHealth(): Promise<SystemHealth[]> {
  return Promise.all(SERVICES.map(checkServiceHealth));
}

export async function getAdminStats(): Promise<AdminStats> {
  const allUsers = Array.from(users.values());
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;

  return {
    total_users: allUsers.length,
    active_users_24h: allUsers.filter(u => u.last_active > dayAgo).length,
    total_txs_24h: allUsers.reduce((sum, u) => sum + u.total_txs, 0),
    total_tvl: '0',
    services: await getSystemHealth(),
  };
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: admin-service
