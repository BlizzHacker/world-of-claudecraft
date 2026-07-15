# Phase 01: Close Production Preservation and Identity

## Purpose

Finish the already-started preservation phase, reconcile the actual production identity, initialize the QA artifacts, and close retention/security decisions without repeating completed backups.

## Deliverables

- Verify and inventory the completed private release, Git bundle, PostgreSQL dump, encrypted runtime-config archive, separately held recovery key, restore rehearsals, and clean tracked-asset coverage.
- Reconcile LXC 171 at /opt/cryptic-realm with the legacy idyllic-games-prod /opt/eastbrook
  release/v0.6 profile, prepare the exact confirmed target and prove no duplicate baseline;
  independent Phase 01 QA alone may capture the one permitted production baseline.
- Resolve or formally contain the unrecoverable embedded PAT revocation risk, verify deploy-key least privilege, set private backup retention/checksum/timestamp policy, and record independent key custody.
- Create or normalize tmp/qa-loop/LEDGER.md and REPORT.md for this program, record
  preservation evidence, and prepare the Phase 01 QA handoff without issuing its verdict.

### Starter Prompt

~~~text
This is Phase 01 of Cryptic Realm Recovery and Modernization: Close Production Preservation and Identity.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Finish the already-started preservation phase, reconcile the actual production identity, initialize the QA artifacts, and close retention/security decisions without repeating completed backups.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Phase 01 is the first phase and resumes the in-progress preservation notes.
- Read progress.md and state.md first. For Phase 01, continue only remaining work and preserve all completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-01-preservation-closeout.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- progress.md and state.md Phase 01 notes
- tmp/qa-loop/LEDGER.md
- tmp/qa-loop/REPORT.md
- root AGENTS.md production profiles
- LXC 171 /opt/cryptic-realm read-only probes
- idyllic-games-prod /opt/eastbrook read-only probes
- private recovery release recovery-lxc171-20260714
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact current behavior, source refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and plan drift. Do not trust stale line numbers. For external APIs/SDKs/formulas/licenses, spawn a separate web-research subagent using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this vertical split explicitly. Give each agent only the Explore summary and owned files. Agents write tests for their changes.

Domain/authority agent:
- Verify and inventory the completed private release, Git bundle, PostgreSQL dump, encrypted runtime-config archive, separately held recovery key, restore rehearsals, and clean tracked-asset coverage.
- Reconcile LXC 171 at /opt/cryptic-realm with the legacy idyllic-games-prod /opt/eastbrook
  release/v0.6 profile, prepare the exact confirmed target and prove no duplicate baseline;
  leave the one permitted production-baseline capture to independent Phase 01 QA.

Integration/evidence agent:
- Resolve or formally contain the unrecoverable embedded PAT revocation risk, verify deploy-key least privilege, set private backup retention/checksum/timestamp policy, and record independent key custody.
- Create or normalize tmp/qa-loop/LEDGER.md and REPORT.md for this program, record
  preservation evidence, and prepare the Phase 01 QA handoff without issuing a verdict or
  repeating successful destructive/expensive steps.

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
- git fsck --full on the disposable restored mirror
- git bundle verify on each retained bundle copy
- pg_restore --list on the encrypted-dump restore path and required-table/nonempty checks in a disposable database
- secret-safe stream restore of encrypted runtime configuration with checksum comparison
- npm run gate only if tracked code changed
- npm run security:gate

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- If the actual diff adds another matching surface, dispatch its matching .claude/agents prompt too.
- Request COVERAGE, including low-severity and uncertain findings. Require BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
Use explicit paths and these Conventional Commit targets:
- docs(ops): record recovery environment identity
- fix(security): close recovery credential handling

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] The active production profile is unambiguous, both profiles have read-only identity
  evidence, and QA has an exact target plus proof no baseline was already captured.
- [ ] Completed Git, database, runtime-config, and key-custody artifacts remain independently restorable with timestamps, checksums, retention, and no secret disclosure.
- [ ] The PAT risk has a documented revocation or containment decision and no URL credential remains.
- [ ] LEDGER and REPORT contain preservation evidence and an explicit handoff stating that
  independent Phase 01 QA alone captures the baseline and issues PASS.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress.md and state.md with UTC timestamps, exact SHAs, identifiers, tests, reviewer verdicts, evidence, risks, and next action.
- Update feature-inventory.md and permanent manifest/runbook contracts when applicable.
- Append LEDGER. REPORT scenarios use id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files, commits, focused validation, reviewers, LEDGER/REPORT changes, deferrals, feature-flag state, and one-line handoff to Phase 01 QA.

STOPPING RULES:
- Do not mutate either environment until host, repo root, branch, HEAD, service topology, and active-target identity all match one profile.
- Do not print, upload, or co-locate the separately held recovery key with encrypted archives.
~~~
