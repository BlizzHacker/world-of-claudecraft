# Progress

| Phase | Status | Notes |
|---|---|---|
| 1 Exchange | complete | cross-realm escrow, atomic settlement, provenance, audit, reversal, destination validation, and player window are live-ready |
| 2 Racing | complete | deterministic track physics, items, CPU fill, timeout, reconnect-safe session scores, and online/offline controls |
| 3 Brawler | complete | four-player ring-out combat, CPU fill, KO credit, reconnect-safe scores, and online/offline controls |
| 4 RTS/zombies | complete | Eastbrook walk-up board, co-op lobby/invites, deterministic building/waves, persistence, and online/offline controls |
| 5 Housing | complete | persisted Eastbrook lot recovery, ACL-safe placement, and walk-up housing launch |
| 6 Character sheet/3D | complete | reference-style equipment/overview layouts, responsive framing, lazy item GLB viewer, character turntable, and missing-asset fallback |
| 7 Release | in progress | local gate and production promotion remain before the final live verification |

## Cross-cutting acceptance

- [x] Offline and online commands produce equivalent authoritative outcomes.
- [x] New persistent state loads old characters without loss or exceptions.
- [x] Every player-visible string is localized in every locale.
- [x] No incomplete preview is enabled in production.
