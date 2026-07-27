import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, executeTool } from '../../src/agent';
import type { ToolContext } from '../../src/types';

describe('Agent', () => {
  it('builds system prompt with tool descriptions', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Blockmind');
    expect(prompt).toContain('get_balance');
    expect(prompt).toContain('transfer_token');
    expect(prompt).toContain('swap_tokens');
  });

  it('includes user context when provided', () => {
    const prompt = buildSystemPrompt('User wallet: 0xabc');
    expect(prompt).toContain('User wallet: 0xabc');
  });

  it('executes a known tool', async () => {
    const context: ToolContext = {
      userId: 'test',
      userTier: 'free',
      walletAddress: '0xabc',
      chainId: 9134,
      sessionId: 'sess_test',
    };

    const result = await executeTool('get_balance', { token: 'GIWA' }, context);
    expect(result.success).toBe(true);
  });

  it('returns error for unknown tools', async () => {
    const context: ToolContext = {
      userId: 'test',
      userTier: 'free',
      walletAddress: '0xabc',
      chainId: 9134,
      sessionId: 'sess_test',
    };

    const result = await executeTool('nonexistent_tool', {}, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });
});
