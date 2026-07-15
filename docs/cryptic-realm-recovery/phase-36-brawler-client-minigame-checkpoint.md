# Phase 36: Implement Brawler Client and Minigame Checkpoint

## Purpose

Build original P1-P4 brawler presentation, prove every minigame offline/online, and checkpoint-promote only after dedicated QA PASS.

## Deliverables

- Create original/licensed platform arenas, audio, characters/skins, controls, camera, HUD, hit/launch/hitstun/ledge/recovery/ring-out feedback, accessibility, and mobile behavior.
- Run P1-P4 versus players/NPCs through jump/aerial/platform/ledge/fall-zone/knockback/stocks/score/reconnect flows.
- Run P1-P4 offline/online regression for Vale Cup, `gauntlet_reference_session`, racing, and brawler with bots, rewards, screenshots, console, bandwidth, and performance.
- Prepare an immutable minigame candidate and evidence for the separate QA session; that QA alone may issue PASS, activate/promote/verify, or roll back.

### Starter Prompt

~~~text
This is Phase 36 of Cryptic Realm Recovery and Modernization: Implement Brawler Client and Minigame Checkpoint.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Build original P1-P4 brawler presentation, prove every minigame offline/online, and checkpoint-promote only after dedicated QA PASS.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 35 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-36-brawler-client-minigame-checkpoint.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- all minigame/racing/brawler phases
- the default-off `gauntlet_reference_session` adapter/scenario established in Phase 31 from `upstream/feature/gauntlet-event` at `196487c8688825d6831278191d3160e622142ec5`
- co-op harness
- promotion pipeline
- tmp/qa-loop artifacts
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Create original/licensed platform arenas, audio, characters/skins, controls, camera, HUD, hit/launch/hitstun/ledge/recovery/ring-out feedback, accessibility, and mobile behavior.
- Run P1-P4 versus players/NPCs through jump/aerial/platform/ledge/fall-zone/knockback/stocks/score/reconnect flows.

Integration/evidence agent:
- Run P1-P4 offline/online regression for Vale Cup, `gauntlet_reference_session`, racing, and brawler with bots, rewards, screenshots, console, bandwidth, and performance.
- Prepare an immutable minigame candidate and evidence for the separate QA session; that QA alone may issue PASS, activate/promote/verify, or roll back.

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
- npm run gate
- npm run security:gate
- P1-P4 every-minigame matrix
- explicit `gauntlet_reference_session` rows for P1-P4 offline/online lifecycle, bots, reconnect, reward, and cleanup
- npm run asset:budget
- npm run perf:tour
- stage soak/screenshots/console

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and give it to a fresh generic read-only subagent or use woc-release-malware-audit.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(brawler): add original client experience
- test(minigames): complete four-player matrix
- chore(release): prepare minigame checkpoint

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Brawler includes every locked platform mechanic and P1-P4 readability.
- [ ] Every minigame works offline/online for one through four players.
- [ ] The Phase 31 `gauntlet_reference_session` identity and source trace remain intact through checkpoint evidence.
- [ ] No license, authority, reward, performance, or console failure remains.
- [ ] PASS precedes promotion; post-deploy failure rolls back.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 36 QA handoff.

STOPPING RULES:
- Do not promote one incomplete minigame inside the checkpoint.
- Do not substitute an unnamed or ad hoc reference session for `gauntlet_reference_session`.
- Do not use production dev commands or leave QA data.
~~~
