// Hand-written declarations for shell_inject.mjs (imported by the type-checked
// tests/facebook_bundle.test.ts; see scripts/CLAUDE.md).
export declare const FBINSTANT_SDK_URL: string;
export declare const FACEBOOK_CONTEXT_STORAGE_KEY: string;
export declare const FACEBOOK_PROGRESS_EVENT: string;
export declare const FACEBOOK_READY_EVENT: string;
export declare const DEFAULT_GAME_ORIGIN: string;
export interface BundledArt {
  urlPath: string;
  bundleName: string;
  sourceFile: string;
}
export declare const BUNDLED_ART: BundledArt[];
export declare const LOCAL_ART_PATHS: string[];
export declare function bundledArtName(urlPath: string): string | null;
export declare function buildShellScripts(): string;
export declare function injectFacebookShell(html: string): string;
export declare function stripTurnstileScript(html: string): string;
export declare function rewriteRootRelativeHtml(html: string, origin?: string): string;
export declare function rewriteCssUrls(css: string, origin?: string, localPrefix?: string): string;
export declare function validateShellWiring(html: string): string[];
