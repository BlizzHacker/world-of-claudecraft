# Phase 02 QA: Verify the Store-Safe Product Profile

### QA Starter Prompt

~~~text
This is Phase 02 QA of Xbox Controller Platform: Verify the Microsoft and Xbox Store-Safe Product Profile.

Model and harness: Use Codex with the best available model and high or maximum reasoning. Use Opus 4.8 or ultracode only when exposed. Otherwise use bounded Codex agent waves with an explicit merge barrier and adversarial verification. Never claim unrun certification or Store results.

Goal: Independently prove that Microsoft artifacts contain no restricted cash/crypto/token benefit surface, the server rejects every bypass, web behavior and data remain intact, and all evidence is truthful.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read root and governing area rules, packet state/progress/checklist, Phase 02 prompt, policy evidence, implementation commits, and full phase diff.
- Scan memory if available. Record start/end SHAs, branch, UTC timestamp, dirty paths, artifact identifiers, and profile configuration. Preserve unrelated work.
- Confirm Phase 01 QA passed and Phase 02 implementation did not mutate production, Partner Center, IARC, signing, or publication state.

STEP 1 - EXPLORE CONTEXT:
Spawn a fresh read-only Explore agent to enumerate every restricted capability, UI surface, route, internal route, entitlement, persistence field, build variable, and evidence claim. Map each to a decisive positive web test and negative Microsoft test. Inspect all changed files plus the wallet, economy, daily reward, release channel, native attestation, build, i18n, docs, and test surfaces named in Phase 02. Return omissions and contradictions.

Spawn a fresh research agent to re-check cited current Microsoft/Xbox/IARC primary sources. Flag outdated, ambiguous, or unsupported claims. Research cannot substitute for observed code behavior and cannot authorize questionnaire changes.

STEP 2 - ORCHESTRATE THE QA AUDIT:
Use independent agents for:
- Server correctness and bypass/security: forge profile strings, origins, headers, query/storage values, native messages, stale tokens, endpoint paths, method variants, and internal requests. Verify fail-closed behavior and no restricted mutation/leakage.
- Client/package: navigate every landing/account/game route and direct deep link, inspect built chunks/assets/strings/network calls, and verify restricted surfaces are absent or honestly unavailable in Microsoft artifacts.
- Web regression/data safety: prove the explicit web profile still performs authorized wallet/economy/reward flows against local fakes, and existing records round-trip without destructive migration.
- Policy/evidence: compare observed behavior, machine-readable matrix, listing copy draft, IARC evidence, and primary-source citations. Report every mismatch.
- Dead code and cleanup: identify stale profile branches, bypass flags, duplicate policy checks, unreachable wallet/reward UI, unused endpoints, commented code, TODO/FIXME residue, and generated-file hand edits.

Give agents only the Explore/research summaries and narrow report ownership. Use local fixtures only. Do not contact real wallets, chains, payout services, production, or Partner Center.

INVARIANTS AND OUT OF SCOPE:
- Server authority and fail-closed Microsoft policy are non-negotiable. UI hiding is insufficient.
- Preserve deterministic sim, IWorld/host parity, auth, privacy, i18n, persistence compatibility, and web data.
- Do not retake IARC, change Store metadata, sign/publish, modify production, or add/remove product features outside the approved profile split.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run all Phase 02 focused tests plus:
- profile matrix tests for enabled web and disabled Microsoft capabilities
- malformed/missing/unknown profile, forged origin/header/query/storage/native-message, direct REST/internal API, and replay tests
- non-mutation assertions for wallet links, balances, rewards, claims, entitlements, and audit rows
- package inspection proving restricted imports, routes, copy, calls, and configuration cannot become reachable in Microsoft output
- `npx vitest run tests/i18n_completeness.test.ts tests/localization_fixes.test.ts`
- `npx tsc --noEmit`
- both web and Microsoft builds
- `npm run security:gate`

Prove key tests fail under deliberate local regressions such as client-only gating, permissive unknown profile, or one unguarded mutation route, then restore the code.

Dispatch privacy/security and test-coverage reviewers. Add migration-safety for DDL/persistence changes, cross-platform-sync for shared host/wire changes, qa-checklist when complete, and release-malware review for package/dependency changes. Read reviewer instructions completely. Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT. Fix all BLOCKING and SHOULD-FIX findings.

STEP 4 - FIX AND COMMIT CADENCE:
- `fix(release): close microsoft profile bypasses`
- `test(release): prove store-safe policy boundaries`
- `docs(store): correct product profile evidence`
Stage exact paths only and keep QA fixes separate from unrelated work.

STEP 5 - QA ACCEPTANCE:
- [ ] Every restricted capability has a server rejection test, client/package absence test, and evidence row.
- [ ] Unknown or spoofed profile state fails closed.
- [ ] No direct, alternate-method, internal, deep-link, or stale-client bypass exists.
- [ ] Microsoft requests do not expose or mutate restricted account data.
- [ ] Web behavior and existing persisted data remain correct.
- [ ] Listing/IARC evidence is factual, current, citation-backed, and contains no attempt to game a questionnaire.
- [ ] All builds, tests, i18n, security, package inspection, and reviewers pass.
- [ ] No external system was mutated.

STEP 6 - DOCS, STATE, AND MEMORY:
- Write a dedicated Phase 02 QA verdict bound to exact implementation commit and artifact hashes in packet state/progress/checklist.
- Record commands, fixtures, negative cases, findings/fixes, reviewer verdicts, citations, and OPEN items. Mark `STOPPED - <reason>` if any required evidence is absent.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE:
Report PASS or STOPPED first, profile matrix verdict, bypass coverage, web regression result, package hashes, findings/fixes/commits, policy citation status, untouched external systems, and whether Phase 03 may begin.

STOPPING RULES:
- Any restricted server bypass, destructive web regression, deceptive evidence, profile spoofability, or external mutation is BLOCKING.
- Missing or ambiguous policy evidence is OPEN or STOPPED, never guessed.
- Never weaken a test or gate to manufacture PASS.
~~~
