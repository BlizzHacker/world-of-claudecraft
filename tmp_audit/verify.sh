#!/bin/bash
cd /opt/cryptic-realm || exit 1
echo "=== roster resolution"
node tmp_audit/roster_check.mjs 2>/dev/null | head -1
echo "=== dangling (must be 0)"
node scripts/check_dangling.mjs 2>&1 | tail -1
echo "=== typecheck errors (must be 79)"
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"
echo "=== quarantined this pass"
echo "  ip-likeness: $(ls /mnt/usb4/moveweight-assets/cr-realms-quarantine/ip-likeness | wc -l) files total"
echo "  ip-brand:    $(ls /mnt/usb4/moveweight-assets/cr-realms-quarantine/ip-brand | wc -l) files total"
echo "=== no purged key survives anywhere in src/"
for k in $(cat tmp_audit/purge_likeness.txt tmp_audit/purge_brand.txt tmp_audit/purge2.txt 2>/dev/null) \
         realm_classic_average_man_game_assets_01940d81 \
         realm_classic_average_man_pose_game_01940d81 \
         realm_dominion_determined_chemist_halloween2025_019a18fd \
         realm_classic_blue_power_ranger_01943943 \
         realm_classic_blue_power_ranger_characters_0194371d; do
  hits=$(grep -rl "$k" src/ 2>/dev/null | head -3)
  [ -n "$hits" ] && echo "  STILL REFERENCED $k -> $hits"
done
echo "  (no output above = clean)"
echo "=== git status"
git status --porcelain src/ scripts/realm_assets/bodies_geometry.generated.json
