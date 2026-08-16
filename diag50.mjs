const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1280,height:720});
p.on('dialog', d=>d.accept());
const consoleMsgs=[];
p.on('console', m=>{ const t=m.text(); if(/miss|error|fail|unavailable/i.test(t)) consoleMsgs.push(t.slice(0,220)); });
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
let rows=0;
for(let i=0;i<30;i++){
  rows=await p.evaluate(()=>document.querySelectorAll('#char-list .char-row').length);
  if(rows>0) break;
  await new Promise(r=>setTimeout(r,5000));
}
console.log('rows:', rows);
console.log('select:', await p.evaluate(()=>{
  const row=[...document.querySelectorAll('#char-list .char-row')]
    .find(r=>r.querySelector('.char-name')?.textContent.trim()==='Ashfang');
  if(!row) return 'NO_ROW';
  row.click(); return 'ok';
}));
await new Promise(r=>setTimeout(r,2500));
console.log('enter:', await p.evaluate(()=>{
  const row=[...document.querySelectorAll('#char-list .char-row')]
    .find(r=>r.querySelector('.char-name')?.textContent.trim()==='Ashfang');
  const take=row?.querySelector('.take-over-btn');
  if(take){ take.click(); return 'take-over'; }
  const b=document.getElementById('btn-charselect-enter');
  if(b && b.offsetParent!==null && !b.disabled){ b.click(); return 'shared'; }
  const eb=row?.querySelector('.enter-world-btn');
  if(eb){ eb.click(); return 'row-btn'; }
  return 'NONE';
}));
let ui=false;
for(let i=0;i<36;i++){
  ui=await p.evaluate(()=>!!document.getElementById('ui'));
  if(ui) break;
  await new Promise(r=>setTimeout(r,5000));
}
console.log('world ui:', ui);
await new Promise(r=>setTimeout(r,15000));
const all = await p.evaluate(()=>{
  const f=window.__crAnim; if(!f) return 'NO_HOOK';
  const vs=f();
  return {count: vs.length, keys: vs.map(v=>v.key+':'+v.actions.length).slice(0,10)};
});
console.log('ALL visuals:', JSON.stringify(all));
console.log('console hits:', JSON.stringify(consoleMsgs.slice(0,6)));
await p.screenshot({path:'/tmp/diag50.png'});
await br.close();
console.log('done');
