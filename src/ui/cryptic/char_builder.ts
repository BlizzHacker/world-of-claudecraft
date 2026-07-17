// Cryptic Realm Character Builder — ported from the legacy moveweight-ui
// in-game builder (src/arcforge/CrypticRealmCharCreator.jsx). A local-only,
// canvas-based 3-stage sprite pipeline surfaced inside the in-game
// Customization modal:
//
//   Stage 1: load a 16-bit sprite-sheet template (upload only — the old
//            "pick existing class" path depended on a moveweight-ui backend
//            that does not exist in this engine, so it is intentionally dropped).
//   Stage 2: auto-clear the stats panel + labels + background.
//   Stage 3: cut the inner 6x4 grid into 24 individual 512x512 sprites,
//            auto-detect left/right facing, and download them as PNGs.
//
// No sim imports, no server writes, no asset-pack dependency.
// Wiring the produced sprites into the runtime skin/character
// manifest system is a deliberate follow-up; this module delivers the tool.

const MODAL_ID = 'cr-charbuilder-modal';

const ACTIONS = ['Idle', 'Walk', 'Run', 'Attack', 'Hurt', 'Death'] as const;
const DIRS = ['Front', 'Right', 'Back', 'Left'] as const;
const OUT_SIZE = 512;
const DARK_THRESH = 35; // gray < this -> bg pixel (dark labeled-template mode)
const LIGHT_THRESH = 200; // gray > this -> bg pixel (light/already-cleared mode)
// Inner box (fraction of sheet) holding the 6x4 sprite grid; outside is the
// stats panel + action/direction labels, which get erased in stage 2.
const INNER = { x0: 0.19, y0: 0.105, x1: 0.7, y1: 0.975 } as const;

interface InnerBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
// Bounding box of a detected sprite blob. Named SpriteBox (not "Blob") to avoid
// shadowing the DOM Blob type used by canvas.toBlob() in the export step.
interface SpriteBox {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
}
interface ClearedTemplate {
  canvas: HTMLCanvasElement;
  lightBg: boolean;
}
interface CutSprite {
  name: string;
  action: string;
  dir: string;
  canvas: HTMLCanvasElement | null;
  flipped: boolean;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

// ─── Pure canvas pipeline (ported verbatim from the JSX) ─────────────────────

function isLightBg(imageData: ImageData, w: number, h: number): boolean {
  const d = imageData.data;
  const corners = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ].map(([x, y]) => {
    const i = (y * w + x) * 4;
    return (d[i] + d[i + 1] + d[i + 2]) / 3;
  });
  return corners.reduce((a, b) => a + b, 0) / 4 > 100;
}

function buildMask(
  imageData: ImageData,
  w: number,
  h: number,
  lightBg: boolean,
  ib: InnerBox,
): Uint8Array {
  const { x0, y0, x1, y1 } = ib;
  const d = imageData.data;
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
      const i = (y * w + x) * 4;
      if (d[i + 3] < 10) continue;
      const gray = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const isBg = lightBg ? gray > LIGHT_THRESH : gray < DARK_THRESH;
      if (!isBg) mask[y * w + x] = 1;
    }
  }
  return mask;
}

function largestBlobInCell(
  mask: Uint8Array,
  W: number,
  cx0: number,
  cy0: number,
  cx1: number,
  cy1: number,
): SpriteBox | null {
  const cw = cx1 - cx0;
  const ch = cy1 - cy0;
  const vis = new Uint8Array(cw * ch);
  let best: SpriteBox | null = null;
  for (let sy = 0; sy < ch; sy++) {
    for (let sx = 0; sx < cw; sx++) {
      if (!mask[(cy0 + sy) * W + (cx0 + sx)] || vis[sy * cw + sx]) continue;
      const stack: [number, number][] = [[sx, sy]];
      vis[sy * cw + sx] = 1;
      let mnX = sx;
      let mxX = sx;
      let mnY = sy;
      let mxY = sy;
      let cnt = 0;
      while (stack.length) {
        const [px, py] = stack.pop() as [number, number];
        cnt++;
        if (px < mnX) mnX = px;
        if (px > mxX) mxX = px;
        if (py < mnY) mnY = py;
        if (py > mxY) mxY = py;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, -1],
          [1, -1],
          [-1, 1],
        ]) {
          const nx = px + dx;
          const ny = py + dy;
          if (
            nx >= 0 &&
            nx < cw &&
            ny >= 0 &&
            ny < ch &&
            mask[(cy0 + ny) * W + (cx0 + nx)] &&
            !vis[ny * cw + nx]
          ) {
            vis[ny * cw + nx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      if (!best || cnt > best.count) {
        best = { x: cx0 + mnX, y: cy0 + mnY, w: mxX - mnX + 1, h: mxY - mnY + 1, count: cnt };
      }
    }
  }
  return best;
}

function isFacingLeft(imageData: ImageData, W: number, box: SpriteBox): boolean {
  const { x, y, w, h } = box;
  const d = imageData.data;
  let wsum = 0;
  let total = 0;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const i = (py * W + px) * 4;
      if (d[i + 3] > 10 && (d[i] + d[i + 1] + d[i + 2]) / 3 > DARK_THRESH) {
        wsum += px - x;
        total++;
      }
    }
  }
  if (total < 50) return false;
  return wsum / total < w * 0.4;
}

function cutSpriteTo512(
  srcCanvas: HTMLCanvasElement,
  box: SpriteBox,
  lightBg: boolean,
  pad = 10,
): HTMLCanvasElement {
  const { x, y, w, h } = box;
  const W = srcCanvas.width;
  const H = srcCanvas.height;
  const sx = Math.max(0, x - pad);
  const sy = Math.max(0, y - pad);
  const sw = Math.min(W - sx, w + pad * 2);
  const sh = Math.min(H - sy, h + pad * 2);
  const tmp = document.createElement('canvas');
  tmp.width = sw;
  tmp.height = sh;
  const ctx = tmp.getContext('2d')!;
  ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  const id = ctx.getImageData(0, 0, sw, sh);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (lightBg ? gray > LIGHT_THRESH : gray < DARK_THRESH) d[i + 3] = 0;
  }
  ctx.putImageData(id, 0, 0);
  const scale = Math.min(OUT_SIZE / sw, OUT_SIZE / sh);
  const dw = Math.max(1, Math.floor(sw * scale));
  const dh = Math.max(1, Math.floor(sh * scale));
  const out = document.createElement('canvas');
  out.width = OUT_SIZE;
  out.height = OUT_SIZE;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(tmp, (OUT_SIZE - dw) >> 1, (OUT_SIZE - dh) >> 1, dw, dh);
  return out;
}

function flipCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const fc = document.createElement('canvas');
  fc.width = OUT_SIZE;
  fc.height = OUT_SIZE;
  const fctx = fc.getContext('2d')!;
  fctx.translate(OUT_SIZE, 0);
  fctx.scale(-1, 1);
  fctx.drawImage(src, 0, 0);
  return fc;
}

// ─── Section HTML + click delegation ──────────────────────────────────────────

export function charBuilderSectionHtml(): string {
  return `
    <div class="cr-modal-section">
      <div class="cr-modal-section-title">Character Builder</div>
      <p class="cr-charbuilder-blurb">Turn a 16-bit sprite-sheet template into 24 game-ready 512&times;512 sprites. Local only — nothing is uploaded.</p>
      <button type="button" class="cr-options-pill cr-charbuilder-open" data-cr-charbuilder>Open Character Builder</button>
    </div>
  `;
}

export function handleCharBuilderClick(target: HTMLElement | null): boolean {
  const btn = target?.closest('[data-cr-charbuilder]') as HTMLElement | null;
  if (!btn) return false;
  openCharBuilder();
  return true;
}

function ensureHost(): HTMLElement {
  let host = document.getElementById(MODAL_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = MODAL_ID;
    host.setAttribute('hidden', '');
    document.body.appendChild(host);
  }
  return host;
}

function closeCharBuilder(): void {
  const host = document.getElementById(MODAL_ID);
  host?.setAttribute('hidden', '');
}

// ─── Stage runner ────────────────────────────────────────────────────────────

interface BuilderState {
  template: HTMLImageElement | null;
  templateName: string;
  cleared: ClearedTemplate | null;
  sprites: CutSprite[];
}

export function openCharBuilder(): void {
  if (typeof document === 'undefined') return;
  const host = ensureHost();
  const state: BuilderState = {
    template: null,
    templateName: 'Character',
    cleared: null,
    sprites: [],
  };

  host.innerHTML = `
    <div class="cr-modal-overlay cr-charbuilder-overlay" data-cr-charbuilder-overlay>
      <div class="cr-modal-panel cr-charbuilder-panel" role="dialog" aria-modal="true" aria-labelledby="cr-charbuilder-title">
        <header class="cr-modal-header">
          <h2 id="cr-charbuilder-title">Character Builder</h2>
          <button type="button" class="cr-modal-close" data-cr-charbuilder-close aria-label="Close">x</button>
        </header>
        <div class="cr-charbuilder-stages" data-cr-stage-row>
          <span class="cr-charbuilder-stage active" data-stage="0">1 · Template</span>
          <span class="cr-charbuilder-stage" data-stage="1">2 · Clean</span>
          <span class="cr-charbuilder-stage" data-stage="2">3 · Cut &amp; Export</span>
        </div>
        <div class="cr-charbuilder-body" data-cr-body></div>
        <div class="cr-charbuilder-status" data-cr-status></div>
      </div>
    </div>
  `;
  host.removeAttribute('hidden');

  const body = host.querySelector<HTMLElement>('[data-cr-body]')!;
  const statusEl = host.querySelector<HTMLElement>('[data-cr-status]')!;
  const stageRow = host.querySelector<HTMLElement>('[data-cr-stage-row]')!;
  const setStatus = (s: string) => {
    statusEl.textContent = s;
  };
  const markStage = (n: number) => {
    stageRow.querySelectorAll<HTMLElement>('.cr-charbuilder-stage').forEach((el) => {
      const idx = Number(el.dataset.stage);
      el.classList.toggle('active', idx === n);
      el.classList.toggle('done', idx < n);
    });
  };

  host.onclick = (ev) => {
    const t = ev.target as HTMLElement | null;
    if (
      t?.hasAttribute('data-cr-charbuilder-close') ||
      t?.hasAttribute('data-cr-charbuilder-overlay')
    ) {
      closeCharBuilder();
    }
  };

  renderStage1();

  // ── Stage 1: load template ──
  function renderStage1(): void {
    markStage(0);
    setStatus('');
    body.innerHTML = `
      <label class="cr-charbuilder-drop">
        <input type="file" accept="image/png,image/jpeg" data-cr-file hidden />
        <span data-cr-drop-label>Click to upload a Template.png sprite sheet</span>
      </label>
      <div class="cr-charbuilder-info" data-cr-info></div>
      <div class="cr-charbuilder-actions">
        <button type="button" class="cr-options-pill" data-cr-next disabled>Next → Clean</button>
      </div>
    `;
    const input = body.querySelector<HTMLInputElement>('[data-cr-file]')!;
    const label = body.querySelector<HTMLElement>('[data-cr-drop-label]')!;
    const info = body.querySelector<HTMLElement>('[data-cr-info]')!;
    const next = body.querySelector<HTMLButtonElement>('[data-cr-next]')!;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        state.template = img;
        state.templateName = file.name.replace(/\.[^.]+$/, '');
        label.textContent = file.name;
        info.textContent = `${img.width}×${img.height}px — ${file.name}`;
        next.disabled = false;
      };
      img.onerror = () => setStatus('Could not load that image.');
      img.src = URL.createObjectURL(file);
    });
    next.addEventListener('click', () => {
      if (state.template) renderStage2();
    });
  }

  // ── Stage 2: clear background ──
  function renderStage2(): void {
    markStage(1);
    setStatus('');
    body.innerHTML = `
      <p class="cr-charbuilder-blurb">Stats panel, labels and background are erased. Only sprite pixels remain.</p>
      <div class="cr-charbuilder-controls">
        <label>BG gray <span data-cr-bg-val>218</span>
          <input type="range" min="100" max="255" value="218" data-cr-bg />
        </label>
        <label data-cr-thresh-wrap>Dark thresh <span data-cr-thresh-val>${DARK_THRESH}</span>
          <input type="range" min="10" max="80" value="${DARK_THRESH}" data-cr-thresh />
        </label>
        <span class="cr-charbuilder-mode" data-cr-mode></span>
      </div>
      <div class="cr-charbuilder-preview">
        <canvas data-cr-canvas></canvas>
      </div>
      <div class="cr-charbuilder-actions">
        <button type="button" class="cr-options-pill" data-cr-back>← Back</button>
        <button type="button" class="cr-options-pill" data-cr-next>Next → Cut</button>
      </div>
    `;
    const bgInput = body.querySelector<HTMLInputElement>('[data-cr-bg]')!;
    const bgVal = body.querySelector<HTMLElement>('[data-cr-bg-val]')!;
    const threshInput = body.querySelector<HTMLInputElement>('[data-cr-thresh]')!;
    const threshVal = body.querySelector<HTMLElement>('[data-cr-thresh-val]')!;
    const threshWrap = body.querySelector<HTMLElement>('[data-cr-thresh-wrap]')!;
    const modeEl = body.querySelector<HTMLElement>('[data-cr-mode]')!;
    const disp = body.querySelector<HTMLCanvasElement>('[data-cr-canvas]')!;

    const process = (): void => {
      const img = state.template!;
      const W = img.width;
      const H = img.height;
      const tmp = document.createElement('canvas');
      tmp.width = W;
      tmp.height = H;
      const ctx = tmp.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, W, H);
      const d = id.data;
      const isLight = isLightBg(id, W, H);
      threshWrap.style.display = isLight ? 'none' : '';
      modeEl.textContent = isLight
        ? 'Mode: light-bg (already cleared)'
        : 'Mode: dark-bg (labeled template)';
      const x0 = Math.floor(W * INNER.x0);
      const y0 = Math.floor(H * INNER.y0);
      const x1 = Math.floor(W * INNER.x1);
      const y1 = Math.floor(H * INNER.y1);
      const bg = Number(bgInput.value);
      const thresh = Number(threshInput.value);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (x < x0 || x >= x1 || y < y0 || y >= y1) {
            d[i] = d[i + 1] = d[i + 2] = bg;
            d[i + 3] = 255;
            continue;
          }
          const gray = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (isLight ? gray > LIGHT_THRESH : gray < thresh) {
            d[i] = d[i + 1] = d[i + 2] = bg;
            d[i + 3] = 255;
          }
        }
      }
      ctx.putImageData(id, 0, 0);
      state.cleared = { canvas: tmp, lightBg: isLight };
      disp.width = W;
      disp.height = H;
      disp.getContext('2d')!.drawImage(tmp, 0, 0);
    };

    bgInput.addEventListener('input', () => {
      bgVal.textContent = bgInput.value;
      process();
    });
    threshInput.addEventListener('input', () => {
      threshVal.textContent = threshInput.value;
      process();
    });
    body
      .querySelector<HTMLButtonElement>('[data-cr-back]')!
      .addEventListener('click', renderStage1);
    body.querySelector<HTMLButtonElement>('[data-cr-next]')!.addEventListener('click', () => {
      if (state.cleared) renderStage3();
    });
    process();
  }

  // ── Stage 3: cut + export ──
  function renderStage3(): void {
    markStage(2);
    const defaultName = state.templateName
      .replace(/[-\s]/g, '_')
      .replace(/(^|_)(\w)/g, (_m, p1: string, p2: string) => p1 + p2.toUpperCase());
    body.innerHTML = `
      <div class="cr-charbuilder-controls">
        <label>Class name
          <input type="text" data-cr-name value="${escapeHtml(defaultName)}" />
        </label>
        <span class="cr-charbuilder-flipinfo" data-cr-flipinfo></span>
      </div>
      <div class="cr-charbuilder-grid" data-cr-grid></div>
      <div class="cr-charbuilder-actions">
        <button type="button" class="cr-options-pill" data-cr-back>← Back</button>
        <button type="button" class="cr-options-pill cr-charbuilder-dl" data-cr-download>⬇ Download sprites</button>
      </div>
    `;
    const nameInput = body.querySelector<HTMLInputElement>('[data-cr-name]')!;
    const grid = body.querySelector<HTMLElement>('[data-cr-grid]')!;
    const flipInfo = body.querySelector<HTMLElement>('[data-cr-flipinfo]')!;
    const dlBtn = body.querySelector<HTMLButtonElement>('[data-cr-download]')!;

    const cut = (): void => {
      setStatus('Cutting sprites…');
      const cleared = state.cleared!;
      const canvas = cleared.canvas;
      const W = canvas.width;
      const H = canvas.height;
      const imageData = canvas.getContext('2d')!.getImageData(0, 0, W, H);
      const ib: InnerBox = {
        x0: Math.floor(W * INNER.x0),
        y0: Math.floor(H * INNER.y0),
        x1: Math.floor(W * INNER.x1),
        y1: Math.floor(H * INNER.y1),
      };
      const mask = buildMask(imageData, W, H, cleared.lightBg, ib);
      const cellW = (ib.x1 - ib.x0) / 4;
      const cellH = (ib.y1 - ib.y0) / 6;
      const className = nameInput.value.trim() || 'Character';
      const results: CutSprite[] = [];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
          const cx0 = Math.floor(ib.x0 + c * cellW);
          const cy0 = Math.floor(ib.y0 + r * cellH);
          const cx1 = Math.floor(cx0 + cellW);
          const cy1 = Math.floor(cy0 + cellH);
          const blob = largestBlobInCell(mask, W, cx0, cy0, cx1, cy1);
          const action = ACTIONS[r];
          const dir = DIRS[c];
          const name = `${className}_${action}_${dir}`;
          if (!blob) {
            results.push({ name, action, dir, canvas: null, flipped: false });
            continue;
          }
          let flipped = false;
          if (dir === 'Right' && isFacingLeft(imageData, W, blob)) flipped = true;
          if (dir === 'Left' && !isFacingLeft(imageData, W, blob)) flipped = true;
          let sprite = cutSpriteTo512(canvas, blob, cleared.lightBg);
          if (flipped) sprite = flipCanvas(sprite);
          results.push({ name, action, dir, canvas: sprite, flipped });
        }
      }
      state.sprites = results;
      renderGrid();
      const autoFlips = results.filter((s) => s.flipped).length;
      flipInfo.textContent = autoFlips > 0 ? `⚡ ${autoFlips} auto-flipped` : '';
      const ok = results.filter((s) => s.canvas).length;
      dlBtn.textContent = `⬇ Download ${ok} sprites`;
      dlBtn.disabled = ok === 0;
      setStatus('');
    };

    const renderGrid = (): void => {
      grid.innerHTML = '';
      for (const sp of state.sprites) {
        const cell = document.createElement('div');
        cell.className = 'cr-charbuilder-cell';
        if (sp.canvas) {
          const img = document.createElement('img');
          img.src = sp.canvas.toDataURL();
          img.alt = sp.name;
          cell.appendChild(img);
          const flip = document.createElement('button');
          flip.type = 'button';
          flip.className = 'cr-charbuilder-flip' + (sp.flipped ? ' on' : '');
          flip.textContent = sp.flipped ? '⇄ flipped' : '⇄ flip';
          flip.addEventListener('click', () => {
            sp.canvas = flipCanvas(sp.canvas!);
            sp.flipped = !sp.flipped;
            renderGrid();
          });
          cell.appendChild(flip);
        } else {
          const empty = document.createElement('div');
          empty.className = 'cr-charbuilder-empty';
          empty.textContent = 'empty';
          cell.appendChild(empty);
        }
        const cap = document.createElement('div');
        cap.className = 'cr-charbuilder-cap';
        cap.textContent = sp.name;
        cell.appendChild(cap);
        grid.appendChild(cell);
      }
    };

    const downloadAll = async (): Promise<void> => {
      for (const sp of state.sprites) {
        if (!sp.canvas) continue;
        const blob = await new Promise<Blob | null>((res) => sp.canvas!.toBlob(res, 'image/png'));
        if (!blob) continue;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${sp.name}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        await new Promise((r) => setTimeout(r, 50));
      }
      setStatus('✓ Downloaded');
    };

    nameInput.addEventListener('blur', cut);
    body
      .querySelector<HTMLButtonElement>('[data-cr-back]')!
      .addEventListener('click', renderStage2);
    dlBtn.addEventListener('click', () => {
      void downloadAll();
    });
    cut();
  }
}
