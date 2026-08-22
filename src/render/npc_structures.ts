/**
 * NPC entities that are not people.
 *
 * A handful of templates are NPCs only so they can carry a nameplate, a
 * greeting and quest ids: a defense board and a warcamp post. The world already
 * knows they are furniture (`renderer.ts` builds them through
 * `buildGroundQuestObject` and skips them in the prewarm sweep), but every
 * surface that asks the manifest for a BODY instead of a prop, the roster row,
 * the unit frame, the wiki bestiary, was handed a townswoman. Both tables below
 * are keyed off the same template list so the prop and the visual key can never
 * drift apart.
 */
export const NPC_STRUCTURE_OBJECT_IDS = {
  town_defense_board: 'town_defense_board',
  skirmish_post: 'skirmish_post',
} as const;

/**
 * The manifest key each structure renders as, so `visualKeyFor` returns the
 * furniture rather than a person. These point at the SAME GLBs
 * `quest_objects.ts` uses for the ground prop, so the 2D surfaces and the world
 * show the same object.
 */
export const NPC_STRUCTURE_VISUAL_KEYS = {
  town_defense_board: 'npc_signpost',
  skirmish_post: 'npc_camp_tent',
} as const;

export type NpcStructureTemplateId = keyof typeof NPC_STRUCTURE_OBJECT_IDS;

export function npcStructureObjectId(templateId: string): string | null {
  return NPC_STRUCTURE_OBJECT_IDS[templateId as NpcStructureTemplateId] ?? null;
}

/** The manifest key for a structure template, or null when it is a real person. */
export function npcStructureVisualKey(templateId: string): string | null {
  return NPC_STRUCTURE_VISUAL_KEYS[templateId as NpcStructureTemplateId] ?? null;
}
