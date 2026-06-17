import { describe, it, expect } from "vitest";
import * as fs from "fs";
import path from "path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { en, supportedLanguages } from "../src/ui/i18n";
import { DICT as serverDICT } from "../src/ui/server_i18n";
import { DICT as simDICT } from "../src/ui/sim_i18n";
import { DICT as adminDICT } from "../src/admin/i18n";
// @ts-ignore - shared zero-dep JS hash helper (no .d.ts). The scanner uses the
// SAME module, so re-deriving hashes here is an independent check of the registry
// rather than a copy of the scanner's own arithmetic.
import { contentHash, placeholdersOf } from "../scripts/i18n_hash.mjs";

// src/ui/i18n.status.json is the generated per-key per-locale status
// registry (scripts/i18n_scan.mjs, regenerated in pretest). This suite is the
// registry-in-sync + reproducibility net: the registry must cover the whole key
// universe, every enHash must independently re-derive from the English source,
// the pending set must be empty while everything is dense, blocked rows must be
// load-bearing (no silent over-allow), the hash must move when the English text
// or its placeholder set changes, and the artifact must regenerate byte-identically.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryRel = "src/ui/i18n.status.json";
const registry: any = JSON.parse(fs.readFileSync(path.join(root, registryRel), "utf8"));
const NON_EN = supportedLanguages.filter((l) => l !== "en");

// Two-tier gate: the release tier runs with I18N_RELEASE_TIER=1 (see
// .github/workflows/ci.yml). An empty-`pending` set is a RELEASE guarantee, not a
// PR one - an English-only PR legitimately leaves keys pending - so that assertion
// runs release-only. Registry-in-sync (universe coverage, enHash re-derivation,
// reproducibility) stays at the PR tier.
const RELEASE_TIER = process.env.I18N_RELEASE_TIER === "1";

// Same object-vs-leaf rule as scripts/i18n_flatten.mjs (recurse PLAIN objects;
// arrays and non-objects are leaves), so the universe we expect matches the one
// the scanner walked.
function flatten(node: any, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const k of Object.keys(node)) {
    const v = node[k];
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out);
    else out[p] = v as string;
  }
  return out;
}

// The English source value for every key in the universe, keyed by the registry's
// "<scope>:<key>" composite. Built straight from the imported source objects.
function expectedUniverse(): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(flatten(en as any))) m.set(`main:${k}`, v);
  for (const [k, v] of Object.entries(simDICT.en)) m.set(`sim:${k}`, v as string);
  for (const [k, v] of Object.entries(serverDICT.en)) m.set(`server:${k}`, v as string);
  for (const [k, v] of Object.entries(adminDICT.en)) m.set(`admin:${k}`, v as string);
  return m;
}

const keyEntries = (): [string, any][] => Object.entries(registry.keys);

describe("i18n status registry: universe coverage", () => {
  it("has exactly one row per source key (en leaves + sim/server/admin DICT keys)", () => {
    const expected = expectedUniverse();
    const regKeys = new Set(Object.keys(registry.keys));
    const missing = [...expected.keys()].filter((k) => !regKeys.has(k));
    expect(missing.length, `registry is missing rows for: ${missing.slice(0, 10).join(", ")}`).toBe(0);
    const extra = [...regKeys].filter((k) => !expected.has(k));
    expect(extra.length, `registry has rows with no source key: ${extra.slice(0, 10).join(", ")}`).toBe(0);
    expect(registry.counts.keys).toBe(expected.size);
  });

  it("tracks exactly supportedLanguages minus en, in order", () => {
    expect(registry.locales).toEqual(NON_EN);
    for (const [, entry] of keyEntries()) {
      expect(Object.keys(entry.locales)).toEqual(NON_EN);
    }
  });
});

describe("i18n status registry: enHash re-derivation (independent)", () => {
  it("each enHash == contentHash(englishText, sortedPlaceholders) recomputed from source", () => {
    const expected = expectedUniverse();
    for (const [ck, enVal] of expected) {
      const row = registry.keys[ck];
      expect(row.enHash, `${ck} enHash mismatch`).toBe(contentHash(enVal, placeholdersOf(enVal)));
      expect(row.placeholders, `${ck} placeholders`).toEqual(placeholdersOf(enVal));
    }
  });
});

describe("i18n status registry: states", () => {
  // RELEASE-TIER ONLY. A `pending` key must never reach a cut release;
  // the release gate asserts the set is empty. At the PR tier a pending key is
  // LEGAL (English-only PRs), so this is skipped there. Today the set is empty at
  // both tiers because the overlays are still dense - this gate guards the future.
  it.runIf(RELEASE_TIER)("the pending set is empty (release tier: no untranslated key may ship)", () => {
    expect(registry.counts.pending).toBe(0);
    let pending = 0;
    for (const [, entry] of keyEntries())
      for (const row of Object.values<any>(entry.locales)) if (row.state === "pending") pending++;
    expect(pending).toBe(0);
  });

  it("counts are internally consistent and match a fresh re-tally", () => {
    const { keys, rows, translated, pending, blocked, blockedSource } = registry.counts;
    expect(rows).toBe(keys * NON_EN.length);
    expect(translated + pending + blocked).toBe(rows);
    expect(blockedSource).toBe(registry.blockedSource.length);
    let t = 0, p = 0, b = 0;
    for (const [, entry] of keyEntries())
      for (const row of Object.values<any>(entry.locales)) {
        if (row.state === "translated") t++;
        else if (row.state === "pending") p++;
        else if (row.state === "blocked") b++;
      }
    expect([t, p, b]).toEqual([translated, pending, blocked]);
  });

  it("every translated row is fresh (srcHash === enHash) and attributed (by human|agent)", () => {
    for (const [, entry] of keyEntries())
      for (const row of Object.values<any>(entry.locales)) {
        if (row.state !== "translated") continue;
        expect(row.srcHash).toBe(entry.enHash);
        expect(["human", "agent"]).toContain(row.by);
      }
  });
});

describe("i18n status registry: blocked rows are load-bearing (no over-allow)", () => {
  const dicts: Record<string, any> = { server: serverDICT, admin: adminDICT };

  it("every blocked server/admin row genuinely copies English (value === en) and has a reason", () => {
    for (const [ck, entry] of keyEntries()) {
      const ci = ck.indexOf(":");
      const scope = ck.slice(0, ci);
      const key = ck.slice(ci + 1);
      if (scope !== "server" && scope !== "admin") continue;
      for (const [loc, row] of Object.entries<any>(entry.locales)) {
        if (row.state !== "blocked") continue;
        expect(typeof row.reason === "string" && row.reason.trim().length > 0, `${ck} ${loc} blocked w/o reason`).toBe(true);
        const dict = dicts[scope];
        // A cognate is, by definition, a translation that equals English. If this
        // ever fails the seed has rotted: the value got translated, so the row
        // should be translated, not blocked (silent over-allow).
        expect(dict[loc]?.[key], `${ck} ${loc} is blocked but no longer copies English`).toBe(dict.en[key]);
      }
    }
  });

  it("only server/admin scopes carry blocked rows (main/sim carry none)", () => {
    for (const [ck, entry] of keyEntries()) {
      const scope = ck.slice(0, ck.indexOf(":"));
      if (scope === "server" || scope === "admin") continue;
      for (const row of Object.values<any>(entry.locales))
        expect(row.state, `${ck} unexpected blocked row in scope ${scope}`).not.toBe("blocked");
    }
  });

  it("every blockedSource entry is a unique sim-channel string with a reason", () => {
    const texts: string[] = registry.blockedSource.map((b: any) => b.text);
    expect(new Set(texts).size).toBe(texts.length);
    for (const b of registry.blockedSource) {
      expect(b.channel).toBe("sim");
      expect(typeof b.reason === "string" && b.reason.length > 0).toBe(true);
    }
  });
});

describe("i18n status registry: hash sensitivity (srcHash includes the placeholder set)", () => {
  it("changing the English text moves the hash", () => {
    expect(contentHash("You have {n} gold.")).not.toBe(contentHash("You have {n} silver."));
  });
  it("renaming a placeholder moves the hash", () => {
    expect(contentHash("Hello {name}")).not.toBe(contentHash("Hello {playerName}"));
  });
  it("the declared placeholder set feeds the hash independently of the text, and is order-independent", () => {
    expect(contentHash("X", ["a"])).not.toBe(contentHash("X", ["b"]));
    expect(contentHash("X", ["a", "b"])).toBe(contentHash("X", ["b", "a"]));
  });
});

describe("i18n status registry: reproducibility", () => {
  it("is committed (tracked by git) so the diff check below is meaningful", () => {
    expect(() =>
      execFileSync("git", ["ls-files", "--error-unmatch", "--", registryRel], { cwd: root, encoding: "utf8" }),
    ).not.toThrow();
  });

  it("regenerating src/ui/i18n.status.json leaves the committed file byte-identical", () => {
    execFileSync("node", [path.join(root, "scripts/i18n_scan.mjs")], { cwd: root, encoding: "utf8" });
    expect(() =>
      execFileSync("git", ["diff", "--exit-code", "--", registryRel], { cwd: root, encoding: "utf8" }),
    ).not.toThrow();
  });
});
