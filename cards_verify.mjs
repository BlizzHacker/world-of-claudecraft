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
await new Promise(r=>setTimeout(r,12000));
await p.screenshot({path:'/tmp/fv_cards1.png'});
// click a card, screenshot again to check for layout shift + Ashen tab
await p.evaluate(()=>{
  const card=[...document.querySelectorAll('.mini-class')].filter(e=>e.offsetParent!==null)[3];
  card?.click();
});
await new Promise(r=>setTimeout(r,3000));
await p.screenshot({path:'/tmp/fv_cards2.png'});
await p.evaluate(()=>{
  const b=[...document.querySelectorAll('button')].find(x=>/ashen court/i.test(x.textContent)&&x.offsetParent!==null);
  b?.click();
});
await new Promise(r=>setTimeout(r,4000));
await p.screenshot({path:'/tmp/fv_cards3.png'});
await br.close();
console.log('done');
