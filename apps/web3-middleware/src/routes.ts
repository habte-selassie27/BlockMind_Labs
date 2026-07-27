import type { FastifyInstance } from 'fastify';
import { getBalance, estimateGas, simulateTransaction } from './chain';
import { simulateAndBuild, sendToSigner } from './tx';
import { getBlockNumber } from './chain';
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
}

// ✅ COMPLIES WITH: AGENTS.md §9, §11, API.md, ARCHITECTURE.md §3.4
// ✅ SERVICE: web3-middleware
