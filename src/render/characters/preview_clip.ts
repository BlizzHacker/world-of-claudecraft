const AVOID_PREVIEW_CLIP = [
  /dance/i,
  /dead|death|die|dying/i,
  /hit|injured|wound|hurt/i,
  /fall|knock/i,
  /sleep|sit/i,
];

const PREVIEW_PRIORITIES = [
  [/^idle$/i, /\bidle\b/i, /stand/i, /breath/i],
  [/walk/i, /monster_walk/i],
  [/runfast/i, /\brun\b/i, /running/i],
  [/attack/i, /slash/i, /swing/i, /counter/i, /skill/i, /cast/i],
  [/jump/i],
];

function isAvoidedPreviewClip(name: string): boolean {
  return AVOID_PREVIEW_CLIP.some((pattern) => pattern.test(name));
}

export function chooseExternalPreviewClipName(names: readonly string[]): string | null {
  if (!names.length) return null;
  const clean = names.filter((name) => !isAvoidedPreviewClip(name));
  const candidates = clean.length ? clean : [...names];
  for (const group of PREVIEW_PRIORITIES) {
    const hit = candidates.find((name) => group.some((pattern) => pattern.test(name)));
    if (hit) return hit;
  }
  return candidates[0] ?? null;
}
