# Phase 37: Define Town RTS Domain, Pilot Towns, and Balance

## Purpose

Define deterministic instanced town RTS for the first approved Cryptic Realm towns with explicit persistence and balance sources.

## Deliverables

- Lock pilot scope to instanced Eastbrook first and Highwatch second on Cryptic Realm, never mutating the shared open-world town; each campaign is account-owned with explicit co-op ACL.
- Define build grid, structures, resources, production, units, deterministic pathing, attacks, objectives, win/loss, cleanup, and no paid advantage.
- Source footprints/terrain from existing town content, combat math from canonical vanilla-WoW formulas where applicable, and RTS economy/timing from versioned data justified by deterministic bot simulations, never unexplained literals.
- Implement domain/headless prototypes and same-seed/pathing/load/balance-envelope tests behind default-off flags.

### Starter Prompt

~~~text
This is Phase 37 of Cryptic Realm Recovery and Modernization: Define Town RTS Domain, Pilot Towns, and Balance.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Define deterministic instanced town RTS for the first approved Cryptic Realm towns with explicit persistence and balance sources.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 36 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-37-rts-domain-balance.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- Eastbrook zone1 props/content
- Highwatch zone3 content
- minigame platform
- sim pathing/combat
- classic formula references
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Lock pilot scope to instanced Eastbrook first and Highwatch second on Cryptic Realm, never mutating the shared open-world town; each campaign is account-owned with explicit co-op ACL.
- Define build grid, structures, resources, production, units, deterministic pathing, attacks, objectives, win/loss, cleanup, and no paid advantage.

Integration/evidence agent:
- Source footprints/terrain from existing town content, combat math from canonical vanilla-WoW formulas where applicable, and RTS economy/timing from versioned data justified by deterministic bot simulations, never unexplained literals.
- Implement domain/headless prototypes and same-seed/pathing/load/balance-envelope tests behind default-off flags.

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
- focused RTS domain/pathing tests
- same-seed bot simulations
- 20 Hz load budget
- content referential integrity

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(rts): define instanced town campaigns
- feat(rts): add sourced balance data
- test(rts): prove deterministic pathing

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] First towns, realm, instance model, ownership/ACL, and persistence boundary are locked.
- [ ] Open-world towns remain untouched.
- [ ] Balance values have explicit source/simulation evidence.
- [ ] Domain stays deterministic within budget.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 37 QA handoff.

STOPPING RULES:
- Do not enable Highwatch before Eastbrook domain QA passes.
- Do not invent combat formulas or hide economy constants in code.
~~~
