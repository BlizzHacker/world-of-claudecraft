// Why is the 3D world rendering near-black while the HUD is fully lit? Two
// candidates: a full-viewport modal backdrop sitting over the canvas, or the
// scene's own lighting. Ask the DOM which elements cover the canvas, ask three
// for its light rig, then close everything dismissible and re-shoot.
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const U = `https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br = await puppeteer.launch({ executablePath: B, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await br.newPage();
await p.setViewport({ width: 1280, height: 720 });
p.on('dialog', d => d.accept());
await p.goto(U, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
for (let i = 0; i < 30; i++) { if (await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length > 0)) break; await new Promise(r => setTimeout(r, 5000)); }
console.log('entry:', await p.evaluate(() => {
  const rows = [...document.querySelectorAll('#char-list .char-row')];
  const btnIn = (row, want) => [...row.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === want && b.offsetParent !== null && !b.disabled);
  for (const want of ['enter world', 'take over']) for (const row of rows) { const b = btnIn(row, want); if (b) { row.click(); b.click(); return want; } }
  return 'NO_BUTTON';
}));
let ui = false;
for (let i = 0; i < 40; i++) { ui = await p.evaluate(() => !!document.getElementById('ui')); if (ui) break; await new Promise(r => setTimeout(r, 5000)); }
console.log('in world:', ui);
for (let i = 0; i < 12; i++) {
  const c = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().toLowerCase() === 'confirm' && x.offsetParent !== null); if (b) { b.click(); return true; } return false; });
  if (c) break;
  await new Promise(r => setTimeout(r, 4000));
}
await new Promise(r => setTimeout(r, 14000));

// What sits on top of the canvas, and how opaque is it?
console.log('COVERS:', JSON.stringify(await p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth * 0.8 || r.height < innerHeight * 0.8) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
    const bg = s.backgroundColor;
    if (bg === 'rgba(0, 0, 0, 0)' && s.backdropFilter === 'none' && !s.background.includes('gradient')) continue;
    out.push({ tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 40), bg, z: s.zIndex, bf: s.backdropFilter, op: s.opacity });
  }
  return out;
}), null, 0));

// And what does the renderer itself think its lighting is?
console.log('LIGHTS:', JSON.stringify(await p.evaluate(() => {
  const c = document.querySelector('canvas');
  const g = window.__crScene ?? window.__crRenderer;
  if (!g) return { note: 'no scene handle', canvas: !!c, w: c?.width, h: c?.height };
  return { note: 'have handle' };
})));

// Close every dismissible panel, then look again.
console.log('closed:', await p.evaluate(() => {
  let n = 0;
  for (const b of document.querySelectorAll('button, .close, [aria-label*="lose" i]')) {
    const t = (b.textContent || '').trim();
    if ((t === '×' || t === 'x' || t === 'X' || /close/i.test(b.getAttribute('aria-label') || '')) && b.offsetParent !== null) { b.click(); n++; }
  }
  return n;
}));
await new Promise(r => setTimeout(r, 6000));
await p.screenshot({ path: '/tmp/dark_after_close.png' });

// Sample the canvas itself: if the pixels are dark before any DOM overlay, the
// scene is genuinely unlit and no amount of closing panels will help.
console.log('CANVAS:', JSON.stringify(await p.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return 'no canvas';
  const o = document.createElement('canvas'); o.width = 160; o.height = 90;
  const x = o.getContext('2d'); x.drawImage(c, 0, 0, 160, 90);
  const d = x.getImageData(0, 0, 160, 90).data;
  let sum = 0, max = 0;
  for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += l; if (l > max) max = l; }
  return { meanLuma: +(sum / (d.length / 4)).toFixed(1), maxLuma: max };
})));
await br.close();
console.log('done');
