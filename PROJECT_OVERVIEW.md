# BlockMind Labs — Complete Project Overview

> **Use this document as context when prompting Claude, Codex, GPT, or any AI tool
> for future feature development, expansion planning, or user traction strategy.**

---

## 1. What BlockMind Is

BlockMind Labs is an **AI-native Web3 infrastructure platform**. It lets users interact
with blockchain networks using **natural language** instead of manually managing wallets,
gas fees, contract addresses, and transaction flows.

**One-liner:** "Chat with an AI agent that executes blockchain actions for you."

**Example user flow:**
```
User types:  "Swap 100 GIWA for USDC"
AI agent:    Parses intent → builds transaction → simulates → shows summary
User:        Clicks "Confirm"
Agent:       Signs via wallet → submits to GIWA chain → returns tx hash + explorer link
```

**The problem it solves:** Blockchain was designed for everyone but built for experts.
MetaMask popups, seed phrases, chain switching, gas estimation — 90% of mainstream users
abandon before their first transaction. BlockMind removes this complexity.

---

## 2. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Fast dev, modern DX, PWA support |
| Routing | React Router v6 | `/` landing, `/chat` app, `/docs/*` docs, `/about` etc. |
| Backend Gateway | Node.js + Fastify (port 3000) | Fast HTTP, proxy to services |
| Intent Parser | Python + FastAPI (port 8001) | NLP processing, LLM calls |
| Agent Runtime | Node.js + Express + LangChain (port 8002) | Tool calling, reasoning loop |
| Web3 Middleware | Node.js + Fastify + viem (port 8003) | Chain interaction, TX building |
| Wallet Signer | Rust + Axum (port 8004) | Key isolation, secure signing |
| Memory Service | Python + FastAPI (port 8005) | Agent memory, context persistence |
| LLM Provider | Groq API (free tier) | llama-3.3-70b-versatile model |
| Primary Chain | GIWA L2 (Chain ID 9134 mainnet, 91342 Sepolia) | ~1s blocks, low fees, EVM compatible |
| Package Manager | pnpm (Node), uv (Python), cargo (Rust) | Monorepo with Turborepo |
| Deployment Target | Vercel (frontend), Docker (services) | Production-ready |

**Key API Keys / Config:**
- Groq: `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` (env: `GROQ_API_KEY`)
- GIWA Sepolia RPC: `https://sepolia-rpc.giwa.io`
- GIWA Explorer: `https://sepolia-explorer.giwa.io`
- Test wallet: `0x04e0353B7218b66D6803725ce7342E6e1225DB1b`

---

## 3. What's Built and Working

### 3.1 Chat Application (`/chat`)
- **Natural language input** — user types plain English
- **AI agent reasoning** — Groq LLM parses intent, selects tools, plans execution
- **Tool calling system** — 8 built-in tools:
  - `read_balance` — get token balance
  - `read_portfolio` — full portfolio with USD values
  - `build_transaction` — create TX from natural language
  - `simulate_transaction` — dry-run before execution
  - `submit_transaction` — send signed TX to chain
  - `swap_tokens` — token swap via DEX
  - `check_contract_risk` — Scam Shield analysis
  - `monitor_address` — set up address monitoring
- **Wallet connection** — MetaMask (window.ethereum) + View-Only mode
- **Transaction confirmation flow** — Shows typed TX summary, user clicks "Sign & Send"
- **Real wallet signing** — `eth_sendTransaction` via MetaMask
- **Transaction history** — Records confirmed TXs with explorer links
- **Transfer modal** — Form with token dropdown, amount, recipient
- **Swap modal** — Form with from/to tokens, swap button
- **Portfolio sidebar** — Balance display, tool cards, history tab
- **Markdown rendering** — Bold, code blocks, line breaks in agent responses

### 3.2 Landing Page (`/`)
- Hero section with animated network graphic
- Problem section (5 pain point cards)
- Solution section (3 pillar cards)
- Technology stack section (5 layers)
- Developer SDK section (split layout with code window)
- Market opportunity (4 metrics + 3 business model cards)
- Roadmap (timeline + 4 phase cards)
- Team & Ask section (founder profile + ecosystem ask)
- Full footer (4-column layout)

### 3.3 Documentation (`/docs/*`)
- **Professional docs layout** — sticky top nav, left sidebar, right TOC, mobile hamburger
- **Getting Started** — Overview, Installation, Auth, Quick Start, First Agent
- **Core Concepts** — Intent Engine, Agent Runtime, Tool System, Memory, Security
- **Guides** — Wallet Integration, Multi-Chain, DeFi Workflows
- **Code blocks** — Dark themed, copy button, syntax highlighting
- **Code tabs** — TypeScript / Python / cURL switching
- **Callout boxes** — Info, Warning, Success, Danger variants

### 3.4 API Reference (`/docs/api`)
- All 8 endpoints documented with full specs
- Method badges (GET/POST), auth indicators
- Request/response field tables
- JSON examples for request and response
- Error codes table (400, 401, 403, 404, 429, 500)
- SDK install cards

### 3.5 SDK Reference (`/docs/sdk`)
- Installation (npm/yarn/pnpm/Python/Rust)
- Configuration options table
- Quick start code examples
- BlockmindClient API reference
- Sessions, Execution, Streaming docs
- DeFi and NFT agent examples

### 3.6 Status Page (`/status`)
- Service status table with dot indicators
- Uptime percentages for all 7 services
- Incident history section

### 3.7 Corporate Pages
- **About** (`/about`) — Company story (Problem→Opportunity→Solution→Future), Mission/Vision/Purpose, 5 values, founder profile, stats bar
- **GIWA Partnership** (`/partnership/giwa`) — Architecture diagram (User→AI→Security→Wallet→GIWA), 4 benefits, 4-phase roadmap timeline
- **Blog** (`/blog`) — Category filters, featured article card, article grid
- **Contact** (`/contact`) — Direct channels, enterprise form (name, email, company, reason dropdown, message)

### 3.8 Design System
- **Claude × ElevenLabs hybrid** palette:
  - Light: `#FAF9F5` background, `#C15F3C` terracotta accent, `#141413` text
  - Dark: `#0A0A09` background, `#D97A5C` lighter terracotta, `#FAF9F5` text
- **Typography:** Georgia (serif headings), Inter (sans body), JetBrains Mono (code)
- **Components:** Pill buttons (9999px), 12px card radius, warm shadows at <5% opacity
- **CSS files:** tokens.css, components.css, layout.css, landing.css, pages.css, docs.css, corp.css

---

## 4. Architecture & Service Map

```
User (Browser)
    │
    ├── React Frontend (Vite, port 5173)
    │   └── proxy /api → API Gateway
    │
    ├── API Gateway (Fastify, port 3000)
    │   ├── /api/chat/*     → Agent Runtime (8002)
    │   ├── /api/intent/*   → Intent Service (8001)
    │   ├── /api/web3/*     → Web3 Middleware (8003)
    │   └── /api/memory/*   → Memory Service (8005)
    │
    ├── Intent Service (FastAPI, port 8001)
    │   ├── NLP parsing (Groq LLM)
    │   ├── Slot extraction
    │   └── Calls: Memory Service
    │
    ├── Agent Runtime (Express + LangChain, port 8002)
    │   ├── Reasoning loop
    │   ├── Tool calling
    │   ├── LLM calls (Groq)
    │   └── Calls: Intent Service, Memory Service, Web3 Middleware
    │
    ├── Web3 Middleware (Fastify + viem, port 8003)
    │   ├── TX building
    │   ├── Simulation
    │   ├── Chain interaction (GIWA RPC)
    │   └── Calls: Wallet Signer
    │
    ├── Wallet Signer (Axum/Rust, port 8004)
    │   ├── Key storage (encrypted)
    │   ├── TX signing
    │   └── Outbound: GIWA RPC only
    │
    ├── Memory Service (FastAPI, port 8005)
    │   ├── Redis (session cache)
    │   ├── PostgreSQL (persistent data)
    │   └── Weaviate (vector memory)
    │
    └── Frontend (React)
        ├── / → Landing Page
        ├── /chat → Chat App (main product)
        ├── /docs/* → Documentation
        ├── /about → About
        ├── /partnership/giwa → GIWA Partnership
        ├── /blog → Blog
        ├── /contact → Contact
        └── /status → System Status
```

---

## 5. Safety Rules (Non-Negotiable)

These are enforced at the infrastructure level and cannot be overridden:

1. **No TX without simulation** — every state-changing action must dry-run first
2. **No TX without confirmation** — user must see summary and click confirm
3. **No MAX_UINT256 approvals** — exact amounts only unless `allow_unlimited: true`
4. **Scam Shield** — check new contract addresses before interaction
5. **Key isolation** — private keys only in wallet-signer, nowhere else
6. **Parameterized SQL** — no string interpolation from user input
7. **Injection detection** — NL input classified, flagged intents never executed

---

## 6. Business Model & Positioning

**Category:** AI Infrastructure for Web3

**Target Users:**
1. **Retail users** — want to interact with DeFi/NFTs without technical knowledge
2. **Developers** — want to embed AI agents into their dApps (SDK)
3. **Ecosystems** — chains like GIWA that want AI-powered UX layer

**Revenue Model (planned):**
- **Freemium API** — free tier with rate limits, paid tiers for volume
- **SDK licensing** — enterprise SDK with SLA
- **Ecosystem partnerships** — infrastructure fees from chain partners

**Competitive Positioning:**
- vs. **MetaMask** — MetaMask is a wallet; BlockMind is an agent that uses wallets
- vs. **1inch/Uniswap** — DEX aggregators; BlockMind wraps them with natural language
- vs. **Chainlink** — Oracle network; BlockMind is an execution layer
- vs. **OpenAI** — General AI; BlockMind is purpose-built for blockchain

---

## 7. User Personas

### Persona 1: "Curious User"
- Knows about crypto but intimidated by wallets/gas/contracts
- Wants to "buy some GIWA" without reading 10 guides
- **Onboarding:** Landing page → Chat → Natural language → First TX

### Persona 2: "DeFi Power User"
- Active trader, manages multiple positions
- Wants speed: "Swap 500 GIWA for USDC, 1% slippage, highest priority"
- **Value:** Faster than manual UI, gas optimization, multi-step chaining

### Persona 3: "Developer"
- Building a dApp on GIWA or Ethereum
- Wants to embed AI agent capabilities into their app
- **Onboarding:** Docs → SDK install → API key → First agent session

### Persona 4: "Ecosystem Partner"
- GIWA team or another L2
- Wants to offer AI-powered UX to their users
- **Onboarding:** Partnership page → Contact → Integration → Go-live

---

## 8. Roadmap — What to Build Next

### Phase 1: Core Product Polish (Next 2-4 weeks)
- [ ] Transaction simulation UI card (gas, output, price impact)
- [ ] Token approvals manager (view + revoke)
- [ ] Portfolio dashboard page (`/portfolio`)
- [ ] Gas estimation & optimization suggestions
- [ ] Multi-step transaction chaining
- [ ] Activity feed / notification center
- [ ] Error handling & retry UX in chat

### Phase 2: Retention Features (Month 2)
- [ ] Price alerts ("Alert me when GIWA hits $1.50")
- [ ] Recurring actions / DCA ("Buy 50 GIWA every Monday")
- [ ] Custom agent preferences ("Always use Uniswap, max 0.5% slippage")
- [ ] Transaction history page with filters
- [ ] Multi-wallet support

### Phase 3: Platform & Developer (Month 3)
- [ ] Agent templates marketplace
- [ ] Developer sandbox (online playground)
- [ ] Webhook / API callbacks
- [ ] Custom tool creation API
- [ ] Rate limiting dashboard

### Phase 4: Ecosystem Expansion (Month 4+)
- [ ] Cross-chain bridge agent
- [ ] NFT gallery & management
- [ ] DeFi yield finder
- [ ] Governance voting agent
- [ ] Fiat on-ramp integration
- [ ] GIWA ecosystem explorer

---

## 9. User Traction Strategy

### Acquisition Channels

1. **GIWA Ecosystem**
   - Get listed on GIWA ecosystem page
   - Build GIWA-exclusive features (fastest agent on the chain)
   - Partner with GIWA dApps for embedded AI

2. **Developer Community**
   - Publish SDK on npm with excellent docs
   - Create "Build your first AI agent in 5 minutes" tutorial
   - Open-source the SDK, keep the platform proprietary
   - Hackathon sponsorships on GIWA

3. **Content Marketing**
   - Blog posts: technical deep dives, security research
   - YouTube: "I built an AI agent that swaps tokens"
   - Twitter/X: daily tips, agent demos, ecosystem updates

4. **Product-Led Growth**
   - Free tier with generous limits
   - Share feature: "Share this agent session" link
   - Referral program: invite friends, get premium features

### Activation

- **First TX under 60 seconds** — from landing page to completed transaction
- **Guided onboarding** — first chat shows example commands
- **View-only mode** — try without connecting wallet (reduces friction)

### Retention

- **Transaction history** — users come back to review activity
- **Price alerts** — daily reason to open the app
- **Recurring actions** — weekly/monthly automated tasks
- **Portfolio tracking** — "Check my portfolio" is a daily habit
- **Custom preferences** — agent learns your style, hard to switch

### Revenue

- **Free:** 50 transactions/month, basic tools
- **Pro ($20/month):** Unlimited TX, advanced tools, priority execution
- **Enterprise:** Custom SLA, white-label SDK, dedicated support

---

## 10. How to Prompt AI Tools with This Context

### For Feature Development
```
I'm building BlockMind Labs — an AI-native Web3 infrastructure platform.

[PROJECT CONTEXT]
Stack: React 19, Node.js/Fastify gateway, Python/FastAPI intent service,
Node.js/LangChain agent runtime, Rust wallet-signer, GIWA L2 chain.
Frontend: Vite + React Router, port 5173. Proxy /api → gateway on port 3000.
LLM: Groq API with llama-3.3-70b-versatile.

[WHAT'S BUILT]
Chat app with 8 tool-calling functions (swap, transfer, balance, portfolio,
monitor, contract risk, build TX, simulate TX). Wallet connection (MetaMask
+ view-only). TX confirmation flow. Landing page, docs, blog, about, contact,
status pages.

[SAFETY RULES]
All TXs must simulate first. User confirmation required. No MAX_UINT256.
Scam Shield on new contracts. Keys only in wallet-signer.

[TASK]
Build [FEATURE NAME] that does [DESCRIPTION].
Follow the existing code patterns in [REFERENCE FILE].
```

### For Business Strategy
```
I'm the founder of BlockMind Labs, an AI agent infrastructure for Web3.
We're on GIWA L2 chain, have a working chat app with tool calling,
and a full documentation site.

[CONTEXT]
- 4 personas: retail users, DeFi power users, developers, ecosystem partners
- Revenue: freemium API + SDK licensing + partnership fees
- Competitors: MetaMask (wallet), 1inch (DEX), Chainlink (oracles)

[SITUATION]
[Describe your situation — launch, growth plateau, new market, etc.]

[SUGGEST]
Suggest [3 user traction strategies / partnership approaches / pricing models / etc.]
```

### For UI/UX Improvements
```
[DESIGN SYSTEM]
Claude × ElevenLabs hybrid: warm parchment #FAF9F5, terracotta #C15F3C,
Georgia serif headings, Inter sans body, JetBrains Mono code.
Pill buttons (9999px), 12px card radius, warm shadows <5% opacity.

[REFERENCE]
See apps/chat-pwa/src/docs.css for docs layout patterns.
See apps/chat-pwa/src/corp.css for enterprise page patterns.
See apps/chat-pwa/src/components.css for chat UI patterns.

[TASK]
Redesign [COMPONENT/PAGE] to improve [SPECIFIC ISSUE].
```

---

## 11. File Structure Reference

```
BlockMind_Labs/
├── apps/
│   ├── chat-pwa/                 # Frontend (React + Vite)
│   │   ├── src/
│   │   │   ├── main.tsx          # Entry, React Router, CSS imports
│   │   │   ├── App.tsx           # Chat application
│   │   │   ├── wallet.tsx        # WalletProvider context
│   │   │   ├── tokens.css        # Design tokens
│   │   │   ├── components.css    # Chat component styles
│   │   │   ├── layout.css        # Chat layout styles
│   │   │   ├── landing.css       # Landing page styles
│   │   │   ├── pages.css         # Sub-page styles
│   │   │   ├── docs.css          # Documentation styles
│   │   │   ├── corp.css          # Enterprise page styles
│   │   │   ├── components/
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   ├── TxConfirmCard.tsx
│   │   │   │   ├── TransferModal.tsx
│   │   │   │   ├── SwapModal.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── ContextPanel.tsx
│   │   │   │   └── docs/         # Docs components
│   │   │   │       ├── DocsLayout.tsx
│   │   │   │       ├── CodeBlock.tsx
│   │   │   │       ├── ApiEndpoint.tsx
│   │   │   │       ├── Callout.tsx
│   │   │   │       └── StatusBadge.tsx
│   │   │   └── pages/
│   │   │       ├── LandingPage.tsx
│   │   │       ├── Documentation.tsx
│   │   │       ├── ApiReference.tsx
│   │   │       ├── Sdk.tsx
│   │   │       ├── Status.tsx
│   │   │       ├── About.tsx
│   │   │       ├── GiwaPartnership.tsx
│   │   │       ├── Blog.tsx
│   │   │       └── Contact.tsx
│   │   └── vite.config.ts        # Proxy /api → 3000
│   ├── api-gateway/              # Fastify gateway (port 3000)
│   ├── intent-service/           # FastAPI intent parser (port 8001)
│   ├── agent-runtime/            # Express + LangChain agent (port 8002)
│   │   ├── src/agent.ts          # LLM calls (Groq), tool orchestration
│   │   ├── src/routes.ts         # Chat endpoints, wallet injection
│   │   ├── src/tool-handlers.ts  # 8 tool implementations
│   │   └── src/index.ts          # Server startup, tool registration
│   ├── web3-middleware/           # Fastify + viem (port 8003)
│   ├── wallet-signer/            # Rust/Axum (port 8004)
│   ├── memory-service/           # FastAPI (port 8005)
│   └── analytics-service/        # FastAPI (port 8006)
├── Design.md                     # Design system spec
├── AGENTS.md                     # Agent pipeline & rules
├── API.md                        # API reference
├── TEST.md                       # Testing strategy
├── SYSTEM.md                     # System architecture
├── ARCHITECTURE.md               # Technical architecture
├── PLAN.md                       # Project plan
└── dev.sh                        # Dev startup script
```

---

## 12. Known Issues & Tech Debt

- [ ] `wallet-signer` (Rust) — Cargo build times out, not yet compiled
- [ ] MongoDB port 27017 conflict — another service using the port
- [ ] Together.ai account has zero credits — only Groq is active
- [ ] No tests written yet — only scaffolded test file stubs
- [ ] No CI/CD pipeline — manual deploys
- [ ] No analytics tracking — no Mixpanel/Amplitude
- [ ] No error boundary in React — unhandled errors crash the app
- [ ] No rate limiting on frontend — API gateway handles it but no UI feedback
- [ ] No offline support — PWA registered but no service worker logic
- [ ] Blog articles are static — no CMS or MDX pipeline
- [ ] Contact form has no backend submission — shows success but doesn't send
- [ ] No SEO meta tags — missing og:image, description, etc.

---

---

## 13. Related Documents

| Document | Purpose |
|---|---|
| `PROJECT_OVERVIEW.md` | This file — complete project state and context |
| `STRATEGY.md` | Growth strategy, product roadmap, agent economy, traction plan |
| `Design.md` | Claude × ElevenLabs design system specification |
| `AGENTS.md` | 4-agent engineering pipeline and safety rules |
| `API.md` | Full API endpoint reference |
| `TEST.md` | Testing strategy and coverage requirements |
| `SYSTEM.md` | System architecture |
| `ARCHITECTURE.md` | Technical architecture |
| `PLAN.md` | Project plan |
| `docs/adr/` | Architecture Decision Records |

---

*Last updated: July 25, 2025*
*Author: Habte Selassie Fitsum*
*Project: BlockMind Labs — AI Infrastructure for Web3*
