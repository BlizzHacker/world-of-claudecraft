import './realm_env';
import { getActiveRealm, resolveActiveRealmId } from '../../sim/realms';
import { readCrypticSession } from './session';

const MODAL_ID = 'cr-bug-report-modal';
const STORE_KEY = 'cr_bug_reports';

// Minimal gamepad snapshot for the bug-report diagnostics. v0.20 moved live
// gamepad handling into GamepadManager (instance-scoped); the bug report has no
// instance, so it reads navigator.getGamepads() directly for a best-effort view.
function gamepadDiagnostics(): {
  connected: number;
  pads: { index: number; id: string; mapping: string; axes: number; buttons: number }[];
} {
  try {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const list = nav && typeof nav.getGamepads === 'function' ? nav.getGamepads() : [];
    const pads = [];
    for (const p of list) {
      if (!p) continue;
      pads.push({
        index: p.index,
        id: p.id,
        mapping: p.mapping,
        axes: p.axes.length,
        buttons: p.buttons.length,
      });
    }
    return { connected: pads.length, pads };
  } catch {
    return { connected: 0, pads: [] };
  }
}

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
    gamepad: gamepadDiagnostics(),
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
        <label class="cr-bug-note-label" for="cr-bug-note">What went wrong? (optional)</label>
        <textarea id="cr-bug-note" class="cr-bug-note" rows="3" placeholder="Describe the bug — what you did, what you expected, what happened."></textarea>
        <div class="cr-bug-actions">
          <button type="button" class="cr-options-pill cr-bug-submit" data-cr-bug-submit>Send to dev team</button>
          <button type="button" class="cr-options-pill" data-cr-bug-copy>Copy JSON</button>
          <button type="button" class="cr-options-pill" data-cr-bug-download>Download JSON</button>
        </div>
        <p class="cr-modal-footer-hint" data-cr-bug-status>Sending goes straight to the dev log (timestamped + screenshot) to help evolve Cryptic Realm. Also saved locally.</p>
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
      return;
    }
    if (target.closest('[data-cr-bug-submit]')) {
      void submitReport(host, report, target as HTMLButtonElement);
    }
  };
}

// POST the report (plus the tester's note) to the server bug-report sink. Best
// effort — testers may be offline; we still keep the local copy either way.
async function submitReport(host: HTMLElement, report: BugReport, btn: HTMLButtonElement): Promise<void> {
  const status = host.querySelector('[data-cr-bug-status]') as HTMLElement | null;
  const noteEl = host.querySelector('#cr-bug-note') as HTMLTextAreaElement | null;
  const note = noteEl?.value.trim() ?? '';
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const token = readCrypticSession()?.token ?? null;
    const res = await fetch('/api/bug-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...report, note }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      btn.textContent = 'Sent ✓';
      if (status) status.textContent = `Report sent to the dev log${data?.id ? ` (${data.id})` : ''}. Thank you!`;
    } else {
      btn.disabled = false;
      btn.textContent = 'Retry send';
      if (status) status.textContent = `Could not send (server ${res.status}). Your local copy is still saved.`;
    }
  } catch {
    btn.disabled = false;
    btn.textContent = 'Retry send';
    if (status) status.textContent = 'Could not reach the server. Your local copy is still saved.';
  }
}

export function openBugReport(): void {
  const host = ensureHost();
  const report = collectBugReport();
  persistSummary(report);
  render(host, report);
  host.removeAttribute('hidden');
}
