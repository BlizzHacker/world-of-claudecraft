# v0.32.0 catch-up: the judgment queue

`replay.sh` takes the merge from **219 conflicts to 56 (verified by a clean replay)**. Everything below still
needs a human decision.

## Needs a product call, not a merge call

**Upstream now ships mounts natively, and the fork already had its own.**

`src/sim/content/mounts.ts` (ours 117 / theirs 330) and `src/sim/player_motion.ts`
collide head on:

| side | what it has |
|---|---|
| ours | `FLYING_MIN_ALTITUDE`, `isFlyingMountAura` — the fork's flying mounts |
| theirs | `mountMoveSpeedPct` — upstream's own ground mount system |

These are two designs for the same feature. This is the same situation as the
v0.24.1 interface overhaul: the standing precedent is **upstream structure wins,
fork features get re-ported on top**, which here means adopting upstream's mount
system and re-adding flying as an extension of it rather than keeping a parallel
implementation.

That is a gameplay decision with player-visible consequences (existing mount
items, prices, the Stable Master vendor), so it should be made deliberately
before this file is touched. Note the fork's own upstream PR #1786 proposed
mounts and is still open, so upstream built theirs independently.

## Order of work

1. The 56 below.
2. **Then** the 72 regenerable ones. They cannot be rebuilt until the source
   compiles, so any plan that opens with "regenerate the goldens" is backwards:
   - `tests/parity/golden/*` (49) via `UPDATE_PARITY=1`
   - `src/ui/i18n.resolved.generated/*` (23) via `npm run i18n:gen`

## Re-derive by RUNNING, never by picking a side

Upstream's number currently sits in the tree as a placeholder. Run each and take
what it prints:

`tests/command_schema.test.ts`, `tests/world_api_parity.test.ts`,
`tests/entity_roster.test.ts`, `tests/snapshots.test.ts`,
`tests/ground_pickup_i18n.test.ts`, `tests/combat_casting_lifecycle.test.ts`

`combat_casting_lifecycle` is the subtle one: upstream changed the GCD to be
shortened by haste with a 0.75s floor, while the fork's realm `combatFeel`
multiplies the GCD by 0.4. Both now apply. Confirm which order they compose in
before trusting either number.

## Trivial, clear these first

| file | call |
|---|---|
| `package-lock.json` | do not merge. `package.json` is already resolved to `cryptic-realm@0.32.0-cr.1`, so `rm package-lock.json && npm install` and take the result. |
| `src/guide/content.generated.ts` | generated. Take upstream, re-run the guide content build. |
| `.gitattributes` | union. |

## The four heavy ones

**`src/ui/hud.ts`** (ours 1230 / theirs 120). The fork's HUD is heavily extended.
Ours is the base, but the ~120 upstream lines are real fixes and must be read
hunk by hunk. Single biggest risk in the merge.

**`src/main.ts`** (417 / 536). Genuinely two-sided. Upstream restructured boot;
the fork adds launchers, realm selection, co-op and maintenance wiring. Take
upstream's structure, re-apply the fork's additions.

**`src/render/renderer.ts`** (153 / 425). Upstream-heavy. Prefer theirs, re-apply
the fork's entity-view additions.

**`src/ui/sim_i18n.newlocales.ts`** (14 / 295). Almost entirely upstream. Take
theirs, then confirm the fork's added keys survive.

## Decisions already recorded

Applied by `replay.sh`, with reasoning in the rule files:

- `rules-precedent.txt` — `options_window.ts` ours wholesale
- `rules-batch1.txt` — 4 unions (both sides add a needed import / record entry /
  mock field), 1 ours (fork branding in a golden fixture), 3 theirs (upstream
  refactors adopted wholesale)
- `rules-batch2.txt` — 5 count/mechanics tests parked on upstream pending re-derivation
- `fix-package-json.py` — name stays `cryptic-realm`, version follows the
  `<upstream>-cr.N` convention, build script keeps BOTH `sfx:manifest` and
  `assets:realms`, all 9 fork asset scripts preserved, upstream's newer pins taken
- `fix-weave.py` — `xp.ts` takes upstream's rest-point rework and keeps the
  fork's `activeMaxLevel` cap; `ws_auth.ts` keeps the co-op flag AND takes
  upstream's timer wire, hotbar layout, and full-scope auth hardening, with
  `accountId` re-exposed so the rest of the handler is untouched

## Traps proven in the v0.30 pass

- `hud_chrome.ts` renames `$CR` back to `WOC` if theirs wins. `catalog-merge.py`
  handles it (172 ours-wins per run); verify with `brand-verify.sh` after.
- `src/world_api/dungeons.ts` and `interaction.ts` change `void` to
  `WorldInteractionOutcome` inside blocks the fork edited. Keeping ours silently
  reverts the signature.
- `options_ia.ts` / `options_mobile_shell.ts` arrive deleted by upstream. Accept it.
- `tests/dungeons.test.ts` carries the fork's D2 mob scaling (`d2MobDmgMult`,
  `d2MobHpMult`) while upstream renamed `tuning.damageMultiplier` to `tuningDmg`.
  Needs upstream's names with the fork's multipliers, not either side.

## Remaining 56

```
.gitattributes                    AGENTS.md
index.html                        package-lock.json
play.html                         public/terms.html
server/admin.ts                   server/characters.ts
server/daily_rewards.ts           server/db.ts
server/game.ts                    server/http/middleware/require_admin.ts
server/main.ts                    src/game/music.ts
src/guide/content.generated.ts    src/main.ts
src/net/online.ts                 src/render/characters/assets.ts
src/render/characters/index.ts    src/render/characters/preview.ts
src/render/characters/visual.ts   src/render/foliage.ts
src/render/props.ts               src/render/renderer.ts
src/sim/colliders.ts              src/sim/combat/casting_lifecycle.ts
src/sim/combat/damage.ts          src/sim/content/mounts.ts
src/sim/content/zone1.ts          src/sim/dungeon_layout.ts
src/sim/entity.ts                 src/sim/interaction.ts
src/sim/items.ts                  src/sim/player_motion.ts
src/sim/sim.ts                    src/sim/sim_context.ts
src/styles/components.css         src/styles/hud.mobile.css
src/styles/shell.css              src/ui/char_view.ts
src/ui/char_window.ts             src/ui/hud.ts
src/ui/sim_i18n.newlocales.ts     src/world_api.ts
tests/admin.test.ts               tests/ci_workflow.test.ts
tests/client_shell.test.ts        tests/corpse_harvest_sim.test.ts
tests/dungeons.test.ts            tests/homepage_foundation.test.ts
tests/i18n_completeness.test.ts   tests/preview_appearance.test.ts
tests/pvp_safety.test.ts          tests/sim.test.ts
tests/sim_context.test.ts         tests/world_api_parity.test.ts
```

## Before deploying

- `npm run gate` and `npm run security:gate`
- `bash docs/cryptic-realm-recovery/v030/brand-verify.sh` (catches `$CR` to `WOC`)
- The 8 live rings share the `live` branch, so advancing it moves all 8. Detach
  per realm to deploy one.
