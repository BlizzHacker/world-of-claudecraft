// Retarget Meshy animation GLBs onto a different Meshy humanoid body by bone name.
// Meshy rigs share semantic bone names but may use different local bind rotations.
// Copying absolute local tracks between those bodies creates the flattened
// "stingray" pose. This tool samples the donor in world space, transfers each
// bone's world-space motion relative to its donor rest pose, then rebuilds local
// tracks against the target hierarchy and bind pose.
//
//   node scripts/_retarget_meshy_rig.mjs <base.glb> <out.glb> <Name=donor.glb> ...
//
// The output keeps the target mesh, materials, skin, and bind pose. Existing
// animations on the base are replaced by the named clips supplied on the command
// line. Donor files may come from the same body or a compatible Meshy biped.

import { pathToFileURL } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Matrix4, Quaternion, Vector3 } from 'three';

const EPSILON = 1e-6;
const IDENTITY_MATRIX = new Matrix4();

function nodeMap(document) {
  const byName = new Map();
  for (const node of document.getRoot().listNodes()) {
    const name = node.getName();
    if (name && !byName.has(name)) byName.set(name, node);
  }
  return byName;
}

function localMatrix(node, transform = null) {
  const position = transform?.position ?? new Vector3().fromArray(node.getTranslation());
  const rotation = transform?.rotation ?? new Quaternion().fromArray(node.getRotation());
  const scale = transform?.scale ?? new Vector3().fromArray(node.getScale());
  return new Matrix4().compose(position, rotation, scale);
}

function worldMatrix(node, localForNode, cache) {
  const hit = cache.get(node);
  if (hit) return hit;
  const local = localForNode(node);
  const parent = node.getParentNode();
  const world = parent
    ? worldMatrix(parent, localForNode, cache).clone().multiply(local)
    : local.clone();
  cache.set(node, world);
  return world;
}

function decomposeRotation(matrix) {
  const rotation = new Quaternion();
  matrix.decompose(new Vector3(), rotation, new Vector3());
  return rotation;
}

function samplerData(animation) {
  const channelsByNode = new Map();
  let duration = 0;
  let maxFrames = 2;
  for (const channel of animation.listChannels()) {
    const node = channel.getTargetNode();
    const input = channel.getSampler().getInput()?.getArray();
    const output = channel.getSampler().getOutput()?.getArray();
    if (!node || !input || !output || input.length === 0) continue;
    duration = Math.max(duration, Number(input[input.length - 1]));
    maxFrames = Math.max(maxFrames, input.length);
    let paths = channelsByNode.get(node);
    if (!paths) {
      paths = new Map();
      channelsByNode.set(node, paths);
    }
    paths.set(channel.getTargetPath(), {
      input,
      output,
      interpolation: channel.getSampler().getInterpolation(),
      elementSize: channel.getSampler().getOutput().getElementSize(),
    });
  }
  return { channelsByNode, duration, maxFrames };
}

function frameInterval(input, time) {
  if (time <= input[0]) return [0, 0, 0];
  const last = input.length - 1;
  if (time >= input[last]) return [last, last, 0];
  let low = 0;
  let high = last;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (input[middle] <= time) low = middle;
    else high = middle;
  }
  const span = input[high] - input[low];
  return [low, high, span > EPSILON ? (time - input[low]) / span : 0];
}

function sampleVector(track, time, fallback) {
  if (!track) return fallback.clone();
  if (track.interpolation === 'CUBICSPLINE') {
    throw new Error('CUBICSPLINE tracks are not supported by the Meshy retargeter');
  }
  const [from, to, rawAlpha] = frameInterval(track.input, time);
  const alpha = track.interpolation === 'STEP' ? 0 : rawAlpha;
  const a = new Vector3().fromArray(track.output, from * track.elementSize);
  if (from === to) return a;
  const b = new Vector3().fromArray(track.output, to * track.elementSize);
  return a.lerp(b, alpha);
}

function sampleQuaternion(track, time, fallback) {
  if (!track) return fallback.clone();
  if (track.interpolation === 'CUBICSPLINE') {
    throw new Error('CUBICSPLINE tracks are not supported by the Meshy retargeter');
  }
  const [from, to, rawAlpha] = frameInterval(track.input, time);
  const alpha = track.interpolation === 'STEP' ? 0 : rawAlpha;
  const a = new Quaternion().fromArray(track.output, from * track.elementSize).normalize();
  if (from === to) return a;
  const b = new Quaternion().fromArray(track.output, to * track.elementSize).normalize();
  return a.slerp(b, alpha).normalize();
}

function sampledLocalMatrix(node, channelsByNode, time) {
  const channels = channelsByNode.get(node);
  return localMatrix(node, {
    position: sampleVector(
      channels?.get('translation'),
      time,
      new Vector3().fromArray(node.getTranslation()),
    ),
    rotation: sampleQuaternion(
      channels?.get('rotation'),
      time,
      new Quaternion().fromArray(node.getRotation()),
    ),
    scale: sampleVector(channels?.get('scale'), time, new Vector3().fromArray(node.getScale())),
  });
}

function isNodeAtOrBelow(node, ancestor) {
  let current = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.getParentNode();
  }
  return false;
}

function buildRetargetedClip(target, targetNodesByName, donor, clipName) {
  const sourceAnimation = donor.getRoot().listAnimations()[0];
  if (!sourceAnimation) throw new Error(`donor has no animation for ${clipName}`);
  const sourceNodesByName = nodeMap(donor);
  const { channelsByNode, duration, maxFrames } = samplerData(sourceAnimation);
  if (duration <= 0) throw new Error(`donor animation has no duration for ${clipName}`);

  const sourceRestWorld = new Map();
  const targetRestWorld = new Map();
  const restLocal = (node) => localMatrix(node);
  for (const node of donor.getRoot().listNodes()) {
    worldMatrix(node, restLocal, sourceRestWorld);
  }
  for (const node of target.getRoot().listNodes()) {
    worldMatrix(node, restLocal, targetRestWorld);
  }

  const animatedNames = [...channelsByNode.keys()]
    .map((node) => node.getName())
    .filter((name) => name && targetNodesByName.has(name));
  const fps = Math.min(60, Math.max(24, Math.round((maxFrames - 1) / duration)));
  const frameCount = Math.max(2, Math.round(duration * fps) + 1);
  const times = new Float32Array(frameCount);
  const rotations = new Map();
  for (const name of animatedNames) rotations.set(name, new Float32Array(frameCount * 4));
  const hipsName = animatedNames.includes('Hips') ? 'Hips' : null;
  const sourceHips = hipsName ? sourceNodesByName.get(hipsName) : null;
  const targetHips = hipsName ? targetNodesByName.get(hipsName) : null;
  let rootRotationCorrection = new Quaternion();
  if (sourceHips && targetHips) {
    const sourceFirstWorld = new Map();
    const sourceLocalAtFirstFrame = (node) => sampledLocalMatrix(node, channelsByNode, 0);
    const sourceFirstRotation = decomposeRotation(
      worldMatrix(sourceHips, sourceLocalAtFirstFrame, sourceFirstWorld),
    );
    const sourceRestRotation = decomposeRotation(sourceRestWorld.get(sourceHips));
    const targetRestRotation = decomposeRotation(targetRestWorld.get(targetHips));
    const rawFirstRotation = sourceFirstRotation
      .multiply(sourceRestRotation.invert())
      .multiply(targetRestRotation);
    rootRotationCorrection = targetRestRotation.multiply(rawFirstRotation.invert()).normalize();
  }

  for (let frame = 0; frame < frameCount; frame++) {
    const time = frame === frameCount - 1 ? duration : (frame / (frameCount - 1)) * duration;
    times[frame] = time;
    const sourceAnimatedWorld = new Map();
    const sourceLocalAtTime = (node) => sampledLocalMatrix(node, channelsByNode, time);
    const targetAnimatedWorld = new Map();
    const targetLocalTransforms = new Map();

    const targetState = (targetNode) => {
      const hit = targetAnimatedWorld.get(targetNode);
      if (hit) return hit;
      const parent = targetNode.getParentNode();
      const parentWorld = parent ? targetState(parent) : IDENTITY_MATRIX;
      const parentWorldRotation = decomposeRotation(parentWorld);
      const sourceNode = sourceNodesByName.get(targetNode.getName());
      const targetRestRotation = decomposeRotation(targetRestWorld.get(targetNode));
      let desiredWorldRotation = targetRestRotation;
      if (sourceNode) {
        const sourceAnimatedRotation = decomposeRotation(
          worldMatrix(sourceNode, sourceLocalAtTime, sourceAnimatedWorld),
        );
        const sourceRestRotation = decomposeRotation(sourceRestWorld.get(sourceNode));
        const worldDelta = sourceAnimatedRotation.multiply(sourceRestRotation.invert());
        desiredWorldRotation = worldDelta.multiply(targetRestRotation).normalize();
        if (targetHips && isNodeAtOrBelow(targetNode, targetHips)) {
          desiredWorldRotation = rootRotationCorrection
            .clone()
            .multiply(desiredWorldRotation)
            .normalize();
        }
      }
      const localRotation = parentWorldRotation.invert().multiply(desiredWorldRotation).normalize();
      const localPosition = new Vector3().fromArray(targetNode.getTranslation());
      const transform = {
        position: localPosition,
        rotation: localRotation,
        scale: new Vector3().fromArray(targetNode.getScale()),
      };
      targetLocalTransforms.set(targetNode, transform);
      const world = parentWorld.clone().multiply(localMatrix(targetNode, transform));
      targetAnimatedWorld.set(targetNode, world);
      return world;
    };

    for (const name of animatedNames) {
      const targetNode = targetNodesByName.get(name);
      targetState(targetNode);
      const transform = targetLocalTransforms.get(targetNode);
      transform.rotation.toArray(rotations.get(name), frame * 4);
    }
  }

  const buffer = target.getRoot().listBuffers()[0] ?? target.createBuffer();
  const timeAccessor = target
    .createAccessor(`${clipName}_time`)
    .setType('SCALAR')
    .setArray(times)
    .setBuffer(buffer);
  const animation = target.createAnimation(clipName);
  for (const name of animatedNames) {
    const targetNode = targetNodesByName.get(name);
    const rotationAccessor = target
      .createAccessor(`${clipName}_${name}_rotation`)
      .setType('VEC4')
      .setArray(rotations.get(name))
      .setBuffer(buffer);
    const rotationSampler = target
      .createAnimationSampler()
      .setInterpolation('LINEAR')
      .setInput(timeAccessor)
      .setOutput(rotationAccessor);
    animation.addSampler(rotationSampler);
    animation.addChannel(
      target
        .createAnimationChannel()
        .setTargetNode(targetNode)
        .setTargetPath('rotation')
        .setSampler(rotationSampler),
    );
  }
  return {
    clipName,
    channels: animation.listChannels().length,
    skipped: channelsByNode.size - animatedNames.length,
  };
}

export async function retargetMeshyRig(basePath, outPath, clips) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const target = await io.read(basePath);
  for (const animation of target.getRoot().listAnimations()) animation.dispose();
  const targetNodesByName = nodeMap(target);
  const summary = [];
  for (const { name: clipName, path: donorPath } of clips) {
    const donor = await io.read(donorPath);
    summary.push(buildRetargetedClip(target, targetNodesByName, donor, clipName));
  }
  await io.write(outPath, target);
  return summary;
}

async function main() {
  const [basePath, outPath, ...clipArgs] = process.argv.slice(2);
  if (!basePath || !outPath || clipArgs.length === 0) {
    console.error(
      'usage: node scripts/_retarget_meshy_rig.mjs <base.glb> <out.glb> <Name=donor.glb> ...',
    );
    process.exitCode = 1;
    return;
  }
  const clips = clipArgs.map((arg) => {
    const separator = arg.indexOf('=');
    if (separator < 1) throw new Error(`invalid clip argument: ${arg}`);
    return { name: arg.slice(0, separator), path: arg.slice(separator + 1) };
  });
  const summary = await retargetMeshyRig(basePath, outPath, clips);
  for (const row of summary) {
    console.log(`${row.clipName}: ${row.channels} channels, ${row.skipped} skipped`);
  }
  console.log(`wrote ${outPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
