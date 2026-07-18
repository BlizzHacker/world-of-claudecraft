// IWorldHomes: the Eastbrook Homes facet. Housing is a PREMIUM PAID feature
// (never a minigame): deeds are priced in $CR and buying requires the
// account's homeowner entitlement, which is set when the $CR payment clears
// on the exchange/custody side. The sim only checks the entitlement flag and
// records ownership; no chain interaction happens in the game layer.
// Layer-agnostic: no sim imports, no t(), no DOM (tests/architecture.test.ts).

export interface HomeLotView {
  id: string;
  name: string;
  /** Current owner's character name, '' while the plot is for sale. */
  owner: string;
  mine: boolean;
}

export interface HomesInfo {
  lots: HomeLotView[];
  /** This account holds the paid homeowner entitlement (may buy a deed). */
  entitled: boolean;
  /** My owned lot id, '' if none. */
  myLotId: string;
  /** Deed price shown on the boards, in $CR (display only). */
  priceCr: number;
}

export interface IWorldHomes {
  /** Presentation snapshot; null far from Homestead Lane with no owned lot. */
  homesInfo: HomesInfo | null;
  /** Buy the deed for a lot (requires the paid entitlement; one per character). */
  homeBuy(lotId: string): void;
}
