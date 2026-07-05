export interface IWorldInteraction {
  interact(): void;
  lootCorpse(id: number): void;
  autoLoot(id: number): void;
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
}
