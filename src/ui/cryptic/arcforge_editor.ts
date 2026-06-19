// In-game ArcForge live editor — admin/moderator tool to regenerate game assets
// while playing, ported from the original Cryptic Realm ArcForgeInGameQueue.
// Flag a monster/item/character, run it through the asset pipeline (clear-bg →
// 3D → rigged → animated GLB), and track the job to completion.
//
// Auth: gated to admin/mod via getMe() (server re-checks on every proxied call,
// so a tampered client can't reach the pipeline). All pipeline traffic goes
// through the server-side proxy /me/api/arcforge/* (the browser can't reach the
// LAN pipeline host directly). Non-admins never see the entry — the Mods tab
// shows them the public ArcForge website link instead.

import { getMe, getToken } from '../../user/api';

const MODAL_ID = 'cr-arcforge-editor-modal';
const QUEUE_KEY = 'cr_arcforge_queue_v1';

// Pipeline stages mirror the original tool.
const PIPELINE = [
  { id: 'clear_bg', label: 'Clear Background', desc: 'Remove background → transparent PNG' },
  { id: '3d_asset', label: '3D Asset', desc: 'Generate a 3D model from the reference' },
  { id: '3d_print_glb', label: 'Print + GLB', desc: 'STL-ready mesh plus a game GLB' },
  { id: 'rigged', label: 'Rigged', desc: 'Add a skeleton for animation' },
  { id: 'animated_glb', label: 'Animated GLB', desc: 'Export an animated GLB with clips' },
] as const;
type StageId = (typeof PIPELINE)[number]['id'];

const ASSET_TYPES = ['monster', 'item', 'character', 'npc', 'prop'] as const;
type AssetType = (typeof ASSET_TYPES)[number];

type JobStatus = 'queued' | 'running' | 'done' | 'failed';
interface Job {
  id: string;
  assetId: string;
  assetLabel: string;
  assetType: AssetType;
  pipeline: StageId;
  imageData: string; // dataURL reference image (may be empty)
  imageName: string;
  prompt: string;
  status: JobStatus;
  note: string;
  createdAt: number;
}

let adminCache: boolean | null = null;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function slug(v: string): string {
  return (v || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'asset';
}

function loadQueue(): Job[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as Job[]; }
  catch { return []; }
}
function saveQueue(q: Job[]): void {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* storage full */ }
}

/** Cached admin/mod check via the player session. Server re-verifies anyway. */
export async function canUseArcForgeEditor(): Promise<boolean> {
  if (adminCache !== null) return adminCache;
  if (!getToken()) { adminCache = false; return false; }
  try {
    const me = await getMe();
    adminCache = !!(me.roles?.isAdmin || me.roles?.isModerator);
  } catch { adminCache = false; }
  return adminCache;
}

/** Synchronous best-effort read of the cached result (null until resolved). */
export function arcForgeEditorAllowedCached(): boolean | null {
  return adminCache;
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(`/me/api/arcforge/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

function ensureHost(): HTMLElement {
  let host = document.getElementById(MODAL_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = MODAL_ID;
    host.setAttribute('hidden', '');
    document.body.appendChild(host);
  }
  return host;
}

function closeEditor(): void {
  document.getElementById(MODAL_ID)?.setAttribute('hidden', '');
}

export function openArcForgeEditor(): void {
  if (typeof document === 'undefined') return;
  const host = ensureHost();
  let queue = loadQueue();

  host.innerHTML = `
    <div class="cr-modal-overlay cr-afe-overlay" data-cr-afe-overlay>
      <div class="cr-modal-panel cr-afe-panel" role="dialog" aria-modal="true" aria-labelledby="cr-afe-title">
        <header class="cr-modal-header">
          <h2 id="cr-afe-title">ArcForge — Live Asset Editor</h2>
          <button type="button" class="cr-modal-close" data-cr-afe-close aria-label="Close">x</button>
        </header>
        <p class="cr-afe-blurb">Admin/mod tool. Flag a game asset, attach a reference, pick a pipeline depth, and submit — jobs run on the ArcForge pipeline and report back here.</p>

        <div class="cr-afe-grid">
          <div class="cr-afe-col">
            <div class="cr-modal-section-title">Target</div>
            <label class="cr-afe-field">Type
              <select data-cr-afe-type>${ASSET_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}</select>
            </label>
            <label class="cr-afe-field">Asset id
              <input type="text" data-cr-afe-id placeholder="e.g. forest_wolf" />
            </label>
            <label class="cr-afe-field">Label
              <input type="text" data-cr-afe-label placeholder="Forest Wolf" />
            </label>
            <label class="cr-afe-field">Reference image
              <input type="file" accept="image/*" data-cr-afe-file />
            </label>
            <div class="cr-afe-imgname" data-cr-afe-imgname></div>
            <label class="cr-afe-field">Prompt (optional)
              <textarea data-cr-afe-prompt rows="2" placeholder="Dark gothic fantasy wolf, game-ready..."></textarea>
            </label>
            <div class="cr-modal-section-title">Pipeline depth</div>
            <div class="cr-afe-stages" data-cr-afe-stages>
              ${PIPELINE.map((p, i) => `<button type="button" class="cr-afe-stage ${i === PIPELINE.length - 1 ? 'active' : ''}" data-cr-afe-stage="${p.id}" title="${escapeHtml(p.desc)}">${escapeHtml(p.label)}</button>`).join('')}
            </div>
            <button type="button" class="cr-options-pill cr-afe-add" data-cr-afe-add>+ Queue job</button>
          </div>

          <div class="cr-afe-col">
            <div class="cr-modal-section-title">Queue <span data-cr-afe-count></span></div>
            <div class="cr-afe-queue" data-cr-afe-queue></div>
            <div class="cr-afe-actions">
              <button type="button" class="cr-options-pill cr-afe-submit" data-cr-afe-submit>Submit all</button>
              <button type="button" class="cr-options-pill" data-cr-afe-clear>Clear done</button>
            </div>
            <div class="cr-afe-status" data-cr-afe-status></div>
          </div>
        </div>
      </div>
    </div>
  `;
  host.removeAttribute('hidden');

  const $ = <T extends HTMLElement>(sel: string) => host.querySelector<T>(sel)!;
  const typeEl = $<HTMLSelectElement>('[data-cr-afe-type]');
  const idEl = $<HTMLInputElement>('[data-cr-afe-id]');
  const labelEl = $<HTMLInputElement>('[data-cr-afe-label]');
  const fileEl = $<HTMLInputElement>('[data-cr-afe-file]');
  const imgNameEl = $('[data-cr-afe-imgname]');
  const promptEl = $<HTMLTextAreaElement>('[data-cr-afe-prompt]');
  const stagesEl = $('[data-cr-afe-stages]');
  const queueEl = $('[data-cr-afe-queue]');
  const countEl = $('[data-cr-afe-count]');
  const statusEl = $('[data-cr-afe-status]');

  let stage: StageId = 'animated_glb';
  let imageData = '';
  let imageName = '';

  const setStatus = (s: string) => { statusEl.textContent = s; };

  fileEl.addEventListener('change', () => {
    const f = fileEl.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setStatus('Pick an image file.'); return; }
    if (f.size > 8 * 1024 * 1024) { setStatus('Image over 8 MB — use a smaller reference.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      imageData = String(reader.result ?? '');
      imageName = f.name;
      imgNameEl.textContent = `Reference: ${f.name}`;
      if (!labelEl.value.trim()) labelEl.value = f.name.replace(/\.[^.]+$/, '');
    };
    reader.readAsDataURL(f);
  });

  stagesEl.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest('[data-cr-afe-stage]') as HTMLElement | null;
    if (!b) return;
    stage = b.dataset.crAfeStage as StageId;
    stagesEl.querySelectorAll('.cr-afe-stage').forEach((el) => el.classList.toggle('active', el === b));
  });

  const renderQueue = () => {
    countEl.textContent = queue.length ? `(${queue.length})` : '';
    if (!queue.length) { queueEl.innerHTML = '<div class="cr-afe-empty">No jobs queued.</div>'; return; }
    queueEl.innerHTML = queue.map((j) => `
      <div class="cr-afe-job cr-afe-${j.status}" data-job="${j.id}">
        <div class="cr-afe-job-head">
          <strong>${escapeHtml(j.assetLabel || j.assetId)}</strong>
          <span class="cr-afe-badge">${j.status}</span>
        </div>
        <small>${escapeHtml(j.assetType)} · ${escapeHtml(PIPELINE.find((p) => p.id === j.pipeline)?.label ?? j.pipeline)}${j.note ? ' · ' + escapeHtml(j.note) : ''}</small>
        <button type="button" class="cr-afe-remove" data-cr-afe-remove="${j.id}">×</button>
      </div>
    `).join('');
  };

  $('[data-cr-afe-add]').addEventListener('click', () => {
    const label = labelEl.value.trim() || idEl.value.trim() || 'Custom Asset';
    const id = idEl.value.trim() || slug(label);
    queue.push({
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId: id,
      assetLabel: label,
      assetType: typeEl.value as AssetType,
      pipeline: stage,
      imageData,
      imageName,
      prompt: promptEl.value.trim(),
      status: 'queued',
      note: '',
      createdAt: Date.now(),
    });
    saveQueue(queue);
    renderQueue();
    setStatus(`Queued ${label}. Click "Submit all" to send to the pipeline.`);
    idEl.value = ''; labelEl.value = ''; promptEl.value = '';
    imageData = ''; imageName = ''; imgNameEl.textContent = ''; fileEl.value = '';
  });

  queueEl.addEventListener('click', (ev) => {
    const rm = (ev.target as HTMLElement).closest('[data-cr-afe-remove]') as HTMLElement | null;
    if (!rm) return;
    queue = queue.filter((j) => j.id !== rm.dataset.crAfeRemove);
    saveQueue(queue); renderQueue();
  });

  $('[data-cr-afe-clear]').addEventListener('click', () => {
    queue = queue.filter((j) => j.status !== 'done');
    saveQueue(queue); renderQueue();
  });

  $('[data-cr-afe-submit]').addEventListener('click', async () => {
    const pending = queue.filter((j) => j.status === 'queued');
    if (!pending.length) { setStatus('Nothing queued.'); return; }
    setStatus(`Submitting ${pending.length} job(s)…`);
    for (const job of pending) {
      job.status = 'running'; saveQueue(queue); renderQueue();
      try {
        const stages = job.pipeline === 'animated_glb'
          ? ['png16', 'tripoSR_32', 'hunyuan_64', 'meshy_128']
          : ['png16', 'tripoSR_32', 'hunyuan_64'];
        const resp = await api('enqueue', {
          method: 'POST',
          body: JSON.stringify({
            assetId: job.assetId,
            assetType: job.assetType,
            sourceImage: job.imageData || undefined,
            prompt: job.prompt || undefined,
            stages,
            maxAttempts: 3,
            timeoutMs: 5 * 60 * 1000,
          }),
        });
        if (resp.ok) { job.status = 'done'; job.note = 'queued in pipeline'; }
        else if (resp.status === 403) { job.status = 'failed'; job.note = 'not authorized'; setStatus('Pipeline rejected: admin/mod only.'); }
        else { job.status = 'failed'; job.note = `pipeline ${resp.status}`; }
      } catch {
        job.status = 'failed'; job.note = 'pipeline unreachable';
      }
      saveQueue(queue); renderQueue();
    }
    setStatus('Submission complete.');
  });

  host.onclick = (ev) => {
    const t = ev.target as HTMLElement;
    if (t.hasAttribute('data-cr-afe-close') || t.hasAttribute('data-cr-afe-overlay')) closeEditor();
  };

  renderQueue();
  // Surface pipeline reachability so the admin knows the backend is alive.
  api('status').then((r) => {
    if (r.status === 403) setStatus('You are not authorized (admin/mod only).');
    else if (r.ok) setStatus('Pipeline online.');
    else setStatus(`Pipeline status ${r.status}.`);
  }).catch(() => setStatus('Pipeline offline or unreachable.'));
}

// Escape-to-close
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const host = document.getElementById(MODAL_ID);
    if (host && !host.hasAttribute('hidden')) { closeEditor(); ev.stopPropagation(); }
  }, { capture: true });
}
