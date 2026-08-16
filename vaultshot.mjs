const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
await p.goto('http://192.168.0.150:5173',{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});
await new Promise(r=>setTimeout(r,4000));
const clickText = async (txt) => p.evaluate((t)=>{
  const el=[...document.querySelectorAll('button,a,[role=tab],[role=button]')].find(e=>e.textContent.trim().toLowerCase().includes(t.toLowerCase()));
  if(el){el.click();return el.textContent.trim();} return null;
}, txt);
console.log('nav:', await clickText('Character Creator'));
await new Promise(r=>setTimeout(r,8000));
const tabs = await p.evaluate(()=>[...document.querySelectorAll('button,[role=tab]')].map(e=>e.textContent.trim()).filter(t=>t&&t.length<40).slice(0,60));
console.log('tabs:', JSON.stringify(tabs).slice(0,1500));
for (const t of ['Media Archive','Asset','Vault','Archive','Browser','Files']) {
  const hit = await clickText(t);
  if (hit) { console.log('opened:', hit); break; }
}
await new Promise(r=>setTimeout(r,5000));
const txt = await p.evaluate(()=>document.body.innerText.slice(0,1200));
console.log('--- TEXT ---'); console.log(txt);
await p.screenshot({path:'/tmp/vaultshot.png'});
await br.close();
