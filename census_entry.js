// Census entry point: the symbols the coverage probe and the motion-sheet
// renderer drive, taken straight from the working tree so the AFTER run
// exercises the SAME CharacterVisual constructor, the same prepareVisual clip
// merge, and the same clip maps the game will ship - not a re-implementation.
//
// Bundled by esbuild into a single ESM blob and injected into the census page as
// a module script, so it runs on the live origin and fetches the real GLBs.
import { preloadVisualAssets, visualAssetsReady } from './src/render/characters/assets';
import { VISUALS } from './src/render/characters/manifest';
import { CharacterPreview } from './src/render/characters/preview';
import { CharacterVisual } from './src/render/characters/visual';

window.__CENSUS_MODULE__ = {
  VISUALS,
  CharacterVisual,
  CharacterPreview,
  preloadVisualAssets,
  visualAssetsReady,
};
