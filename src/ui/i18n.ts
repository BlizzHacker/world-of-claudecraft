import {
  translations,
  pending,
  en_XA,
  en, es, es_ES, fr_FR, fr_CA, en_CA, it_IT, de_DE, zh_CN, zh_TW, ko_KR, ja_JP, pt_BR, ru_RU,
} from './i18n.resolved.generated';
import type { Leaves, TranslationKey, InterpolationValue, InterpolationValues, DeepPartial } from './i18n.en';

// The translation table is the generated dense artifact
// (src/ui/i18n.resolved.generated.ts), where every locale is overlaid onto `en`
// and filled from English. Every read-path below (t, translationValue,
// hasTranslation, tOptional) reads that dense table, never the raw per-locale
// objects - those can go sparse, so a direct read of them would
// return undefined or the wrong value.
//
// Re-export the dense per-locale objects, gameStrings, and the type machinery so
// importers of './i18n' keep an unchanged public surface.
export { en, es, es_ES, fr_FR, fr_CA, en_CA, it_IT, de_DE, zh_CN, zh_TW, ko_KR, ja_JP, pt_BR, ru_RU };
// gameStrings is the post-cap/XP/leaderboard layer, which the table carries under
// the `game` key. Source it from the generated dense `en` rather than re-exporting
// from i18n.en, so importing './i18n' does not pull the full i18n.en base (en +
// shared content layers, ~1 MB) into the client bundle - that module now exists
// only to feed the generator. Same content, same export name.
export const gameStrings = en.game;
export type { Leaves, TranslationKey, InterpolationValue, InterpolationValues, DeepPartial };

export type SupportedLanguage = keyof typeof translations;

export const supportedLanguages = Object.keys(translations) as SupportedLanguage[];

let currentLanguage: SupportedLanguage = "en";

// --- en_XA dev-only pseudo-locale --------------------------------------
//
// en_XA is the generated pseudo-locale (accent-pushed + bracketed `en`, with
// {placeholders} preserved - see scripts/i18n_pseudo.mjs). It is deliberately NOT a
// member of `translations`, so it never appears in supportedLanguages, the language
// picker (populated from supportedLanguages), index.html hreflang, or the release
// gate / registry. It is selectable ONLY via ?lang=en_XA on a NON-RELEASE build, as
// a developer tool: any on-screen text that stays plain ASCII with no brackets is a
// hard-coded literal that never became a t() key. The import.meta.env.PROD guard in
// tableFor() is statically true in a production `vite build`, so Rollup
// dead-code-eliminates the en_XA reference and tree-shakes the pseudo table out of
// the shipped bundle entirely.
const DEV_PSEUDO_LOCALE = "en_XA";
let pseudoActive = false;

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return Object.prototype.hasOwnProperty.call(translations, value);
}

export function languageTag(lang: SupportedLanguage): string {
  return lang.replace("_", "-");
}

function browserStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage;
    return storage && typeof storage === "object" ? storage : null;
  } catch {
    return null;
  }
}

function getStoredLanguage(): SupportedLanguage | null {
  const storage = browserStorage();
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const saved = storage.getItem("locale") as SupportedLanguage | null;
    return saved && translations[saved] ? saved : null;
  } catch {
    return null;
  }
}

function setStoredLanguage(lang: SupportedLanguage): void {
  const storage = browserStorage();
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem("locale", lang);
  } catch {
    // Storage may be disabled or unavailable in test/browser privacy modes.
  }
}

// Initialize language from URL query or localStorage if available (browser environments)
if (typeof window !== "undefined" && window.location) {
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get("lang");
  if (langParam === DEV_PSEUDO_LOCALE && !isReleaseBuild()) {
    // Dev-only en_XA pseudo-locale: keep currentLanguage = "en" as the base and flip
    // the pseudo flag. en_XA is not a SupportedLanguage and is never persisted, so it
    // cannot leak into supportedLanguages, the picker, or a stored preference. On a
    // release build this branch is skipped, so ?lang=en_XA degrades to the default.
    pseudoActive = true;
  } else if (langParam && isSupportedLanguage(langParam)) {
    currentLanguage = langParam;
  } else {
    currentLanguage = getStoredLanguage() ?? currentLanguage;
  }
} else {
  currentLanguage = getStoredLanguage() ?? currentLanguage;
}

export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

export function setLanguage(lang: SupportedLanguage): void {
  pseudoActive = false; // selecting a real locale leaves the dev pseudo-locale
  currentLanguage = lang;
  setStoredLanguage(lang);
}

function interpolate(template: string, values?: InterpolationValues): string {
  if (!values) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}

// --- release detection + the t() miss / pending policy -----------------
//
// A non-release build (dev / pre-release / vitest) MAY render English for a key the
// active locale has not translated yet (a registry-`pending` key): the dense table
// carries that English fill, so it renders with no special-casing. A RELEASE build
// must NEVER do that - the release CI gate asserts the pending set is empty, and
// t() additionally hard-fails on any pending key as a never-fires backstop, so
// English can never be silently shipped to a translated player. CONSEQUENCE: a
// non-release build that still carries pending keys MUST NOT be deployed.
//
// Release detection: Vite statically replaces `import.meta.env.PROD` (true for
// `vite build`, false for the dev server and vitest). Tests and the release build
// step can force release semantics with the `I18N_RELEASE=1` env var. Read lazily,
// on the cold (miss / pending) path only, so a test can flip it and the hot hit
// path pays nothing.
function isReleaseBuild(): boolean {
  try {
    if (typeof process !== "undefined" && process.env && process.env.I18N_RELEASE === "1") return true;
  } catch {
    // No `process` (browser runtime) - fall through to the build-time flag.
  }
  try {
    return (import.meta as { env?: { PROD?: boolean } }).env?.PROD === true;
  } catch {
    return false;
  }
}

// Keys each locale has NOT translated (the resolved table English-fills them).
// Empty while overlays stay dense; populated once a locale goes sparse. Built once
// from the generated `pending` lists. PENDING_TOTAL lets the hot path skip the
// per-key membership test entirely when nothing is pending (the common case).
const PENDING_SETS: Partial<Record<SupportedLanguage, ReadonlySet<string>>> = {};
let PENDING_TOTAL = 0;
for (const [lang, keys] of Object.entries(pending)) {
  PENDING_SETS[lang as SupportedLanguage] = new Set(keys);
  PENDING_TOTAL += keys.length;
}

// A key absent from the dense table is absent from `en` itself, so it is untracked
// by the registry (the PR gate - tsc for t() keys, s3_registered for matcher emits -
// rejects an unregistered key). Throw in dev/test so a typo'd or never-registered
// key surfaces immediately; on an (already-gated) release build, degrade to the raw
// key rather than crash a player's client mid-render.
function onUntrackedKey(key: string): string {
  if (!isReleaseBuild()) {
    throw new Error(`i18n: untracked key "${key}" is not in the translation table or registry`);
  }
  return key;
}

type ResolvedTable = (typeof translations)[SupportedLanguage];

// The dense table the current-language read paths resolve against. Normally
// translations[lang]; the en_XA pseudo table only when the dev pseudo-locale is
// active AND the requested locale is the current one (so an explicit read of some
// other locale is unaffected). en_XA is referenced solely inside the
// !import.meta.env.PROD branch, so a production build tree-shakes it away.
function tableFor(lang: SupportedLanguage): ResolvedTable {
  if (!import.meta.env.PROD && pseudoActive && lang === currentLanguage) {
    return en_XA;
  }
  return translations[lang];
}

export function t(key: TranslationKey, values?: InterpolationValues): string {
  const parts = key.split(".");
  let current: unknown = tableFor(currentLanguage);
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return onUntrackedKey(key);
    }
  }
  if (typeof current !== "string") return onUntrackedKey(key);
  if (PENDING_TOTAL > 0 && PENDING_SETS[currentLanguage]?.has(key) && isReleaseBuild()) {
    throw new Error(
      `i18n: key "${key}" is untranslated (pending) for locale "${currentLanguage}" on a release build; English must never ship to a translated player`,
    );
  }
  return interpolate(current, values);
}

function translationValue(key: string, lang: SupportedLanguage): string | null {
  const parts = key.split(".");
  let current: unknown = tableFor(lang);
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return typeof current === "string" ? current : null;
}

export function hasTranslation(key: string, lang: SupportedLanguage = currentLanguage): boolean {
  return translationValue(key, lang) !== null;
}

export function tOptional(key: string, values?: InterpolationValues, lang: SupportedLanguage = currentLanguage): string | null {
  const value = translationValue(key, lang);
  return value === null ? null : interpolate(value, values);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions, lang: SupportedLanguage = currentLanguage): string {
  return new Intl.NumberFormat(languageTag(lang), options).format(value);
}

export function formatDateTime(value: Date | number, options?: Intl.DateTimeFormatOptions, lang: SupportedLanguage = currentLanguage): string {
  return new Intl.DateTimeFormat(languageTag(lang), options).format(value);
}

export interface MoneyParts {
  gold: number;
  silver: number;
  copper: number;
}

export type MoneyDisplayStyle = "compact" | "long";

export function moneyParts(copper: number): MoneyParts {
  const safeCopper = Number.isFinite(copper) ? Math.max(0, Math.floor(copper)) : 0;
  return {
    gold: Math.floor(safeCopper / 10000),
    silver: Math.floor((safeCopper % 10000) / 100),
    copper: safeCopper % 100,
  };
}

export function formatMoney(copper: number, style: MoneyDisplayStyle = "compact"): string {
  const parts = moneyParts(copper);
  const unitKeys = style === "compact"
    ? {
      gold: "itemUi.money.goldShort",
      silver: "itemUi.money.silverShort",
      copper: "itemUi.money.copperShort",
    } satisfies Record<keyof MoneyParts, TranslationKey>
    : {
      gold: "itemUi.money.gold",
      silver: "itemUi.money.silver",
      copper: "itemUi.money.copper",
    } satisfies Record<keyof MoneyParts, TranslationKey>;
  const rows: { value: number; unit: TranslationKey }[] = [];
  if (parts.gold > 0) rows.push({ value: parts.gold, unit: unitKeys.gold });
  if (parts.silver > 0 || parts.gold > 0) rows.push({ value: parts.silver, unit: unitKeys.silver });
  if (parts.copper > 0 || rows.length === 0) rows.push({ value: parts.copper, unit: unitKeys.copper });
  return rows.map(({ value, unit }) => {
    const amount = formatNumber(value, { maximumFractionDigits: 0 });
    return style === "compact" ? `${amount}${t(unit)}` : `${amount} ${t(unit)}`;
  }).join(" ");
}
