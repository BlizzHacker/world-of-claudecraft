# Phase 12: Implement Offline Co-op Input, HUD, and Baseline

## Purpose

Implement complete offline one-to-four-player creation/selection, controller ownership, gameplay baseline, and per-player UI.

## Deliverables

- Implement P2-P4 character create/select, controller/keyboard join/reconnect/leave, pause, and duplicate-input prevention.
- Implement shared camera, per-player inventory/HUD/target/talents/quest state, accessibility, phone safe areas, and console-error-free overlays.
- Exercise movement, target, autoattack, cast, loot, quest accept/credit/turn-in, talents, and death/respawn/regroup for each player.
- Exercise chat say/yell/whisper/party, party invite/auto-party, trade, duel, and market browse/sell/buy offline, adding deterministic local equivalents where an online-only service currently blocks the flow.

### Starter Prompt

~~~text
This is Phase 12 of Cryptic Realm Recovery and Modernization: Implement Offline Co-op Input, HUD, and Baseline.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Implement complete offline one-to-four-player creation/selection, controller ownership, gameplay baseline, and per-player UI.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 11 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-12-coop-offline-client.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- src/game
- src/ui
- src/render
- src/main.ts
- offline co-op recovered commits
- talent known-issue rules
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Implement P2-P4 character create/select, controller/keyboard join/reconnect/leave, pause, and duplicate-input prevention.
- Implement shared camera, per-player inventory/HUD/target/talents/quest state, accessibility, phone safe areas, and console-error-free overlays.

Integration/evidence agent:
- Exercise movement, target, autoattack, cast, loot, quest accept/credit/turn-in, talents, and death/respawn/regroup for each player.
- Exercise chat say/yell/whisper/party, party invite/auto-party, trade, duel, and market browse/sell/buy offline, adding deterministic local equivalents where an online-only service currently blocks the flow.

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
- focused offline coop/controller/UI tests
- npx vitest run tests/localization_fixes.test.ts
- npm run build:env
- one-to-four-player browser E2E with screenshots and console capture
- phone viewport smoke

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(coop): complete offline player flow
- feat(coop): add per-player hud
- test(coop): cover full offline baseline

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] P2-P4 can create/select and join with stable controller ownership.
- [ ] Every player has correct inventory/HUD/target/talent/quest state.
- [ ] Full gameplay/social/economy baseline works for one through four offline players.
- [ ] Warrior talents render nodes; other eight classes show localized coming-soon placeholders.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 12 QA handoff.

STOPPING RULES:
- Do not auto-author missing talent trees.
- Do not hide console errors or skip screenshots for failed scenarios.
~~~
