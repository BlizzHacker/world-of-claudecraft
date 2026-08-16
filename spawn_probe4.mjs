const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://dev-infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal%20Dev&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
for(let i=0;i<24;i++){
  if(await p.evaluate(()=>document.querySelectorAll('.realm-card').length>0)) break;
  await new Promise(r=>setTimeout(r,5000));
}
await p.evaluate(()=>{const cb=document.querySelector('.rl-test-rings[data-fam="Infernal"]'); if(cb&&!cb.checked) cb.click();});
await new Promise(r=>setTimeout(r,1200));
await p.evaluate(()=>document.querySelector('.rl-stage[data-fam="Infernal"][data-stage="dev"]')?.click());
await new Promise(r=>setTimeout(r,1200));
await p.evaluate(()=>document.querySelector('.rc-enter[data-fam="Infernal"]')?.click());
let rows=0;
for(let i=0;i<30;i++){
  rows=await p.evaluate(()=>document.querySelectorAll('#char-list .char-row').length);
  if(rows>0) break;
  await new Promise(r=>setTimeout(r,5000));
}
await p.evaluate(()=>{
  const row=[...document.querySelectorAll('#char-list .char-row')]
    .find(r=>r.querySelector('.char-name')?.textContent.trim()==='Riggsbane');
  row?.click();
});
await new Promise(r=>setTimeout(r,2500));
await p.evaluate(()=>{
  const b=document.getElementById('btn-charselect-enter');
  if(b && b.offsetParent!==null && !b.disabled){ b.click(); return; }
  document.querySelector('#char-list .char-row.sel .enter-world-btn')?.click();
});
for(let i=0;i<36;i++){
  if(await p.evaluate(()=>!!document.getElementById('ui'))) break;
  await new Promise(r=>setTimeout(r,5000));
}
// wait for camera dialog then dismiss it (poll up to 60s)
let cam='none';
for(let i=0;i<12;i++){
  cam=await p.evaluate(()=>{
    const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().toLowerCase()==='confirm' && b.offsetParent!==null);
    if(btn){ btn.click(); return 'confirmed'; }
    return 'none';
  });
  if(cam==='confirmed') break;
  await new Promise(r=>setTimeout(r,5000));
}
console.log('camera:', cam);
await new Promise(r=>setTimeout(r,2000));
console.log('tutorial:', await p.evaluate(()=>{
  const btn=[...document.querySelectorAll('button')].find(b=>/skip tutorial/i.test(b.textContent) && b.offsetParent!==null);
  if(btn){ btn.click(); return 'skipped'; } return 'none';
}));
await new Promise(r=>setTimeout(r,3000));
// chat spawn
await p.keyboard.press('Enter');
await new Promise(r=>setTimeout(r,800));
await p.keyboard.type('/dev spawn gravecaller_cultist 4', {delay:30});
await p.keyboard.press('Enter');
await new Promise(r=>setTimeout(r,8000));
console.log('chat:', JSON.stringify(await p.evaluate(()=>{
  const el=document.querySelector('#chat-log, .chat-log, #chat-messages, [class*=chat-]');
  return el ? el.textContent.slice(-300) : 'NO_CHAT_EL';
})).slice(0,400));
await p.screenshot({path:'/tmp/spawn1.png'});
await new Promise(r=>setTimeout(r,8000));
await p.screenshot({path:'/tmp/spawn2.png'});
await new Promise(r=>setTimeout(r,8000));
await p.screenshot({path:'/tmp/spawn3.png'});
await br.close();
console.log('done');
