#!/bin/bash
# Render the alias halves the hash-keyed pass skipped, and note which of them the
# roster sweep already covered.
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
cat > tmp_audit/alias.txt <<'EOF'
/opt/cr-realms-store/fps/realm_fps_size_executioner_no_shirt_0193fba7.glb
/opt/cr-realms-store/classic/realm_classic_pirate_orc_characters_019450ce.glb
/opt/cr-realms-store/infernal/buildings/gaunt_revenant_the_object_features_a_hum_019450ce.glb
/opt/cr-realms-store/infernal/realm_infernal_demon_lord_pose_no_0194c860.glb
/opt/cr-realms-store/classic/realm_classic_scarred_pugilist_0195b9e3.glb
EOF
echo "=== already covered by the roster sweep:"
while read -r f; do
  k=$(basename "$f" .glb)
  [ -d "tmp_audit/sweepout/$k" ] && echo "   $k"
done < tmp_audit/alias.txt

mkdir -p tmp_audit/aliasout
node tmp_audit/phase_render1.mjs --list tmp_audit/alias.txt --out tmp_audit/aliasout \
  --clips Idle --yaws front,hero --phases 0 --size 384 > tmp_audit/alias_render.log 2>&1
grep -cE '^(OK|SKIP)' tmp_audit/alias_render.log

S=tmp_audit/_alias; rm -rf $S; mkdir -p $S
i=0
for d in tmp_audit/aliasout/*/; do
  k=$(basename "$d")
  [ -f "$d/Idle__p0__front.png" ] || continue
  cp "$d/Idle__p0__front.png" "$S/$(printf %02d $i)_$(echo "$k" | sed 's/^realm_//' | cut -c1-30).png"
  i=$((i+1))
done
node montage.mjs $S tmp_audit/alias_overview.png 3 380
