import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { localizeServerText, tServer, DICT as serverDICT } from "../src/ui/server_i18n";
import { localizeSimText, localizeSimAuraName, DICT as simDICT } from "../src/ui/sim_i18n";
import { DICT as adminDICT, classLabel, setAdminLanguage } from "../src/admin/i18n";
import { resolveReportTarget } from "../server/report_target";
import {
  setLanguage, supportedLanguages,
  en, es, es_ES, fr_FR, fr_CA, en_CA, it_IT, de_DE, zh_CN, zh_TW, ko_KR, ja_JP, pt_BR, ru_RU,
} from "../src/ui/i18n";
import { talentTranslationManifest, renderTalentManifestEntry, hasTalentTitleOverride } from "../src/ui/talent_i18n";
import { ABILITIES } from "../src/sim/data";

const locales: Record<string, any> = { en, es, es_ES, fr_FR, fr_CA, en_CA, it_IT, de_DE, zh_CN, zh_TW, ko_KR, ja_JP, pt_BR, ru_RU };
const ph = (s: string) => [...String(s).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort().join(",");

// --- The copied-English and v0.7-slash allow-lists are VIEWS over the
// generated status registry (src/ui/i18n.status.json, written by
// scripts/i18n_scan.mjs and regenerated in pretest), not hand-maintained Sets.
// COPIED_ALLOW = blocked server/admin cognate rows; ALLOW_V07_SLASH = the
// blockedSource sim entries (v0.7 slash-command strings that ship English). The
// registry is the single source of truth seeded from the former literal Sets. ---
const statusRegistry = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "src/ui/i18n.status.json"), "utf8"),
) as { keys: Record<string, any>; blockedSource: { channel: string; text: string }[] };
const COPIED_ALLOW: ReadonlySet<string> = (() => {
  const out = new Set<string>();
  for (const [ck, entry] of Object.entries(statusRegistry.keys)) {
    const ci = ck.indexOf(":");
    const scope = ck.slice(0, ci);
    const key = ck.slice(ci + 1);
    if (scope !== "server" && scope !== "admin") continue;
    for (const [loc, row] of Object.entries(entry.locales as Record<string, { state: string }>)) {
      if (row.state === "blocked") out.add(`${scope}::${loc}::${key}`);
    }
  }
  return out;
})();
const ALLOW_V07_SLASH: ReadonlySet<string> = new Set<string>(
  statusRegistry.blockedSource.filter((b) => b.channel === "sim").map((b) => b.text),
);

// Two-tier gate (see .github/workflows/ci.yml). The release tier runs with
// I18N_RELEASE_TIER=1. PR-tier checks (registration / key existence) run always;
// full-localization checks (s3_localized, the copied-English content guards) run
// release-only - an English-only PR is legal, so it must not have to localize every
// locale to pass the PR gate.
const RELEASE_TIER = process.env.I18N_RELEASE_TIER === "1";

// --- B1: the log-event path must localize server-sent friends/guild/who/world messages ---
describe("B1: server log-type messages localize through the log path", () => {
  it("all three hud matchers call AND return the localizeServerText fallback", () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), "src/ui/hud.ts"), "utf8");
    for (const fn of ["localizeSystemText", "localizeErrorText", "localizeLootText"]) {
      const start = src.indexOf(`private ${fn}(`);
      expect(start, `${fn} not found`).toBeGreaterThan(0);
      const body = src.slice(start, src.indexOf("\n  private ", start + 1));
      // Must both compute the fallback and return it (not just mention the symbol).
      expect(body, `${fn} must call localizeServerText`).toContain("localizeServerText(text)");
      expect(/const server = localizeServerText\(text\);\s*\n\s*if \(server !== null\) return server;/.test(body),
        `${fn} must return the localizeServerText result when non-null`).toBe(true);
    }
  });

  it("recognizes and localizes the actual server log-type messages in every locale", () => {
    const logMessages = [
      "Mira added to friends.",
      "Mira removed from friends.",
      "Bob has joined the guild.",
      "Bob has left the guild.",
      "Aldric is now the Guild Master of <Knights>.",
      "Mira has been removed from the guild by Bob.",
      "Bob is now Officer.",
      "You found the guild <Knights>! You are its Guild Master.",
      "You have left <Knights>.",
      "Mira has entered World of ClaudeCraft.",
      "Bob has left the world. (disconnected)",
      "Who: 3 players online on Stormforge.",
      "Who: 1 player online on Stormforge.",
      "Carl - level 12 warrior - Eastbrook Vale",
    ];
    for (const lang of supportedLanguages) {
      setLanguage(lang);
      for (const m of logMessages) {
        const out = localizeServerText(m);
        expect(out, `${lang}: "${m}" should be recognized`).not.toBeNull();
        if (lang !== "en" && lang !== "en_CA") expect(out, `${lang}: "${m}" should not stay English`).not.toBe(m);
      }
    }
    setLanguage("en");
  });
});

// --- L3 / L4: extra server-message coverage ---
describe("L3/L4: additional server-message coverage", () => {
  it("localizes the ignore-list-loading error in every locale", () => {
    const msg = "Your ignore list is still loading. Try /who again in a moment.";
    for (const lang of supportedLanguages) {
      setLanguage(lang);
      const out = localizeServerText(msg);
      expect(out, `${lang}`).not.toBeNull();
      if (lang !== "en" && lang !== "en_CA") expect(out, `${lang}`).not.toBe(msg);
    }
    setLanguage("en");
  });

  it("localizes the (combat) /who status flag", () => {
    setLanguage("es");
    const out = localizeServerText("Carl - level 12 warrior - Eastbrook Vale (combat)")!;
    expect(out).toContain("Carl");
    expect(out.toLowerCase()).not.toContain("(combat)");
    setLanguage("en");
  });
});

// --- H1: talent names never fall to raw word-substitution ---
describe("H1: every talent name resolves via override or ability name", () => {
  const abilityNames = new Set(Object.values(ABILITIES).map((a) => a.name));
  const nameEntries = talentTranslationManifest().filter((e) => e.field === "name");

  it("each talent name has an explicit override or is an ability name in every translated locale", () => {
    for (const lang of supportedLanguages) {
      if (lang === "en" || lang === "en_CA") continue;
      for (const e of nameEntries) {
        const ok = hasTalentTitleOverride(lang, e.source) || abilityNames.has(e.source);
        expect(ok, `${lang}: talent name "${e.source}" falls through to broken word-substitution`).toBe(true);
      }
    }
  });

  it("CJK talent names contain no leftover Latin words", () => {
    for (const lang of ["zh_CN", "zh_TW", "ja_JP", "ko_KR"] as const) {
      setLanguage(lang);
      for (const e of nameEntries) {
        const rendered = renderTalentManifestEntry(e);
        expect(/[A-Za-z]{2,}/.test(rendered), `${lang}: "${e.source}" -> "${rendered}" has leftover English`).toBe(false);
      }
    }
    setLanguage("en");
  });
});

// --- H2: game.* keeps required diacritics ---
describe("H2: game.* values keep required diacritics", () => {
  const stripped: Record<string, RegExp> = {
    es: /\b(Clasificacion|posicion|Campeon|Mitico|Especializacion|Maestria|Configuracion|Dano|cosmetica|maximo|proximamente|actualizacion|arbol|arboles|Aun)\b/,
    es_ES: /\b(Clasificacion|posicion|Campeon|Mitico|Especializacion|Maestria|Configuracion|Dano|cosmetica|maximo|proximamente|actualizacion|arbol|arboles|Aun)\b/,
    fr_FR: /\b(debloque|Reessayez|Eternel|Specialisation|Depenses|sauvegardee)\b/,
    fr_CA: /\b(debloque|Reessayez|Eternel|Specialisation|Depenses|sauvegardee)\b/,
    pt_BR: /\b(Posicao|Classificacao|Especializacao|Nivel|Voce|Funcao|nao)\b/,
    de_DE: /(naechsten|erhoeht|zurueck|Ueberschuss|Verfuegbar)/,
    // Italian: each listed form REQUIRES a final/internal accent in correct Italian
    // and has NO unaccented homograph, so a match means the diacritic was stripped.
    // (Deliberately excludes ambiguous forms like "abilita"/"necessita", which are
    // also valid unaccented 3rd-person verbs — "abilita il PvP" = "enables PvP".)
    it_IT: /\b(perche|piu|gia|citta|qualita|velocita|liberta|cosi|puo|universita|attivita|possibilita)\b/,
  };
  it("no accent-stripped forms remain in the game.* subtree", () => {
    for (const [lang, re] of Object.entries(stripped)) {
      const flat = JSON.stringify(locales[lang].game);
      const m = flat.match(re);
      expect(m, `${lang}: stripped form "${m?.[0]}" still present`).toBeNull();
    }
  });
});

// --- M1: quest narratives preserve {playerName} ---
describe("M1: quest narratives preserve {playerName}", () => {
  it("every locale keeps {playerName} wherever English uses it", () => {
    const enQuests = en.entities.quests as Record<string, any>;
    for (const lang of supportedLanguages) {
      const locQuests = locales[lang].entities.quests as Record<string, any>;
      for (const qid of Object.keys(enQuests)) {
        for (const field of ["text", "completion"] as const) {
          const ev = enQuests[qid]?.[field];
          if (typeof ev === "string" && ev.includes("{playerName}")) {
            const lv = locQuests[qid]?.[field];
            expect(typeof lv === "string" && lv.includes("{playerName}"), `${lang}.${qid}.${field} dropped {playerName}`).toBe(true);
          }
        }
      }
    }
  });
});

// --- H3: server_i18n + admin DICT completeness (the Record<string,string> dicts lack : typeof en) ---
describe("H3: DICT key parity, non-empty values, placeholder integrity", () => {
  function checkDict(dict: Record<string, Record<string, string>>, label: string) {
    const enKeys = Object.keys(dict.en);
    // Every supported locale must be PRESENT in the DICT (iterating Object.keys(dict)
    // alone would silently pass a DICT that is simply missing a locale).
    for (const lang of supportedLanguages) {
      expect(Object.prototype.hasOwnProperty.call(dict, lang), `${label} missing locale ${lang}`).toBe(true);
    }
    for (const lang of Object.keys(dict)) {
      expect(Object.keys(dict[lang]).length, `${label} ${lang} key count`).toBe(enKeys.length);
      for (const k of enKeys) {
        const v = dict[lang][k];
        expect(typeof v === "string" && v.trim().length > 0, `${label} ${lang}.${k} empty/missing`).toBe(true);
        expect(ph(v), `${label} ${lang}.${k} placeholders`).toBe(ph(dict.en[k]));
      }
    }
  }
  it("server_i18n DICT is complete across all locales", () => checkDict(serverDICT as any, "server"));
  it("admin DICT is complete across all locales", () => checkDict(adminDICT as any, "admin"));

  it("L7: no admin DICT value contains raw HTML markup", () => {
    for (const lang of Object.keys(adminDICT)) {
      for (const [k, v] of Object.entries((adminDICT as any)[lang])) {
        expect(/[<>]/.test(v as string), `admin ${lang}.${k} contains < or >`).toBe(false);
      }
    }
  });

  // H3b: copied-English guard — checkDict above never compares a value to English,
  // so untranslated/copied English would pass. This catches NEW copied-English while
  // allowing a fixed set of legitimate cognates / brand / borrowed terms / format strings.
  // COPIED_ALLOW is a VIEW over the status registry (declared at module scope
  // near the top of this file): the blocked server/admin cognate rows.
  function checkNoCopiedEnglish(dict: Record<string, Record<string, string>>, label: string) {
    const en = dict.en;
    for (const lang of Object.keys(dict)) {
      if (lang === "en" || lang === "en_CA") continue;
      for (const k of Object.keys(en)) {
        const v = dict[lang][k];
        if (v !== en[k]) continue;
        const letters = (v.match(/[A-Za-z]/g) || []).length;
        const onlyPh = v.replace(/\{[^}]*\}/g, "").replace(/[^A-Za-z]/g, "").length === 0;
        if (letters < 4 || onlyPh || (!/\s/.test(v.trim()) && letters < 6)) continue;
        const id = `${label}::${lang}::${k}`;
        expect(COPIED_ALLOW.has(id), `${id} copies English ("${v}") and is not allowlisted — translate it or allowlist if a genuine cognate`).toBe(true);
      }
    }
  }
  // RELEASE-TIER ONLY: copied-English is a release-quality bar, not a PR
  // one. An English-only PR (or a sparse locale) legitimately ships English for an
  // untranslated key; that becomes a `pending` row and is blocked at the release
  // gate, not flagged on every PR.
  it.runIf(RELEASE_TIER)("H3b: server DICT has no un-allowlisted copied-English", () => checkNoCopiedEnglish(serverDICT as any, "server"));
  it.runIf(RELEASE_TIER)("H3b: admin DICT has no un-allowlisted copied-English", () => checkNoCopiedEnglish(adminDICT as any, "admin"));
});

// --- H1b: no two talents in the same class tree may render with the same name ---
describe("H1b: talent names are unique within a class tree", () => {
  const nameEntries = talentTranslationManifest().filter((e) => e.field === "name");
  it("has zero same-tree name collisions in any translated locale", () => {
    for (const lang of supportedLanguages) {
      if (lang === "en" || lang === "en_CA") continue;
      setLanguage(lang);
      const perClass = new Map<string, Map<string, Set<string>>>();
      for (const e of nameEntries) {
        const rendered = renderTalentManifestEntry(e);
        const cls = (e as any).classId as string;
        if (!perClass.has(cls)) perClass.set(cls, new Map());
        const m = perClass.get(cls)!;
        if (!m.has(rendered)) m.set(rendered, new Set());
        m.get(rendered)!.add(e.source);
      }
      for (const [cls, m] of perClass) {
        for (const [rendered, sources] of m) {
          expect(sources.size, `${lang} ${cls}: "${rendered}" used by [${[...sources].join(", ")}]`).toBe(1);
        }
      }
    }
    setLanguage("en");
  });
});

// --- M1b: /who status flags localize at the FRAGMENT level (not just whole-string) ---
describe("M1b: /who status flags localize within the row", () => {
  const statuses: [string, string][] = [
    ["combat", "who.statusCombat"], ["dead", "who.statusDead"], ["dungeon", "who.statusDungeon"], ["afk", "who.statusAfk"],
  ];
  it("localizes combat/dead/dungeon/afk inside the /who row in every locale", () => {
    for (const lang of supportedLanguages) {
      setLanguage(lang);
      for (const [flag, key] of statuses) {
        const out = localizeServerText(`Carl - level 12 warrior - Eastbrook Vale (${flag})`);
        expect(out, `${lang}: "(${flag})" row not recognized`).not.toBeNull();
        const localized = tServer(key);
        expect(out!.includes(`(${localized})`), `${lang}: ${flag} -> expected "(${localized})" in "${out}"`).toBe(true);
        if (localized !== flag) {
          expect(out!.includes(`(${flag})`), `${lang}: English "(${flag})" leaked in "${out}"`).toBe(false);
        }
      }
    }
    setLanguage("en");
  });
});

// --- M1c: entity quest + NPC greeting strings keep their FULL placeholder set ---
describe("M1c: entity strings preserve every placeholder (incl {className})", () => {
  const phSet = (s: string) => new Set([...String(s).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]));
  function checkFields(enRoot: Record<string, any>, getLoc: (lang: string) => Record<string, any>, kind: string, fields: string[]) {
    for (const lang of supportedLanguages) {
      const loc = getLoc(lang);
      for (const id of Object.keys(enRoot)) {
        for (const field of fields) {
          const ev = enRoot[id]?.[field];
          if (typeof ev !== "string") continue;
          const enPh = phSet(ev);
          if (enPh.size === 0) continue;
          const lv = loc[id]?.[field];
          const lvPh = phSet(typeof lv === "string" ? lv : "");
          for (const p of enPh) {
            expect(lvPh.has(p), `${lang} ${kind}.${id}.${field} dropped {${p}} (has [${[...lvPh].join(",")}])`).toBe(true);
          }
        }
      }
    }
  }
  it("quests keep text/completion placeholders", () => {
    checkFields(en.entities.quests as any, (l) => locales[l].entities.quests as any, "quest", ["text", "completion"]);
  });
  it("NPC greetings keep {className}/{playerName}", () => {
    checkFields(en.entities.npcs as any, (l) => locales[l].entities.npcs as any, "npc", ["greeting"]);
  });
});

// --- H4b: every shipped talent name resolves via override or ability, and renders
// non-empty & (for non-en) differs from English unless a deliberate cognate override. ---
describe("H4b: talent-name resolution is complete (no silent English fallthrough)", () => {
  const abilityNames = new Set(Object.values(ABILITIES).map((a) => a.name));
  const nameEntries = talentTranslationManifest().filter((e) => e.field === "name");
  it("renders non-empty for every name in every locale and never word-salads a new name", () => {
    for (const lang of supportedLanguages) {
      setLanguage(lang);
      for (const e of nameEntries) {
        const rendered = renderTalentManifestEntry(e);
        expect(rendered.trim().length, `${lang}: "${e.source}" rendered empty`).toBeGreaterThan(0);
        if (lang !== "en" && lang !== "en_CA") {
          // must resolve via an explicit override or be an ability name (which tEntity localizes)
          const resolved = hasTalentTitleOverride(lang, e.source) || abilityNames.has(e.source);
          expect(resolved, `${lang}: "${e.source}" has no override and is not an ability name (would fall through to raw English)`).toBe(true);
        }
      }
    }
    setLanguage("en");
  });
});

// --- S1: sim-emitted log/error/loot text localizes (HIGH-3). These strings originate
// in src/sim/sim.ts as SimEvent text and are re-localized client-side by sim_i18n via
// the hud matchers. Each MUST be recognized (non-null) and not stay English. ---
describe("S1: sim event-text pipeline is localized in every locale", () => {
  // Concrete samples of the previously-leaking sim emissions (byte-identical templates
  // with realistic substitutions). If sim.ts wording drifts from sim_i18n, these fail.
  const samples = [
    "Talents updated.",
    "Talents reset.",
    "You cannot equip that.",
    "Equipped Worn Shortsword.",
    "You quaff Minor Healing Potion.",
    "No fish are biting.",
    "You sit down to eat.",
    "You sit down to drink.",
    "That potion is not ready yet.",
    "You are already at full health.",
    "Nothing to restore.",
    "There is no merchant nearby.",
    "You cannot sell quest items.",
    "It is nailed shut.",
    "You are already in a party.",
    "You are not the party leader.",
    "You must be in a party to use raid markers.",
    "The /who roster is available in online play.",
    "The bout is decided. Returning to the world…",
    'Saved build "PvP".',
    'Loadout "PvP" applied.',
    'Deleted build "PvP".',
    "You may choose a specialization at level 10.",
    "You can save at most 5 loadouts.",
    "You have prestiged! Prestige Rank 2.",
    "You dismiss Forest Wolf.",
    "Forest Wolf is now your loyal companion.",
    "Forest Wolf dies.",
    "Forest Wolf becomes enraged!",
    "Forest Wolf calls for aid!",
    "Discarded Linen Scrap.",
    "Discarded Linen Scrap x3.",
    "Aki wins Worn Shortsword (87)",
    "Aki leaves the party.",
    "Aki has left the party.",
    "Aki has been removed from the party.",
  ];
  it("recognizes and localizes every sim emission in every locale", () => {
    for (const lang of supportedLanguages) {
      setLanguage(lang);
      for (const s of samples) {
        const out = localizeSimText(s);
        expect(out, `${lang}: sim text "${s}" not recognized (would leak raw English)`).not.toBeNull();
        if (lang !== "en" && lang !== "en_CA") {
          expect(out, `${lang}: sim text "${s}" stayed English`).not.toBe(s);
        }
      }
    }
    setLanguage("en");
  });

  it("localizes embedded item and mob names inside sim text", () => {
    setLanguage("de_DE");
    expect(localizeSimText("Equipped Worn Shortsword.")).not.toContain("Worn Shortsword");
    expect(localizeSimText("Forest Wolf dies.")).not.toContain("Forest Wolf");
    setLanguage("en");
  });

  it("localizes the flavor aura name Tamed and reuses talent/ability titles", () => {
    setLanguage("de_DE");
    expect(localizeSimAuraName("Tamed")).not.toBeNull();
    expect(localizeSimAuraName("Tamed")).not.toBe("Tamed");
    expect(localizeSimAuraName("not-an-aura")).toBeNull();
    setLanguage("en");
  });
});

// --- S2: sim_i18n DICT parity (typed, but assert at runtime too) ---
describe("S2: sim_i18n DICT is complete across all locales", () => {
  it("every supported locale present with full key + placeholder parity", () => {
    const enKeys = Object.keys(simDICT.en);
    for (const lang of supportedLanguages) {
      expect(Object.prototype.hasOwnProperty.call(simDICT, lang), `sim DICT missing locale ${lang}`).toBe(true);
      expect(Object.keys((simDICT as any)[lang]).length, `sim ${lang} key count`).toBe(enKeys.length);
      for (const k of enKeys) {
        const v = (simDICT as any)[lang][k];
        expect(typeof v === "string" && v.trim().length > 0, `sim ${lang}.${k} empty/missing`).toBe(true);
        expect(ph(v), `sim ${lang}.${k} placeholders`).toBe(ph((simDICT as any).en[k]));
      }
    }
  });
});

// --- R1: report-error matcher keys MUST byte-match the server's actual emissions
// (HIGH-2). The server emits lowercase / no trailing period; the hud keyByMessage must
// contain those exact bytes or every report failure shows the generic fallback. ---
describe("R1: report-target errors map to the server's exact emitted bytes", () => {
  it("server report-target error strings appear verbatim as hud localizeReportError keys", async () => {
    const offline = await resolveReportTarget({ targetPid: 1 }, {
      reportTargetForPid: () => null,
      findCharacterReportTargetByName: async () => null,
    });
    const notFound = await resolveReportTarget({ targetCharacterName: "Ghost" }, {
      reportTargetForPid: () => null,
      findCharacterReportTargetByName: async () => null,
    });
    const invalid = await resolveReportTarget({}, {
      reportTargetForPid: () => null,
      findCharacterReportTargetByName: async () => null,
    });
    const serverErrors = [offline, notFound, invalid].map((r) => (r.ok ? "" : r.error));

    const hudSrc = fs.readFileSync(path.resolve(process.cwd(), "src/ui/hud.ts"), "utf8");
    const start = hudSrc.indexOf("keyByMessage: Record<string, TranslationKey> = {");
    const body = hudSrc.slice(start, hudSrc.indexOf("};", start));
    const keys = new Set([...body.matchAll(/(^|\n)\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*:/g)].map((m) => m[2].slice(1, -1)));

    for (const err of serverErrors) {
      expect(keys.has(err), `report error "${err}" is not a localizeReportError key (would fall to generic hud.report.failed)`).toBe(true);
    }
  });
});

// --- A1: admin class column is localized (MED-5) ---
describe("A1: admin classLabel localizes the raw class id", () => {
  const classIds = ["warrior", "paladin", "hunter", "rogue", "priest", "shaman", "mage", "warlock", "druid"];
  it("returns a non-id localized label for every class in every locale", () => {
    for (const lang of supportedLanguages) {
      setAdminLanguage(lang);
      for (const id of classIds) {
        const label = classLabel(id);
        expect(label.trim().length, `${lang}.${id}`).toBeGreaterThan(0);
        if (lang !== "en" && lang !== "en_CA") {
          expect(label, `${lang}: class "${id}" not localized`).not.toBe(id);
        }
      }
      // unknown id falls back to the raw id
      expect(classLabel("not-a-class")).toBe("not-a-class");
    }
    setAdminLanguage("en");
  });
});

// --- S3: DRIFT GUARD — enumerate EVERY player-facing emit in src/sim/sim.ts and prove
// each is recognized by the real client matcher for its event type. Unlike S1 (a curated
// sample), this parses sim.ts at test time, so a NEW unhandled `text:`/this.error string
// fails CI automatically. Routes through the real hud arm matchers (extracted from
// hud.ts source) + the real localizeServerText/localizeSimText fallbacks. ---
describe("S3: every sim.ts emit is recognized (drift guard)", () => {
  const hudSrc = fs.readFileSync(path.resolve(process.cwd(), "src/ui/hud.ts"), "utf8");
  const simSrc = fs.readFileSync(path.resolve(process.cwd(), "src/sim/sim.ts"), "utf8");

  const armBody = (name: string): string => {
    const start = hudSrc.indexOf(`private ${name}(text: string): string {`);
    if (start < 0) throw new Error(`arm ${name} not found`);
    let depth = 0, i = hudSrc.indexOf("{", start);
    for (; i < hudSrc.length; i++) { if (hudSrc[i] === "{") depth++; else if (hudSrc[i] === "}") { depth--; if (depth === 0) break; } }
    return hudSrc.slice(start, i + 1);
  };
  const armRegexes = (body: string): RegExp[] => {
    const out: RegExp[] = []; const re = /\/((?:\\.|[^/\\\n])+)\/([gimsuy]*)\.exec\(text\)/g; let m: RegExpExecArray | null;
    while ((m = re.exec(body))) { try { out.push(new RegExp(m[1], m[2].replace("g", ""))); } catch { /* skip */ } }
    return out;
  };
  const armExactKeys = (body: string): Set<string> => {
    const keys = new Set<string>(); const re = /(?:^|\n)\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*:/g; let m: RegExpExecArray | null;
    while ((m = re.exec(body))) { try { keys.add(JSON.parse(m[1][0] === "'" ? `"${m[1].slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"` : m[1])); } catch { keys.add(m[1].slice(1, -1)); } }
    return keys;
  };
  const arms: Record<string, { exact: Set<string>; regs: RegExp[] }> = {};
  for (const n of ["localizeErrorText", "localizeSystemText", "localizeLootText"]) { const b = armBody(n); arms[n] = { exact: armExactKeys(b), regs: armRegexes(b) }; }

  const sub = (expr: string): string => {
    const tern = expr.match(/\?\s*'([^']*)'\s*:\s*'([^']*)'/);
    if (tern) return tern[1] || tern[2];
    if (/\?[^:]*:/.test(expr)) return "";
    if (/rank|level|count|players|roll|prestige|amount|seconds|percent|\bN\b|MAX_|FIRST_|threshold|number|\.length|Math|round|parseInt|\*\s*100|suggested/i.test(expr)) return "5";
    if (/money|copper|formatMoney|payout|proceeds|price|ask|sellValue/i.test(expr)) return "5s";
    return "Aki";
  };
  const concrete = (tmpl: string): string => tmpl.replace(/\$\{([^}]*)\}/g, (_m, e) => sub(e));

  // `${verb}` holds a whole clause (leaves/has left/has been removed from the party),
  // each concrete form covered by a sim_i18n RULE — not representable by one substitution.
  const TMPL_SKIP = [/\$\{verb\}/];
  // Intentional-English backstops: deterministic-sim talent-build VALIDATION diagnostics
  // (reasons originate in content/talents.ts and behave like code diagnostics). The
  // normal talent-panel flow uses the localized buildInvalid message instead.
  const ALLOW = [/^Loadout invalid:/];
  // v0.7 in-game slash-command + diagnostic status feature (/target, /xp, /auto, /pet,
  // /threat, /arena, /channel, /follow, /played, /move, /mana, /combat, /bags, /party,
  // /zones, /dungeons, /overpower, /form, ...), the dev commands, and a few v0.7-new mob
  // combat-log lines. This whole surface postdates PR #380's base, so its sim_i18n matcher
  // has no rules for it; these ship English as a documented backstop pending a dedicated
  // v0.7 slash-command localization pass (follow-up). The S3 guard stays fully active for
  // every combat/quest/loot/party/system string that PR #380 actually localized — so a
  // regression in the localized surface still fails here. Strings below are the guard's
  // concrete (placeholder-substituted) forms.
  // ALLOW_V07_SLASH is a VIEW over the status registry (declared at module scope
  // near the top of this file): the blockedSource sim entries. The big comment
  // above documents why these v0.7 slash-command strings ship English for now.

  type Cand = { type: "log" | "error" | "loot"; tmpl: string };
  const extract = (): Cand[] => {
    const cands: Cand[] = [];
    const lit = "(`[^`]*`|'(?:[^'\\\\]|\\\\.)*'|\"(?:[^\"\\\\]|\\\\.)*\")";
    const unq = (s: string) => s.slice(1, -1);
    let m: RegExpExecArray | null;
    const e1 = new RegExp(`emit\\(\\{[^}]*?type:\\s*'(log|loot)'[^}]*?text:\\s*${lit}`, "gs");
    while ((m = e1.exec(simSrc))) cands.push({ type: m[1] as Cand["type"], tmpl: unq(m[2]) });
    const e2 = new RegExp(`emit\\(\\{[^}]*?text:\\s*${lit}[^}]*?type:\\s*'(log|loot)'`, "gs");
    while ((m = e2.exec(simSrc))) cands.push({ type: m[2] as Cand["type"], tmpl: unq(m[1]) });
    const er = new RegExp(`this\\.error\\([^,]+,\\s*${lit}\\s*\\)`, "g");
    while ((m = er.exec(simSrc))) cands.push({ type: "error", tmpl: unq(m[1]) });
    const rr = new RegExp(`return\\s+${lit};`, "g");
    while ((m = rr.exec(simSrc))) { const t = unq(m[1]); if (/^[A-Z].* .*[.!?]$/.test(t) || /^[A-Z].*\$\{/.test(t)) cands.push({ type: "error", tmpl: t }); }
    const seen = new Set<string>();
    return cands.filter((c) => { const k = c.type + " " + c.tmpl; if (seen.has(k)) return false; seen.add(k); return true; });
  };
  const recognized = (type: Cand["type"], s: string): boolean => {
    const arm = arms[type === "error" ? "localizeErrorText" : type === "loot" ? "localizeLootText" : "localizeSystemText"];
    if (arm.exact.has(s)) return true;
    for (const r of arm.regs) { r.lastIndex = 0; if (r.test(s)) return true; }
    return localizeServerText(s) !== null || localizeSimText(s) !== null;
  };
  // The localized form IF a real server/sim matcher resolves it (locale-sensitive
  // output). Strings handled only by a hud-local arm map localize via the hud's own
  // t() keys and have no reachable output here, so they return null and s3_localized
  // checks recognition for them rather than the rendered text.
  const localizedOut = (s: string): string | null => {
    const srv = localizeServerText(s);
    if (srv !== null) return srv;
    return localizeSimText(s);
  };

  // The non-skipped candidate emit strings, deduped (shared by both tiers).
  const candidateStrings = (): { type: Cand["type"]; s: string }[] => {
    const out: { type: Cand["type"]; s: string }[] = [];
    for (const c of extract()) {
      if (TMPL_SKIP.some((re) => re.test(c.tmpl))) continue;
      const s = concrete(c.tmpl);
      if (ALLOW.some((re) => re.test(s))) continue;
      if (ALLOW_V07_SLASH.has(s)) continue;
      out.push({ type: c.type, s });
    }
    return out;
  };

  // PR TIER: every emit maps to a registered key OR RULE (recognition is
  // locale-independent, so registration is proven once, in en).
  it("s3_registered: every sim.ts emit maps to a registered key/RULE (PR tier)", () => {
    setLanguage("en");
    const cands = candidateStrings();
    expect(cands.length, "sanity: should enumerate many emit sites").toBeGreaterThan(80);
    const leaks: string[] = [];
    for (const { type, s } of cands) {
      if (!recognized(type, s)) leaks.push(`(${type}) ${JSON.stringify(s)}`);
    }
    setLanguage("en");
    expect(leaks, "unregistered sim emit strings (add a key/RULE to sim_i18n.ts)").toEqual([]);
  });

  // RELEASE TIER: the same coverage across all 14 locales, and where a real matcher
  // resolves the string, its localized form is not raw English in any translated
  // locale (no silently-shipped English).
  it.runIf(RELEASE_TIER)("s3_localized: every emit is recognized in all 14 locales and not left English where a matcher resolves it", () => {
    const cands = candidateStrings();
    expect(cands.length, "sanity: should enumerate many emit sites").toBeGreaterThan(80);
    const leaks: string[] = [];
    for (const lang of supportedLanguages) {
      setLanguage(lang);
      for (const { type, s } of cands) {
        if (!recognized(type, s)) {
          leaks.push(`${lang} (${type}) ${JSON.stringify(s)} not recognized`);
          continue;
        }
        if (lang === "en" || lang === "en_CA") continue;
        const out = localizedOut(s);
        if (out !== null && out === s) leaks.push(`${lang} (${type}) ${JSON.stringify(s)} stayed English`);
      }
    }
    setLanguage("en");
    expect(leaks, "sim emit strings unlocalized in some locale").toEqual([]);
  });
});
