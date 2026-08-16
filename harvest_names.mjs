// Recover names/categories for a Meshy vault creator via the PUBLIC showcase API.
// Union of -created_at and +created_at pagination (deep pages 400 past ~p61).
const UID = process.argv[2];
const OUT = process.argv[3];
const seen = new Map();
for (const sort of ['-created_at', '+created_at']) {
  for (let page = 1; page <= 70; page++) {
    const url = `https://api.meshy.ai/web/public/v2/showcases?publishedByUser=${UID}&pageSize=50&pageNum=${page}&sortBy=${sort}`;
    let d;
    try {
      const r = await fetch(url);
      if (!r.ok) break;
      d = await r.json();
    } catch { break; }
    let items = d?.result ?? d;
    if (items && !Array.isArray(items)) items = items.items ?? [];
    if (!Array.isArray(items) || items.length === 0) break;
    for (const i of items) {
      if (!i.resultId || seen.has(i.resultId)) continue;
      seen.set(i.resultId, {
        id: i.resultId,
        name: i.name || i.objectPrompt || '',
        cats: i.categories || [],
        tris: i.triangleCount ?? null,
        thumb: i.solidThumbnailNoBgUrl || i.thumbnailUrl || null,
      });
    }
    await new Promise(r => setTimeout(r, 250));
  }
}
const fs = await import('node:fs');
fs.writeFileSync(OUT, JSON.stringify([...seen.values()], null, 0));
console.log('harvested', seen.size, 'named showcases ->', OUT);
