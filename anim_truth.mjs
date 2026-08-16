// Ground truth: does the live client play walk and attack clips, or only idle?
// Captures tight frame bursts per state with the camera orbited to a side view.
const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
p.on('dialog', d=>d.accept());
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
for(let i=0;i<30;i++){
  if(await p.evaluate(()=>document.querySelectorAll('#char-list .char-row').length>0)) break;
  await new Promise(r=>setTimeout(r,5000));
}
await p.evaluate(()=>{
  const row=[...document.querySelectorAll('#char-list .char-row')]
    .find(r=>r.querySelector('.char-name')?.textContent.trim()==='Ashfang');
  row?.click();
});
await new Promise(r=>setTimeout(r,2500));
await p.evaluate(()=>{
  const row=[...document.querySelectorAll('#char-list .char-row')]
    .find(r=>r.querySelector('.char-name')?.textContent.trim()==='Ashfang');
  const take=row?.querySelector('.take-over-btn');
  if(take){ take.click(); return; }
  const b=document.getElementById('btn-charselect-enter');
  if(b && b.offsetParent!==null && !b.disabled){ b.click(); return; }
  row?.querySelector('.enter-world-btn')?.click();
});
for(let i=0;i<36;i++){
  if(await p.evaluate(()=>!!document.getElementById('ui'))) break;
  await new Promise(r=>setTimeout(r,5000));
}
for(let i=0;i<15;i++){
  const c=await p.evaluate(()=>{
    const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().toLowerCase()==='confirm' && b.offsetParent!==null);
    if(btn){btn.click();return true;} return false;
  });
  if(c) break;
  await new Promise(r=>setTimeout(r,4000));
}
await p.evaluate(()=>{
  for (const t of ['skip tutorial','not now','dismiss']) {
    const b=[...document.querySelectorAll('button,span')].find(x=>x.textContent.trim().toLowerCase().includes(t)&&x.offsetParent!==null);
    b?.click();
  }
});
await new Promise(r=>setTimeout(r,2000));
// hide HUD chrome so legs are visible: collapse chat + action bar via CSS
await p.evaluate(()=>{
  const css=document.createElement('style');
  css.textContent='#chat-panel,#action-bar,.hud-bottom,[id*=hotbar],[class*=actionbar]{opacity:0.1!important}';
  document.head.appendChild(css);
});
// orbit camera to a side-ish view: right-drag
await p.mouse.move(800,450);
await p.mouse.down({button:'right'});
await p.mouse.move(1050,430,{steps:10});
await p.mouse.up({button:'right'});
await p.mouse.wheel({deltaY:-500});
await new Promise(r=>setTimeout(r,1500));
// IDLE burst
for(let i=0;i<3;i++){ await p.screenshot({path:`/tmp/tr_idle${i}.png`}); await new Promise(r=>setTimeout(r,600)); }
// WALK burst (hold w; capture 4 frames)
await p.keyboard.down('w');
for(let i=0;i<4;i++){ await new Promise(r=>setTimeout(r,400)); await p.screenshot({path:`/tmp/tr_walk${i}.png`}); }
await p.keyboard.up('w');
await new Promise(r=>setTimeout(r,1200));
// ATTACK: tab-target then press 1, burst
await p.keyboard.press('Tab');
await new Promise(r=>setTimeout(r,800));
await p.keyboard.press('1');
for(let i=0;i<4;i++){ await new Promise(r=>setTimeout(r,350)); await p.screenshot({path:`/tmp/tr_atk${i}.png`}); }
// what did the client resolve? read the visual def straight from the live page if exposed
const dbg = await p.evaluate(()=>{
  const w=window; 
  return {ver: w.__APP_VERSION__ ?? null, build: document.querySelector('meta[name=build]')?.content ?? null};
});
console.log('client:', JSON.stringify(dbg));
await br.close();
console.log('done');
