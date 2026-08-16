const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const CHAR=process.argv[3] ?? 'DuranceTester';
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
// poll for roster rows
let rows=0;
for(let i=0;i<30;i++){
  rows=await p.evaluate(()=>document.querySelectorAll('#char-list .char-row').length);
  if(rows>0) break;
  await new Promise(r=>setTimeout(r,5000));
}
console.log('rows:', rows);
if(rows>0){
  console.log('select:', await p.evaluate((name)=>{
    const rowsA=[...document.querySelectorAll('#char-list .char-row')];
    const row=rowsA.find(r=>r.querySelector('.char-name')?.textContent.trim()===name) ?? rowsA[0];
    row.click(); return row.querySelector('.char-name')?.textContent.trim();
  }, CHAR));
  await new Promise(r=>setTimeout(r,2500));
  console.log('enter:', await p.evaluate(()=>{
    const b=document.getElementById('btn-charselect-enter');
    if(b && b.offsetParent!==null && !b.disabled){ b.click(); return 'shared'; }
    const row=document.querySelector('#char-list .char-row.sel');
    const eb=row?.querySelector('.enter-world-btn');
    if(eb){ eb.click(); return 'row-btn'; }
    return 'NONE';
  }));
  // poll for world UI
  for(let i=0;i<36;i++){
    const st=await p.evaluate(()=>({ui:!!document.getElementById('ui'),
      overlay:document.getElementById('disconnect-overlay')?.textContent?.slice(0,100)??null}));
    if(st.ui||st.overlay){ console.log('world state:',JSON.stringify(st)); break; }
    await new Promise(r=>setTimeout(r,5000));
  }
  await new Promise(r=>setTimeout(r,15000));
}
await p.screenshot({path:'/tmp/world1.png'});
await new Promise(r=>setTimeout(r,8000));
await p.screenshot({path:'/tmp/world2.png'});
await br.close();
console.log('done');
