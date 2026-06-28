// TargetGame.js — Standalone target shooting gallery mini-game
// Moving targets, combo scoring, power-ups, multiple rounds, accuracy tracking

const TARGET_TYPES = [
  { name:"Circle",   color:"#ff4444", points:10,  speed:1.0, size:30, shape:"circle" },
  { name:"Diamond",  color:"#44aaff", points:20,  speed:1.3, size:25, shape:"diamond" },
  { name:"Triangle", color:"#44ff88", points:15,  speed:1.5, size:28, shape:"triangle" },
  { name:"Star",     color:"#ffdd44", points:30,  speed:1.8, size:22, shape:"star" },
  { name:"Skull",    color:"#cc44ff", points:50,  speed:2.2, size:20, shape:"skull" },
];

const POWERUP_TYPES = [
  { name:"Slow Time",  color:"#4488ff", icon:"⏳", duration:180, effect:"slow" },
  { name:"Double Score",color:"#ffdd44",icon:"×2", duration:240, effect:"double" },
  { name:"Freeze",     color:"#88ccff", icon:"❄", duration:120, effect:"freeze" },
  { name:"Big Targets",color:"#44ff88", icon:"⊕", duration:200, effect:"big" },
];

const ROUNDS = [
  { name:"Warm Up",       targetCount:10, timeLimit:600, spawnRate:60, types:[0,1] },
  { name:"Getting Serious",targetCount:15, timeLimit:540, spawnRate:48, types:[0,1,2] },
  { name:"Sharpshooter",  targetCount:20, timeLimit:480, spawnRate:38, types:[0,1,2,3] },
  { name:"Bullet Hell",   targetCount:25, timeLimit:420, spawnRate:30, types:[1,2,3,4] },
  { name:"Final Showdown", targetCount:30, timeLimit:360, spawnRate:24, types:[2,3,4] },
];

export class TargetGame {
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
    this.state = "menu"; // menu, playing, roundEnd, gameover
    this.round = 0;
    this.roundTimer = 0;
    this.spawnTimer = 0;
    this.targetsSpawned = 0;
    this.targetsHit = 0;
    this.totalShots = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;

    // Targets and effects
    this.targets = [];
    this.particles = [];
    this.powerups = [];
    this.activeEffects = {};
    this.popups = [];

    // Stats
    this.roundScores = [];
    this.accuracy = 0;

    // Crosshair
    this.crossX = this.W / 2;
    this.crossY = this.H / 2;
    this.muzzleFlash = 0;

    // Input
    this._bindInput();
  }

  _bindInput() {
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.crossX = (e.clientX - r.left) * (this.W / r.width);
      this.crossY = (e.clientY - r.top) * (this.H / r.height);
    };
    this._onClick = (e) => {
      e.preventDefault();
      if (this.state === "menu") { this.state = "playing"; this._startRound(); return; }
      if (this.state === "roundEnd") { this._nextRound(); return; }
      if (this.state === "gameover") { this._reset(); return; }
      if (this.state === "playing") this._shoot();
    };
    this._onKeyDown = (e) => {
      if (e.key === "Escape") { this.gameOver = true; this.state = "gameover"; }
    };
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("click", this._onClick);
    window.addEventListener("keydown", this._onKeyDown);
  }

  destroy() {
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("click", this._onClick);
    window.removeEventListener("keydown", this._onKeyDown);
  }

  _reset() {
    this.score = 0;
    this.round = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalShots = 0;
    this.targetsHit = 0;
    this.roundScores = [];
    this.targets = [];
    this.particles = [];
    this.powerups = [];
    this.popups = [];
    this.activeEffects = {};
    this.state = "playing";
    this.gameOver = false;
    this._startRound();
  }

  _startRound() {
    if (this.round >= ROUNDS.length) { this.state = "gameover"; this.gameOver = true; return; }
    const r = ROUNDS[this.round];
    this.roundTimer = r.timeLimit;
    this.spawnTimer = 0;
    this.targetsSpawned = 0;
    this.state = "playing";
  }

  _nextRound() {
    this.round++;
    if (this.round >= ROUNDS.length) { this.state = "gameover"; this.gameOver = true; return; }
    this._startRound();
  }

  _shoot() {
    this.totalShots++;
    this.muzzleFlash = 8;
    let hit = false;

    // Check targets from front (newest) to back
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      const dx = this.crossX - t.x;
      const dy = this.crossY - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = t.size * (this.activeEffects.big ? 1.5 : 1);
      if (dist < hitRadius) {
        hit = true;
        this.targets.splice(i, 1);
        this.targetsHit++;
        this.combo++;
        this.comboTimer = 90;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        let pts = t.points * (1 + Math.floor(this.combo / 3) * 0.5);
        if (this.activeEffects.double) pts *= 2;
        pts = Math.round(pts);
        this.score += pts;

        // Popup
        this.popups.push({ x: t.x, y: t.y, text: `+${pts}`, timer: 40, color: t.color });

        // Particles
        for (let p = 0; p < 8; p++) {
          const angle = (Math.PI * 2 * p) / 8 + Math.random() * 0.5;
          this.particles.push({ x: t.x, y: t.y, vx: Math.cos(angle) * (2 + Math.random() * 3), vy: Math.sin(angle) * (2 + Math.random() * 3), life: 30, color: t.color, size: 3 + Math.random() * 3 });
        }

        // Chance to spawn powerup
        if (Math.random() < 0.08) {
          const pu = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
          this.powerups.push({ ...pu, x: t.x, y: t.y, vy: 1, life: 180 });
        }
        break;
      }
    }

    if (!hit) {
      this.combo = 0;
      // Miss particles
      for (let p = 0; p < 3; p++) {
        this.particles.push({ x: this.crossX, y: this.crossY, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 15, color: "#666", size: 2 });
      }
    }
  }

  update() {
    this.frame++;
    if (this.state !== "playing") return;

    const rd = ROUNDS[this.round];
    if (!rd) return;

    // Timer
    this.roundTimer--;
    if (this.roundTimer <= 0 || (this.targetsSpawned >= rd.targetCount && this.targets.length === 0)) {
      this.roundScores.push(this.score - this.roundScores.reduce((a, b) => a + b, 0));
      this.state = "roundEnd";
      return;
    }

    // Combo decay
    if (this.comboTimer > 0) this.comboTimer--;
    else if (this.combo > 0) this.combo = Math.max(0, this.combo - 1);

    // Muzzle flash decay
    if (this.muzzleFlash > 0) this.muzzleFlash--;

    // Spawn targets
    this.spawnTimer++;
    const rate = this.activeEffects.slow ? rd.spawnRate * 1.5 : rd.spawnRate;
    if (this.spawnTimer >= rate && this.targetsSpawned < rd.targetCount) {
      this.spawnTimer = 0;
      this.targetsSpawned++;
      const typeIdx = rd.types[Math.floor(Math.random() * rd.types.length)];
      const type = TARGET_TYPES[typeIdx];
      const side = Math.floor(Math.random() * 4);
      let x, y, vx, vy;
      const spd = type.speed * (this.activeEffects.slow ? 0.5 : 1) * (0.8 + Math.random() * 0.4);
      if (side === 0) { x = -30; y = Math.random() * this.H * 0.7 + 50; vx = spd; vy = (Math.random() - 0.5) * spd; }
      else if (side === 1) { x = this.W + 30; y = Math.random() * this.H * 0.7 + 50; vx = -spd; vy = (Math.random() - 0.5) * spd; }
      else if (side === 2) { x = Math.random() * this.W; y = -30; vx = (Math.random() - 0.5) * spd; vy = spd; }
      else { x = Math.random() * this.W; y = this.H + 30; vx = (Math.random() - 0.5) * spd; vy = -spd; }
      this.targets.push({ x, y, vx, vy, ...type, size: type.size * (this.activeEffects.big ? 1.5 : 1), wobble: Math.random() * Math.PI * 2 });
    }

    // Update targets
    const frozen = !!this.activeEffects.freeze;
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      if (!frozen) {
        t.x += t.vx;
        t.y += t.vy;
        t.wobble += 0.05;
        t.x += Math.sin(t.wobble) * 0.5;
      }
      // Remove if off-screen
      if (t.x < -60 || t.x > this.W + 60 || t.y < -60 || t.y > this.H + 60) {
        this.targets.splice(i, 1);
        this.combo = 0;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].y -= 1;
      this.popups[i].timer--;
      if (this.popups[i].timer <= 0) this.popups.splice(i, 1);
    }

    // Update powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.y += pu.vy;
      pu.life--;
      // Auto-collect if crosshair near
      const dx = this.crossX - pu.x;
      const dy = this.crossY - pu.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        this.activeEffects[pu.effect] = pu.duration;
        this.popups.push({ x: pu.x, y: pu.y, text: pu.name, timer: 60, color: pu.color });
        this.powerups.splice(i, 1);
        continue;
      }
      if (pu.life <= 0 || pu.y > this.H + 30) this.powerups.splice(i, 1);
    }

    // Decay active effects
    for (const key of Object.keys(this.activeEffects)) {
      this.activeEffects[key]--;
      if (this.activeEffects[key] <= 0) delete this.activeEffects[key];
    }

    // Accuracy
    this.accuracy = this.totalShots > 0 ? Math.round((this.targetsHit / this.totalShots) * 100) : 0;
  }

  draw() {
    const { ctx, W, H } = this;
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0a0a1a");
    grad.addColorStop(1, "#1a0a2a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "#ffffff08";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (this.state === "menu") { this._drawMenu(); return; }
    if (this.state === "gameover") { this._drawGameOver(); return; }
    if (this.state === "roundEnd") { this._drawRoundEnd(); return; }

    // Targets
    for (const t of this.targets) {
      this._drawTarget(t);
    }

    // Powerups
    for (const pu of this.powerups) {
      ctx.save();
      ctx.globalAlpha = pu.life < 30 ? pu.life / 30 : 1;
      ctx.fillStyle = pu.color;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(pu.icon, pu.x, pu.y + 5);
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Popups
    for (const pop of this.popups) {
      ctx.globalAlpha = pop.timer / 40;
      ctx.fillStyle = pop.color;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.globalAlpha = 1;

    // Crosshair
    this._drawCrosshair();

    // HUD
    this._drawHUD();
  }

  _drawTarget(t) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    const s = t.size;

    if (t.shape === "circle") {
      ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff3"; ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (t.shape === "diamond") {
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (t.shape === "triangle") {
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, s * 0.7); ctx.lineTo(-s, s * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (t.shape === "star") {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const a2 = a1 + Math.PI / 5;
        ctx.lineTo(Math.cos(a1) * s, Math.sin(a1) * s);
        ctx.lineTo(Math.cos(a2) * s * 0.4, Math.sin(a2) * s * 0.4);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (t.shape === "skull") {
      ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.3, s * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.3, s * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-s * 0.15, s * 0.1, s * 0.3, s * 0.15);
    }
    ctx.restore();
  }

  _drawCrosshair() {
    const { ctx, crossX, crossY } = this;
    const flash = this.muzzleFlash > 0;
    ctx.strokeStyle = flash ? "#ffaa00" : "#ff4444";
    ctx.lineWidth = 2;
    const r = 18;
    ctx.beginPath(); ctx.arc(crossX, crossY, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(crossX - r - 5, crossY); ctx.lineTo(crossX - r + 8, crossY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(crossX + r + 5, crossY); ctx.lineTo(crossX + r - 8, crossY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(crossX, crossY - r - 5); ctx.lineTo(crossX, crossY - r + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(crossX, crossY + r + 5); ctx.lineTo(crossX, crossY + r - 8); ctx.stroke();
    ctx.fillStyle = flash ? "#ffaa00" : "#ff4444";
    ctx.beginPath(); ctx.arc(crossX, crossY, 2, 0, Math.PI * 2); ctx.fill();
  }

  _drawHUD() {
    const { ctx, W } = this;
    const rd = ROUNDS[this.round];
    // Top bar
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Round ${this.round + 1}: ${rd ? rd.name : ""}`, 12, 26);
    ctx.textAlign = "center";
    ctx.fillText(`Score: ${this.score}`, W / 2, 26);
    ctx.textAlign = "right";
    const timeLeft = rd ? Math.ceil(this.roundTimer / 60) : 0;
    ctx.fillStyle = timeLeft < 10 ? "#ff4444" : "#aaa";
    ctx.fillText(`Time: ${timeLeft}s`, W - 12, 26);

    // Bottom bar
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, this.H - 30, W, 30);
    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Combo: ${this.combo}x | Accuracy: ${this.accuracy}% | Targets: ${this.targetsHit}/${this.targetsSpawned}`, 12, this.H - 10);
    ctx.textAlign = "right";
    const effects = Object.keys(this.activeEffects).map(k => `${k}:${Math.ceil(this.activeEffects[k] / 60)}s`).join(" ");
    ctx.fillStyle = "#ffdd44";
    ctx.fillText(effects, W - 12, this.H - 10);
  }

  _drawMenu() {
    const { ctx, W, H } = this;
    ctx.fillStyle = "#ff8844";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("TARGET SHOOTER", W / 2, H / 2 - 60);
    ctx.fillStyle = "#888";
    ctx.font = "14px monospace";
    ctx.fillText("Click targets to shoot. Build combos for bonus points.", W / 2, H / 2 - 20);
    ctx.fillText("Collect power-ups. Survive 5 rounds.", W / 2, H / 2 + 5);
    ctx.fillStyle = "#ff8844";
    ctx.font = "bold 18px monospace";
    ctx.fillText("[ CLICK TO START ]", W / 2, H / 2 + 50);
    ctx.fillStyle = "#666";
    ctx.font = "10px monospace";
    ctx.fillText("ESC to quit", W / 2, H / 2 + 80);
  }

  _drawRoundEnd() {
    const { ctx, W, H } = this;
    ctx.fillStyle = "#44ff88";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`Round ${this.round + 1} Complete!`, W / 2, H / 2 - 40);
    ctx.fillStyle = "#aaa";
    ctx.font = "16px monospace";
    ctx.fillText(`Score: ${this.score} | Accuracy: ${this.accuracy}%`, W / 2, H / 2);
    ctx.fillText(`Max Combo: ${this.maxCombo}x`, W / 2, H / 2 + 25);
    ctx.fillStyle = "#44ff88";
    ctx.font = "bold 16px monospace";
    ctx.fillText("[ CLICK FOR NEXT ROUND ]", W / 2, H / 2 + 70);
  }

  _drawGameOver() {
    const { ctx, W, H } = this;
    ctx.fillStyle = "#ff4444";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", W / 2, H / 2 - 60);
    ctx.fillStyle = "#ffdd44";
    ctx.font = "bold 24px monospace";
    ctx.fillText(`Final Score: ${this.score}`, W / 2, H / 2 - 15);
    ctx.fillStyle = "#aaa";
    ctx.font = "14px monospace";
    ctx.fillText(`Accuracy: ${this.accuracy}% | Max Combo: ${this.maxCombo}x`, W / 2, H / 2 + 15);
    ctx.fillText(`Targets Hit: ${this.targetsHit} / ${this.totalShots} shots`, W / 2, H / 2 + 40);
    ctx.fillStyle = "#ff8844";
    ctx.font = "bold 16px monospace";
    ctx.fillText("[ CLICK TO PLAY AGAIN ]", W / 2, H / 2 + 80);
  }
}
