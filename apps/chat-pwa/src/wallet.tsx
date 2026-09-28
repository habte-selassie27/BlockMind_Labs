import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { getChainById } from './lib/chains';
import {
  discoverProvider,
  isBlockmindInstalled,
  onProviderAvailable,
  type Eip1193Provider,
} from './lib/blockmind-provider';
import { clearViewSession, loadViewSession, saveViewSession } from './lib/watchlist';

interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  connected: boolean;
  connecting: boolean;
  provider: 'metamask' | 'walletconnect' | 'manual' | 'blockmind' | null;
}

interface WalletContextType extends WalletState {
  /** True when connected as a watched address — no keys, no signing. */
  isViewOnly: boolean;
  connect: (method: WalletState['provider'], address?: string) => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  signAndSend: (tx: Record<string, unknown>) => Promise<string>;
  refreshBalance: () => Promise<void>;
  /** True when the Blockmind Wallet extension is present on this page. */
  blockmindInstalled: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export const DEFAULT_CHAIN_ID = 91342;

/** Wei → display string, using BigInt so large balances do not lose precision. */
function formatBalance(wei: string): string {
  const value = BigInt(wei);
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, '0').slice(0, 4);
  return `${whole}.${fraction}`;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(() => {
    // Restore a view-only session so reloads keep the watched address
    const session = loadViewSession();
    if (session) {
      return {
        address: session.address,
        chainId: session.chainId,
        balance: null,
        connected: true,
        connecting: false,
        provider: 'manual',
      };
    }
    return {
      address: null,
      chainId: null,
      balance: null,
      connected: false,
      connecting: false,
      provider: null,
    };
  });
  // The EIP-1193 provider for whichever wallet is connected (MetaMask or Blockmind).
  const providerRef = useRef<Eip1193Provider | null>(null);

  // Live extension-presence flag. Kept in state (not a render-time read) because the
  // MAIN-world script can land after this component's first render — a one-shot check
  // permanently reported "Not detected" in that case.
  const [blockmindInstalled, setBlockmindInstalled] = useState(() => isBlockmindInstalled());

  const stateRef = useRef(state);
  stateRef.current = state;

  const refreshBalance = useCallback(async () => {
    const { address, chainId } = stateRef.current;
    if (!address || !chainId) return;

    const rpc = getChainById(chainId)?.rpc ?? 'https://sepolia-rpc.giwa.io';

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
      // Balance is best-effort; the rest of the UI stays usable.
    }
  }, []);

  const subscribe = useCallback((provider: Eip1193Provider) => {
    provider.on?.('accountsChanged', (accounts: string[]) => {
      setState((prev) => ({
        ...prev,
        address: accounts?.[0] ?? null,
        connected: Boolean(accounts?.[0]),
      }));
    });

    provider.on?.('chainChanged', (chainId: string) => {
      setState((prev) => ({ ...prev, chainId: Number.parseInt(chainId, 16) }));
    });
  }, []);

  const connectMetaMask = async () => {
    const provider = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
    if (!provider) {
      throw new Error('MetaMask not installed. Install MetaMask, or use Blockmind Wallet.');
    }

    const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    const chainId = (await provider.request({ method: 'eth_chainId' })) as string;

    providerRef.current = provider;
    subscribe(provider);
    clearViewSession();

    setState((prev) => ({
      ...prev,
      address: accounts[0] ?? null,
      chainId: Number.parseInt(chainId, 16),
      connected: true,
      provider: 'metamask',
    }));

    setTimeout(() => refreshBalance(), 100);
  };

  /**
   * Connects to the Blockmind Wallet extension.
   *
   * The extension injects `window.blockmind` at document_start, so detection is a
   * synchronous check rather than a timed-out message handshake.
   */
  const connectBlockmind = async () => {
    const provider = await discoverProvider();

    if (!provider) {
      throw new Error(
        'Blockmind Wallet extension not detected. Install it, then reload this page — visit /extension/ for setup steps.',
      );
    }

    const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    if (!accounts?.length) {
      throw new Error('Blockmind Wallet returned no accounts. Unlock the extension and try again.');
    }

    const chainId = (await provider.request({ method: 'eth_chainId' })) as string;

    providerRef.current = provider;
    subscribe(provider);
    clearViewSession();

    setState((prev) => ({
      ...prev,
      address: accounts[0],
      chainId: Number.parseInt(chainId, 16),
      connected: true,
      provider: 'blockmind',
      balance: null,
    }));

    setTimeout(() => refreshBalance(), 100);
  };

  const connectManual = async (address: string) => {
    const normalized = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
      throw new Error('Invalid Ethereum address');
    }

    providerRef.current = null;
    setState((prev) => ({
      ...prev,
      address: normalized,
      chainId: DEFAULT_CHAIN_ID,
      connected: true,
      provider: 'manual',
      balance: null,
    }));
    saveViewSession(normalized, DEFAULT_CHAIN_ID);

    setTimeout(() => refreshBalance(), 100);
  };

  const connect = async (method: WalletState['provider'], address?: string) => {
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
          if (!address) throw new Error('Address required for view-only mode');
          await connectManual(address);
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
    providerRef.current = null;
    clearViewSession();
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
    const provider = providerRef.current;
    const chain = getChainById(chainId);

    if (provider && (state.provider === 'metamask' || state.provider === 'blockmind')) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      } catch {
        // Chain not added yet — ask the wallet to add it.
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: chain?.name ?? 'GIWA',
                rpcUrls: [chain?.rpc ?? 'https://rpc.giwa.io'],
                nativeCurrency: chain?.nativeCurrency ?? { name: 'GIWA', symbol: 'GIWA', decimals: 18 },
                blockExplorerUrls: [chain?.explorer ?? ''],
              },
            ],
          });
        } catch {
          // The wallet refused; the locally tracked chain still updates below.
        }
      }
    }
    setState((prev) => ({ ...prev, chainId }));
  };

  const signAndSend = async (tx: Record<string, unknown>): Promise<string> => {
    // §12.2/§12.5 — a view-only session must never reach a signer, not even
    // through the window.ethereum fallback (the extension may be installed).
    if (state.provider === 'manual') {
      throw new Error('View-only session: connect MetaMask or Blockmind Wallet before sending a transaction.');
    }

    const provider =
      providerRef.current ?? ((window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null);

    if (!provider) {
      throw new Error('Connect MetaMask or Blockmind Wallet before sending a transaction.');
    }

    return (await provider.request({
      method: 'eth_sendTransaction',
      params: [tx],
    })) as string;
  };

  // Stop polling for the extension once it has been seen.
  useEffect(() => {
    if (blockmindInstalled) return;
    return onProviderAvailable(() => setBlockmindInstalled(true));
  }, [blockmindInstalled]);

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
      isViewOnly: state.provider === 'manual' && state.connected,
      connect,
      disconnect,
      switchChain,
      signAndSend,
      refreshBalance,
      blockmindInstalled,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
