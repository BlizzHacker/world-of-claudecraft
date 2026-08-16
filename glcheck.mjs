// Minimal: does this chromium give us a WebGL2 context at all, and can it draw?
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const extra = process.argv.slice(2);
const args = ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle',
  '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage', ...extra];
console.log('args:', args.join(' '));
const br = await puppeteer.launch({ executablePath: B, headless: true, args });
const p = await br.newPage();
p.on('console', m => console.log('  page>', m.text().slice(0, 160)));
p.on('pageerror', e => console.log('  pageerror>', String(e).slice(0, 160)));
await p.setContent('<canvas id=c width=64 height=64></canvas>');
const r = await p.evaluate(() => {
  const c = document.getElementById('c');
  const g = c.getContext('webgl2') || c.getContext('webgl');
  if (!g) return { ok: false, why: 'null context' };
  g.clearColor(0, 1, 0, 1); g.clear(g.COLOR_BUFFER_BIT);
  const px = new Uint8Array(4); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px);
  const d = g.getExtension('WEBGL_debug_renderer_info');
  return { ok: true, px: [...px], ver: g.getParameter(g.VERSION),
    renderer: d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a' };
}).catch(e => ({ ok: false, why: String(e).slice(0, 160) }));
console.log('RESULT:', JSON.stringify(r));
await br.close();
