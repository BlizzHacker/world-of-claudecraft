import { describe, expect, it } from 'vitest';
import { EXCHANGE_SCHEMA } from '../server/exchange/db';
import {
  cancelExchangeEscrow,
  createExchangeEscrow,
  reverseExchangeSettlement,
  settleExchangeEscrow,
} from '../src/sim/exchange/custody';

describe('Exchange custody transitions', () => {
  it('keeps reversal persistence additive and auditable', () => {
    expect(EXCHANGE_SCHEMA).toContain("'reversed'");
    expect(EXCHANGE_SCHEMA).toContain('reversed_at');
    expect(EXCHANGE_SCHEMA).toContain('reversed_by_character_id');
    expect(EXCHANGE_SCHEMA).toContain('exchange_events_event_type_check');
  });

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
    expect(settled.listing.sourceItemLocked).toBe(false);
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
        destinationRealm: 'infernal',
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
    const cancelled = cancelExchangeEscrow(escrow, 11);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.sourceItemLocked).toBe(false);
  });

  it('reverses only a settled listing when both sides still have custody', () => {
    const escrow = createExchangeEscrow({
      id: 'ex-4',
      sellerCharacterId: 11,
      sourceRealm: 'Infernal',
      itemId: 'raw_mirror_trout',
      count: 2,
      priceCopper: 101,
    });
    const settled = settleExchangeEscrow(escrow, {
      buyerCharacterId: 22,
      destinationRealm: 'Classic',
      buyerHasFunds: true,
      destinationAcceptsItem: true,
    });
    const reversed = reverseExchangeSettlement(settled.listing, {
      actorCharacterId: 22,
      buyerHasItem: true,
      sellerHasProceeds: true,
    });
    expect(reversed.listing.status).toBe('reversed');
    expect(reversed.buyerRefundCopper).toBe(101);
    expect(reversed.sellerDebitCopper).toBe(96);
    expect(reversed.feeCopper).toBe(5);
    expect(reversed.provenance.destinationCharacterId).toBe(22);
    expect(() =>
      reverseExchangeSettlement(settled.listing, {
        actorCharacterId: 33,
        buyerHasItem: true,
        sellerHasProceeds: true,
      }),
    ).toThrow('participant');
    expect(() =>
      reverseExchangeSettlement(settled.listing, {
        actorCharacterId: 11,
        buyerHasItem: false,
        sellerHasProceeds: true,
      }),
    ).toThrow('item');
  });
});
