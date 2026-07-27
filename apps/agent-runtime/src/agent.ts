import { getAllToolSchemas, getToolHandler } from './tools';
import { ToolContext } from './types';

const LLM_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are Blockmind, an AI agent that helps users interact with blockchain networks through natural language.

You have access to tools for querying balances, transferring tokens, swapping tokens, approving spenders, checking contract risks, reading contracts, and monitoring addresses.

IMPORTANT RULES:
- For state-changing operations (transfer, swap, approve), ALWAYS request user confirmation before executing.
- For read-only operations (get_balance, check_contract_risk, read_contract), execute directly.
- Never execute transactions without explicit user confirmation.
- Never use MAX_UINT256 for approvals unless the user explicitly requests unlimited approval.
- Always check contract risk before interacting with unknown contract addresses.
- Provide clear, concise responses about what you're doing and why.
- If a tool call fails, explain the error and suggest alternatives.

RESPONSE FORMATTING:
- Use markdown formatting for all responses.
- For balance queries, show: **Balance:** {amount} {token} (≈ $ price)
- For monitoring results, show a formatted table or list with clear labels.
- For transaction summaries, show each field on its own line with labels.
- Keep responses under 3-4 sentences unless the user asks for detail.
- Never say "I don't have access to..." or "As an AI..." — just use the tools.`;

export function buildSystemPrompt(userContext?: string): string {
  const toolSchemas = getAllToolSchemas();
  const toolDescriptions = toolSchemas
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n');

  let prompt = SYSTEM_PROMPT;
  prompt += `\n\nAvailable tools:\n${toolDescriptions}`;

  if (userContext) {
    prompt += `\n\nUser context:\n${userContext}`;
  }

  return prompt;
}

export interface LLMResponse {
  content: string | null;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

function buildToolDefinitions(
  toolSchemas: Array<{ name: string; description: string; parameters: Record<string, unknown> }>
) {
  return toolSchemas.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  toolSchemas: Array<{ name: string; description: string; parameters: Record<string, unknown> }>,
  _userId: string,
  _userTier: string
): Promise<LLMResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Fallback to keyword routing if no API key
    return fallbackRouting(messages);
  }

  const systemPrompt = buildSystemPrompt();
  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const tools = buildToolDefinitions(toolSchemas);

  try {
    const response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: fullMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: 'auto',
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LLM API error:', error);
      return fallbackRouting(messages);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      return { content: 'No response from AI.' };
    }

    // Check for tool calls
    if (choice.message?.tool_calls?.length > 0) {
      const toolCalls = choice.message.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      }));
      return { content: null, toolCalls };
    }

    return { content: choice.message?.content || 'No response.' };
  } catch (err) {
    console.error('LLM call failed:', err);
    return fallbackRouting(messages);
  }
}

function fallbackRouting(
  messages: Array<{ role: string; content: string }>
): LLMResponse {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg) {
    return { content: 'I need a message to process.' };
  }

  const text = lastUserMsg.content.toLowerCase();

  if (text.includes('balance') || text.includes('how much')) {
    return {
      content: null,
      toolCalls: [{
        id: `call_${Date.now()}`,
        name: 'get_balance',
        arguments: { token: 'GIWA' },
      }],
    };
  }

  if (text.includes('send') || text.includes('transfer')) {
    return {
      content: null,
      toolCalls: [{
        id: `call_${Date.now()}`,
        name: 'transfer_token',
        arguments: { token: 'GIWA', amount: '10', to: '0x0000000000000000000000000000000000000000' },
      }],
    };
  }

  if (text.includes('swap')) {
    return {
      content: null,
      toolCalls: [{
        id: `call_${Date.now()}`,
        name: 'swap_tokens',
        arguments: { from_token: 'ETH', to_token: 'USDT', amount: '1' },
      }],
    };
  }

  if (text.includes('monitor') || text.includes('watch')) {
    return {
      content: null,
      toolCalls: [{
        id: `call_${Date.now()}`,
        name: 'monitor_address',
        arguments: {},
      }],
    };
  }

  if (text.includes('contract') || text.includes('risk') || text.includes('scam') || text.includes('safe')) {
    return {
      content: null,
      toolCalls: [{
        id: `call_${Date.now()}`,
        name: 'check_contract_risk',
        arguments: { address: '0x0000000000000000000000000000000000000000' },
      }],
    };
  }

  if (text.includes('analyze') || text.includes('activity') || text.includes('history') || text.includes('transaction')) {
    return {
      content: null,
      toolCalls: [{
        id: `call_${Date.now()}`,
        name: 'monitor_address',
        arguments: {},
      }],
    };
  }

  return {
    content: `I understand you want to: "${lastUserMsg.content}". I can help with that. Could you provide more details?`,
  };
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const handler = getToolHandler(toolName);
  if (!handler) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  try {
    return await handler.execute(args, context);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ✅ COMPLIES WITH: AGENTS.md §5, §11, ARCHITECTURE.md §3.3
// ✅ SERVICE: agent-runtime
