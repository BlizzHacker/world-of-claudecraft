// Animation census over every referenced realm body, in ONE process.
// Spawning a node per file for 1000 files costs ~30min; this is ~1min.
//
// A body is only "working" if it has a skin (skeleton binding), joints, AND the
// KayKit clip names the manifest's genClips() actually asks for. A body can have
// animations and still be broken if the clips are named something else -- the
// renderer looks clips up BY NAME.
const fs = require('fs');
const path = require('path');
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');

let io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
try {
  const { MeshoptDecoder } = require('meshoptimizer');
  io = io.registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
} catch (e) {}

const STORE = '/opt/cr-realms-store';
const list = fs.readFileSync('/tmp/referenced.txt', 'utf8').split('\n').filter(Boolean);

// What genClips() in manifest.generated.ts requires by name.
const REQUIRED = ['Idle', 'Walking_A', 'Running_A', 'Walking_Backwards', 'Hit_A',
  'Death_A', 'Spellcasting', 'Sit_Floor_Down', 'Sit_Floor_Idle', 'Lie_Idle', 'Jump_Idle'];

(async () => {
  const rows = [];
  for (const rel of list) {
    const p = path.join(STORE, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const doc = await io.read(p);
      const r = doc.getRoot();
      const clips = r.listAnimations().map((a) => a.getName());
      const skins = r.listSkins();
      rows.push({
        rel,
        realm: rel.split('/')[0],
        anims: clips.length,
        skins: skins.length,
        joints: skins.reduce((a, s) => a + s.listJoints().length, 0),
        missing: REQUIRED.filter((c) => !clips.includes(c)),
        clips,
        size: fs.statSync(p).size,
      });
    } catch (e) {
      rows.push({ rel, realm: rel.split('/')[0], err: e.message.slice(0, 60) });
    }
  }
  fs.writeFileSync('/tmp/census.json', JSON.stringify(rows));

  const bad = rows.filter((r) => r.err);
  const noRig = rows.filter((r) => !r.err && (r.skins === 0 || r.joints === 0));
  const noAnim = rows.filter((r) => !r.err && r.skins > 0 && r.anims === 0);
  const partial = rows.filter((r) => !r.err && r.skins > 0 && r.anims > 0 && r.missing.length > 0);
  const full = rows.filter((r) => !r.err && r.skins > 0 && r.anims > 0 && r.missing.length === 0);

  const mb = (a) => (a.reduce((s, r) => s + (r.size || 0), 0) / 1048576).toFixed(0);
  console.log(`total referenced        : ${rows.length}`);
  console.log(`  fully clipped (good)  : ${full.length}   ${mb(full)} MB`);
  console.log(`  rigged, MISSING clips : ${partial.length}   ${mb(partial)} MB`);
  console.log(`  rigged, NO animations : ${noAnim.length}   ${mb(noAnim)} MB`);
  console.log(`  NO SKELETON at all    : ${noRig.length}   ${mb(noRig)} MB`);
  console.log(`  unreadable            : ${bad.length}`);

  const byRealm = {};
  for (const r of rows) {
    const k = r.realm;
    byRealm[k] ??= { n: 0, broken: 0 };
    byRealm[k].n++;
    if (r.err || r.skins === 0 || r.joints === 0 || r.anims === 0 || (r.missing || []).length) byRealm[k].broken++;
  }
  console.log('\nrealm            total   not-fully-animated');
  for (const [k, v] of Object.entries(byRealm).sort()) {
    console.log(`  ${k.padEnd(14)} ${String(v.n).padStart(5)} ${String(v.broken).padStart(12)}`);
  }

  if (noRig.length) {
    console.log('\n10 largest with NO skeleton:');
    noRig.sort((a, b) => b.size - a.size).slice(0, 10)
      .forEach((r) => console.log(`  ${(r.size / 1048576).toFixed(1).padStart(6)} MB  ${r.rel}`));
  }
  if (partial.length) {
    console.log('\nmost common missing clips:');
    const c = {};
    for (const r of partial) for (const m of r.missing) c[m] = (c[m] || 0) + 1;
    Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}x  ${k}`));
    console.log('\nsample clip sets actually present:');
    partial.slice(0, 3).forEach((r) => console.log(`  ${r.rel}\n     [${r.clips.join(', ')}]`));
  }
})();
