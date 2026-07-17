// Thin DOM painter for the in-race Thornwheel Derby HUD strip (the Vale Cup
// strip is the composition template: snapshot-driven per mediumHud tick,
// self-mounting root, sig-diffed skeleton, per-second numbers riding elided
// setText slots so the tick never rebuilds DOM). Strings use tOptional with
// English fallbacks (the buildings.leave precedent), so the strip adds no
// pending locale rows.

import type { DerbyInfo } from '../world_api/derby';
import { esc } from './esc';
import { tOptional } from './i18n';
import type { PainterHostWriters } from './painter_host';

export interface DerbyHudDeps {
  /** The HUD layer the strip mounts into (the #ui element). */
  layer(): HTMLElement | null;
  writers: PainterHostWriters;
}

export class DerbyHud {
  private root: HTMLElement | null = null;
  private lastSig = '';
  private lineEl: HTMLElement | null = null;

  constructor(private readonly deps: DerbyHudDeps) {}

  update(derby: DerbyInfo | null): void {
    const w = this.deps.writers;
    const race = derby?.race ?? null;
    const active = race?.mySeat === true;
    if (!active) {
      if (this.root) w.setDisplay(this.root, 'none');
      this.lastSig = '';
      return;
    }
    const root = this.ensureRoot();
    if (!root) return;
    w.setDisplay(root, 'flex');
    const sig = `derby:${race.id}`;
    if (sig !== this.lastSig) {
      this.lastSig = sig;
      const title = tOptional('hudChrome.derby.title') ?? 'Thornwheel Derby';
      root.innerHTML = `<span class="derbyh-title">${esc(title)}</span><span class="derbyh-line"></span>`;
      this.lineEl = root.querySelector('.derbyh-line');
    }
    if (this.lineEl) w.setText(this.lineEl, this.lineText(derby as DerbyInfo));
  }

  /** Language switch: clear the structural sig so the next update rebuilds. */
  relocalize(): void {
    this.lastSig = '';
  }

  private lineText(derby: DerbyInfo): string {
    const race = derby.race;
    if (!race) return '';
    const me = race.racers.find((r) => r.me);
    if (!me) return '';
    if (race.phase === 'grid') {
      const tpl = tOptional('hudChrome.derby.grid') ?? 'Green flag in {seconds}...';
      return tpl.replace('{seconds}', String(race.countdown));
    }
    if (race.phase === 'over' || me.finished) {
      const tpl = tOptional('hudChrome.derby.finish') ?? 'Finished P{place}';
      return tpl.replace('{place}', String(me.place));
    }
    const tpl = tOptional('hudChrome.derby.lap') ?? 'Lap {lap}/{laps} · P{place} · CP {cp}';
    return tpl
      .replace('{lap}', String(me.lap))
      .replace('{laps}', String(race.laps))
      .replace('{place}', String(me.place))
      .replace('{cp}', String(me.cp));
  }

  private ensureRoot(): HTMLElement | null {
    if (this.root?.isConnected) return this.root;
    const layer = this.deps.layer();
    if (!layer) return null;
    const el = document.createElement('div');
    el.id = 'derby-hud';
    el.className = 'derby-hud';
    layer.appendChild(el);
    this.root = el;
    return el;
  }
}
