# Phase 09 QA: Store Discoverability and ID@Xbox Readiness

### QA Starter Prompt

```text
This is Phase 09 QA of the Xbox Controller Platform feature: Verify Store Discoverability and ID@Xbox Readiness.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add `ultracode` for a market, locale, policy, package, and listing adversarial-verify Workflow.

Goal: Audit correctness, missing tests, dead code, the Store-safe artifact, package identity, rating accuracy,
discoverability, ID@Xbox readiness, security, determinism boundaries, three-host parity, i18n completeness,
evidence quality, and publication controls while keeping Phase 09 QA entirely read-only in Partner Center.

STEP 0 - PRE-FLIGHT:
- Verify Phase 09 source and docs commits exist; record status and comparison commits. Preserve unrelated dirty work.
- Confirm no Partner Center save, publication, or submission occurred in Phase 09. Record the current public baseline only.
- Scan memory, if used, for Store, IARC, ID@Xbox, package identity, privacy, and catalog findings.

STEP 1 - LOAD CONTEXT:
Spawn an Explore agent to summarize `state.md`, `progress.md`, `phase-09-store-discovery-idxbox.md`,
the complete diff, root and relevant CLAUDE files, Store-safe tests, package inspection, listing/rating drafts,
ID@Xbox dossier, primary-source citations, sanitized Partner Center evidence, and the draft post-Phase-10 publication runbook.
Return every promise, artifact, answer, feature gate, market, capability, OPEN item, acceptance criterion, and test.

STEP 2 - QA AUDIT:
Spawn three parallel agents with the summary and demand COVERAGE, including uncertain and low-severity findings.

Correctness and policy agent:
- Compare the built Xbox artifact to every IARC response, listing claim, capability, privacy disclosure,
  system requirement, controller statement, accessibility claim, and business-model statement.
- Prove excluded wallet/reward/crypto UI, code paths, deep links, cached assets, network calls, and benefits are unreachable.
- Verify UWP WebView2 identity, RETAIL configuration, Xbox target, version, Store association, and installation eligibility.

Discoverability and evidence agent:
- Re-audit availability, visibility, markets, pricing, release timing, packages, listings, ratings, warnings,
  and catalog capabilities using current sanitized Partner Center state.
- Verify the current signed-out listing, Xbox search, acquisition, and install eligibility as a read-only baseline.
- Verify the reviewed publication diff and post-publication propagation matrix are complete, reserved for a
  separate action session after Phase 10 QA, and leave external state untouched.

ID@Xbox and security agent:
- Challenge the concept dossier and identity, privilege, parental-control, multiplayer, chat, moderation,
  accessibility, telemetry, certification, and account-linking plans for unsupported claims and missing gates.
- Verify no credential, token, signing data, account-private detail, NDA content, or misleading classification entered source or evidence.

Test coverage agent:
- Map each build gate, manifest rule, exclusion, metadata transform, asset check, and publication precondition
  to a meaningful automated or reproducible manual assertion. Add missing tests and negative cases.
- Verify any i18n, sim, server, net, or headless impact from the actual diff, or explicitly record those gates as not applicable.

Dead code and cleanup agent:
- Remove dead build flags, stale listing copy, unused assets, duplicated metadata, outdated policy assumptions,
  commented code, unresolved TODO/FIXME items, and generated-file hand edits.
- Verify no old package identity, app reclassification workaround, excluded-feature link, or obsolete submission path remains reachable.

Dispatch `privacy-security-review` and `qa-checklist`;
dispatch other specialists only for exact matching surfaces. Resume truncated reviews with the standard verdict request.

STEP 3 - FIX AND VALIDATE:
- Fix every BLOCKING and SHOULD-FIX item without changing approved business or legal scope.
- Run `npx tsc --noEmit`, Store-safe exclusion tests, package/manifests tests, clean UWP/MSIX build,
  identity inspection, asset validation, and policy-to-build cross-checks.
- Commit fixes with explicit paths. If a publication change is needed, prepare the exact diff and record it for the
  separate post-Phase-10-QA action session. Do not save, submit, or publish from this QA session.

STEP 4 - UPDATE DOCS + MEMORY:
- Mark Phase 09 QA in `progress.md`; update `state.md` with verified identity, Store-safe evidence,
  rating, current catalog baseline, draft publication/propagation runbook, citations, security conclusions, and OPEN items.
- Update memory if used without retaining private account data.

STEP 5 - PACKET TEARDOWN:
Skip. Phase 09 is not the final phase.

STEP 6 - FINAL RESPONSE FORMAT:
Report PASS, PASS-WITH-FOLLOWUPS, or FAIL; severity/fixed counts; package and Store-safe verdict;
rating and policy verdict; current public/search/acquisition baseline; publication readiness; ID@Xbox readiness;
OPEN items; packet retained; and the Phase 10 handoff.

STOPPING RULES:
- Stop if a BLOCKING issue requires inaccurate disclosure, unsupported platform access, legal acceptance,
  identity/classification change, secrets, or a scope decision.
- Do not save, submit, or publish in Phase 09 QA. That requires a separate session after Phase 10 QA is green.
```
