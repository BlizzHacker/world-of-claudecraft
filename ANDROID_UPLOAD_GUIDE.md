# Uploading Cryptic Realm to Google Play

Your developer account: **wadeivy11@gmail.com** (already approved).

## What you have
- **Signed app bundle**: `C:\MoveWeight\cryptic-realm-v1-slim.aab` (the slim build — loads the live MMO, ~a few MB, under Play's 200 MB limit).
- **Upload keystore**: `C:\MoveWeight\cryptic-realm\cryptic-realm-upload.keystore`, alias `cryptic-realm`.
  - The store/key passwords are NOT in this repo. They live in the gitignored
    `android/keystore.properties` on the build machine, and with the two
    off-machine backups (Proxmox host `192.168.0.6:/root/cr-keystore-backup-20260822/`
    and LXC 171 `/root/cr-keystore-backup-20260822-*`, both root-only).
  - Backed up 2026-08-22, sha256 `15060dd0...de98b44` verified at both copies.
    Google signs every future update with this key; a lost keystore means a
    Play key reset request.

## One-time setup (first upload)

1. **Create the app** — Play Console → *All apps* → **Create app**.
   - App name: `Cryptic Realm`
   - Default language, App (not Game — or Game: Role Playing, your call), Free.
   - Accept the declarations.

2. **Complete the required "Set up your app" tasks** (left nav → *Dashboard*). Play won't let you publish until these are done:
   - **App access** — if login is required to see content, give them test credentials (a dedicated review account; keep the password out of this repo, it lives with the keystore backups). Or mark "All functionality available without restrictions" if the realm list is browsable pre-login.
   - **Ads** — declare whether the app shows ads (No, unless you add them).
   - **Content rating** — fill the questionnaire (it's a fantasy ARPG with mild combat violence → likely Teen / PEGI 12).
   - **Target audience** — 13+ (avoid the "designed for children" rules).
   - **Data safety** — declare what you collect. You collect: account (username), gameplay data. No selling data. (This form is required and Play scans for honesty.)
   - **Privacy policy URL** — you NEED one. Put a simple privacy page at e.g. `https://crypticrealm.com/privacy` or `moveweight.net/privacy` and paste the URL.
   - **Government apps / financial / health** — No.

3. **Store listing** (left nav → *Main store listing*):
   - Short description (≤80 chars), full description.
   - **Graphics**: app icon (512×512 PNG), feature graphic (1024×500), at least 2 phone screenshots (landscape, since it's a landscape game). Use screenshots from the running game.

## Uploading the bundle

4. **Pick a release track** (left nav → *Testing* → **Internal testing** first — fastest, no review wait, up to 100 testers). Later promote to *Production*.
   - Internal testing → **Create new release**.
   - **App bundles** → **Upload** → choose `C:\MoveWeight\cryptic-realm-v1-slim.aab`.
   - (First upload: Play will offer **Play App Signing** — accept it. Your upload keystore stays the upload key; Google manages the distribution key.)
   - Release name auto-fills (e.g. `2 (1.0.1)`). Add release notes.
   - **Save → Review release → Start rollout to Internal testing.**

5. **Add testers** — Internal testing → *Testers* → create an email list (add `wadeivy11@gmail.com` + anyone else) → copy the **opt-in URL**, open it on the phone, install via Play.

6. **Go to Production** when ready — *Production* → Create new release → reuse the same bundle → roll out. First production submission triggers a **review (hours to a few days)**.

## Rebuilding a new version (future updates)
```bash
cd C:\MoveWeight\cryptic-realm
# bump versionCode (must increase every upload) in android/app/build.gradle
npm run build           # only if you changed the shell (rare — app loads live site)
npx cap sync android
cd android
JAVA_HOME=C:/Java/jdk-17.0.19+10 ANDROID_HOME=C:/Android/sdk ./gradlew.bat bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```
Because the app loads `https://crypticrealm.com` live, **most game updates need NO new app upload** — you just deploy the site. Only ship a new .aab when you change the native shell, permissions, or version.

## Notes
- The app is a **thin shell over the live MMO** (`server.url = https://crypticrealm.com`). That's why it's small and why content updates don't require Play review.
- If Play flags "your app must support 64-bit" — Capacitor/AGP already build arm64; fine.
- If it flags target API level — `targetSdk 34` is current; fine.
