export type FirstPersonMeshRole = 'hide' | 'keep' | 'other';

function normalizedMeshName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function firstPersonMeshRole(name: string): FirstPersonMeshRole {
  const n = normalizedMeshName(name);
  if (!n) return 'other';
  if (
    n.includes('head')
    || n.includes('helmet')
    || n.includes('visor')
    || n.includes('face')
    || n.includes('mask')
    || n.includes('hood')
    || n.includes('hat')
    || n.includes('hair')
    || n.includes('beard')
    || n.includes('brow')
    || n.includes('eye')
    || n.includes('horn')
    || n.includes('crown')
    || n.includes('cape')
    || n.endsWith('body')
    || n.includes('bodymerged')
  ) {
    return 'hide';
  }
  if (
    n.includes('armleft')
    || n.includes('armright')
    || n.includes('leftarm')
    || n.includes('rightarm')
    || n.includes('legleft')
    || n.includes('legright')
    || n.includes('leftleg')
    || n.includes('rightleg')
    || n.includes('hand')
    || n.includes('foot')
    || n.includes('toe')
  ) {
    return 'keep';
  }
  return 'other';
}

export function shouldPreserveFirstPersonMeshPart(name: string): boolean {
  return firstPersonMeshRole(name) !== 'other';
}

/**
 * May the OWNER see this mesh of their OWN character, from inside their own
 * head?
 *
 * Deny-by-default, and that direction is the whole point. The camera in first
 * person sits at the eye, so ANY mesh this returns true for that is not an arm,
 * a hand or a held weapon is a mesh painted across the entire screen. That is
 * exactly what the operator photographed on 2026-08-17: a skull filling the
 * viewport, eye sockets read from the inside.
 *
 * Two things survive:
 *
 *   - `keep` parts (arms, hands, legs, feet) — the first-person VIEWMODEL. They
 *     are only separable when the rig was assembled with
 *     preserveFirstPersonParts, otherwise mergeSkinnedParts has already folded
 *     them into one body mesh and the whole body goes.
 *   - attached props, flagged by attachProp with `weaponMesh`. The weapon in
 *     your own hands is the one thing a shooter must never hide, and reading
 *     the socket's own tag means no policy about WHO may hold something (see
 *     held_props_policy.ts) can take the viewmodel away by accident.
 *
 * Everything else — head, hair, helm, torso, cape, and any merged or generated
 * body whose single mesh carries no part name at all — is hidden outright. An
 * earlier version faded those to 8% opacity instead; a head 20 cm from the near
 * plane is a full-screen smear at 8% too, so translucency was never a fallback,
 * only a quieter failure.
 */
export function firstPersonSelfMeshVisible(name: string, isAttachedProp: boolean): boolean {
  if (isAttachedProp) return true;
  return firstPersonMeshRole(name) === 'keep';
}
