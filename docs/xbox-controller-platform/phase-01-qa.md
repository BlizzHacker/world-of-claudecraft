# Phase 01 QA: Verify the Canonical Xbox Release Lane

### QA Starter Prompt

~~~text
This is Phase 01 QA of Xbox Controller Platform: Verify the Canonical Xbox Release Lane and Branch Recovery.

Model and harness: Use Codex with the best available model and high or maximum reasoning. Use Opus 4.8 or ultracode only if actually available. Otherwise use bounded Codex subagent waves with a merge barrier. Never claim unavailable harnesses or unexecuted device results.

Goal: Independently prove that Phase 01 recovered the correct source, established UWP WebView2 as the sole Xbox release lane, enforced exact `app.local` origin behavior, and bound an unsigned artifact to its source without any external mutation.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read root and governing `CLAUDE.md` files, packet `state.md`, `progress.md`, `qa-checklist.md`, Phase 01 implementation prompt, and the implementation diff.
- Scan memory if available. Record start commit, implementation commit, branch, UTC timestamp, and dirty paths. Preserve unrelated work.
- Require Phase 01 implementation to be committed or explicitly identify a reviewable isolated diff. Confirm no production, console, signing, or Partner Center mutation was used as implementation evidence.

STEP 1 - EXPLORE CONTEXT:
Spawn a fresh read-only Explore agent to map every Phase 01 deliverable and acceptance item to exact changed files, tests, artifacts, and evidence. It must inspect current code plus relevant history around `888bb3fc0` and `08357b322`, the UWP shell, client-origin/console-generation seams, builder scripts, CORS/origin policy, package docs, candidate manifest, root rules, and all governing area `CLAUDE.md` files. Return gaps and contradictions, not raw file dumps.

STEP 2 - ORCHESTRATE THE QA AUDIT:
Use independent agents for:
- Source recovery correctness: prove each restored hunk is required and no reverted or unrelated feature was accidentally resurrected.
- Package architecture: prove only the UWP WebView2 shell can produce an Xbox release candidate; Tauri is Desktop-only, the probe is diagnostic-only, and hosted-web output cannot masquerade as a candidate.
- Origin/security: test exact `https://app.local`, methods/credentials/preflight, null and malformed origins, suffix/lookalike hosts, external navigation, and authentication boundaries.
- Reproducibility/evidence: rebuild when tooling exists, compare manifest/package fields, inspect contents, recompute SHA-256, and verify dirty-source candidates cannot be marked releasable.
- Dead code and cleanup: identify obsolete builders, scripts, docs, workflow branches, imports, flags, generated-file hand edits, and duplicate package paths left reachable after canonicalization.

Give each agent the Explore summary and a narrow owned report. Do not let QA use production, an installed console, a signing key, or Partner Center.

INVARIANTS AND OUT OF SCOPE:
- Preserve deterministic sim, `IWorld`, server authority, auth/origin security, generated-file ownership, and secret boundaries.
- Do not implement later controller phases, publish, sign, deploy, sideload, change Store metadata, or perform unrelated cleanup.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run independently:
- `npx vitest run tests/xbox_env.test.ts tests/offline_mode_gate.test.ts tests/tauri_store_config.test.ts tests/version_sync.test.ts`
- `npx vitest run tests/server/http/cors.test.ts tests/server/http/origin_check.test.ts tests/realm_public_origin.test.ts`
- `npx tsc --noEmit`
- canonical Xbox build plus unpack/manifest/content/hash inspection where the Microsoft SDK is available
- negative check that the retired hosted builder cannot create an artifact labeled as the canonical release
- `npm run security:gate`

Test empty/missing config, unknown console generation, ordinary browser, desktop, Xbox One, Xbox Series, exact and spoofed origins, build failure, stale artifact, mismatched source SHA, modified package, wrong identity/version, and unsigned state. Prove decisive tests fail under deliberate local regressions, then revert only the deliberate mutation.

Dispatch only reviewers matched by the implementation and QA diff. Read their instructions fully. Request COVERAGE and structured BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT. At minimum use privacy/security review for origin/build boundaries and test-coverage review for implementation code. Use cross-platform review only if shared host/wire/IWorld surfaces changed, migration review only if persistence changed, and release-malware review if artifacts or dependencies changed.

STEP 4 - FIX AND COMMIT CADENCE:
- Fix every BLOCKING and SHOULD-FIX issue within Phase 01 scope.
- Commit QA-found code fixes separately as `fix(xbox): close canonical lane qa gaps`.
- Commit decisive tests as `test(xbox): verify canonical release evidence`.
- Stage exact paths only. Do not rewrite implementation history or absorb unrelated work.

STEP 5 - QA ACCEPTANCE:
- [ ] Recovery is minimal, explained, and does not resurrect unrelated reverted code.
- [ ] Missing console source seams have explicit, tested disposition.
- [ ] Exactly one Xbox release path exists and it is UWP WebView2.
- [ ] Exact `app.local` succeeds while spoofed/lookalike origins and forbidden navigation fail.
- [ ] Rebuilt or inspected package matches source SHA, identity, version, content inventory, and hash evidence.
- [ ] Dirty, stale, mismatched, unsigned, or uninspected artifacts cannot be represented as releasable or published.
- [ ] No external mutation occurred and every matched reviewer has no BLOCKING or SHOULD-FIX findings.

STEP 6 - DOCS, STATE, AND MEMORY:
- Update packet `progress.md`, `state.md`, and `qa-checklist.md` with exact commands, environment/tool versions, artifact hash, findings, fixes, SHAs, reviewer verdicts, and remaining OPEN items.
- Mark Phase 01 complete only with dedicated PASS evidence bound to the implementation commit. Otherwise record `STOPPED - <reason>`.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE:
Report PASS or STOPPED first, finding/fix counts, commits, tests, package identity/hash, security/reviewer verdicts, external systems not touched, and whether Phase 02 may begin.

STOPPING RULES:
- Missing Microsoft tooling may yield BLOCKED package execution, never a fabricated PASS.
- Any ambiguous source/identity/version binding, origin bypass, secret exposure, external mutation, or competing release path is BLOCKING.
- Never weaken a gate to make QA green.
~~~
