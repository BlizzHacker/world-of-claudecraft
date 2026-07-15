#!/usr/bin/env node
/**
 * Build a sanitized, reviewable patch for upstream ClaudeCraft.
 *
 * This tool is intentionally fail-closed. It never pushes, opens a PR, or
 * mutates a branch. It only reads a git diff, rejects private paths/secrets,
 * applies neutral branding substitutions, and writes a patch plus manifest for
 * a human/upstream review step.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRIVATE_PATHS = [
  /^env\.d\//i,
  /(^|\/)\.env(?:\.|$)/i,
  /^crypto\//i,
  /(^|\/)secrets?\//i,
  /^deploy\/env\//i,
  /^src\/ui\/cryptic\//i,
  /^src\/sim\/realms\/content\//i,
  /^server\/(wallet|economy|discord|oauth)/i,
  /(?:cryptic|infernal|exchange|dominion|arcane|claudecraft|fps)\.env/i,
];

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /(?:DATABASE_URL|GITHUB_TOKEN|AWS_SECRET_ACCESS_KEY|SOLANA_PRIVATE_KEY)\s*=/i,
  /(?:Bearer|token|password|secret)\s*[:=]\s*[A-Za-z0-9_./+=-]{24,}/i,
  /\b192\.168\.\d{1,3}\.\d{1,3}\b/,
];

export function isPrivatePath(path) {
  return PRIVATE_PATHS.some((pattern) => pattern.test(path));
}

export function sanitizeText(text) {
  return text
    .replace(/https?:\/\/(?:www\.)?crypticrealm\.com/gi, 'https://worldofclaudecraft.com')
    .replace(/cryptic-realm/gi, 'world-of-claudecraft')
    .replace(/crypticrealm/gi, 'worldofclaudecraft')
    .replace(/Cryptic Realm/gi, 'World of ClaudeCraft')
    .replace(/\$CR\b/gi, '$WOC')
    .replace(
      /\b(?:infernal|exchange|dominion|arcane|claudecraft|fps)\.crypticrealm\.com\b/gi,
      'worldofclaudecraft.com',
    );
}

export function secretMatches(text) {
  return SECRET_PATTERNS.flatMap((pattern) => (pattern.test(text) ? [pattern.source] : []));
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

export function buildManifest({ base, head, files, rejected }) {
  return {
    schema: 1,
    source: { base, head },
    generatedAt: new Date().toISOString(),
    files,
    rejected,
    policy: {
      privatePaths: PRIVATE_PATHS.map((pattern) => pattern.source),
      secretScan: 'fail-closed',
      pushesOrPullRequests: false,
    },
  };
}

export function extractPatch({ cwd = process.cwd(), base = 'HEAD~1', head = 'HEAD', out }) {
  const names = git(cwd, ['diff', '--name-only', `${base}...${head}`])
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean);
  const rejected = names.filter(isPrivatePath);
  if (rejected.length) {
    throw new Error(
      `private paths are not eligible for upstream extraction: ${rejected.join(', ')}`,
    );
  }
  const rawPatch = git(cwd, [
    'diff',
    '--binary',
    '--no-ext-diff',
    `${base}...${head}`,
    '--',
    ...names,
  ]);
  const sanitizedPatch = sanitizeText(rawPatch);
  const secrets = secretMatches(sanitizedPatch);
  if (secrets.length)
    throw new Error(`sanitized patch still matches secret policy: ${secrets.join(', ')}`);
  const manifest = buildManifest({ base, head, files: names, rejected: [] });
  if (out) {
    const dir = resolve(cwd, out);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'upstream.patch'), sanitizedPatch, 'utf8');
    writeFileSync(resolve(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { dir, manifest };
  }
  return { patch: sanitizedPatch, manifest };
}

function main(argv) {
  const args = new Map();
  for (let i = 2; i < argv.length; i += 2) args.set(argv[i], argv[i + 1]);
  const cwd = resolve(args.get('--cwd') ?? process.cwd());
  const result = extractPatch({
    cwd,
    base: args.get('--base') ?? 'HEAD~1',
    head: args.get('--head') ?? 'HEAD',
    out: args.get('--out') ?? 'tmp/upstream-candidate',
  });
  process.stdout.write(`${JSON.stringify(result.manifest, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url)))
  main(process.argv);
