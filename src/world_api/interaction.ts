export interface IWorldInteraction {
  interact(): void;
  lootCorpse(id: number): void;
  pickUpObject(id: number): void;
  // ArcForge world builder (admin/mod only; server re-validates the role).
  // Downstream (Cryptic Realm) extension: live prop placement + music/voice-on-props.
  placeProp(key: string, x: number, z: number, yaw: number, scale: number): void;
  moveProp(dbId: number, x: number, z: number, yaw: number, scale: number): void;
  removeProp(dbId: number): void;
  setPropMeta(dbId: number, meta: { dialogue?: string; music?: string; voice?: string }): void;
}
