import { existsSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VISUALS, type VisualDef } from '../src/render/characters/manifest';
import { BODY_SKINS, type BodySkinDef } from '../src/sim/cosmetics/body_skins';
import { isPermanentlyRejectedRealmBodyFile } from './realm_assets/catalog_policy.mjs';

const REALM_URL_PREFIX = '/cr-realms/';

export interface RuntimeRealmAssetReference {
  url: string;
  owners: string[];
}

export interface RuntimeRealmAssetFailure extends RuntimeRealmAssetReference {
  path: string;
  reason: 'outside-root' | 'missing' | 'empty' | 'rejected';
}

/**
 * Enumerate every compiled realm-store file reachable by the character runtime.
 * This deliberately does not use manifestUrls(): lazy bodies are still reachable
 * after world entry and therefore must be present in the release asset store.
 */
export function collectRuntimeRealmAssetReferences(
  visuals: Readonly<Record<string, VisualDef>>,
  bodySkins: readonly BodySkinDef[],
): RuntimeRealmAssetReference[] {
  const ownersByUrl = new Map<string, Set<string>>();
  const add = (url: string | null | undefined, owner: string): void => {
    if (!url?.startsWith(REALM_URL_PREFIX)) return;
    const owners = ownersByUrl.get(url) ?? new Set<string>();
    owners.add(owner);
    ownersByUrl.set(url, owners);
  };

  for (const [key, visual] of Object.entries(visuals)) {
    add(visual.url, `visual:${key}:model`);
    for (const url of visual.animUrls ?? []) add(url, `visual:${key}:animation`);
    for (const attachment of visual.attach ?? []) add(attachment.url, `visual:${key}:attachment`);
  }

  for (const skin of bodySkins) {
    for (const [cls, url] of Object.entries(skin.bodies)) add(url, `body-skin:${skin.id}:${cls}`);
  }

  return [...ownersByUrl.entries()]
    .map(([url, owners]) => ({ url, owners: [...owners].sort() }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

export function checkRuntimeRealmAssets(
  assetRoot: string,
  references: readonly RuntimeRealmAssetReference[],
): RuntimeRealmAssetFailure[] {
  const root = resolve(assetRoot);
  const rootPrefix = `${root}${sep}`;
  const failures: RuntimeRealmAssetFailure[] = [];

  for (const reference of references) {
    const storeRelative = reference.url.slice(REALM_URL_PREFIX.length);
    const path = resolve(root, storeRelative);
    let reason: RuntimeRealmAssetFailure['reason'] | null = null;
    if (path !== root && !path.startsWith(rootPrefix)) reason = 'outside-root';
    else if (isPermanentlyRejectedRealmBodyFile(storeRelative)) reason = 'rejected';
    else if (!existsSync(path)) reason = 'missing';
    else if (!statSync(path).isFile() || statSync(path).size === 0) reason = 'empty';
    if (reason) failures.push({ ...reference, path, reason });
  }

  return failures;
}

function parseAssetRoot(args: readonly string[]): string {
  const index = args.indexOf('--root');
  if (index >= 0 && args[index + 1]) return resolve(args[index + 1]);
  if (process.env.CR_REALMS_STORE) return resolve(process.env.CR_REALMS_STORE);
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  return resolve(repositoryRoot, 'public/cr-realms');
}

export function runRuntimeRealmAssetCheck(args: readonly string[] = process.argv.slice(2)): number {
  const root = parseAssetRoot(args);
  const references = collectRuntimeRealmAssetReferences(VISUALS, BODY_SKINS);
  const failures = checkRuntimeRealmAssets(root, references);
  const relativeRoot = relative(process.cwd(), root) || '.';

  if (failures.length === 0) {
    console.log(`Runtime realm assets: PASS (${references.length} files in ${relativeRoot})`);
    return 0;
  }

  console.error(
    `Runtime realm assets: FAIL (${failures.length}/${references.length} invalid in ${relativeRoot})`,
  );
  const visibleFailures = args.includes('--all') ? failures : failures.slice(0, 50);
  for (const failure of visibleFailures) {
    console.error(`- ${failure.reason}: ${failure.url} (${failure.owners.join(', ')})`);
  }
  if (visibleFailures.length < failures.length) {
    console.error(
      `- ... ${failures.length - visibleFailures.length} more (pass --all to print every failure)`,
    );
  }
  return 1;
}

const entryPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (entryPath === import.meta.url) process.exitCode = runRuntimeRealmAssetCheck();
