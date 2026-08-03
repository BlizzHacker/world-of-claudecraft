# Phase 04: Controller-First Landing, Authentication, Realms, and Characters

## Purpose

Make every pre-world flow usable from a couch with an Xbox controller: landing navigation, authentication, account recovery, 2FA, SSO, realm selection, character browsing/creation/deletion, and world entry. Use spatial focus and honest on-screen keyboard, device-code, or QR fallbacks without weakening authentication.

## Deliverables

- Add controller-first spatial navigation and visible focus across all landing, auth, realm, and character states.
- Integrate Xbox-safe text entry, validation, password, 2FA, recovery, and error flows with an on-screen keyboard where supported.
- Provide secure device-code or QR handoff fallbacks for providers that cannot complete inside the console WebView2 shell, reusing existing OAuth contracts where possible.
- Add real-browser controller E2E for first boot through successful world entry plus cancellation, expiry, retry, and error paths.

### Starter Prompt

~~~text
This is Phase 04 of Xbox Controller Platform: Controller-First Landing, Authentication, Realms, and Characters.

Model and harness: Use Codex with the best available model and high or maximum reasoning. Use Opus 4.8 or ultracode only if exposed in the current runtime. Otherwise explicitly fan out bounded Codex agents within current slots and merge at a barrier. Never claim an unavailable browser, Xbox, identity-provider, or device-code result.

Goal: Make the complete pre-world experience controller-operable and accessible, with spatial focus, safe text entry, secure provider fallbacks, and real-browser evidence, while preserving mouse, keyboard, touch, auth security, and current account data.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read root `AGENTS.md`, root `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`, `src/ui/CLAUDE.md`, `src/render/CLAUDE.md`, `src/net/CLAUDE.md`, `server/CLAUDE.md`, `server/http/CLAUDE.md`, `scripts/CLAUDE.md`, and `tests/CLAUDE.md` where present.
- Read packet cross-cutting docs, Phase 01 through 03 outcomes, this prompt, and the mode/adapter table in `state.md`.
- Scan memory if available. Record branch, start SHA, UTC timestamp, dirty paths, auth test accounts/fixtures, and concurrent ownership. Preserve user work and stage exact paths only.
- Require Phase 03 QA PASS. Use local services and test identity-provider fixtures. Do not alter production auth, real provider configuration, Partner Center, or Store state.

STEP 1 - EXPLORE CONTEXT:
Spawn read-only Explore agents and request focused summaries:

Landing and view structure:
- `index.html`, `src/landing.ts`, `src/main.ts`, `src/styles/shell.css`, `src/styles/components.css`
- all landing view/nav, modal, form, account portal, realm, server picker, character list/card, character creation, delete confirmation, and `enterWorld` entrypoints
- `src/game/landing_backdrop.ts`, `src/game/loading_screen.ts`, and app-lifetime controller adapters from Phase 03

Focus, auth, and character presentation:
- `src/ui/focus_manager.ts`, `src/ui/focus_order.ts`, `src/ui/window_focus.ts`, `src/ui/auth_utils.ts`, `src/ui/account_portal.ts`
- `src/ui/character_appearance.ts`, `src/ui/char_view.ts`, `src/render/characters/preview.ts`, `src/render/characters/preview_appearance.ts`, `src/render/characters/preview_clip.ts`
- `src/sim/realms/registry.ts`, `src/sim/realms/types.ts`, `src/ui/cryptic/realm_env.ts`, and realm presentation modules

Authentication and handoff:
- `server/auth.ts`, `server/auth_routes.ts`, `server/account.ts`, `server/totp.ts`, `server/characters.ts`, `server/realm.ts`
- `server/oauth.ts`, `server/oauth_db.ts`, `server/discord_oauth.ts`, `server/github_oauth.ts`, `server/apple_auth.ts`, `server/desktop_login.ts`, `server/native_discord_handoff.ts`, `server/native_attestation.ts`
- `src/net/native_discord.ts`, `src/net/native_apple_auth.ts`, OAuth callback/bounce logic in `src/main.ts`, and all existing device authorization endpoints/fixtures
- `shell/CrypticRealm.Shell/MainPage.xaml.cs`, bridge messages, navigation restrictions, and text-input behavior

Tests and browser harness:
- `tests/auth_utils.test.ts`, `tests/account_2fa.test.ts`, `tests/server/auth.register.test.ts`, `tests/server/auth.login.test.ts`, `tests/server/characters.test.ts`
- `tests/oauth.test.ts`, `tests/server/oauth.test.ts`, `tests/discord_oauth.test.ts`, `tests/github_oauth.test.ts`, `tests/apple_auth*.test.ts`, `tests/native_apple_auth.test.ts`
- `tests/charselect_action.test.ts`, `tests/charselect_class_details.test.ts`, `tests/charselect_sort_parity.test.ts`, `tests/character_appearance.test.ts`, `tests/character_preview_clip.test.ts`, `tests/realms.test.ts`
- `tests/classic/landing-smoke.spec.ts`, `tests/browser/a11y.browser.test.ts`, `tests/browser/focus_indicator.browser.test.ts`, and relevant screenshot scripts

The report must enumerate every screen/state and every interactive control, initial and return focus, DOM replacement risks, current keyboard/touch behavior, validation/error paths, loading/disabled states, destructive confirmation, screen-reader semantics, provider restrictions, redirect/popup assumptions, and existing device-code capability. Identify exact controller-service adapters to implement. Mark missing provider contracts OPEN.

Spawn a required web-research agent using current official primary sources for Xbox/UWP/WebView2 text entry and system keyboard behavior, Microsoft identity device authorization, OAuth 2.0 device authorization grant, QR/deep-link safety, accessibility, Xbox safe-area/10-foot guidance, and each configured provider's supported console-safe flow. Return exact endpoints, grant fields, polling intervals, expiry/error behavior, PKCE/client-secret rules, and citations. Mark unsupported or unverifiable provider flows OPEN. Do not invent a device flow for providers that do not support one.

STEP 2 - ORCHESTRATE AND EXECUTE:
Request bounded agents with non-overlapping ownership and one integration owner for `src/main.ts`/`index.html`.

Spatial focus slice:
- Build a pure spatial focus model that chooses directional neighbors from visible, enabled candidates using geometry, stable tie-breaks, explicit groups, and wrap rules only where designed.
- Integrate it through the Phase 03 controller service for landing nav, forms, tabs, realm options, character cards, class/appearance controls, confirmations, and world-entry buttons.
- Preserve DOM tab order and `FocusManager` traps. Controller focus must use real focusable elements, a visible focus ring, labels, descriptions, live error announcements, and return-to-opener behavior.
- Re-home focus after asynchronous list refresh or selected-card removal. Disabled/hidden/detached elements are never targets.

Text and auth slice:
- Define one text-entry adapter that enters the Phase 03 `textEntry` mode, focuses the real input, invokes the Xbox-supported OSK/native mechanism where available, and exits without replaying A/B/Menu as gameplay.
- Cover username, password, password confirmation, character name, TOTP/recovery code, search/filter, and any required consent. Preserve password masking, autocomplete intent, length/pattern constraints, rate limits, Turnstile/native attestation, and generic anti-enumeration errors.
- Make submit, cancel, back, validation failure, timeout, throttling, offline, server error, and successful session restore controller-complete.

SSO/device/QR slice:
- Reuse existing OAuth device endpoints if they satisfy current standards. Add the minimum secure server contract only where official provider support and the approved design require it.
- Device/QR flows must use short-lived, single-use, account-bound codes; PKCE where required; server-side polling interval/expiry; no client secret in the package; no bearer token in QR URLs/logs; and generic status suitable for a public screen.
- Provide a typed `start`, `pending`, `slow_down`, `authorized`, `expired`, `denied`, `cancelled`, and `error` state model. Stop polling on view exit, suspension, or completion.
- If a provider cannot support device/QR safely, show an accurate localized unavailable/fallback path rather than a fake or insecure flow.

Realm and character slice:
- Make server/realm selection, offline/online choice, sort, class details, appearance, name validation, create, select, delete, and enter-world flows navigable and understandable from controller only.
- Preserve character ownership, limits, global name rules, delete confirmation, loading locks, duplicate-submit prevention, realm scoping, and preview cleanup.
- Use contextual controller glyphs without hard-coding Xbox glyph copy into semantic labels. Phase 05 owns the full glyph service; this phase may consume the Phase 03 device kind.

INVARIANTS:
- Auth remains server-authoritative. No tokens, passwords, recovery codes, TOTP secrets, provider client secrets, or QR bearer credentials enter logs, URLs, analytics, screenshots, or `window.__game`.
- Device codes are short-lived, single-use, rate-limited, non-enumerable, and cancelled on abandonment. Polling obeys provider intervals and `slow_down`.
- Controller uses the existing app-lifetime service, real DOM focus, shared `FocusManager`, and one text-entry adapter. No second global key handler or focus trap.
- Keyboard, mouse, touch, screen reader, browser password manager, and ordinary web OAuth remain functional.
- Character/realm operations retain existing server validation and ownership. No client-side authority.
- Player-visible strings use English source and every locale. Generated i18n output is regenerated only.
- Sim behavior, IWorld, wire protocol, and persistence remain unchanged unless an explicitly tested requirement forces a minimal parity-safe change.

OUT OF SCOPE:
- New identity providers, bypassing Turnstile/2FA, storing credentials, changing account policy, couch co-op login, gameplay action layers, full haptic catalog, Store publication, production provider configuration, and real-account destructive tests.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run focused unit/server tests listed in Step 1 plus:
- pure spatial-focus tests for every direction, tie, hidden/disabled/detached candidate, layout resize, group boundary, RTL/localized expansion, and empty/single candidate
- controller onboarding state tests for all screens, initial/return focus, async repaint, held-button debounce, text mode, OSK cancel/submit, and error recovery
- auth device/QR tests for expiry, replay, wrong account, poll interval, `slow_down`, denial, cancellation, suspension, malformed code, rate limit, and secret/token redaction
- real-browser controller E2E for new registration/login, existing login, validation error, 2FA, provider fallback, realm select, character create/select/delete confirmation cancel, failed entry, successful entry, and back navigation
- keyboard, mouse, touch, screen reader, and standard web OAuth regressions
- `npx vitest run tests/i18n_completeness.test.ts tests/localization_fixes.test.ts`
- `npx tsc --noEmit`

Run browser tests at representative 720p and 1080p 10-foot layouts and a narrow/touch layout. Screenshot each pass/fail checkpoint, redact any sensitive entry, and fail on page/console error.

Dispatch privacy-security review for auth, OAuth, QR, tokens, server, native bridge, and logs; test-coverage for implementation; qa-checklist when complete; migration-safety if DDL/persistence changes; cross-platform-sync only for IWorld/sim/net/wire/host changes. Add accessibility/frontend review if available. Read reviewer instructions fully, request COVERAGE and structured verdicts, and fix all BLOCKING and SHOULD-FIX findings.

STEP 4 - COMMIT CADENCE:
- `feat(input): add spatial controller focus`
- `feat(auth): add secure console text and device flows`
- `feat(ui): make realms and characters controller-first`
- `test(xbox): cover controller onboarding end to end`
Use smaller atomic commits where needed. Stage explicit paths only.

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] A controller-only user can traverse every landing view and reach login/register without pointer or keyboard.
- [ ] Username, password, character name, 2FA/recovery, submit, cancel, validation, and error recovery are complete with safe text-entry/OSK behavior.
- [ ] Each SSO provider has either a standards-compliant tested device/QR flow or an accurate localized fallback marked by current official evidence.
- [ ] Realm select and every character browse/create/select/delete/cancel/enter state are controller-complete with stable focus and no duplicate submissions.
- [ ] Real DOM focus, accessible names/descriptions/live errors, safe areas, and visible focus rings pass browser/a11y checks.
- [ ] Auth secrets/tokens never appear in URLs, logs, screenshots, QR payloads, client storage beyond existing approved session handling, or test artifacts.
- [ ] Keyboard, mouse, touch, password manager, screen reader, and standard web flows remain green.
- [ ] Real-browser controller E2E reaches the world with no page or console errors.

STEP 6 - DOCS, STATE, AND MEMORY:
- Update packet progress/state/checklist with screen/focus maps, text-entry contract, provider capability matrix and citations, endpoint/schema changes, test accounts, redacted artifacts, SHAs, reviewers, OPEN provider work, and Phase 04 QA handoff.
- Record durable security and UX decisions in memory if used.

STEP 7 - FINAL RESPONSE:
Report outcome, controller-only path, provider matrix, files/commits, auth/security behavior, real-browser/a11y evidence, regressions, reviewers, OPEN provider limitations, untouched external systems, and Phase 04 QA entrypoint.

STOPPING RULES:
- Stop before inventing unsupported provider/device flows or putting secrets/tokens in a QR code, URL, log, screenshot, or package.
- Stop if controller navigation requires weakening auth, 2FA, Turnstile/attestation, rate limits, ownership, or destructive confirmation.
- Stop if focus becomes visual-only instead of real DOM focus, or if keyboard/touch accessibility regresses.
- Do not mutate real accounts, provider config, production, Partner Center, or Store state.
~~~
