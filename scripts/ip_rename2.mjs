// Second sweep: token-level replacement for the remaining franchise names, so
// variants ("eddie_iron_maiden_punk", "bruce_lee_iconic_yellow") are covered
// without enumerating every one. Legitimate genre words stay: a warhammer is a
// weapon, a dreadnought is a ship class - only the FRANCHISE tokens are swapped.
import { readdirSync, statSync, renameSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const ROOTS = ['/opt/cr-realms-store', '/mnt/usb4/moveweight-assets/cr-realms-staging'];
const DRY = process.argv.includes('--dry');

// Ordered: longer/more specific first so 'warhammer_40k' wins over 'warhammer'.
const TOKENS = [
  [/warhammer_40k|40k_warhammer/g, 'grim_future'],
  [/space_marine/g, 'void_legionary'],
  [/astartes|primaris|adeptus/g, 'grim_legionary'],
  [/orc_warhammer|warhammer_orc/g, 'orc_warhost'],
  [/warhammer_symbol/g, 'warhost_sigil'],
  [/warhammer_barbian|warhammer_barbarian/g, 'warhost_barbarian'],
  [/eddie_iron_maiden|iron_maiden_eddie|eddie_form_iron_maiden|eddie_from_iron_maiden/g, 'gaunt_revenant'],
  [/iron_maiden/g, 'gaunt_revenant'],
  [/toxic_crusader/g, 'blight_crusader'],
  [/he_man|grayskull|skeletor/g, 'thewn_champion'],
  [/bruce_lee/g, 'dragon_martialist'],
  [/mike_tyson|tyson/g, 'scarred_pugilist'],
  [/arnold_schwarzenegger|schwarzenegger/g, 'titan_strongman'],
  [/ozzy_osbourne|ozzy/g, 'shrouded_frontman'],
  [/cristiano_ronaldo|ronaldo/g, 'striker_athlete'],
  [/pamela_anderson|pamela/g, 'beach_sentinel'],
  [/superman/g, 'sky_paragon'],
  [/batman/g, 'night_vigilante'],
  [/spider_?man/g, 'arachnid_vigilante'],
  [/\bhulk\b/g, 'bruiser'],
  [/darth_vader|vader/g, 'dark_helm_lord'],
  [/storm_?trooper/g, 'white_armor_trooper'],
  [/sidious|palpatine/g, 'shadow_sovereign'],
  [/kakashi|naruto/g, 'masked_shinobi'],
  [/goro_from_mortal|goro_mortal|\bgoro\b/g, 'four_armed_brute'],
  [/freeza|frieza/g, 'tyrant_emperor'],
  [/krillin|dodoria|saiyan|goku|vegeta/g, 'martial_warrior'],
  [/hydralisk/g, 'serpent_stalker'],
  [/headcrab|half_life/g, 'skull_leech'],
  [/gandalf/g, 'grey_pilgrim'],
  [/game_thrones|targaryen/g, 'iron_throne_realm'],
  [/\bconan\b/g, 'barbarian_champion'],
  [/bart_simpson|simpsons?/g, 'spiky_haired_imp'],
  [/mario|luigi|bowser/g, 'plumber_hero'],
  [/pikachu|pokemon/g, 'spark_critter'],
  [/metallica/g, 'metal_band'],
  [/ecto_?1/g, 'spectre_wagon'],
  [/\bp90\b/g, 'compact_bullpup'],
  [/kriss_vector/g, 'recoil_smg'],
  [/despicable|gru_minion/g, 'yellow_helper'],
  // Final pass: 'warhammer' as a franchise TAG on a character (a goblin boss is
  // not a weapon) and the remaining hero/villain descriptors. 'demonic_warhammer'
  // in the melee bucket stays - there it is the weapon type.
  [/goblin_boss_head_warhammer/g, 'goblin_boss_head_warhost'],
  [/goblin_ork_boss_warhammer/g, 'goblin_ork_boss_warhost'],
  [/goblin_warhammer/g, 'goblin_warhost'],
  [/venom_superhero_villain/g, 'symbiote_villain'],
  [/demon_hulk/g, 'demon_bruiser'],
];

const moves = [];
for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  const walk = (d) => {
    let list; try { list = readdirSync(d); } catch { return; }
    for (const f of list) {
      const full = join(d, f);
      let st; try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) { if (f !== 'preweight-backup' && !f.startsWith('_')) walk(full); continue; }
      if (!f.endsWith('.glb') && !f.endsWith('.png')) continue;
      let out = f.toLowerCase();
      for (const [re, rep] of TOKENS) out = out.replace(re, rep);
      if (out === f.toLowerCase()) continue;
      const target = join(dirname(full), out);
      if (existsSync(target)) continue;
      moves.push([full, target]);
    }
  };
  walk(root);
}
for (const [from, to] of moves) if (!DRY) renameSync(from, to);
if (!DRY && moves.length) {
  appendFileSync('/opt/cryptic-realm/tmp/ip_rename_map.json.log',
    moves.map(([f, t]) => `${basename(f)} -> ${basename(t)}`).join('\n') + '\n');
}
console.log(DRY ? 'DRY' : 'RENAMED', moves.length);
for (const [f, t] of moves.slice(0, 10)) console.log('  ', basename(f), '->', basename(t));
