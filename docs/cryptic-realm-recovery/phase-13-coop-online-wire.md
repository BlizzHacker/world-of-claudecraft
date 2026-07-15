# Phase 13: Implement Online Squad Authority and Union Interest

## Purpose

Implement secure server-recognized local squads, union-interest replication, and controller session routing for one to four online players.

## Deliverables

- Bind local squad sessions to authenticated account/character ownership with exact same-account policy and no client bypass.
- Implement bounded union-interest snapshots so P2-P4 stay visible to the shared renderer without broadcasting the whole world.
- Route each controller to its owned online session, handle join/reconnect/pruning/regroup, and version the wire for canary compatibility.
- Add exact regressions for coop-dev defects: join-before-connected, concurrent join queue, null/disconnected controller slots, trusted proxy IP, real API credentials, regroup-before-hello, and stale camera members.

### Starter Prompt

~~~text
This is Phase 13 of Cryptic Realm Recovery and Modernization: Implement Online Squad Authority and Union Interest.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Implement secure server-recognized local squads, union-interest replication, and controller session routing for one to four online players.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 12 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-13-coop-online-wire.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- origin/coop-dev at audited ref
- live LXC co-op commits
- src/net/online.ts
- server/game.ts
- src/game
- tests/snapshots.test.ts
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Bind local squad sessions to authenticated account/character ownership with exact same-account policy and no client bypass.
- Implement bounded union-interest snapshots so P2-P4 stay visible to the shared renderer without broadcasting the whole world.

Integration/evidence agent:
- Route each controller to its owned online session, handle join/reconnect/pruning/regroup, and version the wire for canary compatibility.
- Add exact regressions for coop-dev defects: join-before-connected, concurrent join queue, null/disconnected controller slots, trusted proxy IP, real API credentials, regroup-before-hello, and stale camera members.

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
- focused coop online and exact regression tests
- npx vitest run tests/snapshots.test.ts tests/env_protocol.test.ts tests/bandwidth.test.ts
- npm run build:server
- raw WS one-to-four session driver

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(coop): add online squad authority
- fix(net): preserve squad union interest
- test(coop): pin coop dev regressions

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Only authenticated owned characters join a local squad.
- [ ] P2-P4 remain visible in bounded snapshots outside P1 radius.
- [ ] Controller reconnect and concurrent joins cannot crash or duplicate sessions.
- [ ] Every audited coop-dev regression has a decisive test.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 13 QA handoff.

STOPPING RULES:
- Do not send the full world as a shortcut.
- Do not trust proxy/client identity headers outside configured trusted proxy boundaries.
~~~
