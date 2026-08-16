const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
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
  const b=document.getElementById('btn-charselect-enter');
  if(b && b.offsetParent!==null && !b.disabled){ b.click(); return; }
  document.querySelector('#char-list .char-row.sel .enter-world-btn')?.click();
});
for(let i=0;i<36;i++){
  if(await p.evaluate(()=>!!document.getElementById('ui'))) break;
  await new Promise(r=>setTimeout(r,5000));
}
// camera dialog: poll and confirm
for(let i=0;i<15;i++){
  const c=await p.evaluate(()=>{
    const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().toLowerCase()==='confirm' && b.offsetParent!==null);
    if(btn){btn.click();return true;} return false;
  });
  if(c){ console.log('camera confirmed'); break; }
  await new Promise(r=>setTimeout(r,4000));
}
await new Promise(r=>setTimeout(r,2000));
await p.evaluate(()=>{
  const btn=[...document.querySelectorAll('button')].find(b=>/skip tutorial/i.test(b.textContent)&&b.offsetParent!==null);
  btn?.click();
});
await new Promise(r=>setTimeout(r,3000));
// close install banner if present
await p.evaluate(()=>{
  const b=[...document.querySelectorAll('button,span')].find(x=>/not now/i.test(x.textContent)&&x.offsetParent!==null);
  b?.click();
});
// back up + strafe so camera frames the body, then walk for a mid-stride shot
await p.keyboard.down('s'); await new Promise(r=>setTimeout(r,1800)); await p.keyboard.up('s');
await new Promise(r=>setTimeout(r,2500));
await p.screenshot({path:'/tmp/ashfinal1.png'});
await p.keyboard.down('w'); await new Promise(r=>setTimeout(r,900));
await p.screenshot({path:'/tmp/ashfinal2.png'});
await p.keyboard.up('w');
await new Promise(r=>setTimeout(r,1500));
await p.screenshot({path:'/tmp/ashfinal3.png'});
await br.close();
console.log('done');
