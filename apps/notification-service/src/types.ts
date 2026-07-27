export interface Notification {
  id: string;
  user_id: string;
  type: 'tx_confirmed' | 'tx_failed' | 'price_alert' | 'webhook' | 'system';
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: number;
}

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: number;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: notification-service
