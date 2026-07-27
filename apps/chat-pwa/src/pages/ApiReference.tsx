import DocsLayout from '../components/docs/DocsLayout';
import { ApiEndpointCard } from '../components/docs/ApiEndpoint';
import Callout from '../components/docs/Callout';
import SeoHead from '../components/SeoHead';

const sidebar = [
  {
    title: 'API Reference',
    items: [
      { label: 'Overview', href: '/docs/api' },
      { label: 'Authentication', href: '/docs/api#authentication' },
    ],
  },
  {
    title: 'Endpoints',
    items: [
      { label: 'Intent Parser', href: '/docs/api#intent-parse' },
      { label: 'Agent Execute', href: '/docs/api#agent-execute' },
      { label: 'Portfolio', href: '/docs/api#portfolio' },
      { label: 'Build Transaction', href: '/docs/api#tx-build' },
      { label: 'Simulate Transaction', href: '/docs/api#tx-simulate' },
      { label: 'Submit Transaction', href: '/docs/api#tx-submit' },
      { label: 'List Tools', href: '/docs/api#tools' },
      { label: 'Contract Risk Check', href: '/docs/api#risk-check' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Error Codes', href: '/docs/api#errors' },
      { label: 'SDKs', href: '/docs/sdk' },
      { label: 'Status', href: '/status' },
    ],
  },
];

const toc = [
  { id: 'overview', label: 'Overview' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'intent-parse', label: 'Parse Intent' },
  { id: 'agent-execute', label: 'Agent Execute' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'tx-build', label: 'Build Transaction' },
  { id: 'tx-simulate', label: 'Simulate Transaction' },
  { id: 'tx-submit', label: 'Submit Transaction' },
  { id: 'tools', label: 'List Tools' },
  { id: 'risk-check', label: 'Contract Risk Check' },
  { id: 'errors', label: 'Error Codes' },
];

export default function ApiReference() {
  return (
    <DocsLayout sidebar={sidebar} toc={toc}>
      <SeoHead title="API Reference" description="Complete REST API reference for Blockmind — agent execution, wallet management, and transaction endpoints." path="/docs/api" />
      {/* Hero */}
      <div className="docs-hero">
        <span className="docs-hero-tag">API REFERENCE</span>
        <h1 className="docs-hero-title">API Reference</h1>
        <p className="docs-hero-desc">
          Complete reference for the Blockmind API. Build AI-native Web3 applications
          with our REST endpoints.
        </p>
        <div className="docs-hero-meta">
          <span className="docs-hero-meta-item">
            <strong>Base URL</strong>
            <code>https://api.blockmind.xyz</code>
          </span>
        </div>
      </div>

      {/* Authentication */}
      <section id="authentication" className="docs-section">
        <h2 className="docs-heading">Authentication</h2>
        <p className="docs-text">
          All API requests require a valid Bearer API key in the <code>Authorization</code> header.
        </p>
        <div className="code-block">
          <pre className="code-block-pre">
            <code className="code-block-code language-bash">{`Authorization: Bearer YOUR_API_KEY`}</code>
          </pre>
        </div>
        <Callout type="warning">
          Never expose your API key in client-side code. Always make API calls from your backend server.
        </Callout>
      </section>

      {/* Parse Intent */}
      <section id="intent-parse" className="docs-section">
        <h2 className="docs-heading">Parse Intent</h2>
        <ApiEndpointCard
          method="POST"
          path="/api/v1/intent/parse"
          description="Convert a natural language string into a structured, machine-readable intent object with simulation results."
          requestFields={[
            { name: 'prompt', type: 'string', required: true, desc: 'The natural language user request.' },
            { name: 'chain', type: 'string', required: true, desc: 'Target blockchain (e.g., "giwa", "ethereum").' },
            { name: 'wallet', type: 'string', required: true, desc: 'User wallet address for simulation context.' },
          ]}
          responseFields={[
            { name: 'intent', type: 'string', desc: 'Classified action type (e.g., "swap", "stake", "transfer").' },
            { name: 'confidence', type: 'number', desc: 'Classification confidence score (0–1).' },
            { name: 'slots', type: 'object', desc: 'Extracted parameters (amount, token, recipient).' },
            { name: 'simulation', type: 'string', desc: 'Simulation result ("success" or "failed").' },
            { name: 'requiresConfirmation', type: 'boolean', desc: 'Whether wallet signature is needed.' },
            { name: 'token', type: 'string', desc: 'Unique confirmation request identifier.' },
          ]}
          requestExample={`{
  "prompt": "Swap 100 GIWA for USDC",
  "chain": "giwa-sepolia",
  "wallet": "0x04e0353B7218b66D6803725ce7342E6e1225DB1b"
}`}
          responseExample={`{
  "intent": "swap",
  "confidence": 0.97,
  "slots": {
    "tokenIn": "GIWA",
    "tokenOut": "USDC",
    "amount": "100"
  },
  "simulation": "success",
  "requiresConfirmation": true,
  "token": "txn_req_8x9a2b"
}`}
        />
      </section>

      {/* Agent Execute */}
      <section id="agent-execute" className="docs-section">
        <h2 className="docs-heading">Agent Execute</h2>
        <ApiEndpointCard
          method="POST"
          path="/api/v1/agent/execute"
          description="Execute an AI agent workflow with full reasoning, tool calling, and transaction simulation."
          requestFields={[
            { name: 'prompt', type: 'string', required: true, desc: 'Natural language instruction for the agent.' },
            { name: 'wallet', type: 'string', required: true, desc: 'Wallet address for execution context.' },
            { name: 'chainId', type: 'number', required: false, desc: 'Target chain ID (defaults to GIWA).' },
            { name: 'sessionId', type: 'string', required: false, desc: 'Existing session ID for context continuation.' },
          ]}
          responseFields={[
            { name: 'response', type: 'string', desc: 'Agent response text.' },
            { name: 'toolCalls', type: 'array', desc: 'List of tools the agent invoked.' },
            { name: 'requiresConfirmation', type: 'boolean', desc: 'Whether wallet confirmation is needed.' },
            { name: 'simulation', type: 'object', desc: 'Simulation results if applicable.' },
            { name: 'sessionId', type: 'string', desc: 'Session ID for follow-up requests.' },
          ]}
          requestExample={`{
  "prompt": "Swap 100 GIWA for USDC",
  "wallet": "0x04e0353B7218b66D6803725ce7342E6e1225DB1b",
  "chainId": 91342
}`}
          responseExample={`{
  "response": "I've simulated a swap of 100 GIWA for USDC. Here's the summary...",
  "toolCalls": ["build_transaction", "simulate_transaction"],
  "requiresConfirmation": true,
  "simulation": {
    "status": "success",
    "gasEstimate": "0.002 GIWA",
    "outputAmount": "42.5 USDC"
  },
  "sessionId": "sess_01J5..."
}`}
        />
      </section>

      {/* Portfolio */}
      <section id="portfolio" className="docs-section">
        <h2 className="docs-heading">Get Portfolio</h2>
        <ApiEndpointCard
          method="GET"
          path="/api/v1/portfolio/:address"
          description="Get portfolio balance and USD values for a wallet address."
          responseFields={[
            { name: 'address', type: 'string', desc: 'The queried wallet address.' },
            { name: 'chainId', type: 'number', desc: 'Chain ID of the queried network.' },
            { name: 'balances', type: 'array', desc: 'List of token balances with USD values.' },
            { name: 'totalUsd', type: 'number', desc: 'Total portfolio value in USD.' },
          ]}
          responseExample={`{
  "address": "0x04e0353B7218b66D6803725ce7342E6e1225DB1b",
  "chainId": 91342,
  "balances": [
    {
      "symbol": "GIWA",
      "amount": "230.93",
      "usdValue": 230.93
    },
    {
      "symbol": "USDC",
      "amount": "150.00",
      "usdValue": 150.00
    }
  ],
  "totalUsd": 380.93
}`}
        />
      </section>

      {/* Build Transaction */}
      <section id="tx-build" className="docs-section">
        <h2 className="docs-heading">Build Transaction</h2>
        <ApiEndpointCard
          method="POST"
          path="/api/v1/transaction/build"
          description="Build a transaction from a natural language description. Returns unsigned transaction data."
          requestFields={[
            { name: 'prompt', type: 'string', required: true, desc: 'Natural language description of the transaction.' },
            { name: 'from', type: 'string', required: true, desc: 'Sender wallet address.' },
            { name: 'chainId', type: 'number', required: false, desc: 'Target chain ID.' },
          ]}
          responseFields={[
            { name: 'transaction', type: 'object', desc: 'Unsigned transaction data (to, data, value, gas).' },
            { name: 'explanation', type: 'string', desc: 'Human-readable explanation of what the TX does.' },
            { name: 'simulation', type: 'object', desc: 'Pre-built simulation results.' },
          ]}
        />
      </section>

      {/* Simulate Transaction */}
      <section id="tx-simulate" className="docs-section">
        <h2 className="docs-heading">Simulate Transaction</h2>
        <ApiEndpointCard
          method="POST"
          path="/api/v1/transaction/simulate"
          description="Simulate a transaction before execution. Returns gas estimates and potential outcomes."
          requestFields={[
            { name: 'transaction', type: 'object', required: true, desc: 'Transaction object from /transaction/build.' },
            { name: 'from', type: 'string', required: true, desc: 'Sender wallet address.' },
          ]}
          responseFields={[
            { name: 'status', type: 'string', desc: '"success" or "failed".' },
            { name: 'gasEstimate', type: 'string', desc: 'Estimated gas cost.' },
            { name: 'output', type: 'object', desc: 'Simulated output (e.g., tokens received).' },
            { name: 'error', type: 'string', desc: 'Error message if simulation failed.' },
          ]}
        />
      </section>

      {/* Submit Transaction */}
      <section id="tx-submit" className="docs-section">
        <h2 className="docs-heading">Submit Transaction</h2>
        <ApiEndpointCard
          method="POST"
          path="/api/v1/transaction/submit"
          description="Submit a signed transaction to the blockchain. Requires prior simulation."
          requestFields={[
            { name: 'signedTx', type: 'string', required: true, desc: 'Signed transaction hex string.' },
            { name: 'chainId', type: 'number', required: true, desc: 'Target chain ID.' },
          ]}
          responseFields={[
            { name: 'txHash', type: 'string', desc: 'Transaction hash on-chain.' },
            { name: 'status', type: 'string', desc: '"submitted" or "pending".' },
            { name: 'explorerUrl', type: 'string', desc: 'Link to block explorer.' },
          ]}
        />
      </section>

      {/* List Tools */}
      <section id="tools" className="docs-section">
        <h2 className="docs-heading">List Tools</h2>
        <ApiEndpointCard
          method="GET"
          path="/api/v1/tools"
          description="List all available agent tools with their descriptions, input schemas, and confirmation requirements."
          responseFields={[
            { name: 'tools', type: 'array', desc: 'Array of available tools.' },
            { name: 'count', type: 'number', desc: 'Total number of tools.' },
          ]}
          responseExample={`{
  "tools": [
    {
      "name": "read_balance",
      "description": "Get token balance for an address",
      "requires_confirmation": false,
      "chains_supported": [9134, 91342, 1, 8453]
    },
    {
      "name": "swap_tokens",
      "description": "Swap tokens via DEX",
      "requires_confirmation": true,
      "chains_supported": [9134, 91342]
    }
  ],
  "count": 8
}`}
        />
      </section>

      {/* Risk Check */}
      <section id="risk-check" className="docs-section">
        <h2 className="docs-heading">Contract Risk Check</h2>
        <ApiEndpointCard
          method="POST"
          path="/api/v1/contract/risk-check"
          description="Check contract risk score using Scam Shield. Always called before interacting with new contract addresses."
          requestFields={[
            { name: 'address', type: 'string', required: true, desc: 'Contract address to analyze.' },
            { name: 'chainId', type: 'number', required: true, desc: 'Chain ID where the contract is deployed.' },
          ]}
          responseFields={[
            { name: 'address', type: 'string', desc: 'Analyzed contract address.' },
            { name: 'riskScore', type: 'number', desc: 'Risk score from 0 (safe) to 100 (dangerous).' },
            { name: 'flags', type: 'array', desc: 'List of risk flags detected.' },
            { name: 'recommendation', type: 'string', desc: '"safe", "caution", or "blocked".' },
          ]}
        />
      </section>

      {/* Errors */}
      <section id="errors" className="docs-section">
        <h2 className="docs-heading">Error Codes</h2>
        <p className="docs-text">
          All error responses follow a consistent format with descriptive codes.
        </p>
        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Meaning</th>
                <th>Solution</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>400</code></td>
                <td>Bad Request — Invalid input or unparsable intent</td>
                <td>Check request body format and required fields</td>
              </tr>
              <tr>
                <td><code>401</code></td>
                <td>Unauthorized — Invalid or missing API key</td>
                <td>Verify your API key is correct and active</td>
              </tr>
              <tr>
                <td><code>403</code></td>
                <td>Forbidden — Insufficient permissions</td>
                <td>Check your account tier and permissions</td>
              </tr>
              <tr>
                <td><code>404</code></td>
                <td>Not Found — Resource doesn't exist</td>
                <td>Verify the endpoint path and resource ID</td>
              </tr>
              <tr>
                <td><code>429</code></td>
                <td>Rate Limited — Too many requests</td>
                <td>Implement exponential backoff</td>
              </tr>
              <tr>
                <td><code>500</code></td>
                <td>Server Error — Internal failure</td>
                <td>Retry; check the <a href="/status">Status Page</a> if persistent</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="code-block" style={{ marginTop: '1rem' }}>
          <div className="code-block-header">
            <span className="code-block-title">Error Response Format</span>
            <span className="code-block-lang">JSON</span>
          </div>
          <pre className="code-block-pre">
            <code className="code-block-code language-json">{`{
  "error": {
    "code": "invalid_intent",
    "message": "Could not parse intent from input",
    "details": {
      "suggestion": "Try rephrasing with a clearer action"
    },
    "request_id": "req_01J5..."
  }
}`}</code>
          </pre>
        </div>
      </section>
    </DocsLayout>
  );
}
