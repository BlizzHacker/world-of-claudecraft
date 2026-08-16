import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const bones = async (f) => {
  const d = await io.read(`/opt/cr-realms-store/infernal/${f}.glb`);
  const skin = d.getRoot().listSkins()[0];
  return skin ? skin.listJoints().map(j=>j.getName()) : [];
};
const a = await bones('realm_infernal_hero_barbarian');
const b = await bones('realm_infernal_hero_warlock');
const c = await bones('realm_infernal_hero_skullbeast');
console.log('barbarian joints:', a.length, '| warlock:', b.length, '| skullbeast:', c.length);
console.log('barb==warlock names:', JSON.stringify(a)===JSON.stringify(b));
console.log('barb==skullbeast names:', JSON.stringify(a)===JSON.stringify(c));
console.log('sample joints:', a.slice(0,10).join(', '));
const d2 = await io.read('/opt/cr-realms-store/infernal/realm_infernal_hero_barbarian.glb');
console.log('clips:', d2.getRoot().listAnimations().map(x=>x.getName()).join(', '));
