import { describe, it, expect, beforeAll } from 'vitest';
import { buildSystemPrompt, executeTool } from '../../src/agent';
import { registerAllTools } from '../../src/tool-handlers';
import type { ToolContext } from '../../src/types';

describe('Agent', () => {
  // The tool registry is populated by an explicit registration call that
  // index.ts makes at boot. Without it the registry is empty, so
  // buildSystemPrompt() lists no tools and every executeTool() lookup fails.
  beforeAll(() => {
    registerAllTools();
  });

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

    // get_balance calls the public GIWA RPC. Stub it so the assertion tests our
    // dispatch and response handling rather than the reachability of a third
    // party, and so the suite cannot fail on a network timeout.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      ({
        json: async () => ({ result: '0x1bc16d674ec80000' }),
      }) as unknown as Response) as typeof fetch;

    try {
      const result = await executeTool('get_balance', { token: 'GIWA' }, context);
      expect(result.success).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
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
