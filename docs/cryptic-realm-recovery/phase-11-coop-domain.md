# Phase 11: Establish Offline Profile Persistence and Local Squad Contract

## Purpose

Establish the one versioned offline-profile and per-realm-character persistence owner before
offline co-op consumes it, then define deterministic one-to-four-player local-squad identity,
ownership, lifecycle, party semantics, and host-parity contracts.

## Deliverables

- Trace the offline-realm behavior in preserved live commits `b4a1f5940b10881cae6f2bad31beb17e238620a9`
  and `854615ab0d6efc1ea7b4d90aa39d7ed7991b839d`; record every relevant delta, verify
  commit-subject claims against the actual diff, and route any proven bug-report behavior to Phase 45.
- Define and implement one versioned offline-profile persistence owner with registered-realm
  references, per-realm character collections, per-player active selections, additive defaults,
  and idempotent migration from the preserved unversioned per-realm storage behavior.
- Define squad/member/input ownership, create/select/join/leave, auto-party, reconnect, death,
  regroup, cleanup, and every per-player gameplay-view owner; extend IWorld first and add
  deterministic Sim plus headless contract scaffolding that consumes the profile model.
- Add version round-trip, legacy migration, realm/player isolation, same-seed, ownership,
  one-to-four-member, and non-co-op compatibility tests behind a default-off feature flag.

### Starter Prompt

~~~text
This is Phase 11 of Cryptic Realm Recovery and Modernization: Establish Offline Profile Persistence and Local Squad Contract.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Establish one versioned offline-profile and per-realm-character persistence foundation before defining the local-squad contract that consumes it.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 10 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-11-coop-domain.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- origin/live co-op commits
- origin/coop-dev
- feat/couch-coop refs
- preserved live commits `b4a1f5940b10881cae6f2bad31beb17e238620a9` and
  `854615ab0d6efc1ea7b4d90aa39d7ed7991b839d`, including their exact diffs and parent refs
- current offline profile, character selection, realm registry, browser storage, and migration owners
- index.html and src/main.ts only to trace legacy behavior, not as destinations for new logic
- src/sim/realms
- src/world_api.ts
- src/sim
- src/game and src/ui offline start/select modules
- headless
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Persistence/provenance agent:
- Resolve the exact live objects for `b4a1f594` and `854615ab`, compare whole-commit patch IDs
  plus the relevant hunks to the current candidate, and record each offline-realm behavior as
  recovered, superseded, rejected, or missing. Verify subject-line claims against the diff and
  route any proven bug-report behavior to Phase 45.
- Define and implement the single versioned offline-profile owner: registered-realm references,
  per-realm character collections, P1 through P4 active selections, additive defaults, and an
  idempotent source-preserving migration from legacy `cr_offline_char_<realmId>` records and
  any canonical predecessor format discovered during recon.

Squad-contract/evidence agent:
- Define squad/member/input ownership, create/select/join/leave, auto-party, reconnect, death,
  regroup, cleanup, and per-player inventory, HUD, target, talents, quest, chat, social, trade,
  duel, and market view ownership. Extend IWorld first and implement deterministic Sim plus
  headless scaffolding that reads the Phase 11 profile contract.
- Add version round-trip, legacy migration, realm/class/player isolation, same-seed, ownership,
  P1 through P4, and non-co-op compatibility tests behind a default-off feature flag.

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
- Offline controller/HUD gameplay implementation (Phase 12), online squad authority (Phase 13),
  squad transition persistence (Phase 14), and exhaustive corruption, backup/rollback,
  import/export, and exact duplicate-realm-entry hardening (Phase 46).
- Bug-report submission or public exposure; Phase 45 owns any such behavior found while
  tracing `b4a1f594`.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- npx tsc --noEmit
- npx vitest run tests/offline_profile.test.ts tests/offline_profile_migration.test.ts tests/coop_core.test.ts
- exact `b4a1f594` realm-selection and `854615ab` per-realm-character legacy fixtures
- repeated migration, P1 through P4 realm/player isolation, and unknown-version preservation fixtures
- npm run build:env
- determinism traces

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(offline): add versioned realm profiles
- feat(coop): define local squad contract
- test(offline): cover live profile migration

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Every offline-realm delta in `b4a1f594` and `854615ab` has an evidence-backed disposition;
  subject-line claims are checked against the diff and any proven bug-report behavior is deferred
  to Phase 45.
- [ ] One versioned persistence owner migrates legacy per-realm characters idempotently and
  preserves realm, class, player, and unknown-version isolation without parallel storage keys.
- [ ] One squad contract covers P1 through P4 and every per-player state owner; offline Sim and
  headless expose equivalent squad lifecycle.
- [ ] Auto-party does not bypass normal ownership or social rules, and the feature remains
  unreachable while incomplete.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 11 QA handoff.

STOPPING RULES:
- Do not make UI hold authoritative squad state.
- Do not merge same-account exceptions that weaken cross-account authorization.
- Do not copy the live inline DOM or `src/main.ts` storage snippets; recover their behavior
  through the canonical realm registry and one module-first persistence owner.
- Do not create a second realm registry, offline-profile owner, or unversioned storage key.
- Do not overwrite corrupt or future-version data. Preserve it and defer exhaustive recovery,
  backup/rollback, import/export, and exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` hardening to Phase 46.
- Do not implement any bug-report behavior claimed or found while tracing `b4a1f594`; Phase 45
  owns that feature.
~~~
