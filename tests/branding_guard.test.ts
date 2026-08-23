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

  // The merge silently repointed the Donate button at upstream's Ko-fi and the
  // Discord fallback at upstream's server. Neither was caught: the rules above
  // only cover the OLD fork Discord and the generated bundles. These pin the two
  // constants that decide where a player's money and community clicks actually go.
  it('routes donate and Discord to Cryptic Realm, never upstream', () => {
    const mainTs = readRel('src/main.ts');
    const discordStatus = readRel('src/ui/discord_status.ts');
    for (const [rel, text] of [
      ['src/main.ts', mainTs],
      ['src/ui/discord_status.ts', discordStatus],
    ] as const) {
      expect(text, `${rel} must not route to upstream`).not.toContain('ko-fi.com/worldofclaudecraft');
      expect(text, `${rel} must not route to upstream`).not.toContain(
        'discord.com/invite/worldofclaudecraft',
      );
    }
    expect(mainTs).toContain("const DONATE_URL = '/links.html#btn-tip';");
    expect(mainTs).toContain("const DISCORD_INVITE_URL = 'https://discord.gg/WnxcamHJdh';");
    expect(discordStatus).toContain(
      "export const DEFAULT_DISCORD_INVITE_URL = 'https://discord.gg/WnxcamHJdh';",
    );
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

  it('never references a World-of-ClaudeCraft-named logo/image asset on public surfaces', () => {
    // The crypticrealm-logo.png / cryptic-realm-logo.png files were WOC art and
    // leaked into the header + SEO. They're regenerated as the Cryptic Realm
    // emblem; this guards against a NEW woc_*.webp / woc-logo* reference sneaking
    // back into any served HTML.
    const forbiddenRefs = ['woc_logo', 'woc-logo', 'world-of-claudecraft-logo'];
    const failures: string[] = [];
    for (const rel of publicFiles) {
      const text = readRel(rel).toLowerCase();
      for (const needle of forbiddenRefs) {
        if (text.includes(needle)) failures.push(`${rel}: ${needle}`);
      }
    }
    expect(failures).toEqual([]);
  });

});
