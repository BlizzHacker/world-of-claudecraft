# Phase 07: Integrate Upstream Client, Content, and Generated Outputs

## Purpose

Reconcile the pinned current-cycle client, UI, render, content, i18n, assets, and headless
surfaces, then create the one final true merge without losing Cryptic registrations or
user-facing behavior.

## Deliverables

- Reconcile client/render/input/content changes through IWorld only and retain Cryptic UI
  modules behind explicit seams.
- Reconcile every-locale keys and matcher rules, regenerate owned output, and reject broad generated-file cherry-picks.
- Restore asset registrations with provenance/budget checks and headless parity where behavior is visible to agents.
- Create the final true merge with the prepared Cryptic compatibility line as parent one and
  the exact pinned current-cycle upstream release as parent two, then run the permanent
  manifest against all integrated surfaces.

### Starter Prompt

~~~text
This is Phase 07 of Cryptic Realm Recovery and Modernization: Integrate Upstream Client, Content, and Generated Outputs.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Reconcile pinned current-cycle client/content surfaces and create the one final true
merge with verified Cryptic parent one and exact upstream parent two.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 06 QA is complete.
- Read progress.md and state.md first and preserve all completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-07-upstream-client-content.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- exact current-cycle upstream release ref pinned by Phase 05
- src/CLAUDE.md
- src/ui/CLAUDE.md
- src/render/CLAUDE.md
- src/game/CLAUDE.md
- headless/CLAUDE.md
- python/CLAUDE.md
- public/CLAUDE.md
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact current behavior, source refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and plan drift. Do not trust stale line numbers. For external APIs/SDKs/formulas/licenses, spawn a separate web-research subagent using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this vertical split explicitly. Give each agent only the Explore summary and owned files. Agents write tests for their changes.

Domain/authority agent:
- Reconcile client/render/input/content changes through IWorld only and retain Cryptic UI
  modules behind explicit seams.
- Reconcile every-locale keys and matcher rules, regenerate owned output, and reject broad generated-file cherry-picks.

Integration/evidence agent:
- Restore asset registrations with provenance/budget checks and headless parity where behavior is visible to agents.
- Create the final true merge from the prepared Cryptic compatibility line to the exact
  pinned current-cycle upstream ref, preserving parent order, then run the permanent manifest
  against UI routes, realm registrations, assets, i18n, tests, and build entrypoints.

INVARIANTS:
- Deterministic DOM-free 20 Hz sim; Rng only; no Math.random, Date.now, or performance.now in src/sim.
- IWorld first; implement Sim and ClientWorld plus headless where relevant.
- Server authority for identity, movement, combat, loot, rewards, economy, custody, and entitlements.
- Additive/idempotent/indexed DDL; old saves load; forward data survives application rollback.
- Versioned wire/schema canary compatibility.
- English i18n key first, then every locale and matcher.
- Controller/touch/mobile/accessibility are first-class.
- No secrets, personal data, target IDs, unlicensed content, or production dev commands.
- Test new code; remove proven dead replacements; regenerate generated files.
- Explicit staging only; never git add -A.
- Append a UTC entry to tmp/qa-loop/LEDGER.md. Update REPORT scenario evidence when behavior is exercised.

OUT OF SCOPE:
- Production mutation or feature activation from this implementation session.
- Later-phase systems, unrelated cleanup, destructive history/schema/data changes.
- Product decisions outside state.md and this prompt.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- npx vitest run tests/localization_fixes.test.ts tests/realms.test.ts tests/realm_assets_script.test.ts
- npm run asset:budget
- npm run build:env
- desktop/mobile visual smoke
- verify merge parent one is the prepared Cryptic line and parent two is the exact pinned
  current-cycle upstream release
- npm run gate

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- If the actual diff adds another matching surface, dispatch its matching .claude/agents prompt too.
- Request COVERAGE, including low-severity and uncertain findings. Require BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
Use explicit paths and these Conventional Commit targets:
- feat(client): reconcile current stable surfaces
- chore(upstream): merge exact current stable release
- fix(i18n): restore cryptic locale contracts
- test(client): guard integrated entrypoints

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] UI/render use IWorld and retain required Cryptic routes/registrations.
- [ ] All locales/matchers and generated outputs are reproducible.
- [ ] Assets have provenance and pass budget.
- [ ] The final merge has the prepared Cryptic compatibility line as parent one and the exact
  pinned current-cycle upstream release as parent two, with no unresolved conflicts.
- [ ] npm run gate is green on the integrated candidate, and Phases 05 through 07 repeat for every queued newer stable release before Phase 10.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress.md and state.md with UTC timestamps, exact SHAs, identifiers, tests, reviewer verdicts, evidence, risks, and next action.
- Update feature-inventory.md and permanent manifest/runbook contracts when applicable.
- Append LEDGER. REPORT scenarios use id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files, commits, focused validation, reviewers, LEDGER/REPORT changes, deferrals, feature-flag state, and one-line handoff to Phase 07 QA.

STOPPING RULES:
- Do not hand-edit generated manifests/locales.
- Do not accept missing UI wiring because source modules merely exist.
- Do not use squash/ours/theirs as a substitute for the required true-merge parent topology.
~~~
