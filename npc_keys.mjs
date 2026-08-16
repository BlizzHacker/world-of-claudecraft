const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1280,height:720});
p.on('dialog', d=>d.accept());
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
for(let i=0;i<30;i++){ if(await p.evaluate(()=>document.querySelectorAll('#char-list .char-row').length>0)) break; await new Promise(r=>setTimeout(r,5000)); }
await p.evaluate(()=>document.querySelector('#char-list .char-row')?.click());
await new Promise(r=>setTimeout(r,2500));
await p.evaluate(()=>{
  const row=document.querySelector('#char-list .char-row.sel') ?? document.querySelector('#char-list .char-row');
  const take=row?.querySelector('.take-over-btn');
  if(take){ take.click(); return; }
  const b=document.getElementById('btn-charselect-enter');
  if(b && b.offsetParent!==null && !b.disabled){ b.click(); return; }
  row?.querySelector('.enter-world-btn')?.click();
});
for(let i=0;i<40;i++){ if(await p.evaluate(()=>!!document.getElementById('ui'))) break; await new Promise(r=>setTimeout(r,5000)); }
for(let i=0;i<12;i++){
  const c=await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().toLowerCase()==='confirm'&&x.offsetParent!==null); if(b){b.click();return true;} return false;});
  if(c) break; await new Promise(r=>setTimeout(r,4000));
}
await new Promise(r=>setTimeout(r,16000));
const dump = await p.evaluate(()=>{
  const f=window.__crAnim; if(!f) return 'NO_HOOK';
  const all=f();
  const counts={};
  for(const v of all) counts[v.key]=(counts[v.key]||0)+1;
  return { total: all.length,
    overrideStubs: all.filter(v=>String(v.key).startsWith('override_')).length,
    keys: Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,18) };
});
console.log(JSON.stringify(dump,null,1));
await br.close();
