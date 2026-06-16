import { MEDIA_ASSETS } from './manifest.generated';

function logicalPath(url: string): string {
  return url.replace(/^\/+/, '');
}

export function assetUrl(url: string): string {
  const logical = logicalPath(url);
  if (import.meta.env.DEV) return `/${logical}`;
  return MEDIA_ASSETS[logical] ?? `/${logical}`;
}
