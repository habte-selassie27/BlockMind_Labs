import { registerTool, ToolHandler, ToolContext } from './tools';
import { AgentTool } from './types';

const GIWA_RPC = 'https://sepolia-rpc.giwa.io';

function makeRpc(body: Record<string, unknown>) {
  return fetch(GIWA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

// ── get_balance ──────────────────────────────────────────
const getBalanceTool: AgentTool = {
  name: 'get_balance',
  description: 'Get the native token balance for a wallet address on GIWA',
  input_schema: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Wallet address (0x...). If omitted, uses the connected wallet.' },
    },
    required: [],
  },
  requires_confirmation: false,
  simulation_supported: false,
  chains_supported: [9134, 91342],
};

const getBalanceHandler: ToolHandler = {
  execute: async (args, context) => {
    const address = (args.address as string) || context.walletAddress;
    try {
      const data = await makeRpc({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      });
      const wei = parseInt(data.result, 16);
      const eth = wei / 1e18;
      return {
        success: true,
        data: {
          address,
          balance_wei: data.result,
          balance_eth: eth.toFixed(6),
          chain_id: context.chainId,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};

// ── transfer_token ───────────────────────────────────────
const transferTool: AgentTool = {
  name: 'transfer_token',
  description: 'Transfer native tokens (GIWA) to another address. Requires user confirmation.',
  input_schema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient address (0x...)' },
      amount: { type: 'string', description: 'Amount in ETH/GIWA (e.g. "0.01")' },
    },
    required: ['to', 'amount'],
  },
  requires_confirmation: true,
  simulation_supported: true,
  chains_supported: [9134, 91342],
};

const transferHandler: ToolHandler = {
  execute: async (args, context) => {
    const to = args.to as string;
    const amount = args.amount as string;
    const amountWei = '0x' + BigInt(Math.round(parseFloat(amount) * 1e18)).toString(16);
    return {
      success: true,
      data: {
        from: context.walletAddress,
        to,
        value: amountWei,
        value_eth: amount,
        chain_id: context.chainId,
        status: 'pending_user_confirmation',
      },
    };
  },
};

// ── swap_tokens ──────────────────────────────────────────
const swapTool: AgentTool = {
  name: 'swap_tokens',
  description: 'Swap one token for another on GIWA. Requires user confirmation.',
  input_schema: {
    type: 'object',
    properties: {
      from_token: { type: 'string', description: 'Token to swap from (e.g. "ETH", "GIWA")' },
      to_token: { type: 'string', description: 'Token to swap to (e.g. "USDC", "GIWA")' },
      amount: { type: 'string', description: 'Amount to swap' },
    },
    required: ['from_token', 'to_token', 'amount'],
  },
  requires_confirmation: true,
  simulation_supported: true,
  chains_supported: [9134, 91342],
};

const swapHandler: ToolHandler = {
  execute: async (args, context) => {
    return {
      success: true,
      data: {
        from_token: args.from_token,
        to_token: args.to_token,
        amount: args.amount,
        chain_id: context.chainId,
        status: 'pending_user_confirmation',
      },
    };
  },
};

// ── check_contract_risk ──────────────────────────────────
const contractRiskTool: AgentTool = {
  name: 'check_contract_risk',
  description: 'Check the risk score of a smart contract address (Scam Shield)',
  input_schema: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Contract address to check' },
    },
    required: ['address'],
  },
  requires_confirmation: false,
  simulation_supported: false,
  chains_supported: [9134, 91342],
};

const contractRiskHandler: ToolHandler = {
  execute: async (args) => {
    const address = args.address as string;
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return { success: false, error: 'Invalid contract address — provide a valid 0x... address' };
    }
    try {
      const data = await makeRpc({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1,
      });
      const hasCode = data.result && data.result !== '0x' && data.result !== '0x0';
      return {
        success: true,
        data: {
          address,
          is_contract: hasCode,
          risk_score: hasCode ? 'medium' : 'low',
          has_code: hasCode,
          note: hasCode
            ? 'This is a contract. Review its source code before interacting.'
            : 'This is an EOA (externally owned account), not a contract.',
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};

// ── read_contract ────────────────────────────────────────
const readContractTool: AgentTool = {
  name: 'read_contract',
  description: 'Read data from a smart contract via eth_call',
  input_schema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Contract address' },
      data: { type: 'string', description: 'Calldata (0x...)' },
    },
    required: ['to', 'data'],
  },
  requires_confirmation: false,
  simulation_supported: false,
  chains_supported: [9134, 91342],
};

const readContractHandler: ToolHandler = {
  execute: async (args) => {
    try {
      const data = await makeRpc({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: args.to, data: args.data }, 'latest'],
        id: 1,
      });
      return {
        success: true,
        data: { to: args.to, result: data.result },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};

// ── get_transaction ──────────────────────────────────────
const getTxTool: AgentTool = {
  name: 'get_transaction',
  description: 'Get details of a transaction by its hash',
  input_schema: {
    type: 'object',
    properties: {
      hash: { type: 'string', description: 'Transaction hash (0x...)' },
    },
    required: ['hash'],
  },
  requires_confirmation: false,
  simulation_supported: false,
  chains_supported: [9134, 91342],
};

const getTxHandler: ToolHandler = {
  execute: async (args) => {
    try {
      const data = await makeRpc({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [args.hash],
        id: 1,
      });
      return {
        success: true,
        data: data.result || { hash: args.hash, status: 'not found' },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};

// ── monitor_address ──────────────────────────────────────
const monitorTool: AgentTool = {
  name: 'monitor_address',
  description: 'Monitor an address for incoming/outgoing transactions',
  input_schema: {
    type: 'object',
    properties: {
      address: { type: 'string', description: 'Address to monitor' },
    },
    required: ['address'],
  },
  requires_confirmation: false,
  simulation_supported: false,
  chains_supported: [9134, 91342],
};

const monitorHandler: ToolHandler = {
  execute: async (args, context) => {
    const rawAddr = args.address as string;
    const address = (rawAddr && rawAddr.startsWith('0x') && rawAddr.length === 42)
      ? rawAddr
      : context.walletAddress;
    try {
      const [balanceData, nonceData] = await Promise.all([
        makeRpc({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
        makeRpc({
          jsonrpc: '2.0',
          method: 'eth_getTransactionCount',
          params: [address, 'latest'],
          id: 2,
        }),
      ]);
      const balanceWei = parseInt(balanceData.result, 16);
      const balanceEth = (balanceWei / 1e18).toFixed(6);
      const nonce = parseInt(nonceData.result, 16);
      return {
        success: true,
        data: {
          address,
          balance: `${balanceEth} GIWA`,
          balance_eth: balanceEth,
          nonce,
          chain: `GIWA (${context.chainId})`,
          chain_id: context.chainId,
          status: 'Active',
          summary: `Address ${address.slice(0, 6)}...${address.slice(-4)} has ${balanceEth} GIWA with ${nonce} transactions.`,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};

// ── Register all tools ───────────────────────────────────
export function registerAllTools() {
  registerTool(getBalanceTool, getBalanceHandler);
  registerTool(transferTool, transferHandler);
  registerTool(swapTool, swapHandler);
  registerTool(contractRiskTool, contractRiskHandler);
  registerTool(readContractTool, readContractHandler);
  registerTool(getTxTool, getTxHandler);
  registerTool(monitorTool, monitorHandler);
}
