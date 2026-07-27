# API.md — Blockmind Labs
## API Reference v1.0

**Version:** 1.0.0  
**Base URL (Production):** `https://api.blockmind.io/v1`  
**Base URL (Testnet):** `https://testnet-api.blockmind.io/v1`  
**Base URL (Sandbox):** `https://sandbox.blockmind.io/v1`  
**Author:** Habte Selassie Fitsum  
**Last Updated:** 2025-07-20

---

## Overview

The Blockmind Labs API is a RESTful + WebSocket API that enables developers to integrate AI-powered blockchain interaction into any application. The API exposes three primary capability surfaces:

- **Agent API** — natural language execution of on-chain operations
- **Chain API** — direct blockchain reads and transaction building
- **Analytics API** — AI-powered on-chain data insights

All requests use HTTPS. All request and response bodies are JSON. Timestamps are Unix epoch integers (seconds). Addresses are lowercase hex strings with `0x` prefix.

---

## Authentication

### API Key (SDK / Developer Access)

Include your API key in the `X-API-Key` header:

```http
X-API-Key: bm_live_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Key prefixes:
- `bm_live_` — Production (mainnet operations)
- `bm_test_` — Testnet (safe testing, no real assets)
- `bm_sandbox_` — Sandbox (fully mocked, no chain connection)

### JWT (Chat / User Access)

Obtain a JWT by completing wallet signature auth (see `/auth/wallet`). Include in the Authorization header:

```http
Authorization: Bearer eyJhbGci...
```

JWTs expire after **15 minutes**. Use the refresh token endpoint to obtain a new access token.

---

## Error Format

All errors follow a consistent envelope:

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Wallet balance of 5 GIWA is less than requested 10 GIWA.",
    "details": {
      "available": "5000000000000000000",
      "requested": "10000000000000000000",
      "token": "GIWA"
    },
    "request_id": "req_01J5ABCDEF"
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid auth credentials |
| `TOKEN_EXPIRED` | 401 | JWT has expired — refresh required |
| `FORBIDDEN` | 403 | Valid auth, but insufficient permissions for this operation |
| `TIER_UPGRADE_REQUIRED` | 403 | Feature requires higher subscription tier |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests — see Retry-After header |
| `SIMULATION_FAILED` | 422 | TX simulation failed — transaction NOT submitted |
| `INSUFFICIENT_BALANCE` | 422 | Wallet lacks sufficient balance |
| `CONTRACT_RISK_DETECTED` | 422 | Scam Shield flagged the target contract |
| `CONFIRMATION_REQUIRED` | 202 | Action requires explicit user confirmation before execution |
| `INVALID_CONFIRMATION_TOKEN` | 400 | Confirmation token expired or invalid |
| `CHAIN_UNAVAILABLE` | 503 | RPC endpoint unavailable — retry with backoff |
| `LLM_UNAVAILABLE` | 503 | AI inference temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected internal error |

---

## Rate Limits

Rate limit status is returned in every response header:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1721484000
X-RateLimit-Window: hour
```

When rate limited, retry after the `Retry-After` header value (seconds).

---

## 1. Authentication Endpoints

### `POST /auth/wallet`
Initiate wallet signature authentication.

**Step 1 — Request nonce:**
```http
POST /auth/wallet/nonce
Content-Type: application/json

{
  "wallet_address": "0xabc123..."
}
```

**Response:**
```json
{
  "nonce": "Sign this message to authenticate with Blockmind Labs:\n\nNonce: a1b2c3d4\nExpires: 1721484000",
  "expires_at": 1721484000
}
```

**Step 2 — Submit signature:**
```http
POST /auth/wallet
Content-Type: application/json

{
  "wallet_address": "0xabc123...",
  "signature": "0xsignedNonce...",
  "chain_id": 7777
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "rt_01J5...",
  "expires_in": 900,
  "user": {
    "id": "user_01J5ABCDEF",
    "wallet_address": "0xabc123...",
    "tier": "free",
    "created_at": 1721480000
  }
}
```

---

### `POST /auth/refresh`
Refresh an expired access token.

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "rt_01J5..."
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGci...",
  "expires_in": 900
}
```

---

### `POST /auth/logout`
Revoke a refresh token.

```http
POST /auth/logout
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "refresh_token": "rt_01J5..."
}
```

**Response `200`:**
```json
{ "revoked": true }
```

---

## 2. Agent API

The Agent API is the core of Blockmind Labs — it accepts natural language instructions and orchestrates the full AI → simulation → confirmation → execution pipeline.

---

### `POST /agent/execute`
Execute a natural language instruction.

```http
POST /agent/execute
Authorization: Bearer eyJhbGci...  (or X-API-Key for SDK)
Content-Type: application/json

{
  "message": "Send 10 GIWA to 0xrecipient456",
  "session_id": "sess_01J5...",          // optional — links to conversation history
  "chain_id": 7777,                       // optional — defaults to user's preferred chain
  "wallet_address": "0xabc123..."         // required for SDK auth; inferred for JWT auth
}
```

**Response `200` — Read-only operation (no confirmation needed):**
```json
{
  "session_id": "sess_01J5ABCDEF",
  "request_id": "req_01J5XYZ",
  "response": {
    "type": "text",
    "content": "Your GIWA balance is 142.5 GIWA (≈ $28.50 at current price).",
    "tool_calls": [
      {
        "tool": "get_balance",
        "arguments": { "token": "GIWA", "address": "0xabc123..." },
        "result": { "balance": "142500000000000000000", "formatted": "142.5" }
      }
    ]
  },
  "requires_confirmation": false
}
```

**Response `202` — State-changing operation (confirmation required):**
```json
{
  "session_id": "sess_01J5ABCDEF",
  "request_id": "req_01J5XYZ",
  "response": {
    "type": "confirmation_request",
    "content": "I'll send 10 GIWA to 0xrecipient456. Please review the details below.",
    "confirmation": {
      "token": "conf_01J5MNOPQR",        // one-time token, expires in 5 minutes
      "expires_at": 1721480300,
      "summary": {
        "action": "Transfer",
        "from": "0xabc123...",
        "to": "0xrecipient456...",
        "amount": "10",
        "token": "GIWA",
        "estimated_gas": "0.0002 GIWA",
        "estimated_usd_value": "$2.00",
        "simulation_status": "passed"
      },
      "warnings": []                      // populated if Scam Shield finds risks
    }
  },
  "requires_confirmation": true
}
```

**Response `422` — Simulation failed:**
```json
{
  "error": {
    "code": "SIMULATION_FAILED",
    "message": "Transaction simulation failed: insufficient GIWA balance. You have 5 GIWA but tried to send 10 GIWA.",
    "details": { "simulation_revert_reason": "ERC20: transfer amount exceeds balance" }
  }
}
```

---

### `POST /agent/confirm`
Confirm a pending action using the confirmation token.

```http
POST /agent/confirm
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "confirmation_token": "conf_01J5MNOPQR",
  "session_id": "sess_01J5ABCDEF"
}
```

**Response `200`:**
```json
{
  "session_id": "sess_01J5ABCDEF",
  "tx_hash": "0xdeadbeef...",
  "status": "submitted",
  "response": {
    "type": "text",
    "content": "Done! Your transfer of 10 GIWA is submitted. Transaction hash: 0xdeadbeef... You can track it on the GIWA explorer."
  },
  "transaction": {
    "hash": "0xdeadbeef...",
    "chain_id": 7777,
    "from": "0xabc123...",
    "to": "0xrecipient456...",
    "submitted_at": 1721480005
  }
}
```

---

### `POST /agent/cancel`
Cancel a pending confirmation.

```http
POST /agent/cancel
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "confirmation_token": "conf_01J5MNOPQR",
  "session_id": "sess_01J5ABCDEF"
}
```

**Response `200`:**
```json
{ "cancelled": true, "session_id": "sess_01J5ABCDEF" }
```

---

### `GET /agent/sessions`
List conversation sessions for the authenticated user.

```http
GET /agent/sessions?limit=20&cursor=sess_01J5...
Authorization: Bearer eyJhbGci...
```

**Response `200`:**
```json
{
  "sessions": [
    {
      "id": "sess_01J5ABCDEF",
      "created_at": 1721480000,
      "last_active_at": 1721480500,
      "message_count": 12,
      "chain_id": 7777,
      "summary": "Transferred GIWA, checked portfolio"
    }
  ],
  "next_cursor": "sess_01J4XYZABC",
  "has_more": true
}
```

---

### `GET /agent/sessions/:session_id/history`
Retrieve conversation history for a session.

```http
GET /agent/sessions/sess_01J5ABCDEF/history?limit=50
Authorization: Bearer eyJhbGci...
```

**Response `200`:**
```json
{
  "session_id": "sess_01J5ABCDEF",
  "messages": [
    {
      "id": "msg_01J5ABC",
      "role": "user",
      "content": "Send 10 GIWA to 0xrecipient456",
      "created_at": 1721480000
    },
    {
      "id": "msg_01J5DEF",
      "role": "assistant",
      "content": "I'll send 10 GIWA to 0xrecipient456. Please review the details below.",
      "created_at": 1721480001,
      "tool_calls": [...],
      "tx_hash": "0xdeadbeef..."
    }
  ],
  "total": 2
}
```

---

## 3. Chain API

Direct blockchain interaction endpoints — no AI layer. For developers who want deterministic execution without NL processing.

---

### `GET /chain/:chain_id/balance`
Get token balance for an address.

```http
GET /chain/7777/balance?address=0xabc123&token=0xGIWATokenAddr
X-API-Key: bm_live_...
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `address` | string | Yes | Wallet address to query |
| `token` | string | No | Token contract address. Omit for native token balance. |

**Response `200`:**
```json
{
  "chain_id": 7777,
  "address": "0xabc123...",
  "token": "0xGIWATokenAddr",
  "token_symbol": "GIWA",
  "token_decimals": 18,
  "balance_raw": "142500000000000000000",
  "balance_formatted": "142.5",
  "balance_usd": "28.50",
  "price_usd": "0.20",
  "block_number": 4820341
}
```

---

### `GET /chain/:chain_id/gas`
Get current gas price estimates.

```http
GET /chain/7777/gas
X-API-Key: bm_live_...
```

**Response `200`:**
```json
{
  "chain_id": 7777,
  "block_number": 4820341,
  "base_fee_gwei": "0.001",
  "estimates": {
    "slow":    { "max_fee_gwei": "0.0012", "estimated_wait_seconds": 30 },
    "standard":{ "max_fee_gwei": "0.0015", "estimated_wait_seconds": 5  },
    "fast":    { "max_fee_gwei": "0.0020", "estimated_wait_seconds": 2  }
  },
  "updated_at": 1721480005
}
```

---

### `POST /chain/:chain_id/simulate`
Simulate a transaction without submitting it.

```http
POST /chain/7777/simulate
X-API-Key: bm_live_...
Content-Type: application/json

{
  "from": "0xabc123...",
  "to": "0xrecipient456...",
  "value": "10000000000000000000",
  "data": "0x",
  "gas_limit": "21000"
}
```

**Response `200`:**
```json
{
  "success": true,
  "gas_used": "21000",
  "gas_used_formatted": "21,000",
  "return_data": "0x",
  "logs": [],
  "block_number": 4820341,
  "state_changes": [
    {
      "address": "0xabc123...",
      "token": "native",
      "balance_before": "142500000000000000000",
      "balance_after":  "132500000000000000000",
      "delta": "-10000000000000000000"
    },
    {
      "address": "0xrecipient456...",
      "token": "native",
      "balance_before": "5000000000000000000",
      "balance_after":  "15000000000000000000",
      "delta": "+10000000000000000000"
    }
  ]
}
```

**Response `422` — Simulation failed:**
```json
{
  "success": false,
  "revert_reason": "ERC20: transfer amount exceeds balance",
  "revert_data": "0x08c379a0..."
}
```

---

### `POST /chain/:chain_id/build-tx`
Build a typed transaction object ready for signing.

```http
POST /chain/7777/build-tx
X-API-Key: bm_live_...
Content-Type: application/json

{
  "type": "erc20_transfer",
  "from": "0xabc123...",
  "to": "0xrecipient456...",
  "token": "0xGIWATokenAddr",
  "amount": "10000000000000000000"
}
```

Supported `type` values: `native_transfer`, `erc20_transfer`, `erc20_approve`, `contract_call`

**Response `200`:**
```json
{
  "tx": {
    "chain_id": 7777,
    "from": "0xabc123...",
    "to": "0xGIWATokenAddr",
    "value": "0x0",
    "data": "0xa9059cbb000000000000000000000000...",
    "gas_limit": "0xc350",
    "max_fee_per_gas": "0x59682f0b",
    "max_priority_fee_per_gas": "0x3b9aca00",
    "nonce": "0x17",
    "type": "0x2"
  },
  "estimated_gas_usd": "0.001"
}
```

---

### `POST /chain/:chain_id/submit`
Submit a signed transaction.

```http
POST /chain/7777/submit
X-API-Key: bm_live_...
Content-Type: application/json

{
  "signed_tx": "0xf86d178..."
}
```

**Response `200`:**
```json
{
  "tx_hash": "0xdeadbeef...",
  "chain_id": 7777,
  "status": "pending",
  "submitted_at": 1721480005
}
```

---

### `GET /chain/:chain_id/tx/:tx_hash`
Get transaction status and receipt.

```http
GET /chain/7777/tx/0xdeadbeef...
X-API-Key: bm_live_...
```

**Response `200`:**
```json
{
  "tx_hash": "0xdeadbeef...",
  "chain_id": 7777,
  "status": "confirmed",
  "block_number": 4820345,
  "block_hash": "0xblockHash...",
  "from": "0xabc123...",
  "to": "0xrecipient456...",
  "value": "10000000000000000000",
  "gas_used": "21000",
  "gas_price_gwei": "0.0015",
  "fee_paid": "0.0000000315",
  "fee_paid_usd": "0.000006",
  "confirmed_at": 1721480010,
  "logs": []
}
```

---

### `POST /chain/:chain_id/call`
Call a read-only contract function.

```http
POST /chain/7777/call
X-API-Key: bm_live_...
Content-Type: application/json

{
  "to": "0xContractAddr",
  "abi": [{ "name": "balanceOf", "type": "function", "inputs": [{"type": "address"}], "outputs": [{"type": "uint256"}] }],
  "function": "balanceOf",
  "args": ["0xabc123..."]
}
```

**Response `200`:**
```json
{
  "result": ["142500000000000000000"],
  "decoded": { "balanceOf": "142500000000000000000" }
}
```

---

## 4. Analytics API

AI-powered on-chain analytics. All analytics endpoints are rate-limited separately from Agent and Chain APIs.

---

### `GET /analytics/portfolio`
Get an AI-summarized portfolio overview for an address.

```http
GET /analytics/portfolio?address=0xabc123&chain_id=7777
Authorization: Bearer eyJhbGci...
```

**Response `200`:**
```json
{
  "address": "0xabc123...",
  "chain_id": 7777,
  "total_value_usd": "1842.50",
  "tokens": [
    {
      "symbol": "GIWA",
      "address": "0xGIWATokenAddr",
      "balance": "142.5",
      "price_usd": "0.20",
      "value_usd": "28.50",
      "24h_change_pct": "+3.2",
      "portfolio_weight_pct": "1.5"
    }
  ],
  "nfts": [],
  "defi_positions": [],
  "ai_summary": "Your portfolio is concentrated in GIWA (92% weight) which has grown 3.2% in the last 24 hours. Consider diversifying into stablecoins to reduce volatility exposure.",
  "risk_score": 72,
  "risk_label": "High",
  "last_updated": 1721480000
}
```

---

### `GET /analytics/contract/:address/risk`
Scam Shield: AI-powered contract risk analysis.

```http
GET /analytics/contract/0xSuspiciousAddr.../risk?chain_id=7777
Authorization: Bearer eyJhbGci...
```

**Response `200`:**
```json
{
  "contract_address": "0xSuspiciousAddr...",
  "chain_id": 7777,
  "risk_score": 87,
  "risk_label": "HIGH RISK",
  "flags": [
    {
      "code": "HIDDEN_MINT_FUNCTION",
      "severity": "critical",
      "description": "Contract contains a mint function accessible by the deployer that could dilute token supply without notice."
    },
    {
      "code": "PROXY_UPGRADEABLE",
      "severity": "medium",
      "description": "Contract is a proxy that can be upgraded by the owner, potentially changing behavior after deployment."
    }
  ],
  "ai_summary": "This contract shows multiple high-risk patterns associated with rug pulls. The deployer retains the ability to mint unlimited tokens and can upgrade the contract logic. We strongly recommend avoiding interaction with this contract.",
  "similar_known_scams": 3,
  "first_deployed": 1721300000,
  "deployer": "0xDeployer...",
  "verified_source": false
}
```

---

### `GET /analytics/chain/:chain_id/stats`
Real-time chain statistics with AI narrative.

```http
GET /analytics/chain/7777/stats
X-API-Key: bm_live_...
```

**Response `200`:**
```json
{
  "chain_id": 7777,
  "chain_name": "GIWA",
  "latest_block": 4820341,
  "tps_current": 142,
  "tps_24h_avg": 87,
  "active_addresses_24h": 12400,
  "transactions_24h": 840000,
  "total_value_locked_usd": "48200000",
  "gas_price_gwei": "0.0015",
  "ai_summary": "GIWA chain is running at 142 TPS — 63% above its 24-hour average — suggesting elevated network activity. TVL has grown 12% this week driven by the newly launched staking protocol. Gas remains extremely cheap at sub-$0.001 per transaction.",
  "updated_at": 1721480000
}
```

---

## 5. WebSocket API

Real-time event streaming for transaction monitoring, agent sessions, and chain events.

**WebSocket URL:** `wss://api.blockmind.io/v1/ws`

### Connection

```javascript
const ws = new WebSocket('wss://api.blockmind.io/v1/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'Bearer eyJhbGci...'   // or api_key: 'bm_live_...'
  }));
};
```

### Subscribe to Transaction Updates

```json
{ "type": "subscribe", "channel": "tx", "tx_hash": "0xdeadbeef..." }
```

**Events received:**
```json
{ "type": "tx.pending",   "tx_hash": "0xdeadbeef...", "timestamp": 1721480005 }
{ "type": "tx.confirmed", "tx_hash": "0xdeadbeef...", "block_number": 4820345, "timestamp": 1721480010 }
{ "type": "tx.failed",    "tx_hash": "0xdeadbeef...", "reason": "out of gas", "timestamp": 1721480007 }
```

### Subscribe to Address Activity

```json
{
  "type": "subscribe",
  "channel": "address",
  "address": "0xabc123...",
  "chain_id": 7777,
  "filters": ["transfers", "approvals"]
}
```

**Events received:**
```json
{
  "type": "address.transfer",
  "address": "0xabc123...",
  "direction": "inbound",
  "token": "GIWA",
  "amount": "10.0",
  "from": "0xsender...",
  "tx_hash": "0xnewTx...",
  "ai_description": "You received 10 GIWA from 0xsender (a wallet you've interacted with before).",
  "timestamp": 1721480100
}
```

### Agent Session Stream

Stream agent responses in real-time (for long-running LLM operations):

```json
{ "type": "subscribe", "channel": "agent_session", "session_id": "sess_01J5..." }
```

**Events received:**
```json
{ "type": "agent.thinking",   "session_id": "...", "message": "Checking your balance..." }
{ "type": "agent.tool_call",  "session_id": "...", "tool": "get_balance", "status": "running" }
{ "type": "agent.tool_result","session_id": "...", "tool": "get_balance", "result": {...} }
{ "type": "agent.response",   "session_id": "...", "content": "Your balance is 142.5 GIWA." }
{ "type": "agent.confirmation_required", "session_id": "...", "confirmation": {...} }
```

---

## 6. SDK Endpoints

Used by the `@blockmind/sdk` package and by developers building on the SDK tier.

---

### `POST /sdk/keys`
Create a new API key for a registered developer.

```http
POST /sdk/keys
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "name": "My Production App",
  "environment": "live",
  "allowed_chains": [7777, 1, 137],
  "allowed_tools": ["get_balance", "transfer_token", "swap_tokens"],
  "monthly_call_limit": 10000
}
```

**Response `201`:**
```json
{
  "id": "key_01J5...",
  "name": "My Production App",
  "key": "bm_live_sk_xxxx...",    // shown ONCE — store securely
  "environment": "live",
  "allowed_chains": [7777, 1, 137],
  "allowed_tools": ["get_balance", "transfer_token", "swap_tokens"],
  "monthly_call_limit": 10000,
  "calls_this_month": 0,
  "created_at": 1721480000
}
```

---

### `GET /sdk/usage`
Get API key usage statistics.

```http
GET /sdk/usage?key_id=key_01J5...&period=month
Authorization: Bearer eyJhbGci...
```

**Response `200`:**
```json
{
  "key_id": "key_01J5...",
  "period": "2025-07",
  "total_calls": 4821,
  "call_limit": 10000,
  "calls_remaining": 5179,
  "reset_at": 1722470400,
  "by_tool": {
    "get_balance": 2100,
    "transfer_token": 500,
    "swap_tokens": 221
  },
  "by_chain": {
    "7777": 2400,
    "1": 1900,
    "137": 521
  },
  "error_count": 12,
  "error_rate_pct": 0.25
}
```

---

## 7. Webhook API

Register webhooks to receive real-time event notifications via HTTP POST.

### `POST /webhooks`
Register a webhook endpoint.

```http
POST /webhooks
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "url": "https://your-app.com/blockmind-webhook",
  "events": ["tx.confirmed", "tx.failed", "address.transfer", "agent.session.completed"],
  "address_filters": ["0xabc123..."],
  "chain_ids": [7777],
  "secret": "your_webhook_secret_for_verification"
}
```

**Response `201`:**
```json
{
  "id": "wh_01J5...",
  "url": "https://your-app.com/blockmind-webhook",
  "events": ["tx.confirmed", "tx.failed", "address.transfer"],
  "status": "active",
  "created_at": 1721480000
}
```

### Webhook Payload Format

All webhook deliveries include a signature header for verification:

```http
POST https://your-app.com/blockmind-webhook
Content-Type: application/json
X-Blockmind-Signature: sha256=abc123...
X-Blockmind-Event: tx.confirmed
X-Blockmind-Delivery: del_01J5...

{
  "event": "tx.confirmed",
  "delivery_id": "del_01J5...",
  "timestamp": 1721480010,
  "data": {
    "tx_hash": "0xdeadbeef...",
    "chain_id": 7777,
    "block_number": 4820345,
    "from": "0xabc123...",
    "to": "0xrecipient456...",
    "value": "10000000000000000000",
    "status": "confirmed"
  }
}
```

**Signature Verification (Node.js):**
```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## 8. SDK Quick Reference

```typescript
import { BlockmindClient } from '@blockmind/sdk';

const client = new BlockmindClient({
  apiKey: 'bm_live_...',
  chain: 'giwa',
  network: 'mainnet',
});

// Natural language execution
const session = client.createAgentSession({ walletAddress: '0xabc...' });
const result = await session.execute('Swap 100 GIWA for USDC');
if (result.requiresConfirmation) {
  console.log(result.confirmation.summary);  // show to user
  const tx = await session.confirm(result.confirmation.token);
  console.log(tx.hash);
}

// Direct chain reads
const balance = await client.chain.getBalance({ address: '0xabc...', token: 'GIWA' });
console.log(balance.formatted);  // "142.5"

// Simulation
const sim = await client.chain.simulate({ from: '0xabc...', to: '0xdef...', value: '1000' });
console.log(sim.success);  // true / false

// Risk analysis
const risk = await client.analytics.checkContractRisk('0xSuspicious...');
console.log(risk.riskLabel);  // "HIGH RISK"

// Events
client.on('tx.confirmed', (event) => {
  console.log(`TX confirmed: ${event.txHash}`);
});
await client.chain.watchTransaction('0xdeadbeef...');
```

---

## 9. Changelog

| Version | Date | Changes |
|---|---|---|
| `1.0.0` | 2025-07-20 | Initial API specification |

---

## 10. Support

- **Documentation:** https://docs.blockmind.io
- **Status Page:** https://status.blockmind.io
- **Developer Discord:** https://discord.gg/blockmind
- **Email:** api@blockmind.io
- **GitHub (SDK):** https://github.com/blockmind-labs/sdk

---

*All endpoints marked as v1 are stable. Breaking changes will only be introduced in a new API version (v2) with a minimum 6-month deprecation notice.*
