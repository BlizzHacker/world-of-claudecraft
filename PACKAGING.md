# Cryptic Realm — App Packaging (Mobile + Desktop + Steam)

Cryptic Realm is a Vite/TypeScript/WebGL **online MMO**. The store apps are thin
native shells that load the live realm (`https://crypticrealm.com`) — no rewrite,
no per-build asset bundling. Players in the app always get the current server
build and the same Authentik SSO + realm picker.

- **Mobile (Android + iOS, Google Play / App Store):** Capacitor → `capacitor.config.ts`
- **Desktop + Steam (Windows/macOS/Linux):** Tauri → `src-tauri/`

The scaffolding is committed; the actual store builds run on a machine with the
platform SDKs (Android Studio, Xcode, Rust toolchain). These are documented below.

## One-time install (on the build machine)
```bash
npm install                      # picks up the @capacitor/* + @tauri-apps/cli devDeps
npx cap add android              # creates android/ (needs Android Studio + SDK)
npx cap add ios                  # creates ios/ (needs Xcode, macOS only)
cargo install create-tauri-app   # or: npm i -g @tauri-apps/cli ; Rust via rustup
npx tauri icon public/cryptic-realm-logo-512.png   # generates src-tauri/icons/*
```

## Android → Google Play  (developer: wadeivy11@gmail.com, approved)
```bash
npm run cap:android              # build web + cap sync + open Android Studio
```
In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**.
- First time: create an upload keystore (keep it safe — Play signs with it forever).
- Upload the `.aab` to Play Console → Cryptic Realm → Production (or Internal testing first).
- App id: `com.crypticrealm.game`. Landscape, fullscreen (set in manifest + config).
- INTERNET permission is auto-added by Capacitor (the app loads the live server).

## iOS → App Store  (macOS + Xcode)
```bash
npm run cap:ios                  # build web + cap sync + open Xcode
```
In Xcode: set the Team/signing, then **Product → Archive → Distribute App**.
Bundle id `com.crypticrealm.game`. Requires an Apple Developer account.

## Desktop + Steam (Tauri)
```bash
npm run tauri:build              # builds web (beforeBuildCommand) then native bundles
```
Outputs (per `src-tauri/tauri.conf.json` bundle.targets):
- **Windows:** NSIS installer (`src-tauri/target/release/bundle/nsis/*.exe`) — the Steam build.
- **macOS:** `.app` + `.dmg`.
- **Linux:** AppImage + `.deb`.

### Steam submission
1. Build the Windows release with `npm run tauri:build`.
2. In Steamworks: create the app, set up depots, point the depot at the built
   Windows binary + its WebView2 dependency (Tauri uses the OS WebView2 runtime;
   bundle the Evergreen installer or require it).
3. The app loads `https://crypticrealm.com` — Steam users get the live MMO. A
   Steam overlay works; controller support is already in-game (gamepad.ts).

## Notes
- **Online-first:** `server.url` (Capacitor) and `app.windows[0].url` (Tauri) point
  at production. For a tester app, point them at `beta.crypticrealm.com`.
- **SSO:** `allowNavigation` whitelists `authentik.moveweight.com` so the OAuth
  redirect completes inside the app shell.
- **Offline/bundled variant:** remove the `server`/`url` keys and the shells will
  load the bundled `dist/` instead (single-player only; the MMO needs the server).
- `android/`, `ios/`, and `src-tauri/target/` are build artifacts — gitignore them.
