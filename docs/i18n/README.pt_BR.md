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

[English](../../README.md) · [Español](README.es.md) · [Español (España)](README.es_ES.md) · [Français](README.fr_FR.md) · [Français (Canada)](README.fr_CA.md) · [Italiano](README.it_IT.md) · [Deutsch](README.de_DE.md) · [简体中文](README.zh_CN.md) · [繁體中文](README.zh_TW.md) · [한국어](README.ko_KR.md) · [日本語](README.ja_JP.md) · **Português (Brasil)** · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft — um MMO de estilo clássico

[Entre no Discord da comunidade](https://discord.gg/GjhnUsBtw)

![Tela de título de World of ClaudeCraft](../../docs/screenshots/title-screen.jpg)

Um micro-MMO com sabor de MMO da era clássica que você pode hospedar e jogar:

1. **Jogue online** — um jogo cliente/servidor de verdade, com contas, personagens
   persistentes no Postgres e outros jogadores no mundo junto de você.
2. **Jogue offline** no seu navegador para entrar direto no mundo.

Ambos rodam o **mesmo núcleo de simulação determinístico** (`src/sim/`), de modo que
o mundo offline se comporta de maneira idêntica ao que o servidor multiplayer
autoritativo roda para todos online.

## Screenshots

![Um grupo se reúne em frente ao boticário em Eastbrook](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Anoitecer na fogueira de Eastbrook](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Anoitecer na fogueira de Eastbrook* | ![Pulls de elites na The Hollow Crypt](../../docs/screenshots/hollow-crypt.jpg)<br>*Pulls de elites à luz de tochas na The Hollow Crypt* |
| ![Os mortos inquietos na capela em ruínas](../../docs/screenshots/restless-dead.jpg)<br>*Os mortos inquietos na capela em ruínas* | ![Uma briga com os Vale Bandits](../../docs/screenshots/vale-bandits.jpg)<br>*Em menor número no acampamento dos bandidos* |
| ![Old Greyjaw encurralado na estrada do norte](../../docs/screenshots/old-greyjaw.jpg)<br>*Old Greyjaw, o spawn raro, encurralado na estrada do norte* | ![Interface de vendedor e bolsas](../../docs/screenshots/vendor-and-bags.jpg)<br>*Equipando-se na ferraria de Smith Haldren — tooltips, bolsas, moedas* |

![World of Claude](../../worldofclaude.png)

![Comunidade de World of ClaudeCraft](../../woc_community.png)

---

## Hospede (um comando)

```bash
cp .env.example .env
# edite o .env e defina um POSTGRES_PASSWORD longo e aleatório
docker compose up -d --build     # postgres + servidor do jogo, totalmente compilado
# abra http://localhost:8787 — contas, personagens, o mundo inteiro
```

Para **hospedagem remota**: coloque a stack do compose em qualquer VPS, defina um
`POSTGRES_PASSWORD` real no ambiente e exponha a porta 8787 por trás de um proxy
reverso com TLS (com o Caddy isso são duas linhas — `your.domain { reverse_proxy
localhost:8787 }`); os WebSockets são repassados automaticamente e o cliente
seleciona `wss://` sozinho em páginas https. Os endpoints de autenticação têm
limite de taxa por IP; as senhas usam hash scrypt; os tokens expiram após 7 dias.
Nunca defina `ALLOW_DEV_COMMANDS=1` em produção (isso habilita as trapaças de
level/teleporte usadas pelos bots de teste).

## Desenvolva online (hot reload)

```bash
npm install
cp .env.example .env
# edite o .env e defina POSTGRES_PASSWORD e DATABASE_URL com a mesma senha
npm run db:up        # postgres 16 no docker (porta 5433, persistido em volume)
npm run server       # servidor de jogo autoritativo na :8787 (REST + WebSocket)
npm run dev          # servidor de dev do cliente na :5173 (faz proxy de /api e /ws)
```

Abra http://localhost:5173 → **Play Online** → crie uma conta → crie um
personagem → Enter World. Abra um segundo navegador/aba e faça login de novo — vocês
verão um ao outro na cidade. `Enter` abre o chat.

- **Contas**: senhas com hash scrypt, tokens de portador de 7 dias (`auth_tokens`).
- **Personagens**: até 10 por conta; nível/equipamento/bolsas/missões/posição/dinheiro
  persistem como JSONB no Postgres — salvos a cada 30 s, no logout e no desligamento
  do servidor. Os nomes são globalmente únicos, somente letras, no estilo clássico.
- **O servidor é autoritativo**: os clientes transmitem intenção de movimento +
  comandos a 20 Hz; o servidor roda o mundo (um único `Sim` compartilhado) e envia
  snapshots delimitados por interesse (~120 yd) mais eventos roteados por jogador.
  Toda a matemática de combate, rolagens de loot, crédito de missão e transações de
  vendedor acontecem no servidor; o cliente é apenas um renderizador.
- **Parties** (até 5): clique com o botão direito num jogador → *Invite to Party*.
  Frames de party à esquerda, os membros compartilham direitos de tap, crédito de
  missão de abate e dividem XP com os bônus de grupo reais do vanilla (1.166/1.3/1.43
  para 3/4/5). Chat de party com `/p mensagem`. Blips azuis dos membros no minimapa.
- **Trocas**: clique com o botão direito num jogador → *Trade*. Os dois lados
  preparam itens + dinheiro, ambos precisam aceitar, e a troca é atômica e validada
  pelo servidor (itens de missão não podem ser trocados). Afastar-se cancela.
- **Duelos**: clique com o botão direito → *Challenge to a Duel*. Contagem regressiva
  de 3 segundos, luta até um lado chegar a 1 hp — ninguém morre, o vencedor é
  anunciado em toda a zona. Correr 60 jardas para longe resulta em derrota por
  desistência.
- **The Ashen Coliseum** (arena ranqueada 1v1): pressione `G` (ou o botão ⚔) para
  abrir o painel da arena e *Enter the Queue*. O matchmaking pareia você com o
  desafiante online de rating mais próximo, depois teleporta os dois para um fosso de
  luta privado e iluminado por tochas. Uma contagem regressiva de 5 segundos cura e
  reinicia os dois lutadores para um começo justo; o combate termina quando um cede a
  1 hp (ninguém morre). Vitórias e derrotas movem um **rating Elo** persistente (todos
  começam em 1500), e você volta exatamente para onde entrou na fila. O painel mostra
  sua colocação, o ranking online ao vivo e o placar de todos os tempos
  (`GET /api/arena/leaderboard`).
- **Regras de multiplayer**: direitos de tap clássicos (o primeiro jogador a causar
  dano a um mob é dono do loot/XP/crédito de missão dele — os outros recebem "You
  don't have permission to loot that."), os mobs miram o próximo atacante quando sua
  vítima morre (sem resets de graça), anúncios de entrada/saída, chat no estilo
  `/say`.

## The Hollow Crypt — instância de elite para 5 jogadores

A história de Brother Aldric continua depois de *The Restless Dead*: **Whispers
Below** (encontre o sigilo do Gravecaller na capela em ruínas) → **The Binding
Rite** (junte Blessed Tallow da escavação dos kobolds e Ghostly Essence dos mortos
inquietos) → **Into the Hollow** (*jogadores sugeridos: 5*) — mate Morthen the
Gravecaller no fundo da cripta sob a capela.

- A porta da cripta na Fallen Chapel teleporta sua **party para sua própria cópia
  privada da instância** (6 vagas; as instâncias reiniciam após 5 minutos vazias).
- Lá dentro: corredores iluminados por tochas, grupos de trash **elite** em duplas
  (escala de elite do vanilla: ~2.3× de vida, ~1.5× de dano, XP em dobro), o
  miniboss Sexton Marrow e Morthen — um chefe elite de nível 10 com um AoE **Shadow
  Pulse** a cada 10 segundos. O trash da masmorra não reaparece até a instância
  reiniciar.
- Recompensas: armas raras (azuis) por arquétipo de classe, 1 de ouro, 1500 de XP.
- É genuinamente balanceada para 5: nossa raid automatizada de 5 bots (warrior,
  paladin, priest, mage, hunter com fogo concentrado + IA de cura) limpa tudo em
  ~5 minutos com ~10 mortes (`node scripts/crypt_raid.mjs`, precisa de
  ALLOW_DEV_COMMANDS=1).

```
docker compose ps          # eastbrook-db (postgres:16-alpine, healthcheck)
node scripts/mp_integration.mjs   # suíte de 26 verificações de API/WS/persistência
node scripts/mp_browser.mjs       # dois clientes de navegador reais veem um ao outro
```

## The Sunken Bastion & Gravewyrm Sanctum

A conspiração não termina com Morthen. **The Sunken Bastion** (5 jogadores,
~nível 13, sudeste de Mirefen) abriga Vael the Mistcaller — ele invoca ondas de
Drowned Thralls a 60% e 30% de vida. O final é o **Gravewyrm Sanctum** (5
jogadores, nível 20, sob Thornpeak): três câmaras de boneguard elite e drakonid,
Korgath the Bound (enfurece abaixo de 30%), Grand Necromancer Velkhar (mais ondas
de adds) e **Korzul the Gravewyrm** — armas épicas caem aqui, e a cadeia de
missões de preparação pode ser feita solo, então ninguém fica de fora da história.



## Jogue offline

```bash
npm run dev        # abra http://localhost:5173 -> Play Offline
```

Dê um nome ao seu personagem, escolha qualquer uma das nove classes, e você está em
**Eastbrook Vale** (níveis 1-7): uma cidade de mercado cercada por seis polos —
trilhas de lobos ao norte, prados de javalis a leste, a Webwood a oeste, Mirror Lake
a noroeste, uma escavação de cobre dos kobolds a sudoeste, uma capela em ruínas com
mortos inquietos a nordeste, e o acampamento de bandidos de Gorrak a sudeste. A
estrada ao norte sobe por um passo na montanha até **Mirefen Marsh** (6-13, polo:
Fenbridge) e segue subindo até **Thornpeak Heights** (13-20, polo: Highwatch) —
três zonas, ~60 missões e uma só história: a conspiração do Gravecaller, dos
primeiros ossos inquietos fora de Eastbrook até **Korzul the Gravewyrm** sob os
picos. Cada polo tem vendedores (incluindo ferreiros de armas e armaduras que vendem
equipamento branco honesto), um cemitério, sua própria música e um mapa de zona.

### Controles (layout clássico)

| Entrada | Ação |
|---|---|
| `W`/`S` | correr / recuar — `A`/`D` viram (strafe com o botão direito do mouse pressionado), `Q`/`E` fazem strafe |
| arrastar com o direito / arrastar com o esquerdo | mouselook / orbitar a câmera &nbsp;·&nbsp; a roda dá zoom · `Space` pula |
| `Tab` | percorre os inimigos mais próximos · clique esquerdo mira o alvo · clique direito ataca/saqueia/conversa |
| `1`–`9`, `0`, `-`, `=` | barra de ação |
| `F` | interagir (saquear cadáver / pegar objeto / conversar) |
| `C` `P` `L` `M` `B` `G` | personagem · grimório · registro de missões · mapa-múndi · bolsas · arena (Ashen Coliseum) |
| `V` / `R` / `Esc` | placas de nome · autorun · fechar janelas / limpar alvo |

### Checklist de fidelidade ao clássico

**Fórmulas (as de verdade do vanilla)**
- Conversão de rage `c = 0.0091L² + 3.23L + 4.27`; ganhos `7.5·d/c` ao causar, `2.5·d/c` ao receber
- Tabela de acerto de magia com o degrau de +3 níveis (96/95/94/83%); erro/esquiva de melee vs nível
- DR de armadura `armor/(armor + 85·AttackerLevel + 400)`
- Regras de HP/mana por atributo: as primeiras 20 de stamina → 1 hp cada, o resto → 10; as primeiras 20 de int → 1 mana, o resto → 15
- Curva de XP 400/900/1400/… até o nível 20; XP de mob `45 + 5·L` com as bandas cinza de diferença zero reais
- GCD de 1.5 s (1.0 s para rogues), timers de swing de arma, regra dos 5 segundos de mana

**Todas as nove classes do vanilla (níveis de aprendizado e valores de rank do
vanilla, 1–20 — as magias ganham ranks conforme você sobe de nível: Lightning Bolt
R2 no 8, R3 no 14, R4 no 20, além de novas habilidades de banda alta como Execute,
Kidney Shot, Flash Heal, Stormstrike e Starfire)**
- *Warrior*: rage, Heroic Strike (no próximo golpe, fora do GCD), Battle Shout,
  Charge, Rend, Thunder Clap, Hamstring, Bloodrage, Overpower (proc de esquiva)
- *Paladin*: Seal of Righteousness (imbuir arma) liberado por **Judgement**,
  Holy Light, Devotion Aura, Blessing of Might, Divine Protection (absorção),
  Hammer of Justice (atordoamento), Lay on Hands
- *Hunter*: **Auto Shot à distância** (8–35 yd com a clássica zona morta),
  Raptor Strike, Aspect of the Hawk, Serpent Sting, Arcane Shot, Concussive
  Shot, Mongoose Bite (proc de esquiva), Wing Clip
- *Rogue*: energia + **combo points**, Sinister Strike, Eviscerate, Backstab
  (por trás + adaga), Gouge, Evasion, Slice and Dice, Sprint
- *Priest*: Smite, Lesser Heal, Power Word: Fortitude, Shadow Word: Pain,
  **Power Word: Shield** (absorção), **Renew** (HoT), Mind Blast
- *Shaman*: Lightning Bolt, **Rockbiter Weapon** (imbuir), Healing Wave,
  Earth Shock, **Lightning Shield** (espinhos), Flame Shock
- *Mage*: Fireball, Frost Armor, Arcane Intellect, Frostbolt, Conjure Water,
  Fire Blast, Arcane Missiles (canalizada), **Polymorph**, Frost Nova
- *Warlock*: Shadow Bolt, Demon Skin, Immolate, Corruption, **Life Tap**,
  Curse of Agony, **Drain Life** (roubo de vida canalizado)
- *Druid*: Wrath, Healing Touch, Mark of the Wild, Moonfire, Rejuvenation,
  Thorns, Entangling Roots, **Bear Form** (alternar metamorfose no 10)
- As curas podem mirar membros da party (clique num frame de party, depois cure);
  os buffs podem ser conjurados em jogadores amigos; curas têm crítico; escudos de
  absorção sugam o dano antes da vida.

**Mundo & sistemas**
- Comer/beber: sente-se, restaura ao longo de 18 s, quebra ao tomar dano ou ao ficar
  de pé — e sim, você pode comer e beber ao mesmo tempo
- Vendedor: compre comida/água, venda seus grays; exibição de moedas em g/s/c
- Objetos de missão no chão com brilhos (roube de volta as caixas de suprimentos dos bandidos)
- IA de mob: vagar, aggro por proximidade conforme a diferença de nível, pulls
  sociais (os murlocs puxam de mais longe — traga amigos), perseguir, leash-evade-reset,
  loot de cadáver, respawns; um spawn raro (Old Greyjaw) num timer longo
- Morte → liberar espírito → cemitério; dano de queda; nadar te deixa mais lento
- Registro de missões com abandonar, diálogos de gossip com saudações, recompensas por classe

**Apresentação**
- Tudo procedural: casas de enxaimel, telhados de telha, capela, barraca de mercado,
  tendas, fogueiras com luz tremeluzente, portal da mina, colunas em ruínas, doca de
  pesca, choupanas de lama dos murlocs, estradas pintadas no terreno, tufos de grama,
  pinheiros + carvalhos, lago com água animada, nuvens à deriva, sombras em tempo real
- Doze famílias de criaturas rigadas (lobo/javali/aranha/murloc/kobold/esqueleto/
  humanoide/troll/ogro/elemental/dragonkin/ovelha) com animações de andar/atacar/
  conjurar/sentar/morrer
- Ícones procedurais pintados para cada magia, item e buff — desenhados em canvas
  em tempo de execução, sem arquivos de asset
- UI clássica: frames de unidade com retrato, barras de buff/debuff com durações,
  barra de ação com varreduras de cooldown + coloração de alcance/recurso, barra de
  conjuração/canalização, grimório, paperdoll do personagem, registro de missões,
  mapa-múndi, janelas de vendedor + loot, tooltips com borda dourada, texto de
  combate flutuante, log de combate, barra de XP segmentada, minimapa com blips e um
  mapa de zona completo
- Som procedural com WebAudio: impactos de melee/magia, fanfarra de level-up, sinos
  de missão, tilintar de moedas, o toque de morte — sem arquivos de áudio

## Desenvolvimento

```bash
npm test                        # suíte vitest: fórmulas, combate, IA, missões, todas as 9 classes,
                                #   parties, duelos, trocas, elites, a cripta
npm run build                   # build web de produção
node scripts/smoke_browser.mjs  # E2E de warrior (precisa do `npm run dev` rodando)
node scripts/smoke_mage.mjs     # mage: conjuração, polymorph, conjurar+beber, morte/liberação
node scripts/smoke_rogue.mjs    # rogue: combo points, eviscerate, vendedor, comer
node scripts/visual_tour.mjs    # tour de screenshots da zona + UI para tmp/
node scripts/mp_integration.mjs # suíte de 26 verificações de API/WS/persistência (servidor rodando)
node scripts/social_e2e.mjs     # trade + duelo pela rede (ALLOW_DEV_COMMANDS=1)
node scripts/arena_visual.mjs   # dois clientes entram na fila + lutam um 1v1 ranqueado na Ashen Coliseum
node scripts/crypt_raid.mjs     # cinco bots limpam a The Hollow Crypt (ALLOW_DEV_COMMANDS=1)
```

Os agentes de navegador podem controlar o movimento através do
`window.__game.controller` em vez de simular teclas pressionadas. Use
`controller.move({ forward: true }, facingRadians)` ou flags compactas de websocket
como `{ f: 1, sr: 1 }`; chame `controller.face(facingRadians)` para atualizar a
direção sem mudar o movimento e `controller.stop()` para voltar à entrada real do
teclado. O jogo online envia o mesmo quadro de entrada para o servidor, que aceita
apenas flags de movimento booleanas/`1` e valores de direção finitos.

Layout:

```
src/sim/      núcleo de jogo determinístico para N jogadores (sem imports de DOM) — compartilhado por todos os alvos
src/render/   renderizador Three.js: models.ts (rigs), props.ts, textures.ts (procedural)
src/game/     entrada + câmera + sintetizador WebAudio
src/ui/       HUD clássica: frames, janelas, tooltips, mapa, FCT
src/net/      cliente online: autenticação REST + espelho de mundo por WebSocket (ClientWorld)
src/world_api.ts  a interface IWorld que tanto Sim quanto ClientWorld satisfazem
server/       servidor de jogo: main.ts (HTTP+WS), game.ts (loop do mundo), db.ts, auth.ts
docker-compose.yml  postgres:16-alpine
tests/        suíte vitest
scripts/      E2E de navegador + tour de screenshots + testes de integração multiplayer
```

Os nomes, missões e as zonas são originais; as fórmulas e mecânicas seguem o
vanilla. A seed do mundo é fixa em `src/main.ts` para que o mundo seja o mesmo lugar
a cada visita.

## Contribuindo

Contribuições de todo tipo são bem-vindas: código, traduções, relatos de bug e
documentação. Comece pelo [CONTRIBUTING.pt_BR.md](CONTRIBUTING.pt_BR.md) para a
configuração e as diretrizes, e por favor siga o nosso
[Código de Conduta](../../CODE_OF_CONDUCT.md). É novo por aqui? Procure issues com o
rótulo [`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue),
abra uma [issue](https://github.com/levy-street/world-of-claudecraft/issues/new/choose)
ou dê um oi no [Discord](https://discord.gg/GjhnUsBtw).

## Licença

O código é [licenciado sob MIT](../../LICENSE) — faça fork, remixe, hospede seu próprio mundo.

Os assets de arte de terceiros incluídos (modelos, texturas, HDRIs) permanecem sob
suas próprias licenças — todos CC0 de domínio público, exceto os normal maps de água
sob MIT, conforme documentado por pacote em [CREDITS.md](../../CREDITS.md).
