// In-game admin editor for realm body-asset assignments. An operator (admin)
// opens this from the character-create screen (or via window.crRealmVisualEditor),
// reassigns any hero class's body to any GLB from the unified asset library, and
// the change persists server-side (PUT /api/realm-visuals) and applies live for
// every player on the next load. Works the same over arcforge.moveweight.com,
// which proxies /api/* to the game. English-only operator tool, matching the
// existing in-game ArcForge editor.

import type { RealmContent } from '../../sim/realms/types';
import { getMe, getToken } from '../../user/api';
import { infernalDiabloClassChoicesForRealm } from './realm_class_presentation';
import {
  type RealmVisualOverrideEntry,
  realmVisualOverride,
  setRealmVisualOverrides,
} from './realm_visual_overrides';

const MODAL_ID = 'cr-realm-visual-editor';

interface LibraryAsset {
  assetId: string;
  name: string;
  url: string;
  kind: string;
  group: string;
}

interface EditTarget {
  key: string;
  label: string;
  current: string;
}

// The infernal town NPCs an operator most often reskins. Editing one writes an
// `npc:<id>` override that applies to that NPC in the world.
const INFERNAL_TOWN_NPCS: readonly { id: string; label: string }[] = [
  { id: 'the_merchant', label: 'The Merchant' },
  { id: 'marshal_redbrook', label: 'Marshal Redbrook' },
  { id: 'apothecary_lin', label: 'Apothecary Lin' },
  { id: 'trader_wilkes', label: 'Trader Wilkes' },
  { id: 'smith_haldren', label: 'Smith Haldren' },
  { id: 'foreman_odell', label: 'Foreman Odell' },
  { id: 'cainhurst_sage', label: 'Cainhurst the Sage' },
  { id: 'bursar_fernando', label: 'Bursar Fernando' },
  { id: 'fisherman_brandt', label: 'Fisherman Brandt' },
  { id: 'huntress_verr', label: 'Huntress Verr' },
  { id: 'mercenary_kael', label: 'Mercenary Kael' },
  { id: 'realtor_maribel', label: 'Realtor Maribel' },
];

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function notify(message: string): void {
  window.dispatchEvent(new CustomEvent('cr-realm-visuals-changed'));
  // Cheap, dependency-free toast so the operator sees success/failure.
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText =
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:100000;' +
    'background:#1b1410;color:#f4e6c8;border:1px solid #7a5a2a;padding:8px 14px;border-radius:8px;' +
    'font:600 13px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5)';
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 2600);
}

async function saveOverride(
  realmId: string,
  key: string,
  asset: { url: string; name: string },
): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`/api/realm-visuals/${realmId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      credentials: 'same-origin',
      body: JSON.stringify({ key, assetUrl: asset.url, assetName: asset.name }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { overrides?: Record<string, RealmVisualOverrideEntry> };
    setRealmVisualOverrides(realmId, data.overrides ?? {});
    return true;
  } catch {
    return false;
  }
}

async function resetOverride(realmId: string, key: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`/api/realm-visuals/${realmId}?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
      credentials: 'same-origin',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { overrides?: Record<string, RealmVisualOverrideEntry> };
    setRealmVisualOverrides(realmId, data.overrides ?? {});
    return true;
  } catch {
    return false;
  }
}

async function searchAssets(query: string): Promise<LibraryAsset[]> {
  try {
    const res = await fetch(
      `/api/asset-library?limit=120&q=${encodeURIComponent(query.slice(0, 80))}`,
      { credentials: 'same-origin' },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { assets?: LibraryAsset[] };
    return data.assets ?? [];
  } catch {
    return [];
  }
}

function closeEditor(): void {
  document.getElementById(MODAL_ID)?.remove();
}

/** Open the admin editor for a realm. No-op (with a notice) for non-admins. */
export async function openRealmVisualEditor(realm: RealmContent): Promise<void> {
  if (document.getElementById(MODAL_ID)) return;
  if (!getToken()) {
    notify('Sign in as an admin to edit realm assets.');
    return;
  }
  let isAdmin = false;
  try {
    isAdmin = !!(await getMe()).roles?.isAdmin;
  } catch {
    isAdmin = false;
  }
  if (!isAdmin) {
    notify('Admin access required to edit realm assets.');
    return;
  }

  const currentName = (key: string, fallback: string): string =>
    realmVisualOverride(realm.id, key)?.assetName ?? fallback;
  const heroTargets: EditTarget[] = infernalDiabloClassChoicesForRealm(realm).map((h) => ({
    key: `hero:${h.name}`,
    label: h.name,
    current: currentName(`hero:${h.name}`, h.assetName ?? 'default'),
  }));
  const npcTargets: EditTarget[] = INFERNAL_TOWN_NPCS.map((n) => ({
    key: `npc:${n.id}`,
    label: n.label,
    current: currentName(`npc:${n.id}`, 'default'),
  }));
  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.72);display:flex;' +
    'align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="width:min(760px,96vw);max-height:88vh;overflow:auto;background:#140f0b;
      border:1px solid #7a5a2a;border-radius:12px;color:#f4e6c8;font:14px system-ui,sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;
        border-bottom:1px solid #3a2c19">
        <strong style="font-size:16px">Realm Body Editor: ${escapeHtml(realm.id)}</strong>
        <button data-close style="background:none;border:1px solid #7a5a2a;color:#f4e6c8;
          border-radius:6px;padding:4px 10px;cursor:pointer">Close</button>
      </div>
      <div style="padding:8px 14px;color:#c9b48a;font-size:12px">
        Reassign any hero class or town NPC body to a GLB from your asset library. Saves are live for every player.
      </div>
      <ul data-rows style="list-style:none;margin:0;padding:6px 14px 16px"></ul>
      <div data-picker style="display:none;border-top:1px solid #3a2c19;padding:12px 14px"></div>
    </div>`;
  document.body.appendChild(modal);

  const rows = modal.querySelector<HTMLElement>('[data-rows]');
  const picker = modal.querySelector<HTMLElement>('[data-picker]');
  modal.querySelector('[data-close]')?.addEventListener('click', closeEditor);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeEditor();
  });

  const rowHtml = (t: EditTarget): string => `
    <li style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #241a10">
      <span style="flex:1 1 auto;font-weight:600">${escapeHtml(t.label)}</span>
      <span style="flex:1 1 auto;color:#c9b48a;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t.current)}</span>
      <button data-pick="${escapeHtml(t.key)}" data-label="${escapeHtml(t.label)}" style="background:#2a1e10;border:1px solid #7a5a2a;color:#f4e6c8;border-radius:6px;padding:5px 10px;cursor:pointer">Change</button>
      <button data-reset="${escapeHtml(t.key)}" data-label="${escapeHtml(t.label)}" style="background:none;border:1px solid #513c22;color:#c9b48a;border-radius:6px;padding:5px 8px;cursor:pointer">Reset</button>
    </li>`;
  const sectionHtml = (title: string, list: EditTarget[]): string =>
    `<li style="padding:12px 0 4px;color:#f0c987;font-weight:700">${escapeHtml(title)}</li>` +
    list.map(rowHtml).join('');
  const renderRows = (): void => {
    if (!rows) return;
    rows.innerHTML =
      sectionHtml('Hero classes (create screen)', heroTargets) +
      sectionHtml('Town NPCs (in the world)', npcTargets);
    rows.querySelectorAll<HTMLElement>('[data-pick]').forEach((btn) => {
      btn.addEventListener('click', () =>
        openPicker(btn.dataset.pick ?? '', btn.dataset.label ?? ''),
      );
    });
    rows.querySelectorAll<HTMLElement>('[data-reset]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.reset ?? '';
        const label = btn.dataset.label ?? key;
        const ok = await resetOverride(realm.id, key);
        notify(ok ? `Reset ${label} to default.` : `Could not reset ${label}.`);
      });
    });
  };

  const openPicker = (key: string, label: string): void => {
    if (!picker) return;
    picker.style.display = 'block';
    picker.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <strong>Pick a body for ${escapeHtml(label)}</strong>
        <input data-q placeholder="Search assets (e.g. amazon, barbarian, knight)"
          style="flex:1;background:#0d0a07;border:1px solid #513c22;color:#f4e6c8;border-radius:6px;padding:6px 10px" />
      </div>
      <div data-grid style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;max-height:44vh;overflow:auto"></div>`;
    const q = picker.querySelector<HTMLInputElement>('[data-q]');
    const grid = picker.querySelector<HTMLElement>('[data-grid]');

    const runSearch = async (): Promise<void> => {
      if (!grid) return;
      grid.innerHTML = '<span style="color:#c9b48a">Searching...</span>';
      const assets = await searchAssets(q?.value ?? label);
      grid.innerHTML =
        assets.length === 0
          ? '<span style="color:#c9b48a">No matches. Try another term.</span>'
          : assets
              .map(
                (a) => `
        <button data-asset="${escapeHtml(a.url)}" data-name="${escapeHtml(a.name)}"
          title="${escapeHtml(a.group)} / ${escapeHtml(a.kind)}"
          style="text-align:left;background:#1a130c;border:1px solid #3a2c19;color:#f4e6c8;
          border-radius:8px;padding:8px;cursor:pointer;font-size:12px;overflow:hidden">
          <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(a.name)}</div>
          <div style="color:#8f7a54">${escapeHtml(a.group)}</div>
        </button>`,
              )
              .join('');
      grid.querySelectorAll<HTMLElement>('[data-asset]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const url = btn.dataset.asset ?? '';
          const name = btn.dataset.name ?? '';
          const ok = await saveOverride(realm.id, key, { url, name });
          if (ok) {
            picker.style.display = 'none';
            notify(`${label} now uses ${name}.`);
          } else {
            notify(`Could not save ${label}. Check your admin session.`);
          }
        });
      });
    };

    let debounce = 0;
    q?.addEventListener('input', () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(runSearch, 250);
    });
    q?.focus();
    void runSearch();
  };

  renderRows();
}
