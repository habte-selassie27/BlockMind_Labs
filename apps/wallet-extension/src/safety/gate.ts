/**
 * The pre-signature gate.
 *
 * Nothing reaches the signer without passing `evaluateTransaction`. Pure function:
 * all inputs (simulation, risk verdict, decoded call) are gathered by the caller, so
 * every §12 decision is unit-testable without a browser or a chain.
 */
import type { DecodedCall } from './calldata';
import { shortAddress } from './calldata';
import { unlimitedApprovalWarning } from './approvals';
import type { ContractRisk } from './scamshield';
import type { SimulationResult } from './simulate';

export const RULES = {
  simulation: '§12.1 no TX without simulation',
  confirmation: '§12.2 no TX without confirmation',
  unlimitedApproval: '§12.3 no MAX_UINT256 approvals',
  scamShield: '§12.4 Scam Shield before new contracts',
} as const;

export interface GateInput {
  chainId: number;
  origin: string;
  decoded: DecodedCall;
  simulation: SimulationResult;
  risk: ContractRisk;
  /** Request carried `allow_unlimited: true` (§12.3 escape hatch). */
  allowUnlimited?: boolean;
  isTestnet: boolean;
}

export interface GateResult {
  canSign: boolean;
  /** Hard stops. The confirm screen disables approval while any blocker remains. */
  blockers: string[];
  /** Shown to the user. `acknowledgements` must be ticked before signing. */
  warnings: string[];
  acknowledgements: string[];
  /** Which §12 rules participated, for the audit trail. */
  rules: string[];
  headline: string;
}

function targetOf(decoded: DecodedCall): string | null {
  switch (decoded.kind) {
    case 'nativeTransfer':
      return decoded.to;
    case 'transfer':
    case 'transferFrom':
      return decoded.token;
    case 'approve':
    case 'increaseAllowance':
    case 'setApprovalForAll':
    case 'contractCall':
      return decoded.token;
    case 'contractDeploy':
      return null;
  }
}

export function evaluateTransaction(input: GateInput): GateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const acknowledgements: string[] = [];
  const rules: string[] = [RULES.confirmation];

  // §12.1 — simulation is mandatory and its result is shown.
  rules.push(RULES.simulation);
  if (!input.simulation.success) {
    blockers.push(`Simulation failed: ${input.simulation.revertReason ?? 'unknown revert'}. The transaction was not signed.`);
  }

  // §12.3 — unlimited approvals.
  const unlimited =
    (input.decoded.kind === 'approve' || input.decoded.kind === 'increaseAllowance') && input.decoded.unlimited;
  const blanket =
    input.decoded.kind === 'setApprovalForAll' && input.decoded.approved;
  if (unlimited || blanket) {
    rules.push(RULES.unlimitedApproval);
    const spender = unlimited
      ? input.decoded.kind === 'approve' || input.decoded.kind === 'increaseAllowance'
        ? shortAddress(input.decoded.spender)
        : 'the spender'
      : input.decoded.kind === 'setApprovalForAll'
        ? shortAddress(input.decoded.operator)
        : 'the operator';

    const message = blanket
      ? `This grants ${spender} control of every item you own in this collection.`
      : unlimitedApprovalWarning(spender);

    if (input.allowUnlimited) {
      warnings.push(message);
      acknowledgements.push('I understand this is an unlimited approval and accept the risk');
    } else {
      blockers.push(
        `${message} Unlimited approvals are blocked by default — set allow_unlimited: true and confirm again, or approve an exact amount.`,
      );
    }
  }

  // §12.4 — Scam Shield before interacting with a contract we have not seen before.
  const target = targetOf(input.decoded);
  const needsRiskCheck = target !== null || input.decoded.kind === 'contractDeploy';
  if (needsRiskCheck) {
    rules.push(RULES.scamShield);
    if (input.risk.status === 'ok') {
      if (input.risk.risk === 'HIGH') {
        blockers.push(
          `Scam Shield rates ${target ? shortAddress(target) : 'this deployment'} HIGH RISK. Interacting could result in loss of funds.` +
            (input.risk.flags.length > 0 ? ` Flags: ${input.risk.flags.join('; ')}` : ''),
        );
      } else if (!input.risk.verified) {
        warnings.push(
          `Scam Shield could not verify the source of ${target ? shortAddress(target) : 'this contract'}. Only continue if you trust the dApp.`,
        );
        acknowledgements.push('I have verified this contract independently');
      }
    } else if (input.risk.status === 'unavailable') {
      warnings.push(`Scam Shield check unavailable (${input.risk.reason}). The contract could not be screened.`);
      acknowledgements.push('I understand this contract was not screened for scams');
    }
  }

  if (input.isTestnet) {
    warnings.push(`You are on a testnet (chain ${input.chainId}). Funds here have no real value.`);
  }

  if (!input.simulation.gasEstimate) {
    warnings.push('Gas could not be estimated for this transaction.');
  }

  return {
    canSign: blockers.length === 0,
    blockers,
    warnings,
    acknowledgements,
    rules: [...new Set(rules)],
    headline: input.decoded.summary,
  };
}

// ✅ COMPLIES WITH: AGENTS.md §12.1, §12.2, §12.3, §12.4
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
