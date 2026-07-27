import express from 'express';
import agentRouter from './routes';
import { registerAllTools } from './tool-handlers';

// Register all tool handlers before starting
registerAllTools();

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'agent-runtime' });
});

// Agent API routes
app.use('/agent', agentRouter);

const PORT = Number(process.env.PORT) || 8002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`agent-runtime listening on :${PORT}`);
});

// ✅ COMPLIES WITH: AGENTS.md §2, §9
// ✅ SERVICE: agent-runtime
