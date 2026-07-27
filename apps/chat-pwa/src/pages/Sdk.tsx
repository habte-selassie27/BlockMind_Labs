import DocsLayout from '../components/docs/DocsLayout';
import { CodeTabs } from '../components/docs/CodeBlock';
import Callout from '../components/docs/Callout';
import SeoHead from '../components/SeoHead';

const sidebar = [
  {
    title: 'SDK Reference',
    items: [
      { label: 'Overview', href: '/docs/sdk' },
      { label: 'Installation', href: '/docs/sdk#installation' },
      { label: 'Configuration', href: '/docs/sdk#configuration' },
      { label: 'Quick Start', href: '/docs/sdk#quickstart' },
    ],
  },
  {
    title: 'Client',
    items: [
      { label: 'BlockmindClient', href: '/docs/sdk#client' },
      { label: 'Sessions', href: '/docs/sdk#sessions' },
      { label: 'Execution', href: '/docs/sdk#execution' },
      { label: 'Streaming', href: '/docs/sdk#streaming' },
    ],
  },
  {
    title: 'Languages',
    items: [
      { label: 'JavaScript / TypeScript', href: '/docs/sdk#javascript' },
      { label: 'Python', href: '/docs/sdk#python' },
      { label: 'Rust', href: '/docs/sdk#rust' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Examples', href: '/docs/sdk#examples' },
      { label: 'Status', href: '/status' },
    ],
  },
];

const toc = [
  { id: 'overview', label: 'Overview' },
  { id: 'installation', label: 'Installation' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'client', label: 'BlockmindClient' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'execution', label: 'Execution' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'examples', label: 'Examples' },
];

export default function Sdk() {
  return (
    <DocsLayout sidebar={sidebar} toc={toc}>
      <SeoHead title="SDK Reference" description="Blockmind SDK — TypeScript/JavaScript library for building AI-native Web3 applications." path="/docs/sdk" />
      {/* Hero */}
      <div className="docs-hero">
        <span className="docs-hero-tag">SDK</span>
        <h1 className="docs-hero-title">Build AI-native dApps</h1>
        <p className="docs-hero-desc">
          The <code className="inline-code">@blockmind/sdk</code> gives your dApp a natural
          language brain. Users type what they want — your app handles intent parsing,
          simulation, signing, and on-chain execution.
        </p>
        <div className="docs-hero-actions">
          <a href="#installation" className="btn btn-primary">Install SDK →</a>
          <a href="/docs/api" className="btn btn-secondary">API Reference</a>
        </div>
      </div>

      {/* Installation */}
      <section id="installation" className="docs-section">
        <h2 className="docs-heading">Installation</h2>
        <CodeTabs tabs={[
          { label: 'npm', code: 'npm install @blockmind/sdk', language: 'bash' },
          { label: 'yarn', code: 'yarn add @blockmind/sdk', language: 'bash' },
          { label: 'pnpm', code: 'pnpm add @blockmind/sdk', language: 'bash' },
          { label: 'Python', code: 'pip install blockmind', language: 'bash' },
          { label: 'Rust', code: 'cargo add blockmind', language: 'bash' },
        ]} />
      </section>

      {/* Configuration */}
      <section id="configuration" className="docs-section">
        <h2 className="docs-heading">Configuration</h2>
        <p className="docs-text">
          Initialize the BlockmindClient with your API key and target chain.
        </p>
        <CodeTabs tabs={[
          { label: 'TypeScript', language: 'typescript', code: `import { BlockmindClient } from '@blockmind/sdk';

const client = new BlockmindClient({
  apiKey: process.env.BLOCKMIND_API_KEY,
  chain: 'giwa-sepolia',     // 'giwa', 'giwa-sepolia', 'ethereum', 'base'
  sandbox: true,              // Use sandbox mode for testing
  timeout: 30000,             // Request timeout in ms
  retries: 3,                 // Automatic retry count
});` },
          { label: 'Python', language: 'python', code: `from blockmind import BlockmindClient

client = BlockmindClient(
    api_key=os.environ.get("BLOCKMIND_API_KEY"),
    chain="giwa-sepolia",
    sandbox=True,
    timeout=30000,
    retries=3
)` },
        ]} />
        <div className="docs-table-wrapper" style={{ marginTop: '1.5rem' }}>
          <table className="docs-table">
            <thead>
              <tr>
                <th>Option</th>
                <th>Type</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>apiKey</code></td>
                <td>string</td>
                <td>—</td>
                <td>Your Blockmind API key (required)</td>
              </tr>
              <tr>
                <td><code>chain</code></td>
                <td>string</td>
                <td><code>"giwa"</code></td>
                <td>Target blockchain network</td>
              </tr>
              <tr>
                <td><code>sandbox</code></td>
                <td>boolean</td>
                <td><code>false</code></td>
                <td>Enable sandbox mode for testing</td>
              </tr>
              <tr>
                <td><code>timeout</code></td>
                <td>number</td>
                <td><code>30000</code></td>
                <td>Request timeout in milliseconds</td>
              </tr>
              <tr>
                <td><code>retries</code></td>
                <td>number</td>
                <td><code>3</code></td>
                <td>Number of automatic retries on failure</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="docs-section">
        <h2 className="docs-heading">Quick Start</h2>
        <p className="docs-text">
          Get up and running with a complete agent session in 4 steps.
        </p>
        <CodeTabs tabs={[
          { label: 'TypeScript', language: 'typescript', code: `import { BlockmindClient } from '@blockmind/sdk';

// 1. Initialize the client
const client = new BlockmindClient({
  apiKey: process.env.BLOCKMIND_API_KEY,
  chain: 'giwa-sepolia',
});

// 2. Create a session
const session = await client.createSession();

// 3. Execute a natural language command
const result = await session.execute(
  'Swap 100 GIWA for USDC',
  { wallet: '0x04e0...db1b' }
);

// 4. Handle confirmation if required
if (result.requiresConfirmation) {
  console.log('Simulation successful. Awaiting user signature.');
  await client.confirm(result.token);
}` },
          { label: 'Python', language: 'python', code: `from blockmind import BlockmindClient

# 1. Initialize the client
client = BlockmindClient(
    api_key=os.environ.get("BLOCKMIND_API_KEY"),
    chain="giwa-sepolia"
)

# 2. Create a session
session = client.create_session()

# 3. Execute a natural language command
result = session.execute(
    prompt="Swap 100 GIWA for USDC",
    wallet="0x04e0...db1b"
)

# 4. Handle confirmation if required
if result.requires_confirmation:
    print("Simulation successful. Awaiting user signature.")
    client.confirm(result.token)` },
        ]} />
      </section>

      {/* Client */}
      <section id="client" className="docs-section">
        <h2 className="docs-heading">BlockmindClient</h2>
        <p className="docs-text">
          The main entry point for all SDK operations. Manages authentication,
          session creation, and global configuration.
        </p>
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Returns</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>createSession(opts?)</code></td>
                <td><code>Session</code></td>
                <td>Create a new agent session</td>
              </tr>
              <tr>
                <td><code>getPortfolio(address)</code></td>
                <td><code>Portfolio</code></td>
                <td>Get portfolio balances and USD values</td>
              </tr>
              <tr>
                <td><code>parseIntent(prompt, chain)</code></td>
                <td><code>ParsedIntent</code></td>
                <td>Parse natural language into structured intent</td>
              </tr>
              <tr>
                <td><code>checkRisk(address, chainId)</code></td>
                <td><code>RiskResult</code></td>
                <td>Check contract risk via Scam Shield</td>
              </tr>
              <tr>
                <td><code>getTools()</code></td>
                <td><code>Tool[]</code></td>
                <td>List all available agent tools</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Sessions */}
      <section id="sessions" className="docs-section">
        <h2 className="docs-heading">Sessions</h2>
        <p className="docs-text">
          Sessions maintain context across multiple interactions. The agent remembers
          previous tool calls and results within the same session.
        </p>
        <CodeTabs tabs={[
          { label: 'TypeScript', language: 'typescript', code: `// Create a persistent session
const session = await client.createSession({
  userId: 'user_01J5...',
  wallet: '0x04e0353B7218b66D6803725ce7342E6e1225DB1b',
  metadata: { plan: 'pro' },
});

// Multi-turn conversation
const response = await session.chat([
  { role: 'user', content: 'What is my GIWA balance?' },
  { role: 'assistant', content: response1 },
  { role: 'user', content: 'Now swap 50 GIWA for USDC' },
]);

// Session ID for later use
console.log(session.id); // "sess_01J5..."` },
          { label: 'Python', language: 'python', code: `# Create a persistent session
session = client.create_session(
    user_id="user_01J5...",
    wallet="0x04e0353B7218b66D6803725ce7342E6e1225DB1b"
)

# Multi-turn conversation
response = session.chat([
    {"role": "user", "content": "What is my GIWA balance?"},
    {"role": "user", "content": "Now swap 50 GIWA for USDC"},
])

print(session.id)  # "sess_01J5..."` },
        ]} />
        <Callout type="info">
          Sessions are stateful. The agent retains context about previous tool calls,
          results, and user preferences within the same session.
        </Callout>
      </section>

      {/* Execution */}
      <section id="execution" className="docs-section">
        <h2 className="docs-heading">Execution</h2>
        <p className="docs-text">
          Execute natural language commands with full tool calling and simulation.
        </p>
        <CodeTabs tabs={[
          { label: 'TypeScript', language: 'typescript', code: `// Single command execution
const result = await session.execute(
  'Transfer 100 GIWA to 0x1234...5678',
  { wallet: userAddress }
);

// Result includes everything
console.log(result.response);        // "I've prepared..."
console.log(result.toolCalls);        // ['build_transaction', 'simulate_transaction']
console.log(result.simulation);       // { status: 'success', gas: '0.001' }
console.log(result.requiresConfirmation); // true

// Confirm and sign
if (result.requiresConfirmation) {
  await client.confirm(result.token);
}` },
          { label: 'Python', language: 'python', code: `# Single command execution
result = session.execute(
    prompt="Transfer 100 GIWA to 0x1234...5678",
    wallet=user_address
)

# Result includes everything
print(result.response)
print(result.tool_calls)
print(result.simulation)
print(result.requires_confirmation)

# Confirm and sign
if result.requires_confirmation:
    client.confirm(result.token)` },
        ]} />
      </section>

      {/* Streaming */}
      <section id="streaming" className="docs-section">
        <h2 className="docs-heading">Streaming</h2>
        <p className="docs-text">
          Stream agent responses in real-time for better user experience.
        </p>
        <CodeTabs tabs={[
          { label: 'TypeScript', language: 'typescript', code: `// Stream responses
const stream = await session.stream(
  'Show my portfolio and suggest rebalancing',
  { wallet: userAddress }
);

for await (const chunk of stream) {
  if (chunk.type === 'text') {
    process.stdout.write(chunk.content);
  } else if (chunk.type === 'tool_call') {
    console.log('\\n[Tool:', chunk.name, ']');
  } else if (chunk.type === 'simulation') {
    console.log('\\n[Simulation:', chunk.status, ']');
  }
}` },
          { label: 'Python', language: 'python', code: `# Stream responses
stream = session.stream(
    prompt="Show my portfolio and suggest rebalancing",
    wallet=user_address
)

for chunk in stream:
    if chunk.type == "text":
        print(chunk.content, end="", flush=True)
    elif chunk.type == "tool_call":
        print(f"\\n[Tool: {chunk.name}]")
    elif chunk.type == "simulation":
        print(f"\\n[Simulation: {chunk.status}]")` },
        ]} />
      </section>

      {/* Examples */}
      <section id="examples" className="docs-section">
        <h2 className="docs-heading">Examples</h2>
        <p className="docs-text">
          Complete examples for common use cases.
        </p>

        <h3 className="docs-subheading">DeFi Agent</h3>
        <div className="code-block">
          <div className="code-block-header">
            <span className="code-block-title">defi-agent.ts</span>
            <span className="code-block-lang">TypeScript</span>
          </div>
          <pre className="code-block-pre">
            <code className="code-block-code language-typescript">{`import { BlockmindClient } from '@blockmind/sdk';

const client = new BlockmindClient({
  apiKey: process.env.BLOCKMIND_API_KEY,
  chain: 'giwa-sepolia',
});

// Create session for a DeFi user
const session = await client.createSession({
  wallet: '0x04e0353B7218b66D6803725ce7342E6e1225DB1b',
});

// Handle multiple DeFi operations
const commands = [
  'What is my current portfolio allocation?',
  'Swap 20% of my GIWA for USDC',
  'Stake the remaining GIWA in the validation pool',
  'Show me the final portfolio summary',
];

for (const cmd of commands) {
  const result = await session.execute(cmd, {
    wallet: session.wallet,
  });

  console.log(result.response);

  if (result.requiresConfirmation) {
    await client.confirm(result.token);
  }
}`}</code>
          </pre>
        </div>

        <h3 className="docs-subheading" style={{ marginTop: '2rem' }}>NFT Agent</h3>
        <div className="code-block">
          <div className="code-block-header">
            <span className="code-block-title">nft-agent.ts</span>
            <span className="code-block-lang">TypeScript</span>
          </div>
          <pre className="code-block-pre">
            <code className="code-block-code language-typescript">{`import { BlockmindClient } from '@blockmind/sdk';

const client = new BlockmindClient({
  apiKey: process.env.BLOCKMIND_API_KEY,
  chain: 'giwa-sepolia',
});

const session = await client.createSession({
  wallet: userAddress,
});

// Natural language NFT operations
const result = await session.execute(
  'List my most valuable NFT and set price to 0.5 ETH',
  { wallet: userAddress }
);

if (result.requiresConfirmation) {
  await client.confirm(result.token);
}`}</code>
          </pre>
        </div>
      </section>

      {/* Features grid */}
      <section className="docs-section">
        <h2 className="docs-heading">Features</h2>
        <div className="docs-features-grid">
          <div className="docs-feature">
            <span className="docs-feature-icon">💬</span>
            <h3>Natural Language</h3>
            <p>Execute transactions with plain English.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">🛡️</span>
            <h3>Simulation First</h3>
            <p>Every TX simulated before execution.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">🔗</span>
            <h3>Multi-Chain</h3>
            <p>GIWA, Ethereum, Base, and more.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">🧪</span>
            <h3>Sandbox</h3>
            <p>Test with mock blockchain before mainnet.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">📦</span>
            <h3>Templates</h3>
            <p>Pre-built agents for DeFi, NFT, governance.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">⚡</span>
            <h3>TypeScript</h3>
            <p>Full type safety and IntelliSense.</p>
          </div>
        </div>
      </section>
    </DocsLayout>
  );
}
