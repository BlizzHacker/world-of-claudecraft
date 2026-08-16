// Why does the proof bundle land on the realm picker? Dump console, the
// /api/realms response the PAGE saw, and localStorage realm state.
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const BASE = process.argv[3];
const br = await puppeteer.launch({
  executablePath: B,
  headless: true,
  protocolTimeout: 180000,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-angle=swiftshader',
    '--use-gl=angle',
    ...(process.env.CR_MAP
      ? [`--host-resolver-rules=MAP ${process.env.CR_MAP}`, '--ignore-certificate-errors']
      : []),
  ],
});
const p = await br.newPage();
await p.setViewport({ width: 1100, height: 800 });
const logs = [];
p.on('console', (m) => logs.push(`${m.type()}:${m.text().slice(0, 160)}`));
p.on('pageerror', (e) => logs.push(`pageerror:${String(e).slice(0, 200)}`));
const net = [];
p.on('response', (r) => {
  if (/\/api\//.test(r.url())) net.push(`${r.status()} ${r.url().slice(0, 90)}`);
});
const U = `${BASE}/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
await p.goto(U, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch((e) => console.log('goto', String(e).slice(0, 90)));
await new Promise((r) => setTimeout(r, 25000));
const state = await p.evaluate(async () => {
  let realms = 'n/a';
  try {
    const res = await fetch('/api/realms', { headers: {} });
    const d = await res.json();
    realms = `${res.status} realms=${(d.realms ?? []).length} current=${d.current}`;
  } catch (e) {
    realms = 'fetch-threw:' + String(e).slice(0, 80);
  }
  const panels = [...document.querySelectorAll('[id$="-panel"], #realm-panel, #charselect-panel')]
    .map((el) => `${el.id}:${getComputedStyle(el).display}`)
    .join(' ');
  return {
    origin: location.origin,
    realms,
    panels,
    ls: Object.keys(localStorage).filter((k) => /realm|auth|token|play/i.test(k)).slice(0, 12),
    lsRealm: localStorage.getItem('cr_active_realm') ?? localStorage.getItem('woc_realm') ?? null,
    text: (document.body.innerText ?? '').slice(0, 220).replace(/\s+/g, ' '),
  };
}).catch((e) => ({ err: String(e).slice(0, 120) }));
console.log('STATE:', JSON.stringify(state, null, 1));
console.log('NET:', net.slice(0, 20).join('\n     '));
console.log('LOGS:', logs.slice(0, 25).join('\n      '));
await br.close();
process.exit(0);
