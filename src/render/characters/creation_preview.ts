import type { RealmId } from '../../sim/realms/types';
import type { PlayerClass } from '../../sim/types';
import type { ArmorLoadout, ModularAppearance } from './modular';
import type { PreviewAppearance } from './preview_appearance';

export interface CreationPreviewTarget {
  setAppearance(appearance: PreviewAppearance): void;
  setModular(
    appearance: ModularAppearance,
    worn: ArmorLoadout,
    cls: PlayerClass,
    weaponItemId?: string | null,
    offhandItemId?: string | null,
  ): void;
}

export interface CreationPreviewRequest {
  realmId: RealmId;
  cls: PlayerClass;
  visualKey: string | null | undefined;
  modularAppearance: ModularAppearance;
  worn: ArmorLoadout;
  mainhandItemId?: string | null;
  offhandItemId?: string | null;
}

/** Only the pristine upstream realm owns the modular KayKit creator. */
export function creationUsesModularBody(realmId: RealmId): boolean {
  return realmId === 'claudecraft';
}

/**
 * Apply one character-creation body without allowing a themed realm to fall
 * through to `player_<class>`. Returns false when authored realm data is
 * missing; callers keep the previous authored body visible and surface the
 * content error instead of silently mounting KayKit.
 */
export function applyCreationPreview(
  target: CreationPreviewTarget,
  request: CreationPreviewRequest,
): boolean {
  if (creationUsesModularBody(request.realmId)) {
    target.setModular(
      request.modularAppearance,
      request.worn,
      request.cls,
      request.mainhandItemId,
      request.offhandItemId,
    );
    return true;
  }

  const visualKey = request.visualKey;
  if (!visualKey || visualKey.startsWith('player_')) return false;
  target.setAppearance({
    visualKey,
    cls: request.cls,
    skin: 0,
    skinCatalog: 'class',
    mainhandItemId: request.mainhandItemId ?? null,
    offhandItemId: request.offhandItemId ?? null,
  });
  return true;
}
