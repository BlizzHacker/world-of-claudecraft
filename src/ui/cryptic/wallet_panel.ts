// Phantom wallet panel — connects to the Solana wallet extension, asks the
// server for a sign challenge, signs it with the wallet, links the wallet,
// then renders balance + claim button.
//
// No npm imports — talks to window.solana (Phantom injects this) directly.
// Browsers without Phantom get a "Install Phantom" link instead.

import { getActiveRealm } from '../../sim/realms';

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array, encoding?: 'utf8'): Promise<{ signature: Uint8Array }>;
}

function getProvider(): PhantomProvider | null {
  const w = window as unknown as { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } };
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

function readBearer(): string | null {
  return (
    localStorage.getItem('cryptic-realm_user_token') ||
    localStorage.getItem('cryptic-realm_admin_token') ||
    localStorage.getItem('woc_user_token')
  );
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
  return { ok: true, msg: `claimed → ${body?.data?.txSig ?? 'ok'}` };
}

// Minimal base58 encoder — Phantom returns signature bytes; we send base58.
const ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bs58Encode(bytes: Uint8Array): string {
  let s = '';
  let n = BigInt('0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''));
  while (n > 0n) { s = ALPHA[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b === 0) s = '1' + s; else break; }
  return s;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

async function render(host: HTMLElement): Promise<void> {
  const provider = getProvider();
  const me = await fetchPlatinum();

  if (!me) {
    host.innerHTML = `
      <div class="cr-wallet-card">
        <h3>Wallet & Platinum</h3>
        <p class="cr-dim">Sign in first to manage your platinum / wallet.</p>
      </div>`;
    return;
  }

  const phantomNotInstalled = !provider;
  const installPrompt = `
    <p class="cr-dim">
      Phantom wallet isn't detected.
      <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer">Install Phantom</a>
      (or any Solana wallet that injects <code>window.solana</code>) and refresh.
    </p>`;
  const linkButton = `<button id="cr-wallet-connect" type="button">Connect Phantom wallet</button>`;
  const linked = me.walletAddress
    ? `<div class="cr-wallet-linked">
         <span class="cr-dim">Wallet:</span> <code>${escapeHtml(me.walletAddress)}</code>
       </div>`
    : '';

  const claim = me.walletAddress
    ? `<div class="cr-claim-row">
         <input id="cr-claim-amount" type="number" min="1" max="${me.offChainBalance}" value="${Math.min(1, me.offChainBalance)}" />
         <button id="cr-claim-btn" type="button" ${me.offChainBalance > 0 ? '' : 'disabled'}>Claim → Wallet</button>
       </div>
       <p class="cr-dim cr-tiny">
         Mints SPL tokens to your linked wallet. Off-chain platinum is debited
         on success; refunded if the mint fails.
       </p>`
    : '';

  host.innerHTML = `
    <div class="cr-wallet-card">
      <h3>Wallet & Platinum</h3>
      <div class="cr-balance-row">
        <span class="cr-balance-label">Platinum (off-chain)</span>
        <span class="cr-balance-value">${me.offChainBalance}</span>
      </div>
      <div class="cr-balance-row">
        <span class="cr-balance-label">Lifetime earned</span>
        <span class="cr-balance-value cr-dim">${me.lifetimeEarned}</span>
      </div>
      <div class="cr-balance-row">
        <span class="cr-balance-label">On-chain balance</span>
        <span class="cr-balance-value">${me.onChainBalance == null ? '—' : me.onChainBalance}</span>
      </div>
      ${linked}
      ${phantomNotInstalled ? installPrompt : (me.walletAddress ? '' : linkButton)}
      ${claim}
      <p class="cr-disclaimer cr-tiny">
        Items and on-chain tokens granted in Cryptic Realm are utility for
        gameplay, cosmetics, achievements, and account ownership records.
        They are not investments, securities, or financial instruments. No
        price appreciation, revenue share, staking yield, or guaranteed
        value is implied or promised.
      </p>
    </div>
  `;

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
      return;
    }
    void render(host);
  };
  refresh();
  window.addEventListener('cr-realm-change', refresh);
}
