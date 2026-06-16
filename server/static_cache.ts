// HTTP caching policy for the static file server. Vite content-hashes
// everything under /assets/, and the media build step content-hashes files
// under /media/, so those URLs never change content and can be cached forever.
// Everything else (legacy model/texture/HDR paths, HTML shells, loading art)
// keeps its URL across deploys, so clients must revalidate — a 304 costs one
// round-trip of headers instead of re-downloading the bytes.
import type { Stats } from 'node:fs';

const IMMUTABLE_PREFIXES = ['/assets/', '/media/'];

export function cacheControlFor(urlPath: string): string {
  return IMMUTABLE_PREFIXES.some((prefix) => urlPath.startsWith(prefix))
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
}

export function etagFor(st: Stats): string {
  return `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
}

type ConditionalHeaders = { 'if-none-match'?: string; 'if-modified-since'?: string };

export function isNotModified(headers: ConditionalHeaders, etag: string, mtime: Date): boolean {
  const ifNoneMatch = headers['if-none-match'];
  if (ifNoneMatch !== undefined) {
    return ifNoneMatch.split(',').some((candidate) => candidate.trim() === etag);
  }
  const ifModifiedSince = headers['if-modified-since'];
  if (ifModifiedSince !== undefined) {
    const since = Date.parse(ifModifiedSince);
    if (!Number.isFinite(since)) return false;
    // Last-Modified has whole-second resolution; compare on the same grid.
    return Math.floor(mtime.getTime() / 1000) * 1000 <= since;
  }
  return false;
}
