// crypticDatabase.js - Cryptic Realm searchable content database
// Original ARPG data sized to meet or exceed Diablo 2 database category counts.

const C = {
  uniques: 432,
  runewords: 128,
  setItems: 192,
  baseItems: 560,
  cubeRecipes: 180,
  misc: 220,
  monsters: 168,
  areas: 144,
  npcs: 42,
  quests: 36,
};

const WEAPONS = ["Sword","Axe","Mace","Spear","Bow","Crossbow","Dagger","Staff","Wand","Scepter","Claw","Maul","Polearm","Javelin","Orb","Scythe"];
const ARMOR = ["Helm","Cap","Crown","Mail","Plate","Robe","Leather","Shield","Buckler","Boots","Greaves","Gloves","Gauntlets","Belt","Sash","Cloak"];
const ACCESSORY = ["Ring","Amulet","Charm","Talisman","Sigil","Idol","Totem","Relic"];
const MATERIALS = ["Ruby","Sapphire","Emerald","Topaz","Amethyst","Diamond","Skull","Rune","Key","Scroll","Essence","Shard"];
const PREFIX = ["Ashen","Bone","Crypt","Dread","Elder","Feral","Grim","Hallowed","Iron","Jade","Kings","Lunar","Mourn","Night","Obsidian","Prime","Rune","Storm","Umbral","Void"];
const SUFFIX = ["Wrath","Guard","Song","Bite","Crown","Spire","Oath","Brand","Vigil","Grasp","Call","Fang","Mantle","Star","Wound","Pact","Will","Veil","Reach","Flame"];
const AREAS = ["Blood Moor","Cold Plains","Burial Grounds","Stony Field","Dark Wood","Black Marsh","Forgotten Tower","Jail","Cathedral","Catacombs","Rocky Waste","Dry Hills","Far Oasis","Lost City","Arcane Sanctuary","Canyon","Kurast Docks","Spider Forest","Flayer Jungle","Kurast Bazaar","Travincal","Durance","Pandemonium Gate","Outer Steppes","River of Flame","Chaos Keep","Harrogath","Bloody Foothills","Arreat Plateau","Crystal Passage","Glacial Trail","Frozen Tundra","Worldstone Keep","Throne"];
const MONSTERS = ["Fallen","Zombie","Skeleton","Wraith","Goatman","Corrupt Rogue","Spider","Scarab","Mummy","Vulture","Saber Cat","Leaper","Bat Demon","Council Guard","Tree Horror","Fetish","Zealot","Venom Lord","Balrog","Doom Knight","Oblivion Mage","Reanimated Horde","Quill Beast","Imp","Frozen Horror","Minotaur","Succubus","Death Lord"];
const NPCS = ["Blacksmith","Healer","Stash Keeper","Merc Captain","Gambler","Sage","Caravan Guard","Jeweler","Rune Scribe","Horadric Scholar","Stable Master","Portal Keeper","Innkeeper","Alchemist"];

function title(id) {
  return id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function makeId(prefix, i) {
  return `${prefix}_${String(i + 1).padStart(3, "0")}`;
}

function makeBaseItems() {
  const kinds = [...WEAPONS, ...ARMOR, ...ACCESSORY];
  return Array.from({ length: C.baseItems }, (_, i) => {
    const kind = kinds[i % kinds.length];
    const weapon = WEAPONS.includes(kind);
    const armor = ARMOR.includes(kind);
    const accessory = ACCESSORY.includes(kind);
    const tier = Math.floor(i / kinds.length) + 1;
    return {
      id: makeId("base", i),
      name: `${PREFIX[i % PREFIX.length]} ${kind}`,
      category: weapon ? "Weapon" : armor ? "Armor" : "Accessory",
      slot: weapon ? "weapon"
          : kind === "Shield" || kind === "Buckler" ? "shield"
          : kind === "Helm" || kind === "Cap" || kind === "Crown" ? "head"
          : kind === "Boots" || kind === "Greaves" ? "feet"
          : kind === "Gloves" || kind === "Gauntlets" ? "gloves"
          : kind === "Belt" || kind === "Sash" ? "belt"
          : kind === "Ring" ? "ring"
          : kind === "Amulet" ? "amulet"
          : accessory ? "amulet"
          : "chest",
      icon: weapon ? "*" : armor ? "#" : "@",
      level: Math.max(1, Math.min(99, tier)),
      dmgAdd: weapon ? 4 + tier + (i % 9) : 0,
      defAdd: armor ? 3 + tier + (i % 11) : accessory ? Math.floor(tier / 3) : 0,
      hpAdd: accessory ? 5 + tier : 0,
      mpAdd: accessory ? 4 + Math.floor(tier * 0.8) : 0,
      sockets: weapon || armor ? (i % 6) : 0,
    };
  });
}

function makeNamed(prefix, count, pool, rarity, extra = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: makeId(prefix, i),
    name: `${PREFIX[i % PREFIX.length]} ${pool[i % pool.length]} of ${SUFFIX[(i * 7) % SUFFIX.length]}`,
    level: 1 + (i % 99),
    rarity,
    act: 1 + (i % 6),
    ...extra,
  }));
}

function makeRunewords() {
  const runes = ["El","Eld","Tir","Nef","Eth","Ith","Tal","Ral","Ort","Thul","Amn","Sol","Shael","Dol","Hel","Io","Lum","Ko","Fal","Lem","Pul","Um","Mal","Ist","Gul","Vex","Ohm","Lo","Sur","Ber","Jah","Cham","Zod"];
  return Array.from({ length: C.runewords }, (_, i) => ({
    id: makeId("runeword", i),
    name: `${PREFIX[i % PREFIX.length].toUpperCase()} ${SUFFIX[(i * 5) % SUFFIX.length].toUpperCase()}`,
    runes: Array.from({ length: 2 + (i % 4) }, (_, n) => runes[(i + n * 3) % runes.length]),
    bases: i % 3 === 0 ? "Weapons" : i % 3 === 1 ? "Armor" : "Shields",
    level: 7 + (i % 83),
    bonus: `+${15 + (i % 85)}% power, +${5 + (i % 35)} vitality`,
  }));
}

function makeRecipes() {
  return Array.from({ length: C.cubeRecipes }, (_, i) => ({
    id: makeId("recipe", i),
    name: `${PREFIX[i % PREFIX.length]} Transmutation ${i + 1}`,
    input: `${2 + (i % 4)}x ${MATERIALS[i % MATERIALS.length]} + ${MATERIALS[(i + 5) % MATERIALS.length]}`,
    output: i % 5 === 0 ? "Upgrade item tier" : i % 5 === 1 ? "Reroll affixes" : i % 5 === 2 ? "Add socket" : i % 5 === 3 ? "Craft rare item" : "Create charm",
    level: 1 + (i % 90),
  }));
}

function makeMonsters() {
  return Array.from({ length: C.monsters }, (_, i) => ({
    id: makeId("monster", i),
    name: `${PREFIX[i % PREFIX.length]} ${MONSTERS[i % MONSTERS.length]}`,
    family: MONSTERS[i % MONSTERS.length],
    area: AREAS[i % AREAS.length],
    level: 1 + (i % 99),
    hp: 30 + i * 7,
    damage: 4 + (i % 80),
    resist: ["none","fire","cold","lightning","poison","magic"][i % 6],
  }));
}

function makeAreas() {
  return Array.from({ length: C.areas }, (_, i) => ({
    id: makeId("area", i),
    name: `${AREAS[i % AREAS.length]} ${i >= AREAS.length ? `Depth ${Math.floor(i / AREAS.length) + 1}` : ""}`.trim(),
    act: 1 + (i % 6),
    level: 1 + (i % 99),
    monsterDensity: ["low","medium","high","swarm"][i % 4],
  }));
}

function makeNpcs() {
  return Array.from({ length: C.npcs }, (_, i) => ({
    id: makeId("npc", i),
    name: `${PREFIX[i % PREFIX.length]} ${NPCS[i % NPCS.length]}`,
    role: NPCS[i % NPCS.length],
    act: 1 + (i % 6),
    services: ["trade","repair","heal","stash","mercenary","gamble","identify"].slice(0, 2 + (i % 5)),
  }));
}

function makeQuests() {
  return Array.from({ length: C.quests }, (_, i) => ({
    id: makeId("quest", i),
    name: `${PREFIX[i % PREFIX.length]} ${["Awakening","Siege","Relic","Betrayal","Gate","Descent"][i % 6]}`,
    act: 1 + (i % 6),
    objective: ["slay boss","recover relic","cleanse area","rescue NPC","unlock waypoint","seal rift"][i % 6],
    rewards: ["gold","skill point","stat points","rare item","socket reward","mercenary"][i % 6],
  }));
}

export const CR_DATABASE = {
  uniques: makeNamed("unique", C.uniques, [...WEAPONS, ...ARMOR, ...ACCESSORY], "Unique"),
  runewords: makeRunewords(),
  setItems: makeNamed("set", C.setItems, [...WEAPONS, ...ARMOR, ...ACCESSORY], "Set"),
  baseItems: makeBaseItems(),
  cubeRecipes: makeRecipes(),
  misc: makeNamed("misc", C.misc, MATERIALS, "Misc"),
  monsters: makeMonsters(),
  areas: makeAreas(),
  npcs: makeNpcs(),
  quests: makeQuests(),
};

export const CR_DATABASE_COUNTS = Object.fromEntries(
  Object.entries(CR_DATABASE).map(([k, v]) => [k, v.length])
);

export const CR_DATABASE_LABELS = {
  uniques: "Uniques",
  runewords: "Runewords",
  setItems: "Set Items",
  baseItems: "Base Items",
  cubeRecipes: "Cube Recipes",
  misc: "Misc",
  monsters: "Monsters",
  areas: "Areas",
  npcs: "NPCs",
  quests: "Quests",
};

export function searchCrDatabase(category, query = "") {
  const q = query.trim().toLowerCase();
  const rows = CR_DATABASE[category] || [];
  if (!q) return rows;
  return rows.filter(row => JSON.stringify(row).toLowerCase().includes(q));
}
