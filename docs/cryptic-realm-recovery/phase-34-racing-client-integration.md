# Phase 34: Implement Racing Client and One-to-Four-Player Integration

## Purpose

Build original racing content, controls, camera, HUD, and full one-to-four-player offline/online integration.

## Deliverables

- Create original/licensed vehicles, tracks, terrain, obstacles, items, audio, and provenance records within asset budgets.
- Implement P1-P4 keyboard/controller/touch input, shared/split camera based on measured readability, countdown/lap/placement/item/recovery HUD, and accessibility.
- Run P1-P4 offline/online races with bots, drift/boost/items, reconnect, simultaneous finish, and console/screenshot evidence.
- Add visual, mobile, input, localization, asset, render, bandwidth, and soak tests.

### Starter Prompt

~~~text
This is Phase 34 of Cryptic Realm Recovery and Modernization: Implement Racing Client and One-to-Four-Player Integration.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Build original racing content, controls, camera, HUD, and full one-to-four-player offline/online integration.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 33 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-34-racing-client-integration.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- racing domain
- src/game
- src/ui
- src/render
- asset pipeline
- co-op/minigame harness
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Create original/licensed vehicles, tracks, terrain, obstacles, items, audio, and provenance records within asset budgets.
- Implement P1-P4 keyboard/controller/touch input, shared/split camera based on measured readability, countdown/lap/placement/item/recovery HUD, and accessibility.

Integration/evidence agent:
- Run P1-P4 offline/online races with bots, drift/boost/items, reconnect, simultaneous finish, and console/screenshot evidence.
- Add visual, mobile, input, localization, asset, render, bandwidth, and soak tests.

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
- focused racing client/online tests
- npx vitest run tests/localization_fixes.test.ts tests/snapshots.test.ts tests/bandwidth.test.ts
- npm run asset:budget
- npm run perf:tour
- P1-P4 offline/online race E2E

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
- feat(racing): add original tracks and client
- test(racing): cover four-player integration

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] P1-P4 can race with readable controls/camera/HUD.
- [ ] Drift/boost/terrain/obstacles/items/bots remain authoritative and fair.
- [ ] All content provenance is approved.
- [ ] Mobile/console/performance gates pass.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 34 QA handoff.

STOPPING RULES:
- Do not lock a camera mode without measured four-player evidence.
- Do not ship unlicensed or third-party-identifying content.
~~~
