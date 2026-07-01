import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function readRel(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

function walkFiles(relDir: string, keep: (rel: string) => boolean): string[] {
  const absDir = path.join(ROOT, relDir);
  const out: string[] = [];
  for (const name of readdirSync(absDir)) {
    const rel = path.join(relDir, name).replace(/\\/g, '/');
    const abs = path.join(ROOT, rel);
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walkFiles(rel, keep));
    else if (keep(rel)) out.push(rel);
  }
  return out;
}

const publicFiles = [
  'index.html',
  ...walkFiles('public', (rel) => /\.(html|txt|xml|webmanifest)$/.test(rel)),
  ...walkFiles('src/guide', (rel) => /\.(ts|css)$/.test(rel)),
];

const generatedLocaleFiles = [
  ...walkFiles('src/ui/i18n.resolved.generated', (rel) => rel.endsWith('.ts')),
  ...walkFiles('src/admin/i18n.resolved.generated', (rel) => rel.endsWith('.ts')),
];

describe('Cryptic Realm branding guardrails', () => {
  it('does not expose private repo, old Discord, or open-source labels on public surfaces', () => {
    const forbidden = [
      'github.com/BlizzHacker/cryptic-realm',
      'discord.gg/GjhnUsBtw',
      'Open Source Project',
      'View on GitHub',
      'GitHub repository',
      'open-source',
      'open source',
      'worldofcryptic-realm',
    ];
    const failures: string[] = [];
    for (const rel of publicFiles) {
      const text = readRel(rel);
      for (const needle of forbidden) {
        if (text.toLowerCase().includes(needle.toLowerCase())) failures.push(`${rel}: ${needle}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('keeps default generated locale bundles on Cryptic Realm and $CR branding', () => {
    const forbidden = [
      'World of ClaudeCraft',
      'World of Claudecraft',
      'worldofclaudecraft',
      '$WOC',
      'Open Source Project',
      'View on GitHub',
    ];
    const failures: string[] = [];
    for (const rel of generatedLocaleFiles) {
      const text = readRel(rel);
      for (const needle of forbidden) {
        if (text.includes(needle)) failures.push(`${rel}: ${needle}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('ships the Cryptic Realm token and contribution surfaces in the static shell', () => {
    const html = readRel('index.html');
    expect(html).toContain('Tip $CR');
    expect(html).toContain('$CR Contract Address');
    expect(html).toContain('3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv');
    expect(html).toContain('id="nav-btn-contributions"');
    expect(html).toContain('data-i18n="nav.contributions"');
    expect(html).not.toContain('github.com/BlizzHacker/cryptic-realm');
  });
});
