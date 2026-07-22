// Shared in-game ArcForge body editor. Every write is a revision-checked draft;
// only Publish changes what players see. The external ArcForge consumes the
// same API, so either surface can continue the other's draft and roll back a
// published revision without touching maps, housing, or character ownership.

import { MOBS, NPCS } from '../../sim/data';
import type { RealmContent } from '../../sim/realms/types';
import { getMe, getToken } from '../../user/api';
import { esc } from '../esc';
import { classChoicesForRealm, infernalHeroChoicesForRealm } from './realm_class_presentation';
import { type RealmVisualOverrideEntry, setRealmVisualOverrides } from './realm_visual_overrides';

const MODAL_ID = 'cr-realm-visual-editor';

interface LibraryAsset {
  assetId: string;
  name: string;
  url: string;
  kind: string;
  group: string;
  animated: boolean;
  skinned: boolean;
}

interface EditTarget {
  key: string;
  label: string;
  section: string;
  fallback: string;
}

interface DraftDocument {
  realm: string;
  draftRevision: number;
  publishedRevision: number;
  overrides: Record<string, RealmVisualOverrideEntry>;
}

interface PublishedDocument {
  realm: string;
  revision: number;
  overrides: Record<string, RealmVisualOverrideEntry>;
  publishedAt?: string;
}

interface HistorySnapshot {
  revision: number;
  publishedAt: string;
  publishedBy: number;
  action: string;
  sourceRevision?: number;
  overrideCount: number;
}

interface HistoryDocument {
  realm: string;
  draftRevision: number;
  publishedRevision: number;
  snapshots: HistorySnapshot[];
}

function notify(message: string): void {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText =
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:100000;' +
    'background:#1b1410;color:#f4e6c8;border:1px solid #7a5a2a;padding:8px 14px;border-radius:8px;' +
    'font:600 13px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5)';
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 3000);
}

function closeEditor(): void {
  document.getElementById(MODAL_ID)?.remove();
}

function authHeaders(jsonBody = false): Record<string, string> {
  const token = getToken();
  return {
    ...(jsonBody ? { 'content-type': 'application/json' } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  if (!res.ok) {
    const error = new Error(`request failed (${res.status})`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return (await res.json()) as T;
}

async function loadDraft(realmId: string): Promise<DraftDocument> {
  return requestJson(`/api/realm-visuals/${realmId}/draft`, {
    headers: authHeaders(),
  });
}

async function saveDraftOverride(
  realmId: string,
  draftRevision: number,
  key: string,
  asset: { url: string; name: string },
): Promise<DraftDocument> {
  return requestJson(`/api/realm-visuals/${realmId}`, {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify({
      key,
      assetUrl: asset.url,
      assetName: asset.name,
      expectedDraftRevision: draftRevision,
    }),
  });
}

async function deleteDraftOverride(
  realmId: string,
  draftRevision: number,
  key: string,
): Promise<DraftDocument> {
  const query = new URLSearchParams({
    key,
    expectedDraftRevision: String(draftRevision),
  });
  return requestJson(`/api/realm-visuals/${realmId}?${query}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

async function publishDraft(realmId: string, draftRevision: number): Promise<PublishedDocument> {
  return requestJson(`/api/realm-visuals/${realmId}/publish`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ expectedDraftRevision: draftRevision }),
  });
}

async function loadHistory(realmId: string): Promise<HistoryDocument> {
  return requestJson(`/api/realm-visuals/${realmId}/history`, {
    headers: authHeaders(),
  });
}

async function rollbackPublished(
  realmId: string,
  revision: number,
  expectedPublishedRevision: number,
): Promise<PublishedDocument> {
  return requestJson(`/api/realm-visuals/${realmId}/rollback`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ revision, expectedPublishedRevision }),
  });
}

async function searchAssets(query: string): Promise<LibraryAsset[]> {
  const data = await requestJson<{ assets?: LibraryAsset[] }>(
    `/api/asset-library?limit=220&q=${encodeURIComponent(query.slice(0, 80))}`,
  ).catch(() => ({ assets: [] }));
  return (data.assets ?? []).filter(
    (asset) => asset.kind === 'character' && asset.animated && asset.skinned,
  );
}

function editorTargets(realm: RealmContent): EditTarget[] {
  const classes = classChoicesForRealm(realm).map((choice) => ({
    key: `class:${choice.baseClass}`,
    label: `${choice.name} (${choice.baseClass})`,
    section: 'Base classes',
    fallback: choice.assetName ?? 'Compiled realm default',
  }));
  const heroes = infernalHeroChoicesForRealm(realm).map((choice) => ({
    key: `hero:${choice.heroId}`,
    label: `${choice.name} — ${choice.faction}`,
    section: 'Faction characters',
    fallback: choice.assetName ?? 'Compiled hero default',
  }));
  const npcs = Object.entries(NPCS)
    .map(([id, npc]) => ({
      key: `npc:${id}`,
      label: `${npc.name} (${id})`,
      section: 'NPC templates',
      fallback: 'Compiled realm NPC roster',
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const mobs = Object.entries(MOBS)
    .map(([id, mob]) => ({
      key: `mob:${id}`,
      label: `${mob.name} (${id})`,
      section: 'Creature and monster templates',
      fallback: 'Compiled realm creature roster',
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...heroes, ...classes, ...npcs, ...mobs];
}

function applyPublished(document: PublishedDocument): void {
  setRealmVisualOverrides(document.realm, document.overrides);
  window.dispatchEvent(new CustomEvent('cr-realm-visuals-changed'));
}

/** Open the complete revisioned body editor for one realm. */
export async function openRealmVisualEditor(realm: RealmContent): Promise<void> {
  if (document.getElementById(MODAL_ID)) return;
  if (!getToken()) {
    notify('Sign in as an authorized content editor first.');
    return;
  }
  let isAdmin = false;
  try {
    isAdmin = !!(await getMe()).roles?.isAdmin;
  } catch {
    isAdmin = false;
  }
  if (!isAdmin) {
    notify('Content-editor access is required.');
    return;
  }

  let draft: DraftDocument;
  try {
    draft = await loadDraft(realm.id);
  } catch {
    notify('Could not load the shared ArcForge draft.');
    return;
  }

  const allTargets = editorTargets(realm);
  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:flex;' +
    'align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="width:min(1080px,97vw);max-height:92vh;overflow:hidden;background:#140f0b;
      border:1px solid #7a5a2a;border-radius:12px;color:#f4e6c8;font:14px system-ui,sans-serif;
      display:grid;grid-template-rows:auto auto 1fr">
      <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #3a2c19">
        <strong style="font-size:16px;flex:1">ArcForge Realm Bodies: ${esc(realm.id)}</strong>
        <span data-status style="color:#c9b48a;font-size:12px"></span>
        <button data-history style="background:#17120d;border:1px solid #513c22;color:#f4e6c8;border-radius:6px;padding:6px 10px;cursor:pointer">History</button>
        <button data-publish style="background:#8a4f12;border:1px solid #d89a3d;color:#fff4d6;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:700">Publish Draft</button>
        <button data-close style="background:none;border:1px solid #7a5a2a;color:#f4e6c8;border-radius:6px;padding:6px 10px;cursor:pointer">Close</button>
      </div>
      <div style="display:flex;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #3a2c19">
        <input data-target-q placeholder="Filter classes, NPCs, creatures, or template ids"
          style="flex:1;background:#0d0a07;border:1px solid #513c22;color:#f4e6c8;border-radius:6px;padding:8px 10px" />
        <span style="color:#c9b48a;font-size:12px">Draft edits auto-save. Players see only published revisions.</span>
      </div>
      <div style="display:grid;grid-template-columns:minmax(420px,1fr) minmax(330px,.85fr);min-height:0">
        <ul data-rows style="list-style:none;margin:0;padding:6px 14px 16px;overflow:auto;min-height:0"></ul>
        <div data-side style="border-left:1px solid #3a2c19;padding:12px 14px;overflow:auto;min-height:0;color:#c9b48a">
          Select Change on any target. Only skinned, animated character assets are offered here.
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const rows = modal.querySelector<HTMLElement>('[data-rows]')!;
  const side = modal.querySelector<HTMLElement>('[data-side]')!;
  const status = modal.querySelector<HTMLElement>('[data-status]')!;
  const targetQuery = modal.querySelector<HTMLInputElement>('[data-target-q]')!;
  const publishButton = modal.querySelector<HTMLButtonElement>('[data-publish]')!;

  const refreshStatus = (): void => {
    const pending = draft.draftRevision !== draft.publishedRevision;
    status.textContent = `Draft ${draft.draftRevision} · Live ${draft.publishedRevision}${pending ? ' · unpublished changes' : ''}`;
    publishButton.disabled = !pending;
    publishButton.style.opacity = pending ? '1' : '.55';
  };

  const refreshAfterConflict = async (): Promise<void> => {
    draft = await loadDraft(realm.id);
    renderRows();
    refreshStatus();
    notify('Another editor changed this draft. The newest revision is loaded.');
  };

  const mutate = async (
    operation: () => Promise<DraftDocument>,
    success: string,
  ): Promise<void> => {
    try {
      draft = await operation();
      renderRows();
      refreshStatus();
      notify(success);
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        await refreshAfterConflict().catch(() => notify('Draft conflict; reopen the editor.'));
      } else {
        notify('Draft update failed. Your live revision was not changed.');
      }
    }
  };

  const openPicker = (target: EditTarget): void => {
    side.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <strong style="color:#f4e6c8">Body for ${esc(target.label)}</strong>
      </div>
      <input data-asset-q value="${esc(target.label.split(' (')[0])}" placeholder="Search animation-ready assets"
        style="width:100%;box-sizing:border-box;background:#0d0a07;border:1px solid #513c22;color:#f4e6c8;border-radius:6px;padding:7px 10px;margin-bottom:10px" />
      <div data-grid style="display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:8px"></div>`;
    const query = side.querySelector<HTMLInputElement>('[data-asset-q]')!;
    const grid = side.querySelector<HTMLElement>('[data-grid]')!;
    const runSearch = async (): Promise<void> => {
      grid.innerHTML = '<span>Searching animation-ready bodies…</span>';
      const assets = await searchAssets(query.value || target.label);
      grid.innerHTML = assets.length
        ? assets
            .map(
              (asset) => `
          <button data-asset="${esc(asset.url)}" data-name="${esc(asset.name)}"
            title="${esc(`${asset.group} · animation-ready`)}"
            style="text-align:left;background:#1a130c;border:1px solid #3a2c19;color:#f4e6c8;
            border-radius:8px;padding:8px;cursor:pointer;font-size:12px;overflow:hidden">
            <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(asset.name)}</div>
            <div style="color:#8f7a54;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(asset.group)}</div>
            <div style="color:#78b57a;margin-top:3px">Animated · skinned</div>
          </button>`,
            )
            .join('')
        : '<span>No animation-ready matches. Try another term.</span>';
      grid.querySelectorAll<HTMLElement>('[data-asset]').forEach((button) => {
        button.addEventListener('click', () => {
          const assetUrl = button.dataset.asset ?? '';
          const assetName = button.dataset.name ?? '';
          void mutate(
            () =>
              saveDraftOverride(realm.id, draft.draftRevision, target.key, {
                url: assetUrl,
                name: assetName,
              }),
            `${target.label} saved to draft.`,
          ).then(() => openPicker(target));
        });
      });
    };
    let debounce = 0;
    query.addEventListener('input', () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => void runSearch(), 250);
    });
    query.focus();
    void runSearch();
  };

  const renderRows = (): void => {
    const q = targetQuery.value.trim().toLowerCase();
    const filtered = allTargets.filter((target) =>
      q ? `${target.label} ${target.key} ${target.section}`.toLowerCase().includes(q) : true,
    );
    const sections = new Map<string, EditTarget[]>();
    for (const target of filtered) {
      const list = sections.get(target.section) ?? [];
      list.push(target);
      sections.set(target.section, list);
    }
    rows.innerHTML = [...sections]
      .map(
        ([section, targets]) => `
        <li style="position:sticky;top:0;background:#140f0b;padding:12px 0 5px;color:#f0c987;font-weight:800;z-index:1">${esc(section)} · ${targets.length}</li>
        ${targets
          .map((target) => {
            const assigned = draft.overrides[target.key];
            return `<li style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid #241a10">
              <span style="flex:1 1 44%;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(target.label)}">${esc(target.label)}</span>
              <span style="flex:1 1 34%;min-width:0;color:${assigned ? '#f0c987' : '#8f7a54'};font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(assigned?.assetName ?? target.fallback)}">${esc(assigned?.assetName ?? target.fallback)}</span>
              <button data-pick="${esc(target.key)}" style="background:#2a1e10;border:1px solid #7a5a2a;color:#f4e6c8;border-radius:6px;padding:5px 9px;cursor:pointer">Change</button>
              <button data-reset="${esc(target.key)}" ${assigned ? '' : 'disabled'} style="background:none;border:1px solid #513c22;color:#c9b48a;border-radius:6px;padding:5px 8px;cursor:pointer;opacity:${assigned ? '1' : '.4'}">Reset</button>
            </li>`;
          })
          .join('')}`,
      )
      .join('');
    const byKey = new Map(allTargets.map((target) => [target.key, target]));
    rows.querySelectorAll<HTMLElement>('[data-pick]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = byKey.get(button.dataset.pick ?? '');
        if (target) openPicker(target);
      });
    });
    rows.querySelectorAll<HTMLButtonElement>('[data-reset]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = byKey.get(button.dataset.reset ?? '');
        if (!target) return;
        void mutate(
          () => deleteDraftOverride(realm.id, draft.draftRevision, target.key),
          `${target.label} reset in draft.`,
        );
      });
    });
  };

  const showHistory = async (): Promise<void> => {
    side.innerHTML = '<span>Loading publish history…</span>';
    let history: HistoryDocument;
    try {
      history = await loadHistory(realm.id);
    } catch {
      side.innerHTML = '<span>Could not load publish history.</span>';
      return;
    }
    const snapshots = [...history.snapshots].reverse();
    side.innerHTML = `
      <strong style="display:block;color:#f4e6c8;margin-bottom:9px">Published history</strong>
      ${
        snapshots.length === 0
          ? '<span>No published revisions yet.</span>'
          : snapshots
              .map(
                (
                  snapshot,
                ) => `<div style="border:1px solid #3a2c19;border-radius:8px;padding:9px;margin-bottom:8px">
          <div style="display:flex;gap:8px;align-items:center"><strong style="color:#f0c987">Revision ${snapshot.revision}</strong><span style="margin-left:auto">${snapshot.overrideCount} assignments</span></div>
          <div style="font-size:12px;margin:4px 0">${esc(snapshot.action)} · ${esc(snapshot.publishedAt)}</div>
          ${snapshot.revision === history.publishedRevision ? '<span style="color:#78b57a">Currently live</span>' : `<button data-rollback="${snapshot.revision}" style="background:#35170f;border:1px solid #8a4f32;color:#ffd8c8;border-radius:6px;padding:5px 9px;cursor:pointer">Roll back to this revision</button>`}
        </div>`,
              )
              .join('')
      }`;
    side.querySelectorAll<HTMLButtonElement>('[data-rollback]').forEach((button) => {
      button.addEventListener('click', async () => {
        const revision = Number(button.dataset.rollback);
        button.disabled = true;
        try {
          const published = await rollbackPublished(realm.id, revision, history.publishedRevision);
          applyPublished(published);
          draft = await loadDraft(realm.id);
          refreshStatus();
          renderRows();
          notify(`Rolled live bodies back to revision ${revision}.`);
          await showHistory();
        } catch (error) {
          notify(
            (error as { status?: number }).status === 409
              ? 'Live content changed first. History has been refreshed.'
              : 'Rollback failed; the live revision is unchanged.',
          );
          await showHistory();
        }
      });
    });
  };

  modal.querySelector('[data-close]')?.addEventListener('click', closeEditor);
  modal.querySelector('[data-history]')?.addEventListener('click', () => void showHistory());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeEditor();
  });
  targetQuery.addEventListener('input', renderRows);
  publishButton.addEventListener('click', async () => {
    publishButton.disabled = true;
    try {
      const published = await publishDraft(realm.id, draft.draftRevision);
      applyPublished(published);
      draft = await loadDraft(realm.id);
      renderRows();
      refreshStatus();
      notify(`Revision ${published.revision} is live for every player.`);
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        await refreshAfterConflict().catch(() => undefined);
      } else {
        notify('Publish failed; the previous live revision is still active.');
      }
      refreshStatus();
    }
  });

  renderRows();
  refreshStatus();
}
