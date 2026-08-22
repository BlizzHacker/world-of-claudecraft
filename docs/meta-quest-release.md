# Meta Quest release pack

Cryptic Realm ships to Meta Quest as a **2D panel PWA of the live site**
(`https://crypticrealm.com/`) on the Meta Horizon Store, mirroring the Xbox
hosted-web-app lane (`docs/xbox-store-release.md`): the package is a thin
store shell, players always get the current server build, and the same
Authentik SSO and realm picker work inside it. WebXR groundwork ships in the
same change (inert behind `?xr=1`, see below) so the listing can later be
upgraded to an immersive app without changing its store identity.

## Strategy and why (verified against live docs, 2026)

- **The Horizon Store accepts packaged PWAs.** Meta's supported path wraps a
  web app served over HTTPS with a valid web app manifest into an Android APK
  using Meta's bubblewrap fork (`@meta-quest/bubblewrap-cli`,
  `bubblewrap init --manifest=<url> --metaquest`), choosing an app mode of
  `2D` (panel) or `immersive` (WebXR launch) at init time.
  Source: https://developers.meta.com/horizon/documentation/web/pwa-packaging/
- **2D panel PWAs are a documented app category** (single-instance standalone
  panels; out-of-scope navigation falls back to a custom tab bar;
  `additional_trusted_origins` plus per-origin
  `/.well-known/assetlinks.json` keeps extra origins in-scope).
  Source: https://developers.meta.com/horizon/documentation/web/pwa-2d-support/
- **App Lab is gone; everything lands in the one Meta Horizon Store**
  (merged 2024-08-05, with optional Early Access labeling; apps must meet
  technical/content/privacy bars, not a curation-taste bar).
  Sources: https://www.uploadvr.com/quest-app-lab-merged-into-meta-horizon-store/
  and https://roadtovr.com/meta-elevates-indie-app-lab-main-store/
- **Organization verification is required before anything publishes** (verify
  an admin's identity or the business, per developer org).
  Sources: https://developers.meta.com/horizon/policy/developer-verification/
  and https://developers.meta.com/horizon/resources/publish-organization-verification/
- **2D-panel-first, WebXR-later is explicitly supported.** Meta's WebXR PWA
  guidance is additive: an immersive PWA is the same package with the app mode
  set to immersive and a `requestSession('immersive-vr')` call from user
  activation (the app-icon launch counts). Testing the hosted app in Quest
  Browser first is the documented flow, so the panel app and the progressive
  WebXR entry ladder cleanly.
  Sources: https://developers.meta.com/horizon/documentation/web/pwa-webxr/
  and https://developers.meta.com/horizon/documentation/web/pwa-overview-gs/
- **Three.js side:** an immersive session needs `renderer.xr.enabled`, a
  session from `navigator.xr.requestSession('immersive-vr', ...)` handed to
  `renderer.xr.setSession`, a reference space (`local-floor` for standing
  play), and the frame loop driven by `renderer.setAnimationLoop` instead of
  `window.requestAnimationFrame` (the session's layer framebuffer is only
  writable inside session animation frames).
  Source: https://threejs.org/manual/en/webxr-basics.html

## What is in the repo

- `meta/twa-manifest.json`: the checked-in bubblewrap project config
  (`packageId com.crypticrealm.quest`, landscape fullscreen panel over
  `crypticrealm.com`). Identity rules in `meta/CLAUDE.md`.
- `meta/assetlinks.template.json`: Digital Asset Links template; becomes
  `public/.well-known/assetlinks.json` once the signing key exists.
- `scripts/build_meta_pwa.mjs` (pure rules in
  `scripts/lib/meta_pwa_validate.mjs`, pinned by
  `tests/meta_pwa_validate.test.ts`): validates
  `public/manifest.webmanifest` + `meta/twa-manifest.json` against the store
  requirements above and stages inputs under `release/meta-quest/stage/`.
  Run it with `node scripts/build_meta_pwa.mjs`. There is deliberately no
  `meta:build` npm alias yet: `tests/fenbridge_town_assets.test.ts`
  fingerprints all of `package.json` as a shipping-GLB input, so a script
  entry demands the town re-export; adding the alias is the same follow-up
  the gate scripts carry (`scripts/CLAUDE.md`).
- WebXR groundwork, inert by default: `src/render/xr_session_core.ts` (pure:
  the `?xr=1` gate, session init, entry visibility; registered in
  `RENDER_PURE_CORES`) + `src/render/xr_session.ts` (thin: `vrSupported()`,
  `enterVr()` attaching the session to `renderer.xr`) +
  `src/ui/cryptic/vr_entry.ts` (the hidden Enter VR button `main.ts` mounts
  in `startGame`, shown only when the gate is on AND the browser reports
  immersive-vr support). Tests: `tests/xr_session_core.test.ts`,
  `tests/xr_session.test.ts`.

## Build and package (dev box with JDK 17 + Android SDK)

1. `node scripts/build_meta_pwa.mjs`: must pass with zero errors; read the
   warnings, they are the store-quality backlog (manifest `id`, maskable
   icon, `additional_trusted_origins`).
2. `npm install -g @meta-quest/bubblewrap-cli` (Meta's fork; first run can
   install its own JDK/SDK).
3. In a scratch working dir, copy `meta/twa-manifest.json` in and run
   `bubblewrap build`. First build: generate the keystore it asks for, store
   it at `meta/keys/quest-release.keystore` (gitignored; never commit it or
   its passwords), and record the passwords in the ops vault.
4. Extract the SHA-256 with `keytool -list -v -keystore ...`, fill
   `meta/assetlinks.template.json`, commit it as
   `public/.well-known/assetlinks.json` so the live site serves it. Repeat on
   every origin named in `additionalOrigins` (Authentik) or accept the
   custom-tab bar there.
5. Sideload test: enable developer mode on the headset, `adb install
   app-release-signed.apk`, launch from the library (Unknown Sources).
   Expected: landscape panel of the live game, pointer-driven UI, login works.
6. Upload: Developer Dashboard build upload on the app's Alpha channel, or
   `ovr-platform-util upload-quest-build --app-id <APP_ID> --apk
   app-release-signed.apk --channel ALPHA` with a Partner token.

## Wade's account-side steps (in order)

1. Create or reuse the Meta Horizon developer organization at
   https://developers.meta.com/horizon/ (Developer Dashboard). One-time.
2. Complete **organization verification** (admin ID or business verification,
   plus 2FA). Nothing publishes until this clears.
3. Create the app in Developer Dashboard: platform **Meta Horizon OS**,
   name Cryptic Realm. Record the **App ID** (needed for uploads, and for
   Horizon billing if IAP ever lands).
4. Complete the app metadata: store listing copy, screenshots taken on the
   headset panel, 512px+ icon set, privacy policy URL
   (`https://crypticrealm.com/privacy.html`) and data-use disclosures,
   content rating questionnaire (IARC-style; answer from SHIPPED content,
   the RomM lesson: one wrong checkbox re-rates the app).
5. Upload the signed APK to the **Alpha** release channel, add tester
   accounts, verify on-device via the channel.
6. Optionally label the listing **Early Access** (the App Lab successor
   lane), then submit for review. Keep `crypticrealm.com` stable during
   review week (same rule as the Xbox lane: hosted apps are certified
   against the live site).

## The 2D-panel-now / immersive-later ladder

1. **Now:** 2D panel PWA (this pack). No game changes; the site already
   plays with pointer + keyboard and has PWA manifest/icons.
2. **Quest Browser VR preview:** with `?xr=1`, capable browsers show the
   hidden Enter VR button; `enterVr()` attaches an immersive-vr session to
   the renderer. Follow-up before this is player-visible (tracked here, kept
   out of this change on purpose): hand the frame loop to
   `renderer.setAnimationLoop` while a session is live (`main.ts` drives
   `window.requestAnimationFrame` today, so the headset gets no frames), add
   an in-session camera rig + input mapping (WebXR controllers surface as
   `XRInputSource.gamepad`, not the navigator gamepad list), then drop the
   `?xr=1` gate to a setting.
3. **Later:** repackage with bubblewrap app mode `immersive` (same
   packageId, same signing key, so the SAME store listing upgrades) and call
   `requestSession` from the launch activation per the WebXR PWA doc.
   Immersive packages hard-require green Digital Asset Links.

## Input expectations (2D panel)

- Quest controllers act as a **laser pointer** on the panel: clicks and drags
  arrive as pointer events, so the HTML UI and click-to-move surfaces work
  unmodified. Focused inputs summon the system on-screen keyboard.
- The existing gamepad stack (`src/game/gamepad*.ts`) does NOT see Touch
  controllers in panel mode (they are not navigator gamepads there), but a
  paired Bluetooth gamepad or mouse/keyboard drives it exactly as on Xbox
  Edge. Do not advertise pad support in the listing copy beyond that.
- WASD/mouselook expectations carry over from the desktop web client;
  verify chat, vendor, and login flows with pointer-only input during the
  sideload pass.

## Policy flags (resolve BEFORE submission)

- **Platform IAP is mandatory for digital goods**: "if your app has in-app
  purchases ... distributed through any Meta Platforms Technologies
  distribution channel ... you must use the Platform In-App Purchases"
  (https://developers.meta.com/horizon/policy/app-policies/). PWAs get this
  via the Digital Goods API + Horizon billing (enabled per-app with the App
  ID). Any real-money purchase surface reachable in the panel is a violation
  until it is either removed there or ported to Horizon billing.
- **Tradeable real-world-value items are restricted**: randomized-item
  policy already bans loot-box items with "real-world money value or ...
  tradeable or transferrable" characteristics; a wallet-linked token economy
  sits squarely in review-risk territory even outside loot boxes.
- **Wording rule for any $CR surface that stays visible**: keep the exact
  "Tip $CR" framing (`CR_TIP_LABEL` in `src/ui/cryptic/branding.ts` and the
  `dashboard_chrome.ts` donate CTA): a voluntary tip to a posted address,
  never a sale, a price, or a "buy $CR" call to action. The app chrome never
  gains a crypto purchase flow of its own; anything that reads as buying a
  digital good in-app triggers the Platform IAP policy above.
- **Recommendation: reuse the existing store hide-gate.** Mirror the mobile
  lane (`docs/mobile-store-release.md` Store Review Notes: first store
  release hides Donate and token contract CTAs in native builds) and the
  Microsoft lane's wallet-disclosure holds (`docs/xbox-store-release.md`):
  hide $CR/wallet/donate surfaces (`src/ui/cryptic/wallet_panel.ts`,
  `src/ui/cryptic/branding.ts` gates, `src/ui/mobile_wallet_launcher.ts`)
  when running inside the Quest package. Detection: the packaged panel is
  `display-mode: standalone` under an OculusBrowser/MetaQuest user agent;
  wire that into the same branding gate the other stores use. This gating is
  a REQUIRED follow-up before submission, not shipped in this change.
- **Age rating**: answer the content questionnaire from shipped content only
  and re-check the result before submitting (the ADULTS ONLY misfire on the
  Xbox RomM submission came from one checkbox).

## Follow-ups (tracked, in dependency order)

1. Manifest polish: add `id`, a maskable 512px icon, and
   `additional_trusted_origins` for the Authentik host to
   `public/manifest.webmanifest` (the validator warns on each today).
2. Keystore + assetlinks: steps 3 to 4 of Build and package, then commit
   `public/.well-known/assetlinks.json`.
3. Quest hide-gate for $CR surfaces (Policy flags above).
4. WebXR frame-loop handoff + camera rig + XR input mapping (ladder step 2).
5. `meta:build` npm alias once the `package.json` fingerprint follow-up in
   `scripts/CLAUDE.md` (narrow to dependency fields, or re-export the
   Fenbridge set) lands. Note: `tests/fenbridge_town_assets.test.ts` is
   already red on this branch's base for the same fingerprint reason.
6. Horizon billing via the Digital Goods API if any IAP should exist on
   Quest instead of being hidden.
