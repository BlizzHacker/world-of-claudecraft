const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const U='http://192.168.0.150:5173/workspace';
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
await p.goto(U,{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});
await new Promise(r=>setTimeout(r,4000));
const clickText = async (txt) => p.evaluate((t)=>{
  const el=[...document.querySelectorAll('button,a,[role=tab],[role=button]')].find(e=>e.textContent.trim().toLowerCase().includes(t.toLowerCase()));
  if(el){el.click();return el.textContent.trim();} return null;
}, txt);
console.log('guest:', await clickText('guest'));
await new Promise(r=>setTimeout(r,6000));
const tabs = await p.evaluate(()=>[...document.querySelectorAll('button,a,[role=tab]')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,50));
console.log('tabs:', JSON.stringify(tabs).slice(0,1200));
// try to open an assets/files/vault/archive tab
for (const t of ['asset','file','vault','archive','media','browse']) {
  const hit = await clickText(t);
  if (hit) { console.log('opened:', hit); break; }
}
await new Promise(r=>setTimeout(r,6000));
const txt = await p.evaluate(()=>document.body.innerText.slice(0,1500));
console.log('--- PAGE TEXT ---'); console.log(txt);
await p.screenshot({path:'/tmp/arcshot2.png'});
await br.close();
