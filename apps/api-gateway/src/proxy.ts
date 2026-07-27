import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from './auth';
import { TIMEOUTS } from './config';

interface ProxyConfig {
  upstream: string;
  timeout: number;
  rewrite?: (url: string) => string;
}

const SERVICES: Record<string, ProxyConfig> = {
  '/intent': {
    upstream: process.env.INTENT_SERVICE_URL || 'http://localhost:8001',
    timeout: TIMEOUTS.intent_service,
    rewrite: (url) => url.replace('/intent', '/v1/intent'),
  },
  '/agent': {
    upstream: process.env.AGENT_RUNTIME_URL || 'http://localhost:8002',
    timeout: TIMEOUTS.agent_runtime,
  },
  '/chain': {
    upstream: process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003',
    timeout: TIMEOUTS.web3_middleware,
  },
  '/memory': {
    upstream: process.env.MEMORY_SERVICE_URL || 'http://localhost:8005',
    timeout: TIMEOUTS.memory_service,
  },
};

function matchService(url: string): { service: ProxyConfig; path: string } | null {
  const stripped = url.replace(/^\/api/, '');
  for (const [prefix, config] of Object.entries(SERVICES)) {
    if (stripped.startsWith(prefix)) {
      return { service: config, path: config.rewrite ? config.rewrite(stripped) : stripped };
    }
  }
  return null;
}

export async function proxyRoutes(app: FastifyInstance): Promise<void> {
  app.all('/*', async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const match = matchService(request.url);
    if (!match) {
      return reply.code(404).send({
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: `No service matches ${request.url}`,
          request_id: request.id,
        },
      });
    }

    const { service, path } = match;
    const targetUrl = `${service.upstream}${path}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), service.timeout);

      const headers: Record<string, string> = {
        'content-type': request.headers['content-type'] || 'application/json',
        'x-request-id': request.id,
        'x-user-id': request.user?.sub || '',
        'x-user-tier': request.user?.tier || '',
      };

      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
        signal: controller.signal,
      };

      if (!['GET', 'HEAD'].includes(request.method)) {
        fetchOptions.body = JSON.stringify(request.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeout);

      const body = await response.text();
      reply.code(response.status);

      for (const [key, value] of response.headers.entries()) {
        if (key !== 'transfer-encoding') {
          reply.header(key, value);
        }
      }

      return reply.send(body);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return reply.code(504).send({
          error: {
            code: 'UPSTREAM_TIMEOUT',
            message: `${match.service.upstream} timed out after ${service.timeout}ms`,
            request_id: request.id,
          },
        });
      }
      return reply.code(502).send({
        error: {
          code: 'UPSTREAM_ERROR',
          message: err.message,
          request_id: request.id,
        },
      });
    }
  });
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: api-gateway
