import { describe, expect, it } from 'vitest';
import { firstPersonMeshRole, shouldPreserveFirstPersonMeshPart } from '../src/render/characters/first_person_parts';

describe('first-person character mesh roles', () => {
  it('hides head and torso parts that block the FPS camera', () => {
    expect(firstPersonMeshRole('Knight_Head')).toBe('hide');
    expect(firstPersonMeshRole('Knight_HelmetVisor')).toBe('hide');
    expect(firstPersonMeshRole('Mage_Hat')).toBe('hide');
    expect(firstPersonMeshRole('Rogue_Body')).toBe('hide');
    expect(firstPersonMeshRole('Rogue_Cape')).toBe('hide');
  });

  it('keeps appendages visible for first-person combat animation reads', () => {
    expect(firstPersonMeshRole('Knight_ArmLeft')).toBe('keep');
    expect(firstPersonMeshRole('Knight_ArmRight')).toBe('keep');
    expect(firstPersonMeshRole('Druid_LegLeft')).toBe('keep');
    expect(firstPersonMeshRole('Druid_LegRight')).toBe('keep');
  });

  it('leaves weapon attachments out of the body-part mask', () => {
    expect(firstPersonMeshRole('1H_Sword')).toBe('other');
    expect(shouldPreserveFirstPersonMeshPart('Ranger_Head')).toBe(true);
    expect(shouldPreserveFirstPersonMeshPart('1H_Crossbow')).toBe(false);
  });
});
