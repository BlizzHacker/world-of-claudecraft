import { describe, expect, it } from 'vitest';
import { VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { MOBS } from '../src/sim/data';
import { setRealmHostEnv } from '../src/sim/realms/registry';

const CLAUDECRAFT_PREFIX = 'realm_claudecraft_';

/** Families deliberately left on the shared fallbacks: the claudecraft store has
 *  no convincing body for them, and a wrong body is worse than a generic one. */
const UNMAPPED_FAMILIES = ['elemental', 'spider', 'burrower', 'troll', 'ogre'] as const;

function withClaudecraft<T>(fn: () => T): T {
  setRealmHostEnv({
    queryParam: (name) => (name === 'realm' ? 'claudecraft' : null),
    storageGet: () => null,
    storageSet: () => undefined,
  });
  try {
    return fn();
  } finally {
    setRealmHostEnv(null);
  }
}

const claudecraftKeys = Object.keys(VISUALS).filter(
  (key) =>
    key.startsWith(CLAUDECRAFT_PREFIX) &&
    VISUALS[key].url.startsWith('/cr-realms/claudecraft/claudcraft__'),
);
const PUBLISHED_CLAUDECRAFT_FILES = [
  'claudcraft__arcane-dragon.glb',
  'claudcraft__beaver.glb',
  'claudcraft__bluebeast.glb',
  'claudcraft__classic-boar.glb',
  'claudcraft__crab.glb',
  'claudcraft__dark-knight.glb',
  'claudcraft__dark-wanderer.glb',
  'claudcraft__demon-male-.glb',
  'claudcraft__fighting-ghost.glb',
  'claudcraft__frostdragon.glb',
  'claudcraft__goofy_zombie.glb',
  'claudcraft__horned-knight-.glb',
  'claudcraft__horse.glb',
  'claudcraft__mini-elf-bearded.glb',
  'claudcraft__mini-orc.glb',
  'claudcraft__mini-orc2.glb',
  'claudcraft__parot-blue.glb',
  'claudcraft__polar_bear.glb',
  'claudcraft__skeleton.glb',
  'claudcraft__spine-boar.glb',
  'claudcraft__water-dinosaur-rawr.glb',
] as const;

describe('Claudecraft realm creature bank', () => {
  it('registers the whole authored store under the realm asset path', () => {
    // The claudecraft store holds 21 character GLBs; every one gets a key so it
    // is renderable and assignable from the ArcForge library.
    expect(claudecraftKeys).toHaveLength(21);

    for (const key of claudecraftKeys) {
      const def = VISUALS[key];
      expect(def, key).toBeDefined();
      expect(def.url, key).toMatch(/^\/cr-realms\/claudecraft\/[^/]+\.glb$/);
      expect(def.height, key).toBeGreaterThan(0);
      expect(def.lazyPreload, key).toBe(true);
    }
    expect(claudecraftKeys.map((key) => VISUALS[key].url.split('/').pop()).sort()).toEqual(
      [...PUBLISHED_CLAUDECRAFT_FILES].sort(),
    );
  });

  it('names a real clip in every locomotion slot', () => {
    // These GLBs vary: some ship named Walking/Running, others only one baked
    // take. Whichever it is, no slot may be left empty or the renderer has
    // nothing to play.
    for (const key of claudecraftKeys) {
      const clips = VISUALS[key].clips;
      expect(clips.idle, key).toBeTruthy();
      expect(clips.walk, key).toBeTruthy();
      expect(clips.run, key).toBeTruthy();
      expect(clips.death, key).toBeTruthy();
      expect(Array.isArray(clips.attack), key).toBe(true);
    }
  });

  it('points every claudecraft body at a distinct GLB', () => {
    const urls = claudecraftKeys.map((k) => VISUALS[k].url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('resolves claudecraft mobs to registered visuals and uses the authored bank', () => {
    withClaudecraft(() => {
      const resolved = new Set<string>();
      for (const templateId of Object.keys(MOBS)) {
        const key = visualKeyFor({ kind: 'mob', templateId } as never);
        // A mob may never resolve to an unregistered visual key.
        expect(VISUALS[key], `${templateId} -> ${key}`).toBeDefined();
        resolved.add(key);
      }
      // The realm must actually reach its own bank rather than sitting entirely
      // on the shared KayKit fallbacks.
      const used = [...resolved].filter((k) => k.startsWith(CLAUDECRAFT_PREFIX));
      expect(used.length).toBeGreaterThan(0);
    });
  });

  it('leaves families with no convincing claudecraft body on the shared fallbacks', () => {
    withClaudecraft(() => {
      for (const family of UNMAPPED_FAMILIES) {
        const ids = Object.keys(MOBS).filter((id) => MOBS[id]?.family === family);
        for (const id of ids) {
          const key = visualKeyFor({ kind: 'mob', templateId: id } as never);
          expect(key.startsWith(CLAUDECRAFT_PREFIX), `${family}/${id} -> ${key}`).toBe(false);
        }
      }
    });
  });
});
