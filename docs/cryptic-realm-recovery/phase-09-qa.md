# Phase 09 QA: Verify Shared Outbound Delivery and Contribution State Foundation

### QA Starter Prompt

~~~text
This is Phase 09 QA of Cryptic Realm Recovery and Modernization: Verify Shared Outbound Delivery and Contribution State Foundation.

Model and harness: Codex, best available model, high/max reasoning. Opus 4.8 only when selectable. If Workflow is unavailable, use bounded generic-agent waves limited by the runtime's available worker slots, with adversarial verification.

Goal: Independently verify every Phase 09 deliverable and acceptance item before completion.

STEP 0 - PRE-FLIGHT:
- Verify implementation committed; record start/end SHAs and UTC timestamp; preserve unrelated work.
- Read progress/state/LEDGER/REPORT; never erase evidence.
- Confirm implementation did not mutate production.

STEP 1 - LOAD CONTEXT:
Spawn Explore to summarize state, progress, inventory, checklist, phase-09-contribution-state-ledger.md, full diff, permanent guards, root AGENTS/CLAUDE and governing CLAUDE files. Return every deliverable/criterion, changed surface, flag, test, known issue, environment, and evidence gap.

STEP 2 - QA AUDIT:
Spawn fresh parallel agents.

Correctness:
- Verify the contribution lifecycle uses the reusable outbound-delivery record and adapter
  contract rather than an adapter-specific queue, retry loop, or reconciliation path.
- Replay, duplicate, and reorder webhook events, poll results, dispatch attempts, and worker
  lease recovery; prove atomic idempotency and one terminal outcome.
- Exhaust retry budgets and rate limits; verify bounded backoff, actionable redacted
  dead-letter state, manual reconciliation, and recovery.
- Compare public and operator projections to the persisted record; prove private payloads,
  credentials, internal source metadata, and raw failures never cross their allowlists.
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
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any newly matched reviewer; request COVERAGE and structured verdict.

STEP 3 - FIX, VALIDATE, AND ISSUE VERDICT:
- Fix BLOCKING/SHOULD-FIX; commit fixes separately with explicit paths.
- Re-run:
- npx vitest run tests/outbound_delivery.test.ts tests/contribution_state.test.ts tests/github_server.test.ts tests/github_contributors.test.ts
- adapter-contract, atomic-idempotency, lease-expiry, bounded-retry, dead-letter, and manual-reconciliation fixtures
- webhook signature, pagination, rate-limit, outage, reorder, duplicate, and replay fixtures
- existing PR reconciliation plus public/operator projection privacy fixtures
- At checkpoints run npm run gate, npm run security:gate, and malware audit.
- Update REPORT fields exactly. Enforce QA names/rate limits, screenshots, console-error FAIL, cleanup, and no production dev commands.

STEP 4 - UPDATE DOCS, QA ARTIFACTS, AND MEMORY:
- Complete only with evidence and dedicated verdict.
- Append LEDGER with timestamp/candidate/environment/failures/fixes/SHAs/validations/result/next.
- Update state/progress/inventory/permanent guards; externalize deferrals; record memory if used.

Step 5 is intentionally absent. It is reserved for Phase 48 packet teardown.

STEP 6 - FINAL RESPONSE FORMAT:
Report verdict, finding/fix counts, SHAs, validations, environment, QA artifacts, cleanup, promotion/operation/rollback, flags, deferrals, and Phase 10 handoff.

STOPPING RULES:
- Stop rather than weaken determinism, authority, privacy, migration, identity, or QA-before-mutation.
- Missing evidence is not PASS.
- Do not expose tokens, private payloads, private source metadata, or internal PR details in
  projections, logs, fixtures, screenshots, or caches.
- Do not call closed unmerged work a contribution.
- Fail if any adapter owns a parallel queue, retry, dead-letter, or reconciliation service.
- Do not add bug-report-specific submission, consent, attachment, sanitizer, or filing behavior;
  that belongs to Phase 45.
~~~
