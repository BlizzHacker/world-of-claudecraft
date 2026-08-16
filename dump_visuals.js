// Offline dump of the WORKING TREE's visual registry. No browser, no GPU, no
// live client - manifest.ts is pure data, so it evaluates in node. This is the
// input to the STATIC half of the census (upper bound on coverage); the live
// __crAnim() run is what turns an upper bound into a measured one.
import { VISUALS } from './src/render/characters/manifest.js';

const out = {};
for (const [k, d] of Object.entries(VISUALS)) {
  out[k] = {
    url: d.url,
    animUrls: d.animUrls ?? null,
    height: d.height,
    lazy: !!d.lazyPreload,
    autoClip: !!d.autoClip,
    clips: d.clips,
  };
}
process.stdout.write(JSON.stringify(out));
