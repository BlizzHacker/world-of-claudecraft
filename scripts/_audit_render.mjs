// Phase 2: collider-vs-rendered-geometry sweep. Boots the offline world
// headless against the local dev server (patched tree), builds an XZ occupancy
// index of every non-ground rendered vertex, then tests every authored collider
// (from the Phase-1 JSON) for rendered geometry inside its footprint.
// Run from /opt/cryptic-realm:
//   nice -n 12 node /tmp/cr_audit/audit_render.mjs
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { BROWSER_PATH as EDGE } from '/opt/cryptic-realm/scripts/browser_path.mjs';

const URL = process.env.GAME_URL ?? 'http://127.0.0.1:5233/?realm=infernal';
const OUT = '/tmp/cr_audit';
mkdirSync(OUT, { recursive: true });
const audit = JSON.parse(readFileSync(`${OUT}/colliders_infernal.json`, 'utf8'));

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900',
         '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
  protocolTimeout: 900000,
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => { pageErrors.push(e.message.slice(0, 200)); console.log('PAGEERROR:', e.message.slice(0, 160)); });
page.on('console', (m) => {
  const t = m.text();
  if (/decorProps|Failed to load|skipped/i.test(t)) console.log('CON:', t.slice(0, 240));
});
page.on('response', (r) => {
  if (r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(0, 160));
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (t) => page.screenshot({ path: `${OUT}/${t}.png` });

await page.goto(URL, { waitUntil: 'load', timeout: 420000 });
await wait(9000);
await page.evaluate(() => {
  const n = [...document.querySelectorAll('button, a')].find((b) => /not now/i.test(b.textContent || ''));
  n?.click();
});
await wait(600);
await page.evaluate(() => {
  const sel = document.querySelector('#mode-select, .mode-select, #play-mode')
    ?? [...document.querySelectorAll('*')].find((e) => /Characters Created/i.test(e.textContent || '') && e.children.length < 8);
  sel?.click();
  (sel?.closest('button, [role=button], div'))?.click();
});
await wait(1200);
await page.evaluate(() => document.querySelector('#btn-offline')?.click());
await wait(2500);
const filled = await page.evaluate(() => {
  const el = document.querySelector('#char-name');
  if (!el) return null;
  el.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(el, 'Auditor');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('#offline-select .mini-class[data-class="warrior"]')?.click();
  return el.value;
});
console.log('name field:', JSON.stringify(filled));
await shot('10_offline_panel');
await wait(500);
await page.evaluate(() => document.querySelector('#btn-start-offline')?.click());
await wait(6000);
await shot('11_after_start');
const post = await page.evaluate(() => ({
  startVisible: !!document.querySelector('#start-screen') &&
    getComputedStyle(document.querySelector('#start-screen')).display !== 'none',
  err: [...document.querySelectorAll('.error, .err, [class*=error]')].map((e) => (e.textContent || '').trim()).filter(Boolean).slice(0, 4),
  bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 240),
}));
console.log('post-start:', JSON.stringify(post));
await page.waitForFunction(() => !!window.__game, { timeout: 480000, polling: 1000 });
console.log('world booted');
await wait(15000);
await page.evaluate(() => {
  const hit = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''));
  hit(/confirm/i)?.click(); hit(/dismiss/i)?.click(); hit(/skip tutorial/i)?.click(); hit(/not now/i)?.click();
});
await wait(8000);

// -- force-build every zone's lazy feature group (willows, palms, great trees,
//    gates): ensureZoneFeatures is per-visited-zone, and an unbuilt group would
//    read as a phantom for every remote-zone collider it draws.
const featForce = await page.evaluate(async (zonesIn) => {
  const g = window.__game;
  const r = g.renderer;
  const out = { built: [], errors: [] };
  for (const zone of zonesIn) {
    try {
      r.ensureZoneFeatures(zone);
      out.built.push(`${zone.id}:${zone.biome}`);
    } catch (e) {
      out.errors.push(`${zone.id}:${zone.biome}: ${String(e).slice(0, 120)}`);
    }
  }
  r.scene.updateMatrixWorld(true);
  return out;
}, audit.zones ?? []);
console.log('zone features forced:', JSON.stringify(featForce));
// Settle: async feature builders (willows, palms, banyans, elders) clone their
// GLBs after load; sample only once the scene has stopped growing.
let last = { meshes: -1, instanced: -1 };
let stable = 0;
for (let i = 0; i < 16; i++) {
  await wait(15000);
  const now = await page.evaluate(() => {
    const g = window.__game;
    let meshes = 0, instanced = 0;
    g.renderer.scene.traverse((o) => {
      if (o.isInstancedMesh) instanced++;
      else if (o.isMesh) meshes++;
    });
    g.renderer.scene.updateMatrixWorld(true);
    const feat = {};
    for (const name of ['haunt-features', 'garden-features', 'jungle-features', 'realm-flora']) {
      const grp = g.renderer.scene.getObjectByName(name);
      feat[name] = grp ? grp.children.length : -1;
    }
    return { meshes, instanced, feat };
  });
  console.log(`settle ${i}: meshes=${now.meshes} instanced=${now.instanced} feat=${JSON.stringify(now.feat)}`);
  stable = now.meshes === last.meshes && now.instanced === last.instanced ? stable + 1 : 0;
  if (i >= 5 && stable >= 3) break;
  last = now;
}
// where exactly do the great-tree clones stand?
const treeDump = await page.evaluate(() => {
  const g = window.__game;
  const out = {};
  for (const name of ['haunt-features', 'garden-features']) {
    const grp = g.renderer.scene.getObjectByName(name);
    out[name] = grp
      ? grp.children
          .filter((c) => c.type === 'Group' || c.type === 'Object3D')
          .map((c) => `${c.type}@${Math.round(c.position.x)},${Math.round(c.position.z)}`)
      : null;
  }
  return out;
});
console.log('feature children:', JSON.stringify(treeDump));

// -- scene inventory: top-level names so exclusions are grounded, not guessed --
const inventory = await page.evaluate(() => {
  const g = window.__game;
  const scene = g.renderer.scene;
  const roots = scene.children.map((c) => ({
    name: c.name || c.type, type: c.type, children: c.children.length,
  }));
  let meshes = 0, instanced = 0, verts = 0;
  scene.traverse((o) => {
    if (o.isInstancedMesh) instanced++;
    else if (o.isMesh) { meshes++; verts += o.geometry?.getAttribute?.('position')?.count ?? 0; }
  });
  return { roots, meshes, instanced, verts };
});
console.log('scene roots:', JSON.stringify(inventory.roots));
console.log(`meshes=${inventory.meshes} instanced=${inventory.instanced} verts=${inventory.verts}`);

// -- build the occupancy index and test every collider ----------------------
const rows = audit.rows; // authored + lamps
const result = await page.evaluate((rowsIn) => {
  const g = window.__game;
  const scene = g.renderer.scene;
  const CELL = 2; // yards per bin
  const bins = new Map(); // key -> maxY
  const keyOf = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  // Ground-like exclusion by object or ancestor name. Terrain/water/roads and
  // pure ground cover must not count as "rendered geometry" for an obstacle.
  // Ground/atmosphere only. Named groups verified against the live scene dump:
  // 'water-flora' (the hollow willows live there) and 'streetlamps-*' style
  // groups (thornpeak_beacon!) must NOT match — the first sweep's broad
  // 'water|beacon' terms manufactured 33 false phantoms.
  const EXCLUDE = /^(terrain|farTerrain|water|bladeGrass|bladeGrassBand|cliffScree|underwater|frost-sky|motes|birds|fish|ground-aim-reticle|ground-aim-band)$|reeds|nameplate|minimap|weather/i;
  const excluded = [];
  const isExcluded = (o) => {
    let n = o;
    while (n) {
      const nm = n.name || '';
      if (nm && EXCLUDE.test(nm)) return nm;
      n = n.parent;
    }
    return null;
  };
  const tmpV = { x: 0, y: 0, z: 0 };
  const splat = (x, y, z) => {
    const k = keyOf(x, z);
    const prev = bins.get(k);
    if (prev === undefined || y > prev) bins.set(k, y);
  };
  const M = new Float64Array(16);
  scene.updateMatrixWorld(true);
  let splatted = 0;
  scene.traverse((o) => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    const ex = isExcluded(o);
    if (ex) { excluded.push(ex); return; }
    const geo = o.geometry;
    const pos = geo?.getAttribute?.('position');
    if (!pos) return;
    if (o.isInstancedMesh) {
      // splat each instance's bounding-sphere center + 4 ring points
      geo.computeBoundingSphere?.();
      const bs = geo.boundingSphere;
      const im = o.instanceMatrix;
      const n = o.count;
      const e = o.matrixWorld.elements;
      for (let i = 0; i < n; i++) {
        const a = im.array;
        const o16 = i * 16;
        // instance-local center
        const cx = bs.center.x, cy = bs.center.y, cz = bs.center.z;
        // instance matrix * center
        const ix = a[o16] * cx + a[o16 + 4] * cy + a[o16 + 8] * cz + a[o16 + 12];
        const iy = a[o16 + 1] * cx + a[o16 + 5] * cy + a[o16 + 9] * cz + a[o16 + 13];
        const iz = a[o16 + 2] * cx + a[o16 + 6] * cy + a[o16 + 10] * cz + a[o16 + 14];
        // world = matrixWorld * instance point
        const wx = e[0] * ix + e[4] * iy + e[8] * iz + e[12];
        const wy = e[1] * ix + e[5] * iy + e[9] * iz + e[13];
        const wz = e[2] * ix + e[6] * iy + e[10] * iz + e[14];
        const sc = Math.hypot(a[o16], a[o16 + 1], a[o16 + 2]); // x-column scale
        const r = bs.radius * sc;
        splat(wx, wy + r * 0.5, wz);
        for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) splat(wx + dx * 0.7, wy, wz + dz * 0.7);
        // The instance ORIGIN is the trunk/post seat; the sphere center of a
        // leaning palm or a crowned lamp sits yards away from it. Lift scales
        // with the body so ground-hugging grass tufts still fail the minY gate.
        const ox2 = e[0] * a[o16 + 12] + e[4] * a[o16 + 13] + e[8] * a[o16 + 14] + e[12];
        const oy2 = e[1] * a[o16 + 12] + e[5] * a[o16 + 13] + e[9] * a[o16 + 14] + e[13];
        const oz2 = e[2] * a[o16 + 12] + e[6] * a[o16 + 13] + e[10] * a[o16 + 14] + e[14];
        splat(ox2, oy2 + Math.min(2, r * 0.5), oz2);
        splatted += 6;
      }
      return;
    }
    const e = o.matrixWorld.elements;
    const arr = pos.array;
    const stride = pos.itemSize;
    const n = pos.count;
    // subsample very dense geometries: every vertex up to 200k, then step
    const step = n > 200000 ? Math.ceil(n / 200000) : 1;
    for (let i = 0; i < n; i += step) {
      const x = arr[i * stride], y = arr[i * stride + 1], z = arr[i * stride + 2];
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
      const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
      const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      splat(wx, wy, wz);
      splatted++;
    }
  });
  // Test each collider: any bin with geometry meaningfully above local ground
  // inside footprint + margin?
  const out = [];
  for (const row of rowsIn) {
    const rf = (row.r ?? Math.hypot(row.hw ?? 0.5, row.hd ?? 0.5)) + 1.6;
    const minY = (row.groundY ?? 0) + 0.35;
    let present = false;
    let nearest = Infinity;
    const c0x = Math.floor((row.x - 40) / CELL), c1x = Math.floor((row.x + 40) / CELL);
    const c0z = Math.floor((row.z - 40) / CELL), c1z = Math.floor((row.z + 40) / CELL);
    for (let gx = c0x; gx <= c1x; gx++) {
      for (let gz = c0z; gz <= c1z; gz++) {
        const y = bins.get(`${gx},${gz}`);
        if (y === undefined || y < minY) continue;
        const bx = (gx + 0.5) * CELL, bz = (gz + 0.5) * CELL;
        const d = Math.hypot(bx - row.x, bz - row.z);
        if (d < nearest) nearest = d;
        if (d <= rf) { present = true; }
      }
      if (present && nearest < 2) break;
    }
    out.push({ present, nearest: nearest === Infinity ? null : +nearest.toFixed(1) });
  }
  const exCounts = {};
  for (const e2 of excluded) exCounts[e2] = (exCounts[e2] ?? 0) + 1;
  return { out, splatted, bins: bins.size, exCounts };
}, rows);

console.log(`splatted=${result.splatted} occupied bins=${result.bins}`);
console.log('excluded groups:', JSON.stringify(result.exCounts).slice(0, 1500));

const misses = [];
rows.forEach((row, i) => {
  const v = result.out[i];
  if (!v.present) misses.push({ ...row, nearest: v.nearest });
});
const bySrc = {};
for (const m of misses) bySrc[m.source] = (bySrc[m.source] ?? 0) + 1;
console.log(`colliders tested: ${rows.length}, WITHOUT rendered geometry: ${misses.length}`);
console.log('misses by source:', JSON.stringify(bySrc, null, 1));
for (const m of misses.slice(0, 80))
  console.log(`  MISS ${m.source} ${m.note ?? ''} zone=${m.zone} (${m.x}, ${m.z}) nearest=${m.nearest}`);
writeFileSync(`${OUT}/render_misses.json`, JSON.stringify({ misses, bySrc, pageErrors }, null, 1));
console.log('wrote', `${OUT}/render_misses.json`);

// Photograph the audit's marquee sites: the previously phantom spots must now
// show their geometry (or, for the crypt cart, honestly show nothing where no
// collider remains).
const SITES = [
  ['drowned_arch', -95, 509],
  ['relic_heart_thornpeak', 138.6, 709.3],
  ['thornpeak_lamp', -3.8, 654.06],
  ['hollow_willow', -79.82, 1038.3],
  ['stall_dressing_eastbrook', -47, 1032],
  ['crypt_mine_cart_spot', -160, 610],
];
for (const [name, sx, sz] of SITES) {
  // ground height from the data-layer rows (nearest enumerated collider)
  let gy = 0, best = Infinity;
  for (const row of rows) {
    const d2 = (row.x - sx) ** 2 + (row.z - sz) ** 2;
    if (d2 < best && row.groundY !== undefined) { best = d2; gy = row.groundY; }
  }
  await page.evaluate(([x, z, y]) => {
    const g = window.__game;
    g.renderer.editorCam = {
      pos: { x: x + 9, y: y + 8, z: z + 9 },
      target: { x, y: y + 1, z },
    };
  }, [sx, sz, gy]);
  await wait(2500);
  await page.screenshot({ path: `${OUT}/site_${name}.png` });
  console.log('site shot', name);
}
await browser.close();
