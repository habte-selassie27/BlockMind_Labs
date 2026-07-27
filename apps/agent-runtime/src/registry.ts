import { ToolContext, ToolResult } from './types';
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
    execute: async (args, _context) => {
      // Delegates to web3-middleware in production
      // Phase 2: return mock for demo
      return {
        success: true,
        data: {
          token: args.token,
          address: args.address || '0x0000000000000000000000000000000000000000',
          balance: '0',
          formatted: '0',
        },
      };
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
      return {
        success: true,
        data: {
          address: args.address,
          risk_level: 'unknown',
          warnings: ['No risk data available for this contract'],
          is_verified: false,
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
      return {
        success: true,
        data: {
          address: args.address,
          method: args.method,
          result: null,
        },
      };
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
      return {
        success: true,
        data: {
          address: args.address,
          monitoring: true,
          events: args.events || ['all'],
        },
      };
    },
  }
);

// ✅ COMPLIES WITH: AGENTS.md §10, §5, ARCHITECTURE.md §3.3
// ✅ SERVICE: agent-runtime
