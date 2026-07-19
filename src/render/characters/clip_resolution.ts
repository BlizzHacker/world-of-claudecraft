import type { ClipMap } from './manifest';

type ClipRole = 'idle' | 'walk' | 'run' | 'attack' | 'hit' | 'cast' | 'death';

const ROLE_PATTERNS: Record<ClipRole, readonly RegExp[]> = {
  idle: [/idle/i, /stand/i, /breath/i, /walk/i],
  walk: [/walk/i, /stroll/i, /move/i],
  run: [/run/i, /gallop/i, /sprint/i, /fast/i, /walk/i],
  attack: [/attack/i, /slash/i, /strike/i, /swing/i, /chop/i, /punch/i, /skill/i, /cast/i],
  hit: [/hit/i, /hurt/i, /damage/i, /react/i, /flinch/i, /attack/i, /slash/i, /strike/i],
  cast: [/cast/i, /spell/i, /magic/i, /skill/i, /spin/i, /combo/i, /attack/i],
  death: [/death/i, /dead/i, /die/i, /dying/i, /fall/i, /attack/i],
};

function choose(
  requested: readonly string[] | string | undefined,
  available: readonly string[],
  role: ClipRole,
): string | null {
  const names = typeof requested === 'string' ? [requested] : requested ?? [];
  const exact = names.find((name) => available.includes(name));
  if (exact) return exact;
  for (const pattern of ROLE_PATTERNS[role]) {
    const match = available.find((name) => pattern.test(name));
    if (match) return match;
  }
  return available[0] ?? null;
}

/** Resolve a manifest's authored clip aliases against the clips actually present
 * in a GLB. Meshy exports vary wildly in naming; this keeps every replacement
 * responsive instead of silently losing attack, cast, hit, or death animation. */
export function resolveClipMap(def: ClipMap, available: readonly string[]): ClipMap {
  const idle = choose(def.idle, available, 'idle') ?? def.idle;
  const walk = choose(def.walk, available, 'walk') ?? idle;
  const run = choose(def.run, available, 'run') ?? walk;
  const attack = (def.attack.length ? def.attack : [def.cast ?? run])
    .map((name) => choose(name, available, 'attack'))
    .filter((name): name is string => name !== null);
  const hit = def.hit
    ? def.hit.map((name) => choose(name, available, 'hit')).filter((name): name is string => name !== null)
    : undefined;
  const cast = def.cast ? choose(def.cast, available, 'cast') ?? idle : undefined;
  const death = choose(def.death, available, 'death') ?? idle;
  return {
    ...def,
    idle,
    walk,
    run,
    attack: [...new Set(attack.length ? attack : [run])],
    hit: hit?.length ? [...new Set(hit)] : hit,
    cast,
    death,
  };
}
