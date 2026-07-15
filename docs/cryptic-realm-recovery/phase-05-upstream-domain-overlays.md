# Phase 05: Integrate Upstream Domain and Overlay Seams

## Purpose

Prepare the current stable-cycle domain changes on the verified Cryptic first-parent line,
beginning with the v0.26.0 recovery baseline and repeating for each newer discovered stable
release. The final true merge is created only after Phases 05 through 07 finish compatibility
work.

## Deliverables

- Pin the exact current-cycle release commit from the permanent intake ledger: v0.26.0 for
  the first recovery cycle, then each queued newer stable release after prior-cycle QA.
- Create an isolated candidate from the verified Cryptic release, record the intended
  first-parent/upstream-second-parent pair, and do not leave an uncommitted merge across phases.
- Reconcile deterministic sim/domain overlaps while keeping private realm rules in src/sim/realms, private presentation in src/ui/cryptic, and configuration/branding behind registries.
- Update permanent feature contracts for every superseded or preserved domain behavior.

### Starter Prompt

~~~text
This is Phase 05 of Cryptic Realm Recovery and Modernization: Integrate Upstream Domain and Overlay Seams.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Prepare current stable-cycle domain compatibility on the verified Cryptic first-parent
line. Pin the intended upstream second parent now; Phase 07 creates the final true merge.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 04 QA is complete.
- Read progress.md and state.md first and preserve all completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-05-upstream-domain-overlays.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- exact current-cycle upstream release ref from the permanent intake ledger (v0.26.0 only
  for the first recovery cycle)
- src/sim/CLAUDE.md
- src/sim/content/CLAUDE.md
- src/sim/realms
- permanent manifest
- release merge audit
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact current behavior, source refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and plan drift. Do not trust stale line numbers. For external APIs/SDKs/formulas/licenses, spawn a separate web-research subagent using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this vertical split explicitly. Give each agent only the Explore summary and owned files. Agents write tests for their changes.

Domain/authority agent:
- Pin the exact current-cycle recovery commit after recurring discovery rechecks latest
  stable and records later cycles separately.
- Create the isolated candidate from the verified Cryptic release and record the exact
  intended upstream second parent without starting a cross-session uncommitted merge.

Integration/evidence agent:
- Reconcile deterministic sim/domain overlaps while keeping private realm rules in src/sim/realms, private presentation in src/ui/cryptic, and configuration/branding behind registries.
- Update permanent feature contracts for every superseded or preserved domain behavior.

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
- focused affected sim/content tests
- npx tsc --noEmit
- determinism traces and manifest checker
- verify the candidate starts at the exact Cryptic first-parent anchor, the intended upstream
  second-parent ref is immutable, and no MERGE_HEAD/unresolved index remains

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- If the actual diff adds another matching surface, dispatch its matching .claude/agents prompt too.
- Request COVERAGE, including low-severity and uncertain findings. Require BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
Use explicit paths and these Conventional Commit targets:
- feat(upstream): prepare current stable domain compatibility
- fix(realms): preserve cryptic overlay seams

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Candidate ancestry starts at the verified Cryptic release and the exact current-cycle
  upstream ref is pinned as Phase 07's intended second parent.
- [ ] Domain behavior remains deterministic and manifest-complete.
- [ ] Private overlays do not leak into generic upstream modules.
- [ ] Newer stable discovery is recorded as a later cycle without silently changing the
  pinned current-cycle ref.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress.md and state.md with UTC timestamps, exact SHAs, identifiers, tests, reviewer verdicts, evidence, risks, and next action.
- Update feature-inventory.md and permanent manifest/runbook contracts when applicable.
- Append LEDGER. REPORT scenarios use id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files, commits, focused validation, reviewers, LEDGER/REPORT changes, deferrals, feature-flag state, and one-line handoff to Phase 05 QA.

STOPPING RULES:
- Do not resolve semantic conflicts by choosing whole-file ours/theirs without behavior evidence.
- Do not hand-edit generated content.
- Do not carry MERGE_HEAD or unresolved index state across Phase 05 QA or into Phase 06.
~~~
