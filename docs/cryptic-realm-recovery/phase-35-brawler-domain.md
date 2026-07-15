# Phase 35: Implement Platform Arena Brawler Domain

## Purpose

Implement a true deterministic platform brawler with jump, aerial combat, platforms, vertical recovery, ring-outs, hitstun, ledges, fall zones, knockback scaling, stocks/score, and bots.

## Deliverables

- Define grounded/jump/double-jump/fall/aerial/landing/ledge/recovery/hitstun/launch/KO/respawn states and deterministic platform/fall-zone collision.
- Implement damage-based knockback scaling, directional influence bounds, ring-outs, stocks/score, pickups, teams/free-for-all, and finish/tie rules.
- Implement server-authoritative bots, rewards, reconnect, exploit prevention, and headless parity behind default-off flags.
- Add frame-boundary, collision, ledge contention, recovery, hitstun, knockback, ring-out, fairness, determinism, bot, and load tests.

### Starter Prompt

~~~text
This is Phase 35 of Cryptic Realm Recovery and Modernization: Implement Platform Arena Brawler Domain.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Implement a true deterministic platform brawler with jump, aerial combat, platforms, vertical recovery, ring-outs, hitstun, ledges, fall zones, knockback scaling, stocks/score, and bots.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 34 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-35-brawler-domain.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- arena/Fiesta domain
- minigame platform
- sim collision/combat
- original asset rules
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Define grounded/jump/double-jump/fall/aerial/landing/ledge/recovery/hitstun/launch/KO/respawn states and deterministic platform/fall-zone collision.
- Implement damage-based knockback scaling, directional influence bounds, ring-outs, stocks/score, pickups, teams/free-for-all, and finish/tie rules.

Integration/evidence agent:
- Implement server-authoritative bots, rewards, reconnect, exploit prevention, and headless parity behind default-off flags.
- Add frame-boundary, collision, ledge contention, recovery, hitstun, knockback, ring-out, fairness, determinism, bot, and load tests.

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
- focused brawler state/collision/bot tests
- same-seed traces
- four-player plus bot load
- ring-out/ledge/recovery exploit fixtures

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
- feat(brawler): add platform combat states
- feat(brawler): add knockback ringouts and bots
- test(brawler): pin aerial recovery

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] All required platform-brawler mechanics are first-class states, not flat arena approximations.
- [ ] Knockback/hitstun/ring-outs are deterministic and authoritative.
- [ ] Bots/headless/reconnect/rewards work.
- [ ] No protected third-party content is used.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 35 QA handoff.

STOPPING RULES:
- Do not use Smash names/characters/stages/audio/items/balance.
- Do not reuse open-world combat in a way that removes aerial/platform mechanics.
~~~
