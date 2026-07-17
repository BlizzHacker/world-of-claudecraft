import type { TowerKind } from '../sim/minigames';
import type { IWorld } from '../world_api';
import { markDialogRoot } from './dialog_root';
import { esc } from './esc';
import { t } from './i18n';

export interface ZombieDefenseWindowDeps {
  root(): HTMLElement;
  world(): IWorld;
  closeOthers(): void;
  captureFocus(): HTMLElement | null;
  restoreFocus(target: HTMLElement | null): void;
}

const TOWER_BUTTONS: readonly {
  kind: TowerKind;
  key: 'towerArrow' | 'towerSlow' | 'towerCannon';
  x: number;
}[] = [
  { kind: 'arrow', key: 'towerArrow', x: -3 },
  { kind: 'slow', key: 'towerSlow', x: 0 },
  { kind: 'cannon', key: 'towerCannon', x: 3 },
];

/**
 * Thin world-facing painter for the Eastbrook strategy board. The deterministic
 * session and zombie state remain in Sim/GameServer; this class only renders
 * snapshots and translates clicks into IWorld commands.
 */
export class ZombieDefenseWindow {
  private openerFocus: HTMLElement | null = null;
  private lastSignature = '';

  constructor(private readonly deps: ZombieDefenseWindowDeps) {}

  toggle(): void {
    const root = this.deps.root();
    if (root.style.display === 'block') {
      this.close();
      return;
    }
    this.openerFocus = this.deps.captureFocus();
    this.deps.closeOthers();
    markDialogRoot(root, { labelledBy: 'zombie-defense-title' });
    root.style.display = 'block';
    this.bindOnce(root);
    this.render(true);
  }

  close(): void {
    const root = this.deps.root();
    root.style.display = 'none';
    this.lastSignature = '';
    this.deps.restoreFocus(this.openerFocus);
    this.openerFocus = null;
  }

  render(force = false): void {
    const root = this.deps.root();
    if (root.style.display !== 'block') return;
    const world = this.deps.world();
    const feature = world.minigameFeatures.find((entry) => entry.id === 'zombie_defense');
    const session = world.minigameSession;
    const zombie = world.minigameZombieState;
    const signature = JSON.stringify([
      feature?.enabled ?? false,
      session,
      zombie?.state.tick ?? -1,
      zombie?.state.resources ?? -1,
    ]);
    if (!force && signature === this.lastSignature) return;
    this.lastSignature = signature;

    const body = document.createElement('div');
    body.className = 'zombie-defense-body';
    body.innerHTML =
      `<div class="panel-title"><span id="zombie-defense-title">${esc(t('hudChrome.zombie.title'))}</span>` +
      `<button type="button" class="x-btn" data-zombie-action="close" aria-label="${esc(t('hudChrome.zombie.close'))}">×</button></div>`;

    if (!feature?.enabled && !feature?.preview) {
      body.insertAdjacentHTML(
        'beforeend',
        `<p class="zombie-note">${esc(t('hudChrome.zombie.unavailable'))}</p>`,
      );
      root.replaceChildren(body);
      this.bindOnce(root);
      return;
    }

    body.insertAdjacentHTML(
      'beforeend',
      `<p class="zombie-note">${esc(t('hudChrome.zombie.intro'))}</p>`,
    );
    if (!session) {
      body.insertAdjacentHTML(
        'beforeend',
        `<button type="button" class="btn" data-zombie-action="create">${esc(t('hudChrome.zombie.create'))}</button>` +
          `<div class="zombie-join"><label>${esc(t('hudChrome.zombie.sessionCode'))}<input inputmode="numeric" min="1" step="1" data-zombie-session-code /></label>` +
          `<button type="button" class="btn" data-zombie-action="join">${esc(t('hudChrome.zombie.join'))}</button></div>`,
      );
      root.replaceChildren(body);
      this.bindOnce(root);
      return;
    }

    const me = session.players.find((player) => player.pid === world.playerId);
    const status = zombie?.state.status ?? session.phase;
    body.insertAdjacentHTML(
      'beforeend',
      `<div class="zombie-session-code"><span>${esc(t('hudChrome.zombie.copyCode'))}</span> <code>${session.id}</code></div>` +
        (session.ownerPid === world.playerId
          ? `<div class="zombie-join"><label>${esc(t('hudChrome.zombie.inviteHint'))}<input inputmode="numeric" min="1" step="1" data-zombie-target /></label><button type="button" class="btn" data-zombie-action="invite">${esc(t('hudChrome.zombie.invitePlayer'))}</button></div>`
          : '') +
        `<div class="zombie-stats"><span>${esc(t('hudChrome.zombie.wave', { wave: session.kind === 'zombie_defense' ? (zombie?.state.wave ?? 0) : 0 }))}</span>` +
        `<span>${esc(t('hudChrome.zombie.lives', { lives: zombie?.state.lives ?? 0 }))}</span>` +
        `<span>${esc(t('hudChrome.zombie.resources', { resources: zombie?.state.resources ?? 0 }))}</span></div>` +
        `<div class="zombie-status">${esc(t('hudChrome.zombie.status', { status }))}</div>` +
        `<h3>${esc(t('hudChrome.zombie.roster'))}</h3>` +
        `<ul class="zombie-roster">${session.players.map((player) => `<li>${player.pid === world.playerId ? '★ ' : ''}${esc(String(player.pid))} ${player.ready ? '✓' : '…'}</li>`).join('')}</ul>`,
    );

    if (session.phase === 'lobby') {
      body.insertAdjacentHTML(
        'beforeend',
        `<button type="button" class="btn" data-zombie-action="ready">${esc(me?.ready ? t('hudChrome.zombie.readyDone') : t('hudChrome.zombie.ready'))}</button>` +
          `<p class="zombie-note">${esc(t('hudChrome.zombie.waiting'))}</p>`,
      );
    } else if (session.phase === 'active' && zombie) {
      if (zombie.state.status === 'ready') {
        body.insertAdjacentHTML(
          'beforeend',
          `<button type="button" class="btn" data-zombie-action="start">${esc(t('hudChrome.zombie.startWave'))}</button>`,
        );
      }
      if (zombie.state.status === 'active') {
        body.insertAdjacentHTML(
          'beforeend',
          `<p class="zombie-note">${esc(t('hudChrome.zombie.active'))}</p>` +
            `<div class="zombie-towers">${TOWER_BUTTONS.map(({ kind, key, x }) => `<button type="button" class="btn" data-zombie-build="${kind}" data-zombie-x="${x}" data-zombie-z="1">${esc(t(`hudChrome.zombie.${key}` as const))}</button>`).join('')}</div>`,
        );
      }
    }
    if (session.phase === 'finished' && zombie?.state.status === 'won') {
      body.insertAdjacentHTML(
        'beforeend',
        `<p class="zombie-note zombie-win">${esc(t('hudChrome.zombie.victory'))}</p><button type="button" class="btn" data-zombie-action="claim">${esc(t('hudChrome.zombie.claim'))}</button>`,
      );
    } else if (zombie?.state.status === 'lost') {
      body.insertAdjacentHTML(
        'beforeend',
        `<p class="zombie-note zombie-loss">${esc(t('hudChrome.zombie.defeat'))}</p>`,
      );
    }
    body.insertAdjacentHTML(
      'beforeend',
      `<button type="button" class="btn leave" data-zombie-action="abort">${esc(t('hudChrome.zombie.abort'))}</button>`,
    );
    root.replaceChildren(body);
    this.bindOnce(root);
    this.paintBoard(root, zombie);
  }

  private bindOnce(root: HTMLElement): void {
    root.querySelectorAll('[data-zombie-action]').forEach((node) => {
      const action = (node as HTMLElement).dataset.zombieAction;
      node.addEventListener('click', () => this.handleAction(action));
    });
    root.querySelectorAll('[data-zombie-build]').forEach((node) => {
      node.addEventListener('click', () => {
        const button = node as HTMLElement;
        const kind = button.dataset.zombieBuild as TowerKind;
        const x = Number(button.dataset.zombieX);
        const z = Number(button.dataset.zombieZ);
        if (Number.isInteger(x) && Number.isInteger(z))
          this.deps.world().minigameZombieBuild(kind, x, z);
      });
    });
  }

  private handleAction(action: string | undefined): void {
    const world = this.deps.world();
    switch (action) {
      case 'close':
        this.close();
        break;
      case 'create':
        world.minigameCreate('zombie_defense', 4);
        break;
      case 'join': {
        const input = this.deps
          .root()
          .querySelector<HTMLInputElement>('[data-zombie-session-code]');
        const id = Number(input?.value);
        if (Number.isInteger(id) && id > 0) world.minigameJoin(id);
        break;
      }
      case 'invite': {
        const input = this.deps.root().querySelector<HTMLInputElement>('[data-zombie-target]');
        const pid = Number(input?.value);
        if (Number.isInteger(pid) && pid > 0) world.minigameInvite(pid);
        break;
      }
      case 'ready':
        world.minigameReady(true);
        break;
      case 'start':
        world.minigameZombieStart();
        break;
      case 'abort':
        world.minigameAbort();
        break;
      case 'claim':
        world.minigameClaim();
        break;
    }
    this.render(true);
  }

  private paintBoard(root: HTMLElement, zombie: IWorld['minigameZombieState']): void {
    if (!zombie) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'zombie-board';
    canvas.width = 420;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#101722';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const route = zombie.state.route;
    const toPx = (x: number, z: number) => ({ x: 30 + (x + 6) * 30, y: 60 + z * -24 });
    ctx.strokeStyle = '#8c6b2c';
    ctx.lineWidth = 8;
    ctx.beginPath();
    route.forEach((cell, index) => {
      const p = toPx(cell.x, cell.z);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    for (const tower of zombie.state.towers) {
      const p = toPx(tower.cell.x, tower.cell.z);
      ctx.fillStyle =
        tower.kind === 'cannon' ? '#d05c47' : tower.kind === 'slow' ? '#4d9cd4' : '#e4bf55';
      ctx.fillRect(p.x - 7, p.y - 7, 14, 14);
    }
    for (const mob of zombie.state.zombies) {
      const cell = route[Math.min(mob.routeIndex, route.length - 1)];
      if (!cell) continue;
      const p = toPx(cell.x, cell.z);
      ctx.fillStyle = mob.archetype === 'brute' ? '#c24b52' : '#8fd16a';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 12, mob.archetype === 'brute' ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
    }
    root.querySelector('.zombie-defense-body')?.appendChild(canvas);
  }
}
