// mwVisualEngine.js - Universal high-quality rendering engine
// Replaces primitive shape drawing with sprites, particles, lighting, and effects
import { spriteOrFallback, preloadGame } from './mwAssetSystem.js';

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 500;
  }

  emit(x, y, config = {}) {
    const count = config.count || 10;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) this.particles.shift();
      
      const angle = (config.angle || Math.random() * Math.PI * 2) + (Math.random() - 0.5) * (config.spread || Math.PI * 2);
      const speed = (config.speed || 3) + Math.random() * (config.speedVariance || 2);
      
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: (config.life || 30) + Math.random() * 15,
        maxLife: (config.life || 30) + 15,
        size: (config.size || 3) + Math.random() * (config.sizeVariance || 2),
        color: config.color || '#ff8800',
        colors: config.colors || null,
        gravity: config.gravity || 0,
        drag: config.drag || 0.98,
        shrink: config.shrink !== false,
        glow: config.glow || false,
        type: config.type || 'circle',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        sprite: config.sprite || null,
        fadeOut: config.fadeOut !== false,
        trail: config.trail || false,
        trailLength: config.trailLength || 5
      });
    }
  }

  explosion(x, y, size = 1) {
    // Core explosion
    this.emit(x, y, {
      count: Math.floor(20 * size),
      speed: 6 * size,
      speedVariance: 4 * size,
      life: 25,
      size: 6 * size,
      colors: ['#ffffff', '#ffff00', '#ff8800', '#ff4400', '#ff0000'],
      glow: true,
      gravity: 0.1,
      drag: 0.95
    });
    
    // Sparks
    this.emit(x, y, {
      count: Math.floor(30 * size),
      speed: 10 * size,
      speedVariance: 5 * size,
      life: 15,
      size: 2,
      color: '#ffff88',
      glow: true,
      trail: true,
      trailLength: 8
    });
    
    // Smoke
    this.emit(x, y, {
      count: Math.floor(10 * size),
      speed: 2 * size,
      speedVariance: 1,
      life: 60,
      size: 10 * size,
      sizeVariance: 5,
      color: '#444444',
      drag: 0.96,
      gravity: -0.05,
      shrink: false
    });
    
    // Debris
    this.emit(x, y, {
      count: Math.floor(8 * size),
      speed: 8 * size,
      speedVariance: 4 * size,
      life: 40,
      size: 4,
      colors: ['#888888', '#666666', '#aaaaaa'],
      gravity: 0.3,
      drag: 0.97,
      type: 'rect',
      rotation: Math.random() * Math.PI
    });
  }

  muzzleFlash(x, y, angle = 0) {
    this.emit(x, y, {
      count: 5,
      angle: angle,
      spread: 0.5,
      speed: 8,
      speedVariance: 3,
      life: 5,
      size: 4,
      colors: ['#ffffff', '#ffff00', '#ff8800'],
      glow: true
    });
  }

  thrustTrail(x, y, angle = 0, color = '#4488ff') {
    this.emit(x, y, {
      count: 2,
      angle: angle + Math.PI,
      spread: 0.3,
      speed: 4,
      speedVariance: 2,
      life: 15,
      size: 3,
      colors: [color, '#ffffff', color],
      glow: true,
      drag: 0.95,
      trail: true,
      trailLength: 3
    });
  }

  hitSpark(x, y) {
    this.emit(x, y, {
      count: 8,
      speed: 6,
      speedVariance: 3,
      life: 10,
      size: 2,
      colors: ['#ffffff', '#ffff00'],
      glow: true,
      trail: true
    });
  }

  healEffect(x, y) {
    this.emit(x, y, {
      count: 12,
      speed: 2,
      spread: Math.PI * 2,
      life: 30,
      size: 4,
      colors: ['#00ff88', '#88ffcc', '#00ffaa'],
      glow: true,
      gravity: -0.1,
      shrink: false
    });
  }

  magicEffect(x, y, color = '#8844ff') {
    this.emit(x, y, {
      count: 15,
      speed: 3,
      life: 25,
      size: 5,
      colors: [color, '#ffffff', color],
      glow: true,
      gravity: -0.05,
      trail: true,
      trailLength: 6
    });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      
      if (p.shrink) {
        p.size *= 0.97;
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = p.fadeOut ? (p.life / p.maxLife) : 1;
      const color = p.colors ? p.colors[Math.floor((1 - p.life / p.maxLife) * (p.colors.length - 1))] : p.color;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      
      // Glow effect
      if (p.glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = p.size * 3;
      }
      
      // Trail
      if (p.trail && p.trailLength > 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = p.size * 0.5;
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * p.trailLength, p.y - p.vy * p.trailLength);
        ctx.stroke();
        ctx.globalAlpha = alpha;
      }
      
      ctx.fillStyle = color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      
      if (p.type === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.type === 'star') {
        this.drawStar(ctx, 0, 0, 5, p.size, p.size * 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
  }

  drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      if (i === 0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN EFFECTS
// ═══════════════════════════════════════════════════════════════════════════
export class ScreenEffects {
  constructor() {
    this.shake = { x: 0, y: 0, intensity: 0, duration: 0, timer: 0 };
    this.flash = { color: '#ffffff', alpha: 0, duration: 0, timer: 0 };
    this.slowMo = { factor: 1, duration: 0, timer: 0 };
    this.vignette = 0.3;
    this.chromaticAberration = 0;
    this.scanlines = false;
    this.bloom = 0;
  }

  doShake(intensity, duration) {
    this.shake.intensity = intensity;
    this.shake.duration = duration;
    this.shake.timer = duration;
  }

  doFlash(color, duration) {
    this.flash.color = color;
    this.flash.alpha = 1;
    this.flash.duration = duration;
    this.flash.timer = duration;
  }

  doSlowMo(factor, duration) {
    this.slowMo.factor = factor;
    this.slowMo.duration = duration;
    this.slowMo.timer = duration;
  }

  update() {
    // Shake
    if (this.shake.timer > 0) {
      this.shake.timer--;
      const progress = this.shake.timer / this.shake.duration;
      const currentIntensity = this.shake.intensity * progress;
      this.shake.x = (Math.random() - 0.5) * currentIntensity * 2;
      this.shake.y = (Math.random() - 0.5) * currentIntensity * 2;
    } else {
      this.shake.x = 0;
      this.shake.y = 0;
    }

    // Flash
    if (this.flash.timer > 0) {
      this.flash.timer--;
      this.flash.alpha = this.flash.timer / this.flash.duration;
    }

    // SlowMo
    if (this.slowMo.timer > 0) {
      this.slowMo.timer--;
    } else {
      this.slowMo.factor = 1;
    }
  }

  applyTransform(ctx) {
    ctx.translate(this.shake.x, this.shake.y);
  }

  drawOverlay(ctx, w, h) {
    const width = Number.isFinite(w) && w > 0 ? w : ctx?.canvas?.width || 1;
    const height = Number.isFinite(h) && h > 0 ? h : ctx?.canvas?.height || 1;

    // Flash
    if (this.flash.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flash.alpha;
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Vignette
    if (this.vignette > 0) {
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.3,
        width / 2,
        height / 2,
        width * 0.7
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${this.vignette})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Scanlines
    if (this.scanlines) {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#000000';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
      ctx.restore();
    }

    // Chromatic aberration (simple version)
    if (this.chromaticAberration > 0) {
      // This would need a pixel-level operation, simplified as a color fringe overlay
    }
  }

  getTimeScale() {
    return this.slowMo.factor;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PARALLAX BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════
export class ParallaxBackground {
  constructor(w, h, theme = 'space') {
    this.w = w;
    this.h = h;
    this.layers = [];
    this.theme = theme;
    this.stars = [];
    this.nebulae = [];
    this.init();
  }

  init() {
    // Generate star field
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.w * 2,
        y: Math.random() * this.h * 2,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        brightness: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        color: ['#ffffff', '#aaccff', '#ffccaa', '#aaffcc'][Math.floor(Math.random() * 4)]
      });
    }

    // Generate nebula blobs
    for (let i = 0; i < 8; i++) {
      this.nebulae.push({
        x: Math.random() * this.w * 2,
        y: Math.random() * this.h * 2,
        radius: 100 + Math.random() * 200,
        color: ['rgba(100,50,150,', 'rgba(50,100,150,', 'rgba(150,50,50,', 'rgba(50,150,100,'][Math.floor(Math.random() * 4)],
        speed: 0.05 + Math.random() * 0.1,
        opacity: 0.02 + Math.random() * 0.03
      });
    }
  }

  update(scrollX = 0, scrollY = 0) {
    // Stars twinkle
    for (const star of this.stars) {
      star.twinkle += 0.05;
    }
  }

  draw(ctx, scrollX = 0, scrollY = 0) {
    // Background gradient
    const themes = {
      space: ['#000011', '#001133'],
      forest: ['#0a1a0a', '#1a2a1a'],
      desert: ['#2a1a0a', '#3a2a1a'],
      ocean: ['#0a0a2a', '#0a1a3a'],
      volcano: ['#1a0a0a', '#2a0a0a'],
      cyber: ['#0a0a1a', '#1a0a2a'],
      nether: ['#0a0008', '#1a0020']
    };
    const [c1, c2] = themes[this.theme] || themes.space;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.h);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.w, this.h);

    // Nebulae (far background)
    for (const neb of this.nebulae) {
      const x = ((neb.x - scrollX * neb.speed) % (this.w * 2) + this.w * 2) % (this.w * 2) - this.w * 0.5;
      const y = ((neb.y - scrollY * neb.speed) % (this.h * 2) + this.h * 2) % (this.h * 2) - this.h * 0.5;
      
      const grad = ctx.createRadialGradient(x, y, 0, x, y, neb.radius);
      grad.addColorStop(0, neb.color + neb.opacity + ')');
      grad.addColorStop(1, neb.color + '0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - neb.radius, y - neb.radius, neb.radius * 2, neb.radius * 2);
    }

    // Stars (mid background)
    for (const star of this.stars) {
      const x = ((star.x - scrollX * star.speed) % (this.w * 2) + this.w * 2) % (this.w * 2) - this.w * 0.5;
      const y = ((star.y - scrollY * star.speed) % (this.h * 2) + this.h * 2) % (this.h * 2) - this.h * 0.5;
      
      const twinkle = Math.sin(star.twinkle) * 0.3 + 0.7;
      ctx.save();
      ctx.globalAlpha = star.brightness * twinkle;
      ctx.fillStyle = star.color;
      ctx.shadowColor = star.color;
      ctx.shadowBlur = star.size * 2;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SPRITE RENDERER (replaces primitive shape drawing)
// ═══════════════════════════════════════════════════════════════════════════
export class SpriteRenderer {
  constructor(gameKey, quality = '32bit') {
    this.gameKey = gameKey;
    this.quality = quality;
    this.cache = {};
    this.animations = {};
    this.frame = 0;
    preloadGame(gameKey, quality);
  }

  getSprite(name) {
    const key = `${this.gameKey}/${name}`;
    if (!this.cache[key]) {
      this.cache[key] = spriteOrFallback(this.gameKey, name, this.quality);
    }
    return this.cache[key];
  }

  drawSprite(ctx, name, x, y, scale = 1, angle = 0, alpha = 1, flipX = false) {
    const sprite = this.getSprite(name);
    if (!sprite) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    if (flipX) ctx.scale(-1, 1);
    ctx.scale(scale, scale);
    
    const w = sprite.width || 32;
    const h = sprite.height || 32;
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  drawWithGlow(ctx, name, x, y, scale, angle, glowColor, glowSize) {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowSize;
    this.drawSprite(ctx, name, x, y, scale, angle);
    ctx.restore();
  }

  // Animated sprite - cycles through frames
  drawAnimated(ctx, baseName, x, y, frameCount, fps, scale = 1, angle = 0) {
    const frameIdx = Math.floor(this.frame / (60 / fps)) % frameCount;
    const name = `${baseName}_${frameIdx}`;
    this.drawSprite(ctx, name, x, y, scale, angle);
  }

  update() {
    this.frame++;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LIGHTING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
export class LightingSystem {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.lights = [];
    this.ambientColor = 'rgba(0,0,20,0.3)';
    this.canvas = null;
    this.ctx = null;
  }

  addLight(x, y, radius, color, intensity = 1) {
    this.lights.push({ x, y, radius, color, intensity, life: -1 });
  }

  addTemporaryLight(x, y, radius, color, duration = 30) {
    this.lights.push({ x, y, radius, color, intensity: 1, life: duration, maxLife: duration });
  }

  update() {
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const light = this.lights[i];
      if (light.life > 0) {
        light.life--;
        light.intensity = light.life / light.maxLife;
        if (light.life <= 0) {
          this.lights.splice(i, 1);
        }
      }
    }
  }

  draw(ctx) {
    // Draw ambient darkness
    ctx.save();
    ctx.fillStyle = this.ambientColor;
    ctx.fillRect(0, 0, this.w, this.h);
    
    // Cut out light circles using composite operation
    ctx.globalCompositeOperation = 'destination-out';
    for (const light of this.lights) {
      const grad = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
      grad.addColorStop(0, `rgba(0,0,0,${light.intensity})`);
      grad.addColorStop(0.5, `rgba(0,0,0,${light.intensity * 0.5})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // Draw colored light overlay
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const light of this.lights) {
      const grad = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius * 0.8);
      grad.addColorStop(0, light.color.replace(')', `,${light.intensity * 0.3})`).replace('rgb', 'rgba'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI RENDERER (polished HUD, menus, health bars)
// ═══════════════════════════════════════════════════════════════════════════
export class UIRenderer {
  static drawHealthBar(ctx, x, y, w, h, current, max, color = '#00ff44', bgColor = '#333') {
    const pct = Math.max(0, current / max);
    
    // Background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    
    // Health fill with gradient
    if (pct > 0) {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, this.darkenColor(color, 0.5));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, (w - 2) * pct, h - 2, (h - 2) / 2);
      ctx.fill();
      
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, (w - 2) * pct, h / 3, (h - 2) / 2);
      ctx.fill();
    }
    
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.stroke();
  }

  static drawText(ctx, text, x, y, size = 16, color = '#ffffff', align = 'left', shadow = true) {
    ctx.save();
    ctx.font = `bold ${size}px 'Inter', 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    
    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }
    
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  static drawGlowText(ctx, text, x, y, size = 16, color = '#ffffff', glowColor = null) {
    ctx.save();
    ctx.font = `bold ${size}px 'Inter', 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glowColor || color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.fillText(text, x, y); // Double for stronger glow
    ctx.restore();
  }

  static drawButton(ctx, x, y, w, h, text, hover = false, color = '#4488ff') {
    ctx.save();
    
    // Button background
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (hover) {
      grad.addColorStop(0, color);
      grad.addColorStop(1, this.darkenColor(color, 0.7));
    } else {
      grad.addColorStop(0, 'rgba(40,40,60,0.9)');
      grad.addColorStop(1, 'rgba(20,20,40,0.9)');
    }
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = hover ? color : 'rgba(100,100,150,0.5)';
    ctx.lineWidth = hover ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.stroke();
    
    // Glow on hover
    if (hover) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.stroke();
    }
    
    // Text
    this.drawText(ctx, text, x + w / 2, y + h / 2, 14, hover ? '#ffffff' : '#aaaacc', 'center', true);
    
    ctx.restore();
  }

  static drawPanel(ctx, x, y, w, h, title = null) {
    ctx.save();
    
    // Panel background
    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    
    // Panel border
    ctx.strokeStyle = 'rgba(80,80,120,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.stroke();
    
    // Inner glow
    const innerGrad = ctx.createLinearGradient(x, y, x, y + 40);
    innerGrad.addColorStop(0, 'rgba(100,100,200,0.1)');
    innerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, w - 2, 40, 12);
    ctx.fill();
    
    // Title
    if (title) {
      this.drawText(ctx, title, x + w / 2, y + 20, 16, '#88aaff', 'center', true);
    }
    
    ctx.restore();
  }

  static drawXPBar(ctx, x, y, w, h, current, max) {
    this.drawHealthBar(ctx, x, y, w, h, current, max, '#44aaff', '#222');
  }

  static drawMinimap(ctx, x, y, size, entities, playerPos) {
    ctx.save();
    
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = 'rgba(100,150,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Player dot
    ctx.fillStyle = '#00ff44';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Entity dots
    if (entities) {
      for (const entity of entities) {
        const dx = (entity.x - playerPos.x) / 10;
        const dy = (entity.y - playerPos.y) / 10;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < size / 2 - 5) {
          ctx.fillStyle = entity.color || '#ff4444';
          ctx.beginPath();
          ctx.arc(x + size / 2 + dx, y + size / 2 + dy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    ctx.restore();
  }

  static darkenColor(color, factor) {
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.substr(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.substr(2, 2), 16) * factor);
    const b = Math.floor(parseInt(hex.substr(4, 2), 16) * factor);
    return `rgb(${r},${g},${b})`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED VISUAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class VisualEngine {
  constructor(canvas, gameKey, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.gameKey = gameKey;
    
    this.particles = new ParticleSystem();
    this.effects = new ScreenEffects();
    this.background = new ParallaxBackground(this.W, this.H, options.theme || 'space');
    this.sprites = new SpriteRenderer(gameKey, options.quality || '32bit');
    this.lighting = options.lighting ? new LightingSystem(this.W, this.H) : null;
    this.ui = UIRenderer;
    
    this.scrollX = 0;
    this.scrollY = 0;
    this.frame = 0;
  }

  update() {
    this.frame++;
    this.particles.update();
    this.effects.update();
    this.background.update(this.scrollX, this.scrollY);
    this.sprites.update();
    if (this.lighting) this.lighting.update();
  }

  beginFrame() {
    this.ctx.save();
    this.effects.applyTransform(this.ctx);
  }

  drawBackground(scrollX, scrollY) {
    this.scrollX = scrollX || 0;
    this.scrollY = scrollY || 0;
    this.background.draw(this.ctx, this.scrollX, this.scrollY);
  }

  drawParticles() {
    this.particles.draw(this.ctx);
  }

  drawLighting() {
    if (this.lighting) this.lighting.draw(this.ctx);
  }

  drawEffects() {
    this.effects.drawOverlay(this.ctx, this.W, this.H);
  }

  endFrame() {
    this.ctx.restore();
  }

  // Full frame render pipeline
  renderFrame(drawGame) {
    this.update();
    this.beginFrame();
    this.drawBackground();
    drawGame(this.ctx); // Game-specific rendering
    this.drawParticles();
    if (this.lighting) this.drawLighting();
    this.drawEffects();
    this.endFrame();
  }

  getTimeScale() {
    return this.effects.getTimeScale();
  }
}
