# Phase 15: Complete Co-op Baseline and Release Checkpoint

## Purpose

Prove the full one-to-four-player offline/online baseline on every realm, especially online controller join/reconnect on Infernal, then checkpoint-promote only after QA PASS.

## Deliverables

- Run P1-P4 create/select/join, auto-party, movement, target/autoattack/cast, loot, quests, death, and per-player HUD/inventory/talents across offline and online.
- Run chat say/yell/whisper/party, invite, trade, duel, and market browse/sell/buy with ownership and disconnect/reconnect coverage.
- Run every-realm smoke plus full Infernal online controller join/reconnect, camera, combat,
  transition, death, console/screenshot evidence, and exact duplicate-realm-entry regression
  `6564b2bca90d5b0979994e6e76e27743a3aab2c1` across reload and realm switching; Phase 46
  retains broader migration/import/export parity hardening.
- Prepare the co-op feature flag and immutable candidate for the separate QA session; that QA alone may issue PASS, invoke promotion/verification, or roll back.

### Starter Prompt

~~~text
This is Phase 15 of Cryptic Realm Recovery and Modernization: Complete Co-op Baseline and Release Checkpoint.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Prove the full one-to-four-player offline/online baseline on every realm, especially online controller join/reconnect on Infernal, then checkpoint-promote only after QA PASS.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 14 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-15-coop-integration-checkpoint.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- all co-op phases
- scripts/mp_integration.mjs
- raw WS/fetch bots
- window.__game
- tmp/qa-loop artifacts
- promotion control plane
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Run P1-P4 create/select/join, auto-party, movement, target/autoattack/cast, loot, quests, death, and per-player HUD/inventory/talents across offline and online.
- Run chat say/yell/whisper/party, invite, trade, duel, and market browse/sell/buy with ownership and disconnect/reconnect coverage.

Integration/evidence agent:
- Run every-realm smoke plus full Infernal online controller join/reconnect, camera, combat, transition, death, and console/screenshot evidence.
- Prepare the co-op feature flag and immutable candidate for the separate QA session; that QA alone may issue PASS, invoke promotion/verification, or roll back.

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
- one-to-four offline/online full baseline matrix
- all-realm status and Infernal deep E2E
- stage soak with screenshots and console-error assertions

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and give it to a fresh generic read-only subagent or use woc-release-malware-audit.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- test(coop): complete full realm matrix
- chore(release): prepare coop checkpoint

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Every explicit gameplay/social/economy/talent scenario passes for P1-P4 offline and online, with a deterministic local equivalent for services that were previously online-only.
- [ ] Infernal online controller join/reconnect and camera remain correct.
- [ ] QA accounts obey naming/rate limits and are cleaned; any console error is FAIL.
- [ ] Pre-promotion QA PASS precedes flag activation and production mutation.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 15 QA handoff.

STOPPING RULES:
- Do not activate co-op while any P2-P4 baseline row is red.
- Do not use production dev commands or leave QA accounts.
~~~
