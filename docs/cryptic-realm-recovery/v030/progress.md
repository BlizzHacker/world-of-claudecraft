# v0.30.0 one-jump merge — 141 of 201 resolved

Session 2026-07-27. Worktree `/opt/cr-measure` (detached at `b97c1789c`), merging
`upstream/main` = `23819a304` = **v0.30.0**. `npm install` done against upstream's
lockfile (347 added / 484 changed).

**141 of 201 conflicted files resolved. 60 remain: 57 interleaved, 3 near-trivial.**

## Reproducing

```
cd /opt/cr-measure
git merge --no-ff --no-commit upstream/main            # 201 conflicts
bash    docs/cryptic-realm-recovery/v030/mechanical.sh
python3 docs/cryptic-realm-recovery/v030/blockers.py
python3 docs/cryptic-realm-recovery/v030/merge-locales.py /opt/cr-measure /tmp/conf_oj_remaining.txt
bash    docs/cryptic-realm-recovery/v030/brand-verify.sh
python3 docs/cryptic-realm-recovery/v030/catalog-merge.py       # needs catalog-lib.py on sys.path
git checkout --ours -- src/ui/options_window.ts
python3 docs/cryptic-realm-recovery/v030/apply-rules.py /opt/cr-measure docs/cryptic-realm-recovery/v030/rules-batch1.txt
python3 docs/cryptic-realm-recovery/v030/apply-rules.py /opt/cr-measure docs/cryptic-realm-recovery/v030/rules-batch2.txt
python3 docs/cryptic-realm-recovery/v030/apply-rules.py /opt/cr-measure docs/cryptic-realm-recovery/v030/rules-batch3.txt
# then the two same-module import folds noted in rules-batch2/3 comments
bash    docs/cryptic-realm-recovery/v030/stage-resolved.sh
```

`apply-rules.py` resolves hunks structurally by rule (`ours`, `theirs`, `union`,
`union_unique`, `theirs_rebrand`), so there is no fragile text matching. Analysis
helpers: `triage.py` (classifies remaining files by which side contributes),
`hunk-summary.py` (per-hunk sizes plus a peek at both sides).

## Regressions caught and prevented

Each of these would have shipped silently:

1. **Locale overlays.** Ours hold **193 keys upstream lacks** (ladder/hardcore,
   MoveWeight SSO, downloads server, and the Derby / Homes / Boarpit / Skirmish
   NPCs) and **454 shared values carry Cryptic Realm branding** upstream reverts to
   "World of ClaudeCraft" in 20 languages. Union with ours winning; verified 0
   markers, 0 duplicate keys, 0 upstream keys dropped, all 20 parse.
2. **`$CR` → `WOC`.** `hud_chrome.ts` would have renamed the fork's Solana token
   across the wallet and daily-rewards UI. Kept `$CR`; **0 WOC leftovers**.
3. **Catalog comments.** Upstream added **787** translator comments to
   `hud_chrome.ts` alone. Merging on upstream's file as the base preserved all of
   them (787 / 191 / 22 / 54) while overlaying only real content differences — of
   1046 raw "differences" in `hud_chrome.ts`, only **18** were content; the rest
   was quote-style noise that a blanket "ours wins" would have fought.
4. **Upstream API changes inside fork blocks.** `world_api/dungeons.ts` and
   `world_api/interaction.ts` changed `void` → `WorldInteractionOutcome`. Blindly
   keeping ours would have reverted the signature and broken callers;
   `union_unique` takes upstream's signature and re-adds only our extra members.
5. **`.gitignore`.** Kept `chrome/`, `secrets/`, `public/cr-realms/` while gaining
   upstream's multibox block.
6. **`critters.ts`.** Upstream deletes it and ships a test asserting it is gone.
   Confirmed nothing imports it — the fork venues only name critters in
   decoration-exclusion comments — before accepting.
7. **73 upstream-brand strings** on newly-gained locale keys, rewritten to fork
   branding.

## Decisions worth revisiting

- **`src/ui/options_window.ts`: kept the fork version wholesale.** The fork inlined
  its own options IA (rail/detail, overview, quick actions, footer legend) —
  hunks 3–7 are ~1096 fork lines against 1–11 upstream lines each. Rebuilding that
  on upstream's rewritten window is a project in itself, and a botched job breaks
  the Esc menu and loses the customization / mods / arcforge / co-op launchers
  (verified still wired: 4 references). **Not yet re-ported:** upstream's
  `chatWindowResetRow`, its `framesRow`, its `markDialogRoot` registration, and
  its changed `renderBugReport` signature. Typecheck will surface anything that
  other merged code requires.
- **`src/guide/head.ts`: kept fork constants**, so upstream's `GITHUB_URL` is gone
  while ours defines `CONTRIBUTIONS_URL`. If upstream's unconflicted body
  references `GITHUB_URL`, typecheck will flag it.
- **`scripts/i18n_scan.mjs`: kept our `writeFileWithTransientRetry`** over
  upstream's `atomicWriteFileSync` — the retry wrapper exists because this host's
  filesystem is flaky. May leave upstream's import unused.
- Upstream's `dungeon` → `delve` rename is **adopted** where our text was not
  fork-branded, so some UI strings change from "Dungeon" to "Delve".

## The 60 that remain

Hardest first — these need per-hunk reading, roughly 250 hunks of judgment:

| File | hunks | ours / theirs |
|---|---|---|
| `src/main.ts` | 39 | 401 / 459 — deeply interleaved, the worst |
| `src/ui/hud.ts` | 21 | 1229 / 116 |
| `src/render/renderer.ts` | 19 | 109 / 236 |
| `tests/world_api_parity.test.ts` | 18 | 66 / 77 — counts must be re-derived |
| `src/sim/sim.ts` | 15 | 94 / 63 |
| `server/game.ts` | 12 | 73 / 112 |
| `index.html` | 12 | 77 / 146 |
| `tests/snapshots.test.ts` | 10 | 19 / 29 |
| `src/net/online.ts` | 9 | 107 / 70 |
| `server/main.ts` | 8 | 227 / 57 |
| `src/ui/char_window.ts` | 8 | 143 / 51 |
| `play.html` | 8 | 82 / 87 |
| `src/sim/sim_context.ts` | 7 | 44 / 64 |
| `src/ui/sim_i18n.newlocales.ts` | 7 | 14 / 295 |
| `src/sim/content/zone1.ts` | 6 | 165 / 101 |
| `src/world_api.ts` | 6 | 81 / 98 |
| + 44 more | | mostly 1–5 hunks each |

`src/sim/interaction.ts` needs specific care: upstream changed the function to
return `false`, and our 24-line hardcore-corpse block inside it uses bare
`return;` statements that must become `return false;`.

## Then

`npm run i18n:gen && npm run i18n:hash`, `UPDATE_PARITY=1 npm test`,
re-derive `command_schema` and `world_api_parity` counts by running them,
`npm run gate`, `npm run security:gate`, commit, branch, then deploy to
**`dev-claudecraft.crypticrealm.com`** before any live ring.

Gate with `--maxWorkers=3`: at host load 30+, `--maxWorkers=8` invents 4–11
different spurious timeout failures per run. `tests/recovery_manifest.test.ts`
fails by design off the recovery branch.
