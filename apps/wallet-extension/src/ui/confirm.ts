/**
 * Confirmation window (§12.2).
 *
 * Renders exactly what the dispatcher's gate produced — the window never re-derives a
 * verdict, so the safety report and the screen cannot disagree. All dynamic values are
 * written with `textContent`: a hostile dApp controls calldata, addresses, and origins,
 * and none of it may become markup.
 */
import type { ConfirmPayload } from '../runtime/pending';

const root = document.getElementById('root');
const params = new URLSearchParams(window.location.search);
const requestId = params.get('id') ?? '';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function alertBox(variant: 'high' | 'warn' | 'ok', title: string, items: string[]): HTMLElement {
  const box = el('div', `alert alert-${variant}`);
  box.appendChild(el('strong', undefined, title));
  if (items.length > 0) {
    const list = el('ul');
    for (const item of items) list.appendChild(el('li', undefined, item));
    box.appendChild(list);
  }
  return box;
}

function renderError(message: string): void {
  if (!root) return;
  root.replaceChildren(
    el('h1', undefined, 'Request unavailable'),
    alertBox('high', message, []),
    el('p', 'muted', 'This request may have already been answered or expired.'),
  );
}

async function decide(approved: boolean, acknowledgements: string[]): Promise<void> {
  const reply = (await chrome.runtime.sendMessage({
    type: 'pending_decide',
    id: requestId,
    approved,
    acknowledgements,
  })) as { ok?: boolean; error?: string } | undefined;

  if (!reply?.ok && approved) {
    renderError(reply?.error ?? 'The wallet could not complete this request.');
    return;
  }
  window.close();
}

function renderPending(payload: ConfirmPayload): void {
  if (!root) return;
  root.replaceChildren();

  // ── Origin + headline ───────────────────────────────────────────
  const header = el('div', 'confirm-header');
  header.appendChild(el('div', 'confirm-mark', '⬡'));
  const headerText = el('div');
  headerText.appendChild(el('div', 'origin', payload.origin));
  headerText.appendChild(el('div', 'muted', `${payload.chainName} · ${payload.method}`));
  header.appendChild(headerText);
  root.appendChild(header);

  root.appendChild(el('p', 'headline', payload.headline));

  // ── Risk verdict ────────────────────────────────────────────────
  if (payload.risk) {
    const tone = payload.risk.tone;
    const badgeClass =
      tone === 'high' ? 'badge-high' : tone === 'warn' ? 'badge-warn' : tone === 'ok' ? 'badge-ok' : 'badge-muted';
    const wrap = el('div', 'confirm-header');
    wrap.appendChild(el('span', `badge ${badgeClass}`, payload.risk.label));
    wrap.appendChild(el('span', 'muted', payload.risk.detail));
    root.appendChild(wrap);
  }

  // ── Blockers (§12.1 / §12.3 / §12.4 hard stops) ─────────────────
  if (payload.blockers.length > 0) {
    root.appendChild(alertBox('high', 'This request is blocked by Blockmind safety rules', payload.blockers));
  }

  // ── Simulation result (§12.1) ───────────────────────────────────
  if (payload.simulation) {
    root.appendChild(
      payload.simulation.success
        ? alertBox('ok', 'Simulation passed', [
            payload.simulation.gas ? `Estimated gas: ${payload.simulation.gas}` : 'Gas estimate unavailable',
          ])
        : alertBox('high', 'Simulation failed — nothing will be signed', [
            payload.simulation.revertReason ?? 'Unknown revert reason',
          ]),
    );
  }

  // ── Warnings ────────────────────────────────────────────────────
  if (payload.warnings.length > 0) {
    root.appendChild(alertBox('warn', 'Read before approving', payload.warnings));
  }

  // ── Details ─────────────────────────────────────────────────────
  const details = el('div', 'card rows');
  for (const row of payload.details) {
    const line = el('div', 'row');
    line.appendChild(el('span', 'row-label', row.label));
    line.appendChild(el('span', `row-value${row.mono ? ' mono' : ''}`, row.value));
    details.appendChild(line);
  }
  root.appendChild(details);

  // ── Raw calldata (for power users) ──────────────────────────────
  if (payload.rawData) {
    const disclosure = el('details');
    disclosure.appendChild(el('summary', undefined, 'Show raw calldata'));
    disclosure.appendChild(el('pre', 'raw', payload.rawData));
    root.appendChild(disclosure);
  }

  // ── Acknowledgements ────────────────────────────────────────────
  const boxes: HTMLInputElement[] = [];
  if (payload.acknowledgements.length > 0) {
    const ackCard = el('div', 'card rows');
    for (const text of payload.acknowledgements) {
      const label = el('label', 'ack');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      label.appendChild(checkbox);
      label.appendChild(el('span', undefined, text));
      ackCard.appendChild(label);
      boxes.push(checkbox);
    }
    root.appendChild(ackCard);
  }

  // ── Actions ─────────────────────────────────────────────────────
  const actions = el('div', 'actions');
  const approve = el('button', 'btn btn-primary btn-block', 'Approve') as HTMLButtonElement;
  approve.disabled = payload.blockers.length > 0;

  const syncApprove = () => {
    approve.disabled = payload.blockers.length > 0 || boxes.some((box) => !box.checked);
  };
  syncApprove();
  for (const box of boxes) box.addEventListener('change', syncApprove);

  approve.addEventListener('click', async () => {
    approve.disabled = true;
    approve.replaceChildren(el('span', 'spinner'), document.createTextNode(' Signing…'));
    await decide(true, payload.acknowledgements);
  });

  const reject = el('button', 'btn btn-secondary btn-block', 'Reject') as HTMLButtonElement;
  reject.addEventListener('click', async () => {
    reject.disabled = true;
    await decide(false, []);
  });

  actions.appendChild(approve);
  actions.appendChild(reject);
  root.appendChild(actions);

  root.appendChild(el('p', 'rules', payload.rules.join(' · ')));
}

async function main(): Promise<void> {
  if (!requestId) {
    renderError('No request id was supplied to this window.');
    return;
  }

  const reply = (await chrome.runtime.sendMessage({ type: 'pending_get', id: requestId })) as
    | { ok?: boolean; data?: ConfirmPayload; error?: string }
    | undefined;

  if (!reply?.ok || !reply.data) {
    renderError(reply?.error ?? 'This request is no longer available.');
    return;
  }
  renderPending(reply.data);
}

void main();

// ✅ COMPLIES WITH: AGENTS.md §12.2
// ✅ SERVICE: wallet-extension
// ✅ ARCHITECT SPEC: P1-WALLET-01 native wallet extension
