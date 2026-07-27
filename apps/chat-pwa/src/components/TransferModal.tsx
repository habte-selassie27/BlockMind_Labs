import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  walletAddress: string;
}

const TOKENS = ['GIWA', 'ETH', 'USDC', 'USDT', 'DAI', 'WBTC'];

export default function TransferModal({ open, onClose, onSubmit, walletAddress }: Props) {
  const [token, setToken] = useState('GIWA');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setError('Enter a valid recipient address (0x...)');
      return;
    }

    const msg = `send ${amount} ${token} to ${recipient}`;
    onSubmit(msg);
    setAmount('');
    setRecipient('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Transfer Tokens</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="form-label">From Wallet</label>
          <div className="form-address">{walletAddress}</div>

          <label className="form-label" style={{ marginTop: 'var(--space-4)' }}>Token</label>
          <select
            className="form-select"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          >
            {TOKENS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label className="form-label" style={{ marginTop: 'var(--space-4)' }}>Amount</label>
          <input
            className="form-input"
            type="number"
            step="any"
            min="0"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <label className="form-label" style={{ marginTop: 'var(--space-4)' }}>Recipient Address</label>
          <input
            className="form-input"
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Review Transaction →
          </button>
        </div>
      </div>
    </div>
  );
}
