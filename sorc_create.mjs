// Prove the male sorcerer reaches the player: open create-character, choose the
// Sorcerer, switch to the Male variant, and photograph the preview. The override
// is published live, so no deploy is involved — if the body does not appear here
// the plumbing is wrong, not the asset.
//
// Every page call goes through evalSafe: this client does real navigations
// between the roster and the create screen, which detaches the frame mid-poll.
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const U = `https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br = await puppeteer.launch({ executablePath: B, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage'] });
const p = await br.newPage();
await p.setViewport({ width: 1280, height: 800 });
p.on('dialog', d => d.accept());

const evalSafe = async (fn, arg) => {
  for (let i = 0; i < 4; i++) {
    try { return await p.evaluate(fn, arg); }
    catch (e) {
      if (!/detached|Execution context|Target closed|Session closed/i.test(String(e))) throw e;
      await new Promise(r => setTimeout(r, 4000));
    }
  }
  return 'DETACHED';
};
const shoot = async (name) => { try { await p.screenshot({ path: `/tmp/${name}.png` }); console.log('shot', name); } catch (e) { console.log('shot failed', name, String(e).slice(0, 80)); } };

await p.goto(U, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
for (let i = 0; i < 30; i++) {
  const n = await evalSafe(() => document.querySelectorAll('#char-list .char-row').length);
  if (typeof n === 'number' && n > 0) break;
  await new Promise(r => setTimeout(r, 5000));
}

const clickByText = async (want) => evalSafe((w) => {
  const vis = (e) => e.offsetParent !== null;
  const all = [...document.querySelectorAll('button, [role=button], .class-card, .choice, label, li, a, div')].filter(vis);
  const exact = all.find((e) => e.textContent.trim().toLowerCase() === w.toLowerCase());
  if (exact) { exact.click(); return 'exact'; }
  const loose = all.filter((e) => e.children.length <= 2)
    .find((e) => e.textContent.trim().toLowerCase().includes(w.toLowerCase()));
  if (loose) { loose.click(); return 'loose'; }
  return 'NOT_FOUND';
}, want);

console.log('new character:', await clickByText('New Character'));
await new Promise(r => setTimeout(r, 7000));
await shoot('sorc_create0');

console.log('sorcerer:', await clickByText('Sorcerer'));
await new Promise(r => setTimeout(r, 8000));
await shoot('sorc_create1');

console.log('male:', await clickByText('Male'));
await new Promise(r => setTimeout(r, 10000));
await shoot('sorc_create2');
console.log('LIVE after male:', JSON.stringify(await evalSafe(() => (window.__crAnim ? window.__crAnim().map((v) => v.key) : 'NO_HOOK'))));

console.log('female:', await clickByText('Female'));
await new Promise(r => setTimeout(r, 10000));
await shoot('sorc_create3');
console.log('LIVE after female:', JSON.stringify(await evalSafe(() => (window.__crAnim ? window.__crAnim().map((v) => v.key) : 'NO_HOOK'))));

await br.close();
console.log('done');
