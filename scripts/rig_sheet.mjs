// Single-body contact sheet: one row per clip, 6 phases across, for bodies that
// are LIVE right now. Renders whatever path you give it, from either the repo
// public dir or the CR_REALMS_DIR store.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { extname, join, normalize, basename } from 'node:path';
const ROOT='/opt/cryptic-realm', OUT='/opt/cr-rig-repair/live-shots', PORT=8913;
mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.glb':'model/gltf-binary','.json':'application/json','.png':'image/png','.bin':'application/octet-stream','.wasm':'application/wasm'};
const srv=createServer((req,res)=>{
  const p=decodeURIComponent(req.url.split('?')[0]);
  let f;
  if(p==='/'||p==='/rigshot.html') f=join(ROOT,'scripts/rigshot/rigshot.html');
  else if(p.startsWith('/store/')) f=join('/opt/cr-realms-store/infernal',normalize(p.slice(7)));
  else if(p.startsWith('/pub/')) f=join(ROOT,'public/cr-realms/infernal',normalize(p.slice(5)));
  else f=join(ROOT,normalize(p));
  if(!existsSync(f)){res.writeHead(404);return res.end('nf');}
  res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});
  res.end(readFileSync(f));
});
await new Promise(r=>srv.listen(PORT,r));
const puppeteer=(await import('puppeteer-core')).default;
const br=await puppeteer.launch({executablePath:'/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
  headless:true,args:['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl']});
const page=await br.newPage(); await page.setViewport({width:500,height:640});
page.on('pageerror',e=>console.log('  pageerror:',e.message));
await page.goto(`http://127.0.0.1:${PORT}/rigshot.html`,{waitUntil:'networkidle2'});
await page.waitForFunction('window.__ready === true',{timeout:60000});

const CLIPS=['Idle','Walk','Attack'];
const PHASES=[0,0.2,0.4,0.6,0.8,0.95];
for(const spec of process.argv.slice(2)){
  const url=spec.startsWith('/')?spec:`/store/${spec}.glb`;
  const name=basename(url).replace(/\.glb$/,'');
  const cells=[];
  let clips=null;
  for(const clip of CLIPS) for(const phase of PHASES){
    try{
      const r=await page.evaluate(a=>window.renderBody(a),{url,clip,phase});
      clips=r.clips; cells.push({clip,phase,...r});
    }catch(e){ console.log(`  ${name} ${clip}@${phase} ERR ${e.message.slice(0,80)}`); }
  }
  if(!cells.length){ console.log(`### ${name}  NO RENDER`); continue; }
  console.log(`### ${name}  clips=[${clips.join(', ')}]`);
  const png=await page.evaluate((cells,W,H,PH)=>{
    const cw=W/2, ch=H/2, cols=PH;
    const c=document.createElement('canvas');
    c.width=cols*cw; c.height=3*ch+24; const g=c.getContext('2d');
    g.fillStyle='#141821'; g.fillRect(0,0,c.width,c.height);
    return Promise.all(cells.map(r=>new Promise(res=>{const im=new Image();im.onload=()=>res({im,r});im.src=r.png;})))
      .then(list=>{ list.forEach(({im,r},i)=>{
        const row=Math.floor(i/cols), col=i%cols;
        g.drawImage(im,col*cw,20+row*ch,cw,ch);
        g.fillStyle='#cfd6e4'; g.font='11px monospace';
        if(col===0){g.fillStyle='#ffd479';g.fillText(r.clip,4,20+row*ch+12);}
      }); return c.toDataURL('image/png'); });
  },cells,420,560,PHASES.length);
  writeFileSync(join(OUT,`${name}.png`),Buffer.from(png.split(',')[1],'base64'));
  console.log(`   -> ${join(OUT,`${name}.png`)}`);
}
await br.close(); srv.close();
