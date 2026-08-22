import { describe, expect, it } from 'vitest';
import {
  checkRuntimeRealmAssets,
  collectRuntimeRealmAssetReferences,
} from '../scripts/check_runtime_realm_assets';
import { VISUALS, type VisualDef } from '../src/render/characters/manifest';
import { BODY_SKINS } from '../src/sim/cosmetics/body_skins';

describe('runtime realm asset release check', () => {
  it('includes models, layered animations, attachments, lazy bodies, and body-skin art', () => {
    const visuals: Record<string, VisualDef> = {
      example: {
        url: '/cr-realms/infernal/body.glb',
        animUrls: ['/cr-realms/shared/actions.glb', 'models/local-actions.glb'],
        attach: [{ url: '/cr-realms/infernal/sword.glb', bone: 'hand.r' }],
        height: 2,
        lazyPreload: true,
        clips: { idle: 'Idle', walk: 'Walk', run: 'Run', attack: ['Attack'], death: 'Death' },
      },
    };
    const bodySkins = [
      {
        id: 'test',
        tier: 'unlocked',
        faction: 'heavenly',
        i18nKey: 'test',
        claimsBaseBodies: false,
        bodies: { warrior: '/cr-realms/infernal/skin.glb' },
      },
    ] as const;

    expect(
      collectRuntimeRealmAssetReferences(visuals, bodySkins).map((entry) => entry.url),
    ).toEqual([
      '/cr-realms/infernal/body.glb',
      '/cr-realms/infernal/skin.glb',
      '/cr-realms/infernal/sword.glb',
      '/cr-realms/shared/actions.glb',
    ]);
  });

  it('keeps every permanently rejected body out of the compiled runtime graph', () => {
    const references = collectRuntimeRealmAssetReferences(VISUALS, BODY_SKINS);
    expect(
      checkRuntimeRealmAssets('public/cr-realms', references).filter(
        (row) => row.reason === 'rejected',
      ),
    ).toEqual([]);
  });
});
