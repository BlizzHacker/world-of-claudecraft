// Moveable music widget — a small draggable now-playing control the user asked
// for. Shows the current Cryptic Realm track + a play/pause toggle, and can be
// dragged anywhere (position persisted). Reuses the same drag approach as the
// chat frame. Toggling it switches the CR soundtrack (both playback engines)
// on/off; off means silence, there is no synth fallback.

import { CRYPTIC_TRACKS, crypticMusic } from '../../game/cryptic_music';
import { music } from '../../game/music';

const ID = 'cr-music-widget';
const POS_KEY = 'cr_music_widget_pos';
const LOCK_KEY = 'cr_music_widget_locked';
const EXT_KEY = 'cr_music_ext_url';
const HIDDEN_KEY = 'cr_music_widget_hidden';

// Menu-driven show/hide/toggle for the floater, set when the widget mounts. Lets the
// top/exit-menu music button open + close the one floating player.
interface MusicWidgetControls {
  isHidden: () => boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}
let widgetControls: MusicWidgetControls | null = null;
const hiddenListeners = new Set<(hidden: boolean) => void>();

/** Toggle the floating music player open/closed. The menu music button calls this. */
export function toggleMusicWidget(): void {
  widgetControls?.toggle();
}
export function showMusicWidget(): void {
  widgetControls?.show();
}
export function isMusicWidgetHidden(): boolean {
  return widgetControls?.isHidden() ?? true;
}
/** Subscribe to hidden-state changes (so a menu button can reflect open/closed). */
export function onMusicWidgetHiddenChange(cb: (hidden: boolean) => void): () => void {
  hiddenListeners.add(cb);
  return () => hiddenListeners.delete(cb);
}

// Turn a Spotify / Pandora / YouTube / Apple Music share link into an embeddable
// iframe URL. Returns null if it isn't a recognised embeddable provider.
function toEmbedUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    // Spotify: open.spotify.com/<type>/<id> -> open.spotify.com/embed/<type>/<id>
    if (host === 'open.spotify.com') {
      return `https://open.spotify.com/embed${u.pathname}`;
    }
    // YouTube: watch?v=ID or youtu.be/ID -> youtube.com/embed/ID
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith('/playlist'))
        return `https://www.youtube.com/embed/videoseries?list=${u.searchParams.get('list')}`;
    }
    if (host === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
    // Pandora: embeddable via its own embed host for stations.
    if (host === 'pandora.com') return url; // Pandora embeds open in-page; keep as-is.
    // Apple Music: music.apple.com/... -> embed.music.apple.com/...
    if (host === 'music.apple.com') return `https://embed.${host}${u.pathname}${u.search}`;
    // SoundCloud handled via its player widget.
    if (host === 'soundcloud.com')
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`;
  } catch {
    /* not a URL */
  }
  return null;
}

interface Pos {
  left: number;
  top: number;
}

function readPos(): Pos | null {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null');
    return p && typeof p.left === 'number' ? p : null;
  } catch {
    return null;
  }
}
function savePos(p: Pos): void {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
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
        <button type="button" class="cr-mw-ext-btn" title="Spotify / Pandora / YouTube" aria-label="External music" aria-expanded="false">🎧</button>
        <button type="button" class="cr-mw-lock" title="Lock position" aria-label="Lock widget position" aria-pressed="false">🔓</button>
      </div>
      <div class="cr-mw-list" hidden>
        <button type="button" class="cr-mw-track cr-mw-auto" data-src="">↺ Auto (zone music)</button>
        ${CRYPTIC_TRACKS.map((t) => `<button type="button" class="cr-mw-track" data-src="${t.src}">${t.title}</button>`).join('')}
      </div>
      <div class="cr-mw-ext" hidden>
        <div class="cr-mw-ext-row">
          <input type="url" class="cr-mw-ext-input" placeholder="Paste Spotify / YouTube / Apple Music / SoundCloud link" />
          <button type="button" class="cr-mw-ext-load">Load</button>
          <button type="button" class="cr-mw-ext-clear" title="Clear">✕</button>
        </div>
        <div class="cr-mw-ext-frame" hidden></div>
        <div class="cr-mw-ext-hint">Plays your own playlist alongside the game. Spotify needs a logged-in spotify.com tab.</div>
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
    try {
      localStorage.setItem(COLLAPSE_KEY, c ? '1' : '0');
    } catch {
      /* ignore */
    }
  };
  // Default collapsed so it's unobtrusive until opened.
  let startCollapsed = true;
  try {
    startCollapsed = localStorage.getItem(COLLAPSE_KEY) !== '0';
  } catch {
    /* default */
  }
  setCollapsed(startCollapsed);
  launcher.addEventListener('click', (e) => {
    e.stopPropagation();
    setCollapsed(false);
  });
  // (collapse button binding moved below to setHidden — the ▾ hides the whole floater.)

  // Fully HIDDEN by default (not just collapsed): the floater only appears when the
  // player opens it from the menu's music button. This is the "shouldn't show both" fix —
  // one menu button toggles the one floater, instead of the floater always cluttering the
  // screen. Music keeps playing while hidden; hiding is purely a UI affordance.
  const setHidden = (h: boolean) => {
    el.classList.toggle('cr-mw-hidden', h);
    try {
      localStorage.setItem(HIDDEN_KEY, h ? '1' : '0');
    } catch {
      /* ignore */
    }
    for (const cb of hiddenListeners) cb(h);
  };
  let startHidden = true;
  try {
    startHidden = localStorage.getItem(HIDDEN_KEY) !== '0';
  } catch {
    /* default hidden */
  }
  setHidden(startHidden);
  // Expose open/close/toggle to the menu button.
  widgetControls = {
    isHidden: () => el.classList.contains('cr-mw-hidden'),
    show: () => {
      setHidden(false);
      setCollapsed(false);
    },
    hide: () => setHidden(true),
    toggle: () => setHidden(!el.classList.contains('cr-mw-hidden')),
  };
  // The panel's collapse (▾) now hides the whole floater (back to the menu button),
  // rather than leaving a stray launcher note on screen.
  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setHidden(true);
  });

  const pos = readPos();
  if (pos) {
    el.style.left = `${pos.left}px`;
    el.style.top = `${pos.top}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }

  const titleEl = el.querySelector<HTMLElement>('[data-cr-mw-title]')!;
  const toggle = el.querySelector<HTMLButtonElement>('.cr-mw-toggle')!;
  const grip = el.querySelector<HTMLButtonElement>('.cr-mw-grip')!;
  const prevBtn = el.querySelector<HTMLButtonElement>('.cr-mw-prev')!;
  const nextBtn = el.querySelector<HTMLButtonElement>('.cr-mw-next')!;
  const shuffleBtn = el.querySelector<HTMLButtonElement>('.cr-mw-shuffle')!;
  const listBtn = el.querySelector<HTMLButtonElement>('.cr-mw-list-btn')!;
  const listEl = el.querySelector<HTMLElement>('.cr-mw-list')!;
  const lockBtn = el.querySelector<HTMLButtonElement>('.cr-mw-lock')!;
  const extBtn = el.querySelector<HTMLButtonElement>('.cr-mw-ext-btn')!;
  const extEl = el.querySelector<HTMLElement>('.cr-mw-ext')!;
  const extInput = el.querySelector<HTMLInputElement>('.cr-mw-ext-input')!;
  const extLoad = el.querySelector<HTMLButtonElement>('.cr-mw-ext-load')!;
  const extClear = el.querySelector<HTMLButtonElement>('.cr-mw-ext-clear')!;
  const extFrame = el.querySelector<HTMLElement>('.cr-mw-ext-frame')!;

  // Lock state — when locked, the widget can't be dragged (handles ignore drag).
  let locked = false;
  try {
    locked = localStorage.getItem(LOCK_KEY) === '1';
  } catch {
    /* default */
  }
  const applyLock = () => {
    el.classList.toggle('cr-mw-locked', locked);
    lockBtn.textContent = locked ? '🔒' : '🔓';
    lockBtn.setAttribute('aria-pressed', locked ? 'true' : 'false');
    lockBtn.title = locked ? 'Unlock position' : 'Lock position';
  };
  applyLock();
  lockBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    locked = !locked;
    try {
      localStorage.setItem(LOCK_KEY, locked ? '1' : '0');
    } catch {
      /* ignore */
    }
    applyLock();
  });

  // External music: embed a Spotify/YouTube/Apple/SoundCloud player. Persisted.
  const loadExternal = (raw: string) => {
    const embed = toEmbedUrl(raw);
    if (!embed) {
      extFrame.setAttribute('hidden', '');
      extFrame.innerHTML =
        '<div class="cr-mw-ext-err">Unrecognized link. Use a Spotify, YouTube, Apple Music, or SoundCloud share URL.</div>';
      extFrame.removeAttribute('hidden');
      return;
    }
    extFrame.innerHTML = `<iframe src="${embed}" width="100%" height="152" frameborder="0" loading="lazy"
      allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    extFrame.removeAttribute('hidden');
    try {
      localStorage.setItem(EXT_KEY, raw);
    } catch {
      /* ignore */
    }
  };
  try {
    const saved = localStorage.getItem(EXT_KEY);
    if (saved) {
      extInput.value = saved;
      loadExternal(saved);
    }
  } catch {
    /* ignore */
  }
  extBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = extEl.hasAttribute('hidden');
    if (open) extEl.removeAttribute('hidden');
    else extEl.setAttribute('hidden', '');
    extBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  extLoad.addEventListener('click', (e) => {
    e.stopPropagation();
    loadExternal(extInput.value);
  });
  extInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadExternal(extInput.value);
    }
  });
  extClear.addEventListener('click', (e) => {
    e.stopPropagation();
    extInput.value = '';
    extFrame.setAttribute('hidden', '');
    extFrame.innerHTML = '';
    try {
      localStorage.removeItem(EXT_KEY);
    } catch {
      /* ignore */
    }
  });

  const refresh = () => {
    const on = crypticMusic.enabled;
    toggle.classList.toggle('cr-mw-off', !on);
    toggle.textContent = on ? '♪' : '♪̸';
    const track = on ? crypticMusic.nowPlaying() : null;
    titleEl.textContent = on ? (track ? `CR · ${track}` : 'Cryptic Realm Music') : 'Music off';
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
    // Drive BOTH engines like the menu and mobile toggles: off means silence.
    const on = !(crypticMusic.enabled || music.enabled);
    crypticMusic.setEnabled(on);
    music.setEnabled(on);
    crypticMusic.kick();
    refresh();
  });
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    crypticMusic.prev();
    crypticMusic.kick();
    refresh();
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    crypticMusic.next();
    crypticMusic.kick();
    refresh();
  });
  shuffleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    crypticMusic.toggleShuffle();
    crypticMusic.kick();
    refresh();
  });
  listBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = listEl.hasAttribute('hidden');
    if (open) listEl.removeAttribute('hidden');
    else listEl.setAttribute('hidden', '');
    listBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  listEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.cr-mw-track');
    if (!btn) return;
    e.stopPropagation();
    const src = btn.dataset.src ?? '';
    if (src) crypticMusic.playTrack(src);
    else crypticMusic.setAuto();
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
      if (locked && handle === grip) return; // locked: grip won't drag (launcher still expands)
      ev.preventDefault();
      handle.setPointerCapture?.(ev.pointerId);
      const rect = el.getBoundingClientRect();
      const ox = ev.clientX - rect.left;
      const oy = ev.clientY - rect.top;
      const startX = ev.clientX,
        startY = ev.clientY;
      let moved = false;
      const move = (m: PointerEvent) => {
        if (!moved && Math.hypot(m.clientX - startX, m.clientY - startY) < 4) return;
        moved = true;
        const left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, m.clientX - ox));
        const top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, m.clientY - oy));
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        if (moved) {
          const r = el.getBoundingClientRect();
          savePos({ left: r.left, top: r.top });
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, { once: true });
    });
  };
  makeDraggable(grip);
  makeDraggable(launcher);
}
