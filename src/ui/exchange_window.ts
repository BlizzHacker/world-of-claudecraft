// Thin DOM painter for the cross-realm Exchange.
//
// Unlike the local World Market, Exchange custody is deliberately REST-backed:
// the server locks the source inventory and settles buyer/seller state in one
// database transaction. No client-side optimistic inventory mutation is made.

import { ITEMS } from '../sim/data';
import type { IWorld } from '../world_api';
import { readCrypticSession } from './cryptic/session';
import { itemDisplayName } from './entity_i18n';
import { esc } from './esc';
import {
  buildExchangeView,
  type ExchangeListingView,
  type ExchangeView,
  exchangePriceEach,
} from './exchange_view';
import { formatMoney, formatNumber, t } from './i18n';

interface AuthContext {
  token: string;
  characterId: number;
  base: string;
}

export interface ExchangeWindowDeps {
  root(): HTMLElement;
  world(): IWorld;
  closeOthers(): void;
  captureFocus(): HTMLElement | null;
  restoreFocus(target: HTMLElement | null): void;
  showError(text: string): void;
  auth(): AuthContext | null;
}

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error?: string };

function money(copper: number): string {
  return formatMoney(Math.max(0, copper));
}

function itemName(itemId: string): string {
  const item = ITEMS[itemId];
  return item ? itemDisplayName(item) : itemId;
}

export class ExchangeWindow {
  private opened = false;
  private listings: ExchangeListingView[] = [];
  private loading = false;
  private error = '';
  private lastRefreshAt = 0;
  private openerFocus: HTMLElement | null = null;

  constructor(private readonly deps: ExchangeWindowDeps) {}

  get isOpen(): boolean {
    return this.opened;
  }

  open(): void {
    this.deps.closeOthers();
    this.openerFocus = this.deps.captureFocus();
    this.opened = true;
    this.error = '';
    this.render();
    void this.refresh(true);
  }

  close(): void {
    if (!this.opened) return;
    this.opened = false;
    this.deps.root().style.display = 'none';
    this.deps.restoreFocus(this.openerFocus);
    this.openerFocus = null;
  }

  toggle(): void {
    if (this.opened) this.close();
    else this.open();
  }

  async refresh(force = false): Promise<void> {
    if (!this.opened) return;
    if (!force && (this.loading || Date.now() - this.lastRefreshAt < 1500)) return;
    const auth = this.deps.auth();
    if (!auth) {
      this.loading = false;
      this.render();
      return;
    }
    this.loading = true;
    this.render();
    try {
      const url = new URL('/api/exchange/listings', auth.base);
      url.searchParams.set('destinationRealm', this.deps.world().realm);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<
        ExchangeListingView[]
      >;
      if (!response.ok || !payload.ok || !Array.isArray(payload.data)) {
        throw new Error(
          payload.ok
            ? 'Exchange listings unavailable'
            : (payload.error ?? 'Exchange request failed'),
        );
      }
      this.listings = payload.data;
      this.error = '';
      this.lastRefreshAt = Date.now();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Exchange request failed';
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const auth = this.deps.auth();
    if (!auth) throw new Error('Sign in to use the Exchange');
    const response = await fetch(new URL(path, auth.base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ ...body, characterId: auth.characterId }),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiResponse<T>;
    if (!response.ok || !payload.ok)
      throw new Error(
        payload.ok ? 'Exchange request failed' : (payload.error ?? 'Exchange request failed'),
      );
    return payload.data;
  }

  private async settle(listingId: string): Promise<void> {
    await this.request(`/api/exchange/listings/${encodeURIComponent(listingId)}/settle`, {});
    await this.refresh();
  }

  private async cancel(listingId: string): Promise<void> {
    await this.request(`/api/exchange/listings/${encodeURIComponent(listingId)}/cancel`, {});
    await this.refresh();
  }

  private async createListing(itemId: string, count: number, priceCopper: number): Promise<void> {
    await this.request('/api/exchange/listings', {
      itemId,
      count,
      priceCopper,
      idempotencyKey: crypto.randomUUID(),
    });
    await this.refresh();
  }

  private view(): ExchangeView {
    const auth = this.deps.auth();
    if (!auth)
      return buildExchangeView({
        destinationRealm: this.deps.world().realm,
        copper: 0,
        listings: [],
        inventory: [],
        items: ITEMS,
        signedIn: false,
      });
    if (this.loading) return { state: 'loading' };
    if (this.error) return { state: 'error', message: this.error };
    return buildExchangeView({
      destinationRealm: this.deps.world().realm,
      copper: this.deps.world().copper,
      listings: this.listings,
      inventory: this.deps.world().inventory,
      items: ITEMS,
      signedIn: true,
    });
  }

  render(): void {
    if (!this.opened) return;
    const root = this.deps.root();
    const view = this.view();
    root.style.display = 'flex';
    root.innerHTML = `<div class="panel-title"><span>${esc(t('realm.exchangeNote'))}</span><button type="button" class="x-btn" data-close aria-label="${esc(t('itemUi.market.close'))}">×</button></div><div class="exchange-body"></div>`;
    root.querySelector('[data-close]')?.addEventListener('click', () => this.close());
    const body = root.querySelector<HTMLElement>('.exchange-body');
    if (!body) return;
    if (view.state === 'signed-out') {
      body.innerHTML = `<p class="empty-state">${esc(t('errors.api.notAuthenticated'))}</p>`;
      return;
    }
    if (view.state === 'loading') {
      body.innerHTML = `<p class="empty-state">${esc(t('loading.world'))}</p>`;
      return;
    }
    if (view.state === 'error') {
      body.innerHTML = `<p class="empty-state">${esc(view.message)}</p><button type="button" class="btn" data-refresh>${esc(t('itemUi.market.pageNext'))}</button>`;
      body.querySelector('[data-refresh]')?.addEventListener('click', () => void this.refresh());
      return;
    }
    const inventoryOptions = view.inventory
      .filter(({ item }) => !item.soulbound && !item.noMarketList)
      .map(
        ({ slot, item }) =>
          `<option value="${esc(slot.itemId)}">${esc(itemName(item.id))} ×${formatNumber(slot.count)}</option>`,
      )
      .join('');
    const listings = view.listings.length
      ? view.listings
          .map((listing) => {
            const own = listing.sellerCharacterId === this.deps.auth()?.characterId;
            const action = own
              ? `<button type="button" class="btn" data-cancel="${esc(listing.id)}">${esc(t('itemUi.market.reclaim'))}</button>`
              : `<button type="button" class="btn" data-buy="${esc(listing.id)}">${esc(t('itemUi.market.buy'))}</button>`;
            return `<article class="exchange-listing"><div><strong>${esc(itemName(listing.itemId))}</strong> <span>${esc(t('itemUi.market.stackCount', { count: formatNumber(listing.count) }))}</span><small>${esc(listing.sourceRealm)} → ${esc(view.destinationRealm)} · ${esc(t('itemUi.market.each', { money: money(exchangePriceEach(listing)) }))}</small></div>${action}</article>`;
          })
          .join('')
      : `<p class="empty-state">${esc(t('itemUi.market.emptyBrowse'))}</p>`;
    body.innerHTML = `<div class="exchange-summary"><span>${esc(t('itemUi.market.subtitle'))}</span><span>${esc(money(view.copper))}</span></div><section class="exchange-listings"><h3>${esc(t('itemUi.market.browse'))}</h3>${listings}</section><section class="exchange-create"><h3>${esc(t('itemUi.market.sell'))}</h3><form data-list><label>${esc(t('itemUi.market.quantity'))}<select name="item">${inventoryOptions}</select></label><label>${esc(t('itemUi.market.priceEach'))}<input name="price" type="number" min="1" step="1" required></label><label>${esc(t('itemUi.market.quantity'))}<input name="count" type="number" min="1" step="1" value="1" required></label><button type="submit" class="btn">${esc(t('itemUi.market.listButton'))}</button></form></section>`;
    body.querySelectorAll<HTMLElement>('[data-buy]').forEach((button) => {
      button.addEventListener(
        'click',
        () => void this.run(() => this.settle(button.dataset.buy ?? '')),
      );
    });
    body.querySelectorAll<HTMLElement>('[data-cancel]').forEach((button) => {
      button.addEventListener(
        'click',
        () => void this.run(() => this.cancel(button.dataset.cancel ?? '')),
      );
    });
    body.querySelector<HTMLFormElement>('[data-list]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const data = new FormData(form);
      const itemId = String(data.get('item') ?? '');
      const count = Number(data.get('count'));
      const priceEach = Number(data.get('price'));
      if (
        !itemId ||
        !Number.isSafeInteger(count) ||
        count <= 0 ||
        !Number.isSafeInteger(priceEach) ||
        priceEach <= 0
      ) {
        this.deps.showError(t('itemUi.market.minPriceError'));
        return;
      }
      void this.run(() => this.createListing(itemId, count, count * priceEach));
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (err) {
      this.deps.showError(err instanceof Error ? err.message : 'Exchange request failed');
    }
  }
}

export function exchangeAuthFromWorld(world: IWorld): AuthContext | null {
  const session = readCrypticSession();
  const rawCharacterId = (world as IWorld & { characterId?: number }).characterId;
  const id = typeof rawCharacterId === 'number' ? rawCharacterId : -1;
  if (!session || !Number.isSafeInteger(id) || id <= 0) return null;
  return { token: session.token, characterId: id, base: window.location.origin };
}
