import type { IWorld, MinigameFeatureId } from '../world_api';
import { t } from './i18n';

type ArcadeMode = Exclude<MinigameFeatureId, 'zombie_defense'>;

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function featureName(id: ArcadeMode): string {
  return t(
    id === 'racing'
      ? 'hudChrome.arcade.racing'
      : id === 'brawler'
        ? 'hudChrome.arcade.brawler'
        : id === 'town_rts'
          ? 'hudChrome.arcade.townRts'
          : 'hudChrome.arcade.housing',
  );
}

export class ArcadeMinigameWindow {
  private readonly root: () => HTMLElement | null;
  private readonly world: () => IWorld;
  private openState = false;
  private mode: ArcadeMode = 'racing';
  private keys = new Set<string>();
  private inputTimer: number | null = null;
  private rtsBuildIndex = 0;

  constructor(opts: { root: () => HTMLElement | null; world: () => IWorld }) {
    this.root = opts.root;
    this.world = opts.world;
  }

  toggle(mode?: ArcadeMode): void {
    if (mode) this.mode = mode;
    this.openState = !this.openState;
    if (!this.openState) this.stopInputLoop();
    this.render();
  }

  close(): void {
    this.openState = false;
    this.stopInputLoop();
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
      <section class="arcade-window panel" role="dialog" aria-modal="true" aria-label="${esc(t('hudChrome.arcade.title'))}">
        <header class="arcade-window__header">
          <h2>${esc(t('hudChrome.arcade.title'))}</h2>
          <button type="button" data-arcade-close>${esc(t('hudChrome.arcade.close'))}</button>
        </header>
        <nav class="arcade-window__modes" aria-label="${esc(t('hudChrome.arcade.choose'))}">
          ${(['racing', 'brawler', 'town_rts', 'housing'] as ArcadeMode[]).map((id) => `<button type="button" data-arcade-mode="${id}" class="${id === this.mode ? 'active' : ''}">${esc(featureName(id))}</button>`).join('')}
        </nav>
        ${available ? this.lobbyHtml(session, players) : `<p class="arcade-window__notice">${esc(t('hudChrome.arcade.unavailable'))}</p>`}
        <canvas class="arcade-window__canvas" width="560" height="300" aria-label="${esc(featureName(this.mode))}"></canvas>
        <p class="arcade-window__controls">${esc(t('hudChrome.arcade.controls'))}</p>
      </section>`;
    this.bind(root);
    this.draw(root.querySelector('canvas'));
    if (session?.kind === this.mode && session.phase === 'active') this.startInputLoop();
  }

  private lobbyHtml(
    session: IWorld['minigameSession'],
    players: readonly { pid: number; ready: boolean }[],
  ): string {
    const sameMode = session?.kind === this.mode;
    const activeSession = sameMode ? session : null;
    return `<div class="arcade-window__lobby">
      ${!sameMode ? `<button type="button" data-arcade-create>${esc(t('hudChrome.arcade.create'))}</button>${this.mode === 'racing' || this.mode === 'brawler' ? `<button type="button" data-arcade-solo>${esc(t('hudChrome.arcade.solo'))}</button>` : ''}` : ''}
      <label>${esc(t('hudChrome.arcade.code'))}<input data-arcade-code inputmode="numeric" maxlength="8" /></label>
      <button type="button" data-arcade-join>${esc(t('hudChrome.arcade.join'))}</button>
      ${activeSession ? `<span class="arcade-window__status">${esc(activeSession.phase === 'active' ? t('hudChrome.arcade.active') : activeSession.phase === 'finished' ? t('hudChrome.arcade.finished') : t('hudChrome.arcade.waiting'))}</span>
        <button type="button" data-arcade-ready>${esc(t('hudChrome.arcade.ready'))}</button>
        <button type="button" data-arcade-invite>${esc(t('hudChrome.arcade.invite'))}</button>
        ${this.mode === 'town_rts' ? `<button type="button" data-arcade-build>${esc(t('hudChrome.arcade.build'))}</button><button type="button" data-arcade-train>${esc(t('hudChrome.arcade.train'))}</button>` : ''}
        ${this.mode === 'housing' ? `<button type="button" data-arcade-place>${esc(t('hudChrome.arcade.place'))}</button>` : ''}
        <button type="button" data-arcade-abort>${esc(t('hudChrome.arcade.abort'))}</button>` : ''}
      <span class="arcade-window__roster">${players.map((player) => `P${player.pid}${player.ready ? ' ✓' : ''}`).join(' · ')}</span>
    </div>`;
  }

  private bind(root: HTMLElement): void {
    this.stopInputLoop();
    root.querySelector('[data-arcade-close]')?.addEventListener('click', () => this.close());
    root.querySelectorAll<HTMLElement>('[data-arcade-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.arcadeMode as ArcadeMode | undefined;
        if (mode) { this.mode = mode; this.render(); }
      });
    });
    root.querySelector('[data-arcade-create]')?.addEventListener('click', () => {
      this.world().minigameCreate(this.mode, 4);
      this.render();
    });
    root.querySelector('[data-arcade-solo]')?.addEventListener('click', () => {
      this.world().minigameCreate(this.mode, 1);
      this.render();
    });
    root.querySelector('[data-arcade-join]')?.addEventListener('click', () => {
      const code = Number((root.querySelector('[data-arcade-code]') as HTMLInputElement | null)?.value);
      if (Number.isInteger(code) && code > 0) this.world().minigameJoin(code);
      this.render();
    });
    root.querySelector('[data-arcade-ready]')?.addEventListener('click', () => {
      const self = this.world().minigameSession?.players.find((player) => player.pid === this.world().playerId);
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
    root.querySelector('[data-arcade-place]')?.addEventListener('click', () => {
      this.world().minigameHousingPlace({ id: `piece-${this.world().playerId}`, kind: 'floor', cell: { x: 0, z: 1 }, rotation: 0 });
      this.render();
    });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.openState) return;
    this.keys.add(event.code);
    if (this.mode === 'brawler' && ['Space', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) event.preventDefault();
    this.sendInput();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    this.sendInput();
  };

  private startInputLoop(): void {
    if (this.inputTimer !== null) return;
    this.inputTimer = window.setInterval(() => this.sendInput(), 50);
  }

  private stopInputLoop(): void {
    if (this.inputTimer !== null) window.clearInterval(this.inputTimer);
    this.inputTimer = null;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private sendInput(): void {
    const world = this.world();
    const session = world.minigameSession;
    if (session?.kind !== this.mode || session.phase !== 'active') return;
    if (this.mode === 'racing') {
      world.minigameRaceInput({
        throttle: this.keys.has('ArrowUp') || this.keys.has('KeyW') ? 1 : this.keys.has('ArrowDown') || this.keys.has('KeyS') ? -1 : 0,
        steer: this.keys.has('ArrowLeft') || this.keys.has('KeyA') ? -1 : this.keys.has('ArrowRight') || this.keys.has('KeyD') ? 1 : 0,
        drift: this.keys.has('Space'),
        useItem: this.keys.has('KeyE'),
        recover: this.keys.has('KeyR'),
      });
    } else if (this.mode === 'brawler') {
      world.minigameBrawlerInput({
        move: this.keys.has('ArrowLeft') || this.keys.has('KeyA') ? -1 : this.keys.has('ArrowRight') || this.keys.has('KeyD') ? 1 : 0,
        jump: this.keys.has('Space'),
        attack: this.keys.has('KeyJ') || this.keys.has('KeyK'),
      });
    }
  }

  private draw(canvas: HTMLCanvasElement | null): void {
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#07111f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const state = this.world().minigameArcadeState as Record<string, unknown> | null;
    if (!state || state.kind !== this.mode) return;
    const payload = state[this.mode === 'racing' ? 'race' : this.mode === 'brawler' ? 'brawler' : this.mode === 'town_rts' ? 'rts' : 'housing'] as Record<string, unknown> | undefined;
    if (!payload) return;
    if (this.mode === 'racing') this.drawRace(ctx, payload);
    else if (this.mode === 'brawler') this.drawBrawler(ctx, payload);
    else if (this.mode === 'town_rts') this.drawRts(ctx, payload);
    else this.drawHousing(ctx, payload);
  }

  private drawRace(ctx: CanvasRenderingContext2D, race: Record<string, unknown>): void {
    const vehicles = Array.isArray(race.vehicles)
      ? race.vehicles as Array<Record<string, number | string>>
      : [];
    ctx.strokeStyle = '#526b84'; ctx.strokeRect(80, 20, 400, 250);
    vehicles.forEach((vehicle, index) => {
      const x = 280 + Number(vehicle.x) * 3;
      const y = 145 + Number(vehicle.z) * 2;
      ctx.fillStyle = ['#efc75e', '#ef6b6b', '#6bd4ef', '#9e86e8'][index % 4];
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      if (typeof vehicle.item === 'string' && vehicle.item.length > 0) {
        ctx.fillStyle = '#fff4b0';
        ctx.fillText(vehicle.item.slice(0, 1).toUpperCase(), x + 9, y + 4);
      }
    });
  }

  private drawBrawler(ctx: CanvasRenderingContext2D, brawler: Record<string, unknown>): void {
    ctx.fillStyle = '#27364a'; ctx.fillRect(70, 230, 420, 18);
    const fighters = Array.isArray(brawler.fighters) ? brawler.fighters as Array<Record<string, number | boolean>> : [];
    fighters.forEach((fighter, index) => { if (fighter.alive === false) return; ctx.fillStyle = ['#efc75e', '#ef6b6b', '#6bd4ef', '#9e86e8'][index % 4]; ctx.fillRect(280 + Number(fighter.x) * 7, 230 - Number(fighter.z) * 6, 16, 16); });
  }

  private drawRts(ctx: CanvasRenderingContext2D, rts: Record<string, unknown>): void {
    const structures = Array.isArray(rts.structures) ? rts.structures as Array<Record<string, unknown>> : [];
    structures.forEach((structure) => { const cell = structure.cell as Record<string, number>; ctx.fillStyle = structure.kind === 'town_hall' ? '#e5ba4f' : '#758aa1'; ctx.fillRect(280 + cell.x * 22, 150 + cell.z * 22, 18, 18); });
    ctx.fillStyle = '#b8e37c'; ctx.fillText(`Resources: ${String(rts.resources ?? 0)}`, 12, 22);
  }

  private drawHousing(ctx: CanvasRenderingContext2D, housing: Record<string, unknown>): void {
    const pieces = Array.isArray(housing.pieces) ? housing.pieces as Array<Record<string, unknown>> : [];
    pieces.forEach((piece) => { const cell = piece.cell as Record<string, number>; ctx.fillStyle = '#9a7850'; ctx.fillRect(280 + cell.x * 22, 150 + cell.z * 22, 18, 18); });
  }
}
