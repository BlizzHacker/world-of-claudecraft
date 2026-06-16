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

[English](../../README.md) · [Español](README.es.md) · [Español (España)](README.es_ES.md) · [Français](README.fr_FR.md) · **Français (Canada)** · [Italiano](README.it_IT.md) · [Deutsch](README.de_DE.md) · [简体中文](README.zh_CN.md) · [繁體中文](README.zh_TW.md) · [한국어](README.ko_KR.md) · [日本語](README.ja_JP.md) · [Português (Brasil)](README.pt_BR.md) · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft — un MMO de style classique

[Rejoignez le Discord de la communauté](https://discord.gg/GjhnUsBtw)

![Écran-titre de World of ClaudeCraft](../../docs/screenshots/title-screen.jpg)

Un micro-MMO aux saveurs de MMO d'antan que vous pouvez héberger et jouer :

1. **Jouez-y en ligne** — un véritable jeu client/serveur avec des comptes, des
   personnages persistants dans Postgres et d'autres joueurs présents dans le
   monde avec vous.
2. **Jouez-y hors ligne** dans votre fureteur pour sauter directement dans le monde.

Les deux exécutent le **même cœur de simulation déterministe** (`src/sim/`), de
sorte que le monde hors ligne se comporte exactement comme ce que le serveur
multijoueur faisant autorité exécute pour tout le monde en ligne.

## Captures d'écran

![Un groupe se rassemble devant l'apothicaire à Eastbrook](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Crépuscule au feu de camp d'Eastbrook](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Crépuscule au feu de camp d'Eastbrook* | ![Pulls de mobs élites dans the Hollow Crypt](../../docs/screenshots/hollow-crypt.jpg)<br>*Pulls de mobs élites à la lueur des torches dans the Hollow Crypt* |
| ![Les morts agités à la chapelle en ruines](../../docs/screenshots/restless-dead.jpg)<br>*Les morts agités à la chapelle en ruines* | ![Une bagarre avec les Vale Bandits](../../docs/screenshots/vale-bandits.jpg)<br>*En infériorité numérique au camp des bandits* |
| ![Old Greyjaw traqué sur la route du nord](../../docs/screenshots/old-greyjaw.jpg)<br>*Old Greyjaw, le spawn rare, rattrapé sur la route du nord* | ![Interface du marchand et des sacs](../../docs/screenshots/vendor-and-bags.jpg)<br>*On s'équipe chez Smith Haldren — infobulles, sacs, pièces* |

![World of Claude](../../worldofclaude.png)

![La communauté de World of ClaudeCraft](../../woc_community.png)

---

## Hébergez-le (une seule commande)

```bash
cp .env.example .env
# modifiez .env et définissez un POSTGRES_PASSWORD long et aléatoire
docker compose up -d --build     # postgres + serveur de jeu, entièrement compilé
# ouvrez http://localhost:8787 — comptes, personnages, le monde au complet
```

Pour un **hébergement à distance** : déployez la pile compose sur n'importe quel
VPS, définissez un vrai `POSTGRES_PASSWORD` dans l'environnement et placez le
port 8787 derrière un proxy inverse TLS (avec Caddy, ça tient en deux lignes —
`your.domain { reverse_proxy localhost:8787 }`) ; les WebSockets sont relayés
automatiquement et le client sélectionne `wss://` de lui-même sur les pages
https. Les points d'accès d'authentification sont limités en débit par IP ; les
mots de passe sont hachés avec scrypt ; les jetons expirent après 7 jours. Ne
définissez jamais `ALLOW_DEV_COMMANDS=1` en production (ça active les triches de
niveau et de téléportation utilisées par les bots de test).

## Développez en ligne (rechargement à chaud)

```bash
npm install
cp .env.example .env
# modifiez .env et donnez le même mot de passe à POSTGRES_PASSWORD et DATABASE_URL
npm run db:up        # postgres 16 dans docker (port 5433, persistant par volume)
npm run server       # serveur de jeu faisant autorité sur :8787 (REST + WebSocket)
npm run dev          # serveur de dev du client sur :5173 (relaie /api et /ws)
```

Ouvrez http://localhost:5173 → **Play Online** → créez un compte → créez un
personnage → Enter World. Ouvrez un deuxième fureteur/onglet et reconnectez-vous
— vous vous verrez l'un l'autre en ville. `Enter` ouvre le clavardage.

- **Comptes** : mots de passe hachés avec scrypt, jetons porteurs de 7 jours
  (`auth_tokens`).
- **Personnages** : jusqu'à 10 par compte ; niveau, équipement, sacs, quêtes,
  position et argent persistent en JSONB dans Postgres — sauvegardés toutes les
  30 s, à la déconnexion et à l'arrêt du serveur. Les noms sont uniques à
  l'échelle mondiale, en lettres seulement, dans le style classique.
- **Le serveur fait autorité** : les clients diffusent l'intention de
  déplacement et les commandes à 20 Hz ; le serveur exécute le monde (un seul
  `Sim` partagé) et envoie des instantanés ciblés selon l'intérêt (~120 yd)
  ainsi que des événements routés par joueur. Tout le calcul de combat, les jets
  de butin, le crédit de quête et les transactions de marchand se font côté
  serveur ; le client n'est qu'un moteur de rendu.
- **Groupes** (jusqu'à 5) : faites un clic droit sur un joueur → *Invite to
  Party*. Cadres de groupe à gauche, les membres partagent les droits de tap, le
  crédit des quêtes de kill et l'XP réparti avec les vrais bonus de groupe
  vanilla (1.166/1.3/1.43 pour 3/4/5). Clavardage de groupe avec `/p message`.
  Pastilles bleues des membres sur la minicarte.
- **Échanges** : faites un clic droit sur un joueur → *Trade*. Les deux parties
  mettent en jeu des objets et de l'argent, les deux doivent accepter, et
  l'échange est atomique et validé par le serveur (les objets de quête ne sont
  pas échangeables). S'éloigner à pied annule l'échange.
- **Duels** : clic droit → *Challenge to a Duel*. Compte à rebours de 3
  secondes, on se bat jusqu'à ce qu'un côté tombe à 1 pv — personne ne meurt, et
  le vainqueur est annoncé dans toute la zone. Courir à 60 yards de distance
  équivaut à abandonner.
- **The Ashen Coliseum** (arène classée 1c1) : appuyez sur `G` (ou le bouton ⚔)
  pour ouvrir le panneau d'arène et faire *Enter the Queue*. L'appariement vous
  jumelle avec l'adversaire au classement le plus proche en ligne, puis vous
  téléporte tous les deux dans une fosse de combat privée éclairée aux torches.
  Un compte à rebours de 5 secondes soigne et réinitialise les deux combattants
  pour un départ équitable ; le combat se termine quand l'un cède à 1 pv
  (personne ne meurt). Les victoires et les défaites font bouger un **classement
  Elo** persistant (tout le monde commence à 1500), et vous revenez exactement
  là où vous vous étiez mis en file. Le panneau affiche votre rang, l'échelle en
  ligne en temps réel et le tableau des meneurs de tous les temps
  (`GET /api/arena/leaderboard`).
- **Règles multijoueur** : droits de tap classiques (le premier joueur à blesser
  un mob possède son butin/XP/crédit de quête — les autres reçoivent « You don't
  have permission to loot that. »), les mobs reciblent l'attaquant suivant quand
  leur victime meurt (pas de reset gratuit), annonces d'arrivée/départ,
  clavardage de type `/say`.

## The Hollow Crypt — instance élite à 5 joueurs

L'intrigue de Brother Aldric se poursuit après *The Restless Dead* : **Whispers
Below** (trouvez le sceau du Gravecaller à la chapelle en ruines) → **The
Binding Rite** (récupérez du Blessed Tallow à la fouille des kobolds et de la
Ghostly Essence sur les morts agités) → **Into the Hollow** (*joueurs suggérés :
5*) — tuez Morthen the Gravecaller au fond de la crypte sous la chapelle.

- La porte de la crypte à la Fallen Chapel téléporte votre **groupe dans sa
  propre copie d'instance privée** (6 places ; les instances se réinitialisent
  après 5 minutes vides).
- À l'intérieur : couloirs éclairés aux torches, paquets de trash **élites**
  appariés (échelonnement élite vanilla : ~2.3× la santé, ~1.5× les dégâts, XP
  doublé), le miniboss Sexton Marrow et Morthen — un boss élite de niveau 10
  avec une zone d'effet **Shadow Pulse** toutes les 10 secondes. Le trash de
  donjon ne réapparaît pas tant que l'instance ne se réinitialise pas.
- Récompenses : armes rares (bleues) par archétype de classe, 1 gold, 1500 XP.
- C'est vraiment équilibré pour 5 : notre raid automatisé à 5 bots (warrior,
  paladin, priest, mage, hunter avec tir concentré + IA de soin) le nettoie en
  ~5 minutes avec ~10 morts (`node scripts/crypt_raid.mjs`, nécessite
  ALLOW_DEV_COMMANDS=1).

```
docker compose ps          # eastbrook-db (postgres:16-alpine, healthcheck)
node scripts/mp_integration.mjs   # suite de 26 vérifications API/WS/persistance
node scripts/mp_browser.mjs       # deux vrais clients fureteur se voient l'un l'autre
```

## The Sunken Bastion & Gravewyrm Sanctum

La conspiration ne s'arrête pas avec Morthen. **The Sunken Bastion** (5 joueurs,
~niveau 13, sud-est de Mirefen) abrite Vael the Mistcaller — il invoque des
vagues de Drowned Thralls à 60 % et à 30 % de santé. Le final, c'est le
**Gravewyrm Sanctum** (5 joueurs, niveau 20, sous Thornpeak) : trois chambres de
boneguard élites et de drakonid, Korgath the Bound (entre en rage sous les
30 %), Grand Necromancer Velkhar (encore des vagues d'adds) et **Korzul the
Gravewyrm** — des armes épiques tombent ici, et la chaîne de quêtes menant à lui
est faisable en solo pour que personne ne soit exclu de l'histoire.



## Jouez hors ligne

```bash
npm run dev        # ouvrez http://localhost:5173 -> Play Offline
```

Nommez votre personnage, choisissez l'une des neuf classes, et vous voilà dans
**Eastbrook Vale** (niveaux 1-7) : un bourg marchand entouré de six pôles —
chasses aux loups au nord, prairies à sangliers à l'est, the Webwood à l'ouest,
Mirror Lake au nord-ouest, une fouille de cuivre des kobolds au sud-ouest, une
chapelle en ruines avec ses morts agités au nord-est, et le camp de bandits de
Gorrak au sud-est. La route du nord grimpe par un col de montagne jusqu'à
**Mirefen Marsh** (6-13, pôle : Fenbridge) et plus haut jusqu'à **Thornpeak
Heights** (13-20, pôle : Highwatch) — trois zones, ~60 quêtes et une seule
intrigue : la conspiration du Gravecaller, des premiers os agités à l'extérieur
d'Eastbrook jusqu'à **Korzul the Gravewyrm** sous les sommets. Chaque pôle a ses
marchands (y compris des forgerons d'armes et d'armures qui vendent de l'honnête
équipement blanc), un cimetière, sa propre musique et une carte de zone.

### Contrôles (disposition classique)

| Entrée | Action |
|---|---|
| `W`/`S` | courir / reculer — `A`/`D` tournent (strafe en maintenant le bouton droit de la souris), `Q`/`E` font du strafe |
| clic-droit glissé / clic-gauche glissé | vue à la souris / caméra en orbite &nbsp;·&nbsp; la molette zoome · `Space` fait sauter |
| `Tab` | passe en revue les ennemis les plus proches · clic gauche pour cibler · clic droit pour attaquer/looter/parler |
| `1`–`9`, `0`, `-`, `=` | barre d'action |
| `F` | interagir (looter un cadavre / ramasser un objet / parler) |
| `C` `P` `L` `M` `B` `G` | personnage · grimoire · journal de quêtes · carte du monde · sacs · arène (Ashen Coliseum) |
| `V` / `R` / `Esc` | barres de nom · course automatique · fermer les fenêtres / désélectionner la cible |

### Liste de vérification de la fidélité classique

**Formules (les vraies, celles de vanilla)**
- Conversion de la rage `c = 0.0091L² + 3.23L + 4.27` ; gains de `7.5·d/c` en infligeant, `2.5·d/c` en encaissant
- Table de toucher des sorts avec la marche du +3 niveaux (96/95/94/83 %) ; rate/esquive au corps à corps selon le niveau
- Réduction de dégâts d'armure `armor/(armor + 85·AttackerLevel + 400)`
- Règles de stats pv/mana : les 20 premiers d'endurance → 1 pv chacun, le reste → 10 ; les 20 premiers d'intelligence → 1 mana, le reste → 15
- Courbe d'XP 400/900/1400/… jusqu'au niveau 20 ; XP des mobs `45 + 5·L` avec les vraies plages grises à différence nulle
- GCD de 1.5 s (1.0 s pour les rogues), minuteries de swing d'arme, règle des 5 secondes de mana

**Les neuf classes vanilla au complet (niveaux d'apprentissage et valeurs de rang
tirés de vanilla, 1–20 — les sorts gagnent des rangs en montant de niveau :
Lightning Bolt R2 au 8, R3 au 14, R4 au 20, plus de nouvelles capacités de haut
palier comme Execute, Kidney Shot, Flash Heal, Stormstrike et Starfire)**
- *Warrior* : rage, Heroic Strike (au prochain swing, hors GCD), Battle Shout,
  Charge, Rend, Thunder Clap, Hamstring, Bloodrage, Overpower (proc d'esquive)
- *Paladin* : Seal of Righteousness (enchant d'arme) déclenché par
  **Judgement**, Holy Light, Devotion Aura, Blessing of Might, Divine Protection
  (absorption), Hammer of Justice (étourdissement), Lay on Hands
- *Hunter* : **Auto Shot à distance** (8–35 yd avec la zone morte classique),
  Raptor Strike, Aspect of the Hawk, Serpent Sting, Arcane Shot, Concussive
  Shot, Mongoose Bite (proc d'esquive), Wing Clip
- *Rogue* : énergie + **combo points**, Sinister Strike, Eviscerate, Backstab
  (de dos + dague), Gouge, Evasion, Slice and Dice, Sprint
- *Priest* : Smite, Lesser Heal, Power Word: Fortitude, Shadow Word: Pain,
  **Power Word: Shield** (absorption), **Renew** (HoT), Mind Blast
- *Shaman* : Lightning Bolt, **Rockbiter Weapon** (enchant), Healing Wave, Earth
  Shock, **Lightning Shield** (épines), Flame Shock
- *Mage* : Fireball, Frost Armor, Arcane Intellect, Frostbolt, Conjure Water,
  Fire Blast, Arcane Missiles (canalisé), **Polymorph**, Frost Nova
- *Warlock* : Shadow Bolt, Demon Skin, Immolate, Corruption, **Life Tap**, Curse
  of Agony, **Drain Life** (vol de santé canalisé)
- *Druid* : Wrath, Healing Touch, Mark of the Wild, Moonfire, Rejuvenation,
  Thorns, Entangling Roots, **Bear Form** (métamorphose à bascule au 10)
- Les soins peuvent cibler les membres du groupe (cliquez un cadre de groupe,
  puis soignez) ; les buffs sont jetables sur les joueurs alliés ; les soins
  peuvent faire des critiques ; les boucliers d'absorption encaissent les dégâts
  avant la santé.

**Monde et systèmes**
- Manger/boire : asseyez-vous, ça restaure sur 18 s, ça s'interrompt aux dégâts
  ou en se levant — et oui, vous pouvez manger et boire en même temps
- Marchand : achetez de la nourriture et de l'eau, vendez vos gris ; affichage
  des pièces en g/s/c
- Objets de quête au sol avec des scintillements (récupérez les caisses de
  ravitaillement volées des bandits)
- IA des mobs : errance, aggro de proximité selon la différence de niveau, pulls
  sociaux (les murlocs s'appellent de plus loin — amenez des amis), poursuite,
  désengagement-leash-reset, butin sur cadavre, réapparitions ; un spawn rare
  (Old Greyjaw) sur une longue minuterie
- Mort → libérez l'esprit → cimetière ; dégâts de chute ; nager vous ralentit
- Journal de quêtes avec abandon, dialogues de bavardage avec salutations,
  récompenses par classe

**Présentation**
- Tout est procédural : maisons à colombages, toits de bardeaux, chapelle, étal
  de marché, tentes, feux de camp à la lumière vacillante, portail de mine,
  colonnes en ruines, quai de pêche, huttes de boue des murlocs, routes peintes
  à même le terrain, touffes d'herbe, pins et chênes, lac à l'eau animée, nuages
  à la dérive, ombres en temps réel
- Douze familles de créatures riggées
  (loup/sanglier/araignée/murloc/kobold/squelette/humanoïde/troll/ogre/élémentaire/dragonkin/mouton)
  avec animations de marche/attaque/incantation/assise/mort
- Icônes procédurales peintes pour chaque sort, objet et buff — dessinées sur
  canvas à l'exécution, aucun fichier d'asset
- Interface classique : cadres d'unité avec portraits, barres de
  buff/debuff avec durées, barre d'action avec balayages de temps de recharge +
  coloration portée/ressource, barre d'incantation/canalisation, grimoire,
  poupée d'équipement du personnage, journal de quêtes, carte du monde, fenêtres
  de marchand et de butin, infobulles bordées d'or, texte de combat flottant,
  journal de combat, barre d'XP segmentée, minicarte avec pastilles et carte de
  zone complète
- Son procédural WebAudio : impacts au corps à corps et de sorts, fanfare de
  montée de niveau, carillons de quête, tintements de pièces, le glas de la mort
  — aucun fichier audio

## Développement

```bash
npm test                        # suite vitest : formules, combat, IA, quêtes, les 9 classes,
                                #   groupes, duels, échanges, élites, la crypte
npm run build                   # build web de production
node scripts/smoke_browser.mjs  # E2E du warrior (nécessite `npm run dev` en cours)
node scripts/smoke_mage.mjs     # mage : incantation, polymorph, conjure+boire, mort/libération
node scripts/smoke_rogue.mjs    # rogue : combo points, eviscerate, marchand, manger
node scripts/visual_tour.mjs    # tournée de captures d'écran de la zone + l'interface dans tmp/
node scripts/mp_integration.mjs # suite de 26 vérifications API/WS/persistance (serveur en cours)
node scripts/social_e2e.mjs     # échange + duel sur le réseau (ALLOW_DEV_COMMANDS=1)
node scripts/arena_visual.mjs   # deux clients se mettent en file + se battent en 1c1 classé dans the Ashen Coliseum
node scripts/crypt_raid.mjs     # cinq bots nettoient the Hollow Crypt (ALLOW_DEV_COMMANDS=1)
```

Les agents fureteur peuvent piloter le déplacement via
`window.__game.controller` au lieu de simuler des touches maintenues. Utilisez
`controller.move({ forward: true }, facingRadians)` ou des indicateurs websocket
compacts comme `{ f: 1, sr: 1 }` ; appelez `controller.face(facingRadians)` pour
mettre à jour l'orientation sans changer le déplacement et `controller.stop()`
pour revenir à la vraie saisie au clavier. Le jeu en ligne envoie la même trame
de saisie au serveur, qui n'accepte que des indicateurs de déplacement
booléens/`1` et des valeurs d'orientation finies.

Disposition :

```
src/sim/      cœur de jeu déterministe à N joueurs (aucun import DOM) — partagé par toutes les cibles
src/render/   moteur de rendu Three.js : models.ts (rigs), props.ts, textures.ts (procédural)
src/game/     saisie + caméra + synthé WebAudio
src/ui/       HUD classique : cadres, fenêtres, infobulles, carte, FCT
src/net/      client en ligne : auth REST + miroir du monde WebSocket (ClientWorld)
src/world_api.ts  l'interface IWorld que Sim et ClientWorld satisfont tous les deux
server/       serveur de jeu : main.ts (HTTP+WS), game.ts (boucle du monde), db.ts, auth.ts
docker-compose.yml  postgres:16-alpine
tests/        suite vitest
scripts/      E2E fureteur + tournée de captures d'écran + tests d'intégration multijoueur
```

Les noms, les quêtes et les zones sont originaux ; les formules et les
mécaniques suivent vanilla. La graine du monde est fixée dans `src/main.ts` pour
que le monde soit le même endroit à chaque visite.

## Contribuer

Les contributions de toutes sortes sont les bienvenues : code, traductions,
signalements de bogues et documentation. Commencez par
[CONTRIBUTING.fr_CA.md](CONTRIBUTING.fr_CA.md) pour la configuration et les
consignes, et veuillez respecter notre [code de conduite](../../CODE_OF_CONDUCT.md).
Nouveau ici ? Cherchez les tickets étiquetés
[`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue),
ouvrez un [ticket](https://github.com/levy-street/world-of-claudecraft/issues/new/choose),
ou venez dire bonjour sur [Discord](https://discord.gg/GjhnUsBtw).

## Licence

Le code est [sous licence MIT](../../LICENSE) — forkez-le, remixez-le, hébergez votre
propre monde.

Les assets artistiques tiers fournis (modèles, textures, HDRI) demeurent sous
leurs propres licences — tous CC0 du domaine public sauf les normal maps d'eau
sous licence MIT, comme documenté par pack dans [CREDITS.md](../../CREDITS.md).
