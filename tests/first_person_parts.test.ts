import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  firstPersonMeshRole,
  firstPersonSelfMeshVisible,
  shouldPreserveFirstPersonMeshPart,
} from '../src/render/characters/first_person_parts';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => readFileSync(path.join(ROOT, rel), 'utf8');

describe('first-person character mesh roles', () => {
  it('hides head and torso parts that block the FPS camera', () => {
    expect(firstPersonMeshRole('Knight_Head')).toBe('hide');
    expect(firstPersonMeshRole('Knight_HelmetVisor')).toBe('hide');
    expect(firstPersonMeshRole('Mage_Hat')).toBe('hide');
    expect(firstPersonMeshRole('RogueHooded_Mask')).toBe('hide');
    expect(firstPersonMeshRole('Barbarian_BearHat')).toBe('hide');
    expect(firstPersonMeshRole('Rogue_Body')).toBe('hide');
    expect(firstPersonMeshRole('Rogue_Cape')).toBe('hide');
  });

  it('keeps appendages visible for first-person combat animation reads', () => {
    expect(firstPersonMeshRole('Knight_ArmLeft')).toBe('keep');
    expect(firstPersonMeshRole('Knight_ArmRight')).toBe('keep');
    expect(firstPersonMeshRole('Knight_LeftArm')).toBe('keep');
    expect(firstPersonMeshRole('Druid_LegLeft')).toBe('keep');
    expect(firstPersonMeshRole('Druid_LegRight')).toBe('keep');
    expect(firstPersonMeshRole('Druid_RightLeg')).toBe('keep');
  });

  it('leaves weapon attachments out of the body-part mask', () => {
    expect(firstPersonMeshRole('1H_Sword')).toBe('other');
    expect(shouldPreserveFirstPersonMeshPart('Ranger_Head')).toBe(true);
    expect(shouldPreserveFirstPersonMeshPart('1H_Crossbow')).toBe(false);
  });
});


// ---------------------------------------------------------------------------
// The operator, 2026-08-17: first person showed the inside of a skull, eye
// sockets and all, with no world behind it. Three separate faults had to line
// up for that, and each one below is pinned so the next merge cannot quietly
// undo them again the way the v0.30.0 merge (f07988f845) did.

describe('what the owner may see of their own body in first person', () => {
  it('hides everything that would be painted across the whole screen', () => {
    // The camera is AT the eye, so each of these is a full-viewport occluder.
    expect(firstPersonSelfMeshVisible('Ranger_Head', false)).toBe(false);
    expect(firstPersonSelfMeshVisible('Knight_HelmetVisor', false)).toBe(false);
    expect(firstPersonSelfMeshVisible('Rogue_Body', false)).toBe(false);
    expect(firstPersonSelfMeshVisible('Rogue_Cape', false)).toBe(false);
    expect(firstPersonSelfMeshVisible('Barbarian_BearHat', false)).toBe(false);
  });

  it('hides a merged or generated body, which carries no part name at all', () => {
    // A Meshy/realm body arrives as one skinned mesh under an arbitrary node
    // name, and mergeSkinnedParts produces the same shape for a stock rig built
    // without preserveFirstPersonParts. Neither reads as head OR as arm, so an
    // "unknown means keep it" rule puts the whole body on the lens.
    expect(firstPersonSelfMeshVisible('Object_2', false)).toBe(false);
    expect(firstPersonSelfMeshVisible('mesh_0', false)).toBe(false);
    expect(firstPersonSelfMeshVisible('realm_infernal_hero_demon_hunter', false)).toBe(false);
    expect(firstPersonSelfMeshVisible('', false)).toBe(false);
  });

  it('keeps the arms and hands — the viewmodel is the point of first person', () => {
    expect(firstPersonSelfMeshVisible('Ranger_ArmLeft', false)).toBe(true);
    expect(firstPersonSelfMeshVisible('Ranger_ArmRight', false)).toBe(true);
    expect(firstPersonSelfMeshVisible('Knight_Hand_L', false)).toBe(true);
    expect(firstPersonSelfMeshVisible('Druid_LegRight', false)).toBe(true);
  });

  it('keeps an attached prop whatever it is called', () => {
    // attachProp tags every mesh it clones. Reading that tag is what keeps the
    // held weapon out of reach of any rule about WHO is allowed to hold one
    // (held_props_policy.ts), and out of reach of a prop whose name happens to
    // read like a head.
    expect(firstPersonSelfMeshVisible('1H_Crossbow', true)).toBe(true);
    expect(firstPersonSelfMeshVisible('Skull_Totem_Head', true)).toBe(true);
    // ...and the same prop NOT flagged is just an unknown mesh: hidden.
    expect(firstPersonSelfMeshVisible('1H_Crossbow', false)).toBe(false);
  });
});

describe('the first-person part chain is wired end to end', () => {
  // Every link below existed as source before this pin, and NONE of them ran:
  // the v0.30.0 merge dropped the one argument at the top of the chain, and the
  // rest kept compiling — comments and all — with nothing flowing through them.
  it('builds the OWNER visual with its first-person parts preserved', () => {
    expect(read('src/render/renderer.ts')).toContain(
      'preserveFirstPersonParts: e.id === this.sim.playerId',
    );
  });

  it('hands that option from the visual to the assembler', () => {
    expect(read('src/render/characters/visual.ts')).toContain(
      'preserveFirstPersonParts: this.preserveFirstPersonParts',
    );
  });

  it('lets the assembler reach mergeSkinnedParts with it', () => {
    // Without the second argument here the parts are merged into one body mesh
    // before anything can decide to keep the arms.
    expect(read('src/render/characters/assets.ts')).toContain('optimizedScene(def.url, opts)');
  });

  it('has no translucent fallback left to hide behind', () => {
    // The 8%-opacity path made a failure look like a design choice: a head 20cm
    // from the near plane is a full-screen smear at 8% too.
    expect(read('src/render/characters/visual.ts')).not.toContain(
      'FIRST_PERSON_FALLBACK_OPACITY',
    );
  });

  it('calls the camera lock at the frame the renderer reads the pose', () => {
    // enforceDiabloLock was imported and never called from the v0.35.1 merge
    // (b37da7781a) onward, so the first-person zoom lock, the locked Diablo
    // angle and the Durance camera were all inert while still being imported.
    const main = read('src/main.ts');
    expect(main).toContain('enforceDiabloLock(input);');
    // Both frame loops, offline and online — the FPS realm is served both ways.
    expect(main.split('enforceDiabloLock(input);').length - 1).toBeGreaterThanOrEqual(2);
  });
});
