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

[English](../../README.md) · [Español](README.es.md) · [Español (España)](README.es_ES.md) · [Français](README.fr_FR.md) · [Français (Canada)](README.fr_CA.md) · [Italiano](README.it_IT.md) · [Deutsch](README.de_DE.md) · [简体中文](README.zh_CN.md) · [繁體中文](README.zh_TW.md) · **한국어** · [日本語](README.ja_JP.md) · [Português (Brasil)](README.pt_BR.md) · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft — 클래식 스타일 MMO

[커뮤니티 Discord 참여하기](https://discord.gg/GjhnUsBtw)

![World of ClaudeCraft 타이틀 화면](../../docs/screenshots/title-screen.jpg)

직접 호스팅하고 플레이할 수 있는, 클래식 시대 MMO 풍의 마이크로 MMO입니다:

1. **온라인으로 플레이** — 계정, Postgres에 영구 저장되는 캐릭터, 그리고 같은 세계 속 다른 플레이어들이 존재하는 진짜 클라이언트/서버 게임입니다.
2. 브라우저에서 **오프라인으로 플레이**하여 곧장 세계로 뛰어들 수 있습니다.

두 방식 모두 **동일한 결정론적 시뮬레이션 코어**(`src/sim/`)를 실행하므로, 오프라인 세계는 온라인에서 모두를 위해 권위 있는 멀티플레이어 서버가 구동하는 것과 똑같이 동작합니다.

## Screenshots

![Eastbrook의 약초상 앞에 모인 파티](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Eastbrook 모닥불가의 황혼](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Eastbrook 모닥불가의 황혼* | ![Hollow Crypt에서의 정예 풀링](../../docs/screenshots/hollow-crypt.jpg)<br>*The Hollow Crypt에서 횃불에 비친 정예 풀링* |
| ![폐허가 된 예배당의 안식 없는 망자들](../../docs/screenshots/restless-dead.jpg)<br>*폐허가 된 예배당의 안식 없는 망자들* | ![Vale Bandits와의 난투](../../docs/screenshots/vale-bandits.jpg)<br>*도적 야영지에서 수적 열세에 몰리다* |
| ![북쪽 길에서 추격당한 Old Greyjaw](../../docs/screenshots/old-greyjaw.jpg)<br>*북쪽 길에서 추격당한 희귀 출현 몹 Old Greyjaw* | ![상인 및 가방 UI](../../docs/screenshots/vendor-and-bags.jpg)<br>*Smith Haldren에게서 장비 갖추기 — 툴팁, 가방, 동전* |

![World of Claude](../../worldofclaude.png)

![World of ClaudeCraft 커뮤니티](../../woc_community.png)

---

## Host it (한 줄 명령으로)

```bash
cp .env.example .env
# .env를 편집해 길고 무작위한 POSTGRES_PASSWORD를 설정하세요
docker compose up -d --build     # postgres + 게임 서버, 완전히 빌드됨
# http://localhost:8787 을 여세요 — 계정, 캐릭터, 세계 전체
```

**원격 호스팅**의 경우: compose 스택을 아무 VPS에나 올리고, 환경에 실제 `POSTGRES_PASSWORD`를 설정한 뒤, 8787 포트 앞에 TLS 리버스 프록시를 두세요(Caddy로는 두 줄이면 됩니다 — `your.domain { reverse_proxy localhost:8787 }`). WebSocket은 자동으로 프록시되며, 클라이언트는 https 페이지에서 `wss://`를 자동 선택합니다. 인증 엔드포인트는 IP별로 속도 제한이 걸려 있고, 비밀번호는 scrypt로 해시되며, 토큰은 7일 후 만료됩니다. 프로덕션에서는 절대 `ALLOW_DEV_COMMANDS=1`을 설정하지 마세요(테스트 봇이 사용하는 레벨/순간이동 치트가 활성화됩니다).

## Develop online (핫 리로드)

```bash
npm install
cp .env.example .env
# .env를 편집해 POSTGRES_PASSWORD와 DATABASE_URL을 같은 비밀번호로 설정하세요
npm run db:up        # docker 내 postgres 16 (포트 5433, 볼륨에 영속화)
npm run server       # :8787에서 권위 있는 게임 서버 (REST + WebSocket)
npm run dev          # :5173에서 클라이언트 개발 서버 (/api와 /ws를 프록시)
```

http://localhost:5173 을 열고 → **Play Online** → 계정 생성 → 캐릭터 생성 → Enter World. 두 번째 브라우저/탭을 열어 다시 로그인하면 — 마을에서 서로를 볼 수 있습니다. `Enter`로 채팅을 엽니다.

- **계정**: scrypt로 해시된 비밀번호, 7일짜리 bearer 토큰(`auth_tokens`).
- **캐릭터**: 계정당 최대 10개; 레벨/장비/가방/퀘스트/위치/소지금이 Postgres에 JSONB로 영속화됩니다 — 30초마다, 로그아웃 시, 그리고 서버 종료 시 저장됩니다. 이름은 전역적으로 고유하며, 글자만 허용되고, 클래식 스타일입니다.
- **서버는 권위를 가집니다**: 클라이언트는 이동 의도 + 명령을 20 Hz로 스트리밍하고, 서버는 세계(하나의 공유된 `Sim`)를 구동하며 관심 범위로 한정된 스냅샷(~120 yd)과 플레이어별로 라우팅된 이벤트를 보냅니다. 모든 전투 계산, 전리품 굴림, 퀘스트 인정, 상점 거래는 서버 측에서 일어나며, 클라이언트는 렌더러입니다.
- **파티**(최대 5인): 플레이어를 우클릭 → *Invite to Party*. 파티 프레임이 왼쪽에 표시되고, 구성원은 태그 권한을 공유하며, 처치 퀘스트 인정과 XP를 진짜 바닐라 그룹 보너스(3/4/5인일 때 1.166/1.3/1.43)로 나눕니다. `/p 메시지`로 파티 채팅. 미니맵에 파란 구성원 점이 표시됩니다.
- **거래**: 플레이어를 우클릭 → *Trade*. 양측이 아이템 + 소지금을 올려두고, 둘 다 수락해야 하며, 교환은 원자적이고 서버에서 검증됩니다(퀘스트 아이템은 거래 불가). 서로 떨어져 걸어가면 취소됩니다.
- **결투**: 우클릭 → *Challenge to a Duel*. 3초 카운트다운, 한쪽이 hp 1에 도달할 때까지 싸웁니다 — 아무도 죽지 않으며, 승자가 구역 전체에 공지됩니다. 60야드를 벗어나 달아나면 기권 처리됩니다.
- **The Ashen Coliseum**(1대1 랭크 투기장): `G`(또는 ⚔ 버튼)를 눌러 투기장 패널을 열고 *Enter the Queue*. 매치메이킹은 온라인 상태인 가장 비슷한 레이팅의 도전자와 짝지어 준 다음, 둘 다 횃불이 밝혀진 비공개 투기장으로 순간이동시킵니다. 5초 카운트다운이 양쪽 투사를 치유하고 초기화하여 공정한 출발을 보장하며, 한쪽이 hp 1에서 항복하면 시합이 끝납니다(아무도 죽지 않음). 승패는 영속적인 **Elo 레이팅**(모두 1500에서 시작)을 움직이며, 큐에 들어갔던 정확히 그 자리로 돌아옵니다. 패널에는 당신의 순위, 실시간 온라인 사다리, 그리고 역대 리더보드(`GET /api/arena/leaderboard`)가 표시됩니다.
- **멀티플레이어 규칙**: 클래식 태그 권한(몹에게 처음 피해를 준 플레이어가 그 전리품/XP/퀘스트 인정을 소유하며 — 다른 사람은 "You don't have permission to loot that." 메시지를 받습니다), 희생자가 죽으면 몹은 다음 공격자를 다시 타겟팅하고(공짜 리셋 없음), 입장/퇴장 공지, `/say` 방식의 채팅.

## The Hollow Crypt — 5인 정예 인스턴스

Brother Aldric의 이야기 줄기는 *The Restless Dead* 이후로 계속됩니다: **Whispers Below**(폐허가 된 예배당에서 Gravecaller의 인장 찾기) → **The Binding Rite**(코볼트 채굴장에서 Blessed Tallow를, 안식 없는 망자에게서 Ghostly Essence를 모으기) → **Into the Hollow**(*권장 인원: 5명*) — 예배당 아래 지하 묘지 맨 밑에서 Morthen the Gravecaller를 처치하세요.

- Fallen Chapel의 지하 묘지 문은 **당신의 파티를 전용 비공개 인스턴스 사본**으로 순간이동시킵니다(슬롯 6개; 인스턴스는 비어 있은 지 5분 후 리셋됩니다).
- 내부: 횃불이 밝혀진 복도, 짝지어진 **정예** 잡몹 무리(바닐라 정예 스케일링: 체력 ~2.3배, 피해 ~1.5배, XP 2배), 중간 보스 Sexton Marrow, 그리고 Morthen — 10초마다 **Shadow Pulse** 광역기를 쓰는 레벨 10 정예 보스. 던전 잡몹은 인스턴스가 리셋될 때까지 다시 출현하지 않습니다.
- 보상: 직업 원형별 희귀(파란색) 무기, 1골드, 1500 XP.
- 진정으로 5인용으로 조율되어 있습니다: 우리의 자동화된 5봇 공격대(전사, 성기사, 사제, 마법사, 사냥꾼, 집중 사격 + 힐러 AI)는 약 5분 만에 ~10번의 죽음으로 클리어합니다(`node scripts/crypt_raid.mjs`, ALLOW_DEV_COMMANDS=1 필요).

```
docker compose ps          # eastbrook-db (postgres:16-alpine, 헬스체크)
node scripts/mp_integration.mjs   # 26개 점검 API/WS/영속성 스위트
node scripts/mp_browser.mjs       # 두 개의 실제 브라우저 클라이언트가 서로를 봄
```

## The Sunken Bastion & Gravewyrm Sanctum

음모는 Morthen으로 끝나지 않습니다. **The Sunken Bastion**(5인, ~레벨 13, Mirefen 남동부)에는 Vael the Mistcaller가 있으며 — 그는 체력 60%와 30%에서 Drowned Thrall 무리를 소환합니다. 대미는 **Gravewyrm Sanctum**(5인, 레벨 20, Thornpeak 아래)입니다: 정예 boneguard와 drakonid가 있는 세 개의 방, Korgath the Bound(체력 30% 미만에서 격노), Grand Necromancer Velkhar(추가 소환 무리), 그리고 **Korzul the Gravewyrm** — 이곳에서 에픽 무기가 드롭되며, 이어지는 퀘스트 사슬은 솔로로 진행할 수 있어 아무도 이야기에서 소외되지 않습니다.



## Play offline

```bash
npm run dev        # http://localhost:5173 을 열고 -> Play Offline
```

캐릭터 이름을 짓고, 아홉 직업 중 아무거나 고르면, **Eastbrook Vale**(레벨 1-7)에 들어와 있습니다: 여섯 개의 거점으로 둘러싸인 시장 마을 — 북쪽의 늑대 사냥터, 동쪽의 멧돼지 초원, 서쪽의 the Webwood, 북서쪽의 Mirror Lake, 남서쪽의 코볼트 구리 채굴장, 북동쪽의 안식 없는 망자가 있는 폐허가 된 예배당, 그리고 남동쪽의 Gorrak의 도적 야영지. 북쪽 길은 산길을 따라 올라 **Mirefen Marsh**(6-13, 거점: Fenbridge)로 이어지고, 다시 위로 **Thornpeak Heights**(13-20, 거점: Highwatch)까지 올라갑니다 — 세 개의 구역, ~60개의 퀘스트, 그리고 하나의 이야기 줄기: Eastbrook 외곽의 첫 안식 없는 뼈에서부터 봉우리 아래의 **Korzul the Gravewyrm**에 이르는 Gravecaller 음모. 각 거점에는 상인(정직한 흰색 장비를 파는 무기 대장장이와 방어구 대장장이 포함), 묘지, 고유한 음악, 그리고 구역 지도가 있습니다.

### Controls (클래식 배치)

| Input | Action |
|---|---|
| `W`/`S` | 달리기 / 뒷걸음 — `A`/`D` 회전(우클릭을 누른 채로는 횡이동), `Q`/`E` 횡이동 |
| 우클릭 드래그 / 좌클릭 드래그 | 마우스룩 / 카메라 회전 &nbsp;·&nbsp; 휠로 줌 · `Space`로 점프 |
| `Tab` | 가장 가까운 적 순환 · 좌클릭으로 타겟 · 우클릭으로 공격/약탈/대화 |
| `1`–`9`, `0`, `-`, `=` | 액션 바 |
| `F` | 상호작용 (시체 약탈 / 물건 줍기 / 대화) |
| `C` `P` `L` `M` `B` `G` | 캐릭터 · 주문서 · 퀘스트 로그 · 세계 지도 · 가방 · 투기장 (Ashen Coliseum) |
| `V` / `R` / `Esc` | 이름표 · 자동 달리기 · 창 닫기 / 타겟 해제 |

### Classic-fidelity 체크리스트

**공식 (진짜 바닐라 공식들)**
- 분노 전환 `c = 0.0091L² + 3.23L + 4.27`; 가하는 피해는 `7.5·d/c`, 받는 피해는 `2.5·d/c`만큼 획득
- +3레벨 절벽이 있는 주문 적중 표(96/95/94/83%); 레벨 대비 근접 빗나감/회피
- 방어도 피해 감소 `armor/(armor + 85·AttackerLevel + 400)`
- HP/마나 능력치 규칙: 첫 20 체력 → 각 1 hp, 나머지 → 10; 첫 20 지능 → 각 1 마나, 나머지 → 15
- 레벨 20까지의 XP 곡선 400/900/1400/…; 몹 XP `45 + 5·L`에 진짜 영차이 회색 대역 적용
- 1.5초 GCD(도적은 1.0초), 무기 휘두름 타이머, 5초 마나 규칙

**아홉 가지 바닐라 직업 전부(습득 레벨과 등급 수치는 바닐라 기준, 1–20 — 주문은 레벨업하며 등급이 오릅니다: Lightning Bolt R2는 8에서, R3는 14에서, R4는 20에서, 그리고 Execute, Kidney Shot, Flash Heal, Stormstrike, Starfire 같은 새로운 고레벨 대역 능력들도 추가)**
- *Warrior*: 분노, Heroic Strike(다음 휘두름에 발동, GCD 무시), Battle Shout, Charge, Rend, Thunder Clap, Hamstring, Bloodrage, Overpower(회피 프록)
- *Paladin*: **Judgement**로 터뜨리는 Seal of Righteousness(무기 강화), Holy Light, Devotion Aura, Blessing of Might, Divine Protection(흡수), Hammer of Justice(기절), Lay on Hands
- *Hunter*: **원거리 Auto Shot**(클래식 데드 존이 있는 8–35 yd), Raptor Strike, Aspect of the Hawk, Serpent Sting, Arcane Shot, Concussive Shot, Mongoose Bite(회피 프록), Wing Clip
- *Rogue*: 기력 + **연계 점수**, Sinister Strike, Eviscerate, Backstab(뒤 + 단검), Gouge, Evasion, Slice and Dice, Sprint
- *Priest*: Smite, Lesser Heal, Power Word: Fortitude, Shadow Word: Pain, **Power Word: Shield**(흡수), **Renew**(HoT), Mind Blast
- *Shaman*: Lightning Bolt, **Rockbiter Weapon**(강화), Healing Wave, Earth Shock, **Lightning Shield**(가시), Flame Shock
- *Mage*: Fireball, Frost Armor, Arcane Intellect, Frostbolt, Conjure Water, Fire Blast, Arcane Missiles(정신 집중), **Polymorph**, Frost Nova
- *Warlock*: Shadow Bolt, Demon Skin, Immolate, Corruption, **Life Tap**, Curse of Agony, **Drain Life**(정신 집중 생명력 흡수)
- *Druid*: Wrath, Healing Touch, Mark of the Wild, Moonfire, Rejuvenation, Thorns, Entangling Roots, **Bear Form**(10레벨에 토글 변신)
- 치유는 파티 구성원을 대상으로 할 수 있으며(파티 프레임을 클릭한 뒤 치유), 버프는 우호적인 플레이어에게 시전 가능하고, 치유 치명타가 있으며, 흡수 보호막은 체력보다 먼저 피해를 흡수합니다.

**세계 & 시스템**
- 먹기/마시기: 앉으면 18초에 걸쳐 회복되고, 피해를 받거나 일어서면 끊깁니다 — 그리고 그렇습니다, 먹기와 마시기를 동시에 할 수 있습니다
- 상점: 음식/물 구매, 회색 아이템 판매; 소지금은 g/s/c로 표시
- 반짝이는 바닥 퀘스트 물건(도적의 보급 상자를 되찾으세요)
- 몹 AI: 배회, 레벨 차이에 따른 근접 어그로, 사회적 풀(murloc은 더 멀리서 끌려옵니다 — 친구를 데려오세요), 추격, 끈-회피-리셋, 시체 약탈, 재출현; 긴 타이머로 도는 희귀 출현 몹(Old Greyjaw)
- 죽음 → 영혼 해방 → 묘지; 낙하 피해; 수영하면 느려짐
- 포기 기능이 있는 퀘스트 로그, 인사말이 있는 잡담 대화, 직업별 보상

**연출**
- 모든 것이 절차적: 목재 골조 주택, 널빤지 지붕, 예배당, 시장 가판대, 천막, 깜빡이는 빛이 도는 모닥불, 광산 입구, 폐허가 된 기둥, 낚시 부두, murloc 진흙 오두막, 지형에 그려 넣은 길, 풀 다발, 소나무 + 참나무, 애니메이션 처리된 물의 호수, 떠다니는 구름, 실시간 그림자
- 걷기/공격/시전/앉기/죽음 애니메이션을 갖춘 열두 종의 리깅된 생물 계열(wolf/boar/spider/murloc/kobold/skeleton/humanoid/troll/ogre/elemental/dragonkin/sheep)
- 모든 주문, 아이템, 버프를 위한 손으로 그린 절차적 아이콘 — 런타임에 캔버스에 그려지며, 에셋 파일 없음
- 클래식 UI: 초상화 유닛 프레임, 지속시간이 있는 버프/디버프 바, 쿨다운 스윕 + 사거리/자원 색상이 적용된 액션 바, 시전/정신 집중 바, 주문서, 캐릭터 종이인형, 퀘스트 로그, 세계 지도, 상점 + 전리품 창, 금테 두른 툴팁, 떠다니는 전투 텍스트, 전투 로그, 분할된 XP 바, 점이 표시되는 미니맵과 전체 구역 지도
- 절차적 WebAudio 사운드: 근접/주문 타격음, 레벨업 팡파르, 퀘스트 차임벨, 동전 짤랑임, 죽음의 효과음 — 오디오 파일 없음

## Development

```bash
npm test                        # vitest 스위트: 공식, 전투, AI, 퀘스트, 9개 직업 전부,
                                #   파티, 결투, 거래, 정예, the crypt
npm run build                   # 프로덕션 웹 빌드
node scripts/smoke_browser.mjs  # 전사 E2E (`npm run dev` 실행 필요)
node scripts/smoke_mage.mjs     # 마법사: 시전, polymorph, conjure+마시기, 죽음/해방
node scripts/smoke_rogue.mjs    # 도적: 연계 점수, eviscerate, 상점, 먹기
node scripts/visual_tour.mjs    # 구역 + UI의 스크린샷 투어를 tmp/로
node scripts/mp_integration.mjs # 26개 점검 API/WS/영속성 스위트 (서버 실행 중)
node scripts/social_e2e.mjs     # 네트워크 너머로 거래 + 결투 (ALLOW_DEV_COMMANDS=1)
node scripts/arena_visual.mjs   # 두 클라이언트가 The Ashen Coliseum에서 랭크 1대1을 큐잉 + 전투
node scripts/crypt_raid.mjs     # 다섯 봇이 the Hollow Crypt를 클리어 (ALLOW_DEV_COMMANDS=1)
```

브라우저 에이전트는 눌린 키를 시뮬레이션하는 대신 `window.__game.controller`를 통해 이동을 구동할 수 있습니다. `controller.move({ forward: true }, facingRadians)` 또는 `{ f: 1, sr: 1 }` 같은 간결한 websocket 플래그를 사용하세요. 이동을 바꾸지 않고 바라보는 방향만 갱신하려면 `controller.face(facingRadians)`를, 실제 키보드 입력으로 돌아가려면 `controller.stop()`을 호출하세요. 온라인 플레이는 동일한 입력 프레임을 서버로 보내며, 서버는 boolean/`1` 이동 플래그와 유한한 바라보기 값만 받아들입니다.

레이아웃:

```
src/sim/      결정론적 N-플레이어 게임 코어 (DOM import 없음) — 모든 대상이 공유
src/render/   Three.js 렌더러: models.ts (리그), props.ts, textures.ts (절차적)
src/game/     입력 + 카메라 + WebAudio 신디사이저
src/ui/       클래식 HUD: 프레임, 창, 툴팁, 지도, FCT
src/net/      온라인 클라이언트: REST 인증 + WebSocket 세계 미러 (ClientWorld)
src/world_api.ts  Sim과 ClientWorld 모두가 충족하는 IWorld 인터페이스
server/       게임 서버: main.ts (HTTP+WS), game.ts (세계 루프), db.ts, auth.ts
docker-compose.yml  postgres:16-alpine
tests/        vitest 스위트
scripts/      브라우저 E2E + 스크린샷 투어 + 멀티플레이어 통합 테스트
```

이름, 퀘스트, 구역은 독창적이며, 공식과 메커니즘은 바닐라를 따릅니다. 세계 시드는 `src/main.ts`에 고정되어 있어 방문할 때마다 세계가 같은 곳입니다.

## 기여하기

코드, 번역, 버그 제보, 문서 등 모든 종류의 기여를 환영합니다. 설정 방법과 가이드라인은 [CONTRIBUTING.ko_KR.md](CONTRIBUTING.ko_KR.md)에서 시작하시고, 저희의 [행동 강령](../../CODE_OF_CONDUCT.md)을 지켜 주세요. 처음이신가요? [`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue) 라벨이 붙은 이슈를 찾아보시거나, [이슈](https://github.com/levy-street/world-of-claudecraft/issues/new/choose)를 열어 주시거나, [Discord](https://discord.gg/GjhnUsBtw)에서 인사를 건네 주세요.

## License

이 코드는 [MIT 라이선스](../../LICENSE)로 배포됩니다 — 포크하고, 리믹스하고, 당신만의 세계를 호스팅하세요.

함께 묶인 서드파티 아트 에셋(모델, 텍스처, HDRI)은 각자의 라이선스 하에 남아 있습니다 — MIT 라이선스의 물 노멀 맵을 제외하면 모두 CC0 퍼블릭 도메인이며, [CREDITS.md](../../CREDITS.md)에 팩별로 문서화되어 있습니다.
