# v0.30.0 one-jump merge — strategy change and current state

Session 2026-07-27. Worktree `/opt/cr-measure` (detached at `b97c1789c`),
merging `upstream/main` = `23819a304` = **v0.30.0**.

**103 of 201 conflicted files resolved. 98 remain, all genuine judgment.**

## Why the 8-step ladder was abandoned

Measured, not assumed:

| Route | Conflicted files |
|---|---|
| Step 1 of 8 alone (`v0.25.0`) | 135 |
| **One jump to `upstream/main` (v0.30.0)** | **201** |

The ladder would have cost roughly 1000+ resolutions, because the expensive files
conflict *again at every step* — `options_window.ts` (1100 lines),
`i18n.catalog/hud_chrome.ts` (2176), `src/main.ts` (977), `src/ui/hud.ts` (1408)
would each be re-resolved eight times, against intermediate states nobody ships.
One jump resolves every file **once, against the final target**. The ladder's only
real advantage was intermediate green checkpoints; that does not justify a ~5x
cost multiplier.

The abandoned step-1 work is not wasted: its resolutions were re-derived here,
and the `v0.25.0` worktree `/opt/cr-v030` is left untouched as a fallback.

## Reproducing this state

Deterministic — prefer this over the on-disk merge:

```
cd /opt/cr-measure                       # or a fresh worktree off the recovery line
git merge --no-ff --no-commit upstream/main      # 201 conflicts
bash    docs/cryptic-realm-recovery/upstream-v0.30.0-mechanical.sh
python3 docs/cryptic-realm-recovery/upstream-v0.30.0-blockers.py
python3 docs/cryptic-realm-recovery/upstream-v0.30.0-merge-locales.py /opt/cr-measure /tmp/conf_oj_remaining.txt
bash    docs/cryptic-realm-recovery/upstream-v0.30.0-brand-verify.sh
```

`node_modules` was copied from `/opt/cryptic-realm`; `package-lock.json` is
upstream's, so run `npm install` before any build or gate.

## Resolved so far

**81 mechanical.** 49 parity goldens, 23 i18n resolved-generated,
`content.generated`, `manifest.generated`, `package-lock` — all staged from
upstream as throwaway bytes **to be regenerated, never hand-merged**. Plus six
accepted upstream deletions:

- `src/render/critters.ts` — upstream removed ambient critters in `f31a1be67` and
  ships `tests/ambient_critters_removed.test.ts` asserting the module is gone.
  Fork venues (Derby, Boarpit, Homes) only mention critters in
  decoration-exclusion **comments**; nothing imports it, so no fork feature is
  lost. Verified before accepting.
- `src/ui/options_ia.ts`, `src/ui/options_mobile_shell.ts`,
  `tests/options_mobile_shell.test.ts` — the v0.24.1 revert of PR #1736.
- `src/ui/i18n.resolved.sha256`, `src/ui/i18n.status.summary.json` — upstream
  dropped both artifacts, so there is nothing to regenerate.

**2 blockers.** `package.json` (fork name kept, version `0.30.0-cr.1`, build
script unioned so upstream's `sfx:manifest` *and* our `assets:realms --skip-api`
both run, dependency versions from upstream since the lock is upstream's) and
`.gitattributes` (our deploy-critical `eol=lf` rules kept — CRLF breaks shebangs
and systemd units on the host — plus upstream's new linguist rule). A conflicted
`.gitattributes` makes git warn on every command, and a conflicted `package.json`
makes esbuild/vite fail before reading anything, so both had to go first.

**20 locale overlays**, via `upstream-v0.30.0-merge-locales.py`.

### The locale finding that mattered

Taking upstream wholesale would have silently destroyed fork translations, and a
naive key union would have failed the overlay tests. Measured first:

- our overlays hold **193 distinct keys upstream does not** — `auth.hardcoreChar`,
  `auth.ladderChar`, `auth.ssoMoveweight`, `auth.recovery.*`,
  `download.linuxCta`, `entities.npcs.race_marshal_pip` (Derby),
  `realtor_maribel` (Homes), `pit_master_grott` (Boarpit),
  `skirmish_builder`/`skirmish_footman`, fork mounts and abilities
- **454 shared-key values carry Cryptic Realm branding** that upstream's values
  would revert to "World of ClaudeCraft", across 20 languages

So the documented policy is right: union, **ours wins duplicates**. Result per
full locale: 5504 shared (ours) + 154–181 fork-only (kept) + 2149 upstream-new
(gained) = ~7807 keys. Verified: 0 conflict markers, 0 duplicate keys, all 20
files parse under esbuild, 0 upstream keys dropped, fork NPC/auth keys present.

These are *divergence-only* overlays whose keys must follow `en` leaf order
(enforced by `tests/i18n_overlay_key_membership.test.ts` plus a byte gate), so the
tool emits shared keys in upstream's order and re-inserts each side's exclusive
keys immediately after the shared key they followed in their own file. The
ordering test still has to confirm this once `i18n.catalog` is settled.

A branding sweep then rewrote **73** upstream-brand strings that arrived on
upstream-new keys (`wallet.browser.*` and friends) — left alone they would have
shipped "World of ClaudeCraft" into the fork UI in 20 languages.

## The 98 that remain

| Area | Files | Notes |
|---|---|---|
| `src/` non-i18n | 43 | incl. `options_window.ts` (7 hunks/1141), `src/main.ts` (39/977), `src/ui/hud.ts` (21/1408) |
| `tests/` non-parity | 25 | incl. `snapshots`, `world_api_parity` (12 hunks) |
| `server/` | 10 | incl. `server/main.ts` |
| other / html / branding | 14 | `index.html`, `play.html`, `public/*.html`, `scripts/` |
| `i18n.catalog` | 4 | incl. `hud_chrome.ts` (32 hunks/2176) — settle before `i18n:gen` |

Priority order: `i18n.catalog` (unblocks i18n regeneration) → `options_window.ts`
(re-port the Esc-menu launchers: customization, mods, arcforge, co-op, plus co-op
settings, 3D item previews, realm-family selector, downloads server, maintenance
overlay, ladder/hardcore) → `server/` and `src/` core → branding surfaces → tests.

## Counts that must be re-derived, never picked

`tests/command_schema.test.ts` and `tests/world_api_parity.test.ts` encode member
counts. Run them and take the actual numbers.

## Then

`npm install && npm run i18n:gen && npm run i18n:hash`,
`UPDATE_PARITY=1 npm test`, `npm run gate`, `npm run security:gate`, commit,
branch, deploy. `tests/recovery_manifest.test.ts` fails by design off the
recovery branch. Always gate with `--maxWorkers=3`: at host load 30+,
`--maxWorkers=8` invents 4–11 different spurious timeout failures per run.
