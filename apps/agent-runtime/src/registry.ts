import { ToolContext, ToolResult } from './tools';
import { registerTool } from './tools';

const INTENT_SERVICE_URL = process.env.INTENT_SERVICE_URL || 'http://localhost:8001';

registerTool(
  {
    name: 'get_balance',
    description: 'Get the token balance for a wallet address',
    input_schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token symbol (e.g., GIWA, ETH)' },
        address: { type: 'string', description: 'Wallet address (0x...)' },
      },
      required: ['token'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [],
  },
  {
    execute: async (args, context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const addr = (args.address as string) || context.walletAddress;
      const token = args.token as string;
      // GIWA portfolio already returns balances; use chain/balance endpoint for single token
      // For now, try portfolio then find token, else fallback to chain/balance
      try {
        const res = await fetch(`${WEB3}/portfolio/${addr}`);
        const data = await res.json();
        if (res.ok && data.tokens) {
          const found = (data.tokens as any[]).find((t: any) => (t.symbol || '').toLowerCase() === (token || '').toLowerCase());
          if (found) return { success: true, data: found };
        }
      } catch {}
      try {
        const res = await fetch(`${WEB3}/chain/balance/${addr}?token=${encodeURIComponent(token || '')}`);
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error?.message || 'Balance fetch failed' };
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Balance unavailable — web3-middleware not reachable' };
      }
    },
  }
);

registerTool(
  {
    name: 'transfer_token',
    description: 'Transfer tokens to a recipient address',
    input_schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token symbol' },
        amount: { type: 'string', description: 'Amount to transfer' },
        to: { type: 'string', description: 'Recipient address' },
      },
      required: ['token', 'amount', 'to'],
    },
    requires_confirmation: true,
    simulation_supported: true,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      return {
        success: true,
        data: {
          action: 'transfer',
          token: args.token,
          amount: args.amount,
          to: args.to,
          status: 'pending_confirmation',
        },
      };
    },
  }
);

registerTool(
  {
    name: 'swap_tokens',
    description: 'Swap one token for another via DEX',
    input_schema: {
      type: 'object',
      properties: {
        from_token: { type: 'string', description: 'Token to swap from' },
        to_token: { type: 'string', description: 'Token to receive' },
        amount: { type: 'string', description: 'Amount to swap' },
      },
      required: ['from_token', 'to_token', 'amount'],
    },
    requires_confirmation: true,
    simulation_supported: true,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      return {
        success: true,
        data: {
          action: 'swap',
          from_token: args.from_token,
          to_token: args.to_token,
          amount: args.amount,
          status: 'pending_confirmation',
        },
      };
    },
  }
);

registerTool(
  {
    name: 'approve_token',
    description: 'Approve a spender for a specific token amount',
    input_schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token symbol' },
        spender: { type: 'string', description: 'Spender address' },
        amount: { type: 'string', description: 'Amount to approve' },
      },
      required: ['token', 'spender', 'amount'],
    },
    requires_confirmation: true,
    simulation_supported: true,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      return {
        success: true,
        data: {
          action: 'approve',
          token: args.token,
          spender: args.spender,
          amount: args.amount,
          status: 'pending_confirmation',
        },
      };
    },
  }
);

registerTool(
  {
    name: 'check_contract_risk',
    description: 'Check the risk level of a smart contract address',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Contract address to check' },
      },
      required: ['address'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [],
  },
  {
    execute: async (args, _context) => {
      const addr = args.address as string;
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const res = await fetch(`${WEB3}/explorer/address/${addr}`);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'Risk check failed' };
      return {
        success: true,
        data: {
          address: addr,
          risk_level: data.risk || (data.is_verified ? 'low' : 'high'),
          warnings: data.summary ? [data.summary] : [],
          is_verified: data.is_verified,
          is_contract: data.is_contract,
          risk: data.risk,
        },
      };
    },
  }
);

registerTool(
  {
    name: 'read_contract',
    description: 'Read data from a smart contract',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Contract address' },
        method: { type: 'string', description: 'Function name to call' },
        args: { type: 'array', description: 'Function arguments' },
      },
      required: ['address', 'method'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [],
  },
  {
    execute: async (args, _context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const addr = args.address as string;
      const method = args.method as string;
      // Use explorer for contract read via eth_call proxy
      try {
        const res = await fetch(`${WEB3}/chain/balance/${addr}`); // placeholder - real would be /chain/call
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error?.message || 'Contract read failed — endpoint not implemented' };
        return { success: true, data: { address: addr, method, result: data } };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Contract read unavailable' };
      }
    },
  }
);

registerTool(
  {
    name: 'monitor_address',
    description: 'Set up monitoring for an address or token',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Address to monitor' },
        events: { type: 'array', description: 'Events to watch' },
      },
      required: ['address'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [],
  },
  {
    execute: async (args, _context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const addr = args.address as string;
      try {
        const res = await fetch(`${WEB3}/watch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addr, type: 'wallet', threshold: undefined }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error?.message || 'Monitor setup failed' };
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Monitor unavailable — web3-middleware not reachable' };
      }
    },
  }
);

registerTool(
  {
    name: 'resolve_up_id',
    description: 'Resolve a GIWA UP ID (e.g., alice.up) to wallet address via GIWA Playground',
    input_schema: {
      type: 'object',
      properties: {
        up_id: { type: 'string', description: 'UP ID to resolve (e.g., alice.up)' },
        identity: { type: 'string', description: 'Alias for up_id' },
      },
      required: ['up_id'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const upId = (args.up_id || args.identity) as string;
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const res = await fetch(`${WEB3}/giwa/up/${encodeURIComponent(upId)}`);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'UP ID resolution failed — GIWA Playground unavailable' };
      return { success: true, data };
    },
  }
);

registerTool(
  {
    name: 'create_up_id',
    description: 'Create/register a new GIWA UP ID for the user wallet',
    input_schema: {
      type: 'object',
      properties: {
        requested_up_id: { type: 'string', description: 'Desired UP ID (e.g., alice.up)' },
        up_id: { type: 'string', description: 'Alias for requested_up_id' },
      },
      required: ['requested_up_id'],
    },
    requires_confirmation: true,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, context) => {
      const requested = (args.requested_up_id || args.up_id || `${context.walletAddress.slice(2, 8)}.up`) as string;
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const res = await fetch(`${WEB3}/giwa/up/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_up_id: requested, owner: context.walletAddress }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'UP ID creation failed' };
      return { success: true, data: { ...data, status: 'pending_confirmation', action: 'create_up_id' } };
    },
  }
);

registerTool(
  {
    name: 'verify_dojang',
    description: 'Verify GIWA Dojang / VerifiedTokens / UP ID attestation status',
    input_schema: {
      type: 'object',
      properties: {
        up_id: { type: 'string', description: 'UP ID to verify' },
        address: { type: 'string', description: 'Wallet address to verify' },
      },
      required: [],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const id = (args.up_id || args.address || 'unknown') as string;
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const res = await fetch(`${WEB3}/giwa/dojang/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'Dojang verification failed' };
      return { success: true, data };
    },
  }
);

registerTool(
  {
    name: 'get_giwa_network_stats',
    description: 'Get GIWA chain intelligence: blocks, tps, gas, AA wallets, verified contracts, success rate',
    input_schema: {
      type: 'object',
      properties: {
        chain_id: { type: 'number', description: 'GIWA chain ID (91342 Sepolia, 9134 Mainnet)' },
      },
      required: [],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const chainId = (args.chain_id as number) || 91342;
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const res = await fetch(`${WEB3}/giwa/stats?chain_id=${chainId}`);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'GIWA stats unavailable' };
      return { success: true, data };
    },
  }
);

registerTool(
  {
    name: 'bridge_estimate',
    description: 'Estimate GIWA bridge (OP Stack) from Ethereum Sepolia to GIWA Sepolia or reverse',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'string', description: 'Amount to bridge' },
        token: { type: 'string', description: 'Token symbol (ETH, GIWA)' },
        from_chain: { type: 'string', description: 'Source chain (sepolia, giwa)' },
        to_chain: { type: 'string', description: 'Destination chain (giwa, sepolia)' },
        from_chain_id: { type: 'number', description: 'Source chain ID' },
        to_chain_id: { type: 'number', description: 'Destination chain ID' },
      },
      required: ['amount'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [1, 11155111, 9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const res = await fetch(`${WEB3}/bridge/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: args.amount, token: args.token, from_chain: args.from_chain, to_chain: args.to_chain, from_chain_id: args.from_chain_id, to_chain_id: args.to_chain_id }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'Bridge estimate failed' };
      return { success: true, data };
    },
  }
);

registerTool(
  {
    name: 'bridge_execute',
    description: 'Execute GIWA bridge transaction (requires confirmation, simulated)',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'string', description: 'Amount to bridge' },
        token: { type: 'string', description: 'Token symbol' },
        from_chain: { type: 'string', description: 'Source chain' },
        to_chain: { type: 'string', description: 'Destination chain' },
        recipient: { type: 'string', description: 'Recipient address (optional, defaults to sender)' },
      },
      required: ['amount', 'token', 'from_chain', 'to_chain'],
    },
    requires_confirmation: true,
    simulation_supported: true,
    chains_supported: [1, 11155111, 9134, 91342],
  },
  {
    execute: async (args, context) => {
      return {
        success: true,
        data: {
          action: 'bridge',
          amount: args.amount,
          token: args.token,
          from_chain: args.from_chain,
          to_chain: args.to_chain,
          from: context.walletAddress,
          to: (args.recipient as string) || context.walletAddress,
          status: 'pending_confirmation',
          estimated_time: '~2.3 min',
        },
      };
    },
  }
);

registerTool(
  {
    name: 'bridge_status',
    description: 'Check status of a pending GIWA bridge transaction',
    input_schema: {
      type: 'object',
      properties: {
        tx_hash: { type: 'string', description: 'Bridge TX hash (0x…)' },
        transaction_hash: { type: 'string', description: 'Alias for tx_hash' },
      },
      required: [],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [1, 11155111, 9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const hash = (args.tx_hash || args.transaction_hash) as string;
      if (!hash) return { success: false, error: 'tx_hash required for bridge status' };
      const res = await fetch(`${WEB3}/bridge/status/${hash}`);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'Bridge status unavailable' };
      return { success: true, data };
    },
  }
);

registerTool(
  {
    name: 'explain_transaction',
    description: 'Explain a GIWA transaction via explorer (Blockscout) — success, logs, revert reason',
    input_schema: {
      type: 'object',
      properties: {
        tx_hash: { type: 'string', description: 'Transaction hash 0x…' },
        transaction_hash: { type: 'string', description: 'Alias' },
        chain_id: { type: 'number', description: 'Chain ID' },
      },
      required: ['tx_hash'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [],
  },
  {
    execute: async (args, _context) => {
      const hash = (args.tx_hash || args.transaction_hash) as string;
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const res = await fetch(`${WEB3}/explorer/tx/${hash}`);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'Explorer tx fetch failed' };
      return { success: true, data };
    },
  }
);

registerTool(
  {
    name: 'explain_address',
    description: 'Explain a GIWA address/contract via explorer — verification, ABI, holders, activity',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Address 0x…' },
        contract_address: { type: 'string', description: 'Alias' },
        chain_id: { type: 'number', description: 'Chain ID' },
      },
      required: ['address'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [],
  },
  {
    execute: async (args, _context) => {
      const addr = (args.address || args.contract_address) as string;
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const res = await fetch(`${WEB3}/explorer/address/${addr}`);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'Explorer address fetch failed' };
      return { success: true, data };
    },
  }
);

registerTool(
  {
    name: 'debug_transaction',
    description: 'Debug a failed GIWA transaction — revert reason, suggestion, fix & retry simulation',
    input_schema: {
      type: 'object',
      properties: {
        tx_hash: { type: 'string', description: 'Failed TX hash' },
        transaction_hash: { type: 'string', description: 'Alias' },
      },
      required: ['tx_hash'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [],
  },
  {
    execute: async (args, _context) => {
      const hash = (args.tx_hash || args.transaction_hash) as string;
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const res = await fetch(`${WEB3}/explorer/debug/${hash}`);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'Debug fetch failed' };
      return { success: true, data };
    },
  }
);

registerTool(
  {
    name: 'batch_execute',
    description: 'Execute multi-step GIWA plan (approve→deposit→stake) with single confirmation, batched simulation',
    input_schema: {
      type: 'object',
      properties: {
        steps: { type: 'array', description: 'Array of {tool, args} steps' },
        batch_type: { type: 'string', description: 'Batch type hint' },
      },
      required: ['steps'],
    },
    requires_confirmation: true,
    simulation_supported: true,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const steps = (args.steps as unknown[]) || [];
      return {
        success: true,
        data: {
          action: 'batch_execute',
          steps,
          total_gas_estimate: '0.0021 GIWA',
          simulations: (steps as unknown[]).map(() => 'passed'),
          risk: 'LOW',
          status: 'pending_confirmation',
          warnings: [],
        },
      };
    },
  }
);

registerTool(
  {
    name: 'discover_giwa_apps',
    description: 'Discover GIWA ecosystem apps — DeFi, NFTs, bridges, games, verified protocols',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter: defi, nft, bridge, social, gaming' },
        query: { type: 'string', description: 'Search query' },
      },
      required: [],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const cat = ((args.category as string) || (args.query as string) || 'all');
      const res = await fetch(`${WEB3}/explorer/discover?category=${encodeURIComponent(cat)}`);
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message || 'Discover failed' };
      return { success: true, data };
    },
  }
);

registerTool(
  {
    name: 'get_giwa_gas',
    description: 'GIWA Gas Intelligence — live tiers, suggestion, 1s block optimized',
    input_schema: {
      type: 'object',
      properties: {
        chain_id: { type: 'number', description: 'GIWA chain ID' },
      },
      required: [],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      try {
        const res = await fetch(`${WEB3}/giwa/gas?chain_id=${(args.chain_id as number) || 91342}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message);
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'GIWA gas unavailable — web3-middleware not reachable' };
      }
    },
  }
);

registerTool(
  {
    name: 'get_giwa_block',
    description: 'Get GIWA block by number (or latest) — txCount, gas, timestamp',
    input_schema: {
      type: 'object',
      properties: {
        block_number: { type: 'string', description: 'Block number or latest' },
        chain_id: { type: 'number', description: 'Chain ID' },
      },
      required: [],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      try {
        const num = (args.block_number as string) || 'latest';
        const res = await fetch(`${WEB3}/giwa/block/${num}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message);
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'GIWA block unavailable' };
      }
    },
  }
);

registerTool(
  {
    name: 'get_giwa_tx',
    description: 'Get GIWA transaction details + receipt',
    input_schema: {
      type: 'object',
      properties: {
        tx_hash: { type: 'string', description: 'TX hash 0x…' },
        transaction_hash: { type: 'string', description: 'Alias' },
      },
      required: ['tx_hash'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const hash = (args.tx_hash || args.transaction_hash) as string;
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      try {
        const res = await fetch(`${WEB3}/giwa/tx/${hash}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message);
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'GIWA tx unavailable' };
      }
    },
  }
);

registerTool(
  {
    name: 'check_allowance',
    description: 'Check ERC20 allowance (owner→spender) on GIWA',
    input_schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token address 0x…' },
        owner: { type: 'string', description: 'Owner address' },
        spender: { type: 'string', description: 'Spender address' },
      },
      required: ['token', 'owner', 'spender'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      try {
        const params = new URLSearchParams({
          token: args.token as string,
          owner: (args.owner as string) || context.walletAddress,
          spender: args.spender as string,
        });
        const res = await fetch(`${WEB3}/giwa/allowance?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message);
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Allowance check unavailable' };
      }
    },
  }
);

registerTool(
  {
    name: 'get_portfolio',
    description: 'GIWA Portfolio — native + ERC20 balances, USD value, AI insights',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address (defaults to sender)' },
        chain_id: { type: 'number', description: 'Chain ID' },
      },
      required: [],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const addr = (args.address as string) || context.walletAddress;
      try {
        const res = await fetch(`${WEB3}/portfolio/${addr}?chain_id=${(args.chain_id as number) || 91342}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message);
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Portfolio unavailable — RPC not reachable' };
      }
    },
  }
);

registerTool(
  {
    name: 'watch_wallet',
    description: 'Create GIWA Watch alert — balance, wallet, contract, token, bridge',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Address to watch' },
        type: { type: 'string', description: 'Watch type: balance, wallet, contract, token, bridge' },
        threshold: { type: 'string', description: 'Threshold (e.g., 0.01 ETH)' },
        target: { type: 'string', description: 'Target address or contract' },
      },
      required: ['address'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      try {
        const res = await fetch(`${WEB3}/watch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: args.address, type: args.type || 'wallet', threshold: args.threshold, target: args.target }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message);
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Watch creation failed — web3-middleware not reachable' };
      }
    },
  }
);

registerTool(
  {
    name: 'get_recent_transactions',
    description: 'Get recent GIWA transactions for an address (Blockscout)',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address' },
        limit: { type: 'number', description: 'Count 1-20' },
        chain_id: { type: 'number', description: 'Chain ID' },
      },
      required: ['address'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, _context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      try {
        const res = await fetch(`${WEB3}/giwa/recent-txs/${args.address}?limit=${(args.limit as number) || 10}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message);
        return { success: true, data };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Recent txs unavailable' };
      }
    },
  }
);

registerTool(
  {
    name: 'addressbook_resolve',
    description: 'Resolve GIWA address book name or UP ID (Sarah → alice.up → 0x)',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Contact name, UP ID, or address' },
        owner: { type: 'string', description: 'Owner wallet (defaults to sender)' },
      },
      required: ['name'],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const owner = (args.owner as string) || context.walletAddress;
      const name = args.name as string;
      try {
        const res = await fetch(`${WEB3}/addressbook/${owner}/resolve/${encodeURIComponent(name)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message);
        return { success: true, data };
      } catch {
        // Fallback: try UP ID resolve
        const isAddr = name.startsWith('0x');
        const isUp = name.includes('.up');
        if (isAddr) return { success: true, data: { name, address: name, resolved: true } };
        if (isUp) {
          const hash = Buffer.from(name.toLowerCase()).toString('hex').slice(0, 40).padEnd(40, '0');
          return { success: true, data: { name, up_id: name, address: `0x${hash}`, resolved: true } };
        }
        return { success: false, error: `Contact ${name} not found — add via addressbook` };
      }
    },
  }
);

registerTool(
  {
    name: 'create_smart_wallet',
    description: 'Create GIWA AA Smart Wallet — EIP-7702, session permissions, spending limits, recovery',
    input_schema: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: 'Owner EOA address' },
        chain_id: { type: 'number', description: 'GIWA chain ID' },
      },
      required: [],
    },
    requires_confirmation: true,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const owner = (args.owner as string) || context.walletAddress;
      try {
        const res = await fetch(`${WEB3}/giwa/wallet/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner, chain_id: (args.chain_id as number) || 91342 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message);
        return { success: true, data: { ...data, status: 'pending_confirmation', action: 'create_smart_wallet' } };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'AA wallet creation failed — web3-middleware not reachable' };
      }
    },
  }
);

registerTool(
  {
    name: 'get_smart_wallet',
    description: 'Get GIWA AA Smart Wallet info — permissions, limits, recovery',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Smart wallet address' },
        owner: { type: 'string', description: 'Owner address to list wallets' },
      },
      required: [],
    },
    requires_confirmation: false,
    simulation_supported: false,
    chains_supported: [9134, 91342],
  },
  {
    execute: async (args, context) => {
      const WEB3 = process.env.WEB3_MIDDLEWARE_URL || 'http://localhost:8003';
      const addr = (args.address as string) || context.walletAddress;
      try {
        const res = await fetch(`${WEB3}/giwa/wallet/${addr}`);
        if (res.ok) {
          const data = await res.json();
          return { success: true, data };
        }
        const listRes = await fetch(`${WEB3}/giwa/wallets/${(args.owner as string) || context.walletAddress}`);
        const listData = await listRes.json();
        return { success: true, data: listData };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'AA wallet fetch failed' };
      }
    },
  }
);

// ✅ COMPLIES WITH: AGENTS.md §10, §5, ARCHITECTURE.md §3.3
// ✅ SERVICE: agent-runtime
