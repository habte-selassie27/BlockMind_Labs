import crypto from 'crypto';
import { getToolHandler, getToolDefinition } from './tools';
import { ToolContext } from './types';

export interface Session {
  id: string;
  userId: string;
  walletAddress: string;
  chainId: number;
  createdAt: number;
  lastActiveAt: number;
  messageCount: number;
  summary: string;
  history: Message[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: ToolCallRecord[];
  toolResults?: ToolResultRecord[];
}

export interface ToolCallRecord {
  tool: string;
  arguments: Record<string, unknown>;
  id: string;
}

export interface ToolResultRecord {
  tool: string;
  result: unknown;
  id: string;
}

export interface PendingConfirmation {
  token: string;
  sessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  summary: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
}

// In-memory stores (Phase 2: move to Redis/DB)
const sessions = new Map<string, Session>();
const pendingConfirmations = new Map<string, PendingConfirmation>();

export function createSession(userId: string, walletAddress: string, chainId: number): Session {
  const id = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const now = Math.floor(Date.now() / 1000);
  const session: Session = {
    id,
    userId,
    walletAddress,
    chainId,
    createdAt: now,
    lastActiveAt: now,
    messageCount: 0,
    summary: '',
    history: [],
  };
  sessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function touchSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActiveAt = Math.floor(Date.now() / 1000);
  }
}

export function addMessage(sessionId: string, message: Message): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.history.push(message);
    session.messageCount++;
    touchSession(sessionId);
  }
}

export function getHistory(sessionId: string, limit = 50): Message[] {
  const session = sessions.get(sessionId);
  if (!session) return [];
  return session.history.slice(-limit);
}

export function listSessions(userId: string, limit = 20): Session[] {
  return Array.from(sessions.values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    .slice(0, limit);
}

export function createPendingConfirmation(
  sessionId: string,
  toolName: string,
  toolArgs: Record<string, unknown>,
  summary: Record<string, unknown>
): PendingConfirmation {
  const token = `conf_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const now = Math.floor(Date.now() / 1000);
  const confirmation: PendingConfirmation = {
    token,
    sessionId,
    toolName,
    toolArgs,
    summary,
    createdAt: now,
    expiresAt: now + 300, // 5 minutes
  };
  pendingConfirmations.set(token, confirmation);
  return confirmation;
}

export function getPendingConfirmation(token: string): PendingConfirmation | undefined {
  const conf = pendingConfirmations.get(token);
  if (conf && conf.expiresAt < Math.floor(Date.now() / 1000)) {
    pendingConfirmations.delete(token);
    return undefined;
  }
  return conf;
}

export function removePendingConfirmation(token: string): void {
  pendingConfirmations.delete(token);
}

// ✅ COMPLIES WITH: AGENTS.md §5, API.md
// ✅ SERVICE: agent-runtime
