#!/bin/bash
set -e
cd /opt/cryptic-realm
echo "=== purge ip-brand (trademarked logos painted into the texture)"
node scripts/ip_purge.mjs --bucket ip-brand \
  realm_classic_average_man_game_assets_01940d81 \
  realm_classic_average_man_pose_game_01940d81
echo "=== purge ip-likeness"
node scripts/ip_purge.mjs --bucket ip-likeness \
  realm_dominion_determined_chemist_halloween2025_019a18fd
echo "=== regenerate"
node scripts/realm_assets/gen_rosters.mjs
node tmp_audit/roster_check.mjs 2>/dev/null | head -1
node scripts/check_dangling.mjs 2>&1 | tail -1
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS" || true
