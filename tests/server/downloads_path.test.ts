// The pure /downloads path decision (server/downloads_path.ts). The socket-level
// contract lives in downloads_route.test.ts; this pins the traversal rules
// themselves, under BOTH posix and win32 semantics, so a guard that only holds
// on the platform running the suite cannot pass. Production is Linux and
// contributors run Windows, and the two disagree on backslashes, drive letters,
// and case, which is exactly where a containment check goes wrong.

import { posix, win32 } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isInsideRoot, resolveDownloadTarget } from '../../server/downloads_path';

const POSIX_ROOT = '/opt/cr-downloads';
const WIN_ROOT = 'C:\\srv\\cr-downloads';

describe('isInsideRoot', () => {
  it('refuses the sibling directory that merely extends the root name', () => {
    // The whole reason this is not a startsWith.
    expect(`${POSIX_ROOT}-evil/secret.txt`.startsWith(POSIX_ROOT)).toBe(true);
    expect(isInsideRoot(POSIX_ROOT, `${POSIX_ROOT}-evil/secret.txt`, posix)).toBe(false);
    expect(isInsideRoot(WIN_ROOT, `${WIN_ROOT}-evil\\secret.txt`, win32)).toBe(false);
  });

  it('refuses the root itself and anything above it', () => {
    expect(isInsideRoot(POSIX_ROOT, POSIX_ROOT, posix)).toBe(false);
    expect(isInsideRoot(POSIX_ROOT, '/opt', posix)).toBe(false);
    expect(isInsideRoot(POSIX_ROOT, '/etc/passwd', posix)).toBe(false);
  });

  it('refuses a different win32 drive', () => {
    expect(isInsideRoot(WIN_ROOT, 'D:\\srv\\cr-downloads\\build.zip', win32)).toBe(false);
  });

  it('admits a real child, however deep', () => {
    expect(isInsideRoot(POSIX_ROOT, `${POSIX_ROOT}/build.zip`, posix)).toBe(true);
    expect(isInsideRoot(POSIX_ROOT, `${POSIX_ROOT}/nested/build.zip`, posix)).toBe(true);
    expect(isInsideRoot(WIN_ROOT, `${WIN_ROOT}\\build.zip`, win32)).toBe(true);
  });
});

describe('resolveDownloadTarget', () => {
  it('resolves the listing for the bare path and the trailing slash only', () => {
    expect(resolveDownloadTarget('/downloads', POSIX_ROOT, posix)).toEqual({ kind: 'listing' });
    expect(resolveDownloadTarget('/downloads/', POSIX_ROOT, posix)).toEqual({ kind: 'listing' });
    // '/downloads/.' names the directory, which is not a download.
    expect(resolveDownloadTarget('/downloads/.', POSIX_ROOT, posix)).toEqual({ kind: 'reject' });
  });

  it('resolves an ordinary build name to an absolute file inside the root', () => {
    expect(resolveDownloadTarget('/downloads/CrypticRealm-0.35.apk', POSIX_ROOT, posix)).toEqual({
      kind: 'file',
      file: `${POSIX_ROOT}/CrypticRealm-0.35.apk`,
    });
    // Percent-encoding is decoded exactly once, so a space in a build name works.
    expect(resolveDownloadTarget('/downloads/Cryptic%20Realm.zip', POSIX_ROOT, posix)).toEqual({
      kind: 'file',
      file: `${POSIX_ROOT}/Cryptic Realm.zip`,
    });
  });

  it.each([
    ['raw dot-dot', '/downloads/../../etc/passwd'],
    ['encoded slash', '/downloads/..%2F..%2Fetc%2Fpasswd'],
    ['encoded dots', '/downloads/%2e%2e/%2e%2e/etc/passwd'],
    ['fully encoded', '/downloads/%2e%2e%2f%2e%2e%2fetc%2fpasswd'],
    ['mixed dot forms', '/downloads/.%2e/.%2e/etc/passwd'],
    ['deep climb', '/downloads/a/b/../../../../../../etc/passwd'],
    ['absolute', '/downloads//etc/passwd'],
    ['encoded absolute', '/downloads/%2Fetc%2Fpasswd'],
    ['drive letter', '/downloads/C%3A%5CWindows%5Cwin.ini'],
    ['nul byte', '/downloads/CrypticRealm-0.35.apk%00.txt'],
    ['malformed escape', '/downloads/%zz'],
    ['lone percent', '/downloads/%'],
  ])('refuses a %s traversal on posix', (_name, probe) => {
    expect(resolveDownloadTarget(probe, POSIX_ROOT, posix)).toEqual({ kind: 'reject' });
  });

  it.each([
    ['raw dot-dot', '/downloads/../../Windows/win.ini'],
    ['backslash', '/downloads/..%5C..%5CWindows%5Cwin.ini'],
    ['encoded dots', '/downloads/%2e%2e/%2e%2e/Windows/win.ini'],
    ['non-leading backslash', '/downloads/build%5C..%5C..%5C..%5CWindows%5Cwin.ini'],
    ['other drive', '/downloads/D%3A%5Csecret.txt'],
    ['malformed escape', '/downloads/%zz'],
  ])('refuses a %s traversal on win32', (_name, probe) => {
    expect(resolveDownloadTarget(probe, WIN_ROOT, win32)).toEqual({ kind: 'reject' });
  });

  it('refuses the sibling root through a climb, on both platforms', () => {
    expect(
      resolveDownloadTarget('/downloads/../cr-downloads-evil/secret.txt', POSIX_ROOT, posix),
    ).toEqual({
      kind: 'reject',
    });
    expect(
      resolveDownloadTarget('/downloads/..%5Ccr-downloads-evil%5Csecret.txt', WIN_ROOT, win32),
    ).toEqual({ kind: 'reject' });
  });

  it('decodes ONE layer, so a double-encoded climb stays a literal name', () => {
    // '%252e%252e' is the encoding of the literal text '%2e%2e', not of '..':
    // decoding it twice would be the server inventing a traversal for the client.
    expect(resolveDownloadTarget('/downloads/%252e%252e/etc/passwd', POSIX_ROOT, posix)).toEqual({
      kind: 'file',
      file: `${POSIX_ROOT}/%2e%2e/etc/passwd`,
    });
  });

  it('treats a backslash name as one filename on posix, never a separator', () => {
    // Linux is production: '\' is an ordinary character there, so the request
    // stays inside the root and simply misses.
    expect(resolveDownloadTarget('/downloads/..%5C..%5Cetc%5Cpasswd', POSIX_ROOT, posix)).toEqual({
      kind: 'file',
      file: `${POSIX_ROOT}/..\\..\\etc\\passwd`,
    });
  });

  it('normalizes a relative or trailing-slash root before comparing', () => {
    expect(resolveDownloadTarget('/downloads/build.zip', '/opt/cr-downloads/', posix)).toEqual({
      kind: 'file',
      file: `${POSIX_ROOT}/build.zip`,
    });
  });
});
