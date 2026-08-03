// The IP rename moved files the review gallery links to. Repoint every row whose
// GLB no longer exists onto its renamed sibling (same id8 suffix, same folder),
// and scrub franchise wording out of the display names while we are here.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const STORE = '/opt/cr-realms-store';
const REVIEW = join(STORE, 'review');
const NAME_SCRUB = [
  [/bruce lee/gi, 'Dragon Martialist'], [/mike tyson/gi, 'Scarred Pugilist'],
  [/arnold schwarzenegger/gi, 'Titan Strongman'], [/iron maiden/gi, 'Gaunt Revenant'],
  [/eddie/gi, 'Gaunt Revenant'], [/warhammer 40k|40k/gi, 'Grim Future'],
  [/astartes|space marine|primaris/gi, 'Void Legionary'], [/superman/gi, 'Sky Paragon'],
  [/batman/gi, 'Night Vigilante'], [/darth vader|vader/gi, 'Dark Helm Lord'],
  [/storm ?trooper/gi, 'White Armor Trooper'], [/kakashi|naruto/gi, 'Masked Shinobi'],
  [/hydralisk/gi, 'Serpent Stalker'], [/gandalf/gi, 'Grey Pilgrim'],
  [/bart simpson|simpsons?/gi, 'Spiky Haired Imp'], [/he-?man|grayskull/gi, 'Thewn Champion'],
  [/toxic crusader/gi, 'Blight Crusader'], [/p90/gi, 'Compact Bullpup'],
  [/ecto-?1/gi, 'Spectre Wagon'], [/goro/gi, 'Four Armed Brute'],
  [/conan/gi, 'Barbarian Champion'], [/game of thrones/gi, 'Iron Throne Realm'],
];

let repointed = 0, renamedNames = 0, dead = 0;
for (const f of readdirSync(REVIEW)) {
  if (!f.startsWith('data_') || !f.endsWith('.json')) continue;
  const p = join(REVIEW, f);
  const rows = JSON.parse(readFileSync(p, 'utf8'));
  for (const r of rows) {
    if (r.url) {
      const rel = r.url.replace(/^\/cr-realms\//, '');
      if (!existsSync(join(STORE, rel))) {
        // Same folder, same id8 tail: the rename only changed the descriptive part.
        const dir = join(STORE, dirname(rel));
        const tail = basename(rel).match(/_([0-9a-f]{8})\.glb$/)?.[1];
        let found = null;
        if (tail && existsSync(dir)) {
          found = readdirSync(dir).find((x) => x.endsWith(`_${tail}.glb`)) ?? null;
        }
        if (found) { r.url = `/cr-realms/${dirname(rel)}/${found}`; repointed++; }
        else dead++;
      }
    }
    if (r.name) {
      const before = r.name;
      for (const [re, rep] of NAME_SCRUB) r.name = r.name.replace(re, rep);
      if (r.name !== before) renamedNames++;
    }
  }
  writeFileSync(p, JSON.stringify(rows));
}
console.log('review rows repointed:', repointed, '| names scrubbed:', renamedNames, '| still dead:', dead);
