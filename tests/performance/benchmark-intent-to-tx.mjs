/**
 * P4-05: Performance Benchmark — Intent-to-TX Latency
 *
 * Measures end-to-end latency from NL input to TX simulation.
 * Target: <2s P95
 *
 * Usage:
 *   docker compose up -d
 *   node tests/performance/benchmark-intent-to-tx.mjs
 */

const INTENT_URL = 'http://localhost:8001';
const AGENT_URL = 'http://localhost:8002';
const WEB3_URL = 'http://localhost:8003';

const TEST_INPUTS = [
  'Send 10 GIWA to 0x1234567890abcdef1234567890abcdef12345678',
  'What is my balance?',
  'Swap 5 ETH for USDC',
  'Approve USDT spending for Uniswap',
  'Check if contract 0xABC... is safe',
  'Stake 32 ETH',
  'Send 100 USDT to Alice',
  'Bridge 1 ETH to Arbitrum',
  'What is the gas price?',
  'Show my portfolio',
];

const ITERATIONS = 50;

async function measureLatency(fn) {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

async function parseIntent(input) {
  const res = await fetch(`${INTENT_URL}/intent/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  return res.json();
}

async function executeAgent(input) {
  const res = await fetch(`${AGENT_URL}/agent/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  return res.json();
}

async function simulateTX() {
  const res = await fetch(`${WEB3_URL}/chain/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chainId: 91342,
      from: '0x04e0353b7218b66d6803725ce7342e6e1225db1b',
      to: '0x04e0353b7218b66d6803725ce7342e6e1225db1b',
      value: '0x0',
    }),
  });
  return res.json();
}

async function healthCheck(url) {
  try {
    const res = await fetch(`${url}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  P4-05: Performance Benchmark');
  console.log('  Target: Intent-to-TX latency <2s P95');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Check services are running
  console.log('Checking services...');
  const services = [
    { name: 'intent-service', url: INTENT_URL },
    { name: 'agent-runtime', url: AGENT_URL },
    { name: 'web3-middleware', url: WEB3_URL },
  ];

  for (const svc of services) {
    const ok = await healthCheck(svc.url);
    console.log(`  ${ok ? '✅' : '❌'} ${svc.name}`);
    if (!ok) {
      console.error(`\n❌ ${svc.name} not reachable. Run: docker compose up -d`);
      process.exit(1);
    }
  }

  // 2. Benchmark: Intent parsing
  console.log(`\n── Intent Parsing (${ITERATIONS} iterations) ──`);
  const intentLatencies = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const input = TEST_INPUTS[i % TEST_INPUTS.length];
    const latency = await measureLatency(() => parseIntent(input));
    intentLatencies.push(latency);
  }
  intentLatencies.sort((a, b) => a - b);
  const intentP50 = intentLatencies[Math.floor(ITERATIONS * 0.5)];
  const intentP95 = intentLatencies[Math.floor(ITERATIONS * 0.95)];
  const intentP99 = intentLatencies[Math.floor(ITERATIONS * 0.99)];
  console.log(`  P50: ${intentP50.toFixed(0)}ms | P95: ${intentP95.toFixed(0)}ms | P99: ${intentP99.toFixed(0)}ms`);

  // 3. Benchmark: Agent execution
  console.log(`\n── Agent Execution (${Math.min(10, ITERATIONS)} iterations) ──`);
  const agentLatencies = [];
  const agentIterations = Math.min(10, ITERATIONS);
  for (let i = 0; i < agentIterations; i++) {
    const input = TEST_INPUTS[i % TEST_INPUTS.length];
    const latency = await measureLatency(() => executeAgent(input));
    agentLatencies.push(latency);
  }
  agentLatencies.sort((a, b) => a - b);
  const agentP50 = agentLatencies[Math.floor(agentIterations * 0.5)];
  const agentP95 = agentLatencies[Math.floor(agentIterations * 0.95)];
  console.log(`  P50: ${agentP50.toFixed(0)}ms | P95: ${agentP95.toFixed(0)}ms`);

  // 4. Benchmark: TX Simulation
  console.log(`\n── TX Simulation (${ITERATIONS} iterations) ──`);
  const simLatencies = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const latency = await measureLatency(() => simulateTX());
    simLatencies.push(latency);
  }
  simLatencies.sort((a, b) => a - b);
  const simP50 = simLatencies[Math.floor(ITERATIONS * 0.5)];
  const simP95 = simLatencies[Math.floor(ITERATIONS * 0.95)];
  console.log(`  P50: ${simP50.toFixed(0)}ms | P95: ${simP95.toFixed(0)}ms`);

  // 5. Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Intent Parse P95:     ${intentP95.toFixed(0)}ms`);
  console.log(`  Agent Execute P95:    ${agentP95.toFixed(0)}ms`);
  console.log(`  TX Simulate P95:      ${simP95.toFixed(0)}ms`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Estimated Total P95:  ${(intentP95 + agentP95 + simP95).toFixed(0)}ms`);

  const totalP95 = intentP95 + agentP95 + simP95;
  if (totalP95 < 2000) {
    console.log(`  ✅ PASS — Under 2s target`);
  } else {
    console.log(`  ❌ FAIL — Over 2s target`);
  }
  console.log('═══════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
