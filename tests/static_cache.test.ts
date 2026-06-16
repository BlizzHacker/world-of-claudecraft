import { describe, expect, it } from 'vitest';
import { cacheControlFor, etagFor, isNotModified } from '../server/static_cache';

const stats = (size: number, mtimeMs: number) =>
  ({ size, mtimeMs, mtime: new Date(mtimeMs) }) as unknown as import('node:fs').Stats;

describe('cacheControlFor', () => {
  it('marks vite content-hashed bundles as immutable for a year', () => {
    expect(cacheControlFor('/assets/main-FDVzfzpz.js')).toBe('public, max-age=31536000, immutable');
    expect(cacheControlFor('/assets/admin-BH042pF_.js')).toBe('public, max-age=31536000, immutable');
  });

  it('marks generated content-hashed media as immutable for a year', () => {
    expect(cacheControlFor('/media/models/chars/knight.8f31c2aa91bd.glb')).toBe('public, max-age=31536000, immutable');
    expect(cacheControlFor('/media/env/vale_day_1k.3bd7220a9f01.hdr')).toBe('public, max-age=31536000, immutable');
  });

  it('requires revalidation for unhashed assets and html shells', () => {
    expect(cacheControlFor('/models/kaykit/knight.glb')).toBe('no-cache');
    expect(cacheControlFor('/textures/atlas.png')).toBe('no-cache');
    expect(cacheControlFor('/index.html')).toBe('no-cache');
    expect(cacheControlFor('/loading-screen.jpg')).toBe('no-cache');
  });

  it('does not treat nested or partial matches as the hashed assets dir', () => {
    expect(cacheControlFor('/models/assets/thing.glb')).toBe('no-cache');
    expect(cacheControlFor('/assetsx/file.js')).toBe('no-cache');
    expect(cacheControlFor('/mediax/file.glb')).toBe('no-cache');
  });
});

describe('etagFor', () => {
  it('is stable for identical stats', () => {
    expect(etagFor(stats(1234, 1700000000000))).toBe(etagFor(stats(1234, 1700000000000)));
  });

  it('changes when size or mtime changes', () => {
    const base = etagFor(stats(1234, 1700000000000));
    expect(etagFor(stats(1235, 1700000000000))).not.toBe(base);
    expect(etagFor(stats(1234, 1700000001000))).not.toBe(base);
  });

  it('produces a weak validator', () => {
    expect(etagFor(stats(1, 1))).toMatch(/^W\/".+"$/);
  });
});

describe('isNotModified', () => {
  const st = stats(1234, 1700000000000);
  const etag = etagFor(st);

  it('returns true when if-none-match contains the current etag', () => {
    expect(isNotModified({ 'if-none-match': etag }, etag, st.mtime)).toBe(true);
    expect(isNotModified({ 'if-none-match': `W/"other", ${etag}` }, etag, st.mtime)).toBe(true);
  });

  it('returns false when if-none-match does not match', () => {
    expect(isNotModified({ 'if-none-match': 'W/"stale"' }, etag, st.mtime)).toBe(false);
  });

  it('prefers if-none-match over if-modified-since', () => {
    const future = new Date(st.mtime.getTime() + 60_000).toUTCString();
    expect(isNotModified({ 'if-none-match': 'W/"stale"', 'if-modified-since': future }, etag, st.mtime)).toBe(false);
  });

  it('falls back to if-modified-since with whole-second resolution', () => {
    const same = st.mtime.toUTCString();
    const past = new Date(st.mtime.getTime() - 60_000).toUTCString();
    expect(isNotModified({ 'if-modified-since': same }, etag, st.mtime)).toBe(true);
    expect(isNotModified({ 'if-modified-since': past }, etag, st.mtime)).toBe(false);
  });

  it('returns false with no conditional headers or malformed dates', () => {
    expect(isNotModified({}, etag, st.mtime)).toBe(false);
    expect(isNotModified({ 'if-modified-since': 'not a date' }, etag, st.mtime)).toBe(false);
  });
});
