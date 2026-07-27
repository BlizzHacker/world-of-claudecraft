// Validate the humanoid gate against assets already judged by EYE, so the
// threshold is calibrated on ground truth rather than taste.
//
// From the rendered infernal audit sheet:
//   GOOD (must pass): abyssal_guardian x2  -- clean humanoid demons
//   BAD  (must fail): 7_skulls_pile_ups, arachnida_nightmare x2,
//                     arachnoskull_specter x2, atanic_demon_fat_creature
import { humanoidVerdict } from './humanoid_gate.mjs';
import { readFileSync } from 'node:fs';

const entries = JSON.parse(readFileSync('/tmp/entries.json', 'utf8'));
const TRUTH = [
  // verified humanoid by eye in the rendered audit sheet
  ['abyssal_guardian_characters_weap', true],
  ['abyssal_guardian_weaponsmilitary', true],
  // real characters the first (h/foot) rule wrongly discarded — arms spread wide
  ['mage_wizard_dynamic_pose', true],
  ['jesus_religious_holy_divine', true],
  ['dark_enchantress_artabstract', true],
  ['game_figure_albino_giant', true],
  ['ethereal_sentinel_artabstract', true],
  // verified non-characters by eye
  ['7_skulls_pile_ups', false],
  ['arachnida_nightmare_characters', false],
  ['arachnoskull_specter_artabstract', false],
  ['arachnoskull_specter_characters', false],
  ['atanic_demon_fat_creature', false],
  ['grotesque_horrifying_face_wide', false],
  ['image_displays_shiny_three', false],
];

let pass = 0;
let fail = 0;
for (const [frag, expectOk] of TRUTH) {
  const e = entries.find((x) => x.key.includes(frag));
  if (!e) { console.log(`  ?    ${frag}: not in entries`); continue; }
  let v;
  try { v = humanoidVerdict(e.src); } catch (err) { v = { ok: false, reason: String(err.message) }; }
  const good = v.ok === expectOk;
  good ? pass++ : fail++;
  console.log(`  ${good ? 'PASS' : 'MISS'} ${frag}\n        expect=${expectOk ? 'humanoid' : 'reject'} got=${v.ok ? 'humanoid' : 'reject'} ratio=${v.ratio?.toFixed(2) ?? '-'} ${v.reason ?? ''}`);
}
console.log(`\ngate calibration: ${pass} correct, ${fail} wrong`);
