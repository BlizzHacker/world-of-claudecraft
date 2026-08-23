// The /downloads surface's path decision, extracted whole so it is testable
// without a socket: given a raw request path and the downloads root, this says
// listing, one absolute file INSIDE the root, or refuse. IO-free and
// host-agnostic (no fs, no http), and the node:path slice it uses is injectable
// so tests/server/downloads_path.test.ts can pin posix AND win32 semantics on
// one machine. Traversal rules that only hold on the platform that happened to
// run the suite are not rules.
//
// The refusal is a REFUSAL, never a clamp. The retired guard rewrote a leading
// '../' away and served whatever name was left, so a request for one file
// quietly answered with a different one; here anything that does not land
// inside the root is a 404.

import * as nodePath from 'node:path';

/** The slice of node:path the resolver needs, so a test can pass posix or win32. */
export type PathImpl = Pick<typeof nodePath, 'isAbsolute' | 'relative' | 'resolve' | 'sep'>;

/** What a /downloads request resolves to: the index page, one file, or nothing. */
export type DownloadTarget =
  | { kind: 'listing' }
  | { kind: 'file'; file: string }
  | { kind: 'reject' };

const DOWNLOADS_PREFIX = /^\/downloads\/?/;
// A leading 'C:' style drive designator. On win32 isAbsolute already catches it;
// naming it explicitly makes a posix host refuse the same request instead of
// treating 'C:\Windows\win.ini' as one very odd filename inside the root.
const DRIVE_PREFIX = /^[a-zA-Z]:/;

/**
 * Separator-aware containment: is `candidate` strictly inside `root`?
 *
 * A bare `startsWith` is the classic hole here, because it admits the sibling
 * directory whose name merely EXTENDS the root ('/opt/cr-downloads' against
 * '/opt/cr-downloads-evil'). Comparing through `relative` closes it: the child
 * must be a non-empty relative path that neither climbs out nor is itself
 * absolute (a different win32 drive). The root itself is a directory, never a
 * download, so an empty result is false too.
 */
export function isInsideRoot(root: string, candidate: string, impl: PathImpl = nodePath): boolean {
  const rel = impl.relative(root, candidate);
  if (rel === '' || rel === '..') return false;
  return !rel.startsWith(`..${impl.sep}`) && !impl.isAbsolute(rel);
}

/**
 * Decode exactly ONE percent-encoding layer, the layer a real client applied.
 * Returns null for a malformed escape ('%zz', a trailing '%'), which is a
 * refusal rather than a filename: decodeURIComponent throws on those, and the
 * throw used to escape the request handler and leave the socket hanging with no
 * response ever written.
 */
function decodeOnce(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/**
 * Resolve a raw '/downloads...' request path against the downloads root.
 * `urlPath` is the query-stripped request target exactly as it arrived, still
 * percent-encoded: the caller must NOT pre-normalize it.
 */
export function resolveDownloadTarget(
  urlPath: string,
  root: string,
  impl: PathImpl = nodePath,
): DownloadTarget {
  const rel = decodeOnce(urlPath.replace(DOWNLOADS_PREFIX, ''));
  if (rel === null) return { kind: 'reject' };
  if (rel === '') return { kind: 'listing' };
  // A NUL truncates the path inside libc, so 'build.apk\0.txt' can read as one
  // name and open another. Never hand one to fs.
  if (rel.includes('\0')) return { kind: 'reject' };
  if (impl.isAbsolute(rel) || DRIVE_PREFIX.test(rel)) return { kind: 'reject' };
  const resolvedRoot = impl.resolve(root);
  const file = impl.resolve(resolvedRoot, rel);
  return isInsideRoot(resolvedRoot, file, impl) ? { kind: 'file', file } : { kind: 'reject' };
}
