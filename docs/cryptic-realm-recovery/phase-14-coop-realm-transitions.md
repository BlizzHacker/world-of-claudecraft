# Phase 14: Implement Co-op Realm Transitions and Squad Transition Persistence

## Purpose

Make offline and online squads survive portals, instances, realm changes, death, reconnect,
and interrupted transitions by consuming the Phase 11 profile owner and persisting only
squad-transition state.

## Deliverables

- Implement authority-owned transition barriers for portal, instance, death, respawn,
  reconnect, realm selection, and interruption, with Sim authority offline and server
  authority online.
- Persist only the versioned squad-transition journal, member acknowledgments, recovery
  checkpoint, and terminal cleanup through the Phase 11 offline-profile owner and Phase 13
  online authority; do not add generic realm/profile/character persistence.
- Generate the registered-realm transition matrix and deep Infernal hazard/regroup/camera scenarios.
- Add one-to-four-member process-interruption, missing-transition-default, mismatch,
  duplicate-command, recovery, and transition-journal cleanup tests.

### Starter Prompt

~~~text
This is Phase 14 of Cryptic Realm Recovery and Modernization: Implement Co-op Realm Transitions and Squad Transition Persistence.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Make offline and online squads survive every realm transition by consuming Phase 11 persistence and storing only squad-transition state.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 13 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-14-coop-realm-transitions.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- Phase 11 versioned offline-profile persistence owner and per-realm-character APIs
- Phase 13 online squad authority, session ownership, and wire contracts
- src/sim/realms
- current portal, instance, death, respawn, reconnect, and transition state machines
- server/realm.ts
- server persistence only if the existing Phase 13 transition owner requires an additive
  squad-transition field
- Infernal realm content
- deploy realm inventory
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Implement one authority-owned transition state machine for portal, instance, death,
  respawn, reconnect, realm selection, interrupted transition, regroup, and terminal cleanup;
  the Sim owns offline outcomes and the server owns online outcomes.
- Persist only transition intent, source/destination identity, member acknowledgments,
  recovery checkpoint, and completion marker through the existing Phase 11 offline-profile
  owner and Phase 13 online authority. Default a missing transition journal safely.

Integration/evidence agent:
- Generate the registered-realm transition matrix and deep Infernal hazard/regroup/camera scenarios.
- Add P1 through P4 process-interruption, missing-transition-default, mismatch,
  duplicate-command, recovery, and cleanup tests; prove realm/profile/character data remains
  owned and unchanged by Phase 11.

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
- Creating or migrating generic offline profiles, realm registries, realm selection, per-realm
  character collections, storage keys, import/export, or corruption recovery. Phase 11 owns the
  foundation and Phase 46 owns later parity and migration hardening.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- focused co-op transition and squad-transition persistence tests
- registered realm matrix
- missing-transition-default, transition-journal round-trip/cleanup, and DDL-twice tests only
  when Phase 13 online persistence changes
- static guard proving no new generic offline profile, realm registry, or character storage owner
- npm run build:server
- npm run build:env

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(coop): coordinate realm transitions
- feat(coop): persist transition checkpoints
- test(coop): cover interruption recovery

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Squads transition atomically or recover to one safe state.
- [ ] Only squad-transition state is added; Phase 11 realm/profile/character ownership, keys,
  data, and migration behavior remain unchanged.
- [ ] Every registered realm receives smoke coverage and Infernal receives deep coverage.
- [ ] Interrupted, repeated, and resumed transitions do not duplicate or lose members,
  characters, profile data, or transition state, and terminal journals are cleaned up.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 14 QA handoff.

STOPPING RULES:
- Do not authorize a realm/instance transition from client state alone.
- Do not destructively rewrite old character state.
- Do not add a generic offline-profile, realm-registry, realm-selection, per-realm-character,
  storage-key, or migration owner in this phase.
- If Phase 11 persistence is missing or unsafe, stop and return the defect to Phase 11; reserve
  corruption, import/export, backup/rollback, and exact live-parity hardening for Phase 46.
~~~
