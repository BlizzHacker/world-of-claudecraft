const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const br=await puppeteer.launch({executablePath:B,headless:true,args:['--no-sandbox']});
const p=await br.newPage(); await p.setViewport({width:1400,height:900});
const errs=[];
p.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
p.on('response',r=>{ if(r.status()>=400 && r.url().includes('cr-realms')) errs.push(`${r.status()} ${r.url().slice(-60)}`); });
await p.goto('https://infernal.crypticrealm.com/cr-realms/review/index.html',{waitUntil:'networkidle2',timeout:60000}).catch(e=>console.log('nav:',String(e).slice(0,80)));
await new Promise(r=>setTimeout(r,6000));
const s=await p.evaluate(()=>({
  cards: document.querySelectorAll('.card').length,
  total: document.getElementById('total')?.textContent ?? '',
  buckets: [...document.querySelectorAll('#buckets button')].map(b=>b.textContent.trim().replace(/\s+/g,' ')).slice(0,12),
  imgsLoaded: [...document.querySelectorAll('.card img')].filter(i=>i.complete&&i.naturalWidth>0).length,
  imgsTotal: document.querySelectorAll('.card img').length,
}));
console.log(JSON.stringify(s,null,1));
console.log('errors:', errs.slice(0,5));
await p.screenshot({path:'/tmp/gallery.png'});
// switch to classic (biggest set) and shoot again
await p.evaluate(()=>document.querySelector('#realms button[data-r=classic]')?.click());
await new Promise(r=>setTimeout(r,7000));
console.log('classic cards:', await p.evaluate(()=>document.querySelectorAll('.card').length));
await p.screenshot({path:'/tmp/gallery2.png'});
await br.close();
