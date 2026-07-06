// Pure display-state resolution for the wallet panel (src/ui/cryptic/wallet_panel.ts).
//
// The panel used to hide itself entirely whenever the platinum fetch returned
// null — no token, a transient 401, a cold start — which is exactly why the
// wallet chip "disappeared" for a logged-in admin: one non-ok fetch and the
// whole widget vanished with no way back. That coupling of "fetch failed" to
// "render nothing" is the bug. This module makes the decision explicit and
// testable so the DOM layer can render the right chip for every case instead of
// collapsing them all into "hidden".
//
// DOM-free and Three-free on purpose: wallet_panel.ts consumes it and owns all
// element mutation.

export interface WalletMe {
  accountId: number;
  walletAddress: string | null;
  offChainBalance: number;
  onChainBalance: number | null;
  lifetimeEarned: number;
}

/** What the trigger chip should show, decided from inputs the panel already has. */
export type WalletChipState =
  // Realm opts out of the economy overlay (vanilla claudecraft) — render nothing.
  | { kind: 'hidden' }
  // No session token found — show a chip that routes the user to sign in.
  | { kind: 'signed-out' }
  // Logged in, but the balance fetch failed (401/500/offline). Still show a chip
  // so the wallet never silently vanishes; the popover explains + offers retry.
  | { kind: 'unavailable' }
  // Logged in, balance loaded, no wallet linked yet.
  | { kind: 'connected'; me: WalletMe; walletLinked: false }
  // Logged in, balance loaded, wallet linked.
  | { kind: 'connected'; me: WalletMe; walletLinked: true };

export interface WalletChipInputs {
  /** True when the active realm disables the economy overlay (claudecraft). */
  realmDisabled: boolean;
  /** True when a session bearer token exists in storage. */
  hasToken: boolean;
  /** The parsed /api/economy/platinum payload, or null if the fetch was not ok. */
  me: WalletMe | null;
}

/**
 * Decide the wallet chip's display state. Precedence: a disabled realm hides the
 * widget outright; otherwise a missing token means signed-out; otherwise a failed
 * fetch means unavailable (NOT hidden — that was the bug); otherwise connected.
 */
export function resolveWalletChip(input: WalletChipInputs): WalletChipState {
  if (input.realmDisabled) return { kind: 'hidden' };
  if (!input.hasToken) return { kind: 'signed-out' };
  if (!input.me) return { kind: 'unavailable' };
  return {
    kind: 'connected',
    me: input.me,
    walletLinked: input.me.walletAddress != null,
  };
}

/** Short 4…4 form of a base58 address for the chip label. */
export function shortWalletAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/** The label shown on the trigger chip for a given state. */
export function walletChipLabel(state: WalletChipState): string {
  switch (state.kind) {
    case 'hidden':
      return '';
    case 'signed-out':
      return 'Sign in';
    case 'unavailable':
      return 'Wallet';
    case 'connected':
      return state.walletLinked && state.me.walletAddress
        ? shortWalletAddress(state.me.walletAddress)
        : 'Wallet';
  }
}
