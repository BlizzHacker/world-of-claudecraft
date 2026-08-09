// Shapes for automatic per-realm world decoration.
//
// Split out from realm_decor.ts so the GENERATED catalogue
// (realm_decor.generated.ts, emitted by scripts/realm_assets/emit_decor.mjs) can
// type its rows without importing the solver that consumes it.

/** What a store asset reads as when it is standing in a world. */
export type RealmDecorRole =
  | 'structure'
  | 'monument'
  | 'flora'
  | 'camp'
  | 'vehicle'
  | 'ship'
  | 'mech'
  | 'turret';

/** One catalogue row: a shipped GLB plus everything the placer needs to budget
 *  and scale it WITHOUT loading the file. */
export interface RealmDecorAsset {
  /** `realm:<realm>/<bucket>/<file>` — the same place key the world builder
   *  stores and src/render/remote_prop.ts resolves to a /cr-realms URL. */
  readonly key: string;
  readonly role: RealmDecorRole;
  /** Measured triangle count (glTF accessor counts, not an estimate). */
  readonly tris: number;
  /** GLB size in KiB — the download the client pays for this asset. */
  readonly kb: number;
  /** longest axis / height. Converts a wanted world height into the renderer's
   *  longest-axis normalization factor. */
  readonly aspect: number;
  /** horizontal half-extent per unit of height: clear radius = foot * height. */
  readonly foot: number;
}

/** A decoration the world should show, in world space. Pure data: no GLB is
 *  touched to produce one, so the sim can compute these headlessly. */
export interface RealmDecorPlacement {
  readonly key: string;
  readonly role: RealmDecorRole;
  readonly x: number;
  readonly z: number;
  /** Yaw in radians. */
  readonly rotY: number;
  /** Multiplier against the renderer's longest-axis normalization. */
  readonly scale: number;
  /** Intended world height in yards (what `scale` was solved for). */
  readonly height: number;
  /** Horizontal half-extent in yards, used for clearance and spacing. */
  readonly radius: number;
  readonly tris: number;
  readonly kb: number;
}

/** Per-graphics-tier ceilings. The placement LIST is tier-independent; a budget
 *  only ever takes a prefix-with-filter of it, so a low-tier client sees a
 *  subset of the same world, never a different one. */
export interface RealmDecorBudget {
  readonly maxInstances: number;
  readonly maxTriangles: number;
  readonly maxKilobytes: number;
  /** Drop any single asset heavier than this (the store has 1.3M-triangle rows). */
  readonly maxAssetTriangles: number;
  readonly maxAssetKilobytes: number;
}
