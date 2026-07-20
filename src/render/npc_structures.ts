export const NPC_STRUCTURE_OBJECT_IDS = {
  town_defense_board: 'town_defense_board',
  skirmish_post: 'skirmish_post',
} as const;

export type NpcStructureTemplateId = keyof typeof NPC_STRUCTURE_OBJECT_IDS;

export function npcStructureObjectId(templateId: string): string | null {
  return NPC_STRUCTURE_OBJECT_IDS[templateId as NpcStructureTemplateId] ?? null;
}
