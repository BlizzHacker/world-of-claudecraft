// assetManifest.js — runtime-loaded asset manifest.
// The full manifest data lives in /classic/asset-manifest.json (fetched once,
// cached in-memory) so it never enters the JS bundle or git history.
// findAssetSlot stays SYNCHRONOUS: it serves from the cache, returning null
// (→ procedural fallback in the engine) until preloadAssetManifest() resolves.

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
