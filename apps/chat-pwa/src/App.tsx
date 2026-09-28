import { useState, useRef, useEffect, useCallback } from 'react';
import { WalletProvider, useWallet } from './wallet';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ContextPanel from './components/ContextPanel';
import ChatMessage from './components/ChatMessage';
import TxSimulationCard from './components/TxSimulationCard';
import TokenApprovalsManager from './components/TokenApprovalsManager';
import AgentThinking from './components/AgentThinking';
import InputBar from './components/InputBar';
import ToolCall from './components/ToolCall';
import Toast from './components/Toast';
import WalletModal from './components/WalletModal';
import TransferModal from './components/TransferModal';
import SwapModal from './components/SwapModal';
import GasOptimizer from './components/GasOptimizer';
import MultiStepChaining from './components/MultiStepChaining';
import ErrorRecoveryCard from './components/ErrorRecoveryCard';
import NotificationCenter from './components/NotificationCenter';
import EmptyState from './components/EmptyState';
import CommandPalette from './components/CommandPalette';
import ViewOnlyPanel from './components/ViewOnlyPanel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { resolveWatchInput } from './lib/address';
import { buildSignableTransaction } from './lib/tx-intent';
import { addRecentAddress, getRecentAddresses, getWatchlist, markWatchlistSeen, parseWatchParam, WatchEntry } from './lib/watchlist';
import { detectIncoming, fetchActivity, formatAmount } from './lib/viewonly';
import { notifications } from './lib/notifications';
import IdentityCard from './components/giwa/IdentityCard';
import BridgeCard from './components/giwa/BridgeCard';
import NetworkPulse from './components/giwa/NetworkPulse';
import ExplorerCard from './components/giwa/ExplorerCard';
import ExecutionPlan from './components/giwa/ExecutionPlan';
import DiscoverCard from './components/giwa/DiscoverCard';
import PortfolioCard from './components/giwa/PortfolioCard';
import WatchCard from './components/giwa/WatchCard';
import SmartWalletCard from './components/giwa/SmartWalletCard';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
  toolStatus?: 'running' | 'success' | 'error';
  timestamp?: number;
  toolData?: any;
  cardType?: 'identity' | 'bridge' | 'network' | 'explorer' | 'discover' | 'execution' | 'debug' | 'portfolio' | 'watch' | 'gas' | 'tx' | 'block' | 'allowance' | 'recent' | 'wallet';
}

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
}

interface PendingConfirmation {
  sessionId: string;
  token: string;
  summary: Record<string, unknown>;
}

interface TxRecord {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
}

const API_BASE = '/api';

/** Tools that require a signing wallet — blocked in view-only mode. */
const SIGNING_TOOLS = new Set(['transfer', 'swap', 'approvals', 'chain', 'batch']);

function ChatApp() {
  const wallet = useWallet();
  const isViewOnly = wallet.isViewOnly;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWatch, setShowWatch] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchEntry[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [showGas, setShowGas] = useState(false);
  const [showChain, setShowChain] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ code: string; message: string; suggestion?: string } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  useEffect(() => {
    document.body.classList.add('chat-mode');
    return () => document.body.classList.remove('chat-mode');
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pendingConfirm]);

  // Initial welcome message — set once, then keep unless new chat
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: wallet.connected && isViewOnly
        ? `Hi! I'm **Blockmind**, your GIWA-native AI assistant ⚡\n\n👁 **View-only mode** — watching **\`${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}\`** on **GIWA Sepolia (91342)**\n\nI can read balances, tokens, activity and run Scam Shield checks for this address. Signing is disabled until you connect a wallet.\n\n**Try:**\n- \`Explain 0x...\` — explorer\n- \`monitor this address\` — watch activity\n- \`check contract risk 0x...\` — Scam Shield\n\nWhat would you like to look up?`
        : wallet.connected
        ? `Hi! I'm **Blockmind**, your GIWA-native AI assistant ⚡\n\nWallet **\`${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}\`** on **GIWA Sepolia (91342)** · 1s blocks\n\n**GIWA-native Try:**\n- \`Create my UP ID alice.up\` — identity\n- \`Bridge 0.1 ETH from Sepolia to GIWA\` — 2.3 min\n- \`How is GIWA doing right now?\` — network\n- \`Explain 0x...\` — explorer\n- \`Prepare my GIWA wallet for DeFi\` — batch\n\nWhat would you like to do?`
        : `Hi! I'm **Blockmind** — the AI interface for **GIWA**.\n\nI turn natural language into **GIWA transactions**: UP ID (\`alice.up\`), bridging (Sepolia↔GIWA), network intel, explorer copilot, and batched DeFi flows — all simulated & Scam-Shielded.\n\nConnect your wallet, paste any address to **watch it read-only**, or try a demo prompt below.`,
      timestamp: Date.now(),
    }]);
  }, [wallet.connected, wallet.address, isViewOnly]);

  useEffect(() => {
    const pending = sessionStorage.getItem('blockmind_pending_prompt');
    if (pending) {
      sessionStorage.removeItem('blockmind_pending_prompt');
      setTimeout(() => sendMessage(pending), 500);
    }
  }, []);

  const addMessage = useCallback((role: Message['role'], content: string, extra?: Partial<Message>) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, role, content, timestamp: Date.now(), ...extra },
    ]);
  }, []);

  const addToast = useCallback((type: ToastItem['type'], title: string, message?: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, type === 'error' ? 6000 : 4000);
  }, []);

  const addTxRecord = useCallback((tx: Omit<TxRecord, 'timestamp' | 'status'>) => {
    const record = { ...tx, timestamp: Date.now(), status: 'confirmed' as const };
    setTxHistory((prev) => {
      const updated = [record, ...prev].slice(0, 50);
      localStorage.setItem('blockmind_tx_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('blockmind_tx_history');
      if (raw) setTxHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const refreshWatchlist = useCallback(() => setWatchlist(getWatchlist()), []);

  useEffect(() => {
    refreshWatchlist();
    setRecents(getRecentAddresses());
  }, [refreshWatchlist]);

  // Deep link: /chat?watch=0x… (or ?watch=vitalik.eth) pre-loads a view-only session
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const raw = parseWatchParam(window.location.search);
    if (!raw) return;
    (async () => {
      const result = await resolveWatchInput(raw);
      if (result.address) {
        await wallet.connect('manual', result.address);
        addRecentAddress(result.address);
        setRecents(getRecentAddresses());
        setShowWatch(true);
        const url = new URL(window.location.href);
        url.searchParams.delete('watch');
        window.history.replaceState({}, '', url.toString());
      } else {
        addToast('error', 'Invalid watch link', result.error || 'Could not resolve that address');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Incoming-funds alerts for watchlist entries with alerts enabled
  useEffect(() => {
    const watching = watchlist.filter((w) => w.alerts).slice(0, 5);
    if (watching.length === 0) return;
    let cancelled = false;

    const poll = async () => {
      for (const entry of watching) {
        try {
          const txs = await fetchActivity(entry.address, 91342, 15);
          if (cancelled) return;
          const { incoming, newestHash } = detectIncoming(txs, entry.address, entry.lastSeenTx);
          if (incoming.length > 0) {
            const value = Number(incoming[0].valueWei) / 1e18;
            const short = `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`;
            notifications.info('Incoming funds', `${formatAmount(value)} GIWA received by ${short}`);
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification('Incoming funds', { body: `${formatAmount(value)} GIWA → ${short}` });
              } catch {}
            }
            refreshWatchlist();
          }
          if (newestHash) markWatchlistSeen(entry.address, newestHash);
        } catch {
          // polling is best-effort
        }
      }
    };

    void poll();
    const id = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [watchlist, refreshWatchlist]);

  // View-only → connected upgrade: enable signing and tell the user
  const prevProviderRef = useRef(wallet.provider);
  useEffect(() => {
    const prev = prevProviderRef.current;
    if (prev === 'manual' && wallet.provider && wallet.provider !== 'manual' && wallet.connected) {
      addToast('success', 'Wallet connected', 'Signing is now enabled for this session.');
      addMessage('system', 'Wallet connected — this session can now sign transactions.');
      setShowWatch(false);
    }
    prevProviderRef.current = wallet.provider;
  }, [wallet.provider, wallet.connected, addToast, addMessage]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text || loading) return;
    setLoading(true);
    addMessage('user', text);

    try {
      const res = await fetch(`${API_BASE}/agent/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionIdRef.current,
          wallet_address: wallet.address,
          chain_id: wallet.chainId || 91342,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const code = data.error?.code || (res.status === 429 ? 'rate_limited' : 'network_error');
        const msg = data.error?.message || `Server error (${res.status})`;
        setErrorInfo({ code, message: msg });
        addMessage('system', `Error: ${msg}`);
        addToast('error', 'Server Error', msg);
        return;
      }

      if (data.session_id && !sessionIdRef.current) {
        setSessionId(data.session_id);
      }

      if (data.requires_confirmation) {
        const confirmation = data.response?.confirmation || {};
        setPendingConfirm({
          sessionId: data.session_id,
          token: confirmation.token,
          summary: confirmation.summary || data.tx_summary || {},
        });
      } else if (data.response?.tool_calls?.length > 0) {
        for (const tool of data.response.tool_calls) {
          const tname = tool.tool as string;
          const tdata = tool.result || tool.arguments || {};
          // Map GIWA tools to rich cards
          let cardType: Message['cardType'] = undefined;
          if (['resolve_up_id', 'create_up_id', 'verify_dojang', 'addressbook_resolve'].includes(tname)) cardType = 'identity';
          else if (['bridge_estimate', 'bridge_execute', 'bridge_status'].includes(tname)) cardType = 'bridge';
          else if (['get_giwa_network_stats'].includes(tname)) cardType = 'network';
          else if (['explain_address', 'explain_transaction'].includes(tname)) cardType = 'explorer';
          else if (['debug_transaction'].includes(tname)) cardType = 'debug';
          else if (['discover_giwa_apps'].includes(tname)) cardType = 'discover';
          else if (['batch_execute'].includes(tname)) cardType = 'execution';
          else if (['get_portfolio', 'portfolio_summary'].includes(tname)) cardType = 'portfolio';
          else if (['watch_wallet', 'monitor_address'].includes(tname)) cardType = 'watch';
          else if (['get_giwa_gas', 'gas_estimate'].includes(tname)) cardType = 'gas';
          else if (['get_giwa_tx', 'get_recent_transactions'].includes(tname)) cardType = 'recent';
          else if (['get_giwa_block'].includes(tname)) cardType = 'block';
          else if (['check_allowance'].includes(tname)) cardType = 'allowance';
          else if (['create_smart_wallet', 'get_smart_wallet'].includes(tname)) cardType = 'wallet';

          if (cardType) {
            addMessage('tool', `Called ${tname}`, {
              toolName: tname,
              toolStatus: 'success',
              toolData: tdata,
              cardType,
            } as any);
          } else {
            addMessage('tool', `Called ${tname}`, {
              toolName: tname,
              toolStatus: 'success',
            });
          }
        }
        if (data.response.content) {
          addMessage('assistant', data.response.content);
        }
      } else {
        addMessage('assistant', data.response?.content || 'Done.');
      }
    } catch (err: unknown) {
      let code = 'network_error';
      let msg = 'Could not reach the server. Please try again.';
      if (err instanceof TypeError && (err as Error).message.includes('Failed to fetch')) {
        code = 'network_error';
        msg = 'Network unreachable. Check your connection and ensure the backend is running.';
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorInfo({ code, message: msg });
      addMessage('system', `Error: ${msg}`);
      addToast('error', 'Connection Error', msg);
    } finally {
      setLoading(false);
    }
  }, [loading, wallet.address, wallet.chainId, addMessage, addToast]);

  const handleConfirm = useCallback(async (approved: boolean) => {
    if (!pendingConfirm) return;

    if (wallet.isViewOnly) {
      addMessage('system', 'Blocked: this session is view-only. Connect MetaMask or Blockmind Wallet to sign transactions.');
      addToast('warning', 'View-only mode', 'No signing without a connected wallet.');
      setPendingConfirm(null);
      return;
    }

    if (approved) {
      addMessage('system', 'Transaction confirmed. Signing with wallet…');

      try {
        // Both MetaMask and the Blockmind Wallet extension sign through the same
        // EIP-1193 surface, so neither is treated as a second-class citizen.
        if (wallet.provider === 'metamask' || wallet.provider === 'blockmind') {
          const built = buildSignableTransaction({
            from: wallet.address,
            chainId: wallet.chainId,
            summary: pendingConfirm.summary,
          });

          // Never invent a transaction. Asking the wallet to sign a zero-value transfer
          // that does not match the summary the user just approved is worse than asking
          // for nothing at all (§12.2).
          if (!built.ok) {
            addMessage('system', `Not signed: ${built.reason}`);
            addToast('warning', 'Nothing to sign', built.reason);
            setPendingConfirm(null);
            return;
          }

          const txParams = built.tx;
          const txHash = await wallet.signAndSend(txParams);

          addMessage('assistant', `Transaction submitted! Hash: \`${txHash}\`\n\n[View on Explorer](https://sepolia-explorer.giwa.io/tx/${txHash})`);
          addToast('success', 'Transaction Sent', `TX: ${txHash.slice(0, 10)}…`);

          addTxRecord({
            hash: txHash,
            from: wallet.address || '',
            to: String(pendingConfirm.summary.to || txParams.to),
            amount: String(pendingConfirm.summary.amount || '0'),
            token: String(pendingConfirm.summary.token || 'GIWA'),
          });
        } else {
          await fetch(`${API_BASE}/agent/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: pendingConfirm.sessionId,
              confirmation_token: pendingConfirm.token,
              approved: true,
            }),
          });

          addMessage('system', 'Transaction confirmed (simulated — connect MetaMask or Blockmind Wallet for real signing).');
          addToast('success', 'Transaction Confirmed', 'Submitted to network.');
        }
      } catch (err: any) {
        const msg = err?.message || 'Unknown error';
        if (msg.includes('User rejected') || msg.includes('user denied')) {
          addMessage('system', 'Transaction rejected by user in wallet.');
          addToast('warning', 'Rejected', 'You rejected the transaction in your wallet.');
        } else if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) {
          setErrorInfo({ code: 'insufficient_funds', message: msg });
          addMessage('system', `Transaction failed: ${msg}`);
          addToast('error', 'Insufficient Funds', msg);
        } else if (msg.includes('nonce')) {
          setErrorInfo({ code: 'timeout', message: 'Nonce too low — the transaction may already be pending.' });
          addMessage('system', `Transaction failed: nonce error`);
          addToast('error', 'Nonce Error', msg);
        } else {
          setErrorInfo({ code: 'simulation_failed', message: msg });
          addMessage('system', `Transaction failed: ${msg}`);
          addToast('error', 'Transaction Failed', msg);
        }
      }
    } else {
      addMessage('system', 'Transaction cancelled.');
    }

    setPendingConfirm(null);
  }, [pendingConfirm, wallet, addMessage, addToast, addTxRecord]);

  const handleToolClick = useCallback((toolName: string) => {
    if (isViewOnly && SIGNING_TOOLS.has(toolName)) {
      addToast('warning', 'View-only mode', 'Connect a wallet to use signing tools.');
      addMessage('system', `\`${toolName}\` needs a signing wallet. You are viewing an address read-only — use Connect wallet to enable signing.`);
      return;
    }
    switch (toolName) {
      case 'transfer': setShowTransferModal(true); break;
      case 'swap': setShowSwapModal(true); break;
      case 'balance': sendMessage('check my GIWA balance'); break;
      case 'analyze': sendMessage('analyze my wallet activity and show all details'); break;
      case 'monitor': sendMessage('monitor my address for transactions'); break;
      case 'risk': sendMessage('check contract risk for the token contract'); break;
      case 'approvals': setShowApprovals(true); break;
      case 'gas': setShowGas(true); break;
      case 'chain': setShowChain(true); break;
      case 'notifications': setShowNotifications(true); break;
      case 'identity': sendMessage('Resolve UP ID alice.up'); break;
      case 'bridge': sendMessage('Bridge 0.1 ETH from Sepolia to GIWA'); break;
      case 'network': sendMessage('How is GIWA doing right now?'); break;
      case 'explorer': sendMessage('Explain address 0x1111111111111111111111111111111111111111'); break;
      case 'discover': sendMessage('What can I do on GIWA? Find me a DeFi app'); break;
      case 'batch': sendMessage('Prepare my GIWA wallet for DeFi: approve 100 USDC, deposit, stake'); break;
      default: sendMessage(toolName);
    }
  }, [isViewOnly, addToast, addMessage, sendMessage]);

  const handleNewChat = useCallback(() => {
    setMessages([{
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      content: "New session started — fresh context. What would you like to do?",
      timestamp: Date.now(),
    }]);
    setSessionId(null);
    setPendingConfirm(null);
    setErrorInfo(null);
    addToast('success', 'New chat started');
  }, [addToast]);

  // Keep palette / sidebar shortcuts
  useKeyboardShortcuts({
    onFocusInput: () => {
      const el = document.querySelector('.input-bar textarea') as HTMLTextAreaElement | null;
      el?.focus();
    },
    onOpenPalette: () => setPaletteOpen(true),
    onNewChat: handleNewChat,
    onToggleSidebar: () => setSidebarOpen(o => !o),
  });

  const sessions = sessionId
    ? [{ id: sessionId, title: 'Current Session', time: 'now' }]
    : [];

  const tokens = wallet.connected && wallet.balance
    ? [{ symbol: 'GIWA', name: 'GIWA', amount: wallet.balance, usd: `≈ $${(parseFloat(wallet.balance) * 0.2).toFixed(2)}`, change: '+0.0%', up: true }]
    : [];

  const showEmpty = messages.length <= 1 && !loading && !pendingConfirm;
  // Filter out welcome when showing EmptyState to avoid duplication — but keep it for chat history
  const visibleMessages = messages;

  return (
    <div className="chat-shell">
      <TopBar
        address={wallet.address}
        chainId={wallet.chainId}
        balance={wallet.balance}
        connected={wallet.connected}
        provider={wallet.provider}
        connecting={wallet.connecting}
        isViewOnly={isViewOnly}
        onConnect={() => setShowWalletModal(true)}
        onDisconnect={wallet.disconnect}
        onSwitchChain={wallet.switchChain}
        onOpenWatch={() => setShowWatch(true)}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <div className="chat-body">
        <Sidebar
          sessions={sessions}
          activeSessionId={sessionId || undefined}
          onSelectSession={() => {}}
          onNewChat={handleNewChat}
          portfolio={{
            total: wallet.balance || '0.00',
            usd: `≈ $${((parseFloat(wallet.balance || '0')) * 0.2).toFixed(2)}`,
          }}
          onToolClick={handleToolClick}
          viewOnly={isViewOnly}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="chat-main" role="log" aria-live="polite" aria-label="Chat messages">
          <div className="message-list">
            {showEmpty ? (
              <EmptyState
                walletConnected={wallet.connected}
                onConnect={() => setShowWalletModal(true)}
                onPrompt={sendMessage}
              />
            ) : (
              <>
                {visibleMessages.map((msg) => {
                  if (msg.role === 'tool') {
                    const data = (msg as any).toolData;
                    const card = (msg as any).cardType;
                    if (card === 'identity' && data) {
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <IdentityCard
                            upId={data.up_id || data.identity || data.requested_up_id || 'unknown.up'}
                            address={data.address || data.owner || wallet.address || '0x…'}
                            isVerified={data.is_verified ?? true}
                            dojangIssued={data.dojang_issued ?? data.is_verified}
                            verifiedTokens={data.verified_tokens}
                            source={data.source}
                            onSend={(id) => sendMessage(`Send 0.01 GIWA to ${id}`)}
                            onVerify={(id) => sendMessage(`Verify Dojang for ${id}`)}
                          />
                        </div>
                      );
                    }
                    if (card === 'bridge' && data) {
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <BridgeCard
                            amount={String(data.amount || data.estimate?.amount || '0.1')}
                            token={data.token || data.estimate?.token || 'ETH'}
                            fromChain={data.from_chain || data.estimate?.from_chain || 'sepolia'}
                            toChain={data.to_chain || data.estimate?.to_chain || 'giwa sepolia'}
                            fee={data.estimated_fee || data.estimate?.estimated_fee}
                            time={data.bridge_time || data.estimate?.bridge_time || data.estimated_time || '~2.3 min'}
                            route={data.route || data.estimate?.route}
                            status={data.status === 'pending_confirmation' ? 'estimate' : (data.status as any) || 'estimate'}
                            elapsed={data.elapsed}
                            remaining={data.estimated_remaining}
                            confirmations={data.confirmations}
                            onConfirm={() => sendMessage(`Bridge ${data.amount || '0.1'} ${data.token || 'ETH'} from ${data.from_chain || 'sepolia'} to ${data.to_chain || 'giwa'}`)}
                            onCancel={() => addMessage('system', 'Bridge cancelled.')}
                            onStatus={() => data.tx_hash && sendMessage(`Bridge status for ${data.tx_hash}`)}
                          />
                        </div>
                      );
                    }
                    if (card === 'network' && data) {
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <NetworkPulse stats={data as any} onRefresh={() => sendMessage('How is GIWA doing right now?')} />
                        </div>
                      );
                    }
                    if ((card === 'explorer' || card === 'debug') && data) {
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <ExplorerCard type={card === 'debug' ? 'debug' : (data.tx_hash ? 'transaction' : 'address')} data={data} onFix={() => data.fix_action && sendMessage(`approve ${data.fix_action.amount || '100'} GIWA`)} />
                        </div>
                      );
                    }
                    if (card === 'discover' && data) {
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <DiscoverCard category={data.category || 'giwa'} apps={data.results || []} onSelect={(app) => sendMessage(`Explain contract ${app.address}`)} />
                        </div>
                      );
                    }
                    if (card === 'execution' && data) {
                      const steps = (data.steps as any[])?.map((s: any, i: number) => ({
                        tool: s.tool || s.name || `step ${i + 1}`,
                        args: s.args || s,
                        simulation: (data.simulations?.[i] as any) || 'passed',
                      })) || [];
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <ExecutionPlan steps={steps.length ? steps : [{ tool: 'approve', args: { token: 'USDC', amount: '100' }, simulation: 'passed' }, { tool: 'stake', args: { token: 'USDC', amount: '100' }, simulation: 'passed' }]} totalGas={data.total_gas_estimate || data.totalGas || '0.0021 GIWA'} allPassed={data.allPassed ?? true} risk={data.risk || 'LOW'} onExecute={() => handleConfirm(true)} onCancel={() => handleConfirm(false)} />
                        </div>
                      );
                    }
                    if (card === 'portfolio' && data) {
                      const addr = data.address || wallet.address || '0x…';
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <PortfolioCard
                            address={addr}
                            nativeBalance={data.nativeBalance || data.balance || '0.000000'}
                            nativeSymbol={data.nativeSymbol || 'GIWA'}
                            tokens={data.tokens || []}
                            totalValueUsd={data.totalValueUsd || '0.00'}
                            insights={data.insights || []}
                            onAction={(p) => sendMessage(p)}
                          />
                        </div>
                      );
                    }
                    if (card === 'watch' && data) {
                      const watches = Array.isArray(data.watches) ? data.watches : data.id ? [data] : [];
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <WatchCard watches={watches} address={data.address || wallet.address || '0x…'} onAdd={() => sendMessage(`Watch ${wallet.address || 'my wallet'} for transactions`)} />
                        </div>
                      );
                    }
                    if (card === 'gas' && data) {
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <div className="sim-card" style={{ borderLeft: '3px solid #F59E0B' }}>
                            <div className="sim-header">
                              <div className="sim-header-left">
                                <div className="sim-header-icon" style={{ background: '#F59E0B' }}>⛽</div>
                                <div>
                                  <div className="sim-header-title">GIWA Gas Intelligence</div>
                                  <div className="sim-header-subtitle">{data.suggestion ? `Recommended: ${data.suggestion}` : 'Live'}</div>
                                </div>
                              </div>
                              <div className="sim-status sim-status-success"><span className="sim-status-dot" /> {data.chainId || 91342}</div>
                            </div>
                            <div className="sim-cost-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                              {['slow','standard','fast'].map(tier => data[tier] && (
                                <div key={tier} className="sim-cost-item" style={{ border: data.suggestion===tier ? '1px solid #F59E0B' : undefined, background: data.suggestion===tier ? '#fffbeb' : undefined, borderRadius: 8, padding: 8 }}>
                                  <span className="sim-cost-label">{tier}</span>
                                  <span className="sim-cost-value">{data[tier].gwei} gwei</span>
                                  <span className="sim-cost-sub">{tier==='slow'?'~4s':tier==='standard'?'~2s':'~1s'}</span>
                                </div>
                              ))}
                            </div>
                            {data.reason && <div className="sim-security"><span className="sim-security-icon">💡</span><span className="sim-security-text">{data.reason}</span></div>}
                          </div>
                        </div>
                      );
                    }
                    if (card === 'wallet' && data) {
                      const w = data.wallets ? data.wallets[0] || data : data;
                      const list = data.wallets || (w.address ? [w] : []);
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(list.length ? list : [w]).slice(0, 2).map((walletData: any) => (
                            <SmartWalletCard key={walletData.address} wallet={walletData} onAddContact={() => sendMessage(`Create my GIWA wallet`)} />
                          ))}
                        </div>
                      );
                    }
                    if ((card === 'recent' || card === 'tx' || card === 'block' || card === 'allowance') && data) {
                      return (
                        <div key={msg.id} style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                          <div className="sim-card" style={{ borderLeft: '3px solid #1C1917' }}>
                            <div className="sim-header">
                              <div className="sim-header-title" style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{msg.toolName}</div>
                            </div>
                            <pre style={{ fontSize: 11, background: 'var(--chat-surface)', border: '1px solid var(--chat-border-soft)', borderRadius: 8, padding: 10, overflow: 'auto', maxHeight: 240 }}>{JSON.stringify(data, null, 2)}</pre>
                            <div className="sim-security"><span className="sim-security-icon">🔍</span><span className="sim-security-text">Live from sepolia-explorer.giwa.io + sepolia-rpc.giwa.io</span></div>
                          </div>
                        </div>
                      );
                    }
                    return <ToolCall key={msg.id} name={msg.toolName || ''} status={msg.toolStatus || 'running'} />;
                  }
                  return (
                    <ChatMessage
                      key={msg.id}
                      role={msg.role as 'user' | 'assistant' | 'system'}
                      content={msg.content}
                      timestamp={msg.timestamp}
                      onRetry={msg.role === 'assistant' ? () => sendMessage(messages.find(m => m.role === 'user')?.content || 'retry') : undefined}
                    />
                  );
                })}

                {pendingConfirm && (
                  <div style={{ maxWidth: 520, width: '100%', alignSelf: 'flex-start' }}>
                    {(() => {
                      const s: any = pendingConfirm.summary;
                      const action = String(s.action || '').toLowerCase();
                      if (action.includes('bridge')) {
                        return (
                          <BridgeCard
                            amount={String(s.amount || '0.1')}
                            token={String(s.token || 'ETH')}
                            fromChain={String(s.from_chain || 'sepolia')}
                            toChain={String(s.to_chain || 'giwa sepolia')}
                            fee={String(s.estimated_fee || '0.00042 ETH')}
                            time="~2.3 min"
                            route="OP Stack Standard Bridge via app.giwa.zone"
                            status="estimate"
                            onConfirm={() => handleConfirm(true)}
                            onCancel={() => handleConfirm(false)}
                          />
                        );
                      }
                      if (action.includes('create_up') || action.includes('up_id')) {
                        return (
                          <IdentityCard
                            upId={String(s.requested_up_id || s.up_id || 'alice.up')}
                            address={wallet.address || '0x…'}
                            isVerified={false}
                            dojangIssued={false}
                            verifiedTokens={0}
                            source="GIWA Playground · will be minted"
                            onSend={() => handleConfirm(true)}
                            onVerify={() => handleConfirm(false)}
                          />
                        );
                      }
                      if (action.includes('batch')) {
                        const steps: any[] = (s.steps as any[]) || [{ tool: 'approve', args: { token: 'USDC', amount: '100' } }, { tool: 'deposit', args: { amount: '100 USDC' } }, { tool: 'stake', args: { amount: '50 USDC' } }];
                        return (
                          <ExecutionPlan
                            steps={steps.map((st: any) => ({ tool: st.tool || st.name || 'step', args: st.args || st, simulation: 'passed' }))}
                            totalGas={String(s.total_gas_estimate || '0.0021 GIWA')}
                            allPassed={true}
                            risk="LOW"
                            onExecute={() => handleConfirm(true)}
                            onCancel={() => handleConfirm(false)}
                          />
                        );
                      }
                      if (action.includes('smart_wallet') || action.includes('create_smart')) {
                        return (
                          <SmartWalletCard
                            wallet={{
                              address: String(s.address || '0x…'),
                              owner: wallet.address || '0x…',
                              chainId: 91342,
                              isDeployed: true,
                              spendingLimit: '1000 GIWA / day',
                              sessionPermissions: [{ tool: 'transfer_token', limit: '100 GIWA', expiry: Math.floor(Date.now() / 1000) + 86400 }],
                              recoveryAddresses: [wallet.address || '0x…'],
                            }}
                            onAddContact={() => handleConfirm(true)}
                          />
                        );
                      }
                      return (
                        <TxSimulationCard
                          summary={pendingConfirm.summary}
                          simulation={{
                            status: 'success',
                            gas_estimate: (pendingConfirm.summary.gas_estimate as string) || '~0.001 GIWA',
                            gas_cost_usd: '≈ $0.0002',
                            output_amount: (pendingConfirm.summary.amount as string) || undefined,
                            output_token: (pendingConfirm.summary.token as string) || undefined,
                            price_impact: '<0.01%',
                            price_impact_level: 'low',
                            slippage: '0.5%',
                          }}
                          onConfirm={() => handleConfirm(true)}
                          onCancel={() => handleConfirm(false)}
                        />
                      );
                    })()}
                  </div>
                )}

                {loading && <AgentThinking message="Blockmind is thinking…" sublabel={wallet.connected ? 'Parsing intent • Simulating' : 'Analyzing request'} />}
              </>
            )}

            <div ref={chatEndRef} />
          </div>

          <InputBar
            onSend={sendMessage}
            loading={loading}
            walletAddress={wallet.address || undefined}
            onOpenPalette={() => setPaletteOpen(true)}
          />
        </main>

        <ContextPanel
          walletAddress={wallet.address || undefined}
          balance={wallet.balance}
          tokens={tokens}
          txHistory={txHistory}
          onToolClick={handleToolClick}
          viewOnly={isViewOnly}
          onOpenWatch={() => setShowWatch(true)}
        />
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onToolClick={handleToolClick}
        onNewChat={handleNewChat}
      />

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={wallet.connect}
        connecting={wallet.connecting}
        blockmindInstalled={wallet.blockmindInstalled}
      />

      <TransferModal
        open={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSubmit={sendMessage}
        walletAddress={wallet.address || ''}
      />

      <SwapModal
        open={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        onSubmit={sendMessage}
        walletAddress={wallet.address || ''}
      />

      {showApprovals && wallet.address && (
        <div className="modal-overlay" onClick={() => setShowApprovals(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <TokenApprovalsManager
              walletAddress={wallet.address}
              chainId={wallet.chainId || 91342}
              onClose={() => setShowApprovals(false)}
            />
          </div>
        </div>
      )}

      {showGas && (
        <div className="modal-overlay" onClick={() => setShowGas(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <GasOptimizer onDismiss={() => setShowGas(false)} />
          </div>
        </div>
      )}

      {showChain && (
        <div className="modal-overlay" onClick={() => setShowChain(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <MultiStepChaining
              onComplete={(steps) => {
                setShowChain(false);
                addToast('success', 'Steps Completed', `${steps.length} actions executed`);
              }}
              onCancel={() => setShowChain(false)}
            />
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <NotificationCenter onClose={() => setShowNotifications(false)} />
          </div>
        </div>
      )}

      {errorInfo && (
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', zIndex: 150, width: 'min(420px, calc(100% - 32px))' }}>
          <ErrorRecoveryCard
            error={errorInfo}
            onRetry={() => { setErrorInfo(null); if (errorInfo.message) sendMessage(errorInfo.message); }}
            onDismiss={() => setErrorInfo(null)}
          />
        </div>
      )}

      <ViewOnlyPanel
        open={showWatch && !!wallet.address}
        onClose={() => setShowWatch(false)}
        address={wallet.address}
        isViewOnly={isViewOnly}
        chainId={wallet.chainId || 91342}
        watchlist={watchlist}
        recents={recents}
        onWatchlistChange={refreshWatchlist}
        onSwitchAddress={(addr) => {
          void wallet.connect('manual', addr);
          addRecentAddress(addr);
          setRecents(getRecentAddresses());
        }}
        onExplainTx={(hash) => {
          setShowWatch(false);
          sendMessage(`Explain transaction ${hash}`);
        }}
        onOpenConnect={() => {
          setShowWatch(false);
          setShowWalletModal(true);
        }}
      />

      <div className="toast-container">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            type={t.type}
            title={t.title}
            message={t.message}
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <ChatApp />
    </WalletProvider>
  );
}
