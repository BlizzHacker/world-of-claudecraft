// The admin catalog is under the overlay + registry + release-gate model.
//
// This suite proves the admin-specific guarantees that the shared i18n tests do
// not: the admin two-tier t() gate (English-only legal at the PR tier, hard-fail
// at release), the admin bundle stays SEPARATE (no game locale table imported),
// every admin overlay key is a real admin `en` key, every admin.html static
// data-i18n key is a real admin `en` key (so localizeStatic never throws on an
// untracked key), and the generated dense admin table is committed + reproducible.
//
// The shared admin contracts (DICT density, classLabel, copied-English, registry
// universe coverage incl. admin) live in tests/localization_fixes.test.ts (H3 /
// L7 / H3b / A1) and tests/i18n_status_registry.test.ts.

import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { en as adminEn } from "../src/admin/i18n.en";
import { es } from "../src/admin/i18n.locales/es";
import { es_ES } from "../src/admin/i18n.locales/es_ES";
import { fr_FR } from "../src/admin/i18n.locales/fr_FR";
import { fr_CA } from "../src/admin/i18n.locales/fr_CA";
import { en_CA } from "../src/admin/i18n.locales/en_CA";
import { it_IT } from "../src/admin/i18n.locales/it_IT";
import { de_DE } from "../src/admin/i18n.locales/de_DE";
import { zh_CN } from "../src/admin/i18n.locales/zh_CN";
import { zh_TW } from "../src/admin/i18n.locales/zh_TW";
import { ko_KR } from "../src/admin/i18n.locales/ko_KR";
import { ja_JP } from "../src/admin/i18n.locales/ja_JP";
import { pt_BR } from "../src/admin/i18n.locales/pt_BR";
import { ru_RU } from "../src/admin/i18n.locales/ru_RU";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminEnKeys = new Set(Object.keys(adminEn));

// --- The admin two-tier t() gate (mirrors tests/i18n_t_behavior.test.ts) --------
// The real admin `pending` set is non-empty (the chat-filter keys), but it
// is locale-specific, so to exercise the t() pending BRANCH deterministically we
// inject a synthetic pending key through the generated module - the same technique
// the game-client behavior test uses.
describe("admin t(): pending key (English-only legal at PR; hard-fail at release)", () => {
  const GEN = "../src/admin/i18n.resolved.generated";
  const SAMPLE = "__sampleAdminPendingKey";

  async function loadAdminWithPending() {
    vi.resetModules();
    vi.doMock(GEN, async () => {
      const actual = await vi.importActual<typeof import("../src/admin/i18n.resolved.generated")>(GEN);
      const FILL = "English fill {name}";
      return {
        ...actual,
        translations: {
          ...actual.translations,
          es: { ...actual.translations.es, [SAMPLE]: FILL },
          en: { ...actual.translations.en, [SAMPLE]: FILL },
        },
        pending: { ...actual.pending, es: [...(actual.pending.es ?? []), SAMPLE] },
      };
    });
    return await import("../src/admin/i18n");
  }

  afterEach(() => {
    delete process.env.I18N_RELEASE;
    vi.doUnmock(GEN);
    vi.resetModules();
  });

  it("renders the English fill on a non-release build (PR tier is English-only legal)", async () => {
    delete process.env.I18N_RELEASE;
    const mod = await loadAdminWithPending();
    mod.setAdminLanguage("es");
    expect(mod.t(SAMPLE, { name: "Aki" })).toBe("English fill Aki");
  });

  it("hard-fails on a release build (English must never ship to a translated operator)", async () => {
    process.env.I18N_RELEASE = "1";
    const mod = await loadAdminWithPending();
    mod.setAdminLanguage("es");
    expect(() => mod.t(SAMPLE)).toThrow(/pending/);
  });

  it("throws on an untracked key in dev/test (typo guard)", async () => {
    delete process.env.I18N_RELEASE;
    const mod = await loadAdminWithPending();
    mod.setAdminLanguage("en");
    expect(() => mod.t("totally.bogus.admin.key")).toThrow(/untracked key/);
    // a real key still resolves, so the guard is not blanket-throwing
    expect(mod.t("nav.overview")).toBe("Overview");
  });
});

// --- Bundle isolation: admin imports its OWN tables, never the game i18n ---------
describe("admin bundle stays separate from the game client", () => {
  const adminDir = path.join(root, "src/admin");
  // Recurse: the per-locale overlays live in src/admin/i18n.locales/, so a flat
  // readdir would miss a game-table import smuggled into an overlay file. Walk the
  // whole admin tree and check every .ts.
  const walkTs = (dir: string, rel = ""): string[] => {
    const out: string[] = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) out.push(...walkTs(path.join(dir, ent.name), r));
      else if (ent.name.endsWith(".ts")) out.push(r);
    }
    return out;
  };
  const files = walkTs(adminDir);

  it("no admin source file imports from outside src/admin/ (no game locale table)", () => {
    // sanity: the scan must reach the i18n.locales/ overlays, not just the top level.
    expect(files.length, "should recurse into i18n.locales/").toBeGreaterThan(15);
    expect(files.some((f) => f.startsWith("i18n.locales/")), "overlays must be scanned").toBe(true);
    const offenders: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(path.join(adminDir, f), "utf8");
      for (const m of src.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
        const spec = m[1];
        // Bare specifiers (node/npm) are fine; a relative escape out of src/admin/ is not.
        if (spec.startsWith("..")) offenders.push(`${f}: ${spec}`);
      }
    }
    expect(offenders, "admin must import only its own modules (src/ CLAUDE.md)").toEqual([]);
  });
});

// --- Every admin overlay key is a real admin `en` key (no phantom keys) ----------
describe("admin overlay keys are members of the admin en base", () => {
  const overlays: Record<string, Record<string, string>> = {
    es, es_ES, fr_FR, fr_CA, en_CA, it_IT, de_DE, zh_CN, zh_TW, ko_KR, ja_JP, pt_BR, ru_RU,
  };
  for (const [lang, overlay] of Object.entries(overlays)) {
    it(`${lang}: has no key outside the admin en base`, () => {
      const notInEn = Object.keys(overlay).filter((k) => !adminEnKeys.has(k)).sort();
      expect(notInEn).toEqual([]);
    });
  }
});

// --- admin.html static data-i18n keys are real admin en keys ---------------------
// localizeStatic() (src/admin/main.ts) feeds every [data-i18n]/[data-i18n-ph]
// attribute straight into the admin t(). An untracked attribute key would throw
// mid-render in dev (and the release backstop returns the raw key). Pin them here.
describe("admin.html data-i18n keys are all real admin en keys", () => {
  it("every static data-i18n key resolves (no untracked attribute key)", () => {
    const html = fs.readFileSync(path.join(root, "admin.html"), "utf8");
    const keys = new Set<string>();
    const re = /\bdata-i18n(?:-ph)?="([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) keys.add(m[1]);
    expect(keys.size, "sanity: admin.html should carry data-i18n keys").toBeGreaterThan(5);
    const notKey = [...keys].filter((k) => !adminEnKeys.has(k)).sort();
    expect(notKey, "admin.html data-i18n keys not in the admin en base (would throw/leak)").toEqual([]);
  });
});

// --- The generated dense admin table is committed + reproducible -----------------
describe("admin resolved table reproducibility", () => {
  const generatedRel = "src/admin/i18n.resolved.generated.ts";

  it("is committed (tracked by git) so the diff check below is meaningful", () => {
    expect(() =>
      execFileSync("git", ["ls-files", "--error-unmatch", "--", generatedRel], { cwd: root, encoding: "utf8" }),
    ).not.toThrow();
  });

  it("regenerating src/admin/i18n.resolved.generated.ts leaves the committed file byte-identical", () => {
    execFileSync("node", [path.join(root, "scripts/i18n_admin_build.mjs")], { cwd: root, encoding: "utf8" });
    expect(() =>
      execFileSync("git", ["diff", "--exit-code", "--", generatedRel], { cwd: root, encoding: "utf8" }),
    ).not.toThrow();
  });
});
