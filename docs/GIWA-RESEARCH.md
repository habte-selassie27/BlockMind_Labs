# GIWA Chain Research — P1-03

**Date:** 2025-07-20  
**Status:** Complete

---

## 1. Chain Overview

| Property | Value |
|---|---|
| **Full Name** | Global Infrastructure for Web3 Access |
| **Operator** | Dunamu (parent of Upbit, South Korea's largest exchange) |
| **Type** | Ethereum Layer 2 (Optimistic Rollup) |
| **Stack** | OP Stack (Optimism) |
| **EVM Compatible** | Yes — full Solidity compatibility |
| **Block Time** | ~1 second |
| **Native Currency** | ETH (18 decimals) |
| **Funding** | $1.22B raised (Dunamu) |

---

## 2. Network Parameters

### Testnet (Sepolia)

| Property | Value |
|---|---|
| **Network Name** | GIWA Sepolia |
| **Chain ID** | `91342` |
| **Network ID** | `91342` |
| **RPC URL** | `https://sepolia-rpc.giwa.io` |
| **Alternative RPC** | `https://giwa-sepolia-testnet.api.pocket.network` (Pocket Network) |
| **Block Explorer** | `https://sepolia-explorer.giwa.io` (Blockscout) |
| **Faucet** | `https://faucet.giwa.io` |
| **Currency Symbol** | ETH |
| **Status** | Active |

### Mainnet

| Property | Value |
|---|---|
| **Chain ID** | `9134` |
| **Network ID** | `9134` |
| **RPC URL** | `https://rpc.giwa.io` (placeholder — confirm with GIWA docs) |
| **Block Explorer** | `https://explorer.giwa.io` (placeholder — confirm) |
| **Currency Symbol** | ETH |
| **Status** | Private mainnet (whitelist-based, expanding) |

> **Note:** Mainnet RPC and explorer URLs should be verified against the official GIWA documentation at https://docs.giwa.io before production deployment.

---

## 3. RPC Providers

| Provider | Endpoint | Type | Notes |
|---|---|---|---|
| GIWA.io (official) | `https://sepolia-rpc.giwa.io` | Public (rate-limited) | Free, testnet only |
| Pocket Network | `https://giwa-sepolia-testnet.api.pocket.network` | Public | Decentralized RPC |
| Nodit | Enterprise RPC | Paid | $25 free credit, supports GIWA |

**Recommendation for Blockmind:**
- Development: Use official GIWA public RPC (free, rate-limited)
- Production: Use Nodit or run own GIWA node for reliability
- Fallback: Pocket Network as secondary RPC

---

## 4. Block Explorer

**GIWA Sepolia Explorer:** https://sepolia-explorer.giwa.io

- Built on **Blockscout** (open-source)
- Supports: blocks, transactions, smart contracts, tokens, addresses
- API available for programmatic access
- Real-time block and transaction tracking

**Key Stats (as of research date):**
- Total blocks: ~15.9M
- Total transactions: ~82.2M
- Total addresses: ~21.7M
- Average block time: 1.0s
- Gas price: < 0.1 Gwei

---

## 5. Developer Resources

| Resource | URL |
|---|---|
| Documentation | https://docs.giwa.io |
| LLM-friendly docs | https://docs.giwa.io/llms.txt |
| GitHub (node) | https://github.com/giwa-io/node |
| GitHub (org) | https://github.com/giwa-io |
| Twitter | https://x.com/GIWA_by_Upbit |
| GASOK Program | https://giwa.io/gasok |
| Faucet | https://faucet.giwa.io |

### Node Operation

GIWA provides a reference node implementation:
- Repository: https://github.com/giwa-io/node
- Hardware requirements: 4+ CPU cores, 8+ GB RAM, 500GB+ NVMe disk
- Requires Ethereum L1 RPC for L2 operation
- Sync time can be significant for full nodes

### Smart Contract Development

- Full EVM/Solidity compatibility — existing Ethereum tooling works
- Hardhat, Foundry, Remix all compatible
- Standard ERC-20, ERC-721, ERC-1155 contracts supported
- OP Stack-specific predeploys available

---

## 6. GIWA Ecosystem

### Core Products

| Product | Description |
|---|---|
| **GIWA Chain** | L2 blockchain (OP Stack) |
| **GIWA Wallet** | User-friendly wallet (browser extension/mobile) |
| **Dojang** | Off-chain data verification recorded on-chain |
| **Bojagi** | Privacy technology for financial institutions (encrypted asset movements) |
| **UP.ID** | Web3 naming service (nicknames instead of addresses) |

### GASOK Accelerator Program

- **Purpose:** Support developers building on GIWA
- **Tracks:** DeFi/RWA, Consumer/Social, GIWA-Native, AI/Web3, Mass Adoption
- **Funding:** Up to $100,000 per team (milestone-based)
- **Benefits:** Free infrastructure, technical consulting, KBW Demo Day pitch to VCs
- **Status:** Applications open through July 2026

### Partnerships

- **Optimism:** MOU signed for sequencer operations and infrastructure collaboration
- **Upbit:** Deep integration with exchange liquidity and user base
- **Nodit:** RPC and data API provider

---

## 7. Integration Considerations for Blockmind

### What Works in Our Favor

1. **EVM Compatible** — viem works out of the box, no custom adapter needed initially
2. **OP Stack** — Standard OP Stack patterns apply, familiar tooling
3. **Fast blocks (1s)** — Near real-time UX for agent transactions
4. **Low gas** — Sub-cent transaction costs
5. **GASOK program** — Potential funding and ecosystem support
6. **Active ecosystem** — Growing developer base, official docs, Blockscout explorer

### What We Need to Confirm

1. **Mainnet RPC endpoints** — Production URLs not yet publicly documented
2. **Chain ID finalization** — `9134` confirmed on chainlist, verify with GIWA team
3. **WebSocket support** — Confirm WSS endpoint availability for real-time events
4. **Rate limits** — Public RPC rate limits for production usage
5. **Gas token** — ETH is native; confirm if GIWA token exists or is planned
6. **Wallet plugin API** — GIWA Wallet extension API documentation

### GIWA Adapter Spec (Draft)

```typescript
class GIWAAdapter implements ChainAdapter {
  readonly chainId = 9134;          // mainnet
  readonly chainIdTestnet = 91342;  // sepolia
  readonly nativeCurrency = 'ETH';
  readonly decimals = 18;
  
  readonly rpcUrls = {
    mainnet: ['https://rpc.giwa.io'],
    testnet: ['https://sepolia-rpc.giwa.io'],
  };
  
  readonly explorerUrls = {
    mainnet: 'https://explorer.giwa.io',
    testnet: 'https://sepolia-explorer.giwa.io',
  };

  // OP Stack specific
  readonly blockTime = 1_000; // 1 second in ms
  readonly consensus = 'optimistic-rollup';
  readonly l1Chain = 'ethereum'; // depends on Ethereum for settlement
}
```

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Mainnet not fully launched | Use testnet for development; monitor mainnet announcements |
| Single sequencer (centralization) | Acceptable for MVP; GIWA working toward decentralization |
| RPC rate limits on public endpoints | Use paid providers (Nodit) for production |
| New ecosystem — limited tooling | OP Stack tooling is mature; GIWA provides Blockscout |
| Upbit regulatory exposure | Dunamu operates under Korean regulations; compliance is a strength |

---

## 9. Action Items

- [ ] Confirm mainnet RPC URL with GIWA team
- [ ] Set up GIWA Sepolia testnet in local dev environment
- [ ] Deploy test contract to GIWA Sepolia
- [ ] Apply for GASOK accelerator program
- [ ] Connect with GIWA developer relations
- [ ] Monitor mainnet launch timeline

---

*This research is based on publicly available information as of 2025-07-20. GIWA is an active project — verify endpoints and parameters before production deployment.*
