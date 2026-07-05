// One raid's lockout as projected to the HUD: the dungeon id plus the time left
// until it unlocks. The seam only ever surfaces still-locked raids.
export interface RaidLockout {
  id: string;
  msRemaining: number;
}

export interface IWorldDungeons {
  enterDungeon(dungeonId: string): void;
  leaveDungeon(): void;
  // Leave the current building interior (talk-to-leave via the resident NPC's dialog).
  // Server-authoritative; no-op when the player is not inside an interior room.
  leaveInterior(): void;
  // Still-locked raids for the local player (unlock countdown in ms), driving the
  // minimap raid-lockout badge + panel. Empty when nothing is locked.
  raidLockouts(): RaidLockout[];
}
