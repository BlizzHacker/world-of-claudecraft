// mwAssetSystem.js — Universal Multi-Tier Asset System for MoveWeight Universe
// Establishes 16bit/32bit/64bit/128bit asset tiers as the standard for ALL games.
// Same pattern as Cryptic Realm's CR_QUALITY_TIERS but universal.
//
// Quality mapping:
//   low    → 16bit (32×32 pixel art, retro NES/SNES feel)
//   medium → 32bit (64×64 pixel art, GBA/16-bit era)
//   high   → 64bit (128×128 detailed pixel art, PS1/N64 feel)
//   ultra  → 128bit (256×256 high-res sprites, modern pixel art)

const BASE = '/game-sprites';

export const MW_QUALITY_TIERS = {
  low:    '16bit',
  medium: '32bit',
  high:   '64bit',
  ultra:  '128bit',
};

export const MW_TIER_RESOLUTION = {
  '16bit':  32,
  '32bit':  64,
  '64bit':  128,
  '128bit': 256,
};

// ── Game Asset Registry ──────────────────────────────────────────────────────
export const GAME_SPRITE_REGISTRY = {
  swarm: {
    name: 'Nova Swarm', style: 'sci-fi neon',
    sprites: {
      player: { desc: 'neon blue fighter ship, top-down view, glowing engines' },
      enemy_drone: { desc: 'small red alien drone, angular, menacing' },
      enemy_swarmer: { desc: 'purple swarm creature, insectoid' },
      enemy_elite: { desc: 'large orange elite alien ship, armored' },
      boss: { desc: 'massive alien mothership, purple and red, tentacles' },
      laser: { desc: 'cyan laser bolt, glowing energy projectile' },
      missile: { desc: 'orange homing missile with exhaust trail' },
      powerup_spread: { desc: 'green spread-shot powerup icon, glowing orb' },
      powerup_shield: { desc: 'blue shield powerup icon, hexagonal barrier' },
      powerup_bomb: { desc: 'red mega-bomb powerup icon, explosive' },
      asteroid: { desc: 'gray rocky asteroid, cratered surface' },
      explosion: { desc: 'orange explosion burst, particle effect frame' },
    }
  },
  runner: {
    name: 'Void Runner', style: 'synthwave tunnel',
    sprites: {
      player: { desc: 'sleek silver speeder ship, side view, afterburner glow' },
      obstacle_cube: { desc: 'neon pink wireframe cube obstacle, glowing edges' },
      obstacle_wall: { desc: 'electric blue energy wall barrier' },
      obstacle_mine: { desc: 'red pulsing space mine, spiked sphere' },
      coin: { desc: 'golden energy orb collectible, sparkle effect' },
      boost_pad: { desc: 'green speed boost arrow on track' },
      rail_track: { desc: 'neon grid rail track segment, perspective lines' },
      boss: { desc: 'massive chrome pursuit drone, red scanning laser' },
      shield: { desc: 'translucent blue energy shield pickup' },
      explosion: { desc: 'white-blue energy burst explosion' },
    }
  },
  tower: {
    name: 'Starguard', style: 'sci-fi military',
    sprites: {
      tower_gun: { desc: 'twin-barrel auto turret, metallic gray, green targeting laser' },
      tower_laser: { desc: 'red laser tower, focused beam emitter' },
      tower_missile: { desc: 'missile launcher turret, quad tubes, orange warheads' },
      tower_freeze: { desc: 'cryo tower, blue ice crystal emitter' },
      tower_sniper: { desc: 'long-range railgun tower, purple charge coil' },
      enemy_grunt: { desc: 'small alien foot soldier, green skin, rifle' },
      enemy_tank: { desc: 'heavy armored alien walker, slow, thick armor' },
      enemy_fast: { desc: 'fast alien scout, sleek, multiple legs' },
      enemy_boss: { desc: 'giant alien siege beast, massive, glowing weak point' },
      base: { desc: 'human outpost base, dome with shields' },
      explosion: { desc: 'orange explosion burst frame' },
    }
  },
  explore: {
    name: 'Deep Explorer', style: 'cosmic exploration',
    sprites: {
      player: { desc: 'white exploration vessel, sleek, sensor array on nose' },
      planet_rocky: { desc: 'brown rocky planet, cratered surface, thin atmosphere' },
      planet_gas: { desc: 'swirling gas giant, orange and blue bands' },
      planet_ice: { desc: 'blue-white ice planet, frozen rings' },
      planet_lava: { desc: 'red volcanic planet, lava rivers visible from orbit' },
      station: { desc: 'space station, rotating ring, docking bays' },
      anomaly: { desc: 'purple space anomaly, swirling energy vortex' },
      artifact: { desc: 'golden alien artifact, geometric shape, glowing runes' },
      nebula_bg: { desc: 'colorful nebula background tile, cosmic clouds' },
      fuel_cell: { desc: 'green energy fuel cell pickup' },
    }
  },
  diabl0hub: {
    name: 'Diabl0 Hub', style: 'gothic launcher UI',
    sprites: {
      diabl0_hub_d1: { desc: 'Diablo 1 logo/banner art, gothic cathedral, dark red' },
      diabl0_hub_d2: { desc: 'Diablo 2 logo/banner art, Worldstone keep, purple' },
      diabl0_hub_wiki: { desc: 'Wiki icon/art, ancient tome with golden runes' },
      diabl0_hub_bg: { desc: 'Dark background art, hellish landscape, ember glow' },
      diabl0_tristram: { desc: 'Tristram village scene, dark cottages, cathedral spire' },
      diabl0_andariel: { desc: 'Act 1 boss Andariel, demon queen, poison green' },
      diabl0_diablo: { desc: 'Lord of Terror Diablo, red demon, horns, fire' },
      diabl0_baal: { desc: 'Lord of Destruction Baal, blue crystal, ice demon' },
    }
  },
  d2engine: {
    name: 'Diablo 2 Engine', style: 'isometric dark fantasy ARPG',
    sprites: {
      d2_amazon: { desc: 'Diablo 2 Amazon class, bow warrior woman, red hair, leather armor, isometric' },
      d2_sorceress: { desc: 'Diablo 2 Sorceress class, blue robed mage, casting pose, isometric' },
      d2_necromancer: { desc: 'Diablo 2 Necromancer class, dark robes, skull staff, pale skin, isometric' },
      d2_paladin: { desc: 'Diablo 2 Paladin class, golden plate armor, shield, holy warrior, isometric' },
      d2_barbarian: { desc: 'Diablo 2 Barbarian class, muscular warrior, war paint, dual axes, isometric' },
      d2_druid: { desc: 'Diablo 2 Druid class, fur cloak, nature magic, wolf companion, isometric' },
      d2_assassin: { desc: 'Diablo 2 Assassin class, sleek black outfit, dual blades, martial arts, isometric' },
      d2_fallen: { desc: 'Fallen One demon, small red imp creature, primitive weapon, Diablo monster' },
      d2_zombie: { desc: 'Zombie undead, rotting green corpse, shambling, Diablo monster' },
      d2_skeleton: { desc: 'Skeleton warrior, bones and rusty armor, sword and shield, Diablo monster' },
      d2_dark_archer: { desc: 'Dark archer enemy, purple cloaked, shadow bow, Diablo monster' },
      d2_shaman: { desc: 'Shaman caster enemy, blue robed, bone staff, tribal, Diablo monster' },
      d2_brute: { desc: 'Brute enemy, massive muscular beast, war hammer, Diablo monster' },
      d2_wraith: { desc: 'Wraith ghost enemy, translucent blue spirit, floating, ethereal, Diablo' },
      d2_demon: { desc: 'Demon enemy, red skinned fiend, horns, claws, hellfire, Diablo monster' },
      d2_boss_andariel: { desc: 'Andariel boss, demon queen of anguish, poison green, spider legs, Diablo 2' },
      d2_boss_duriel: { desc: 'Duriel boss, Lord of Pain, massive maggot demon, desert, Diablo 2' },
      d2_boss_mephisto: { desc: 'Mephisto boss, Lord of Hatred, skeletal demon, purple energy, Diablo 2' },
      d2_boss_diablo: { desc: 'Diablo boss, Lord of Terror, red demon lord, horns, hellfire, Diablo 2' },
      d2_baal: { desc: 'Baal boss, Lord of Destruction, blue crystal demon, ice, Diablo 2' },
      d2_wall: { desc: 'isometric dungeon wall tile, stone bricks, dark, mossy, top-down 3D' },
      d2_floor: { desc: 'isometric dungeon floor tile, stone flagstone, worn, dark, top-down 3D' },
      d2_portal: { desc: 'blue town portal swirl, magical teleport circle, Diablo 2' },
      d2_stairs: { desc: 'dungeon staircase, stone steps descending into darkness, isometric' },
      d2_health_potion: { desc: 'red health potion flask, glowing liquid, Diablo item' },
      d2_mana_potion: { desc: 'blue mana potion flask, glowing liquid, Diablo item' },
      d2_town_portal: { desc: 'town portal scroll, blue magical parchment, Diablo item' },
      d2_gold: { desc: 'gold coin pile, shiny treasure, Diablo currency' },
    }
  },
  diabl0net: {
    name: 'Nethercrawler', style: 'dark fantasy dungeon',
    sprites: {
      player: { desc: 'hooded dungeon explorer, sword and torch, side view' },
      skeleton: { desc: 'animated skeleton warrior, rusty armor, glowing eyes' },
      bat: { desc: 'giant cave bat, leathery wings, red eyes' },
      slime: { desc: 'green toxic slime blob, dripping acid' },
      demon: { desc: 'red demon with horns, flaming whip, menacing' },
      ghost: { desc: 'translucent blue ghost, floating, tattered robes' },
      boss_lich: { desc: 'undead lich king, dark crown, necrotic aura' },
      boss_dragon: { desc: 'ancient black dragon, coiled, breathing shadow fire' },
      chest: { desc: 'ornate treasure chest, golden trim, locked' },
      potion_hp: { desc: 'red health potion in glass flask' },
      potion_mana: { desc: 'blue mana potion in glass flask' },
      key: { desc: 'golden dungeon key, ornate bow' },
      torch: { desc: 'wall-mounted torch, flickering flame' },
      dungeon_wall: { desc: 'stone dungeon wall block, mossy, cracked' },
      dungeon_floor: { desc: 'stone dungeon floor tile, worn flagstone' },
    }
  },
  rts: {
    name: 'Nexus Command', style: 'military sci-fi RTS',
    sprites: {
      hq: { desc: 'command headquarters building, reinforced, antenna' },
      barracks: { desc: 'troop barracks, military structure' },
      factory: { desc: 'vehicle factory, assembly line visible' },
      turret: { desc: 'defensive turret, rotating gun' },
      soldier: { desc: 'infantry soldier, rifle, green uniform' },
      tank: { desc: 'heavy battle tank, cannon, armored' },
      scout: { desc: 'fast scout vehicle, light armor' },
      enemy_soldier: { desc: 'red-uniform enemy infantry' },
      enemy_tank: { desc: 'red enemy heavy tank' },
      resource: { desc: 'blue crystal resource node, glowing' },
    }
  },
  fighter: {
    name: 'Galaxy Kombat', style: 'arcade fighting',
    sprites: {
      player: { desc: 'martial arts fighter, blue gi, fighting stance, pixel art' },
      enemy1: { desc: 'red ninja fighter, dual blades, aggressive stance' },
      enemy2: { desc: 'heavy wrestler, muscular, purple trunks' },
      enemy3: { desc: 'cyborg fighter, metal arm, glowing eye' },
      boss: { desc: 'final boss, masked warlord, golden armor, imposing' },
      fireball: { desc: 'orange energy fireball projectile' },
      uppercut_fx: { desc: 'impact burst effect, uppercut hit' },
      health_bar: { desc: 'red health bar segment' },
      arena_bg: { desc: 'fighting arena background, crowd, spotlights' },
    }
  },
  patrol: {
    name: 'Mega Patrol', style: 'action platformer',
    sprites: {
      player: { desc: 'armored space marine, jetpack, rifle, running pose' },
      enemy_grunt: { desc: 'alien foot soldier, green, crouching' },
      enemy_flyer: { desc: 'flying alien drone, hovering, shooting' },
      enemy_heavy: { desc: 'large armored alien brute, slow, powerful' },
      boss: { desc: 'alien warlord mech suit, multiple weapons' },
      platform: { desc: 'metal platform tile, industrial, rivets' },
      crate: { desc: 'destructible supply crate, wooden' },
      ammo: { desc: 'ammo pickup, yellow box' },
      health: { desc: 'health pickup, red cross medkit' },
      jetpack_flame: { desc: 'orange jetpack flame effect' },
    }
  },
  comix: {
    name: 'Street Comix', style: 'comic book brawler',
    sprites: {
      player: { desc: 'comic hero, leather jacket, fist raised, cel-shaded pixel art' },
      thug1: { desc: 'street thug, bandana, pipe weapon' },
      thug2: { desc: 'biker enemy, chain weapon, leather vest' },
      boss: { desc: 'crime boss, suit, cigar, bodyguards' },
      punch_fx: { desc: 'comic POW impact burst, yellow star shape' },
      kick_fx: { desc: 'comic WHAM kick impact, red burst' },
      dumpster: { desc: 'green dumpster, destructible' },
      health_food: { desc: 'pizza slice health pickup' },
      street_bg: { desc: 'urban street background, graffiti, neon signs' },
    }
  },
  voiddrifter: {
    name: 'Void Drifter', style: 'bullet-hell danmaku',
    sprites: {
      player: { desc: 'small white fighter, triangle shape, blue engine glow, top-down' },
      boss1: { desc: 'Void Sentinel, red crystal entity, geometric, floating' },
      boss2: { desc: 'Burst Hydra, orange multi-headed serpent boss' },
      boss3: { desc: 'Aimed Phantom, purple ghostly sniper boss' },
      boss4: { desc: 'Chaos Weaver, green fractal spider boss' },
      boss5: { desc: 'Nexus Overlord, white cosmic titan, final boss' },
      bullet_orb: { desc: 'pink glowing bullet orb, small round projectile' },
      bullet_aimed: { desc: 'red aimed bullet, teardrop shape, tracking' },
      powerup: { desc: 'blue power-up capsule, P letter, glowing' },
      bomb: { desc: 'green screen-clear bomb pickup, star shape' },
      life: { desc: 'red heart extra life pickup' },
      graze_spark: { desc: 'white graze spark effect, near-miss bonus' },
    }
  },
  emberknights: {
    name: 'Ember Knights', style: 'tactical RPG pixel art',
    sprites: {
      warrior: { desc: 'red armored warrior, sword and shield, grid tactical sprite' },
      mage: { desc: 'blue robed mage, staff, casting pose, tactical grid' },
      archer: { desc: 'green hooded archer, bow drawn, tactical grid sprite' },
      healer: { desc: 'yellow robed cleric, healing staff, tactical grid' },
      grunt: { desc: 'dark armored foot soldier enemy, red eyes' },
      brute: { desc: 'large armored brute enemy, war hammer' },
      enemy_archer: { desc: 'dark elf archer enemy, purple cloak' },
      shaman: { desc: 'tribal shaman enemy, bone staff, blue magic' },
      boss: { desc: 'dark knight boss, black armor, flaming sword' },
      fire_fx: { desc: 'fire magic effect, orange flames' },
      ice_fx: { desc: 'ice magic effect, blue crystals' },
      heal_fx: { desc: 'healing magic effect, green sparkles' },
      grass_tile: { desc: 'green grass tactical grid tile' },
      stone_tile: { desc: 'gray stone tactical grid tile' },
      water_tile: { desc: 'blue water tactical grid tile' },
    }
  },
  chronorift: {
    name: 'Chrono Rift', style: 'time-bending puzzle',
    sprites: {
      player: { desc: 'time traveler, futuristic suit, glowing chrono device on wrist' },
      time_crystal: { desc: 'blue time crystal collectible, faceted, glowing' },
      clock_gear: { desc: 'golden clock gear mechanism piece' },
      rewind_fx: { desc: 'purple time rewind spiral effect, clock hands reversing' },
      slow_zone: { desc: 'blue time slow zone bubble, distorted space' },
      time_portal: { desc: 'swirling time portal, blue and gold vortex' },
      obstacle_laser: { desc: 'red laser grid barrier, pulsing' },
      platform: { desc: 'floating chrono platform, clock face design' },
      enemy_clock: { desc: 'mechanical clock enemy, gear body, pendulum' },
      boss_time: { desc: 'Time Keeper boss, giant clock face entity, temporal arms' },
    }
  },
  shadownexus: {
    name: 'Shadow Nexus', style: 'stealth action',
    sprites: {
      player: { desc: 'black-clad stealth operative, crouching, top-down view' },
      guard: { desc: 'armed security guard, patrol path indicator, top-down' },
      camera: { desc: 'security camera, rotating, red detection cone' },
      laser_grid: { desc: 'red laser security grid, horizontal beams' },
      vent: { desc: 'air ventilation shaft entrance, dark opening' },
      terminal: { desc: 'computer terminal, green screen, hackable' },
      keycard: { desc: 'blue security keycard, magnetic stripe' },
      silenced_shot: { desc: 'suppressed pistol flash, subtle muzzle flash' },
      alert_icon: { desc: 'red exclamation alert icon, guard alerted' },
      boss: { desc: 'shadow commander, heavy armor, dual pistols' },
      shadow_fx: { desc: 'dark smoke shadow stealth effect' },
    }
  },
  frosthaven: {
    name: 'Frost Haven', style: 'survival crafting',
    sprites: {
      player: { desc: 'fur-clad survival character, hooded parka, axe' },
      wolf: { desc: 'gray arctic wolf, snarling, snowy fur' },
      bear: { desc: 'white polar bear, massive, charging' },
      yeti: { desc: 'massive yeti, white fur, glowing blue eyes' },
      tree_pine: { desc: 'snow-covered pine tree, resource source' },
      rock: { desc: 'gray rock formation, mineable resource' },
      campfire: { desc: 'warm campfire, orange glow, cooking' },
      shelter: { desc: 'wooden survival shelter, snow on roof' },
      wood_log: { desc: 'brown wood log resource item' },
      meat: { desc: 'raw meat food item, red' },
      berries: { desc: 'blue frostberries food item, glowing' },
      blizzard_fx: { desc: 'white blizzard snow particle effect' },
      snow_tile: { desc: 'white snow ground tile, footprints' },
      ice_tile: { desc: 'blue ice tile, slippery surface' },
    }
  },
  solarsiege: {
    name: 'Solar Siege', style: 'space tower defense',
    sprites: {
      tower_plasma: { desc: 'blue plasma cannon turret, rotating dish, sci-fi' },
      tower_rail: { desc: 'gray railgun turret, magnetic coils, rapid fire' },
      tower_nova: { desc: 'orange nova bomb launcher, explosive area damage' },
      tower_cryo: { desc: 'ice blue cryo beam tower, freezing enemies' },
      tower_shield: { desc: 'purple shield generator tower, protective bubble' },
      enemy_scout: { desc: 'fast alien scout ship, small, red' },
      enemy_cruiser: { desc: 'medium alien cruiser, armored, green' },
      enemy_carrier: { desc: 'large alien carrier ship, spawns drones' },
      enemy_boss: { desc: 'alien dreadnought, massive, multiple weapon systems' },
      core: { desc: 'solar energy core to defend, glowing yellow sphere' },
      credits: { desc: 'gold credit pickup, currency icon' },
      explosion: { desc: 'space explosion, orange and white burst' },
    }
  },
  astralpirates: {
    name: 'Astral Pirates', style: 'space pirate adventure',
    sprites: {
      player_ship: { desc: 'pirate spaceship, skull emblem, patched hull, cannons' },
      merchant_ship: { desc: 'cargo merchant vessel, large hold, weak defenses' },
      navy_ship: { desc: 'military navy frigate, white hull, heavy guns' },
      pirate_crew: { desc: 'space pirate crew member, eyepatch, laser cutlass' },
      treasure: { desc: 'space treasure chest, glowing loot inside' },
      asteroid_base: { desc: 'hollowed asteroid pirate base, docking bays' },
      cannonball: { desc: 'plasma cannon projectile, green energy ball' },
      loot_gem: { desc: 'colorful gem loot drop, sparkling' },
      map_fragment: { desc: 'star map fragment, glowing coordinates' },
      black_hole: { desc: 'swirling black hole hazard, accretion disk' },
      nebula: { desc: 'colorful nebula background region' },
      wanted_poster: { desc: 'bounty wanted poster, pirate face' },
    }
  },
  mechcolosseum: {
    name: 'Mech Colosseum', style: 'arena mech combat',
    sprites: {
      mech_light: { desc: 'light scout mech, agile, blue accents, side view' },
      mech_medium: { desc: 'medium battle mech, balanced, green accents, side view' },
      mech_heavy: { desc: 'heavy assault mech, bulky, orange accents, side view' },
      weapon_cannon: { desc: 'mech shoulder cannon, large barrel' },
      weapon_laser: { desc: 'mech arm-mounted laser, focused beam' },
      weapon_missile: { desc: 'mech missile pod, multiple tubes' },
      weapon_melee: { desc: 'mech energy blade, glowing sword arm' },
      enemy_spark: { desc: 'Spark opponent mech, light, fast, electric' },
      enemy_ironclad: { desc: 'Ironclad opponent mech, heavy, cannon, armored' },
      enemy_phantom: { desc: 'Phantom opponent mech, sleek, laser, evasive' },
      enemy_colossus: { desc: 'Colossus boss mech, massive, melee, devastating' },
      arena_bg: { desc: 'colosseum arena background, crowd, energy barriers' },
      spark_fx: { desc: 'electric spark impact effect' },
      explosion: { desc: 'mech explosion, oil and metal debris' },
    }
  },
};

// ── Asset Cache ──────────────────────────────────────────────────────────────
const _cache = new Map();
const _failed = new Set();
const _loading = new Map();
let _loaded = false;
let _onReady = [];

function _key(game, tier, sprite) { return `${game}/${tier}/${sprite}`; }
function _buildUrl(game, tier, sprite) { return `${BASE}/${game}/${tier}/${sprite}.png`; }

function _loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`404: ${url}`));
    img.src = url;
  });
}

export async function loadSprite(gameKey, spriteName, quality = 'medium') {
  const tier = MW_QUALITY_TIERS[quality] || '32bit';
  const key = _key(gameKey, tier, spriteName);
  if (_cache.has(key)) return _cache.get(key);
  if (_failed.has(key)) return null;
  if (_loading.has(key)) return _loading.get(key);
  const url = _buildUrl(gameKey, tier, spriteName);
  const promise = _loadImage(url).then(img => {
    _cache.set(key, img); _loading.delete(key); return img;
  }).catch(() => { _failed.add(key); _loading.delete(key); return null; });
  _loading.set(key, promise);
  return promise;
}

export function getSprite(gameKey, spriteName, quality = 'medium') {
  const tier = MW_QUALITY_TIERS[quality] || '32bit';
  const key = _key(gameKey, tier, spriteName);
  if (_cache.has(key)) return _cache.get(key);
  for (const t of ['128bit', '64bit', '32bit', '16bit']) {
    const fk = _key(gameKey, t, spriteName);
    if (_cache.has(fk)) return _cache.get(fk);
  }
  return null;
}

export function drawSprite(ctx, gameKey, spriteName, quality, x, y, w, h, opts = {}) {
  const img = getSprite(gameKey, spriteName, quality);
  if (!img) return false;
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (opts.flipX) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); }
  else if (opts.flipY) { ctx.translate(x, y + h); ctx.scale(1, -1); ctx.drawImage(img, 0, 0, w, h); }
  else { ctx.drawImage(img, x, y, w, h); }
  ctx.restore();
  return true;
}

export function drawSpriteRotated(ctx, gameKey, spriteName, quality, cx, cy, w, h, angle, opts = {}) {
  const img = getSprite(gameKey, spriteName, quality);
  if (!img) return false;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(angle);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

export function drawSpriteFrame(ctx, gameKey, spriteName, quality, x, y, w, h, frame, totalFrames) {
  const img = getSprite(gameKey, spriteName, quality);
  if (!img) return false;
  const frameW = img.width / totalFrames;
  const sx = (frame % totalFrames) * frameW;
  ctx.drawImage(img, sx, 0, frameW, img.height, x, y, w, h);
  return true;
}

export async function preloadGame(gameKey, quality = 'medium') {
  const game = GAME_SPRITE_REGISTRY[gameKey];
  if (!game) return;
  await Promise.allSettled(Object.keys(game.sprites).map(name => loadSprite(gameKey, name, quality)));
}

export async function preloadAll(quality = 'medium') {
  await Promise.allSettled(Object.keys(GAME_SPRITE_REGISTRY).map(key => preloadGame(key, quality)));
  _loaded = true;
  _onReady.forEach(fn => fn());
  _onReady = [];
}

export function onAssetsReady(fn) { if (_loaded) fn(); else _onReady.push(fn); }

export function isGameAssetReady(gameKey, quality = 'medium') {
  const game = GAME_SPRITE_REGISTRY[gameKey];
  if (!game) return false;
  const tier = MW_QUALITY_TIERS[quality] || '32bit';
  return Object.keys(game.sprites).some(name => _cache.has(_key(gameKey, tier, name)));
}

export function getAssetStats() {
  return {
    cached: _cache.size, failed: _failed.size, loading: _loading.size,
    total: Object.values(GAME_SPRITE_REGISTRY).reduce((s, g) => s + Object.keys(g.sprites).length, 0),
    games: Object.keys(GAME_SPRITE_REGISTRY).length,
  };
}

export function clearFailedCache() { _failed.clear(); }

export function spriteOrFallback(ctx, gameKey, spriteName, quality, x, y, w, h, fallbackFn, opts = {}) {
  if (!drawSprite(ctx, gameKey, spriteName, quality, x, y, w, h, opts)) fallbackFn();
}

export default {
  MW_QUALITY_TIERS, MW_TIER_RESOLUTION, GAME_SPRITE_REGISTRY,
  loadSprite, getSprite, drawSprite, drawSpriteRotated, drawSpriteFrame,
  preloadGame, preloadAll, onAssetsReady, isGameAssetReady,
  getAssetStats, clearFailedCache, spriteOrFallback,
};
