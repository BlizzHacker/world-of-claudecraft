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

[English](../../README.md) · [Español](README.es.md) · **Español (España)** · [Français](README.fr_FR.md) · [Français (Canada)](README.fr_CA.md) · [Italiano](README.it_IT.md) · [Deutsch](README.de_DE.md) · [简体中文](README.zh_CN.md) · [繁體中文](README.zh_TW.md) · [한국어](README.ko_KR.md) · [日本語](README.ja_JP.md) · [Português (Brasil)](README.pt_BR.md) · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft — un MMO de estilo clásico

[Únete al Discord de la comunidad](https://discord.gg/GjhnUsBtw)

![Pantalla de título de World of ClaudeCraft](../../docs/screenshots/title-screen.jpg)

Un micro-MMO con sabor a los MMO de la era clásica que podéis alojar y jugar:

1. **Jugadlo en línea** — un juego cliente/servidor real con cuentas, personajes
   persistentes en Postgres y otros jugadores compartiendo el mundo con vosotros.
2. **Jugadlo sin conexión** en vuestro navegador para meteros directamente en el mundo.

Ambos ejecutan el **mismo núcleo de simulación determinista** (`src/sim/`), de modo que el
mundo sin conexión se comporta igual que lo que el servidor multijugador autoritativo
ejecuta para todos en línea.

## Capturas de pantalla

![Un grupo se reúne frente a la botica de Eastbrook](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Anochecer en la hoguera de Eastbrook](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Anochecer en la hoguera de Eastbrook* | ![Pulls de élite en the Hollow Crypt](../../docs/screenshots/hollow-crypt.jpg)<br>*Pulls de élite a la luz de las antorchas en the Hollow Crypt* |
| ![Los muertos inquietos en la capilla en ruinas](../../docs/screenshots/restless-dead.jpg)<br>*Los muertos inquietos en la capilla en ruinas* | ![Una refriega con los Vale Bandits](../../docs/screenshots/vale-bandits.jpg)<br>*Superados en número en el campamento de bandidos* |
| ![Old Greyjaw acorralado en el camino del norte](../../docs/screenshots/old-greyjaw.jpg)<br>*Old Greyjaw, el rare spawn, abatido en el camino del norte* | ![Interfaz del vendedor y las bolsas](../../docs/screenshots/vendor-and-bags.jpg)<br>*Equipándose en la fragua de Smith Haldren: tooltips, bolsas y monedas* |

![World of Claude](../../worldofclaude.png)

![Comunidad de World of ClaudeCraft](../../woc_community.png)

---

## Alojadlo (con un solo comando)

```bash
cp .env.example .env
# edita .env y pon una POSTGRES_PASSWORD aleatoria y larga
docker compose up -d --build     # postgres + servidor de juego, compilado por completo
# abre http://localhost:8787 — cuentas, personajes, el mundo entero
```

Para **alojamiento remoto**: poned la pila de compose en cualquier VPS, fijad una
`POSTGRES_PASSWORD` de verdad en el entorno y servid el puerto 8787 tras un
proxy inverso con TLS (con Caddy esto son dos líneas — `tu.dominio { reverse_proxy
localhost:8787 }`); los WebSockets se enrutan automáticamente y el cliente
selecciona `wss://` por sí solo en páginas https. Los endpoints de autenticación tienen
límite de peticiones por IP; las contraseñas se cifran con scrypt; los tokens caducan a los 7 días. Nunca pongáis
`ALLOW_DEV_COMMANDS=1` en producción (habilita trucos de nivel/teletransporte usados
por los bots de prueba).

## Desarrollad en línea (recarga en caliente)

```bash
npm install
cp .env.example .env
# edita .env y pon POSTGRES_PASSWORD y DATABASE_URL con la misma contraseña
npm run db:up        # postgres 16 en docker (puerto 5433, persistido en volumen)
npm run server       # servidor de juego autoritativo en :8787 (REST + WebSocket)
npm run dev          # servidor de desarrollo del cliente en :5173 (hace de proxy de /api y /ws)
```

Abrid http://localhost:5173 → **Play Online** → cread una cuenta → cread un
personaje → Enter World. Abrid un segundo navegador/pestaña e iniciad sesión de nuevo: os
veréis mutuamente en el pueblo. `Enter` abre el chat.

- **Cuentas**: contraseñas cifradas con scrypt, bearer tokens de 7 días (`auth_tokens`).
- **Personajes**: hasta 10 por cuenta; nivel/equipo/bolsas/misiones/posición/dinero
  persisten como JSONB en Postgres — se guardan cada 30 s, al cerrar sesión y al apagar
  el servidor. Los nombres son globalmente únicos, solo letras, al estilo clásico.
- **El servidor es autoritativo**: los clientes envían intención de movimiento + comandos
  a 20 Hz; el servidor ejecuta el mundo (un único `Sim` compartido) y envía
  instantáneas acotadas por interés (~120 yd) más eventos enrutados por jugador. Toda la
  matemática de combate, las tiradas de botín, el crédito de misiones y las transacciones de los vendedores ocurren
  en el servidor; el cliente es un renderizador.
- **Grupos** (hasta 5): clic derecho sobre un jugador → *Invite to Party*. Los marcos de
  grupo a la izquierda, los miembros comparten los derechos de tap, el crédito de misiones de muerte y reparten
  XP con los bonus de grupo reales de vanilla (1.166/1.3/1.43 para 3/4/5). Chat de
  grupo con `/p mensaje`. Marcas azules de los miembros en el minimapa.
- **Comercio**: clic derecho sobre un jugador → *Trade*. Ambas partes ponen objetos + dinero,
  ambas deben aceptar, y el intercambio es atómico y validado por el servidor (los objetos
  de misión no son intercambiables). Si os alejáis, se cancela.
- **Duelos**: clic derecho → *Challenge to a Duel*. Cuenta atrás de 3 segundos, lucháis
  hasta que un bando se queda en 1 hp — nadie muere, el ganador se anuncia en toda la zona.
  Alejarse 60 yardas supone rendirse.
- **The Ashen Coliseum** (arena clasificatoria 1v1): pulsad `G` (o el botón ⚔) para
  abrir el panel de la arena y *Enter the Queue*. El emparejamiento os junta con el
  rival con la valoración más cercana que esté en línea, y luego os teletransporta a ambos a un foso de
  combate privado iluminado por antorchas. Una cuenta atrás de 5 segundos cura y reinicia a los dos luchadores
  para una salida justa; el combate termina cuando uno se rinde a 1 hp (nadie muere). Las victorias
  y las derrotas mueven una **valoración Elo** persistente (todo el mundo empieza en 1500), y
  volvéis exactamente donde os pusisteis en cola. El panel muestra vuestra clasificación, la escalera
  en línea en directo y la tabla histórica de líderes (`GET /api/arena/leaderboard`).
- **Reglas multijugador**: derechos de tap clásicos (el primer jugador que daña a un mob posee
  su botín/XP/crédito de misión — los demás reciben «You don't have permission to loot
  that.»), los mobs reapuntan al siguiente atacante cuando su víctima muere (sin reinicios
  gratis), anuncios de entrada/salida, chat al estilo `/say`.

## The Hollow Crypt — instancia de élite para 5 jugadores

La historia de Brother Aldric continúa más allá de *The Restless Dead*: **Whispers
Below** (encontrad el sigilo del Gravecaller en la capilla en ruinas) → **The Binding
Rite** (reunid Blessed Tallow de la excavación de kobolds y Ghostly Essence de
los muertos inquietos) → **Into the Hollow** (*jugadores sugeridos: 5*) — matad a
Morthen the Gravecaller en el fondo de la cripta, bajo la capilla.

- La puerta de la cripta en the Fallen Chapel teletransporta a vuestro **grupo a su propia
  copia de instancia privada** (6 plazas; las instancias se reinician tras 5 minutos vacías).
- Dentro: salas iluminadas por antorchas, packs de basura **élite** emparejados (escalado
  élite de vanilla: ~2.3× de salud, ~1.5× de daño, doble XP), el minijefe Sexton
  Marrow y Morthen — un jefe élite de nivel 10 con un AoE **Shadow Pulse**
  cada 10 segundos. La basura de la mazmorra no reaparece hasta que la instancia se reinicia.
- Recompensas: armas raras (azules) por arquetipo de clase, 1 de oro, 1500 de XP.
- Está genuinamente ajustada para 5: nuestra raid automatizada de 5 bots (warrior, paladin,
  priest, mage, hunter con fuego concentrado + IA de sanador) la limpia en ~5 minutos
  con ~10 muertes (`node scripts/crypt_raid.mjs`, necesita ALLOW_DEV_COMMANDS=1).

```
docker compose ps          # eastbrook-db (postgres:16-alpine, healthcheck)
node scripts/mp_integration.mjs   # suite de 26 comprobaciones de API/WS/persistencia
node scripts/mp_browser.mjs       # dos clientes de navegador reales se ven entre sí
```

## The Sunken Bastion y Gravewyrm Sanctum

La conspiración no termina con Morthen. **The Sunken Bastion** (5 jugadores,
~nivel 13, sureste de Mirefen) alberga a Vael the Mistcaller — invoca oleadas de
Drowned Thralls al 60% y al 30% de salud. El cierre es el **Gravewyrm
Sanctum** (5 jugadores, nivel 20, bajo Thornpeak): tres cámaras de boneguard
y drakonid de élite, Korgath the Bound (entra en furia por debajo del 30%), Grand
Necromancer Velkhar (más oleadas de adds) y **Korzul the Gravewyrm** — aquí caen
armas épicas, y la cadena de misiones previa se puede hacer en solitario para que nadie
quede excluido de la historia.



## Jugad sin conexión

```bash
npm run dev        # abre http://localhost:5173 -> Play Offline
```

Nombrad a vuestro personaje, elegid cualquiera de las nueve clases, y estáis en **Eastbrook
Vale** (niveles 1-7): un pueblo de mercado rodeado por seis enclaves — sendas de lobos al norte, prados
de jabalíes al este, the Webwood al oeste, Mirror Lake al noroeste, una excavación de cobre de kobolds
al suroeste, una capilla en ruinas con muertos inquietos al noreste, y el campamento de bandidos de Gorrak
al sureste. El camino del norte asciende por un puerto de montaña hasta **Mirefen
Marsh** (6-13, enclave: Fenbridge) y sube hasta **Thornpeak Heights** (13-20,
enclave: Highwatch) — tres zonas, ~60 misiones y una sola historia: la conspiración del Gravecaller,
desde los primeros huesos inquietos a las afueras de Eastbrook hasta **Korzul the
Gravewyrm** bajo los picos. Cada enclave tiene vendedores (incluidos armeros de armas y
armaduras que venden equipo blanco honesto), un cementerio, su propia música y un
mapa de zona.

### Controles (distribución clásica)

| Entrada | Acción |
|---|---|
| `W`/`S` | correr / retroceder — `A`/`D` giran (strafe con el botón derecho del ratón pulsado), `Q`/`E` hacen strafe |
| arrastrar-derecho / arrastrar-izquierdo | mirar con el ratón / orbitar la cámara &nbsp;·&nbsp; la rueda hace zoom · `Space` salta |
| `Tab` | ciclar los enemigos más cercanos · clic izquierdo selecciona objetivo · clic derecho atacar/saquear/hablar |
| `1`–`9`, `0`, `-`, `=` | barra de acción |
| `F` | interactuar (saquear cadáver / recoger objeto / hablar) |
| `C` `P` `L` `M` `B` `G` | personaje · libro de hechizos · registro de misiones · mapa del mundo · bolsas · arena (Ashen Coliseum) |
| `V` / `R` / `Esc` | placas de nombre · autocorrer · cerrar ventanas / quitar objetivo |

### Lista de fidelidad clásica

**Fórmulas (las de vanilla de verdad)**
- Conversión de furia `c = 0.0091L² + 3.23L + 4.27`; ganancias `7.5·d/c` al infligir, `2.5·d/c` al recibir
- Tabla de acierto de hechizos con el escalón de +3 niveles (96/95/94/83%); fallo/esquiva cuerpo a cuerpo según el nivel
- Reducción de daño por armadura `armor/(armor + 85·AttackerLevel + 400)`
- Reglas de stats de HP/maná: los primeros 20 de stamina → 1 hp cada uno, el resto → 10; los primeros 20 de int → 1 de maná, el resto → 15
- Curva de XP 400/900/1400/… hasta el nivel 20; XP de mob `45 + 5·L` con bandas grises reales de diferencia cero
- GCD de 1.5 s (1.0 s para rogues), temporizadores de golpe de arma, regla de maná de 5 segundos

**Las nueve clases de vanilla (niveles de aprendizaje y valores de rango tomados de vanilla, 1–20 —
los hechizos ganan rangos según subís de nivel: Lightning Bolt R2 al 8, R3 al 14, R4 al 20,
además de nuevas habilidades de banda alta como Execute, Kidney Shot, Flash Heal,
Stormstrike y Starfire)**
- *Warrior*: furia, Heroic Strike (al siguiente golpe, fuera del GCD), Battle Shout,
  Charge, Rend, Thunder Clap, Hamstring, Bloodrage, Overpower (proc por esquiva)
- *Paladin*: Seal of Righteousness (encantamiento de arma) liberado por **Judgement**,
  Holy Light, Devotion Aura, Blessing of Might, Divine Protection (absorción),
  Hammer of Justice (aturdimiento), Lay on Hands
- *Hunter*: **ranged Auto Shot** (8–35 yd con la dead zone clásica),
  Raptor Strike, Aspect of the Hawk, Serpent Sting, Arcane Shot, Concussive
  Shot, Mongoose Bite (proc por esquiva), Wing Clip
- *Rogue*: energía + **combo points**, Sinister Strike, Eviscerate, Backstab
  (por detrás + daga), Gouge, Evasion, Slice and Dice, Sprint
- *Priest*: Smite, Lesser Heal, Power Word: Fortitude, Shadow Word: Pain,
  **Power Word: Shield** (absorción), **Renew** (HoT), Mind Blast
- *Shaman*: Lightning Bolt, **Rockbiter Weapon** (encantamiento), Healing Wave,
  Earth Shock, **Lightning Shield** (espinas), Flame Shock
- *Mage*: Fireball, Frost Armor, Arcane Intellect, Frostbolt, Conjure Water,
  Fire Blast, Arcane Missiles (canalizado), **Polymorph**, Frost Nova
- *Warlock*: Shadow Bolt, Demon Skin, Immolate, Corruption, **Life Tap**,
  Curse of Agony, **Drain Life** (robo de salud canalizado)
- *Druid*: Wrath, Healing Touch, Mark of the Wild, Moonfire, Rejuvenation,
  Thorns, Entangling Roots, **Bear Form** (cambio de forma conmutable al nivel 10)
- Las sanaciones pueden tener como objetivo a miembros del grupo (haced clic en un marco de grupo y luego sanad); los buffs se
  pueden lanzar sobre jugadores aliados; las sanaciones hacen críticos; los escudos de absorción aguantan el daño
  antes que la salud.

**Mundo y sistemas**
- Comer/beber: sentaos, recuperáis a lo largo de 18 s, se interrumpe al recibir daño o al levantaros
  — y sí, podéis comer y beber a la vez
- Vendedor: comprad comida/agua, vended vuestros grises; visualización de monedas en g/s/c
- Objetos de misión en el suelo con destellos (robad de vuelta las cajas de suministros de los bandidos)
- IA de los mobs: deambular, aggro por proximidad según la diferencia de nivel, pulls sociales (los murlocs
  llaman desde más lejos — traed amigos), persecución, leash-evade-reset, saqueo de cadáveres,
  reapariciones; un rare spawn (Old Greyjaw) con un temporizador largo
- Muerte → liberar el espíritu → cementerio; daño por caída; nadar os ralentiza
- Registro de misiones con opción de abandonar, diálogos de conversación con saludos, recompensas por clase

**Presentación**
- Todo procedural: casas con entramado de madera, tejados de tejas, capilla, puesto de
  mercado, tiendas de campaña, hogueras con luz parpadeante, portal de mina, columnas en ruinas,
  embarcadero de pesca, chozas de barro de los murlocs, caminos pintados sobre el terreno, matojos de hierba,
  pinos + robles, lago con agua animada, nubes a la deriva, sombras en tiempo real
- Doce familias de criaturas con esqueleto (lobo/jabalí/araña/murloc/kobold/esqueleto/
  humanoide/troll/ogro/elemental/dragónido/oveja) con animaciones de andar/atacar/lanzar/sentarse/
  morir
- Iconos procedurales pintados para cada hechizo, objeto y buff — dibujados en canvas
  en tiempo de ejecución, sin archivos de recursos
- Interfaz clásica: marcos de unidad con retrato, barras de buff/debuff con duraciones, barra
  de acción con barridos de enfriamiento + coloreado por alcance/recurso, barra de lanzamiento/canalización,
  libro de hechizos, muñeco de personaje, registro de misiones, mapa del mundo, ventanas de vendedor y botín,
  tooltips con borde dorado, texto de combate flotante, registro de combate, barra de XP segmentada,
  minimapa con marcas y un mapa de zona completo
- Sonido procedural con WebAudio: impactos cuerpo a cuerpo/de hechizos, fanfarria de subida de nivel, campanillas de
  misión, tintineos de monedas, el remate sonoro de la muerte — sin archivos de audio

## Desarrollo

```bash
npm test                        # suite de vitest: fórmulas, combate, IA, misiones, las 9 clases,
                                #   grupos, duelos, intercambios, élites, la cripta
npm run build                   # build web de producción
node scripts/smoke_browser.mjs  # E2E de warrior (necesita `npm run dev` en ejecución)
node scripts/smoke_mage.mjs     # mage: lanzar hechizos, polymorph, conjure+beber, muerte/liberación
node scripts/smoke_rogue.mjs    # rogue: combo points, eviscerate, vendedor, comer
node scripts/visual_tour.mjs    # recorrido de capturas de la zona + interfaz hacia tmp/
node scripts/mp_integration.mjs # suite de 26 comprobaciones de API/WS/persistencia (servidor en ejecución)
node scripts/social_e2e.mjs     # comercio + duelo por la red (ALLOW_DEV_COMMANDS=1)
node scripts/arena_visual.mjs   # dos clientes se ponen en cola + luchan un 1v1 clasificatorio en the Ashen Coliseum
node scripts/crypt_raid.mjs     # cinco bots limpian the Hollow Crypt (ALLOW_DEV_COMMANDS=1)
```

Los agentes de navegador pueden manejar el movimiento a través de `window.__game.controller` en lugar
de simular teclas pulsadas. Usad `controller.move({ forward: true }, facingRadians)`
o flags compactos de websocket como `{ f: 1, sr: 1 }`; llamad a
`controller.face(facingRadians)` para actualizar la orientación sin cambiar el movimiento y a
`controller.stop()` para volver a la entrada real de teclado. El juego en línea envía
el mismo frame de entrada al servidor, que solo acepta flags de movimiento booleanos/`1`
y valores de orientación finitos.

Distribución:

```
src/sim/      núcleo de juego determinista para N jugadores (sin imports de DOM) — compartido por todos los destinos
src/render/   renderizador de Three.js: models.ts (rigs), props.ts, textures.ts (procedural)
src/game/     entrada + cámara + sintetizador WebAudio
src/ui/       HUD clásico: marcos, ventanas, tooltips, mapa, FCT
src/net/      cliente en línea: autenticación REST + espejo del mundo por WebSocket (ClientWorld)
src/world_api.ts  la interfaz IWorld que cumplen tanto Sim como ClientWorld
server/       servidor de juego: main.ts (HTTP+WS), game.ts (bucle del mundo), db.ts, auth.ts
docker-compose.yml  postgres:16-alpine
tests/        suite de vitest
scripts/      E2E de navegador + recorrido de capturas + pruebas de integración multijugador
```

Los nombres, las misiones y las zonas son originales; las fórmulas y las mecánicas siguen a
vanilla. La semilla del mundo está fijada en `src/main.ts` para que el mundo sea el mismo lugar
en cada visita.

## Cómo contribuir

Toda clase de contribuciones es bienvenida: código, traducciones, informes de
fallos y documentación. Empezad por [CONTRIBUTING.es_ES.md](CONTRIBUTING.es_ES.md)
para la configuración y las pautas, y seguid por favor nuestro [Código de
conducta](../../CODE_OF_CONDUCT.md). ¿Sois nuevos aquí? Buscad incidencias etiquetadas
como [`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue),
abrid una [incidencia](https://github.com/levy-street/world-of-claudecraft/issues/new/choose)
o saludadnos en [Discord](https://discord.gg/GjhnUsBtw).

## Licencia

El código está [bajo licencia MIT](../../LICENSE) — bifurcadlo, remezcladlo, alojad vuestro propio mundo.

Los recursos artísticos de terceros incluidos (modelos, texturas, HDRIs) permanecen bajo
sus propias licencias — todos son de dominio público CC0 salvo los mapas normales de agua con licencia MIT,
tal y como se documenta por paquete en [CREDITS.md](../../CREDITS.md).
