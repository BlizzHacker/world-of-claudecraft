const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl',
        '--host-resolver-rules=MAP arcforge.moveweight.com 192.168.0.150']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
await p.goto('http://arcforge.moveweight.com:5173',{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});
await new Promise(r=>setTimeout(r,5000));
const clickText = async (txt) => p.evaluate((t)=>{
  const el=[...document.querySelectorAll('button,a,[role=tab],[role=button],div[class*=nav]')].find(e=>e.textContent.trim().toLowerCase().startsWith(t.toLowerCase())||e.textContent.trim().toLowerCase()===t.toLowerCase());
  if(el){el.click();return el.textContent.trim().slice(0,40);} return null;
}, txt);
console.log('cc:', await clickText('RPGCharacter Creator'));
await new Promise(r=>setTimeout(r,8000));
console.log('prod:', await clickText('3D PRODUCTION'));
await new Promise(r=>setTimeout(r,3000));
let all = await p.evaluate(()=>[...document.querySelectorAll('button,[role=tab],a')].map(e=>e.textContent.trim()).filter(t=>t&&t.length<45));
console.log('after-prod:', JSON.stringify(all).slice(0,2000));
for (const t of ['Media Archive','Asset Vault','Assets','Vault','Archive','Library','Browser']) {
  const hit = await clickText(t);
  if (hit) { console.log('opened:', hit); await new Promise(r=>setTimeout(r,6000)); break; }
}
const txt = await p.evaluate(()=>document.body.innerText.slice(0,2000));
console.log('--- TEXT ---'); console.log(txt);
await p.screenshot({path:'/tmp/vaultshot3.png'});
await br.close();
