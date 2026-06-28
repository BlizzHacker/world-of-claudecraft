// DrillGame.js — Standalone mining/drilling mini-game
// Dig through layers, collect gems, avoid hazards, upgrade drill

const LAYER_TYPES = [
  { name:"Topsoil",     color:"#5a4a3a", hardness:1, gemChance:0.05, hazardChance:0.02 },
  { name:"Clay",        color:"#8a5a3a", hardness:1.5, gemChance:0.08, hazardChance:0.03 },
  { name:"Sandstone",   color:"#aa8a5a", hardness:2, gemChance:0.10, hazardChance:0.04 },
  { name:"Limestone",   color:"#7a7a6a", hardness:2.5, gemChance:0.12, hazardChance:0.05 },
  { name:"Granite",     color:"#5a5a5a", hardness:3, gemChance:0.15, hazardChance:0.06 },
  { name:"Obsidian",    color:"#2a1a2a", hardness:4, gemChance:0.20, hazardChance:0.08 },
  { name:"Crystal Cave",color:"#3a2a5a", hardness:3, gemChance:0.30, hazardChance:0.10 },
  { name:"Magma Layer", color:"#6a1a0a", hardness:5, gemChance:0.25, hazardChance:0.15 },
];

const GEM_TYPES = [
  { name:"Quartz",    color:"#cccccc", value:10,  rarity:0.40 },
  { name:"Amethyst",  color:"#8844cc", value:25,  rarity:0.25 },
  { name:"Emerald",   color:"#44cc44", value:50,  rarity:0.15 },
  { name:"Ruby",      color:"#cc2244", value:75,  rarity:0.10 },
  { name:"Sapphire",  color:"#4466cc", value:100, rarity:0.06 },
  { name:"Diamond",   color:"#aaddff", value:200, rarity:0.03 },
  { name:"Void Stone",color:"#220044", value:500, rarity:0.01 },
];

const HAZARD_TYPES = [
  { name:"Gas Pocket",  color:"#88cc44", damage:10, icon:"☁" },
  { name:"Lava Bubble", color:"#ff4400", damage:20, icon:"🔥" },
  { name:"Rock Slide",  color:"#8a6a4a", damage:15, icon:"⛰" },
  { name:"Cave Worm",   color:"#cc8844", damage:25, icon:"🐛" },
];

const DRILL_UPGRADES = [
  { name:"Basic Drill",   power:1.0, heatRate:1.0, fuelUse:1.0, cost:0 },
  { name:"Steel Bit",     power:1.5, heatRate:0.9, fuelUse:1.0, cost:100 },
  { name:"Diamond Tip",   power:2.0, heatRate:0.8, fuelUse:0.9, cost:300 },
  { name:"Plasma Drill",  power:3.0, heatRate:0.7, fuelUse:0.8, cost:700 },
  { name:"Quantum Bore",  power:4.5, heatRate:0.5, fuelUse:0.7, cost:1500 },
];

const CELL_SIZE = 32;

export class DrillGame {
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
    this.state = "menu"; // menu, playing, shop, gameover
    this.depth = 0;
    this.maxDepth = 0;
    this.gold = 0;
    this.gems = {};
    this.fuel = 100;
    this.maxFuel = 100;
    this.heat = 0;
    this.maxHeat = 100;
    this.drillHP = 100;
    this.maxDrillHP = 100;
    this.drillIdx = 0;
    this.depthLevel = 0;

    // Grid
    this.grid = [];
    this.gridCols = 0;
    this.gridRows = 0;
    this.drillX = 0;
    this.drillY = 0;
    this.camY = 0;

    // Particles and messages
    this.particles = [];
    this.popups = [];
    this.shakeTimer = 0;
    this.shakeAmount = 0;

    // Input
    this.keys = {};
    this._bindInput();
  }

  _bindInput() {
    this._onKeyDown = (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === "Escape") {
        if (this.state === "playing") { this.gameOver = true; this.state = "gameover"; }
        else if (this.state === "shop") this.state = "playing";
      }
      if (this.state === "menu" && (e.key === "Enter" || e.key === " ")) { this.state = "playing"; this._generateWorld(); }
      if (this.state === "shop" && e.key === "u") { this._tryUpgrade(); }
      if (this.state === "shop" && e.key === "f") { this._buyFuel(); }
      if (this.state === "gameover" && (e.key === "Enter" || e.key === " ")) { this._reset(); }
      if (this.state === "playing" && e.key.toLowerCase() === "e") { this.state = "shop"; }
    };
    this._onKeyUp = (e) => { this.keys[e.key.toLowerCase()] = false; };
    this._onClick = (e) => {
      if (this.state === "menu") { this.state = "playing"; this._generateWorld(); }
      else if (this.state === "gameover") this._reset();
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    this.canvas.addEventListener("click", this._onClick);
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this.canvas.removeEventListener("click", this._onClick);
  }

  _reset() {
    this.score = 0;
    this.depth = 0;
    this.maxDepth = 0;
    this.gold = 0;
    this.gems = {};
    this.fuel = 100;
    this.maxFuel = 100;
    this.heat = 0;
    this.drillHP = 100;
    this.maxDrillHP = 100;
    this.drillIdx = 0;
    this.depthLevel = 0;
    this.particles = [];
    this.popups = [];
    this.gameOver = false;
    this.state = "playing";
    this._generateWorld();
  }

  _generateWorld() {
    this.gridCols = Math.ceil(this.W / CELL_SIZE);
    this.gridRows = 200; // deep world
    this.grid = [];
    for (let r = 0; r < this.gridRows; r++) {
      const row = [];
      const layerIdx = Math.min(Math.floor(r / 25), LAYER_TYPES.length - 1);
      const layer = LAYER_TYPES[layerIdx];
      for (let c = 0; c < this.gridCols; c++) {
        let cell = { type: "dirt", layer: layerIdx, hardness: layer.hardness, color: layer.color, dug: false, hp: layer.hardness * 10 };
        // Surface row is air
        if (r < 2) { cell = { type: "air", dug: true }; }
        // Gems
        else if (Math.random() < layer.gemChance) {
          const gem = this._pickGem(layerIdx);
          cell = { ...cell, type: "gem", gem };
        }
        // Hazards
        else if (Math.random() < layer.hazardChance) {
          const haz = HAZARD_TYPES[Math.floor(Math.random() * HAZARD_TYPES.length)];
          cell = { ...cell, type: "hazard", hazard: haz };
        }
        row.push(cell);
      }
      this.grid.push(row);
    }
    this.drillX = Math.floor(this.gridCols / 2);
    this.drillY = 1;
    this.camY = 0;
  }

  _pickGem(layerIdx) {
    const boost = layerIdx * 0.05; // deeper = rarer gems more likely
    let roll = Math.random();
    for (let i = GEM_TYPES.length - 1; i >= 0; i--) {
      if (roll < GEM_TYPES[i].rarity + boost * (i > 3 ? 1 : 0)) return GEM_TYPES[i];
      roll -= GEM_TYPES[i].rarity;
    }
    return GEM_TYPES[0];
  }

  _tryUpgrade() {
    if (this.drillIdx >= DRILL_UPGRADES.length - 1) return;
    const next = DRILL_UPGRADES[this.drillIdx + 1];
    if (this.gold >= next.cost) {
      this.gold -= next.cost;
      this.drillIdx++;
      this.popups.push({ text: `Upgraded to ${next.name}!`, timer: 90, color: "#44ff88" });
    }
  }

  _buyFuel() {
    const cost = 20;
    if (this.gold >= cost) {
      this.gold -= cost;
      this.fuel = Math.min(this.fuel + 30, this.maxFuel);
      this.popups.push({ text: "+30 Fuel", timer: 60, color: "#ffdd44" });
    }
  }

  _dig(dx, dy) {
    const nx = this.drillX + dx;
    const ny = this.drillY + dy;
    if (nx < 0 || nx >= this.gridCols || ny < 0 || ny >= this.gridRows) return;
    const cell = this.grid[ny][nx];
    if (cell.type === "air" || cell.dug) {
      this.drillX = nx;
      this.drillY = ny;
      return;
    }

    const drill = DRILL_UPGRADES[this.drillIdx];
    const digPower = drill.power;
    cell.hp -= digPower * 2;
    this.heat += drill.heatRate * cell.hardness * 0.3;
    this.fuel -= drill.fuelUse * 0.2;

    // Digging particles
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: nx * CELL_SIZE + CELL_SIZE / 2,
        y: ny * CELL_SIZE + CELL_SIZE / 2,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        life: 20,
        color: cell.color,
        size: 2 + Math.random() * 3,
      });
    }

    if (cell.hp <= 0) {
      cell.dug = true;
      this.drillX = nx;
      this.drillY = ny;
      this.depth = ny;
      if (ny > this.maxDepth) this.maxDepth = ny;
      this.score += Math.round(cell.hardness * 2);

      // Gem found
      if (cell.type === "gem" && cell.gem) {
        const gem = cell.gem;
        this.gold += gem.value;
        this.score += gem.value;
        this.gems[gem.name] = (this.gems[gem.name] || 0) + 1;
        this.popups.push({ text: `${gem.name}! +${gem.value}g`, timer: 80, color: gem.color });
        // Sparkle
        for (let i = 0; i < 10; i++) {
          this.particles.push({
            x: nx * CELL_SIZE + CELL_SIZE / 2,
            y: ny * CELL_SIZE + CELL_SIZE / 2,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 30,
            color: gem.color,
            size: 3 + Math.random() * 4,
          });
        }
      }

      // Hazard triggered
      if (cell.type === "hazard" && cell.hazard) {
        const haz = cell.hazard;
        this.drillHP -= haz.damage;
        this.shakeTimer = 15;
        this.shakeAmount = 5;
        this.popups.push({ text: `${haz.name}! -${haz.damage}HP`, timer: 60, color: "#ff4444" });
      }
    }

    // Heat management
    if (this.heat >= this.maxHeat) {
      this.drillHP -= 5;
      this.heat = this.maxHeat * 0.7;
      this.popups.push({ text: "OVERHEAT!", timer: 40, color: "#ff8800" });
    }
  }

  update() {
    this.frame++;
    if (this.state !== "playing") return;

    // Movement (throttled)
    if (this.frame % 6 === 0) {
      if (this.keys["w"] || this.keys["arrowup"]) this._dig(0, -1);
      else if (this.keys["s"] || this.keys["arrowdown"]) this._dig(0, 1);
      else if (this.keys["a"] || this.keys["arrowleft"]) this._dig(-1, 0);
      else if (this.keys["d"] || this.keys["arrowright"]) this._dig(1, 0);
    }

    // Heat cooling
    this.heat = Math.max(0, this.heat - 0.15);

    // Fuel check
    if (this.fuel <= 0) {
      this.fuel = 0;
      this.drillHP -= 0.1;
    }

    // Camera follow
    const targetCamY = this.drillY * CELL_SIZE - this.H / 2;
    this.camY += (targetCamY - this.camY) * 0.1;

    // Shake decay
    if (this.shakeTimer > 0) this.shakeTimer--;

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
      this.popups[i].timer--;
      if (this.popups[i].timer <= 0) this.popups.splice(i, 1);
    }

    // Game over check
    if (this.drillHP <= 0) {
      this.drillHP = 0;
      this.gameOver = true;
      this.state = "gameover";
    }
  }

  draw() {
    const { ctx, W, H } = this;
    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);

    if (this.state === "menu") { this._drawMenu(); return; }
    if (this.state === "gameover") { this._drawGameOver(); return; }

    // Shake offset
    const sx = this.shakeTimer > 0 ? (Math.random() - 0.5) * this.shakeAmount : 0;
    const sy = this.shakeTimer > 0 ? (Math.random() - 0.5) * this.shakeAmount : 0;

    ctx.save();
    ctx.translate(sx, sy - this.camY);

    // Draw grid cells visible on screen
    const startRow = Math.max(0, Math.floor(this.camY / CELL_SIZE) - 1);
    const endRow = Math.min(this.gridRows - 1, Math.ceil((this.camY + H) / CELL_SIZE) + 1);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const cell = this.grid[r][c];
        const cx = c * CELL_SIZE;
        const cy = r * CELL_SIZE;

        if (cell.dug || cell.type === "air") {
          // Dug/air — dark background
          ctx.fillStyle = "#0a0808";
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
        } else {
          // Undug
          const layer = LAYER_TYPES[cell.layer];
          ctx.fillStyle = cell.color;
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);

          // Texture
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.fillRect(cx, cy + CELL_SIZE - 2, CELL_SIZE, 2);
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fillRect(cx, cy, CELL_SIZE, 2);

          // Gem sparkle
          if (cell.type === "gem" && cell.gem) {
            ctx.fillStyle = cell.gem.color + "66";
            ctx.beginPath();
            ctx.arc(cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, 6, 0, Math.PI * 2);
            ctx.fill();
            if (this.frame % 30 < 15) {
              ctx.fillStyle = "#fff4";
              ctx.fillRect(cx + CELL_SIZE / 2 - 1, cy + CELL_SIZE / 2 - 4, 2, 8);
              ctx.fillRect(cx + CELL_SIZE / 2 - 4, cy + CELL_SIZE / 2 - 1, 8, 2);
            }
          }

          // Hazard glow
          if (cell.type === "hazard" && cell.hazard) {
            ctx.fillStyle = cell.hazard.color + "33";
            ctx.fillRect(cx + 2, cy + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          }

          // HP indicator for partially dug cells
          if (cell.hp < cell.hardness * 10) {
            const pct = cell.hp / (cell.hardness * 10);
            ctx.strokeStyle = "#fff4";
            ctx.lineWidth = 1;
            // Crack lines
            if (pct < 0.7) {
              ctx.beginPath();
              ctx.moveTo(cx + CELL_SIZE * 0.3, cy + CELL_SIZE * 0.2);
              ctx.lineTo(cx + CELL_SIZE * 0.5, cy + CELL_SIZE * 0.5);
              ctx.lineTo(cx + CELL_SIZE * 0.7, cy + CELL_SIZE * 0.8);
              ctx.stroke();
            }
            if (pct < 0.4) {
              ctx.beginPath();
              ctx.moveTo(cx + CELL_SIZE * 0.6, cy + CELL_SIZE * 0.1);
              ctx.lineTo(cx + CELL_SIZE * 0.4, cy + CELL_SIZE * 0.6);
              ctx.stroke();
            }
          }
        }
      }
    }

    // Draw drill
    const drillPx = this.drillX * CELL_SIZE;
    const drillPy = this.drillY * CELL_SIZE;
    const drill = DRILL_UPGRADES[this.drillIdx];

    // Drill body
    ctx.fillStyle = "#ccaa44";
    ctx.fillRect(drillPx + 4, drillPy + 2, CELL_SIZE - 8, CELL_SIZE - 4);
    // Drill bit
    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.moveTo(drillPx + CELL_SIZE / 2, drillPy + CELL_SIZE + 4);
    ctx.lineTo(drillPx + 8, drillPy + CELL_SIZE - 6);
    ctx.lineTo(drillPx + CELL_SIZE - 8, drillPy + CELL_SIZE - 6);
    ctx.closePath();
    ctx.fill();
    // Cabin
    ctx.fillStyle = "#446688";
    ctx.fillRect(drillPx + 8, drillPy + 4, CELL_SIZE - 16, 10);
    // Drill level indicator
    ctx.fillStyle = drill.power > 3 ? "#ff44ff" : drill.power > 2 ? "#44ff44" : "#888";
    ctx.fillRect(drillPx + CELL_SIZE - 6, drillPy + 6, 3, 6);

    // Particles (in world space)
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // HUD
    this._drawHUD();

    // Popups (screen space)
    for (const pop of this.popups) {
      ctx.globalAlpha = Math.min(1, pop.timer / 30);
      ctx.fillStyle = pop.color;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(pop.text, W / 2, H / 2 - 50 + (90 - pop.timer));
    }
    ctx.globalAlpha = 1;

    // Shop overlay
    if (this.state === "shop") this._drawShop();
  }

  _drawHUD() {
    const { ctx, W, H } = this;
    const drill = DRILL_UPGRADES[this.drillIdx];

    // Top bar
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, W, 36);
    ctx.fillStyle = "#ccaa44";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`DRILL MINER — ${drill.name}`, 8, 22);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(`Score: ${this.score} | Gold: ${this.gold} | Depth: ${this.depth}m`, W / 2, 22);
    ctx.textAlign = "right";
    ctx.fillStyle = "#888";
    ctx.fillText(`[E] Shop`, W - 8, 22);

    // Bottom bars
    const barW = 120, barH = 12, barY = H - 22;
    // HP
    ctx.fillStyle = "#333";
    ctx.fillRect(8, barY, barW, barH);
    ctx.fillStyle = this.drillHP > 30 ? "#44cc44" : "#ff4444";
    ctx.fillRect(8, barY, barW * (this.drillHP / this.maxDrillHP), barH);
    ctx.fillStyle = "#fff";
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${Math.round(this.drillHP)}`, 10, barY + 10);

    // Fuel
    ctx.fillStyle = "#333";
    ctx.fillRect(barW + 16, barY, barW, barH);
    ctx.fillStyle = this.fuel > 20 ? "#ffdd44" : "#ff8800";
    ctx.fillRect(barW + 16, barY, barW * (this.fuel / this.maxFuel), barH);
    ctx.fillStyle = "#fff";
    ctx.fillText(`Fuel: ${Math.round(this.fuel)}`, barW + 18, barY + 10);

    // Heat
    ctx.fillStyle = "#333";
    ctx.fillRect(barW * 2 + 24, barY, barW, barH);
    ctx.fillStyle = this.heat > 70 ? "#ff4400" : this.heat > 40 ? "#ff8844" : "#4488ff";
    ctx.fillRect(barW * 2 + 24, barY, barW * (this.heat / this.maxHeat), barH);
    ctx.fillStyle = "#fff";
    ctx.fillText(`Heat: ${Math.round(this.heat)}`, barW * 2 + 26, barY + 10);
  }

  _drawShop() {
    const { ctx, W, H } = this;
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#ccaa44";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DRILL SHOP", W / 2, 60);

    ctx.fillStyle = "#ffdd44";
    ctx.font = "14px monospace";
    ctx.fillText(`Gold: ${this.gold}`, W / 2, 90);

    // Current drill
    const cur = DRILL_UPGRADES[this.drillIdx];
    ctx.fillStyle = "#aaa";
    ctx.font = "12px monospace";
    ctx.fillText(`Current: ${cur.name} (Power: ${cur.power}x)`, W / 2, 130);

    // Next upgrade
    if (this.drillIdx < DRILL_UPGRADES.length - 1) {
      const next = DRILL_UPGRADES[this.drillIdx + 1];
      ctx.fillStyle = this.gold >= next.cost ? "#44ff88" : "#ff4444";
      ctx.fillText(`[U] Upgrade to ${next.name} — ${next.cost}g (Power: ${next.power}x)`, W / 2, 160);
    } else {
      ctx.fillStyle = "#888";
      ctx.fillText("Max drill level reached!", W / 2, 160);
    }

    // Fuel
    ctx.fillStyle = this.gold >= 20 ? "#ffdd44" : "#888";
    ctx.fillText("[F] Refuel +30 — 20g", W / 2, 190);

    // Gem collection
    ctx.fillStyle = "#aaa";
    ctx.fillText("Gems Collected:", W / 2, 240);
    let y = 260;
    for (const gem of GEM_TYPES) {
      const count = this.gems[gem.name] || 0;
      if (count > 0) {
        ctx.fillStyle = gem.color;
        ctx.fillText(`${gem.name}: ${count}`, W / 2, y);
        y += 18;
      }
    }

    ctx.fillStyle = "#666";
    ctx.font = "11px monospace";
    ctx.fillText("[ESC] Close Shop", W / 2, H - 30);
  }

  _drawMenu() {
    const { ctx, W, H } = this;
    ctx.fillStyle = "#ccaa44";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DRILL MINER", W / 2, H / 2 - 60);
    ctx.fillStyle = "#888";
    ctx.font = "14px monospace";
    ctx.fillText("Dig deep, collect gems, avoid hazards.", W / 2, H / 2 - 20);
    ctx.fillText("Upgrade your drill. How deep can you go?", W / 2, H / 2 + 5);
    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText("WASD/Arrows to dig | E for shop | ESC to quit", W / 2, H / 2 + 35);
    ctx.fillStyle = "#ccaa44";
    ctx.font = "bold 18px monospace";
    ctx.fillText("[ CLICK OR PRESS ENTER TO START ]", W / 2, H / 2 + 70);
  }

  _drawGameOver() {
    const { ctx, W, H } = this;
    ctx.fillStyle = "#ff4444";
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DRILL DESTROYED", W / 2, H / 2 - 60);
    ctx.fillStyle = "#ffdd44";
    ctx.font = "bold 24px monospace";
    ctx.fillText(`Final Score: ${this.score}`, W / 2, H / 2 - 15);
    ctx.fillStyle = "#aaa";
    ctx.font = "14px monospace";
    ctx.fillText(`Max Depth: ${this.maxDepth}m | Gold: ${this.gold}`, W / 2, H / 2 + 15);
    const totalGems = Object.values(this.gems).reduce((a, b) => a + b, 0);
    ctx.fillText(`Gems Collected: ${totalGems}`, W / 2, H / 2 + 40);
    ctx.fillStyle = "#ccaa44";
    ctx.font = "bold 16px monospace";
    ctx.fillText("[ CLICK OR PRESS ENTER TO PLAY AGAIN ]", W / 2, H / 2 + 80);
  }
}
