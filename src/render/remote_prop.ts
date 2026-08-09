export interface RemotePropRef {
  cacheKey: string;
  url: string;
}

const FORGED_RE = /^forged:([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?)$/;
const LIBRARY_RE = /^library:([a-z0-9][a-z0-9_-]{0,31})\/([a-f0-9]{24})$/;
// Realm asset store: `realm:<realm>/<bucket>/<file>` -> the same
// /cr-realms/<realm>/<bucket>/<file>.glb the character bodies load from. The
// store holds ~1,300 buildings, scenery props, vehicles, ships, mechs and
// turrets that shipped with the game and had no key scheme to reach them.
const REALM_BUCKETS = 'props|buildings|vehicles|ships|mechs|turrets|melee|weapons';
const REALM_RE = new RegExp(
  `^realm:([a-z0-9][a-z0-9_-]{0,31})/(${REALM_BUCKETS})/([A-Za-z0-9_.-]+)$`,
);

export function remotePropRef(key: string): RemotePropRef | null {
  const forged = FORGED_RE.exec(key);
  if (forged) {
    return {
      cacheKey: key,
      url: `/forged/${forged[1].split('/').map(encodeURIComponent).join('/')}.glb`,
    };
  }
  const realm = REALM_RE.exec(key);
  if (realm) {
    return {
      cacheKey: key,
      url: `/cr-realms/${realm[1]}/${realm[2]}/${encodeURIComponent(realm[3])}.glb`,
    };
  }
  const library = LIBRARY_RE.exec(key);
  if (library) {
    return {
      cacheKey: key,
      url: `/asset-library/${library[1]}/${library[2]}.glb`,
    };
  }
  return null;
}
