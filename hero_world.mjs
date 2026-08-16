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
console.log('create-panel:', await p.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>/new character/i.test(x.textContent)&&x.offsetParent!==null);
  if(b){b.click();return 'ok';} return 'NO_BTN';
}));
await new Promise(r=>setTimeout(r,8000));
// pick Barbarian card
console.log('pick:', await p.evaluate(()=>{
  const card=[...document.querySelectorAll('button,[role=option],li,div')]
    .filter(e=>e.offsetParent!==null && /^barbarian/i.test(e.textContent.trim()) && e.textContent.length<80);
  if(card[0]){card[0].click();return 'ok';} return 'MISS';
}));
await new Promise(r=>setTimeout(r,40000));
await p.screenshot({path:'/tmp/hero_prev.png'});
// name + create
await p.evaluate(()=>{
  const inp=[...document.querySelectorAll('input')].find(i=>i.offsetParent!==null && /name/i.test(i.placeholder||''));
  if(inp){ inp.focus(); }
});
await p.keyboard.type('Ashfang', {delay:40});
console.log('createbtn:', await p.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>/^create/i.test(x.textContent.trim())&&x.offsetParent!==null&&!x.disabled);
  if(b){b.click();return 'ok';} return 'MISS:'+[...document.querySelectorAll('button')].filter(x=>x.offsetParent!==null).map(x=>x.textContent.trim()).slice(0,12).join('|');
}));
await new Promise(r=>setTimeout(r,10000));
// back on charselect: select Ashfang, enter world
console.log('select:', await p.evaluate(()=>{
  const row=[...document.querySelectorAll('#char-list .char-row')]
    .find(r=>r.querySelector('.char-name')?.textContent.trim()==='Ashfang');
  if(!row) return 'NO_ROW:'+[...document.querySelectorAll('#char-list .char-name')].map(e=>e.textContent.trim()).join(',');
  row.click(); return 'ok';
}));
await new Promise(r=>setTimeout(r,3000));
console.log('enter:', await p.evaluate(()=>{
  const b=document.getElementById('btn-charselect-enter');
  if(b && b.offsetParent!==null && !b.disabled){ b.click(); return 'shared'; }
  const eb=document.querySelector('#char-list .char-row.sel .enter-world-btn');
  if(eb){ eb.click(); return 'row-btn'; }
  return 'NONE';
}));
for(let i=0;i<36;i++){
  if(await p.evaluate(()=>!!document.getElementById('ui'))) break;
  await new Promise(r=>setTimeout(r,5000));
}
await new Promise(r=>setTimeout(r,25000));
// dismiss camera dialog (poll)
for(let i=0;i<10;i++){
  const c=await p.evaluate(()=>{
    const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().toLowerCase()==='confirm' && b.offsetParent!==null);
    if(btn){btn.click();return true;} return false;
  });
  if(c) break;
  await new Promise(r=>setTimeout(r,4000));
}
await new Promise(r=>setTimeout(r,4000));
// walk backwards a bit so the camera shows the character, then shots
await p.keyboard.down('s'); await new Promise(r=>setTimeout(r,1500)); await p.keyboard.up('s');
await new Promise(r=>setTimeout(r,3000));
await p.screenshot({path:'/tmp/hero_world1.png'});
await p.keyboard.down('w'); await new Promise(r=>setTimeout(r,2000)); await p.keyboard.up('w');
await p.screenshot({path:'/tmp/hero_world2.png'});
await br.close();
console.log('done');
