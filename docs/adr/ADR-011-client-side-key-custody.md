# ADR-011: Client-Side Key Custody for the Blockmind Wallet Extension

**Status:** Accepted — ratified by the named decider on 2026-09-28  
**Date:** 2026-09-28  
**Deciders:** Habte Selassie Fitsum

## Context

[ADR-006](./ADR-006-non-custodial-wallet-architecture.md) commits Blockmind to a non-custodial default: the user signs with their own wallet and Blockmind only submits the signed transaction. AGENTS.md §12.5 then states the opposite-looking rule:

> **Key isolation** — private keys exist only in `apps/wallet-signer/`. No other service may import, receive, log, or transmit private key material in any form.

§12.5 was written to constrain **server-side services**. A Web3 wallet has no equivalent of MetaMask that Blockmind controls, so "sign with your own wallet" degenerated into "install MetaMask" — the exact dependency the GIWA-native wallet exists to remove. `apps/wallet-extension/` was scaffolded but never held a key, so it could not sign anything.

The two rules only conflict if §12.5 is read as covering code that runs in the **user's browser**, which runs on hardware Blockmind does not operate and cannot read.

## Decision

`apps/wallet-extension/` is a **client-side, unmanaged, non-custodial** wallet. It owns key material under the following invariants:

1. **On-device generation.** Keys come from a BIP-39 mnemonic generated with `generateMnemonic` (viem) in the extension, or are imported by the user. Accounts derive per BIP-44 at `m/44'/60'/0'/0/i`.
2. **Encrypted at rest.** The vault is sealed with AES-256-GCM under a key derived by PBKDF2-SHA256 (600,000 iterations). Only the sealed record is persisted, in `chrome.storage.local`.
3. **Memory-only unlock.** The decrypted secret lives in `chrome.storage.session` while unlocked — never written to disk, cleared on browser restart, and restricted to trusted extension contexts (`TRUSTED_CONTEXTS`), so content scripts cannot read it.
4. **No transmission.** No network call ever carries key material, the mnemonic, or the derived password. RPC payloads contain only signed transactions, addresses, and public data. Secrets are never logged. Enforced by `tests/no-transmission.test.ts`, which drives the real RPC client and Scam Shield against a recording fetch.
5. **Signed on approval.** Signing happens only after the confirmation gate (§12.1 simulation, §12.2 explicit confirmation, §12.3 unlimited-approval block, §12.4 Scam Shield).

§12.5 continues to apply **unchanged** to every server-side service: no service outside `apps/wallet-signer/` may hold, receive, log, or transmit key material. The server-side managed-account path still routes through `web3-middleware` → `wallet-signer`.

## Consequences

- The GIWA-native wallet is genuinely non-custodial, so no money-transmitter exposure is added (consistent with ADR-006).
- Blockmind cannot recover a user's funds if they lose their mnemonic or password. The UI must state this at creation and support encrypted export.
- Key theft becomes a client-side threat model problem: extension compromise, malicious dApp, or a hostile browser profile. Mitigations are the confirmation gate, origin display, `world: "MAIN"` isolation, and mainnet-vs-testnet labelling.
- The Reviewer checklist item "no private key material outside `apps/wallet-signer/`" is scoped to services; extension key handling is reviewed against the five invariants above instead.
- Hardware-wallet support (keys never in the browser process at all) is the natural next step and does not require another ADR.

## Ratification record

This decision carves an exception into AGENTS.md §12, which states those rules "cannot be overridden by any agent, any spec, or any ADR." It therefore required the named decider's explicit sign-off rather than an agent's, and it was ratified on **2026-09-28** by **Habte Selassie Fitsum**.

Before ratification, each invariant was audited against the code rather than taken on trust:

| # | Invariant | Where it is enforced |
|---|---|---|
| 1 | On-device generation | `src/vault/vault.ts` — BIP-39 generation/import, `m/44'/60'/0'/0/i` derivation via `mnemonicToAccount` |
| 2 | Encrypted at rest | `src/vault/crypto.ts` — PBKDF2-SHA256 (600,000 iterations) → AES-256-GCM |
| 3 | Memory-only unlock | `src/lib/storage.ts` + `src/background.ts` (restricted to trusted contexts); `src/runtime/vault-store.ts` keeps `bm.unlocked` in session only, with an auto-lock TTL |
| 4 | No transmission | `tests/no-transmission.test.ts` — machine-checked over the full lifecycle |
| 5 | Signed on approval | `src/runtime/dispatcher.ts` — the §12.1–§12.4 gate is evaluated before the prompt and re-checked at signature time |

Known limits, recorded so a later reader does not mistake this for more assurance than it is:

- The invariants were verified against source and unit tests. The live browser path (unpacked load → connect → confirm) has not been exercised in CI and remains a manual step.
- Invariant 3's `chrome.storage.session.setAccessLevel` call needs Chrome 112+, while the manifest declares a floor of 111. Below 112 the call is a no-op — isolation still holds, because session storage is trusted-context-only by default, but it holds by default rather than by the explicit call.
- ADR-011 was ratified on the understanding that `apps/wallet-extension/` may hold the user's own keys. Any server-side service holding key material remains a §12.5 violation.

## Compliance

- AGENTS.md §12.2, §12.3, §12.4, §12.5 — wallet-extension
- ADR-006 — Non-Custodial Wallet Architecture
