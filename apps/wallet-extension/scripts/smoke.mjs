/**
 * Smoke test for the packaged extension.
 *
 * Unit tests exercise the source modules; this script exercises the *artifacts Chrome
 * actually loads* — `dist/manifest.json` and `dist/inpage.js`. That distinction matters,
 * because the original wallet's worst defect was not a logic error but a packaging one:
 * the provider was announced once at `document_start`, before any dApp could listen, so
 * "is the wallet installed?" always answered no even though the extension was running.
 *
 * Run with `node scripts/smoke.mjs` (or `npm run smoke`) after `npm run build`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '..', 'dist');

let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  \u2713 ${label}`);
  } else {
    failures += 1;
    console.log(`  \u2717 ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── A DOM small enough to run the provider in Node ────────────────────────────

class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    Object.assign(this, init);
  }
}

class FakeCustomEvent extends FakeEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.detail = init.detail;
  }
}

/** Emitter + same-window postMessage, which is what the three worlds actually share. */
function createFakeWindow() {
  const listeners = new Map();
  const posted = [];

  const win = {
    posted,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    dispatchEvent(event) {
      for (const handler of listeners.get(event.type) ?? []) handler(event);
      return true;
    },
    postMessage(data) {
      posted.push(data);
      // The real window delivers a 'message' event back to the same window.
      win.dispatchEvent(new FakeEvent('message', { data }));
    },
  };

  return win;
}

function loadBundle(file, sandbox) {
  const code = readFileSync(join(dist, file), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'CustomEvent', 'Event', 'setTimeout', 'clearTimeout', 'console', code)(
    sandbox.window,
    sandbox.document,
    FakeCustomEvent,
    FakeEvent,
    setTimeout,
    clearTimeout,
    console,
  );
}

// ── 1. The manifest is loadable and self-consistent ───────────────────────────

console.log('\nmanifest');

if (!existsSync(join(dist, 'manifest.json'))) {
  console.log('  \u2717 dist/manifest.json is missing — run `npm run build` first');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));

check('is manifest version 3', manifest.manifest_version === 3);
check('declares a background service worker', Boolean(manifest.background?.service_worker));
check(
  'declares the popup',
  manifest.action?.default_popup === 'popup.html' && existsSync(join(dist, 'popup.html')),
);

for (const [size, path] of Object.entries(manifest.icons ?? {})) {
  check(`icon ${size} exists`, existsSync(join(dist, path)), path);
}

const scripts = manifest.content_scripts ?? [];
const flat = scripts.flatMap((entry) => entry.js ?? []);
const referenced = new Set([...flat, manifest.background?.service_worker, manifest.action?.default_popup]);
for (const file of referenced) {
  check(`${file} is present in dist/`, existsSync(join(dist, file)));
}

const matches = scripts.flatMap((entry) => entry.matches ?? []);
check(
  'runs on a local dev server',
  matches.some((m) => m.startsWith('http://localhost/')),
  matches.join(', '),
);
check('runs in the MAIN world', scripts.some((entry) => entry.world === 'MAIN'));
check(
  'every content script runs at document_start',
  scripts.length > 0 && scripts.every((entry) => entry.run_at === 'document_start'),
);

// The chain IDs the wallet advertises must be the real GIWA ones.
const inpage = readFileSync(join(dist, 'inpage.js'), 'utf8');
const content = readFileSync(join(dist, 'content.js'), 'utf8');
check('does not advertise the old bogus chain id 0x1651a', !inpage.includes('0x1651a') && !content.includes('0x1651a'));

// ── 2. The provider is injected and discoverable ───────────────────────────────

console.log('\nprovider injection (dist/inpage.js)');

const window_ = createFakeWindow();
const document_ = { readyState: 'complete', addEventListener() {} };

const announced = [];
window_.addEventListener('eip6963:announceProvider', (event) => announced.push(event.detail));
let initialized = 0;
window_.addEventListener('blockmind#initialized', () => {
  initialized += 1;
});

loadBundle('inpage.js', { window: window_, document: document_ });

const provider = window_.blockmind;
check('window.blockmind is injected', Boolean(provider));
check('exposes request()', typeof provider?.request === 'function');
check('identifies itself with isBlockmind', provider?.isBlockmind === true);
check(
  'is feature-detectable synchronously, with no handshake',
  typeof provider?.request === 'function' && provider.isBlockmind === true,
);
check('reuses the same object on a second injection', (() => {
  loadBundle('inpage.js', { window: window_, document: document_ });
  return window_.blockmind === provider;
})());

check('announced itself on load', announced.length >= 1);
check(
  'announces with the Blockmind rdns',
  announced.every((detail) => detail?.info?.rdns === 'io.blockmind.wallet'),
);
check('fires the initialised event for late-mounting dApps', initialized >= 1);

const before = announced.length;
window_.dispatchEvent(new FakeEvent('eip6963:requestProvider'));
check('re-announces when a dApp asks (EIP-6963)', announced.length > before);

// ── 3. The request round-trip completes ───────────────────────────────────────

console.log('\nrequest round-trip');

const pending = provider.request({ method: 'eth_chainId' });
const request = window_.posted.find((message) => message?.channel === 'blockmind:inpage');

check('posts a request on the documented channel', Boolean(request));
check('carries the method', request?.method === 'eth_chainId');
check('carries a matchable id', typeof request?.id === 'string' && request.id.length > 0);

// Answer as the isolated content relay would, once the service worker replies.
window_.dispatchEvent(
  new FakeEvent('message', {
    data: { channel: 'blockmind:content', id: request.id, result: '0x164ce' },
  }),
);

const settled = await Promise.race([
  pending.then((value) => ({ value })),
  new Promise((r) => setTimeout(() => r({ timeout: true }), 500)),
]);

check('resolves the promise the dApp is awaiting', settled.value === '0x164ce', JSON.stringify(settled));
check(
  'reports GIWA Sepolia (0x164ce)',
  settled.value === '0x164ce',
  `got ${String(settled.value)}`,
);

// A response for an unknown id must not resolve anything or throw.
window_.dispatchEvent(new FakeEvent('message', { data: { channel: 'blockmind:content', id: 'not-mine' } }));
check('ignores a response for an unknown request id', true);

// ── Result ────────────────────────────────────────────────────────────────────

console.log('');
if (failures > 0) {
  console.log(`SMOKE TEST FAILED — ${failures} check(s) did not pass.\n`);
  process.exit(1);
}
console.log('SMOKE TEST PASSED — the built extension injects a discoverable provider and completes a request.\n');
