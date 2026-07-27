import { useState } from 'react';

interface Notification {
  id: string;
  type: 'tx_success' | 'tx_failed' | 'alert' | 'info' | 'price';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

interface Props {
  onClose: () => void;
}

const mockNotifications: Notification[] = [
  { id: '1', type: 'tx_success', title: 'Transfer Confirmed', message: '100 GIWA sent to 0x5678...ef01', timestamp: Date.now() - 300000, read: false, actionUrl: 'https://sepolia-explorer.giwa.io' },
  { id: '2', type: 'price', title: 'Price Alert', message: 'GIWA is up 5.2% in the last 24h', timestamp: Date.now() - 3600000, read: false },
  { id: '3', type: 'tx_success', title: 'Swap Completed', message: 'Swapped 50 GIWA for 42.5 USDC', timestamp: Date.now() - 7200000, read: true },
  { id: '4', type: 'alert', title: 'Approvals Warning', message: 'You have 2 unlimited token approvals', timestamp: Date.now() - 86400000, read: true },
  { id: '5', type: 'info', title: 'Welcome to Blockmind', message: 'Start by connecting your wallet', timestamp: Date.now() - 172800000, read: true },
];

export default function NotificationCenter({ onClose }: Props) {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const typeIcon: Record<string, string> = {
    tx_success: '✅',
    tx_failed: '❌',
    alert: '⚠️',
    info: 'ℹ️',
    price: '📈',
  };

  return (
    <div className="notif-panel">
      <div className="notif-header">
        <div className="notif-header-left">
          <h3 className="notif-title">Notifications</h3>
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount}</span>
          )}
        </div>
        <div className="notif-header-right">
          {unreadCount > 0 && (
            <button className="notif-mark-read" onClick={markAllRead}>
              Mark all read
            </button>
          )}
          <button className="notif-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>

      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="notif-empty">
            <span className="notif-empty-icon">🔔</span>
            <p>No notifications yet.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notif-item ${notif.read ? '' : 'notif-unread'}`}
            >
              <span className="notif-icon">{typeIcon[notif.type]}</span>
              <div className="notif-content">
                <div className="notif-content-header">
                  <span className="notif-item-title">{notif.title}</span>
                  <button className="notif-dismiss" onClick={() => dismiss(notif.id)} aria-label="Dismiss">✕</button>
                </div>
                <p className="notif-item-message">{notif.message}</p>
                <span className="notif-item-time">{formatTime(notif.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
