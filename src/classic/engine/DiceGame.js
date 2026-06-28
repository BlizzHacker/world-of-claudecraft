// DiceGame.js — Standalone dice game with multiple variants extracted from Cryptic Realm
// Variants: Craps, Yahtzee-style, High Roller. Betting system, progression.

const VARIANTS = [
  { id: "craps", name: "Street Craps", desc: "Roll dice, bet on outcomes. 7/11 wins on come-out.", icon: "🎲" },
  { id: "yahtzee", name: "Five Dice", desc: "Roll 5 dice, pick combos. Best score in 3 rolls.", icon: "🎯" },
  { id: "highroller", name: "High Roller", desc: "Roll vs house. Highest total wins. Double or nothing!", icon: "🏆" },
];

const YAHTZEE_CATEGORIES = [
  { id: "ones", name: "Ones", score: d => d.filter(v => v === 1).length * 1 },
  { id: "twos", name: "Twos", score: d => d.filter(v => v === 2).length * 2 },
  { id: "threes", name: "Threes", score: d => d.filter(v => v === 3).length * 3 },
  { id: "fours", name: "Fours", score: d => d.filter(v => v === 4).length * 4 },
  { id: "fives", name: "Fives", score: d => d.filter(v => v === 5).length * 5 },
  { id: "sixes", name: "Sixes", score: d => d.filter(v => v === 6).length * 6 },
  { id: "three_kind", name: "3 of Kind", score: d => { const c = _counts(d); return Object.values(c).some(v => v >= 3) ? d.reduce((a, b) => a + b, 0) : 0; } },
  { id: "four_kind", name: "4 of Kind", score: d => { const c = _counts(d); return Object.values(c).some(v => v >= 4) ? d.reduce((a, b) => a + b, 0) : 0; } },
  { id: "full_house", name: "Full House", score: d => { const c = Object.values(_counts(d)); return c.includes(3) && c.includes(2) ? 25 : 0; } },
  { id: "sm_straight", name: "Sm Straight", score: d => { const s = [...new Set(d)].sort().join(""); return /1234|2345|3456/.test(s) ? 30 : 0; } },
  { id: "lg_straight", name: "Lg Straight", score: d => { const s = [...new Set(d)].sort().join(""); return /12345|23456/.test(s) ? 40 : 0; } },
  { id: "yahtzee", name: "Yahtzee!", score: d => { const c = _counts(d); return Object.values(c).some(v => v === 5) ? 50 : 0; } },
  { id: "chance", name: "Chance", score: d => d.reduce((a, b) => a + b, 0) },
];

function _counts(dice) { const c = {}; dice.forEach(v => c[v] = (c[v] || 0) + 1); return c; }

export class DiceGame {
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
    this.state = "menu"; // menu, craps, yahtzee, highroller
    this.gold = 500;
    this.bet = 50;
    this.totalWinnings = 0;

    // Craps
    this.crapsDice = [0, 0];
    this.crapsPoint = 0;
    this.crapsPhase = "come_out"; // come_out, point
    this.crapsResult = "";
    this.crapsRolling = false;
    this.crapsRollTimer = 0;
    this.crapsHistory = [];

    // Yahtzee
    this.yahtzeeDice = [1, 1, 1, 1, 1];
    this.yahtzeeHeld = [false, false, false, false, false];
    this.yahtzeeRolls = 0;
    this.yahtzeeMaxRolls = 3;
    this.yahtzeeScores = {};
    this.yahtzeeRound = 0;
    this.yahtzeeTotal = 0;
    this.yahtzeeRolling = false;
    this.yahtzeeRollTimer = 0;

    // High Roller
    this.hrPlayerDice = [0, 0, 0];
    this.hrHouseDice = [0, 0, 0];
    this.hrResult = "";
    this.hrRolling = false;
    this.hrRollTimer = 0;
    this.hrStreak = 0;
    this.hrMultiplier = 1;

    // Animations
    this.diceAnim = [];
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

  _rollDie() { return 1 + Math.floor(Math.random() * 6); }

  _rollDice(count) { return Array.from({ length: count }, () => this._rollDie()); }

  _spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 4, life: 1, decay: 0.02, size: 2 + Math.random() * 4, color });
    }
  }

  _crapsRoll() {
    if (this.bet > this.gold) return;
    this.crapsRolling = true;
    this.crapsRollTimer = 30;
    this.crapsResult = "";
  }

  _resolveCraps() {
    const d = this.crapsDice;
    const total = d[0] + d[1];
    if (this.crapsPhase === "come_out") {
      if (total === 7 || total === 11) {
        this.gold += this.bet;
        this.totalWinnings += this.bet;
        this.score += this.bet;
        this.crapsResult = `WIN! ${total} - Natural! +${this.bet}g`;
        this._spawnParticles(this.W / 2, this.H / 2, "#44cc44", 20);
      } else if (total === 2 || total === 3 || total === 12) {
        this.gold -= this.bet;
        this.totalWinnings -= this.bet;
        this.crapsResult = `CRAPS! ${total} - You lose ${this.bet}g`;
        this._spawnParticles(this.W / 2, this.H / 2, "#cc4444", 15);
      } else {
        this.crapsPoint = total;
        this.crapsPhase = "point";
        this.crapsResult = `Point set: ${total}. Roll again!`;
      }
    } else {
      if (total === this.crapsPoint) {
        this.gold += this.bet * 2;
        this.totalWinnings += this.bet * 2;
        this.score += this.bet * 2;
        this.crapsResult = `WIN! Hit the point ${total}! +${this.bet * 2}g`;
        this.crapsPhase = "come_out";
        this.crapsPoint = 0;
        this._spawnParticles(this.W / 2, this.H / 2, "#ffdd44", 25);
      } else if (total === 7) {
        this.gold -= this.bet;
        this.totalWinnings -= this.bet;
        this.crapsResult = `SEVEN OUT! Lost ${this.bet}g`;
        this.crapsPhase = "come_out";
        this.crapsPoint = 0;
        this._spawnParticles(this.W / 2, this.H / 2, "#cc4444", 15);
      } else {
        this.crapsResult = `Rolled ${total}. Need ${this.crapsPoint}. Roll again!`;
      }
    }
    this.crapsHistory.unshift({ total, result: this.crapsResult });
    if (this.crapsHistory.length > 8) this.crapsHistory.pop();
  }

  _yahtzeeRoll() {
    if (this.yahtzeeRolls >= this.yahtzeeMaxRolls) return;
    this.yahtzeeRolling = true;
    this.yahtzeeRollTimer = 20;
    this.yahtzeeRolls++;
  }

  _yahtzeeScore(catIdx) {
    const cat = YAHTZEE_CATEGORIES[catIdx];
    if (this.yahtzeeScores[cat.id] !== undefined) return;
    if (this.yahtzeeRolls === 0) return;
    const pts = cat.score(this.yahtzeeDice);
    this.yahtzeeScores[cat.id] = pts;
    this.yahtzeeTotal += pts;
    this.score += pts;
    this.yahtzeeRound++;
    this.yahtzeeRolls = 0;
    this.yahtzeeHeld = [false, false, false, false, false];
    if (this.yahtzeeRound >= YAHTZEE_CATEGORIES.length) {
      // Game over, award gold
      const bonus = this.yahtzeeTotal * 2;
      this.gold += bonus;
      this.totalWinnings += bonus;
      this.crapsResult = `Game Over! Total: ${this.yahtzeeTotal} - Won ${bonus}g!`;
      this.state = "menu";
      this._spawnParticles(this.W / 2, this.H / 2, "#ffdd44", 30);
    }
  }

  _highRollerRoll() {
    if (this.bet * this.hrMultiplier > this.gold) return;
    this.hrRolling = true;
    this.hrRollTimer = 30;
    this.hrResult = "";
  }

  _resolveHighRoller() {
    const pTotal = this.hrPlayerDice.reduce((a, b) => a + b, 0);
    const hTotal = this.hrHouseDice.reduce((a, b) => a + b, 0);
    const wager = this.bet * this.hrMultiplier;
    if (pTotal > hTotal) {
      this.gold += wager;
      this.totalWinnings += wager;
      this.score += wager;
      this.hrStreak++;
      this.hrMultiplier = Math.min(8, 1 + this.hrStreak);
      this.hrResult = `WIN! ${pTotal} vs ${hTotal} (+${wager}g) Streak: ${this.hrStreak}x`;
      this._spawnParticles(this.W / 2, this.H / 2, "#44cc44", 20);
    } else if (pTotal < hTotal) {
      this.gold -= wager;
      this.totalWinnings -= wager;
      this.hrStreak = 0;
      this.hrMultiplier = 1;
      this.hrResult = `LOSE! ${pTotal} vs ${hTotal} (-${wager}g) Streak broken.`;
      this._spawnParticles(this.W / 2, this.H / 2, "#cc4444", 15);
    } else {
      this.hrResult = `TIE! ${pTotal} vs ${hTotal}. Push.`;
    }
  }

  update() {
    this.frame++;
    this.W = this.canvas.width; this.H = this.canvas.height;
    this.particles = this.particles.filter(p => p.life > 0).map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, life: p.life - p.decay, size: p.size * 0.97 }));

    if (this.state === "menu") {
      if (this.mouse.click) {
        this.mouse.click = false;
        const cx = this.W / 2;
        for (let i = 0; i < VARIANTS.length; i++) {
          const bx = cx - 160, by = 140 + i * 70;
          if (this.mouse.x > bx && this.mouse.x < bx + 320 && this.mouse.y > by && this.mouse.y < by + 58) {
            this.state = VARIANTS[i].id;
            if (VARIANTS[i].id === "yahtzee") {
              this.yahtzeeScores = {};
              this.yahtzeeRound = 0;
              this.yahtzeeTotal = 0;
              this.yahtzeeRolls = 0;
              this.yahtzeeHeld = [false, false, false, false, false];
            }
            if (VARIANTS[i].id === "craps") {
              this.crapsPhase = "come_out";
              this.crapsPoint = 0;
              this.crapsHistory = [];
            }
            if (VARIANTS[i].id === "highroller") {
              this.hrStreak = 0;
              this.hrMultiplier = 1;
            }
            return;
          }
        }
      }
    }

    if (this.state === "craps") {
      if (this.crapsRolling) {
        this.crapsRollTimer--;
        if (this.crapsRollTimer <= 0) {
          this.crapsRolling = false;
          this.crapsDice = this._rollDice(2);
          this._resolveCraps();
        } else {
          this.crapsDice = [this._rollDie(), this._rollDie()];
        }
      }
      if (this.mouse.click && !this.crapsRolling) {
        this.mouse.click = false;
        const W = this.W, H = this.H;
        // Roll button
        if (this.mouse.x > W / 2 - 60 && this.mouse.x < W / 2 + 60 && this.mouse.y > H - 80 && this.mouse.y < H - 44) {
          this._crapsRoll();
        }
        // Back button
        if (this.mouse.x > 20 && this.mouse.x < 100 && this.mouse.y > 20 && this.mouse.y < 50) { this.state = "menu"; }
        // Bet controls
        if (this.mouse.x > W / 2 - 120 && this.mouse.x < W / 2 - 70 && this.mouse.y > H - 36 && this.mouse.y < H - 10) { this.bet = Math.max(10, this.bet - 10); }
        if (this.mouse.x > W / 2 + 70 && this.mouse.x < W / 2 + 120 && this.mouse.y > H - 36 && this.mouse.y < H - 10) { this.bet = Math.min(this.gold, this.bet + 10); }
      }
    }

    if (this.state === "yahtzee") {
      if (this.yahtzeeRolling) {
        this.yahtzeeRollTimer--;
        if (this.yahtzeeRollTimer <= 0) {
          this.yahtzeeRolling = false;
          for (let i = 0; i < 5; i++) { if (!this.yahtzeeHeld[i]) this.yahtzeeDice[i] = this._rollDie(); }
        } else {
          for (let i = 0; i < 5; i++) { if (!this.yahtzeeHeld[i]) this.yahtzeeDice[i] = this._rollDie(); }
        }
      }
      if (this.mouse.click && !this.yahtzeeRolling) {
        this.mouse.click = false;
        const W = this.W, H = this.H;
        // Back button
        if (this.mouse.x > 20 && this.mouse.x < 100 && this.mouse.y > 20 && this.mouse.y < 50) { this.state = "menu"; return; }
        // Dice - toggle hold
        for (let i = 0; i < 5; i++) {
          const bx = W / 2 - 150 + i * 65, by = 80;
          if (this.mouse.x > bx && this.mouse.x < bx + 55 && this.mouse.y > by && this.mouse.y < by + 55) {
            if (this.yahtzeeRolls > 0) this.yahtzeeHeld[i] = !this.yahtzeeHeld[i];
            return;
          }
        }
        // Roll button
        if (this.mouse.x > W / 2 - 60 && this.mouse.x < W / 2 + 60 && this.mouse.y > 150 && this.mouse.y < 180) {
          this._yahtzeeRoll(); return;
        }
        // Category scoring
        for (let i = 0; i < YAHTZEE_CATEGORIES.length; i++) {
          const col = i < 7 ? 0 : 1;
          const row = i < 7 ? i : i - 7;
          const bx = 20 + col * 200, by = 200 + row * 28;
          if (this.mouse.x > bx && this.mouse.x < bx + 190 && this.mouse.y > by && this.mouse.y < by + 24) {
            this._yahtzeeScore(i); return;
          }
        }
      }
    }

    if (this.state === "highroller") {
      if (this.hrRolling) {
        this.hrRollTimer--;
        if (this.hrRollTimer <= 0) {
          this.hrRolling = false;
          this.hrPlayerDice = this._rollDice(3);
          this.hrHouseDice = this._rollDice(3);
          this._resolveHighRoller();
        } else {
          this.hrPlayerDice = this._rollDice(3);
          this.hrHouseDice = this._rollDice(3);
        }
      }
      if (this.mouse.click && !this.hrRolling) {
        this.mouse.click = false;
        const W = this.W, H = this.H;
        // Roll button
        if (this.mouse.x > W / 2 - 60 && this.mouse.x < W / 2 + 60 && this.mouse.y > H - 80 && this.mouse.y < H - 44) {
          this._highRollerRoll();
        }
        // Back button
        if (this.mouse.x > 20 && this.mouse.x < 100 && this.mouse.y > 20 && this.mouse.y < 50) { this.state = "menu"; }
        // Bet controls
        if (this.mouse.x > W / 2 - 120 && this.mouse.x < W / 2 - 70 && this.mouse.y > H - 36 && this.mouse.y < H - 10) { this.bet = Math.max(10, this.bet - 25); }
        if (this.mouse.x > W / 2 + 70 && this.mouse.x < W / 2 + 120 && this.mouse.y > H - 36 && this.mouse.y < H - 10) { this.bet = Math.min(Math.floor(this.gold / this.hrMultiplier), this.bet + 25); }
      }
    }
  }

  _drawDie(x, y, size, value, held) {
    const ctx = this.ctx;
    ctx.fillStyle = held ? "#2a3a2a" : "#f0f0e0";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = held ? "#44cc44" : "#333";
    ctx.lineWidth = held ? 2 : 1;
    ctx.strokeRect(x, y, size, size);
    ctx.lineWidth = 1;
    ctx.fillStyle = held ? "#44cc44" : "#222";
    const dotR = size * 0.08;
    const cx = x + size / 2, cy = y + size / 2;
    const positions = {
      1: [[cx, cy]],
      2: [[cx - size * 0.25, cy - size * 0.25], [cx + size * 0.25, cy + size * 0.25]],
      3: [[cx - size * 0.25, cy - size * 0.25], [cx, cy], [cx + size * 0.25, cy + size * 0.25]],
      4: [[cx - size * 0.25, cy - size * 0.25], [cx + size * 0.25, cy - size * 0.25], [cx - size * 0.25, cy + size * 0.25], [cx + size * 0.25, cy + size * 0.25]],
      5: [[cx - size * 0.25, cy - size * 0.25], [cx + size * 0.25, cy - size * 0.25], [cx, cy], [cx - size * 0.25, cy + size * 0.25], [cx + size * 0.25, cy + size * 0.25]],
      6: [[cx - size * 0.25, cy - size * 0.25], [cx + size * 0.25, cy - size * 0.25], [cx - size * 0.25, cy], [cx + size * 0.25, cy], [cx - size * 0.25, cy + size * 0.25], [cx + size * 0.25, cy + size * 0.25]],
    };
    (positions[value] || []).forEach(([px, py]) => {
      ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2); ctx.fill();
    });
  }

  draw() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a1a0a"); bg.addColorStop(1, "#0a0a1a");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.state === "menu") {
      ctx.fillStyle = "#ffdd44"; ctx.font = "bold 22px monospace"; ctx.textAlign = "center";
      ctx.fillText("🎲 DICE PARLOR 🎲", W / 2, 50);
      ctx.fillStyle = "#888"; ctx.font = "11px monospace";
      ctx.fillText(`Gold: ${this.gold} | Total Winnings: ${this.totalWinnings}`, W / 2, 80);
      ctx.fillText("Choose a game:", W / 2, 115);

      const cx = W / 2;
      VARIANTS.forEach((v, i) => {
        const bx = cx - 160, by = 140 + i * 70;
        ctx.fillStyle = "#1a1a2a"; ctx.fillRect(bx, by, 320, 58);
        ctx.strokeStyle = "#446688"; ctx.strokeRect(bx, by, 320, 58);
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px monospace"; ctx.textAlign = "left";
        ctx.fillText(`${v.icon} ${v.name}`, bx + 12, by + 22);
        ctx.fillStyle = "#888"; ctx.font = "10px monospace";
        ctx.fillText(v.desc, bx + 12, by + 42);
      });
    }

    if (this.state === "craps") {
      // Back button
      ctx.fillStyle = "#442222"; ctx.fillRect(20, 20, 80, 30);
      ctx.fillStyle = "#ff8888"; ctx.font = "12px monospace"; ctx.textAlign = "center";
      ctx.fillText("← BACK", 60, 40);

      ctx.fillStyle = "#ffdd44"; ctx.font = "bold 18px monospace"; ctx.textAlign = "center";
      ctx.fillText("STREET CRAPS", W / 2, 50);
      ctx.fillStyle = "#888"; ctx.font = "11px monospace";
      ctx.fillText(`Gold: ${this.gold} | Phase: ${this.crapsPhase}${this.crapsPoint ? ` (Point: ${this.crapsPoint})` : ""}`, W / 2, 75);

      // Dice
      this._drawDie(W / 2 - 65, H * 0.3, 55, this.crapsDice[0] || 1, false);
      this._drawDie(W / 2 + 10, H * 0.3, 55, this.crapsDice[1] || 1, false);

      // Total
      if (!this.crapsRolling && this.crapsDice[0] > 0) {
        ctx.fillStyle = "#fff"; ctx.font = "bold 24px monospace"; ctx.textAlign = "center";
        ctx.fillText(`= ${this.crapsDice[0] + this.crapsDice[1]}`, W / 2, H * 0.3 + 80);
      }

      // Result
      if (this.crapsResult) {
        ctx.fillStyle = this.crapsResult.includes("WIN") ? "#44cc44" : (this.crapsResult.includes("LOSE") || this.crapsResult.includes("SEVEN") ? "#cc4444" : "#ffaa44");
        ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
        ctx.fillText(this.crapsResult, W / 2, H * 0.6);
      }

      // Roll button
      if (!this.crapsRolling) {
        ctx.fillStyle = "#2a4a2a"; ctx.fillRect(W / 2 - 60, H - 80, 120, 36);
        ctx.strokeStyle = "#44cc44"; ctx.strokeRect(W / 2 - 60, H - 80, 120, 36);
        ctx.fillStyle = "#44cc44"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
        ctx.fillText("🎲 ROLL", W / 2, H - 56);
      }

      // Bet controls
      ctx.fillStyle = "#888"; ctx.font = "11px monospace"; ctx.textAlign = "center";
      ctx.fillText(`Bet: ${this.bet}g`, W / 2, H - 20);
      ctx.fillStyle = "#442222"; ctx.fillRect(W / 2 - 120, H - 36, 50, 26);
      ctx.fillStyle = "#ff8888"; ctx.font = "bold 14px monospace";
      ctx.fillText("-", W / 2 - 95, H - 18);
      ctx.fillStyle = "#224422"; ctx.fillRect(W / 2 + 70, H - 36, 50, 26);
      ctx.fillStyle = "#88ff88";
      ctx.fillText("+", W / 2 + 95, H - 18);

      // History
      ctx.fillStyle = "#666"; ctx.font = "9px monospace"; ctx.textAlign = "left";
      this.crapsHistory.forEach((h, i) => {
        ctx.fillText(`[${h.total}] ${h.result.substring(0, 35)}`, 15, 100 + i * 14);
      });
    }

    if (this.state === "yahtzee") {
      // Back button
      ctx.fillStyle = "#442222"; ctx.fillRect(20, 20, 80, 30);
      ctx.fillStyle = "#ff8888"; ctx.font = "12px monospace"; ctx.textAlign = "center";
      ctx.fillText("← BACK", 60, 40);

      ctx.fillStyle = "#ffdd44"; ctx.font = "bold 18px monospace"; ctx.textAlign = "center";
      ctx.fillText("FIVE DICE", W / 2, 50);
      ctx.fillStyle = "#888"; ctx.font = "11px monospace";
      ctx.fillText(`Rolls: ${this.yahtzeeRolls}/${this.yahtzeeMaxRolls} | Round: ${this.yahtzeeRound}/${YAHTZEE_CATEGORIES.length} | Score: ${this.yahtzeeTotal}`, W / 2, 72);

      // Dice
      for (let i = 0; i < 5; i++) {
        this._drawDie(W / 2 - 150 + i * 65, 80, 55, this.yahtzeeDice[i], this.yahtzeeHeld[i]);
      }

      // Roll button
      if (this.yahtzeeRolls < this.yahtzeeMaxRolls) {
        ctx.fillStyle = "#2a4a2a"; ctx.fillRect(W / 2 - 60, 150, 120, 30);
        ctx.strokeStyle = "#44cc44"; ctx.strokeRect(W / 2 - 60, 150, 120, 30);
        ctx.fillStyle = "#44cc44"; ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
        ctx.fillText(`ROLL (${this.yahtzeeMaxRolls - this.yahtzeeRolls} left)`, W / 2, 170);
      }

      // Scorecard
      ctx.fillStyle = "#888"; ctx.font = "9px monospace"; ctx.textAlign = "left";
      ctx.fillText("SCORECARD (click to score):", 20, 196);
      YAHTZEE_CATEGORIES.forEach((cat, i) => {
        const col = i < 7 ? 0 : 1;
        const row = i < 7 ? i : i - 7;
        const bx = 20 + col * 200, by = 200 + row * 28;
        const scored = this.yahtzeeScores[cat.id] !== undefined;
        const potential = this.yahtzeeRolls > 0 ? cat.score(this.yahtzeeDice) : 0;
        ctx.fillStyle = scored ? "#1a2a1a" : "#1a1a2a";
        ctx.fillRect(bx, by, 190, 24);
        ctx.strokeStyle = scored ? "#44cc44" : (potential > 0 ? "#ffaa44" : "#333");
        ctx.strokeRect(bx, by, 190, 24);
        ctx.fillStyle = scored ? "#44cc44" : "#ccc"; ctx.font = "10px monospace"; ctx.textAlign = "left";
        ctx.fillText(cat.name, bx + 6, by + 16);
        ctx.textAlign = "right";
        ctx.fillText(scored ? `${this.yahtzeeScores[cat.id]}` : `${potential}`, bx + 182, by + 16);
      });
    }

    if (this.state === "highroller") {
      // Back button
      ctx.fillStyle = "#442222"; ctx.fillRect(20, 20, 80, 30);
      ctx.fillStyle = "#ff8888"; ctx.font = "12px monospace"; ctx.textAlign = "center";
      ctx.fillText("← BACK", 60, 40);

      ctx.fillStyle = "#ffdd44"; ctx.font = "bold 18px monospace"; ctx.textAlign = "center";
      ctx.fillText("HIGH ROLLER", W / 2, 50);
      ctx.fillStyle = "#888"; ctx.font = "11px monospace";
      ctx.fillText(`Gold: ${this.gold} | Streak: ${this.hrStreak}x | Multiplier: ${this.hrMultiplier}x`, W / 2, 75);

      // Player dice
      ctx.fillStyle = "#44aaff"; ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
      ctx.fillText("YOUR DICE", W / 2, H * 0.25);
      for (let i = 0; i < 3; i++) this._drawDie(W / 2 - 100 + i * 70, H * 0.28, 55, this.hrPlayerDice[i] || 1, false);

      // House dice
      ctx.fillStyle = "#ff6644"; ctx.font = "bold 12px monospace";
      ctx.fillText("HOUSE DICE", W / 2, H * 0.55);
      for (let i = 0; i < 3; i++) this._drawDie(W / 2 - 100 + i * 70, H * 0.58, 55, this.hrHouseDice[i] || 1, false);

      // Result
      if (this.hrResult) {
        ctx.fillStyle = this.hrResult.includes("WIN") ? "#44cc44" : (this.hrResult.includes("LOSE") ? "#cc4444" : "#ffaa44");
        ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
        ctx.fillText(this.hrResult, W / 2, H * 0.82);
      }

      // Roll button
      if (!this.hrRolling) {
        ctx.fillStyle = "#2a4a2a"; ctx.fillRect(W / 2 - 60, H - 80, 120, 36);
        ctx.strokeStyle = "#44cc44"; ctx.strokeRect(W / 2 - 60, H - 80, 120, 36);
        ctx.fillStyle = "#44cc44"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
        ctx.fillText("🎲 ROLL", W / 2, H - 56);
      }

      // Bet controls
      ctx.fillStyle = "#888"; ctx.font = "11px monospace"; ctx.textAlign = "center";
      ctx.fillText(`Bet: ${this.bet}g (x${this.hrMultiplier} = ${this.bet * this.hrMultiplier}g)`, W / 2, H - 20);
      ctx.fillStyle = "#442222"; ctx.fillRect(W / 2 - 120, H - 36, 50, 26);
      ctx.fillStyle = "#ff8888"; ctx.font = "bold 14px monospace";
      ctx.fillText("-", W / 2 - 95, H - 18);
      ctx.fillStyle = "#224422"; ctx.fillRect(W / 2 + 70, H - 36, 50, 26);
      ctx.fillStyle = "#88ff88";
      ctx.fillText("+", W / 2 + 95, H - 18);
    }

    // Top HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, H - 4, W, 4);
  }
}
