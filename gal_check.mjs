const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const br=await puppeteer.launch({executablePath:B,headless:true,args:['--no-sandbox']});
const p=await br.newPage(); await p.setViewport({width:1400,height:900});
const errs=[]; p.on('pageerror',e=>errs.push(String(e.message).slice(0,160)));
await p.goto('https://infernal.crypticrealm.com/cr-realms/review/index.html',{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});
await new Promise(r=>setTimeout(r,7000));
// jump to infernal, then filter to creatures
await p.evaluate(()=>document.querySelector('#realms button[data-r=infernal]')?.click());
await new Promise(r=>setTimeout(r,6000));
const before=await p.evaluate(()=>({cards:document.querySelectorAll('.card').length, kinds:[...document.querySelectorAll('#kinds button')].map(b=>b.textContent.trim().replace(/\s+/g,' '))}));
await p.evaluate(()=>document.querySelector('#kinds button[data-k=creature]')?.click());
await new Promise(r=>setTimeout(r,4000));
const after=await p.evaluate(()=>({cards:document.querySelectorAll('.card').length, imgs:[...document.querySelectorAll('.card img')].filter(i=>i.complete&&i.naturalWidth>0).length, firstName:document.querySelector('.card .nm')?.textContent?.trim()?.slice(0,40), badge:document.querySelector('.card .badge')?.textContent}));
console.log('infernal all:', JSON.stringify(before));
console.log('creatures:', JSON.stringify(after));
console.log('errors:', errs.slice(0,3));
await p.screenshot({path:'/tmp/gal_creatures.png'});
await br.close();
