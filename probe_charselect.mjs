// Full charselect probe: seed session pre-boot, capture ALL console messages +
// page errors, report screen state, screenshot.
const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2], U=process.argv[3] ?? 'https://infernal.crypticrealm.com';
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
const errs=[], cons=[];
p.on('pageerror',e=>errs.push(String(e.stack||e.message).slice(0,900)));
p.on('console',m=>{ const t=m.type(); if(t==='error'||t==='warning') cons.push(`[${t}] ${m.text().slice(0,400)}`); });
await p.evaluateOnNewDocument((t)=>{
  localStorage.setItem('woc_session', JSON.stringify({token:t, username:'MOVEWEIGHT'}));
}, T);
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
await new Promise(r=>setTimeout(r,20000));
const s=await p.evaluate(()=>{
  const ul=document.querySelector('#char-list');
  const vis=[...document.querySelectorAll('[id]')].filter(e=>{
    if(!/panel|screen/i.test(e.id)) return false;
    const st=getComputedStyle(e);
    return !e.hasAttribute('hidden') && st.display!=='none' && st.visibility!=='hidden';
  }).map(e=>e.id);
  return {rows: ul?ul.querySelectorAll('li').length:-1,
          html: ul?ul.innerHTML.slice(0,300):'NO_UL',
          visible: vis.slice(0,10),
          sess: localStorage.getItem('woc_session') ? 'present' : 'GONE',
          err:(document.querySelector('#charselect-error')||{}).textContent||''};
});
console.log('visible ids    :', JSON.stringify(s.visible));
console.log('session in LS  :', s.sess);
console.log('rows           :', s.rows);
console.log('charselect-err :', JSON.stringify(s.err));
console.log('list html      :', JSON.stringify(s.html));
console.log('--- PAGE ERRORS ---'); errs.slice(0,4).forEach(e=>console.log(e));
console.log('--- CONSOLE ---'); cons.slice(0,15).forEach(e=>console.log(' ',e));
await p.screenshot({path:'/tmp/probe_charselect.png'});
await br.close();
