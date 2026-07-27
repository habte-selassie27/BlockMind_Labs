import { describe, it, expect } from 'vitest';
import {
  registerTool,
  getToolDefinition,
  getToolHandler,
  getAllTools,
  getAllToolSchemas,
} from '../../src/tools';
import type { AgentTool } from '../../src/types';

const testTool: AgentTool = {
  name: 'test_tool',
  description: 'A test tool',
  input_schema: { type: 'object', properties: {} },
  requires_confirmation: false,
  simulation_supported: false,
  chains_supported: [],
};

describe('Tool Registry', () => {
  it('registers and retrieves a tool definition', () => {
    registerTool(testTool, {
      execute: async () => ({ success: true }),
    });

    const tool = getToolDefinition('test_tool');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('test_tool');
    expect(tool?.description).toBe('A test tool');
  });

  it('retrieves a tool handler', () => {
    const handler = getToolHandler('test_tool');
    expect(handler).toBeDefined();
  });

  it('returns undefined for unknown tools', () => {
    expect(getToolDefinition('nonexistent')).toBeUndefined();
    expect(getToolHandler('nonexistent')).toBeUndefined();
  });

  it('lists all registered tools', () => {
    const tools = getAllTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t) => t.name === 'test_tool')).toBe(true);
  });

  it('returns schemas in LLM-compatible format', () => {
    const schemas = getAllToolSchemas();
    expect(schemas.length).toBeGreaterThan(0);
    const testSchema = schemas.find((s) => s.name === 'test_tool');
    expect(testSchema).toBeDefined();
    expect(testSchema?.parameters).toBeDefined();
  });
});
