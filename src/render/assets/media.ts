import { assetHostUrl } from '../../client_origin';
import { MEDIA_ASSETS } from './manifest.generated';

function logicalPath(url: string): string {
  return url.replace(/^\/+/, '');
}

// assetHostUrl is the shared remote-asset-origin policy (src/client_origin.ts):
// identity on the website/native/desktop builds, and an absolute
// https://crypticrealm.com prefix for bundles that ship no public/ tree of
// their own (the Facebook Instant Games build).
export function assetUrl(url: string): string {
  const logical = logicalPath(url);
  if (import.meta.env.DEV) return `/${logical}`;
  return assetHostUrl(MEDIA_ASSETS[logical] ?? `/${logical}`);
}
