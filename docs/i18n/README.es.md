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

[English](../../README.md) · **Español** · [Español (España)](README.es_ES.md) · [Français](README.fr_FR.md) · [Français (Canada)](README.fr_CA.md) · [Italiano](README.it_IT.md) · [Deutsch](README.de_DE.md) · [简体中文](README.zh_CN.md) · [繁體中文](README.zh_TW.md) · [한국어](README.ko_KR.md) · [日本語](README.ja_JP.md) · [Português (Brasil)](README.pt_BR.md) · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft — un MMO de estilo clásico

[Únete al Discord de la comunidad](https://discord.gg/GjhnUsBtw)

![Pantalla de título de World of ClaudeCraft](../../docs/screenshots/title-screen.jpg)

Un micro-MMO con sabor a MMO de la era clásica que puedes hospedar y jugar:

1. **Juégalo en línea** — un juego cliente/servidor real con cuentas, personajes
   persistentes en Postgres y otros jugadores en el mundo contigo.
2. **Juégalo sin conexión** en tu navegador para entrar directo al mundo.

Ambos ejecutan el **mismo núcleo de simulación determinista** (`src/sim/`), de modo
que el mundo sin conexión se comporta de forma idéntica a lo que el servidor
multijugador autoritativo ejecuta para todos en línea.

## Capturas de pantalla

![Un grupo se reúne afuera de la botica en Eastbrook](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Atardecer en la fogata de Eastbrook](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Atardecer en la fogata de Eastbrook* | ![Pulls de élites en the Hollow Crypt](../../docs/screenshots/hollow-crypt.jpg)<br>*Pulls de élites a la luz de las antorchas en the Hollow Crypt* |
| ![Los muertos inquietos en la capilla en ruinas](../../docs/screenshots/restless-dead.jpg)<br>*Los muertos inquietos en la capilla en ruinas* | ![Una refriega con los Vale Bandits](../../docs/screenshots/vale-bandits.jpg)<br>*Superados en número en el campamento de bandidos* |
| ![Old Greyjaw cazado en el camino del norte](../../docs/screenshots/old-greyjaw.jpg)<br>*Old Greyjaw, el spawn raro, abatido en el camino del norte* | ![Interfaz de vendedor y bolsas](../../docs/screenshots/vendor-and-bags.jpg)<br>*Equipándose donde Smith Haldren: tooltips, bolsas, monedas* |

![World of Claude](../../worldofclaude.png)

![Comunidad de World of ClaudeCraft](../../woc_community.png)

---

## Hospédalo (un comando)

```bash
cp .env.example .env
# edita .env y define un POSTGRES_PASSWORD largo y aleatorio
docker compose up -d --build     # postgres + servidor del juego, totalmente compilado
# abre http://localhost:8787 — cuentas, personajes, el mundo completo
```

Para **hospedaje remoto**: coloca el stack de compose en cualquier VPS, define un
`POSTGRES_PASSWORD` real en el entorno y antepón al puerto 8787 un proxy inverso
con TLS (con Caddy son dos líneas — `your.domain { reverse_proxy
localhost:8787 }`); los WebSockets se proxean automáticamente y el cliente
selecciona `wss://` por sí solo en las páginas https. Los endpoints de
autenticación tienen límite de tasa por IP; las contraseñas se cifran con scrypt;
los tokens expiran tras 7 días. Nunca definas `ALLOW_DEV_COMMANDS=1` en
producción (habilita trampas de nivel/teletransporte que usan los bots de prueba).

## Desarrolla en línea (recarga en caliente)

```bash
npm install
cp .env.example .env
# edita .env y define POSTGRES_PASSWORD y DATABASE_URL con la misma contraseña
npm run db:up        # postgres 16 en docker (puerto 5433, persistido en volumen)
npm run server       # servidor de juego autoritativo en :8787 (REST + WebSocket)
npm run dev          # servidor de desarrollo del cliente en :5173 (proxea /api y /ws)
```

Abre http://localhost:5173 → **Play Online** → crea una cuenta → crea un
personaje → Enter World. Abre un segundo navegador/pestaña e inicia sesión otra
vez: se verán mutuamente en el pueblo. `Enter` abre el chat.

- **Cuentas**: contraseñas cifradas con scrypt, tokens bearer de 7 días (`auth_tokens`).
- **Personajes**: hasta 10 por cuenta; nivel/equipo/bolsas/misiones/posición/dinero
  persisten como JSONB en Postgres — se guardan cada 30 s, al cerrar sesión y al
  apagar el servidor. Los nombres son globalmente únicos, solo letras, al estilo clásico.
- **El servidor es autoritativo**: los clientes transmiten la intención de
  movimiento + comandos a 20 Hz; el servidor ejecuta el mundo (un único `Sim`
  compartido) y envía snapshots con alcance de interés (~120 yd) más eventos
  enrutados por jugador. Toda la matemática de combate, las tiradas de botín, el
  crédito de misión y las transacciones con vendedores ocurren en el servidor; el
  cliente es un renderizador.
- **Grupos** (hasta 5): clic derecho en un jugador → *Invite to Party*. Los marcos
  de grupo a la izquierda, los miembros comparten derechos de tap, el crédito de
  misiones de matar y la XP se reparten con los bonos de grupo clásicos reales
  (1.166/1.3/1.43 para 3/4/5). Chat de grupo con `/p mensaje`. Marcas azules de
  miembros en el minimapa.
- **Comercio**: clic derecho en un jugador → *Trade*. Ambas partes ponen objetos +
  dinero, ambas deben aceptar, y el intercambio es atómico y validado por el
  servidor (los objetos de misión no se pueden intercambiar). Alejarse lo cancela.
- **Duelos**: clic derecho → *Challenge to a Duel*. Cuenta regresiva de 3 segundos,
  se pelea hasta que un lado llega a 1 de vida — nadie muere, el ganador se anuncia
  en toda la zona. Correr 60 yardas lejos significa la rendición.
- **The Ashen Coliseum** (arena clasificada 1v1): presiona `G` (o el botón ⚔) para
  abrir el panel de arena y *Enter the Queue*. El emparejamiento te junta con el
  retador en línea de calificación más cercana, luego los teletransporta a ambos a
  un foso de combate privado iluminado por antorchas. Una cuenta regresiva de 5
  segundos sana y reinicia a ambos luchadores para un comienzo justo; el combate
  termina cuando uno se rinde a 1 de vida (nadie muere). Las victorias y derrotas
  mueven una **calificación Elo** persistente (todos empiezan en 1500), y regresas
  exactamente al lugar donde te pusiste en cola. El panel muestra tu posición, la
  clasificación en vivo de jugadores en línea y la tabla histórica de líderes
  (`GET /api/arena/leaderboard`).
- **Reglas del multijugador**: derechos de tap clásicos (el primer jugador en dañar
  a un mob es dueño de su botín/XP/crédito de misión — los demás reciben "You don't
  have permission to loot that."), los mobs cambian de objetivo al siguiente
  atacante cuando su víctima muere (sin reinicios gratis), anuncios de entrada/salida,
  chat estilo `/say`.

## The Hollow Crypt — instancia de élite para 5 jugadores

La historia de Brother Aldric continúa más allá de *The Restless Dead*: **Whispers
Below** (encuentra el sigilo del Gravecaller en la capilla en ruinas) → **The Binding
Rite** (reúne Blessed Tallow de la excavación de kobolds y Ghostly Essence de los
muertos inquietos) → **Into the Hollow** (*jugadores sugeridos: 5*) — mata a
Morthen the Gravecaller en el fondo de la cripta bajo la capilla.

- La puerta de la cripta en the Fallen Chapel teletransporta a tu **grupo a su
  propia copia de instancia privada** (6 espacios; las instancias se reinician tras
  5 minutos vacías).
- Adentro: salones iluminados por antorchas, paquetes de basura **élite** en parejas
  (escalado de élite clásico: ~2.3× de vida, ~1.5× de daño, doble XP), el minijefe
  Sexton Marrow, y Morthen — un jefe élite de nivel 10 con un AoE de **Shadow Pulse**
  cada 10 segundos. La basura de la mazmorra no reaparece hasta que la instancia se
  reinicia.
- Recompensas: armas raras (azules) por arquetipo de clase, 1 de oro, 1500 XP.
- Está genuinamente calibrada para 5: nuestra incursión automatizada de 5 bots
  (warrior, paladin, priest, mage, hunter con fuego concentrado + IA de sanador) la
  completa en ~5 minutos con ~10 muertes (`node scripts/crypt_raid.mjs`, necesita
  ALLOW_DEV_COMMANDS=1).

```
docker compose ps          # eastbrook-db (postgres:16-alpine, healthcheck)
node scripts/mp_integration.mjs   # suite de 26 comprobaciones de API/WS/persistencia
node scripts/mp_browser.mjs       # dos clientes de navegador reales se ven entre sí
```

## The Sunken Bastion y Gravewyrm Sanctum

La conspiración no termina con Morthen. **The Sunken Bastion** (5 jugadores,
~nivel 13, sureste de Mirefen) alberga a Vael the Mistcaller — invoca oleadas de
Drowned Thralls al 60% y 30% de vida. El final es el **Gravewyrm
Sanctum** (5 jugadores, nivel 20, bajo Thornpeak): tres cámaras de boneguard y
drakonid élite, Korgath the Bound (entra en frenesí por debajo del 30%), Grand
Necromancer Velkhar (más oleadas de adds), y **Korzul the Gravewyrm** — aquí caen
armas épicas, y la cadena de misiones previa se puede hacer en solitario para que
nadie quede excluido de la historia.



## Juega sin conexión

```bash
npm run dev        # abre http://localhost:5173 -> Play Offline
```

Nombra a tu personaje, elige cualquiera de las nueve clases, y estarás en
**Eastbrook Vale** (niveles 1-7): un pueblo de mercado rodeado por seis enclaves —
sendas de lobos al norte, prados de jabalíes al este, the Webwood al oeste, Mirror
Lake al noroeste, una excavación de cobre de kobolds al suroeste, una capilla en
ruinas con muertos inquietos al noreste, y el campamento de bandidos de Gorrak al
sureste. El camino al norte asciende por un paso de montaña hacia **Mirefen Marsh**
(6-13, enclave: Fenbridge) y sigue hasta **Thornpeak Heights** (13-20, enclave:
Highwatch) — tres zonas, ~60 misiones y una sola historia: la conspiración del
Gravecaller, desde los primeros huesos inquietos a las afueras de Eastbrook hasta
**Korzul the Gravewyrm** bajo los picos. Cada enclave tiene vendedores (incluidos
herreros de armas y armaduras que venden equipo blanco honesto), un cementerio, su
propia música y un mapa de zona.

### Controles (disposición clásica)

| Entrada | Acción |
|---|---|
| `W`/`S` | correr / retroceder — `A`/`D` giran (strafe con el botón derecho del ratón presionado), `Q`/`E` hacen strafe |
| arrastre derecho / arrastre izquierdo | mouselook / orbitar la cámara &nbsp;·&nbsp; la rueda hace zoom · `Space` salta |
| `Tab` | rota entre los enemigos más cercanos · clic izquierdo selecciona · clic derecho ataca/saquea/habla |
| `1`–`9`, `0`, `-`, `=` | barra de acción |
| `F` | interactuar (saquear cadáver / recoger objeto / hablar) |
| `C` `P` `L` `M` `B` `G` | personaje · libro de hechizos · registro de misiones · mapa del mundo · bolsas · arena (the Ashen Coliseum) |
| `V` / `R` / `Esc` | placas de nombre · autocorrer · cerrar ventanas / quitar objetivo |

### Lista de fidelidad clásica

**Fórmulas (las reales de vanilla)**
- Conversión de furia `c = 0.0091L² + 3.23L + 4.27`; ganancias `7.5·d/c` al infligir, `2.5·d/c` al recibir
- Tabla de acierto de hechizos con el escalón de +3 niveles (96/95/94/83%); fallo/esquiva de cuerpo a cuerpo según el nivel
- Reducción de daño por armadura `armor/(armor + 85·AttackerLevel + 400)`
- Reglas de estadísticas de HP/maná: los primeros 20 de aguante → 1 de vida cada uno, el resto → 10; los primeros 20 de intelecto → 1 de maná, el resto → 15
- Curva de XP 400/900/1400/… hasta el nivel 20; XP de mob `45 + 5·L` con bandas grises reales de diferencia cero
- GCD de 1.5 s (1.0 s para los rogues), temporizadores de golpe de arma, regla de maná de 5 segundos

**Las nueve clases vanilla (niveles de aprendizaje y valores de rango de vanilla, 1–20 —
los hechizos ganan rangos al subir de nivel: Lightning Bolt R2 al 8, R3 al 14, R4 al 20,
más nuevas habilidades de banda alta como Execute, Kidney Shot, Flash Heal,
Stormstrike y Starfire)**
- *Warrior*: furia, Heroic Strike (al próximo golpe, fuera del GCD), Battle Shout,
  Charge, Rend, Thunder Clap, Hamstring, Bloodrage, Overpower (proc de esquiva)
- *Paladin*: Seal of Righteousness (encantamiento de arma) liberado por **Judgement**,
  Holy Light, Devotion Aura, Blessing of Might, Divine Protection (absorción),
  Hammer of Justice (aturdimiento), Lay on Hands
- *Hunter*: **Auto Shot a distancia** (8–35 yd con la zona muerta clásica),
  Raptor Strike, Aspect of the Hawk, Serpent Sting, Arcane Shot, Concussive
  Shot, Mongoose Bite (proc de esquiva), Wing Clip
- *Rogue*: energía + **combo points**, Sinister Strike, Eviscerate, Backstab
  (por detrás + daga), Gouge, Evasion, Slice and Dice, Sprint
- *Priest*: Smite, Lesser Heal, Power Word: Fortitude, Shadow Word: Pain,
  **Power Word: Shield** (absorción), **Renew** (HoT), Mind Blast
- *Shaman*: Lightning Bolt, **Rockbiter Weapon** (encantamiento), Healing Wave,
  Earth Shock, **Lightning Shield** (espinas), Flame Shock
- *Mage*: Fireball, Frost Armor, Arcane Intellect, Frostbolt, Conjure Water,
  Fire Blast, Arcane Missiles (canalizado), **Polymorph**, Frost Nova
- *Warlock*: Shadow Bolt, Demon Skin, Immolate, Corruption, **Life Tap**,
  Curse of Agony, **Drain Life** (robo de vida canalizado)
- *Druid*: Wrath, Healing Touch, Mark of the Wild, Moonfire, Rejuvenation,
  Thorns, Entangling Roots, **Bear Form** (transformación conmutable al 10)
- Las sanaciones pueden apuntar a miembros del grupo (clic en un marco de grupo y
  luego sana); los buffs se pueden lanzar sobre jugadores aliados; las sanaciones
  hacen crítico; los escudos de absorción absorben el daño antes que la vida.

**Mundo y sistemas**
- Comer/beber: siéntate, recupera durante 18 s, se interrumpe al recibir daño o al
  ponerte de pie — y sí, puedes comer y beber al mismo tiempo
- Vendedor: compra comida/agua, vende tus grises; visualización de monedas en g/s/c
- Objetos de misión en el suelo con destellos (roba de vuelta las cajas de
  suministros de los bandidos)
- IA de mobs: deambular, aggro por proximidad según la diferencia de nivel, pulls
  sociales (los murlocs jalan desde más lejos — trae amigos), persecución,
  leash-evade-reset, saqueo de cadáveres, reapariciones; un spawn raro (Old
  Greyjaw) con un temporizador largo
- Muerte → liberar el espíritu → cementerio; daño por caída; nadar te ralentiza
- Registro de misiones con abandono, diálogos de charla con saludos, recompensas
  por clase

**Presentación**
- Todo procedural: casas con entramado de madera, techos de tejas, capilla, puesto
  de mercado, tiendas, fogatas con luz parpadeante, portal de mina, columnas en
  ruinas, muelle de pesca, chozas de barro de murlocs, caminos pintados en el
  terreno, matas de hierba, pinos + robles, lago con agua animada, nubes a la
  deriva, sombras en tiempo real
- Doce familias de criaturas con esqueleto (wolf/boar/spider/murloc/kobold/skeleton/
  humanoid/troll/ogre/elemental/dragonkin/sheep) con animaciones de
  caminar/atacar/lanzar/sentarse/morir
- Iconos procedurales pintados para cada hechizo, objeto y buff — dibujados en
  canvas en tiempo de ejecución, sin archivos de assets
- Interfaz clásica: marcos de unidad con retrato, barras de buff/debuff con
  duraciones, barra de acción con barridos de enfriamiento + coloreado de
  rango/recurso, barra de lanzamiento/canalización, libro de hechizos, muñeco de
  personaje, registro de misiones, mapa del mundo, ventanas de vendedor + botín,
  tooltips con borde dorado, texto de combate flotante, registro de combate, barra
  de XP segmentada, minimapa con marcas y un mapa de zona completo
- Sonido procedural con WebAudio: impactos de cuerpo a cuerpo/hechizos, fanfarria
  de subida de nivel, campanillas de misión, tintineos de monedas, el toque de la
  muerte — sin archivos de audio

## Desarrollo

```bash
npm test                        # suite de vitest: fórmulas, combate, IA, misiones, las 9 clases,
                                #   grupos, duelos, intercambios, élites, la cripta
npm run build                   # build web de producción
node scripts/smoke_browser.mjs  # E2E de warrior (necesita `npm run dev` en ejecución)
node scripts/smoke_mage.mjs     # mage: lanzamiento, polymorph, conjure+beber, muerte/liberación
node scripts/smoke_rogue.mjs    # rogue: combo points, eviscerate, vendedor, comer
node scripts/visual_tour.mjs    # recorrido de capturas de la zona + interfaz en tmp/
node scripts/mp_integration.mjs # suite de 26 comprobaciones de API/WS/persistencia (servidor en ejecución)
node scripts/social_e2e.mjs     # intercambio + duelo por la red (ALLOW_DEV_COMMANDS=1)
node scripts/arena_visual.mjs   # dos clientes se ponen en cola + pelean un 1v1 clasificado en the Ashen Coliseum
node scripts/crypt_raid.mjs     # cinco bots completan the Hollow Crypt (ALLOW_DEV_COMMANDS=1)
```

Los agentes de navegador pueden dirigir el movimiento a través de
`window.__game.controller` en lugar de simular teclas presionadas. Usa
`controller.move({ forward: true }, facingRadians)` o flags compactos de websocket
como `{ f: 1, sr: 1 }`; llama a `controller.face(facingRadians)` para actualizar la
orientación sin cambiar el movimiento y `controller.stop()` para volver a la
entrada real del teclado. El juego en línea envía el mismo frame de entrada al
servidor, que acepta solo flags de movimiento booleanos/`1` y valores de
orientación finitos.

Disposición:

```
src/sim/      núcleo de juego determinista para N jugadores (sin imports del DOM) — compartido por todos los targets
src/render/   renderizador Three.js: models.ts (rigs), props.ts, textures.ts (procedural)
src/game/     entrada + cámara + sintetizador WebAudio
src/ui/       HUD clásico: marcos, ventanas, tooltips, mapa, FCT
src/net/      cliente en línea: autenticación REST + espejo del mundo por WebSocket (ClientWorld)
src/world_api.ts  la interfaz IWorld que satisfacen tanto Sim como ClientWorld
server/       servidor del juego: main.ts (HTTP+WS), game.ts (bucle del mundo), db.ts, auth.ts
docker-compose.yml  postgres:16-alpine
tests/        suite de vitest
scripts/      E2E de navegador + recorrido de capturas + pruebas de integración multijugador
```

Los nombres, las misiones y las zonas son originales; las fórmulas y mecánicas
siguen a vanilla. La semilla del mundo está fija en `src/main.ts` para que el mundo
sea el mismo lugar en cada visita.

## Contribuir

Las contribuciones de todo tipo son bienvenidas: código, traducciones, reportes de
bugs y documentación. Empieza por [CONTRIBUTING.es.md](CONTRIBUTING.es.md) para la
configuración y las pautas, y por favor sigue nuestro [Código de Conducta](../../CODE_OF_CONDUCT.md).
¿Eres nuevo aquí? Busca issues etiquetados como [`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue),
abre un [issue](https://github.com/levy-street/world-of-claudecraft/issues/new/choose)
o saluda en [Discord](https://discord.gg/GjhnUsBtw).

## Licencia

El código tiene [licencia MIT](../../LICENSE) — bifúrcalo, remézclalo, hospeda tu propio mundo.

Los assets de arte de terceros incluidos (modelos, texturas, HDRIs) permanecen bajo
sus propias licencias — todos CC0 de dominio público excepto los mapas de normales
de agua con licencia MIT, según se documenta por pack en [CREDITS.md](../../CREDITS.md).
