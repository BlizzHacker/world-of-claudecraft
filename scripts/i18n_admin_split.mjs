// One-time migration: split the monolithic admin DICT into the
// overlay-model source shape, mirroring scripts/i18n_flatten_locales.mjs for the
// game client.
//
// BEFORE: src/admin/i18n.ts held a single dense `DICT: Record<locale,
// Record<key,string>>` (14 locales x 181 keys, all inline).
// AFTER:  src/admin/i18n.en.ts            authoritative FLAT English base (the
//                                         source contributors edit to add keys)
//         src/admin/i18n.locales/<lang>.ts  one flat per-locale overlay each
//                                         (Record<string,string>, sparse-capable;
//                                         the build fills any omitted key from
//                                         English and the registry marks it pending).
//
// Admin keys are already flat dotted strings (e.g. "app.title"), so unlike the
// game side there is no flatten/unflatten step - the overlay IS the locale slice.
//
// This is STRICTLY one-time: it reads the CURRENT dense DICT and refuses to run if
// src/admin/i18n.en.ts already exists (re-running after the runtime was rewritten
// to read the resolved table would re-materialise the English fill for every
// pending key and silently un-sparse the overlays). Run it once, then never again.
//
// Usage:
//   node scripts/i18n_admin_split.mjs

import * as esbuild from 'esbuild';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const EN_PATH = path.join(root, 'src/admin/i18n.en.ts');
const LOCALES_DIR = path.join(root, 'src/admin/i18n.locales');

// Canonical ordered locale set (matches scripts/i18n_build.mjs LOCALES). `en` is
// the authoritative base; the other 13 become flat overlay files.
const LOCALES = [
  'en', 'es', 'es_ES', 'fr_FR', 'fr_CA', 'en_CA', 'it_IT', 'de_DE',
  'zh_CN', 'zh_TW', 'ko_KR', 'ja_JP', 'pt_BR', 'ru_RU',
];

async function loadDict() {
  const build = await esbuild.build({
    stdin: {
      contents: "export { DICT } from './src/admin/i18n';",
      resolveDir: root,
      sourcefile: 'admin-split-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(build.outputFiles[0].text).toString('base64')}`;
  const mod = await import(dataUrl);
  return mod.DICT;
}

// Emit an object literal body, one `"key": "value",` per line, in `en` key order.
function objectBody(keys, pick) {
  return keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(pick(k))},`).join('\n');
}

function enFile(enKeys, en) {
  return [
    '// Authoritative English admin catalog. FLAT dotted-key map - the',
    '// source of truth for every admin operator-visible string. This is the file a',
    '// contributor edits to ADD a key (then renders it through t()); the 13 overlays',
    '// in src/admin/i18n.locales/ are translator-edited and may omit a key, which the',
    '// build (scripts/i18n_admin_build.mjs) fills from English and the registry',
    '// (scripts/i18n_scan.mjs) marks `pending`. Do NOT add a translation here.',
    '//',
    '// `AdminTranslations` (= typeof en) types every locale in the generated dense',
    '// table src/admin/i18n.resolved.generated.ts, so tsc red-fails a missing or',
    '// renamed key - the same completeness safety net the game client has.',
    '',
    'export const en = {',
    objectBody(enKeys, (k) => en[k]),
    '};',
    '',
    'export type AdminTranslations = typeof en;',
    '',
  ].join('\n');
}

function overlayFile(lang, enKeys, slice) {
  return [
    `// Sparse flat admin overlay for "${lang}". Mirrors the game client's`,
    '// src/ui/i18n.locales/<lang>.ts: ONLY this file is translator-edited. A key',
    '// omitted here is filled from the English admin base by the build',
    '// (scripts/i18n_admin_build.mjs) and tracked as `pending` in the registry',
    '// (scripts/i18n_scan.mjs) until a release fill provides it. Keys are in the',
    "// English base's key order. Every key must be a real admin `en` key",
    '// (tests/i18n_admin_catalog.test.ts).',
    '',
    `export const ${lang}: Record<string, string> = {`,
    objectBody(enKeys.filter((k) => typeof slice[k] === 'string'), (k) => slice[k]),
    '};',
    '',
  ].join('\n');
}

async function main() {
  if (existsSync(EN_PATH)) {
    console.error(
      `i18n:admin:split: ${path.relative(root, EN_PATH)} already exists. This is a ` +
        'one-time migration; refusing to clobber the authoritative base (re-running would ' +
        'un-sparse the overlays). Delete it deliberately if you really mean to re-migrate.',
    );
    process.exit(1);
  }
  const dict = await loadDict();
  const enKeys = Object.keys(dict.en);

  mkdirSync(LOCALES_DIR, { recursive: true });
  writeFileSync(EN_PATH, enFile(enKeys, dict.en));
  let overlays = 0;
  for (const lang of LOCALES) {
    if (lang === 'en') continue;
    const slice = dict[lang] || {};
    writeFileSync(path.join(LOCALES_DIR, `${lang}.ts`), overlayFile(lang, enKeys, slice));
    overlays++;
  }
  console.log(
    `i18n:admin:split: wrote ${path.relative(root, EN_PATH)} (${enKeys.length} keys) + ` +
      `${overlays} overlays under ${path.relative(root, LOCALES_DIR)}/`,
  );
}

await main();
