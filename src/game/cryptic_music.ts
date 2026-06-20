// Original Cryptic Realm soundtrack — real MP3 tracks (public/audio/cryptic/*),
// played per-zone with crossfades. This is the user's own CR music, distinct from
// the engine's procedural synth (which stays as the default/fallback). When CR
// music is enabled, the procedural director mutes and this drives playback.
//
// Zone → track mapping mirrors the procedural MusicZone set in music.ts.

import type { MusicZone } from './music';
import { setCrypticMusicActive } from './music';

const BASE = '/audio/cryptic';

// Each zone's signature track. Town themes, overworld biomes, dungeon moods, and
// a boss cue — drawn from the Cryptic Realm MP3 set.
const ZONE_TRACK: Record<MusicZone, string> = {
  town_eastbrook: 'welcome-home-cryptic-realm.mp3',
  town_fenbridge: 'town-hall-cryptic-realm.mp3',
  town_highwatch: 'the-journey-begins-cryptic-realm.mp3',
  vale: 'the-forest-calls-cryptic-realm.mp3',
  marsh: 'corrupted-temple-cryptic-realm.mp3',
  peaks: 'act-5-sanctum-cryptic-realm.mp3',
  dungeon_hollow_crypt: 'just-another-crypt-cryptic-realm.mp3',
  dungeon_sunken_bastion: 'catacomb-calls-cryptic-realm.mp3',
  dungeon_gravewyrm_sanctum: 'dungeon-time-cryptic-realm.mp3',
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

export class CrypticMusicPlayer {
  private a: HTMLAudioElement | null = null;
  private b: HTMLAudioElement | null = null;
  private active: HTMLAudioElement | null = null;
  private currentTrack = '';
  private _vol = 1;
  private _enabled = true;
  private fadeTimer: number | undefined;

  constructor() {
    try { this._enabled = localStorage.getItem(STORE_KEY) !== '0'; } catch { /* default on */ }
    setCrypticMusicActive(this._enabled);
  }

  get enabled(): boolean { return this._enabled; }
  setEnabled(on: boolean): void {
    this._enabled = on;
    setCrypticMusicActive(on);
    try { localStorage.setItem(STORE_KEY, on ? '1' : '0'); } catch { /* ignore */ }
    if (!on) this.stop();
  }

  setVolume(v: number): void {
    this._vol = Math.min(1, Math.max(0, v));
    if (this.active) this.active.volume = this._vol;
  }

  /** Human-readable now-playing title (track + zone), or null when idle. */
  nowPlaying(): string | null {
    if (!this.currentTrack || !this.active || this.active.paused) return null;
    return TRACK_TITLE[this.currentTrack] ?? this.currentTrack.replace(/-cryptic-realm\.mp3$/, '').replace(/-/g, ' ');
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
    const want = combat ? COMBAT_TRACK : (zone ? ZONE_TRACK[zone] : '');
    if (!want || want === this.currentTrack) return;
    this.crossfadeTo(want);
  }

  private crossfadeTo(src: string): void {
    const next = this.make(src);
    const prev = this.active;
    this.currentTrack = src;
    this.active = next;
    // Autoplay may be blocked until a user gesture; play() rejection is fine.
    void next.play().catch(() => { /* will start after first interaction */ });
    const start = performance.now();
    const DUR = 1400;
    if (this.fadeTimer) cancelAnimationFrame(this.fadeTimer);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      next.volume = this._vol * t;
      if (prev) prev.volume = this._vol * (1 - t);
      if (t < 1) { this.fadeTimer = requestAnimationFrame(step); }
      else if (prev) { prev.pause(); prev.src = ''; }
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
    for (const el of [this.a, this.b]) { if (el) { el.pause(); el.src = ''; } }
    this.a = this.b = this.active = null;
    this.currentTrack = '';
  }
}

export const crypticMusic = new CrypticMusicPlayer();
