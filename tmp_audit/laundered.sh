#!/bin/bash
cd /opt/cryptic-realm || exit 1
echo "=== rename log"
ls -la tmp/ip_rename_map.json.log 2>/dev/null && wc -l tmp/ip_rename_map.json.log
find / -name 'ip_rename_map.json.log' -not -path '/proc/*' 2>/dev/null | head -3
echo
echo "=== laundered tokens still present as BODY keys in the live manifest"
for t in grim_future void_legionary grim_legionary orc_warhost warhost_sigil warhost_barbarian \
         gaunt_revenant blight_crusader thewn_champion dragon_martialist scarred_pugilist \
         titan_strongman shrouded_frontman striker_athlete beach_sentinel sky_paragon \
         night_vigilante arachnid_vigilante dark_helm_lord white_armor_trooper shadow_sovereign \
         masked_shinobi four_armed_brute four_armed_arena_brute tyrant_emperor martial_warrior \
         serpent_stalker skull_leech grey_pilgrim iron_throne_realm barbarian_champion \
         spiky_haired_imp plumber_hero spark_critter metal_band spectre_wagon yellow_helper \
         goblin_boss_head_warhost goblin_ork_boss_warhost goblin_warhost symbiote_villain \
         symbiote_paragon demon_bruiser ogre_bruiser action_figure_hero; do
  hits=$(grep -oE "^  (realm_[a-z0-9_]*${t}[a-z0-9_]*): \{" src/render/characters/manifest.generated.ts | sed 's/^  //; s/: {$//' | sort -u)
  if [ -n "$hits" ]; then
    echo "-- $t"
    echo "$hits" | sed 's/^/     /'
  fi
done
