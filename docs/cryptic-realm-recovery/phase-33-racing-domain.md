# Phase 33: Implement Original Kart Racing Domain

## Purpose

Implement deterministic original racing with drift, boost, terrain, obstacles, fair items, bots, checkpoints, laps, recovery, and rewards.

## Deliverables

- Recover safe Gauntlet ideas but implement original deterministic vehicle physics, steering, drift charge/release, boost, terrain traction, obstacles/collisions, checkpoints/laps, recovery, placement, and ties.
- Define fair item rules with seeded distribution, anti-chain protection, placement-aware bounds, explicit counters, and no paid advantage.
- Implement server authority, bots, rewards, disconnect/reconnect, invalid checkpoint, and headless parity behind default-off flags.
- Add determinism, fairness property, collision, exploit, bot, load, and performance tests with original/licensed content constraints.

### Starter Prompt

~~~text
This is Phase 33 of Cryptic Realm Recovery and Modernization: Implement Original Kart Racing Domain.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Implement deterministic original racing with drift, boost, terrain, obstacles, fair items, bots, checkpoints, laps, recovery, and rewards.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 32 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-33-racing-domain.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- Gauntlet feature history
- minigame platform
- sim physics/pathing
- asset license sources
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Recover safe Gauntlet ideas but implement original deterministic vehicle physics, steering, drift charge/release, boost, terrain traction, obstacles/collisions, checkpoints/laps, recovery, placement, and ties.
- Define fair item rules with seeded distribution, anti-chain protection, placement-aware bounds, explicit counters, and no paid advantage.

Integration/evidence agent:
- Implement server authority, bots, rewards, disconnect/reconnect, invalid checkpoint, and headless parity behind default-off flags.
- Add determinism, fairness property, collision, exploit, bot, load, and performance tests with original/licensed content constraints.

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
- focused racing physics/bot/fairness tests
- same-seed traces
- four-player plus bot load
- checkpoint/terrain/obstacle exploit fixtures

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
- feat(racing): add original vehicle physics
- feat(racing): add fair items and bots
- test(racing): prove deterministic fairness

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Drift/boost/terrain/obstacles are deterministic and server-authoritative.
- [ ] Items are seeded, bounded, counterable, and demonstrably fair.
- [ ] Bots/headless/reconnect/rewards work.
- [ ] No protected third-party content is used.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 33 QA handoff.

STOPPING RULES:
- Do not use Mario Kart names/assets/audio/tracks/items/balance.
- Do not approve fairness with only average win rate; test distribution and edge cases.
~~~
