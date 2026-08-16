const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2], U=process.argv[3] ?? 'https://infernal.crypticrealm.com';
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
const bad=[];
p.on('requestfailed',r=>bad.push(`FAIL ${r.method()} ${r.url().slice(0,120)} :: ${r.failure()?.errorText}`));
p.on('response',r=>{ if(r.status()>=400) bad.push(`${r.status()} ${r.request().method()} ${r.url().slice(0,120)}`); });
await p.evaluateOnNewDocument((t)=>{
  localStorage.setItem('woc_session', JSON.stringify({token:t, username:'MOVEWEIGHT'}));
}, T);
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
await new Promise(r=>setTimeout(r,15000));
console.log('--- BAD REQUESTS ---'); bad.slice(0,25).forEach(e=>console.log(e));
await br.close();
