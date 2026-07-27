interface Props {
  address: string;
}

export default function WalletBanner({ address }: Props) {
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="wallet-banner">
      <span>Connected: <span className="wallet-address">{short}</span></span>
      <span style={{ color: 'var(--success)' }}>GIWA Testnet</span>
    </div>
  );
}
