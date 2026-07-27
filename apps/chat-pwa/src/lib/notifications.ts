export interface Notification {
  id: string;
  type: 'tx_success' | 'tx_failed' | 'price_alert' | 'security' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  txHash?: string;
  chainId?: number;
}

type NotificationListener = (notification: Notification) => void;

class NotificationService {
  private listeners: NotificationListener[] = [];
  private notifications: Notification[] = [];
  private storageKey = 'blockmind_notifications';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) this.notifications = JSON.parse(stored);
    } catch {}
  }

  private persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.notifications.slice(0, 100)));
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const full: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      read: false,
    };

    this.notifications = [full, ...this.notifications].slice(0, 100);
    this.persist();
    this.listeners.forEach(l => l(full));
  }

  txSuccess(hash: string, chainId: number, summary: string) {
    this.notify({
      type: 'tx_success',
      title: 'Transaction Confirmed',
      message: summary,
      txHash: hash,
      chainId,
    });
  }

  txFailed(hash: string, chainId: number, error: string) {
    this.notify({
      type: 'tx_failed',
      title: 'Transaction Failed',
      message: error,
      txHash: hash,
      chainId,
    });
  }

  priceAlert(symbol: string, price: number, direction: 'up' | 'down') {
    this.notify({
      type: 'price_alert',
      title: `Price Alert: ${symbol}`,
      message: `${symbol} is now $${price.toFixed(2)} (${direction === 'up' ? '↑' : '↓'})`,
    });
  }

  securityAlert(message: string) {
    this.notify({
      type: 'security',
      title: 'Security Alert',
      message,
    });
  }

  info(title: string, message: string) {
    this.notify({ type: 'info', title, message });
  }

  getNotifications(): Notification[] {
    return this.notifications;
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(id: string) {
    this.notifications = this.notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    this.persist();
  }

  markAllAsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.persist();
  }

  dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.persist();
  }

  clearAll() {
    this.notifications = [];
    this.persist();
  }
}

export const notifications = new NotificationService();
