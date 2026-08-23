// The /downloads surface (server/main.ts serveDownloads): a newest-first HTML
// listing at /downloads, Range-aware file streaming at /downloads/<file>, and
// nothing else. CR_DOWNLOADS_DIR must be primed BEFORE importing server/main
// (the module reads it once at load), mirroring the static SFX suite's rig.

import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import * as http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const downloadsRoot = mkdtempSync(join(tmpdir(), 'woc-downloads-'));
// A file OUTSIDE the downloads dir that a traversal would reach.
const outsideRoot = mkdtempSync(join(tmpdir(), 'woc-downloads-outside-'));
writeFileSync(join(outsideRoot, 'secret.txt'), 'TOP SECRET');
// A SIBLING directory whose absolute path shares the downloads root as a string
// prefix (the classic '/opt/cr-downloads' vs '/opt/cr-downloads-evil' shape). A
// containment check written as a bare startsWith admits it; a separator-aware
// one does not.
const siblingRoot = `${downloadsRoot}-evil`;
mkdirSync(siblingRoot, { recursive: true });
writeFileSync(join(siblingRoot, 'secret.txt'), 'TOP SECRET');

const savedDatabaseUrl = process.env.DATABASE_URL;
const savedDownloadsDir = process.env.CR_DOWNLOADS_DIR;
process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:5433/wocc_downloads_test';
process.env.CR_DOWNLOADS_DIR = downloadsRoot;

let routeHttpRequest: typeof import('../../server/main').routeHttpRequest;

beforeAll(async () => {
  ({ routeHttpRequest } = await import('../../server/main'));
});

afterAll(() => {
  rmSync(downloadsRoot, { recursive: true, force: true });
  rmSync(outsideRoot, { recursive: true, force: true });
  rmSync(siblingRoot, { recursive: true, force: true });
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
  if (savedDownloadsDir === undefined) delete process.env.CR_DOWNLOADS_DIR;
  else process.env.CR_DOWNLOADS_DIR = savedDownloadsDir;
});

async function withServer<T>(run: (port: number) => Promise<T>): Promise<T> {
  const server = http.createServer((req, res) => routeHttpRequest(req, res));
  const port = await new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') reject(new Error('missing port'));
      else resolve(address.port);
    });
  });
  try {
    return await run(port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function request(
  url: string,
  options: { method?: 'GET' | 'HEAD'; headers?: Record<string, string> } = {},
): Promise<{ body: Buffer; headers: Headers; status: number }> {
  return withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}${url}`, {
      method: options.method ?? 'GET',
      headers: options.headers,
    });
    return {
      body: Buffer.from(await response.arrayBuffer()),
      headers: response.headers,
      status: response.status,
    };
  });
}

// Sends the request target BYTE FOR BYTE, which fetch cannot do: the WHATWG URL
// parser collapses dot segments before the socket write, and it treats '%2e' as
// a dot while doing it, so fetch('/downloads/%2e%2e/%2e%2e/etc/passwd') actually
// puts 'GET /etc/passwd' on the wire and never touches this route at all. An
// attacker is under no such constraint (curl --path-as-is, any raw client), so
// every traversal probe below goes out through this helper instead.
async function rawRequest(target: string): Promise<{ body: string; status: number }> {
  return withServer(
    (port) =>
      new Promise((resolve, reject) => {
        const req = http.request(
          { host: '127.0.0.1', port, path: target, method: 'GET' },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () =>
              resolve({
                body: Buffer.concat(chunks).toString('utf8'),
                status: res.statusCode ?? 0,
              }),
            );
          },
        );
        req.on('error', reject);
        req.end();
      }),
  );
}

describe('/downloads listing', () => {
  it('lists published builds newest-first with sizes, no upstream engine branding', async () => {
    const older = join(downloadsRoot, 'CrypticRealm-0.34.zip');
    const newer = join(downloadsRoot, 'CrypticRealm-0.35.apk');
    writeFileSync(older, Buffer.alloc(2048, 1));
    writeFileSync(newer, Buffer.alloc(4096, 2));
    const past = new Date('2026-01-01T00:00:00Z');
    utimesSync(older, past, past);
    // A dotfile and an empty file never list.
    writeFileSync(join(downloadsRoot, '.hidden'), 'x');
    writeFileSync(join(downloadsRoot, 'empty.zip'), '');

    const res = await request('/downloads');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = res.body.toString('utf8');
    expect(html).toContain('/downloads/CrypticRealm-0.35.apk');
    expect(html).toContain('/downloads/CrypticRealm-0.34.zip');
    expect(html.indexOf('CrypticRealm-0.35.apk')).toBeLessThan(
      html.indexOf('CrypticRealm-0.34.zip'),
    );
    expect(html).not.toContain('.hidden');
    expect(html).not.toContain('empty.zip');
    expect(html).not.toContain('Unreal');
  });

  it('serves the same listing at /downloads/ (trailing slash)', async () => {
    const res = await request('/downloads/');
    expect(res.status).toBe(200);
    expect(res.body.toString('utf8')).toContain('Client Downloads');
  });
});

describe('/downloads/<file> streaming', () => {
  it('serves a whole file as an attachment with the right MIME', async () => {
    const res = await request('/downloads/CrypticRealm-0.35.apk');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/vnd.android.package-archive');
    expect(res.headers.get('content-disposition')).toContain('CrypticRealm-0.35.apk');
    expect(res.headers.get('accept-ranges')).toBe('bytes');
    expect(res.body.length).toBe(4096);
  });

  it('answers HEAD with headers only', async () => {
    const res = await request('/downloads/CrypticRealm-0.35.apk', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-length')).toBe('4096');
    expect(res.body.length).toBe(0);
  });

  it('honours a byte Range with a 206 partial response', async () => {
    const res = await request('/downloads/CrypticRealm-0.35.apk', {
      headers: { Range: 'bytes=100-199' },
    });
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 100-199/4096');
    expect(res.headers.get('content-length')).toBe('100');
    expect(res.body.length).toBe(100);
  });

  it('rejects an unsatisfiable Range with 416', async () => {
    const res = await request('/downloads/CrypticRealm-0.35.apk', {
      headers: { Range: 'bytes=99999-' },
    });
    expect(res.status).toBe(416);
    expect(res.headers.get('content-range')).toBe('bytes */4096');
  });

  it('404s a traversal out of the downloads dir', async () => {
    const outsideName = outsideRoot.split(/[\\/]/).pop() ?? '';
    const siblingName = siblingRoot.split(/[\\/]/).pop() ?? '';
    for (const probe of [
      // The neighbouring temp dir, reached by name: raw, single-encoded, and
      // double-encoded separators.
      `/downloads/../${outsideName}/secret.txt`,
      `/downloads/..%2F${encodeURIComponent(outsideName)}%2Fsecret.txt`,
      `/downloads/%2e%2e%2f${encodeURIComponent(outsideName)}%2fsecret.txt`,
      `/downloads/%252e%252e%252f${encodeURIComponent(outsideName)}%252fsecret.txt`,
      `/downloads/..%5C${encodeURIComponent(outsideName)}%5Csecret.txt`,
      `/downloads/.%2e/${outsideName}/secret.txt`,
      // The SIBLING directory whose path is a string prefix match on the
      // downloads root: only a separator-aware containment test refuses it.
      `/downloads/../${siblingName}/secret.txt`,
      `/downloads/..%2F${encodeURIComponent(siblingName)}%2Fsecret.txt`,
      // Classic escapes with no file behind them.
      '/downloads/../../etc/passwd',
      '/downloads/..%2F..%2Fetc%2Fpasswd',
      '/downloads/%2e%2e/%2e%2e/etc/passwd',
      '/downloads/%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '/downloads/%252e%252e/%252e%252e/etc/passwd',
      '/downloads/..%5C..%5Cetc%5Cpasswd',
      '/downloads/....//....//etc/passwd',
      // Absolute paths, both forms.
      '/downloads//etc/passwd',
      '/downloads/%2Fetc%2Fpasswd',
      '/downloads/C%3A%5CWindows%5Cwin.ini',
      // A NUL truncation attempt and a malformed escape: both must answer, and
      // the malformed one must not throw out of the request handler.
      '/downloads/CrypticRealm-0.35.apk%00.txt',
      '/downloads/%2e%2e%2fsecret.txt%00',
      '/downloads/%zz',
    ]) {
      const res = await rawRequest(probe);
      expect(res.status, probe).toBe(404);
      expect(res.body, probe).not.toContain('TOP SECRET');
    }
  });

  it('still serves a legitimate build after the traversal guard', async () => {
    // The guard refuses, it does not clamp: an ordinary filename still streams.
    const res = await rawRequest('/downloads/CrypticRealm-0.35.apk');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(4096);
  });

  it('404s a missing file instead of falling back to the SPA shell', async () => {
    const res = await request('/downloads/NoSuchBuild.zip');
    expect(res.status).toBe(404);
  });
});

describe('/download (singular) is not this surface', () => {
  it('falls through to the static handler, never the downloads listing', async () => {
    const res = await request('/download');
    expect(res.body.toString('utf8')).not.toContain('Client Downloads');
    expect(res.headers.get('accept-ranges')).toBeNull();
  });
});
