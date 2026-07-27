import express from 'express';
import router from './routes';

const app = express();
app.use(express.json());
app.use(router);

const PORT = Number(process.env.PORT) || 8009;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`admin-service listening on :${PORT}`);
});

// ✅ COMPLIES WITH: AGENTS.md §2, §9
// ✅ SERVICE: admin-service
