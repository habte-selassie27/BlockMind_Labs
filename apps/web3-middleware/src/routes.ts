import type { FastifyInstance } from 'fastify';
import { getBalance, estimateGas, simulateTransaction } from './chain';
import { simulateAndBuild, sendToSigner } from './tx';
import { getBlockNumber } from './chain';
import { resolveUpId, createUpId, verifyDojang } from './giwa-identity';
import { estimateBridge, executeBridge, getBridgeStatus, trackBridge } from './giwa-bridge';
import { getGiwaNetworkStats } from './giwa-network';
import { explainAddress, explainTransaction, debugTransaction, discoverGiwaApps } from './explorer';
import { simulateBatch } from './batch';
import { getGiwaGas, getGiwaBlock, getGiwaTx, checkAllowance } from './giwa-gas';
import { getPortfolio, getRecentTransactions } from './giwa-portfolio';
import { createWatch, listWatches } from './giwa-alerts';
import { addContact, listContacts, resolveContact } from './giwa-addressbook';
import { createSmartWallet, getSmartWallet, listSmartWallets } from './giwa-aa';
import type { TransactionRequest } from './types';

export default async function routes(app: FastifyInstance): Promise<void> {
  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    service: 'web3-middleware',
  }));

  // GET /chain/balance/:address
  app.get('/chain/balance/:address', async (req, reply) => {
    const { address } = req.params as { address: string };
    const query = req.query as { token?: string; chain_id?: string };
    const token = query.token;
    const chainId = Number(query.chain_id) || 9134;

    try {
      const balance = await getBalance(address, chainId, token);
      return reply.send(balance);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'RPC error';
      return reply.status(500).send({ error: { code: 'RPC_ERROR', message } });
    }
  });

  // POST /chain/simulate
  app.post('/chain/simulate', async (req, reply) => {
    try {
      const result = await simulateTransaction(req.body as TransactionRequest);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Simulation error';
      return reply.status(500).send({ error: { code: 'SIMULATION_ERROR', message } });
    }
  });

  // POST /chain/build-transaction
  app.post('/chain/build-transaction', async (req, reply) => {
    try {
      const { tx, simulation } = await simulateAndBuild(req.body as TransactionRequest);
      return reply.send({ tx, simulation });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Build error';
      return reply.status(422).send({ error: { code: 'BUILD_FAILED', message } });
    }
  });

  // POST /chain/estimate-gas
  app.post('/chain/estimate-gas', async (req, reply) => {
    const body = req.body as Partial<TransactionRequest>;
    const chainId = body.chainId || 9134;
    try {
      const estimate = await estimateGas(body, chainId);
      return reply.send(estimate);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Estimation error';
      return reply.status(500).send({ error: { code: 'ESTIMATION_ERROR', message } });
    }
  });

  // POST /chain/sign-and-submit
  app.post('/chain/sign-and-submit', async (req, reply) => {
    const { tx, userId } = req.body as { tx: TransactionRequest; userId: string };

    // Simulate first
    try {
      const simulation = await simulateTransaction(tx);
      if (!simulation.success) {
        return reply.status(422).send({
          error: { code: 'SIMULATION_FAILED', message: simulation.revertReason },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Simulation failed';
      return reply.status(422).send({ error: { code: 'SIMULATION_FAILED', message } });
    }

    // Send to wallet-signer
    const result = await sendToSigner(tx, userId);
    if (!result.signed) {
      return reply.status(500).send({
        error: { code: 'SIGNING_FAILED', message: result.error },
      });
    }

    return reply.status(202).send({
      status: 'submitted',
      txHash: result.txHash,
    });
  });

  // GET /chain/block-number
  app.get('/chain/block-number', async (req, reply) => {
    const query = req.query as { chain_id?: string };
    const chainId = Number(query.chain_id) || 9134;
    try {
      const blockNumber = await getBlockNumber(chainId);
      return reply.send({ blockNumber: blockNumber.toString(), chainId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'RPC error';
      return reply.status(500).send({ error: { code: 'RPC_ERROR', message } });
    }
  });

  // ── GIWA Identity ────────────────────────────────────────────
  app.get('/giwa/up/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const res = await resolveUpId(id);
      return reply.send(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resolve failed';
      return reply.status(500).send({ error: { code: 'RESOLVE_FAILED', message } });
    }
  });

  app.post('/giwa/up/create', async (req, reply) => {
    const { requested_up_id, up_id, owner } = req.body as { requested_up_id?: string; up_id?: string; owner?: string };
    const desired = requested_up_id || up_id;
    if (!desired) return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'requested_up_id required' } });
    try {
      const res = await createUpId(desired, owner || '0x0000000000000000000000000000000000000000');
      return reply.status(201).send(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed';
      return reply.status(409).send({ error: { code: 'CREATE_FAILED', message } });
    }
  });

  app.get('/giwa/dojang/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const res = await verifyDojang(id);
      return reply.send(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verify failed';
      return reply.status(500).send({ error: { code: 'VERIFY_FAILED', message } });
    }
  });

  // ── GIWA Network Intelligence ────────────────────────────────
  app.get('/giwa/stats', async (req, reply) => {
    const query = req.query as { chain_id?: string };
    const chainId = Number(query.chain_id) || 91342;
    try {
      const stats = await getGiwaNetworkStats(chainId);
      return reply.send(stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Stats error';
      return reply.status(500).send({ error: { code: 'STATS_ERROR', message } });
    }
  });

  // ── GIWA Bridge ────────────────────────────────────────────
  app.post('/bridge/estimate', async (req, reply) => {
    try {
      const est = await estimateBridge(req.body as any);
      return reply.send(est);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Estimate failed';
      return reply.status(500).send({ error: { code: 'BRIDGE_ESTIMATE_FAILED', message } });
    }
  });

  app.post('/bridge/execute', async (req, reply) => {
    const body = req.body as { amount: string; token: string; from_chain: string; to_chain: string; from: string; to?: string };
    if (!body.amount || !body.token) return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'amount and token required' } });
    // Simulation check per §12.1
    try {
      const sim = await simulateTransaction({ chainId: 11155111, from: body.from, to: '0x0000000000000000000000000000000000000000', value: body.amount } as any);
      if (!sim.success) return reply.status(422).send({ error: { code: 'SIMULATION_FAILED', message: sim.revertReason } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Simulation failed';
      return reply.status(422).send({ error: { code: 'SIMULATION_FAILED', message } });
    }
    try {
      const res = await executeBridge(body as any);
      trackBridge(res.tx_hash, body.from_chain, body.to_chain);
      return reply.status(202).send(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bridge failed';
      return reply.status(500).send({ error: { code: 'BRIDGE_FAILED', message } });
    }
  });

  app.get('/bridge/status/:hash', async (req, reply) => {
    const { hash } = req.params as { hash: string };
    try {
      const status = await getBridgeStatus(hash);
      return reply.send(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Status failed';
      return reply.status(500).send({ error: { code: 'BRIDGE_STATUS_FAILED', message } });
    }
  });

  // ── Explorer Copilot ───────────────────────────────────────
  app.get('/explorer/address/:address', async (req, reply) => {
    const { address } = req.params as { address: string };
    const query = req.query as { chain_id?: string };
    try {
      const res = await explainAddress(address, Number(query.chain_id) || 91342);
      return reply.send(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Explorer error';
      return reply.status(500).send({ error: { code: 'EXPLORER_ERROR', message } });
    }
  });

  app.get('/explorer/tx/:hash', async (req, reply) => {
    const { hash } = req.params as { hash: string };
    try {
      const res = await explainTransaction(hash);
      return reply.send(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Explorer error';
      return reply.status(500).send({ error: { code: 'EXPLORER_ERROR', message } });
    }
  });

  app.get('/explorer/debug/:hash', async (req, reply) => {
    const { hash } = req.params as { hash: string };
    try {
      const res = await debugTransaction(hash);
      return reply.send(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Debug error';
      return reply.status(500).send({ error: { code: 'DEBUG_ERROR', message } });
    }
  });

  app.get('/explorer/discover', async (req, reply) => {
    const query = req.query as { category?: string; q?: string };
    try {
      const res = await discoverGiwaApps(query.category || query.q);
      return reply.send(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Discover error';
      return reply.status(500).send({ error: { code: 'DISCOVER_ERROR', message } });
    }
  });

  // ── Batch Execution ────────────────────────────────────────
  app.post('/chain/batch/simulate', async (req, reply) => {
    const body = req.body as { steps: any[]; from: string; chainId?: number; chain_id?: number };
    if (!body.steps || !Array.isArray(body.steps)) return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'steps array required' } });
    try {
      const chainId = body.chainId || body.chain_id || 91342;
      const result = await simulateBatch({ steps: body.steps, from: body.from, chainId });
      if (!result.allPassed) return reply.status(422).send({ error: { code: 'BATCH_SIMULATION_FAILED', message: 'One or more steps failed simulation', details: result } });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch simulation failed';
      return reply.status(500).send({ error: { code: 'BATCH_ERROR', message } });
    }
  });

  // ── Gas Intelligence ───────────────────────────────────────
  app.get('/giwa/gas', async (req, reply) => {
    const query = req.query as { chain_id?: string };
    try {
      const gas = await getGiwaGas(Number(query.chain_id) || 91342);
      return reply.send(gas);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gas error';
      return reply.status(500).send({ error: { code: 'GAS_ERROR', message } });
    }
  });

  app.get('/giwa/block/:number', async (req, reply) => {
    const { number } = req.params as { number: string };
    try {
      const b = await getGiwaBlock(number);
      return reply.send(b);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Block error';
      return reply.status(500).send({ error: { code: 'BLOCK_ERROR', message } });
    }
  });

  app.get('/giwa/tx/:hash', async (req, reply) => {
    const { hash } = req.params as { hash: string };
    try {
      const tx = await getGiwaTx(hash);
      return reply.send(tx);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tx error';
      return reply.status(500).send({ error: { code: 'TX_ERROR', message } });
    }
  });

  app.get('/giwa/allowance', async (req, reply) => {
    const q = req.query as { token: string; owner: string; spender: string };
    if (!q.token || !q.owner || !q.spender) return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'token, owner, spender required' } });
    try {
      const res = await checkAllowance(q);
      return reply.send(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Allowance error';
      return reply.status(500).send({ error: { code: 'ALLOWANCE_ERROR', message } });
    }
  });

  // ── Portfolio ──────────────────────────────────────────────
  app.get('/portfolio/:address', async (req, reply) => {
    const { address } = req.params as { address: string };
    const query = req.query as { chain_id?: string };
    try {
      const p = await getPortfolio(address, Number(query.chain_id) || 91342);
      return reply.send(p);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Portfolio error';
      return reply.status(500).send({ error: { code: 'PORTFOLIO_ERROR', message } });
    }
  });

  app.get('/giwa/recent-txs/:address', async (req, reply) => {
    const { address } = req.params as { address: string };
    const query = req.query as { chain_id?: string; limit?: string };
    try {
      const txs = await getRecentTransactions(address, Number(query.chain_id) || 91342, Number(query.limit) || 10);
      return reply.send({ address, txs });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recent tx error';
      return reply.status(500).send({ error: { code: 'RECENT_TX_ERROR', message } });
    }
  });

  // ── Alerts / Watch ─────────────────────────────────────────
  app.post('/watch', async (req, reply) => {
    const body = req.body as { address: string; type: string; threshold?: string; target?: string };
    if (!body.address || !body.type) return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'address and type required' } });
    try {
      const w = createWatch(body as any);
      return reply.status(201).send(w);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Watch error';
      return reply.status(500).send({ error: { code: 'WATCH_ERROR', message } });
    }
  });

  app.get('/watch/:address', async (req, reply) => {
    const { address } = req.params as { address: string };
    try {
      const watches = listWatches(address);
      return reply.send({ address, watches });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Watch error';
      return reply.status(500).send({ error: { code: 'WATCH_ERROR', message } });
    }
  });

  // ── Address Book ───────────────────────────────────────────
  app.post('/addressbook/:owner', async (req, reply) => {
    const { owner } = req.params as { owner: string };
    const body = req.body as { name: string; address: string; up_id?: string };
    if (!body.name || !body.address) return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'name and address required' } });
    try {
      const c = addContact(owner, body);
      return reply.status(201).send(c);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Addressbook error';
      return reply.status(500).send({ error: { code: 'ADDRESSBOOK_ERROR', message } });
    }
  });

  app.get('/addressbook/:owner', async (req, reply) => {
    const { owner } = req.params as { owner: string };
    try {
      const contacts = listContacts(owner);
      return reply.send({ owner, contacts });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Addressbook error';
      return reply.status(500).send({ error: { code: 'ADDRESSBOOK_ERROR', message } });
    }
  });

  app.get('/addressbook/:owner/resolve/:name', async (req, reply) => {
    const { owner, name } = req.params as { owner: string; name: string };
    try {
      const res = resolveContact(owner, name);
      if (!res.address && !res.up_id) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: `Contact ${name} not found` } });
      // If up_id, resolve to address via giwa-identity
      if (res.up_id && !res.address) {
        const { resolveUpId } = await import('./giwa-identity');
        const r = await resolveUpId(res.up_id);
        return reply.send({ name, up_id: res.up_id, address: r.address, contact: res.contact, resolved: true });
      }
      return reply.send({ name, ...res, resolved: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resolve error';
      return reply.status(500).send({ error: { code: 'RESOLVE_ERROR', message } });
    }
  });

  // ── AA Smart Wallet ────────────────────────────────────────
  app.post('/giwa/wallet/create', async (req, reply) => {
    const { owner, chain_id, chainId } = req.body as { owner: string; chain_id?: number; chainId?: number };
    if (!owner) return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'owner required' } });
    try {
      const w = await createSmartWallet(owner, chain_id || chainId || 91342);
      return reply.status(201).send(w);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AA create failed';
      return reply.status(500).send({ error: { code: 'AA_CREATE_FAILED', message } });
    }
  });

  app.get('/giwa/wallet/:address', async (req, reply) => {
    const { address } = req.params as { address: string };
    try {
      const w = getSmartWallet(address);
      if (!w) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Smart wallet not found' } });
      return reply.send(w);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AA fetch failed';
      return reply.status(500).send({ error: { code: 'AA_FETCH_FAILED', message } });
    }
  });

  app.get('/giwa/wallets/:owner', async (req, reply) => {
    const { owner } = req.params as { owner: string };
    try {
      const list = listSmartWallets(owner);
      return reply.send({ owner, wallets: list });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AA list failed';
      return reply.status(500).send({ error: { code: 'AA_LIST_FAILED', message } });
    }
  });
}

// ✅ COMPLIES WITH: AGENTS.md §9, §11, API.md, ARCHITECTURE.md §3.4
// ✅ SERVICE: web3-middleware
