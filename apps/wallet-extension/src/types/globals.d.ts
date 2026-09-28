// Build-time constants injected by build.mjs (esbuild `define`).
// Keeping them as defines means the shipped bundle never reads a runtime env var.

/** Base URL of the Blockmind API that serves Scam Shield risk data (§12.4). */
declare const __BLOCKMIND_API_URL__: string;

/** Extension version, kept in sync with manifest.json by build.mjs. */
declare const __EXTENSION_VERSION__: string;
