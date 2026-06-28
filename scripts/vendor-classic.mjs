import { existsSync, copyFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const SRC = '//192.168.0.5/lvm_shared/moveweight-ui/src';
const DST = resolve('src/classic/engine');
mkdirSync(DST, { recursive: true });

const seen = new Set();
const queue = ['CrypticRealmGame.js'];
const unresolved = [];

function importsOf(code) {
  const re = /(?:from|import)\s+['"](\.\.?\/[^'"]+)['"]/g;
  const out = []; let m;
  while ((m = re.exec(code))) out.push(m[1]);
  return out;
}

while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  seen.add(rel);
  const from = join(SRC, rel);
  if (!existsSync(from)) { unresolved.push(rel); continue; }
  const to = join(DST, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  for (const imp of importsOf(readFileSync(from, 'utf8'))) {
    // only follow .js/.jsx engine siblings here; .jsx overlays handled in Task 3
    let target = imp.replace(/^\.\//, '');
    if (!/\.[jt]sx?$/.test(target)) target += '.js';
    if (target.endsWith('.jsx')) continue; // overlays are vendored separately
    queue.push(target.replace(/^\.\.\//, ''));
  }
}
console.log('Copied', seen.size - unresolved.length, 'files');
if (unresolved.length) { console.error('UNRESOLVED:', unresolved); process.exit(1); }
