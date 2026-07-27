# Known damage: `interactKey` in src/main.ts

**This is the highest-value remaining fix in the v0.30.0 merge.** It breaks the
player's interact key (loot, doors, waypoints, town portals, NPC dialog, delve
interactables), so it must be repaired before any deploy.

## What happened

Both merge parents declare `function interactKey(): void`:

| | line | notes |
|---|---|---|
| fork (`f07988f84^1`) | 1993, ~89 lines | carries the fork features |
| upstream (`f07988f84^2`) | 2476 | upstream's own version |

The merged file has **no declaration at all** — only an orphaned tail of its body.
A hunk boundary put upstream's `hud.attachClaudium(...)` /
`hud.attachStorePromoCard()` block (which belongs to a *different* function)
directly against our `interactKey` opening, and side-picking took upstream's
block. The function header plus its first half — which declare `p`, `bestObj`,
`bestNpc`, `bestCorpse`, `bestDelve` — were dropped, leaving the tail stranded
inside the wrong function.

Symptoms in tsc: `Cannot find name 'interactKey'` at its three call sites
(`onUiKey` case `'interact'`, `onInteract`, and the mobile handler), plus
`Cannot find name` for `obj`, `bestObj`, `bestNpc`, `p` inside the stranded tail.

Current orphan span in the merged file: roughly the comment
"Building interior exit door, waypoint pylon, town portal" through
`hud.showError(t('errors.nothingInteract'));` and its closing brace, sitting
immediately after the `hud.attachStorePromoCard()` block.

## Fork features that must survive the repair

- delve interactables routed through `delveInteract` with a wider pick radius, so
  the sim owns per-object gating and the lockpick offer
- `building_exit` / `waypoint` / `town_portal` routed through `world.interact()`
  rather than `pickUpObject`, so the server sim runs the right handler
- `brother_halven` opens the delve board instead of the quest dialog
- `buildingDoorNear(p.pos.x, p.pos.z)` fallback so building entry works online

## Why it is not auto-fixable

The two sides share braces across the hunk boundary: upstream's block is
self-contained while our side opens a function closed by text after the hunk. Every
mechanical rule tried produced either a redeclaration or an unbalanced file:

- union both -> duplicate `p` / `bestObj` locals
- pick a side -> loses one side entirely (this is what happened)
- order-aware union (safe side first) -> restored `toggleGameMenu` but not this
  function, and net tsc went 447 -> 457

## Repair recipe

1. `git show f07988f84^1:src/main.ts | sed -n '1993,2081p'` — the fork's complete
   function.
2. Delete the orphaned tail from the merged file, keeping upstream's
   `attachClaudium` / `attachStorePromoCard` block intact inside its own function
   and restoring that function's closing brace.
3. Insert the fork function whole, immediately before `function attackNearest()`.
4. Verify with `esbuild src/main.ts` then confirm the three call sites resolve.
