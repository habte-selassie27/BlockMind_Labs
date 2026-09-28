import type { SealedBox } from './crypto';
import type { TokenConfig } from '../lib/tokens';

export type VaultSecretKind = 'mnemonic' | 'privateKey';

/**
 * The decrypted secret. Exists in plaintext ONLY in service-worker memory
 * (and `chrome.storage.session` while unlocked). Never persisted to disk,
 * never logged, never sent over the network — ADR-011 invariants 3 and 4.
 */
export interface VaultSecret {
  kind: VaultSecretKind;
  mnemonic?: string;
  privateKey?: `0x${string}`;
  nextAccountIndex: number;
}

export interface VaultAccount {
  index: number;
  address: string;
  label?: string;
}

/** Persisted record — only the sealed box holds secrets. */
export interface VaultRecord {
  version: 1;
  createdAt: number;
  /** Primary account address. Public information, kept unsealed for instant display. */
  address: string;
  accounts: VaultAccount[];
  sealed: SealedBox;
}

export interface VaultStatus {
  exists: boolean;
  locked: boolean;
  address: string | null;
  accounts: VaultAccount[];
  chainId: number;
  autoLockMinutes: number;
  selectedIndex: number;
  /** ERC-20 tokens the user has added, across all chains. */
  tokens: TokenConfig[];
}

export interface Settings {
  chainId: number;
  selectedIndex: number;
  autoLockMinutes: number;
  /** User-added ERC-20 tokens. Public data only — never key material. */
  tokens: TokenConfig[];
}

export interface ExportedSecret {
  kind: VaultSecretKind;
  mnemonic?: string;
  privateKey?: `0x${string}`;
  accounts: VaultAccount[];
}

// ✅ COMPLIES WITH: AGENTS.md §12.5 (see ADR-011)
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
