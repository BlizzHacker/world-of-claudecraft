const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2], U='https://infernal.crypticrealm.com';
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
const errs=[]; p.on('pageerror',e=>errs.push(String(e.stack||e.message).slice(0,500)));
// Seed the session BEFORE any app code runs, so restoreSession() sees it at boot.
await p.evaluateOnNewDocument((t)=>{
  localStorage.setItem('woc_session', JSON.stringify({token:t, username:'MOVEWEIGHT'}));
}, T);
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
await new Promise(r=>setTimeout(r,18000));
const s=await p.evaluate(()=>{
  const ul=document.querySelector('#char-list');
  const panels=[...document.querySelectorAll('.panel')].filter(e=>!e.hasAttribute('hidden')).map(e=>e.id);
  return {rows: ul?ul.querySelectorAll('li').length:-1,
          html: ul?ul.innerHTML.slice(0,300):'NO_UL',
          visiblePanels: panels.slice(0,5),
          err:(document.querySelector('#charselect-error')||{}).textContent||''};
});
console.log('visible panels :', JSON.stringify(s.visiblePanels));
console.log('rows           :', s.rows);
console.log('charselect-err :', JSON.stringify(s.err));
console.log('list html      :', JSON.stringify(s.html));
console.log('--- PAGE ERRORS ---'); errs.slice(0,3).forEach(e=>console.log(e));
await p.screenshot({path:'/tmp/auth2.png'});
await br.close();
