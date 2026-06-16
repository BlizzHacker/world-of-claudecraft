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

[English](../../README.md) · [Español](README.es.md) · [Español (España)](README.es_ES.md) · **Français** · [Français (Canada)](README.fr_CA.md) · [Italiano](README.it_IT.md) · [Deutsch](README.de_DE.md) · [简体中文](README.zh_CN.md) · [繁體中文](README.zh_TW.md) · [한국어](README.ko_KR.md) · [日本語](README.ja_JP.md) · [Português (Brasil)](README.pt_BR.md) · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft — un MMO de style classique

[Rejoindre le Discord de la communauté](https://discord.gg/GjhnUsBtw)

![Écran-titre de World of ClaudeCraft](../../docs/screenshots/title-screen.jpg)

Un micro-MMO aux saveurs de MMO de l'ère classique que vous pouvez héberger et jouer :

1. **Jouez en ligne** — un véritable jeu client/serveur avec des comptes, des
   personnages persistants dans Postgres, et d'autres joueurs présents dans le monde avec vous.
2. **Jouez hors ligne** dans votre navigateur pour plonger directement dans le monde.

Les deux exécutent le **même cœur de simulation déterministe** (`src/sim/`), de sorte que le
monde hors ligne se comporte exactement comme ce que le serveur multijoueur faisant autorité
exécute pour tout le monde en ligne.

## Captures d'écran

![Un groupe se rassemble devant l'apothicaire à Eastbrook](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Crépuscule au feu de camp d'Eastbrook](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Crépuscule au feu de camp d'Eastbrook* | ![Packs d'élites dans le Hollow Crypt](../../docs/screenshots/hollow-crypt.jpg)<br>*Packs d'élites éclairés aux torches dans le Hollow Crypt* |
| ![Les morts agités à la chapelle en ruine](../../docs/screenshots/restless-dead.jpg)<br>*Les morts agités à la chapelle en ruine* | ![Une bagarre avec les Vale Bandits](../../docs/screenshots/vale-bandits.jpg)<br>*En infériorité numérique au camp de bandits* |
| ![Old Greyjaw traqué sur la route du nord](../../docs/screenshots/old-greyjaw.jpg)<br>*Old Greyjaw, le rare spawn, rattrapé sur la route du nord* | ![Interface du marchand et des sacs](../../docs/screenshots/vendor-and-bags.jpg)<br>*S'équiper chez Smith Haldren — infobulles, sacs, pièces* |

![World of Claude](../../worldofclaude.png)

![Communauté de World of ClaudeCraft](../../woc_community.png)

---

## Hébergez-le (une seule commande)

```bash
cp .env.example .env
# modifiez .env et définissez un POSTGRES_PASSWORD long et aléatoire
docker compose up -d --build     # postgres + serveur de jeu, entièrement construit
# ouvrez http://localhost:8787 — comptes, personnages, le monde entier
```

Pour un **hébergement distant** : déployez la stack compose sur n'importe quel VPS, définissez un vrai
`POSTGRES_PASSWORD` dans l'environnement, et placez devant le port 8787 un reverse proxy
TLS (avec Caddy, c'est deux lignes — `your.domain { reverse_proxy
localhost:8787 }`) ; les WebSockets sont proxifiés automatiquement et le client
sélectionne automatiquement `wss://` sur les pages https. Les points d'accès d'authentification sont
limités en débit par IP ; les mots de passe sont hachés avec scrypt ; les jetons expirent au bout de 7 jours. Ne définissez jamais
`ALLOW_DEV_COMMANDS=1` en production (cela active les triches de niveau/téléportation utilisées
par les bots de test).

## Développez en ligne (rechargement à chaud)

```bash
npm install
cp .env.example .env
# modifiez .env et définissez POSTGRES_PASSWORD et DATABASE_URL avec le même mot de passe
npm run db:up        # postgres 16 dans docker (port 5433, persisté en volume)
npm run server       # serveur de jeu faisant autorité sur :8787 (REST + WebSocket)
npm run dev          # serveur de dev du client sur :5173 (proxie /api et /ws)
```

Ouvrez http://localhost:5173 → **Play Online** → créez un compte → créez un
personnage → Enter World. Ouvrez un second navigateur/onglet et reconnectez-vous — vous
vous verrez l'un l'autre en ville. `Enter` ouvre le chat.

- **Comptes** : mots de passe hachés avec scrypt, jetons porteurs de 7 jours (`auth_tokens`).
- **Personnages** : jusqu'à 10 par compte ; niveau/équipement/sacs/quêtes/position/argent
  persistent en JSONB dans Postgres — sauvegardés toutes les 30 s, à la déconnexion et à
  l'arrêt du serveur. Les noms sont uniques à l'échelle mondiale, uniquement des lettres, style classique.
- **Le serveur fait autorité** : les clients diffusent l'intention de mouvement + les commandes
  à 20 Hz ; le serveur exécute le monde (un `Sim` partagé) et envoie
  des instantanés limités par l'intérêt (~120 yd) ainsi que des événements routés par joueur. Tous les
  calculs de combat, les jets de butin, le crédit de quête et les transactions avec les marchands se déroulent
  côté serveur ; le client est un moteur de rendu.
- **Groupes** (jusqu'à 5) : clic droit sur un joueur → *Invite to Party*. Les cadres de groupe
  à gauche, les membres partagent les droits de tap, le crédit des quêtes de massacre et le partage de
  l'XP avec les vrais bonus de groupe vanilla (1.166/1.3/1.43 pour 3/4/5). Chat de
  groupe avec `/p message`. Des blips bleus de membres sur la minicarte.
- **Échange** : clic droit sur un joueur → *Trade*. Les deux parties placent des objets + de l'argent,
  les deux doivent accepter, et l'échange est atomique et validé par le serveur (les objets de quête
  ne sont pas échangeables). S'éloigner annule l'échange.
- **Duels** : clic droit → *Challenge to a Duel*. Compte à rebours de 3 secondes, combat
  jusqu'à ce qu'un camp atteigne 1 pv — personne ne meurt, le vainqueur est annoncé dans toute la zone.
  Courir à 60 yards de distance entraîne un forfait.
- **The Ashen Coliseum** (arène classée 1c1) : appuyez sur `G` (ou le bouton ⚔) pour
  ouvrir le panneau d'arène et *Enter the Queue*. Le matchmaking vous associe au
  challenger en ligne au classement le plus proche, puis vous téléporte tous les deux dans une fosse de
  combat privée éclairée aux torches. Un compte à rebours de 5 secondes soigne et réinitialise les deux combattants
  pour un départ équitable ; le combat se termine lorsque l'un abandonne à 1 pv (personne ne meurt). Les victoires
  et les défaites font évoluer un **classement Elo** persistant (tout le monde commence à 1500), et
  vous revenez exactement là où vous vous êtes mis en file. Le panneau affiche votre rang, le classement
  en ligne en direct et le classement de tous les temps (`GET /api/arena/leaderboard`).
- **Règles multijoueur** : droits de tap classiques (le premier joueur à blesser un monstre possède
  son butin/XP/crédit de quête — les autres reçoivent « You don't have permission to loot
  that. »), les monstres reciblent l'attaquant suivant lorsque leur victime meurt (pas de
  réinitialisation gratuite), annonces d'arrivée/départ, chat de type `/say`.

## The Hollow Crypt — instance d'élite à 5 joueurs

L'histoire de Brother Aldric se poursuit au-delà de *The Restless Dead* : **Whispers
Below** (trouvez le sigil du Gravecaller à la chapelle en ruine) → **The Binding
Rite** (récupérez du Blessed Tallow à la fouille des kobolds et de l'Ghostly Essence auprès
des morts agités) → **Into the Hollow** (*joueurs suggérés : 5*) — tuez
Morthen the Gravecaller au fond de la crypte sous la chapelle.

- La porte de la crypte à la Fallen Chapel téléporte votre **groupe dans sa propre
  copie d'instance privée** (6 emplacements ; les instances se réinitialisent après 5 minutes de vide).
- À l'intérieur : couloirs éclairés aux torches, packs de trash **élites** appariés (mise à l'échelle
  élite vanilla : ~2,3× la santé, ~1,5× les dégâts, double XP), le miniboss Sexton
  Marrow, et Morthen — un boss élite de niveau 10 avec un AoE **Shadow Pulse**
  toutes les 10 secondes. Le trash de donjon ne réapparaît pas tant que l'instance ne se réinitialise pas.
- Récompenses : armes rares (bleues) par archétype de classe, 1 pièce d'or, 1500 XP.
- C'est réellement calibré pour 5 : notre raid automatisé de 5 bots (warrior, paladin,
  priest, mage, hunter avec IA de focus-fire + soigneur) le nettoie en ~5 minutes
  avec ~10 morts (`node scripts/crypt_raid.mjs`, nécessite ALLOW_DEV_COMMANDS=1).

```
docker compose ps          # eastbrook-db (postgres:16-alpine, healthcheck)
node scripts/mp_integration.mjs   # suite de 26 vérifications API/WS/persistance
node scripts/mp_browser.mjs       # deux vrais clients navigateur se voient l'un l'autre
```

## The Sunken Bastion & Gravewyrm Sanctum

La conspiration ne s'arrête pas avec Morthen. **The Sunken Bastion** (5 joueurs,
~niveau 13, sud-est de Mirefen) abrite Vael the Mistcaller — il invoque des vagues de
Drowned Thralls à 60 % et 30 % de santé. Le final est le **Gravewyrm
Sanctum** (5 joueurs, niveau 20, sous Thornpeak) : trois salles de boneguard et de
drakonid élites, Korgath the Bound (entre en rage en dessous de 30 %), Grand
Necromancer Velkhar (encore plus de vagues d'adds), et **Korzul the Gravewyrm** — des armes
épiques tombent ici, et la chaîne de quêtes préparatoire est faisable en solo, donc personne n'est
exclu de l'histoire.



## Jouez hors ligne

```bash
npm run dev        # ouvrez http://localhost:5173 -> Play Offline
```

Nommez votre personnage, choisissez l'une des neuf classes, et vous voilà dans **Eastbrook
Vale** (niveaux 1-7) : une ville-marché entourée de six pôles — les chasses au loup au nord, les
prairies à sangliers à l'est, le Webwood à l'ouest, Mirror Lake au nord-ouest, une fouille de cuivre des kobolds
au sud-ouest, une chapelle en ruine avec des morts agités au nord-est, et le camp de bandits de Gorrak
au sud-est. La route au nord grimpe à travers un col de montagne jusqu'à **Mirefen
Marsh** (6-13, pôle : Fenbridge) et continue jusqu'à **Thornpeak Heights** (13-20,
pôle : Highwatch) — trois zones, ~60 quêtes, et une seule trame : la conspiration du
Gravecaller, des premiers ossements agités à l'extérieur d'Eastbrook jusqu'à **Korzul the
Gravewyrm** sous les pics. Chaque pôle a des marchands (y compris des forgerons d'armes et
d'armures vendant d'honnêtes équipements blancs), un cimetière, sa propre musique, et une
carte de zone.

### Contrôles (disposition classique)

| Entrée | Action |
|---|---|
| `W`/`S` | courir / reculer — `A`/`D` tournent (strafe en maintenant le clic droit), `Q`/`E` font du strafe |
| clic droit glissé / clic gauche glissé | vue à la souris / orbite de la caméra &nbsp;·&nbsp; la molette zoome · `Space` saute |
| `Tab` | parcourir les ennemis les plus proches · clic gauche pour cibler · clic droit pour attaquer/looter/parler |
| `1`–`9`, `0`, `-`, `=` | barre d'action |
| `F` | interagir (looter un cadavre / ramasser un objet / parler) |
| `C` `P` `L` `M` `B` `G` | personnage · grimoire · journal de quêtes · carte du monde · sacs · arène (Ashen Coliseum) |
| `V` / `R` / `Esc` | plaques de nom · course auto · fermer les fenêtres / désélectionner la cible |

### Liste de contrôle de fidélité classique

**Formules (les vraies, celles de vanilla)**
- Conversion de la rage `c = 0.0091L² + 3.23L + 4.27` ; gains `7.5·d/c` en infligeant, `2.5·d/c` en subissant
- Table de toucher des sorts avec la falaise du +3 niveaux (96/95/94/83 %) ; ratés/esquives au corps à corps selon le niveau
- Réduction d'armure `armor/(armor + 85·AttackerLevel + 400)`
- Règles de stats PV/mana : les 20 premiers en endurance → 1 pv chacun, le reste → 10 ; les 20 premiers en intelligence → 1 mana, le reste → 15
- Courbe d'XP 400/900/1400/… jusqu'au niveau 20 ; XP des monstres `45 + 5·L` avec de vraies plages grises à différence nulle
- GCD de 1,5 s (1,0 s pour les rogues), minuteurs de coups d'arme, règle des 5 secondes de mana

**Les neuf classes vanilla complètes (niveaux d'apprentissage et valeurs de rang issus de vanilla, 1–20 —
les sorts gagnent des rangs à mesure que vous montez de niveau : Lightning Bolt R2 au 8, R3 au 14, R4 au 20,
plus de nouvelles capacités de haut niveau comme Execute, Kidney Shot, Flash Heal,
Stormstrike et Starfire)**
- *Warrior* : rage, Heroic Strike (au prochain coup, hors GCD), Battle Shout,
  Charge, Rend, Thunder Clap, Hamstring, Bloodrage, Overpower (proc sur esquive)
- *Paladin* : Seal of Righteousness (enchantement d'arme) libéré par **Judgement**,
  Holy Light, Devotion Aura, Blessing of Might, Divine Protection (absorption),
  Hammer of Justice (étourdissement), Lay on Hands
- *Hunter* : **Auto Shot à distance** (8–35 yd avec la dead zone classique),
  Raptor Strike, Aspect of the Hawk, Serpent Sting, Arcane Shot, Concussive
  Shot, Mongoose Bite (proc sur esquive), Wing Clip
- *Rogue* : énergie + **combo points**, Sinister Strike, Eviscerate, Backstab
  (par derrière + dague), Gouge, Evasion, Slice and Dice, Sprint
- *Priest* : Smite, Lesser Heal, Power Word: Fortitude, Shadow Word: Pain,
  **Power Word: Shield** (absorption), **Renew** (HoT), Mind Blast
- *Shaman* : Lightning Bolt, **Rockbiter Weapon** (enchantement), Healing Wave,
  Earth Shock, **Lightning Shield** (épines), Flame Shock
- *Mage* : Fireball, Frost Armor, Arcane Intellect, Frostbolt, Conjure Water,
  Fire Blast, Arcane Missiles (canalisé), **Polymorph**, Frost Nova
- *Warlock* : Shadow Bolt, Demon Skin, Immolate, Corruption, **Life Tap**,
  Curse of Agony, **Drain Life** (vol de santé canalisé)
- *Druid* : Wrath, Healing Touch, Mark of the Wild, Moonfire, Rejuvenation,
  Thorns, Entangling Roots, **Bear Form** (changement de forme à activer au 10)
- Les soins peuvent cibler les membres du groupe (cliquez sur un cadre de groupe, puis soignez) ; les buffs sont
  lançables sur les joueurs alliés ; les soins peuvent être critiques ; les boucliers d'absorption encaissent les dégâts
  avant la santé.

**Monde & systèmes**
- Manger/boire : asseyez-vous, restaure sur 18 s, s'interrompt en cas de dégâts ou si vous vous levez
  — et oui, vous pouvez manger et boire en même temps
- Marchand : achetez nourriture/eau, vendez vos gris ; affichage des pièces en o/a/c
- Objets de quête au sol avec des étincelles (récupérez les caisses d'approvisionnement des bandits)
- IA des monstres : errance, aggro de proximité selon la différence de niveau, pulls sociaux (les murlocs
  attirent de plus loin — amenez des amis), poursuite, leash-évasion-réinitialisation, butin de cadavre,
  réapparitions ; un rare spawn (Old Greyjaw) sur un long minuteur
- Mort → libérer l'esprit → cimetière ; dégâts de chute ; nager vous ralentit
- Journal de quêtes avec abandon, dialogues de gossip avec salutations, récompenses par classe

**Présentation**
- Tout est procédural : maisons à colombages, toits en bardeaux, chapelle, étal de
  marché, tentes, feux de camp à la lumière vacillante, portail de mine, colonnes en ruine,
  ponton de pêche, huttes de boue des murlocs, routes peintes dans le terrain, touffes d'herbe,
  pins + chênes, lac à l'eau animée, nuages à la dérive, ombres en temps réel
- Douze familles de créatures riggées (loup/sanglier/araignée/murloc/kobold/squelette/
  humanoïde/troll/ogre/élémentaire/dragonkin/mouton) avec animations de marche/attaque/incantation/assise/
  mort
- Icônes procédurales peintes pour chaque sort, objet et buff — dessinées sur canvas
  à l'exécution, aucun fichier d'asset
- UI classique : cadres d'unité avec portraits, barres de buff/debuff avec durées, barre
  d'action avec balayages de cooldown + coloration portée/ressource, barre d'incantation/canalisation,
  grimoire, mannequin de personnage, journal de quêtes, carte du monde, fenêtres de marchand + de butin,
  infobulles à bordure dorée, texte de combat flottant, journal de combat, barre d'XP segmentée,
  minicarte avec blips et une carte de zone complète
- Son procédural WebAudio : impacts de corps à corps/sorts, fanfare de montée de niveau, carillons de
  quête, tintements de pièces, le glas de la mort — aucun fichier audio

## Développement

```bash
npm test                        # suite vitest : formules, combat, IA, quêtes, les 9 classes,
                                #   groupes, duels, échanges, élites, la crypte
npm run build                   # build web de production
node scripts/smoke_browser.mjs  # E2E warrior (nécessite `npm run dev` en cours d'exécution)
node scripts/smoke_mage.mjs     # mage : incantation, polymorph, conjure+boire, mort/libération
node scripts/smoke_rogue.mjs    # rogue : combo points, eviscerate, marchand, manger
node scripts/visual_tour.mjs    # tour en captures d'écran de la zone + UI dans tmp/
node scripts/mp_integration.mjs # suite de 26 vérifications API/WS/persistance (serveur en cours)
node scripts/social_e2e.mjs     # échange + duel sur le réseau (ALLOW_DEV_COMMANDS=1)
node scripts/arena_visual.mjs   # deux clients se mettent en file + s'affrontent en 1c1 classé dans le Ashen Coliseum
node scripts/crypt_raid.mjs     # cinq bots nettoient le Hollow Crypt (ALLOW_DEV_COMMANDS=1)
```

Les agents de navigateur peuvent piloter le mouvement via `window.__game.controller` au lieu
de simuler des touches maintenues. Utilisez `controller.move({ forward: true }, facingRadians)`
ou des drapeaux websocket compacts tels que `{ f: 1, sr: 1 }` ; appelez
`controller.face(facingRadians)` pour mettre à jour l'orientation sans changer le mouvement et
`controller.stop()` pour revenir à la véritable saisie clavier. Le jeu en ligne envoie la
même trame d'entrée au serveur, qui n'accepte que des drapeaux de mouvement booléens/`1` et des
valeurs d'orientation finies.

Structure :

```
src/sim/      cœur de jeu déterministe à N joueurs (aucun import DOM) — partagé par toutes les cibles
src/render/   moteur de rendu Three.js : models.ts (rigs), props.ts, textures.ts (procédural)
src/game/     entrée + caméra + synthé WebAudio
src/ui/       HUD classique : cadres, fenêtres, infobulles, carte, FCT
src/net/      client en ligne : auth REST + miroir du monde WebSocket (ClientWorld)
src/world_api.ts  l'interface IWorld que Sim et ClientWorld satisfont tous deux
server/       serveur de jeu : main.ts (HTTP+WS), game.ts (boucle de monde), db.ts, auth.ts
docker-compose.yml  postgres:16-alpine
tests/        suite vitest
scripts/      E2E navigateur + tour de captures d'écran + tests d'intégration multijoueur
```

Les noms, les quêtes et les zones sont originaux ; les formules et les mécaniques suivent
vanilla. La graine du monde est fixée dans `src/main.ts` afin que le monde soit le même endroit
à chaque visite.

## Contribuer

Les contributions de toutes sortes sont les bienvenues : code, traductions,
rapports de bugs et documentation. Commencez par
[CONTRIBUTING.fr_FR.md](CONTRIBUTING.fr_FR.md) pour la mise en place et les
recommandations, et merci de respecter notre [Code de conduite](../../CODE_OF_CONDUCT.md).
Vous débutez ici ? Cherchez les tickets étiquetés
[`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue),
ouvrez un [ticket](https://github.com/levy-street/world-of-claudecraft/issues/new/choose),
ou venez dire bonjour sur [Discord](https://discord.gg/GjhnUsBtw).

## Licence

Le code est [sous licence MIT](../../LICENSE) — forkez-le, remixez-le, hébergez votre propre monde.

Les assets artistiques tiers fournis (modèles, textures, HDRIs) restent sous
leurs propres licences — tous en CC0 domaine public sauf les normal maps d'eau sous licence MIT,
comme documenté pour chaque pack dans [CREDITS.md](../../CREDITS.md).
