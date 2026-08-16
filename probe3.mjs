const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2], U=process.argv[3] ?? 'https://infernal.crypticrealm.com';
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
const errs=[], cons=[];
p.on('pageerror',e=>errs.push(String(e.stack||e.message).slice(0,1200)));
p.on('console',m=>{ if(m.type()==='error') cons.push(m.text().slice(0,500)); });
await p.evaluateOnNewDocument((t)=>{
  localStorage.setItem('cryptic-realm_user_token', t);
  localStorage.setItem('cryptic-realm_user_name', 'MOVEWEIGHT');
  localStorage.setItem('woc_session', JSON.stringify({token:t, username:'MOVEWEIGHT'}));
}, T);
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
await new Promise(r=>setTimeout(r,8000));
// Click Play/Continue if the landing is showing.
const clicked = await p.evaluate(()=>{
  const b=document.getElementById('btn-play');
  if(b && b.offsetParent!==null){ b.click(); return 'btn-play'; }
  return 'none';
});
await new Promise(r=>setTimeout(r,20000));
const s=await p.evaluate(()=>{
  const ul=document.querySelector('#char-list');
  const vis=[...document.querySelectorAll('[id]')].filter(e=>{
    if(!/panel|screen|select/i.test(e.id)) return false;
    const st=getComputedStyle(e);
    return !e.hasAttribute('hidden') && st.display!=='none' && st.visibility!=='hidden' && e.offsetParent!==null;
  }).map(e=>e.id);
  return {rows: ul?ul.querySelectorAll('li').length:-1,
          html: ul?ul.innerHTML.slice(0,400):'NO_UL',
          visible: vis.slice(0,12),
          err:(document.querySelector('#charselect-error')||{}).textContent||''};
});
console.log('clicked        :', clicked);
console.log('visible ids    :', JSON.stringify(s.visible));
console.log('rows           :', s.rows);
console.log('charselect-err :', JSON.stringify(s.err));
console.log('list html      :', JSON.stringify(s.html));
console.log('--- PAGE ERRORS ---'); errs.slice(0,4).forEach(e=>console.log(e));
console.log('--- CONSOLE ERRORS ---'); cons.slice(0,12).forEach(e=>console.log(' ',e));
await p.screenshot({path:'/tmp/probe3.png'});
await br.close();
