#!/bin/bash
# Bring code + assets + all 9 public rings into one consistent state.
#
# Classification tightened repeatedly while batches ran (category veto, anatomy
# fragments, weapon-only assets), so staging and the store both hold bodies rigged
# under superseded rules. reconcile keeps exactly what the CURRENT classifier
# approves; regenerating from the STORE afterwards guarantees the manifest lists
# only bodies that exist — a key with no file renders an INVISIBLE mob, not a
# fallback, so this ordering matters.
set -u
cd /opt/cryptic-realm

echo "=== 1. reconcile staging + store to current rules ==="
node scripts/realm_assets/reconcile.mjs --entries /tmp/entries4.json --apply 2>&1 | head -4

echo "=== 2. publish staging -> store ==="
bash /tmp/deploy_glbs.sh 2>&1 | grep -A11 "store AFTER"

echo "=== 3. regenerate manifest FROM THE STORE ==="
node scripts/realm_assets/emit_manifest.mjs \
  --staging /mnt/usb4/moveweight-assets/cr-realms \
  --out src/render/characters/manifest.generated.ts 2>&1 | grep -E "visuals|POOL" -A11 | tail -14

echo "=== 4. verify every key resolves ==="
node scripts/realm_assets/verify_store.mjs 2>&1 | tail -4

echo "=== 5. typecheck + build ==="
npx --no-install tsc --noEmit -p tsconfig.json 2>&1 | grep -E "characters/manifest|server/main" | head -3
timeout 1800 npm run build 2>&1 | tail -2
timeout 900 npm run build:server 2>&1 | tail -1

echo "=== 6. commit ==="
git add -- src/render/characters/manifest.generated.ts scripts/realm_assets/
git -c user.name=Claude -c user.email=noreply@anthropic.com commit -q -F /tmp/msg2.txt 2>&1 | tail -1
SHA=$(git rev-parse HEAD)
echo "sha=$SHA"

echo "=== 7. promote all 9 rings ==="
for r in infernal classic dominion arcane fps arcadevoid crypticrealm claudecraft exchange; do
  bash scripts/realm_assets/promote_ring.sh "$r" "$SHA" 2>&1 | grep -E "GLB|index|DONE|FAILED|ABORT"
done
echo "=== FINALIZE COMPLETE ==="
