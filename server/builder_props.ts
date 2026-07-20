// Server-owned mirror of src/render/props.ts. The parity test catches additions without
// importing browser/render code into the authoritative server bundle.
const NATIVE_PROP_KEYS = new Set([
  'house1',
  'house2',
  'house3',
  'blacksmith',
  'inn',
  'bellTower',
  'well',
  'stand1',
  'stand2',
  'cart',
  'fence',
  'bonfire',
  'oreRocks',
  'tentOpen',
  'tentSmall',
  'rockTallA',
  'rockTallH',
  'rockLargeD',
  'rockLargeF',
  'mushroomRed',
  'mushroomTan',
  'column',
  'columnBroken',
  'statueHead',
  'statueBlock',
  'dockPlatform',
  'rowboat',
  'graveRound',
  'graveCross',
  'graveBevel',
  'graveDecor',
  'timberPillar',
  'crateWooden',
  'farmCrate',
  'barrel',
  'anvil',
  'weaponStand',
  'lanternWall',
  'delveEntrance2',
]);

const MAX_PROP_KEY_LENGTH = 128;
const MAX_FORGED_SEGMENT_LENGTH = 64;
const FORGED_SEGMENT_RE = /^[A-Za-z0-9_.-]+$/;
const LIBRARY_PROP_RE = /^library:[a-z0-9][a-z0-9_-]{0,31}\/[a-f0-9]{24}$/;

function isSafeForgedSegment(segment: string): boolean {
  return (
    segment.length > 0 &&
    segment.length <= MAX_FORGED_SEGMENT_LENGTH &&
    FORGED_SEGMENT_RE.test(segment) &&
    segment !== '.' &&
    !segment.includes('..')
  );
}

/** Validate the complete set of asset references accepted from world-builder clients. */
export function isValidBuilderPropKey(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_PROP_KEY_LENGTH) {
    return false;
  }
  if (NATIVE_PROP_KEYS.has(value)) return true;
  if (LIBRARY_PROP_RE.test(value)) return true;
  if (!value.startsWith('forged:')) return false;

  const segments = value.slice('forged:'.length).split('/');
  return segments.length >= 1 && segments.length <= 2 && segments.every(isSafeForgedSegment);
}
