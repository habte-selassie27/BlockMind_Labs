import Fastify from 'fastify';
import { authMiddleware, apiKeyMiddleware } from './auth';
import { rateLimitMiddleware } from './ratelimit';
import { proxyRoutes } from './proxy';

const app = Fastify({
  logger: true,
  requestTimeout: 30_000,
});

// Health check (no auth)
app.get('/health', async () => ({
  status: 'ok',
  service: 'api-gateway',
}));

// Docs
app.get('/docs', async () => ({
  openapi: '3.0.0',
  info: { title: 'Blockmind API', version: '0.1.0' },
  paths: {
    '/intent/parse': { post: { summary: 'Parse NL intent' } },
    '/agent/execute': { post: { summary: 'Execute agent' } },
    '/agent/confirm': { post: { summary: 'Confirm TX' } },
    '/chain/balance/{address}': { get: { summary: 'Get balance' } },
    '/chain/simulate': { post: { summary: 'Simulate TX' } },
  },
}));

// Protected routes — JWT auth + rate limiting + proxy
app.addHook('onRequest', authMiddleware);
app.addHook('onRequest', rateLimitMiddleware);
await proxyRoutes(app);

const start = async () => {
  const port = parseInt(process.env.PORT || '3000');
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`api-gateway listening on :${port}`);
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: api-gateway
