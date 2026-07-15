# Phase 38: Implement Town RTS Persistence and Wire

## Purpose

Persist campaign layouts/progress safely and expose server-authoritative co-op commands through versioned host-parity surfaces.

## Deliverables

- Add additive indexed campaign/layout/ACL/version/checkpoint persistence keyed by realm, town, campaign owner, with old-save and forward-rollback compatibility.
- Implement placement/resource/production/unit/attack commands server-side with stale-version/idempotency/permission validation.
- Extend IWorld/ClientWorld/headless and compact delta snapshots for structures, units, objectives, resources, and reconnect recovery.
- Add concurrent builders, path blockage, queue cancel, owner disconnect, process crash, old data, wire canary, and bandwidth tests.

### Starter Prompt

~~~text
This is Phase 38 of Cryptic Realm Recovery and Modernization: Implement Town RTS Persistence and Wire.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Persist campaign layouts/progress safely and expose server-authoritative co-op commands through versioned host-parity surfaces.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 37 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-38-rts-persistence-wire.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- server/db.ts
- RTS domain
- src/world_api.ts
- src/net
- server/game.ts
- headless
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Add additive indexed campaign/layout/ACL/version/checkpoint persistence keyed by realm, town, campaign owner, with old-save and forward-rollback compatibility.
- Implement placement/resource/production/unit/attack commands server-side with stale-version/idempotency/permission validation.

Integration/evidence agent:
- Extend IWorld/ClientWorld/headless and compact delta snapshots for structures, units, objectives, resources, and reconnect recovery.
- Add concurrent builders, path blockage, queue cancel, owner disconnect, process crash, old data, wire canary, and bandwidth tests.

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

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- focused RTS persistence/online tests
- DDL twice and old-save fixtures
- npx vitest run tests/snapshots.test.ts tests/env_protocol.test.ts tests/bandwidth.test.ts
- crash/reconnect/concurrent builder fixtures

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(db): persist town campaigns
- feat(net): mirror rts sessions
- test(rts): cover crash and concurrency

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Campaign data round-trips and rolls forward safely.
- [ ] Commands validate ownership/version/resources.
- [ ] Reconnect restores one authoritative state.
- [ ] Snapshots and tick remain bounded.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 38 QA handoff.

STOPPING RULES:
- Do not persist per-tick transient state unnecessarily.
- Do not allow ACL or resource decisions from client state.
~~~
