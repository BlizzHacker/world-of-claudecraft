// Harvest BOTH thumbnail variants per asset: solid (gray clay) + textured.
import fs from 'node:fs';
const CREATORS = {
  xscorn: '00bebeb0-98d3-4f74-ba2b-be05c1734156',
  pastor: '0c8d01fb-46ae-4a5e-8a22-1c2af815c575',
  picktura: 'bc818cc1-2553-41fc-a4d3-318d871e0ada',
};
const map = {}; // solidUrl -> texUrl   (+ id -> texUrl)
let n = 0;
for (const [who, uid] of Object.entries(CREATORS)) {
  for (const sort of ['-created_at', '+created_at']) {
    for (let page = 1; page <= 70; page++) {
      let d;
      try {
        const r = await fetch(`https://api.meshy.ai/web/public/v2/showcases?publishedByUser=${uid}&pageSize=50&pageNum=${page}&sortBy=${sort}`);
        if (!r.ok) break;
        d = await r.json();
      } catch { break; }
      let items = d?.result ?? d;
      if (items && !Array.isArray(items)) items = items.items ?? [];
      if (!Array.isArray(items) || items.length === 0) break;
      for (const i of items) {
        const tex = i.thumbnailNoBgUrl || i.thumbnailUrl || null;
        if (!tex) continue;
        const solid = i.solidThumbnailNoBgUrl || i.solidThumbnailUrl || null;
        if (solid) map[solid] = tex;
        if (i.resultId) map['id:' + i.resultId] = tex;
        n++;
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }
  console.log(who, 'done, entries so far:', Object.keys(map).length);
}
fs.writeFileSync('/opt/cryptic-realm/tmp/thumb_tex_map.json', JSON.stringify(map));
console.log('TOTAL rows seen', n, '| map keys', Object.keys(map).length);
