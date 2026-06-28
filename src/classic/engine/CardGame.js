// CardGame.js — Standalone collectible card battle game extracted from Cryptic Realm
// Deck building, AI opponents, tournaments, progression

const CARD_TYPES = ["creature", "spell", "trap"];
const ELEMENTS = ["fire", "water", "earth", "shadow", "light"];
const ELEMENT_COLORS = { fire: "#ff4422", water: "#4488ff", earth: "#88aa44", shadow: "#8844aa", light: "#ffdd44" };

const ALL_CARDS = [
  // Fire creatures
  { id: 1, name: "Fire Imp", type: "creature", element: "fire", atk: 3, def: 2, cost: 2, rarity: "common" },
  { id: 2, name: "Flame Drake", type: "creature", element: "fire", atk: 5, def: 3, cost: 4, rarity: "uncommon" },
  { id: 3, name: "Inferno Dragon", type: "creature", element: "fire", atk: 8, def: 6, cost: 7, rarity: "rare" },
  // Water creatures
  { id: 4, name: "Tide Sprite", type: "creature", element: "water", atk: 2, def: 4, cost: 2, rarity: "common" },
  { id: 5, name: "Storm Kraken", type: "creature", element: "water", atk: 6, def: 5, cost: 5, rarity: "uncommon" },
  { id: 6, name: "Leviathan", type: "creature", element: "water", atk: 9, def: 7, cost: 8, rarity: "rare" },
  // Earth creatures
  { id: 7, name: "Stone Golem", type: "creature", element: "earth", atk: 2, def: 6, cost: 3, rarity: "common" },
  { id: 8, name: "Earth Titan", type: "creature", element: "earth", atk: 5, def: 8, cost: 6, rarity: "uncommon" },
  { id: 9, name: "World Serpent", type: "creature", element: "earth", atk: 7, def: 10, cost: 9, rarity: "rare" },
  // Shadow creatures
  { id: 10, name: "Shadow Wisp", type: "creature", element: "shadow", atk: 4, def: 1, cost: 2, rarity: "common" },
  { id: 11, name: "Phantom Knight", type: "creature", element: "shadow", atk: 6, def: 4, cost: 5, rarity: "uncommon" },
  { id: 12, name: "Void Reaper", type: "creature", element: "shadow", atk: 10, def: 5, cost: 8, rarity: "rare" },
  // Light creatures
  { id: 13, name: "Light Wisp", type: "creature", element: "light", atk: 2, def: 3, cost: 2, rarity: "common" },
  { id: 14, name: "Radiant Angel", type: "creature", element: "light", atk: 5, def: 6, cost: 5, rarity: "uncommon" },
  { id: 15, name: "Seraphim", type: "creature", element: "light", atk: 8, def: 8, cost: 8, rarity: "rare" },
  // Spells
  { id: 16, name: "Fireball", type: "spell", element: "fire", atk: 4, def: 0, cost: 3, rarity: "common", effect: "damage" },
  { id: 17, name: "Tidal Wave", type: "spell", element: "water", atk: 3, def: 0, cost: 4, rarity: "uncommon", effect: "damage_all" },
  { id: 18, name: "Heal", type: "spell", element: "light", atk: 0, def: 5, cost: 3, rarity: "common", effect: "heal" },
  { id: 19, name: "Dark Bolt", type: "spell", element: "shadow", atk: 5, def: 0, cost: 4, rarity: "uncommon", effect: "damage" },
  { id: 20, name: "Earth Shield", type: "spell", element: "earth", atk: 0, def: 6, cost: 3, rarity: "common", effect: "shield" },
  // Traps
  { id: 21, name: "Spike Trap", type: "trap", element: "earth", atk: 3, def: 0, cost: 2, rarity: "common", effect: "counter" },
  { id: 22, name: "Mirror Force", type: "trap", element: "light", atk: 0, def: 0, cost: 4, rarity: "rare", effect: "reflect" },
  { id: 23, name: "Shadow Snare", type: "trap", element: "shadow", atk: 0, def: 0, cost: 3, rarity: "uncommon", effect: "stun" },
];

const AI_OPPONENTS = [
  { name: "Novice Ned", difficulty: 1, gold: 30, icon: "🧑" },
  { name: "Merchant Mira", difficulty: 2, gold: 60, icon: "🧙" },
  { name: "Knight Kael", difficulty: 3, gold: 100, icon: "⚔️" },
  { name: "Archmage Zara", difficulty: 4, gold: 150, icon: "🔮" },
  { name: "Dragon Lord Vex", difficulty: 5, gold: 250, icon: "🐉" },
];

export class CardGame {
  constructor(canvas, quality = "medium") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.W = canvas.width;
    this.H = canvas.height;
    this.quality = quality;
    this.gameOver = false;
    this.score = 0;
    this.frame = 0;

    // State
    this.state = "menu"; // menu, deck, battle, reward, tournament
    this.gold = 200;
    this.wins = 0;
    this.losses = 0;

    // Collection & deck
    this.collection = ALL_CARDS.filter(c => c.rarity === "common").map(c => ({ ...c }));
    this.deck = this.collection.slice(0, 8).map(c => ({ ...c }));

    // Battle state
    this.opponentIdx = 0;
    this.playerHP = 30;
    this.enemyHP = 30;
    this.playerMana = 3;
    this.enemyMana = 3;
    this.maxMana = 3;
    this.turn = 1;
    this.isPlayerTurn = true;
    this.hand = [];
    this.field = []; // player creatures on field
    this.enemyField = [];
    this.enemyHand = [];
    this.drawPile = [];
    this.battleLog = [];
    this.selectedCard = -1;
    this.phase = "draw"; // draw, main, attack, end
    this.animTimer = 0;
    this.animText = "";
    this.shieldBonus = 0;
    this.enemyShield = 0;

    // Tournament
    this.tournament = null;
    this.tournamentWins = 0;
    this.tournamentRound = 0;

    // Particles
    this.particles = [];

    // Input
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false, click: false };
    this._bindInput();
  }

  _bindInput() {
    this._kd = e => { this.keys[e.key.toLowerCase()] = true; };
    this._ku = e => { this.keys[e.key.toLowerCase()] = false; };
    this._mm = e => { const r = this.canvas.getBoundingClientRect(); this.mouse.x = (e.clientX - r.left) * (this.W / r.width); this.mouse.y = (e.clientY - r.top) * (this.H / r.height); };
    this._md = () => { this.mouse.down = true; this.mouse.click = true; };
    this._mu = () => { this.mouse.down = false; };
    window.addEventListener("keydown", this._kd);
    window.addEventListener("keyup", this._ku);
    this.canvas.addEventListener("mousemove", this._mm);
    this.canvas.addEventListener("mousedown", this._md);
    this.canvas.addEventListener("mouseup", this._mu);
  }

  destroy() {
    window.removeEventListener("keydown", this._kd);
    window.removeEventListener("keyup", this._ku);
    this.canvas.removeEventListener("mousemove", this._mm);
    this.canvas.removeEventListener("mousedown", this._md);
    this.canvas.removeEventListener("mouseup", this._mu);
  }

  _shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  _startBattle(oppIdx) {
    this.opponentIdx = oppIdx;
    const opp = AI_OPPONENTS[oppIdx];
    this.state = "battle";
    this.playerHP = 30;
    this.enemyHP = 30 + opp.difficulty * 5;
    this.playerMana = 3;
    this.enemyMana = 3;
    this.maxMana = 3;
    this.turn = 1;
    this.isPlayerTurn = true;
    this.hand = [];
    this.field = [];
    this.enemyField = [];
    this.enemyHand = [];
    this.battleLog = [];
    this.selectedCard = -1;
    this.phase = "draw";
    this.shieldBonus = 0;
    this.enemyShield = 0;
    this.drawPile = this._shuffle(this.deck.map(c => ({ ...c })));
    // Enemy deck
    const enemyPool = ALL_CARDS.filter(c => c.cost <= opp.difficulty + 3);
    const enemyDeck = this._shuffle(enemyPool.map(c => ({ ...c })));
    this.enemyDrawPile = enemyDeck;
    // Draw initial hands
    for (let i = 0; i < 4; i++) { if (this.drawPile.length) this.hand.push(this.drawPile.pop()); if (this.enemyDrawPile.length) this.enemyHand.push(this.enemyDrawPile.pop()); }
    this.battleLog.push(`Battle vs ${opp.name} begins!`);
  }

  _drawCard() {
    if (this.drawPile.length > 0 && this.hand.length < 8) {
      this.hand.push(this.drawPile.pop());
      this.battleLog.push("You draw a card.");
    }
  }

  _playCard(idx) {
    const card = this.hand[idx];
    if (!card || card.cost > this.playerMana) return;
    this.playerMana -= card.cost;
    this.hand.splice(idx, 1);
    this.selectedCard = -1;

    if (card.type === "creature") {
      if (this.field.length < 4) {
        this.field.push({ ...card, currentHP: card.def + this.shieldBonus });
        this.battleLog.push(`Summoned ${card.name} (${card.atk}/${card.def})`);
      }
    } else if (card.type === "spell") {
      if (card.effect === "damage") {
        this.enemyHP -= card.atk;
        this.battleLog.push(`${card.name} deals ${card.atk} damage!`);
        this._spawnParticles(this.W * 0.7, this.H * 0.3, ELEMENT_COLORS[card.element], 10);
      } else if (card.effect === "damage_all") {
        this.enemyField.forEach(c => c.currentHP -= card.atk);
        this.enemyField = this.enemyField.filter(c => c.currentHP > 0);
        this.enemyHP -= Math.floor(card.atk / 2);
        this.battleLog.push(`${card.name} hits all enemies for ${card.atk}!`);
        this._spawnParticles(this.W * 0.7, this.H * 0.4, ELEMENT_COLORS[card.element], 15);
      } else if (card.effect === "heal") {
        this.playerHP = Math.min(30, this.playerHP + card.def);
        this.battleLog.push(`${card.name} heals ${card.def} HP!`);
        this._spawnParticles(this.W * 0.3, this.H * 0.5, "#44ff44", 8);
      } else if (card.effect === "shield") {
        this.shieldBonus += card.def;
        this.battleLog.push(`${card.name} grants +${card.def} shield to summons!`);
      }
    } else if (card.type === "trap") {
      this.field.push({ ...card, currentHP: 1, isTrap: true });
      this.battleLog.push(`Set ${card.name} trap.`);
    }
  }

  _attackWith(fieldIdx) {
    const attacker = this.field[fieldIdx];
    if (!attacker || attacker.hasAttacked || attacker.isTrap) return;
    attacker.hasAttacked = true;

    if (this.enemyField.length > 0) {
      // Attack weakest enemy creature
      const target = this.enemyField.reduce((a, b) => a.currentHP < b.currentHP ? a : b);
      target.currentHP -= attacker.atk;
      attacker.currentHP -= target.atk;
      this.battleLog.push(`${attacker.name} attacks ${target.name}!`);
      this.enemyField = this.enemyField.filter(c => c.currentHP > 0);
      this.field = this.field.filter(c => c.currentHP > 0);
    } else {
      // Direct attack
      const dmg = Math.max(1, attacker.atk - this.enemyShield);
      this.enemyHP -= dmg;
      this.battleLog.push(`${attacker.name} attacks directly for ${dmg}!`);
      this._spawnParticles(this.W * 0.7, this.H * 0.3, "#ff4444", 8);
    }
  }

  _endTurn() {
    this.isPlayerTurn = false;
    this.phase = "enemy";
    this.animTimer = 60;
    this.battleLog.push("--- Enemy Turn ---");
  }

  _enemyTurn() {
    const opp = AI_OPPONENTS[this.opponentIdx];
    this.enemyMana = Math.min(10, this.turn + 2);
    // Enemy draws
    if (this.enemyDrawPile.length > 0 && this.enemyHand.length < 8) this.enemyHand.push(this.enemyDrawPile.pop());

    // Enemy plays cards
    let plays = 0;
    while (plays < 3) {
      const playable = this.enemyHand.filter(c => c.cost <= this.enemyMana);
      if (playable.length === 0) break;
      const card = playable[Math.floor(Math.random() * playable.length)];
      const idx = this.enemyHand.indexOf(card);
      this.enemyHand.splice(idx, 1);
      this.enemyMana -= card.cost;

      if (card.type === "creature" && this.enemyField.length < 4) {
        this.enemyField.push({ ...card, currentHP: card.def + this.enemyShield, hasAttacked: true });
        this.battleLog.push(`Enemy summons ${card.name}!`);
      } else if (card.type === "spell") {
        if (card.effect === "damage") {
          this.playerHP -= card.atk;
          this.battleLog.push(`Enemy casts ${card.name} for ${card.atk} damage!`);
          this._spawnParticles(this.W * 0.3, this.H * 0.5, ELEMENT_COLORS[card.element], 8);
        } else if (card.effect === "heal") {
          this.enemyHP = Math.min(30 + opp.difficulty * 5, this.enemyHP + card.def);
          this.battleLog.push(`Enemy heals ${card.def} HP.`);
        } else if (card.effect === "shield") {
          this.enemyShield += card.def;
          this.battleLog.push(`Enemy gains +${card.def} shield.`);
        } else if (card.effect === "damage_all") {
          this.field.forEach(c => c.currentHP -= card.atk);
          this.field = this.field.filter(c => c.currentHP > 0);
          this.playerHP -= Math.floor(card.atk / 2);
          this.battleLog.push(`Enemy ${card.name} hits all your creatures!`);
        }
      }
      plays++;
    }

    // Enemy attacks with existing creatures
    for (const creature of this.enemyField) {
      if (creature.hasAttacked) continue;
      creature.hasAttacked = true;
      if (this.field.length > 0) {
        // Check traps
        const trap = this.field.find(c => c.isTrap);
        if (trap) {
          if (trap.effect === "counter") { creature.currentHP -= trap.atk; this.battleLog.push(`Trap ${trap.name} counters ${creature.name}!`); }
          else if (trap.effect === "reflect") { this.enemyHP -= creature.atk; this.battleLog.push(`Mirror Force reflects ${creature.name}'s attack!`); }
          else if (trap.effect === "stun") { creature.hasAttacked = true; this.battleLog.push(`${trap.name} stuns ${creature.name}!`); }
          this.field = this.field.filter(c => c !== trap);
        } else {
          const target = this.field[0];
          target.currentHP -= creature.atk;
          creature.currentHP -= target.atk;
          this.battleLog.push(`Enemy ${creature.name} attacks ${target.name}!`);
          this.field = this.field.filter(c => c.currentHP > 0);
        }
      } else {
        const dmg = Math.max(1, creature.atk - this.shieldBonus);
        this.playerHP -= dmg;
        this.battleLog.push(`Enemy ${creature.name} attacks you for ${dmg}!`);
      }
    }
    this.enemyField = this.enemyField.filter(c => c.currentHP > 0);

    // Check traps in player field
    this.field.forEach(c => { if (c.isTrap) c.currentHP = 1; });

    // Next turn
    this.turn++;
    this.maxMana = Math.min(10, this.turn + 2);
    this.playerMana = this.maxMana;
    this.field.forEach(c => c.hasAttacked = false);
    this.isPlayerTurn = true;
    this.phase = "draw";
    this._drawCard();
    this.battleLog.push(`--- Turn ${this.turn} ---`);
  }

  _spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 1, decay: 0.03, size: 2 + Math.random() * 4, color });
    }
  }

  _checkBattleEnd() {
    if (this.enemyHP <= 0) {
      const opp = AI_OPPONENTS[this.opponentIdx];
      this.gold += opp.gold;
      this.wins++;
      this.score += opp.gold + this.turn * 5;
      this.battleLog.push(`Victory! +${opp.gold} gold`);
      // Win a card
      const pool = ALL_CARDS.filter(c => !this.collection.find(x => x.id === c.id));
      if (pool.length > 0) {
        const won = pool[Math.floor(Math.random() * pool.length)];
        this.collection.push({ ...won });
        this.battleLog.push(`Won card: ${won.name}!`);
      }
      if (this.tournament) {
        this.tournamentWins++;
        this.tournamentRound++;
        if (this.tournamentRound >= AI_OPPONENTS.length) {
          this.gold += 500;
          this.score += 500;
          this.battleLog.push("TOURNAMENT CHAMPION! +500 gold!");
          this.tournament = null;
          this.state = "menu";
        } else {
          setTimeout(() => this._startBattle(this.tournamentRound), 2000);
        }
      } else {
        this.animTimer = 120;
        this.animText = "VICTORY!";
        this.state = "reward";
      }
      return true;
    }
    if (this.playerHP <= 0) {
      this.losses++;
      this.battleLog.push("Defeat...");
      if (this.tournament) { this.tournament = null; this.battleLog.push("Tournament over."); }
      this.animTimer = 120;
      this.animText = "DEFEAT";
      this.state = "reward";
      return true;
    }
    return false;
  }

  update() {
    this.frame++;
    this.W = this.canvas.width; this.H = this.canvas.height;
    this.particles = this.particles.filter(p => p.life > 0).map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - p.decay, size: p.size * 0.97 }));

    if (this.animTimer > 0) this.animTimer--;

    if (this.state === "menu") {
      if (this.mouse.click) {
        this.mouse.click = false;
        const cx = this.W / 2;
        // Opponent buttons
        for (let i = 0; i < AI_OPPONENTS.length; i++) {
          const bx = cx - 150, by = 130 + i * 52;
          if (this.mouse.x > bx && this.mouse.x < bx + 300 && this.mouse.y > by && this.mouse.y < by + 44) {
            this._startBattle(i); return;
          }
        }
        // Deck button
        if (this.mouse.x > cx - 80 && this.mouse.x < cx + 80 && this.mouse.y > this.H - 100 && this.mouse.y < this.H - 70) {
          this.state = "deck"; return;
        }
        // Tournament button
        if (this.mouse.x > cx - 80 && this.mouse.x < cx + 80 && this.mouse.y > this.H - 60 && this.mouse.y < this.H - 30) {
          this.tournament = { round: 0 }; this.tournamentWins = 0; this.tournamentRound = 0;
          this._startBattle(0); return;
        }
      }
    }

    if (this.state === "deck") {
      if (this.mouse.click) {
        this.mouse.click = false;
        // Back button
        if (this.mouse.x > 20 && this.mouse.x < 100 && this.mouse.y > 20 && this.mouse.y < 50) { this.state = "menu"; return; }
        // Toggle cards in/out of deck
        for (let i = 0; i < this.collection.length; i++) {
          const col = i % 6;
          const row = Math.floor(i / 6);
          const bx = 30 + col * 140, by = 80 + row * 90;
          if (this.mouse.x > bx && this.mouse.x < bx + 130 && this.mouse.y > by && this.mouse.y < by + 80) {
            const card = this.collection[i];
            const inDeck = this.deck.find(c => c.id === card.id);
            if (inDeck) {
              this.deck = this.deck.filter(c => c.id !== card.id);
            } else if (this.deck.length < 15) {
              this.deck.push({ ...card });
            }
            break;
          }
        }
      }
    }

    if (this.state === "battle" && this.isPlayerTurn) {
      if (this.mouse.click) {
        this.mouse.click = false;
        const W = this.W, H = this.H;
        // Hand cards - play
        const handY = H - 110;
        for (let i = 0; i < this.hand.length; i++) {
          const bx = W / 2 - (this.hand.length * 55) + i * 110;
          if (this.mouse.x > bx && this.mouse.x < bx + 100 && this.mouse.y > handY && this.mouse.y < handY + 100) {
            if (this.selectedCard === i) { this._playCard(i); }
            else { this.selectedCard = i; }
            return;
          }
        }
        // Field creatures - attack
        for (let i = 0; i < this.field.length; i++) {
          const bx = W * 0.2 + i * 100, by = H * 0.5;
          if (this.mouse.x > bx && this.mouse.x < bx + 80 && this.mouse.y > by && this.mouse.y < by + 80) {
            this._attackWith(i); return;
          }
        }
        // End turn button
        if (this.mouse.x > W - 120 && this.mouse.x < W - 20 && this.mouse.y > H - 50 && this.mouse.y < H - 20) {
          this._endTurn(); return;
        }
        this.selectedCard = -1;
      }
    }

    if (this.state === "battle" && !this.isPlayerTurn) {
      if (this.animTimer <= 0) {
        this._enemyTurn();
        this._checkBattleEnd();
      }
    }

    if (this.state === "reward") {
      if (this.mouse.click || (this.animTimer <= 0 && this.mouse.click)) {
        this.mouse.click = false;
        this.state = "menu";
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;

    // Background
    ctx.fillStyle = "#0a0a1a"; ctx.fillRect(0, 0, W, H);

    if (this.state === "menu") {
      ctx.fillStyle = "#cc8844"; ctx.font = "bold 22px monospace"; ctx.textAlign = "center";
      ctx.fillText("⚔️ CARD BATTLE ARENA ⚔️", W / 2, 50);
      ctx.fillStyle = "#888"; ctx.font = "11px monospace";
      ctx.fillText(`Gold: ${this.gold} | Wins: ${this.wins} | Losses: ${this.losses} | Collection: ${this.collection.length}/${ALL_CARDS.length}`, W / 2, 80);
      ctx.fillText("Select Opponent:", W / 2, 115);

      const cx = W / 2;
      AI_OPPONENTS.forEach((opp, i) => {
        const bx = cx - 150, by = 130 + i * 52;
        ctx.fillStyle = "#1a1a2a"; ctx.fillRect(bx, by, 300, 44);
        ctx.strokeStyle = "#446688"; ctx.strokeRect(bx, by, 300, 44);
        ctx.fillStyle = "#fff"; ctx.font = "bold 12px monospace"; ctx.textAlign = "left";
        ctx.fillText(`${opp.icon} ${opp.name}`, bx + 12, by + 18);
        ctx.fillStyle = "#888"; ctx.font = "10px monospace";
        ctx.fillText(`Difficulty: ${"⭐".repeat(opp.difficulty)} | Reward: ${opp.gold}g`, bx + 12, by + 34);
      });

      // Deck button
      ctx.fillStyle = "#2a2a4a"; ctx.fillRect(cx - 80, H - 100, 160, 26);
      ctx.strokeStyle = "#6688aa"; ctx.strokeRect(cx - 80, H - 100, 160, 26);
      ctx.fillStyle = "#aaccff"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
      ctx.fillText(`📚 DECK (${this.deck.length} cards)`, cx, H - 82);

      // Tournament button
      ctx.fillStyle = "#4a2a2a"; ctx.fillRect(cx - 80, H - 60, 160, 26);
      ctx.strokeStyle = "#cc8844"; ctx.strokeRect(cx - 80, H - 60, 160, 26);
      ctx.fillStyle = "#ffaa44"; ctx.font = "bold 11px monospace";
      ctx.fillText("🏆 TOURNAMENT", cx, H - 42);
    }

    if (this.state === "deck") {
      ctx.fillStyle = "#aaccff"; ctx.font = "bold 16px monospace"; ctx.textAlign = "center";
      ctx.fillText("DECK BUILDER", W / 2, 40);
      // Back button
      ctx.fillStyle = "#442222"; ctx.fillRect(20, 20, 80, 30);
      ctx.fillStyle = "#ff8888"; ctx.font = "12px monospace"; ctx.textAlign = "center";
      ctx.fillText("← BACK", 60, 40);

      ctx.fillStyle = "#888"; ctx.font = "10px monospace"; ctx.textAlign = "left";
      ctx.fillText(`Deck: ${this.deck.length}/15 cards (click to add/remove)`, 30, 68);

      this.collection.forEach((card, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const bx = 30 + col * 140, by = 80 + row * 90;
        const inDeck = this.deck.find(c => c.id === card.id);
        const elColor = ELEMENT_COLORS[card.element] || "#888";
        ctx.fillStyle = inDeck ? "#1a2a1a" : "#1a1a2a";
        ctx.fillRect(bx, by, 130, 80);
        ctx.strokeStyle = inDeck ? "#44cc44" : elColor;
        ctx.lineWidth = inDeck ? 2 : 1;
        ctx.strokeRect(bx, by, 130, 80);
        ctx.lineWidth = 1;
        ctx.fillStyle = elColor; ctx.font = "bold 10px monospace"; ctx.textAlign = "left";
        ctx.fillText(card.name, bx + 4, by + 14);
        ctx.fillStyle = "#888"; ctx.font = "9px monospace";
        ctx.fillText(`${card.type} | Cost: ${card.cost}`, bx + 4, by + 28);
        if (card.type === "creature") ctx.fillText(`ATK: ${card.atk} DEF: ${card.def}`, bx + 4, by + 42);
        else ctx.fillText(`Effect: ${card.effect}`, bx + 4, by + 42);
        ctx.fillStyle = "#555"; ctx.font = "8px monospace";
        ctx.fillText(card.rarity, bx + 4, by + 56);
      });
    }

    if (this.state === "battle") {
      const opp = AI_OPPONENTS[this.opponentIdx];
      // Enemy area
      ctx.fillStyle = "rgba(50,0,0,0.3)"; ctx.fillRect(0, 0, W, H * 0.35);
      ctx.fillStyle = "#ff6644"; ctx.font = "bold 13px monospace"; ctx.textAlign = "left";
      ctx.fillText(`${opp.icon} ${opp.name}`, 15, 22);
      ctx.fillStyle = this.enemyHP > 10 ? "#ff4444" : "#ff0000"; ctx.font = "bold 12px monospace";
      ctx.fillText(`HP: ${this.enemyHP}/${30 + opp.difficulty * 5}`, 15, 40);
      ctx.fillStyle = "#4488ff"; ctx.font = "10px monospace";
      ctx.fillText(`Mana: ${this.enemyMana} | Hand: ${this.enemyHand.length}`, 15, 56);

      // Enemy field
      this.enemyField.forEach((c, i) => {
        const bx = W * 0.6 + i * 90, by = H * 0.15;
        ctx.fillStyle = "#2a1a1a"; ctx.fillRect(bx, by, 80, 80);
        ctx.strokeStyle = ELEMENT_COLORS[c.element]; ctx.strokeRect(bx, by, 80, 80);
        ctx.fillStyle = "#fff"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
        ctx.fillText(c.name, bx + 40, by + 20);
        ctx.fillStyle = "#ff4444"; ctx.font = "10px monospace";
        ctx.fillText(`⚔${c.atk}`, bx + 25, by + 55);
        ctx.fillStyle = "#4488ff";
        ctx.fillText(`♥${c.currentHP}`, bx + 55, by + 55);
      });

      // Player area
      ctx.fillStyle = "rgba(0,0,50,0.3)"; ctx.fillRect(0, H * 0.35, W, H * 0.65);
      ctx.fillStyle = "#44aaff"; ctx.font = "bold 13px monospace"; ctx.textAlign = "left";
      ctx.fillText(`You`, 15, H * 0.38 + 15);
      ctx.fillStyle = this.playerHP > 10 ? "#44ff44" : "#ff4444"; ctx.font = "bold 12px monospace";
      ctx.fillText(`HP: ${this.playerHP}/30`, 15, H * 0.38 + 33);
      ctx.fillStyle = "#4488ff"; ctx.font = "10px monospace";
      ctx.fillText(`Mana: ${this.playerMana}/${this.maxMana} | Turn: ${this.turn}`, 15, H * 0.38 + 48);

      // Player field
      this.field.forEach((c, i) => {
        const bx = W * 0.2 + i * 100, by = H * 0.5;
        ctx.fillStyle = c.isTrap ? "#2a2a1a" : "#1a1a2a";
        ctx.fillRect(bx, by, 80, 80);
        ctx.strokeStyle = c.hasAttacked ? "#666" : (c.isTrap ? "#ffaa44" : "#44cc44");
        ctx.lineWidth = c.hasAttacked ? 1 : 2;
        ctx.strokeRect(bx, by, 80, 80);
        ctx.lineWidth = 1;
        ctx.fillStyle = "#fff"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
        ctx.fillText(c.isTrap ? "TRAP" : c.name, bx + 40, by + 20);
        if (!c.isTrap) {
          ctx.fillStyle = "#ff4444"; ctx.font = "10px monospace";
          ctx.fillText(`⚔${c.atk}`, bx + 25, by + 55);
          ctx.fillStyle = "#4488ff";
          ctx.fillText(`♥${c.currentHP}`, bx + 55, by + 55);
        }
        if (!c.hasAttacked && !c.isTrap && this.isPlayerTurn) {
          ctx.fillStyle = "#44cc44"; ctx.font = "8px monospace";
          ctx.fillText("CLICK ATK", bx + 40, by + 72);
        }
      });

      // Hand
      const handY = H - 110;
      this.hand.forEach((card, i) => {
        const bx = W / 2 - (this.hand.length * 55) + i * 110;
        const elColor = ELEMENT_COLORS[card.element];
        const canPlay = card.cost <= this.playerMana && this.isPlayerTurn;
        ctx.fillStyle = this.selectedCard === i ? "#2a3a2a" : "#1a1a2a";
        ctx.fillRect(bx, handY, 100, 100);
        ctx.strokeStyle = canPlay ? elColor : "#333";
        ctx.lineWidth = this.selectedCard === i ? 3 : 1;
        ctx.strokeRect(bx, handY, 100, 100);
        ctx.lineWidth = 1;
        ctx.fillStyle = elColor; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
        ctx.fillText(card.name, bx + 50, handY + 16);
        ctx.fillStyle = canPlay ? "#fff" : "#555"; ctx.font = "8px monospace";
        ctx.fillText(`Cost: ${card.cost}`, bx + 50, handY + 32);
        if (card.type === "creature") ctx.fillText(`${card.atk}/${card.def}`, bx + 50, handY + 48);
        else ctx.fillText(card.effect, bx + 50, handY + 48);
        ctx.fillStyle = "#666"; ctx.font = "8px monospace";
        ctx.fillText(card.type, bx + 50, handY + 64);
        if (this.selectedCard === i) {
          ctx.fillStyle = "#44cc44"; ctx.font = "bold 9px monospace";
          ctx.fillText("CLICK TO PLAY", bx + 50, handY + 85);
        }
      });

      // End turn button
      if (this.isPlayerTurn) {
        ctx.fillStyle = "#2a1a1a"; ctx.fillRect(W - 120, H - 50, 100, 30);
        ctx.strokeStyle = "#cc4444"; ctx.strokeRect(W - 120, H - 50, 100, 30);
        ctx.fillStyle = "#ff8888"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.fillText("END TURN", W - 70, H - 30);
      } else {
        ctx.fillStyle = "#888"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
        ctx.fillText("Enemy turn...", W / 2, H / 2);
      }

      // Battle log
      ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(W - 200, 70, 190, 150);
      ctx.fillStyle = "#888"; ctx.font = "8px monospace"; ctx.textAlign = "left";
      const logStart = Math.max(0, this.battleLog.length - 8);
      for (let i = logStart; i < this.battleLog.length; i++) {
        ctx.fillText(this.battleLog[i].substring(0, 30), W - 195, 84 + (i - logStart) * 16);
      }
    }

    if (this.state === "reward") {
      ctx.fillStyle = "#0a0a1a"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = this.animText === "VICTORY!" ? "#44cc44" : "#cc4444";
      ctx.font = "bold 28px monospace"; ctx.textAlign = "center";
      ctx.fillText(this.animText, W / 2, H / 2 - 20);
      ctx.fillStyle = "#888"; ctx.font = "12px monospace";
      ctx.fillText("Click to continue", W / 2, H / 2 + 30);
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, W, 14);
    ctx.fillStyle = "#888"; ctx.font = "9px monospace"; ctx.textAlign = "right";
    ctx.fillText(`Card Battle Arena | Score: ${this.score}`, W - 10, 10);
  }
}
