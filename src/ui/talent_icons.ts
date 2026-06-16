import { ABILITIES } from '../sim/data';
import type { TalentChoiceOption, TalentEffect, TalentNode } from '../sim/content/talents';
import { iconDataUrl, type IconKind } from './icons';

export interface TalentIconRef {
  kind: Extract<IconKind, 'ability' | 'crest'>;
  id: string;
}

const TALENT_STAT_CREST: Record<string, string> = {
  armorPct: 'talent_armor',
  armor: 'talent_armor',
  crit: 'talent_crit',
  spellPower: 'talent_crit',
  int: 'talent_crit',
  spi: 'talent_crit',
  dodge: 'talent_dodge',
  agi: 'talent_dodge',
  ap: 'talent_ap',
  apPct: 'talent_ap',
  str: 'talent_ap',
  maxHpPct: 'talent_health',
  sta: 'talent_health',
  haste: 'talent_haste',
};

export function talentEffectIconRef(effect: TalentEffect | undefined, kind: TalentNode['kind'] | 'choice'): TalentIconRef {
  const abilityId = effect?.grant?.ability ?? effect?.ability?.[0]?.ability;
  if (abilityId && ABILITIES[abilityId]) return { kind: 'ability', id: abilityId };

  const stat = effect?.stats ? Object.keys(effect.stats)[0] : undefined;
  if (stat) return { kind: 'crest', id: TALENT_STAT_CREST[stat] ?? 'talent_generic' };

  if (effect?.global) return { kind: 'crest', id: effect.global.threatPct ? 'talent_armor' : 'talent_crit' };
  return { kind: 'crest', id: kind === 'choice' ? 'talent_choice' : 'talent_generic' };
}

export function talentNodeIconRef(node: TalentNode): TalentIconRef {
  return talentEffectIconRef(node.effect, node.kind);
}

export function talentChoiceIconRef(choice: TalentChoiceOption): TalentIconRef {
  return talentEffectIconRef(choice.effect, 'choice');
}

export function talentIconDataUrl(ref: TalentIconRef): string {
  return iconDataUrl(ref.kind, ref.id);
}

export function talentNodeIconDataUrl(node: TalentNode): string {
  return talentIconDataUrl(talentNodeIconRef(node));
}

export function talentChoiceIconDataUrl(choice: TalentChoiceOption): string {
  return talentIconDataUrl(talentChoiceIconRef(choice));
}
