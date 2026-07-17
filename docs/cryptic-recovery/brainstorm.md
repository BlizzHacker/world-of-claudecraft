# Vision and boundaries

Cryptic Realm should preserve all recovered Cryptic features while remaining mergeable with
ClaudeCraft. Shared engine, transport, accessibility, security, and test improvements are
sanitized for upstream; Cryptic-only realms, economy, lore, Exchange custody, and minigame art
stay private.

## Current evidence

- Core mounts, true flight motion, world fishing, Vale Cup, Exchange escrow/provenance, and the
  character/item 3D viewer exist in the current tree.
- Arcade preview now has one authoritative adapter across offline `Sim`, online `GameServer`,
  `ClientWorld`, and `IWorld`: racing, brawler, town RTS, housing, plus the earlier zombie-defense
  preview. Racing/brawler solo practice can fill three deterministic CPU opponents.
- DuranceTester is host-stamped and receives all three mount bridles in code; production grant is
  still gated by the Phase 21/22 manifest operation.

## Open product work

- Cross-realm Exchange staging, persistence load testing, UI completion, and promotion.
- Full Mario-Kart content/bots, four-player brawler balance/NPC content, town RTS defense waves,
  zombie-defense soak, housing persistence, and mobile/accessibility QA.
- Pixel-matched character sheets, armor assembly, item viewer catalog, and Monster Chronicle asset
  mapping.
- Contribution feed receipts and sanitized PR automation after GitHub identity and CI gates pass.
