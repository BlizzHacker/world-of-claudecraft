# Phase 04 QA: Verify Controller-First Onboarding

### QA Starter Prompt

~~~text
This is Phase 04 QA of Xbox Controller Platform: Verify Controller-First Landing, Authentication, Realms, and Characters.

Model and harness: Use Codex with the best available model and high or maximum reasoning. Use named historical harnesses only when available. Otherwise use bounded fresh Codex agents with a merge barrier. Never claim real-provider, Xbox, or browser evidence that did not run.

Goal: Independently complete every pre-world flow with controller-only input, verify secure text/device/QR behavior, and prove accessibility plus keyboard/mouse/touch regressions.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read repository rules, packet state/progress/checklist, Phase 04 prompt, provider research/evidence, implementation commits, and full diff.
- Scan memory if available. Record branch, SHAs, UTC timestamp, local endpoints, test identities, browser versions, and dirty paths. Preserve unrelated work.
- Confirm Phase 03 QA PASS and zero production/provider/Store mutation.

STEP 1 - EXPLORE CONTEXT:
Spawn a fresh Explore agent to enumerate every landing/auth/account/realm/character view, control, focus edge, text field, network transition, provider state, error, and destructive confirmation. Map every acceptance item to tests and browser scenarios. Inspect current code and all files/tests named in Phase 04. Return missing states, inaccessible controls, token leaks, polling cleanup gaps, and keyboard/touch regressions.

Use a fresh research agent to verify every provider and Xbox/WebView2 claim against current official primary sources. Anything unsupported becomes OPEN and its UI must use the honest fallback.

STEP 2 - ORCHESTRATE THE QA AUDIT:
Use independent agents for:
- Onboarding correctness and spatial focus/accessibility across 720p, 1080p, localized expansion/RTL, zoom, dynamic lists, hidden/disabled controls, modal nesting, and return focus.
- Auth security and text entry including registration, login, password manager, rate limit, 2FA/recovery, OSK cancel/submit, suspension, generic errors, and redaction.
- OAuth/device/QR state machine including interval, `slow_down`, expiry, cancellation, denial, replay, wrong account/session, malformed input, and provider unsupported fallback.
- Realm/character behavior including empty/max lists, failed refresh, realm offline/full, sorting, class/appearance, invalid/taken names, duplicate create, delete cancel/confirm using QA-only data, failed/successful world entry, and preview cleanup.
- Non-controller regressions for keyboard, pointer, touch, screen reader, browser OAuth, and responsive UI.
- Dead code and cleanup for stale focus routes, duplicate submit/back handlers, abandoned polling, unused auth states, commented code, TODO/FIXME residue, and generated-file hand edits.

Run only against local services and namespaced QA accounts. Clean them up. Never display or retain real credentials.

INVARIANTS AND OUT OF SCOPE:
- Auth, ownership, rate limiting, and 2FA remain authoritative. Real DOM focus and secret redaction are mandatory.
- Do not add providers, loosen security, test destructive flows on non-QA accounts, implement gameplay-depth features, or mutate external systems.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run every Phase 04 focused unit/server/browser test and a controller-only scenario matrix from cold boot to world entry. Include every empty, boundary, malformed, retry, cancellation, timeout, reconnect, suspension, dynamic repaint, and failure state. Capture redacted screenshots and DOM/accessibility evidence. Any page error, unexpected console error, stuck focus, duplicate request, or leaked secret is FAIL.

Run i18n completeness/localization guards, `npx tsc --noEmit`, security gate, and standard keyboard/mouse/touch smoke. Prove decisive tests fail with deliberate local regressions for detached-focus targeting, token-in-URL, replayable code, and text-mode gameplay leakage, then revert only those mutations.

Dispatch privacy-security, test-coverage, accessibility/frontend if available, and qa-checklist reviewers. Add migration-safety or cross-platform-sync only when their diff gates match. Read instructions completely and request COVERAGE with BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT. Resolve all BLOCKING and SHOULD-FIX findings.

STEP 4 - FIX AND COMMIT CADENCE:
- `fix(auth): close controller onboarding qa gaps`
- `fix(a11y): stabilize controller focus flows`
- `test(xbox): verify secure controller onboarding`
Stage exact paths only and keep QA fixes separate.

STEP 5 - QA ACCEPTANCE:
- [ ] Controller-only cold boot reaches a playable character with no keyboard, mouse, stuck focus, or console/page error.
- [ ] Every form, OSK/text, 2FA, error, cancel, back, and retry state is complete.
- [ ] Device/QR flows are standards-compliant, short-lived, single-use, correctly polled, redacted, and cancelled; unsupported providers are honest.
- [ ] Every realm/character state and QA-only destructive confirmation behaves correctly.
- [ ] Spatial focus, real DOM focus, focus ring, accessible names/live errors, safe area, localized/RTL layout, and screen reader checks pass.
- [ ] Keyboard, mouse, touch, password manager, and ordinary web OAuth remain green.
- [ ] QA data is cleaned and no external system was mutated.

STEP 6 - DOCS, STATE, AND MEMORY:
- Record a Phase 04 QA PASS or `STOPPED - <reason>` bound to exact commits, local environment, provider fixtures, and redacted browser artifacts.
- Update packet state/progress/checklist with scenario results, findings/fixes, reviewer verdicts, cleanup, provider OPEN items, and Phase 05 prerequisites.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE:
Report PASS or STOPPED, controller-only route, auth/provider verdicts, accessibility and regression matrix, findings/fixes/commits, QA cleanup, reviewers, OPEN limitations, and whether Phase 05 may begin.

STOPPING RULES:
- Secret/token leakage, replay, provider-contract invention, auth weakening, inaccessible focus, non-QA destructive action, or external mutation is BLOCKING.
- Missing real-browser evidence is not a complete PASS.
- Never weaken an auth, accessibility, or test gate to make the phase green.
~~~
