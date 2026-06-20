#!/usr/bin/env bash
# Build the Cryptic Realm desktop app (Tauri) and stage it for a Steam depot
# upload. Run on the platform you want to ship (Windows for the win64 depot,
# macOS for mac, Linux for linux). Then upload with steamcmd (see end).
#
# Prereqs: Rust + Tauri toolchain (npm run tauri:build works), and for upload
# steamcmd + a Steamworks builder account with access to your App ID.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
CONTENT="$HERE/content"

echo "==> Building desktop app (npm run tauri:build)…"
( cd "$ROOT" && npm run tauri:build )

echo "==> Staging artifacts into $CONTENT…"
rm -rf "$CONTENT"; mkdir -p "$CONTENT"

# Collect the built binaries/installers regardless of platform. Tauri writes to
# src-tauri/target/release/ (raw binary) and .../release/bundle/ (installers).
BUNDLE="$ROOT/src-tauri/target/release"
if [ -d "$BUNDLE" ]; then
  # Raw executable (Steam typically ships the unpacked app, not the installer).
  find "$BUNDLE" -maxdepth 1 -type f \( -name 'cryptic-realm*' -o -name 'Cryptic Realm*' -o -name '*.exe' \) -exec cp -v {} "$CONTENT/" \; 2>/dev/null || true
  # macOS .app bundle
  find "$BUNDLE/bundle/macos" -maxdepth 1 -name '*.app' -exec cp -Rv {} "$CONTENT/" \; 2>/dev/null || true
fi

if [ -z "$(ls -A "$CONTENT" 2>/dev/null)" ]; then
  echo "!! Nothing staged — check that 'npm run tauri:build' produced a binary in $BUNDLE"
  exit 1
fi
echo "==> Staged:"; ls -la "$CONTENT"

cat <<'NOTE'

==> Next: upload to Steam (needs your Steamworks builder account + real App/Depot IDs)
    1. Edit steam/app_build.vdf + steam/depot_build.vdf — replace the 480/481
       placeholders with your real App ID and Depot ID.
    2. Run:
         steamcmd +login <builder_account> +run_app_build "<abs path>/steam/app_build.vdf" +quit
    3. In Steamworks, set the build live on your default branch and publish.

The desktop app is a thin shell that loads the live MMO (crypticrealm.com), so
each Steam build rarely changes — players always get the current server build.
NOTE
