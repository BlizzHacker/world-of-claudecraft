# meta/: Meta Quest (Horizon Store) PWA packaging config

The Quest lane mirrors the Xbox lane's shape (a thin shell over the live site,
`docs/xbox-store-release.md`) but the package is a PWA APK built with Meta's
bubblewrap fork, not an MSIX. Runbook + strategy + citations:
`docs/meta-quest-release.md`. Validate and stage with
`node scripts/build_meta_pwa.mjs` (no npm alias yet, see the runbook's
follow-ups: `tests/fenbridge_town_assets.test.ts` fingerprints package.json).

## Files
- `twa-manifest.json`: the bubblewrap project config (the file
  `bubblewrap init --manifest=https://crypticrealm.com/manifest.webmanifest
  --metaquest` would generate, checked in so builds are reproducible).
  `packageId` (`com.crypticrealm.quest`) and the signing key are the store
  identity: NEVER change either once a build has been uploaded.
  `appVersionName`/`appVersionCode` sync from the repo version
  (`androidVersionCode` in `scripts/lib/meta_pwa_validate.mjs`);
  `scripts/build_meta_pwa.mjs` warns on drift.
- `assetlinks.template.json`: Digital Asset Links template. After the keystore
  exists, fill the SHA-256 fingerprint and serve it at
  `https://crypticrealm.com/.well-known/assetlinks.json` (add it under
  `public/.well-known/`), and on every origin listed in `additionalOrigins`.
  A 2D PWA falls back to a custom-tab bar when verification fails; keep it
  green anyway so the immersive upgrade path stays open (an immersive PWA
  refuses to launch on a failed verification).
- `keys/` (gitignored, never committed): the Android keystore
  `quest-release.keystore`. Root invariant: never commit secrets.

## Never
- Never commit a keystore or its passwords here.
- Never change `packageId` or re-key the signing certificate after upload.
- Never point `webManifestUrl` at a staging host in a committed change.
