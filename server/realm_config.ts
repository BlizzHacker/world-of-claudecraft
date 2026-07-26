import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type * as http from "node:http";
import { logger } from "./http/logger";
import { json, readBody } from "./http_util";
import { loadInfernalConfig } from "../src/render/characters/infernal_roster";
import { loadClassVisualConfig } from "../src/sim/realms/class_visuals";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RealmNpcRoster {
  visualKeys: string[];
  npcVisuals: Record<string, string>;
  opponentKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RealmClassVisuals {
  realms: Record<string, Record<string, string>>;
  visualKeyList: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── In-memory state ─────────────────────────────────────────────────────────

const CONFIG_DIR = path.resolve(
  process.env["CR_CONFIG_DIR"] ?? path.join(process.cwd(), "config")
);
const NPC_ROSTER_PATH = path.join(CONFIG_DIR, "realm_npc_roster.json");
const CLASS_VISUALS_PATH = path.join(CONFIG_DIR, "realm_class_visuals.json");

let npcRoster: RealmNpcRoster | null = null;
let classVisuals: RealmClassVisuals | null = null;
let loaded = false;

// ─── Defaults (mirror the TS hardcoded values) ──────────────────────────────

const DEFAULT_NPC_ROSTER: RealmNpcRoster = {
  visualKeys: [
    "realm_infernal_human_iron_warden",
    "realm_infernal_human_vanguard",
    "realm_infernal_human_forge_worker",
    "realm_infernal_human_white_sage",
    "realm_infernal_human_tainted_hood",
    "realm_infernal_human_weathered_elder",
    "realm_infernal_human_road_mercenary",
    "realm_infernal_human_iron_ranger",
    "realm_infernal_human_hooded_wanderer",
    "realm_infernal_human_hermit",
  ],
  npcVisuals: {
    the_merchant: "realm_infernal_human_forge_worker",
    marshal_redbrook: "realm_infernal_human_iron_warden",
    warden_fenwick: "realm_infernal_human_iron_warden",
    captain_thessaly: "realm_infernal_human_vanguard",
    trader_wilkes: "realm_infernal_human_weathered_elder",
    apothecary_lin: "realm_infernal_human_white_sage",
    herbalist_yara: "realm_infernal_human_white_sage",
    smith_haldren: "realm_infernal_human_forge_worker",
    armorer_hode: "realm_infernal_human_forge_worker",
    foreman_odell: "realm_infernal_human_forge_worker",
    fisherman_brandt: "realm_infernal_human_hermit",
    stable_master_wren: "realm_infernal_human_vanguard",
    mercenary_kael: "realm_infernal_human_road_mercenary",
    huntress_verr: "realm_infernal_human_iron_ranger",
    bursar_fernando: "realm_infernal_human_hooded_wanderer",
    realtor_maribel: "realm_infernal_human_weathered_elder",
    pit_master_grott: "realm_infernal_human_vanguard",
    race_marshal_pip: "realm_infernal_human_iron_ranger",
    groundskeeper_bram: "realm_infernal_human_hermit",
    loremaster_caddis: "realm_infernal_human_white_sage",
    cainhurst_sage: "realm_infernal_human_white_sage",
    brother_halven: "realm_infernal_human_white_sage",
    brother_halven_marsh: "realm_infernal_human_white_sage",
    spirit_healer: "realm_infernal_human_white_sage",
    scout_maren: "realm_infernal_human_iron_ranger",
    scout_maren_highwatch: "realm_infernal_human_iron_ranger",
    provisioner_hale: "realm_infernal_human_weathered_elder",
    quartermaster_bree: "realm_infernal_human_road_mercenary",
    interior_merchant: "realm_infernal_human_forge_worker",
    interior_innkeeper: "realm_infernal_human_weathered_elder",
    interior_villager: "realm_infernal_human_hooded_wanderer",
    skirmish_builder: "realm_infernal_human_forge_worker",
    skirmish_footman: "realm_infernal_human_vanguard",
  },
  opponentKeys: [
    "realm_infernal_dark_paladin",
    "realm_infernal_human_tainted_hood",
    "realm_cryptic_bone_herald",
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_CLASS_VISUALS: RealmClassVisuals = {
  visualKeyList: [
    "realm_cryptic_bone_herald",
    "realm_infernal_crimson_behemoth",
    "realm_infernal_horned_demon",
    "realm_infernal_skullbeast",
    "realm_classic_orc",
    "realm_classic_big_orc",
    "realm_classic_fighting_elf",
    "realm_classic_dwarf",
    "realm_classic_female_elf",
    "realm_classic_female_orc",
    "realm_classic_treasure_dwarf",
    "realm_classic_kitty",
    "realm_infernal_human_iron_warden",
    "realm_infernal_human_vanguard",
    "realm_infernal_human_forge_worker",
    "realm_infernal_human_white_sage",
    "realm_infernal_human_tainted_hood",
    "realm_infernal_human_weathered_elder",
    "realm_infernal_human_road_mercenary",
    "realm_infernal_human_iron_ranger",
    "realm_infernal_human_hooded_wanderer",
    "realm_infernal_human_hermit",
    "realm_infernal_durance_humanoid",
  ],
  realms: {
    crypticrealm: {
      warlock: "realm_cryptic_bone_herald",
    },
    infernal: {
      warrior: "realm_infernal_human_iron_warden",
      paladin: "realm_infernal_human_vanguard",
      hunter: "realm_infernal_human_iron_ranger",
      rogue: "realm_infernal_human_road_mercenary",
      priest: "realm_infernal_human_white_sage",
      shaman: "realm_infernal_human_weathered_elder",
      mage: "realm_infernal_human_hooded_wanderer",
      warlock: "realm_infernal_human_tainted_hood",
      druid: "realm_infernal_human_hermit",
    },
    classic: {
      warrior: "realm_classic_dwarf",
      paladin: "realm_classic_fighting_elf",
      hunter: "realm_classic_orc",
      rogue: "realm_classic_female_orc",
      priest: "realm_classic_female_elf",
      shaman: "realm_classic_big_orc",
      mage: "realm_classic_treasure_dwarf",
      druid: "realm_classic_kitty",
    },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Load / Save ────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

async function loadJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fsp.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return deepClone(fallback);
  }
}

async function saveJsonFile(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fsp.mkdir(dir, { recursive: true });
  const tmp = filePath + ".tmp";
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fsp.rename(tmp, filePath);
}

export async function loadRealmConfig(): Promise<void> {
  npcRoster = await loadJsonFile(NPC_ROSTER_PATH, DEFAULT_NPC_ROSTER);
  classVisuals = await loadJsonFile(CLASS_VISUALS_PATH, DEFAULT_CLASS_VISUALS);
  loaded = true;

  // Inject into runtime modules so the sim uses the loaded config.
  if (npcRoster) {
    loadInfernalConfig({
      npcVisuals: npcRoster.npcVisuals,
      opponentKeys: npcRoster.opponentKeys,
    });
  }
  if (classVisuals) {
    loadClassVisualConfig({ realms: classVisuals.realms });
  }

  logger.info({ source: "realm_config" }, "Realm config loaded and injected into runtime");
}

// ─── Accessors (called by game runtime) ─────────────────────────────────────

export function getNpcRoster(): RealmNpcRoster {
  if (!loaded) {
    return deepClone(DEFAULT_NPC_ROSTER);
  }
  return deepClone(npcRoster!);
}

export function getClassVisuals(): RealmClassVisuals {
  if (!loaded) {
    return deepClone(DEFAULT_CLASS_VISUALS);
  }
  return deepClone(classVisuals!);
}

export function reloadConfig(): void {
  loadRealmConfig().catch((err) =>
    logger.error({ source: "realm_config", err }, "Reload failed")
  );
}

// ─── Admin API handlers ─────────────────────────────────────────────────────

export async function handleAdminNpcRosterGet(
  _req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const roster = npcRoster ?? deepClone(DEFAULT_NPC_ROSTER);
  json(res, 200, { ok: true, data: roster });
}

export async function handleAdminNpcRosterPut(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const body = await readBody(req, 256 * 1024);
  let payload: Partial<RealmNpcRoster>;
  try {
    payload = body as Partial<RealmNpcRoster>;
  } catch {
    json(res, 400, { error: "Invalid JSON" });
    return;
  }

  const now = nowISO();
  const merged: RealmNpcRoster = {
    ...(npcRoster ?? DEFAULT_NPC_ROSTER),
    visualKeys:
      payload.visualKeys ??
      npcRoster?.visualKeys ??
      DEFAULT_NPC_ROSTER.visualKeys,
    npcVisuals:
      payload.npcVisuals ??
      npcRoster?.npcVisuals ??
      DEFAULT_NPC_ROSTER.npcVisuals,
    opponentKeys:
      payload.opponentKeys ??
      npcRoster?.opponentKeys ??
      DEFAULT_NPC_ROSTER.opponentKeys,
    updatedAt: now,
  };

  await saveJsonFile(NPC_ROSTER_PATH, merged);
  npcRoster = merged;

  logger.info(
    { source: "realm_config", accountId: (req as any).__ctxAccountId },
    "NPC roster updated via admin API"
  );
  json(res, 200, { ok: true, data: merged });
}

export async function handleAdminClassVisualsGet(
  _req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const visuals = classVisuals ?? deepClone(DEFAULT_CLASS_VISUALS);
  json(res, 200, { ok: true, data: visuals });
}

export async function handleAdminClassVisualsPut(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const body = await readBody(req, 256 * 1024);
  let payload: Partial<RealmClassVisuals>;
  try {
    payload = body as Partial<RealmClassVisuals>;
  } catch {
    json(res, 400, { error: "Invalid JSON" });
    return;
  }

  const now = nowISO();
  const merged: RealmClassVisuals = {
    ...(classVisuals ?? DEFAULT_CLASS_VISUALS),
    realms:
      payload.realms ??
      classVisuals?.realms ??
      DEFAULT_CLASS_VISUALS.realms,
    visualKeyList:
      payload.visualKeyList ??
      classVisuals?.visualKeyList ??
      DEFAULT_CLASS_VISUALS.visualKeyList,
    updatedAt: now,
  };

  await saveJsonFile(CLASS_VISUALS_PATH, merged);
  classVisuals = merged;

  logger.info(
    { source: "realm_config", accountId: (req as any).__ctxAccountId },
    "Class visuals updated via admin API"
  );
  json(res, 200, { ok: true, data: merged });
}

// ═══════════════════════════════════════════════════════════════════
// INTERNAL ENDPOINTS — shared-secret Auth for Arcforge bridge
// ═══════════════════════════════════════════════════════════════════

const INTERNAL_SECRET = process.env.CRYPTIC_ADMIN_SECRET || "3c6a217733806264a4839739071f9400ec876c1a63c469c019ac80aafc0c4489";

function checkInternalSecret(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!INTERNAL_SECRET) {
    json(res, 503, { error: 'Internal realm config API not configured' });
    return false;
  }
  const provided = (req.headers['x-arcforge-secret'] as string) || '';
  if (provided !== INTERNAL_SECRET) {
    json(res, 403, { error: 'Forbidden' });
    return false;
  }
  return true;
}

export function handleRealmNpcRoster(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  if (!checkInternalSecret(req, res)) return;
  if (req.method === 'GET') {
    json(res, 200, { data: npcRoster ?? DEFAULT_NPC_ROSTER });
  } else if (req.method === 'PUT') {
    void handleAdminNpcRosterPut(req, res);
  } else {
    json(res, 405, { error: 'Method not allowed' });
  }
}

export function handleRealmClassVisuals(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  if (!checkInternalSecret(req, res)) return;
  if (req.method === 'GET') {
    json(res, 200, { data: classVisuals ?? DEFAULT_CLASS_VISUALS });
  } else if (req.method === 'PUT') {
    void handleAdminClassVisualsPut(req, res);
  } else {
    json(res, 405, { error: 'Method not allowed' });
  }
}
