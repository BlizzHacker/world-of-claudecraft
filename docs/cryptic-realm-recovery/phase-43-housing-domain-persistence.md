# Phase 43: Implement Approved Housing Domain and Persistence

## Purpose

Implement only approved deterministic housing ownership/build/visit/access/moderation/deletion behavior with safe persistence.

## Deliverables

- Implement IWorld-first deterministic building/placement/ownership/access/visit/deletion rules for approved slices behind default-off flags.
- Add additive indexed housing/ACL/moderation/deletion persistence with old-save, DDL-twice, retention, and forward-rollback behavior.
- Implement server/net/headless authority, rate limits, audit, reconnect, and privacy-safe responses.
- Add auth, cross-account, moderation, deletion, migration, retry, parity, and bandwidth tests.

### Starter Prompt

~~~text
This is Phase 43 of Cryptic Realm Recovery and Modernization: Implement Approved Housing Domain and Persistence.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Implement only approved deterministic housing ownership/build/visit/access/moderation/deletion behavior with safe persistence.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 42 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-43-housing-domain-persistence.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- approved Phase 42 slices
- src/world_api.ts
- src/sim
- server/db.ts
- src/net
- headless
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Implement IWorld-first deterministic building/placement/ownership/access/visit/deletion rules for approved slices behind default-off flags.
- Add additive indexed housing/ACL/moderation/deletion persistence with old-save, DDL-twice, retention, and forward-rollback behavior.

Integration/evidence agent:
- Implement server/net/headless authority, rate limits, audit, reconnect, and privacy-safe responses.
- Add auth, cross-account, moderation, deletion, migration, retry, parity, and bandwidth tests.

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
- focused housing domain/auth/persistence tests
- DDL twice and old-save fixtures
- wire/bandwidth tests
- npm run build:server
- npm run build:env

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
- feat(housing): restore safe domain
- feat(db): persist housing safely
- test(housing): cover auth and migration

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Only approved slices are reachable.
- [ ] Ownership/access/moderation/deletion are authoritative.
- [ ] Persistence is additive and privacy-safe.
- [ ] All hosts and rollback canary pass.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 43 QA handoff.

STOPPING RULES:
- Do not reintroduce quarantined external behavior.
- Do not make deletion non-auditable or irreversible without retention policy.
~~~
