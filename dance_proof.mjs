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
await new Promise(r=>setTimeout(r,4000));
await p.mouse.click(640,300);
await new Promise(r=>setTimeout(r,800));
const dump = () => p.evaluate(()=>{
  const f=window.__crAnim; if(!f) return [];
  return f().filter(v=>String(v.key).startsWith('override_'))
    .map(v=>({state:v.state,current:v.current}));
});
// hold X, find dance icon box, HOVER with real mouse, release X
await p.keyboard.down('KeyX');
await new Promise(r=>setTimeout(r,1500));
const box = await p.evaluate(()=>{
  const img=[...document.querySelectorAll('img')].find(i=>String(i.src).includes('emote-dance')&&i.offsetParent!==null);
  if(!img) return null;
  const r=img.getBoundingClientRect();
  return {x:r.x+r.width/2, y:r.y+r.height/2};
});
console.log('dance box:', JSON.stringify(box));
if(box){
  await p.mouse.move(box.x, box.y, {steps:8});
  await new Promise(r=>setTimeout(r,900));
}
await p.keyboard.up('KeyX');
const seen=[];
for(let i=0;i<8;i++){ await new Promise(r=>setTimeout(r,500)); seen.push(await dump()); }
console.log('DANCE samples:', JSON.stringify(seen));
await p.screenshot({path:'/tmp/dance_final.png'});
await br.close();
console.log('done');
