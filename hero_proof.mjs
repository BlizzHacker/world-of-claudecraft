const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
let rows=0;
for(let i=0;i<30;i++){
  rows=await p.evaluate(()=>document.querySelectorAll('#char-list .char-row').length);
  if(rows>0) break;
  await new Promise(r=>setTimeout(r,5000));
}
console.log('rows:', rows);
// open character create
console.log('create:', await p.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>/new character/i.test(x.textContent)&&x.offsetParent!==null);
  if(b){b.click();return 'clicked';} return 'NO_BTN';
}));
await new Promise(r=>setTimeout(r,12000));
// list hero choices present
const choices = await p.evaluate(()=>
  [...document.querySelectorAll('[data-class],[data-hero],.class-choice,.hero-card')]
    .map(e=>e.textContent.trim().slice(0,30)).filter(Boolean).slice(0,40));
console.log('choices:', JSON.stringify(choices).slice(0,800));
await p.screenshot({path:'/tmp/heroes1.png'});
// click a few new-body heroes and screenshot the 3D preview
const pick = async (name, shot) => {
  const hit = await p.evaluate((n)=>{
    const els=[...document.querySelectorAll('button,[role=option],[data-class],[data-hero],.class-choice,.hero-card,li,div')]
      .filter(e=>e.offsetParent!==null && e.textContent.trim().toLowerCase()===n.toLowerCase());
    if(els[0]){ els[0].click(); return 'ok'; }
    const loose=[...document.querySelectorAll('button,[role=option],li')].find(e=>e.offsetParent!==null && e.textContent.trim().toLowerCase().includes(n.toLowerCase()));
    if(loose){ loose.click(); return 'loose'; }
    return 'MISS';
  }, name);
  await new Promise(r=>setTimeout(r,9000));
  await p.screenshot({path:shot});
  console.log('pick', name, ':', hit);
};
await pick('Barbarian', '/tmp/heroes_barb.png');
await pick('Horned Demon', '/tmp/heroes_demon.png');
await pick('Witch Doctor', '/tmp/heroes_wd.png');
await br.close();
console.log('done');
