/**
 * The two hosts of THE character-creation class grid.
 *
 * The online creator (`#charcreate-panel`) and the offline creator
 * (`#offline-select`) show the same thing: the active realm's roster of
 * playable characters. Only the element ids around the grid differ. They used
 * to differ in code too - `paintRealmClassChoices` was hardwired to the online
 * panel - which is how the offline creator came to show the nine stock engine
 * classes (Warrior ... Druid) on a realm whose online creator showed its
 * authored hero roster.
 *
 * Every id the painter needs lives here, so "one code path, two hosts" is a
 * table lookup rather than a second copy of the painter that drifts away again.
 * Pure data + pure predicates: no DOM, so the contract is testable.
 */

export type CharGridHost = '#charcreate-panel' | '#offline-select';

export interface CharGridHostSelectors {
  /** The panel element that carries the `infernal-roster-active` state class. */
  readonly panel: CharGridHost;
  /** The row the class/hero cards are painted into. */
  readonly row: string;
  /** Every class/hero card in this host. */
  readonly cards: string;
  /** The selected card in this host. */
  readonly selectedCard: string;
  /** Element id of the class-details panel this host drives. */
  readonly detailsId: string;
  /** Element id of the faction-tab strip (created on demand above the row). */
  readonly factionFilterId: string;
  /** The 3D turntable container this host previews into. */
  readonly previewContainer: string;
}

const HOSTS: Record<CharGridHost, CharGridHostSelectors> = {
  '#charcreate-panel': {
    panel: '#charcreate-panel',
    row: '#charcreate-panel .mini-class-row',
    cards: '#charcreate-panel .mini-class',
    selectedCard: '#charcreate-panel .mini-class.sel',
    detailsId: 'charcreate-class-details',
    factionFilterId: 'charcreate-faction-filter',
    previewContainer: '#charcreate-preview-container',
  },
  '#offline-select': {
    panel: '#offline-select',
    row: '#offline-select .mini-class-row',
    cards: '#offline-select .mini-class',
    selectedCard: '#offline-select .mini-class.sel',
    detailsId: 'offline-class-details',
    factionFilterId: 'offline-faction-filter',
    previewContainer: '#offline-preview-container',
  },
};

/** The ids the class-grid painter uses for one host. */
export function charGridHost(panel: CharGridHost): CharGridHostSelectors {
  return HOSTS[panel];
}

/** Every host, in a stable order (tests and sweeps that must cover both). */
export const CHAR_GRID_HOSTS: readonly CharGridHost[] = ['#charcreate-panel', '#offline-select'];

/**
 * Whether a realm replaces the nine engine-class buttons with an authored hero
 * roster. Infernal is the only one today; the predicate exists so both hosts
 * ask the SAME question instead of each testing `realm.id === 'infernal'` in
 * its own copy of the paint.
 */
export function usesRealmHeroRoster(realmId: string): boolean {
  return realmId === 'infernal';
}

/**
 * The realm hero identity a picked card carries into the world, or null for a
 * plain engine-class card.
 *
 * Online the creator posts this as `createCharacter(..., heroId)` and the
 * server stamps it onto the character; offline there is no server, so the same
 * value has to be threaded into the Sim (`SimConfig.realmHeroId` ->
 * `entity.realmHeroId`) or picking "Blood Knight" would silently spawn a
 * generic paladin wearing the class body.
 */
export function pickedRealmHeroId(dataset: { heroId?: string } | null | undefined): string | null {
  const id = dataset?.heroId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}
