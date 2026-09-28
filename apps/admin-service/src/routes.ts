import { Router, Request, Response } from 'express';
import {
  createUser,
  getUserById,
  getUserByWallet,
  getAllUsers,
  updateUser,
  deleteUser,
  getSystemHealth,
  getAdminStats,
} from './store';
import { requireAdmin } from './auth';

const router: Router = Router();

// Health check stays open so orchestrators can probe liveness.
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'admin-service' });
});

// Everything below this line reads or mutates user records and system-wide
// state, so it requires a signed admin token.
router.use(requireAdmin);

// System health
router.get('/system/health', async (_req: Request, res: Response) => {
  const health = await getSystemHealth();
  res.json({ services: health });
});

// Admin stats
router.get('/system/stats', async (_req: Request, res: Response) => {
  const stats = await getAdminStats();
  res.json(stats);
});

// User management
router.get('/users', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  res.json({ users: getAllUsers(limit) });
});

router.get('/users/:id', (req: Request, res: Response) => {
  const user = getUserById(req.params.id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  }
});

router.get('/users/wallet/:wallet', (req: Request, res: Response) => {
  const user = getUserByWallet(req.params.wallet);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  }
});

router.post('/users', (req: Request, res: Response) => {
  const { wallet_address, tier, email } = req.body;
  if (!wallet_address) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'wallet_address required' } });
    return;
  }
  const user = createUser(wallet_address, tier, email);
  res.status(201).json(user);
});

router.patch('/users/:id', (req: Request, res: Response) => {
  const user = updateUser(req.params.id, req.body);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  }
});

router.delete('/users/:id', (req: Request, res: Response) => {
  const deleted = deleteUser(req.params.id);
  if (deleted) {
    res.json({ deleted: true });
  } else {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  }
});

export default router;

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: admin-service
