// Moveable music widget — a small draggable now-playing control the user asked
// for. Shows the current Cryptic Realm track + a play/pause toggle, and can be
// dragged anywhere (position persisted). Reuses the same drag approach as the
// chat frame. Toggling it switches the original CR MP3 soundtrack on/off; when
// off, the engine falls back to its procedural synth.

import { crypticMusic, CRYPTIC_TRACKS } from '../../game/cryptic_music';
import { music } from '../../game/music';

const ID = 'cr-music-widget';
const POS_KEY = 'cr_music_widget_pos';

interface Pos { left: number; top: number }

function readPos(): Pos | null {
  try { const p = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null'); return p && typeof p.left === 'number' ? p : null; }
  catch { return null; }
}
function savePos(p: Pos): void {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function mountMusicWidget(): void {
  if (typeof document === 'undefined' || document.getElementById(ID)) return;

  const el = document.createElement('div');
  el.id = ID;
  el.innerHTML = `
    <button type="button" class="cr-mw-launcher" title="Cryptic Realm Music" aria-label="Open music player">
      <span class="cr-mw-launcher-note">♪</span>
    </button>
    <div class="cr-mw-panel">
      <div class="cr-mw-bar">
        <button type="button" class="cr-mw-grip" title="Drag to move" aria-label="Move music widget">⠿</button>
        <span class="cr-mw-title" data-cr-mw-title>Cryptic Realm Music</span>
        <button type="button" class="cr-mw-collapse" title="Minimize" aria-label="Minimize player">▾</button>
      </div>
      <div class="cr-mw-controls">
        <button type="button" class="cr-mw-prev" title="Previous track" aria-label="Previous track">⏮</button>
        <button type="button" class="cr-mw-toggle" title="Play / pause" aria-label="Play or pause">♪</button>
        <button type="button" class="cr-mw-next" title="Next track" aria-label="Next track">⏭</button>
        <button type="button" class="cr-mw-shuffle" title="Shuffle" aria-label="Shuffle" aria-pressed="false">🔀</button>
        <button type="button" class="cr-mw-list-btn" title="Pick a song" aria-label="Pick a song" aria-expanded="false">☰ Songs</button>
      </div>
      <div class="cr-mw-list" hidden>
        <button type="button" class="cr-mw-track cr-mw-auto" data-src="">↺ Auto (zone music)</button>
        ${CRYPTIC_TRACKS.map((t) => `<button type="button" class="cr-mw-track" data-src="${t.src}">${t.title}</button>`).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(el);

  // Collapsed (launcher button) vs expanded (full panel). Original CR behaviour:
  // a small button that expands to the player and tucks back to a button.
  const COLLAPSE_KEY = 'cr_music_widget_collapsed';
  const launcher = el.querySelector<HTMLButtonElement>('.cr-mw-launcher')!;
  const panel = el.querySelector<HTMLElement>('.cr-mw-panel')!;
  const collapseBtn = el.querySelector<HTMLButtonElement>('.cr-mw-collapse')!;
  const setCollapsed = (c: boolean) => {
    el.classList.toggle('cr-mw-collapsed', c);
    try { localStorage.setItem(COLLAPSE_KEY, c ? '1' : '0'); } catch { /* ignore */ }
  };
  // Default collapsed so it's unobtrusive until opened.
  let startCollapsed = true;
  try { startCollapsed = localStorage.getItem(COLLAPSE_KEY) !== '0'; } catch { /* default */ }
  setCollapsed(startCollapsed);
  launcher.addEventListener('click', (e) => { e.stopPropagation(); setCollapsed(false); });
  collapseBtn.addEventListener('click', (e) => { e.stopPropagation(); setCollapsed(true); });

  const pos = readPos();
  if (pos) { el.style.left = `${pos.left}px`; el.style.top = `${pos.top}px`; el.style.right = 'auto'; el.style.bottom = 'auto'; }

  const titleEl = el.querySelector<HTMLElement>('[data-cr-mw-title]')!;
  const toggle = el.querySelector<HTMLButtonElement>('.cr-mw-toggle')!;
  const grip = el.querySelector<HTMLButtonElement>('.cr-mw-grip')!;
  const prevBtn = el.querySelector<HTMLButtonElement>('.cr-mw-prev')!;
  const nextBtn = el.querySelector<HTMLButtonElement>('.cr-mw-next')!;
  const shuffleBtn = el.querySelector<HTMLButtonElement>('.cr-mw-shuffle')!;
  const listBtn = el.querySelector<HTMLButtonElement>('.cr-mw-list-btn')!;
  const listEl = el.querySelector<HTMLElement>('.cr-mw-list')!;

  const refresh = () => {
    const on = crypticMusic.enabled;
    toggle.classList.toggle('cr-mw-off', !on);
    toggle.textContent = on ? '♪' : '♪̸';
    const track = on ? crypticMusic.nowPlaying() : (music.enabled ? music.nowPlaying() : null);
    titleEl.textContent = on
      ? (track ? `CR · ${track}` : 'Cryptic Realm Music')
      : (track ? `Synth · ${track}` : 'Music off');
    el.classList.toggle('cr-mw-playing', !!track && on);
    launcher.title = on ? (track ? `♪ ${track}` : 'Cryptic Realm Music') : 'Music off';
    shuffleBtn.classList.toggle('cr-mw-active', crypticMusic.shuffle);
    shuffleBtn.setAttribute('aria-pressed', crypticMusic.shuffle ? 'true' : 'false');
    // Highlight the active track in the list (Auto row when not manual).
    const activeSrc = crypticMusic.manual ? crypticMusic.track : '';
    listEl.querySelectorAll<HTMLElement>('.cr-mw-track').forEach((b) => {
      b.classList.toggle('cr-mw-track-active', (b.dataset.src ?? '') === activeSrc);
    });
  };
  refresh();
  crypticMusic.setOnTrackChange(refresh);
  setInterval(refresh, 2000);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    crypticMusic.setEnabled(!crypticMusic.enabled);
    crypticMusic.kick();
    refresh();
  });
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); crypticMusic.prev(); crypticMusic.kick(); refresh(); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); crypticMusic.next(); crypticMusic.kick(); refresh(); });
  shuffleBtn.addEventListener('click', (e) => { e.stopPropagation(); crypticMusic.toggleShuffle(); crypticMusic.kick(); refresh(); });
  listBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = listEl.hasAttribute('hidden');
    if (open) listEl.removeAttribute('hidden'); else listEl.setAttribute('hidden', '');
    listBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  listEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.cr-mw-track');
    if (!btn) return;
    e.stopPropagation();
    const src = btn.dataset.src ?? '';
    if (src) crypticMusic.playTrack(src); else crypticMusic.setAuto();
    crypticMusic.kick();
    listEl.setAttribute('hidden', '');
    listBtn.setAttribute('aria-expanded', 'false');
    refresh();
  });

  // Drag (pointer capture; position persisted). Bound to the grip when expanded
  // and the launcher when collapsed. A small movement threshold means a launcher
  // tap still counts as a click (expand) rather than a drag.
  const makeDraggable = (handle: HTMLElement) => {
    handle.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      handle.setPointerCapture?.(ev.pointerId);
      const rect = el.getBoundingClientRect();
      const ox = ev.clientX - rect.left;
      const oy = ev.clientY - rect.top;
      const startX = ev.clientX, startY = ev.clientY;
      let moved = false;
      const move = (m: PointerEvent) => {
        if (!moved && Math.hypot(m.clientX - startX, m.clientY - startY) < 4) return;
        moved = true;
        const left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, m.clientX - ox));
        const top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, m.clientY - oy));
        el.style.left = `${left}px`; el.style.top = `${top}px`;
        el.style.right = 'auto'; el.style.bottom = 'auto';
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        if (moved) { const r = el.getBoundingClientRect(); savePos({ left: r.left, top: r.top }); }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, { once: true });
    });
  };
  makeDraggable(grip);
  makeDraggable(launcher);
}
