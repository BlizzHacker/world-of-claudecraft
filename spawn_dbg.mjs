const puppeteer = (await import('puppeteer-core')).default;
const B='/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T=process.argv[2];
const U=`https://dev-infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal%20Dev&realm_id=infernal`;
const br=await puppeteer.launch({executablePath:B,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const p=await br.newPage(); await p.setViewport({width:1600,height:900});
const errs=[], cons=[];
p.on('pageerror',e=>errs.push(String(e.message).slice(0,300)));
p.on('console',m=>{ if(m.type()==='error') cons.push(m.text().slice(0,200)); });
p.on('response',r=>{ if(r.status()>=400 && !/analytics|beacon|google/.test(r.url())) cons.push(`HTTP ${r.status()} ${r.url().slice(0,100)}`); });
await p.goto(U,{waitUntil:'networkidle2',timeout:90000}).catch(()=>{});
await new Promise(r=>setTimeout(r,30000));
const s=await p.evaluate(()=>{
  const ul=document.querySelector('#char-list');
  const vis=[...document.querySelectorAll('[id]')].filter(e=>{
    if(!/panel|screen|select/i.test(e.id)) return false;
    const st=getComputedStyle(e);
    return !e.hasAttribute('hidden') && st.display!=='none' && e.offsetParent!==null;
  }).map(e=>e.id);
  return {rows: ul?ul.querySelectorAll('li').length:-1, html: ul?ul.innerHTML.slice(0,200):'NO_UL',
          visible: vis.slice(0,10), err:(document.querySelector('#charselect-error')||{}).textContent||'',
          realm: document.querySelector('#charselect-realm')?.textContent ?? ''};
});
console.log(JSON.stringify(s,null,1));
console.log('PAGE ERRORS:', errs.slice(0,4));
console.log('CONSOLE/HTTP:', cons.slice(0,10));
await p.screenshot({path:'/tmp/devdbg.png'});
await br.close();
