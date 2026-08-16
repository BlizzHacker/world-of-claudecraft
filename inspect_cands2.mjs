import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
for (const f of ['infernal_human_iron_warden','infernal_human_vanguard','infernal_human_assassin','infernal_human_tainted_hood','infernal_human_hooded_wanderer']) {
  try {
    const d = await io.read(`/opt/cr-realms-store/infernal/${f}.glb`);
    const anims = d.getRoot().listAnimations().map(a=>a.getName());
    console.log(f, 'anims='+anims.length, 'skins='+d.getRoot().listSkins().length, anims.slice(0,4).join(','));
  } catch (e) { console.log(f, 'READ_FAIL', String(e).slice(0,80)); }
}
