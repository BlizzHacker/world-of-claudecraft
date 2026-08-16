#!/bin/bash
# Each confirmed hit belongs to a FAMILY of generated variants sharing a prompt
# slug. Purging only the roster-visible member leaves the siblings in the pools,
# where the next gen_rosters run can pick them straight back onto a card. List
# every manifest key in each family.
cd /opt/cryptic-realm || exit 1
for fam in majin_buu predator_warrior white_armor_trooper action_figure_hero \
           extremely_muscular_female extremely_muscular_hero masked_shinobi \
           perfect_rig dragon_martialist gaunt_revenant_punk armored_guardian \
           void_legionary sky_paragon symbiote arachnid_vigilante night_vigilante \
           spiky_haired_imp serpent_stalker plumber_hero spark_critter \
           four_armed_brute tyrant_emperor martial_warrior grey_pilgrim \
           barbarian_champion titan_strongman scarred_pugilist beach_sentinel \
           striker_athlete shrouded_frontman skull_leech iron_throne_realm \
           dark_helm_lord shadow_sovereign blight_crusader thewn_champion; do
  keys=$(grep -oE "^  (realm_[a-z0-9_]*${fam}[a-z0-9_]*): \{" src/render/characters/manifest.generated.ts | sed 's/^  //; s/: {$//' | sort -u)
  [ -z "$keys" ] && continue
  echo "== $fam"
  while read -r k; do
    [ -z "$k" ] && continue
    inros=""
    grep -q "'$k'" src/sim/realms/rosters.generated.ts && inros="  <-- ROSTER"
    echo "   $k$inros"
  done <<< "$keys"
done
