# v0.32.0 catch-up: the judgment queue

`replay.sh` takes the merge from **219 conflicts to 72**. Everything left here
needs a human decision. Nothing below is resolved yet.

## Order of work

1. The 72 files in this document.
2. Only then the 72 regenerable ones. They **cannot** be rebuilt until the source
   compiles, so any plan that opens with "regenerate the goldens" is backwards:
   - `tests/parity/golden/*` (49) via `UPDATE_PARITY=1`
   - `src/ui/i18n.resolved.generated/*` (23) via `npm run i18n:gen`

## Trivial, do these first

| file | call |
|---|---|
| `package-lock.json` | do not merge. Resolve `package.json` first, then `rm package-lock.json && npm install` and take the regenerated file. |
| `src/guide/content.generated.ts` | generated. Take upstream, then re-run the guide content build. |
| `tests/server/fixtures/main/discord_callback_error_bounce.json` | one-line fixture; take upstream unless the bounce URL is fork-branded. |
| `.gitattributes` | union. |

## Counts that must be re-derived, never picked

Running these prints the correct number. Do not choose a side.

- `tests/command_schema.test.ts`
- `tests/world_api_parity.test.ts`
- `tests/entity_roster.test.ts`
- `tests/snapshots.test.ts`

## The four heavy ones

**`src/ui/hud.ts`** (ours 1230 / theirs 120). The fork's HUD is heavily extended.
Ours is the base; the ~120 upstream lines are real fixes and must be read hunk by
hunk rather than dropped wholesale. This is the single biggest risk in the merge.

**`src/main.ts`** (417 / 536). Genuinely two-sided. Upstream restructured boot;
the fork adds launchers, realm selection, co-op and maintenance wiring. Take
upstream's structure and re-apply the fork's additions on top, the same policy
used for the options window in the v0.26 intake.

**`src/render/renderer.ts`** (153 / 425). Upstream-heavy. Prefer theirs and
re-apply the fork's entity-view additions.

**`src/ui/sim_i18n.newlocales.ts`** (14 / 295). Almost entirely upstream. Take
theirs, then confirm the fork's added keys survive.

## Known traps, proven in the v0.30 pass

- `hud_chrome.ts` renames `$CR` back to `WOC` if theirs wins. `catalog-merge.py`
  already handles it (172 ours-wins overrides this run); verify after with
  `brand-verify.sh`.
- `src/world_api/dungeons.ts` and `interaction.ts` change `void` to
  `WorldInteractionOutcome` inside blocks the fork edited. Keeping ours silently
  reverts the signature.
- `options_ia.ts` / `options_mobile_shell.ts` arrive deleted by upstream (`UD`).
  Accept the deletion.
- `src/ui/options_window.ts` is already resolved to ours wholesale by
  `rules-precedent.txt`. Upstream's `chatWindowResetRow`, `framesRow`,
  `markDialogRoot` and `renderBugReport` are deliberately not re-ported.

## Full list

```
.gitattributes                  AGENTS.md
index.html                      package-lock.json
package.json                    play.html
public/terms.html               server/admin.ts
server/characters.ts            server/daily_rewards.ts
server/db.ts                    server/game.ts
server/http/middleware/require_admin.ts
server/main.ts                  server/ws_auth.ts
src/game/music.ts               src/guide/content.generated.ts
src/main.ts                     src/net/online.ts
src/render/characters/assets.ts src/render/characters/index.ts
src/render/characters/preview.ts src/render/characters/visual.ts
src/render/foliage.ts           src/render/motes.ts
src/render/props.ts             src/render/quest_objects.ts
src/render/renderer.ts          src/sim/colliders.ts
src/sim/combat/casting_lifecycle.ts src/sim/combat/damage.ts
src/sim/content/mounts.ts       src/sim/content/zone1.ts
src/sim/dungeon_layout.ts       src/sim/entity.ts
src/sim/interaction.ts          src/sim/items.ts
src/sim/player_motion.ts        src/sim/progression/xp.ts
src/sim/sim.ts                  src/sim/sim_context.ts
src/sim/social/chat_readouts.ts src/styles/components.css
src/styles/hud.mobile.css       src/styles/shell.css
src/ui/char_view.ts             src/ui/char_window.ts
src/ui/hud.ts                   src/ui/sim_i18n.newlocales.ts
src/world_api.ts                tests/admin.test.ts
tests/antibot_config_api.test.ts tests/ci_workflow.test.ts
tests/client_shell.test.ts      tests/combat_casting_lifecycle.test.ts
tests/command_schema.test.ts    tests/corpse_harvest_sim.test.ts
tests/dungeons.test.ts          tests/entity_roster.test.ts
tests/ground_pickup_i18n.test.ts tests/homepage_foundation.test.ts
tests/i18n_completeness.test.ts tests/loot_master_sim.test.ts
tests/preview_appearance.test.ts tests/pvp_safety.test.ts
tests/server/admin.test.ts      tests/server/characters.test.ts
tests/server/fixtures/main/discord_callback_error_bounce.json
tests/sim.test.ts               tests/sim_context.test.ts
tests/snapshots.test.ts         tests/world_api_parity.test.ts
```

## Before deploying

- `npm run gate` and `npm run security:gate`
- `bash docs/cryptic-realm-recovery/v030/brand-verify.sh` (catches `$CR` to `WOC`)
- Ring policy: the 8 live rings share the `live` branch, so advancing it moves
  all 8. Detach per realm to deploy one.
