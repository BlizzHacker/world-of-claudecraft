# Cryptic Realm Recovery and Modernization

This packet coordinates preservation, environment reconciliation, permanent recovery guards, recurring ClaudeCraft intake, sanitized contributions, complete one-to-four-player co-op, mounts and true flight, the auditable DuranceTester grant, world fishing, Exchange Realm, minigames, town strategy, housing, live-only feature recovery, desktop/store distribution, and automatic QA-gated release checkpoints. The v0.26.0 upstream release is the reproducible recovery baseline, but every intake run rechecks the latest stable release.

## Start here

- [Approved vision and audit findings](brainstorm.md)
- [Implementation plan and team workflow](implementation-plan.md)
- [Current progress](progress.md)
- [Cross-session state](state.md)
- [Permanent feature/source inventory](feature-inventory.md)
- [Whole-program QA and promotion checklist](qa-checklist.md)

## Phase index

| Phase | Implementation | QA | Promotion rule |
|---|---|---|---|
| 01 | [Close Production Preservation and Identity](phase-01-preservation-closeout.md) | [QA](phase-01-qa.md) | No production mutation |
| 02 | [Create Permanent Recovery Guards and Runbook](phase-02-permanent-recovery-manifest.md) | [QA](phase-02-qa.md) | No production mutation |
| 03 | [Automate Recurring Upstream Release Intake](phase-03-recurring-upstream-intake.md) | [QA](phase-03-qa.md) | No production mutation |
| 04 | [Build QA-Gated Promotion and Rollback Control Plane](phase-04-promotion-control-plane.md) | [QA](phase-04-qa.md) | No production mutation |
| 05 | [Integrate Upstream Domain and Overlay Seams](phase-05-upstream-domain-overlays.md) | [QA](phase-05-qa.md) | No production mutation |
| 06 | [Integrate Upstream Wire and Schema Compatibility](phase-06-upstream-wire-schema.md) | [QA](phase-06-qa.md) | No production mutation |
| 07 | [Integrate Upstream Client, Content, and Generated Outputs](phase-07-upstream-client-content.md) | [QA](phase-07-qa.md) | No production mutation |
| 08 | [Automate Sanitized Contribution Extraction](phase-08-contribution-extraction.md) | [QA](phase-08-qa.md) | No production mutation |
| 09 | [Build Shared Outbound Delivery and Contribution State Foundation](phase-09-contribution-state-ledger.md) | [QA](phase-09-qa.md) | No production mutation |
| 10 | [Complete Shared Delivery Status, Contribution Website, and Foundation Checkpoint](phase-10-contribution-website-checkpoint.md) | [QA](phase-10-qa.md) | Release checkpoint: foundation and contributions |
| 11 | [Establish Offline Profile Persistence and Local Squad Contract](phase-11-coop-domain.md) | [QA](phase-11-qa.md) | No production mutation |
| 12 | [Implement Offline Co-op Input, HUD, and Baseline](phase-12-coop-offline-client.md) | [QA](phase-12-qa.md) | No production mutation |
| 13 | [Implement Online Squad Authority and Union Interest](phase-13-coop-online-wire.md) | [QA](phase-13-qa.md) | No production mutation |
| 14 | [Implement Co-op Realm Transitions and Squad Transition Persistence](phase-14-coop-realm-transitions.md) | [QA](phase-14-qa.md) | No production mutation |
| 15 | [Complete Co-op Baseline and Release Checkpoint](phase-15-coop-integration-checkpoint.md) | [QA](phase-15-qa.md) | Release checkpoint: co-op |
| 16 | [Implement Mount Domain and Wire Contract](phase-16-mount-domain-wire.md) | [QA](phase-16-qa.md) | No production mutation |
| 17 | [Implement Mount Persistence and Target-Neutral Entitlements](phase-17-mount-persistence-entitlements.md) | [QA](phase-17-qa.md) | No production mutation |
| 18 | [Restore Three Mounts and Client Experience](phase-18-mount-content-client.md) | [QA](phase-18-qa.md) | No production mutation |
| 19 | [Implement Authoritative Flight Domain and Wire](phase-19-flight-domain-wire.md) | [QA](phase-19-qa.md) | No production mutation |
| 20 | [Implement Flight Client, Camera, and Controls](phase-20-flight-client-camera.md) | [QA](phase-20-qa.md) | No production mutation |
| 21 | [Integrate Mounts and Flight for Release Checkpoint](phase-21-mount-flight-integration-checkpoint.md) | [QA](phase-21-qa.md) | Release checkpoint: mounts and flight |
| 22 | [Prepare Auditable DuranceTester Grant Operation](phase-22-durancetester-grant.md) | [QA](phase-22-qa.md) | Dedicated QA PASS, then one idempotent operator action and verification |
| 23 | [Implement World Fishing Domain and Wire](phase-23-fishing-domain-wire.md) | [QA](phase-23-qa.md) | No production mutation |
| 24 | [Implement Fishing Presentation and Arcade Separation](phase-24-fishing-client-arcade.md) | [QA](phase-24-qa.md) | No production mutation |
| 25 | [Integrate Fishing for One-to-Four-Player Checkpoint](phase-25-fishing-integration-checkpoint.md) | [QA](phase-25-qa.md) | Release checkpoint: world fishing |
| 26 | [Lock Exchange Economy, Visitor, and Authority Policy](phase-26-exchange-policy.md) | [QA](phase-26-qa.md) | No production mutation |
| 27 | [Implement Exchange Schema, Escrow, and Currency Reservations](phase-27-exchange-schema-custody.md) | [QA](phase-27-qa.md) | No production mutation |
| 28 | [Implement Exchange Settlement and Wire Protocol](phase-28-exchange-settlement-wire.md) | [QA](phase-28-qa.md) | No production mutation |
| 29 | [Implement Exchange Player and Operator Experience](phase-29-exchange-client-admin.md) | [QA](phase-29-qa.md) | No production mutation |
| 30 | [Integrate Exchange for One-to-Four-Player Checkpoint](phase-30-exchange-integration-checkpoint.md) | [QA](phase-30-qa.md) | Release checkpoint: Exchange Realm |
| 31 | [Implement Reusable Minigame Domain and Wire](phase-31-minigame-domain-wire.md) | [QA](phase-31-qa.md) | No production mutation |
| 32 | [Implement Minigame Client Shell and Vale Cup Adapter](phase-32-minigame-client-vale-cup.md) | [QA](phase-32-qa.md) | No production mutation |
| 33 | [Implement Original Kart Racing Domain](phase-33-racing-domain.md) | [QA](phase-33-qa.md) | No production mutation |
| 34 | [Implement Racing Client and One-to-Four-Player Integration](phase-34-racing-client-integration.md) | [QA](phase-34-qa.md) | No production mutation |
| 35 | [Implement Platform Arena Brawler Domain](phase-35-brawler-domain.md) | [QA](phase-35-qa.md) | No production mutation |
| 36 | [Implement Brawler Client and Minigame Checkpoint](phase-36-brawler-client-minigame-checkpoint.md) | [QA](phase-36-qa.md) | Release checkpoint: racing and brawler |
| 37 | [Define Town RTS Domain, Pilot Towns, and Balance](phase-37-rts-domain-balance.md) | [QA](phase-37-qa.md) | No production mutation |
| 38 | [Implement Town RTS Persistence and Wire](phase-38-rts-persistence-wire.md) | [QA](phase-38-qa.md) | No production mutation |
| 39 | [Implement Town RTS Client and One-to-Four-Player Integration](phase-39-rts-client-integration.md) | [QA](phase-39-qa.md) | No production mutation |
| 40 | [Implement Zombie Tower Defense Domain and Wire](phase-40-zombie-domain-wire.md) | [QA](phase-40-qa.md) | No production mutation |
| 41 | [Implement Zombie Client and Strategy Checkpoint](phase-41-zombie-client-strategy-checkpoint.md) | [QA](phase-41-qa.md) | Release checkpoint: town RTS and zombie defense |
| 42 | [Audit Housing Lineage, Security, and External Surfaces](phase-42-housing-audit.md) | [QA](phase-42-qa.md) | No production mutation |
| 43 | [Implement Approved Housing Domain and Persistence](phase-43-housing-domain-persistence.md) | [QA](phase-43-qa.md) | No production mutation |
| 44 | [Implement Housing Client and Release Checkpoint](phase-44-housing-client-checkpoint.md) | [QA](phase-44-qa.md) | Release checkpoint: housing |
| 45 | [Harden Bug Reporting Security and Parity](phase-45-bug-reporting-recovery.md) | [QA](phase-45-qa.md) | No production mutation |
| 46 | [Harden Offline Realm Persistence Parity and Migration](phase-46-offline-realm-persistence-recovery.md) | [QA](phase-46-qa.md) | No production mutation |
| 47 | [Recover Xbox, Tauri, and Store Distribution](phase-47-xbox-tauri-store-recovery.md) | [QA](phase-47-qa.md) | Web/server checkpoint; signed artifact and store publication remain separate lanes |
| 48 | [Complete Final Hardening and Automatic Release](phase-48-final-hardening-release.md) | [QA](phase-48-qa.md) | Release checkpoint: complete Cryptic Realm recovery |

## Execution rule

Resume Phase 01 from its existing progress notes. Do not repeat completed backups. No
environment is mutated until its immutable identity matches the permanent manifest. If no
safe related-LXC stage is discovered, Phase 04 provisions and tears down an isolated,
sanitized, side-effect-free ephemeral stage; production is never used for failure injection.
GitHub CI runs QA for every pushed branch, with the stricter tier on `release/**`. No
production mutation occurs from an implementation session. Checkpoint QA completes local
and stage validation, writes a clean REPORT and explicit pre-promotion PASS, then invokes the
automatic promotion state machine. Failed post-deploy health or smoke checks roll back
automatically.

Incomplete systems remain disabled through server-controlled default-off flags. Packet teardown can occur only after Phase 48 QA, after durable guards and follow-ups live outside this directory.
