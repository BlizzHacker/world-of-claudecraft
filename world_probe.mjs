const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const CHAR=process.argv[3] ?? 'DuranceTester';
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
const errs=[];
p.on('pageerror',e=>errs.push(String(e.message).slice(0,300)));
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
await new Promise(r=>setTimeout(r,20000));
// select the row for CHAR then enter world
const sel = await p.evaluate((name)=>{
  const rows=[...document.querySelectorAll('#char-list .char-row')];
  const row=rows.find(r=>r.querySelector('.char-name')?.textContent.trim()===name);
  if(!row) return 'NO_ROW:'+rows.map(r=>r.querySelector('.char-name')?.textContent.trim()).join(',');
  row.click(); return 'selected';
}, CHAR);
console.log('select:', sel);
await new Promise(r=>setTimeout(r,3000));
const ent = await p.evaluate(()=>{
  const b=document.getElementById('btn-charselect-enter');
  if(b && !b.disabled){ b.click(); return 'clicked shared enter'; }
  const rows=[...document.querySelectorAll('#char-list .char-row')];
  const row=rows.find(r=>r.classList.contains('sel'));
  const eb=row?.querySelector('.enter-world-btn');
  if(eb){ eb.click(); return 'clicked row enter'; }
  return 'NO_ENTER_BTN';
});
console.log('enter:', ent);
await new Promise(r=>setTimeout(r,60000));
const state = await p.evaluate(()=>({
  ui: !!document.getElementById('ui'),
  overlay: document.getElementById('disconnect-overlay')?.textContent?.slice(0,120) ?? null,
  loading: getComputedStyle(document.getElementById('loading-screen')||document.body).display,
  targets: [...document.querySelectorAll('[class*=nameplate],[class*=target],[id*=target]')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,10),
}));
console.log('state:', JSON.stringify(state));
await p.screenshot({path:'/tmp/world1.png'});
await new Promise(r=>setTimeout(r,10000));
await p.screenshot({path:'/tmp/world2.png'});
console.log('errors:', errs.slice(0,4));
await br.close();
