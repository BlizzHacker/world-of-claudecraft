# State

## Invariants

- `src/sim/` stays DOM-free and deterministic; randomness only through `Rng`.
- Presentation accesses `IWorld`, never `Sim` or `ClientWorld` directly.
- Server validates every economy, invite, score, and settlement command.
- Inline schema changes are additive and idempotent; JSONB loads default missing fields.

## Validation matrix

- Sim/content: focused Vitest, determinism, typecheck.
- Server/persistence: server suites, round-trip test, server build.
- Network: snapshot, protocol, bandwidth, parity suites.
- UI/render: localization guard, mobile visual, client build.
- Full stack: `npm run gate`, isolated stage smoke, backup, rollback, public health.

## Current references

- Exchange: `src/sim/content/exchange.ts`, `server/`, `src/ui/` market/exchange windows.
- Arcade: `src/ui/cryptic/minigames.ts`, `src/game/`, `server/game.ts`.
- Town/zombies/housing: `src/sim/`, `server/`, `src/ui/cryptic/`.
- Character sheet: `src/ui/`, `src/render/`, model metadata in `src/render/assets/`.
