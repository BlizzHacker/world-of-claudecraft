// One-time migration: convert the 13 non-English locale files under
// src/ui/i18n.locales/ from nested ": typeof en" objects into FLAT dotted-key
// overlays (`Record<string, string>`). `en` (src/ui/i18n.en.ts) stays nested and
// authoritative; the island files (world_entity_i18n.ts, talent_i18n.ts) are left
// nested for now. The build (scripts/i18n_build.mjs) unflattens each overlay,
// overlays it onto nested `en`, and emits the byte-identical dense resolved table.
//
// Each emitted file lists every key in `en`'s leaf order (the overlays are still
// DENSE for now; sparseness lands later), so two locales diff cleanly and
// a missing/typo'd key is obvious. Keys are typed `Record<string, string>` rather
// than `Record<TranslationKey, string>`: `TranslationKey = Leaves<typeof en, 5>`
// only reaches depth 5, but the deepest real leaves (e.g.
// entities.quests.<id>.objectives.0.label) are 6 segments deep, so they are not in
// TranslationKey. The exact-key-set and byte-equivalence gates enforce key
// validity instead (tests/i18n_flat_overlay_dense.test.ts + the resolved hash).
//
// One-shot: this migration already ran (the locale files now export flat
// dotted-key maps), and re-running it THROWS by design. flatten (i18n_flatten.mjs)
// rejects any key segment containing a literal '.', and a flat overlay's top-level
// keys are exactly such dotted paths ("meta.builtOn", ...), so the first key fails
// loud rather than double-flattening. Not safe to re-run on flat input, and not
// wired into any build; it was run by hand once:  node scripts/i18n_flatten_locales.mjs

import * as esbuild from 'esbuild';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { flatten } from './i18n_flatten.mjs';

const root = process.cwd();

// The 13 non-English locales. `en` stays nested in src/ui/i18n.en.ts.
const LOCALES = [
  'es', 'es_ES', 'fr_FR', 'fr_CA', 'en_CA', 'it_IT', 'de_DE',
  'zh_CN', 'zh_TW', 'ko_KR', 'ja_JP', 'pt_BR', 'ru_RU',
];

function localePath(lang) {
  return path.join(root, `src/ui/i18n.locales/${lang}.ts`);
}

// Bundle the nested `en` plus every nested locale and import the result, the same
// esbuild-stub pattern scripts/i18n_build.mjs uses. This expects NESTED locale
// sources (the pre-migration shape). The migration already ran, so the files are
// flat now; re-running flatten on them throws (dotted keys are unrepresentable),
// which is the intended fail-loud, not a re-run path.
async function loadSources() {
  const stub = [
    `export { en } from './src/ui/i18n.en';`,
    ...LOCALES.map((lang) => `export { ${lang} } from './src/ui/i18n.locales/${lang}';`),
  ].join('\n');
  const build = await esbuild.build({
    stdin: { contents: stub, resolveDir: root, sourcefile: 'i18n-flatten-entry.ts', loader: 'ts' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
  });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(build.outputFiles[0].text).toString('base64')}`;
  return import(dataUrl);
}

function header(lang) {
  return [
    `// Flat dotted-key translation overlay for "${lang}".`,
    '//',
    '// One key per leaf of the authoritative nested `en` (src/ui/i18n.en.ts), keys',
    "// in `en`'s leaf order. This is the translator-edited source: edit a value to",
    '// translate that key. The build (scripts/i18n_build.mjs) unflattens this map and',
    '// overlays it onto nested `en` to produce the dense resolved table; any key here',
    '// must be a real `en` leaf path (enforced by tests/i18n_flat_overlay_dense.test.ts',
    '// and the resolved-table byte-equivalence gate). Overlays start DENSE;',
    '// they are later relaxed to sparse (only translated keys).',
  ].join('\n');
}

// `main` has already asserted that `flat`'s key set is exactly `enKeys`, so emit
// in `en`'s leaf order: every locale file then shares one key order (clean diffs).
function emit(lang, flat, enKeys) {
  const lines = [header(lang), '', `export const ${lang}: Record<string, string> = {`];
  for (const key of enKeys) {
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(flat[key])},`);
  }
  lines.push('};', '');
  return lines.join('\n');
}

async function main() {
  const sources = await loadSources();
  const enFlat = flatten(sources.en);
  const enKeys = Object.keys(enFlat);
  const enKeySet = new Set(enKeys);

  for (const lang of LOCALES) {
    const locale = sources[lang];
    if (!locale) throw new Error(`locale ${lang} did not load`);
    const flat = flatten(locale);
    const keys = Object.keys(flat);

    // Stopping rule: the overlay must carry exactly `en`'s leaf set (dense, no
    // typo'd / structurally-extra keys). A mismatch means the locale diverged from
    // `en`'s shape - surface it, do not paper over it.
    const missing = enKeys.filter((key) => !(key in flat));
    const extra = keys.filter((key) => !enKeySet.has(key));
    if (missing.length || extra.length) {
      throw new Error(
        `locale ${lang} key set != en leaf set: missing ${missing.length} ` +
        `(${missing.slice(0, 5).join(', ')}), extra ${extra.length} (${extra.slice(0, 5).join(', ')})`,
      );
    }
    // Every leaf must be a string (the overlay type is Record<string, string>).
    const nonString = keys.filter((key) => typeof flat[key] !== 'string');
    if (nonString.length) {
      throw new Error(`locale ${lang} has non-string leaves: ${nonString.slice(0, 5).join(', ')}`);
    }

    writeFileSync(localePath(lang), emit(lang, flat, enKeys));
    console.log(`flattened ${lang}: ${keys.length} keys`);
  }
  console.log(`done: ${LOCALES.length} locales, ${enKeys.length} keys each`);
}

await main();
