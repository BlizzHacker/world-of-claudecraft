const STORE_KEY = 'cr_chat_frame_layout';
const LOCK_KEY = 'cr_chat_frame_locked';

type ChatLayout = {
  left: number;
  bottom: number;
  width: number;
  height: number;
};

function readLocked(): boolean {
  try { return localStorage.getItem(LOCK_KEY) === '1'; } catch { return false; }
}
function saveLocked(locked: boolean): void {
  try { localStorage.setItem(LOCK_KEY, locked ? '1' : '0'); } catch { /* storage unavailable */ }
}

function readLayout(): Partial<ChatLayout> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLayout(layout: ChatLayout): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(layout)); } catch { /* storage unavailable */ }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isDesktopLayout(): boolean {
  return !(document.body.classList.contains('mobile-touch') || (window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth < 900));
}

export function mountChatFrame(): void {
  const wrap = document.getElementById('chatlog-wrap') as HTMLElement | null;
  const frame = document.getElementById('chatlog-frame') as HTMLElement | null;
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  if (!wrap || !frame || !input || wrap.dataset.crChatFrame === 'mounted') return;
  wrap.dataset.crChatFrame = 'mounted';

  const grip = document.createElement('button');
  grip.type = 'button';
  grip.className = 'chat-frame-grip';
  grip.setAttribute('aria-label', 'Move chat');
  grip.title = 'Move chat';
  const resize = document.createElement('button');
  resize.type = 'button';
  resize.className = 'chat-frame-resize';
  resize.setAttribute('aria-label', 'Resize chat');
  resize.title = 'Resize chat';
  const lock = document.createElement('button');
  lock.type = 'button';
  lock.className = 'chat-frame-lock';
  wrap.prepend(grip);
  wrap.appendChild(resize);
  wrap.appendChild(lock);

  let locked = readLocked();
  const applyLock = () => {
    wrap.classList.toggle('chat-locked', locked);
    grip.style.display = locked ? 'none' : '';
    resize.style.display = locked ? 'none' : '';
    lock.textContent = locked ? '🔒' : '🔓';
    lock.title = locked ? 'Chat locked — click to move/resize' : 'Lock chat position';
    lock.setAttribute('aria-label', lock.title);
  };
  lock.addEventListener('click', () => { locked = !locked; saveLocked(locked); applyLock(); });

  const defaultLayout = (): ChatLayout => {
    const rect = wrap.getBoundingClientRect();
    return {
      left: rect.left || 12,
      bottom: Math.max(8, window.innerHeight - rect.bottom),
      width: rect.width || 370,
      height: frame.getBoundingClientRect().height || 184,
    };
  };

  const normalize = (layout: Partial<ChatLayout>): ChatLayout => {
    const fallback = defaultLayout();
    const width = clamp(Number(layout.width ?? fallback.width), 260, Math.min(620, window.innerWidth - 24));
    const height = clamp(Number(layout.height ?? fallback.height), 112, Math.min(360, window.innerHeight - 160));
    const left = clamp(Number(layout.left ?? fallback.left), 8, Math.max(8, window.innerWidth - width - 8));
    const bottom = clamp(Number(layout.bottom ?? fallback.bottom), 8, Math.max(8, window.innerHeight - height - 72));
    return { left, bottom, width, height };
  };

  let current = normalize(readLayout());

  const apply = (layout: ChatLayout, persist = true) => {
    if (!isDesktopLayout()) return;
    current = normalize(layout);
    wrap.style.left = `${current.left}px`;
    wrap.style.bottom = `${current.bottom}px`;
    wrap.style.width = `${current.width}px`;
    frame.style.height = `${current.height}px`;
    input.style.left = `${current.left}px`;
    input.style.bottom = `${current.bottom + current.height + 24}px`;
    input.style.width = `${current.width}px`;
    if (persist) saveLayout(current);
  };

  apply(current, false);

  const drag = (ev: PointerEvent) => {
    if (!isDesktopLayout() || locked) return;
    ev.preventDefault();
    grip.setPointerCapture?.(ev.pointerId);
    const start = { ...current, x: ev.clientX, y: ev.clientY };
    const move = (moveEv: PointerEvent) => {
      apply({
        ...start,
        left: start.left + (moveEv.clientX - start.x),
        bottom: start.bottom - (moveEv.clientY - start.y),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      grip.releasePointerCapture?.(ev.pointerId);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  };

  const resizeFrame = (ev: PointerEvent) => {
    if (!isDesktopLayout() || locked) return;
    ev.preventDefault();
    resize.setPointerCapture?.(ev.pointerId);
    const start = { ...current, x: ev.clientX, y: ev.clientY };
    const move = (moveEv: PointerEvent) => {
      apply({
        ...start,
        width: start.width + (moveEv.clientX - start.x),
        height: start.height - (moveEv.clientY - start.y),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      resize.releasePointerCapture?.(ev.pointerId);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  };

  grip.addEventListener('pointerdown', drag);
  resize.addEventListener('pointerdown', resizeFrame);
  applyLock();
  grip.addEventListener('dblclick', () => {
    try { localStorage.removeItem(STORE_KEY); } catch { /* storage unavailable */ }
    apply(defaultLayout());
  });
  window.addEventListener('resize', () => apply(current, false));
}
