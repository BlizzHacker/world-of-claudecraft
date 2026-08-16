const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1280,height:720});
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
await new Promise(r=>setTimeout(r,3000));
const dump = () => p.evaluate(()=>{
  const f=window.__crAnim; if(!f) return 'NO_HOOK';
  return f().filter(v=>String(v.key).startsWith('override_'));
});
console.log('OVR IDLE:', JSON.stringify(await dump()));
await p.keyboard.down('w');
await new Promise(r=>setTimeout(r,2200));
const mid = await dump();
await p.keyboard.up('w');
console.log('OVR WALK:', JSON.stringify(mid));
await new Promise(r=>setTimeout(r,1200));
await p.keyboard.press('Tab');
await new Promise(r=>setTimeout(r,600));
await p.keyboard.press('1');
await new Promise(r=>setTimeout(r,500));
console.log('OVR ATTACK:', JSON.stringify(await dump()));
await br.close();
console.log('done');
