# Phase 11 QA: Verify Offline Profile Persistence and Local Squad Contract

### QA Starter Prompt

~~~text
This is Phase 11 QA of Cryptic Realm Recovery and Modernization: Verify Offline Profile Persistence and Local Squad Contract.

Model and harness: Codex, best available model, high/max reasoning. Opus 4.8 only when selectable. If Workflow is unavailable, use bounded generic-agent waves limited by the runtime's available worker slots, with adversarial verification.

Goal: Independently verify every Phase 11 deliverable and acceptance item before completion.

STEP 0 - PRE-FLIGHT:
- Verify implementation committed; record start/end SHAs and UTC timestamp; preserve unrelated work.
- Read progress/state/LEDGER/REPORT; never erase evidence.
- Confirm implementation did not mutate production.

STEP 1 - LOAD CONTEXT:
Spawn Explore to summarize state, progress, inventory, checklist, phase-11-coop-domain.md, full diff, permanent guards, root AGENTS/CLAUDE and governing CLAUDE files. Return every deliverable/criterion, changed surface, flag, test, known issue, environment, and evidence gap.

STEP 2 - QA AUDIT:
Spawn fresh parallel agents.

Correctness:
- Reconstruct the offline-realm behavior from exact live commits
  `b4a1f5940b10881cae6f2bad31beb17e238620a9` and
  `854615ab0d6efc1ea7b4d90aa39d7ed7991b839d`; verify every relevant delta has an
  evidence-backed disposition, subject-line claims match the actual diff, and any proven
  bug-report behavior is deferred to Phase 45.
- Migrate exact legacy per-realm fixtures into the single versioned offline profile, repeat
  migration, reload, and verify no realm, class, player, active-selection, or unknown-version
  bleed and no parallel realm registry or storage owner.
- Fuzz member order, duplicate selection, reconnect, and cleanup.
- Verify every P2-P4 state surface has an explicit owner.
- Exercise empty, boundary, malformed, retry, concurrency, reconnect, skew, and failure states.
- Verify no production mutation preceded QA PASS.

Test coverage:
- Read .claude/agents/test-coverage-auditor.md completely.
- Map every branch/API/query/IWorld/event/wire/persistence/UI/operator/deploy state and claim to decisive positive/negative tests.
- Prove tests fail on deliberate regression.

Dead code/invariants:
- Find duplicates, stale shims, unused code/tests, generated edits, data leaks, forbidden sim imports/clocks/randomness.
- Remove only proven replacements.

Diff-gated specialists:
- Build the reviewer set from the implementation/QA diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any newly matched reviewer; request COVERAGE and structured verdict.

STEP 3 - FIX, VALIDATE, AND ISSUE VERDICT:
- Fix BLOCKING/SHOULD-FIX; commit fixes separately with explicit paths.
- Re-run:
- npx tsc --noEmit
- npx vitest run tests/offline_profile.test.ts tests/offline_profile_migration.test.ts tests/coop_core.test.ts
- exact `b4a1f594` realm-selection and `854615ab` per-realm-character legacy fixtures
- repeated migration, P1 through P4 realm/player isolation, and unknown-version preservation fixtures
- npm run build:env
- determinism traces
- At checkpoints run npm run gate, npm run security:gate, and malware audit.
- Update REPORT fields exactly. Enforce QA names/rate limits, screenshots, console-error FAIL, cleanup, and no production dev commands.

STEP 4 - UPDATE DOCS, QA ARTIFACTS, AND MEMORY:
- Complete only with evidence and dedicated verdict.
- Append LEDGER with timestamp/candidate/environment/failures/fixes/SHAs/validations/result/next.
- Update state/progress/inventory/permanent guards; externalize deferrals; record memory if used.

Step 5 is intentionally absent. It is reserved for Phase 48 packet teardown.

STEP 6 - FINAL RESPONSE FORMAT:
Report verdict, finding/fix counts, SHAs, validations, environment, QA artifacts, cleanup, promotion/operation/rollback, flags, deferrals, and Phase 12 handoff.

STOPPING RULES:
- Stop rather than weaken determinism, authority, privacy, migration, identity, or QA-before-mutation.
- Missing evidence is not PASS.
- Do not make UI hold authoritative squad state.
- Do not merge same-account exceptions that weaken cross-account authorization.
- Fail if the implementation copies the live inline DOM/storage snippets, adds a parallel realm
  registry or profile owner, or writes an unversioned storage key.
- Do not overwrite corrupt or future-version data or pull Phase 46 corruption, backup/rollback,
  import/export, or exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` hardening into this phase.
- Do not implement any bug-report behavior claimed or found while tracing `b4a1f594`; Phase 45
  owns that feature.
~~~
