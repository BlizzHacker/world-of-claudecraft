export type HotbarAction =
  | { type: 'ability'; id: string }
  | { type: 'item'; id: string }
  | null;

export const HOTBAR_ACTION_MIME = 'application/x-woc-hotbar-action';

export function encodeHotbarAction(action: Exclude<HotbarAction, null>): string {
  return JSON.stringify(action);
}

export function parseHotbarAction(
  value: unknown,
  abilityExists: (id: string) => boolean,
  itemExists: (id: string) => boolean,
): Exclude<HotbarAction, null> | null {
  if (!value || typeof value !== 'object') return null;
  const action = value as { type?: unknown; id?: unknown };
  if (typeof action.id !== 'string') return null;
  if (action.type === 'ability' && abilityExists(action.id)) return { type: 'ability', id: action.id };
  if (action.type === 'item' && itemExists(action.id)) return { type: 'item', id: action.id };
  return null;
}

export function parseHotbarActions(
  value: unknown,
  slots: number,
  abilityExists: (id: string) => boolean,
  itemExists: (id: string) => boolean,
): HotbarAction[] {
  const seenAbilities = new Set<string>();
  return Array.from({ length: slots }, (_, i) => {
    const raw = Array.isArray(value) ? value[i] : null;
    const action = typeof raw === 'string'
      ? (abilityExists(raw) ? { type: 'ability' as const, id: raw } : null)
      : parseHotbarAction(raw, abilityExists, itemExists);
    if (action?.type === 'ability') {
      if (seenAbilities.has(action.id)) return null;
      seenAbilities.add(action.id);
    }
    return action;
  });
}

export function placeAbilityOnSlot(
  actions: readonly HotbarAction[],
  abilityId: string,
  targetIndex: number,
): HotbarAction[] {
  const next = actions.slice();
  if (targetIndex < 0 || targetIndex >= next.length) return next;
  const sourceIndex = next.findIndex((action) => action?.type === 'ability' && action.id === abilityId);
  if (sourceIndex === targetIndex) return next;
  if (sourceIndex !== -1) {
    [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
    return next;
  }
  next[targetIndex] = { type: 'ability', id: abilityId };
  return next;
}

export function clearHotbarSlot(
  actions: readonly HotbarAction[],
  targetIndex: number,
): HotbarAction[] {
  if (targetIndex < 0 || targetIndex >= actions.length) return [...actions];
  return actions.map((action, index) => index === targetIndex ? null : action);
}

export function placeItemOnSlot(
  actions: readonly HotbarAction[],
  itemId: string,
  targetIndex: number,
): HotbarAction[] {
  const next = actions.slice();
  if (targetIndex < 0 || targetIndex >= next.length) return next;
  next[targetIndex] = { type: 'item', id: itemId };
  return next;
}

export function swapHotbarSlots(
  actions: readonly HotbarAction[],
  sourceIndex: number,
  targetIndex: number,
): HotbarAction[] {
  const next = actions.slice();
  if (
    sourceIndex < 0 || sourceIndex >= next.length ||
    targetIndex < 0 || targetIndex >= next.length ||
    sourceIndex === targetIndex
  ) return next;
  [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
  return next;
}

export function syncHotbarActions(
  actions: readonly HotbarAction[],
  knownAbilityIds: readonly string[],
  autoPlaceAbilityIds: ReadonlySet<string>,
): { actions: HotbarAction[]; changed: boolean } {
  const known = new Set(knownAbilityIds);
  const next = actions.map((action) => (
    action?.type === 'ability' && !known.has(action.id) ? null : action
  ));
  let changed = next.some((action, i) => action !== actions[i]);
  for (const id of knownAbilityIds) {
    if (next.some((action) => action?.type === 'ability' && action.id === id)) continue;
    if (!autoPlaceAbilityIds.has(id)) continue;
    const empty = next.indexOf(null);
    if (empty === -1) continue;
    next[empty] = { type: 'ability', id };
    changed = true;
  }
  return { actions: next, changed };
}
