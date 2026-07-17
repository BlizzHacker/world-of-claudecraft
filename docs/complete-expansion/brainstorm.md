# Brainstorm

## Current state

The repository already contains a deterministic world-fishing system, Vale Cup soccer, arcade
preview adapters, mount runtime gates, persisted town/zombie state, Exchange policy/custody
building blocks, and a reusable external 3D model URL seam. The remaining work is to turn those
seams into player-facing, playable flows without enabling incomplete previews.

## Locked direction

- The server owns outcomes, escrow, invites, scores, waves, town state, and persistence.
- Offline uses the same deterministic simulation rules with local invite/CPU adapters.
- Online uses `ClientWorld` snapshots and explicit WS commands; no client-trusted settlement.
- Existing realm content and items remain compatible; new state is additive and back-compatible.
- The official Cryptic Realm logo remains shared product chrome for every realm.

## Deliverables

1. Exchange player flow: browse eligible cross-realm inventory, export lock, escrow, atomic settle,
   provenance, destination validation, reversal/audit display.
2. Racing and brawler: lobby/invites, deterministic tracks/arenas, CPU fill for solo, four-player
   online/offline play, scoring and reconnect-safe results.
3. Town RTS, zombie defense, and housing: invite/team-vs-team rules, deterministic waves/builds,
   persisted town/housing state, and walk-up activation in the world.
4. Character sheet: attached 3D character viewer, slot-aware 3D item viewer, responsive layouts,
   safe fallbacks for missing GLB/texture assets, and catalog-ready model metadata.
