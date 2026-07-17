# Implementation plan

Every phase is an implementation commit followed by a focused QA checkpoint. The same behavior
must work in offline `Sim`, authoritative online `GameServer`/`ClientWorld`, and any affected
headless surface. No phase enables a production flag until its QA and manifest gates pass.

| Phase | Scope | Status |
|---|---|---|
| 01 | Recovery identity, upstream lineage, feature manifest | Open: strict ref reconciliation |
| 02 | Co-op and realm parity regression | Recovered; keep regression coverage |
| 03 | Mounts, flight, DuranceTester entitlement | Code-ready; live operation gated |
| 04 | Exchange custody, cross-realm auth, provenance, UI | Custody core recovered; staging open |
| 05 | Arcade platform, zombie defense, racing/brawler adapters | Preview shipped; flags remain off |
| 06 | Town RTS, housing persistence, defense waves | Core preview only; implementation open |
| 07 | Character sheet, armor/item 3D assembly, Monster Chronicle catalog | Open |
| 08 | Sanitized PR extraction and live contribution receipts | Open |
| 09 | Final three-host QA, backup, isolated stage, promotion | Blocked until phases and manifest gates are green |

Each phase must include deterministic tests, i18n generation when copy changes, wire/parity tests
when `IWorld` changes, persistence round-trip tests for stored state, and a production-read-only
or staged smoke record before promotion is considered.
