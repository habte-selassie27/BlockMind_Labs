/**
 * AGENTS.md §12.4 — Scam Shield before new contracts.
 *
 * Any contract not on the user's trusted list is checked before an interaction is
 * presented. Blockmind's risk data lives behind web3-middleware
 * (`GET /explorer/address/:address`, consumed by `simulateBatch`) and, for the fuller
 * report, analytics-service (`GET /analytics/contract/:address/risk`).
 *
 * If the service cannot be reached the check does NOT silently pass: it returns
 * `unavailable`, which the gate turns into a warning the user must acknowledge.
 */

export type ContractRisk =
  | { status: 'trusted' }
  | { status: 'ok'; risk: 'LOW' | 'MEDIUM' | 'HIGH'; verified: boolean; score?: number; flags: string[]; source: string }
  | { status: 'unavailable'; reason: string };

export interface ScamShieldOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface ScamShieldCheckOptions {
  /** Skip the network call — the address is already in the user's trusted list. */
  trusted?: boolean;
}

export interface ScamShield {
  check(address: string, chainId: number, options?: ScamShieldCheckOptions): Promise<ContractRisk>;
}

interface RiskBodyShape {
  risk?: unknown;
  risk_label?: unknown;
  risk_score?: unknown;
  is_verified?: unknown;
  verified_source?: unknown;
  is_contract?: unknown;
  flags?: unknown;
  ai_summary?: unknown;
}

function labelToRisk(label: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (/high|critical|danger|malicious/i.test(label)) return 'HIGH';
  if (/medium|moderate|caution|suspicious/i.test(label)) return 'MEDIUM';
  return 'LOW';
}

/** Maps both the middleware and analytics response shapes into one verdict. */
export function mapRiskResponse(body: unknown, source: string): ContractRisk {
  if (typeof body !== 'object' || body === null) {
    return { status: 'unavailable', reason: 'Risk service returned an unexpected payload' };
  }

  const shape = body as RiskBodyShape;
  const flags: string[] = Array.isArray(shape.flags)
    ? shape.flags
        .map((flag) => {
          if (typeof flag === 'string') return flag;
          if (flag && typeof flag === 'object') {
            const entry = flag as { code?: unknown; description?: unknown };
            const code = typeof entry.code === 'string' ? entry.code : undefined;
            const description = typeof entry.description === 'string' ? entry.description : undefined;
            return [code, description].filter(Boolean).join(': ');
          }
          return undefined;
        })
        .filter((value): value is string => Boolean(value))
    : [];

  let risk: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;
  if (typeof shape.risk === 'string') risk = labelToRisk(shape.risk);
  else if (typeof shape.risk_label === 'string') risk = labelToRisk(shape.risk_label);
  else if (typeof shape.risk_score === 'number') {
    risk = shape.risk_score >= 70 ? 'HIGH' : shape.risk_score >= 40 ? 'MEDIUM' : 'LOW';
  }

  const verified =
    shape.verified_source === true ||
    shape.is_verified === true ||
    (shape.is_contract === false ? true : false);

  if (risk === undefined) {
    return { status: 'unavailable', reason: 'Risk service did not return a risk level' };
  }

  const score = typeof shape.risk_score === 'number' ? shape.risk_score : undefined;
  return score === undefined
    ? { status: 'ok', risk, verified, flags, source }
    : { status: 'ok', risk, verified, score, flags, source };
}

export function createScamShield(options: ScamShieldOptions = {}): ScamShield {
  const baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '');
  const doFetch = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  const timeoutMs = options.timeoutMs ?? 4000;

  return {
    async check(address, chainId, checkOptions = {}): Promise<ContractRisk> {
      if (checkOptions.trusted) return { status: 'trusted' };
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        return { status: 'unavailable', reason: 'Not a valid contract address' };
      }
      if (!baseUrl) {
        return { status: 'unavailable', reason: 'Scam Shield service is not configured for this build' };
      }

      const url = `${baseUrl}/explorer/address/${address}?chain_id=${chainId}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await doFetch(url, { signal: controller.signal });
        if (!response.ok) {
          return { status: 'unavailable', reason: `Scam Shield returned HTTP ${response.status}` };
        }
        return mapRiskResponse(await response.json(), url);
      } catch (err) {
        return {
          status: 'unavailable',
          reason: `Scam Shield unreachable: ${err instanceof Error ? err.message : String(err)}`,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// ✅ COMPLIES WITH: AGENTS.md §12.4
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
