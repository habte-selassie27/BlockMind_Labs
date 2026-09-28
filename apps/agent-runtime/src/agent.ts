import { getAllToolSchemas, getToolHandler } from './tools';
import { ToolContext } from './tools';

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
  // Set when the LLM was unreachable and a read-only shortcut was used instead.
  // Callers must surface this to the user; a degraded answer must never be
  // presented as if the model produced it.
  degraded?: boolean;
}

export type CallLLMResult =
  | { ok: true; response: LLMResponse }
  | { ok: false; code: 'LLM_UNAVAILABLE'; reason: string };

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
): Promise<CallLLMResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, code: 'LLM_UNAVAILABLE', reason: 'GROQ_API_KEY is not configured' };
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
      return {
        ok: false,
        code: 'LLM_UNAVAILABLE',
        reason: `LLM provider returned ${response.status}`,
      };
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      return { ok: true, response: { content: 'No response from AI.' } };
    }

    if (choice.message?.tool_calls?.length > 0) {
      const toolCalls = choice.message.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      }));
      return { ok: true, response: { content: null, toolCalls } };
    }

    return { ok: true, response: { content: choice.message?.content || 'No response.' } };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown error';
    console.error('LLM call failed:', reason);
    return { ok: false, code: 'LLM_UNAVAILABLE', reason: `LLM request failed: ${reason}` };
  }
}

// Read-only shortcut used only when the LLM is unreachable.
//
// This used to be `fallbackRouting`, which substring-matched the user's text and
// returned hardcoded arguments — including a zero address as the transfer
// recipient. That is indistinguishable, to the user and to any downstream
// consumer, from a real parsed intent, so a request like "send 10 GIWA to 0xabc"
// silently became a transfer to 0x0000...0000.
//
// It is now restricted to a single read-only tool, and it never invents an
// argument: an empty `arguments` lets get_balance fall back to the connected
// wallet. Anything requiring interpretation of user text is refused rather than
// guessed, because a wrong answer that looks right is worse than no answer.
function readOnlyShortcut(messages: Array<{ role: string; content: string }>): LLMResponse | null {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg) return null;

  const text = lastUserMsg.content.toLowerCase();

  const isBalanceQuery =
    text.includes('balance') || text.includes('how much do i') || text.includes('how much');

  if (isBalanceQuery) {
    return {
      content: null,
      degraded: true,
      toolCalls: [
        {
          id: `fallback_${Date.now()}`,
          name: 'get_balance',
          arguments: {},
        },
      ],
    };
  }

  return null;
}

export { readOnlyShortcut };

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
