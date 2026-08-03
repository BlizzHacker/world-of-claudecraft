// build_clip_bank.mjs — build the shared Meshy animation clip bank GLB.
//
// Curates clips from /tmp/bankstage/*.glb (armature-only Meshy animation GLBs,
// all on the shared 24-joint Mixamo-style skeleton) according to the naming
// contract /tmp/bank_vocab.json, merges them into ONE armature-only GLB with
// contract-defined clip names, validates, and writes /tmp/meshy_clip_bank.glb.
//
// Technique mirrors scripts/_merge_meshy_rig.mjs: copy each donor animation's
// channels onto the base document, retargeting BY NODE NAME.
//
//   cd /opt/cryptic-realm && node scripts/build_clip_bank.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const STAGE = '/tmp/bankstage';
const VOCAB_PATH = '/tmp/bank_vocab.json';
const OUT = '/tmp/meshy_clip_bank.glb';
const BARB = '/opt/cr-realms-store/infernal/realm_infernal_hero_barbarian.glb';
const SECTIONS = ['core_kaykit_parity', 'extra_combat', 'emotes_real', 'flavor_idles'];
const MIN_DURATION = 0.2;

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

// ---------------------------------------------------------------- actions ---
const files = readdirSync(STAGE).filter((f) => f.endsWith('_armature.glb')).sort();
const actionToFile = new Map(); // ActionName -> absolute path
for (const f of files) {
  const stem = f.slice(0, -'_armature.glb'.length);
  const i1 = stem.indexOf('__');
  const i2 = i1 >= 0 ? stem.indexOf('__', i1 + 2) : -1;
  if (i2 < 0) {
    console.warn(`! cannot parse action name from ${f}, skipping`);
    continue;
  }
  const action = stem.slice(i2 + 2);
  if (actionToFile.has(action)) {
    console.warn(`! duplicate action name "${action}" (${f}), keeping first file`);
    continue;
  }
  actionToFile.set(action, `${STAGE}/${f}`);
}
const actionNames = [...actionToFile.keys()].sort((a, b) =>
  a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0,
);
console.log(`source pool: ${actionNames.length} distinct actions from ${files.length} files`);

// ------------------------------------------------------------ resolve vocab ---
const vocab = JSON.parse(readFileSync(VOCAB_PATH, 'utf8'));
const claimed = new Set();
const resolved = []; // { section, target, action, file, regex }
const unfilled = []; // { section, target }
for (const section of SECTIONS) {
  for (const [target, candidates] of Object.entries(vocab[section])) {
    let picked = null;
    for (const cand of candidates) {
      const re = new RegExp(cand, 'i');
      const match = actionNames.find((a) => !claimed.has(a) && re.test(a));
      if (match) {
        picked = { section, target, action: match, file: actionToFile.get(match), regex: cand };
        break;
      }
    }
    if (picked) {
      claimed.add(picked.action);
      resolved.push(picked);
    } else {
      unfilled.push({ section, target });
    }
  }
}

console.log('\n=== VOCAB RESOLUTION ===');
for (const section of SECTIONS) {
  const hits = resolved.filter((r) => r.section === section);
  const misses = unfilled.filter((u) => u.section === section);
  console.log(`[${section}] filled ${hits.length}/${hits.length + misses.length}`);
  for (const r of hits) console.log(`  ${r.target} <- ${r.action}   (regex: ${r.regex})`);
  for (const u of misses) {
    const critical = section === 'core_kaykit_parity';
    console.log(`  ${critical ? 'CRITICAL UNFILLED CORE' : 'unfilled'}: ${u.target}`);
  }
}

// ------------------------------------------------------------------- base ---
// Base skeleton: first source file, animations fully stripped.
const basePath = actionToFile.get(actionNames[0]);
console.log(`\nbase skeleton from: ${basePath}`);
const target = await io.read(basePath);
for (const anim of target.getRoot().listAnimations()) {
  for (const ch of anim.listChannels()) ch.dispose();
  for (const s of anim.listSamplers()) {
    const input = s.getInput();
    const output = s.getOutput();
    s.dispose();
    if (input) input.dispose();
    if (output) output.dispose();
  }
  anim.dispose();
}
// The sources are meshopt-compressed; decoded on read. Drop the extension so
// the bank is written plain (no encoder registered, none needed).
for (const ext of target.getRoot().listExtensionsUsed()) {
  if (ext.extensionName === 'EXT_meshopt_compression') ext.dispose();
}
const targetNodesByName = new Map();
for (const node of target.getRoot().listNodes()) {
  if (targetNodesByName.has(node.getName())) {
    console.warn(`! duplicate target node name "${node.getName()}", retarget may be ambiguous`);
  }
  targetNodesByName.set(node.getName(), node);
}
console.log(`base skeleton nodes (${targetNodesByName.size}): ${[...targetNodesByName.keys()].join(', ')}`);

const buffer = target.getRoot().listBuffers()[0] ?? target.createBuffer();
const cloneAccessor = (src) =>
  target
    .createAccessor(src.getName())
    .setType(src.getType())
    .setArray(src.getArray().slice())
    .setNormalized(src.getNormalized())
    .setBuffer(buffer);

// ------------------------------------------------------------------ merge ---
console.log('\n=== MERGE ===');
for (const r of resolved) {
  const donor = await io.read(r.file);
  const donorAnims = donor.getRoot().listAnimations();
  if (donorAnims.length === 0) {
    console.error(`  ! ${r.file} has no animations, skipping "${r.target}"`);
    continue;
  }
  if (donorAnims.length > 1) {
    console.warn(`  ! ${r.file} has ${donorAnims.length} animations, using the first for "${r.target}"`);
  }
  const srcAnim = donorAnims[0];
  const anim = target.createAnimation(r.target);
  const samplerMap = new Map();
  for (const srcSampler of srcAnim.listSamplers()) {
    const sampler = target
      .createAnimationSampler()
      .setInterpolation(srcSampler.getInterpolation())
      .setInput(cloneAccessor(srcSampler.getInput()))
      .setOutput(cloneAccessor(srcSampler.getOutput()));
    samplerMap.set(srcSampler, sampler);
    anim.addSampler(sampler);
  }
  const skipped = new Set();
  let channels = 0;
  for (const srcChannel of srcAnim.listChannels()) {
    const srcNode = srcChannel.getTargetNode();
    const name = srcNode ? srcNode.getName() : '';
    const dstNode = name ? targetNodesByName.get(name) : null;
    if (!dstNode) {
      skipped.add(name || '(unnamed)');
      continue;
    }
    // ROTATIONS ONLY. Translation/scale tracks impose the SOURCE rig's bone
    // lengths on whatever body plays the clip - big bodies visibly shrink to
    // the donor's proportions during every bank clip (emotes read "mini
    // KayKit size", the behemoth changes size per animation). Rotation
    // transplants are proportion-safe on a shared joint hierarchy.
    if (srcChannel.getTargetPath() !== 'rotation') continue;
    anim.addChannel(
      target
        .createAnimationChannel()
        .setTargetNode(dstNode)
        .setTargetPath(srcChannel.getTargetPath())
        .setSampler(samplerMap.get(srcChannel.getSampler())),
    );
    channels++;
  }
  console.log(
    `  ${r.target}: ${channels} channels from ${r.action}` +
      (skipped.size ? ` (SKIPPED NODES: ${[...skipped].join(', ')})` : ''),
  );
}

await io.write(OUT, target);
const bytes = statSync(OUT).size;
console.log(`\nwrote ${OUT} (${(bytes / 1024 / 1024).toFixed(2)} MB, ${bytes} bytes)`);

// --------------------------------------------------------------- validate ---
console.log('\n=== VALIDATE (re-read from disk) ===');
const bank = await io.read(OUT);
const barb = await io.read(BARB);
const barbNodeNames = new Set(barb.getRoot().listNodes().map((n) => n.getName()));

const bankAnims = bank.getRoot().listAnimations();
const expected = resolved.map((r) => r.target);
const present = bankAnims.map((a) => a.getName());
const missingClips = expected.filter((n) => !present.includes(n));

let badClips = 0;
const missingNodes = new Set();
for (const anim of bankAnims) {
  const channels = anim.listChannels();
  let dur = 0;
  for (const s of anim.listSamplers()) {
    const m = [];
    s.getInput().getMax(m);
    if (m[0] > dur) dur = m[0];
  }
  let clipMissing = 0;
  for (const ch of channels) {
    const n = ch.getTargetNode();
    const name = n ? n.getName() : '(unnamed)';
    if (!barbNodeNames.has(name)) {
      missingNodes.add(name);
      clipMissing++;
    }
  }
  const ok = channels.length > 0 && dur > MIN_DURATION && clipMissing === 0;
  if (!ok) badClips++;
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'} ${anim.getName()}: ${channels.length} channels, ${dur.toFixed(3)}s` +
      (clipMissing ? `, ${clipMissing} channels target nodes missing from barbarian` : ''),
  );
}

console.log(`\nclip count: ${bankAnims.length}`);
console.log(`clip list: ${present.join(', ')}`);
console.log(`clips expected but missing from bank: ${missingClips.length ? missingClips.join(', ') : 'none'}`);
console.log(
  `node-name coverage vs ${BARB}: ${missingNodes.size === 0 ? 'ZERO missing (PASS)' : `MISSING: ${[...missingNodes].join(', ')} (FAIL)`}`,
);
const coreUnfilled = unfilled.filter((u) => u.section === 'core_kaykit_parity');
console.log(`unfilled targets: ${unfilled.length ? unfilled.map((u) => `${u.section}:${u.target}`).join(', ') : 'none'}`);
console.log(
  `RESULT: ${badClips === 0 && missingClips.length === 0 && missingNodes.size === 0 && coreUnfilled.length === 0 ? 'ALL VALIDATIONS PASS' : 'VALIDATION FAILURES PRESENT'}`,
);
