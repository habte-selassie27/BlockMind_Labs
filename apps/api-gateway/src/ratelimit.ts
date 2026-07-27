import type { FastifyInstance } from 'fastify';
import type { AuthenticatedRequest } from './auth';
import { RATE_LIMITS } from './config';

const windowMs = 60 * 1000; // 1 minute window

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

function getKey(userId: string, endpoint: string): string {
  return `${userId}:${endpoint}`;
}

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

export async function rateLimitMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.user;
  if (!user) return;

  const tier = user.tier || 'free';
  const limits = RATE_LIMITS[tier] || RATE_LIMITS.free;

  // Determine endpoint type from URL
  const url = request.url;
  let limit: number;
  let endpoint: string;

  if (url.includes('/chat') || url.includes('/agent')) {
    limit = limits.chat;
    endpoint = 'chat';
  } else if (url.includes('/sdk')) {
    limit = limits.sdk;
    endpoint = 'sdk';
  } else {
    limit = limits.reads;
    endpoint = 'reads';
  }

  if (limit === Infinity) return;

  const key = getKey(user.sub, endpoint);
  if (isRateLimited(key, limit)) {
    return reply.code(429).send({
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded for ${endpoint} (${tier} tier)`,
        details: { limit, window: '1m', tier },
        request_id: request.id,
      },
    });
  }
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > windowMs * 2) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: api-gateway
