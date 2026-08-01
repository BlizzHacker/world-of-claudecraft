// Console generation, used to pick a graphics budget.
//
// An Xbox One X and a Series X send the SAME user agent, so the web layer alone
// cannot separate them. The packaged shell knows exactly which console it is on
// (Device Portal reports it as ConsoleType) and stamps it on the document
// element as data-console before any game script runs. Plain Edge on a console
// has no stamp, so it falls back to the cautious generation: too cautious costs
// fidelity, too generous costs a crash.

export type ConsoleGeneration = 'xbox-one' | 'xbox-series' | null;

/** Classify from the shell's stamp. Unknown or absent means the older tier. */
export function consoleGenerationFrom(stamp: string | null | undefined): ConsoleGeneration {
  if (!stamp) return null;
  const s = stamp.toLowerCase();
  if (s.includes('series')) return 'xbox-series';
  if (s.includes('xbox')) return 'xbox-one';
  return null;
}

/** Series X/S has the headroom for the normal desktop budget; Xbox One does
 *  not, and must run the constrained-memory path. */
export function consoleNeedsConstrainedMemory(gen: ConsoleGeneration, isXboxUa: boolean): boolean {
  if (gen === 'xbox-series') return false;
  if (gen === 'xbox-one') return true;
  // No stamp: any Xbox-identified browser gets the cautious budget.
  return isXboxUa;
}
