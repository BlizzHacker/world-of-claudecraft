const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const br=await puppeteer.launch({executablePath:B,headless:true,args:['--no-sandbox']});
const p=await br.newPage(); await p.setViewport({width:1400,height:900});
await p.goto('https://infernal.crypticrealm.com/cr-realms/review/index.html',{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});
await new Promise(r=>setTimeout(r,9000));
const s=await p.evaluate(()=>({
  cards: document.querySelectorAll('.card').length,
  texChecked: document.getElementById('tex')?.checked,
  texInfo: document.getElementById('texinfo')?.textContent,
  firstSrc: document.querySelector('.card img')?.src?.slice(-45) ?? null,
  loaded: [...document.querySelectorAll('.card img')].filter(i=>i.complete&&i.naturalWidth>0).length,
}));
console.log('TEXTURED ON:', JSON.stringify(s));
await p.screenshot({path:'/tmp/tex_on.png'});
// flip to solid
await p.evaluate(()=>{const c=document.getElementById('tex'); c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true}));});
await new Promise(r=>setTimeout(r,6000));
console.log('SOLID:', await p.evaluate(()=>document.querySelector('.card img')?.src?.slice(-45) ?? null));
await p.screenshot({path:'/tmp/tex_off.png'});
await br.close();
