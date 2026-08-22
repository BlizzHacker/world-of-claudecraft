import type { CapacitorConfig } from '@capacitor/cli';

// Cryptic Realm mobile shell (Android + iOS) via Capacitor. The game is a live
// online MMO, so the native app is a thin shell over the production realm rather
// than a bundled static build: players always get the current server build, and
// the same Authentik SSO / realm picker works inside the app.
//
// webDir points at a TINY shell (mobile-shell/, about 1.5 KB: a splash that the
// live site loads over via server.url). The full Vite build (dist/) must NOT be
// bundled. Nothing trims assets for a native build (docs/ota-updates.md: a bundle
// is the WHOLE dist, about 876 MB at v0.32.1 and larger now that the realm GLBs
// land in public/cr-realms), and Google Play caps a base module at 200 MB of
// compressed download. A dist-bundling build is therefore not uploadable at all.
// For a genuine offline or dev build, point webDir at 'dist' and drop `server`.
//
// Build (where the Android SDK and a JDK 21 are installed):
//   npx cap sync android
//   cd android && ./gradlew.bat bundlePlayRelease
const config: CapacitorConfig = {
  appId: 'com.crypticrealm',
  appName: 'Cryptic Realm',
  webDir: 'mobile-shell',
  backgroundColor: '#050509',
  server: {
    // Live MMO: load the production realm. Switch to a stage host (e.g.
    // beta.crypticrealm.com) for a tester build, or remove for a bundled build.
    url: 'https://crypticrealm.com',
    cleartext: false,
    // Allow the app to navigate the realm subdomains chosen in the server picker.
    allowNavigation: ['crypticrealm.com', '*.crypticrealm.com', 'authentik.moveweight.com'],
  },
  android: {
    // Landscape ARPG; the manifest already requests fullscreen landscape.
    allowMixedContent: false,
    backgroundColor: '#050509',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#050509',
  },
  plugins: {
    // Self-hosted OTA (docs/ota-updates.md) is for a bundled build, where the app
    // ships dist inside the package. This shell loads the live site instead, so an
    // OTA bundle would be a redundant multi-hundred-MB background download on top
    // of content the player already streams. autoUpdate stays off and no updateUrl
    // is set, which leaves the installed plugin inert; statsUrl '' keeps telemetry
    // off either way. Re-enable both together with a bundled webDir, never alone.
    CapacitorUpdater: {
      autoUpdate: false,
      statsUrl: '',
    },
  },
};

export default config;
