const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const U=process.argv[2] ?? 'http://192.168.0.150:5173/workspace';
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
await p.goto(U,{waitUntil:'networkidle2',timeout:60000}).catch(()=>{});
await new Promise(r=>setTimeout(r,6000));
const info=await p.evaluate(()=>({
  url: location.href, title: document.title,
  buttons: [...document.querySelectorAll('button,a,[role=tab]')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,40),
}));
console.log(JSON.stringify(info,null,1).slice(0,1800));
await p.screenshot({path:'/tmp/arcshot.png'});
await br.close();
