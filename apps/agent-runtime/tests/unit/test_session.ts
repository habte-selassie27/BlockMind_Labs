import { describe, it, expect } from 'vitest';
import {
  createSession,
  getSession,
  addMessage,
  getHistory,
  listSessions,
  createPendingConfirmation,
  getPendingConfirmation,
  removePendingConfirmation,
} from '../../src/session';

describe('Session Management', () => {
  it('creates a session', () => {
    const session = createSession('user1', '0xabc', 9134);
    expect(session.id).toMatch(/^sess_/);
    expect(session.userId).toBe('user1');
    expect(session.walletAddress).toBe('0xabc');
    expect(session.chainId).toBe(9134);
    expect(session.messageCount).toBe(0);
  });

  it('retrieves a session', () => {
    const created = createSession('user2', '0xdef', 9134);
    const retrieved = getSession(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
  });

  it('returns undefined for unknown sessions', () => {
    expect(getSession('sess_nonexistent')).toBeUndefined();
  });

  it('adds messages to a session', () => {
    const session = createSession('user3', '0xghi', 9134);
    addMessage(session.id, {
      role: 'user',
      content: 'Hello',
      timestamp: Math.floor(Date.now() / 1000),
    });

    const updated = getSession(session.id);
    expect(updated?.messageCount).toBe(1);
    expect(updated?.history).toHaveLength(1);
  });

  it('retrieves history with limit', () => {
    const session = createSession('user4', '0xjkl', 9134);
    for (let i = 0; i < 10; i++) {
      addMessage(session.id, {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: Math.floor(Date.now() / 1000),
      });
    }

    const history = getHistory(session.id, 5);
    expect(history).toHaveLength(5);
    expect(history[0].content).toBe('Message 5');
  });

  it('lists sessions by userId', () => {
    createSession('user5', '0xmno', 9134);
    createSession('user5', '0xpqr', 9134);
    createSession('other', '0xstu', 9134);

    const sessions = listSessions('user5');
    expect(sessions).toHaveLength(2);
    expect(sessions.every((s) => s.userId === 'user5')).toBe(true);
  });

  it('creates and retrieves pending confirmations', () => {
    const session = createSession('user6', '0xvwx', 9134);
    const conf = createPendingConfirmation(session.id, 'transfer_token', { amount: '10' }, { action: 'transfer' });
    expect(conf.token).toMatch(/^conf_/);
    expect(conf.expiresAt).toBeGreaterThan(conf.createdAt);

    const retrieved = getPendingConfirmation(conf.token);
    expect(retrieved).toBeDefined();
    expect(retrieved?.toolName).toBe('transfer_token');
  });

  it('removes pending confirmations', () => {
    const session = createSession('user7', '0xyz1', 9134);
    const conf = createPendingConfirmation(session.id, 'swap_tokens', {}, {});
    removePendingConfirmation(conf.token);
    expect(getPendingConfirmation(conf.token)).toBeUndefined();
  });
});
