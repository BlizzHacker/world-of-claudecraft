export interface WorldBuilderAssetItem {
  placeKey: string;
  name: string;
  group: string;
}

export interface WorldBuilderAssetGroup {
  id: string;
  label: string;
  items: WorldBuilderAssetItem[];
}

const GROUP_ALIASES: Record<string, string> = {
  'classic realm': 'classic',
  'cryptic realm': 'crypticrealm',
  cryptic: 'crypticrealm',
  'infernal realm': 'infernal',
  'arcane void': 'arcadevoid',
  'arcane nexus': 'arcane',
  claudcraft: 'claudecraft',
  'claude craft': 'claudecraft',
  'd2 koolo': 'd2-koolo',
  picktura: 'piktura',
};

const GROUP_ORDER = [
  'forged',
  'crypticrealm',
  'infernal',
  'classic',
  'arcane',
  'arcadevoid',
  'fps',
  'claudecraft',
  'dominion',
  'exchange',
  'piktura',
  'heroforge',
  'd2-koolo',
];

const GROUP_LABELS: Record<string, string> = {
  forged: 'Generated / Uploaded',
  crypticrealm: 'Cryptic Realm',
  infernal: 'Infernal Realm',
  classic: 'Classic Realm',
  arcane: 'Arcane Nexus',
  arcadevoid: 'Arcane Void',
  fps: 'FPS Realm',
  claudecraft: 'ClaudeCraft',
  dominion: 'Dominion Realm',
  exchange: 'The Exchange',
  piktura: 'PICKTURA',
  heroforge: 'HeroForge',
  'd2-koolo': 'D2-Koolo',
};

export function canonicalBuilderAssetGroup(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return GROUP_ALIASES[normalized] ?? (normalized.replace(/\s+/g, '-') || 'library');
}

export function mergeWorldBuilderAssets(
  current: readonly WorldBuilderAssetItem[],
  incoming: readonly WorldBuilderAssetItem[],
  reset = false,
): WorldBuilderAssetItem[] {
  const merged = new Map<string, WorldBuilderAssetItem>();
  if (!reset) for (const item of current) merged.set(item.placeKey, item);
  for (const item of incoming) {
    if (!item.placeKey || !item.name) continue;
    merged.set(item.placeKey, {
      ...item,
      group: canonicalBuilderAssetGroup(item.group || 'library'),
    });
  }
  return [...merged.values()];
}

export function groupWorldBuilderAssets(
  items: readonly WorldBuilderAssetItem[],
): WorldBuilderAssetGroup[] {
  const grouped = new Map<string, WorldBuilderAssetItem[]>();
  for (const item of items) {
    const id = canonicalBuilderAssetGroup(item.group || 'library');
    const rows = grouped.get(id) ?? [];
    rows.push(item);
    grouped.set(id, rows);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => {
      const aIndex = GROUP_ORDER.indexOf(a);
      const bIndex = GROUP_ORDER.indexOf(b);
      return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex) || a.localeCompare(b);
    })
    .map(([id, rows]) => ({
      id,
      label:
        GROUP_LABELS[id] ??
        id.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      items: rows.sort(
        (a, b) => a.name.localeCompare(b.name) || a.placeKey.localeCompare(b.placeKey),
      ),
    }));
}
