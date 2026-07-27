import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  connected: boolean;
  connecting: boolean;
  provider: 'metamask' | 'walletconnect' | 'manual' | 'blockmind' | null;
}

interface WalletContextType extends WalletState {
  connect: (method: WalletState['provider']) => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  signAndSend: (tx: Record<string, unknown>) => Promise<string>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

const GIWA_CHAINS = {
  9134: { name: 'GIWA Mainnet', rpc: 'https://rpc.giwa.io', explorer: 'https://explorer.giwa.io' },
  91342: { name: 'GIWA Sepolia', rpc: 'https://sepolia-rpc.giwa.io', explorer: 'https://sepolia-explorer.giwa.io' },
};

function formatBalance(wei: string): string {
  const eth = parseInt(wei, 16) / 1e18;
  return eth.toFixed(4);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: null,
    connected: false,
    connecting: false,
    provider: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const refreshBalance = useCallback(async () => {
    const { address, chainId } = stateRef.current;
    if (!address || !chainId) return;
    const chain = GIWA_CHAINS[chainId as keyof typeof GIWA_CHAINS];
    const rpc = chain?.rpc || 'https://sepolia-rpc.giwa.io';

    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });
      const data = await res.json();
      if (data.result) {
        const bal = formatBalance(data.result);
        setState((prev) => ({ ...prev, balance: bal }));
      }
    } catch {
      // Silently fail
    }
  }, []);

  const connectMetaMask = async () => {
    if (!(window as any).ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask or use another method.');
    }

    const ethereum = (window as any).ethereum;
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const chainId = await ethereum.request({ method: 'eth_chainId' });

    setState((prev) => ({
      ...prev,
      address: accounts[0],
      chainId: parseInt(chainId, 16),
      connected: true,
      provider: 'metamask',
    }));

    ethereum.on('accountsChanged', (accounts: string[]) => {
      setState((prev) => ({
        ...prev,
        address: accounts[0] || null,
        connected: accounts.length > 0,
      }));
    });

    ethereum.on('chainChanged', (chainId: string) => {
      setState((prev) => ({ ...prev, chainId: parseInt(chainId, 16) }));
    });

    // Fetch balance immediately
    setTimeout(() => refreshBalance(), 100);
  };

  const connectManual = async (address: string) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address');
    }

    setState((prev) => ({
      ...prev,
      address,
      chainId: 91342,
      connected: true,
      provider: 'manual',
      balance: null,
    }));

    // Fetch balance immediately after connecting
    setTimeout(() => refreshBalance(), 100);
  };

  const connectBlockmind = async () => {
    // Check if Blockmind wallet extension is installed
    const ready = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000);
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'BLOCKMIND_WALLET_READY') {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          resolve(true);
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'BLOCKMIND_REQUEST', method: 'eth_requestAccounts' }, '*');
    });

    if (!ready) {
      throw new Error('Blockmind Wallet extension not detected. Please install it first.');
    }

    const accounts = await new Promise<string[]>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'BLOCKMIND_RESPONSE' && event.data?.method === 'eth_requestAccounts') {
          window.removeEventListener('message', handler);
          resolve(event.data.result || []);
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({
        type: 'BLOCKMIND_REQUEST',
        method: 'eth_requestAccounts',
        id: Date.now(),
      }, '*');
    });

    if (accounts.length > 0) {
      setState((prev) => ({
        ...prev,
        address: accounts[0],
        chainId: 91342,
        connected: true,
        provider: 'blockmind',
      }));
    }
  };

  const connect = async (method: WalletState['provider']) => {
    setState((prev) => ({ ...prev, connecting: true }));
    try {
      switch (method) {
        case 'metamask':
          await connectMetaMask();
          break;
        case 'blockmind':
          await connectBlockmind();
          break;
        case 'manual': {
          const address = prompt('Enter your wallet address (0x...)');
          if (address) await connectManual(address);
          break;
        }
        default:
          throw new Error(`Unsupported connection method: ${method}`);
      }
    } finally {
      setState((prev) => ({ ...prev, connecting: false }));
    }
  };

  const disconnect = () => {
    setState({
      address: null,
      chainId: null,
      balance: null,
      connected: false,
      connecting: false,
      provider: null,
    });
  };

  const switchChain = async (chainId: number) => {
    if (state.provider === 'metamask' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      } catch {
        // Chain not added, add it
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${chainId.toString(16)}`,
            chainName: GIWA_CHAINS[chainId as keyof typeof GIWA_CHAINS]?.name || 'GIWA',
            rpcUrls: [GIWA_CHAINS[chainId as keyof typeof GIWA_CHAINS]?.rpc || 'https://rpc.giwa.io'],
            nativeCurrency: { name: 'GIWA', symbol: 'GIWA', decimals: 18 },
            blockExplorerUrls: [GIWA_CHAINS[chainId as keyof typeof GIWA_CHAINS]?.explorer || ''],
          }],
        });
      }
    }
    setState((prev) => ({ ...prev, chainId }));
  };

  const signAndSend = async (tx: Record<string, unknown>): Promise<string> => {
    if (state.provider === 'metamask' && (window as any).ethereum) {
      return await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [tx],
      });
    }
    throw new Error('Transaction signing requires MetaMask or Blockmind Wallet');
  };

  // Refresh balance when connected
  useEffect(() => {
    if (state.connected && state.address) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 15000);
      return () => clearInterval(interval);
    }
  }, [state.connected, state.address, refreshBalance]);

  return (
    <WalletContext.Provider value={{
      ...state,
      connect,
      disconnect,
      switchChain,
      signAndSend,
      refreshBalance,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
