#!/usr/bin/env node
// Print the raw metrics for bodies whose verdict is already known, so the
// thresholds are calibrated against the visual audit instead of invented.
// KEEP = in the civilian rotation today. BARRED = rejected with a stated defect.
import { execFileSync } from 'node:child_process';

const KEEP = [
  'infernal_human_iron_warden', 'infernal_human_weathered_elder',
  'infernal_human_hooded_wanderer', 'infernal_human_monk',
];
const BARRED = [
  'infernal_human_white_sage', 'infernal_human_road_mercenary',
  'infernal_human_vanguard', 'infernal_human_veil_adept',
];

const { analyseFile } = await import('/opt/cryptic-realm/scripts/civ_metrics.mjs');

console.log('verdict  driven  Lhand/Rhand  span   clips  name');
for (const [label, list] of [['KEEP  ', KEEP], ['BARRED', BARRED]]) {
  for (const n of list) {
    const p = `/opt/cr-realms-store/infernal/${n}.glb`;
    let r;
    try { r = await analyseFile(p); } catch (e) { console.log(`${label}  ERROR ${n}: ${String(e).slice(0, 60)}`); continue; }
    if (r.skip) { console.log(`${label}  SKIP(${r.skip}) ${n}`); continue; }
    console.log(`${label}  ${String(r.armDriven).padEnd(6)} ${String(r.leftHandVerts).padStart(5)}/${String(r.rightHandVerts).padEnd(5)} ${String(r.spanRatio).padEnd(6)} ${String(r.clips).padStart(3)}   ${n}`);
  }
}
