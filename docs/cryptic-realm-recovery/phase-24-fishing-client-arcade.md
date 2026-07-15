# Phase 24: Implement Fishing Presentation and Arcade Separation

## Purpose

Render world fishing in the real world and lock the approved Cryptic Fishing Arcade name and reward separation.

## Deliverables

- Render rod/line/bobber/bite/reel feedback, sound/accessibility cues, and authoritative cancellation/failure states.
- Implement keyboard/controller/touch controls and mobile-safe HUD with every-locale copy.
- Rename every old arcade entrypoint/copy to Cryptic Fishing Arcade and keep it clearly inside arcade navigation.
- Mechanically prohibit arcade mode from minting world items/currency and add visual/view/input/reward-boundary tests.

### Starter Prompt

~~~text
This is Phase 24 of Cryptic Realm Recovery and Modernization: Implement Fishing Presentation and Arcade Separation.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Render world fishing in the real world and lock the approved Cryptic Fishing Arcade name and reward separation.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 23 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-24-fishing-client-arcade.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- src/ui/cryptic/minigames.ts
- src/ui
- src/render
- src/game
- scripts/fishing_visual.mjs
- i18n
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Render rod/line/bobber/bite/reel feedback, sound/accessibility cues, and authoritative cancellation/failure states.
- Implement keyboard/controller/touch controls and mobile-safe HUD with every-locale copy.

Integration/evidence agent:
- Rename every old arcade entrypoint/copy to Cryptic Fishing Arcade and keep it clearly inside arcade navigation.
- Mechanically prohibit arcade mode from minting world items/currency and add visual/view/input/reward-boundary tests.

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
- focused fishing view/input/arcade tests
- npx vitest run tests/localization_fixes.test.ts
- npm run asset:budget
- desktop/controller/phone fishing visuals

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(render): present world fishing
- refactor(arcade): lock fishing arcade name
- test(fishing): prove reward isolation

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] World fishing is visibly in-world and accessible.
- [ ] Cryptic Fishing Arcade naming is consistent and locked.
- [ ] Arcade cannot award world economy value.
- [ ] No console/visual/mobile failures.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 24 QA handoff.

STOPPING RULES:
- Do not remove or rename arcade mode away from the approved name.
- Do not duplicate fishing reward logic in UI.
~~~
