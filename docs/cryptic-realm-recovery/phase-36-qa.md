# Phase 36 QA: Verify Implement Brawler Client and Minigame Checkpoint

### QA Starter Prompt

~~~text
This is Phase 36 QA of Cryptic Realm Recovery and Modernization: Verify Implement Brawler Client and Minigame Checkpoint.

Model and harness: Codex, best available model, high/max reasoning. Opus 4.8 only when selectable. If Workflow is unavailable, use bounded generic-agent waves limited by the runtime's available worker slots, with adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Independently verify every Phase 36 deliverable and acceptance item before completion.

STEP 0 - PRE-FLIGHT:
- Verify implementation committed; record start/end SHAs and UTC timestamp; preserve unrelated work.
- Read progress/state/LEDGER/REPORT; never erase evidence.
- Confirm implementation did not mutate production.

STEP 1 - LOAD CONTEXT:
Spawn Explore to summarize state, progress, inventory, checklist, phase-36-brawler-client-minigame-checkpoint.md, full diff, permanent guards, root AGENTS/CLAUDE and governing CLAUDE files. Return every deliverable/criterion, changed surface, flag, test, known issue, environment, and evidence gap.

STEP 2 - QA AUDIT:
Spawn fresh parallel agents.

Correctness:
- Run every minigame and player count with deterministic bots.
- Require explicit `gauntlet_reference_session` scenario rows and trace the adapter to Phase 31 and exact source ref `196487c8688825d6831278191d3160e622142ec5`; an unnamed substitute does not count.
- Force one minigame failure only in isolated stage/simulation and verify checkpoint
  rollback before promotion; never inject a failure into production.
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
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and give it to a fresh generic read-only subagent or use woc-release-malware-audit.
- Add any newly matched reviewer; request COVERAGE and structured verdict.

STEP 3 - FIX, VALIDATE, AND ISSUE VERDICT:
- Fix BLOCKING/SHOULD-FIX; commit fixes separately with explicit paths.
- Re-run:
- npm run gate
- npm run security:gate
- P1-P4 every-minigame matrix
- explicit `gauntlet_reference_session` P1-P4 offline/online, bot, reconnect, reward, cleanup, screenshot, console, bandwidth, and performance evidence
- npm run asset:budget
- npm run perf:tour
- stage soak/screenshots/console
- At checkpoints run npm run gate, npm run security:gate, and malware audit.
- Update REPORT fields exactly. Enforce QA names/rate limits, screenshots, console-error FAIL, cleanup, and no production dev commands.
PRE-PROMOTION BARRIER:
- Finish fixes/validation first. Write dedicated PASS bound to commit, artifact,
  environment, REPORT, immutable private Git backup, DB/runtime-config restore evidence,
  stage identity/cleanup or teardown, retention, and rollback ref.
- Without PASS and clean REPORT, write `STOPPED — <reason>` and perform zero production mutation.
- After PASS only, invoke Phase 04 automatic promotion for racing and brawler.
- Verify HEAD/build/APIs/realms/scenarios/errors/performance/cleanup; roll back automatically on failure.

STEP 4 - UPDATE DOCS, QA ARTIFACTS, AND MEMORY:
- Complete only with evidence and dedicated verdict.
- Append LEDGER with timestamp/candidate/environment/failures/fixes/SHAs/validations/result/next.
- Update state/progress/inventory/permanent guards; externalize deferrals; record memory if used.

Step 5 is intentionally absent. It is reserved for Phase 48 packet teardown.

STEP 6 - FINAL RESPONSE FORMAT:
Report verdict, finding/fix counts, SHAs, validations, environment, QA artifacts, cleanup, promotion/operation/rollback, flags, deferrals, and Phase 37 handoff.

STOPPING RULES:
- Stop rather than weaken determinism, authority, privacy, migration, identity, or QA-before-mutation.
- Missing evidence is not PASS.
- Do not promote one incomplete minigame inside the checkpoint.
- Missing or renamed `gauntlet_reference_session` evidence is FAIL.
- Do not use production dev commands or leave QA data.
~~~
