const MIDDLEWARE = (import.meta as any).env.VITE_WEB3_MIDDLEWARE_URL || '/api';

export interface ResolveResult {
  up_id: string;
  address: string;
  resolved: boolean;
  source: string;
  is_verified: boolean;
  dojang_issued: boolean;
  verified_tokens: number;
}

export async function resolveUpId(upId: string): Promise<ResolveResult> {
  const res = await fetch(`${MIDDLEWARE}/giwa/up/${encodeURIComponent(upId)}`);
  if (!res.ok) throw new Error('resolve failed');
  return res.json();
}

export async function createUpId(requestedUpId: string, owner: string): Promise<any> {
  const res = await fetch(`${MIDDLEWARE}/giwa/up/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requested_up_id: requestedUpId, owner }),
  });
  if (!res.ok) throw new Error((await res.json()).error?.message || 'create failed');
  return res.json();
}

export async function verifyDojang(id: string): Promise<any> {
  const res = await fetch(`${MIDDLEWARE}/giwa/dojang/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('verify failed');
  return res.json();
}

export function isUpId(input: string): boolean {
  return /^[a-z0-9_-]+\.(up|giwa)(\.up)?$/i.test(input.trim());
}

export function formatUpId(upId: string): string {
  return upId.toLowerCase().trim();
}

// ✅ COMPLIES WITH: AGENTS.md §9, §10
// ✅ SERVICE: chat-pwa
