// Merge the per-clip GLBs a Meshy rig+animate pipeline returns into ONE GLB
// with named clips, for src/render/characters/manifest.ts's MESHY_HUMANOID
// ClipMap. Meshy exports the rigged character and every animation as separate
// full GLBs sharing the same skeleton (identical node names), so this copies
// each donor's animation channels onto the base document retargeted by node
// name, exactly like bake_mech_anims.mjs does for the Combat Mech.
//
//   node scripts/_merge_meshy_rig.mjs <base.glb> <out.glb> <Name=donor.glb> ...
//
// Example:
//   node scripts/_merge_meshy_rig.mjs tmp/meshy/edda_base.glb tmp/meshy/edda_merged.glb \
//     Idle=tmp/meshy/edda_idle.glb Walk=tmp/meshy/edda_walk.glb Run=tmp/meshy/edda_run.glb \
//     Cast=tmp/meshy/edda_cast.glb Hit=tmp/meshy/edda_hit.glb Death=tmp/meshy/edda_death.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [basePath, outPath, ...clipArgs] = process.argv.slice(2);
if (!basePath || !outPath || clipArgs.length === 0) {
  console.error(
    'usage: node scripts/_merge_meshy_rig.mjs <base.glb> <out.glb> <Name=donor.glb> ...',
  );
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const target = await io.read(basePath);

// Drop any clips already on the base so re-running never duplicates them.
for (const anim of target.getRoot().listAnimations()) anim.dispose();

const targetNodesByName = new Map();
for (const node of target.getRoot().listNodes()) {
  if (targetNodesByName.has(node.getName())) {
    console.warn(`  ! duplicate target node name "${node.getName()}", retarget may be ambiguous`);
  }
  targetNodesByName.set(node.getName(), node);
}

const buffer = target.getRoot().listBuffers()[0] ?? target.createBuffer();
const cloneAccessor = (src) =>
  target
    .createAccessor(src.getName())
    .setType(src.getType())
    .setArray(src.getArray().slice())
    .setNormalized(src.getNormalized())
    .setBuffer(buffer);

for (const arg of clipArgs) {
  const eq = arg.indexOf('=');
  const clipName = arg.slice(0, eq);
  const donorPath = arg.slice(eq + 1);
  const donor = await io.read(donorPath);
  const donorAnims = donor.getRoot().listAnimations();
  if (donorAnims.length === 0) {
    console.error(`  ! ${donorPath} has no animations, skipping "${clipName}"`);
    continue;
  }
  if (donorAnims.length > 1) {
    console.warn(
      `  ! ${donorPath} has ${donorAnims.length} animations, using the first for "${clipName}"`,
    );
  }
  const srcAnim = donorAnims[0];
  const anim = target.createAnimation(clipName);
  // Cloned on first use, so a channel we drop below never leaves an orphaned
  // sampler and its two accessors behind in the merged file.
  const samplerMap = new Map();
  const samplerFor = (srcSampler) => {
    let sampler = samplerMap.get(srcSampler);
    if (!sampler) {
      sampler = target
        .createAnimationSampler()
        .setInterpolation(srcSampler.getInterpolation())
        .setInput(cloneAccessor(srcSampler.getInput()))
        .setOutput(cloneAccessor(srcSampler.getOutput()));
      samplerMap.set(srcSampler, sampler);
      anim.addSampler(sampler);
    }
    return sampler;
  };
  const skipped = new Set();
  let channels = 0;
  let droppedScale = 0;
  for (const srcChannel of srcAnim.listChannels()) {
    const srcNode = srcChannel.getTargetNode();
    const name = srcNode ? srcNode.getName() : '';
    const dstNode = name ? targetNodesByName.get(name) : null;
    if (!dstNode) {
      skipped.add(name || '(unnamed)');
      continue;
    }
    // Bone scale belongs to the bind pose, never to a clip. Meshy's donor takes
    // pin Hips at a constant (the Idle takes ship 1.17647), so a body merged
    // with them renders 17.65% larger while that clip plays and snaps back the
    // instant any other clip starts - the "body shrinks as characters do
    // animations" bug that hit all 21 Infernal heroes. Since Hips is the
    // skeleton root, one such channel resizes the ENTIRE body.
    // Translation IS carried through: unlike the shared clip bank, these donors
    // are the target's own rig, so hip travel is authored at the right
    // proportions and the takes need it (Death drops the Hips to the floor).
    if (srcChannel.getTargetPath() === 'scale') {
      droppedScale++;
      continue;
    }
    anim.addChannel(
      target
        .createAnimationChannel()
        .setTargetNode(dstNode)
        .setTargetPath(srcChannel.getTargetPath())
        .setSampler(samplerFor(srcChannel.getSampler())),
    );
    channels++;
  }
  console.log(
    `  ${clipName}: ${channels} channels from ${donorPath}` +
      (droppedScale ? ` (dropped ${droppedScale} scale channels)` : '') +
      (skipped.size ? ` (skipped: ${[...skipped].join(', ')})` : ''),
  );
}

await io.write(outPath, target);
console.log(
  `wrote ${outPath} with clips: ${target
    .getRoot()
    .listAnimations()
    .map((a) => a.getName())
    .join(', ')}`,
);
