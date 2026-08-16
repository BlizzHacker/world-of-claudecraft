#!/usr/bin/env node
// Turn manifest.generated.ts into probe/render cases: body GLB + mainhand GLB +
// the exact grip assets.ts would compose for that pair.
//
//   node build_cases.mjs --out /tmp/cases.json [--every N] [--limit N]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const REPO = '/opt/cryptic-realm';
const STORE = '/opt/cr-realms-store';
const argv = process.argv;
const arg = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const OUT = arg('out', '/tmp/cases.json');
const EVERY = Number(arg('every', 1));
const LIMIT = Number(arg('limit', Infinity));
const MANIFEST = arg('manifest', `${REPO}/src/render/characters/manifest.generated.ts`);

export function parseManifest(path) {
  const man = readFileSync(path, 'utf8');
  const out = [];
  const re = /^ {2}(realm_[a-z0-9_]+): \{$/gm;
  const starts = [];
  let m;
  while ((m = re.exec(man))) starts.push([m[1], m.index]);
  for (let i = 0; i < starts.length; i++) {
    const [key, at] = starts[i];
    const block = man.slice(at, i + 1 < starts.length ? starts[i + 1][1] : man.length);
    const url = /url: `\$\{REALM_MODELS\}\/([a-z0-9]+)\//.exec(block);
    if (!url) continue;
    const attach = [];
    const are =
      /\{ url: (?:'([^']+)'|`\$\{WEAPONS\}\/([^`]+)`), bone: '([^']+)'(?:, scale: ([0-9.]+))? \}/g;
    let a;
    while ((a = are.exec(block))) {
      attach.push({
        url: a[1] ?? `/models/weapons/${a[2]}`,
        bone: a[3],
        scale: a[4] ? Number(a[4]) : undefined,
      });
    }
    out.push({ key, realm: url[1], attach });
  }
  return out;
}

export function loadArmTables() {
  const src = readFileSync(`${REPO}/src/render/characters/realm_arms.generated.ts`, 'utf8');
  const grips = {};
  {
    const body = src.slice(src.indexOf('REALM_ARM_GRIPS: Record'));
    const re = /^ {2}"([A-Za-z0-9_]+)": \{ scale: ([-0-9.]+), rot: \[([^\]]+)\], pos: \[([^\]]+)\] \},/gm;
    let m;
    while ((m = re.exec(body))) {
      grips[m[1]] = {
        scale: Number(m[2]),
        rot: m[3].split(',').map(Number),
        pos: m[4].split(',').map(Number),
      };
    }
  }
  const families = {};
  {
    const body = src.slice(
      src.indexOf('REALM_ARM_FAMILIES: Record'),
      src.indexOf('REALM_ARM_GRIPS: Record'),
    );
    const re = /^ {2}"([A-Za-z0-9_]+)": '([A-Z_]+)',/gm;
    let m;
    while ((m = re.exec(body))) families[m[1]] = m[2];
  }
  const geo = {};
  const raw = JSON.parse(readFileSync(`${REPO}/scripts/realm_assets/arms_geometry.generated.json`, 'utf8'));
  for (const [k, v] of Object.entries(raw)) geo[k.split('/').pop().replace(/\.glb$/, '')] = v;
  return { grips, families, geo };
}

export function loadWield() {
  const f = `${REPO}/src/render/characters/realm_wield.generated.ts`;
  if (!existsSync(f)) return {};
  const src = readFileSync(f, 'utf8');
  const out = {};
  const re = /^ {2}"([A-Za-z0-9_]+)": ([0-9.]+),/gm;
  let m;
  const body = src.slice(src.indexOf('REALM_WIELD_SCALE'));
  while ((m = re.exec(body))) out[m[1]] = Number(m[2]);
  return out;
}

const VARIANT_LIFT = { VAR_REALM_GUN: 0, VAR_REALM_MELEE: 0 };
const VARIANT_MAXH = { VAR_REALM_GUN: 8, VAR_REALM_MELEE: 8 };

export function buildCases(bodies, tables, wieldTable = {}) {
  const cases = [];
  for (const b of bodies) {
    const main = b.attach.find((x) => x.bone === 'handslot.r');
    if (!main) continue;
    const bodyPath = `/store/${b.realm}/${b.key}.glb`;
    if (!existsSync(`${STORE}/${b.realm}/${b.key}.glb`)) continue;
    const base = main.url.split('/').pop().replace(/\.glb$/, '');
    const family = tables.families[base];
    if (!family) continue; // KayKit fallback: different (non-variant) grip path
    const armPath = main.url.replace(/^\/cr-realms/, '/store');
    if (!existsSync(armPath.replace('/store', STORE))) continue;
    const override = { ...tables.grips[base] };
    if (main.scale !== undefined) override.scale = (override.scale ?? 1) * main.scale;
    cases.push({
      label: b.key,
      realm: b.realm,
      arm: armPath,
      armBase: base,
      body: bodyPath,
      family,
      attachScale: main.scale ?? 1,
      wield: wieldTable[b.key] ?? 1,
      grip: { lift: VARIANT_LIFT[family] ?? 0, maxHeight: VARIANT_MAXH[family] ?? 8, override },
    });
  }
  return cases;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bodies = parseManifest(MANIFEST);
  const tables = loadArmTables();
  const wield = argv.includes('--wield') ? loadWield() : {};
  let cases = buildCases(bodies, tables, wield);
  const total = cases.length;
  if (EVERY > 1) cases = cases.filter((_, i) => i % EVERY === 0);
  if (cases.length > LIMIT) cases = cases.slice(0, LIMIT);
  writeFileSync(OUT, JSON.stringify(cases, null, 1));
  const fam = {};
  for (const c of cases) fam[c.family] = (fam[c.family] ?? 0) + 1;
  console.log(`manifest bodies ${bodies.length}; armed variant-grip cases ${total}; wrote ${cases.length}`, fam);
}
