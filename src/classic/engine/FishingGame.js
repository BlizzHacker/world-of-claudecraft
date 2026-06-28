// FishingGame.js — Standalone fishing mini-game extracted from Cryptic Realm
// Multiple biomes, fish varieties, tournaments, equipment upgrades

const BIOMES = [
  { id:"pond",    name:"Peaceful Pond",    color:"#2a5a3a", waterColor:"#2244aa", fish:[{name:"Minnow",color:"#aaa",val:5,xp:2},{name:"Bass",color:"#448844",val:15,xp:8},{name:"Catfish",color:"#666644",val:25,xp:15}], depth:3 },
  { id:"river",   name:"Rushing River",    color:"#3a4a5a", waterColor:"#3366bb", fish:[{name:"Trout",color:"#cc8844",val:20,xp:10},{name:"Salmon",color:"#cc6644",val:35,xp:20},{name:"Pike",color:"#446644",val:45,xp:25}], depth:4 },
  { id:"ocean",   name:"Deep Ocean",       color:"#1a2a4a", waterColor:"#1133aa", fish:[{name:"Tuna",color:"#4488cc",val:40,xp:25},{name:"Swordfish",color:"#4466aa",val:80,xp:50},{name:"Shark",color:"#446688",val:120,xp:80}], depth:5 },
  { id:"lava",    name:"Lava Lake",        color:"#4a1a1a", waterColor:"#cc3300", fish:[{name:"Fire Eel",color:"#ff4400",val:60,xp:40},{name:"Magma Crab",color:"#cc2200",val:100,xp:70},{name:"Lava Leviathan",color:"#ff2200",val:200,xp:150}], depth:6 },
];

const RODS = [
  { name:"Wooden Rod",  power:1.0, luck:0,   cost:0 },
  { name:"Fiberglass",  power:1.2, luck:0.1, cost:100 },
  { name:"Carbon Fiber", power:1.5, luck:0.2, cost:300 },
  { name:"Enchanted Rod", power:2.0, luck:0.4, cost:800 },
];

const BAITS = [
  { name:"Worm",     attract:1.0, rare:0,    cost:0 },
  { name:"Minnow",   attract:1.2, rare:0.1,  cost:5 },
  { name:"Lure",     attract:1.5, rare:0.2,  cost:15 },
  { name:"Golden Bait", attract:2.0, rare:0.5, cost:50 },
];

export class FishingGame {
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
    this.state = "menu"; // menu, casting, waiting, reeling, caught, tournament
    this.biomeIdx = 0;
    this.rodIdx = 0;
    this.baitIdx = 0;
    this.gold = 200;
    this.xp = 0;
    this.level = 1;
    this.fishCaught = {};
    this.totalCaught = 0;

    // Fishing state
    this.castPower = 0;
    this.casting = false;
    this.lineX = 0;
    this.lineY = 0;
    this.hookDepth = 0;
    this.bobberY = 0;
    this.bobberBob = 0;
    this.biteTimer = 0;
    this.reelProgress = 0;
    this.currentFish = null;
    this.fishFight = 0;
    this.fishDir = 1;
    this.catchMessage = "";
    this.catchTimer = 0;

    // Tournament
    this.tournament = null;
    this.tournamentTimer = 0;
    this.tournamentScore = 0;

    // Particles
    this.particles = [];
    this.ripples = [];

    // Input
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false, click: false };
    this._bindInput();
  }

  _bindInput() {
    this._kd = e => { this.keys[e.key.toLowerCase()] = true; };
    this._ku = e => { this.keys[e.key.toLowerCase()] = false; };
    this._mm = e => { const r = this.canvas.getBoundingClientRect(); this.mouse.x = (e.clientX - r.left) * (this.W / r.width); this.mouse.y = (e.clientY - r.top) * (this.H / r.height); };
    this._md = e => { this.mouse.down = true; this.mouse.click = true; };
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

  _mkRipple(x, y) { this.ripples.push({ x, y, r: 2, maxR: 20 + Math.random() * 15, alpha: 0.6 }); }

  update() {
    this.frame++;
    this.W = this.canvas.width; this.H = this.canvas.height;
    const biome = BIOMES[this.biomeIdx];
    const rod = RODS[this.rodIdx];
    const bait = BAITS[this.baitIdx];

    // Particles
    this.particles = this.particles.filter(p => p.life > 0).map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.1, life: p.life - p.decay, size: p.size * 0.97 }));
    this.ripples = this.ripples.filter(r => r.r < r.maxR).map(r => ({ ...r, r: r.r + 0.8, alpha: r.alpha * 0.95 }));

    if (this.catchTimer > 0) this.catchTimer--;

    if (this.state === "menu") {
      if (this.mouse.click) {
        this.mouse.click = false;
        const cx = this.W / 2;
        // Biome buttons
        for (let i = 0; i < BIOMES.length; i++) {
          const bx = cx - 180 + (i % 2) * 190, by = 140 + Math.floor(i / 2) * 60;
          if (this.mouse.x > bx && this.mouse.x < bx + 170 && this.mouse.y > by && this.mouse.y < by + 48) {
            this.biomeIdx = i; break;
          }
        }
        // Rod buttons
        for (let i = 0; i < RODS.length; i++) {
          const bx = cx - 180 + (i % 2) * 190, by = 280 + Math.floor(i / 2) * 44;
          if (this.mouse.x > bx && this.mouse.x < bx + 170 && this.mouse.y > by && this.mouse.y < by + 36) {
            if (this.gold >= RODS[i].cost || i <= this.rodIdx) this.rodIdx = i; break;
          }
        }
        // Cast button
        if (this.mouse.y > this.H - 60) { this.state = "casting"; this.castPower = 0; this.casting = true; }
        // Tournament button
        if (this.mouse.x > cx - 80 && this.mouse.x < cx + 80 && this.mouse.y > this.H - 100 && this.mouse.y < this.H - 70) {
          this.tournament = { timeLeft: 3600, fish: [] }; this.state = "casting"; this.castPower = 0; this.casting = true;
        }
      }
    }

    if (this.state === "casting") {
      if (this.mouse.down) { this.castPower = Math.min(1, this.castPower + 0.02); }
      else if (this.casting) {
        this.casting = false;
        this.state = "waiting";
        this.lineX = this.W / 2 + (Math.random() - 0.5) * 200 * this.castPower;
        this.lineY = this.H * 0.55 + this.castPower * 100;
        this.hookDepth = this.castPower * biome.depth;
        this.bobberY = this.lineY;
        this.biteTimer = 120 + Math.floor(Math.random() * 240 / bait.attract);
        this._mkRipple(this.lineX, this.lineY);
      }
    }

    if (this.state === "waiting") {
      this.bobberBob = Math.sin(this.frame * 0.05) * 2;
      if (this.frame % 40 === 0) this._mkRipple(this.lineX + (Math.random() - 0.5) * 20, this.bobberY + (Math.random() - 0.5) * 10);

      this.biteTimer--;
      if (this.biteTimer <= 0) {
        // Fish bites!
        const fishPool = biome.fish;
        const rareChance = bait.rare + rod.luck;
        let fishIdx = 0;
        if (Math.random() < rareChance && fishPool.length > 1) fishIdx = Math.min(fishPool.length - 1, 1 + Math.floor(Math.random() * (fishPool.length - 1)));
        else fishIdx = Math.floor(Math.random() * Math.min(2, fishPool.length));
        this.currentFish = { ...fishPool[fishIdx] };
        this.fishFight = 100;
        this.fishDir = Math.random() > 0.5 ? 1 : -1;
        this.state = "reeling";
        this.reelProgress = 0;
      }
      // Click to reel in empty
      if (this.mouse.click) { this.mouse.click = false; this.state = "menu"; }
    }

    if (this.state === "reeling") {
      // Fish fights
      this.fishDir = Math.random() > 0.95 ? -this.fishDir : this.fishDir;
      this.fishFight -= 0.3 * rod.power;
      if (this.mouse.down) {
        this.reelProgress += 1.5 * rod.power;
        this.fishFight += 0.5;
      } else {
        this.reelProgress -= 0.5 + (this.fishFight > 0 ? 0.3 : 0);
      }
      this.reelProgress = Math.max(0, Math.min(100, this.reelProgress));

      if (this.reelProgress >= 100) {
        // Caught!
        this.state = "caught";
        const fish = this.currentFish;
        this.gold += fish.val;
        this.xp += fish.xp;
        this.score += fish.val;
        this.totalCaught++;
        this.fishCaught[fish.name] = (this.fishCaught[fish.name] || 0) + 1;
        this.catchMessage = `Caught ${fish.name}! +${fish.val}g +${fish.xp}xp`;
        this.catchTimer = 180;
        if (this.tournament) { this.tournament.fish.push(fish); this.tournamentScore += fish.val; }
        for (let i = 0; i < 15; i++) this.particles.push({ x: this.lineX, y: this.bobberY, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3, life: 1, decay: 0.02, size: 2 + Math.random() * 3, color: fish.color });
        this._mkRipple(this.lineX, this.bobberY);
        // Level up check
        const xpNeeded = this.level * 50;
        if (this.xp >= xpNeeded) { this.xp -= xpNeeded; this.level++; }
      }
      if (this.fishFight <= 0 && this.reelProgress < 20) {
        // Fish escaped
        this.catchMessage = `${this.currentFish.name} got away!`;
        this.catchTimer = 120;
        this.state = "menu";
      }
    }

    if (this.state === "caught") {
      if (this.mouse.click) { this.mouse.click = false; this.state = "casting"; this.castPower = 0; this.casting = true; }
    }

    // Tournament timer
    if (this.tournament) {
      this.tournament.timeLeft--;
      if (this.tournament.timeLeft <= 0) {
        this.catchMessage = `Tournament Over! Score: ${this.tournamentScore}`;
        this.catchTimer = 300;
        this.gold += this.tournamentScore;
        this.tournament = null;
        this.state = "menu";
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const biome = BIOMES[this.biomeIdx];

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    skyGrad.addColorStop(0, "#0a1628"); skyGrad.addColorStop(1, biome.color);
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H * 0.5);

    // Water
    const waterGrad = ctx.createLinearGradient(0, H * 0.5, 0, H);
    waterGrad.addColorStop(0, biome.waterColor); waterGrad.addColorStop(1, "#050510");
    ctx.fillStyle = waterGrad; ctx.fillRect(0, H * 0.5, W, H * 0.5);

    // Water waves
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      for (let x = 0; x < W; x += 4) {
        const y = H * 0.5 + i * 20 + Math.sin(x * 0.02 + this.frame * 0.03 + i) * 3;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Ripples
    for (const r of this.ripples) {
      ctx.strokeStyle = `rgba(255,255,255,${r.alpha * 0.3})`;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Fisherman
    const fmX = W / 2, fmY = H * 0.45;
    ctx.fillStyle = "#553322"; ctx.fillRect(fmX - 8, fmY - 30, 16, 30);
    ctx.fillStyle = "#eebb88"; ctx.beginPath(); ctx.arc(fmX, fmY - 38, 8, 0, Math.PI * 2); ctx.fill();
    // Rod
    ctx.strokeStyle = "#886644"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fmX + 8, fmY - 25); ctx.lineTo(fmX + 80, fmY - 60); ctx.stroke();

    // Fishing line
    if (this.state === "waiting" || this.state === "reeling") {
      ctx.strokeStyle = "#ffffff44"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fmX + 80, fmY - 60); ctx.lineTo(this.lineX, this.bobberY + this.bobberBob); ctx.stroke();
      // Bobber
      ctx.fillStyle = "#ff4444";
      const by = this.bobberY + this.bobberBob + (this.state === "reeling" ? Math.sin(this.frame * 0.3) * 4 : 0);
      ctx.beginPath(); ctx.arc(this.lineX, by, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(this.lineX, by - 5, 3, 0, Math.PI, true); ctx.fill();
    }

    // Casting power bar
    if (this.state === "casting" && this.casting) {
      ctx.fillStyle = "#1a1a2a"; ctx.fillRect(W / 2 - 50, H - 40, 100, 12);
      ctx.fillStyle = `hsl(${120 - this.castPower * 120},80%,50%)`;
      ctx.fillRect(W / 2 - 49, H - 39, 98 * this.castPower, 10);
    }

    // Reeling progress
    if (this.state === "reeling") {
      ctx.fillStyle = "#1a1a2a"; ctx.fillRect(W / 2 - 80, H - 50, 160, 16);
      ctx.fillStyle = "#44cc44";
      ctx.fillRect(W / 2 - 79, H - 49, 158 * (this.reelProgress / 100), 14);
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(W / 2 - 79 + 158 * (this.reelProgress / 100), H - 49, 158 * Math.max(0, this.fishFight / 100) * 0.3, 14);
      ctx.fillStyle = "#fff"; ctx.font = "9px monospace"; ctx.textAlign = "center";
      ctx.fillText("HOLD CLICK TO REEL", W / 2, H - 56);
    }

    // Catch message
    if (this.catchTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.catchTimer / 30);
      ctx.fillStyle = "#ffdd44"; ctx.font = "bold 16px monospace"; ctx.textAlign = "center";
      ctx.fillText(this.catchMessage, W / 2, H * 0.3);
      ctx.globalAlpha = 1;
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, W, 28);
    ctx.fillStyle = "#44aaff"; ctx.font = "bold 11px monospace"; ctx.textAlign = "left";
    ctx.fillText(`🎣 ${biome.name} | Lv.${this.level} | Gold: ${this.gold} | Caught: ${this.totalCaught}`, 10, 18);
    ctx.textAlign = "right";
    ctx.fillText(`Rod: ${RODS[this.rodIdx].name} | Bait: ${BAITS[this.baitIdx].name}`, W - 10, 18);

    if (this.tournament) {
      ctx.fillStyle = "#ffaa44"; ctx.textAlign = "center";
      ctx.fillText(`TOURNAMENT: ${Math.ceil(this.tournament.timeLeft / 60)}s left | Score: ${this.tournamentScore}`, W / 2, 42);
    }

    // Menu state info
    if (this.state === "menu") {
      const cx = W / 2;
      ctx.fillStyle = "#888"; ctx.font = "10px monospace"; ctx.textAlign = "center";
      ctx.fillText("SELECT BIOME:", cx, 135);
      BIOMES.forEach((b, i) => {
        const bx = cx - 180 + (i % 2) * 190, by = 140 + Math.floor(i / 2) * 60;
        ctx.fillStyle = this.biomeIdx === i ? `${b.waterColor}44` : "#1a1a2a";
        ctx.fillRect(bx, by, 170, 48);
        ctx.strokeStyle = this.biomeIdx === i ? b.waterColor : "#334455";
        ctx.strokeRect(bx, by, 170, 48);
        ctx.fillStyle = this.biomeIdx === i ? "#fff" : "#888"; ctx.font = "bold 11px monospace"; ctx.textAlign = "left";
        ctx.fillText(b.name, bx + 8, by + 18);
        ctx.fillStyle = "#666"; ctx.font = "8px monospace";
        ctx.fillText(`Fish: ${b.fish.map(f => f.name).join(", ")}`, bx + 8, by + 34);
      });

      ctx.fillStyle = "#888"; ctx.font = "10px monospace"; ctx.textAlign = "center";
      ctx.fillText("RODS:", cx, 275);
      RODS.forEach((r, i) => {
        const bx = cx - 180 + (i % 2) * 190, by = 280 + Math.floor(i / 2) * 44;
        const owned = i <= this.rodIdx;
        ctx.fillStyle = this.rodIdx === i ? "#2a3a2a" : "#1a1a2a";
        ctx.fillRect(bx, by, 170, 36);
        ctx.strokeStyle = this.rodIdx === i ? "#44cc44" : "#334455";
        ctx.strokeRect(bx, by, 170, 36);
        ctx.fillStyle = owned ? "#fff" : "#888"; ctx.font = "10px monospace"; ctx.textAlign = "left";
        ctx.fillText(`${r.name} (x${r.power})`, bx + 8, by + 15);
        ctx.fillStyle = "#666"; ctx.font = "8px monospace";
        ctx.fillText(owned ? "OWNED" : `Cost: ${r.cost}g`, bx + 8, by + 28);
      });

      // Cast button
      ctx.fillStyle = "#44aa4422"; ctx.fillRect(cx - 80, H - 60, 160, 40);
      ctx.strokeStyle = "#44cc44"; ctx.strokeRect(cx - 80, H - 60, 160, 40);
      ctx.fillStyle = "#44cc44"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
      ctx.fillText("🎣 CAST LINE", cx, H - 34);

      // Tournament button
      ctx.fillStyle = "#cc884422"; ctx.fillRect(cx - 80, H - 100, 160, 26);
      ctx.strokeStyle = "#cc8844"; ctx.strokeRect(cx - 80, H - 100, 160, 26);
      ctx.fillStyle = "#cc8844"; ctx.font = "bold 10px monospace";
      ctx.fillText("🏆 TOURNAMENT (60s)", cx, H - 82);
    }
  }
}
