export interface IWorldInteraction {
  interact(): void;
  lootCorpse(id: number): void;
  autoLoot(id: number): void;
  // `components`: the player's per-corpse focus pick (#1142), which tagged
  // component(s) to extract. Omitted, empty, or covering every tagged
  // component all spread the harvest across every tag (pre-#1142 behavior).
  harvestCorpse(id: number, components?: string[]): void;
  pickUpObject(id: number): void;
  // D2 waypoint travel: teleport to a waypoint the player has already discovered
  // (validated server-side). Driven by the waypoint travel menu.
  waypointTravel(waypointId: string): void;
  // ArcForge world builder (admin/mod only; server re-validates the role).
  // Downstream (Cryptic Realm) extension: live prop placement + music/voice-on-props.
  placeProp(key: string, x: number, z: number, yaw: number, scale: number): void;
  moveProp(dbId: number, x: number, z: number, yaw: number, scale: number): void;
  removeProp(dbId: number): void;
  setPropMeta(dbId: number, meta: { dialogue?: string; music?: string; voice?: string }): void;
  // #1143: the caller's persistent town focus allocation (component type ->
  // points spent). Empty when unset.
  townFocus: Record<string, number>;
  // Sets the persistent town focus allocation. Rejected (out of town,
  // malformed, over the point budget) server-side; the previous allocation is
  // kept and a toast is shown.
  setTownFocus(allocation: Record<string, number>): void;
}
