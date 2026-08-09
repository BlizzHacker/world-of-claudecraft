// Franchise-name scan over the LIVE store. Word-boundary tokens only: this game
// has a live token, so a protected NAME shipping in a url is the risk, and the
// generic fantasy words that merely resemble one ("minion ork", "titan") are not.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const STORE = '/opt/cr-realms-store';
// Each entry: [label, regex over the filename slug]
const RULES = [
  ['Simpsons', /(^|_)(bart|homer|simpsons?)(_|$)/],
  ['Warhammer 40K', /(^|_)(warhammer|40k|astartes|space_marine|adeptus|primaris)(_|$)/],
  ['Star Wars', /(^|_)(storm_?trooper|sidious|darth|vader|yoda|jedi|sith)(_|$)/],
  ['DC/Marvel', /(^|_)(superman|batman|spider_?man|venom|hulk|thanos|deadpool)(_|$)/],
  ['Dragon Ball', /(^|_)(freeza|frieza|krillin|dodoria|goku|vegeta|saiyan)(_|$)/],
  ['Nintendo/Sega', /(^|_)(mario|luigi|bowser|pikachu|pokemon|sonic_the)(_|$)/],
  ['Celebrity', /(^|_)(bruce_lee|ronaldo|pamela_anderson|ozzy|schwarzenegger|tyson)(_|$)/],
  ['Band/Brand', /(^|_)(metallica|ecto_?1|p90|kriss_vector)(_|$)/],
  ['Anime', /(^|_)(kakashi|naruto|goro|sub_zero|scorpion_mk)(_|$)/],
  ['Valve/Blizzard', /(^|_)(headcrab|half_life|diablo|kerrigan|hydralisk|zergling)(_|$)/],
  ['Tolkien/GoT', /(^|_)(gandalf|frodo|sauron|game_thrones|targaryen|conan)(_|$)/],
  ['Despicable Me', /(^|_)(despicable|gru_minion)(_|$)/],
  ['Other franchise', /(^|_)(he_man|grayskull|skeletor|toxic_crusader|iron_maiden|eddie_)(_|$)/],
];

const hits = [];
for (const realm of readdirSync(STORE)) {
  const dir = join(STORE, realm);
  try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
  if (realm.startsWith('_') || realm === 'review' || realm === 'shared') continue;
  const walk = (d, rel = '') => {
    for (const f of readdirSync(d)) {
      const full = join(d, f);
      let st; try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) { if (f !== 'preweight-backup') walk(full, join(rel, f)); continue; }
      if (!f.endsWith('.glb')) continue;
      const slug = f.replace(/\.glb$/, '').toLowerCase();
      for (const [label, re] of RULES) {
        if (re.test(slug)) { hits.push({ realm, rel: join(rel, f), label, slug }); break; }
      }
    }
  };
  walk(dir);
}
const byLabel = {};
for (const h of hits) (byLabel[h.label] ??= []).push(`${h.realm}/${h.rel}`);
console.log('TOTAL franchise-named files:', hits.length);
for (const [label, list] of Object.entries(byLabel).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${label}: ${list.length}`);
  for (const f of list.slice(0, 6)) console.log('   ', f);
  if (list.length > 6) console.log(`    ... +${list.length - 6} more`);
}
