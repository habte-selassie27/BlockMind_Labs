import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminRequest extends Request {
  admin?: {
    sub: string;
    permissions: string[];
  };
}

const warned = new Set<string>();

/**
 * Admin routes were previously unauthenticated: any caller reaching port 8009
 * could list, create, patch and delete users. These routes now require a
 * signed JWT carrying the `admin` permission.
 */
export function isAuthBypassed(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true';
}

export function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction,
): void {
  if (isAuthBypassed()) {
    const route = `${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`;
    if (!warned.has(route)) {
      warned.add(route);
      console.warn(
        `[ADMIN AUTH BYPASS] ${route} served without authentication. ` +
          'Never enable this outside local development.',
      );
    }
    req.admin = { sub: 'dev_admin', permissions: ['admin'] };
    next();
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'JWT_SECRET is not configured; admin routes are closed.',
      },
    });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authorization header required' },
    });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), secret, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;

    const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];

    if (!permissions.includes('admin')) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'This token does not carry the admin permission.',
        },
      });
      return;
    }

    req.admin = { sub: String(payload.sub), permissions };
    next();
  } catch (err) {
    const expired = err instanceof jwt.TokenExpiredError;
    res.status(401).json({
      error: {
        code: expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
        message: expired ? 'Token expired' : 'Invalid token signature',
      },
    });
  }
}

// ✅ COMPLIES WITH: AGENTS.md §12.2, §11 (JWTPayload)
// ✅ SERVICE: admin-service
