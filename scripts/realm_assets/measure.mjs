// Measure real x/y/z on known-good and known-bad assets so the humanoid rule is
// derived from data instead of a guessed threshold.
//
// Hypothesis to test: height/footprint conflates two very different things —
// "wide because the arms are out" (a GOOD sign; closer to the T-pose the rigger
// needs) and "wide because it is a spider". The discriminator should be DEPTH:
// a humanoid is thin front-to-back no matter how wide its arm span.
import { glbBounds } from './humanoid_gate.mjs';
import { readFileSync } from 'node:fs';

const entries = JSON.parse(readFileSync('/tmp/entries.json', 'utf8'));
const SET = [
  ['GOOD', 'abyssal_guardian_characters_weap'],
  ['GOOD', 'abyssal_guardian_weaponsmilitary'],
  ['GOOD?', 'mage_wizard_dynamic_pose'],
  ['GOOD?', 'jesus_religious_holy_divine'],
  ['GOOD?', 'dark_enchantress_artabstract'],
  ['GOOD?', 'game_figure_albino_giant'],
  ['GOOD?', 'ethereal_sentinel_artabstract'],
  ['BAD', '7_skulls_pile_ups'],
  ['BAD', 'arachnida_nightmare_characters'],
  ['BAD', 'arachnoskull_specter_artabstract'],
  ['BAD', 'atanic_demon_fat_creature'],
  ['BAD', 'grotesque_horrifying_face_wide'],
  ['BAD', 'image_displays_shiny_three'],
];

console.log('label  x/y    z/y    thin/y  wide/y  h/foot  key');
for (const [label, frag] of SET) {
  const e = entries.find((x) => x.key.includes(frag));
  if (!e) { console.log(`${label}  -- not found: ${frag}`); continue; }
  let b;
  try { b = glbBounds(e.src); } catch { console.log(`${label}  unreadable ${frag}`); continue; }
  const [x, y, z] = b.size;
  const thin = Math.min(x, z);
  const wide = Math.max(x, z);
  console.log(
    `${label.padEnd(6)} ${(x / y).toFixed(2)}  ${(z / y).toFixed(2)}  ` +
    `${(thin / y).toFixed(2)}    ${(wide / y).toFixed(2)}    ${(y / wide).toFixed(2)}    ${frag}`
  );
}
