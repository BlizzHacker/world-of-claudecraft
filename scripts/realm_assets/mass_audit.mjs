#!/usr/bin/env node
// Render EVERY published body through the game's own renderer, one hero shot each,
// so the whole library can be eyeballed instead of sampled.
//
// A single static hero frame catches the failure modes that matter at this scale:
// wrong orientation, exploded/torn binds, non-humanoid shapes the gate let through,
// and scale outliers. Per-clip motion review is a finer pass on whatever survives.
//
//   node mass_audit.mjs --store /mnt/.../cr-realms --out /tmp/audit_all [--limit N]

import { renderThumb, previewBrowserAvailable, closePreview } from '../asset_pipeline/lib/preview.mjs';
import { readdirSync, mkdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const STORE = arg('store', '/mnt/usb4/moveweight-assets/cr-realms');
const OUT = arg('out', '/tmp/audit_all');
const LIMIT = Number(arg('limit', 0));

async function main() {
  if (!previewBrowserAvailable()) {
    console.error('no browser; export BROWSER_PATH');
    process.exit(2);
  }
  mkdirSync(OUT, { recursive: true });
  const realms = readdirSync(STORE).filter((d) => {
    try { return statSync(join(STORE, d)).isDirectory(); } catch { return false; }
  });

  const jobs = [];
  for (const realm of realms.sort()) {
    for (const f of readdirSync(join(STORE, realm)).filter((x) => x.startsWith('realm_') && x.endsWith('.glb')).sort()) {
      jobs.push({ realm, key: f.replace(/\.glb$/, ''), path: join(STORE, realm, f) });
    }
  }
  const todo = LIMIT ? jobs.slice(0, LIMIT) : jobs;
  console.log(`[audit] ${todo.length} bodies`);

  const index = [];
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < todo.length; i++) {
    const j = todo[i];
    const dir = join(OUT, j.realm);
    mkdirSync(dir, { recursive: true });
    const dest = join(dir, `${j.key}.png`);
    if (existsSync(dest) && statSync(dest).size > 500) { ok++; index.push(j); continue; }
    try {
      await renderThumb(j.path, dest, { size: 256 });
      ok++;
      index.push(j);
    } catch (e) {
      fail++;
      console.log(`  FAIL ${j.realm}/${j.key}: ${String(e.message).slice(0, 80)}`);
    }
    if ((i + 1) % 100 === 0) console.log(`  [${i + 1}/${todo.length}] ok=${ok} fail=${fail}`);
  }
  writeFileSync(join(OUT, '_index.json'), JSON.stringify(index, null, 1));
  console.log(`[audit] DONE ok=${ok} fail=${fail} -> ${OUT}`);
  await closePreview();
}

main().catch((e) => { console.error(e); process.exit(1); });
