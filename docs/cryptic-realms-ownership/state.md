# State

- Working branch: `codex/realm-ownership-and-assets`.
- Isolated worktree: `C:\MoveWeight\cryptic-realm-games`.
- Base: `origin/codex/realm-integrated-minigames`.
- Claudecraft is out of scope for replacement.
- `src/sim/` remains deterministic and DOM-free.
- Presentation uses `IWorld`; server outcomes stay authoritative.
- Generated files are regenerated, never hand-edited.
- Production target identity is unresolved because the observed container SHA differs from the recovery manifest and the container has untracked secrets.

## Planned seams

- Realm metadata: `src/sim/realms/types.ts` and `src/sim/realms/content/*.ts`.
- Asset intake: `scripts/build_realm_assets.mjs` and `src/sim/realms/assets.ts`.
- Character presentation: `src/ui/cryptic/realm_class_presentation.ts` and `src/render/characters/preview.ts`.
- Venue systems: `src/sim/social/*`, `src/sim/*_layout.ts`, `src/render/*`, `src/ui/*_hud.ts`.
