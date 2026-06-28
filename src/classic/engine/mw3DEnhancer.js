// mw3DEnhancer.js - Pseudo-3D effects for 2D canvas games
// Adds depth, perspective, lighting, and advanced effects to make 2D feel 3D

export class DepthRenderer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.W = width;
    this.H = height;
    this.camera = { x: 0, y: 0, z: 0, targetX: 0, targetY: 0, shake: 0 };
    this.focalLength = 800; // Perspective strength
    this.depthBlurCanvas = document.createElement('canvas');
    this.depthBlurCtx = this.depthBlurCanvas.getContext('2d');
    this.depthBlurCanvas.width = width;
    this.depthBlurCanvas.height = height;
  }

  // Project 3D point to 2D with perspective
  project(x, y, z) {
    const scale = this.focalLength / (this.focalLength + z);
    return {
      x: this.W/2 + (x - this.camera.x) * scale,
      y: this.H/2 + (y - this.camera.y) * scale,
      scale: scale,
      depth: z
    };
  }

  // Draw sprite with depth-based scaling and blur
  drawSprite(img, x, y, z, baseWidth, baseHeight) {
    const p = this.project(x, y, z);
    const w = baseWidth * p.scale;
    const h = baseHeight * p.scale;
    
    // Depth blur for far objects
    if (z > 300) {
      const blurAmount = Math.min((z - 300) / 500, 3);
      this.ctx.filter = `blur(${blurAmount}px)`;
    }
    
    // Depth-based brightness (atmospheric perspective)
    const brightness = Math.max(0.3, 1 - (z / 1000));
    this.ctx.globalAlpha = brightness;
    
    this.ctx.drawImage(img, p.x - w/2, p.y - h/2, w, h);
    this.ctx.filter = 'none';
    this.ctx.globalAlpha = 1;
  }

  // Smooth camera follow with elastic damping
  updateCamera(targetX, targetY, dt) {
    const ease = 0.08;
    this.camera.x += (targetX - this.camera.x) * ease;
    this.camera.y += (targetY - this.camera.y) * ease;
  }

  // Apply camera shake
  applyShake(intensity) {
    this.camera.shake = intensity;
  }

  getShakeOffset() {
    if (this.camera.shake > 0) {
      const offsetX = (Math.random() - 0.5) * this.camera.shake;
      const offsetY = (Math.random() - 0.5) * this.camera.shake;
      this.camera.shake *= 0.9;
      return { x: offsetX, y: offsetY };
    }
    return { x: 0, y: 0 };
  }
}

export class LightingSystem {
  constructor() {
    this.lights = [];
    this.ambientLight = { r: 30, g: 30, b: 50 }; // Base darkness
  }

  addLight(x, y, radius, color, intensity = 1) {
    this.lights.push({ x, y, radius, color, intensity });
  }

  clearLights() {
    this.lights = [];
  }

  // Calculate lighting at a point
  calculateLighting(x, y) {
    let r = this.ambientLight.r;
    let g = this.ambientLight.g;
    let b = this.ambientLight.b;

    this.lights.forEach(light => {
      const dist = Math.hypot(x - light.x, y - light.y);
      if (dist < light.radius) {
        const falloff = 1 - (dist / light.radius);
        const intensity = falloff * falloff * light.intensity;
        
        // Parse color (assumes #RRGGBB format)
        const lr = parseInt(light.color.slice(1,3), 16);
        const lg = parseInt(light.color.slice(3,5), 16);
        const lb = parseInt(light.color.slice(5,7), 16);
        
        r += lr * intensity;
        g += lg * intensity;
        b += lb * intensity;
      }
    });

    return {
      r: Math.min(255, r),
      g: Math.min(255, g),
      b: Math.min(255, b)
    };
  }

  // Apply lighting to a region
  applyLighting(ctx, x, y, width, height) {
    const light = this.calculateLighting(x + width/2, y + height/2);
    const brightness = (light.r + light.g + light.b) / (255 * 3);
    
    // Use composite operation to apply lighting
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${light.r}, ${light.g}, ${light.b})`;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }
}

export class VolumetricParticles {
  constructor() {
    this.particles = [];
  }

  // Create volumetric smoke/explosion
  explosion(x, y, count = 50, color = '#ff6600') {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      const size = 8 + Math.random() * 16;
      
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        life: 1,
        decay: 0.015 + Math.random() * 0.01,
        color: color,
        type: 'smoke'
      });
    }
  }

  // Sparks with trails
  sparks(x, y, count = 20, color = '#ffff00') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Gravity bias up
        size: 2 + Math.random() * 3,
        life: 1,
        decay: 0.03 + Math.random() * 0.02,
        color: color,
        type: 'spark',
        trail: []
      });
    }
  }

  update() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.vx *= 0.98; // Friction
      p.life -= p.decay;
      p.size *= 0.97;

      // Store trail for sparks
      if (p.type === 'spark' && p.trail) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 5) p.trail.shift();
      }

      return p.life > 0;
    });
  }

  draw(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;

      if (p.type === 'smoke') {
        // Volumetric smoke with radial gradient
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.5, p.color + '80');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        // Draw trail
        if (p.trail && p.trail.length > 1) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.5;
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          p.trail.forEach(point => ctx.lineTo(point.x, point.y));
          ctx.stroke();
        }
        
        // Draw spark
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    });
  }
}

export class PostProcessing {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.W = width;
    this.H = height;
  }

  // Bloom effect via blur + additive blending
  bloom(intensity = 0.3) {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.globalAlpha = intensity;
    this.ctx.filter = 'blur(8px) brightness(1.5)';
    this.ctx.drawImage(this.ctx.canvas, 0, 0);
    this.ctx.restore();
  }

  // Chromatic aberration
  chromaticAberration(intensity = 2) {
    const imageData = this.ctx.getImageData(0, 0, this.W, this.H);
    const data = imageData.data;
    
    // Shift red channel
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % this.W;
      const offset = Math.floor(intensity * (x / this.W - 0.5));
      const srcIdx = i + offset * 4;
      if (srcIdx >= 0 && srcIdx < data.length) {
        data[i] = data[srcIdx]; // Red
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  // Vignette darkening at edges
  vignette(intensity = 0.5) {
    const gradient = this.ctx.createRadialGradient(
      this.W/2, this.H/2, 0,
      this.W/2, this.H/2, this.W * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  // Film grain
  grain(intensity = 0.05) {
    const imageData = this.ctx.getImageData(0, 0, this.W, this.H);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * intensity * 255;
      data[i] += noise;
      data[i+1] += noise;
      data[i+2] += noise;
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }
}

export class GlassmorphismHUD {
  constructor(container) {
    this.container = container;
    this.hudElement = null;
    this.createHUD();
  }

  createHUD() {
    this.hudElement = document.createElement('div');
    this.hudElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      font-family: 'Orbitron', 'Share Tech Mono', monospace;
    `;
    this.container.appendChild(this.hudElement);
  }

  // Create glassmorphic panel
  createPanel(x, y, width, height, content) {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      background: rgba(10, 15, 30, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 10px rgba(0, 240, 255, 0.05);
      color: #ffffff;
      pointer-events: auto;
    `;
    panel.innerHTML = content;
    this.hudElement.appendChild(panel);
    return panel;
  }

  // Update panel content
  updatePanel(panel, content) {
    panel.innerHTML = content;
  }

  // Create glowing text
  static glowText(text, size = 16, color = '#00f0ff') {
    return `
      <div style="
        font-size: ${size}px;
        font-weight: bold;
        color: ${color};
        text-shadow: 0 0 10px ${color}, 0 0 20px ${color}40;
        letter-spacing: 2px;
      ">${text}</div>
    `;
  }

  // Create progress bar
  static progressBar(value, max, color = '#00ffaa') {
    const percent = (value / max) * 100;
    return `
      <div style="
        width: 100%;
        height: 12px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid ${color}80;
        border-radius: 6px;
        overflow: hidden;
        margin: 8px 0;
      ">
        <div style="
          width: ${percent}%;
          height: 100%;
          background: linear-gradient(90deg, ${color}aa, ${color});
          box-shadow: 0 0 10px ${color};
          transition: width 0.1s ease;
        "></div>
      </div>
    `;
  }
}
