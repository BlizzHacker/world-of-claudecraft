// Original Cryptic Realm soundtrack — real MP3 tracks (public/audio/cryptic/*),
// played per-zone with crossfades. This is the user's own CR music, distinct from
// the engine's procedural synth (which stays as the default/fallback). When CR
// music is enabled, the procedural director mutes and this drives playback.
//
// Zone → track mapping mirrors the procedural MusicZone set in music.ts.

import { assetHostUrl } from '../client_origin';
import type { MusicZone } from './music';
import { setCrypticMusicActive } from './music';

// assetHostUrl: identity on the website; the remote asset origin for bundles
// with no local public/ tree (Facebook Instant Games). Track loads there may be
// blocked by the container's media-src CSP; this module already fails soft when
// a track cannot load, which is the intended degradation.
const BASE = assetHostUrl('/audio/cryptic');

// Each zone's signature track. Town themes, overworld biomes, dungeon moods, and
// a boss cue — drawn from the Cryptic Realm MP3 set.
const ZONE_TRACK: Partial<Record<MusicZone, string>> = {
  town_eastbrook: 'welcome-home-cryptic-realm.mp3',
  town_fenbridge: 'town-hall-cryptic-realm.mp3',
  town_highwatch: 'the-journey-begins-cryptic-realm.mp3',
  vale: 'the-forest-calls-cryptic-realm.mp3',
  vale_legacy: 'the-forest-calls-cryptic-realm.mp3',
  marsh: 'corrupted-temple-cryptic-realm.mp3',
  peaks: 'act-5-sanctum-cryptic-realm.mp3',
  vale_cup: 'the-forest-calls-cryptic-realm.mp3',
  dungeon_hollow_crypt: 'just-another-crypt-cryptic-realm.mp3',
  dungeon_sunken_bastion: 'catacomb-calls-cryptic-realm.mp3',
  dungeon_gravewyrm_sanctum: 'dungeon-time-cryptic-realm.mp3',
  // Stand-ins so every zone scores from the CR set (same precedent as the
  // stand-ins in music_tracks.ts): moody overworlds take the temple/forest
  // cues, rifts take the dungeon cues. Replace as dedicated tracks land.
  dusk: 'corrupted-temple-cryptic-realm.mp3',
  ember: 'act-5-sanctum-cryptic-realm.mp3',
  frost: 'the-journey-begins-cryptic-realm.mp3',
  amber: 'the-forest-calls-cryptic-realm.mp3',
  fen: 'town-hall-cryptic-realm.mp3',
  night: 'corrupted-temple-cryptic-realm.mp3',
  haunt: 'just-another-crypt-cryptic-realm.mp3',
  jungle: 'the-forest-calls-cryptic-realm.mp3',
  garden: 'welcome-home-cryptic-realm.mp3',
  gale: 'the-journey-begins-cryptic-realm.mp3',
  farshore: 'act-2-welcome-cryptic-realm.mp3',
  rift_frost: 'catacomb-calls-cryptic-realm.mp3',
  rift_ember: 'dungeon-time-cryptic-realm.mp3',
  rift_venom: 'corrupted-temple-cryptic-realm.mp3',
  rift_bone: 'just-another-crypt-cryptic-realm.mp3',
  rift_brute: 'dungeon-time-cryptic-realm.mp3',
  rift_void: 'catacomb-calls-cryptic-realm.mp3',
  rift_storm: 'act-5-sanctum-cryptic-realm.mp3',
  rift_tide: 'act-2-welcome-cryptic-realm.mp3',
};
const COMBAT_TRACK = 'throne-of-ashes-boss-fight-activated-cryptic-realm.mp3';

// Friendly display names for the now-playing UI.
const TRACK_TITLE: Record<string, string> = {
  'welcome-home-cryptic-realm.mp3': 'Welcome Home',
  'town-hall-cryptic-realm.mp3': 'Town Hall',
  'the-journey-begins-cryptic-realm.mp3': 'The Journey Begins',
  'the-forest-calls-cryptic-realm.mp3': 'The Forest Calls',
  'corrupted-temple-cryptic-realm.mp3': 'Corrupted Temple',
  'act-5-sanctum-cryptic-realm.mp3': 'Sanctum (Act 5)',
  'just-another-crypt-cryptic-realm.mp3': 'Just Another Crypt',
  'catacomb-calls-cryptic-realm.mp3': 'Catacomb Calls',
  'dungeon-time-cryptic-realm.mp3': 'Dungeon Time',
  'throne-of-ashes-boss-fight-activated-cryptic-realm.mp3': 'Throne of Ashes (Boss)',
};

const STORE_KEY = 'cr_cryptic_music_on';

// The full soundtrack, in a stable order — used to populate the song picker and
// to drive shuffle. Derived from the zone map + combat cue so there's one source
// of track filenames.
export interface CrypticTrack {
  src: string;
  title: string;
}
export const CRYPTIC_TRACKS: CrypticTrack[] = (() => {
  const seen = new Set<string>();
  const list: CrypticTrack[] = [];
  for (const src of [...Object.values(ZONE_TRACK), COMBAT_TRACK]) {
    if (seen.has(src)) continue;
    seen.add(src);
    list.push({
      src,
      title: TRACK_TITLE[src] ?? src.replace(/-cryptic-realm\.mp3$/, '').replace(/-/g, ' '),
    });
  }
  return list;
})();

export class CrypticMusicPlayer {
  private a: HTMLAudioElement | null = null;
  private b: HTMLAudioElement | null = null;
  private active: HTMLAudioElement | null = null;
  private currentTrack = '';
  private _vol = 1;
  private _enabled = true;
  private fadeTimer: number | undefined;
  // Manual mode: when the user picks a song or turns on shuffle, zone-driven
  // update() stops stomping playback until they switch back to Auto.
  private _manual = false;
  private _shuffle = false;
  private onTrackChange: (() => void) | undefined;

  constructor() {
    try {
      this._enabled = localStorage.getItem(STORE_KEY) !== '0';
    } catch {
      /* default on */
    }
    setCrypticMusicActive(this._enabled);
  }

  get enabled(): boolean {
    return this._enabled;
  }
  setEnabled(on: boolean): void {
    this._enabled = on;
    setCrypticMusicActive(on);
    try {
      localStorage.setItem(STORE_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (!on) this.stop();
  }

  setVolume(v: number): void {
    this._vol = Math.min(1, Math.max(0, v));
    if (this.active) this.active.volume = this._vol;
  }

  /** Human-readable now-playing title (track + zone), or null when idle. */
  nowPlaying(): string | null {
    if (!this.currentTrack || !this.active || this.active.paused) return null;
    return (
      TRACK_TITLE[this.currentTrack] ??
      this.currentTrack.replace(/-cryptic-realm\.mp3$/, '').replace(/-/g, ' ')
    );
  }

  private make(src: string): HTMLAudioElement {
    const el = new Audio(`${BASE}/${src}`);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    return el;
  }

  /** Switch to the track for a zone (or the boss cue in combat), crossfading. */
  update(zone: MusicZone | null, combat: boolean): void {
    if (!this._enabled || typeof document === 'undefined') return;
    if (this._manual) return; // user picked a song / shuffle — don't stomp it
    const want = combat ? COMBAT_TRACK : zone ? ZONE_TRACK[zone] : '';
    if (!want || want === this.currentTrack) return;
    this.crossfadeTo(want);
  }

  // --- Manual player controls (Spotify/Pandora-style) ------------------------

  get manual(): boolean {
    return this._manual;
  }
  get shuffle(): boolean {
    return this._shuffle;
  }
  /** Currently playing track filename, or '' when idle. */
  get track(): string {
    return this.currentTrack;
  }

  /** Register a callback fired whenever the active track changes (UI refresh). */
  setOnTrackChange(cb: (() => void) | undefined): void {
    this.onTrackChange = cb;
  }

  /** Play a specific track now; enters manual mode (zone music won't override). */
  playTrack(src: string): void {
    if (!this._enabled) this.setEnabled(true);
    this._manual = true;
    if (src !== this.currentTrack) this.crossfadeTo(src);
    else void this.active?.play().catch(() => undefined);
  }

  /** Return to zone-driven (Auto) playback. */
  setAuto(): void {
    this._manual = false;
    this._shuffle = false;
    this.currentTrack = ''; // force the next update() to (re)pick the zone track
  }

  toggleShuffle(): boolean {
    this._shuffle = !this._shuffle;
    if (this._shuffle) {
      this._manual = true;
      this.playRandom();
    }
    return this._shuffle;
  }

  /** Skip to the next track (random in shuffle, else next in list order). */
  next(): void {
    this._manual = true;
    if (this._shuffle) {
      this.playRandom();
      return;
    }
    const i = CRYPTIC_TRACKS.findIndex((t) => t.src === this.currentTrack);
    const nx = CRYPTIC_TRACKS[(i + 1 + CRYPTIC_TRACKS.length) % CRYPTIC_TRACKS.length];
    if (nx) this.crossfadeTo(nx.src);
  }

  prev(): void {
    this._manual = true;
    const i = CRYPTIC_TRACKS.findIndex((t) => t.src === this.currentTrack);
    const pv = CRYPTIC_TRACKS[(i - 1 + CRYPTIC_TRACKS.length) % CRYPTIC_TRACKS.length];
    if (pv) this.crossfadeTo(pv.src);
  }

  private playRandom(): void {
    const pool = CRYPTIC_TRACKS.filter((t) => t.src !== this.currentTrack);
    const pick = (pool.length ? pool : CRYPTIC_TRACKS)[
      Math.floor(Math.random() * (pool.length || CRYPTIC_TRACKS.length))
    ];
    if (pick) this.crossfadeTo(pick.src);
  }

  private crossfadeTo(src: string): void {
    const next = this.make(src);
    const prev = this.active;
    this.currentTrack = src;
    this.active = next;
    // In shuffle, tracks should advance rather than loop forever on one song.
    if (this._shuffle) {
      next.loop = false;
      next.addEventListener(
        'ended',
        () => {
          if (this._shuffle && this.active === next) this.playRandom();
        },
        { once: true },
      );
    }
    try {
      this.onTrackChange?.();
    } catch {
      /* UI callback must not break playback */
    }
    // Autoplay may be blocked until a user gesture; play() rejection is fine.
    void next.play().catch(() => {
      /* will start after first interaction */
    });
    const start = performance.now();
    const DUR = 1400;
    if (this.fadeTimer) cancelAnimationFrame(this.fadeTimer);
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / DUR));
      // clamp: float drift on (1 - t) * vol can go a hair below 0, and the
      // HTMLMediaElement.volume setter throws IndexSizeError outside [0,1].
      next.volume = clamp01(this._vol * t);
      if (prev) prev.volume = clamp01(this._vol * (1 - t));
      if (t < 1) {
        this.fadeTimer = requestAnimationFrame(step);
      } else if (prev) {
        prev.pause();
        prev.src = '';
      }
    };
    this.fadeTimer = requestAnimationFrame(step);
    // Keep the double-buffer references tidy.
    this.b = prev;
    this.a = next;
  }

  /** Resume playback after the first user gesture (autoplay policy). */
  kick(): void {
    if (this._enabled && this.active && this.active.paused) {
      void this.active.play().catch(() => undefined);
    }
  }

  stop(): void {
    if (this.fadeTimer) cancelAnimationFrame(this.fadeTimer);
    for (const el of [this.a, this.b]) {
      if (el) {
        el.pause();
        el.src = '';
      }
    }
    this.a = this.b = this.active = null;
    this.currentTrack = '';
  }
}

export const crypticMusic = new CrypticMusicPlayer();
