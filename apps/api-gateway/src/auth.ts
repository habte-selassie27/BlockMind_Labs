import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const DEV_BYPASS_WARNED = new Set<string>();

/**
 * Resolves the HS256 signing secret.
 *
 * Refuses to fall back to a default: a shared default secret means anyone who
 * has read this source can mint a token for any user. If verification is going
 * to happen at all it has to be against a secret the operator chose.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Refusing to verify tokens with a default secret.',
    );
  }
  return secret;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    sub: string;
    wallet: string;
    chain_id: number;
    tier: string;
    permissions: string[];
  };
}

/**
 * True when the auth bypass is active. Any caller in this state is
 * unauthenticated, so the condition is reported loudly and once per route
 * rather than silently granting a `dev_user` identity.
 */
export function isAuthBypassed(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true';
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply,
): Promise<void> {
  // Dev mode: skip auth entirely
  if (isAuthBypassed()) {
    if (!DEV_BYPASS_WARNED.has(request.url.split('?')[0])) {
      DEV_BYPASS_WARNED.add(request.url.split('?')[0]);
      console.warn(
        `[AUTH BYPASS] ${request.method} ${request.url} served without authentication. ` +
          'Every caller is treated as dev_user. Never enable this in production.',
      );
    }

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
    // The signature is verified, not merely decoded. The previous
    // implementation split the token and base64-decoded the payload, which
    // accepts any well-formed JWT — including one an attacker signs with their
    // own key and a `tier: "enterprise"` claim. Every downstream authorisation
    // decision reads fields set here.
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;

    if (typeof payload.sub !== 'string') {
      throw new Error('Token missing sub claim');
    }

    request.user = {
      sub: payload.sub,
      wallet: typeof payload.wallet === 'string' ? payload.wallet : '',
      chain_id: typeof payload.chain_id === 'number' ? payload.chain_id : 91342,
      tier: (payload.tier as string) || 'free',
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    };
  } catch (err) {
    const expired = err instanceof jwt.TokenExpiredError;
    return reply.code(401).send({
      error: {
        code: expired ? 'AUTH_EXPIRED' : 'AUTH_INVALID',
        message: expired ? 'Token expired' : 'Invalid token signature',
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

  // NOTE: this only checks the key's shape. Any string beginning `bm_live_` is
  // accepted as a `sdk_team` credential, so it must not be trusted to grant
  // authorisation on its own — there is no key store to validate against yet.
  // A real check requires looking the key up and comparing its hash.
  if (!process.env.SDK_KEY_STORE_READY) {
    console.warn(
      '[AUTH] SDK API key accepted on format alone — no key store configured. ' +
        'Treat SDK identities as unverified.',
    );
  }

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
