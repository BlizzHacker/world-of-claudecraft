// The couch co-op join overlay: opened when an unassigned controller presses
// Start (or the keyboard join key). It is fully pad-navigable (D-pad moves the
// selection, the bottom face button confirms, the right face button cancels)
// and also pointer-clickable, so a parent can set a child up with the mouse.
//
// Three flows, chosen by the host's mode:
//   offline            -> pick one of the nine classes (a fresh session hero)
//   online, same acct  -> pick one of the account's OTHER characters
//   online, diff acct  -> a small sign-in, then that account's characters
//
// The overlay only gathers the CHOICE; the host turns it into a live co-op
// player (Sim.addPlayer offline, a secondary ClientWorld online). All copy is
// t()-keyed under the `coop` namespace.

import { GP } from '../game/gamepad_map';
import type { PlayerClass } from '../sim/types';
import { t } from './i18n';

export interface CoopCharacterRef {
  id: number;
  name: string;
  cls: PlayerClass;
}

export type CoopJoinChoice =
  | { kind: 'offline'; cls: PlayerClass; name: string }
  | { kind: 'online'; character: CoopCharacterRef; token: string | null; base: string | null };

export interface CoopOverlayDeps {
  mode: 'offline' | 'online';
  // The nine class ids in display order (offline flow).
  classes: readonly PlayerClass[];
  // Localized class display name, e.g. t('classes.warrior').
  classLabel: (cls: PlayerClass) => string;
  // Online, same account: the account's characters other than Player 1's.
  sameAccountCharacters?: () => CoopCharacterRef[];
  // Online, separate account: sign in and return that account's roster + a
  // token/base the host uses to open the secondary session.
  loginSeparate?: (
    username: string,
    password: string,
  ) => Promise<{ token: string; base: string; characters: CoopCharacterRef[] }>;
}

type Step = 'account' | 'class' | 'character' | 'login';

const OVERLAY_ID = 'coop-join-overlay';
const STYLE_ID = 'coop-join-overlay-styles';

// Self-contained styling injected once, so the overlay needs no entry in the
// @layer CSS build. Scoped under the overlay id/classes; touch-target and
// font-size floors follow src/ui/CLAUDE.md (>=40px targets, >=16px inputs).
function ensureCoopOverlayStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
  .coop-join-panel {
    display: flex; flex-direction: column; gap: 14px;
    min-width: min(520px, 92vw); max-width: 92vw; max-height: 88vh; overflow-y: auto;
    padding: 24px; border-radius: 12px;
    background: rgba(18, 16, 26, 0.96); border: 1px solid rgba(255, 209, 0, 0.4);
    color: #f4f1e8; text-align: center;
  }
  .coop-join-panel h2 { margin: 0; font-size: 22px; color: #ffd100; }
  .coop-join-panel p { margin: 0; font-size: 16px; opacity: 0.85; }
  .coop-option-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .coop-join-panel button {
    min-height: 44px; min-width: 44px; padding: 10px 16px; font-size: 16px;
    border-radius: 8px; cursor: pointer;
    background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.25);
    color: inherit;
  }
  .coop-option { flex: 1 1 30%; }
  .coop-join-panel button:hover { background: rgba(255, 209, 0, 0.18); }
  .coop-option-selected, .coop-join-panel button:focus-visible {
    outline: 3px solid #ffd100; outline-offset: 2px; background: rgba(255, 209, 0, 0.22);
  }
  .coop-cancel { align-self: center; background: rgba(255, 90, 90, 0.14); }
  .coop-login-form { display: flex; flex-direction: column; gap: 10px; }
  .coop-login-form input {
    min-height: 44px; padding: 10px 12px; font-size: 16px; border-radius: 8px;
    background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.25); color: inherit;
  }
  .coop-login-error { color: #ff8a8a; }
  .coop-empty { opacity: 0.7; }
  @media (prefers-reduced-motion: reduce) { .coop-join-panel * { transition: none !important; } }
  `;
  document.head.appendChild(style);
}

export class CoopOverlay {
  private root: HTMLDivElement | null = null;
  private slot = 0;
  private step: Step = 'class';
  private selectedIndex = 0;
  private options: HTMLButtonElement[] = [];
  private roster: CoopCharacterRef[] = [];
  private onConfirm: ((choice: CoopJoinChoice) => void) | null = null;
  private onCancel: (() => void) | null = null;
  // Filled during the separate-account flow.
  private sepToken: string | null = null;
  private sepBase: string | null = null;

  get isOpen(): boolean {
    return this.root !== null;
  }

  get openSlot(): number {
    return this.isOpen ? this.slot : 0;
  }

  constructor(private readonly deps: CoopOverlayDeps) {}

  open(slot: number, onConfirm: (choice: CoopJoinChoice) => void, onCancel: () => void): void {
    ensureCoopOverlayStyles();
    this.close();
    this.slot = slot;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.sepToken = null;
    this.sepBase = null;
    this.root = document.createElement('div');
    this.root.id = OVERLAY_ID;
    this.root.className = 'fatal-overlay coop-join-overlay';
    document.body.appendChild(this.root);
    // Online starts with the account step; offline goes straight to class pick.
    this.step = this.deps.mode === 'online' ? 'account' : 'class';
    this.render();
  }

  close(): void {
    this.root?.remove();
    this.root = null;
    this.options = [];
    this.onConfirm = null;
    this.onCancel = null;
  }

  /** Drive the overlay from a joining pad's rising button edges. */
  padInput(edges: readonly number[]): void {
    if (!this.isOpen) return;
    for (const b of edges) {
      if (b === GP.DPAD_DOWN || b === GP.DPAD_RIGHT) this.moveSelection(1);
      else if (b === GP.DPAD_UP || b === GP.DPAD_LEFT) this.moveSelection(-1);
      else if (b === GP.A) this.activateSelection();
      else if (b === GP.B) this.cancel();
    }
  }

  private moveSelection(delta: number): void {
    if (this.options.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.options.length) % this.options.length;
    this.highlight();
  }

  private highlight(): void {
    this.options.forEach((el, i) => {
      el.classList.toggle('coop-option-selected', i === this.selectedIndex);
      if (i === this.selectedIndex) el.focus({ preventScroll: true });
    });
  }

  private activateSelection(): void {
    this.options[this.selectedIndex]?.click();
  }

  private cancel(): void {
    const cb = this.onCancel;
    this.close();
    cb?.();
  }

  private confirm(choice: CoopJoinChoice): void {
    const cb = this.onConfirm;
    this.close();
    cb?.(choice);
  }

  // --- rendering -------------------------------------------------------------

  private render(): void {
    if (!this.root) return;
    this.root.replaceChildren();
    this.options = [];
    this.selectedIndex = 0;

    const panel = document.createElement('div');
    panel.className = 'coop-join-panel';
    const title = document.createElement('h2');
    title.textContent = t('coop.joinTitle', { slot: String(this.slot) });
    panel.appendChild(title);

    if (this.step === 'account') this.renderAccountStep(panel);
    else if (this.step === 'class') this.renderClassStep(panel);
    else if (this.step === 'character') this.renderCharacterStep(panel);
    else if (this.step === 'login') this.renderLoginStep(panel);

    const cancel = this.makeButton(t('coop.joinCancel'), () => this.cancel());
    cancel.classList.add('coop-cancel');
    panel.appendChild(cancel);

    this.root.appendChild(panel);
    this.highlight();
  }

  private renderAccountStep(panel: HTMLElement): void {
    const label = document.createElement('p');
    label.textContent = t('coop.pickCharacter');
    panel.appendChild(label);
    const grid = document.createElement('div');
    grid.className = 'coop-option-grid';
    grid.appendChild(
      this.makeOption(t('coop.accountThis'), () => {
        this.step = 'character';
        this.roster = this.deps.sameAccountCharacters?.() ?? [];
        this.render();
      }),
    );
    grid.appendChild(
      this.makeOption(t('coop.accountOther'), () => {
        this.step = 'login';
        this.render();
      }),
    );
    panel.appendChild(grid);
  }

  private renderClassStep(panel: HTMLElement): void {
    const label = document.createElement('p');
    label.textContent = t('coop.pickClass');
    panel.appendChild(label);
    const grid = document.createElement('div');
    grid.className = 'coop-option-grid';
    for (const cls of this.deps.classes) {
      grid.appendChild(
        this.makeOption(this.deps.classLabel(cls), () => {
          const name = `${this.deps.classLabel(cls)} ${this.slot}`;
          this.confirm({ kind: 'offline', cls, name });
        }),
      );
    }
    panel.appendChild(grid);
  }

  private renderCharacterStep(panel: HTMLElement): void {
    const label = document.createElement('p');
    label.textContent = t('coop.pickCharacter');
    panel.appendChild(label);
    if (this.roster.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'coop-empty';
      empty.textContent = t('coop.noOtherCharacters');
      panel.appendChild(empty);
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'coop-option-grid';
    for (const ch of this.roster) {
      grid.appendChild(
        this.makeOption(`${ch.name} (${this.deps.classLabel(ch.cls)})`, () => {
          this.confirm({
            kind: 'online',
            character: ch,
            token: this.sepToken,
            base: this.sepBase,
          });
        }),
      );
    }
    panel.appendChild(grid);
  }

  private renderLoginStep(panel: HTMLElement): void {
    const label = document.createElement('p');
    label.textContent = t('coop.loginTitle', { slot: String(this.slot) });
    panel.appendChild(label);
    const form = document.createElement('form');
    form.className = 'coop-login-form';
    const user = document.createElement('input');
    user.type = 'text';
    user.autocomplete = 'username';
    user.placeholder = t('coop.loginUser');
    user.setAttribute('aria-label', t('coop.loginUser'));
    const pass = document.createElement('input');
    pass.type = 'password';
    pass.autocomplete = 'current-password';
    pass.placeholder = t('coop.loginPass');
    pass.setAttribute('aria-label', t('coop.loginPass'));
    const error = document.createElement('p');
    error.className = 'coop-login-error';
    error.hidden = true;
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'coop-option';
    submit.textContent = t('coop.loginSubmit');
    form.append(user, pass, error, submit);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      error.hidden = true;
      submit.disabled = true;
      void this.deps
        .loginSeparate?.(user.value, pass.value)
        .then((res) => {
          this.sepToken = res.token;
          this.sepBase = res.base;
          this.roster = res.characters;
          this.step = 'character';
          this.render();
        })
        .catch(() => {
          error.textContent = t('coop.loginError');
          error.hidden = false;
          submit.disabled = false;
        });
    });
    panel.appendChild(form);
    // The text inputs are the interactive elements here; the pad's confirm
    // targets the submit button, so register it as the single "option".
    this.options = [submit as unknown as HTMLButtonElement];
  }

  private makeOption(label: string, onClick: () => void): HTMLButtonElement {
    const btn = this.makeButton(label, onClick);
    btn.classList.add('coop-option');
    this.options.push(btn);
    return btn;
  }

  private makeButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }
}
