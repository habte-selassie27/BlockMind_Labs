import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    sub: string;
    wallet: string;
    chain_id: number;
    tier: string;
    permissions: string[];
  };
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply,
): Promise<void> {
  // Dev mode: skip auth entirely
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true') {
    request.user = {
      sub: 'dev_user',
      wallet: '0x04e0353b7218b66d6803725ce7342e6e1225db1b',
      chain_id: 91342,
      tier: 'free',
      permissions: ['chat', 'reads'],
    };
    return;
  }

  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({
      error: {
        code: 'AUTH_MISSING',
        message: 'Authorization header required',
        request_id: request.id,
      },
    });
  }

  const token = authHeader.slice(7);

  try {
    // In production: verify JWT with RS256 using JWKS
    // For now: decode base64 payload (dev only)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return reply.code(401).send({
        error: {
          code: 'AUTH_EXPIRED',
          message: 'Token expired',
          request_id: request.id,
        },
      });
    }

    request.user = {
      sub: payload.sub,
      wallet: payload.wallet,
      chain_id: payload.chain_id,
      tier: payload.tier,
      permissions: payload.permissions || [],
    };
  } catch {
    return reply.code(401).send({
      error: {
        code: 'AUTH_INVALID',
        message: 'Invalid token',
        request_id: request.id,
      },
    });
  }
}

export async function apiKeyMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return reply.code(401).send({
      error: {
        code: 'API_KEY_MISSING',
        message: 'X-API-Key header required',
        request_id: request.id,
      },
    });
  }

  if (!apiKey.startsWith('bm_live_') && !apiKey.startsWith('bm_test_')) {
    return reply.code(401).send({
      error: {
        code: 'API_KEY_INVALID',
        message: 'Invalid API key format',
        request_id: request.id,
      },
    });
  }

  // In production: validate key against database
  request.user = {
    sub: `sdk_${apiKey.slice(0, 12)}`,
    wallet: '',
    chain_id: 91342,
    tier: apiKey.startsWith('bm_test_') ? 'sdk_starter' : 'sdk_team',
    permissions: ['sdk'],
  };
}

// ✅ COMPLIES WITH: AGENTS.md §9, §11.6
// ✅ SERVICE: api-gateway
