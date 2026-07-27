import { useState, useRef, useEffect, useCallback } from 'react';
import { WalletProvider, useWallet } from './wallet';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ContextPanel from './components/ContextPanel';
import ChatMessage from './components/ChatMessage';
import TxSimulationCard from './components/TxSimulationCard';
import OnboardingWizard from './components/OnboardingWizard';
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

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
  toolStatus?: 'running' | 'success' | 'error';
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

function ChatApp() {
  const wallet = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [showGas, setShowGas] = useState(false);
  const [showChain, setShowChain] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ code: string; message: string; suggestion?: string } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  // Set chat-mode class on body for fixed layout
  useEffect(() => {
    document.body.classList.add('chat-mode');
    return () => document.body.classList.remove('chat-mode');
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: wallet.connected
        ? `Hi! I'm **Blockmind**, your AI blockchain assistant.\n\nI can see that your wallet **${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}** is connected to the **GIWA Sepolia** network.\n\nHere's what I can help you with:\n\nI. **Check Balances**\n• Check your wallet balance by typing: \`check my GIWA balance\`\n\nII. **Send Tokens**\n• Click **Transfer** or type: \`send 0.001 GIWA to 0x...\`\n\nIII. **Swap Tokens**\n• Click **Swap** or type: \`swap 1 ETH to USDC\`\n\nIV. **Monitor Activity**\n• Monitor your wallet by typing: \`monitor my address\`\n\nV. **Check Contract Risk**\n• Analyze a smart contract by typing: \`check contract risk for 0x...\`\n\nWhat would you like to do?`
        : `Hi! I'm **Blockmind**, your AI blockchain assistant.\n\nI can help you check balances, send tokens, swap, and more — all using natural language.\n\n**Connect your wallet** to get started!`,
    }]);
  }, [wallet.connected, wallet.address]);

  // Handle pending prompt from templates page
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
      { id: `${Date.now()}_${Math.random()}`, role, content, ...extra },
    ]);
  }, []);

  const addToast = useCallback((type: ToastItem['type'], title: string, message?: string) => {
    const id = `${Date.now()}`;
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

  // Load persisted TX history on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('blockmind_tx_history');
      if (raw) setTxHistory(JSON.parse(raw));
    } catch {}
  }, []);

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
          addMessage('tool', `Called ${tool.tool}`, {
            toolName: tool.tool,
            toolStatus: 'success',
          });
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

    if (approved) {
      addMessage('system', 'Transaction confirmed. Signing with wallet...');

      try {
        const txParams = {
          from: wallet.address,
          to: pendingConfirm.summary.to as string || '0x0000000000000000000000000000000000000000',
          value: '0x0',
          chainId: `0x${(wallet.chainId || 91342).toString(16)}`,
          data: '0x',
        };

        if (wallet.provider === 'metamask' && (window as any).ethereum) {
          const txHash = await (window as any).ethereum.request({
            method: 'eth_sendTransaction',
            params: [txParams],
          });

          addMessage('assistant', `Transaction submitted! Hash: \`${txHash}\`\n\n[View on Explorer](https://sepolia-explorer.giwa.io/tx/${txHash})`);
          addToast('success', 'Transaction Sent', `TX: ${txHash.slice(0, 10)}...`);

          addTxRecord({
            hash: txHash,
            from: wallet.address || '',
            to: txParams.to,
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

          addMessage('system', 'Transaction confirmed (simulated — connect MetaMask for real signing).');
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
    switch (toolName) {
      case 'transfer':
        setShowTransferModal(true);
        break;
      case 'swap':
        setShowSwapModal(true);
        break;
      case 'balance':
        sendMessage('check my GIWA balance');
        break;
      case 'analyze':
        sendMessage('analyze my wallet activity and show all details');
        break;
      case 'monitor':
        sendMessage('monitor my address for transactions');
        break;
      case 'risk':
        sendMessage('check contract risk for the token contract');
        break;
      case 'approvals':
        setShowApprovals(true);
        break;
      case 'gas':
        setShowGas(true);
        break;
      case 'chain':
        setShowChain(true);
        break;
      case 'notifications':
        setShowNotifications(true);
        break;
      default:
        sendMessage(toolName);
    }
  }, [sendMessage]);

  const sessions = sessionId
    ? [{ id: sessionId, title: 'Current Session', time: 'now' }]
    : [];

  const tokens = wallet.connected && wallet.balance
    ? [{ symbol: 'GIWA', name: 'GIWA', amount: wallet.balance, usd: `≈ $${(parseFloat(wallet.balance) * 0.2).toFixed(2)}`, change: '+0.0%', up: true }]
    : [];

  return (
    <div className="chat-shell">
      <TopBar
        address={wallet.address}
        chainId={wallet.chainId}
        balance={wallet.balance}
        connected={wallet.connected}
        provider={wallet.provider}
        connecting={wallet.connecting}
        onConnect={() => setShowWalletModal(true)}
        onDisconnect={wallet.disconnect}
        onSwitchChain={wallet.switchChain}
      />

      <div className="chat-body">
        <Sidebar
          sessions={sessions}
          activeSessionId={sessionId || undefined}
          onSelectSession={() => {}}
          onNewChat={() => {
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: "New session started. What would you like to do?",
            }]);
            setSessionId(null);
            setPendingConfirm(null);
          }}
          portfolio={{
            total: wallet.balance || '0.00',
            usd: `≈ $${((parseFloat(wallet.balance || '0')) * 0.2).toFixed(2)}`,
          }}
          onToolClick={handleToolClick}
        />

        <main className="chat-main" role="log" aria-live="polite" aria-label="Chat messages">
          <div className="message-list">
            {!wallet.connected && (
              <div className="card card-amber" style={{
                maxWidth: 420,
                alignSelf: 'center',
                textAlign: 'center',
                padding: 'var(--space-8)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 'var(--space-4)' }}>🔗</div>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-2)',
                }}>
                  Connect Your Wallet
                </h3>
                <p style={{
                  fontSize: 14,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-4)',
                }}>
                  Connect your wallet to check balances, send tokens, and interact with GIWA.
                </p>
                <button className="btn btn-primary" onClick={() => setShowWalletModal(true)}>
                  Connect Wallet →
                </button>
              </div>
            )}

            {wallet.connected && messages.length <= 1 && (
              <OnboardingWizard
                onSendPrompt={sendMessage}
                walletConnected={wallet.connected}
                onConnectWallet={() => setShowWalletModal(true)}
              />
            )}

            {messages.map((msg) => {
              if (msg.role === 'tool') {
                return <ToolCall key={msg.id} name={msg.toolName || ''} status={msg.toolStatus || 'running'} />;
              }
              return <ChatMessage key={msg.id} role={msg.role} content={msg.content} />;
            })}

            {pendingConfirm && (
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
            )}

            {loading && <AgentThinking />}

            <div ref={chatEndRef} />
          </div>

          <InputBar
            onSend={sendMessage}
            loading={loading}
            walletAddress={wallet.address || undefined}
          />
        </main>

        <ContextPanel
          walletAddress={wallet.address || undefined}
          balance={wallet.balance}
          tokens={tokens}
          txHistory={txHistory}
          onToolClick={handleToolClick}
        />
      </div>

      <WalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={wallet.connect}
        connecting={wallet.connecting}
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
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 150 }}>
          <ErrorRecoveryCard
            error={errorInfo}
            onRetry={() => { setErrorInfo(null); sendMessage(errorInfo.message); }}
            onDismiss={() => setErrorInfo(null)}
          />
        </div>
      )}

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
