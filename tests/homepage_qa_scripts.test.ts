import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const seoAuditJs = readFileSync(new URL('../scripts/seo_audit.mjs', import.meta.url), 'utf8');
const homepageVerifyJs = readFileSync(
  new URL('../scripts/homepage_verify.mjs', import.meta.url),
  'utf8',
);

describe('homepage QA scripts', () => {
  it('checks Cryptic production branding and deployed footer versions', () => {
    expect(seoAuditJs).toContain('https://crypticrealm.com/cr_og_square.png');
    expect(seoAuditJs).not.toContain('woc_logo_square.webp');
    expect(homepageVerifyJs).toContain('EXPECTED_APP_VERSION');
    expect(homepageVerifyJs).toContain('Deployed footer version');
    expect(homepageVerifyJs).not.toContain('#project-stats-panel');
  });
});
