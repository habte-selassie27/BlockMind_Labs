/**
 * Builds the unpacked MV3 extension into dist/.
 *
 * Bundling is required because MV3 pages and service workers cannot resolve bare
 * module specifiers (`viem/accounts`, `@noble/*`). esbuild inlines them; every entry
 * point is a self-contained IIFE, so no module-type service worker is needed and the
 * extension works on the oldest Chrome version we declare (111).
 *
 * Usage:  pnpm --filter @blockmind/wallet-extension build
 * Config: BLOCKMIND_API_URL overrides the Scam Shield base URL.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');

const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
const apiBaseUrl = (process.env.BLOCKMIND_API_URL ?? 'https://api.blockmind.ai').replace(/\/+$/, '');

const define = {
  __EXTENSION_VERSION__: JSON.stringify(manifest.version),
  __BLOCKMIND_API_URL__: JSON.stringify(apiBaseUrl),
};

const entries = {
  background: 'src/background.ts',
  content: 'src/content.ts',
  inpage: 'src/inpage.ts',
  popup: 'src/ui/popup.ts',
  confirm: 'src/ui/confirm.ts',
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const [name, entry] of Object.entries(entries)) {
  await build({
    entryPoints: [join(root, entry)],
    outfile: join(dist, `${name}.js`),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome111'],
    define,
    logLevel: 'info',
    minify: false,
    sourcemap: false,
    legalComments: 'none',
  });
}

// Static assets travel next to the bundles.
await cp(join(root, 'manifest.json'), join(dist, 'manifest.json'));
for (const file of ['popup.html', 'confirm.html', 'theme.css', 'popup.css', 'confirm.css']) {
  await cp(join(root, 'src', 'ui', file), join(dist, file));
}

if (!existsSync(join(root, 'icons', 'icon-128.png'))) {
  const { spawnSync } = await import('node:child_process');
  spawnSync(process.execPath, [join(root, 'scripts', 'make-icons.mjs')], { stdio: 'inherit' });
}
await cp(join(root, 'icons'), join(dist, 'icons'), { recursive: true });

// Fail loudly if an icon the manifest references is missing — Chrome refuses to load
// an unpacked extension with a broken icon path, which is how the old stub failed.
for (const size of [16, 48, 128]) {
  const icon = join(dist, 'icons', `icon-${size}.png`);
  if (!existsSync(icon)) throw new Error(`Missing icon: ${icon}`);
}

console.log(`\nBlockmind Wallet built → ${dist}`);
console.log(`  Scam Shield endpoint: ${apiBaseUrl}`);
console.log('  Load it at chrome://extensions → Developer mode → Load unpacked → dist/');
