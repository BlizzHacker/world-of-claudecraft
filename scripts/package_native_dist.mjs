// Post-build transform for the PACKAGED (console/native) client dist.
//
// The website build keeps its hosted fonts and analytics; the packaged client
// runs inside an offline-capable shell (the Xbox WebView2 app serves it from
// https://app.local with no network guarantee), so its entries must be
// self-contained: fonts self-hosted, no Turnstile, no analytics. This script
// rewrites dist/index.html and dist/play.html in place AFTER `npm run build`:
//
//   1. drops the Cloudflare Turnstile loader <script>,
//   2. swaps the Google Fonts preconnects + hosted stylesheet for the
//      committed /fonts/fonts.css (public/fonts/*.woff2 ship in the dist),
//   3. drops the gtag and Meta Pixel blocks whole (comment-delimited),
//
// then verifies no external font/tracker reference survived and packs
// cr-client-dist.tgz with cr-realms excluded (every realm body is lazyPreload
// and fetched on demand; bundling them would add gigabytes the offline
// session never touches).
//
// Run: node scripts/package_native_dist.mjs [outDir]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const outDir = process.argv[2] ?? root;
const tarball = path.join(outDir, 'cr-client-dist.tgz');

function stripEntry(file) {
  const p = path.join(dist, file);
  if (!existsSync(p)) return { file, skipped: true };
  let html = readFileSync(p, 'utf8');
  const before = html.length;

  // 1. Turnstile loader.
  html = html.replace(
    /^<script src="https:\/\/challenges\.cloudflare\.com\/turnstile\/[^"]+"[^>]*><\/script>\r?\n/m,
    '',
  );

  // 2. Hosted fonts -> the committed self-hosted sheet.
  html = html.replace(/^<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\r?\n/m, '');
  html = html.replace(
    /^<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com"[^>]*>\r?\n/m,
    '',
  );
  html = html.replace(
    /^<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">$/m,
    '<link href="/fonts/fonts.css" rel="stylesheet">',
  );

  // 3. Analytics blocks, comment-delimited so the strip stays structural.
  html = html.replace(
    /<!-- Google tag \(gtag\.js\)[\s\S]*?<\/script>\r?\n/,
    '',
  );
  html = html.replace(/<!-- Meta Pixel Code[\s\S]*?<!-- End Meta Pixel Code -->\r?\n/, '');

  writeFileSync(p, html);
  return { file, skipped: false, removed: before - html.length };
}

const results = ['index.html', 'play.html'].map(stripEntry);
for (const r of results) {
  console.log(r.skipped ? `skip ${r.file} (absent)` : `stripped ${r.file}: -${r.removed} bytes`);
}

// Verification: the packaged entries must reference NO external font/tracker
// host, and the local sheet + faces must actually be in the dist.
const residue = [];
for (const f of ['index.html', 'play.html']) {
  const p = path.join(dist, f);
  if (!existsSync(p)) continue;
  const html = readFileSync(p, 'utf8');
  for (const host of [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'challenges.cloudflare.com',
    'googletagmanager.com',
    'connect.facebook.net',
  ]) {
    if (html.includes(host)) residue.push(`${f}: ${host}`);
  }
  if (!html.includes('/fonts/fonts.css')) residue.push(`${f}: missing local fonts.css link`);
}
if (!existsSync(path.join(dist, 'fonts', 'fonts.css'))) residue.push('dist/fonts/fonts.css missing');
if (residue.length) {
  console.error('NOT self-contained:\n' + residue.join('\n'));
  process.exit(1);
}
console.log('self-contained: no external font/tracker hosts in packaged entries');

// Pack, excluding the out-of-band realm store.
// A bare filename with cwd=outDir keeps Windows drive-letter paths out of the
// archive argument (GNU tar reads `C:` as a remote host).
execFileSync('tar', ['czf', path.basename(tarball), '--exclude=./cr-realms', '-C', dist, '.'], {
  stdio: 'inherit',
  cwd: outDir,
});
const mb = (statSync(tarball).size / (1024 * 1024)).toFixed(1);
console.log(`packed ${tarball} (${mb} MB)`);
