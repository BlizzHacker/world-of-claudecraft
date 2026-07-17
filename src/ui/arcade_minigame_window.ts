// The Eastbrook war table: the town-RTS strategy view, opened ONLY from the
// town defense board NPC's gossip (no menu entry). The other former "arcade"
// modes left this window for the world itself: kart racing runs on the
// physical Thornwheel Circuit (src/sim/social/derby.ts), the brawl runs at its
// own venue, zombie defense keeps its dedicated board window, and housing is
// Eastbrook Homes, a premium feature, not a minigame. A strategy campaign is
// the one mode that legitimately IS a board view, so the board stays.
import type { IWorld, MinigameFeatureId } from '../world_api';
import { t } from './i18n';

type ArcadeMode = Extract<MinigameFeatureId, 'town_rts'>;

function esc(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );
}

export class ArcadeMinigameWindow {
  private readonly root: () => HTMLElement | null;
  private readonly world: () => IWorld;
  private openState = false;
  private readonly mode: ArcadeMode = 'town_rts';
  private rtsBuildIndex = 0;

  constructor(opts: { root: () => HTMLElement | null; world: () => IWorld }) {
    this.root = opts.root;
    this.world = opts.world;
  }

  toggle(): void {
    this.openState = !this.openState;
    this.render();
  }

  close(): void {
    this.openState = false;
    const root = this.root();
    if (root) root.style.display = 'none';
  }

  isOpen(): boolean {
    return this.openState;
  }

  render(): void {
    const root = this.root();
    if (!root) return;
    root.style.display = this.openState ? 'block' : 'none';
    if (!this.openState) return;
    const world = this.world();
    const feature = world.minigameFeatures.find((entry) => entry.id === this.mode);
    const available = feature?.enabled === true || feature?.preview === true;
    const session = world.minigameSession;
    const players = session?.kind === this.mode ? session.players : [];
    root.innerHTML = `
      <section class="arcade-window panel" role="dialog" aria-modal="true" aria-label="${esc(t('hudChrome.arcade.townRts'))}">
        <header class="arcade-window__header">
          <h2>${esc(t('hudChrome.arcade.townRts'))}</h2>
          <button type="button" data-arcade-close>${esc(t('hudChrome.arcade.close'))}</button>
        </header>
        ${available ? this.lobbyHtml(session, players) : `<p class="arcade-window__notice">${esc(t('hudChrome.arcade.unavailable'))}</p>`}
        <canvas class="arcade-window__canvas" width="560" height="300" aria-label="${esc(t('hudChrome.arcade.townRts'))}"></canvas>
      </section>`;
    this.bind(root);
    this.draw(root.querySelector('canvas'));
  }

  private lobbyHtml(
    session: IWorld['minigameSession'],
    players: readonly { pid: number; ready: boolean }[],
  ): string {
    const sameMode = session?.kind === this.mode;
    const activeSession = sameMode ? session : null;
    return `<div class="arcade-window__lobby">
      ${!sameMode ? `<button type="button" data-arcade-create>${esc(t('hudChrome.arcade.create'))}</button>` : ''}
      <label>${esc(t('hudChrome.arcade.code'))}<input data-arcade-code inputmode="numeric" maxlength="8" /></label>
      <button type="button" data-arcade-join>${esc(t('hudChrome.arcade.join'))}</button>
      ${
        activeSession
          ? `<span class="arcade-window__status">${esc(activeSession.phase === 'active' ? t('hudChrome.arcade.active') : activeSession.phase === 'finished' ? t('hudChrome.arcade.finished') : t('hudChrome.arcade.waiting'))}</span>
        <button type="button" data-arcade-ready>${esc(t('hudChrome.arcade.ready'))}</button>
        <button type="button" data-arcade-invite>${esc(t('hudChrome.arcade.invite'))}</button>
        <button type="button" data-arcade-build>${esc(t('hudChrome.arcade.build'))}</button><button type="button" data-arcade-train>${esc(t('hudChrome.arcade.train'))}</button>
        <button type="button" data-arcade-abort>${esc(t('hudChrome.arcade.abort'))}</button>`
          : ''
      }
      <span class="arcade-window__roster">${players.map((player) => `P${player.pid}${player.ready ? ' ✓' : ''}`).join(' · ')}</span>
    </div>`;
  }

  private bind(root: HTMLElement): void {
    root.querySelector('[data-arcade-close]')?.addEventListener('click', () => this.close());
    root.querySelector('[data-arcade-create]')?.addEventListener('click', () => {
      this.world().minigameCreate(this.mode, 4);
      this.render();
    });
    root.querySelector('[data-arcade-join]')?.addEventListener('click', () => {
      const code = Number(
        (root.querySelector('[data-arcade-code]') as HTMLInputElement | null)?.value,
      );
      if (Number.isInteger(code) && code > 0) this.world().minigameJoin(code);
      this.render();
    });
    root.querySelector('[data-arcade-ready]')?.addEventListener('click', () => {
      const self = this.world().minigameSession?.players.find(
        (player) => player.pid === this.world().playerId,
      );
      this.world().minigameReady(!(self?.ready === true));
      this.render();
    });
    root.querySelector('[data-arcade-invite]')?.addEventListener('click', () => {
      const raw = window.prompt(t('hudChrome.arcade.inviteHint'));
      const target = Number(raw);
      if (Number.isInteger(target) && target > 0) this.world().minigameInvite(target);
    });
    root.querySelector('[data-arcade-abort]')?.addEventListener('click', () => {
      this.world().minigameAbort();
      this.render();
    });
    root.querySelector('[data-arcade-build]')?.addEventListener('click', () => {
      // The compact preview uses a deterministic build queue so a controller
      // can reach the campaign objective without a mouse/grid editor. The
      // authoritative adapter still validates the kind, bounds, occupancy,
      // ACL and resource cost for every placement.
      const queue = [
        { kind: 'wall' as const, x: 0, z: 1 },
        { kind: 'farm' as const, x: 2, z: 0 },
        { kind: 'barracks' as const, x: -2, z: 0 },
      ];
      const build = queue[this.rtsBuildIndex % queue.length];
      this.rtsBuildIndex += 1;
      this.world().minigameRtsBuild(build.kind, build.x, build.z);
      this.render();
    });
    root.querySelector('[data-arcade-train]')?.addEventListener('click', () => {
      this.world().minigameRtsTrain('guard');
      this.render();
    });
  }

  private draw(canvas: HTMLCanvasElement | null): void {
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#07111f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const state = this.world().minigameArcadeState as Record<string, unknown> | null;
    if (!state || state.kind !== this.mode) return;
    const payload = state.rts as Record<string, unknown> | undefined;
    if (!payload) return;
    this.drawRts(ctx, payload);
  }

  private drawRts(ctx: CanvasRenderingContext2D, rts: Record<string, unknown>): void {
    const structures = Array.isArray(rts.structures)
      ? (rts.structures as Array<Record<string, unknown>>)
      : [];
    structures.forEach((structure) => {
      const cell = structure.cell as Record<string, number>;
      ctx.fillStyle = structure.kind === 'town_hall' ? '#e5ba4f' : '#758aa1';
      ctx.fillRect(280 + cell.x * 22, 150 + cell.z * 22, 18, 18);
    });
    ctx.fillStyle = '#b8e37c';
    ctx.fillText(`Resources: ${String(rts.resources ?? 0)}`, 12, 22);
  }
}
