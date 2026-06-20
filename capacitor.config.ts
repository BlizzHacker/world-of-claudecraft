import type { CapacitorConfig } from '@capacitor/cli';

// Cryptic Realm mobile shell (Android + iOS) via Capacitor. The game is a live
// online MMO, so the native app is a thin shell over the production realm rather
// than a bundled static build — players always get the current server build, and
// the same Authentik SSO / realm picker works inside the app.
//
// webDir points at a TINY shell (mobile-shell/, ~4KB: a splash that the live
// site loads over via server.url). The full Vite build (dist/, ~425MB of media/
// audio/models) must NOT be bundled — it's loaded from the live server at runtime,
// and a 294MB .aab is both wasteful and over Google Play's 200MB base-APK limit.
// For a genuine offline/dev build, point webDir at 'dist' and comment out `server`.
//
// Build (where Android SDK / Xcode are installed):
//   npm run build
//   npx cap sync
//   npx cap open android   # Android Studio -> Build > Generate Signed Bundle (.aab) for Play
//   npx cap open ios       # Xcode -> Archive for App Store
const config: CapacitorConfig = {
  appId: 'com.crypticrealm.game',
  appName: 'Cryptic Realm',
  webDir: 'mobile-shell',
  backgroundColor: '#050509',
  server: {
    // Live MMO: load the production realm. Switch to a stage host (e.g.
    // beta.crypticrealm.com) for a tester build, or remove for a bundled build.
    url: 'https://crypticrealm.com',
    cleartext: false,
    // Allow the app to navigate the realm subdomains chosen in the server picker.
    allowNavigation: [
      'crypticrealm.com',
      '*.crypticrealm.com',
      'authentik.moveweight.com',
    ],
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
};

export default config;
