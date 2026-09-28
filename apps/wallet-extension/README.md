# Blockmind Wallet — GIWA-native browser wallet (MV3)

A non-custodial wallet extension for the GIWA ecosystem. It generates and holds the
user's own keys on their device, and every transaction is simulated, screened, and
explicitly confirmed before the signer is reached.

Keys live only here (see [ADR-011](../../docs/adr/ADR-011-client-side-key-custody.md));
no Blockmind service ever receives key material.

## What was broken before

The first extension shipped a stub that could not work:

| Defect | Where | Status |
|---|---|---|
| Readiness race — `BLOCKMIND_WALLET_READY` was broadcast once at `document_start`, before any dApp registered a listener, so "not detected" was the only possible outcome | `injected.js` | Fixed: provider is injected and feature-detectable, every legacy request re-announces readiness |
| Responses omitted `method`, so the dApp's matcher never fired and the connect promise hung | `injected.js` | Fixed: legacy responses always echo `method` |
| No key material at all — "Connect Wallet" only saved a pasted address | `popup.js` | Fixed: real vault (create/import/export, HD accounts) |
| `eth_sendTransaction` POSTed the raw transaction to `https://api.blockmind.ai/v1/chain/sign-and-submit` | `background.js` | Fixed: local signing, broadcast to GIWA RPC; the remote signer call is gone |
| Wrong chain ID (`0x1651a`) that matched no GIWA network | `injected.js` | Fixed: 91342 (`0x164ce`) and 9134 (`0x23ae`) |
| `signAndSend` in chat-pwa only handled MetaMask | `apps/chat-pwa/src/wallet.tsx` | Fixed: both wallets sign through EIP-1193 |

## Architecture

```
page (MAIN world)          isolated world         service worker
window.blockmind  ──▶  content.ts relay  ──▶  background.ts ──▶ dispatcher.ts
   inpage.ts              (chrome.runtime)          │
                                                     ├─ vault/     keys + signing
                                                     ├─ safety/    §12 gates
                                                     └─ lib/       RPC, chains, protocol
```

- `src/inpage.ts` — EIP-1193 provider plus an EIP-6963 announcement. Injected into the
  page's own world, so `window.blockmind` is a synchronous feature check: no handshake to
  time out.
- `src/content.ts` — relays between the page and the worker; re-announces readiness on
  every incoming request so late-registering dApps still detect the wallet.
- `src/background.ts` — MV3 service worker. Holds no secrets in module scope.
- `src/runtime/dispatcher.ts` — the only place a request can become a signature.
- `src/vault/` — vault sealing (PBKDF2-SHA256 600k → AES-256-GCM), BIP-39/BIP-44 keys,
  local signing via viem (ADR-004).
- `src/safety/` — §12.1 simulation, §12.3 unlimited-approval block, §12.4 Scam Shield,
  calldata decoding for the confirmation screen.
- `src/ui/` — popup (vault, accounts, network, send, token list) and the confirmation window.
- `src/lib/tokens.ts` — the ERC-20 token list, on-chain `symbol`/`decimals`/`balanceOf`
  reads, and `transfer` calldata encoding.

## Safety gates (§12)

| Rule | Enforcement |
|---|---|
| §12.1 no TX without simulation | `eth_call` + `eth_estimateGas` run before the user is asked anything. A revert is a hard stop — the confirmation window never opens. |
| §12.2 no TX without confirmation | Every state-changing call opens `confirm.html` with a decoded summary. Nothing signs without an explicit approval. |
| §12.3 no MAX_UINT256 approvals | Unlimited `approve`/`increaseAllowance` and blanket `setApprovalForAll` are blocked unless the request carries `allow_unlimited: true`, and the user must still tick a warning. Re-checked at signing time. |
| §12.4 Scam Shield before new contracts | Unknown contracts are screened; `HIGH` risk blocks, an unscreened or unverified contract requires acknowledgement. Trusted contracts are remembered. |
| §12.5 key isolation | Keys are generated on-device, sealed at rest, held in `chrome.storage.session` (memory only, trusted contexts) while unlocked, and never transmitted. |

Additional hardening: `eth_sendRawTransaction` is refused (it would bypass the gate) and
`eth_sign` is disabled (an opaque digest cannot be shown to the user). `eth_accounts`
returns `[]` until the user approves the origin.

## Tokens (ERC-20)

The popup lists ERC-20 balances for the selected chain and can send them. Adding a token
reads `symbol` and `decimals` **from the contract**, never from the form, so a mistyped
or dishonest decimal count cannot change the amount shown on the confirmation screen.

An ERC-20 send is plain `transfer` calldata, so it passes through the same gate,
simulation and confirmation window as a native transfer — token support does not open a
second, unchecked path to the signer. A token contract the user has not trusted yet is
screened by Scam Shield first (§12.4).

## Build

```bash
pnpm install --filter @blockmind/wallet-extension
pnpm --filter=@blockmind/wallet-extension build     # → apps/wallet-extension/dist
```

Load it: `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
select `apps/wallet-extension/dist`.

`BLOCKMIND_API_URL` overrides the Scam Shield base URL at build time (default
`https://api.blockmind.ai`; the wallet calls `/explorer/address/:address`).

## Test

```bash
pnpm --filter=@blockmind/wallet-extension test      # vitest, no browser required
pnpm --filter=@blockmind/wallet-extension typecheck
pnpm --filter=@blockmind/wallet-extension build
pnpm --filter=@blockmind/wallet-extension smoke     # checks the built dist/ artifacts
```

The dispatcher, vault, gate, token and protocol logic are covered with a fake chain and
an in-memory vault, so the suite runs anywhere.

`npm run smoke` is different: it loads the **built** `dist/inpage.js` and
`dist/manifest.json` and asserts that the provider is injected, synchronously
detectable, announced over EIP-6963, and that a request round-trips to a response — the
packaging-level behaviour that unit tests on the source cannot catch. Run it after
`build`.

## Manual smoke test in Chrome

The one thing no script here can do is load the extension into a real browser. After
`npm run build`, walk this list once:

1. `chrome://extensions` → **Developer mode** on → **Load unpacked** → `apps/wallet-extension/dist`.
2. Click the extension → create a wallet → **save the recovery phrase** → set a password.
3. In a terminal: `pnpm --filter=@blockmind/chat-pwa dev`, then open `http://localhost:5173/chat`.
   If the dev server was already running from before a code change, **restart it and hard-reload**
   (`Ctrl+Shift+R`) — a stale bundle shows old UI strings.
4. Open **Connect Wallet**. The Blockmind tile must read "GIWA-native wallet extension",
   not "Not detected".
5. Click it → the extension's confirmation window opens → **Approve** → the address appears in
   the chat UI and the balance loads.
6. Popup → **Send**: send a small native amount to a second address. Expect the confirmation
   window to open with a decoded summary and a simulation result; the balance must move.
7. Popup → **Add token** with a real ERC-20 address on GIWA Sepolia, then send a small
   amount of it. Same gate, same confirmation window.
8. Negative checks: a transaction that reverts must be blocked **before** any confirmation
   window appears; an unlimited `approve` from a dApp must be refused; **Lock now** in the
   popup must make the next signing request fail with "wallet is locked".

## Provider API

Supported: `eth_requestAccounts`, `eth_accounts`, `eth_chainId`, `net_version`,
`wallet_switchEthereumChain`, `wallet_addEthereumChain`, `wallet_getPermissions`,
`eth_sendTransaction`, `eth_signTransaction`, `personal_sign`, `eth_signTypedData_v4`,
`blockmind_ping`, plus the read-only methods in `READ_METHODS`
(`eth_getBalance`, `eth_call`, `eth_estimateGas`, `eth_getCode`, …).

Refused by design: `eth_sendRawTransaction`, `eth_sign`, and any unknown method.

The legacy `window.postMessage({ type: 'BLOCKMIND_REQUEST' })` protocol still works, with
the two original defects fixed.

## Configuration notes

- Injecting into `https://*.vercel.app/*` keeps preview deployments working. Before a
  store submission, narrow `content_scripts.matches` in `manifest.json` to the production
  app domain(s).
- Requires Chrome 111+ for `content_scripts.world = "MAIN"`.

## Known limitations

- No hardware-wallet support yet; keys live in the extension's own vault.
- The popup sends native GIWA and any ERC-20 the user has added. Swaps are not built
  here: they need a route the wallet can decode and verify, so they come from a dApp (or
  the chat app) and are signed through the same confirmation flow.
- Losing the recovery phrase and the vault password means losing the funds — Blockmind
  cannot recover either.
