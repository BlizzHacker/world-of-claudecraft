import { describe, it, expect } from "vitest";
import { localizeServerText, tServer } from "../src/ui/server_i18n";
import { setLanguage, supportedLanguages } from "../src/ui/i18n";

// Messages the authoritative server emits as plain English; the client must
// re-render them in the active locale (friends/guild/world/who/moderation).
describe("server-sent message localization", () => {
  const samples: string[] = [
    "Mira added to friends.",
    "Your friends list is full.",
    "No character named 'Zzz' exists.",
    "Bob has joined the guild.",
    "Bob is now Officer.",
    "Bob is already Guild Master.",
    "You found the guild <Knights>! You are its Guild Master.",
    "You have been removed from <Knights>.",
    "Mira has been removed from the guild by Bob.",
    "Mira has entered World of ClaudeCraft.",
    "Bob has left the world. (disconnected)",
    "Who: 3 players online on Stormforge.",
    "Who: 1 player online on Stormforge.",
    "...and 5 more.",
    "Server restart in 10 minutes.",
    "Server restart in 5 minutes.",
    "Server restart in 2 minutes.",
    "Server restart in 1 minute.",
    "Server restart in 30 seconds.",
    "Server restart in 10 seconds.",
    "Server restarting now.",
  ];

  it("recognizes and localizes every sample in every non-English locale", () => {
    for (const lang of supportedLanguages) {
      setLanguage(lang);
      for (const s of samples) {
        const out = localizeServerText(s);
        expect(out, `${lang}: "${s}" should be recognized`).not.toBeNull();
        if (lang !== "en" && lang !== "en_CA") {
          expect(out, `${lang}: "${s}" should not stay English`).not.toBe(s);
        }
      }
    }
    setLanguage("en");
  });

  it("preserves player names, guild names and counts verbatim", () => {
    for (const lang of supportedLanguages) {
      setLanguage(lang);
      expect(localizeServerText("Mira added to friends.")).toContain("Mira");
      expect(localizeServerText("You have been removed from <Knights>.")).toContain("Knights");
      expect(localizeServerText("...and 5 more.")).toContain("5");
      // /who row localizes class + zone but keeps the player name and level number
      const who = localizeServerText("Carl - level 12 warrior - Eastbrook Vale")!;
      expect(who).toContain("Carl");
      expect(who).toContain("12");
    }
    setLanguage("en");
  });

  it("returns null for text that is not a server message", () => {
    setLanguage("es");
    expect(localizeServerText("This is an ordinary chat line.")).toBeNull();
    expect(localizeServerText("")).toBeNull();
    setLanguage("en");
  });

  it("keeps every interpolation placeholder intact across all locales", () => {
    const keys = [
      "friends.added", "guild.alreadyRank", "guild.newMaster", "world.left",
      "who.header", "who.row", "who.more",
    ];
    const expected: Record<string, string> = {
      "friends.added": "name",
      "guild.alreadyRank": "name,rank",
      "guild.newMaster": "guild,name",
      "world.left": "name,reason",
      "who.header": "count,realm",
      "who.row": "className,level,name,status,zone",
      "who.more": "count",
    };
    for (const lang of supportedLanguages) {
      setLanguage(lang);
      for (const key of keys) {
        const raw = tServer(key); // no params -> placeholders survive verbatim
        const found = [...raw.matchAll(/\{([A-Za-z]+)\}/g)].map((m) => m[1]).sort().join(",");
        expect(found, `${lang}.${key} placeholders`).toBe(expected[key]);
      }
    }
    setLanguage("en");
  });
});
