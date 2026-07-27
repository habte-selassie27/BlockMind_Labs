import { AgentTool } from './types';

export interface ToolHandler {
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  userId: string;
  userTier: string;
  walletAddress: string;
  chainId: number;
  sessionId: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

const toolHandlers = new Map<string, ToolHandler>();
const toolDefinitions = new Map<string, AgentTool>();

export function registerTool(tool: AgentTool, handler: ToolHandler): void {
  toolDefinitions.set(tool.name, tool);
  toolHandlers.set(tool.name, handler);
}

export function getToolDefinition(name: string): AgentTool | undefined {
  return toolDefinitions.get(name);
}

export function getToolHandler(name: string): ToolHandler | undefined {
  return toolHandlers.get(name);
}

export function getAllTools(): AgentTool[] {
  return Array.from(toolDefinitions.values());
}

export function getAllToolSchemas(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
  return Array.from(toolDefinitions.values()).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  }));
}

// ✅ COMPLIES WITH: AGENTS.md §10, §5
// ✅ SERVICE: agent-runtime
