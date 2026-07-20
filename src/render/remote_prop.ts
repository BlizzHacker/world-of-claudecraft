export interface RemotePropRef {
  cacheKey: string;
  url: string;
}

const FORGED_RE = /^forged:([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?)$/;
const LIBRARY_RE = /^library:([a-z0-9][a-z0-9_-]{0,31})\/([a-f0-9]{24})$/;

export function remotePropRef(key: string): RemotePropRef | null {
  const forged = FORGED_RE.exec(key);
  if (forged) {
    return {
      cacheKey: key,
      url: `/forged/${forged[1].split('/').map(encodeURIComponent).join('/')}.glb`,
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
