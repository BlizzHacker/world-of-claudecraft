#!/bin/bash
# Render the family siblings not yet seen, including families whose ORIGINAL
# prompt named a franchise (spiky_haired_imp was bart_simpson, serpent_stalker
# was hydralisk, barbarian_champion/titan_strongman were schwarzenegger).
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
: > tmp_audit/fam.txt
for k in realm_dominion_white_armor_trooper_01942e95 \
         realm_dominion_white_armor_trooper_01942e99 \
         realm_dominion_white_armor_trooper_01942e9e \
         realm_fps_action_figure_hero_characters_01944c02 \
         realm_fps_action_figure_hero_characters_01944c21 \
         realm_fps_extremely_muscular_female_hero_01947d05 \
         realm_fps_extremely_muscular_female_hero_01947f73 \
         realm_classic_perfect_rig_symmetrical_0194487b \
         realm_classic_perfect_rig_symmetrical_01944c1e \
         realm_classic_perfect_rig_symmetrical_01945b0c \
         realm_classic_perfect_rig_symmetrical_019462a7 \
         realm_infernal_spiky_haired_imp_01947c8b \
         realm_infernal_serpent_stalker_019639f2 \
         realm_classic_barbarian_champion_019548ae \
         realm_classic_titan_strongman_019548a7; do
  f=$(find /opt/cr-realms-store -name "$k.glb" | head -1)
  [ -n "$f" ] && echo "$f" >> tmp_audit/fam.txt || echo "MISSING $k"
done
echo "to render: $(wc -l < tmp_audit/fam.txt)"
mkdir -p tmp_audit/famout
node tmp_audit/phase_render1.mjs --list tmp_audit/fam.txt --out tmp_audit/famout \
  --clips Idle --yaws front,hero --phases 0 --size 384 > tmp_audit/fam_render.log 2>&1
echo "OK: $(grep -cE '^OK' tmp_audit/fam_render.log)"
S=tmp_audit/_fam; rm -rf $S; mkdir -p $S
i=0
for d in tmp_audit/famout/*/; do
  k=$(basename "$d")
  [ -f "$d/Idle__p0__front.png" ] || continue
  cp "$d/Idle__p0__front.png" "$S/$(printf %02d $i)_$(echo "$k" | sed 's/^realm_//' | cut -c1-30).png"
  i=$((i+1))
done
node montage.mjs $S tmp_audit/fam_overview.png 4 340
