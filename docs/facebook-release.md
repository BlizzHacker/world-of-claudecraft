# Facebook release runbook (Instant Games)

How Cryptic Realm ships on Facebook: what the platform is, what this repo
automates, the exact account-side steps, and the policy constraints, especially
around the $CR token. Companion pieces in the tree: `facebook/fbapp-config.json`
(the platform config), `scripts/build_facebook_bundle.mjs`
(`npm run facebook:build`, which builds the client and packages the zip),
`scripts/facebook/shell_inject.mjs` (the page transform),
`src/game/facebook_context.ts` + `src/game/facebook_instant.ts` (the in-client
gate and the lifecycle bridge), and the wiring in `src/main.ts` (search
`FACEBOOK_APP`).

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

### How the bundle applies that (and why an iframe cannot work)

The bundle ships the REAL game client. An earlier iteration was a thin shell
that framed `https://crypticrealm.com/play?fb=1`, and live testing in
Facebook's shield sandbox killed it at Facebook's own CSP layer: the bundle
page is served with `frame-src 'self' shield-apps-<appid>.apps.fbsbx.com
blob:` (plus an `img-src` allowlist that does not include crypticrealm.com),
so the browser refuses to frame the live site at all (console: "Framing
'https://crypticrealm.com/' violates ... frame-src"). No server-side header
can fix that: the CSP belongs to Facebook's page, not ours. The one channel
the platform blesses is `connect-src`: fetch, XHR, and WebSockets to your own
backend.

So the architecture is: the vite-built play entry (the full game client) runs
IN the bundle page, and everything heavy streams from https://crypticrealm.com
over exactly those channels. Concretely:

- `scripts/build_facebook_bundle.mjs` runs a facebook-mode vite build
  (`WOC_FACEBOOK_BUNDLE=1` in `vite.config.ts`: play entry only, relative
  base, no public/ copy) and transforms the built page into the bundle's
  `index.html` (`scripts/facebook/shell_inject.mjs`).
- REST and the world WebSocket resolve absolute against the live site via
  `VITE_API_ORIGIN` (the same knob the Xbox/Capacitor builds use;
  `src/client_origin.ts`).
- Every runtime asset URL (models, media, audio, textures, ui art) resolves
  absolute via the new `VITE_ASSET_ORIGIN` knob (`assetHostUrl` in
  `src/client_origin.ts`, applied at the loader seams: the media manifest
  resolver, the SFX/voice/music players, the loading screen art).
- Textures that would normally load through an HTMLImageElement switch to
  fetch + `createImageBitmap` when a remote asset origin is configured
  (`src/render/assets/loader.ts`): image elements are subject to the
  container's `img-src` allowlist, fetch rides `connect-src`.
- The KTX2/Basis transcoder ships INSIDE the zip (`basis/`,
  `VITE_KTX2_TRANSCODER_PATH`): every GLB parse depends on it, so it must not
  hang off cross-origin fetch or CSP.
- The FBInstant SDK and its whole lifecycle live in an inline shell script in
  the bundle's `index.html`; the game reports its real boot milestones to it
  through DOM events (`src/game/facebook_instant.ts`), and the shell maps the
  final "login/character screen interactive" signal to
  `setLoadingProgress(100)` + `startGameAsync()`.
- The shell seeds the fb-app context (sessionStorage, read by
  `src/game/facebook_context.ts`) before the game module executes, so the
  wallet/rewards/store gates are active from the first frame; the FBInstant
  global in the same page is a second, independent signal.

Known fail-soft degradations inside the container (all CSP-imposed, all
non-blocking):

- Music, NPC voice, and the boss/Sowfield tracks play through media elements;
  if `media-src` blocks the cross-origin site they stay silent (every play
  path already catches and continues). Sampled SFX are unaffected: they fetch
  + decode over `connect-src`.
- UI art loaded through `<img>` or CSS `url()` from crypticrealm.com (rank
  frames, cursors, some panel art) is subject to `img-src` and may not render;
  procedural icons, canvas art, and GLB-embedded textures are unaffected. The
  favicons and the world-entry loading backdrops ship in the zip.
- Google Fonts are blocked by `style-src`/`font-src`; the UI falls back to
  system stacks.

## What is automated

`npm run facebook:build` (script: `scripts/build_facebook_bundle.mjs`):

- runs the facebook-mode vite build of the play entry into
  `dist-facebook/client/` (gitignored), with `VITE_API_ORIGIN` and
  `VITE_ASSET_ORIGIN` baked to https://crypticrealm.com and no Turnstile site
  key (the container CSP blocks the widget script);
- transforms the built page into the bundle `index.html`
  (`scripts/facebook/shell_inject.mjs`): FBInstant shell injection, the
  Turnstile include stripped, every root-relative reference rewritten to the
  game origin (or to the few bundled local files);
- stages the built `assets/`, the `basis/` KTX2 transcoder, the favicons and
  loading backdrops, and `facebook/fbapp-config.json`, then zips them into
  `dist-facebook/cryptic-realm-instant-games-v<version>.zip` (deterministic
  store-only zip, no external dependencies);
- runs the private-api guard (`scripts/facebook/private_api_guard.mjs`):
  Facebook's upload validator greps the bundle text for `FB.*`/`FBInstant.*`
  member literals and rejects with "Must Not Call Private APIs" on anything
  outside the public surface, a net that also catches accidents. The v2
  bundle was rejected because the minifier named a hud-chunk local `FB`
  (shipping `FB.main` / `FB[e]`) and a vendor user-agent regex literally
  contains `FB[` (`/FB[AS]V\//`, the Facebook in-app browser UA). The guard
  alpha-renames colliding `FB` identifiers to an unused name and escapes the
  `B` inside literal/regex collisions (same runtime value), then audits every
  text entry: any remaining FB member literal, or an FBInstant member outside
  the documented 8.0 API, fails the build before upload;
- validates the bundle against the platform rules
  (`scripts/facebook/bundle_rules.mjs`: required files at the zip root, the
  SDK include and full lifecycle present in `index.html`, `fbapp-config.json`
  schema, the 200 MB hard limit) plus the shell wiring rules (context seed,
  lifecycle events, no leftover root-relative references);
- prints the final size and PASS/FAIL. The bundle lands in the tens of MB
  (the built client plus every lazy locale chunk), above the 5 MB
  recommendation (a printed warning) and far under the 200 MB limit.
  Tests: `tests/facebook_bundle.test.ts`, `tests/facebook_instant.test.ts`.

`fbapp-config.json` ships landscape (`orientation` and
`override_web_orientation` both LANDSCAPE), RICH_GAMEPLAY, and
`navigation_menu_version` NAV_FLOATING. No bots, no payments, no custom
update templates in the initial submission.

In-client, `src/game/facebook_context.ts` detects the container (the
sessionStorage flag the bundle shell seeds before the game module executes,
the FBInstant global in the same page, or the `fb=1` query param for dev
entry) and `src/main.ts` gates the policy-sensitive surfaces off it,
mirroring the NATIVE_APP gate pattern:

- Solana wallet capability fails closed (`resolveWalletCapability` disabled),
  which also disables the SOL/USDC/WOC purchase rails downstream;
- daily rewards (a $CR-holding feature) are hidden entirely;
- the Claudium store and pack purchases report unavailable (Stripe checkout is
  an off-platform payment inside Facebook's container, so no store ships until
  a real FBInstant.payments integration exists);
- `body.facebook-app` is set as a styling hook.

Tests: `tests/facebook_context.test.ts`.

## Server prerequisites (one-time, before any Facebook testing)

The bundle page runs on a Facebook hosting origin
(`https://shield-apps-<APP_ID>.apps.fbsbx.com` for a staged build,
`https://apps-<APP_ID>.apps.fbsbx.com` in production), so crypticrealm.com
must accept that origin as a browser client. These are deploy-side changes
(the deploy branch owns server files); nothing in this repo's server tree was
changed for the bundle:

- **CORS reflection for /api/**: `maybeCors` (`server/main.ts`) and
  `allowedCorsOrigin` (`server/web_login_guard.ts`) reflect only realm,
  native, and desktop origins today. Without the fbsbx origins added, every
  authenticated REST call from the bundle fails the CORS check in the
  browser. Bearer auth (no cookies) makes reflecting the specific fbsbx
  origins safe, same as the native shells.
- **Auth-endpoint Origin guard**: `/api/login` + `/api/register` require a
  recognised Origin in production (`isWebClientRequest`). The fbsbx origins
  can be added without a code change via the `WEB_ORIGINS` env list.
- **Static asset CORS**: the client fetches `/models/`, `/media/`, `/audio/`,
  `/textures/`, `/env/`, `/vfx/` cross-origin (THREE loaders use fetch, and
  textures use fetch + createImageBitmap in this build). Whatever serves
  those files must send `Access-Control-Allow-Origin: *` on them (they are
  public and credential-free; the versioned SFX surface is already
  CORS-open). Without it, world models and textures fail to load from the
  bundle.
- **WebSocket**: `/ws` performs no Origin filtering (`server/ws_auth.ts`
  authenticates via the first frame), so no change is needed there.
- **Turnstile**: the container CSP blocks the Turnstile widget script, so the
  bundle builds without a site key and can send no token; with
  `TURNSTILE_SECRET` configured the server fails login/register closed for
  fb-origin players. Shipping login needs a deliberate decision on the deploy
  branch: an fb-origin lane like the documented desktop-origin softening in
  `server/turnstile.ts`, or better, an FBInstant signed-player attestation
  (`FBInstant.player.getSignedInfoAsync`). Do not silently weaken the gate.

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
  under 5 MB initial recommended. Ours ships the whole built client (tens of
  MB, mostly the lazy locale chunks), which trades the recommendation for a
  game that actually boots under the container CSP; Facebook's loading UI
  covers the download and the build prints the size warning on purpose.
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
- **The marketing site is out of the bundle.** The bundle is built from the
  play entry, not the landing page, so the $CR marketing sections (contract
  address, token roadmap) never render inside Facebook. Keep it that way if
  the bundle entry ever changes.
- **External links.** Surfaces that push players out of the container
  (Discord, wiki, store pages) are tolerated poorly by game platforms
  generally; they are not gated today, so expect reviewer feedback here and
  be ready to hide the community menu behind the same `FACEBOOK_APP` gate.
- **Login friction.** The client's normal auth (email, Authentik SSO) runs on
  an fbsbx.com origin inside Facebook's own frame: browsers partition storage
  there, popup-based SSO may be blocked, and Turnstile cannot render (see
  Server prerequisites). Email login is the intended path for the first
  review pass once the fb-origin lane lands server-side; a native
  `FBInstant.player` identity bridge (signed player info as an attestation)
  is the long-term fix and would also satisfy reviewers who expect instant
  play.

## Smoke checklist for a staged build

- Game reaches the login/character screen inside the Facebook desktop player
  and the Android Facebook app (the Facebook loading bar advances at 15, 60,
  then dismisses on the ready signal; a hang past 45 seconds trips the
  shell's failsafe and usually means the game module threw during boot,
  check the console).
- No wallet button, no daily rewards button, no Claudium store anywhere
  (`body.facebook-app` present in devtools confirms the gate is live).
- REST works from the fbsbx origin (Network tab: /api/realms 200 WITH an
  Access-Control-Allow-Origin response header; a CORS error here means the
  deploy-side origin allowances are missing, see Server prerequisites).
- WebSocket connects to the realm (Network tab: wss to crypticrealm.com).
- World assets stream: models/textures load after entering the world (a wall
  of CORS errors on /media/ means the static-asset ACAO header is missing).
- Landscape orientation is enforced on mobile.
- Expected fail-soft inside the container: streamed music/voice may be
  silent and some img-based UI art may not render (CSP, see the architecture
  section); sampled SFX must still play.
