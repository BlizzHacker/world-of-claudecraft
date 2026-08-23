// Pure resolver for the music widget's external players: classifies a pasted
// share link into a provider and either an embeddable iframe URL or a plain
// link to open in a new tab (providers that refuse framing). DOM-free so it
// unit-tests in plain Node (tests/music_ext_providers.test.ts), and the embed
// origins are mirrored by the desktop shell's CSP frame-src allow-list
// (electron/shell_guards.cjs, CSP_ORIGINS.musicFrames, pinned by
// tests/electron_shell_guards.test.ts).

export interface MusicExtProvider {
  /** Canonical provider host the link was recognized as (www. stripped). */
  host: string;
  /** embed: render url in an iframe; link: open url in a new tab instead. */
  kind: 'embed' | 'link';
  /** The URL to embed or open, rebuilt from parsed components. */
  url: string;
}

/** Every iframe origin an embed result can resolve to. The desktop shell's
 *  CSP frame-src list allows exactly these four, so adding a provider here
 *  means extending CSP_ORIGINS.musicFrames in the same change. */
export const MUSIC_EMBED_ORIGINS: readonly string[] = [
  'https://open.spotify.com',
  'https://www.youtube.com',
  'https://embed.music.apple.com',
  'https://w.soundcloud.com',
];

/** Resolve a pasted share link to a provider, or null when unrecognized. */
export function resolveMusicExtProvider(raw: string): MusicExtProvider | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\./, '');
  // Spotify: open.spotify.com/<type>/<id> -> open.spotify.com/embed/<type>/<id>
  if (host === 'open.spotify.com') {
    return { host, kind: 'embed', url: `https://open.spotify.com/embed${u.pathname}` };
  }
  // YouTube: watch?v=ID or playlist?list=ID -> youtube.com/embed
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const v = u.searchParams.get('v');
    if (v) {
      return {
        host: 'youtube.com',
        kind: 'embed',
        url: `https://www.youtube.com/embed/${encodeURIComponent(v)}`,
      };
    }
    const list = u.searchParams.get('list');
    if (u.pathname.startsWith('/playlist') && list) {
      return {
        host: 'youtube.com',
        kind: 'embed',
        url: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}`,
      };
    }
    return null;
  }
  // Short share links: youtu.be/ID
  if (host === 'youtu.be') {
    return {
      host: 'youtube.com',
      kind: 'embed',
      url: `https://www.youtube.com/embed${u.pathname}`,
    };
  }
  // Apple Music: music.apple.com/... -> embed.music.apple.com/...
  if (host === 'music.apple.com') {
    return {
      host,
      kind: 'embed',
      url: `https://embed.music.apple.com${u.pathname}${u.search}`,
    };
  }
  // SoundCloud plays through its player widget.
  if (host === 'soundcloud.com') {
    return {
      host,
      kind: 'embed',
      url: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.href)}`,
    };
  }
  // Pandora and Plex refuse framing: hand back a link to open in a new tab.
  if (host === 'pandora.com' || host.endsWith('.pandora.com')) {
    return { host: 'pandora.com', kind: 'link', url: u.href };
  }
  if (host === 'plex.tv' || host.endsWith('.plex.tv')) {
    return { host: 'plex.tv', kind: 'link', url: u.href };
  }
  return null;
}
