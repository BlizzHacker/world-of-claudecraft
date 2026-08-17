// Revisioned, realm-scoped body assignments shared by the in-game editor and
// arcforge.moveweight.com. Editors write a draft; content publishers explicitly
// promote it; every game client reads only the published snapshot. This module
// never touches character state, housing rows, maps, or world geometry.

import type http from 'node:http';
import { CLASSES, MOBS, NPCS } from '../src/sim/data';
import { factionForRealmClass } from '../src/sim/realms/factions';
import type { RealmId } from '../src/sim/realms/types';
import { infernalCharacterSelectionsForRealm } from '../src/sim/realms/infernal_classes';
import { ALL_CLASSES } from '../src/sim/types';
import type { AdminPermission } from './admin_permissions';
import { permissionsForRoles } from './admin_permissions';
import { accountForAuthentikAccessToken } from './authentik_access_token';
import { accountAndScopeForToken } from './db';
import { ctxAccountId } from './http/context';
import { HttpError } from './http/errors';
import { bearerToken } from './http/middleware/bearer_active_guard';
import { withBody } from './http/middleware/body';
import type { Ctx, Middleware, RouteDef } from './http/types';
import { json, readBody } from './http_util';
import { loadRealmVisualsState, mutateRealmVisualsState } from './realm_visuals_db';
import { adminRolesForAccount } from './staff_db';

const REALM_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
// The optional :f / :m tail is the sex dimension (2026-08-16): class:mage:f
// selects the female realm body; the unsuffixed key stays the default so
// realms without pairs keep working unchanged.
// `skin:<skinId>:<class>` is the tiered-appearance arm (src/sim/cosmetics/body_skins.ts):
// it lets a realm publish its OWN art for an unlocked or paid skin family without a
// deploy, the same way class/hero rows work. Narrower than the others on purpose -
// both halves are compiled identifiers, not display names - so a typo cannot land a
// row that nothing will ever read.
const OVERRIDE_KEY_RE =
  /^(?:(?:class|hero|npc|mob):[A-Za-z0-9][A-Za-z0-9 _/'.-]{0,79}|skin:[a-z0-9_]{1,32}:[a-z_]{1,24})(:[fm])?$/;
const ASSET_URL_RE =
  /^\/(cr-realms|asset-library|forged|models|api\/assets)\/[A-Za-z0-9 _.()/'-]+\.glb$/;
const MAX_OVERRIDES = 500;
const MAX_NAME_LEN = 80;
const MAX_SNAPSHOTS = 24;
const MAX_AUDIT_EVENTS = 120;
const MAX_BODY_BYTES = 8 * 1024;
const EPOCH = new Date(0).toISOString();

export interface RealmVisualOverride {
  assetUrl: string;
  assetName?: string;
  updatedAt: string;
  updatedBy: number;
}

export type RealmVisualOverrideMap = Record<string, RealmVisualOverride>;

export interface RealmVisualSnapshot {
  revision: number;
  overrides: RealmVisualOverrideMap;
  publishedAt: string;
  publishedBy: number;
  action: 'publish' | 'rollback' | 'legacy-import';
  sourceRevision?: number;
}

export interface RealmVisualAuditEvent {
  action: 'upsert' | 'delete' | 'publish' | 'rollback';
  actorAccountId: number;
  at: string;
  draftRevision: number;
  publishedRevision: number;
  key?: string;
  sourceRevision?: number;
}

export interface RealmVisualsState {
  draftRevision: number;
  publishedRevision: number;
  draftOverrides: RealmVisualOverrideMap;
  publishedOverrides: RealmVisualOverrideMap;
  snapshots: RealmVisualSnapshot[];
  audit: RealmVisualAuditEvent[];
}

export interface RealmVisualTarget {
  key: string;
  label: string;
  section: 'Faction characters' | 'Base classes' | 'NPC templates' | 'Creature templates';
  faction?: 'heaven' | 'hell';
}

interface RealmVisualsDb {
  load(key: string): Promise<unknown | null>;
  mutate<T>(key: string, transform: (current: unknown | null) => T): Promise<T>;
}

const REAL_DB: RealmVisualsDb = {
  load: loadRealmVisualsState,
  mutate: mutateRealmVisualsState,
};
let realmVisualsDb: RealmVisualsDb = REAL_DB;

export function setRealmVisualsDbForTests(db: RealmVisualsDb): void {
  realmVisualsDb = db;
}

export function resetRealmVisualsDbForTests(): void {
  realmVisualsDb = REAL_DB;
}

interface RealmVisualsAuthDb {
  accountAndScopeForToken(
    token: string,
  ): Promise<{ accountId: number; scope: 'full' | 'read' } | null>;
  accountForAuthentikAccessToken(
    token: string,
  ): Promise<{ accountId: number; scope: 'full' } | null>;
  adminRolesForAccount(accountId: number): Promise<{ username: string; roles: string[] } | null>;
}

const REAL_AUTH_DB: RealmVisualsAuthDb = {
  accountAndScopeForToken,
  accountForAuthentikAccessToken,
  adminRolesForAccount,
};
let realmVisualsAuthDb: RealmVisualsAuthDb = REAL_AUTH_DB;

export function setRealmVisualsAuthDbForTests(db: RealmVisualsAuthDb): void {
  realmVisualsAuthDb = db;
}

export function resetRealmVisualsAuthDbForTests(): void {
  realmVisualsAuthDb = REAL_AUTH_DB;
}

function documentKey(realm: string): string {
  return `realm_visuals:${realm}`;
}

/** Canonical editable target inventory shared with external ArcForge. Values
 * are template identifiers only; no map, housing, or character rows are read
 * or mutated by this catalog. */
export function realmVisualTargets(realmInput: string): {
  realm: string;
  targets: RealmVisualTarget[];
} {
  const realm = validRealm(realmInput);
  // Every realm's faction characters come from ITS OWN roster - crypticrealm
  // gets Cipherblade and Runewarden, classic gets Ironbrand Champion, and so on
  // (infernalCharacterSelectionsForRealm falls through to rosterSelectionsFor
  // for any realm but Infernal). What used to be wrong was only the LABEL: the
  // faction name was hardcoded to Infernal's own two, so the editor announced
  // every realm's heroes as "Heavenly Host" / "Ashen Court". That is six realms,
  // not just crypticrealm.
  //
  // The real name comes from the canonical faction registry, matched on the
  // selection's engine class - the same lookup the creator screen uses, so the
  // editor now says what the operator sees on the card (Rune Court, Gravebound,
  // Voidbound, Ciphered). `factionSide` stays as-is: it is the two-value styling
  // hint, not a name, and the admin UI groups on it.
  const heroes: RealmVisualTarget[] = infernalCharacterSelectionsForRealm(realm).map(
    (selection) => {
      // Infernal's selections are AUTHORED and their factionSide is real: a
      // Heavenly Host warrior is genuinely Heavenly Host. Deriving its name from
      // the class registry instead would relabel that warrior "Abyssal Legion",
      // because the class map answers "which faction fields warriors", not
      // "which side is this character on". So Infernal keeps the side mapping.
      //
      // Every other realm's selections come from a generated roster, where
      // rosterSelectionsFor() folds the real faction away into heaven/hell purely
      // by array index - there the side carries no meaning and the class registry
      // is the only real name available.
      const named =
        realm === 'infernal' ? null : factionForRealmClass(realm as RealmId, selection.engineClass);
      const side = selection.factionSide === 'hell' ? 'Ashen Court' : 'Heavenly Host';
      return {
        key: `hero:${selection.id}`,
        label: `${selection.name} — ${named?.name ?? side}`,
        section: 'Faction characters' as const,
        faction: selection.factionSide,
      };
    },
  );
  const classes: RealmVisualTarget[] = ALL_CLASSES.map((classId) => ({
    key: `class:${classId}`,
    label: `${CLASSES[classId].name} (${classId})`,
    section: 'Base classes',
  }));
  const npcs: RealmVisualTarget[] = Object.entries(NPCS)
    .map(([id, npc]) => ({
      key: `npc:${id}`,
      label: `${npc.name} (${id})`,
      section: 'NPC templates' as const,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const mobs: RealmVisualTarget[] = Object.entries(MOBS)
    .map(([id, mob]) => ({
      key: `mob:${id}`,
      label: `${mob.name} (${id})`,
      section: 'Creature templates' as const,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return { realm, targets: [...heroes, ...classes, ...npcs, ...mobs] };
}

function validRevision(value: unknown, pointer: string, optional = false): number | undefined {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw { ok: false, issues: [{ pointer, code: 'type' }] };
  }
  return value;
}

function validRealm(realm: string): string {
  if (!REALM_RE.test(realm)) {
    throw { ok: false, issues: [{ pointer: '/realm', code: 'type' }] };
  }
  return realm;
}

function validOverrideKey(value: unknown): string {
  if (typeof value !== 'string' || !OVERRIDE_KEY_RE.test(value)) {
    throw { ok: false, issues: [{ pointer: '/key', code: 'type' }] };
  }
  return value;
}

function validAssetUrl(value: unknown): string {
  if (typeof value !== 'string' || value.includes('..') || !ASSET_URL_RE.test(value)) {
    throw { ok: false, issues: [{ pointer: '/assetUrl', code: 'type' }] };
  }
  return value;
}

function finiteNonNegativeInt(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function sanitizeOverrideMap(raw: unknown): RealmVisualOverrideMap {
  const output: RealmVisualOverrideMap = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return output;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(output).length >= MAX_OVERRIDES) break;
    if (!OVERRIDE_KEY_RE.test(key) || !value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    if (typeof row.assetUrl !== 'string' || row.assetUrl.includes('..')) continue;
    if (!ASSET_URL_RE.test(row.assetUrl)) continue;
    const entry: RealmVisualOverride = {
      assetUrl: row.assetUrl,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : EPOCH,
      updatedBy: finiteNonNegativeInt(row.updatedBy),
    };
    if (typeof row.assetName === 'string' && row.assetName.trim()) {
      entry.assetName = row.assetName.trim().slice(0, MAX_NAME_LEN);
    }
    output[key] = entry;
  }
  return output;
}

function cloneOverrides(source: RealmVisualOverrideMap): RealmVisualOverrideMap {
  return Object.fromEntries(Object.entries(source).map(([key, entry]) => [key, { ...entry }]));
}

function emptyState(): RealmVisualsState {
  return {
    draftRevision: 0,
    publishedRevision: 0,
    draftOverrides: {},
    publishedOverrides: {},
    snapshots: [],
    audit: [],
  };
}

/** Sanitize both current documents and the old `{ overrides }` format. */
export function sanitizeRealmVisualsState(raw: unknown): RealmVisualsState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyState();
  const row = raw as Record<string, unknown>;
  if (!('draftOverrides' in row) && 'overrides' in row) {
    const imported = sanitizeOverrideMap(row.overrides);
    const snapshot: RealmVisualSnapshot = {
      revision: 0,
      overrides: cloneOverrides(imported),
      publishedAt: EPOCH,
      publishedBy: 0,
      action: 'legacy-import',
    };
    return {
      draftRevision: 0,
      publishedRevision: 0,
      draftOverrides: cloneOverrides(imported),
      publishedOverrides: cloneOverrides(imported),
      snapshots: Object.keys(imported).length > 0 ? [snapshot] : [],
      audit: [],
    };
  }

  const state = emptyState();
  state.draftRevision = finiteNonNegativeInt(row.draftRevision);
  state.publishedRevision = finiteNonNegativeInt(row.publishedRevision);
  state.draftOverrides = sanitizeOverrideMap(row.draftOverrides);
  state.publishedOverrides = sanitizeOverrideMap(row.publishedOverrides);
  if (Array.isArray(row.snapshots)) {
    for (const item of row.snapshots.slice(-MAX_SNAPSHOTS)) {
      if (!item || typeof item !== 'object') continue;
      const snapshot = item as Record<string, unknown>;
      const action = snapshot.action;
      if (action !== 'publish' && action !== 'rollback' && action !== 'legacy-import') continue;
      state.snapshots.push({
        revision: finiteNonNegativeInt(snapshot.revision),
        overrides: sanitizeOverrideMap(snapshot.overrides),
        publishedAt: typeof snapshot.publishedAt === 'string' ? snapshot.publishedAt : EPOCH,
        publishedBy: finiteNonNegativeInt(snapshot.publishedBy),
        action,
        ...(typeof snapshot.sourceRevision === 'number'
          ? { sourceRevision: finiteNonNegativeInt(snapshot.sourceRevision) }
          : {}),
      });
    }
  }
  if (Array.isArray(row.audit)) {
    for (const item of row.audit.slice(-MAX_AUDIT_EVENTS)) {
      if (!item || typeof item !== 'object') continue;
      const event = item as Record<string, unknown>;
      const action = event.action;
      if (
        action !== 'upsert' &&
        action !== 'delete' &&
        action !== 'publish' &&
        action !== 'rollback'
      ) {
        continue;
      }
      state.audit.push({
        action,
        actorAccountId: finiteNonNegativeInt(event.actorAccountId),
        at: typeof event.at === 'string' ? event.at : EPOCH,
        draftRevision: finiteNonNegativeInt(event.draftRevision),
        publishedRevision: finiteNonNegativeInt(event.publishedRevision),
        ...(typeof event.key === 'string' && OVERRIDE_KEY_RE.test(event.key)
          ? { key: event.key }
          : {}),
        ...(typeof event.sourceRevision === 'number'
          ? { sourceRevision: finiteNonNegativeInt(event.sourceRevision) }
          : {}),
      });
    }
  }
  return state;
}

function appendAudit(state: RealmVisualsState, event: RealmVisualAuditEvent): void {
  state.audit = [...state.audit, event].slice(-MAX_AUDIT_EVENTS);
}

function assertRevision(expected: number | undefined, current: number): void {
  if (expected !== undefined && expected !== current) {
    throw new HttpError(409, 'db.conflict');
  }
}

function publicDocument(realm: string, state: RealmVisualsState): object {
  let current: RealmVisualSnapshot | undefined;
  for (let i = state.snapshots.length - 1; i >= 0; i--) {
    if (state.snapshots[i].revision === state.publishedRevision) {
      current = state.snapshots[i];
      break;
    }
  }
  return {
    realm,
    revision: state.publishedRevision,
    overrides: state.publishedOverrides,
    ...(current ? { publishedAt: current.publishedAt, publishedBy: current.publishedBy } : {}),
  };
}

function draftDocument(realm: string, state: RealmVisualsState): object {
  return {
    realm,
    draftRevision: state.draftRevision,
    publishedRevision: state.publishedRevision,
    overrides: state.draftOverrides,
  };
}

export async function loadPublishedRealmVisuals(realmInput: string): Promise<object> {
  const realm = validRealm(realmInput);
  const state = sanitizeRealmVisualsState(await realmVisualsDb.load(documentKey(realm)));
  return publicDocument(realm, state);
}

export async function loadDraftRealmVisuals(realmInput: string): Promise<object> {
  const realm = validRealm(realmInput);
  const state = sanitizeRealmVisualsState(await realmVisualsDb.load(documentKey(realm)));
  return draftDocument(realm, state);
}

export async function loadRealmVisualHistory(realmInput: string): Promise<object> {
  const realm = validRealm(realmInput);
  const state = sanitizeRealmVisualsState(await realmVisualsDb.load(documentKey(realm)));
  return {
    realm,
    draftRevision: state.draftRevision,
    publishedRevision: state.publishedRevision,
    snapshots: state.snapshots.map(({ overrides, ...snapshot }) => ({
      ...snapshot,
      overrideCount: Object.keys(overrides).length,
    })),
    audit: state.audit,
  };
}

export async function upsertDraftRealmVisual(input: {
  realm: string;
  key: unknown;
  assetUrl: unknown;
  assetName?: unknown;
  expectedDraftRevision?: unknown;
  actorAccountId: number;
  now?: string;
}): Promise<object> {
  const realm = validRealm(input.realm);
  const key = validOverrideKey(input.key);
  const assetUrl = validAssetUrl(input.assetUrl);
  const expected = validRevision(input.expectedDraftRevision, '/expectedDraftRevision', true);
  const at = input.now ?? new Date().toISOString();
  const assetName = typeof input.assetName === 'string' ? input.assetName.trim() : '';
  const state = await realmVisualsDb.mutate(documentKey(realm), (raw) => {
    const next = sanitizeRealmVisualsState(raw);
    assertRevision(expected, next.draftRevision);
    if (Object.keys(next.draftOverrides).length >= MAX_OVERRIDES && !(key in next.draftOverrides)) {
      throw new HttpError(409, 'db.conflict');
    }
    next.draftRevision += 1;
    next.draftOverrides[key] = {
      assetUrl,
      updatedAt: at,
      updatedBy: input.actorAccountId,
      ...(assetName ? { assetName: assetName.slice(0, MAX_NAME_LEN) } : {}),
    };
    appendAudit(next, {
      action: 'upsert',
      actorAccountId: input.actorAccountId,
      at,
      draftRevision: next.draftRevision,
      publishedRevision: next.publishedRevision,
      key,
    });
    return next;
  });
  return draftDocument(realm, state);
}

export async function deleteDraftRealmVisual(input: {
  realm: string;
  key: unknown;
  expectedDraftRevision?: unknown;
  actorAccountId: number;
  now?: string;
}): Promise<object> {
  const realm = validRealm(input.realm);
  const key = validOverrideKey(input.key);
  const expected = validRevision(input.expectedDraftRevision, '/expectedDraftRevision', true);
  const at = input.now ?? new Date().toISOString();
  const state = await realmVisualsDb.mutate(documentKey(realm), (raw) => {
    const next = sanitizeRealmVisualsState(raw);
    assertRevision(expected, next.draftRevision);
    delete next.draftOverrides[key];
    next.draftRevision += 1;
    appendAudit(next, {
      action: 'delete',
      actorAccountId: input.actorAccountId,
      at,
      draftRevision: next.draftRevision,
      publishedRevision: next.publishedRevision,
      key,
    });
    return next;
  });
  return draftDocument(realm, state);
}

export async function publishDraftRealmVisuals(input: {
  realm: string;
  expectedDraftRevision?: unknown;
  actorAccountId: number;
  now?: string;
}): Promise<object> {
  const realm = validRealm(input.realm);
  const expected = validRevision(input.expectedDraftRevision, '/expectedDraftRevision', true);
  const at = input.now ?? new Date().toISOString();
  const state = await realmVisualsDb.mutate(documentKey(realm), (raw) => {
    const next = sanitizeRealmVisualsState(raw);
    assertRevision(expected, next.draftRevision);
    next.publishedRevision += 1;
    next.publishedOverrides = cloneOverrides(next.draftOverrides);
    next.snapshots = [
      ...next.snapshots,
      {
        revision: next.publishedRevision,
        overrides: cloneOverrides(next.publishedOverrides),
        publishedAt: at,
        publishedBy: input.actorAccountId,
        action: 'publish' as const,
      },
    ].slice(-MAX_SNAPSHOTS);
    appendAudit(next, {
      action: 'publish',
      actorAccountId: input.actorAccountId,
      at,
      draftRevision: next.draftRevision,
      publishedRevision: next.publishedRevision,
    });
    return next;
  });
  return publicDocument(realm, state);
}

export async function rollbackPublishedRealmVisuals(input: {
  realm: string;
  revision: unknown;
  expectedPublishedRevision?: unknown;
  actorAccountId: number;
  now?: string;
}): Promise<object> {
  const realm = validRealm(input.realm);
  const sourceRevision = validRevision(input.revision, '/revision')!;
  const expected = validRevision(
    input.expectedPublishedRevision,
    '/expectedPublishedRevision',
    true,
  );
  const at = input.now ?? new Date().toISOString();
  const state = await realmVisualsDb.mutate(documentKey(realm), (raw) => {
    const next = sanitizeRealmVisualsState(raw);
    assertRevision(expected, next.publishedRevision);
    const source = next.snapshots.find((snapshot) => snapshot.revision === sourceRevision);
    if (!source) throw new HttpError(409, 'db.conflict');
    next.publishedRevision += 1;
    next.draftRevision += 1;
    next.publishedOverrides = cloneOverrides(source.overrides);
    next.draftOverrides = cloneOverrides(source.overrides);
    next.snapshots = [
      ...next.snapshots,
      {
        revision: next.publishedRevision,
        overrides: cloneOverrides(source.overrides),
        publishedAt: at,
        publishedBy: input.actorAccountId,
        action: 'rollback' as const,
        sourceRevision,
      },
    ].slice(-MAX_SNAPSHOTS);
    appendAudit(next, {
      action: 'rollback',
      actorAccountId: input.actorAccountId,
      at,
      draftRevision: next.draftRevision,
      publishedRevision: next.publishedRevision,
      sourceRevision,
    });
    return next;
  });
  return publicDocument(realm, state);
}

function requireContentPermission(permission: AdminPermission): Middleware {
  return async (ctx, next) => {
    const token = bearerToken(ctx.req);
    if (token === null) throw new HttpError(401, 'auth.token_missing');
    const scoped =
      (await realmVisualsAuthDb.accountAndScopeForToken(token)) ??
      (await realmVisualsAuthDb.accountForAuthentikAccessToken(token));
    if (!scoped) throw new HttpError(401, 'auth.token_invalid');
    if (scoped.scope !== 'full') throw new HttpError(403, 'auth.forbidden');
    const staff = await realmVisualsAuthDb.adminRolesForAccount(scoped.accountId);
    if (!staff || !permissionsForRoles(staff.roles).has(permission)) {
      throw new HttpError(403, 'auth.forbidden');
    }
    ctx.account = { accountId: scoped.accountId, scope: scoped.scope };
    await next();
  };
}

function bodyObject(ctx: Ctx): Record<string, unknown> {
  if (!ctx.body || typeof ctx.body !== 'object' || Array.isArray(ctx.body)) {
    throw { ok: false, issues: [{ pointer: '', code: 'type' }] };
  }
  return ctx.body as Record<string, unknown>;
}

function firstQuery(ctx: Ctx, key: string): string | undefined {
  const value = ctx.query[key];
  return Array.isArray(value) ? value[0] : value;
}

function queryRevision(ctx: Ctx, key: string): number | undefined {
  const raw = firstQuery(ctx, key);
  if (raw === undefined) return undefined;
  if (!/^\d+$/.test(raw)) throw { ok: false, issues: [{ pointer: `/${key}`, code: 'type' }] };
  return validRevision(Number(raw), `/${key}`, true);
}

async function publishedHandler(ctx: Ctx): Promise<void> {
  json(ctx.res, 200, await loadPublishedRealmVisuals(ctx.params.realm));
}

async function draftHandler(ctx: Ctx): Promise<void> {
  json(ctx.res, 200, await loadDraftRealmVisuals(ctx.params.realm));
}

async function historyHandler(ctx: Ctx): Promise<void> {
  json(ctx.res, 200, await loadRealmVisualHistory(ctx.params.realm));
}

async function targetsHandler(ctx: Ctx): Promise<void> {
  json(ctx.res, 200, realmVisualTargets(ctx.params.realm));
}

async function upsertHandler(ctx: Ctx): Promise<void> {
  const body = bodyObject(ctx);
  json(
    ctx.res,
    200,
    await upsertDraftRealmVisual({
      realm: ctx.params.realm,
      key: body.key,
      assetUrl: body.assetUrl,
      assetName: body.assetName,
      expectedDraftRevision: body.expectedDraftRevision,
      actorAccountId: ctxAccountId(ctx),
    }),
  );
}

async function deleteHandler(ctx: Ctx): Promise<void> {
  json(
    ctx.res,
    200,
    await deleteDraftRealmVisual({
      realm: ctx.params.realm,
      key: firstQuery(ctx, 'key'),
      expectedDraftRevision: queryRevision(ctx, 'expectedDraftRevision'),
      actorAccountId: ctxAccountId(ctx),
    }),
  );
}

async function publishHandler(ctx: Ctx): Promise<void> {
  const body = bodyObject(ctx);
  json(
    ctx.res,
    200,
    await publishDraftRealmVisuals({
      realm: ctx.params.realm,
      expectedDraftRevision: body.expectedDraftRevision,
      actorAccountId: ctxAccountId(ctx),
    }),
  );
}

async function rollbackHandler(ctx: Ctx): Promise<void> {
  const body = bodyObject(ctx);
  json(
    ctx.res,
    200,
    await rollbackPublishedRealmVisuals({
      realm: ctx.params.realm,
      revision: body.revision,
      expectedPublishedRevision: body.expectedPublishedRevision,
      actorAccountId: ctxAccountId(ctx),
    }),
  );
}

export const routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/realm-visuals/:realm',
    surface: 'api',
    meta: { publicRead: true },
    handler: publishedHandler,
  },
  {
    method: 'GET',
    path: '/api/realm-visuals/:realm/draft',
    surface: 'api',
    meta: { permissionGated: true },
    middleware: [requireContentPermission('content.read')],
    handler: draftHandler,
  },
  {
    method: 'GET',
    path: '/api/realm-visuals/:realm/history',
    surface: 'api',
    meta: { permissionGated: true },
    middleware: [requireContentPermission('content.read')],
    handler: historyHandler,
  },
  {
    method: 'GET',
    path: '/api/realm-visuals/:realm/targets',
    surface: 'api',
    meta: { permissionGated: true },
    middleware: [requireContentPermission('content.read')],
    handler: targetsHandler,
  },
  {
    method: 'PUT',
    path: '/api/realm-visuals/:realm',
    surface: 'api',
    meta: { permissionGated: true },
    middleware: [requireContentPermission('content.edit'), withBody(MAX_BODY_BYTES)],
    handler: upsertHandler,
  },
  {
    method: 'DELETE',
    path: '/api/realm-visuals/:realm',
    surface: 'api',
    meta: { permissionGated: true },
    middleware: [requireContentPermission('content.edit')],
    handler: deleteHandler,
  },
  {
    method: 'POST',
    path: '/api/realm-visuals/:realm/publish',
    surface: 'api',
    meta: { permissionGated: true },
    middleware: [requireContentPermission('content.publish'), withBody(MAX_BODY_BYTES)],
    handler: publishHandler,
  },
  {
    method: 'POST',
    path: '/api/realm-visuals/:realm/rollback',
    surface: 'api',
    meta: { permissionGated: true },
    middleware: [requireContentPermission('content.rollback'), withBody(MAX_BODY_BYTES)],
    handler: rollbackHandler,
  },
];

async function legacyActor(
  req: http.IncomingMessage,
  permission: AdminPermission,
): Promise<number | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const scoped =
    (await realmVisualsAuthDb.accountAndScopeForToken(token)) ??
    (await realmVisualsAuthDb.accountForAuthentikAccessToken(token));
  if (!scoped || scoped.scope !== 'full') return null;
  const staff = await realmVisualsAuthDb.adminRolesForAccount(scoped.accountId);
  if (!staff || !permissionsForRoles(staff.roles).has(permission)) return null;
  return scoped.accountId;
}

/** API_DISPATCH=legacy twin. The RouteDef path above is the production default. */
export async function handleRealmVisuals(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  const parsed = new URL(req.url ?? '/', 'http://localhost');
  const match =
    /^\/api\/realm-visuals\/([a-z0-9][a-z0-9_-]{0,31})(?:\/(draft|history|targets|publish|rollback))?$/.exec(
      parsed.pathname,
    );
  if (!match) {
    if (!parsed.pathname.startsWith('/api/realm-visuals/')) return false;
    json(res, 404, { error: 'realm visual route not found', code: 'validation.failed' });
    return true;
  }
  const realm = match[1];
  const action = match[2] ?? '';
  try {
    if (req.method === 'GET' && action === '') {
      json(res, 200, await loadPublishedRealmVisuals(realm));
      return true;
    }
    if (req.method === 'HEAD' && action === '') {
      res.writeHead(200, { 'cache-control': 'no-store' });
      res.end();
      return true;
    }
    const permission: AdminPermission =
      action === 'publish'
        ? 'content.publish'
        : action === 'rollback'
          ? 'content.rollback'
          : action === 'draft' || action === 'history' || action === 'targets'
            ? 'content.read'
            : 'content.edit';
    const actorAccountId = await legacyActor(req, permission);
    if (actorAccountId === null) {
      json(res, 403, { error: 'content permission required', code: 'auth.forbidden' });
      return true;
    }
    if (req.method === 'GET' && action === 'draft') {
      json(res, 200, await loadDraftRealmVisuals(realm));
      return true;
    }
    if (req.method === 'GET' && action === 'history') {
      json(res, 200, await loadRealmVisualHistory(realm));
      return true;
    }
    if (req.method === 'GET' && action === 'targets') {
      json(res, 200, realmVisualTargets(realm));
      return true;
    }
    if (req.method === 'PUT' && action === '') {
      const body = (await readBody(req, MAX_BODY_BYTES)) as Record<string, unknown>;
      json(
        res,
        200,
        await upsertDraftRealmVisual({
          realm,
          key: body.key,
          assetUrl: body.assetUrl,
          assetName: body.assetName,
          expectedDraftRevision: body.expectedDraftRevision,
          actorAccountId,
        }),
      );
      return true;
    }
    if (req.method === 'DELETE' && action === '') {
      json(
        res,
        200,
        await deleteDraftRealmVisual({
          realm,
          key: parsed.searchParams.get('key'),
          expectedDraftRevision: parsed.searchParams.has('expectedDraftRevision')
            ? Number(parsed.searchParams.get('expectedDraftRevision'))
            : undefined,
          actorAccountId,
        }),
      );
      return true;
    }
    if (req.method === 'POST' && action === 'publish') {
      const body = (await readBody(req, MAX_BODY_BYTES)) as Record<string, unknown>;
      json(
        res,
        200,
        await publishDraftRealmVisuals({
          realm,
          expectedDraftRevision: body.expectedDraftRevision,
          actorAccountId,
        }),
      );
      return true;
    }
    if (req.method === 'POST' && action === 'rollback') {
      const body = (await readBody(req, MAX_BODY_BYTES)) as Record<string, unknown>;
      json(
        res,
        200,
        await rollbackPublishedRealmVisuals({
          realm,
          revision: body.revision,
          expectedPublishedRevision: body.expectedPublishedRevision,
          actorAccountId,
        }),
      );
      return true;
    }
    res.writeHead(405, { allow: 'GET, HEAD, PUT, DELETE, POST' });
    res.end();
    return true;
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 422;
    const code = error instanceof HttpError ? error.code : 'validation.failed';
    json(res, status, { error: code, code });
    return true;
  }
}
