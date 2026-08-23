// Cryptic Realm soundtrack catalog: the operator's original CR tracks
// (public/audio/cryptic/*, owner-provided Suno exports) are the only shipped
// soundtrack, streamed per zone by the MusicDirector. The composition
// machinery in music.ts remains the authoring source for the music editor and
// the offline render pipeline (scripts/render_music.mjs), but its upstream
// renders no longer ship. Pure data + math, DOM-free, so it unit-tests in
// plain Node.

import type { MusicZone } from './music';

/** The CR track streamed for each zone cue. All thirty zones map thematically
 *  onto the twelve-track CR set, mirroring the zone-to-track choices of the CR
 *  player (src/game/cryptic_music.ts) so both playback paths score a zone the
 *  same way: towns take the settlement themes, bright overworlds the forest
 *  and journey cues, moody overworlds the temple and sanctum cues, dungeons
 *  and rifts the crypt crawls. */
export const ZONE_STREAM_URLS: Record<MusicZone, string> = {
  town_eastbrook: '/audio/cryptic/welcome-home-cryptic-realm.mp3',
  town_fenbridge: '/audio/cryptic/town-hall-cryptic-realm.mp3',
  town_highwatch: '/audio/cryptic/the-journey-begins-cryptic-realm.mp3',
  vale: '/audio/cryptic/the-forest-calls-cryptic-realm.mp3',
  vale_legacy: '/audio/cryptic/the-forest-calls-cryptic-realm.mp3',
  marsh: '/audio/cryptic/corrupted-temple-cryptic-realm.mp3',
  peaks: '/audio/cryptic/act-5-sanctum-cryptic-realm.mp3',
  dusk: '/audio/cryptic/corrupted-temple-cryptic-realm.mp3',
  ember: '/audio/cryptic/act-5-sanctum-cryptic-realm.mp3',
  frost: '/audio/cryptic/the-journey-begins-cryptic-realm.mp3',
  amber: '/audio/cryptic/the-forest-calls-cryptic-realm.mp3',
  fen: '/audio/cryptic/town-hall-cryptic-realm.mp3',
  night: '/audio/cryptic/corrupted-temple-cryptic-realm.mp3',
  haunt: '/audio/cryptic/just-another-crypt-cryptic-realm.mp3',
  jungle: '/audio/cryptic/the-forest-calls-cryptic-realm.mp3',
  garden: '/audio/cryptic/welcome-home-cryptic-realm.mp3',
  gale: '/audio/cryptic/the-journey-begins-cryptic-realm.mp3',
  farshore: '/audio/cryptic/act-2-welcome-cryptic-realm.mp3',
  // The dedicated Sowfield waiting/match mp3 pair was retired with the
  // upstream soundtrack, so the stadium scores from the vale forest cue on the
  // ordinary zone bus like everywhere else.
  vale_cup: '/audio/cryptic/the-forest-calls-cryptic-realm.mp3',
  dungeon_hollow_crypt: '/audio/cryptic/just-another-crypt-cryptic-realm.mp3',
  dungeon_sunken_bastion: '/audio/cryptic/catacomb-calls-cryptic-realm.mp3',
  dungeon_gravewyrm_sanctum: '/audio/cryptic/dungeon-time-cryptic-realm.mp3',
  rift_frost: '/audio/cryptic/catacomb-calls-cryptic-realm.mp3',
  rift_ember: '/audio/cryptic/dungeon-time-cryptic-realm.mp3',
  rift_venom: '/audio/cryptic/corrupted-temple-cryptic-realm.mp3',
  rift_bone: '/audio/cryptic/just-another-crypt-cryptic-realm.mp3',
  rift_brute: '/audio/cryptic/dungeon-time-cryptic-realm.mp3',
  rift_void: '/audio/cryptic/catacomb-calls-cryptic-realm.mp3',
  rift_storm: '/audio/cryptic/act-5-sanctum-cryptic-realm.mp3',
  rift_tide: '/audio/cryptic/act-2-welcome-cryptic-realm.mp3',
};

/** The battle themes: every fight opens on the CR boss track. */
export const COMBAT_STREAM_URLS: string[] = [
  '/audio/cryptic/throne-of-ashes-boss-fight-activated-cryptic-realm.mp3',
];

/** Pick which battle theme opens the next fight: uniform over the catalog.
 *  rand is injected (Math.random at the call site) so tests can drive it;
 *  the result is clamped so rand() returning exactly 1 stays in range. */
export function pickCombatTrackIndex(trackCount: number, rand: () => number): number {
  if (trackCount <= 0) return 0;
  const idx = Math.floor(rand() * trackCount);
  return Math.min(trackCount - 1, Math.max(0, idx));
}
