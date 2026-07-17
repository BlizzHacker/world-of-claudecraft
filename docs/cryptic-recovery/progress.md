# Progress

| Area | Current status | Evidence |
|---|---|---|
| Arcade racing/brawler | Preview playable offline/online; solo CPU opponents; offline couch invite seam | `9d61ce9be`, `97d576cda`, `2e0cdac46` |
| Town RTS/housing | Preview adapter plus realm-scoped world-state persistence; defense/wave gameplay open | `9d61ce9be`, `7d16d7902` |
| Zombie defense | Eastbrook preview adapter/UI plus validated realm-scoped persistence | `b082bcc1c`, `693698d35` |
| Mounts/DuranceTester | Three-bridle grant and high-level ride bypass in code | `6667d48b7` plus entitlement tests |
| Exchange | Custody/provenance core; writes now restricted to Exchange process; shared item-level gate | `16bea311a`, `6667d48b7` |
| Character/3D viewer | Renderer foundation exists; unchanged external GLBs are reused; armor composition/pixel match/catalog open | `1fca55baf` plus prior viewer checkpoints |
| Contributions | Live API exists; receipts/automation and production configuration open | `server/contributions.ts` |
| Recovery manifest | Exhaustive local/remote/bundle ledger and patch-ID classification complete; strict checker passes | `config/cryptic-recovery/discovery.json`, `check_recovery_manifest.mjs` |
| Production | Unchanged; promotion still blocked by isolated-stage, backup, full-QA, and health gates | strict recovery manifest, `8bc89c17d` |

The next implementation phase should add persistence and defense behavior behind the existing
arcade seams, then run its dedicated QA checkpoint. Do not mark an area complete from a pure core
test when the UI, wire, persistence, or production gates are still open.
