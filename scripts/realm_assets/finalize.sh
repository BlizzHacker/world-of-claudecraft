#!/bin/bash
# Wait for the rig batch, then bring code + assets + all 9 public rings into one
# consistent state.
#
# Why this must be one pass: the category purge removed 639 bodies from the store
# while the deployed manifest still referenced them. Those keys now resolve to
# nothing, and a mob that hashes to one renders INVISIBLE rather than falling back.
# Regenerating from the store is what drops them from the pool.
set -u
cd /opt/cryptic-realm
SHA_FILE=/tmp/finalize_sha

echo "=== 1. wait for rig batch ==="
until ! systemctl is-active --quiet cr-rigbatch; do sleep 20; done
journalctl -u cr-rigbatch --no-pager -n 80 2>/dev/null | grep -E "DONE [0-9]+/" | tail -1

echo "=== 2. purge any newly staged category rejects ==="
node scripts/realm_assets/purge_categories.mjs --apply 2>&1 | head -2

echo "=== 3. publish staging -> store ==="
bash /tmp/deploy_glbs.sh 2>&1 | grep -A11 "store AFTER"

echo "=== 4. regenerate manifest FROM THE STORE (race-free, drops purged keys) ==="
node scripts/realm_assets/emit_manifest.mjs \
  --staging /mnt/usb4/moveweight-assets/cr-realms \
  --out src/render/characters/manifest.generated.ts 2>&1 | grep -E "visuals|POOL" -A11 | tail -14

echo "=== 5. verify ==="
node scripts/realm_assets/verify_store.mjs 2>&1 | tail -4

echo "=== 6. typecheck + build ==="
npx --no-install tsc --noEmit -p tsconfig.json 2>&1 | grep -E "characters/manifest|server/main" | head -3
timeout 1800 npm run build 2>&1 | tail -2
timeout 900 npm run build:server 2>&1 | tail -1

echo "=== 7. commit ==="
git add -- src/render/characters/manifest.generated.ts
git -c user.name=Claude -c user.email=noreply@anthropic.com commit -q \
  -m "feat(assets): regenerate after category purge

Regenerated from the STORE so the manifest lists only bodies that actually exist.
The category purge removed 639 sculpture/decor/animal bodies, leaving dead keys
in the deployed manifest - a mob hashing to one of those renders invisible rather
than falling back, so dropping them from the pool matters.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" 2>&1 | tail -1
git rev-parse HEAD | tee "$SHA_FILE"

echo "=== 8. promote all 9 rings ==="
SHA=$(cat "$SHA_FILE")
for r in infernal classic dominion arcane fps arcadevoid crypticrealm claudecraft exchange; do
  bash scripts/realm_assets/promote_ring.sh "$r" "$SHA" 2>&1 | grep -E "GLB|index|DONE|FAILED|ABORT"
done
echo "=== FINALIZE COMPLETE ==="
