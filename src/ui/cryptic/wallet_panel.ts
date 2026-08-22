// Phantom wallet panel: connects to the Solana wallet extension, asks the
// server for a sign challenge, signs it with the wallet, links the wallet,
// then renders balance + claim controls.
//
// No npm imports: talks to window.solana (Phantom injects this) directly.
// Browsers without Phantom get an install link inside the wallet flyout.

import './realm_env';
import { getActiveRealm } from '../../sim/realms';
import { readCrypticSession } from './session';
import { resolveWalletChip, walletChipLabel } from './wallet_panel_core';

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array, encoding?: 'utf8'): Promise<{ signature: Uint8Array }>;
}

function getProvider(): PhantomProvider | null {
  const w = window as unknown as {
    solana?: PhantomProvider;
    phantom?: { solana?: PhantomProvider };
  };
  if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
  if (w.solana?.isPhantom) return w.solana;
  return null;
}

interface MeResponse {
  accountId: number;
  walletAddress: string | null;
  offChainBalance: number;
  onChainBalance: number | null;
  lifetimeEarned: number;
}

// Session resolution is the shared ./session helper, not a hand-rolled key
// scan: it covers every dashboard token key (user/mod/admin plus the legacy
// woc_session blob), validates the token shape, and try/catch-guards storage.
function readBearer(): string | null {
  return readCrypticSession()?.token ?? null;
}

async function fetchPlatinum(): Promise<MeResponse | null> {
  const tok = readBearer();
  if (!tok) return null;
  const r = await fetch('/api/economy/platinum', { headers: { Authorization: `Bearer ${tok}` } });
  if (!r.ok) return null;
  const b = await r.json();
  return b?.data ?? null;
}

async function requestChallenge(): Promise<string | null> {
  const tok = readBearer();
  if (!tok) return null;
  const r = await fetch('/api/economy/wallet-challenge', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}` },
  });
  if (!r.ok) return null;
  return (await r.json())?.data?.message ?? null;
}

async function submitLink(wallet: string, signatureBase58: string): Promise<string | null> {
  const tok = readBearer();
  if (!tok) return 'not signed in';
  const r = await fetch('/api/economy/wallet-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ wallet, signature: signatureBase58, network: 'solana' }),
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) return body?.error ?? `link failed (${r.status})`;
  return null;
}

async function submitClaim(amount: number): Promise<{ ok: boolean; msg: string }> {
  const tok = readBearer();
  if (!tok) return { ok: false, msg: 'not signed in' };
  const r = await fetch('/api/economy/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ amount }),
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) return { ok: false, msg: body?.error ?? `claim failed (${r.status})` };
  return { ok: true, msg: `claimed to wallet: ${body?.data?.txSig ?? 'ok'}` };
}

const ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bs58Encode(bytes: Uint8Array): string {
  let s = '';
  let n = BigInt(
    '0x' +
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
  );
  while (n > 0n) {
    s = ALPHA[Number(n % 58n)] + s;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b === 0) s = '1' + s;
    else break;
  }
  return s;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function closePanel(host: HTMLElement): void {
  const trigger = host.querySelector('.cr-wallet-trigger') as HTMLButtonElement | null;
  const popover = host.querySelector('.cr-wallet-popover') as HTMLElement | null;
  trigger?.setAttribute('aria-expanded', 'false');
  popover?.setAttribute('hidden', '');
}

function togglePanel(host: HTMLElement): void {
  const trigger = host.querySelector('.cr-wallet-trigger') as HTMLButtonElement | null;
  const popover = host.querySelector('.cr-wallet-popover') as HTMLElement | null;
  if (!trigger || !popover) return;
  const willOpen = popover.hasAttribute('hidden');
  trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  if (willOpen) popover.removeAttribute('hidden');
  else popover.setAttribute('hidden', '');
}

/** The trigger chip shell shared by the signed-out / unavailable fallbacks so the
 *  wallet never silently vanishes: a logged-in-but-fetch-failed or not-yet-signed-in
 *  user still sees a $CR chip they can click. */
function chipShell(label: string, sublabel: string, bodyHtml: string): string {
  return `
    <div class="cr-wallet-widget">
      <button type="button" class="cr-wallet-trigger" aria-haspopup="dialog" aria-expanded="false" aria-controls="cr-wallet-popover">
        <span class="cr-wallet-mark" aria-hidden="true">$CR</span>
        <span class="cr-wallet-trigger-copy">
          <span class="cr-wallet-trigger-kicker">Wallet</span>
          <span class="cr-wallet-trigger-label">${escapeHtml(label)}</span>
        </span>
        <span class="cr-wallet-caret" aria-hidden="true">v</span>
      </button>
      <div class="cr-wallet-popover" id="cr-wallet-popover" role="dialog" aria-label="Wallet and Platinum" hidden>
        <div class="cr-wallet-card">
          <h3>Wallet &amp; Platinum</h3>
          <p class="cr-dim">${escapeHtml(sublabel)}</p>
          ${bodyHtml}
        </div>
      </div>
    </div>`;
}

function wireTrigger(host: HTMLElement): void {
  host.querySelector('.cr-wallet-trigger')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    togglePanel(host);
  });
}

async function render(host: HTMLElement): Promise<void> {
  const provider = getProvider();
  const fetched = await fetchPlatinum();
  const state = resolveWalletChip({
    realmDisabled: getActiveRealm().id === 'claudecraft',
    hasToken: readBearer() != null,
    me: fetched,
  });

  if (state.kind === 'hidden') {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }
  host.hidden = false;

  // Signed out: show a chip that points the user at the login button rather than
  // hiding the wallet entirely (the old behavior, which looked like a bug).
  if (state.kind === 'signed-out') {
    host.innerHTML = chipShell(
      walletChipLabel(state),
      'Sign in to view your $CR balance and link a wallet.',
      `<button id="cr-wallet-signin" type="button">Go to sign in</button>`,
    );
    wireTrigger(host);
    host.querySelector('#cr-wallet-signin')?.addEventListener('click', () => {
      document
        .getElementById('nav-btn-login')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document
        .getElementById('login-open')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    return;
  }

  // Logged in but the balance fetch failed (401/500/offline). Keep the chip
  // visible with a retry, instead of the widget disappearing.
  if (state.kind === 'unavailable') {
    host.innerHTML = chipShell(
      walletChipLabel(state),
      'Balance is temporarily unavailable.',
      `<button id="cr-wallet-retry" type="button">Retry</button>`,
    );
    wireTrigger(host);
    host.querySelector('#cr-wallet-retry')?.addEventListener('click', () => {
      void render(host);
    });
    return;
  }

  // state.kind === 'connected' — me is guaranteed non-null here.
  const me = state.me;
  const phantomNotInstalled = !provider;
  const installPrompt = `
    <p class="cr-dim">
      Phantom wallet is not detected.
      <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer">Install Phantom</a>
      (or any Solana wallet that injects <code>window.solana</code>) and refresh.
    </p>`;
  const linkButton = '<button id="cr-wallet-connect" type="button">Connect Phantom wallet</button>';
  const walletLabel = me.walletAddress ? shortAddress(me.walletAddress) : 'Wallet';
  const linked = me.walletAddress
    ? `<div class="cr-wallet-linked">
         <span class="cr-dim">Linked wallet</span>
         <code title="${escapeHtml(me.walletAddress)}">${escapeHtml(shortAddress(me.walletAddress))}</code>
       </div>`
    : '';

  const claim = me.walletAddress
    ? `<div class="cr-claim-row">
         <input id="cr-claim-amount" type="number" min="1" max="${me.offChainBalance}" value="${Math.min(1, me.offChainBalance)}" />
         <button id="cr-claim-btn" type="button" ${me.offChainBalance > 0 ? '' : 'disabled'}>Claim to wallet</button>
       </div>
       <p class="cr-dim cr-tiny">
         Mints SPL tokens to your linked wallet. Off-chain platinum is debited
         on success and refunded if the mint fails.
       </p>`
    : '';

  host.innerHTML = `
    <div class="cr-wallet-widget">
      <button type="button" class="cr-wallet-trigger" aria-haspopup="dialog" aria-expanded="false" aria-controls="cr-wallet-popover">
        <span class="cr-wallet-mark" aria-hidden="true">$CR</span>
        <span class="cr-wallet-trigger-copy">
          <span class="cr-wallet-trigger-kicker">Wallet</span>
          <span class="cr-wallet-trigger-label">${escapeHtml(walletLabel)}</span>
        </span>
        <span class="cr-wallet-trigger-balance" title="Off-chain platinum">${me.offChainBalance} PT</span>
        <span class="cr-wallet-caret" aria-hidden="true">v</span>
      </button>
      <div class="cr-wallet-popover" id="cr-wallet-popover" role="dialog" aria-label="Wallet and Platinum" hidden>
        <div class="cr-wallet-card">
          <h3>Wallet & Platinum</h3>
          <div class="cr-balance-row">
            <span class="cr-balance-label">Platinum</span>
            <span class="cr-balance-value">${me.offChainBalance}</span>
          </div>
          <div class="cr-balance-row">
            <span class="cr-balance-label">Lifetime earned</span>
            <span class="cr-balance-value cr-dim">${me.lifetimeEarned}</span>
          </div>
          <div class="cr-balance-row">
            <span class="cr-balance-label">On-chain balance</span>
            <span class="cr-balance-value">${me.onChainBalance == null ? '-' : me.onChainBalance}</span>
          </div>
          ${linked}
          ${phantomNotInstalled ? installPrompt : me.walletAddress ? '' : linkButton}
          ${claim}
          <p class="cr-disclaimer cr-tiny">
            Items and on-chain tokens granted in Cryptic Realm are gameplay
            utility for cosmetics, achievements, and account ownership records.
            They are not investments, securities, or financial instruments.
          </p>
        </div>
      </div>
    </div>
  `;

  host.querySelector('.cr-wallet-trigger')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    togglePanel(host);
  });

  host.querySelector('#cr-wallet-connect')?.addEventListener('click', async () => {
    const p = getProvider();
    if (!p) return alert('Phantom not detected.');
    try {
      const conn = await p.connect();
      const wallet = conn.publicKey.toString();
      const challenge = await requestChallenge();
      if (!challenge) return alert('Could not request a sign challenge.');
      const sig = await p.signMessage(new TextEncoder().encode(challenge));
      const sigB58 = bs58Encode(sig.signature);
      const err = await submitLink(wallet, sigB58);
      if (err) return alert('Link failed: ' + err);
      void render(host);
    } catch (e) {
      alert('Connect failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  });

  host.querySelector('#cr-claim-btn')?.addEventListener('click', async () => {
    const input = host.querySelector('#cr-claim-amount') as HTMLInputElement;
    const amount = Math.max(1, Math.floor(Number(input?.value ?? 0)));
    const r = await submitClaim(amount);
    alert(r.msg);
    if (r.ok) void render(host);
  });
}

export function mountWalletPanel(): void {
  if (typeof document === 'undefined') return;
  const host = document.getElementById('cr-wallet-panel');
  if (!host) return;

  const refresh = () => {
    if (getActiveRealm().id === 'claudecraft') {
      host.innerHTML = '';
      host.hidden = true;
      return;
    }
    void render(host);
  };

  if (host.dataset.crWalletMounted !== '1') {
    host.dataset.crWalletMounted = '1';
    document.addEventListener('click', (ev) => {
      if (!host.contains(ev.target as Node)) closePanel(host);
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closePanel(host);
    });
    window.addEventListener('cr-realm-change', refresh);
    window.addEventListener('storage', refresh);
  }

  refresh();
}
