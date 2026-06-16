import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  en,
  es,
  es_ES,
  fr_FR,
  fr_CA,
  en_CA,
  it_IT,
  de_DE,
  zh_CN,
  zh_TW,
  ko_KR,
  ja_JP,
  pt_BR,
  ru_RU,
  formatDateTime,
  formatMoney,
  formatNumber,
  isSupportedLanguage,
  languageTag,
  setLanguage,
  supportedLanguages,
  t,
  type TranslationKey,
} from "../src/ui/i18n";
import { ABILITIES, CLASSES, DUNGEONS, ITEMS, MOBS, NPCS, QUESTS, ZONES } from "../src/sim/data";
import {
  assertEntityTranslationsReady,
  entityTranslationFallbackLog,
  entityTranslationManifest,
  missingEntityTranslationsForPhases,
  resetEntityTranslationFallbackLog,
  tEntity,
} from "../src/ui/entity_i18n";
import {
  hasTalentTitleOverride,
  renderTalentManifestEntry,
  talentTranslationManifest,
} from "../src/ui/talent_i18n";
import type { PlayerClass } from "../src/sim/types";

const locales: Record<string, typeof en> = {
  es,
  es_ES,
  fr_FR,
  fr_CA,
  en_CA,
  it_IT,
  de_DE,
  zh_CN,
  zh_TW,
  ko_KR,
  ja_JP,
  pt_BR,
  ru_RU,
};

describe("i18n Localization Key Coverage", () => {
  const placeholderPattern = /\b(TODO|TBD|FIXME|PLACEHOLDER|TRANSLATE|LOREM)\b/i;
  const phaseOneShellKeys: TranslationKey[] = [
    "seo.title",
    "seo.description",
    "a11y.goHome",
    "loading.worldProgress",
    "errors.characterNameInvalid",
    "realm.onlineNow",
    "character.levelClass",
    "deleteCharacter.body",
    "classDetails.sections.startingStats",
    "mobilePreflight.title",
    "serverUnavailable.heading",
  ];
  const phaseTwoHudKeys: TranslationKey[] = [
    "hud.core.chatPlaceholder",
    "hud.core.xpGain",
    "hud.core.communityLinks",
    "hud.core.mobileControls",
    "hud.core.mobileMove",
    "hud.core.mobileCamera",
    "hud.core.mobileAttack",
    "hud.core.mobileTarget",
    "hud.core.mobileChat",
    "hud.core.mobileMore",
    "hud.core.mobileMoreAria",
    "hud.core.mobileSocial",
    "hud.core.mobileArena",
    "hud.core.mobileMenu",
    "hud.core.mobileUse",
    "hud.core.mobileMeters",
    "hud.core.mobileMap",
    "hud.core.closeMap",
    "hud.options.gameMenu",
    "hud.options.keybindHelp",
    "hud.options.unbound",
    "hud.keybinds.categories.movement",
    "hud.keybinds.actions.forward",
    "hud.meters.noCombat",
    "hud.chat.templates.guild",
    "hud.chat.context.trade",
    "hud.report.reasons.offensiveNameOrChat",
    "hud.prompts.duelRequest",
    "hud.combat.damageDoneCrit",
    "hud.system.arenaVictoryLog",
    "hud.errors.chatCooldown",
    "hud.logs.lootReceiveItem",
  ];
  const phaseThreeAbilityKeys: TranslationKey[] = [
    "abilityUi.actionBar.attackName",
    "abilityUi.actionBar.attackTooltip",
    "abilityUi.actionBar.emptySlot",
    "abilityUi.actionBar.clearHint",
    "abilityUi.actionBar.itemInBags",
    "abilityUi.actionBar.itemNoneInBags",
    "abilityUi.cast.fishing",
    "abilityUi.spellbook.title",
    "abilityUi.spellbook.classSubtitle",
    "abilityUi.spellbook.trainableAtLevel",
    "abilityUi.spellbook.learnAtLevel",
    "abilityUi.tooltip.rank",
    "abilityUi.tooltip.cost",
    "abilityUi.tooltip.rangeWithMin",
    "abilityUi.tooltip.channeledSeconds",
    "abilityUi.tooltip.cooldownSeconds",
    "abilityUi.tooltip.requiresForm",
    "abilityUi.tooltip.requiresCombo",
    "abilityUi.tooltip.finisherDamage",
    "abilityUi.resources.mana",
  ];
  const phaseFourQuestKeys: TranslationKey[] = [
    "questUi.tracker.title",
    "questUi.tracker.complete",
    "questUi.log.title",
    "questUi.log.summary",
    "questUi.log.emptyTitle",
    "questUi.log.emptyHint",
    "questUi.log.returnTo",
    "questUi.log.abandon",
    "questUi.dialog.accept",
    "questUi.dialog.completeQuest",
    "questUi.dialog.back",
    "questUi.dialog.availableQuestAria",
    "questUi.detail.objectives",
    "questUi.detail.rewards",
    "questUi.detail.xpReward",
    "questUi.detail.objectiveProgress",
    "questUi.logs.accepted",
    "questUi.errors.unavailable",
  ];
  const phaseFiveItemKeys: TranslationKey[] = [
    "itemUi.money.goldShort",
    "itemUi.money.copper",
    "itemUi.slots.mainhand",
    "itemUi.quality.rare",
    "itemUi.kind.quest",
    "itemUi.kind.tool",
    "itemUi.kind.potion",
    "itemUi.stats.attackPower",
    "itemUi.tooltip.damageSpeed",
    "itemUi.tooltip.useFood",
    "itemUi.tooltip.useFishing",
    "itemUi.tooltip.useHealingPotion",
    "itemUi.tooltip.useManaPotion",
    "itemUi.tooltip.clickUseInstant",
    "itemUi.tooltip.clickUse",
    "itemUi.tooltip.clickBuyback",
    "itemUi.tooltip.sellPrice",
    "itemUi.bags.title",
    "itemUi.bags.itemAria",
    "itemUi.equipment.levelClass",
    "itemUi.vendor.goodsTitle",
    "itemUi.vendor.buyAria",
    "itemUi.vendor.buybackTitle",
    "itemUi.vendor.buybackEmpty",
    "itemUi.vendor.buybackAria",
    "itemUi.vendor.sellQuantityTitle",
    "itemUi.vendor.sellQuantityInput",
    "itemUi.vendor.sellQuantityConfirm",
    "itemUi.vendor.sellQuantityCancel",
    "itemUi.market.title",
    "itemUi.market.sellNote",
    "itemUi.market.buyAria",
    "itemUi.logs.sellerSold",
    "itemUi.logs.boughtBackItem",
    "itemUi.errors.tooManyListings",
    "itemUi.loot.takeAll",
  ];
  const phaseElevenMergeKeys: TranslationKey[] = [
    "hud.options.mouseCamera",
    "hud.options.keybindHelpMouseCamera",
    "hud.markers.names.star",
    "hud.markers.names.circle",
    "hud.markers.names.diamond",
    "hud.markers.names.triangle",
    "hud.markers.names.moon",
    "hud.markers.names.square",
    "hud.markers.names.cross",
    "hud.markers.names.skull",
    "hud.markers.clear",
    "hud.markers.cancel",
    "hud.markers.markerAria",
    "hud.markers.markerSelectedAria",
    "hud.social.title",
    "hud.social.friendsTab",
    "hud.social.guildTab",
    "hud.social.ignoreTab",
    "hud.social.leaveParty",
    "hud.social.offlineEmpty",
    "hud.social.friendsEmpty",
    "hud.social.ignoreEmpty",
    "hud.social.noGuild",
    "hud.social.whisperTitle",
    "hud.social.removeFriendTitle",
    "hud.social.stopIgnoringTitle",
    "hud.social.makeGuildMasterTitle",
    "hud.social.promoteTitle",
    "hud.social.demoteTitle",
    "hud.social.removeGuildTitle",
    "hud.social.friendSearchPlaceholder",
    "hud.social.ignoreSearchPlaceholder",
    "hud.social.guildNamePlaceholder",
    "hud.social.guildInvitePlaceholder",
    "hud.social.add",
    "hud.social.ignoreAction",
    "hud.social.found",
    "hud.social.invite",
    "hud.social.disbandGuild",
    "hud.social.leaveGuild",
    "hud.social.disbandPrompt",
    "hud.social.disbandConfirm",
    "hud.social.transferPrompt",
    "hud.social.transferConfirm",
    "hud.social.selfNotice",
    "hud.social.noPlayerNamed",
    "hud.social.currentRealm",
    "hud.social.friendAdded",
    "hud.social.nowIgnoring",
    "hud.social.guildInvited",
    "hud.social.levelClass",
    "hud.social.status.online",
    "hud.social.status.offline",
    "hud.social.status.combat",
    "hud.social.status.dungeon",
    "hud.social.status.dead",
    "hud.social.statusWithZone",
    "hud.social.ranks.leader",
    "hud.social.ranks.officer",
    "hud.social.ranks.member",
    "hud.social.guildHeadOne",
    "hud.social.guildHeadMany",
    "hud.trade.title",
    "hud.trade.yourOffer",
    "hud.trade.theirOffer",
    "hud.trade.emptyMine",
    "hud.trade.emptyTheirs",
    "hud.trade.money",
    "hud.trade.copper",
    "hud.trade.hint",
    "hud.trade.accept",
    "hud.trade.waiting",
    "hud.trade.cancel",
    "hud.arena.title",
    "hud.arena.subtitle",
    "hud.arena.close",
    "hud.arena.offlineNote",
    "hud.arena.playerClassTitle",
    "hud.arena.playerLevelClassTitle",
    "hud.arena.noChallengers",
    "hud.arena.matchInProgress",
    "hud.arena.leaveQueue",
    "hud.arena.searching",
    "hud.arena.enterQueue",
    "hud.arena.queueNote",
    "hud.arena.ladderAllTime",
    "hud.arena.ladderOnline",
    "hud.arena.ratingSummary",
    "hud.arena.statusCountdown",
    "hud.arena.statusReturning",
    "hud.arena.statusFight",
    "hud.arena.vsLine",
    "hud.arena.levelClass",
  ];
  const interpolationValues: Record<string, string | number> = {
    active: 3,
    ability: "Fireball",
    action: "Open Chat",
    amount: 42,
    base: 14,
    buyer: "Mira",
    classes: "Warrior, Mage",
    className: "Mage",
    command: "/dance",
    completed: 12,
    count: 5,
    cost: 30,
    current: 120,
    cut: 5,
    delta: "+13",
    dps: "7.4",
    duration: "15s",
    form: "Bear",
    guild: "Night Watch",
    index: 2,
    item: "Rough Bracers",
    key: "K",
    kind: "Weapon",
    label: "Wolf",
    level: 10,
    losses: 4,
    loser: "Mira",
    marker: "Skull",
    max: 25,
    message: "Meet at the inn",
    min: 16,
    money: "12 copper",
    name: "Aki",
    needed: 400,
    perCombo: 7,
    percent: 30,
    position: 3,
    price: "1g 20s",
    proceeds: "95s",
    quality: "Rare",
    rating: 1513,
    range: 30,
    rank: 2,
    realm: "Eastbrook",
    resource: "Mana",
    seconds: 7,
    slot: 5,
    source: "Wolf",
    speed: 2.4,
    stat: "Strength",
    status: "Complete",
    summary: "30 Mana / Instant",
    tab: "Damage",
    target: "Wolf",
    view: "Current",
    wins: 9,
    winner: "Rook",
    total: 125,
    used: 2,
    value: 9,
    xp: 450,
    zone: "Northshire",
  };

  function verifyKeys(base: Record<string, unknown>, target: Record<string, unknown>, path = "") {
    for (const key in base) {
      const currentPath = path ? `${path}.${key}` : key;
      expect(target).toHaveProperty(key);
      const baseValue = base[key];
      const targetValue = target[key];
      if (typeof baseValue === "object" && baseValue !== null) {
        expect(typeof target[key]).toBe("object");
        verifyKeys(baseValue as Record<string, unknown>, targetValue as Record<string, unknown>, currentPath);
      } else {
        expect(typeof targetValue).toBe("string");
        const text = targetValue as string;
        expect(text.trim().length, `${currentPath} should not be empty`).toBeGreaterThan(0);
        expect(text, `${currentPath} should not contain placeholder markers`).not.toMatch(placeholderPattern);
      }
    }
  }

  function nestedString(target: Record<string, unknown>, key: string): string {
    let node: unknown = target;
    for (const segment of key.split(".")) {
      if (typeof node !== "object" || node === null || !(segment in node)) return "";
      node = (node as Record<string, unknown>)[segment];
    }
    return typeof node === "string" ? node : "";
  }

  function flattenStrings(base: Record<string, unknown>, path = ""): { key: TranslationKey; value: string }[] {
    const entries: { key: TranslationKey; value: string }[] = [];
    for (const [key, value] of Object.entries(base)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (typeof value === "string") {
        entries.push({ key: currentPath as TranslationKey, value });
      } else if (typeof value === "object" && value !== null) {
        entries.push(...flattenStrings(value as Record<string, unknown>, currentPath));
      }
    }
    return entries;
  }

  function placeholders(value: string): string[] {
    return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((match) => match[1]).sort();
  }

  function entityCount(kind: string, field: string): number {
    return entityTranslationManifest().filter((entry) => entry.kind === kind && entry.field === field).length;
  }

  type EntityManifestEntry = ReturnType<typeof entityTranslationManifest>[number];
  type EntityRequest = Parameters<typeof tEntity>[0];

  function phaseSevenRequest(entry: EntityManifestEntry): EntityRequest {
    if (entry.kind === "class") {
      return { kind: "class", id: entry.id as PlayerClass, field: entry.field as "name" | "description" };
    }
    if (entry.kind === "ability") {
      return { kind: "ability", id: entry.id, field: entry.field as "name" | "description", values: { damage: "11-14" } };
    }
    throw new Error(`Unexpected Phase 7 entity kind: ${entry.kind}`);
  }

  function phaseEightRequest(entry: EntityManifestEntry): EntityRequest {
    if (entry.kind === "item") {
      return { kind: "item", id: entry.id, field: "name" };
    }
    throw new Error(`Unexpected Phase 8 entity kind: ${entry.kind}`);
  }

  function parseIndexedEntry(id: string, segment: string): { ownerId: string; index: number } {
    const marker = `.${segment}.`;
    const markerIndex = id.lastIndexOf(marker);
    if (markerIndex < 0) throw new Error(`Malformed indexed entity id: ${id}`);
    const ownerId = id.slice(0, markerIndex);
    const index = Number(id.slice(markerIndex + marker.length));
    if (!Number.isInteger(index)) throw new Error(`Malformed indexed entity index: ${id}`);
    return { ownerId, index };
  }

  function phaseNineRequest(entry: EntityManifestEntry): EntityRequest {
    if (entry.kind === "mob") return { kind: "mob", id: entry.id, field: "name" };
    if (entry.kind === "npc") {
      return {
        kind: "npc",
        id: entry.id,
        field: entry.field as "name" | "title" | "greeting",
        values: { className: "Mage", classNameLower: "mage", playerName: "Mira" },
      };
    }
    if (entry.kind === "quest") {
      return { kind: "quest", id: entry.id, field: entry.field as "title" | "text" | "completion", values: { playerName: "Mira" } };
    }
    if (entry.kind === "questObjective") {
      const { ownerId, index } = parseIndexedEntry(entry.id, "objectives");
      return { kind: "questObjective", questId: ownerId, objectiveIndex: index, field: "label" };
    }
    if (entry.kind === "zone") {
      return { kind: "zone", id: entry.id, field: entry.field as "name" | "welcome" };
    }
    if (entry.kind === "zonePoi") {
      const { ownerId, index } = parseIndexedEntry(entry.id, "pois");
      return { kind: "zonePoi", zoneId: ownerId, poiIndex: index, field: "label" };
    }
    if (entry.kind === "dungeon") {
      return { kind: "dungeon", id: entry.id, field: entry.field as "name" | "enterText" | "leaveText" };
    }
    throw new Error(`Unexpected Phase 9 entity kind: ${entry.kind}`);
  }

  function sourceFilesUnder(relativeDir: string): string[] {
    const root = path.resolve(process.cwd(), relativeDir);
    if (!fs.existsSync(root)) return [];
    const files: string[] = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) files.push(...sourceFilesUnder(path.relative(process.cwd(), entryPath)));
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) files.push(entryPath);
    }
    return files;
  }

  function questNarrativeSkeleton(value: string): string {
    return value
      .replace(/"[^"]*"|'[^']*'|“[^”]*”|「[^」]*」/g, "<title>")
      .replace(/\b\d+\b/g, "<count>")
      .split(/[.!?。！？:：]/)[0]
      .toLowerCase()
      .replace(/\{playername\}/g, "<player>")
      .replace(/\s+/g, " ")
      .trim();
  }

  function copiedEnglishComparable(value: string): string {
    return value
      .normalize("NFKC")
      .replace(/\u2014/g, "-")
      .replace(/[“”]/g, "\"")
      .replace(/[‘’]/g, "'")
      .replace(/\$N/g, "Mira")
      .replace(/\$C/g, "Mage")
      .replace(/\{playerName\}/g, "Mira")
      .replace(/\{className\}/g, "Mage")
      .replace(/\{classNameLower\}/g, "mage")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  for (const [code, locale] of Object.entries(locales)) {
    it(`should have 100% key match and non-empty translations for locale: ${code}`, () => {
      verifyKeys(en, locale);
    });
  }

  it("should resolve nested keys accurately using t() helper", () => {
    setLanguage("en");
    expect(t("nav.home")).toBe("Home");
    expect(t("auth.usernamePlaceholder")).toBe("Enter username");
    expect(t("loading.worldProgress", { done: 3, total: 9 })).toBe("Loading world... 3/9");

    setLanguage("es");
    expect(t("nav.home")).toBe("Inicio");
    expect(t("auth.usernamePlaceholder")).toBe("Introduce tu usuario");
    expect(t("character.levelClass", { level: 7, className: "Maga" })).toBe("Nivel 7 Maga");

    setLanguage("en");
  });

  it("should expose typed locale utilities for shell metadata and formatting", () => {
    expect(supportedLanguages).toEqual([
      "en",
      "es",
      "es_ES",
      "fr_FR",
      "fr_CA",
      "en_CA",
      "it_IT",
      "de_DE",
      "zh_CN",
      "zh_TW",
      "ko_KR",
      "ja_JP",
      "pt_BR",
      "ru_RU",
    ]);
    expect(isSupportedLanguage("de_DE")).toBe(true);
    expect(isSupportedLanguage("de-DE")).toBe(false);
    expect(languageTag("fr_CA")).toBe("fr-CA");
    expect(formatNumber(1234.5, { maximumFractionDigits: 1 }, "de_DE")).toBe("1.234,5");
    expect(formatDateTime(new Date(Date.UTC(2026, 5, 14, 12)), { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }, "en")).toBe("06/14/2026");
  });

  it("should keep technical transport errors out of localized user-facing dictionaries", () => {
    for (const locale of [en, ...Object.values(locales)]) {
      expect(locale.errors.api).not.toHaveProperty("requestFailed");
    }
  });

  it("should include current phase public shell keys in every locale", () => {
    for (const key of phaseOneShellKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should include current phase HUD, chat, and combat keys in every locale", () => {
    for (const key of phaseTwoHudKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should include current phase action bar, spellbook, and ability tooltip keys in every locale", () => {
    for (const key of phaseThreeAbilityKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should include current phase quest log and dialogue keys in every locale", () => {
    for (const key of phaseFourQuestKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should include current phase item, vendor, market, and currency keys in every locale", () => {
    for (const key of phaseFiveItemKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        expect(t(key), `${lang}.${key}`).not.toBe(key);
        expect(t(key).trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should include Phase 11 merge UI keys in every locale", () => {
    for (const key of phaseElevenMergeKeys) {
      for (const lang of supportedLanguages) {
        setLanguage(lang);
        const text = t(key, interpolationValues);
        expect(text, `${lang}.${key}`).not.toBe(key);
        expect(text.trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
    setLanguage("en");
  });

  it("should enumerate Phase 6 entity source coverage for later translation phases", () => {
    const manifest = entityTranslationManifest();
    expect(new Set(manifest.map((entry) => entry.key)).size).toBe(manifest.length);
    for (const entry of manifest) {
      expect(entry.source.trim().length, `${entry.kind}.${entry.id}.${entry.field}`).toBeGreaterThan(0);
    }

    expect(entityCount("class", "name")).toBe(Object.keys(CLASSES).length);
    expect(entityCount("class", "description")).toBe(Object.keys(CLASSES).length);
    expect(entityCount("ability", "name")).toBe(Object.keys(ABILITIES).length);
    expect(entityCount("ability", "description")).toBe(Object.keys(ABILITIES).length);
    expect(entityCount("item", "name")).toBe(Object.keys(ITEMS).length);
    expect(entityCount("mob", "name")).toBe(Object.keys(MOBS).length);
    expect(entityCount("npc", "name")).toBe(Object.keys(NPCS).length);
    expect(entityCount("npc", "title")).toBe(Object.keys(NPCS).length);
    expect(entityCount("npc", "greeting")).toBe(Object.keys(NPCS).length);
    expect(entityCount("quest", "title")).toBe(Object.keys(QUESTS).length);
    expect(entityCount("quest", "text")).toBe(Object.keys(QUESTS).length);
    expect(entityCount("quest", "completion")).toBe(Object.keys(QUESTS).length);
    expect(entityCount("questObjective", "label")).toBe(Object.values(QUESTS).reduce((sum, quest) => sum + quest.objectives.length, 0));
    expect(entityCount("zone", "name")).toBe(ZONES.length);
    expect(entityCount("zone", "welcome")).toBe(ZONES.length);
    expect(entityCount("zonePoi", "label")).toBe(ZONES.reduce((sum, zone) => sum + zone.pois.length, 0));
    expect(entityCount("dungeon", "name")).toBe(Object.keys(DUNGEONS).length);
    expect(entityCount("dungeon", "enterText")).toBe(Object.keys(DUNGEONS).length);
    expect(entityCount("dungeon", "leaveText")).toBe(Object.keys(DUNGEONS).length);
  });

  it("should resolve Phase 7 class and ability text without canonical fallbacks", () => {
    resetEntityTranslationFallbackLog();
    setLanguage("de_DE");
    expect(tEntity({ kind: "class", id: "mage", field: "name" })).toBe(t("classes.mage"));
    expect(entityTranslationFallbackLog()).toHaveLength(0);

    const ability = ABILITIES.fireball;
    const abilityName = tEntity({ kind: "ability", id: ability.id, field: "name" });
    const abilityDescription = tEntity({ kind: "ability", id: ability.id, field: "description", values: { damage: "11-14" } });
    expect(abilityName).toBe("Feuerball");
    expect(abilityName).not.toBe(ability.name);
    expect(abilityDescription).toContain("11-14");
    expect(abilityDescription).not.toContain("$d");
    expect(abilityDescription).not.toContain("{damage}");
    expect(entityTranslationFallbackLog()).toHaveLength(0);

    const npcGreeting = tEntity({ kind: "npc", id: "marshal_redbrook", field: "greeting", values: { className: "Magier", classNameLower: "magier", playerName: "Mira" } });
    expect(npcGreeting).toContain("Magier");
    expect(npcGreeting).not.toContain("$C");
    expect(entityTranslationFallbackLog()).toHaveLength(0);

    setLanguage("en");
    resetEntityTranslationFallbackLog();
  });

  it("should provide every Phase 7 class and ability translation in every locale", () => {
    const phaseSevenEntries = entityTranslationManifest().filter((entry) => entry.phase === "phase7");
    expect(phaseSevenEntries).toHaveLength((Object.keys(CLASSES).length * 2) + (Object.keys(ABILITIES).length * 2));
    expect(missingEntityTranslationsForPhases(["phase7"])).toHaveLength(0);

    for (const lang of supportedLanguages) {
      setLanguage(lang);
      resetEntityTranslationFallbackLog();
      for (const entry of phaseSevenEntries) {
        const rendered = tEntity(phaseSevenRequest(entry));
        expect(rendered.trim().length, `${lang}.${entry.key}`).toBeGreaterThan(0);
        expect(rendered, `${lang}.${entry.key}`).not.toBe(entry.key);
        expect(rendered, `${lang}.${entry.key}`).not.toContain("$d");
        expect(rendered, `${lang}.${entry.key}`).not.toMatch(/\{damage\}/);
        if (lang !== "en" && lang !== "en_CA" && entry.kind === "ability" && entry.field === "description") {
          expect(rendered, `${lang}.${entry.key} should not use English yard abbreviation`).not.toMatch(/\byd\b/i);
        }
        if (entry.kind === "ability" && entry.field === "description" && entry.source.includes("$d")) {
          expect(rendered, `${lang}.${entry.key}`).toContain("11-14");
        }
      }
      expect(entityTranslationFallbackLog(), `${lang} Phase 7 fallback log`).toHaveLength(0);
    }

    setLanguage("en");
  });

  it("should provide every Phase 8 item translation in every locale without canonical fallbacks", () => {
    const phaseEightEntries = entityTranslationManifest().filter((entry) => entry.phase === "phase8");
    expect(phaseEightEntries).toHaveLength(Object.keys(ITEMS).length);
    expect(missingEntityTranslationsForPhases(["phase7", "phase8"])).toHaveLength(0);

    for (const lang of supportedLanguages) {
      setLanguage(lang);
      resetEntityTranslationFallbackLog();
      for (const entry of phaseEightEntries) {
        const rendered = tEntity(phaseEightRequest(entry));
        expect(rendered.trim().length, `${lang}.${entry.key}`).toBeGreaterThan(0);
        expect(rendered, `${lang}.${entry.key}`).not.toBe(entry.key);
        if (lang !== "en" && lang !== "en_CA") {
          expect(rendered, `${lang}.${entry.key} should not copy canonical English item text`).not.toBe(entry.source);
        }
      }
      expect(entityTranslationFallbackLog(), `${lang} Phase 8 fallback log`).toHaveLength(0);
    }

    setLanguage("de_DE");
    resetEntityTranslationFallbackLog();
    expect(tEntity({ kind: "item", id: "worn_sword", field: "name" })).toBe("Abgenutztes Kurzschwert");
    expect(tEntity({ kind: "item", id: "gravecaller_sigil", field: "name" })).toBe("Gravecallers Siegel");
    expect(entityTranslationFallbackLog()).toHaveLength(0);

    setLanguage("en");
  });

  it("should route Phase 7 class-detail damage ranges through localized templates", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/main.ts"), "utf8");
    expect(source).toContain("abilityUi.tooltip.damageRange");
    expect(source).toContain("abilityUi.tooltip.finisherDamage");
    expect(source).not.toContain(" to ${primaryEffect.max}");
    expect(source).not.toContain(" plus ${primaryEffect.perCombo} per combo point");

    setLanguage("de_DE");
    expect(t("abilityUi.tooltip.damageRange", { min: "16", max: "25" })).toBe("16 bis 25");
    setLanguage("zh_CN");
    expect(t("abilityUi.tooltip.damageRange", { min: "16", max: "25" })).toBe("16 到 25");
    setLanguage("en");
  });

  it("should expose no phase-gated missing entity translations through Phase 9", () => {
    const phaseSevenMissing = missingEntityTranslationsForPhases(["phase7"]);
    expect(phaseSevenMissing).toHaveLength(0);

    expect(missingEntityTranslationsForPhases(["phase7", "phase8"])).toHaveLength(0);
    expect(missingEntityTranslationsForPhases(["phase9"])).toHaveLength(0);
    expect(missingEntityTranslationsForPhases(["phase7", "phase8", "phase9"])).toHaveLength(0);
    expect(() => assertEntityTranslationsReady([])).not.toThrow();
    expect(() => assertEntityTranslationsReady(["phase7"])).not.toThrow();
    expect(() => assertEntityTranslationsReady(["phase7", "phase8"])).not.toThrow();
    expect(() => assertEntityTranslationsReady(["phase7", "phase8", "phase9"])).not.toThrow();
  });

  it("should provide every Phase 9 world-content translation in every locale without canonical fallbacks", () => {
    const phaseNineEntries = entityTranslationManifest().filter((entry) => entry.phase === "phase9");
    const expectedPhaseNineCount =
      Object.keys(MOBS).length
      + (Object.keys(NPCS).length * 3)
      + (Object.keys(QUESTS).length * 3)
      + Object.values(QUESTS).reduce((sum, quest) => sum + quest.objectives.length, 0)
      + (ZONES.length * 2)
      + ZONES.reduce((sum, zone) => sum + zone.pois.length, 0)
      + (Object.keys(DUNGEONS).length * 3);
    expect(phaseNineEntries).toHaveLength(expectedPhaseNineCount);

    for (const lang of supportedLanguages) {
      setLanguage(lang);
      resetEntityTranslationFallbackLog();
      for (const entry of phaseNineEntries) {
        const rendered = tEntity(phaseNineRequest(entry));
        expect(rendered.trim().length, `${lang}.${entry.key}`).toBeGreaterThan(0);
        expect(rendered, `${lang}.${entry.key}`).not.toBe(entry.key);
        expect(rendered, `${lang}.${entry.key}`).not.toMatch(/\$N|\$C|\{playerName\}|\{className\}|\{classNameLower\}/);
        if (lang !== "en" && lang !== "en_CA" && entry.kind === "quest" && (entry.field === "text" || entry.field === "completion")) {
          expect(copiedEnglishComparable(rendered), `${lang}.${entry.key} should not copy canonical English quest narrative`)
            .not.toBe(copiedEnglishComparable(entry.source));
        }
      }
      expect(entityTranslationFallbackLog(), `${lang} Phase 9 fallback log`).toHaveLength(0);
    }

    setLanguage("de_DE");
    expect(tEntity({ kind: "mob", id: "forest_wolf", field: "name" })).toBe("Waldwolf");
    expect(tEntity({ kind: "quest", id: "q_wolves", field: "title" })).toBe("Wölfe vor der Tür");
    expect(tEntity({ kind: "zone", id: "eastbrook_vale", field: "name" })).toBe("Eastbrook-Tal");

    setLanguage("zh_CN");
    expect(tEntity({ kind: "quest", id: "q_gravewyrm", field: "title" })).toContain("科祖尔");

    setLanguage("ja_JP");
    expect(tEntity({ kind: "dungeon", id: "hollow_crypt", field: "name" })).toBe("虚ろの墓所");

    setLanguage("ko_KR");
    expect(tEntity({ kind: "mob", id: "forest_wolf", field: "name" })).toBe("숲늑대");
    expect(tEntity({ kind: "zone", id: "eastbrook_vale", field: "name" })).toBe("이스트브룩 골짜기");

    setLanguage("it_IT");
    expect(tEntity({ kind: "mob", id: "forest_wolf", field: "name" })).toBe("Lupo della foresta");
    expect(tEntity({ kind: "quest", id: "q_wolves", field: "title" })).not.toBe("Lobos a la puerta");

    setLanguage("pt_BR");
    expect(tEntity({ kind: "quest", id: "q_wolves", field: "title" })).toBe("Lobos à porta");
    expect(tEntity({ kind: "quest", id: "q_wolves", field: "title" })).not.toBe("Lobos a la puerta");
    expect(entityTranslationFallbackLog()).toHaveLength(0);

    setLanguage("en");
  });

  it("should provide Phase 12 talent content translations for every supported locale", () => {
    const talentEntries = talentTranslationManifest();
    expect(talentEntries.length).toBeGreaterThan(250);
    expect(new Set(talentEntries.map((entry) => `${entry.kind}:${entry.classId}:${entry.specId ?? "class"}:${entry.id}:${entry.field}`)).size).toBe(talentEntries.length);

    for (const lang of supportedLanguages) {
      setLanguage(lang);
      for (const entry of talentEntries) {
        const rendered = renderTalentManifestEntry(entry);
        expect(rendered.trim().length, `${lang}.${entry.id}.${entry.field}`).toBeGreaterThan(0);
        expect(rendered, `${lang}.${entry.id}.${entry.field}`).not.toMatch(placeholderPattern);
        if (lang !== "en" && lang !== "en_CA" && entry.field === "description") {
          expect(copiedEnglishComparable(rendered), `${lang}.${entry.id}.${entry.field} should not copy canonical English talent prose`)
            .not.toBe(copiedEnglishComparable(entry.source));
        }
        // Talent NAMES must not leak English either. A name may legitimately equal
        // English only when it is a deliberate cross-language cognate recorded as an
        // explicit titleOverride (e.g. French "Riposte", Spanish "Vigor"); a name that
        // matches English WITHOUT such an override is an accidental leak (e.g. a new
        // talent whose vocabulary the translation tables do not yet cover).
        if (lang !== "en" && lang !== "en_CA" && entry.field === "name" && !hasTalentTitleOverride(lang, entry.source)) {
          expect(copiedEnglishComparable(rendered), `${lang}.${entry.id}.name leaks English with no explicit titleOverride`)
            .not.toBe(copiedEnglishComparable(entry.source));
        }
      }
    }

    setLanguage("es");
    expect(renderTalentManifestEntry(talentEntries.find((entry) => entry.id === "war_toughness" && entry.field === "name")!)).toContain("Dureza");
    expect(renderTalentManifestEntry(talentEntries.find((entry) => entry.id === "arms.mastery" && entry.field === "description")!)).toContain("daño");

    setLanguage("zh_CN");
    expect(renderTalentManifestEntry(talentEntries.find((entry) => entry.id === "war_cruelty" && entry.field === "name")!)).toContain("残忍");

    setLanguage("ko_KR");
    expect(renderTalentManifestEntry(talentEntries.find((entry) => entry.id === "prot_choice.pc_last_stand" && entry.field === "description")!)).toContain("생명력");

    setLanguage("en");
  });

  it("should use explicit Phase 9 quest narrative translations instead of generated templates", () => {
    const phaseNineSource = fs.readFileSync(path.resolve(process.cwd(), "src/ui/phase9_i18n.ts"), "utf8");
    expect(phaseNineSource).not.toContain("questText:");
    expect(phaseNineSource).not.toContain("questCompletion:");
    expect(phaseNineSource).not.toContain("...zhCnData");
    expect(phaseNineSource).not.toMatch(/const zhTwData[\s\S]*\.\.\.zhCnData[\s\S]*const koData/);

    const genericPatterns = [
      /^Para ".+", completa estos objetivos:/,
      /^Has completado ".+"\./,
      /^Pour ".+", accomplissez ces objectifs:/,
      /^".+" est terminé\./,
      /^Per ".+", completa questi obiettivi:/,
      /^".+" è completata\./,
      /^Für ".+" erfülle diese Ziele:/,
      /^".+" ist abgeschlossen\./,
      /^执行“.+”：完成这些目标：/,
      /^“.+”已经完成。你的援手让这片地区得以喘息。$/,
      /^執行「.+」：完成這些目標：/,
      /^「.+」已完成。你的援手讓這片地區得以喘息。$/,
      /^".+" 임무를 위해 다음 목표를 완료하십시오:/,
      /^".+" 임무를 완료했습니다。?/,
      /^「.+」では次の目標を達成してください:/,
      /^「.+」は完了しました。/,
      /^Para ".+", cumpra estes objetivos:/,
      /^".+" foi concluída\./,
      /^Для задания ".+" выполните цели:/,
      /^Задание ".+" выполнено\./,
    ];

    const questIds = Object.keys(QUESTS);
    const checkedLanguages = supportedLanguages.filter((lang) => lang !== "en" && lang !== "en_CA");

    for (const lang of checkedLanguages) {
      setLanguage(lang);
      const textSkeletons = new Set<string>();
      const completionSkeletons = new Set<string>();

      for (const questId of questIds) {
        const text = tEntity({ kind: "quest", id: questId, field: "text", values: { playerName: "Mira" } });
        const completion = tEntity({ kind: "quest", id: questId, field: "completion", values: { playerName: "Mira" } });
        for (const pattern of genericPatterns) {
          expect(text, `${lang}.${questId}.text generic narrative`).not.toMatch(pattern);
          expect(completion, `${lang}.${questId}.completion generic narrative`).not.toMatch(pattern);
        }
        textSkeletons.add(questNarrativeSkeleton(text));
        completionSkeletons.add(questNarrativeSkeleton(completion));
      }

      expect(textSkeletons.size, `${lang} quest text skeleton diversity`).toBeGreaterThan(Math.floor(questIds.length * 0.8));
      expect(completionSkeletons.size, `${lang} quest completion skeleton diversity`).toBeGreaterThan(Math.floor(questIds.length * 0.6));
    }

    setLanguage("en");
  });

  it("should keep representative Phase 9 quest narratives translated with quest-specific content", () => {
    const expectations: Array<readonly [typeof supportedLanguages[number], string, "text" | "completion", string]> = [
      ["es", "q_hollow", "completion", "Eastbrook te debe"],
      ["fr_FR", "q_idols", "completion", "La secte a commencé ici"],
      ["it_IT", "q_bastion_door", "completion", "corda marcia"],
      ["de_DE", "q_wolves", "text", "Nordstraße"],
      ["zh_CN", "q_wyrm_sigils", "text", "墓龙科祖尔"],
      ["zh_TW", "q_gravewyrm", "completion", "三地死者"],
      ["ko_KR", "q_necromancers", "completion", "십일조"],
      ["ja_JP", "q_mistcaller", "text", "百人"],
      ["pt_BR", "q_drogmar", "completion", "comprou um inverno"],
      ["ru_RU", "q_gravewyrm", "text", "полупроснувшийся Wyrm"],
    ];

    for (const [lang, questId, field, expected] of expectations) {
      setLanguage(lang);
      expect(tEntity({ kind: "quest", id: questId, field, values: { playerName: "Mira" } })).toContain(expected);
    }

    setLanguage("en");
  });

  it("should keep Traditional Chinese Phase 9 world content out of Simplified-only shortcuts", () => {
    const simplifiedOnlyCharacters = /[颚猪网潜强盗宁无钳鱼妇贪鲁唤师执荆军风领热灵蹒垒缚仆骑挥雾维圣卫复这门进队战击个补桥吗块环声钥]/;
    const phaseNineEntries = entityTranslationManifest().filter((entry) => entry.phase === "phase9");

    setLanguage("zh_TW");
    for (const entry of phaseNineEntries) {
      const rendered = tEntity(phaseNineRequest(entry));
      expect(rendered, `zh_TW.${entry.key}`).not.toMatch(simplifiedOnlyCharacters);
    }

    expect(t("worldContent.dungeonInstanceBusy", { name: "墓龍聖所" })).toContain("佔用");
    expect(t("worldContent.dungeonInstanceBusy", { name: "墓龍聖所" })).not.toMatch(simplifiedOnlyCharacters);
    setLanguage("en");
  });

  it("should keep the entity resolver out of simulation and server modules", () => {
    for (const file of [...sourceFilesUnder("src/sim"), ...sourceFilesUnder("server")]) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/(?:from|import)\s+["'][^"']*ui\/(?:i18n|entity_i18n)["']/);
    }
  });

  it("should route rendered world-content labels through localized entity helpers", () => {
    const hudSource = fs.readFileSync(path.resolve(process.cwd(), "src/ui/hud.ts"), "utf8");
    expect(hudSource).toContain("zoneDisplayName");
    expect(hudSource).toContain("$('#zone-label').textContent = zoneDisplayName");
    expect(hudSource).toContain("zonePoiLabel");
    expect(hudSource).toContain("dungeonDisplayNameFromSource");
    expect(hudSource).not.toContain("zoneWelcomeText(");

    const rendererSource = fs.readFileSync(path.resolve(process.cwd(), "src/render/renderer.ts"), "utf8");
    expect(rendererSource).toContain("objectDisplayName");
    expect(rendererSource).toContain("worldContent.corpseName");
    expect(rendererSource).not.toContain("`${e.name} (corpse)`");
  });

  it("should preserve and render every Phase 2 HUD interpolation placeholder in every locale", () => {
    const phaseTwoDynamicKeys = flattenStrings(en.hud, "hud")
      .map(({ key, value }) => ({ key, expected: placeholders(value) }))
      .filter(({ expected }) => expected.length > 0);
    const allLocales: Record<string, typeof en> = { en, ...locales };

    for (const { key, expected } of phaseTwoDynamicKeys) {
      for (const [lang, locale] of Object.entries(allLocales)) {
        const template = nestedString(locale, key);
        expect(placeholders(template), `${lang}.${key} placeholders`).toEqual(expected);
        expect(isSupportedLanguage(lang)).toBe(true);
        if (!isSupportedLanguage(lang)) continue;
        setLanguage(lang);
        const rendered = t(key, interpolationValues);
        expect(rendered, `${lang}.${key} should not leave placeholders unresolved`).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/);
        for (const placeholder of expected) {
          expect(rendered, `${lang}.${key} should include ${placeholder}`).toContain(String(interpolationValues[placeholder]));
        }
      }
    }

    setLanguage("en");
  });

  it("should preserve and render every Phase 3 ability UI interpolation placeholder in every locale", () => {
    const phaseThreeDynamicKeys = flattenStrings(en.abilityUi, "abilityUi")
      .map(({ key, value }) => ({ key, expected: placeholders(value) }))
      .filter(({ expected }) => expected.length > 0);
    const allLocales: Record<string, typeof en> = { en, ...locales };

    for (const { key, expected } of phaseThreeDynamicKeys) {
      for (const [lang, locale] of Object.entries(allLocales)) {
        const template = nestedString(locale, key);
        expect(placeholders(template), `${lang}.${key} placeholders`).toEqual(expected);
        expect(isSupportedLanguage(lang)).toBe(true);
        if (!isSupportedLanguage(lang)) continue;
        setLanguage(lang);
        const rendered = t(key, interpolationValues);
        expect(rendered, `${lang}.${key} should not leave placeholders unresolved`).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/);
        for (const placeholder of expected) {
          expect(rendered, `${lang}.${key} should include ${placeholder}`).toContain(String(interpolationValues[placeholder]));
        }
      }
    }

    setLanguage("en");
  });

  it("should preserve and render every Phase 4 quest UI interpolation placeholder in every locale", () => {
    const phaseFourDynamicKeys = flattenStrings(en.questUi, "questUi")
      .map(({ key, value }) => ({ key, expected: placeholders(value) }))
      .filter(({ expected }) => expected.length > 0);
    const allLocales: Record<string, typeof en> = { en, ...locales };

    for (const { key, expected } of phaseFourDynamicKeys) {
      for (const [lang, locale] of Object.entries(allLocales)) {
        const template = nestedString(locale, key);
        expect(placeholders(template), `${lang}.${key} placeholders`).toEqual(expected);
        expect(isSupportedLanguage(lang)).toBe(true);
        if (!isSupportedLanguage(lang)) continue;
        setLanguage(lang);
        const rendered = t(key, interpolationValues);
        expect(rendered, `${lang}.${key} should not leave placeholders unresolved`).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/);
        for (const placeholder of expected) {
          expect(rendered, `${lang}.${key} should include ${placeholder}`).toContain(String(interpolationValues[placeholder]));
        }
      }
    }

    setLanguage("en");
  });

  it("should preserve and render every Phase 5 item UI interpolation placeholder in every locale", () => {
    const phaseFiveDynamicKeys = flattenStrings(en.itemUi, "itemUi")
      .map(({ key, value }) => ({ key, expected: placeholders(value) }))
      .filter(({ expected }) => expected.length > 0);
    const allLocales: Record<string, typeof en> = { en, ...locales };

    for (const { key, expected } of phaseFiveDynamicKeys) {
      for (const [lang, locale] of Object.entries(allLocales)) {
        const template = nestedString(locale, key);
        expect(placeholders(template), `${lang}.${key} placeholders`).toEqual(expected);
        expect(isSupportedLanguage(lang)).toBe(true);
        if (!isSupportedLanguage(lang)) continue;
        setLanguage(lang);
        const rendered = t(key, interpolationValues);
        expect(rendered, `${lang}.${key} should not leave placeholders unresolved`).not.toMatch(/\{[A-Za-z][A-Za-z0-9]*\}/);
        for (const placeholder of expected) {
          expect(rendered, `${lang}.${key} should include ${placeholder}`).toContain(String(interpolationValues[placeholder]));
        }
      }
    }

    setLanguage("en");
  });

  it("should interpolate Phase 2 combat, chat, and log templates without dropping values", () => {
    setLanguage("de_DE");
    expect(t("hud.combat.damageDoneCrit", { ability: "Feuerball", target: "Wolf", amount: 42 })).toContain("42");
    expect(t("hud.errors.chatCooldown", { seconds: 7 })).toContain("7");

    setLanguage("ja_JP");
    const guildChat = t("hud.chat.templates.guild", { name: "Aki", message: "集合" });
    expect(guildChat).toContain("Aki");
    expect(guildChat).toContain("集合");

    setLanguage("zh_CN");
    expect(t("hud.logs.lootReceiveItem", { item: "粗糙护腕" })).toContain("粗糙护腕");

    setLanguage("en");
  });

  it("should format Phase 3 ability tooltip templates without dropping dynamic values", () => {
    setLanguage("de_DE");
    expect(t("abilityUi.tooltip.cooldownSeconds", { seconds: 8 })).toContain("8");
    expect(t("abilityUi.spellbook.trainableAtLevel", { level: 10 })).toContain("10");

    setLanguage("ko_KR");
    const knownAbility = t("abilityUi.spellbook.knownAbilityAria", {
      name: "Fireball",
      rank: 2,
      summary: "30 Mana / Instant",
    });
    expect(knownAbility).toContain("Fireball");
    expect(knownAbility).toContain("2");

    setLanguage("ja_JP");
    const finisher = t("abilityUi.tooltip.finisherDamage", { base: 14, perCombo: 7 });
    expect(finisher).toContain("14");
    expect(finisher).toContain("7");

    setLanguage("en");
  });

  it("should format Phase 4 quest UI templates without dropping dynamic values", () => {
    setLanguage("de_DE");
    expect(t("questUi.log.summary", { active: 3, completed: 8 })).toContain("3");
    expect(t("questUi.log.summary", { active: 3, completed: 8 })).toContain("8");

    setLanguage("fr_FR");
    expect(t("questUi.dialog.availableQuestAria", { name: "A Swift Response" })).toContain("A Swift Response");

    setLanguage("ja_JP");
    const progress = t("questUi.detail.objectiveProgress", { label: "Forest Wolves slain", current: 4, total: 8 });
    expect(progress).toContain("Forest Wolves slain");
    expect(progress).toContain("4");
    expect(progress).toContain("8");

    setLanguage("en");
  });

  it("should format Phase 5 item UI and money helpers without dropping dynamic values", () => {
    setLanguage("de_DE");
    expect(t("itemUi.vendor.goodsTitle", { name: "Haldren" })).toContain("Haldren");
    expect(t("itemUi.market.sellNote", { cut: 5, used: 2, max: 12 })).toContain("5");
    expect(formatMoney(123456)).toBe("12G 34S 56K");

    setLanguage("fr_FR");
    expect(t("itemUi.logs.sellerSold", { buyer: "Mira", item: "Cracked Wolf Fang", money: "1 po", proceeds: "95 pa" })).toContain("Mira");
    expect(formatMoney(10001)).toBe("1po 0pa 1pc");

    setLanguage("ja_JP");
    expect(t("itemUi.tooltip.useFood", { amount: 61, seconds: 18 })).toContain("61");
    expect(formatMoney(7)).toBe("7銅");

    setLanguage("en");
  });

  it("should expose all supported hreflang alternates in index.html", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");
    const expectedHreflang = [
      "en",
      "es",
      "es-ES",
      "fr-FR",
      "fr-CA",
      "en-CA",
      "it-IT",
      "de-DE",
      "zh-CN",
      "zh-TW",
      "ko-KR",
      "ja-JP",
      "pt-BR",
      "ru-RU",
      "x-default",
    ];
    for (const hreflang of expectedHreflang) {
      expect(html, `missing hreflang ${hreflang}`).toContain(`hreflang="${hreflang}"`);
    }
    expect(html).toContain('data-i18n-content="seo.description"');
    expect(html).toContain('data-i18n-placeholder="hud.core.chatPlaceholder"');
    expect(html).toContain('data-i18n="hud.core.chatTab"');
    expect(html).toContain('data-i18n="entities.zones.eastbrook_vale.name"');
    expect(html).toContain('data-i18n-title="itemUi.bags.title"');
    expect(html).toContain('data-i18n-aria="hud.core.mobileControls"');
    expect(html).toContain('data-i18n="hud.core.mobileMove"');
    expect(html).toContain('data-i18n="hud.core.mobileCamera"');
    expect(html).toContain('data-i18n="hud.core.mobileAttack"');
    expect(html).toContain('data-i18n="hud.core.mobileTarget"');
    expect(html).toContain('data-i18n="hud.core.mobileChat"');
    expect(html).toContain('data-i18n="hud.core.mobileMore"');
    expect(html).toContain('data-i18n="hud.core.mobileSocial"');
    expect(html).toContain('data-i18n="hud.core.mobileArena"');
    expect(html).toContain('data-i18n="hud.core.mobileMenu"');
    expect(html).toContain('data-i18n="hud.core.mobileUse"');
    // Note: the v0.7 layout moved damage meters from a mobile tray button to a
    // dedicated #meters-window, so there is no longer a mobile-meters button to
    // localize here (see client_shell.test.ts, which asserts no id="mobile-meters").
    expect(html).toContain('data-i18n="hud.core.mobileMap"');
    expect(html).toContain('data-i18n-title="hud.core.closeMap"');
    expect(html).toContain('id="structured-data"');
  });
});
