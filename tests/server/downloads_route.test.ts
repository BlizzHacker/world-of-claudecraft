// The /downloads surface (server/main.ts serveDownloads): a newest-first HTML
// listing at /downloads, Range-aware file streaming at /downloads/<file>, and
// nothing else. CR_DOWNLOADS_DIR must be primed BEFORE importing server/main
// (the module reads it once at load), mirroring the static SFX suite's rig.

import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import * as http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const downloadsRoot = mkdtempSync(join(tmpdir(), 'woc-downloads-'));
// A file OUTSIDE the downloads dir that a traversal would reach.
const outsideRoot = mkdtempSync(join(tmpdir(), 'woc-downloads-outside-'));
writeFileSync(join(outsideRoot, 'secret.txt'), 'TOP SECRET');

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
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
  if (savedDownloadsDir === undefined) delete process.env.CR_DOWNLOADS_DIR;
  else process.env.CR_DOWNLOADS_DIR = savedDownloadsDir;
});

async function request(
  url: string,
  options: { method?: 'GET' | 'HEAD'; headers?: Record<string, string> } = {},
): Promise<{ body: Buffer; headers: Headers; status: number }> {
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
    const response = await fetch(`http://127.0.0.1:${port}${url}`, {
      method: options.method ?? 'GET',
      headers: options.headers,
    });
    return {
      body: Buffer.from(await response.arrayBuffer()),
      headers: response.headers,
      status: response.status,
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
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
    const secretRel = `..%2F${encodeURIComponent(outsideRoot.split(/[\\/]/).pop() ?? '')}%2Fsecret.txt`;
    for (const probe of [
      `/downloads/${secretRel}`,
      '/downloads/..%2F..%2Fetc%2Fpasswd',
      '/downloads/%2e%2e/%2e%2e/etc/passwd',
    ]) {
      const res = await request(probe);
      expect(res.status, probe).toBe(404);
      expect(res.body.toString('utf8')).not.toContain('TOP SECRET');
    }
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
