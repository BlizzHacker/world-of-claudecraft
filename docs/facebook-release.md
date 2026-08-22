# Facebook release runbook (Instant Games)

How Cryptic Realm ships on Facebook: what the platform is, what this repo
automates, the exact account-side steps, and the policy constraints, especially
around the $CR token. Companion pieces in the tree: `facebook/` (the bundle),
`scripts/build_facebook_bundle.mjs` (`npm run facebook:build`),
`src/game/facebook_context.ts` (the in-client gate), and the wiring in
`src/main.ts` (search `FACEBOOK_APP`).

## Product decision: Instant Games

Facebook's current distribution product for HTML5 games is still Instant
Games: lightweight HTML5 games played inside the Facebook app and on the web
with no download. Checked against the live docs in August 2026:

- Games platform hub: https://developers.facebook.com/documentation/games
- Build overview: https://developers.facebook.com/documentation/games/build/overview
- Quick start (SDK URL + lifecycle): https://developers.facebook.com/documentation/games/build/quick-start
- Upload bundle: https://developers.facebook.com/documentation/games/launch/upload-bundle
- Launch overview (reviews): https://developers.facebook.com/documentation/games/launch/overview
- FAQ (external hosting, backend, fees): https://developers.facebook.com/documentation/games/build/faq

The facts the packaging is built on, from those pages:

- The playable bundle is a zip uploaded to Facebook Web Hosting (App
  Dashboard, Instant Games > Web Hosting). `index.html` and `fbapp-config.json`
  must sit at the zip root. Maximum bundle size is 200 MB; Facebook recommends
  keeping the initial bundle under 5 MB and aiming for playable within about
  3 seconds.
- The SDK is FBInstant 8.0, loaded from
  `https://connect.facebook.net/en_US/fbinstant.8.0.js`, with the mandatory
  lifecycle `FBInstant.initializeAsync()`, then real progress through
  `FBInstant.setLoadingProgress(0..100)`, then `FBInstant.startGameAsync()`.
- External resources are explicitly permitted: the FAQ says to load
  non-essential assets from your own CDN after the game starts, and that the
  game client may talk to your own backend over fetch, XHR, and WebSockets
  (real-time multiplayer is a named use case). This is what makes the MMO
  viable at all: the world simulation stays on the Cryptic Realm servers and
  streams over the same WebSocket protocol every other client uses.

### How the shell applies that (and the honest gray area)

`facebook/index.html` is a thin shell, the same approach as
`mobile-shell/index.html` on Android: Facebook hosts a few KB, the game
streams from https://crypticrealm.com. One structural difference: the mobile
shell navigates to the live site, but navigating an Instant Game away from its
bundle would tear down the FBInstant context, so the Facebook shell instead
keeps the SDK alive in the bundle page and frames the live client at
`https://crypticrealm.com/play?fb=1` after `startGameAsync()`.

Be honest about the risk here: the docs bless streaming assets and talking to
your own backend, but they do not spell out "the entire client may be an
iframe of your own site". Reviewers grade the experience, not the packaging,
so a fast, functional game inside the container is the best defense; if the
Instant Games review objects to the frame, the fallback is a bundle that loads
the built client JS from the crypticrealm.com CDN directly into the bundle
page (the Xbox packaged build already proves the client runs from a foreign
origin against `VITE_API_ORIGIN`, see `src/client_origin.ts`), which is more
work but unambiguously "code loaded over HTTPS into the FB-hosted page".

## What is automated

`npm run facebook:build` (script: `scripts/build_facebook_bundle.mjs`):

- zips everything under `facebook/` (currently `index.html` +
  `fbapp-config.json`) into `dist-facebook/cryptic-realm-instant-games-v<version>.zip`
  (gitignored), deterministic store-only zip, no external dependencies;
- validates the bundle against the platform rules
  (`scripts/facebook/bundle_rules.mjs`): required files at the zip root, the
  SDK include and full lifecycle present in `index.html`, `fbapp-config.json`
  schema (platform_version RICH_GAMEPLAY, landscape orientation), the 200 MB
  hard limit and the 5 MB recommendation;
- prints the final size and PASS/FAIL. Tests: `tests/facebook_bundle.test.ts`.

`fbapp-config.json` ships landscape (`orientation` and
`override_web_orientation` both LANDSCAPE) and RICH_GAMEPLAY, and deliberately
omits `navigation_menu_version` so the platform default applies (the docs are
inconsistent between NAV_BAR and NAV_FLOATING; the validator accepts either if
one is ever added). No bots, no payments, no custom update templates in the
initial submission.

In-client, `src/game/facebook_context.ts` detects the container (the `fb=1`
query param the shell appends, persisted to sessionStorage for SPA
navigation; an FBInstant global would also count) and `src/main.ts` gates the
policy-sensitive surfaces off it, mirroring the NATIVE_APP gate pattern:

- Solana wallet capability fails closed (`resolveWalletCapability` disabled),
  which also disables the SOL/USDC/WOC purchase rails downstream;
- daily rewards (a $CR-holding feature) are hidden entirely;
- the Claudium store and pack purchases report unavailable (Stripe checkout is
  an off-platform payment inside Facebook's container, so no store ships until
  a real FBInstant.payments integration exists);
- `body.facebook-app` is set as a styling hook.

Tests: `tests/facebook_context.test.ts`.

## Server prerequisite (one-time, before any Facebook testing)

The shell frames crypticrealm.com, so the site must allow Facebook's container
origins as frame ancestors or the game renders as a blank page:

- crypticrealm.com must NOT send `X-Frame-Options: DENY` or `SAMEORIGIN` on
  `/play` (and any realm subdomain the picker can select);
- if a `Content-Security-Policy` `frame-ancestors` directive is set, it must
  include `https://www.facebook.com` and `https://apps.fbsbx.com` (the iframe
  host Facebook serves bundles from), plus `https://*.facebook.com` for the
  mobile app webview.

Verify from a browser console on the staged game: a blocked frame logs a
frame-ancestors or X-Frame-Options refusal.

## Account-side steps (Wade)

1. Apply to the Approved Partner Program (linked from
   https://developers.facebook.com/documentation/games/launch/approved-partner-program)
   with your personal Facebook account. This is a one-time developer vetting
   step, takes 1 to 4 weeks, and launch is impossible without it, so file this
   first and build in parallel.
2. Create the app: App Dashboard (https://developers.facebook.com/apps/), new
   app of type Instant Games, named Cryptic Realm.
3. Settings > Basic: set the Privacy Policy URL, the Data Deletion
   instructions URL (or callback), and add crypticrealm.com under App Domains
   (the client talks to it). These fields block review if missing.
4. Instant Games > Settings: display name, 2 to 4 sentence description,
   category (Role Playing), keywords, platform toggles (Web, Facebook App iOS,
   Facebook App Android), orientation Landscape (matching
   `facebook/fbapp-config.json`).
5. Upload artwork: game icon 800 x 800 PNG/JPG, cover images 1200 x 630 and
   1080 x 1080, gameplay video MP4 (1280 x 720 minimum). Blurry or placeholder
   assets are a named common rejection reason.
6. Build and upload the bundle: `npm run facebook:build`, then Instant Games >
   Web Hosting > Upload Bundle with the zip from `dist-facebook/`. Uploading
   does not go live by itself.
7. Stage the uploaded version ("Stage for Testing"): it becomes playable for
   accounts with a role on the app. Add tester roles under App Roles.
8. Test: on desktop at
   `https://www.facebook.com/embed/instantgames/<APP_ID>/player`, and in the
   Facebook mobile app by searching the game name with a tester account. Run
   the smoke list below.
9. Complete the Data Use Checkup in the App Dashboard (declares what player
   data the app touches; it recurs periodically, calendar it).
10. Submit App Review (only needed for reviewable permissions; the base
    Instant Games launch needs the game functional first), expect 1 to 5
    business days.
11. Submit the Instant Games quality review with all assets final, expect 3 to
    10 business days.
12. After approval, Push to Production in Web Hosting. Later uploads repeat
    steps 6 to 8 and only need re-review where Facebook asks for it.

## Constraints to keep in mind

- Bundle: 200 MB zip maximum, index.html + fbapp-config.json at the root,
  under 5 MB initial strongly recommended (ours is a few KB).
- Reviews: Approved Partner Program 1 to 4 weeks (one-time), App Review 1 to 5
  business days, Instant Games quality review 3 to 10 business days, IAP
  review 3 to 10 business days if in-app purchases are ever added.
- Monetization, when we get there: purchases must run through
  `FBInstant.payments`, revenue share is 70/30 (Facebook keeps 30 percent),
  payouts are monthly about 21 days after month end, subscriptions are not
  supported, and product availability must be checked via
  `FBInstant.getSupportedAPIs()`. Ads run through Audience Network placements.
  None of this ships in the first submission: the store is gated off in the
  Facebook context.
- Publishing itself is free; there is no listing fee.

## Policy risks found (read before submitting)

- **$CR is the biggest risk surface.** Daily rewards require holding $CR in a
  verified Solana wallet with a prize pool on a leaderboard; Meta's gambling
  policy treats "anything of monetary value as part of a method of entry and
  prize" as real-money gaming requiring prior written permission, and its
  crypto policies restrict services that enable monetization, reselling,
  swapping, or staking of tokens
  (https://transparency.meta.com/policies/ad-standards/restricted-goods-services/gambling-games/,
  https://transparency.meta.com/policies/ad-standards/restricted-goods-services/cryptocurrency-products-and-services/).
  The Facebook build therefore hides the wallet, daily rewards, and every
  crypto purchase rail via the `FACEBOOK_APP` gate. Do not mention $CR, token
  prices, or wallets anywhere in the Facebook listing copy, screenshots, or
  video either.
- **Off-platform payments.** Stripe checkout for Claudium inside the Facebook
  container would bypass FBInstant.payments; the gate reports the store and
  packs unavailable in the Facebook context. Revisit only with a real
  FBInstant.payments integration and an IAP review.
- **The marketing site is out of frame.** The shell loads `/play`, not the
  landing page, so the $CR marketing sections (contract address, token
  roadmap) never render inside Facebook. Keep it that way if the shell URL
  ever changes.
- **External links.** Surfaces that push players out of the container
  (Discord, wiki, store pages) are tolerated poorly by game platforms
  generally; they are not gated today, so expect reviewer feedback here and
  be ready to hide the community menu behind the same `FACEBOOK_APP` gate.
- **Login friction.** The client's normal auth (email, Authentik SSO) runs
  inside a third-party iframe on Facebook: browsers partition storage there
  and popup-based SSO may be blocked. Email login is the safe path for the
  first review pass; a native `FBInstant.player` identity bridge is the
  long-term fix and would also satisfy reviewers who expect instant play.

## Smoke checklist for a staged build

- Game reaches the character screen inside the Facebook desktop player and
  the Android Facebook app.
- Loading screen progresses and dismisses (the shell reports real milestones;
  a hang past 30 seconds means the frame's load event never fired, check the
  frame-ancestors headers first).
- No wallet button, no daily rewards button, no Claudium store anywhere
  (`body.facebook-app` present in devtools confirms the gate is live).
- WebSocket connects to the realm (Network tab: wss to crypticrealm.com).
- Landscape orientation is enforced on mobile.
