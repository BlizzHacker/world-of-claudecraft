import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/sim/data';
import { buildExchangeView, exchangePriceEach } from '../src/ui/exchange_view';

describe('exchange view', () => {
  it('keeps the cross-realm destination and resolves inventory definitions', () => {
    const view = buildExchangeView({
      destinationRealm: 'Infernal',
      copper: 1250,
      listings: [],
      inventory: [{ itemId: 'worn_sword', count: 1 }],
      items: ITEMS,
      signedIn: true,
    });
    expect(view.state).toBe('ready');
    if (view.state !== 'ready') return;
    expect(view.destinationRealm).toBe('Infernal');
    expect(view.inventory[0]?.item.id).toBe('worn_sword');
  });

  it('uses a safe per-stack price when rendering a listing', () => {
    expect(exchangePriceEach({ priceCopper: 101, count: 4 })).toBe(26);
    expect(exchangePriceEach({ priceCopper: 101, count: 0 })).toBe(101);
  });
});
