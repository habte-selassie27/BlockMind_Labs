/**
 * A request awaiting user confirmation.
 *
 * Everything here is JSON-safe because it lives in `chrome.storage.session`: the MV3
 * service worker can be torn down at any moment (including while the user is looking at
 * the confirmation window), and a restarted worker must still be able to sign and
 * answer the original request. Bigints are stored as hex strings and parsed at signing.
 */

export type PendingKind = 'transaction' | 'signature' | 'typedData' | 'connect';

export interface HexTxFields {
  chainId: number;
  to?: string;
  valueHex?: string;
  data?: string;
  gasHex?: string;
  gasPriceHex?: string;
  maxFeePerGasHex?: string;
  maxPriorityFeePerGasHex?: string;
  nonce?: number;
}

export interface ConfirmPayload {
  id: string;
  kind: PendingKind;
  origin: string;
  method: string;
  chainId: number;
  chainName: string;
  isTestnet: boolean;
  headline: string;
  details: { label: string; value: string; mono?: boolean }[];
  blockers: string[];
  warnings: string[];
  acknowledgements: string[];
  rules: string[];
  simulation?: { success: boolean; gas?: string; revertReason?: string };
  risk?: { label: string; tone: 'ok' | 'warn' | 'high' | 'muted'; detail: string };
  rawData?: string;
  accounts: { index: number; address: string }[];
}

export interface PendingRequest {
  id: string;
  kind: PendingKind;
  createdAt: number;
  origin: string;
  method: string;
  chainId: number;
  accountIndex: number;
  from: string;
  /** Request asked for `allow_unlimited` (§12.3). */
  allowUnlimited: boolean;
  /** false for `eth_signTransaction`, which returns the raw signed tx instead of broadcasting. */
  broadcast: boolean;
  tx?: HexTxFields;
  message?: { text?: string; raw?: string };
  typedData?: unknown;
  payload: ConfirmPayload;
}

export interface StoredResult {
  createdAt: number;
  response: { channel: 'blockmind:content'; id: string; result?: unknown; error?: { code: number; message: string } };
}

// ✅ COMPLIES WITH: AGENTS.md §12.2
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
