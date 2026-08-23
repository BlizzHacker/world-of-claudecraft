// Hand-written declarations for private_api_guard.mjs (imported by the
// type-checked tests/facebook_bundle.test.ts; see scripts/CLAUDE.md).
export declare const FBINSTANT_PUBLIC_API: Set<string>;
export interface FacebookGlobalToken {
  kind: 'FB' | 'FBInstant';
  member: string | null;
  index: number;
}
export declare function findFacebookGlobalTokens(text: string): FacebookGlobalToken[];
export declare function auditFacebookSurface(text: string, name?: string): string[];
export declare function sanitizeFacebookCollisions(code: string, filename?: string): string;
