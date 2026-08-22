export interface RealmAssetCandidate {
  realmId: string;
  sourceName: string;
  outputName?: string;
  sourcePath?: string;
  [key: string]: unknown;
}

export const RETIRED_INFERNAL_CLASS_FILES: ReadonlySet<string>;
export const PERMANENTLY_REJECTED_REALM_BODY_FILES: ReadonlySet<string>;
export const REJECTED_REALM_BODY_KEYS: ReadonlySet<string>;
export const PERMANENTLY_REJECTED_REALM_BODY_KEYS: ReadonlySet<string>;
export const PERMANENTLY_REJECTED_REALM_BODY_SOURCE_IDS: ReadonlySet<string>;
export function isPermanentlyRejectedRealmBodyFile(value: unknown): boolean;
export function isPermanentlyRejectedRealmBodyKey(value: unknown): boolean;
export function hasPermanentlyRejectedRealmBodySourceId(value: unknown): boolean;
export function isPublishableRealmAssetCandidate(candidate: RealmAssetCandidate): boolean;
export function publishableRealmAssetCandidates<T extends RealmAssetCandidate>(
  candidates: readonly T[],
): T[];
