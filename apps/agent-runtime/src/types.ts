export interface AgentTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  requires_confirmation: boolean;
  simulation_supported: boolean;
  chains_supported: number[];
}

// ✅ COMPLIES WITH: AGENTS.md §10
// ✅ SERVICE: agent-runtime
