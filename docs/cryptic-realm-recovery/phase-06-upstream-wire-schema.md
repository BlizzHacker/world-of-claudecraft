# Phase 06: Integrate Upstream Wire and Schema Compatibility

## Purpose

Prepare the pinned current-cycle server, net, wire, and persistence changes on the Cryptic
compatibility line with additive schema and rolling canary behavior before Phase 07's final
true merge.

## Deliverables

- Port and reconcile the pinned current-cycle server/net protocol changes with explicit wire
  versioning and old-client/new-server plus new-client/old-server canary behavior.
- Reconcile inline DDL and JSONB serializers additively with old-save round trips, indexes, and boot idempotency.
- Define all-or-nothing application rollback compatibility for forward-created data without destructive down-migration.
- Update permanent endpoint, wire, schema, and migration contracts.

### Starter Prompt

~~~text
This is Phase 06 of Cryptic Realm Recovery and Modernization: Integrate Upstream Wire and Schema Compatibility.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Prepare pinned current-cycle server, net, wire, and persistence compatibility before
Phase 07 creates the final true merge.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 05 QA is complete.
- Read progress.md and state.md first and preserve all completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-06-upstream-wire-schema.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- exact current-cycle upstream release ref pinned by Phase 05
- server/CLAUDE.md
- src/net/CLAUDE.md
- server/db.ts and related DB files
- src/net/online.ts
- server/game.ts
- headless and python protocol surfaces
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact current behavior, source refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and plan drift. Do not trust stale line numbers. For external APIs/SDKs/formulas/licenses, spawn a separate web-research subagent using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this vertical split explicitly. Give each agent only the Explore summary and owned files. Agents write tests for their changes.

Domain/authority agent:
- Port and reconcile the pinned current-cycle server/net protocol changes with explicit wire
  versioning and old-client/new-server plus new-client/old-server canary behavior.
- Reconcile inline DDL and JSONB serializers additively with old-save round trips, indexes, and boot idempotency.

Integration/evidence agent:
- Define all-or-nothing application rollback compatibility for forward-created data without destructive down-migration.
- Update permanent endpoint, wire, schema, and migration contracts.

INVARIANTS:
- Deterministic DOM-free 20 Hz sim; Rng only; no Math.random, Date.now, or performance.now in src/sim.
- IWorld first; implement Sim and ClientWorld plus headless where relevant.
- Server authority for identity, movement, combat, loot, rewards, economy, custody, and entitlements.
- Additive/idempotent/indexed DDL; old saves load; forward data survives application rollback.
- Versioned wire/schema canary compatibility.
- English i18n key first, then every locale and matcher.
- Controller/touch/mobile/accessibility are first-class.
- No secrets, personal data, target IDs, unlicensed content, or production dev commands.
- Test new code; remove proven dead replacements; regenerate generated files.
- Explicit staging only; never git add -A.
- Append a UTC entry to tmp/qa-loop/LEDGER.md. Update REPORT scenario evidence when behavior is exercised.

OUT OF SCOPE:
- Production mutation or feature activation from this implementation session.
- Later-phase systems, unrelated cleanup, destructive history/schema/data changes.
- Product decisions outside state.md and this prompt.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- npx vitest run tests/snapshots.test.ts tests/env_protocol.test.ts tests/bandwidth.test.ts
- old-save and DDL-twice fixtures
- rolling-version canary matrix
- npm run build:server
- npm run build:env

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If the actual diff adds another matching surface, dispatch its matching .claude/agents prompt too.
- Request COVERAGE, including low-severity and uncertain findings. Require BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
Use explicit paths and these Conventional Commit targets:
- feat(net): reconcile current stable wire protocol
- fix(db): preserve forward-compatible state
- test(net): add rolling canary matrix

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Wire mismatches fail safely or remain explicitly compatible during the canary window.
- [ ] Old saves load without loss and DDL is additive/idempotent/indexed.
- [ ] Rollback application code can read forward-created data.
- [ ] Permanent contracts name every changed protocol/schema surface.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress.md and state.md with UTC timestamps, exact SHAs, identifiers, tests, reviewer verdicts, evidence, risks, and next action.
- Update feature-inventory.md and permanent manifest/runbook contracts when applicable.
- Append LEDGER. REPORT scenarios use id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files, commits, focused validation, reviewers, LEDGER/REPORT changes, deferrals, feature-flag state, and one-line handoff to Phase 06 QA.

STOPPING RULES:
- Do not ship an unversioned incompatible wire change.
- Do not add a destructive rollback migration.
- Do not create or carry an uncommitted merge; Phase 07 owns the final true merge.
~~~
