# Implementation Plan

## Program outcome

Cryptic Realm becomes a maintainable downstream product with an auditable private history, explicit overlay seams, recurring release intake, executable semantic guards, complete host parity, frequent safe release checkpoints, and automatic rollback.

## Environment identities

The two historical profiles and required stage profile must never be conflated:

| Profile | Current evidence | Rule |
|---|---|---|
| Current Cryptic production | Proxmox host 192.168.0.6, LXC 171, repository /opt/cryptic-realm, public realm endpoints healthy | This is the only currently evidenced production target. Promotion requires exact immutable manifest match. |
| Legacy QA/deploy inventory | idyllic-games-prod, /opt/eastbrook, release/v0.6, dev.worldofcryptic-realm.com | DNS/SSH are currently unresolved. Treat as unverified legacy inventory, never an automatic target until classified retired, stage, or active. |
| Required isolated stage | No existing stage is yet evidenced | Phase 02 first inventories related LXCs. If no safe stage is manifest-pinned, Phase 04 provisions an ephemeral stage from the exact candidate artifact with synthetic/sanitized QA-only data, no production credentials, deploy keys, webhooks, contribution/PR side effects, or public ingress; dev cheats remain OFF. Identity and teardown evidence are mandatory. |

Phase 02 writes these profiles to the permanent machine-readable manifest. Hostname, host
identity, LXC/container identity, repository root, remote, branch, HEAD, service topology,
realm list, and expected origin must all match before mutation. A missing/unhealthy stage is
a hard promotion failure, never permission to test failures in production.

## QA artifact lifecycle

Every implementation and QA session appends to tmp/qa-loop/LEDGER.md. Each QA iteration records UTC timestamp, phase, candidate commit, environment profile, scenarios attempted, verdict, failures, fixes with SHAs, validations, and next action.

tmp/qa-loop/REPORT.md contains the current candidate comparison and one row per scenario with exactly:

- id
- mode: NEW-FEATURE, BUG-FIX, REGRESSION, SECURITY, PERFORMANCE, MIGRATION, or RELEASE
- system
- accounts
- steps
- expected
- actual
- verdict
- evidence

The report also contains production-baseline-versus-local comparison, fixes with SHAs, prioritized follow-ups, account cleanup, screenshots, console evidence, malware verdict, and gate results. A promotable report has no unresolved FAIL, no dirty QA data, and ends with:

CONVERGED — all in-scope green locally on <commit>

Any blocked or failed run ends with:

STOPPED — <reason>

The one-time production baseline is captured only after environment identity reconciliation and never repeated during a local fix loop.

## Canonical branch topology and overlay seams

- v0.26.0 is the reproducible recovery baseline.
- Every scheduled/manual intake rechecks the latest stable upstream release. Prereleases and upstream main are not selected as stable.
- A catch-up merge is a true merge. Parent one is the prepared compatibility-line tip
  descended from the manifest-pinned Cryptic anchor. Parent two is the exact pinned
  current-cycle upstream stable release commit.
- Candidate branches live in detached quarantine worktrees and internal PRs.
- Phases 05 through 07 are a repeatable release-integration cycle. They run first for v0.26.0, then once per newly discovered stable release in ascending order until the foundation checkpoint has no pending stable release. Later scheduled releases use the same cycle through internal PRs.
- Private sim/realm behavior stays under src/sim/realms and explicit registries.
- Private UI/product behavior stays under src/ui/cryptic and explicit shell/route seams.
- Realm deploy configuration, branding, assets, and product services remain private overlays.
- Generic core hooks remain a minimal tested patch queue and are sanitized upstream candidates.
- Textual conflict resolution never substitutes for the permanent feature manifest and behavioral tests.

## Team workflow

Every phase uses the best available Codex model at high/max reasoning. Opus 4.8 is preferred
when selectable, but never required. Batch-heavy history/inventory/matrix phases prefer an
ultracode Workflow with CSV rows and one result per row. Otherwise use bounded generic-agent
waves limited by the runtime's available worker slots, with a merge barrier and adversarial
verification.

1. Pre-flight: inspect branch/status, preserve concurrent work, read progress/state, verify the preceding QA, scan memory when available, and record phase-start commit.
2. Context: use an Explore subagent for planning docs and relevant source. Read root AGENTS.md, root CLAUDE.md, and every governing area CLAUDE.md.
3. Execute: split by complete vertical slice. Keep incomplete feature flags default-off.
4. Validate: run focused tests during iteration. Use npm run gate as the canonical repository gate.
5. Review: derive reviewers from the phase-start diff, exercised surfaces, and actual risk.
   Usually dispatch one or two; docs/test-only diffs may need none. Read the complete matching
   prompt from .claude/agents and give it to a fresh generic read-only subagent, or use the
   available equivalent WOC skill:
   - .claude/agents/architecture-reviewer.md for src/sim changes
   - .claude/agents/privacy-security-review.md for server/net/auth/SQL/deploy/secret changes
   - .claude/agents/migration-safety.md for DDL/JSONB persistence
   - .claude/agents/cross-platform-sync.md for IWorld/sim/wire/headless changes
   - .claude/agents/test-coverage-auditor.md for changed tests or coverage claims
   - .claude/agents/qa-checklist.md for complete deliverables
   - .claude/agents/release-malware-audit.md or woc-release-malware-audit for every checkpoint
6. Findings: request COVERAGE, including low-severity and uncertain findings. Require BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT. Fix all blocking and should-fix findings before commit.
7. Commit: Conventional Commits, explicit paths, never git add -A.
8. Handoff: update progress/state/inventory and QA artifacts with timestamps, SHAs, validations, evidence, deferrals, and next phase.

## Checkpoint promotion sequence

Phases 10, 15, 21, 25, 30, 36, 41, 44, 47, and 48 are release checkpoints.

1. Implementation produces an immutable candidate only. It never mutates production.
2. The separate QA session runs affected tests, npm run gate, npm run security:gate, release
   malware audit, schema/wire canary, permanent manifest, immutable private Git backup,
   DB/runtime-config backup and restore, retention, full isolated-stage smoke, stage-only
   failure injection, screenshots, console checks, account cleanup, and a clean REPORT. It
   verifies existing-stage cleanup or ephemeral-stage teardown before the gate closes.
3. QA writes an explicit pre-promotion PASS bound to commit, artifact checksum, environment
   profile, report checksum, private backup identity, restore evidence, stage identity and
   cleanup/teardown evidence, retention verdict, and rollback ref.
4. Only then the QA session invokes automatic promotion.
5. Post-deploy verifies repository HEAD/build identity, localhost API, public realm APIs, critical feature smoke, errors, tick/latency/memory/CPU/disconnect thresholds, and QA cleanup.
6. Any realm failure invokes all-or-nothing rollback of the entire checkpoint ring to the verified compatible ref and records STOPPED. A mixed production ring is never accepted.
7. Incomplete systems stay disabled; checkpoint activation enables only the coherent green slice.

## Validation invariants

- Determinism: fixed 20 Hz and Rng only in sim.
- IWorld first, then Sim and ClientWorld, plus headless where relevant.
- Server authority for identity, movement, combat, rewards, economy, custody, and multiplayer.
- Additive/idempotent/indexed DDL and old-save compatibility.
- Versioned schema/wire canary compatibility and forward-data-safe rollback.
- Every-locale i18n and sim/server matcher coverage.
- Controller/touch/mobile/accessibility and screenshots.
- Any browser console error in a core flow is FAIL.
- QA users follow qa_<rununix>_<n>; characters contain letters only; respect 20/min auth limits; clean all QA data.
- Never enable production dev commands.
- Never inject failures into production; stage is isolated, sanitized, side-effect-free, and
  dev-cheat-free. Missing stage identity/health/teardown evidence is FAIL.
- GitHub CI runs the normal QA tier for every branch push and the full release tier for every
  `release/**` push.
- Every checkpoint runs npm run gate and npm run security:gate plus the contextual malware audit.

## Phase summary

| Phase prompts | Goal | Release state |
|---|---|---|
| 01 [Implement](phase-01-preservation-closeout.md) / [QA](phase-01-qa.md) | Finish the already-started preservation phase, reconcile the actual production identity, initialize the QA artifacts, and close retention/security decisions without repeating completed backups. | Feature remains disabled until its checkpoint |
| 02 [Implement](phase-02-permanent-recovery-manifest.md) / [QA](phase-02-qa.md) | Move lineage, environment identity, semantic feature contracts, tests, and operating instructions into permanent repository artifacts that survive planning-packet teardown. | Feature remains disabled until its checkpoint |
| 03 [Implement](phase-03-recurring-upstream-intake.md) / [QA](phase-03-qa.md) | Discover the latest stable ClaudeCraft release on a schedule, quarantine it, evaluate semantic drift, and open an internal integration PR without touching live branches. | Feature remains disabled until its checkpoint |
| 04 [Implement](phase-04-promotion-control-plane.md) / [QA](phase-04-qa.md) | Build the reusable checkpoint state machine that can promote only after a dedicated QA PASS and canary compatibility, then verify or automatically roll back. | Feature remains disabled until its checkpoint |
| 05 [Implement](phase-05-upstream-domain-overlays.md) / [QA](phase-05-qa.md) | Prepare pinned current-cycle domain compatibility and private overlay seams on the verified Cryptic first-parent line. | Feature remains disabled until its checkpoint |
| 06 [Implement](phase-06-upstream-wire-schema.md) / [QA](phase-06-qa.md) | Prepare pinned current-cycle server, net, wire, and persistence compatibility without carrying an uncommitted merge. | Feature remains disabled until its checkpoint |
| 07 [Implement](phase-07-upstream-client-content.md) / [QA](phase-07-qa.md) | Reconcile client/content surfaces, then create the one true merge with verified Cryptic parent one and exact pinned upstream parent two. | Feature remains disabled until its checkpoint |
| 08 [Implement](phase-08-contribution-extraction.md) / [QA](phase-08-qa.md) | Continuously turn eligible private improvements into small upstream-release-based draft candidates with deterministic sanitization. | Feature remains disabled until its checkpoint |
| 09 [Implement](phase-09-contribution-state-ledger.md) / [QA](phase-09-qa.md) | Establish one reusable persisted outbound-delivery/state/idempotency/retry/dead-letter/reconciliation foundation, beginning with sanitized contribution PR lifecycle. | Feature remains disabled until its checkpoint |
| 10 [Implement](phase-10-contribution-website-checkpoint.md) / [QA](phase-10-qa.md) | Establish privacy-safe public/operator status projections, render accurate contribution state on CrypticRealm.com, and prepare the first automatic QA-gated foundation checkpoint. | QA PASS then automatic promotion/verification or rollback |
| 11 [Implement](phase-11-coop-domain.md) / [QA](phase-11-qa.md) | Establish versioned offline profiles/per-realm character migration, then define deterministic one-to-four-player local-squad identity, ownership, lifecycle, party semantics, and host-parity contracts. | Feature remains disabled until its checkpoint |
| 12 [Implement](phase-12-coop-offline-client.md) / [QA](phase-12-qa.md) | Implement complete offline one-to-four-player creation/selection, controller ownership, gameplay baseline, and per-player UI. | Feature remains disabled until its checkpoint |
| 13 [Implement](phase-13-coop-online-wire.md) / [QA](phase-13-qa.md) | Implement secure server-recognized local squads, union-interest replication, and controller session routing for one to four online players. | Feature remains disabled until its checkpoint |
| 14 [Implement](phase-14-coop-realm-transitions.md) / [QA](phase-14-qa.md) | Make local squads survive portals, instances, realm changes, death, and reconnect by persisting only squad transition state on the Phase 11 offline-profile foundation. | Feature remains disabled until its checkpoint |
| 15 [Implement](phase-15-coop-integration-checkpoint.md) / [QA](phase-15-qa.md) | Prove the full one-to-four-player offline/online baseline on every realm, especially online controller join/reconnect on Infernal, then checkpoint-promote only after QA PASS. | QA PASS then automatic promotion/verification or rollback |
| 16 [Implement](phase-16-mount-domain-wire.md) / [QA](phase-16-qa.md) | Adopt the stronger upstream mount architecture through IWorld, deterministic sim, server authority, ClientWorld, wire, and headless. | Feature remains disabled until its checkpoint |
| 17 [Implement](phase-17-mount-persistence-entitlements.md) / [QA](phase-17-qa.md) | Add additive mount ownership/state persistence and a generic least-privilege tester-entitlement model without committing target account or character data. | Feature remains disabled until its checkpoint |
| 18 [Implement](phase-18-mount-content-client.md) / [QA](phase-18-qa.md) | Restore Forest Stag, Swamp Raptor, and Emerald Wyrm with licensed assets and complete ground-riding UI/render/input. | Feature remains disabled until its checkpoint |
| 19 [Implement](phase-19-flight-domain-wire.md) / [QA](phase-19-qa.md) | Implement deterministic vertical movement, constraints, and recovery for explicitly flight-capable mounts. | Feature remains disabled until its checkpoint |
| 20 [Implement](phase-20-flight-client-camera.md) / [QA](phase-20-qa.md) | Present authoritative flight with accessible keyboard/controller/touch controls and one-to-four-player altitude-aware camera behavior. | Feature remains disabled until its checkpoint |
| 21 [Implement](phase-21-mount-flight-integration-checkpoint.md) / [QA](phase-21-qa.md) | Prove three mounts and Emerald Wyrm flight for one to four players offline/online, then checkpoint-promote reviewed schema/code while leaving live tester data untouched. | QA PASS then automatic promotion/verification or rollback |
| 22 [Implement](phase-22-durancetester-grant.md) / [QA](phase-22-qa.md) | Implementation stays target-neutral; QA resolves the authenticated owner, performs read-only cardinality preflight, locks exact rows/realms, then grants three mounts after PASS. | Dedicated QA PASS, then one operator action and verification |
| 23 [Implement](phase-23-fishing-domain-wire.md) / [QA](phase-23-qa.md) | Model visible real-world fishing states while preserving deterministic server-authoritative catches across all hosts. | Feature remains disabled until its checkpoint |
| 24 [Implement](phase-24-fishing-client-arcade.md) / [QA](phase-24-qa.md) | Render world fishing in the real world and lock the approved Cryptic Fishing Arcade name and reward separation. | Feature remains disabled until its checkpoint |
| 25 [Implement](phase-25-fishing-integration-checkpoint.md) / [QA](phase-25-qa.md) | Prove world and arcade fishing across one to four offline/online players, then checkpoint-promote only after dedicated QA PASS. | QA PASS then automatic promotion/verification or rollback |
| 26 [Implement](phase-26-exchange-policy.md) / [QA](phase-26-qa.md) | Define the complete Exchange Realm authority model before schema or UI work. | Feature remains disabled until its checkpoint |
| 27 [Implement](phase-27-exchange-schema-custody.md) / [QA](phase-27-qa.md) | Implement additive transactional persistence for item escrow, provenance, buyer reservations, fees, refunds, proceeds, leases, and audit. | Feature remains disabled until its checkpoint |
| 28 [Implement](phase-28-exchange-settlement-wire.md) / [QA](phase-28-qa.md) | Implement authenticated list/quote/buy/cancel/deliver/status flows and compact recovery-aware wire state. | Feature remains disabled until its checkpoint |
| 29 [Implement](phase-29-exchange-client-admin.md) / [QA](phase-29-qa.md) | Build accessible Exchange-only UX and bounded operator reconciliation without enabling prohibited realm gameplay. | Feature remains disabled until its checkpoint |
| 30 [Implement](phase-30-exchange-integration-checkpoint.md) / [QA](phase-30-qa.md) | Prove cross-realm Exchange and ordinary-market isolation for one to four offline/online players, then checkpoint-promote only after QA PASS. | QA PASS then automatic promotion/verification or rollback |
| 31 [Implement](phase-31-minigame-domain-wire.md) / [QA](phase-31-qa.md) | Extract a deterministic session lifecycle for queue, roster, ready, countdown, active, score, finish, reward, reconnect, abort, spectators, and bots. | Feature remains disabled until its checkpoint |
| 32 [Implement](phase-32-minigame-client-vale-cup.md) / [QA](phase-32-qa.md) | Build reusable queue/ready/score/result/reconnect/spectator client surfaces and adapt Vale Cup without regression. | Feature remains disabled until its checkpoint |
| 33 [Implement](phase-33-racing-domain.md) / [QA](phase-33-qa.md) | Implement deterministic original racing with drift, boost, terrain, obstacles, fair items, bots, checkpoints, laps, recovery, and rewards. | Feature remains disabled until its checkpoint |
| 34 [Implement](phase-34-racing-client-integration.md) / [QA](phase-34-qa.md) | Build original racing content, controls, camera, HUD, and full one-to-four-player offline/online integration. | Feature remains disabled until its checkpoint |
| 35 [Implement](phase-35-brawler-domain.md) / [QA](phase-35-qa.md) | Implement a true deterministic platform brawler with jump, aerial combat, platforms, vertical recovery, ring-outs, hitstun, ledges, fall zones, knockback scaling, stocks/score, and bots. | Feature remains disabled until its checkpoint |
| 36 [Implement](phase-36-brawler-client-minigame-checkpoint.md) / [QA](phase-36-qa.md) | Build original P1-P4 brawler presentation, prove every minigame offline/online, and checkpoint-promote only after dedicated QA PASS. | QA PASS then automatic promotion/verification or rollback |
| 37 [Implement](phase-37-rts-domain-balance.md) / [QA](phase-37-qa.md) | Define deterministic instanced town RTS for the first approved Cryptic Realm towns with explicit persistence and balance sources. | Feature remains disabled until its checkpoint |
| 38 [Implement](phase-38-rts-persistence-wire.md) / [QA](phase-38-qa.md) | Persist campaign layouts/progress safely and expose server-authoritative co-op commands through versioned host-parity surfaces. | Feature remains disabled until its checkpoint |
| 39 [Implement](phase-39-rts-client-integration.md) / [QA](phase-39-qa.md) | Build accessible construction/command presentation and prove P1-P4 Eastbrook then Highwatch campaign behavior offline/online. | Feature remains disabled until its checkpoint |
| 40 [Implement](phase-40-zombie-domain-wire.md) / [QA](phase-40-qa.md) | Compose deterministic zombie waves and tower rules with the town campaign/minigame foundations. | Feature remains disabled until its checkpoint |
| 41 [Implement](phase-41-zombie-client-strategy-checkpoint.md) / [QA](phase-41-qa.md) | Build P1-P4 zombie-defense presentation, prove both strategy games offline/online, and checkpoint-promote only after dedicated QA PASS. | QA PASS then automatic promotion/verification or rollback |
| 42 [Implement](phase-42-housing-audit.md) / [QA](phase-42-qa.md) | Classify every housing commit/asset/API and approve only behavior with current security, privacy, custody, license, and product evidence. | Feature remains disabled until its checkpoint |
| 43 [Implement](phase-43-housing-domain-persistence.md) / [QA](phase-43-qa.md) | Implement only approved deterministic housing ownership/build/visit/access/moderation/deletion behavior with safe persistence. | Feature remains disabled until its checkpoint |
| 44 [Implement](phase-44-housing-client-checkpoint.md) / [QA](phase-44-qa.md) | Build approved housing client behavior, prove one-to-four-player offline/online visits/building, and checkpoint-promote only after QA PASS. | QA PASS then automatic promotion/verification or rollback |
| 45 [Implement](phase-45-bug-reporting-recovery.md) / [QA](phase-45-qa.md) | Harden bug-report security and historical parity on the Phase 09/10 shared delivery/status foundation without creating a second pipeline. | Feature remains disabled until its checkpoint |
| 46 [Implement](phase-46-offline-realm-persistence-recovery.md) / [QA](phase-46-qa.md) | Harden historical offline-profile parity/migrations on the Phase 11/14 foundation, including the exact duplicate-realm-entry regression. | Feature remains disabled until its checkpoint |
| 47 [Implement](phase-47-xbox-tauri-store-recovery.md) / [QA](phase-47-qa.md) | Preserve current user store work and prove three separate lanes for LXC web/server promotion, signed-artifact verification, and externally authorized store publication. | Web/server QA PASS then automatic LXC promotion; artifact and store lanes retain separate authority/verdicts |
| 48 [Implement](phase-48-final-hardening-release.md) / [QA](phase-48-qa.md) | Implementation prepares the exact candidate and complete local/stage evidence; independent QA alone issues PASS, invokes automatic promotion, verifies, or rolls back. | QA PASS then automatic promotion/verification or rollback |

## Packet closeout

Phase 48 QA offers to delete only docs/cryptic-realm-recovery after every durable follow-up is moved to normal tracking. Permanent manifest/checker/tests/runbook and QA evidence remain outside this directory.
