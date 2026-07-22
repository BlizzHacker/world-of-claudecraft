// Build the Infernal realm's full-size animated humanoid library.
//
// Two deliberately separate banks are produced:
//   1. civilian/NPC humans sourced from approved animated PICKTURA bodies;
//   2. one unique class body for every version-neutral playable archetype,
//      curated from the user's Classic/PICKTURA/zip asset banks.
//
// Static Classic meshes are fitted to the shared Meshy skeleton offline by
// rig_static_humanoid.py. Every output receives real semantic clips instead of
// aliasing Walk to attack/cast/death (the old "stumbling elf" failure).
import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { retargetMeshyRig } from './_retarget_meshy_rig.mjs';

const execFile = promisify(execFileCallback);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pickturaRoot = path.resolve(
  process.env.PICKTURA_ROOT?.trim() ||
    (process.platform === 'win32' ? 'T:\\meshy\\PICKTURA' : '/mnt/usb4/meshy/PICKTURA'),
);
const animatedDir = path.join(pickturaRoot, 'animated');
const forgedRoot = path.resolve(
  process.env.ARCFORGE_FORGED_DIR?.trim() ||
    (process.platform === 'win32'
      ? 'T:\\moveweight-assets\\forged-glbs'
      : '/mnt/usb4/moveweight-assets/forged-glbs'),
);
const classicRoot = path.resolve(
  process.env.CLASSIC_REALM_ASSET_DIR?.trim() ||
    (process.platform === 'win32'
      ? 'C:\\MoveWeight\\cryptic-realm\\classic realm assets'
      : path.join(repoRoot, 'classic realm assets')),
);
const bpyPython =
  process.env.BYPY_PYTHON?.trim() ||
  process.env.BLENDER_PYTHON?.trim() ||
  (process.platform === 'win32'
    ? path.join(repoRoot, 'tmp', 'bpy-venv', 'Scripts', 'python.exe')
    : 'python3');
const staticRigger = path.join(repoRoot, 'scripts', 'rig_static_humanoid.py');
const outputDir = path.join(forgedRoot, 'infernal');
const donorId = '019b7548-998a-7eb1-84f7-9f6f58a8c25a';
const buildScope = process.env.INFERNAL_RIG_SCOPE?.trim().toLowerCase() || 'all';
const buildFilter = new Set(
  (process.env.INFERNAL_RIG_FILTER ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

const classic = (slug, file) => ({ slug, kind: 'static', file });

// Civilian bank. Every entry is a clothed human/humanoid selected from the
// user's Classic/PICKTURA/zip assets. These stay independent from class
// identities so a class art change can never turn every smith into a warlock.
const npcHumans = [
  {
    slug: 'iron_warden',
    kind: 'zip-rigged',
    file: 'Meshy_AI_Warrior_Guardian_biped.zip',
  },
  classic('vanguard', 'Meshy_AI__warrior_Footman_0617000143_texture.glb'),
  classic('forge_worker', 'Meshy_AI_Dockworker_Defender_0617000122_texture.glb'),
  classic('white_sage', 'Meshy_AI_Outlaw_Magician_MAGE_0617000212_texture.glb'),
  classic('tainted_hood', 'Meshy_AI_Sorceress_of_the_Dark_0617000015_texture.glb'),
  classic('weathered_elder', 'Meshy_AI_The_Nautical_Mage_0617000113_texture.glb'),
  classic('road_mercenary', 'Meshy_AI_Adventurer_s_Gear_0617000126_texture.glb'),
  classic('iron_ranger', 'Meshy_AI_Archer_0617000158_texture.glb'),
  classic('hooded_wanderer', 'Meshy_AI_Fisherman_Warrior_0617000131_texture.glb'),
  classic('hermit', 'Meshy_AI_Ubaid_Warrior_warrio_0617000154_texture.glb'),
  classic('barbarian', 'Meshy_AI_Viking_Warrior_0616235843_texture.glb'),
  classic('veil_adept', 'Meshy_AI_Moonlit_Enchanter_Moo_0616235824_texture.glb'),
  classic('assassin', 'Meshy_AI_Cowgirl_Ninja_Warrior_0616235942_texture.glb'),
  {
    slug: 'monk',
    kind: 'picktura',
    id: '01943e21-4e36-79bc-82f3-8fda196238db',
    exactActions: { Attack: 'Flying_Fist_Kick', Hit: 'Counterstrike' },
  },
  classic('crusader', 'Meshy_AI_Warrior_Queen_Safari__0617000051_texture.glb'),
  classic('spiritborn', 'Meshy_AI_HERO_UNIT_2_Elara_t_0617000046_texture.glb'),
  { slug: 'blood_knight', kind: 'zip-rigged', file: 'halfblood vampire.zip' },
  classic('tempest', 'Meshy_AI_9_Artemisia_Intellig_0616235807_texture.glb'),
];

// One visually distinct body per playable archetype. No release labels and no
// duplicate Barbarian cards; Sorcerer/Sorceress deliberately share one card.
const playableClasses = [
  {
    slug: 'warrior',
    kind: 'zip-rigged',
    file: 'Meshy_AI_Warrior_Guardian_biped.zip',
  },
  classic('rogue', 'Meshy_AI_Shadow_Archer_0617000310_texture.glb'),
  classic('sorcerer', 'Meshy_AI_Sorceress_of_the_Nigh_0616235946_texture.glb'),
  classic('amazon', 'Meshy_AI_Storm_Huntress_Hero__0617000010_texture.glb'),
  classic('barbarian', 'Meshy_AI_Viking_Warrior_0616235843_texture.glb'),
  classic('necromancer', 'Meshy_AI_Moonlit_Enchanter_Moo_0616235824_texture.glb'),
  classic('paladin', 'Meshy_AI_Warrior_s_Valor_3__0617000056_texture.glb'),
  classic('druid', 'Meshy_AI_Viking_Mage_0617000318_texture.glb'),
  classic('assassin', 'Meshy_AI_HERO_UNIT_3_Zephyr__0617000030_texture.glb'),
  classic('demon_hunter', 'Meshy_AI_Shadow_Archer_0617000257_texture.glb'),
  {
    slug: 'monk',
    kind: 'picktura',
    id: '01943e21-4e36-79bc-82f3-8fda196238db',
    exactActions: { Attack: 'Flying_Fist_Kick', Hit: 'Counterstrike' },
  },
  classic('wizard', 'Meshy_AI_9_Artemisia_Intellig_0616235807_texture.glb'),
  classic('witch_doctor', 'Meshy_AI_Voodoo_mage__0616235902_texture.glb'),
  classic('crusader', 'Meshy_AI_Warrior_Queen_Safari__0617000051_texture.glb'),
  classic('spiritborn', 'Meshy_AI_HERO_UNIT_2_Freya_s__0617000101_texture.glb'),
  classic('warlock', 'Meshy_AI_Mystic_Sorceress_of_D_0617000001_texture.glb'),
  { slug: 'blood_knight', kind: 'zip-rigged', file: 'halfblood vampire.zip' },
  classic('tempest', 'Meshy_AI_HERO_UNIT_2_Elara_t_0617000046_texture.glb'),
];

const donorFallbacks = {
  Walk: 'Walking',
  Run: 'Running',
  Idle: 'Combat_Stance',
  Attack: 'Attack',
  Cast: 'Charged_Spell_Cast',
  Hit: 'Face_Punch_Reaction',
  Death: 'Dead',
  Jump: 'Backflip_Sweep_Kick',
  Wave: 'Big_Wave_Hello',
  Taunt: 'Chest_Pound_Taunt',
};

function sourcePath(id, action, variant = 'x') {
  return path.join(animatedDir, `${id}__${variant}__${action}.glb`);
}

async function requireFile(filePath) {
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) throw new Error(`required source is missing: ${filePath}`);
  return filePath;
}

async function findMergedRig(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await findMergedRig(candidate);
      if (nested) return nested;
    } else if (/Merged_Animations\.glb$/i.test(entry.name)) {
      return candidate;
    }
  }
  return null;
}

async function clipsFor(id = donorId, exactActions = {}, variant = 'x') {
  const clips = [];
  for (const [name, fallbackAction] of Object.entries(donorFallbacks)) {
    const exactAction = exactActions[name];
    const clipPath = exactAction
      ? sourcePath(id, exactAction, variant)
      : sourcePath(donorId, fallbackAction);
    clips.push({ name, path: await requireFile(clipPath) });
  }
  return clips;
}

async function writeRetargeted(base, fileName, clips, tempDir) {
  const temporaryOutput = path.join(tempDir, fileName);
  const summary = await retargetMeshyRig(base, temporaryOutput, clips);
  const optimizedOutput = path.join(tempDir, `optimized-${fileName}`);
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  });
  const document = await io.read(temporaryOutput);
  await document.transform(
    resample(),
    prune(),
    dedup(),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [1024, 1024],
    }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  await io.write(optimizedOutput, document);
  const destination = path.join(outputDir, fileName);
  await fs.copyFile(optimizedOutput, destination);
  return { destination, summary };
}

async function buildNpcHuman(entry, tempDir) {
  const base = await curatedBase(entry, tempDir);
  const clips = await clipsFor(
    entry.kind === 'picktura' ? entry.id : donorId,
    entry.exactActions ?? {},
    entry.variant ?? 'x',
  );
  return {
    slug: `npc:${entry.slug}`,
    ...(await writeRetargeted(base, `infernal_human_${entry.slug}.glb`, clips, tempDir)),
  };
}

async function curatedBase(entry, tempDir) {
  if (entry.kind === 'picktura') {
    return requireFile(sourcePath(entry.id, 'Walking', entry.variant ?? 'x'));
  }
  if (entry.kind === 'zip-rigged') {
    const archive = await requireFile(path.join(classicRoot, entry.file));
    const extractDir = path.join(tempDir, `source-${entry.slug}`);
    await fs.mkdir(extractDir, { recursive: true });
    await execFile(bpyPython, ['-m', 'zipfile', '-e', archive, extractDir], {
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
    });
    const merged = await findMergedRig(extractDir);
    if (!merged) throw new Error(`zip has no merged animated GLB: ${archive}`);
    return merged;
  }
  const source = await requireFile(path.join(classicRoot, entry.file));
  await requireFile(staticRigger);
  const donorSkeleton = await requireFile(sourcePath(donorId, 'Walking'));
  const rigged = path.join(tempDir, `rigged-${entry.slug}.glb`);
  await execFile(bpyPython, [staticRigger, source, donorSkeleton, rigged], {
    windowsHide: true,
    maxBuffer: 40 * 1024 * 1024,
  });
  return requireFile(rigged);
}

async function buildPlayable(entry, tempDir) {
  const base = await curatedBase(entry, tempDir);
  const clips = await clipsFor(
    entry.kind === 'picktura' ? entry.id : donorId,
    entry.exactActions ?? {},
    entry.variant ?? 'x',
  );
  return {
    slug: `class:${entry.slug}`,
    ...(await writeRetargeted(base, `infernal_class_${entry.slug}.glb`, clips, tempDir)),
  };
}

await fs.mkdir(outputDir, { recursive: true });
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cryptic-infernal-rigs-'));
try {
  const results = [];
  if (buildScope !== 'classes') {
    for (const human of npcHumans.filter(
      (entry) => buildFilter.size === 0 || buildFilter.has(entry.slug),
    )) {
      console.log(`forging npc:${human.slug}...`);
      results.push(await buildNpcHuman(human, tempDir));
    }
  }
  if (buildScope !== 'npcs') {
    for (const playable of playableClasses.filter(
      (entry) => buildFilter.size === 0 || buildFilter.has(entry.slug),
    )) {
      console.log(`forging class:${playable.slug}...`);
      results.push(await buildPlayable(playable, tempDir));
    }
  }
  for (const result of results) {
    const channels = result.summary.reduce((sum, clip) => sum + clip.channels, 0);
    console.log(`${result.slug}: ${result.summary.length} clips, ${channels} channels`);
  }
  console.log(`wrote ${results.length} animated humanoids to ${outputDir}`);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
