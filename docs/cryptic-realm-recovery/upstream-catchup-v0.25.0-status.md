# v0.25.0 merge — step 1 of 8, in progress

Session 2026-07-26/27. Worktree `/opt/cr-v030`, branch
`codex/upstream-catchup-v0.30.0`.

**92 of 135 conflicted files resolved. 43 files / 138 hunks remain.**

The branch was first merged up to the current recovery line (`4a7d3bfac`), so the
claudecraft creature bank and the realm_config closeout travel through the ladder
rather than being stranded behind it. Verified: `realm_claudecraft_` is present in
`src/render/characters/manifest.ts` on this branch.

## Reproducing the current state from scratch

The in-progress merge lives in the worktree, but it is fully reproducible — prefer
this over trusting on-disk state:

```
cd /opt/cr-v030
git merge --no-ff --no-commit v0.25.0            # 135 conflicts
bash  docs/cryptic-realm-recovery/upstream-catchup-v0.25.0-resolve-mechanical.sh
python3 docs/cryptic-realm-recovery/upstream-catchup-v0.25.0-resolve-small.py
python3 docs/cryptic-realm-recovery/upstream-catchup-v0.25.0-resolve-small2.py
```

`node_modules` was copied from `/opt/cryptic-realm` (identical `package-lock.json`
at the merge base) rather than installed. `package-lock.json` is staged from
upstream, so run `npm install` before any gate.

## What was resolved, and on what grounds

**Mechanical, 78 files** (`resolve-mechanical.sh`). Generated files are staged
from upstream as throwaway bytes and MUST be regenerated, never hand-merged:

| Category | Files | Resolution |
|---|---|---|
| `tests/parity/*` | 49 | upstream, then `UPDATE_PARITY=1 npm test` |
| `src/ui/i18n.resolved.generated/*` | 23 | upstream, then `npm run i18n:gen && npm run i18n:hash` |
| `src/guide/content.generated.ts` | 1 | upstream, then `npm run wiki:content` |
| `src/render/assets/manifest.generated.ts` | 1 | upstream, then `npm run assets:realms` |
| `package-lock.json` | 1 | upstream, then `npm install` |
| `src/ui/i18n.resolved.sha256`, `i18n.status.summary.json` | 2 | upstream, then regenerate |
| options-window revert | 3 | **accepted upstream's deletion** |

The three deletions are `src/ui/options_ia.ts`, `src/ui/options_mobile_shell.ts`
and `tests/options_mobile_shell.test.ts`. Upstream v0.24.1 reverted PR #1736,
which those files were built on; the v0.26.0 intake set the precedent of deleting
both and re-porting Cryptic features onto upstream's options window. That
re-porting is the main outstanding work in `options_window.ts` below.

**Judgment, 14 files** (`resolve-small.py`, `resolve-small2.py`). All were
independent-addition collisions resolved by keeping both sides, except:

- `src/render/characters/visual.ts` — upstream's VFX-mesh guard now **wraps** our
  `originalVisibility` tracking instead of replacing it; dropping either would
  lose a feature.
- `src/ui/bank_window.ts` — **upstream wins.** `bank-count` is styled at
  `src/styles/components.css:4904`; our `item-cell-count` is referenced by no
  stylesheet, so the fork was rendering that count unstyled. Our touch/peek
  comment is kept.
- `src/ui/i18n.catalog/guide.ts` — fork branding wins on `rights`
  (`Cryptic Realm`); upstream's new `linksLabel` key is additive and kept.
- `src/sim/types.ts` — `godmode` (ours, admin) and `devGod` (upstream, dev cheat)
  are deliberately separate flags; both kept.
- Import order follows module-path sort so biome stays quiet.

## Two counts deliberately left wrong

- `tests/command_schema.test.ts` — kept ours (165 / 174). The true value is the
  merged command set and cannot be picked from either side; run the test and take
  the actual numbers.
- `tests/world_api_parity.test.ts` — 12 hunks of member counts, same problem.

Both were flagged as follow-ups by the v0.26.0 intake too.

## Remaining 43 files, in the order worth doing them

**1. Locale overlays, 11 files.** `es_ES fr_CA fr_FR id_ID ja_JP ko_KR ru_RU
tr_TR vi_VN zh_CN zh_TW`. Policy is key-level union, ours wins duplicates — but
these are *divergence-only overlays*: a key equal to the parent locale must NOT
be present, and keys must follow `en` leaf order. Both rules are enforced by
`tests/i18n_overlay_key_membership.test.ts` plus a byte gate, so a naive union
will fail. This needs a real tool: union → re-sort into `en` leaf order → drop
keys whose value equals the parent. Do not hand-merge 363 lines of `fr_FR`.

**2. `src/ui/options_window.ts`, 7 hunks / 1100 lines.** The big one. Upstream's
structure wins; the Cryptic Esc-menu launchers (customization, mods, arcforge,
co-op), co-op settings, 3D item previews, realm-family selector, downloads
server, maintenance overlay and ladder/hardcore entries must be re-ported onto
it. This is the item the v0.26.0 intake also left open.

**3. `src/ui/i18n.catalog/hud_chrome.ts`, 13 hunks / 467 lines.** Catalog keys;
union with fork branding preserved. Drives i18n regeneration, so settle it before
running `i18n:gen`.

**4. Core code.** `src/main.ts` (14 hunks), `server/main.ts` (5),
`src/world_api.ts` (6), `src/ui/char_window.ts` (6), `src/render/renderer.ts` (5),
`server/game.ts` (4), `src/sim/sim.ts` (3), `src/sim/combat/damage.ts` (3),
`src/ui/hud.ts` (3), `src/sim/sim_context.ts` (2), plus single-hunk
`server/static_cache.ts`, `src/sim/content/zone1.ts`,
`src/ui/world_entity_i18n.ts`. Real review each.

**5. Branding surfaces.** `index.html` (6), `play.html` (6),
`public/terms.html` (5), `public/privacy.html` (2), `public/sitemap.xml`,
`package.json`, `.gitignore`, `scripts/i18n_scan.mjs`. Fork branding wins
(Cryptic Realm / crypticrealm.com / discord.gg/Zdj3JGrx, version
`<upstream>-cr.N`) but each hunk mixes branding with upstream's new tags — do not
bulk-resolve these blind.

**6. CSS.** `src/guide/styles.css` (271 lines), `src/styles/hud.mobile.css`.

**7. Tests.** `snapshots.test.ts` (8), `world_api_parity.test.ts` (12),
`ci_workflow.test.ts` (both-added), `client_shell.test.ts` (2),
`entity_roster.test.ts`, `i18n_completeness.test.ts`, `sim_context.test.ts`.

## Then, per the plan

`npm install && npm run i18n:gen && npm run i18n:hash`,
`UPDATE_PARITY=1 npm test`, `npm run gate`, `npm run security:gate`, commit, and
move to v0.26.0. Seven steps remain after this one.

`tests/recovery_manifest.test.ts` fails by design on this branch — that single
file is expected; everything else must be green. Run the suite with
`--maxWorkers=3`: at host load 30+, `--maxWorkers=8` produces a different set of
4–11 spurious timeout failures on every run.
