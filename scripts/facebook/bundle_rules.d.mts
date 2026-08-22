// Hand-written declarations for bundle_rules.mjs (scripts/ convention: a module
// imported by a type-checked Vitest suite carries a .d.mts next to the .mjs).

export declare const MAX_BUNDLE_BYTES: number;
export declare const RECOMMENDED_INITIAL_BUNDLE_BYTES: number;
export declare const FBINSTANT_SDK_URL: string;
export declare const REQUIRED_ROOT_FILES: readonly string[];

export declare function validateFbappConfig(config: unknown): string[];
export declare function validateEntryHtml(html: string): string[];
export declare function validateBundleEntryNames(names: string[]): string[];
export declare function evaluateBundleSize(totalBytes: number): {
  errors: string[];
  warnings: string[];
};
