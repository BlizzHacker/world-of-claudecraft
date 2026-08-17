/** An original kept because its hashed copy is not on disk (it is the only copy). */
export interface KeptMediaOriginal {
  /** manifest key, e.g. `env/amber_sunset_2k.hdr` */
  logical: string;
  /** hashed url the manifest maps it to, e.g. `/media/env/amber_sunset_2k.<hash>.hdr` */
  hashed: string;
}

export interface MediaDuplicatePrunePlan {
  /** logical paths whose hashed copy exists, so the original is a duplicate */
  drop: string[];
  /** originals with no hashed copy on disk; these must survive */
  kept: KeptMediaOriginal[];
}

/**
 * Decide which hashed-media originals a native/OTA bundle can drop.
 * `hashedCopyExists` is the injected fs probe, called with the HASHED url.
 */
export function planMediaDuplicatePrune(
  entries: Record<string, string>,
  hashedCopyExists: (hashedUrl: string) => boolean,
): MediaDuplicatePrunePlan;

/** Absolute path of the artifact `generate` writes: src/render/assets/manifest.generated.ts. */
export const GENERATED_PATH: string;

/**
 * Hash every media file under public/{models,textures,env,vfx} and map its logical path
 * to the content-addressed url the bundle requests. This is the single source of the
 * hashing rules - the guard test compares the committed artifact through it rather than
 * re-implementing them.
 */
export function manifestEntries(): Record<string, string>;

/** The exact file body `generate` writes for those entries. */
export function renderManifest(entries: Record<string, string>): string;
