import type { Notification, Webhook } from './types';

// In-memory stores (production: PostgreSQL + Redis)
const notifications = new Map<string, Notification[]>();
const webhooks = new Map<string, Webhook[]>();

function generateId(): string {
  return `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  metadata: Record<string, unknown> = {},
): Notification {
  const notif: Notification = {
    id: generateId(),
    user_id: userId,
    type,
    title,
    message,
    metadata,
    read: false,
    created_at: Math.floor(Date.now() / 1000),
  };

  const userNotifs = notifications.get(userId) || [];
  userNotifs.unshift(notif);
  notifications.set(userId, userNotifs.slice(0, 100)); // Keep last 100

  return notif;
}

export function getNotifications(userId: string, limit: number = 20): Notification[] {
  return (notifications.get(userId) || []).slice(0, limit);
}

export function markAsRead(userId: string, notificationId: string): boolean {
  const userNotifs = notifications.get(userId) || [];
  const notif = userNotifs.find(n => n.id === notificationId);
  if (notif) {
    notif.read = true;
    return true;
  }
  return false;
}

export function getUnreadCount(userId: string): number {
  return (notifications.get(userId) || []).filter(n => !n.read).length;
}

// Webhook management
export function createWebhook(userId: string, url: string, events: string[]): Webhook {
  const webhook: Webhook = {
    id: `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    url,
    events,
    secret: Math.random().toString(36).slice(2),
    active: true,
    created_at: Math.floor(Date.now() / 1000),
  };

  const userWebhooks = webhooks.get(userId) || [];
  userWebhooks.push(webhook);
  webhooks.set(userId, userWebhooks);

  return webhook;
}

export function getUserWebhooks(userId: string): Webhook[] {
  return webhooks.get(userId) || [];
}

export function deleteWebhook(userId: string, webhookId: string): boolean {
  const userWebhooks = webhooks.get(userId) || [];
  const idx = userWebhooks.findIndex(w => w.id === webhookId);
  if (idx >= 0) {
    userWebhooks.splice(idx, 1);
    return true;
  }
  return false;
}

export async function triggerWebhooks(userId: string, event: string, data: Record<string, unknown>): Promise<void> {
  const userWebhooks = (webhooks.get(userId) || []).filter(
    w => w.active && w.events.includes(event)
  );

  for (const webhook of userWebhooks) {
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret,
        },
        body: JSON.stringify({
          event,
          data,
          timestamp: Date.now(),
        }),
      });
    } catch {
      // Webhook delivery failed — in production, retry with backoff
    }
  }
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: notification-service
