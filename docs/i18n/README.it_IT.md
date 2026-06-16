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

[English](../../README.md) · [Español](README.es.md) · [Español (España)](README.es_ES.md) · [Français](README.fr_FR.md) · [Français (Canada)](README.fr_CA.md) · **Italiano** · [Deutsch](README.de_DE.md) · [简体中文](README.zh_CN.md) · [繁體中文](README.zh_TW.md) · [한국어](README.ko_KR.md) · [日本語](README.ja_JP.md) · [Português (Brasil)](README.pt_BR.md) · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft — un MMO in stile classico

[Unisciti alla community su Discord](https://discord.gg/GjhnUsBtw)

![Schermata del titolo di World of ClaudeCraft](../../docs/screenshots/title-screen.jpg)

Un micro-MMO ispirato agli MMO dell'era classica che puoi ospitare e giocare:

1. **Giocalo online** — un vero gioco client/server con account, personaggi
   persistenti in Postgres e altri giocatori nel mondo insieme a te.
2. **Giocalo offline** nel tuo browser per tuffarti subito nel mondo.

Entrambe le modalità eseguono lo **stesso core di simulazione deterministico**
(`src/sim/`), quindi il mondo offline si comporta esattamente come quello che il
server multigiocatore autoritativo esegue per tutti online.

## Screenshot

![Un gruppo si raduna fuori dall'apotecario a Eastbrook](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Crepuscolo al fuoco da campo di Eastbrook](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Crepuscolo al fuoco da campo di Eastbrook* | ![Pull di elite nella Hollow Crypt](../../docs/screenshots/hollow-crypt.jpg)<br>*Pull di elite a lume di torcia nella Hollow Crypt* |
| ![I morti irrequieti presso la cappella in rovina](../../docs/screenshots/restless-dead.jpg)<br>*I morti irrequieti presso la cappella in rovina* | ![Una rissa con i Vale Bandits](../../docs/screenshots/vale-bandits.jpg)<br>*In inferiorità numerica all'accampamento dei banditi* |
| ![Old Greyjaw braccato sulla strada a nord](../../docs/screenshots/old-greyjaw.jpg)<br>*Old Greyjaw, lo spawn raro, braccato sulla strada a nord* | ![Interfaccia del venditore e delle borse](../../docs/screenshots/vendor-and-bags.jpg)<br>*Equipaggiamento dal fabbro Smith Haldren — tooltip, borse, monete* |

![World of Claude](../../worldofclaude.png)

![Comunità di World of ClaudeCraft](../../woc_community.png)

---

## Ospitalo (un solo comando)

```bash
cp .env.example .env
# modifica .env e imposta una POSTGRES_PASSWORD lunga e casuale
docker compose up -d --build     # postgres + game server, già compilato per intero
# apri http://localhost:8787 — account, personaggi, l'intero mondo
```

Per l'**hosting remoto**: metti lo stack compose su un qualsiasi VPS, imposta una
vera `POSTGRES_PASSWORD` nell'ambiente e poni davanti alla porta 8787 un reverse
proxy TLS (con Caddy bastano due righe — `your.domain { reverse_proxy
localhost:8787 }`); i WebSocket vengono inoltrati automaticamente e il client
seleziona da solo `wss://` sulle pagine https. Gli endpoint di autenticazione
hanno un rate limit per IP; le password sono cifrate con scrypt; i token scadono
dopo 7 giorni. Non impostare mai `ALLOW_DEV_COMMANDS=1` in produzione (abilita i
cheat di livello/teletrasporto usati dai bot di test).

## Sviluppa online (hot reload)

```bash
npm install
cp .env.example .env
# modifica .env e imposta POSTGRES_PASSWORD e DATABASE_URL con la stessa password
npm run db:up        # postgres 16 in docker (porta 5433, persistente su volume)
npm run server       # server di gioco autoritativo su :8787 (REST + WebSocket)
npm run dev          # server di sviluppo del client su :5173 (proxy di /api e /ws)
```

Apri http://localhost:5173 → **Play Online** → crea un account → crea un
personaggio → Enter World. Apri un secondo browser/scheda e accedi di nuovo —
vi vedrete a vicenda in città. `Enter` apre la chat.

- **Account**: password cifrate con scrypt, bearer token validi 7 giorni
  (`auth_tokens`).
- **Personaggi**: fino a 10 per account; livello/equipaggiamento/borse/quest/posizione/denaro
  persistono come JSONB in Postgres — salvati ogni 30 s, al logout e allo
  spegnimento del server. I nomi sono univoci a livello globale, solo lettere,
  in stile classico.
- **Il server è autoritativo**: i client trasmettono l'intento di movimento + i
  comandi a 20 Hz; il server esegue il mondo (un unico `Sim` condiviso) e invia
  snapshot limitati all'area di interesse (~120 yd) più eventi instradati per
  giocatore. Tutta la matematica del combattimento, i tiri sul bottino, i crediti
  delle quest e le transazioni con i mercanti avvengono lato server; il client è
  un renderer.
- **Gruppi** (fino a 5): clic destro su un giocatore → *Invite to Party*. I frame
  del gruppo a sinistra, i membri condividono i diritti di tap, il credito delle
  kill quest e la suddivisione dell'XP con i veri bonus di gruppo del vanilla
  (1.166/1.3/1.43 per 3/4/5). Chat di gruppo con `/p message`. Indicatori blu dei
  membri sulla minimappa.
- **Scambi**: clic destro su un giocatore → *Trade*. Entrambe le parti
  preparano oggetti + denaro, entrambe devono accettare e lo scambio è atomico e
  validato dal server (gli oggetti delle quest non sono scambiabili).
  Allontanarsi annulla lo scambio.
- **Duelli**: clic destro → *Challenge to a Duel*. Conto alla rovescia di 3
  secondi, si combatte finché una delle parti arriva a 1 hp — nessuno muore, il
  vincitore viene annunciato a tutta la zona. Allontanarsi di 60 yard significa
  ritirarsi.
- **The Ashen Coliseum** (arena classificata 1v1): premi `G` (o il pulsante ⚔)
  per aprire il pannello dell'arena ed *Enter the Queue*. Il matchmaking ti
  abbina allo sfidante online con il punteggio più vicino, poi teletrasporta
  entrambi in una fossa di combattimento privata e illuminata dalle torce. Un
  conto alla rovescia di 5 secondi cura e ripristina entrambi i combattenti per
  una partenza equa; l'incontro finisce quando uno si arrende a 1 hp (nessuno
  muore). Vittorie e sconfitte modificano un **punteggio Elo** persistente
  (tutti partono da 1500) e tornerai esattamente dove ti eri messo in coda. Il
  pannello mostra la tua posizione, la classifica live degli online e la
  classifica di tutti i tempi (`GET /api/arena/leaderboard`).
- **Regole multigiocatore**: diritti di tap classici (il primo giocatore a
  danneggiare un mob ne possiede bottino/XP/credito quest — gli altri ricevono
  "You don't have permission to loot that."), i mob cambiano bersaglio
  attaccando il prossimo aggressore quando la loro vittima muore (niente reset
  gratuiti), annunci di ingresso/uscita, chat in stile `/say`.

## The Hollow Crypt — istanza elite per 5 giocatori

La trama di Brother Aldric prosegue oltre *The Restless Dead*: **Whispers
Below** (trova il sigillo del Gravecaller alla cappella in rovina) → **The
Binding Rite** (raccogli Blessed Tallow dallo scavo dei kobold e Ghostly
Essence dai morti irrequieti) → **Into the Hollow** (*giocatori suggeriti: 5*)
— uccidi Morthen the Gravecaller in fondo alla cripta sotto la cappella.

- La porta della cripta alla Fallen Chapel teletrasporta il tuo **gruppo nella
  propria copia privata dell'istanza** (6 posti; le istanze si resettano dopo 5
  minuti di assenza di giocatori).
- All'interno: sale illuminate dalle torce, gruppi di trash **elite** in coppia
  (scaling elite del vanilla: ~2.3× salute, ~1.5× danni, doppio XP), il miniboss
  Sexton Marrow e Morthen — un boss elite di livello 10 con un'AoE **Shadow
  Pulse** ogni 10 secondi. Il trash del dungeon non riappare finché l'istanza non
  si resetta.
- Ricompense: armi rare (blu) per archetipo di classe, 1 oro, 1500 XP.
- È davvero calibrato per 5: il nostro raid automatizzato con 5 bot (warrior,
  paladin, priest, mage, hunter con focus-fire + IA del guaritore) lo completa in
  ~5 minuti con ~10 morti (`node scripts/crypt_raid.mjs`, richiede
  ALLOW_DEV_COMMANDS=1).

```
docker compose ps          # eastbrook-db (postgres:16-alpine, healthcheck)
node scripts/mp_integration.mjs   # suite di 26 controlli API/WS/persistenza
node scripts/mp_browser.mjs       # due client browser reali si vedono a vicenda
```

## The Sunken Bastion & Gravewyrm Sanctum

La cospirazione non finisce con Morthen. **The Sunken Bastion** (5 giocatori,
~livello 13, sud-est di Mirefen) ospita Vael the Mistcaller — evoca ondate di
Drowned Thralls al 60% e al 30% di salute. Il finale è il **Gravewyrm Sanctum**
(5 giocatori, livello 20, sotto Thornpeak): tre camere di boneguard e drakonid
elite, Korgath the Bound (va in furia sotto il 30%), Grand Necromancer Velkhar
(altre ondate di add) e **Korzul the Gravewyrm** — qui cadono armi epiche, e la
catena di quest che vi conduce è affrontabile in solitaria, così nessuno resta
escluso dalla storia.



## Gioca offline

```bash
npm run dev        # apri http://localhost:5173 -> Play Offline
```

Dai un nome al tuo personaggio, scegli una qualsiasi delle nove classi e sarai
in **Eastbrook Vale** (livelli 1-7): una città mercato circondata da sei hub —
percorsi dei lupi a nord, prati dei cinghiali a est, il Webwood a ovest, Mirror
Lake a nord-ovest, uno scavo di rame dei kobold a sud-ovest, una cappella in
rovina con i morti irrequieti a nord-est e l'accampamento di banditi di Gorrak a
sud-est. La strada a nord sale attraverso un passo montano fino a **Mirefen
Marsh** (6-13, hub: Fenbridge) e prosegue su verso **Thornpeak Heights** (13-20,
hub: Highwatch) — tre zone, ~60 quest e un'unica trama: la cospirazione del
Gravecaller, dalle prime ossa irrequiete fuori da Eastbrook fino a **Korzul the
Gravewyrm** sotto le vette. Ogni hub ha mercanti (compresi fabbri d'armi e
d'armature che vendono onesto equipaggiamento bianco), un cimitero, una propria
musica e una mappa della zona.

### Controlli (layout classico)

| Input | Azione |
|---|---|
| `W`/`S` | corri / indietreggia — `A`/`D` per girare (strafe con il tasto destro del mouse premuto), `Q`/`E` per lo strafe |
| trascina con il destro / con il sinistro | mouselook / orbita la camera &nbsp;·&nbsp; la rotella zooma · `Space` salta |
| `Tab` | scorri i nemici più vicini · clic sinistro per il bersaglio · clic destro per attaccare/saccheggiare/parlare |
| `1`–`9`, `0`, `-`, `=` | barra delle azioni |
| `F` | interagisci (saccheggia il cadavere / raccogli un oggetto / parla) |
| `C` `P` `L` `M` `B` `G` | personaggio · libro degli incantesimi · diario delle quest · mappa del mondo · borse · arena (Ashen Coliseum) |
| `V` / `R` / `Esc` | targhette dei nomi · corsa automatica · chiudi le finestre / azzera il bersaglio |

### Checklist di fedeltà al classico

**Formule (quelle reali del vanilla)**
- Conversione della rabbia `c = 0.0091L² + 3.23L + 4.27`; guadagni `7.5·d/c` infliggendo, `2.5·d/c` subendo
- Tabella di spell-hit con il salto a +3 livelli (96/95/94/83%); miss/dodge in mischia rispetto al livello
- Riduzione del danno da armatura `armor/(armor + 85·AttackerLevel + 400)`
- Regole delle statistiche HP/mana: i primi 20 di stamina → 1 hp ciascuno, il resto → 10; i primi 20 di int → 1 mana, il resto → 15
- Curva dell'XP 400/900/1400/… fino al livello 20; XP dei mob `45 + 5·L` con le vere fasce grigie a differenza zero
- GCD di 1.5 s (1.0 s per i rogue), timer di colpo delle armi, regola dei 5 secondi per il mana

**Tutte e nove le classi vanilla (livelli di apprendimento e valori di rango dal
vanilla, 1–20 — gli incantesimi acquisiscono ranghi man mano che sali di livello:
Lightning Bolt R2 a 8, R3 a 14, R4 a 20, più nuove abilità di fascia alta come
Execute, Kidney Shot, Flash Heal, Stormstrike e Starfire)**
- *Warrior*: rabbia, Heroic Strike (al prossimo colpo, fuori dal GCD), Battle
  Shout, Charge, Rend, Thunder Clap, Hamstring, Bloodrage, Overpower (proc da
  schivata)
- *Paladin*: Seal of Righteousness (incantamento dell'arma) scatenato da
  **Judgement**, Holy Light, Devotion Aura, Blessing of Might, Divine Protection
  (assorbimento), Hammer of Justice (stordimento), Lay on Hands
- *Hunter*: **Auto Shot a distanza** (8–35 yd con la classica zona morta),
  Raptor Strike, Aspect of the Hawk, Serpent Sting, Arcane Shot, Concussive
  Shot, Mongoose Bite (proc da schivata), Wing Clip
- *Rogue*: energia + **combo point**, Sinister Strike, Eviscerate, Backstab
  (alle spalle + pugnale), Gouge, Evasion, Slice and Dice, Sprint
- *Priest*: Smite, Lesser Heal, Power Word: Fortitude, Shadow Word: Pain,
  **Power Word: Shield** (assorbimento), **Renew** (HoT), Mind Blast
- *Shaman*: Lightning Bolt, **Rockbiter Weapon** (incantamento), Healing Wave,
  Earth Shock, **Lightning Shield** (spine), Flame Shock
- *Mage*: Fireball, Frost Armor, Arcane Intellect, Frostbolt, Conjure Water,
  Fire Blast, Arcane Missiles (canalizzato), **Polymorph**, Frost Nova
- *Warlock*: Shadow Bolt, Demon Skin, Immolate, Corruption, **Life Tap**,
  Curse of Agony, **Drain Life** (furto di salute canalizzato)
- *Druid*: Wrath, Healing Touch, Mark of the Wild, Moonfire, Rejuvenation,
  Thorns, Entangling Roots, **Bear Form** (trasformazione attivabile al 10)
- Le cure possono bersagliare i membri del gruppo (clicca un frame del gruppo,
  poi cura); i buff sono lanciabili sui giocatori alleati; le cure possono andare
  in critico; gli scudi di assorbimento assorbono il danno prima della salute.

**Mondo e sistemi**
- Mangiare/bere: siediti, recuperi nell'arco di 18 s, si interrompe se subisci
  danni o ti alzi — e sì, puoi mangiare e bere allo stesso tempo
- Mercante: compra cibo/acqua, vendi i tuoi grigi; visualizzazione delle monete in g/s/c
- Oggetti delle quest a terra con scintillii (ruba indietro le casse di
  rifornimenti dei banditi)
- IA dei mob: vagano, aggro per prossimità in base alla differenza di livello,
  pull sociali (i murloc richiamano da più lontano — porta amici), inseguimento,
  leash-evade-reset, saccheggio dei cadaveri, respawn; uno spawn raro (Old
  Greyjaw) con un timer lungo
- Morte → rilascia lo spirito → cimitero; danni da caduta; nuotare ti rallenta
- Diario delle quest con abbandono, dialoghi di gossip con saluti, ricompense
  per classe

**Presentazione**
- Tutto procedurale: case a graticcio, tetti in scandole, cappella, banco del
  mercato, tende, fuochi da campo con luce tremolante, portale della miniera,
  colonne in rovina, molo da pesca, capanne di fango dei murloc, strade dipinte
  nel terreno, ciuffi d'erba, pini + querce, lago con acqua animata, nuvole alla
  deriva, ombre in tempo reale
- Dodici famiglie di creature riggate (lupo/cinghiale/ragno/murloc/kobold/scheletro/
  umanoide/troll/ogre/elementale/dragonide/pecora) con animazioni di
  camminata/attacco/lancio/seduta/morte
- Icone procedurali dipinte per ogni incantesimo, oggetto e buff — disegnate su
  canvas a runtime, nessun file di asset
- UI classica: ritratti delle unità, barre di buff/debuff con durate, barra delle
  azioni con sweep di cooldown + colorazione gittata/risorse, barra di
  lancio/canalizzazione, libro degli incantesimi, paperdoll del personaggio,
  diario delle quest, mappa del mondo, finestre di mercante + bottino, tooltip
  con bordo dorato, testo di combattimento fluttuante, log di combattimento,
  barra dell'XP segmentata, minimappa con indicatori e una mappa completa della
  zona
- Suono procedurale WebAudio: impatti di mischia/incantesimi, fanfara di passaggio
  di livello, rintocchi delle quest, tintinnii delle monete, lo sting della morte
  — nessun file audio

## Sviluppo

```bash
npm test                        # suite vitest: formule, combattimento, IA, quest, tutte le 9 classi,
                                #   gruppi, duelli, scambi, elite, la crypt
npm run build                   # build web di produzione
node scripts/smoke_browser.mjs  # E2E del warrior (richiede `npm run dev` in esecuzione)
node scripts/smoke_mage.mjs     # mage: lancio, polymorph, conjure+drink, morte/rilascio
node scripts/smoke_rogue.mjs    # rogue: combo point, eviscerate, mercante, mangiare
node scripts/visual_tour.mjs    # tour di screenshot della zona + UI in tmp/
node scripts/mp_integration.mjs # suite di 26 controlli API/WS/persistenza (server in esecuzione)
node scripts/social_e2e.mjs     # scambio + duello sulla rete (ALLOW_DEV_COMMANDS=1)
node scripts/arena_visual.mjs   # due client si mettono in coda + combattono un 1v1 classificato nell'Ashen Coliseum
node scripts/crypt_raid.mjs     # cinque bot completano la Hollow Crypt (ALLOW_DEV_COMMANDS=1)
```

Gli agent del browser possono comandare il movimento tramite
`window.__game.controller` invece di simulare i tasti tenuti premuti. Usa
`controller.move({ forward: true }, facingRadians)` o flag websocket compatti
come `{ f: 1, sr: 1 }`; chiama `controller.face(facingRadians)` per aggiornare
l'orientamento senza cambiare il movimento e `controller.stop()` per tornare al
vero input da tastiera. Il gioco online invia lo stesso frame di input al
server, che accetta solo flag di movimento booleani/`1` e valori di
orientamento finiti.

Struttura:

```
src/sim/      core di gioco deterministico per N giocatori (nessun import del DOM) — condiviso da tutti i target
src/render/   renderer Three.js: models.ts (rig), props.ts, textures.ts (procedurale)
src/game/     input + camera + sintetizzatore WebAudio
src/ui/       HUD classico: frame, finestre, tooltip, mappa, FCT
src/net/      client online: auth REST + mirror del mondo via WebSocket (ClientWorld)
src/world_api.ts  l'interfaccia IWorld che sia Sim sia ClientWorld soddisfano
server/       server di gioco: main.ts (HTTP+WS), game.ts (loop del mondo), db.ts, auth.ts
docker-compose.yml  postgres:16-alpine
tests/        suite vitest
scripts/      E2E del browser + tour di screenshot + test di integrazione multigiocatore
```

I nomi, le quest e le zone sono originali; le formule e le meccaniche seguono il
vanilla. Il seed del mondo è fissato in `src/main.ts`, così il mondo è lo stesso
posto a ogni visita.

## Contribuire

I contributi di ogni tipo sono benvenuti: codice, traduzioni, segnalazioni di bug
e documentazione. Inizia da [CONTRIBUTING.it_IT.md](CONTRIBUTING.it_IT.md) per la
configurazione e le linee guida, e per favore segui il nostro
[Codice di Condotta](../../CODE_OF_CONDUCT.md). Sei nuovo qui? Cerca le issue etichettate
[`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue),
apri una [issue](https://github.com/levy-street/world-of-claudecraft/issues/new/choose)
oppure salutaci su [Discord](https://discord.gg/GjhnUsBtw).

## Licenza

Il codice è [rilasciato sotto licenza MIT](../../LICENSE) — fanne un fork, remixalo,
ospita il tuo mondo.

Gli asset artistici di terze parti inclusi (modelli, texture, HDRI) restano
soggetti alle rispettive licenze — tutti CC0 di pubblico dominio tranne le water
normal map MIT, come documentato pacchetto per pacchetto in
[CREDITS.md](../../CREDITS.md).
