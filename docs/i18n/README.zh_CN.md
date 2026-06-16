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

[English](../../README.md) · [Español](README.es.md) · [Español (España)](README.es_ES.md) · [Français](README.fr_FR.md) · [Français (Canada)](README.fr_CA.md) · [Italiano](README.it_IT.md) · [Deutsch](README.de_DE.md) · **简体中文** · [繁體中文](README.zh_TW.md) · [한국어](README.ko_KR.md) · [日本語](README.ja_JP.md) · [Português (Brasil)](README.pt_BR.md) · [Русский](README.ru_RU.md)

</div>

# World of ClaudeCraft —— 一款经典风格 MMO

[加入社区 Discord](https://discord.gg/GjhnUsBtw)

![World of ClaudeCraft 标题画面](../../docs/screenshots/title-screen.jpg)

一款带有经典时代 MMO 风味、可以自行托管并游玩的微型 MMO：

1. **在线游玩** —— 一个真正的客户端/服务器游戏，拥有账号、持久化保存在 Postgres 中的
   角色，以及与你同处一个世界的其他玩家。
2. 在浏览器中**离线游玩**，直接进入游戏世界。

两者都运行**同一套确定性模拟核心**（`src/sim/`），因此离线世界的行为与权威多人
服务器为所有在线玩家运行的世界完全一致。

## Screenshots

![一支小队聚集在 Eastbrook 的药剂师店外](../../docs/screenshots/party-questing.jpg)

| | |
|:---:|:---:|
| ![Eastbrook 营火旁的黄昏](../../docs/screenshots/eastbrook-dusk.jpg)<br>*Eastbrook 营火旁的黄昏* | ![Hollow Crypt 中的精英拉怪](../../docs/screenshots/hollow-crypt.jpg)<br>*Hollow Crypt 中火把映照下的精英拉怪* |
| ![废弃教堂处不安的亡者](../../docs/screenshots/restless-dead.jpg)<br>*废弃教堂处不安的亡者* | ![与 Vale Bandits 的混战](../../docs/screenshots/vale-bandits.jpg)<br>*在强盗营地以寡敌众* |
| ![Old Greyjaw 在北方道路上被追杀](../../docs/screenshots/old-greyjaw.jpg)<br>*稀有刷新怪 Old Greyjaw 在北方道路上被追猎* | ![商人与背包界面](../../docs/screenshots/vendor-and-bags.jpg)<br>*在 Smith Haldren 处置装 —— 工具提示、背包、钱币* |

![World of Claude](../../worldofclaude.png)

![World of ClaudeCraft 社区](../../woc_community.png)

---

## Host it（一条命令）

```bash
cp .env.example .env
# 编辑 .env，设置一个又长又随机的 POSTGRES_PASSWORD
docker compose up -d --build     # postgres + 游戏服务器，完整构建
# 打开 http://localhost:8787 —— 账号、角色，以及整个世界
```

如需**远程托管**：把 compose 栈部署到任意 VPS，在环境变量中设置一个真实的
`POSTGRES_PASSWORD`，并用一个 TLS 反向代理来对外暴露 8787 端口（用 Caddy 只需
两行 —— `your.domain { reverse_proxy localhost:8787 }`）；WebSocket 会被自动代理，
客户端在 https 页面上会自动选择 `wss://`。认证端点按 IP 进行限流；密码使用
scrypt 哈希；令牌在 7 天后过期。切勿在生产环境中设置 `ALLOW_DEV_COMMANDS=1`
（它会启用测试机器人所用的升级/传送作弊）。

## Develop online（热重载）

```bash
npm install
cp .env.example .env
# 编辑 .env，将 POSTGRES_PASSWORD 和 DATABASE_URL 设为同一个密码
npm run db:up        # docker 中的 postgres 16（端口 5433，数据卷持久化）
npm run server       # :8787 上的权威游戏服务器（REST + WebSocket）
npm run dev          # :5173 上的客户端开发服务器（代理 /api 和 /ws）
```

打开 http://localhost:5173 → **Play Online** → 创建账号 → 创建角色 → Enter World。
再打开一个浏览器/标签页并再次登录 —— 你们会在镇上看到彼此。`Enter` 打开聊天。

- **账号**：scrypt 哈希的密码，7 天有效的 bearer 令牌（`auth_tokens`）。
- **角色**：每个账号最多 10 个；等级/装备/背包/任务/位置/金钱以 JSONB 形式
  持久化保存在 Postgres 中 —— 每 30 秒、登出时以及服务器关闭时各保存一次。
  名字全局唯一、仅限字母、经典风格。
- **服务器是权威的**：客户端以 20 Hz 流式发送移动意图 + 命令；服务器运行整个
  世界（一个共享的 `Sim`），并发送按兴趣范围裁剪的快照（~120 yd）以及按玩家
  路由的事件。所有战斗运算、掉落掷骰、任务进度计入和商人交易都在服务器端进行；
  客户端只是一个渲染器。
- **小队**（最多 5 人）：右键点击一名玩家 → *Invite to Party*。小队框架显示在左侧，
  成员共享拾取权，击杀任务进度共享，并按真实的初版组队加成（3/4/5 人对应
  1.166/1.3/1.43）分摊经验。使用 `/p message` 进行小队聊天。小地图上以蓝色光点
  标记成员。
- **交易**：右键点击一名玩家 → *Trade*。双方各自放入物品 + 金钱，双方都必须确认，
  交换是原子的并经服务器校验（任务物品不可交易）。双方走开则取消交易。
- **决斗**：右键点击 → *Challenge to a Duel*。3 秒倒计时，战斗持续到一方血量降到
  1 点 —— 没有人会死亡，胜者会在全区域内公告。跑开 60 码即判负。
- **The Ashen Coliseum**（1v1 排位竞技场）：按 `G`（或点击 ⚔ 按钮）打开竞技场面板
  并点击 *Enter the Queue*。匹配系统会把你与在线的、评分最接近的对手配对，然后
  将你们二人传送进一座私有的、火把照明的决斗场。5 秒倒计时会治疗并重置双方
  战斗者以确保公平起手；当一方血量降到 1 点（没有人会死亡）时本场结束。胜负会
  改变一个持久化的 **Elo rating**（所有人从 1500 起步），结束后你会回到当初排队的
  确切位置。面板会显示你的排名、实时在线天梯，以及历史总排行榜
  （`GET /api/arena/leaderboard`）。
- **多人规则**：经典的拾取权（第一个对怪物造成伤害的玩家拥有其掉落/经验/任务
  进度 —— 其他人会收到“You don't have permission to loot that.”），当受害者死亡时
  怪物会重新锁定下一个攻击者（不会白白重置），加入/离开公告，`/say` 风格的聊天。

## The Hollow Crypt —— 5 人精英副本

Brother Aldric 的剧情线在 *The Restless Dead* 之后继续：**Whispers Below**
（在废弃教堂找到 Gravecaller 的印记）→ **The Binding Rite**（从 kobold 挖掘点收集
Blessed Tallow，从不安的亡者身上收集 Ghostly Essence）→ **Into the Hollow**
（*建议玩家数：5*）—— 在教堂下方地穴的最深处击杀 Morthen the Gravecaller。

- Fallen Chapel 处的地穴门会把你的**小队传送进它专属的私有副本拷贝**（6 个名额；
  空置 5 分钟后副本重置）。
- 副本内部：火把照明的厅堂、成对的**精英**杂兵群（初版精英缩放：~2.3× 生命、
  ~1.5× 伤害、双倍经验）、小 Boss Sexton Marrow，以及 Morthen —— 一个 10 级精英
  Boss，每 10 秒释放一次 **Shadow Pulse** 范围伤害。在副本重置前，地下城杂兵不会
  重新刷新。
- 奖励：按职业原型分发的稀有（蓝色）武器、1 金、1500 经验。
- 它确实是为 5 人精心调校的：我们的自动化 5 机器人团队（warrior、paladin、priest、
  mage、hunter，配备集火 + 治疗 AI）大约 5 分钟、约 10 次死亡即可通关
  （`node scripts/crypt_raid.mjs`，需要 ALLOW_DEV_COMMANDS=1）。

```
docker compose ps          # eastbrook-db（postgres:16-alpine，健康检查）
node scripts/mp_integration.mjs   # 26 项检查的 API/WS/持久化测试套件
node scripts/mp_browser.mjs       # 两个真实浏览器客户端看到彼此
```

## The Sunken Bastion 与 Gravewyrm Sanctum

阴谋并未随着 Morthen 而终结。**The Sunken Bastion**（5 人，~13 级，Mirefen 东南部）
盘踞着 Vael the Mistcaller —— 他会在生命值 60% 和 30% 时召唤成波的 Drowned Thralls。
终章是 **Gravewyrm Sanctum**（5 人，20 级，Thornpeak 下方）：三间满是精英 boneguard
和 drakonid 的密室，Korgath the Bound（低于 30% 时进入狂暴）、Grand Necromancer
Velkhar（更多增援波次），以及 **Korzul the Gravewyrm** —— 史诗武器在此掉落，而且
铺垫的任务链可以单人完成，因此没有人会被挡在故事之外。



## Play offline

```bash
npm run dev        # 打开 http://localhost:5173 -> Play Offline
```

为你的角色取名，从九个职业中任选其一，你就来到了 **Eastbrook Vale**（1-7 级）：
一座被六个据点环绕的集市镇 —— 北面是狼群活动区，东面是野猪草甸，西面是 the
Webwood，西北是 Mirror Lake，西南是一处 kobold 铜矿挖掘点，东北是一座聚集着不安
亡者的废弃教堂，东南则是 Gorrak 的强盗营地。向北的道路穿过一处山口爬升进入
**Mirefen Marsh**（6-13，据点：Fenbridge），再往上抵达 **Thornpeak Heights**
（13-20，据点：Highwatch）—— 三个区域、约 60 个任务，以及一条贯穿始终的剧情线：
Gravecaller 的阴谋，从 Eastbrook 外第一具不安的尸骨，一直到群峰之下的 **Korzul the
Gravewyrm**。每个据点都有商人（包括出售货真价实白色装备的武器匠与护甲匠）、一座
墓地、各自的音乐，以及一张区域地图。

### Controls（经典布局）

| 输入 | 操作 |
|---|---|
| `W`/`S` | 前进 / 后退 —— `A`/`D` 转向（按住鼠标右键时为横移），`Q`/`E` 横移 |
| 右键拖动 / 左键拖动 | 鼠标视角 / 环绕镜头 &nbsp;·&nbsp; 滚轮缩放 · `Space` 跳跃 |
| `Tab` | 循环切换最近的敌人 · 左键点击选取目标 · 右键攻击/拾取/对话 |
| `1`–`9`、`0`、`-`、`=` | 动作栏 |
| `F` | 交互（拾取尸体 / 拾起物品 / 对话） |
| `C` `P` `L` `M` `B` `G` | 角色 · 法术书 · 任务日志 · 世界地图 · 背包 · 竞技场（Ashen Coliseum） |
| `V` / `R` / `Esc` | 姓名板 · 自动奔跑 · 关闭窗口 / 取消目标 |

### Classic-fidelity 检查清单

**公式（真正的初版公式）**
- 怒气换算 `c = 0.0091L² + 3.23L + 4.27`；造成伤害时获得 `7.5·d/c`，受到伤害时获得 `2.5·d/c`
- 带 +3 级断崖的法术命中表（96/95/94/83%）；近战未命中/躲闪随等级变化
- 护甲减伤 `armor/(armor + 85·AttackerLevel + 400)`
- 生命/法力属性规则：前 20 点耐力 → 每点 1 生命，其余 → 每点 10；前 20 点智力 → 每点 1 法力，其余 → 每点 15
- 经验曲线 400/900/1400/…… 直到 20 级；怪物经验 `45 + 5·L`，并带有真实的零差异灰色波段
- 1.5 秒公共冷却（rogue 为 1.0 秒）、武器挥击计时器、5 秒法力规则

**全部九个初版职业（习得等级与等级数值取自初版，1–20 级 —— 法术随你升级而提升
等级：Lightning Bolt 在 8 级得 R2、14 级 R3、20 级 R4，外加 Execute、Kidney Shot、
Flash Heal、Stormstrike、Starfire 等新的高段位技能）**
- *Warrior*：怒气，Heroic Strike（下一次挥击触发，不占 GCD）、Battle Shout、
  Charge、Rend、Thunder Clap、Hamstring、Bloodrage、Overpower（躲闪触发）
- *Paladin*：Seal of Righteousness（武器附魔），由 **Judgement** 释放，
  Holy Light、Devotion Aura、Blessing of Might、Divine Protection（吸收）、
  Hammer of Justice（昏迷）、Lay on Hands
- *Hunter*：**远程 Auto Shot**（8–35 yd，带经典死区）、
  Raptor Strike、Aspect of the Hawk、Serpent Sting、Arcane Shot、Concussive
  Shot、Mongoose Bite（躲闪触发）、Wing Clip
- *Rogue*：能量 + **combo points**，Sinister Strike、Eviscerate、Backstab
  （背后 + 匕首）、Gouge、Evasion、Slice and Dice、Sprint
- *Priest*：Smite、Lesser Heal、Power Word: Fortitude、Shadow Word: Pain、
  **Power Word: Shield**（吸收）、**Renew**（持续治疗）、Mind Blast
- *Shaman*：Lightning Bolt、**Rockbiter Weapon**（附魔）、Healing Wave、
  Earth Shock、**Lightning Shield**（反伤）、Flame Shock
- *Mage*：Fireball、Frost Armor、Arcane Intellect、Frostbolt、Conjure Water、
  Fire Blast、Arcane Missiles（引导）、**Polymorph**、Frost Nova
- *Warlock*：Shadow Bolt、Demon Skin、Immolate、Corruption、**Life Tap**、
  Curse of Agony、**Drain Life**（引导式生命偷取）
- *Druid*：Wrath、Healing Touch、Mark of the Wild、Moonfire、Rejuvenation、
  Thorns、Entangling Roots、**Bear Form**（10 级解锁的切换变形）
- 治疗可以指定小队成员（点击一个小队框架，然后施放治疗）；增益可以施放在友方
  玩家身上；治疗可以暴击；吸收护盾会在生命值之前承受伤害。

**世界与系统**
- 进食/饮水：坐下，在 18 秒内逐步恢复，受到伤害或站起来会中断 —— 而且没错，
  你可以同时进食和饮水
- 商人：购买食物/饮水，出售你的灰色物品；钱币以 金/银/铜 显示
- 带闪光的地面任务物品（把强盗的补给箱偷回来）
- 怪物 AI：游荡、按等级差的近距离仇恨、社交拉怪（murloc 会从更远处拉怪 —— 带上
  朋友）、追击、栓绳-脱战-重置、尸体拾取、刷新；以及一个长计时器的稀有刷新怪
  （Old Greyjaw）
- 死亡 → 释放灵魂 → 墓地；坠落伤害；游泳会减速
- 带放弃功能的任务日志，带问候语的闲聊对话，按职业划分的奖励

**呈现**
- 一切皆程序化生成：木桁架房屋、木瓦屋顶、教堂、集市摊位、帐篷、带闪烁灯光的
  营火、矿洞传送门、断裂的廊柱、钓鱼码头、murloc 泥屋、绘入地形的道路、草丛、
  松树 + 橡树、带动画水面的湖泊、飘动的云朵、实时阴影
- 十二个绑定骨骼的生物族类（wolf/boar/spider/murloc/kobold/skeleton/humanoid/
  troll/ogre/elemental/dragonkin/sheep），配有行走/攻击/施法/坐下/死亡动画
- 为每个法术、物品和增益绘制的程序化图标 —— 在运行时绘制于画布上，没有任何
  素材文件
- 经典 UI：头像单位框架、带持续时间的增益/减益条、带冷却扫描 + 射程/资源着色的
  动作栏、施法/引导条、法术书、角色纸娃娃、任务日志、世界地图、商人 + 拾取窗口、
  金边工具提示、浮动战斗文字、战斗日志、分段经验条、带光点的小地图以及一张完整的
  区域地图
- 程序化 WebAudio 音效：近战/法术命中、升级号角、任务铃声、钱币叮当声、死亡音效 ——
  没有任何音频文件

## Development

```bash
npm test                        # vitest 套件：公式、战斗、AI、任务、全部 9 个职业、
                                #   小队、决斗、交易、精英、地穴
npm run build                   # 生产环境 web 构建
node scripts/smoke_browser.mjs  # warrior E2E（需要 `npm run dev` 正在运行）
node scripts/smoke_mage.mjs     # mage：施法、polymorph、conjure+饮水、死亡/释放
node scripts/smoke_rogue.mjs    # rogue：combo points、eviscerate、商人、进食
node scripts/visual_tour.mjs    # 区域 + UI 的截图巡览，输出到 tmp/
node scripts/mp_integration.mjs # 26 项检查的 API/WS/持久化测试套件（服务器运行中）
node scripts/social_e2e.mjs     # 通过网络进行交易 + 决斗（ALLOW_DEV_COMMANDS=1）
node scripts/arena_visual.mjs   # 两个客户端排队并在 Ashen Coliseum 进行一场排位 1v1
node scripts/crypt_raid.mjs     # 五个机器人通关 Hollow Crypt（ALLOW_DEV_COMMANDS=1）
```

浏览器代理可以通过 `window.__game.controller` 来驱动移动，而无需模拟按住的按键。
使用 `controller.move({ forward: true }, facingRadians)` 或紧凑的 websocket 标志，
例如 `{ f: 1, sr: 1 }`；调用 `controller.face(facingRadians)` 可以更新朝向而不改变
移动，调用 `controller.stop()` 可以回到真实的键盘输入。在线游玩时会向服务器发送
同样的输入帧，而服务器只接受布尔值/`1` 的移动标志以及有限的朝向值。

布局：

```
src/sim/      确定性 N 人游戏核心（无 DOM 导入）—— 由所有目标共享
src/render/   Three.js 渲染器：models.ts（骨架）、props.ts、textures.ts（程序化）
src/game/     输入 + 镜头 + WebAudio 合成
src/ui/       经典 HUD：框架、窗口、工具提示、地图、FCT
src/net/      在线客户端：REST 认证 + WebSocket 世界镜像（ClientWorld）
src/world_api.ts  Sim 和 ClientWorld 都满足的 IWorld 接口
server/       游戏服务器：main.ts（HTTP+WS）、game.ts（世界循环）、db.ts、auth.ts
docker-compose.yml  postgres:16-alpine
tests/        vitest 套件
scripts/      浏览器 E2E + 截图巡览 + 多人集成测试
```

名字、任务和各个区域都是原创的；公式与机制则遵循初版。世界种子在 `src/main.ts`
中被固定，因此每次造访时世界都是同一个地方。

## 参与贡献

我们欢迎各种形式的贡献：代码、翻译、bug 报告以及文档。请先阅读
[CONTRIBUTING.zh_CN.md](CONTRIBUTING.zh_CN.md) 了解环境搭建与相关指南，并请遵守我们的
[行为准则](../../CODE_OF_CONDUCT.md)。初来乍到？不妨找一找标有
[`good first issue`](https://github.com/levy-street/world-of-claudecraft/labels/good%20first%20issue)
标签的 issue，提交一个 [issue](https://github.com/levy-street/world-of-claudecraft/issues/new/choose)，
或者来 [Discord](https://discord.gg/GjhnUsBtw) 上打个招呼。

## License

代码采用 [MIT 许可证](../../LICENSE) —— 尽管 fork 它、混搭它、托管你自己的世界。

随附的第三方美术素材（模型、纹理、HDRI）仍受其各自许可证约束 —— 除 MIT 授权的
水面法线贴图外，其余全部为 CC0 公有领域，详见 [CREDITS.md](../../CREDITS.md) 中按素材包
逐一记录的说明。
