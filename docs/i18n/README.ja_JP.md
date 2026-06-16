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

[English](../../README.md) · [Español](README.es.md) · [Español (España)](README.es_ES.md) · [Français](README.fr_FR.md) · [Français (Canada)](README.fr_CA.md) · [Italiano](README.it_IT.md) · [Deutsch](README.de_DE.md) · [简体中文](README.zh_CN.md) · [繁體中文](README.zh_TW.md) · [한국어](README.ko_KR.md) · **日本語** · [Português (Brasil)](README.pt_BR.md) · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft — クラシックスタイルのMMO

[コミュニティ Discord に参加する](https://discord.gg/GjhnUsBtw)

![World of ClaudeCraft タイトル画面](../../docs/screenshots/title-screen.jpg)

ホストしてプレイできる、クラシック時代のMMOの雰囲気を持つマイクロMMOです。

1. **オンラインでプレイ** — アカウント、Postgres に永続化されるキャラクター、そしてあなたと同じ世界にいる他のプレイヤーを備えた、本物のクライアント／サーバー型ゲーム。
2. ブラウザで**オフラインでプレイ**して、すぐに世界へ飛び込めます。

どちらも**同じ決定論的なシミュレーションコア**（`src/sim/`）で動作するため、オフラインの世界は、権威あるマルチプレイヤーサーバーがオンラインの全員に対して実行するものとまったく同じ挙動になります。

## Screenshots

![Eastbrook の薬屋の外に集まるパーティ](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Eastbrook のキャンプファイアの夕暮れ](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Eastbrook のキャンプファイアの夕暮れ* | ![Hollow Crypt でのエリート敵の引き寄せ](../../docs/screenshots/hollow-crypt.jpg)<br>*Hollow Crypt で松明に照らされたエリート敵の引き寄せ* |
| ![廃墟の礼拝堂にいる不浄な死者たち](../../docs/screenshots/restless-dead.jpg)<br>*廃墟の礼拝堂にいる不浄な死者たち* | ![Vale Bandits との乱戦](../../docs/screenshots/vale-bandits.jpg)<br>*盗賊の野営地で数で圧倒される* |
| ![北の道で討ち取られる Old Greyjaw](../../docs/screenshots/old-greyjaw.jpg)<br>*レアスポーンの Old Greyjaw を北の道で討ち取る* | ![ベンダーとバッグの UI](../../docs/screenshots/vendor-and-bags.jpg)<br>*Smith Haldren の店で装備を整える — ツールチップ、バッグ、コイン* |

![World of Claude](../../worldofclaude.png)

![World of ClaudeCraft コミュニティ](../../woc_community.png)

---

## Host it (one command)

```bash
cp .env.example .env
# .env を編集し、長いランダムな POSTGRES_PASSWORD を設定する
docker compose up -d --build     # postgres + ゲームサーバー、完全にビルド済み
# http://localhost:8787 を開く — アカウント、キャラクター、世界のすべて
```

**リモートホスティング**の場合：compose スタックを任意の VPS に置き、環境に本物の `POSTGRES_PASSWORD` を設定し、ポート 8787 を TLS リバースプロキシの前面に置きます（Caddy なら 2 行で済みます — `your.domain { reverse_proxy localhost:8787 }`）。WebSocket は自動的にプロキシされ、クライアントは https ページでは `wss://` を自動選択します。認証エンドポイントは IP ごとにレート制限され、パスワードは scrypt でハッシュ化され、トークンは 7 日後に失効します。本番環境では決して `ALLOW_DEV_COMMANDS=1` を設定しないでください（テストボットが使うレベル上げ／テレポートのチートが有効になります）。

## Develop online (hot reload)

```bash
npm install
cp .env.example .env
# .env を編集し、POSTGRES_PASSWORD と DATABASE_URL に同じパスワードを設定する
npm run db:up        # docker 上の postgres 16（ポート 5433、ボリュームで永続化）
npm run server       # :8787 上の権威あるゲームサーバー（REST + WebSocket）
npm run dev          # :5173 上のクライアント開発サーバー（/api と /ws をプロキシ）
```

http://localhost:5173 を開く → **Play Online** → アカウントを作成 → キャラクターを作成 → Enter World。2 つ目のブラウザ／タブを開いて再度ログインすると、町でお互いの姿が見えます。`Enter` でチャットが開きます。

- **アカウント**：scrypt でハッシュ化されたパスワード、7 日間有効なベアラートークン（`auth_tokens`）。
- **キャラクター**：1 アカウントにつき最大 10 体。レベル／装備／バッグ／クエスト／位置／所持金は Postgres に JSONB として永続化され、30 秒ごと、ログアウト時、サーバーシャットダウン時に保存されます。名前はグローバルに一意で、文字のみ、クラシックスタイルです。
- **サーバーは権威を持ちます**：クライアントは移動の意図 + コマンドを 20 Hz でストリーミングし、サーバーは世界（共有された 1 つの `Sim`）を実行して、関心範囲に絞ったスナップショット（~120 yd）とプレイヤーごとにルーティングされたイベントを送信します。すべての戦闘計算、ルートのロール、クエストの進行判定、ベンダー取引はサーバー側で行われ、クライアントはレンダラーに徹します。
- **パーティ**（最大 5 人）：プレイヤーを右クリック → *Invite to Party*。パーティフレームは左側に表示され、メンバーはタップ権を共有し、討伐クエストの進行を分け合い、本物のバニラのグループボーナス（3／4／5 人で 1.166/1.3/1.43）で XP を分配します。パーティチャットは `/p message`。ミニマップ上のメンバーは青いブリップで表示されます。
- **トレード**：プレイヤーを右クリック → *Trade*。両者がアイテム + 所持金をステージングし、両者が承諾する必要があり、交換はアトミックかつサーバーで検証されます（クエストアイテムは取引不可）。離れて歩くとキャンセルされます。
- **決闘**：右クリック → *Challenge to a Duel*。3 秒のカウントダウン後、一方が 1 hp になるまで戦います — 誰も死なず、勝者はゾーン全体に告知されます。60 ヤード離れて逃げると不戦敗になります。
- **The Ashen Coliseum**（1v1 ランク戦アリーナ）：`G`（または ⚔ ボタン）を押してアリーナパネルを開き、*Enter the Queue*。マッチメイキングはオンライン中で最もレーティングが近い挑戦者とあなたを組ませ、両者をプライベートで松明に照らされた闘技場へテレポートさせます。5 秒のカウントダウンで両ファイターを回復・リセットし、公平なスタートを切らせます。試合は一方が 1 hp で降参すると終了します（誰も死にません）。勝敗は永続的な **Elo レーティング**を動かし（全員 1500 から開始）、キューに入った場所に正確に戻ります。パネルにはあなたの順位、リアルタイムのオンラインラダー、そして歴代リーダーボード（`GET /api/arena/leaderboard`）が表示されます。
- **マルチプレイヤーのルール**：クラシックなタップ権（最初にモブにダメージを与えたプレイヤーがそのルート／XP／クエスト進行を所有 — 他のプレイヤーには「You don't have permission to loot that.」と表示）、モブは犠牲者が死ぬと次の攻撃者にリターゲットし（無料のリセットなし）、参加／退出の告知、`/say` スタイルのチャット。

## The Hollow Crypt — 5-player elite instance

Brother Aldric のストーリーラインは *The Restless Dead* の先へと続きます：**Whispers Below**（廃墟の礼拝堂で Gravecaller の紋章を見つける）→ **The Binding Rite**（コボルトの採掘場から Blessed Tallow を、不浄な死者から Ghostly Essence を集める）→ **Into the Hollow**（*推奨プレイヤー数：5*）— 礼拝堂の地下にある地下墓地の最深部で Morthen the Gravecaller を倒します。

- Fallen Chapel にある地下墓地の扉は、**あなたのパーティを専用のプライベートインスタンスのコピー**へとテレポートさせます（6 スロット。インスタンスは空になってから 5 分後にリセットされます）。
- 内部：松明に照らされた回廊、ペアになった**エリート**雑魚の群れ（バニラのエリートスケーリング：体力 ~2.3 倍、ダメージ ~1.5 倍、XP 2 倍）、ミニボスの Sexton Marrow、そして 10 秒ごとに **Shadow Pulse** の AoE を使うレベル 10 のエリートボス Morthen。ダンジョンの雑魚はインスタンスがリセットされるまでリスポーンしません。
- 報酬：クラスのアーキタイプごとのレア（青）武器、1 ゴールド、1500 XP。
- これは本当に 5 人向けに調整されています：私たちの自動 5 ボットレイド（warrior、paladin、priest、mage、hunter が集中砲火 + ヒーラー AI で）は、~10 回の死亡を伴って ~5 分でクリアします（`node scripts/crypt_raid.mjs`、ALLOW_DEV_COMMANDS=1 が必要）。

```
docker compose ps          # eastbrook-db（postgres:16-alpine、ヘルスチェック）
node scripts/mp_integration.mjs   # 26 項目の API/WS/永続化テストスイート
node scripts/mp_browser.mjs       # 2 つの本物のブラウザクライアントがお互いを見る
```

## The Sunken Bastion & Gravewyrm Sanctum

陰謀は Morthen で終わりません。**The Sunken Bastion**（5 人用、~レベル 13、Mirefen 南東）には Vael the Mistcaller がいて、体力 60% と 30% で Drowned Thralls の波を召喚します。フィナーレは **Gravewyrm Sanctum**（5 人用、レベル 20、Thornpeak の地下）：エリートの骨兵とドラコニッドが詰まった 3 つの間、Korgath the Bound（体力 30% 未満で激昂）、Grand Necromancer Velkhar（さらなる雑魚の波）、そして **Korzul the Gravewyrm** — ここではエピック武器がドロップし、前段のクエストチェーンはソロで進められるため、誰もストーリーから締め出されることはありません。



## Play offline

```bash
npm run dev        # http://localhost:5173 を開く -> Play Offline
```

キャラクターに名前を付け、9 つのクラスのいずれかを選ぶと、**Eastbrook Vale**（レベル 1～7）に入ります：6 つの拠点に囲まれた市場町で、北にはオオカミの生息地、東にはイノシシの草原、西には the Webwood、北西には Mirror Lake、南西にはコボルトの銅採掘場、北東には不浄な死者がいる廃墟の礼拝堂、南東には Gorrak の盗賊の野営地があります。北の道は山道を抜けて **Mirefen Marsh**（6～13、拠点：Fenbridge）へ登り、さらに **Thornpeak Heights**（13～20、拠点：Highwatch）へと続きます — 3 つのゾーン、~60 のクエスト、そして 1 つのストーリーライン：Gravecaller の陰謀が、Eastbrook の外にいる最初の不浄な骨から、峰々の地下にいる **Korzul the Gravewyrm** まで展開します。各拠点にはベンダー（誠実な白い装備を売る武器・防具の鍛冶屋を含む）、墓地、独自の音楽、そしてゾーンマップがあります。

### Controls (classic layout)

| Input | Action |
|---|---|
| `W`/`S` | 前進／後退 — `A`/`D` で旋回（右マウスボタンを押している間はストレイフ）、`Q`/`E` でストレイフ |
| right-drag / left-drag | マウスルック／カメラのオービット &nbsp;·&nbsp; ホイールでズーム · `Space` でジャンプ |
| `Tab` | 最も近い敵を順に選択 · 左クリックでターゲット · 右クリックで攻撃／ルート／会話 |
| `1`–`9`, `0`, `-`, `=` | アクションバー |
| `F` | インタラクト（死体をルート／オブジェクトを拾う／会話） |
| `C` `P` `L` `M` `B` `G` | キャラクター · 呪文書 · クエストログ · ワールドマップ · バッグ · アリーナ（Ashen Coliseum） |
| `V` / `R` / `Esc` | ネームプレート · オートラン · ウィンドウを閉じる／ターゲットを解除 |

### Classic-fidelity checklist

**Formulas（本物のバニラの数式）**
- レイジ変換 `c = 0.0091L² + 3.23L + 4.27`；獲得は与ダメージで `7.5·d/c`、被ダメージで `2.5·d/c`
- +3 レベルの崖（96/95/94/83%）を持つ呪文ヒット表；レベルに応じた近接ミス／回避
- アーマー DR `armor/(armor + 85·AttackerLevel + 400)`
- HP/マナのステータスルール：最初の 20 スタミナ → 各 1 hp、残り → 10；最初の 20 int → 各 1 マナ、残り → 15
- XP カーブはレベル 20 まで 400/900/1400/…；モブ XP は `45 + 5·L`、本物のゼロ差グレーバンド付き
- 1.5 秒の GCD（rogue は 1.0 秒）、武器の振り直しタイマー、5 秒マナルール

**9 つのバニラクラスすべて（習得レベルとランク値はバニラ準拠、1～20 — 呪文はレベルアップに伴いランクを獲得：Lightning Bolt R2 はレベル 8、R3 は 14、R4 は 20、加えて Execute、Kidney Shot、Flash Heal、Stormstrike、Starfire などの高レベル帯の新アビリティ）**
- *Warrior*：レイジ、Heroic Strike（次の一振り、GCD 外）、Battle Shout、Charge、Rend、Thunder Clap、Hamstring、Bloodrage、Overpower（回避プロック）
- *Paladin*：**Judgement** で解き放たれる Seal of Righteousness（武器の付与）、Holy Light、Devotion Aura、Blessing of Might、Divine Protection（吸収）、Hammer of Justice（スタン）、Lay on Hands
- *Hunter*：**遠隔 Auto Shot**（クラシックなデッドゾーンを伴う 8～35 yd）、Raptor Strike、Aspect of the Hawk、Serpent Sting、Arcane Shot、Concussive Shot、Mongoose Bite（回避プロック）、Wing Clip
- *Rogue*：エネルギー + **コンボポイント**、Sinister Strike、Eviscerate、Backstab（背後 + ダガー）、Gouge、Evasion、Slice and Dice、Sprint
- *Priest*：Smite、Lesser Heal、Power Word: Fortitude、Shadow Word: Pain、**Power Word: Shield**（吸収）、**Renew**（HoT）、Mind Blast
- *Shaman*：Lightning Bolt、**Rockbiter Weapon**（付与）、Healing Wave、Earth Shock、**Lightning Shield**（ソーン）、Flame Shock
- *Mage*：Fireball、Frost Armor、Arcane Intellect、Frostbolt、Conjure Water、Fire Blast、Arcane Missiles（チャネル）、**Polymorph**、Frost Nova
- *Warlock*：Shadow Bolt、Demon Skin、Immolate、Corruption、**Life Tap**、Curse of Agony、**Drain Life**（チャネルによる体力吸収）
- *Druid*：Wrath、Healing Touch、Mark of the Wild、Moonfire、Rejuvenation、Thorns、Entangling Roots、**Bear Form**（レベル 10 で切り替え可能なシェイプシフト）
- ヒールはパーティメンバーを対象にできます（パーティフレームをクリックしてからヒール）；バフは友好的なプレイヤーにかけられます；ヒールはクリティカルします；吸収シールドは体力の前にダメージを吸収します。

**World & systems**
- 飲食：座って 18 秒かけて回復、ダメージや立ち上がりで中断 — そして、はい、食べながら同時に飲むこともできます
- ベンダー：食料／水の購入、グレー品の売却；所持金表示は g/s/c
- きらめきを伴う地面のクエストオブジェクト（盗賊の補給品の箱を取り返す）
- モブ AI：徘徊、レベル差による近接アグロ、ソーシャルプル（murloc はより遠くから引き寄せる — 仲間を連れて行こう）、追跡、リーシュ・回避・リセット、死体のルート、リスポーン；長いタイマーで出現するレアスポーン（Old Greyjaw）
- 死亡 → 魂を解放 → 墓地；落下ダメージ；水泳は移動を遅くする
- 放棄機能付きのクエストログ、挨拶を伴うゴシップダイアログ、クラスごとの報酬

**Presentation**
- すべてがプロシージャル：木組みの家、こけら葺きの屋根、礼拝堂、市場の露店、テント、揺らめく光のキャンプファイア、鉱山のポータル、崩れた柱、釣り桟橋、murloc の泥小屋、地形に描き込まれた道、草の房、松 + オークの木、アニメーションする水を湛えた湖、流れる雲、リアルタイムの影
- 歩行／攻撃／詠唱／座り／死亡アニメーションを備えた、リグ済みの 12 のクリーチャーファミリー（wolf/boar/spider/murloc/kobold/skeleton/humanoid/troll/ogre/elemental/dragonkin/sheep）
- すべての呪文、アイテム、バフのために描かれたプロシージャルアイコン — 実行時にキャンバス上に描画され、アセットファイルなし
- クラシック UI：ポートレートのユニットフレーム、持続時間付きのバフ／デバフバー、クールダウンスイープ + 射程／リソースの色分けを備えたアクションバー、詠唱／チャネルバー、呪文書、キャラクターのペーパードール、クエストログ、ワールドマップ、ベンダー + ルートウィンドウ、金縁のツールチップ、フローティングコンバットテキスト、戦闘ログ、分割された XP バー、ブリップ付きミニマップとフルゾーンマップ
- プロシージャルな WebAudio サウンド：近接／呪文のヒット、レベルアップのファンファーレ、クエストのチャイム、コインの音、死亡のスティング — オーディオファイルなし

## Development

```bash
npm test                        # vitest スイート：数式、戦闘、AI、クエスト、9 クラスすべて、
                                #   パーティ、決闘、トレード、エリート、クリプト
npm run build                   # 本番用 web ビルド
node scripts/smoke_browser.mjs  # warrior の E2E（`npm run dev` の実行が必要）
node scripts/smoke_mage.mjs     # mage：詠唱、polymorph、conjure+飲む、死亡／解放
node scripts/smoke_rogue.mjs    # rogue：コンボポイント、eviscerate、ベンダー、飲食
node scripts/visual_tour.mjs    # ゾーン + UI のスクリーンショットツアーを tmp/ へ
node scripts/mp_integration.mjs # 26 項目の API/WS/永続化テストスイート（サーバー稼働中）
node scripts/social_e2e.mjs     # ワイヤー越しのトレード + 決闘（ALLOW_DEV_COMMANDS=1）
node scripts/arena_visual.mjs   # 2 つのクライアントがキューに入り、Ashen Coliseum でランク 1v1 を戦う
node scripts/crypt_raid.mjs     # 5 つのボットが Hollow Crypt をクリア（ALLOW_DEV_COMMANDS=1）
```

ブラウザエージェントは、押しっぱなしのキーをシミュレートする代わりに、`window.__game.controller` を通じて移動を駆動できます。`controller.move({ forward: true }, facingRadians)` や `{ f: 1, sr: 1 }` のようなコンパクトな websocket フラグを使います。移動を変えずに向きを更新するには `controller.face(facingRadians)` を、実際のキーボード入力に戻すには `controller.stop()` を呼び出します。オンラインプレイは同じ入力フレームをサーバーに送り、サーバーはブール／`1` の移動フラグと有限の向きの値のみを受け付けます。

Layout:

```
src/sim/      決定論的な N プレイヤーのゲームコア（DOM インポートなし） — すべてのターゲットで共有
src/render/   Three.js レンダラー：models.ts（リグ）、props.ts、textures.ts（プロシージャル）
src/game/     入力 + カメラ + WebAudio シンセ
src/ui/       クラシック HUD：フレーム、ウィンドウ、ツールチップ、マップ、FCT
src/net/      オンラインクライアント：REST 認証 + WebSocket ワールドミラー（ClientWorld）
src/world_api.ts  Sim と ClientWorld の両方が満たす IWorld インターフェース
server/       ゲームサーバー：main.ts（HTTP+WS）、game.ts（ワールドループ）、db.ts、auth.ts
docker-compose.yml  postgres:16-alpine
tests/        vitest スイート
scripts/      ブラウザ E2E + スクリーンショットツアー + マルチプレイヤー統合テスト
```

名前、クエスト、ゾーンはオリジナルです。数式とメカニクスはバニラに準拠しています。ワールドシードは `src/main.ts` で固定されているため、世界は訪れるたびに同じ場所になります。

## 貢献する

あらゆる形の貢献を歓迎します。コード、翻訳、バグ報告、そしてドキュメント、そのどれもが力になります。まずはセットアップとガイドラインをまとめた [CONTRIBUTING.md](CONTRIBUTING.ja_JP.md) から始めて、[行動規範](../../CODE_OF_CONDUCT.md)に従ってください。初めての方は、[`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue) のラベルが付いた issue を探すか、[issue](https://github.com/levy-street/world-of-claudecraft/issues/new/choose) を立てるか、[Discord](https://discord.gg/GjhnUsBtw) で気軽に挨拶してください。

## License

コードは [MIT ライセンス](../../LICENSE) です — フォークし、リミックスし、自分の世界をホストしてください。

同梱されているサードパーティのアートアセット（モデル、テクスチャ、HDRI）は、それぞれ独自のライセンスの下にあります — MIT の water normal map を除き、すべて CC0 パブリックドメインで、[CREDITS.md](../../CREDITS.md) にパックごとに記載されています。
