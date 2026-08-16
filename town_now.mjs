const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1280,height:720});
p.on('dialog', d=>d.accept());
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
let rows=0;
for(let i=0;i<30;i++){
  rows=await p.evaluate(()=>document.querySelectorAll('#char-list .char-row').length);
  if(rows>0) break;
  await new Promise(r=>setTimeout(r,5000));
}
console.log('roster rows:', rows);
// pick the first row whatever it is, handle take-over
const who = await p.evaluate(()=>{
  const row=document.querySelector('#char-list .char-row');
  if(!row) return 'NO_ROW';
  row.click();
  return row.querySelector('.char-name')?.textContent.trim() ?? '?';
});
console.log('entering as:', who);
await new Promise(r=>setTimeout(r,2500));
await p.evaluate(()=>{
  const row=document.querySelector('#char-list .char-row.sel') ?? document.querySelector('#char-list .char-row');
  const take=row?.querySelector('.take-over-btn');
  if(take){ take.click(); return; }
  const b=document.getElementById('btn-charselect-enter');
  if(b && b.offsetParent!==null && !b.disabled){ b.click(); return; }
  row?.querySelector('.enter-world-btn')?.click();
});
let ui=false;
for(let i=0;i<40;i++){
  ui=await p.evaluate(()=>!!document.getElementById('ui'));
  if(ui) break;
  await new Promise(r=>setTimeout(r,5000));
}
console.log('in world:', ui);
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
await new Promise(r=>setTimeout(r,14000));
await p.screenshot({path:'/tmp/town_now1.png'});
await p.mouse.click(640,300);
await p.keyboard.down('w'); await new Promise(r=>setTimeout(r,2600)); await p.keyboard.up('w');
await new Promise(r=>setTimeout(r,4000));
await p.screenshot({path:'/tmp/town_now2.png'});
await br.close();
console.log('done');
