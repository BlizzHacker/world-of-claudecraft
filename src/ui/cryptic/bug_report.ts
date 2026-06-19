import { getActiveRealm, resolveActiveRealmId } from '../../sim/realms';
import { getGamepadStatus } from '../../game/gamepad';

const MODAL_ID = 'cr-bug-report-modal';
const STORE_KEY = 'cr_bug_reports';

type BugReport = {
  id: string;
  capturedAt: string;
  url: string;
  realmId: string;
  realmName: string;
  userAgent: string;
  viewport: { width: number; height: number; dpr: number };
  player: unknown;
  network: unknown;
  performance: unknown;
  gamepad: unknown;
  screenshot: string | null;
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
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

function gameHandle(): any {
  return (window as any).__game ?? {};
}

function playerSnapshot(): unknown {
  const game = gameHandle();
  const player = game.world?.player;
  if (!player) return null;
  return {
    id: player.id,
    name: player.name,
    level: player.level,
    class: player.class,
    hp: player.hp,
    pos: player.pos ? { x: player.pos.x, y: player.pos.y, z: player.pos.z } : null,
    facing: player.facing,
    dead: player.dead,
  };
}

function captureCanvas(): string | null {
  const source = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!source || source.width <= 0 || source.height <= 0) return null;
  try {
    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / source.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return null;
  }
}

export function collectBugReport(): BugReport {
  const game = gameHandle();
  const realm = getActiveRealm();
  const now = new Date();
  return {
    id: `cr-${now.toISOString().replace(/[:.]/g, '-')}`,
    capturedAt: now.toISOString(),
    url: location.href,
    realmId: resolveActiveRealmId(),
    realmName: realm.name,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
    },
    player: playerSnapshot(),
    network: game.online ? {
      connected: game.online.connected,
      characterId: game.online.characterId,
    } : null,
    performance: typeof game.perf?.snapshot === 'function' ? game.perf.snapshot() : null,
    gamepad: getGamepadStatus(),
    screenshot: captureCanvas(),
  };
}

function persistSummary(report: BugReport): void {
  try {
    const existing = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    const list = Array.isArray(existing) ? existing : [];
    list.unshift({
      id: report.id,
      capturedAt: report.capturedAt,
      url: report.url,
      realmId: report.realmId,
      realmName: report.realmName,
      player: report.player,
      screenshot: !!report.screenshot,
    });
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    // local diagnostics are best-effort only
  }
}

function downloadReport(report: BugReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function render(host: HTMLElement, report: BugReport): void {
  const player = report.player && typeof report.player === 'object' ? report.player as Record<string, unknown> : {};
  host.innerHTML = `
    <div class="cr-modal-overlay" data-cr-bug-overlay>
      <div class="cr-modal-panel cr-bug-panel" role="dialog" aria-modal="true" aria-labelledby="cr-bug-title">
        <header class="cr-modal-header">
          <h2 id="cr-bug-title">Bug Report Captured</h2>
          <button type="button" class="cr-modal-close" data-cr-bug-close aria-label="Close">x</button>
        </header>
        <div class="cr-bug-summary">
          <div><strong>ID</strong><code>${escapeHtml(report.id)}</code></div>
          <div><strong>Realm</strong><span>${escapeHtml(report.realmName)}</span></div>
          <div><strong>Player</strong><span>${escapeHtml(String(player.name ?? 'Unknown'))}</span></div>
          <div><strong>Position</strong><span>${escapeHtml(JSON.stringify(player.pos ?? null))}</span></div>
          <div><strong>Screenshot</strong><span>${report.screenshot ? 'Included' : 'Unavailable'}</span></div>
        </div>
        ${report.screenshot ? `<img class="cr-bug-shot" alt="Bug report screenshot" src="${report.screenshot}">` : ''}
        <div class="cr-bug-actions">
          <button type="button" class="cr-options-pill" data-cr-bug-copy>Copy JSON</button>
          <button type="button" class="cr-options-pill" data-cr-bug-download>Download JSON</button>
        </div>
        <p class="cr-modal-footer-hint">Saved locally under <code>${STORE_KEY}</code>. The JSON shape is ready for server-side issue ingestion.</p>
      </div>
    </div>
  `;

  host.onclick = (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;
    if (target.hasAttribute('data-cr-bug-close') || target.hasAttribute('data-cr-bug-overlay')) {
      host.setAttribute('hidden', '');
      return;
    }
    if (target.closest('[data-cr-bug-copy]')) {
      void navigator.clipboard?.writeText(JSON.stringify(report, null, 2)).then(() => {
        target.textContent = 'Copied';
      }).catch(() => undefined);
      return;
    }
    if (target.closest('[data-cr-bug-download]')) {
      downloadReport(report);
    }
  };
}

export function openBugReport(): void {
  const host = ensureHost();
  const report = collectBugReport();
  persistSummary(report);
  render(host, report);
  host.removeAttribute('hidden');
}
