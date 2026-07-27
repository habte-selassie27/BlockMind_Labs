import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createKey, getKeyByValue, incrementCalls } from './keys';
import { getUsageStats, recordCall, recordError } from './metering';
import { SDK_TIERS } from './types';

interface SDKRequest extends FastifyRequest {
  sdkKey?: { id: string; key: string; environment: string; allowed_tools: string[]; monthly_call_limit: number; calls_this_month: number };
}

export async function sdkRoutes(app: FastifyInstance): Promise<void> {
  // Health check
  app.get('/sdk/health', async () => ({
    status: 'ok',
    service: 'sdk-proxy',
  }));

  // Create API key
  app.post('/sdk/keys', async (request: SDKRequest, reply: FastifyReply) => {
    const body = request.body as any;
    const { name, environment, allowed_chains, allowed_tools, monthly_call_limit } = body || {};

    if (!name || !environment) {
      return reply.code(400).send({
        error: { code: 'MISSING_FIELDS', message: 'name and environment required' },
      });
    }

    const sdkKey = createKey({
      name,
      environment,
      allowed_chains: allowed_chains || [91342],
      allowed_tools: allowed_tools || ['get_balance', 'read_contract'],
      monthly_call_limit: monthly_call_limit || 10_000,
    });

    return reply.code(201).send(sdkKey);
  });

  // Get usage stats
  app.get('/sdk/usage', async (request: SDKRequest, reply: FastifyReply) => {
    const keyId = (request.query as any).key_id;
    if (!keyId) {
      return reply.code(400).send({
        error: { code: 'MISSING_KEY_ID', message: 'key_id query param required' },
      });
    }

    const { getKeyById } = await import('./keys.js');
    const sdkKey = getKeyById(keyId);
    if (!sdkKey) {
      return reply.code(404).send({
        error: { code: 'KEY_NOT_FOUND', message: 'API key not found' },
      });
    }

    return getUsageStats(sdkKey);
  });

  // Proxy to agent-runtime with metering
  app.all('/sdk/v1/*', async (request: SDKRequest, reply: FastifyReply) => {
    // 1. Validate API key
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) {
      return reply.code(401).send({
        error: { code: 'API_KEY_MISSING', message: 'X-API-Key header required' },
      });
    }

    const sdkKey = getKeyByValue(apiKey);
    if (!sdkKey) {
      return reply.code(401).send({
        error: { code: 'API_KEY_INVALID', message: 'Invalid API key' },
      });
    }

    // 2. Check rate limit
    const tier = sdkKey.monthly_call_limit <= 10_000 ? 'sdk_starter' : 'sdk_team';
    const limits = SDK_TIERS[tier];
    if (sdkKey.calls_this_month >= limits.monthly_limit) {
      return reply.code(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Monthly call limit reached',
          details: { limit: limits.monthly_limit, used: sdkKey.calls_this_month },
        },
      });
    }

    // 3. Check allowed tools
    const url = request.url;
    if (sdkKey.allowed_tools.length > 0) {
      // Extract tool from URL if applicable
      // For now, allow all and meter
    }

    // 4. Increment call count
    incrementCalls(sdkKey.id);
    recordCall(sdkKey.id, url, 91342);

    // 5. Proxy to upstream (agent-runtime)
    const upstream = process.env.AGENT_RUNTIME_URL || 'http://localhost:8002';
    const path = url.replace('/sdk', '');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const headers: Record<string, string> = {
        'content-type': (request.headers['content-type'] as string) || 'application/json',
        'x-request-id': request.id,
        'x-sdk-key-id': sdkKey.id,
        'x-sdk-environment': sdkKey.environment,
      };

      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
        signal: controller.signal,
      };

      if (!['GET', 'HEAD'].includes(request.method)) {
        fetchOptions.body = JSON.stringify(request.body);
      }

      const response = await fetch(`${upstream}${path}`, fetchOptions);
      clearTimeout(timeout);

      const body = await response.text();
      reply.code(response.status);
      return reply.send(body);
    } catch (err: any) {
      recordError(sdkKey.id);
      if (err.name === 'AbortError') {
        return reply.code(504).send({
          error: { code: 'UPSTREAM_TIMEOUT', message: 'Agent runtime timed out' },
        });
      }
      return reply.code(502).send({
        error: { code: 'UPSTREAM_ERROR', message: err.message },
      });
    }
  });
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: sdk-proxy
