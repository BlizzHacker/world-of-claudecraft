const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://dev-infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal%20Dev&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
// wait for realm cards
for(let i=0;i<24;i++){
  if(await p.evaluate(()=>document.querySelectorAll('.realm-card').length>0)) break;
  await new Promise(r=>setTimeout(r,5000));
}
console.log('cards:', await p.evaluate(()=>[...document.querySelectorAll('.realm-card')].map(c=>c.dataset.fam).join(',')));
// choose Infernal dev stage
console.log('toggle:', await p.evaluate(()=>{
  const cb=document.querySelector('.rl-test-rings[data-fam="Infernal"]');
  if(!cb) return 'NO_TOGGLE';
  if(!cb.checked) cb.click();
  return 'ok';
}));
await new Promise(r=>setTimeout(r,1500));
console.log('stage:', await p.evaluate(()=>{
  const b=document.querySelector('.rl-stage[data-fam="Infernal"][data-stage="dev"]');
  if(!b) return 'NO_DEV_BTN';
  if(b.disabled) return 'DEV_LOCKED';
  b.click(); return 'ok';
}));
await new Promise(r=>setTimeout(r,1500));
console.log('enter realm:', await p.evaluate(()=>{
  const b=document.querySelector('.rc-enter[data-fam="Infernal"]');
  if(!b) return 'NO_ENTER';
  b.click(); return 'ok';
}));
let rows=0;
for(let i=0;i<30;i++){
  rows=await p.evaluate(()=>document.querySelectorAll('#char-list .char-row').length);
  if(rows>0) break;
  await new Promise(r=>setTimeout(r,5000));
}
console.log('rows:', rows, 'realm label:', await p.evaluate(()=>document.querySelector('#charselect-realm')?.textContent??''));
console.log('select:', await p.evaluate(()=>{
  const row=[...document.querySelectorAll('#char-list .char-row')]
    .find(r=>r.querySelector('.char-name')?.textContent.trim()==='Riggsbane');
  if(!row) return 'NO_ROW:'+[...document.querySelectorAll('#char-list .char-name')].map(e=>e.textContent.trim()).join(',');
  row.click(); return 'ok';
}));
await new Promise(r=>setTimeout(r,2500));
console.log('enter world:', await p.evaluate(()=>{
  const b=document.getElementById('btn-charselect-enter');
  if(b && b.offsetParent!==null && !b.disabled){ b.click(); return 'shared'; }
  const eb=document.querySelector('#char-list .char-row.sel .enter-world-btn');
  if(eb){ eb.click(); return 'row-btn'; }
  return 'NONE';
}));
let uiUp=false;
for(let i=0;i<36;i++){
  if(await p.evaluate(()=>!!document.getElementById('ui'))){ uiUp=true; break; }
  await new Promise(r=>setTimeout(r,5000));
}
console.log('world ui:', uiUp);
await new Promise(r=>setTimeout(r,20000));
await p.evaluate(()=>{
  const btn=[...document.querySelectorAll('button')].find(b=>/confirm/i.test(b.textContent));
  btn?.click();
});
await new Promise(r=>setTimeout(r,3000));
await p.keyboard.press('Enter');
await new Promise(r=>setTimeout(r,800));
await p.keyboard.type('/dev spawn gravecaller_cultist 4', {delay:25});
await p.keyboard.press('Enter');
await new Promise(r=>setTimeout(r,8000));
console.log('chat:', await p.evaluate(()=>{
  const el=document.querySelector('#chat-log, .chat-log, #chat-messages, [class*=chat-]');
  return el ? el.textContent.slice(-250) : 'NO_CHAT_EL';
}));
await p.screenshot({path:'/tmp/spawn1.png'});
await new Promise(r=>setTimeout(r,8000));
await p.screenshot({path:'/tmp/spawn2.png'});
await new Promise(r=>setTimeout(r,8000));
await p.screenshot({path:'/tmp/spawn3.png'});
await br.close();
console.log('done');
