<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-ESM-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r165-000000?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Version](https://img.shields.io/badge/version-0.6.0-blue)](../../package.json)
[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white)](https://discord.gg/GjhnUsBtw)

[English](../../README.md) · [Español](README.es.md) · [Español (España)](README.es_ES.md) · [Français](README.fr_FR.md) · [Français (Canada)](README.fr_CA.md) · [Italiano](README.it_IT.md) · **Deutsch** · [简体中文](README.zh_CN.md) · [繁體中文](README.zh_TW.md) · [한국어](README.ko_KR.md) · [日本語](README.ja_JP.md) · [Português (Brasil)](README.pt_BR.md) · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft — ein MMO im Classic-Stil

[Tritt dem Community-Discord bei](https://discord.gg/GjhnUsBtw)

![World of ClaudeCraft Titelbildschirm](../../docs/screenshots/title-screen.jpg)

Ein Micro-MMO im Stil der Classic-Ära-MMOs, das du selbst hosten und spielen kannst:

1. **Spiele es online** — ein echtes Client/Server-Spiel mit Accounts, persistenten
   Charakteren in Postgres und anderen Spielern, die mit dir in der Welt unterwegs sind.
2. **Spiele es offline** in deinem Browser, um direkt in die Welt einzusteigen.

Beide laufen auf demselben **deterministischen Simulationskern** (`src/sim/`), sodass die
Offline-Welt sich exakt so verhält wie das, was der autoritative Mehrspieler-Server
für alle online ausführt.

## Screenshots

![Eine Gruppe versammelt sich vor dem Alchemisten in Eastbrook](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Abenddämmerung am Lagerfeuer von Eastbrook](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Abenddämmerung am Lagerfeuer von Eastbrook* | ![Elite-Pulls in The Hollow Crypt](../../docs/screenshots/hollow-crypt.jpg)<br>*Fackelbeleuchtete Elite-Pulls in The Hollow Crypt* |
| ![Die ruhelosen Toten an der zerfallenen Kapelle](../../docs/screenshots/restless-dead.jpg)<br>*Die ruhelosen Toten an der zerfallenen Kapelle* | ![Eine Schlägerei mit Vale Bandits](../../docs/screenshots/vale-bandits.jpg)<br>*In der Unterzahl am Banditenlager* |
| ![Old Greyjaw auf der Nordstraße gestellt](../../docs/screenshots/old-greyjaw.jpg)<br>*Old Greyjaw, der seltene Spawn, auf der Nordstraße gestellt* | ![Händler- und Taschen-UI](../../docs/screenshots/vendor-and-bags.jpg)<br>*Ausrüsten bei Smith Haldren — Tooltips, Taschen, Münzen* |

![World of Claude](../../worldofclaude.png)

![World of ClaudeCraft Community](../../woc_community.png)

---

## Selbst hosten (ein Befehl)

```bash
cp .env.example .env
# .env bearbeiten und ein langes, zufälliges POSTGRES_PASSWORD setzen
docker compose up -d --build     # postgres + game server, vollständig gebaut
# http://localhost:8787 öffnen — Accounts, Charaktere, die ganze Welt
```

Für **Remote-Hosting**: Lege den Compose-Stack auf einem beliebigen VPS ab, setze ein
echtes `POSTGRES_PASSWORD` in der Umgebung und stelle Port 8787 hinter einen TLS-Reverse-Proxy
(mit Caddy sind das zwei Zeilen — `your.domain { reverse_proxy
localhost:8787 }`); WebSockets werden automatisch weitergeleitet und der Client
wählt auf HTTPS-Seiten automatisch `wss://`. Auth-Endpunkte sind pro IP rate-limitiert;
Passwörter werden mit scrypt gehasht; Tokens laufen nach 7 Tagen ab. Setze niemals
`ALLOW_DEV_COMMANDS=1` in der Produktion (es aktiviert Level-/Teleport-Cheats, die
von den Test-Bots genutzt werden).

## Online entwickeln (Hot Reload)

```bash
npm install
cp .env.example .env
# .env bearbeiten und POSTGRES_PASSWORD sowie DATABASE_URL auf dasselbe Passwort setzen
npm run db:up        # postgres 16 in docker (Port 5433, volume-persistiert)
npm run server       # autoritativer game server auf :8787 (REST + WebSocket)
npm run dev          # client dev server auf :5173 (proxyt /api und /ws)
```

Öffne http://localhost:5173 → **Play Online** → erstelle einen Account → erstelle einen
Charakter → Enter World. Öffne einen zweiten Browser/Tab und melde dich erneut an — ihr
seht euch dann gegenseitig in der Stadt. `Enter` öffnet den Chat.

- **Accounts**: scrypt-gehashte Passwörter, 7-Tage-Bearer-Tokens (`auth_tokens`).
- **Charaktere**: bis zu 10 pro Account; Level/Ausrüstung/Taschen/Quests/Position/Geld
  werden als JSONB in Postgres persistiert — gespeichert alle 30 s, beim Abmelden und beim
  Herunterfahren des Servers. Namen sind global eindeutig, nur Buchstaben, im Classic-Stil.
- **Der Server ist autoritativ**: Clients streamen Bewegungsabsicht + Befehle
  mit 20 Hz; der Server führt die Welt aus (ein gemeinsamer `Sim`) und sendet
  interessensbasierte Snapshots (~120 yd) plus pro Spieler geroutete Events. Sämtliche
  Kampfberechnungen, Loot-Würfe, Quest-Anrechnungen und Händlertransaktionen finden
  serverseitig statt; der Client ist ein Renderer.
- **Gruppen** (bis zu 5): Rechtsklick auf einen Spieler → *Invite to Party*. Gruppen-Frames
  links, Mitglieder teilen sich die Tap-Rechte, erhalten Quest-Anrechnung für Kills und
  teilen XP mit den echten Vanilla-Gruppenboni (1.166/1.3/1.43 für 3/4/5). Gruppenchat
  mit `/p message`. Blaue Mitglieder-Blips auf der Minikarte.
- **Handel**: Rechtsklick auf einen Spieler → *Trade*. Beide Seiten legen Gegenstände + Geld
  an, beide müssen bestätigen, und der Tausch ist atomar und serverseitig validiert (Quest-Gegenstände
  sind nicht handelbar). Auseinandergehen bricht den Handel ab.
- **Duelle**: Rechtsklick → *Challenge to a Duel*. 3-Sekunden-Countdown, kämpft
  bis eine Seite auf 1 HP fällt — niemand stirbt, der Gewinner wird zonenweit verkündet.
  60 Yards wegzulaufen bedeutet Aufgabe.
- **The Ashen Coliseum** (1v1-gewertete Arena): Drücke `G` (oder den ⚔-Button), um
  das Arena-Panel zu öffnen und *Enter the Queue* zu wählen. Das Matchmaking paart dich mit dem
  bewertungsnächsten Herausforderer online und teleportiert euch beide in eine private,
  fackelbeleuchtete Kampfgrube. Ein 5-Sekunden-Countdown heilt und setzt beide Kämpfer zurück,
  um einen fairen Start zu gewährleisten; der Kampf endet, wenn einer bei 1 HP aufgibt (niemand stirbt).
  Siege und Niederlagen verschieben eine persistente **Elo-Wertung** (alle starten bei 1500), und
  du kehrst genau dorthin zurück, wo du dich angemeldet hast. Das Panel zeigt deinen Rang, die Live-Online-Rangliste
  und die ewige Bestenliste (`GET /api/arena/leaderboard`).
- **Mehrspieler-Regeln**: klassische Tap-Rechte (der erste Spieler, der einem Mob Schaden zufügt,
  besitzt dessen Loot/XP/Quest-Anrechnung — andere erhalten „You don't have permission to loot
  that."), Mobs zielen beim Tod ihres Opfers auf den nächsten Angreifer um (keine kostenlosen
  Resets), Beitritts-/Verlassens-Ankündigungen, Chat im `/say`-Stil.

## The Hollow Crypt — 5-Spieler-Elite-Instanz

Brother Aldrics Handlungsstrang setzt sich nach *The Restless Dead* fort: **Whispers
Below** (finde das Siegel des Gravecallers an der zerfallenen Kapelle) → **The Binding
Rite** (sammle Blessed Tallow aus der Kobold-Grabung und Ghostly Essence von
den ruhelosen Toten) → **Into the Hollow** (*empfohlene Spieler: 5*) — töte
Morthen the Gravecaller am Grund der Krypta unter der Kapelle.

- Die Kryptentür an der Fallen Chapel teleportiert deine **Gruppe in ihre eigene
  private Instanzkopie** (6 Plätze; Instanzen werden nach 5 Minuten Leerlauf zurückgesetzt).
- Innen: fackelbeleuchtete Hallen, paarweise **Elite**-Trash-Packs (Vanilla-Elite-Skalierung:
  ~2,3× Lebenspunkte, ~1,5× Schaden, doppelte XP), der Miniboss Sexton
  Marrow und Morthen — ein Elite-Boss der Stufe 10 mit einem **Shadow Pulse**-AoE
  alle 10 Sekunden. Dungeon-Trash respawnt nicht, bis die Instanz zurückgesetzt wird.
- Belohnungen: seltene (blaue) Waffen je Klassen-Archetyp, 1 Gold, 1500 XP.
- Sie ist tatsächlich auf 5 ausgelegt: Unser automatisierter 5-Bot-Raid (warrior, paladin,
  priest, mage, hunter mit Focus-Fire + Heiler-KI) räumt sie in ~5 Minuten
  mit ~10 Toden (`node scripts/crypt_raid.mjs`, benötigt ALLOW_DEV_COMMANDS=1).

```
docker compose ps          # eastbrook-db (postgres:16-alpine, healthcheck)
node scripts/mp_integration.mjs   # 26-Prüfungen API/WS/Persistenz-Suite
node scripts/mp_browser.mjs       # zwei echte Browser-Clients sehen sich gegenseitig
```

## The Sunken Bastion & Gravewyrm Sanctum

Die Verschwörung endet nicht mit Morthen. **The Sunken Bastion** (5 Spieler,
~Stufe 13, südöstliches Mirefen) beherbergt Vael the Mistcaller — er beschwört Wellen von
Drowned Thralls bei 60 % und 30 % Lebenspunkten. Das Finale ist das **Gravewyrm
Sanctum** (5 Spieler, Stufe 20, unter Thornpeak): drei Kammern voller Elite-Knochenwache
und Drakonid, Korgath the Bound (gerät unter 30 % in Rage), Grand
Necromancer Velkhar (weitere Add-Wellen) und **Korzul the Gravewyrm** — epische
Waffen droppen hier, und die vorgelagerte Questreihe ist solo machbar, sodass niemand
von der Geschichte ausgeschlossen ist.



## Offline spielen

```bash
npm run dev        # http://localhost:5173 öffnen -> Play Offline
```

Benenne deinen Charakter, wähle eine der neun Klassen, und schon bist du in **Eastbrook
Vale** (Stufen 1-7): eine Marktstadt, umringt von sechs Hubs — Wolfsreviere im Norden, Eber-Wiesen
im Osten, der Webwood im Westen, Mirror Lake im Nordwesten, eine Kobold-Kupfergrabung
im Südwesten, eine zerfallene Kapelle mit ruhelosen Toten im Nordosten und Gorraks Banditenlager
im Südosten. Die Straße nach Norden steigt durch einen Gebirgspass hinauf nach **Mirefen
Marsh** (6-13, Hub: Fenbridge) und weiter hinauf nach **Thornpeak Heights** (13-20,
Hub: Highwatch) — drei Zonen, ~60 Quests und eine Geschichte: die Gravecaller-Verschwörung,
von den ersten ruhelosen Knochen vor Eastbrook bis zu **Korzul the Gravewyrm**
unter den Gipfeln. Jeder Hub hat Händler (darunter Waffen- und Rüstungsschmiede, die ehrliche
weiße Ausrüstung verkaufen), einen Friedhof, eigene Musik und eine Zonenkarte.

### Steuerung (klassisches Layout)

| Eingabe | Aktion |
|---|---|
| `W`/`S` | laufen / rückwärts gehen — `A`/`D` drehen (strafen bei gehaltener rechter Maustaste), `Q`/`E` strafen |
| Rechts-Ziehen / Links-Ziehen | Mouselook / Kamera orbitieren &nbsp;·&nbsp; Mausrad zoomt · `Space` springt |
| `Tab` | nächste Gegner durchschalten · Linksklick anvisieren · Rechtsklick angreifen/looten/sprechen |
| `1`–`9`, `0`, `-`, `=` | Aktionsleiste |
| `F` | interagieren (Leiche looten / Objekt aufheben / sprechen) |
| `C` `P` `L` `M` `B` `G` | Charakter · Zauberbuch · Questlog · Weltkarte · Taschen · Arena (Ashen Coliseum) |
| `V` / `R` / `Esc` | Namensplaketten · Auto-Lauf · Fenster schließen / Ziel aufheben |

### Classic-Treue-Checkliste

**Formeln (die echten Vanilla-Formeln)**
- Rage-Umrechnung `c = 0.0091L² + 3.23L + 4.27`; Gewinn `7.5·d/c` beim Austeilen, `2.5·d/c` beim Einstecken
- Zauber-Treffer-Tabelle mit der +3-Stufen-Klippe (96/95/94/83 %); Nahkampf-Verfehlen/Ausweichen je nach Stufe
- Rüstungs-Schadensreduktion `armor/(armor + 85·AttackerLevel + 400)`
- HP-/Mana-Attributsregeln: erste 20 Ausdauer → je 1 HP, Rest → 10; erste 20 Intelligenz → je 1 Mana, Rest → 15
- XP-Kurve 400/900/1400/… bis Stufe 20; Mob-XP `45 + 5·L` mit echten grauen Null-Differenz-Bändern
- 1,5 s GCD (1,0 s für rogues), Waffen-Schwung-Timer, 5-Sekunden-Mana-Regel

**Alle neun Vanilla-Klassen (Lernstufen und Rang-Werte aus Vanilla, 1–20 —
Zauber erhalten Ränge, während du aufsteigst: Lightning Bolt R2 bei 8, R3 bei 14, R4 bei 20,
plus neue High-Band-Fähigkeiten wie Execute, Kidney Shot, Flash Heal,
Stormstrike und Starfire)**
- *Warrior*: Rage, Heroic Strike (beim nächsten Schwung, off-GCD), Battle Shout,
  Charge, Rend, Thunder Clap, Hamstring, Bloodrage, Overpower (Ausweich-Proc)
- *Paladin*: Seal of Righteousness (Waffenverzauberung), entfesselt durch **Judgement**,
  Holy Light, Devotion Aura, Blessing of Might, Divine Protection (Absorbierung),
  Hammer of Justice (Betäubung), Lay on Hands
- *Hunter*: **Distanz-Auto Shot** (8–35 yd mit der klassischen Dead Zone),
  Raptor Strike, Aspect of the Hawk, Serpent Sting, Arcane Shot, Concussive
  Shot, Mongoose Bite (Ausweich-Proc), Wing Clip
- *Rogue*: Energie + **Combo Points**, Sinister Strike, Eviscerate, Backstab
  (von hinten + Dolch), Gouge, Evasion, Slice and Dice, Sprint
- *Priest*: Smite, Lesser Heal, Power Word: Fortitude, Shadow Word: Pain,
  **Power Word: Shield** (Absorbierung), **Renew** (HoT), Mind Blast
- *Shaman*: Lightning Bolt, **Rockbiter Weapon** (Verzauberung), Healing Wave,
  Earth Shock, **Lightning Shield** (Dornen), Flame Shock
- *Mage*: Fireball, Frost Armor, Arcane Intellect, Frostbolt, Conjure Water,
  Fire Blast, Arcane Missiles (kanalisiert), **Polymorph**, Frost Nova
- *Warlock*: Shadow Bolt, Demon Skin, Immolate, Corruption, **Life Tap**,
  Curse of Agony, **Drain Life** (kanalisierter Gesundheitsraub)
- *Druid*: Wrath, Healing Touch, Mark of the Wild, Moonfire, Rejuvenation,
  Thorns, Entangling Roots, **Bear Form** (umschaltbare Gestaltwandlung bei 10)
- Heilungen können auf Gruppenmitglieder zielen (klicke ein Gruppen-Frame an, dann heile); Buffs
  sind auf freundliche Spieler wirkbar; Heilungen können kritisch treffen; Absorbierungsschilde
  fangen Schaden ab, bevor er die Gesundheit trifft.

**Welt & Systeme**
- Essen/Trinken: hinsetzen, regeneriert über 18 s, bricht bei Schaden oder Aufstehen ab
  — und ja, du kannst gleichzeitig essen und trinken
- Händler: Essen/Wasser kaufen, deine Grauen verkaufen; Münzanzeige in g/s/c
- Boden-Questobjekte mit Funkeln (stiehl die Versorgungskisten der Banditen zurück)
- Mob-KI: Umherwandern, Näherungs-Aggro je nach Stufenunterschied, soziale Pulls (Murlocs
  ziehen aus größerer Entfernung — bring Freunde mit), Verfolgung, Leash-Evade-Reset, Leichen-Loot,
  Respawns; ein seltener Spawn (Old Greyjaw) mit langem Timer
- Tod → Geist freilassen → Friedhof; Fallschaden; Schwimmen verlangsamt dich
- Questlog mit Abbrechen, Gossip-Dialoge mit Begrüßungen, klassenspezifische Belohnungen

**Präsentation**
- Prozedural alles: Fachwerkhäuser, Schindeldächer, Kapelle, Marktstand,
  Zelte, Lagerfeuer mit flackerndem Licht, Minenportal, zerfallene Säulen,
  Fischersteg, Murloc-Schlammhütten, in das Terrain gemalte Straßen, Grasbüschel,
  Kiefern + Eichen, See mit animiertem Wasser, ziehende Wolken, Echtzeit-Schatten
- Zwölf gerigte Kreaturenfamilien (Wolf/Eber/Spinne/Murloc/Kobold/Skelett/
  Humanoid/Troll/Oger/Elementar/Drachenkin/Schaf) mit Lauf-/Angriffs-/Zauber-/Sitz-/
  Todesanimationen
- Gemalte prozedurale Icons für jeden Zauber, Gegenstand und Buff — zur Laufzeit
  auf Canvas gezeichnet, keine Asset-Dateien
- Klassische UI: Porträt-Einheiten-Frames, Buff-/Debuff-Leisten mit Laufzeiten, Aktionsleiste
  mit Abklingzeit-Sweeps + Reichweiten-/Ressourcen-Färbung, Wirk-/Kanalleiste,
  Zauberbuch, Charakter-Paperdoll, Questlog, Weltkarte, Händler- + Loot-Fenster,
  goldumrandete Tooltips, schwebender Kampftext, Kampflog, segmentierte XP-Leiste,
  Minikarte mit Blips und eine vollständige Zonenkarte
- Prozedurale WebAudio-Klänge: Nahkampf-/Zaubertreffer, Aufstiegs-Fanfare, Quest-Glockenspiele,
  Münzklimpern, der Todes-Sting — keine Audiodateien

## Entwicklung

```bash
npm test                        # vitest-Suite: Formeln, Kampf, KI, Quests, alle 9 Klassen,
                                #   Gruppen, Duelle, Handel, Eliten, die Krypta
npm run build                   # Produktions-Web-Build
node scripts/smoke_browser.mjs  # warrior E2E (benötigt laufendes `npm run dev`)
node scripts/smoke_mage.mjs     # mage: Wirken, Polymorph, Conjure+Trinken, Tod/Freilassen
node scripts/smoke_rogue.mjs    # rogue: Combo Points, Eviscerate, Händler, Essen
node scripts/visual_tour.mjs    # Screenshot-Tour durch Zone + UI nach tmp/
node scripts/mp_integration.mjs # 26-Prüfungen API/WS/Persistenz-Suite (Server läuft)
node scripts/social_e2e.mjs     # Handel + Duell über die Leitung (ALLOW_DEV_COMMANDS=1)
node scripts/arena_visual.mjs   # zwei Clients melden sich an + kämpfen ein gewertetes 1v1 im Ashen Coliseum
node scripts/crypt_raid.mjs     # fünf Bots räumen The Hollow Crypt (ALLOW_DEV_COMMANDS=1)
```

Browser-Agenten können Bewegung über `window.__game.controller` steuern, anstatt
gehaltene Tasten zu simulieren. Verwende `controller.move({ forward: true }, facingRadians)`
oder kompakte WebSocket-Flags wie `{ f: 1, sr: 1 }`; rufe
`controller.face(facingRadians)` auf, um die Ausrichtung zu aktualisieren, ohne die Bewegung zu ändern, und
`controller.stop()`, um zur echten Tastatureingabe zurückzukehren. Online-Spiel sendet den
gleichen Eingabe-Frame an den Server, der nur boolesche/`1`-Bewegungs-Flags
und endliche Ausrichtungswerte akzeptiert.

Aufbau:

```
src/sim/      deterministischer N-Spieler-Spielkern (keine DOM-Imports) — von allen Targets geteilt
src/render/   Three.js-Renderer: models.ts (Rigs), props.ts, textures.ts (prozedural)
src/game/     Eingabe + Kamera + WebAudio-Synth
src/ui/       klassisches HUD: Frames, Fenster, Tooltips, Karte, FCT
src/net/      Online-Client: REST-Auth + WebSocket-Welt-Spiegel (ClientWorld)
src/world_api.ts  das IWorld-Interface, das sowohl Sim als auch ClientWorld erfüllen
server/       game server: main.ts (HTTP+WS), game.ts (world loop), db.ts, auth.ts
docker-compose.yml  postgres:16-alpine
tests/        vitest-Suite
scripts/      Browser-E2E + Screenshot-Tour + Mehrspieler-Integrationstests
```

Namen, Quests und die Zonen sind eigenständig; Formeln und Mechaniken folgen
Vanilla. Der Welt-Seed ist in `src/main.ts` fixiert, sodass die Welt bei jedem
Besuch derselbe Ort ist.

## Mitwirken

Beiträge jeder Art sind willkommen: Code, Übersetzungen, Fehlerberichte und
Dokumentation. Beginne mit [CONTRIBUTING.de_DE.md](CONTRIBUTING.de_DE.md) für die
Einrichtung und die Richtlinien, und bitte halte dich an unseren
[Verhaltenskodex](../../CODE_OF_CONDUCT.md). Neu hier? Halte Ausschau nach Issues mit dem
Label [`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue),
öffne ein [Issue](https://github.com/levy-street/world-of-claudecraft/issues/new/choose)
oder sag Hallo auf [Discord](https://discord.gg/GjhnUsBtw).

## Lizenz

Der Code ist [MIT-lizenziert](../../LICENSE) — forke ihn, remixe ihn, hoste deine eigene Welt.

Die mitgelieferten Kunst-Assets von Drittanbietern (Modelle, Texturen, HDRIs) bleiben unter
ihren eigenen Lizenzen — alle CC0 Public Domain außer den MIT-lizenzierten Wasser-Normal-Maps,
wie pro Pack in [CREDITS.md](../../CREDITS.md) dokumentiert.
