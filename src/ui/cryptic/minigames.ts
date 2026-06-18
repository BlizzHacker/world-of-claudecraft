// Lightweight Cryptic Realm mini-games restored into the in-game
// Customization surface. These are intentionally local-only canvas games:
// no sim imports, no server writes, and no raw multi-GB asset pack dependency.

type MiniGameId = 'nova-swarm' | 'void-runner' | 'cryptic-fishing';

interface MiniGameDef {
  id: MiniGameId;
  name: string;
  label: string;
}

const MODAL_ID = 'cr-minigame-modal';
const STORE_PREFIX = 'cr_minigame_high_';

const GAMES: readonly MiniGameDef[] = [
  { id: 'nova-swarm', name: 'Nova Swarm', label: 'Wave shooter' },
  { id: 'void-runner', name: 'Void Runner', label: 'Rift dodge' },
  { id: 'cryptic-fishing', name: 'Cryptic Fishing', label: 'Timing catch' },
];

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function highScore(id: MiniGameId): number {
  try { return Number(window.localStorage?.getItem(`${STORE_PREFIX}${id}`) ?? '0') || 0; }
  catch { return 0; }
}

function saveHighScore(id: MiniGameId, score: number): void {
  const prev = highScore(id);
  if (score <= prev) return;
  try { window.localStorage?.setItem(`${STORE_PREFIX}${id}`, String(Math.floor(score))); }
  catch { /* storage unavailable */ }
}

export function miniGameSectionHtml(): string {
  const buttons = GAMES.map((g) => `
    <button type="button" class="cr-minigame-card" data-cr-minigame="${escapeHtml(g.id)}">
      <strong>${escapeHtml(g.name)}</strong>
      <span>${escapeHtml(g.label)}</span>
      <small>Best ${highScore(g.id)}</small>
    </button>
  `).join('');
  return `
    <div class="cr-modal-section">
      <div class="cr-modal-section-title">Mini-games</div>
      <div class="cr-minigame-grid" role="group" aria-label="Mini-games">
        ${buttons}
      </div>
    </div>
  `;
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

function closeMiniGame(): void {
  const host = document.getElementById(MODAL_ID);
  host?.setAttribute('hidden', '');
  host?.dispatchEvent(new CustomEvent('cr-minigame-close'));
}

function gameById(id: string | null | undefined): MiniGameDef | null {
  return GAMES.find((g) => g.id === id) ?? null;
}

export function openMiniGame(id: MiniGameId): void {
  if (typeof document === 'undefined') return;
  const game = gameById(id);
  if (!game) return;
  const host = ensureHost();
  host.innerHTML = `
    <div class="cr-modal-overlay cr-minigame-overlay" data-cr-minigame-overlay>
      <div class="cr-modal-panel cr-minigame-panel" role="dialog" aria-modal="true" aria-labelledby="cr-minigame-title">
        <header class="cr-modal-header">
          <h2 id="cr-minigame-title">${escapeHtml(game.name)}</h2>
          <button type="button" class="cr-modal-close" data-cr-minigame-close aria-label="Close">x</button>
        </header>
        <div class="cr-minigame-hud">
          <span data-cr-score>Score 0</span>
          <span data-cr-status>Ready</span>
          <span>Best ${highScore(id)}</span>
        </div>
        <canvas class="cr-minigame-canvas" width="640" height="360"></canvas>
      </div>
    </div>
  `;
  host.removeAttribute('hidden');
  host.onclick = (ev) => {
    const target = ev.target as HTMLElement | null;
    if (target?.hasAttribute('data-cr-minigame-close') || target?.hasAttribute('data-cr-minigame-overlay')) {
      closeMiniGame();
    }
  };
  runMiniGame(host, id);
}

export function handleMiniGameClick(target: HTMLElement | null): boolean {
  const btn = target?.closest('[data-cr-minigame]') as HTMLElement | null;
  const id = gameById(btn?.dataset.crMinigame)?.id;
  if (!id) return false;
  openMiniGame(id);
  return true;
}

interface Runner {
  stop(): void;
}

function runMiniGame(host: HTMLElement, id: MiniGameId): void {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas');
  const scoreEl = host.querySelector<HTMLElement>('[data-cr-score]');
  const statusEl = host.querySelector<HTMLElement>('[data-cr-status]');
  const ctx = canvas?.getContext?.('2d');
  if (!canvas || !ctx) {
    if (statusEl) statusEl.textContent = 'Canvas unavailable';
    return;
  }
  const setScore = (n: number) => { if (scoreEl) scoreEl.textContent = `Score ${Math.floor(n)}`; };
  const setStatus = (s: string) => { if (statusEl) statusEl.textContent = s; };
  const runner = id === 'nova-swarm'
    ? runNovaSwarm(canvas, ctx, setScore, setStatus)
    : id === 'void-runner'
      ? runVoidRunner(canvas, ctx, setScore, setStatus)
      : runCrypticFishing(canvas, ctx, setScore, setStatus);
  const stop = () => runner.stop();
  host.addEventListener('cr-minigame-close', stop, { once: true });
}

function clear(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#080b13');
  g.addColorStop(1, '#160910');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function runNovaSwarm(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  setScore: (n: number) => void,
  setStatus: (s: string) => void,
): Runner {
  let raf = 0, last = performance.now(), score = 0, hp = 3, fireCd = 0, spawn = 0;
  const player = { x: canvas.width / 2, y: canvas.height - 44 };
  const bullets: { x: number; y: number }[] = [];
  const enemies: { x: number; y: number; vx: number; hp: number }[] = [];
  const keys = new Set<string>();
  const keyDown = (e: KeyboardEvent) => { keys.add(e.code); if (e.code === 'Space') e.preventDefault(); };
  const keyUp = (e: KeyboardEvent) => keys.delete(e.code);
  const pointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    player.x = (e.clientX - r.left) * (canvas.width / Math.max(1, r.width));
  };
  const fire = () => {
    if (fireCd > 0) return;
    bullets.push({ x: player.x, y: player.y - 18 });
    fireCd = 0.16;
  };
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointermove', pointer);
  canvas.addEventListener('pointerdown', fire);
  setStatus('Survive');

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fireCd -= dt;
    spawn -= dt;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) player.x -= 260 * dt;
    if (keys.has('ArrowRight') || keys.has('KeyD')) player.x += 260 * dt;
    if (keys.has('Space')) fire();
    player.x = Math.max(22, Math.min(canvas.width - 22, player.x));
    if (spawn <= 0) {
      enemies.push({ x: 30 + Math.random() * (canvas.width - 60), y: -18, vx: (Math.random() - 0.5) * 40, hp: 1 });
      spawn = Math.max(0.22, 0.75 - score / 5000);
    }
    for (const b of bullets) b.y -= 420 * dt;
    for (const e of enemies) { e.y += (72 + score / 80) * dt; e.x += e.vx * dt; }
    for (const e of enemies) {
      for (const b of bullets) {
        if (Math.hypot(e.x - b.x, e.y - b.y) < 22) {
          e.hp -= 1; b.y = -999; score += 50;
        }
      }
      if (Math.hypot(e.x - player.x, e.y - player.y) < 26) {
        e.hp = 0; hp -= 1; setStatus(`Hull ${hp}`);
      }
    }
    while (bullets.length && bullets[0].y < -20) bullets.shift();
    for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].hp <= 0 || enemies[i].y > canvas.height + 40) enemies.splice(i, 1);
    score += dt * 8;
    setScore(score);
    clear(ctx, canvas.width, canvas.height);
    ctx.fillStyle = '#eecb73';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 22); ctx.lineTo(player.x - 18, player.y + 20); ctx.lineTo(player.x + 18, player.y + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#83e6ff';
    for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 12, 4, 16);
    for (const e of enemies) {
      ctx.fillStyle = '#b64545';
      ctx.beginPath(); ctx.arc(e.x, e.y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffb0a0'; ctx.stroke();
    }
    if (hp > 0) raf = requestAnimationFrame(frame);
    else { saveHighScore('nova-swarm', score); setStatus('Run ended'); }
  };
  raf = requestAnimationFrame(frame);
  return { stop: () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    canvas.removeEventListener('pointermove', pointer);
    canvas.removeEventListener('pointerdown', fire);
  } };
}

function runVoidRunner(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  setScore: (n: number) => void,
  setStatus: (s: string) => void,
): Runner {
  let raf = 0, last = performance.now(), score = 0, lane = 1, targetLane = 1, spawn = 0, alive = true;
  const lanes = [canvas.width * 0.28, canvas.width * 0.5, canvas.width * 0.72];
  const hazards: { lane: number; y: number; kind: number }[] = [];
  const key = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') targetLane = Math.max(0, targetLane - 1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') targetLane = Math.min(2, targetLane + 1);
  };
  const pointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / Math.max(1, r.width));
    targetLane = x < canvas.width / 3 ? 0 : x > canvas.width * 2 / 3 ? 2 : 1;
  };
  window.addEventListener('keydown', key);
  canvas.addEventListener('pointerdown', pointer);
  canvas.addEventListener('pointermove', pointer);
  setStatus('Rift open');
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    lane += (targetLane - lane) * Math.min(1, dt * 12);
    spawn -= dt;
    if (spawn <= 0) {
      hazards.push({ lane: Math.floor(Math.random() * 3), y: -30, kind: Math.random() });
      spawn = Math.max(0.28, 0.85 - score / 3500);
    }
    const speed = 135 + score / 22;
    for (const h of hazards) h.y += speed * dt;
    for (const h of hazards) {
      if (h.y > canvas.height - 72 && h.y < canvas.height - 24 && Math.abs(h.lane - lane) < 0.42) alive = false;
    }
    for (let i = hazards.length - 1; i >= 0; i--) if (hazards[i].y > canvas.height + 40) hazards.splice(i, 1);
    score += dt * 32;
    setScore(score);
    clear(ctx, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(131,230,255,.22)';
    ctx.lineWidth = 2;
    for (const x of lanes) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    ctx.fillStyle = '#7fd7ff';
    const px = lanes[Math.round(lane)] + (lane - Math.round(lane)) * (lanes[2] - lanes[1]);
    ctx.beginPath(); ctx.arc(px, canvas.height - 48, 19, 0, Math.PI * 2); ctx.fill();
    for (const h of hazards) {
      ctx.fillStyle = h.kind > 0.5 ? '#f05b78' : '#d58cff';
      ctx.fillRect(lanes[h.lane] - 19, h.y - 19, 38, 38);
    }
    if (alive) raf = requestAnimationFrame(frame);
    else { saveHighScore('void-runner', score); setStatus('Rift closed'); }
  };
  raf = requestAnimationFrame(frame);
  return { stop: () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', key);
    canvas.removeEventListener('pointerdown', pointer);
    canvas.removeEventListener('pointermove', pointer);
  } };
}

function runCrypticFishing(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  setScore: (n: number) => void,
  setStatus: (s: string) => void,
): Runner {
  let raf = 0, last = performance.now(), score = 0, streak = 0, marker = 0.08, dir = 1;
  let target = { a: 0.42, b: 0.58 };
  const resetTarget = () => {
    const width = Math.max(0.11, 0.22 - streak * 0.008);
    const mid = width / 2 + Math.random() * (1 - width);
    target = { a: mid - width / 2, b: mid + width / 2 };
  };
  const cast = () => {
    if (marker >= target.a && marker <= target.b) {
      streak += 1;
      score += 100 + streak * 25;
      setStatus(`Catch ${streak}`);
    } else {
      streak = 0;
      setStatus('Miss');
    }
    saveHighScore('cryptic-fishing', score);
    resetTarget();
  };
  canvas.addEventListener('pointerdown', cast);
  window.addEventListener('keydown', cast);
  setStatus('Cast ready');
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    marker += dir * dt * (0.78 + streak * 0.05);
    if (marker > 1) { marker = 1; dir = -1; }
    if (marker < 0) { marker = 0; dir = 1; }
    setScore(score);
    clear(ctx, canvas.width, canvas.height);
    ctx.fillStyle = '#17202d';
    ctx.fillRect(70, 166, canvas.width - 140, 28);
    ctx.fillStyle = '#86d68c';
    ctx.fillRect(70 + target.a * (canvas.width - 140), 166, (target.b - target.a) * (canvas.width - 140), 28);
    ctx.fillStyle = '#f1d279';
    const x = 70 + marker * (canvas.width - 140);
    ctx.fillRect(x - 4, 148, 8, 64);
    ctx.strokeStyle = '#5f7a9c';
    ctx.strokeRect(70, 166, canvas.width - 140, 28);
    ctx.fillStyle = '#83e6ff';
    ctx.beginPath(); ctx.arc(canvas.width / 2, 255, 28 + Math.sin(now / 260) * 4, 0, Math.PI * 2); ctx.stroke();
    raf = requestAnimationFrame(frame);
  };
  resetTarget();
  raf = requestAnimationFrame(frame);
  return { stop: () => {
    cancelAnimationFrame(raf);
    canvas.removeEventListener('pointerdown', cast);
    window.removeEventListener('keydown', cast);
  } };
}
