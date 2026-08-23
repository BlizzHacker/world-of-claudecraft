// Facebook Instant Games build stub for the external-wallet vendor tree.
//
// The Reown AppKit / WalletConnect / Solana web3 packages ship code that reads
// as a sandbox escape to Facebook's "Must Not Call Private APIs" bundle
// scanner: W3mFrame does `parent.postMessage(msg, '*')`, AppKit probes
// `window.self !== window.top`, WalletConnect core reads `document.cookie`,
// and the modal controller calls `navigator.sendBeacon` and navigates via
// `window.location.href` to wallet deeplinks. None of it runs inside the
// Facebook container (the wallet surface is gated off by FACEBOOK_APP in
// src/main.ts and src/game/facebook_context.ts), but the vendor JS still
// shipped in the bundle and its literals still tripped the scanner.
//
// vite.config.ts aliases every wallet vendor specifier to THIS file when
// WOC_FACEBOOK_BUNDLE=1, so the vendor tree is never pulled into the graph:
// the offending strings never ship and the bundle drops the multi-megabyte
// wallet/web3 chunks. These exports exist only to satisfy the import bindings
// in src/net/wallet*.ts; the code paths that would call them are unreachable
// in the Facebook build, so every one throws to make an accidental call in a
// future refactor loud rather than silent.

function unavailable(): never {
  throw new Error(
    'external wallet connectivity is unavailable in the Facebook Instant Games build',
  );
}

// @solana/wallet-standard-chains
export function isSolanaChain(_chain: unknown): boolean {
  return false;
}

// @solana/wallet-standard-features (feature-key string constants)
export const SolanaSignMessage = 'solana:signMessage';
export const SolanaSignAndSendTransaction = 'solana:signAndSendTransaction';

// @wallet-standard/features (feature-key string constants)
export const StandardConnect = 'standard:connect';
export const StandardDisconnect = 'standard:disconnect';
export const StandardEvents = 'standard:events';

// @wallet-standard/app
export function getWallets(): { get(): readonly unknown[]; on(): () => void } {
  return { get: () => [], on: () => () => {} };
}

// @reown/appkit
export function createAppKit(): never {
  return unavailable();
}

// @reown/appkit-adapter-solana
export class SolanaAdapter {
  constructor() {
    unavailable();
  }
}

// @reown/appkit/networks
export const solana = {};

// @solana/web3.js
export class Transaction {
  constructor() {
    unavailable();
  }
}
export class VersionedTransaction {
  constructor() {
    unavailable();
  }
}
