import { Router, Request, Response } from 'express';
import {
  createNotification,
  getNotifications,
  markAsRead,
  getUnreadCount,
  createWebhook,
  getUserWebhooks,
  deleteWebhook,
} from './store';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// Get notifications for a user
router.get('/notifications/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const notifs = getNotifications(userId, limit);
  const unread = getUnreadCount(userId);
  res.json({ notifications: notifs, unread_count: unread });
});

// Mark notification as read
router.post('/notifications/:userId/:notifId/read', (req: Request, res: Response) => {
  const { userId, notifId } = req.params;
  const success = markAsRead(userId, notifId);
  if (success) {
    res.json({ marked: true });
  } else {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
  }
});

// Send notification (internal use)
router.post('/notify', (req: Request, res: Response) => {
  const { user_id, type, title, message, metadata } = req.body;
  if (!user_id || !type || !title) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'user_id, type, title required' } });
    return;
  }
  const notif = createNotification(user_id, type, title, message, metadata);
  res.status(201).json(notif);
});

// Webhook management
router.get('/webhooks/:userId', (req: Request, res: Response) => {
  const webhooks = getUserWebhooks(req.params.userId);
  res.json({ webhooks });
});

router.post('/webhooks', (req: Request, res: Response) => {
  const { user_id, url, events } = req.body;
  if (!user_id || !url || !events) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'user_id, url, events required' } });
    return;
  }
  const webhook = createWebhook(user_id, url, events);
  res.status(201).json(webhook);
});

router.delete('/webhooks/:userId/:webhookId', (req: Request, res: Response) => {
  const success = deleteWebhook(req.params.userId, req.params.webhookId);
  if (success) {
    res.json({ deleted: true });
  } else {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
  }
});

export default router;

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: notification-service
