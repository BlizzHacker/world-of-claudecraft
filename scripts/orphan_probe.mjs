// Are the unreachable bodies usable at all? A character visual needs a skin and
// baked clips; a raw static mesh cannot be handed to a player without going
// through the rigger first. Read that off the GLB rather than rendering 193 of
// them on a box that is already saturated.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync, existsSync, statSync } from 'node:fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const orphans = JSON.parse(readFileSync('/opt/cryptic-realm/tmp/orphan_bodies.json', 'utf8'));

const tally = { rigged_with_clips: [], rigged_no_clips: [], static: [], unreadable: [] };
for (const rel of orphans) {
  const [realm, stem] = [rel.slice(0, rel.indexOf('/')), rel.slice(rel.indexOf('/') + 1)];
  const path = `/opt/cr-realms-store/${realm}/${stem}.glb`;
  if (!existsSync(path)) { tally.unreadable.push(rel); continue; }
  let doc;
  try { doc = await io.read(path); } catch { tally.unreadable.push(rel); continue; }
  const root = doc.getRoot();
  const skins = root.listSkins().length;
  const clips = root.listAnimations().length;
  const kb = Math.round(statSync(path).size / 1024);
  const row = `${rel} (skins=${skins} clips=${clips} ${kb}kb)`;
  if (skins > 0 && clips > 0) tally.rigged_with_clips.push(row);
  else if (skins > 0) tally.rigged_no_clips.push(row);
  else tally.static.push(row);
}
for (const [k, v] of Object.entries(tally)) {
  console.log(`${k.padEnd(20)} ${v.length}`);
}
console.log('\n--- rigged WITH clips (usable as-is) ---');
for (const r of tally.rigged_with_clips.slice(0, 30)) console.log('  ', r);
console.log('\n--- rigged, no clips (needs the clip bank) ---');
for (const r of tally.rigged_no_clips.slice(0, 15)) console.log('  ', r);
console.log('\n--- static meshes (needs rigging, or belongs in decor) ---');
for (const r of tally.static.slice(0, 15)) console.log('  ', r);
