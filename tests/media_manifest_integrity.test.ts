// The shipped client never asks for public/<logical>. assetUrl() (src/render/assets/media.ts)
// returns MEDIA_ASSETS[logical] and vite bakes those hashed strings straight into the JS, so
// the COMMITTED manifest — not the build — decides which filenames the browser requests.
//
// The hashed files themselves are never committed. `build_media_manifest.mjs emit` copies
// public/<logical> to dist/media/<name>.<hash><ext> during the build, recomputing the hash from
// the very bytes it is copying, so emit cannot disagree with disk. Only the committed manifest
// can. When it does, the bundle asks for a filename emit never wrote and every asset behind
// that entry 404s: assetUrl() falls back to the plain path only for a logical that is ABSENT
// from the manifest, never for one that is present and wrong.
//
// Commit 3505f1348a is the worked example. It committed 444 stripped scale channels into
// public/models/chars/players/knight.glb without re-running `generate`, so HEAD named
// knight.063f81b53c35.glb while the bytes hashed to f0e7f6dc57e1 — and knight.glb is the shared
// rig reference, so it is a 404 no world can boot past.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GENERATED_PATH,
  manifestEntries,
  renderManifest,
} from '../scripts/build_media_manifest.mjs';

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const REL_GENERATED = 'src/render/assets/manifest.generated.ts';

/** Both sides of every comparison are `logical path -> /media/<name>.<hash><ext>` maps. */
function parseManifest(src: string): Record<string, string> {
  const open = src.indexOf('{');
  const close = src.lastIndexOf('}');
  return JSON.parse(src.slice(open, close + 1));
}

// ~440 MB of media, about 3s of sha256. Hash once and share it across the cases.
const onDisk: Record<string, string> = manifestEntries();
const committed = parseManifest(readFileSync(GENERATED_PATH, 'utf8'));

describe('media manifest integrity', () => {
  it('names a source file that exists for every entry', () => {
    const missing = Object.keys(committed).filter(
      (logical) => !existsSync(path.join(PUBLIC_DIR, logical)),
    );
    expect(missing).toEqual([]);
  });

  it('embeds the hash of the bytes actually on disk', () => {
    const stale = Object.keys(committed)
      .filter((logical) => logical in onDisk && committed[logical] !== onDisk[logical])
      .map((logical) => `${logical}: manifest ${committed[logical]}, bytes ${onDisk[logical]}`);
    expect(stale).toEqual([]);
  });

  it('carries every media file under public/', () => {
    // The reverse drift: an asset added without regenerating is served unhashed via the
    // assetUrl() fallback, so it silently loses cache-busting instead of 404ing.
    const unlisted = Object.keys(onDisk).filter((logical) => !(logical in committed));
    expect(unlisted).toEqual([]);
  });

  it('is byte-identical to what `build_media_manifest.mjs generate` writes', () => {
    expect(readFileSync(GENERATED_PATH, 'utf8')).toBe(renderManifest(onDisk));
  });

  // The cases above read the WORKING COPY, and a local build or suite run rewrites that
  // (`build:bundle` runs `generate` before vite). So a green worktree says nothing about what
  // is committed — which is exactly how this drift survived on the machine that produced it.
  // Check the committed blob as well, skipping any public file the worktree has modified: an
  // asset edit in progress is not yet a commit that lied.
  it('agrees with the bytes at HEAD for every unmodified asset', () => {
    let headSrc: string;
    try {
      headSrc = execFileSync('git', ['show', `HEAD:${REL_GENERATED}`], {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      return; // no git checkout (release tarball, container image): nothing to compare against
    }
    const head = parseManifest(headSrc);
    const modified = new Set(
      execFileSync('git', ['status', '--porcelain', '--', 'public'], {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
        .split('\n')
        .filter(Boolean)
        // "XY path" and, for renames, "XY old -> new"; the new name is the one on disk.
        .map((line) => line.slice(3).split(' -> ').pop() ?? '')
        .map((p) => p.replace(/^public\//, '')),
    );
    const stale = Object.keys(onDisk)
      .filter((logical) => !modified.has(logical))
      .filter((logical) => head[logical] !== undefined && head[logical] !== onDisk[logical])
      .map((logical) => `${logical}: HEAD ${head[logical]}, bytes ${onDisk[logical]}`);
    expect(stale).toEqual([]);
  });
});
