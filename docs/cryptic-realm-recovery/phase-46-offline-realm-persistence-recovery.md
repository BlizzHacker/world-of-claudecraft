# Phase 46: Harden Offline Realm Persistence Parity and Migration

## Purpose

Harden parity and migrations on the offline squad identity, realm-transition, selection, and persistence foundation established in Phases 11 and 14, recovering only missing live deltas without cross-realm bleed or destructive storage migration.

## Deliverables

- Patch-ID compare live commits `b4a1f594`, `854615ab`, and exact duplicate-realm-entry fix `6564b2bca90d5b0979994e6e76e27743a3aab2c1` to the Phase 11/14 offline squad/transition/persistence foundation; classify every delta and stop if that foundation is absent rather than reimplementing it.
- Harden existing stable storage keys/version adapters with additive legacy migration, backup/rollback, corruption handling, forward-data preservation, and no cross-realm/class/player bleed.
- Close parity gaps in existing P1-P4 create/select state, realm switching, controller reconnect,
  deletion, and import/export ownership without introducing a second realm registry or
  persistence owner. Import/export must reject or strip every Offline Exchange ledger entry;
  it may never create online identities, listings, escrow, money, or items.
- Add exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` duplicate-realm-entry regression coverage plus browser migration, corruption, realm isolation, P1-P4, and permanent F-025 tests.

### Starter Prompt

~~~text
This is Phase 46 of Cryptic Realm Recovery and Modernization: Harden Offline Realm Persistence Parity and Migration.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Harden the Phase 11/14 offline persistence foundation for live parity and safe migration without reimplementing realm identity, transition, selection, or storage ownership.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 45 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-46-offline-realm-persistence-recovery.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- live commits `b4a1f594`, `854615ab`, and exact duplicate-realm-entry fix `6564b2bca90d5b0979994e6e76e27743a3aab2c1`
- Phase 11 squad/member identity, ownership, create/select, reconnect, and per-player-state contracts
- Phase 14 registered-realm transition matrix, offline realm/character persistence, version/default/rollback contracts, and duplicate/recovery tests
- realm_env
- browser storage/persistence
- co-op create/select
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Patch-ID compare `b4a1f594`, `854615ab`, and `6564b2bca90d5b0979994e6e76e27743a3aab2c1` to the Phase 11/14 foundation; build a parity matrix and classify every delta as recovered, superseded, rejected, or dead-letter. If the shared foundation is missing, STOP and return the defect to Phase 11/14.
- Harden the existing persistence owner and storage-key/version adapters with additive backup-first migration, rollback, corruption quarantine, forward-data preservation, and no cross-realm/class/player bleed.

Integration/evidence agent:
- Close only proven parity gaps in existing P2-P4 create/select, realm switching, controller reconnect, deletion, and import/export ownership; retain the Phase 11 member identity and Phase 14 realm registry/transition owners.
- Add browser migration, corruption, realm isolation, P1-P4, permanent F-025, and an exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` regression proving normalization/rendering never creates a duplicate realm entry across reload, migration, import, or repeated switching.

INVARIANTS:
- Deterministic DOM-free 20 Hz sim; Rng only; no prohibited clocks/randomness.
- IWorld first; Sim and ClientWorld plus headless parity.
- Server authority for identity, movement, combat, loot, rewards, economy, custody, entitlements.
- Additive/idempotent/indexed DDL; old saves; forward-data-safe rollback; versioned canary.
- Every-locale i18n and matcher coverage; controller/touch/mobile/accessibility.
- No secrets, personal/target data, unlicensed content, or production dev commands.
- Tests for new code; remove proven dead code; regenerate generated output.
- Explicit staging only; never git add -A.
- Append UTC LEDGER evidence and exact REPORT scenario fields when behavior is exercised.

OUT OF SCOPE:
- Production mutation/activation, later phases, unrelated cleanup, destructive history/schema/data, and unlocked product decisions.
- Reimplementing Phase 11 squad identity/create/select or Phase 14 realm registry/transition/persistence ownership, or adding parallel storage keys without a versioned migration.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- focused offline realm persistence tests
- legacy/corrupt storage fixtures
- exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` duplicate-realm-entry fixture across reload, migration, import, and repeated realm switching
- P1-P4 realm switch browser E2E
- npx tsc --noEmit

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(offline): recover realm persistence
- test(offline): guard realm isolation

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Offline characters persist per realm without bleed.
- [ ] Legacy data migrates/rolls back safely.
- [ ] P1-P4 selection/reconnect works through the Phase 11/14 ownership model without duplicate registry/persistence logic.
- [ ] Exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` duplicate-realm-entry regression and F-025 permanent guard are decisive.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 46 QA handoff.

STOPPING RULES:
- Do not overwrite unknown user storage without backup/version check.
- Do not merge offline state into online authoritative records.
- Do not create a second realm registry, member identity model, transition service, or persistence owner.
- If the Phase 11/14 foundation is missing, stop and repair it before continuing Phase 46.
~~~
