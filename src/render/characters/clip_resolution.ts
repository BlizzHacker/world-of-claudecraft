import type { ClipMap } from './manifest';

type ClipRole = 'idle' | 'walk' | 'run' | 'attack' | 'hit' | 'cast' | 'death' | 'sitDown';

const ROLE_PATTERNS: Record<ClipRole, readonly RegExp[]> = {
  // Idle tries names that BEGIN with "idle" before the loose substring match.
  // The shared Meshy clip bank carries no clip literally named "Idle" - its
  // standing idles are Idle_Alt_A / Idle_Alt_B at the very END of the bank -
  // while Jump_Idle, Lie_Idle and Sit_Floor_Idle all contain the substring and
  // sit EARLIER in the merged inventory. The loose /idle/ therefore resolved
  // Idle for the Walk/Run-only Meshy bodies (2026-08-16 wave) to Jump_Idle:
  // the airborne jump loop, a character "standing" in a skydiver lean. The
  // loose match stays as a late fallback so nothing that used to resolve
  // stops resolving.
  idle: [/^idle/i, /stand/i, /breath/i, /idle/i, /walk/i],
  walk: [/walk/i, /stroll/i, /move/i],
  run: [/run/i, /gallop/i, /sprint/i, /fast/i, /walk/i],
  attack: [/attack/i, /slash/i, /strike/i, /swing/i, /chop/i, /punch/i, /skill/i, /cast/i],
  hit: [/hit/i, /hurt/i, /damage/i, /react/i, /flinch/i, /attack/i, /slash/i, /strike/i],
  cast: [/cast/i, /spell/i, /magic/i, /skill/i, /spin/i, /combo/i, /attack/i],
  death: [/death/i, /dead/i, /die/i, /dying/i, /fall/i, /attack/i],
  // Scoped-remap only (resolveClipMapScoped): a body whose authored sit clip
  // misses the merged inventory degrades to its own sit-flavored take. Kept
  // deliberately sit-shaped, no generic verbs, so a body with no sit take
  // simply keeps its unresolvable name (baseAction falls through to idle).
  sitDown: [/sit.*down/i, /^sit/i, /sit/i, /crouch/i],
};

function choose(
  requested: readonly string[] | string | undefined,
  available: readonly string[],
  role: ClipRole,
): string | null {
  const names = typeof requested === 'string' ? [requested] : (requested ?? []);
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
/** A picked rotation clip plus the index the caller stores for the next swing. */
export interface RotationClipPick {
  name: string;
  nextIdx: number;
}

/**
 * The attack-rotation pick: the first RESOLVABLE clip at or after `startIdx`,
 * wrapping around the rotation. playAttack/playWhirl used to take
 * `clips[attackIdx++ % clips.length]` and playOneShot silently no-ops on a
 * name with no bound action, so an unresolvable entry consumed a DEAD SLOT:
 * one whole swing showed no animation every time the rotation passed it. The
 * pick skips such entries and advances the index PAST the chosen slot, so the
 * rotation still visits every resolvable clip in order. Returns null when
 * nothing in the rotation resolves (the caller keeps its index and shows no
 * one-shot, exactly the old all-dead behavior).
 */
export function nextResolvableClip(
  clips: readonly string[],
  startIdx: number,
  isResolvable: (name: string) => boolean,
): RotationClipPick | null {
  if (clips.length === 0) return null;
  const start = ((startIdx % clips.length) + clips.length) % clips.length;
  for (let step = 0; step < clips.length; step++) {
    const name = clips[(start + step) % clips.length];
    if (isResolvable(name)) return { name, nextIdx: startIdx + step + 1 };
  }
  return null;
}

/** The fields the scoped remap below is allowed to touch. */
export type ScopedClipField = 'death' | 'sitDown';

/** mob_yumi_cat and its kin park required fields on this sentinel on purpose
 *  (a single-clip objective prop whose death is a deliberate freeze); the
 *  scoped remap must never "repair" it onto the one real clip. */
const SENTINEL_CLIP_NAME = 'None';

/** Pattern-only choose: like choose() but WITHOUT the available[0] catch-all.
 *  The scoped remap degrades to a take that plausibly fits the role or leaves
 *  the field alone; grabbing an arbitrary first clip is how a sit turned into
 *  a walk loop. */
function chooseScoped(available: readonly string[], role: ClipRole): string | null {
  for (const pattern of ROLE_PATTERNS[role]) {
    const match = available.find((name) => pattern.test(name));
    if (match) return match;
  }
  return null;
}

/**
 * Scoped remap for a non-autoClip def at load time: when the authored `death`
 * or `sitDown` name is missing from the GLB's merged clip inventory, resolve
 * ONLY that field against the inventory so death and sit degrade to the
 * body's own takes. Everything else stays byte-identical on purpose: the loose
 * role patterns are what resolved Jump_Idle as an idle once (see the note atop
 * ROLE_PATTERNS), so the blast radius here is exactly the fields that were
 * already dead. Returns the remapped ClipMap, or null when nothing changed.
 */
export function resolveClipMapScoped(
  def: ClipMap,
  available: readonly string[],
  fields: readonly ScopedClipField[],
): ClipMap | null {
  let out: ClipMap | null = null;
  for (const field of fields) {
    const name = def[field];
    if (!name || name === SENTINEL_CLIP_NAME || available.includes(name)) continue;
    const pick = chooseScoped(available, field === 'death' ? 'death' : 'sitDown');
    if (!pick) continue;
    out ??= { ...def };
    out[field] = pick;
  }
  return out;
}

export function resolveClipMap(def: ClipMap, available: readonly string[]): ClipMap {
  const idle = choose(def.idle, available, 'idle') ?? def.idle;
  const walk = choose(def.walk, available, 'walk') ?? idle;
  const run = choose(def.run, available, 'run') ?? walk;
  const attack = (def.attack.length ? def.attack : [def.cast ?? run])
    .map((name) => choose(name, available, 'attack'))
    .filter((name): name is string => name !== null);
  const hit = def.hit
    ? def.hit
        .map((name) => choose(name, available, 'hit'))
        .filter((name): name is string => name !== null)
    : undefined;
  const cast = def.cast ? (choose(def.cast, available, 'cast') ?? idle) : undefined;
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
