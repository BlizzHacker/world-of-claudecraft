import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const hero = await io.read('/opt/cr-realms-store/infernal/realm_infernal_hero_barbarian.glb');
const bank = await io.read('/tmp/pk_walk_arm.glb');
const h = new Set(hero.getRoot().listNodes().map(n=>n.getName()));
const animTargets = new Set();
for (const a of bank.getRoot().listAnimations())
  for (const ch of a.listChannels()) { const t=ch.getTargetNode(); if(t) animTargets.add(t.getName()); }
const missing = [...animTargets].filter(n=>!h.has(n));
console.log('bank clips:', bank.getRoot().listAnimations().map(a=>a.getName()).join(','));
console.log('bank anim target nodes:', animTargets.size);
console.log('targets missing on hero rig:', missing.length, missing.slice(0,6).join(','));
