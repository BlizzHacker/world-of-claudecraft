import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
// Untyped zero-dep build helper (same convention as the other scripts/*.mjs tools).
// vite.config.ts is outside tsconfig `include`, so this import is never type-checked.
import { templateModulepreload } from './scripts/i18n_modulepreload.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf8')) as { version?: string };

function env(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function gitSha(): string | undefined {
  try {
    return execSync('git rev-parse --short=12 HEAD', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

const appVersion = pkg.version ?? env(['APP_VERSION', 'npm_package_version']) ?? '0.0.0';
const appBuildDate = env(['APP_BUILD_DATE', 'BUILD_DATE']) ?? new Date().toISOString();
const appBuildId = env([
  'APP_BUILD_ID',
  'APP_BUILD_NUMBER',
  'BUILD_NUMBER',
  'GITHUB_RUN_NUMBER',
  'RENDER_BUILD_ID',
  'RENDER_GIT_COMMIT',
  'VERCEL_GIT_COMMIT_SHA',
  'CF_PAGES_COMMIT_SHA',
]) ?? gitSha() ?? appBuildDate.replace(/[-:TZ.]/g, '').slice(0, 12);

// Pretty-URL aliases for the standalone official-channels page (public/links.html).
// Mirrors the production server's rewrite in server/main.ts (LINKS_ALIASES) so the
// same /links, /social, /social-media-links paths resolve in dev and preview too.
const LINKS_ALIASES = new Set([
  '/links', '/links/', '/social', '/social/', '/social-media-links', '/social-media-links/',
]);
const WIKI_ALIASES = new Set(['/wiki', '/wiki/']);
function linksAliasPlugin() {
  const rewrite = (req: { url?: string }) => {
    const url = req.url ?? '';
    const pathOnly = url.split('?')[0];
    if (LINKS_ALIASES.has(pathOnly)) req.url = '/links.html' + url.slice(pathOnly.length);
    if (WIKI_ALIASES.has(pathOnly)) req.url = '/wiki.html' + url.slice(pathOnly.length);
  };
  const attach = (server: { middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) => {
    server.middlewares.use((req, _res, next) => { rewrite(req); next(); });
  };
  return { name: 'woc-links-alias', configureServer: attach, configurePreviewServer: attach };
}

// Phase 4 (i18n Lazy Locales): after the production build, resolve each lazy locale
// chunk's content-hashed URL from Vite's manifest and template a { locale: hashedChunkUrl }
// lookup into dist/index.html. The inline boot <script> reads it to modulepreload a stored
// non-en visitor's locale chunk before main parses. Build-only: in dev the inline script's
// sentinel stays undefined (no-op). The manifest is metadata, so enabling it does not move
// the resolved-table SHA. See scripts/i18n_modulepreload.mjs.
function i18nModulepreloadPlugin() {
  let outDir = path.resolve(root, 'dist');
  let base = '/';
  return {
    name: 'woc-i18n-modulepreload',
    apply: 'build' as const,
    configResolved(cfg: { root: string; base: string; build: { outDir: string } }) {
      base = cfg.base || '/';
      outDir = path.isAbsolute(cfg.build.outDir)
        ? cfg.build.outDir
        : path.resolve(cfg.root, cfg.build.outDir);
    },
    closeBundle() {
      const { map } = templateModulepreload({ root, outDir, base });
      // eslint-disable-next-line no-console
      console.log(`[i18n] modulepreload: templated ${Object.keys(map).length} locale chunk URLs into index.html`);
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react({ include: /\.(jsx|tsx)$/ }), linksAliasPlugin(), i18nModulepreloadPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_ID__: JSON.stringify(appBuildId.slice(0, 12)),
    __APP_BUILD_DATE__: JSON.stringify(appBuildDate),
  },
  // Parent dir has a postcss.config.js with Tailwind — ignore it; this project has no CSS pipeline.
  css: {
    postcss: {
      plugins: [],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/admin/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:8787', ws: true },
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    // Don't eagerly <link rel="modulepreload"> the Classic island chunk: it pulls
    // React + the 13.9k-line vendored engine (~836 KB) and must load ONLY when a
    // visitor chooses Classic mode, not on every landing visit. (React still never
    // executes until the click; this just stops the unconditional download.)
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter((d) => !d.includes('classic-entry')),
    },
    // Emit dist/.vite/manifest.json so the Phase 4 modulepreload hook can resolve each
    // lazy locale chunk's content-hashed filename. Metadata only - does not perturb the
    // bundle or move the resolved-table SHA.
    manifest: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        admin: fileURLToPath(new URL('admin.html', import.meta.url)),
        // CR overlay: user-facing /me/ and moderator-facing /mod/ dashboards
        user: fileURLToPath(new URL('user.html', import.meta.url)),
        moderator: fileURLToPath(new URL('mod.html', import.meta.url)),
      },
    },
  },
  test: {
    exclude: [
      '**/node_modules/**', '**/dist/**', '**/.claude/**',
      // Playwright e2e specs run under `npx playwright test`, not vitest.
      'tests/classic/landing-smoke.spec.ts',
      'tests/classic/arcforge-gate.spec.ts',
    ],
  },
});
