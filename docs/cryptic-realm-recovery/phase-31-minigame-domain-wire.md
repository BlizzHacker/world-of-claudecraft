# Phase 31: Implement Reusable Minigame Domain and Wire

## Purpose

Extract a deterministic session lifecycle for queue, roster, ready, countdown, active, score, finish, reward, reconnect, abort, spectators, and bots.

## Deliverables

- Define game-agnostic deterministic session/roster/team/state/reward/bot/reconnect/spectator contracts.
- Extend IWorld first and implement Sim/server/ClientWorld/headless lifecycle plus compact versioned wire.
- Keep game rules in adapters and feature flags default-off; preserve existing Vale Cup behavior and create the specific default-off `gauntlet_reference_session` adapter/scenario from exact ref `upstream/feature/gauntlet-event` at `196487c8688825d6831278191d3160e622142ec5` without replaying that branch wholesale.
- Add invalid transition, ownership, reward, bot, disconnect, cleanup, determinism, parity, bandwidth, load, Vale Cup, and `gauntlet_reference_session` tests.

### Starter Prompt

~~~text
This is Phase 31 of Cryptic Realm Recovery and Modernization: Implement Reusable Minigame Domain and Wire.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Extract a deterministic session lifecycle for queue, roster, ready, countdown, active, score, finish, reward, reconnect, abort, spectators, and bots.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 30 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-31-minigame-domain-wire.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- Vale Cup domain/wire
- Fiesta/arena sessions
- exact `upstream/feature/gauntlet-event` ref at `196487c8688825d6831278191d3160e622142ec5`, including its lifecycle-relevant code/tests and patch-ID disposition from the permanent ledger
- src/world_api.ts
- server/game.ts
- headless
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Define game-agnostic deterministic session/roster/team/state/reward/bot/reconnect/spectator contracts.
- Extend IWorld first and implement Sim/server/ClientWorld/headless lifecycle plus compact versioned wire.

Integration/evidence agent:
- Keep game rules in adapters and feature flags default-off; preserve existing Vale Cup behavior. Recover only the minimum lifecycle-reference behavior from exact Gauntlet ref `196487c8688825d6831278191d3160e622142ec5` into an adapter and end-to-end scenario both named `gauntlet_reference_session`; do not replay or expose the feature branch wholesale.
- Add invalid transition, ownership, reward, bot, disconnect, cleanup, determinism, parity, bandwidth, load, Vale Cup golden, and `gauntlet_reference_session` tests.

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
- focused minigame session tests
- Vale Cup regression tests
- `gauntlet_reference_session` adapter/scenario tests pinned to source ref `196487c8688825d6831278191d3160e622142ec5`
- npx vitest run tests/snapshots.test.ts tests/env_protocol.test.ts tests/bandwidth.test.ts
- npm run build:env
- load scenario

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(minigames): add session lifecycle
- refactor(vale-cup): share session shell
- test(minigames): pin lifecycle parity

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Lifecycle covers every required state and invalid transition.
- [ ] Rewards/rosters remain authoritative.
- [ ] Vale Cup behavior is unchanged.
- [ ] `gauntlet_reference_session` proves the shared lifecycle end to end while remaining default-off and isolated from shared rules.
- [ ] Framework stays within tick/snapshot budgets.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 31 QA handoff.

STOPPING RULES:
- Do not build game-specific rules into the shared lifecycle.
- Do not rewrite Vale Cup wholesale.
- Do not merge `upstream/feature/gauntlet-event`; recover only the patch-ID-classified behavior required by `gauntlet_reference_session`.
~~~
