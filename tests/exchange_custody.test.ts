import { describe, expect, it } from 'vitest';
import {
  cancelExchangeEscrow,
  createExchangeEscrow,
  settleExchangeEscrow,
} from '../src/sim/exchange/custody';

describe('Exchange custody transitions', () => {
  it('locks source custody and carries provenance through settlement', () => {
    const escrow = createExchangeEscrow({
      id: 'ex-1',
      sellerCharacterId: 11,
      sourceRealm: 'Infernal',
      itemId: 'mount_emerald_wyrm',
      count: 1,
      priceCopper: 10_000,
    });
    expect(escrow.status).toBe('escrowed');
    expect(escrow.sourceItemLocked).toBe(true);
    const settled = settleExchangeEscrow(escrow, {
      buyerCharacterId: 22,
      destinationRealm: 'Classic',
      buyerHasFunds: true,
      destinationAcceptsItem: true,
    });
    expect(settled.sellerProceedsCopper).toBe(9_500);
    expect(settled.feeCopper).toBe(500);
    expect(settled.provenance.destinationCharacterId).toBe(22);
    expect(settled.provenance.hops).toBe(1);
  });

  it('rejects same-realm, unfunded, incompatible, and duplicate settlement paths', () => {
    const escrow = createExchangeEscrow({
      id: 'ex-2',
      sellerCharacterId: 11,
      sourceRealm: 'Infernal',
      itemId: 'raw_mirror_trout',
      count: 2,
      priceCopper: 101,
    });
    expect(() =>
      settleExchangeEscrow(escrow, {
        buyerCharacterId: 22,
        destinationRealm: 'Infernal',
        buyerHasFunds: true,
        destinationAcceptsItem: true,
      }),
    ).toThrow('cross-realm');
    expect(() =>
      settleExchangeEscrow(escrow, {
        buyerCharacterId: 22,
        destinationRealm: 'Classic',
        buyerHasFunds: false,
        destinationAcceptsItem: true,
      }),
    ).toThrow('reserved');
    expect(() =>
      settleExchangeEscrow(escrow, {
        buyerCharacterId: 22,
        destinationRealm: 'Classic',
        buyerHasFunds: true,
        destinationAcceptsItem: false,
      }),
    ).toThrow('accept');
    const settled = settleExchangeEscrow(escrow, {
      buyerCharacterId: 22,
      destinationRealm: 'Classic',
      buyerHasFunds: true,
      destinationAcceptsItem: true,
    });
    expect(() =>
      settleExchangeEscrow(settled.listing, {
        buyerCharacterId: 33,
        destinationRealm: 'Arcane',
        buyerHasFunds: true,
        destinationAcceptsItem: true,
      }),
    ).toThrow('not escrowed');
  });

  it('allows only the seller to cancel an active escrow', () => {
    const escrow = createExchangeEscrow({
      id: 'ex-3',
      sellerCharacterId: 11,
      sourceRealm: 'Infernal',
      itemId: 'raw_mirror_trout',
      count: 1,
      priceCopper: 50,
    });
    expect(() => cancelExchangeEscrow(escrow, 22)).toThrow('does not own');
    expect(cancelExchangeEscrow(escrow, 11).status).toBe('cancelled');
  });
});
