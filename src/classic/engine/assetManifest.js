// assetManifest.js — runtime-loaded asset manifest.
// Data lives in /classic/asset-manifest.json (fetched once, cached) so it
// never enters the JS bundle or git. findAssetSlot stays synchronous and
// returns null (→ procedural fallback) until preloadAssetManifest resolves.

let MANIFEST = { bySlot: {} };
let _loading = null;

export function preloadAssetManifest(base = '/classic/asset-manifest.json') {
  if (_loading) return _loading;
  _loading = (typeof fetch === 'function'
    ? fetch(base).then(r => (r.ok ? r.json() : null)).catch(() => null)
    : Promise.resolve(null)
  ).then((data) => { if (data) MANIFEST = data; return MANIFEST; });
  return _loading;
}

export function findAssetSlot(slot, tier, kind) {
  const bucket = MANIFEST.bySlot?.[slot] || {};
  const exact = tier && bucket[tier]?.find(asset => !kind || asset.kind === kind);
  if (exact) return exact;
  const ordered = [tier, "128bit", "64bit", "32bit", "16bit", "model", "image", "archive"].filter(Boolean);
  for (const key of ordered) {
    const hit = bucket[key]?.find(asset => !kind || asset.kind === kind);
    if (hit) return hit;
  }
  return null;
}
