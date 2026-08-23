// @vitest-environment jsdom
//
// The DOM half of the waypoint travel menu fix. The pure ordering/grouping/
// selection contract is pinned in waypoint_map_view.test.ts; this suite pins
// what the operator actually reported: the panel must own a bounded scroll
// region instead of running off the bottom of the viewport, and the locked
// destinations must be folded behind a counted disclosure instead of burying
// the handful the player can travel to.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closeWaypointMenu,
  openWaypointMenu,
  type WaypointMenuDeps,
} from '../src/ui/waypoint_map_window';

const SMALL = [
  { id: 'wp_zone1', name: 'Eastbrook Vale', known: true },
  { id: 'wp_zone1_wild', name: 'Eastbrook Vale Trail', known: false },
  { id: 'wp_zone2', name: 'Duskmoor', known: false },
  { id: 'wp_zone3', name: 'Mirefen', known: true },
];

// Long enough to cross FILTER_MIN_DESTINATIONS, which is where the search box
// earns its place (the live overworld is far longer still).
const LONG = [
  ...SMALL,
  { id: 'wp_zone3_wild', name: 'Mirefen Trail', known: false },
  { id: 'wp_zone4', name: 'Drakelands', known: false },
  { id: 'wp_zone4_wild', name: 'Drakelands Trail', known: false },
  { id: 'wp_zone5', name: 'Frostveil', known: false },
  { id: 'wp_zone5_wild', name: 'Frostveil Trail', known: false },
  { id: 'wp_zone6', name: 'Amberfall', known: false },
];

let stack: HTMLElement;
let travel: ReturnType<typeof vi.fn<(waypointId: string) => void>>;

function deps(): WaypointMenuDeps {
  return { stack, travel };
}

function menu(): HTMLElement {
  const el = document.getElementById('waypoint-menu');
  if (!el) throw new Error('waypoint menu is not open');
  return el;
}

function destButtons(scope: ParentNode): HTMLButtonElement[] {
  return [...scope.querySelectorAll<HTMLButtonElement>('.waypoint-dest')];
}

beforeEach(() => {
  document.body.innerHTML = '';
  stack = document.createElement('div');
  stack.id = 'prompt-stack';
  document.body.append(stack);
  travel = vi.fn<(waypointId: string) => void>();
});

afterEach(() => {
  closeWaypointMenu();
  vi.useRealTimers();
});

describe('waypoint_map_window chrome', () => {
  it('opens one dialog-rooted panel with a scroll region of its own', () => {
    openWaypointMenu(SMALL, deps());
    const el = menu();
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('aria-labelledby')).toBe('waypoint-menu-title');
    expect(document.getElementById('waypoint-menu-title')?.textContent?.length).toBeGreaterThan(0);
    // The bounded, scrolling region is the fix for the overflow: the rows live
    // inside it, not directly in the panel that the prompt stack anchors.
    const scroll = el.querySelector('.waypoint-menu-scroll');
    expect(scroll).not.toBeNull();
    expect(destButtons(el).every((b) => scroll?.contains(b))).toBe(true);
  });

  it('replaces a live menu instead of stacking a second panel', () => {
    openWaypointMenu(SMALL, deps());
    openWaypointMenu(SMALL, deps());
    expect(document.querySelectorAll('#waypoint-menu')).toHaveLength(1);
  });

  it('paints no search box for a short list, and one for a long list', () => {
    openWaypointMenu(SMALL, deps());
    expect(menu().querySelector('.waypoint-menu-filter')).toBeNull();
    openWaypointMenu(LONG, deps());
    const filter = menu().querySelector<HTMLInputElement>('.waypoint-menu-filter');
    expect(filter).not.toBeNull();
    // Never the element focus lands on at open, so a phone keyboard does not
    // cover the list the player came here to read.
    expect(filter?.hasAttribute('data-skip-open-focus')).toBe(true);
  });
});

describe('waypoint_map_window grouping', () => {
  it('shows the travelable destinations and folds the locked ones behind a toggle', () => {
    openWaypointMenu(SMALL, deps());
    const el = menu();
    const toggle = el.querySelector<HTMLButtonElement>('.waypoint-menu-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.textContent).toContain('2');
    const locked = el.querySelector<HTMLElement>('#waypoint-menu-locked');
    expect(locked?.hidden).toBe(true);
    // The two travelable rows are the only ones on screen, and neither is grey.
    const shown = destButtons(el).filter((b) => !locked?.contains(b));
    expect(shown.map((b) => b.textContent)).toEqual(['Eastbrook Vale', 'Mirefen']);
    expect(shown.every((b) => !b.disabled)).toBe(true);
  });

  it('reveals the locked destinations when the disclosure is opened', () => {
    openWaypointMenu(SMALL, deps());
    menu().querySelector<HTMLButtonElement>('.waypoint-menu-toggle')?.click();
    const el = menu();
    expect(
      el.querySelector<HTMLButtonElement>('.waypoint-menu-toggle')?.getAttribute('aria-expanded'),
    ).toBe('true');
    const locked = el.querySelector<HTMLElement>('#waypoint-menu-locked');
    expect(locked?.hidden).toBe(false);
    const lockedRows = destButtons(locked as ParentNode);
    expect(lockedRows.map((b) => b.textContent)).toEqual(['Eastbrook Vale Trail', 'Duskmoor']);
    expect(lockedRows.every((b) => b.disabled)).toBe(true);
    // The state a locked row cannot show visually still reaches assistive tech.
    expect(lockedRows[0].getAttribute('aria-label')).toContain('undiscovered');
  });

  it('narrows to a typed name and opens the locked fold so a match is never hidden', () => {
    openWaypointMenu(LONG, deps());
    const filter = menu().querySelector<HTMLInputElement>('.waypoint-menu-filter');
    if (!filter) throw new Error('expected a filter for the long list');
    filter.value = 'drakelands';
    filter.dispatchEvent(new Event('input'));
    const el = menu();
    expect(
      el.querySelector<HTMLButtonElement>('.waypoint-menu-toggle')?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(destButtons(el).map((b) => b.textContent)).toEqual(['Drakelands', 'Drakelands Trail']);
  });

  it('says so instead of going blank when nothing matches', () => {
    openWaypointMenu(LONG, deps());
    const filter = menu().querySelector<HTMLInputElement>('.waypoint-menu-filter');
    if (!filter) throw new Error('expected a filter for the long list');
    filter.value = 'nowhere at all';
    filter.dispatchEvent(new Event('input'));
    const el = menu();
    expect(destButtons(el)).toHaveLength(0);
    expect(el.querySelector('.waypoint-menu-empty')?.textContent?.length).toBeGreaterThan(0);
  });
});

describe('waypoint_map_window travel', () => {
  it('travels to the clicked destination and closes, even after a filter reorder', () => {
    openWaypointMenu(LONG, deps());
    const filter = menu().querySelector<HTMLInputElement>('.waypoint-menu-filter');
    if (!filter) throw new Error('expected a filter for the long list');
    filter.value = 'mirefen';
    filter.dispatchEvent(new Event('input'));
    const first = destButtons(menu()).find((b) => !b.disabled);
    first?.click();
    expect(travel).toHaveBeenCalledWith('wp_zone3');
    expect(document.getElementById('waypoint-menu')).toBeNull();
  });

  it('never fires travel for a locked destination', () => {
    openWaypointMenu(SMALL, deps());
    menu().querySelector<HTMLButtonElement>('.waypoint-menu-toggle')?.click();
    const locked = menu().querySelector<HTMLElement>('#waypoint-menu-locked');
    for (const btn of destButtons(locked as ParentNode)) btn.click();
    expect(travel).not.toHaveBeenCalled();
    expect(document.getElementById('waypoint-menu')).not.toBeNull();
  });

  it('closes on Escape and on the close button', () => {
    openWaypointMenu(SMALL, deps());
    menu().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('waypoint-menu')).toBeNull();
    openWaypointMenu(SMALL, deps());
    menu().querySelector<HTMLButtonElement>('[data-close]')?.click();
    expect(document.getElementById('waypoint-menu')).toBeNull();
  });

  it('auto-dismisses the panel it opened, and only that one', () => {
    vi.useFakeTimers();
    openWaypointMenu(SMALL, deps());
    // A second open supersedes the first; the first panel's pending dismissal
    // must not tear the replacement down with it.
    openWaypointMenu(SMALL, deps());
    vi.advanceTimersByTime(29000);
    expect(document.getElementById('waypoint-menu')).not.toBeNull();
    vi.advanceTimersByTime(2000);
    expect(document.getElementById('waypoint-menu')).toBeNull();
  });

  it('cancels the auto-dismiss once the player engages with the panel', () => {
    vi.useFakeTimers();
    openWaypointMenu(LONG, deps());
    const filter = menu().querySelector<HTMLInputElement>('.waypoint-menu-filter');
    if (!filter) throw new Error('expected a filter for the long list');
    filter.value = 'frost';
    filter.dispatchEvent(new Event('input'));
    // The countdown must never yank the list away while the player is searching.
    vi.advanceTimersByTime(60000);
    expect(document.getElementById('waypoint-menu')).not.toBeNull();
  });
});
