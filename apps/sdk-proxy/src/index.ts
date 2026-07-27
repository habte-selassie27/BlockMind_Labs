import Fastify from 'fastify';
import { sdkRoutes } from './routes';

const app = Fastify({
  logger: true,
  requestTimeout: 30_000,
});

// Health check
app.get('/health', async () => ({
  status: 'ok',
  service: 'sdk-proxy',
}));

// SDK routes
await app.register(sdkRoutes);

const start = async () => {
  const port = parseInt(process.env.PORT || '8008');
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`sdk-proxy listening on :${port}`);
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: sdk-proxy
