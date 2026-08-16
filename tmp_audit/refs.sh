#!/bin/bash
# Every place the four confirmed-IP keys are referenced. A manifest entry that
# no roster names is still reachable through the visual pools, so "not in a
# roster" is not the same as "not in the game".
cd /opt/cryptic-realm || exit 1
for k in realm_infernal_warrior_damned_characters_0196ca26 \
         realm_infernal_warrior_shadows_characters_01963a09 \
         realm_dominion_void_legionary_characters_weaponsm_0193fb93 \
         realm_fps_action_figure_hero_toys_0194183a; do
  echo "=== $k"
  grep -rn "$k" src/ scripts/ config/ server/ 2>/dev/null | grep -v '^tmp_audit' | head -20
  echo "    store: $(find /opt/cr-realms-store -name "$k.glb" | head -3)"
done
echo
echo "=== how quarantine was done before (look for a quarantine dir/script)"
ls -d /opt/cr-realms-store/review 2>/dev/null && ls /opt/cr-realms-store/review | head -20
find /opt/cryptic-realm/scripts -iname '*quarant*' -o -iname '*sanit*' 2>/dev/null | head
