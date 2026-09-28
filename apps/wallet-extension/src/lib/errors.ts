/**
 * EIP-1193 / EIP-1474 provider errors.
 * Codes follow the standard so dApps (and viem) can interpret them.
 */
export const ErrorCode = {
  userRejectedRequest: 4001,
  unauthorized: 4100,
  unsupportedMethod: 4200,
  disconnected: 4900,
  chainDisconnected: 4901,
  unrecognizedChain: 4902,
  internal: -32603,
  invalidParams: -32602,
} as const;

export class ProviderRpcError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ProviderRpcError';
    this.code = code;
    this.data = data;
  }

  toJSON(): { code: number; message: string; data?: unknown } {
    return this.data === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, data: this.data };
  }
}

export function userRejected(message = 'User rejected the request.'): ProviderRpcError {
  return new ProviderRpcError(ErrorCode.userRejectedRequest, message);
}

export function unauthorized(message = 'The requested account has not been authorized by the user.'): ProviderRpcError {
  return new ProviderRpcError(ErrorCode.unauthorized, message);
}

export function unsupportedMethod(method: string): ProviderRpcError {
  return new ProviderRpcError(ErrorCode.unsupportedMethod, `The method ${method} is not supported.`);
}

export function chainNotSupported(chainId: number): ProviderRpcError {
  return new ProviderRpcError(
    ErrorCode.unrecognizedChain,
    `Chain ${chainId} is not supported. Known chains: GIWA Sepolia (91342), GIWA Mainnet (9134).`,
  );
}

export function internalError(message: string, data?: unknown): ProviderRpcError {
  return new ProviderRpcError(ErrorCode.internal, message, data);
}

export function invalidParams(message: string): ProviderRpcError {
  return new ProviderRpcError(ErrorCode.invalidParams, message);
}

/** Normalizes anything thrown into an EIP-1193 shaped error object. */
export function toRpcError(err: unknown): { code: number; message: string; data?: unknown } {
  if (err instanceof ProviderRpcError) return err.toJSON();
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'number') {
    const e = err as { code: number; message?: string; data?: unknown };
    return e.data === undefined
      ? { code: e.code, message: e.message ?? 'Request failed' }
      : { code: e.code, message: e.message ?? 'Request failed', data: e.data };
  }
  return { code: ErrorCode.internal, message: err instanceof Error ? err.message : String(err) };
}

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
