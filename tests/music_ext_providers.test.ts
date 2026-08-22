import { describe, expect, it } from 'vitest';
import {
  MUSIC_EMBED_ORIGINS,
  resolveMusicExtProvider,
} from '../src/ui/cryptic/music_ext_providers';

describe('resolveMusicExtProvider', () => {
  it('turns a Spotify share link into its embed URL', () => {
    const r = resolveMusicExtProvider('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    expect(r).toEqual({
      host: 'open.spotify.com',
      kind: 'embed',
      url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
    });
  });

  it('turns YouTube watch, playlist, and short links into embed URLs', () => {
    expect(resolveMusicExtProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      host: 'youtube.com',
      kind: 'embed',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
    expect(resolveMusicExtProvider('https://m.youtube.com/watch?v=abc123')).toEqual({
      host: 'youtube.com',
      kind: 'embed',
      url: 'https://www.youtube.com/embed/abc123',
    });
    expect(resolveMusicExtProvider('https://www.youtube.com/playlist?list=PL123')).toEqual({
      host: 'youtube.com',
      kind: 'embed',
      url: 'https://www.youtube.com/embed/videoseries?list=PL123',
    });
    expect(resolveMusicExtProvider('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      host: 'youtube.com',
      kind: 'embed',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
  });

  it('rejects a YouTube link with neither a video nor a playlist id', () => {
    expect(resolveMusicExtProvider('https://www.youtube.com/feed/history')).toBeNull();
    expect(resolveMusicExtProvider('https://www.youtube.com/playlist')).toBeNull();
  });

  it('turns an Apple Music link into its embed host, keeping path and query', () => {
    const r = resolveMusicExtProvider('https://music.apple.com/us/album/x/123?i=456');
    expect(r).toEqual({
      host: 'music.apple.com',
      kind: 'embed',
      url: 'https://embed.music.apple.com/us/album/x/123?i=456',
    });
  });

  it('wraps a SoundCloud link in the player widget with the URL encoded', () => {
    const r = resolveMusicExtProvider('https://soundcloud.com/artist/track');
    expect(r?.host).toBe('soundcloud.com');
    expect(r?.kind).toBe('embed');
    expect(r?.url).toBe(
      `https://w.soundcloud.com/player/?url=${encodeURIComponent('https://soundcloud.com/artist/track')}`,
    );
  });

  it('classifies Pandora and Plex as link providers (they refuse framing)', () => {
    expect(resolveMusicExtProvider('https://www.pandora.com/station/play/123')).toEqual({
      host: 'pandora.com',
      kind: 'link',
      url: 'https://www.pandora.com/station/play/123',
    });
    expect(resolveMusicExtProvider('https://app.plex.tv/desktop/#!/music')).toEqual({
      host: 'plex.tv',
      kind: 'link',
      url: 'https://app.plex.tv/desktop/#!/music',
    });
    expect(resolveMusicExtProvider('https://listen.plex.tv/x')?.kind).toBe('link');
  });

  it('rejects unknown hosts, non-http schemes, blanks, and non-URLs', () => {
    expect(resolveMusicExtProvider('https://evil.example.com/watch?v=x')).toBeNull();
    expect(resolveMusicExtProvider('javascript:alert(1)')).toBeNull();
    expect(resolveMusicExtProvider('file:///etc/passwd')).toBeNull();
    expect(resolveMusicExtProvider('')).toBeNull();
    expect(resolveMusicExtProvider('   ')).toBeNull();
    expect(resolveMusicExtProvider('not a url')).toBeNull();
    // A lookalike host must not pass the suffix checks.
    expect(resolveMusicExtProvider('https://notpandora.com/x')).toBeNull();
    expect(resolveMusicExtProvider('https://evilplex.tv/x')).toBeNull();
  });

  it('keeps every embed result inside the CSP frame-src origin set', () => {
    const embeds = [
      'https://open.spotify.com/track/1',
      'https://www.youtube.com/watch?v=abc',
      'https://youtu.be/abc',
      'https://music.apple.com/us/album/x/1',
      'https://soundcloud.com/a/b',
    ];
    for (const link of embeds) {
      const r = resolveMusicExtProvider(link);
      expect(r?.kind, link).toBe('embed');
      const origin = new URL(r?.url ?? '').origin;
      expect(MUSIC_EMBED_ORIGINS, link).toContain(origin);
    }
  });
});
