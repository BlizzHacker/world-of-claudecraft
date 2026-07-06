import { describe, expect, it } from 'vitest';
import {
  resolveWalletChip,
  shortWalletAddress,
  type WalletMe,
  walletChipLabel,
} from '../src/ui/cryptic/wallet_panel_core';

const me = (over: Partial<WalletMe> = {}): WalletMe => ({
  accountId: 1,
  walletAddress: null,
  offChainBalance: 0,
  onChainBalance: null,
  lifetimeEarned: 0,
  ...over,
});

describe('resolveWalletChip', () => {
  it('hides on a disabled realm regardless of token/balance', () => {
    expect(resolveWalletChip({ realmDisabled: true, hasToken: true, me: me() })).toEqual({
      kind: 'hidden',
    });
  });

  it('is signed-out when there is no token', () => {
    expect(resolveWalletChip({ realmDisabled: false, hasToken: false, me: null })).toEqual({
      kind: 'signed-out',
    });
  });

  it('is UNAVAILABLE (not hidden) when logged in but the fetch failed', () => {
    // This is the regression guard: a logged-in user whose /api/economy/platinum
    // returned non-ok must still get a visible chip, never a vanished widget.
    const state = resolveWalletChip({ realmDisabled: false, hasToken: true, me: null });
    expect(state).toEqual({ kind: 'unavailable' });
    expect(state.kind).not.toBe('hidden');
  });

  it('is connected + unlinked when balance loads without a wallet', () => {
    expect(resolveWalletChip({ realmDisabled: false, hasToken: true, me: me() })).toEqual({
      kind: 'connected',
      me: me(),
      walletLinked: false,
    });
  });

  it('is connected + linked when a wallet address is present', () => {
    const linked = me({ walletAddress: 'GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi' });
    expect(resolveWalletChip({ realmDisabled: false, hasToken: true, me: linked })).toEqual({
      kind: 'connected',
      me: linked,
      walletLinked: true,
    });
  });
});

describe('walletChipLabel', () => {
  it('labels each state for the trigger chip', () => {
    expect(walletChipLabel({ kind: 'hidden' })).toBe('');
    expect(walletChipLabel({ kind: 'signed-out' })).toBe('Sign in');
    expect(walletChipLabel({ kind: 'unavailable' })).toBe('Wallet');
    expect(walletChipLabel({ kind: 'connected', me: me(), walletLinked: false })).toBe('Wallet');
    const linked = me({ walletAddress: 'GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi' });
    expect(walletChipLabel({ kind: 'connected', me: linked, walletLinked: true })).toBe(
      'GncA...BJpi',
    );
  });
});

describe('shortWalletAddress', () => {
  it('shortens long addresses and passes short ones through', () => {
    expect(shortWalletAddress('GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi')).toBe('GncA...BJpi');
    expect(shortWalletAddress('short')).toBe('short');
  });
});
