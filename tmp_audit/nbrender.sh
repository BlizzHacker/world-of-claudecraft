#!/bin/bash
# Render the unseen hash-neighbours, then sheet them TOGETHER with the already
# rendered members of the same neighbourhood - a variant is easiest to judge
# next to its confirmed sibling.
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
mkdir -p tmp_audit/nbout
node tmp_audit/phase_render1.mjs --list tmp_audit/neighbours.txt --out tmp_audit/nbout \
  --clips Idle --yaws front,hero --phases 0 --size 384 > tmp_audit/nb_render.log 2>&1
grep -cE '^OK' tmp_audit/nb_render.log
grep '^FAIL' tmp_audit/nb_render.log | head

S=tmp_audit/_nb; rm -rf $S; mkdir -p $S
i=0
add() {
  for base in tmp_audit/nbout tmp_audit/sweepout tmp_audit/lndout tmp_audit/ipout tmp_audit/aliasout; do
    if [ -f "$base/$1/Idle__p0__front.png" ]; then
      cp "$base/$1/Idle__p0__front.png" "$S/$(printf %02d $i)_$(echo "$1" | sed 's/^realm_//' | cut -c1-28).png"
      i=$((i+1)); return
    fi
  done
}
for k in realm_classic_steel_guardian_sciencetechnology_0193fb9e \
         realm_infernal_steel_guardian_robot_armor_0193fba1 \
         realm_classic_perfect_rig_symmetrical_01944c45 \
         realm_classic_gaunt_revenant_01956758 \
         dual_head_gargoyle_statute_01956759 \
         realm_classic_game_figure_satanic_beast_0195b9e2 \
         realm_classic_game_figure_satanic_beast_0195b9e8 \
         realm_classic_game_figure_satanic_beast_0195b9ea \
         realm_classic_toxin_warden_01961ade \
         realm_classic_goblin_warrior_characters_weapon_0196ca24; do
  add "$k"
done
node montage.mjs $S tmp_audit/nb_overview.png 4 340
