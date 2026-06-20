# Submitting Cryptic Realm to the stores

All three desktop/mobile targets are **thin shells** that load the live MMO at
crypticrealm.com — so the "game" is always the current server build; the store
apps just wrap it. Project scaffolding is ready; the steps below that need YOUR
developer accounts / signing keys can only be done by you.

## Android — Google Play  (project: `android/`, ready)
1. Generate the upload keystore — see `docs/RELEASE_KEYSTORE.md` (one-time; save
   the passwords; back up the .keystore off-machine).
2. Put the passwords in `android/keystore.properties` (gitignored).
3. `npm run cap:android` → Android Studio → Build > Generate Signed Bundle (.aab).
4. Google Play Console (your account, $25 one-time): create app
   `com.crypticrealm.game`, fill listing (icon, screenshots, privacy policy URL),
   upload the .aab to Internal testing → Production.
   Status: project + signing config ready; **blocked only on the keystore + your Play account.**

## iOS — App Store  (project: `ios/`, ready)
1. On a Mac with Xcode: `npm run cap:ios` → opens `ios/App/App.xcworkspace`.
2. `cd ios/App && pod install` (CocoaPods) if Xcode prompts.
3. Set your Apple Developer Team in Signing & Capabilities, then Product > Archive
   → Distribute App → App Store Connect.
4. App Store Connect (Apple Developer Program, $99/yr): create the app, fill
   listing, submit for review.
   Status: Xcode project generated, bundle id `com.crypticrealm.game`. **Needs a
   Mac + Apple Developer account.**

## Steam  (config: `steam/`, ready)
1. Steam Direct: https://partner.steamgames.com — pay $100, complete identity +
   tax verification. Create a new app → note its **App ID** and add a **Depot**
   → note the **Depot ID**.
2. Edit `steam/app_build.vdf` + `steam/depot_build.vdf`: replace the `480`/`481`
   placeholders with your real App ID / Depot ID.
3. Build + stage: `bash steam/build-steam.sh` (run on Windows for the win64
   depot; needs the Rust/Tauri toolchain — `npm run tauri:build`).
4. Upload: `steamcmd +login <builder> +run_app_build <abs>/steam/app_build.vdf +quit`,
   then set the build live in Steamworks and publish the store page.
   Status: depot/build scripts + Tauri desktop config ready. **Needs Steam Direct
   signup + App/Depot IDs + the Rust toolchain to build.**

## What I can't do (and why)
Publishing is gated on accounts and signing keys that must stay yours: the Play
keystore + Play Console, the Apple Developer account + a Mac, and the Steam
partner account. I generated all the project scaffolding and scripts so each
"build + upload" is a short, documented step on your side.
