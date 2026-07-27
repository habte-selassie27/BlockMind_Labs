import Fastify from 'fastify';
import routes from './routes';

const app = Fastify({ logger: true });

await app.register(routes);

const PORT = Number(process.env.PORT) || 8003;
app.listen({ port: PORT, host: '0.0.0.0' });

// ✅ COMPLIES WITH: AGENTS.md §2, §9
// ✅ SERVICE: web3-middleware
