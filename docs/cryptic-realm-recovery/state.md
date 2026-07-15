# Cross-Session State

Update this file after every implementation and QA session. Preserve factual progress.

## Current checkpoint

- Current phase: Phase 01
- Status: in progress
- Recovery baseline: upstream/release/v0.26.0, exact execution ref to be re-resolved
- Latest-stable discovery: required on every upstream intake
- Current integration commit: not pinned
- Last green npm run gate commit: none for this program
- Last checkpoint promotion: none for this program
- Current production evidence: Proxmox 192.168.0.6, LXC 171, /opt/cryptic-realm, preserved HEAD 46be1494c58bf25ed6ac6c89884a80d5f5fbf639
- Legacy profile: idyllic-games-prod /opt/eastbrook release/v0.6, unresolved/unverified, never auto-target
- Rollback artifacts: Git, database, and encrypted runtime-config recovery assets verified;
  PAT revocation, independent key custody, immutability/integrity, least-privilege deploy
  access, history scanning, and retention closeout remain open

## Phase 01 verified evidence and open security findings

- Private recovery prerelease recovery-lxc171-20260714 is private, unauthenticated 404
  verified, and every uploaded asset digest passed. It remains mutable and its tag is a
  carrier rather than the captured production HEAD.
- 2,138,707,400-byte 385-ref Git bundle verified on LXC, host, and workstation.
- Disposable mirror restore, exact live ref, git fsck, and cleanup passed.
- Encrypted PostgreSQL custom dump passed list, disposable restore, required-table/nonempty, and cleanup checks.
- Encrypted actual env/realm env/systemd/nginx/deploy-key runtime config passed stream restore.
- Recovery-key export has a restrictive ACL and was not uploaded, but it lacks
  passphrase/S2K protection and is co-resident with encrypted workstation archives.
- Clean worktree covers tracked assets; no upload directories existed.
- URL credential removed; production LXC Git now uses a verified read-only deploy key, and
  backup publication is separated from the runtime identity.
- Account-side revocation of the old PAT remains unresolved and blocks promotion.
- Gitleaks 8.30.1 all-refs/full-history triage is complete: 42 redacted findings across 19
  commits, 0 live/possibly-live secrets, 0 historical credentials requiring rotation,
  4 fixtures, 14 benign content primaries, and 24 duplicates. Every public candidate still
  requires a fresh minimal-patch scan and narrow fingerprint baselines.
- Two email/service-like identifiers and one long external account identifier were redacted
  from ignored historic QA evidence; a final sharing-scope review remains required.
- A sanitized ENVIRONMENT-IDENTITY.md is stored with the private recovery release.
- `npm run security:gate` passed on 2026-07-15 across 4,679 files with zero unapproved
  high-severity findings.

## Locked decisions

- Permanent guards live at config/cryptic-recovery/features.json, scripts/admin/check_recovery_manifest.mjs, tests/recovery_manifest.test.ts, and docs/operations/cryptic-recovery-runbook.md.
- Current production is LXC 171 only as evidenced; legacy profile remains inventory until classified.
- One production baseline only after identity reconciliation.
- v0.26.0 is recovery baseline; every intake rechecks latest stable.
- Phases 05 through 07 repeat in ascending stable-release order after v0.26.0 until no discovered stable release is pending before the foundation checkpoint.
- The prepared compatibility-line tip descended from the manifest-pinned Cryptic anchor is
  merge parent one; the exact pinned current-cycle upstream stable ref is parent two.
- Private overlays stay under explicit realm/UI/config/branding/asset registries.
- Incomplete systems are server-controlled default-off.
- GitHub CI runs QA on every pushed branch; release branches receive the stricter release tier.
- Checkpoint QA writes PASS, then invokes automatic production promotion.
- Stage is mandatory. Phase 02 manifests a safe related-LXC stage if one exists; otherwise
  Phase 04 provisions an isolated ephemeral stage from the exact artifact with sanitized
  QA-only data, no production credentials/keys/webhooks/PR side effects/public ingress, dev
  cheats OFF, and verified teardown. Failure injection is stage-only.
- Every checkpoint requires npm run gate, npm run security:gate, release malware audit,
  clean REPORT, an immutable private Git ref or verified private bundle, DB/runtime-config
  backup and restore evidence, retention, verified rollback, stage smoke, schema/wire canary,
  and all-or-nothing ring rollback. A mixed-version production ring is forbidden.
- Phase 09 establishes the reusable outbound-delivery/state/idempotency/retry/dead-letter/
  reconciliation foundation. Phase 10 establishes its privacy-safe public/operator status
  projection and contribution-site checkpoint. Phase 45 adds only bug-report-specific
  security/parity behavior.
- Phase 11 establishes versioned offline profiles, per-realm character selection, and
  migration before co-op UI work. Phase 14 owns only squad transition state on that
  foundation; Phase 46 performs historical parity and migration hardening, including the
  exact duplicate-realm-entry regression.
- Co-op definition includes every explicit gameplay/social/economy/talent/per-player state for P1-P4 offline/online and deep Infernal controller coverage.
- Emerald Wyrm is initially flight-capable; all three mounts are ground-ridable.
- DuranceTester normalization is exact durancetester via canonical name normalization, no fuzzy match. Code is target-neutral; live action happens only after code/schema checkpoint promotion and dedicated QA PASS.
- Cryptic Fishing Arcade is the approved locked name and has no world-economy authority.
- Online Exchange uses integer copper-equivalent money, exact server/DB conservation,
  reservations, non-owning projected inventory, leases, and disabled gameplay. Offline
  Exchange uses a separate versioned local-profile ledger and is permanently non-syncable,
  non-importable, and non-exportable to online identities, listings, money, or items.
- Racing has drift/boost/terrain/obstacles/fair seeded items.
- Brawler has jump/aerial/platforms/ledges/vertical recovery/hitstun/knockback scaling/fall zones/ring-outs.
- RTS pilots Eastbrook then Highwatch on Cryptic Realm in account-owned instanced campaigns with co-op ACL.
- Bug-report hardening, offline-profile parity hardening, and Xbox/Tauri/store are explicit
  recovery tracks. Web/server promotion and store-channel publication remain separate
  artifacts and state machines even when Phase 47 verifies them together.

## Non-negotiable repository constraints

- Deterministic DOM-free sim, fixed 20 Hz, Rng only.
- UI/render use IWorld; implement Sim and ClientWorld plus headless.
- Server authority for identity, movement, combat, loot, rewards, economy, custody, entitlements.
- Additive idempotent indexed DDL; old saves load; rollback preserves forward data.
- English key then every locale; matcher coverage.
- Never hand-edit generated files.
- Preserve concurrent changes; explicit staging; never git add -A.
- No secrets/personal data in Git, logs, reports, URLs, bundles, fixtures, or client.
- No production dev commands.

## QA artifact contract

- LEDGER: timestamp, phase/iteration, candidate, environment profile, scenarios, verdict, failures, fixes/SHAs, validations, next action.
- REPORT scenario: id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- REPORT also: baseline comparison, fixes/SHAs, prioritized follow-ups, cleanup, screenshots, console results, gate/malware results.
- Promotable final line: `CONVERGED — all in-scope green locally on <commit>`
- Failed/blocked final line: `STOPPED — <reason>`

## Validation matrix

| Surface | Required checks |
|---|---|
| Full candidate/checkpoint | npm run gate |
| Malware/security | npm run security:gate plus .claude/agents/release-malware-audit.md or woc-release-malware-audit |
| Sim | focused tests, determinism trace, architecture reviewer |
| Wire | snapshots, env_protocol, bandwidth, rolling canary |
| Persistence | DDL twice, old-save, round trip, crash/retry, migration reviewer |
| UI | focused view/frame, localization, desktop/phone/controller, screenshots, console |
| Assets | owning generator, provenance, npm run asset:budget |
| Performance | fixed-tick load, bandwidth, npm run perf:tour |
| Environment | immutable profile match before mutation |
| Promotion | clean report, backups/restore, stage, PASS, promote, verify/rollback |

## Reviewer execution

Build the reviewer set from the actual phase-start diff, exercised surfaces, and risk;
normally dispatch one or two matched reviewers, while docs/test-only changes may need none.
Read each matching `.claude/agents` prompt completely and give it to a fresh generic
read-only Codex subagent, or use the equivalent WOC skill. Derive concurrency from available
runtime slots and use bounded waves when Workflow/ultracode is unavailable. Batch-heavy
inventories and scenario matrices prefer a Workflow plus CSV fan-out. Every release
checkpoint always receives release-malware review. Request coverage and structured
BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT output, and close all BLOCKING and
SHOULD-FIX findings before commit.

## Handoff log

| UTC date | Phase | Commit(s) | Validation | New surfaces | Risks/deferrals | Next action |
|---|---|---|---|---|---|---|
| 2026-07-14 | Packet rewrite | uncommitted docs | 103 files, 48 implementation and 48 QA prompts, links/fences/copy/structure validated | 48-phase recovery design | Phase 01 closeout remains | Finish Phase 01 |
