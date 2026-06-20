// Moveable music widget — a small draggable now-playing control the user asked
// for. Shows the current Cryptic Realm track + a play/pause toggle, and can be
// dragged anywhere (position persisted). Reuses the same drag approach as the
// chat frame. Toggling it switches the original CR MP3 soundtrack on/off; when
// off, the engine falls back to its procedural synth.

import { crypticMusic } from '../../game/cryptic_music';
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
    <button type="button" class="cr-mw-grip" title="Drag to move" aria-label="Move music widget">⠿</button>
    <button type="button" class="cr-mw-toggle" title="Toggle music" aria-label="Toggle music">♪</button>
    <span class="cr-mw-title" data-cr-mw-title>—</span>
    <button type="button" class="cr-mw-next" title="Next track" aria-label="Next track" hidden>⏭</button>
  `;
  document.body.appendChild(el);

  const pos = readPos();
  if (pos) { el.style.left = `${pos.left}px`; el.style.top = `${pos.top}px`; el.style.right = 'auto'; el.style.bottom = 'auto'; }

  const titleEl = el.querySelector<HTMLElement>('[data-cr-mw-title]')!;
  const toggle = el.querySelector<HTMLButtonElement>('.cr-mw-toggle')!;
  const grip = el.querySelector<HTMLButtonElement>('.cr-mw-grip')!;

  const refresh = () => {
    const on = crypticMusic.enabled;
    toggle.classList.toggle('cr-mw-off', !on);
    toggle.textContent = on ? '♪' : '♪̸';
    const track = on ? crypticMusic.nowPlaying() : (music.enabled ? music.nowPlaying() : null);
    titleEl.textContent = on
      ? (track ? `CR · ${track}` : 'Cryptic Realm Music')
      : (track ? `Synth · ${track}` : 'Music off');
    el.classList.toggle('cr-mw-playing', !!track && on);
  };
  refresh();
  setInterval(refresh, 2000);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    crypticMusic.setEnabled(!crypticMusic.enabled);
    crypticMusic.kick();
    refresh();
  });

  // Drag via the grip (pointer capture; position persisted).
  grip.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    grip.setPointerCapture?.(ev.pointerId);
    const rect = el.getBoundingClientRect();
    const ox = ev.clientX - rect.left;
    const oy = ev.clientY - rect.top;
    const move = (m: PointerEvent) => {
      const left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, m.clientX - ox));
      const top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, m.clientY - oy));
      el.style.left = `${left}px`; el.style.top = `${top}px`;
      el.style.right = 'auto'; el.style.bottom = 'auto';
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      const r = el.getBoundingClientRect();
      savePos({ left: r.left, top: r.top });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  });
}
