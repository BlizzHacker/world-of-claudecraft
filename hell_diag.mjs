const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1280,height:860});
p.on('dialog', d=>d.accept());
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
for(let i=0;i<30;i++){
  if(await p.evaluate(()=>document.querySelectorAll('#char-list .char-row').length>0)) break;
  await new Promise(r=>setTimeout(r,5000));
}
await p.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>/new character/i.test(x.textContent)&&x.offsetParent!==null);
  b?.click();
});
await new Promise(r=>setTimeout(r,10000));
// switch to Ashen Court
console.log('ashen tab:', await p.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>/ashen court/i.test(x.textContent)&&x.offsetParent!==null);
  if(b){b.click();return 'ok';} return 'MISS';
}));
await new Promise(r=>setTimeout(r,4000));
// dump hell cards: hero ids, asset urls, portrait img presence/loaded
const cards = await p.evaluate(()=>[...document.querySelectorAll('.mini-class')]
  .filter(e=>e.offsetParent!==null)
  .map(e=>({hero:e.dataset.heroId, cls:e.dataset.class, asset:e.dataset.realmAsset||null,
            img:(()=>{const i=e.querySelector('img.mini-class-portrait');return i?(i.complete&&i.naturalWidth>0?'loaded':'broken'):'none';})()})));
console.log('CARDS:', JSON.stringify(cards, null, 0));
// reflow measurement: click through cards, record grid+first-card rects
const rect = () => p.evaluate(()=>{
  const grid=document.querySelector('.mini-class')?.parentElement;
  const g=grid?.getBoundingClientRect(), c=document.querySelector('.mini-class')?.getBoundingClientRect();
  return {g:[Math.round(g?.x??-1),Math.round(g?.y??-1),Math.round(g?.width??-1),Math.round(g?.height??-1)],
          c:[Math.round(c?.x??-1),Math.round(c?.y??-1),Math.round(c?.width??-1),Math.round(c?.height??-1)]};
});
const rects=[await rect()];
for(let i=0;i<4;i++){
  await p.evaluate((n)=>{const cs=[...document.querySelectorAll('.mini-class')].filter(e=>e.offsetParent!==null); cs[n%cs.length]?.click();}, i);
  await new Promise(r=>setTimeout(r,1200));
  rects.push(await rect());
}
console.log('RECTS per click:', JSON.stringify(rects));
await p.screenshot({path:'/tmp/hell_cards.png'});
// click dark paladin card + name + create
await p.evaluate(()=>{
  const c=[...document.querySelectorAll('.mini-class')].find(e=>e.offsetParent!==null && (e.dataset.heroId||'').includes('dark-paladin'));
  c?.click();
});
await new Promise(r=>setTimeout(r,2000));
await p.evaluate(()=>{
  const inp=[...document.querySelectorAll('input')].find(i=>i.offsetParent!==null && /name/i.test(i.placeholder||''));
  inp?.focus();
});
await p.keyboard.type('Vexmourn', {delay:35});
console.log('create:', await p.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>/^create/i.test(x.textContent.trim())&&x.offsetParent!==null&&!x.disabled);
  if(b){b.click();return 'ok';} return 'MISS';
}));
await new Promise(r=>setTimeout(r,9000));
console.log('roster after:', await p.evaluate(()=>[...document.querySelectorAll('#char-list .char-name')].map(e=>e.textContent.trim()).join(',')));
await br.close();
console.log('done');
