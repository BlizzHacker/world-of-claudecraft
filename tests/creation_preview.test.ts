import { describe, expect, it, vi } from 'vitest';
import {
  applyCreationPreview,
  type CreationPreviewTarget,
  creationUsesModularBody,
} from '../src/render/characters/creation_preview';
import { normalizeAppearance } from '../src/render/characters/modular';
import { realmClassVisualKey } from '../src/sim/realms/class_visuals';
import type { RealmId } from '../src/sim/realms/types';
import type { PlayerClass } from '../src/sim/types';

const THEMED_REALMS: readonly RealmId[] = [
  'crypticrealm',
  'infernal',
  'classic',
  'dominion',
  'arcane',
  'arcadevoid',
  'fps',
];

const CLASSES: readonly PlayerClass[] = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'shaman',
  'mage',
  'warlock',
  'druid',
];

function target() {
  return {
    setAppearance: vi.fn<CreationPreviewTarget['setAppearance']>(),
    setModular: vi.fn<CreationPreviewTarget['setModular']>(),
  };
}

describe('creation preview body routing', () => {
  it('uses authored bodies for every class in every themed realm', () => {
    const modular = normalizeAppearance(null);
    for (const realmId of THEMED_REALMS) {
      expect(creationUsesModularBody(realmId), realmId).toBe(false);
      for (const cls of CLASSES) {
        const preview = target();
        const visualKey = realmClassVisualKey(realmId, cls);
        expect(
          applyCreationPreview(preview, {
            realmId,
            cls,
            visualKey,
            modularAppearance: modular,
            worn: {},
          }),
          `${realmId}:${cls}`,
        ).toBe(true);
        expect(preview.setAppearance, `${realmId}:${cls}`).toHaveBeenCalledWith(
          expect.objectContaining({ cls, visualKey }),
        );
        expect(preview.setModular, `${realmId}:${cls}`).not.toHaveBeenCalled();
      }
    }
  });

  it('keeps the upstream appearance customizer exclusive to Claudecraft', () => {
    const preview = target();
    const modular = normalizeAppearance(null);
    expect(creationUsesModularBody('claudecraft')).toBe(true);
    expect(
      applyCreationPreview(preview, {
        realmId: 'claudecraft',
        cls: 'rogue',
        visualKey: null,
        modularAppearance: modular,
        worn: {},
      }),
    ).toBe(true);
    expect(preview.setModular).toHaveBeenCalledOnce();
    expect(preview.setAppearance).not.toHaveBeenCalled();
  });

  it('never falls back to KayKit when a themed realm mapping is missing', () => {
    const preview = target();
    expect(
      applyCreationPreview(preview, {
        realmId: 'fps',
        cls: 'warrior',
        visualKey: null,
        modularAppearance: normalizeAppearance(null),
        worn: {},
      }),
    ).toBe(false);
    expect(preview.setAppearance).not.toHaveBeenCalled();
    expect(preview.setModular).not.toHaveBeenCalled();
  });
});
