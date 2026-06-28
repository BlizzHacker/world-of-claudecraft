// mwWebGLBackground.js - True 3D WebGL rendering for game backgrounds
// Creates depth, lighting, and effects like your friend's Antigravity site

import * as THREE from 'three';

export class WebGLBackground {
  constructor(gameCanvas, theme = 'space') {
    this.gameCanvas = gameCanvas;
    this.theme = theme;
    this.disposed = false;
    
    // Create a SEPARATE canvas for WebGL that sits behind the 2D game canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = gameCanvas.width;
    this.canvas.height = gameCanvas.height;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = '0';
    this.canvas.style.pointerEvents = 'none';
    
    // Insert behind the game canvas
    if (gameCanvas.parentNode) {
      gameCanvas.parentNode.insertBefore(this.canvas, gameCanvas);
      gameCanvas.style.position = 'relative';
      gameCanvas.style.zIndex = '1';
    }
    
    // Create WebGL renderer on the background canvas
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // Transparent clear
    
    // Scene
    this.scene = new THREE.Scene();
    
    // Camera with perspective
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvas.width / this.canvas.height,
      0.1,
      1000
    );
    this.camera.position.z = 5;
    
    // Clock for delta time
    this.clock = new THREE.Clock();
    
    // Target for camera follow
    this.cameraTarget = { x: 0, y: 0 };
    
    // Initialize based on theme
    this.initTheme();
  }
  
  initTheme() {
    switch(this.theme) {
      case 'space':
        this.createSpaceScene();
        break;
      case 'cyber':
        this.createCyberScene();
        break;
      case 'volcano':
        this.createVolcanoScene();
        break;
      case 'nether':
        this.createNetherScene();
        break;
      default:
        this.createSpaceScene();
    }
  }
  
  createSpaceScene() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.5);
    this.scene.add(ambient);
    
    // Dynamic lights
    this.keyLight = new THREE.DirectionalLight(0x00f0ff, 1.5);
    this.keyLight.position.set(5, 10, 7);
    this.scene.add(this.keyLight);
    
    this.fillLight = new THREE.DirectionalLight(0xff00b7, 0.8);
    this.fillLight.position.set(-5, 8, -5);
    this.scene.add(this.fillLight);
    
    // Starfield with depth
    const starCount = 2000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      starSizes[i] = Math.random() * 2;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
    
    // Nebula planes with shader
    const nebulaGeometry = new THREE.PlaneGeometry(50, 50);
    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x4a00e0) },
        color2: { value: new THREE.Color(0x8e2de2) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        
        void main() {
          float noise = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
          vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
          float alpha = smoothstep(0.0, 0.5, length(vUv - 0.5));
          gl_FragColor = vec4(color, alpha * 0.3);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    this.nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    this.nebula.position.z = -20;
    this.scene.add(this.nebula);
  }
  
  createCyberScene() {
    // Ambient
    const ambient = new THREE.AmbientLight(0x0a0a1e, 0.6);
    this.scene.add(ambient);
    
    // Neon lights
    this.keyLight = new THREE.PointLight(0x00f0ff, 2, 50);
    this.keyLight.position.set(0, 5, 10);
    this.scene.add(this.keyLight);
    
    this.fillLight = new THREE.PointLight(0xff00ff, 1.5, 50);
    this.fillLight.position.set(10, -5, 10);
    this.scene.add(this.fillLight);
    
    // Grid floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00f0ff, 0x004466);
    gridHelper.position.y = -10;
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
    
    // Floating particles
    const particleCount = 1000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);
  }
  
  createVolcanoScene() {
    // Hot ambient
    const ambient = new THREE.AmbientLight(0x330000, 0.8);
    this.scene.add(ambient);
    
    // Fire lights
    this.keyLight = new THREE.PointLight(0xff4400, 3, 40);
    this.keyLight.position.set(0, 10, 10);
    this.scene.add(this.keyLight);
    
    this.fillLight = new THREE.PointLight(0xff8800, 2, 40);
    this.fillLight.position.set(-10, 5, 10);
    this.scene.add(this.fillLight);
    
    // Ember particles
    const emberCount = 500;
    const emberGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(emberCount * 3);
    
    for (let i = 0; i < emberCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 40 - 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    
    emberGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const emberMaterial = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    this.embers = new THREE.Points(emberGeometry, emberMaterial);
    this.scene.add(this.embers);
  }
  
  createNetherScene() {
    // Dark ambient
    const ambient = new THREE.AmbientLight(0x1a0033, 0.5);
    this.scene.add(ambient);
    
    // Eerie lights
    this.keyLight = new THREE.PointLight(0x9900ff, 2, 50);
    this.keyLight.position.set(0, 10, 10);
    this.scene.add(this.keyLight);
    
    this.fillLight = new THREE.PointLight(0xff0066, 1.5, 50);
    this.fillLight.position.set(10, -5, 10);
    this.scene.add(this.fillLight);
    
    // Void particles
    const voidCount = 800;
    const voidGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(voidCount * 3);
    
    for (let i = 0; i < voidCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    
    voidGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const voidMaterial = new THREE.PointsMaterial({
      color: 0xaa00ff,
      size: 0.15,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    this.voidParticles = new THREE.Points(voidGeometry, voidMaterial);
    this.scene.add(this.voidParticles);
  }
  
  update(playerX = 0, playerY = 0) {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    
    // Elastic camera follow
    const ease = 0.05;
    this.cameraTarget.x = (playerX / this.canvas.width - 0.5) * 10;
    this.cameraTarget.y = -(playerY / this.canvas.height - 0.5) * 10;
    
    this.camera.position.x += (this.cameraTarget.x - this.camera.position.x) * ease;
    this.camera.position.y += (this.cameraTarget.y - this.camera.position.y) * ease;
    this.camera.lookAt(0, 0, 0);
    
    // Animate lights
    if (this.keyLight) {
      this.keyLight.position.x = Math.sin(elapsed * 0.5) * 10;
      this.keyLight.position.y = Math.cos(elapsed * 0.3) * 5 + 5;
    }
    
    if (this.fillLight) {
      this.fillLight.position.x = Math.cos(elapsed * 0.4) * 8;
      this.fillLight.position.y = Math.sin(elapsed * 0.6) * 4;
    }
    
    // Animate theme-specific elements
    if (this.stars) {
      this.stars.rotation.y += delta * 0.02;
    }
    
    if (this.nebula && this.nebula.material.uniforms) {
      this.nebula.material.uniforms.time.value = elapsed;
    }
    
    if (this.particles) {
      this.particles.rotation.y += delta * 0.1;
    }
    
    if (this.embers) {
      const positions = this.embers.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += delta * 2; // Rise
        if (positions[i + 1] > 20) positions[i + 1] = -20;
      }
      this.embers.geometry.attributes.position.needsUpdate = true;
    }
    
    if (this.voidParticles) {
      this.voidParticles.rotation.y += delta * 0.05;
      this.voidParticles.rotation.x += delta * 0.03;
    }
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    this.renderer.dispose();
    this.canvas.remove();
  }
}
