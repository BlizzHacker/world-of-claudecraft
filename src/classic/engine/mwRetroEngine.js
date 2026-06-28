// mwRetroEngine.js - SNES/N64/PS1 era rendering engine
// Makes 2D canvas games look and feel like classic console games
// CRT scanlines, Mode 7, sprite animation, retro color palettes, game juice

// ============================================================
// CRT SCANLINE OVERLAY - The #1 thing that makes it feel retro
// ============================================================
export class CRTEffect {
  constructor(width, height) {
    const safeWidth = Number.isFinite(width) && width > 0 ? Math.round(width) : 1;
    const safeHeight = Number.isFinite(height) && height > 0 ? Math.round(height) : 1;
    this.W = safeWidth;
    this.H = safeHeight;
    this.scanlineIntensity = 0.15;
    this.curvature = 0.02;
    this.chromaticAberration = 1.5; // pixels of RGB split
    this.vignetteStrength = 0.4;
    this.flickerSpeed = 0;
    
    // Pre-render scanline overlay for performance
    this.scanlineCanvas = document.createElement('canvas');
    this.scanlineCanvas.width = safeWidth;
    this.scanlineCanvas.height = safeHeight;
    const sctx = this.scanlineCanvas.getContext('2d');
    
    // Horizontal scanlines
    for (let y = 0; y < safeHeight; y += 2) {
      sctx.fillStyle = `rgba(0,0,0,${this.scanlineIntensity})`;
      sctx.fillRect(0, y, safeWidth, 1);
    }
    
    // Vertical phosphor mask (subtle)
    for (let x = 0; x < safeWidth; x += 3) {
      sctx.fillStyle = `rgba(0,0,0,0.04)`;
      sctx.fillRect(x, 0, 1, safeHeight);
    }
    
    // Pre-render vignette
    this.vignetteCanvas = document.createElement('canvas');
    this.vignetteCanvas.width = safeWidth;
    this.vignetteCanvas.height = safeHeight;
    const vctx = this.vignetteCanvas.getContext('2d');
    const grad = vctx.createRadialGradient(
      safeWidth / 2,
      safeHeight / 2,
      safeHeight * 0.3,
      safeWidth / 2,
      safeHeight / 2,
      safeHeight * 0.8
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${this.vignetteStrength})`);
    vctx.fillStyle = grad;
    vctx.fillRect(0, 0, safeWidth, safeHeight);
  }
  
  apply(ctx, time = 0) {
    // Draw scanlines
    ctx.drawImage(this.scanlineCanvas, 0, 0);
    
    // Chromatic aberration - subtle RGB offset
    if (this.chromaticAberration > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.06;
      ctx.drawImage(ctx.canvas, this.chromaticAberration, 0);
      ctx.globalAlpha = 0.04;
      ctx.drawImage(ctx.canvas, -this.chromaticAberration, 0);
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }
    
    // Vignette
    ctx.drawImage(this.vignetteCanvas, 0, 0);
    
    // Subtle flicker
    if (this.flickerSpeed > 0) {
      const flicker = Math.sin(time * this.flickerSpeed) * 0.02;
      ctx.fillStyle = `rgba(255,255,255,${Math.abs(flicker)})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }
  
  // Intense screen damage effect (big hit, boss attack)
  screenTear(ctx, intensity = 1.0) {
    const slices = Math.floor(3 + intensity * 8);
    for (let i = 0; i < slices; i++) {
      const y = Math.random() * this.H;
      const h = 2 + Math.random() * 6 * intensity;
      const offset = (Math.random() - 0.5) * 20 * intensity;
      ctx.drawImage(ctx.canvas, 0, y, this.W, h, offset, y, this.W, h);
    }
  }
}

// ============================================================
// MODE 7 - SNES pseudo-3D floor/ceiling (F-Zero, Mario Kart)
// ============================================================
export class Mode7Renderer {
  constructor(width, height) {
    this.W = width;
    this.H = height;
    this.horizon = height * 0.4;
    this.floorColor1 = '#1a1a3a';
    this.floorColor2 = '#0a0a2a';
    this.gridColor = '#3344aa';
    this.gridSpacing = 64;
    this.speed = 0;
    this.angle = 0;
    this.scrollX = 0;
    this.scrollY = 0;
    this.textureCanvas = document.createElement('canvas');
    this.textureCanvas.width = 512;
    this.textureCanvas.height = 512;
    this.textureCtx = this.textureCanvas.getContext('2d');
    this._generateDefaultTexture();
  }
  
  _generateDefaultTexture() {
    const tc = this.textureCtx;
    const s = 64;
    for (let y = 0; y < 512; y += s) {
      for (let x = 0; x < 512; x += s) {
        const dark = ((x/s + y/s) % 2 === 0);
        tc.fillStyle = dark ? this.floorColor1 : this.floorColor2;
        tc.fillRect(x, y, s, s);
        tc.strokeStyle = this.gridColor + '44';
        tc.lineWidth = 1;
        tc.strokeRect(x, y, s, s);
      }
    }
  }
  
  setTexture(canvas) {
    this.textureCtx.drawImage(canvas, 0, 0, 512, 512);
  }
  
  setColors(floor1, floor2, grid) {
    this.floorColor1 = floor1;
    this.floorColor2 = floor2;
    this.gridColor = grid;
    this._generateDefaultTexture();
  }
  
  render(ctx, cameraX, cameraY, cameraAngle, fov = 200) {
    const W = this.W;
    const H = this.H;
    const horizon = this.horizon;
    
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, '#0a0020');
    skyGrad.addColorStop(0.5, '#1a0a3a');
    skyGrad.addColorStop(1, '#2a1a5a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizon);
    
    // Stars in sky
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + 43) % W);
      const sy = ((i * 89 + 17) % (horizon * 0.8));
      const bright = (Math.sin(Date.now() * 0.001 + i) + 1) * 0.5;
      ctx.globalAlpha = 0.3 + bright * 0.7;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1.0;
    
    // Mode 7 floor rendering
    const cos = Math.cos(cameraAngle);
    const sin = Math.sin(cameraAngle);
    
    for (let screenY = Math.floor(horizon); screenY < H; screenY++) {
      const p = (screenY - horizon) / (H - horizon);
      if (p <= 0) continue;
      
      const z = fov / (p + 0.001);
      const rowAlpha = Math.min(1.0, 1.0 - p * 0.5);
      
      for (let screenX = 0; screenX < W; screenX += 2) {
        const dx = (screenX - W/2) * z / fov;
        const dy = z;
        
        const worldX = cameraX + dx * cos - dy * sin;
        const worldY = cameraY + dx * sin + dy * cos;
        
        // Checkerboard pattern
        const tileSize = this.gridSpacing;
        const tx = Math.floor(worldX / tileSize);
        const ty = Math.floor(worldY / tileSize);
        const isLight = (tx + ty) % 2 === 0;
        
        ctx.fillStyle = isLight ? this.floorColor1 : this.floorColor2;
        ctx.globalAlpha = rowAlpha;
        ctx.fillRect(screenX, screenY, 2, 1);
        
        // Grid lines
        if (worldX % tileSize < 2 || worldY % tileSize < 2) {
          ctx.fillStyle = this.gridColor;
          ctx.globalAlpha = rowAlpha * 0.6;
          ctx.fillRect(screenX, screenY, 2, 1);
        }
      }
    }
    ctx.globalAlpha = 1.0;
  }
}

// ============================================================
// SPRITE ANIMATOR - Proper frame-based animation like SNES
// ============================================================
export class SpriteAnimator {
  constructor(frames, fps = 8) {
    this.frames = frames; // Array of {img, x, y, w, h} or Image objects
    this.fps = fps;
    this.currentFrame = 0;
    this.elapsed = 0;
    this.loop = true;
    this.playing = true;
    this.onComplete = null;
  }
  
  update(dt) {
    if (!this.playing || this.frames.length <= 1) return;
    this.elapsed += dt;
    const frameTime = 1.0 / this.fps;
    if (this.elapsed >= frameTime) {
      this.elapsed -= frameTime;
      this.currentFrame++;
      if (this.currentFrame >= this.frames.length) {
        if (this.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = this.frames.length - 1;
          this.playing = false;
          if (this.onComplete) this.onComplete();
        }
      }
    }
  }
  
  draw(ctx, x, y, w, h, flipX = false) {
    const frame = this.frames[this.currentFrame];
    if (!frame) return;
    ctx.save();
    if (flipX) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      x = 0; y = 0;
    }
    if (frame instanceof Image || frame instanceof HTMLImageElement) {
      ctx.drawImage(frame, x, y, w, h);
    } else if (frame.img) {
      ctx.drawImage(frame.img, frame.x || 0, frame.y || 0, frame.w || w, frame.h || h, x, y, w, h);
    }
    ctx.restore();
  }
  
  getCurrentFrame() {
    return this.currentFrame;
  }
  
  reset() {
    this.currentFrame = 0;
    this.elapsed = 0;
    this.playing = true;
  }
}

// ============================================================
// GAME JUICE - The stuff that makes games FEEL good
// ============================================================
export class GameJuice {
  constructor(width, height) {
    this.W = width;
    this.H = height;
    this.hitstopFrames = 0;
    this.screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };
    this.scorePopups = [];
    this.comboCounter = 0;
    this.comboTimer = 0;
    this.comboTimeout = 2.0;
    this.freezeFrames = 0;
    this.flashColor = null;
    this.flashAlpha = 0;
    this.transition = null; // {type, progress, duration, callback}
  }
  
  // Hitstop - freeze game for N frames on hit (Street Fighter style)
  hitstop(frames = 4) {
    this.hitstopFrames = Math.max(this.hitstopFrames, frames);
  }
  
  // Screen shake
  shake(intensity = 8) {
    this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
  }
  
  // Score popup floating text
  scorePopup(x, y, text, color = '#ffdd00', size = 16) {
    this.scorePopups.push({
      x, y, text, color, size,
      vy: -2, alpha: 1.0, life: 1.5, elapsed: 0,
      scale: 1.5, targetScale: 1.0
    });
  }
  
  // Combo counter
  addCombo(x, y) {
    this.comboCounter++;
    this.comboTimer = this.comboTimeout;
    if (this.comboCounter >= 3) {
      this.scorePopup(x, y - 30, `${this.comboCounter}x COMBO!`, '#ff4444', 20);
    }
    if (this.comboCounter >= 5) {
      this.scorePopup(x, y - 55, 'AMAZING!', '#ff88ff', 24);
      this.flash('#ff88ff', 0.3);
    }
    if (this.comboCounter >= 10) {
      this.scorePopup(x, y - 80, 'GODLIKE!', '#ffdd00', 28);
      this.shake(15);
      this.flash('#ffdd00', 0.5);
    }
  }
  
  // Screen flash
  flash(color = '#ffffff', alpha = 0.5) {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }
  
  // Freeze frame (dramatic pause)
  freeze(frames = 8) {
    this.freezeFrames = Math.max(this.freezeFrames, frames);
  }
  
  // Screen transition
  startTransition(type, duration = 0.5, callback = null) {
    this.transition = { type, progress: 0, duration, callback, phase: 'in' };
  }
  
  // Returns true if game should skip this frame (hitstop/freeze)
  shouldSkipFrame() {
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
      return true;
    }
    if (this.freezeFrames > 0) {
      this.freezeFrames--;
      return true;
    }
    return false;
  }
  
  update(dt) {
    // Screen shake decay
    if (this.screenShake.intensity > 0.1) {
      this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity * 2;
      this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity * 2;
      this.screenShake.intensity *= this.screenShake.decay;
    } else {
      this.screenShake.x = 0;
      this.screenShake.y = 0;
      this.screenShake.intensity = 0;
    }
    
    // Flash decay
    if (this.flashAlpha > 0) {
      this.flashAlpha -= dt * 3;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }
    
    // Score popups
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const p = this.scorePopups[i];
      p.elapsed += dt;
      p.y += p.vy;
      p.vy -= dt * 2; // Float up and slow
      p.alpha = 1.0 - (p.elapsed / p.life);
      p.scale += (p.targetScale - p.scale) * 0.1;
      if (p.elapsed >= p.life) this.scorePopups.splice(i, 1);
    }
    
    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCounter = 0;
      }
    }
    
    // Transition
    if (this.transition) {
      this.transition.progress += dt / this.transition.duration;
      if (this.transition.progress >= 1.0) {
        if (this.transition.phase === 'in') {
          if (this.transition.callback) this.transition.callback();
          this.transition.phase = 'out';
          this.transition.progress = 0;
        } else {
          this.transition = null;
        }
      }
    }
  }
  
  applyShake(ctx) {
    ctx.translate(this.screenShake.x, this.screenShake.y);
  }
  
  drawOverlays(ctx) {
    // Score popups
    for (const p of this.scorePopups) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.font = `bold ${Math.floor(p.size * p.scale)}px monospace`;
      ctx.textAlign = 'center';
      // Shadow
      ctx.fillStyle = '#000000';
      ctx.fillText(p.text, p.x + 2, p.y + 2);
      // Text
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
    
    // Flash
    if (this.flashAlpha > 0 && this.flashColor) {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1.0;
    }
    
    // Transition
    if (this.transition) {
      this._drawTransition(ctx);
    }
  }
  
  _drawTransition(ctx) {
    const t = this.transition;
    const p = Math.min(t.progress, 1.0);
    
    switch (t.type) {
      case 'fade':
        ctx.globalAlpha = t.phase === 'in' ? p : 1.0 - p;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.W, this.H);
        ctx.globalAlpha = 1.0;
        break;
        
      case 'wipe':
        const wipeX = t.phase === 'in' ? p * this.W : (1.0 - p) * this.W;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, wipeX, this.H);
        break;
        
      case 'circle':
        const maxR = Math.sqrt(this.W * this.W + this.H * this.H) / 2;
        const r = t.phase === 'in' ? maxR * (1.0 - p) : maxR * p;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.W, this.H);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(this.W/2, this.H/2, Math.max(r, 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        break;
        
      case 'diamond':
        ctx.fillStyle = '#000';
        const size = t.phase === 'in' ? p : 1.0 - p;
        const half = Math.max(this.W, this.H) * size;
        ctx.beginPath();
        ctx.moveTo(this.W/2, this.H/2 - half);
        ctx.lineTo(this.W/2 + half, this.H/2);
        ctx.lineTo(this.W/2, this.H/2 + half);
        ctx.lineTo(this.W/2 - half, this.H/2);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }
  
  // Draw retro-style health bar (SNES style)
  drawHealthBar(ctx, x, y, width, height, value, maxValue, color = '#44ff44', bgColor = '#330000') {
    const pct = Math.max(0, value / maxValue);
    
    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);
    
    // Health fill with gradient
    const grad = ctx.createLinearGradient(x, y, x, y + height);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, this._lighten(color, 40));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, (width - 2) * pct, height - 2);
    
    // Shine highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x + 1, y + 1, (width - 2) * pct, Math.floor(height / 3));
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Low health warning pulse
    if (pct < 0.25) {
      const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.3;
      ctx.fillStyle = `rgba(255,0,0,${pulse})`;
      ctx.fillRect(x + 1, y + 1, (width - 2) * pct, height - 2);
    }
  }
  
  // Draw retro score display
  drawScore(ctx, x, y, score, label = 'SCORE', color = '#ffffff') {
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 2);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = color;
    ctx.fillText(score.toString().padStart(8, '0'), x, y + 16);
  }
  
  // Draw pixel-art life icons
  drawLives(ctx, x, y, lives, iconSize = 16, color = '#ff4444') {
    for (let i = 0; i < lives; i++) {
      const lx = x + i * (iconSize + 4);
      // Heart shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lx + iconSize * 0.3, y + iconSize * 0.35, iconSize * 0.25, 0, Math.PI * 2);
      ctx.arc(lx + iconSize * 0.7, y + iconSize * 0.35, iconSize * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(lx + iconSize * 0.05, y + iconSize * 0.4);
      ctx.lineTo(lx + iconSize * 0.5, y + iconSize * 0.9);
      ctx.lineTo(lx + iconSize * 0.95, y + iconSize * 0.4);
      ctx.fill();
    }
  }
  
  _lighten(hex, amount) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }
}

// ============================================================
// PIXEL ART CHARACTER RENDERER - Draws proper characters
// ============================================================
export class PixelCharacter {
  constructor(x, y, palette) {
    this.x = x;
    this.y = y;
    this.palette = palette || {
      skin: '#ffcc99',
      hair: '#442200',
      shirt: '#2244aa',
      pants: '#1a1a4a',
      shoes: '#332211',
      eyes: '#ffffff',
      pupils: '#000000'
    };
    this.scale = 3;
    this.facing = 1; // 1 = right, -1 = left
    this.animFrame = 0;
    this.animTimer = 0;
    this.state = 'idle'; // idle, walk, run, jump, attack, hurt
    this.shadowEnabled = true;
  }
  
  update(dt) {
    this.animTimer += dt;
    const fps = this.state === 'run' ? 12 : this.state === 'walk' ? 8 : 4;
    if (this.animTimer >= 1.0 / fps) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }
  
  draw(ctx) {
    const s = this.scale;
    const x = this.x;
    const y = this.y;
    const f = this.facing;
    const p = this.palette;
    const frame = this.animFrame;
    
    ctx.save();
    ctx.translate(x, y);
    if (f < 0) ctx.scale(-1, 1);
    
    // Shadow
    if (this.shadowEnabled) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 2 * s, 5 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Leg animation offset
    const legOffset = this.state === 'walk' || this.state === 'run' 
      ? Math.sin(frame * Math.PI / 2) * 3 * s : 0;
    
    // Body bob for walking
    const bodyBob = this.state === 'walk' || this.state === 'run'
      ? Math.abs(Math.sin(frame * Math.PI / 2)) * s : 0;
    
    // Jump offset
    const jumpOff = this.state === 'jump' ? -4 * s : 0;
    
    const by = -bodyBob + jumpOff;
    
    // Left leg
    ctx.fillStyle = p.pants;
    ctx.fillRect(-3*s, (-2+by)*s, 3*s, 5*s + legOffset);
    ctx.fillStyle = p.shoes;
    ctx.fillRect(-3*s, (3+by)*s + legOffset, 3*s, 2*s);
    
    // Right leg
    ctx.fillStyle = p.pants;
    ctx.fillRect(0, (-2+by)*s, 3*s, 5*s - legOffset);
    ctx.fillStyle = p.shoes;
    ctx.fillRect(0, (3+by)*s - legOffset, 3*s, 2*s);
    
    // Torso
    ctx.fillStyle = p.shirt;
    ctx.fillRect(-4*s, (-8+by)*s, 8*s, 7*s);
    
    // Belt
    ctx.fillStyle = '#443322';
    ctx.fillRect(-4*s, (-2+by)*s, 8*s, s);
    
    // Arms
    const armSwing = this.state === 'walk' || this.state === 'run'
      ? Math.sin(frame * Math.PI / 2) * 2 * s : 0;
    
    if (this.state === 'attack') {
      // Extended attack arm
      ctx.fillStyle = p.shirt;
      ctx.fillRect(4*s, (-7+by)*s, 4*s, 3*s);
      ctx.fillStyle = p.skin;
      ctx.fillRect(8*s, (-7+by)*s, 3*s, 3*s);
      // Weapon
      ctx.fillStyle = '#aaaacc';
      ctx.fillRect(11*s, (-9+by)*s, 2*s, 7*s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11*s, (-9+by)*s, 2*s, s);
    } else {
      // Left arm
      ctx.fillStyle = p.shirt;
      ctx.fillRect(-5*s, (-7+by)*s, 2*s, 4*s - armSwing);
      ctx.fillStyle = p.skin;
      ctx.fillRect(-5*s, (-3+by)*s - armSwing, 2*s, 2*s);
      
      // Right arm
      ctx.fillStyle = p.shirt;
      ctx.fillRect(3*s, (-7+by)*s, 2*s, 4*s + armSwing);
      ctx.fillStyle = p.skin;
      ctx.fillRect(3*s, (-3+by)*s + armSwing, 2*s, 2*s);
    }
    
    // Head
    ctx.fillStyle = p.skin;
    ctx.fillRect(-3*s, (-13+by)*s, 6*s, 5*s);
    
    // Hair
    ctx.fillStyle = p.hair;
    ctx.fillRect(-3*s, (-14+by)*s, 7*s, 3*s);
    ctx.fillRect(-4*s, (-13+by)*s, s, 4*s);
    
    // Eyes
    ctx.fillStyle = p.eyes;
    ctx.fillRect(-1*s, (-11+by)*s, 2*s, 2*s);
    ctx.fillRect(2*s, (-11+by)*s, 2*s, 2*s);
    ctx.fillStyle = p.pupils;
    ctx.fillRect(0, (-10+by)*s, s, s);
    ctx.fillRect(3*s, (-10+by)*s, s, s);
    
    // Hurt flash
    if (this.state === 'hurt') {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(-5*s, (-14+by)*s, 14*s, 19*s);
      ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();
  }
}

// ============================================================
// RETRO HUD - SNES-style heads-up display
// ============================================================
export class RetroHUD {
  constructor(width, height) {
    this.W = width;
    this.H = height;
    this.panels = [];
  }
  
  drawPanel(ctx, x, y, w, h, options = {}) {
    const { bg = 'rgba(0,0,20,0.85)', border = '#4488ff', borderWidth = 2, title = null, glow = false } = options;
    
    // Panel background
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    
    // Inner gradient
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    
    // Border with glow
    if (glow) {
      ctx.shadowColor = border;
      ctx.shadowBlur = 8;
    }
    ctx.strokeStyle = border;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;
    
    // Corner accents
    const c = 4;
    ctx.fillStyle = border;
    ctx.fillRect(x, y, c, c);
    ctx.fillRect(x + w - c, y, c, c);
    ctx.fillRect(x, y + h - c, c, c);
    ctx.fillRect(x + w - c, y + h - c, c, c);
    
    // Title
    if (title) {
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = border;
      ctx.textAlign = 'left';
      ctx.fillText(title, x + 6, y - 4);
    }
  }
  
  drawText(ctx, text, x, y, options = {}) {
    const { size = 14, color = '#ffffff', shadow = true, align = 'left', font = 'monospace', bold = true } = options;
    ctx.textAlign = align;
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
    
    if (shadow) {
      ctx.fillStyle = '#000000';
      ctx.fillText(text, x + 1, y + 1);
      ctx.fillText(text, x + 2, y + 2);
    }
    
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
  
  // Animated number counter
  drawAnimatedNumber(ctx, value, x, y, options = {}) {
    const { size = 18, color = '#ffdd00', prefix = '', suffix = '' } = options;
    const display = prefix + Math.floor(value).toString().padStart(6, '0') + suffix;
    this.drawText(ctx, display, x, y, { size, color, align: 'left' });
  }
  
  // Power meter (energy bar with segments)
  drawPowerMeter(ctx, x, y, w, h, value, max, segments = 10, color = '#44aaff') {
    const segW = (w - (segments - 1) * 2) / segments;
    const filled = Math.ceil((value / max) * segments);
    
    for (let i = 0; i < segments; i++) {
      const sx = x + i * (segW + 2);
      if (i < filled) {
        const grad = ctx.createLinearGradient(sx, y, sx, y + h);
        grad.addColorStop(0, this._lighten(color, 60));
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, this._darken(color, 40));
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = 'rgba(40,40,60,0.6)';
      }
      ctx.fillRect(sx, y, segW, h);
      
      // Shine
      if (i < filled) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(sx, y, segW, h * 0.3);
      }
    }
  }
  
  _lighten(hex, amount) {
    try {
      const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
      const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
      const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
      return `rgb(${r},${g},${b})`;
    } catch { return hex; }
  }
  
  _darken(hex, amount) {
    try {
      const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
      const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
      const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
      return `rgb(${r},${g},${b})`;
    } catch { return hex; }
  }
}

// ============================================================
// WAVE/LEVEL SYSTEM - Structured game progression
// ============================================================
export class WaveSystem {
  constructor() {
    this.wave = 1;
    this.enemiesRemaining = 0;
    this.enemiesTotal = 0;
    this.waveTimer = 0;
    this.betweenWaves = true;
    this.countdownTimer = 3.0;
    this.difficultyScale = 1.0;
    this.onWaveStart = null;
    this.onWaveComplete = null;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.5;
  }
  
  startWave(waveNumber, enemyCount, spawnData) {
    this.wave = waveNumber;
    this.enemiesTotal = enemyCount;
    this.enemiesRemaining = enemyCount;
    this.betweenWaves = false;
    this.difficultyScale = 1.0 + (waveNumber - 1) * 0.15;
    this.spawnQueue = Array(enemyCount).fill(null).map((_, i) => ({
      ...spawnData,
      delay: i * this.spawnInterval,
      hp: Math.floor((spawnData.hp || 3) * this.difficultyScale),
      speed: (spawnData.speed || 1) * (1 + (waveNumber - 1) * 0.05)
    }));
    this.spawnTimer = 0;
    if (this.onWaveStart) this.onWaveStart(waveNumber);
  }
  
  update(dt, spawnCallback) {
    if (this.betweenWaves) {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.betweenWaves = false;
      }
      return;
    }
    
    // Spawn enemies from queue
    if (this.spawnQueue.length > 0) {
      this.spawnTimer += dt;
      while (this.spawnQueue.length > 0 && this.spawnTimer >= this.spawnQueue[0].delay) {
        const data = this.spawnQueue.shift();
        if (spawnCallback) spawnCallback(data);
      }
    }
  }
  
  enemyKilled() {
    this.enemiesRemaining--;
    if (this.enemiesRemaining <= 0) {
      this.betweenWaves = true;
      this.countdownTimer = 3.0;
      if (this.onWaveComplete) this.onWaveComplete(this.wave);
      this.wave++;
    }
  }
  
  drawHUD(ctx, juice, x, y) {
    juice.drawScore(ctx, x, y, this.wave, 'WAVE', '#44aaff');
    
    // Progress bar
    const barW = 120;
    const barH = 8;
    const pct = this.enemiesRemaining / this.enemiesTotal;
    ctx.fillStyle = '#330000';
    ctx.fillRect(x, y + 22, barW, barH);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(x, y + 22, barW * (1 - pct), barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + 22, barW, barH);
    
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.enemiesRemaining} remaining`, x, y + 44);
    
    // Countdown between waves
    if (this.betweenWaves) {
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#ffdd00';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 10;
      ctx.fillText(`WAVE ${this.wave}`, ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
      ctx.font = 'bold 36px monospace';
      ctx.fillText(Math.ceil(this.countdownTimer), ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
      ctx.shadowBlur = 0;
    }
  }
}
