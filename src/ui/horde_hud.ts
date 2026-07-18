// Thin DOM painter for the Dead Road horde strip (the derby strip is the
// composition template: snapshot-driven per mediumHud tick, self-mounting
// root, sig-diffed skeleton, per-second numbers riding elided setText slots).
// Strings use tOptional with English fallbacks (the buildings.leave
// precedent), so the strip adds no pending locale rows.

import type { HordeInfo } from '../world_api/horde';
import { esc } from './esc';
import { tOptional } from './i18n';
import type { PainterHostWriters } from './painter_host';

export interface HordeHudDeps {
  layer(): HTMLElement | null;
  writers: PainterHostWriters;
}

export class HordeHud {
  private root: HTMLElement | null = null;
  private mounted = false;
  private lineEl: HTMLElement | null = null;

  constructor(private readonly deps: HordeHudDeps) {}

  update(horde: HordeInfo | null): void {
    const w = this.deps.writers;
    const active = horde !== null && horde.phase !== 'idle';
    if (!active) {
      if (this.root) w.setDisplay(this.root, 'none');
      return;
    }
    const root = this.ensureRoot();
    if (!root) return;
    w.setDisplay(root, 'flex');
    if (!this.mounted) {
      this.mounted = true;
      const title = tOptional('hudChrome.horde.title') ?? 'THE DEAD ROAD';
      root.innerHTML = `<span class="hordeh-title">${esc(title)}</span><span class="hordeh-line"></span>`;
      this.lineEl = root.querySelector('.hordeh-line');
    }
    if (this.lineEl) w.setText(this.lineEl, this.lineText(horde as HordeInfo));
  }

  relocalize(): void {
    this.mounted = false;
  }

  private lineText(h: HordeInfo): string {
    if (h.phase === 'prep') {
      const tpl =
        tOptional('hudChrome.horde.prep') ?? 'The dead rise in {seconds}s — man the line!';
      return tpl.replace('{seconds}', String(h.countdown));
    }
    if (h.phase === 'intermission') {
      const tpl =
        tOptional('hudChrome.horde.intermission') ??
        'Wave {wave}/{waves} down · next in {seconds}s · Wards {wards}';
      return tpl
        .replace('{wave}', String(h.wave))
        .replace('{waves}', String(h.waves))
        .replace('{seconds}', String(h.countdown))
        .replace('{wards}', String(h.wards));
    }
    if (h.phase === 'over') {
      return h.won
        ? (tOptional('hudChrome.horde.won') ?? 'The town stands!')
        : (tOptional('hudChrome.horde.lost') ?? 'The town is overrun...');
    }
    const tpl =
      tOptional('hudChrome.horde.wave') ??
      'Wave {wave}/{waves} · {left} on the road · Wards {wards}';
    return tpl
      .replace('{wave}', String(h.wave))
      .replace('{waves}', String(h.waves))
      .replace('{left}', String(h.zombiesLeft))
      .replace('{wards}', String(h.wards));
  }

  private ensureRoot(): HTMLElement | null {
    if (this.root?.isConnected) return this.root;
    const layer = this.deps.layer();
    if (!layer) return null;
    const el = document.createElement('div');
    el.id = 'horde-hud';
    el.className = 'horde-hud';
    layer.appendChild(el);
    this.root = el;
    this.mounted = false;
    return el;
  }
}
