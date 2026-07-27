import DocsLayout from '../components/docs/DocsLayout';
import { CodeTabs } from '../components/docs/CodeBlock';
import Callout from '../components/docs/Callout';
import { Link } from 'react-router-dom';
import SeoHead from '../components/SeoHead';

const sidebar = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Overview', href: '/docs' },
      { label: 'Installation', href: '/docs#installation' },
      { label: 'Authentication', href: '/docs#authentication' },
      { label: 'Quick Start', href: '/docs#quickstart' },
      { label: 'Your First Agent', href: '/docs#first-agent' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { label: 'Intent Engine', href: '/docs#intent-engine' },
      { label: 'Agent Runtime', href: '/docs#agent-runtime' },
      { label: 'Tool System', href: '/docs#tool-system' },
      { label: 'Memory & Context', href: '/docs#memory' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { label: 'Wallet Integration', href: '/docs#wallet-integration' },
      { label: 'Multi-Chain Support', href: '/docs#multi-chain' },
      { label: 'DeFi Workflows', href: '/docs#defi-workflows' },
      { label: 'Security', href: '/docs#security' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'API Reference', href: '/docs/api' },
      { label: 'SDK Reference', href: '/docs/sdk' },
      { label: 'Status', href: '/status' },
    ],
  },
];

const toc = [
  { id: 'overview', label: 'Overview' },
  { id: 'installation', label: 'Installation' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'first-agent', label: 'Your First Agent' },
  { id: 'intent-engine', label: 'Intent Engine' },
  { id: 'agent-runtime', label: 'Agent Runtime' },
  { id: 'tool-system', label: 'Tool System' },
  { id: 'memory', label: 'Memory & Context' },
  { id: 'security', label: 'Security Model' },
];

export default function Documentation() {
  return (
    <DocsLayout sidebar={sidebar} toc={toc}>
      <SeoHead title="Documentation" description="Get started with Blockmind — install the SDK, connect your wallet, and start building AI agents on GIWA." path="/docs" />
      {/* Hero */}
      <div className="docs-hero">
        <span className="docs-hero-tag">DOCUMENTATION</span>
        <h1 className="docs-hero-title">Build with Blockmind</h1>
        <p className="docs-hero-desc">
          Everything you need to integrate AI agents into your Web3 applications.
          From quick starts to advanced guides.
        </p>
        <div className="docs-hero-actions">
          <Link to="/docs/sdk" className="btn btn-primary">Quick Start →</Link>
          <Link to="/docs/api" className="btn btn-secondary">API Reference</Link>
        </div>
      </div>

      {/* Overview */}
      <section id="overview" className="docs-section">
        <h2 className="docs-heading">Overview</h2>
        <p className="docs-text">
          Blockmind is an AI-native Web3 infrastructure platform that enables developers to build
          intelligent blockchain applications. Instead of forcing users to manually manage transactions,
          wallet interactions, and smart contract complexity, Blockmind allows users to interact
          with Web3 using plain natural language.
        </p>
        <div className="docs-features-grid">
          <div className="docs-feature">
            <span className="docs-feature-icon">💬</span>
            <h3>AI Intent Engine</h3>
            <p>Converts natural language prompts into structured, executable blockchain workflows.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">🛡️</span>
            <h3>Security First</h3>
            <p>Every transaction is simulated, risk-checked, and requires explicit wallet confirmation.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">🔗</span>
            <h3>Multi-Chain</h3>
            <p>Native support for GIWA, Ethereum, Base, Polygon, and future EVM-compatible chains.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">⚡</span>
            <h3>Agent Runtime</h3>
            <p>Secure execution environment with reasoning loops, tool calling, and transaction planning.</p>
          </div>
        </div>
      </section>

      {/* Installation */}
      <section id="installation" className="docs-section">
        <h2 className="docs-heading">Installation</h2>
        <p className="docs-text">
          Install the Blockmind SDK and dependencies for your platform.
        </p>
        <CodeTabs tabs={[
          { label: 'npm', code: 'npm install @blockmind/sdk', language: 'bash' },
          { label: 'yarn', code: 'yarn add @blockmind/sdk', language: 'bash' },
          { label: 'pnpm', code: 'pnpm add @blockmind/sdk', language: 'bash' },
          { label: 'Python', code: 'pip install blockmind', language: 'bash' },
        ]} />
      </section>

      {/* Authentication */}
      <section id="authentication" className="docs-section">
        <h2 className="docs-heading">Authentication</h2>
        <p className="docs-text">
          Blockmind uses API keys for authentication. Generate your key from the
          developer dashboard and include it in your requests.
        </p>
        <CodeTabs tabs={[
          { label: 'TypeScript', language: 'typescript', code: `import { BlockmindClient } from '@blockmind/sdk';

const client = new BlockmindClient({
  apiKey: process.env.BLOCKMIND_API_KEY,
  chain: 'giwa-sepolia',
});` },
          { label: 'Python', language: 'python', code: `from blockmind import BlockmindClient

client = BlockmindClient(
    api_key=os.environ.get("BLOCKMIND_API_KEY"),
    chain="giwa-sepolia"
)` },
          { label: 'cURL', language: 'bash', code: `curl -X POST https://api.blockmind.xyz/api/v1/intent/parse \\
  -H "Authorization: Bearer $BLOCKMIND_API_KEY" \\
  -H "Content-Type: application/json"` },
        ]} />
        <Callout type="warning" title="Keep your API key secure">
          Never expose your API key in client-side code. Always use environment variables
          and keep keys on your backend server.
        </Callout>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="docs-section">
        <h2 className="docs-heading">Quick Start</h2>
        <p className="docs-text">
          Get up and running in 5 minutes. This guide walks you through creating
          your first AI agent session.
        </p>
        <div className="docs-steps">
          <div className="docs-step">
            <div className="docs-step-number">1</div>
            <div className="docs-step-content">
              <h4>Install the SDK</h4>
              <p>Choose your preferred package manager above.</p>
            </div>
          </div>
          <div className="docs-step">
            <div className="docs-step-number">2</div>
            <div className="docs-step-content">
              <h4>Initialize the client</h4>
              <p>Create a BlockmindClient with your API key and target chain.</p>
            </div>
          </div>
          <div className="docs-step">
            <div className="docs-step-number">3</div>
            <div className="docs-step-content">
              <h4>Create a session</h4>
              <p>Establish an agent session for your user.</p>
            </div>
          </div>
          <div className="docs-step">
            <div className="docs-step-number">4</div>
            <div className="docs-step-content">
              <h4>Execute a command</h4>
              <p>Send a natural language command and handle the result.</p>
            </div>
          </div>
        </div>
        <CodeTabs tabs={[
          { label: 'TypeScript', language: 'typescript', code: `import { BlockmindClient } from '@blockmind/sdk';

const client = new BlockmindClient({
  apiKey: process.env.BLOCKMIND_API_KEY,
  chain: 'giwa-sepolia',
});

const session = await client.createSession();

const result = await session.execute(
  'Swap 100 GIWA for USDC',
  { wallet: '0x04e0...db1b' }
);

if (result.requiresConfirmation) {
  await client.confirm(result.token);
}` },
          { label: 'Python', language: 'python', code: `from blockmind import BlockmindClient

client = BlockmindClient(
    api_key=os.environ.get("BLOCKMIND_API_KEY"),
    chain="giwa-sepolia"
)

result = client.execute(
    prompt="Swap 100 GIWA for USDC",
    wallet="0x04e0...db1b"
)

if result.requires_confirmation:
    client.confirm(result.token)` },
        ]} />
      </section>

      {/* First Agent */}
      <section id="first-agent" className="docs-section">
        <h2 className="docs-heading">Your First Agent</h2>
        <p className="docs-text">
          This guide walks through building a complete AI agent that can read balances,
          execute swaps, and manage wallet interactions.
        </p>
        <CodeTabs tabs={[
          { label: 'TypeScript', language: 'typescript', code: `import { BlockmindClient } from '@blockmind/sdk';

const client = new BlockmindClient({
  apiKey: process.env.BLOCKMIND_API_KEY,
  chain: 'giwa-sepolia',
});

// Create a persistent session for a user
const session = await client.createSession({
  userId: 'user_01J5...',
  wallet: '0x04e0353B7218b66D6803725ce7342E6e1225DB1b',
});

// The agent can now handle multiple turns
const responses = await session.chat([
  { role: 'user', content: 'What is my GIWA balance?' },
  { role: 'user', content: 'Now swap 50 GIWA for USDC' },
  { role: 'user', content: 'Show me my portfolio' },
]);

// Each response includes tool calls, simulations, and results
for (const msg of responses) {
  console.log(msg.content);
  if (msg.toolCalls) {
    console.log('Tools used:', msg.toolCalls.map(t => t.name));
  }
}` },
          { label: 'Python', language: 'python', code: `from blockmind import BlockmindClient

client = BlockmindClient(
    api_key=os.environ.get("BLOCKMIND_API_KEY"),
    chain="giwa-sepolia"
)

session = client.create_session(
    user_id="user_01J5...",
    wallet="0x04e0353B7218b66D6803725ce7342E6e1225DB1b"
)

# Handle multi-turn conversation
responses = session.chat([
    {"role": "user", "content": "What is my GIWA balance?"},
    {"role": "user", "content": "Now swap 50 GIWA for USDC"},
])

for msg in responses:
    print(msg.content)` },
        ]} />
        <Callout type="info">
          Agent sessions maintain context across multiple messages. The agent remembers
          previous tool calls and results within the same session.
        </Callout>
      </section>

      {/* Intent Engine */}
      <section id="intent-engine" className="docs-section">
        <h2 className="docs-heading">Intent Engine</h2>
        <p className="docs-text">
          The Intent Engine converts unstructured user requests into structured, validated,
          and executable workflows. It's the core of Blockmind's natural language processing.
        </p>
        <div className="docs-architecture">
          <div className="docs-arch-step">
            <span className="docs-arch-icon">💬</span>
            <span>User Input</span>
          </div>
          <div className="docs-arch-arrow">→</div>
          <div className="docs-arch-step">
            <span className="docs-arch-icon">🧠</span>
            <span>Intent Parser</span>
          </div>
          <div className="docs-arch-arrow">→</div>
          <div className="docs-arch-step">
            <span className="docs-arch-icon">⚙️</span>
            <span>Agent Runtime</span>
          </div>
          <div className="docs-arch-arrow">→</div>
          <div className="docs-arch-step">
            <span className="docs-arch-icon">🛡️</span>
            <span>Simulation</span>
          </div>
          <div className="docs-arch-arrow">→</div>
          <div className="docs-arch-step">
            <span className="docs-arch-icon">✍️</span>
            <span>Wallet Approval</span>
          </div>
          <div className="docs-arch-arrow">→</div>
          <div className="docs-arch-step">
            <span className="docs-arch-icon">⛓️</span>
            <span>Execution</span>
          </div>
        </div>
        <CodeTabs tabs={[
          { label: 'Request', language: 'json', code: `{
  "prompt": "Swap 100 GIWA for USDC",
  "chain": "giwa-sepolia",
  "wallet": "0x04e0...db1b"
}` },
          { label: 'Response', language: 'json', code: `{
  "intent": "swap",
  "tokenIn": "GIWA",
  "tokenOut": "USDC",
  "amount": "100",
  "simulation": "success",
  "requiresConfirmation": true,
  "token": "txn_req_8x9a2b"
}` },
        ]} />
      </section>

      {/* Agent Runtime */}
      <section id="agent-runtime" className="docs-section">
        <h2 className="docs-heading">Agent Runtime</h2>
        <p className="docs-text">
          The Agent Runtime is a secure execution environment that handles reasoning loops,
          tool calling, transaction planning, and execution monitoring.
        </p>
        <div className="docs-features-grid">
          <div className="docs-feature">
            <span className="docs-feature-icon">🔄</span>
            <h3>Reasoning Loop</h3>
            <p>The agent iterates through planning, tool selection, and execution steps.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">🔧</span>
            <h3>Tool Calling</h3>
            <p>Built-in tools for balance checks, swaps, staking, and contract interactions.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">📝</span>
            <h3>Transaction Planning</h3>
            <p>Complex multi-step transactions are planned and simulated before execution.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">📊</span>
            <h3>Execution Monitoring</h3>
            <p>Real-time status updates and error handling throughout the execution lifecycle.</p>
          </div>
        </div>
      </section>

      {/* Tool System */}
      <section id="tool-system" className="docs-section">
        <h2 className="docs-heading">Tool System</h2>
        <p className="docs-text">
          Blockmind provides built-in tools for common blockchain operations. You can also
          create custom tools for your specific use case.
        </p>
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Description</th>
                <th>Requires Confirmation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>read_balance</code></td>
                <td>Get token balance for an address</td>
                <td>No</td>
              </tr>
              <tr>
                <td><code>read_portfolio</code></td>
                <td>Get full portfolio with USD values</td>
                <td>No</td>
              </tr>
              <tr>
                <td><code>build_transaction</code></td>
                <td>Build a TX from natural language</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td><code>simulate_transaction</code></td>
                <td>Simulate before execution</td>
                <td>No</td>
              </tr>
              <tr>
                <td><code>submit_transaction</code></td>
                <td>Submit a signed transaction</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td><code>swap_tokens</code></td>
                <td>Token swap via DEX</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td><code>check_contract_risk</code></td>
                <td>Scam Shield contract analysis</td>
                <td>No</td>
              </tr>
              <tr>
                <td><code>monitor_address</code></td>
                <td>Set up address monitoring</td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Memory */}
      <section id="memory" className="docs-section">
        <h2 className="docs-heading">Memory & Context</h2>
        <p className="docs-text">
          Blockmind maintains persistent agent memory across sessions. The memory system
          stores user preferences, transaction history, and conversation context.
        </p>
        <div className="docs-features-grid">
          <div className="docs-feature">
            <span className="docs-feature-icon">🧠</span>
            <h3>Episodic Memory</h3>
            <p>Remembers past conversations and actions for contextual responses.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">👤</span>
            <h3>User Preferences</h3>
            <p>Stores preferred tokens, chains, and interaction patterns.</p>
          </div>
          <div className="docs-feature">
            <span className="docs-feature-icon">📊</span>
            <h3>Transaction History</h3>
            <p>Tracks past transactions for pattern recognition and suggestions.</p>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="docs-section">
        <h2 className="docs-heading">Security Model</h2>
        <p className="docs-text">
          Blockmind's security architecture is built on non-negotiable safety rules that
          cannot be overridden by any agent or configuration.
        </p>
        <div className="docs-security-list">
          <div className="docs-security-item">
            <span className="docs-security-check">✓</span>
            <div>
              <strong>Mandatory Simulation</strong>
              <p>Every state-changing on-chain action must pass a dry-run simulation before submission.</p>
            </div>
          </div>
          <div className="docs-security-item">
            <span className="docs-security-check">✓</span>
            <div>
              <strong>User Confirmation</strong>
              <p>The agent pauses, shows a structured summary, and receives an affirmative reply before signing.</p>
            </div>
          </div>
          <div className="docs-security-item">
            <span className="docs-security-check">✓</span>
            <div>
              <strong>No MAX_UINT256 Approvals</strong>
              <p>Token approvals always use the exact required amount unless explicitly flagged.</p>
            </div>
          </div>
          <div className="docs-security-item">
            <span className="docs-security-check">✓</span>
            <div>
              <strong>Scam Shield</strong>
              <p>Any new contract address is checked through risk analysis before interaction.</p>
            </div>
          </div>
          <div className="docs-security-item">
            <span className="docs-security-check">✓</span>
            <div>
              <strong>Key Isolation</strong>
              <p>Private keys exist only in the wallet-signer service. No other service touches key material.</p>
            </div>
          </div>
        </div>
        <Callout type="danger" title="Non-negotiable safety rules">
          These security rules cannot be overridden by any agent, any spec, or any configuration.
          They are enforced at the infrastructure level.
        </Callout>
      </section>

      {/* Wallet Integration */}
      <section id="wallet-integration" className="docs-section">
        <h2 className="docs-heading">Wallet Integration</h2>
        <p className="docs-text">
          Blockmind supports multiple wallet connection methods for different use cases.
        </p>
        <CodeTabs tabs={[
          { label: 'MetaMask', language: 'typescript', code: `// Browser extension wallet
const client = new BlockmindClient({
  apiKey: process.env.BLOCKMIND_API_KEY,
  chain: 'giwa-sepolia',
});

// Connect via window.ethereum
const accounts = await client.connectWallet({
  provider: window.ethereum,
});

console.log('Connected:', accounts[0]);` },
          { label: 'View-Only', language: 'typescript', code: `// Read-only mode (no signing)
const client = new BlockmindClient({
  apiKey: process.env.BLOCKMIND_API_KEY,
  chain: 'giwa-sepolia',
});

// Use any address for read operations
const portfolio = await client.getPortfolio(
  '0x04e0353B7218b66D6803725ce7342E6e1225DB1b'
);` },
        ]} />
      </section>

      {/* Multi-Chain */}
      <section id="multi-chain" className="docs-section">
        <h2 className="docs-heading">Multi-Chain Support</h2>
        <p className="docs-text">
          Blockmind supports multiple EVM-compatible chains. Configure the chain parameter
          when initializing your client.
        </p>
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Chain</th>
                <th>Chain ID</th>
                <th>RPC</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>GIWA Mainnet</strong></td>
                <td><code>9134</code></td>
                <td><code>https://rpc.giwa.io</code></td>
                <td>Live</td>
              </tr>
              <tr>
                <td><strong>GIWA Sepolia</strong></td>
                <td><code>91342</code></td>
                <td><code>https://sepolia-rpc.giwa.io</code></td>
                <td>Live</td>
              </tr>
              <tr>
                <td>Ethereum Mainnet</td>
                <td><code>1</code></td>
                <td>Default</td>
                <td>Live</td>
              </tr>
              <tr>
                <td>Base</td>
                <td><code>8453</code></td>
                <td>Default</td>
                <td>Live</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* DeFi Workflows */}
      <section id="defi-workflows" className="docs-section">
        <h2 className="docs-heading">DeFi Workflows</h2>
        <p className="docs-text">
          Build common DeFi agents with Blockmind's natural language interface.
        </p>
        <CodeTabs tabs={[
          { label: 'Token Swap', language: 'typescript', code: `const result = await session.execute(
  'Swap 100 GIWA for USDC on Uniswap',
  { wallet: userAddress }
);` },
          { label: 'Staking', language: 'typescript', code: `const result = await session.execute(
  'Stake 50 GIWA in the validation pool',
  { wallet: userAddress }
);` },
          { label: 'Portfolio Check', language: 'typescript', code: `const result = await session.execute(
  'Show my portfolio with USD values',
  { wallet: userAddress }
);` },
        ]} />
      </section>
    </DocsLayout>
  );
}
