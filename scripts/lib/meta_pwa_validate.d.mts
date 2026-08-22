// Hand-written types for meta_pwa_validate.mjs (scripts/ convention: a module
// imported by a type-checked Vitest suite carries a .d.mts next to the .mjs).

export interface ManifestIcon {
  src?: string;
  sizes?: string;
  type?: string;
  purpose?: string;
}

export interface WebManifestLike {
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  orientation?: string;
  id?: string;
  theme_color?: string;
  background_color?: string;
  icons?: ManifestIcon[];
  additional_trusted_origins?: string[];
  [key: string]: unknown;
}

export interface TwaManifestLike {
  packageId?: string;
  host?: string;
  isMetaQuest?: boolean;
  webManifestUrl?: string;
  appVersionName?: string;
  appVersionCode?: number;
  orientation?: string;
  signingKey?: { path?: string; alias?: string };
  [key: string]: unknown;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export declare const META_MIN_ICON_PX: number;

export declare function iconMaxEdge(icon: ManifestIcon | null | undefined): number;

export declare function validateMetaPwaManifest(
  manifest: unknown,
  opts?: { expectedTrustedOrigins?: string[] },
): ValidationResult;

export declare function androidVersionCode(version: string): number;

export declare function crossCheckTwaManifest(
  twa: unknown,
  opts: {
    webManifest?: WebManifestLike | null;
    expectedPackageId: string;
    expectedVersionName?: string;
  },
): ValidationResult;
