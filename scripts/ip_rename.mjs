// Rename franchise-named assets to ORIGINAL slugs, in the live store AND the
// staging mirror, so no protected name ships in a URL. The models stay - the
// brief is "genre-inspired is fine, protected names are not" - so this renames
// rather than deletes, and legitimate genre words are deliberately untouched:
// a "demonic_warhammer" is a weapon type, a "dreadnought" is a ship class, and
// "minion"/"titan" are ordinary fantasy words.
import { readdirSync, statSync, renameSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const ROOTS = ['/opt/cr-realms-store', '/mnt/usb4/moveweight-assets/cr-realms-staging'];
const DRY = process.argv.includes('--dry');

// base slug (without the _id8 suffix) -> original replacement
const MAP = new Map([
  ['astartes_grim_future_wearing_a_cape', 'grim_legionary_caped'],
  ['eddie_from_iron_maiden_head', 'gaunt_revenant_skull'],
  ['realm_classic_eddie_form_iron_maiden', 'realm_classic_gaunt_revenant'],
  ['realm_classic_eddie_iron_maiden', 'realm_classic_gaunt_revenant'],
  ['realm_classic_eddie_iron_maiden_humanoid', 'realm_classic_gaunt_revenant_humanoid'],
  ['humanoid_with_four_powerful_arms_goro_from_morta', 'four_armed_arena_brute'],
  ['mike_tyson_head_with_his_tattoo_on_hes_left_eye', 'scarred_pugilist_head'],
  ['p90_acid_x', 'compact_bullpup_smg_acid'],
  ['realm_arcane_gandalf_staff_wizard_weaponsmili', 'realm_arcane_grey_pilgrim_staff_wizard'],
  ['realm_classic_arnold_schwarzenegger_conan', 'realm_classic_barbarian_champion'],
  ['realm_classic_arnold_schwarzenegger_mr_olympia', 'realm_classic_titan_strongman'],
  ['realm_classic_ogre_hulk_game_assets', 'realm_classic_ogre_bruiser'],
  ['realm_dominion_cyborg_batman_characters_science', 'realm_dominion_cyborg_night_vigilante'],
  ['realm_dominion_darth_vader_inspired_giger', 'realm_dominion_dark_helm_lord_biomech'],
  ['realm_dominion_storm_trooper_t_pose', 'realm_dominion_white_armor_trooper'],
  ['realm_fps_batman_overweight_halloween2025_', 'realm_fps_stout_night_vigilante_halloween'],
  ['realm_fps_kakashi_naruto_anime_pose', 'realm_fps_masked_shinobi_pose'],
  ['realm_fps_superman_venom_characters_fashio', 'realm_fps_symbiote_paragon'],
  ['realm_infernal_bart_simpson_characters', 'realm_infernal_spiky_haired_imp'],
  ['realm_infernal_hydralisk_long_serpentine_lower', 'realm_infernal_serpent_stalker'],
  ['the_hydralisk_has_a_long_serpentine_lower_body_a', 'serpent_stalker_carapace'],
  ['dreadnought_warhammer_the_object_features_a_robu', 'dreadnought_warmaul_heavy'],
]);

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
      const ext = f.slice(f.lastIndexOf('.'));
      const stem = f.slice(0, -ext.length);
      const m = /^(.*)_([0-9a-f]{8})$/.exec(stem);
      const base = m ? m[1] : stem;
      const suffix = m ? `_${m[2]}` : '';
      const repl = MAP.get(base);
      if (!repl) continue;
      const target = join(dirname(full), `${repl}${suffix}${ext}`);
      if (existsSync(target)) continue;
      moves.push([full, target]);
    }
  };
  walk(root);
}
for (const [from, to] of moves) {
  if (!DRY) renameSync(from, to);
}
writeFileSync('/opt/cryptic-realm/tmp/ip_rename_map.json', JSON.stringify(
  moves.map(([f, t]) => ({ from: basename(f), to: basename(t) })), null, 1));
console.log(DRY ? 'DRY RUN' : 'RENAMED', moves.length, 'files');
for (const [f, t] of moves.slice(0, 8)) console.log('  ', basename(f), '->', basename(t));
