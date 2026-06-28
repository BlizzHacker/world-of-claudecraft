# Original Cryptic Realm + ArcForge on CrypticRealm.com — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Classic" mode to CrypticRealm.com that launches the original `CrypticRealmGame.js` as a lazy-loaded React island, keep the original's own saves, and extend the existing ClaudeCraft ArcForge editor with the original's live placeable system.

**Architecture:** The original canvas game + its sibling modules + Cryptic React overlays are vendored verbatim into `cryptic-realm/src/classic/`. A new focused React mount (`ClassicCrypticMount.jsx`) replaces the role the 20-game `GameOverlay.jsx` shell played, exposing only `new CrypticRealmGame(...)` + overlay wiring. `landing.ts` gains a Classic mode-select branch that dynamically imports the island so React never enters the default ClaudeCraft bundle. ArcForge work extends the already-present `arcforge_editor.ts`.

**Tech Stack:** Vite + TypeScript (cryptic-realm), React 18 + `@vitejs/plugin-react` (Classic island only), vitest (unit), Playwright (smoke), esbuild (server), Node `pg` (server). Deploy via systemd stage services on CT171.

## Global Constraints

- **Working branch:** `codex/cryptic-v016-catchup`; dev deploy branch `codex/cryptic-token-runtime`; release branches `alpha`/`beta`/`live`. Copied verbatim from spec.
- **React must be lazy** — only the dynamically-imported `classic-entry.tsx` chunk pulls React; the default ClaudeCraft bundle (`landing.ts`/`main.ts`) must not statically import React.
- **Engine is vendored, not edited** — files under `src/classic/engine/` and `src/classic/overlays/` are copied verbatim from `moveweight-ui/src/`; only import-path rewrites are allowed, no behavioral changes.
- **Saves stay the original's own** — Cloudflare D1 + localStorage via the vendored `gameSaveSystem.js`/`crypticDatabase.js`. No bridge to ClaudeCraft accounts.
- **ArcForge proxy stays admin/mod-gated** — `/me/api/arcforge/*` validates player session via `accountForToken` + `isAdminAccount`/`isModeratorAccount`. Never loosen this.
- **Commit co-author trailer:** every commit ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **LF line endings** for `*.sh`/`*.service`/`scripts/**` (`.gitattributes` enforced).
- **moveweight-ui source paths** are under `\\192.168.0.5\lvm_shared\moveweight-ui\src\` (bash: `//192.168.0.5/lvm_shared/moveweight-ui/src/`).
- **cryptic-realm working copy:** `C:\MoveWeight\cryptic-realm` (bash: `/c/MoveWeight/cryptic-realm`).

---

## File Structure

```
cryptic-realm/
├─ src/classic/
│   ├─ engine/                  CrypticRealmGame.js + transitive sibling modules (vendored)
│   ├─ overlays/                Cryptic*.jsx + ArcForge*.jsx admin overlays (vendored)
│   ├─ ClassicCrypticMount.jsx  NEW focused React shell (class-select → game → overlays)
│   ├─ classic-entry.tsx        NEW React root API: mountClassic(el) / unmountClassic()
│   └─ classic.css              NEW island-scoped styles (full-screen root, back button)
├─ src/landing.ts               MODIFY: Classic mode-select branch + lazy island loader
├─ index.html                   MODIFY: add Classic button to #mode-select + #classic-root div
├─ vite.config.ts               MODIFY: add @vitejs/plugin-react (scoped to .jsx/.tsx)
├─ package.json                 MODIFY: add react, react-dom, @vitejs/plugin-react
├─ src/ui/cryptic/arcforge_editor.ts   MODIFY: add placeable palette/transform workflow
├─ src/classic/placeables.ts    NEW: CR_ADMIN_PLACEABLES catalog (ported from original)
└─ tests/classic/*.spec.ts      NEW: vitest unit + Playwright smoke
```

---

## Task 1: Add React toolchain to cryptic-realm (scoped, lazy)

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `vite.config.ts:94` (plugins array)
- Create: `src/classic/_smoke.tsx` (throwaway, deleted in step 6)
- Test: build output inspection

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a working `@vitejs/plugin-react` that compiles `.jsx`/`.tsx` under `src/classic/`; React available as a dependency. Later tasks rely on JSX compiling and on `react`/`react-dom` resolving.

- [ ] **Step 1: Install React + the Vite React plugin**

Run:
```bash
cd /c/MoveWeight/cryptic-realm
npm install react@18 react-dom@18
npm install -D @vitejs/plugin-react
```
Expected: packages added, no peer-dep errors.

- [ ] **Step 2: Register the React plugin in vite.config.ts**

In `vite.config.ts`, add the import at the top of the import block and add `react()` to the `plugins` array at line ~94. The plugin auto-applies only to files containing JSX, so it will not transform the existing TS entries.

```ts
import react from '@vitejs/plugin-react';
// ...
plugins: [react({ include: /\.(jsx|tsx)$/ }), linksAliasPlugin(), i18nModulepreloadPlugin()],
```

- [ ] **Step 3: Write a throwaway JSX file to prove compilation**

Create `src/classic/_smoke.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
export function smoke(el: HTMLElement): void {
  createRoot(el).render(<div data-cr-smoke>ok</div>);
}
```

- [ ] **Step 4: Verify the build compiles JSX**

Run: `cd /c/MoveWeight/cryptic-realm && npx vite build 2>&1 | tail -20`
Expected: build succeeds (no "Failed to parse source for import analysis" / JSX errors).

- [ ] **Step 5: Verify React is NOT in the default entry chunk**

Run: `grep -rl "react-dom" dist/assets/*.js 2>/dev/null | head; echo "---"; ls dist/assets | grep -iE "landing|main" | head`
Expected: the landing/main entry chunks do NOT contain `react-dom` (only the `_smoke` chunk would, if referenced — it isn't referenced by any entry, so it may be tree-shaken out entirely). The point: no React in `landing`/`main`.

- [ ] **Step 6: Delete the throwaway file**

```bash
rm src/classic/_smoke.tsx
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "build: add scoped React toolchain for Classic island

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Vendor the original engine modules (transitive closure)

**Files:**
- Create: `src/classic/engine/*.js` (CrypticRealmGame.js + all transitively-imported siblings)
- Create: `scripts/vendor-classic.mjs` (one-shot copy+verify helper)

**Interfaces:**
- Consumes: nothing from prior tasks (uses Task 1's toolchain only at build time)
- Produces: `src/classic/engine/CrypticRealmGame.js` exporting `CrypticRealmGame`, `CR_CLASSES`, `CR_ACTS`, `CR_CLASS_ORDER`, `CR_ADMIN_PLACEABLES`, `CR_ADMIN_PLACEABLE_CATEGORIES`. All relative imports resolve within `src/classic/engine/`.

- [ ] **Step 1: Write the vendor script (copy + unresolved-import check)**

Create `scripts/vendor-classic.mjs`. It copies `CrypticRealmGame.js`, then repeatedly scans copied files for `from './X'` / `from '../X'` imports, copying any missing sibling, until the set is closed. Then it prints any imports that still can't be resolved on disk.

```js
import { existsSync, copyFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const SRC = '//192.168.0.5/lvm_shared/moveweight-ui/src';
const DST = resolve('src/classic/engine');
mkdirSync(DST, { recursive: true });

const seen = new Set();
const queue = ['CrypticRealmGame.js'];
const unresolved = [];

function importsOf(code) {
  const re = /(?:from|import)\s+['"](\.\.?\/[^'"]+)['"]/g;
  const out = []; let m;
  while ((m = re.exec(code))) out.push(m[1]);
  return out;
}

while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  seen.add(rel);
  const from = join(SRC, rel);
  if (!existsSync(from)) { unresolved.push(rel); continue; }
  const to = join(DST, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  for (const imp of importsOf(readFileSync(from, 'utf8'))) {
    // only follow .js/.jsx engine siblings here; .jsx overlays handled in Task 3
    let target = imp.replace(/^\.\//, '');
    if (!/\.[jt]sx?$/.test(target)) target += '.js';
    if (target.endsWith('.jsx')) continue; // overlays are vendored separately
    queue.push(target.replace(/^\.\.\//, ''));
  }
}
console.log('Copied', seen.size - unresolved.length, 'files');
if (unresolved.length) { console.error('UNRESOLVED:', unresolved); process.exit(1); }
```

- [ ] **Step 2: Run the vendor script**

Run: `cd /c/MoveWeight/cryptic-realm && node scripts/vendor-classic.mjs`
Expected: "Copied N files", exit 0, no UNRESOLVED list. (If `.jsx` overlays show up as unresolved here, that's expected — they are excluded; only pure-engine `.js` should be unresolved-free.)

- [ ] **Step 3: Manually confirm the named exports exist in the copy**

Run: `grep -nE "export (const|class) (CrypticRealmGame|CR_CLASSES|CR_ACTS|CR_CLASS_ORDER|CR_ADMIN_PLACEABLES|CR_ADMIN_PLACEABLE_CATEGORIES)" src/classic/engine/CrypticRealmGame.js`
Expected: all six names appear as exports.

- [ ] **Step 4: Type-check / build to surface broken imports**

Run: `npx vite build 2>&1 | grep -iE "could not resolve|failed to resolve|rollup" | head`
Expected: no unresolved-import errors referencing `src/classic/engine/`. (Build may still fail later for missing overlays — that's Task 3. Filter for engine-path errors only.)

- [ ] **Step 5: Commit**

```bash
git add scripts/vendor-classic.mjs src/classic/engine
git commit -m "feat(classic): vendor original Cryptic engine modules

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Vendor the Cryptic React overlays

**Files:**
- Create: `src/classic/overlays/CrypticInventoryOverlay.jsx`, `CrypticSkillTreeOverlay.jsx`, `CrypticStashOverlay.jsx`, `CrypticQuestLog.jsx`, `CrypticPauseOverlay.jsx`, `CrypticFishingMinigame.jsx`
- Create: `src/classic/overlays/ArcForgePalette.jsx`, `ArcForgeTransformPopup.jsx`, `ArcForgeInGameQueue.jsx`
- Modify: `scripts/vendor-classic.mjs` (add overlay list)

**Interfaces:**
- Consumes: `src/classic/engine/*` (overlays import `CrypticRealmGame.js` exports like `CR_CLASSES`)
- Produces: default-exported React components: `CrypticInventoryOverlay`, `CrypticSkillTreeOverlay`, `CrypticStashOverlay`, `CrypticQuestLog`, `CrypticPauseOverlay`, `CrypticFishingMinigame`; named export `{ ArcForgeInGameQueue }`; default `ArcForgePalette`, `ArcForgeTransformPopup`. Their import paths point at `../engine/`.

- [ ] **Step 1: Add the overlay list to the vendor script**

Append to `scripts/vendor-classic.mjs` an explicit overlay copy (these import engine modules but also each other):
```js
const OVERLAYS = [
  'CrypticInventoryOverlay.jsx','CrypticSkillTreeOverlay.jsx','CrypticStashOverlay.jsx',
  'CrypticQuestLog.jsx','CrypticPauseOverlay.jsx','CrypticFishingMinigame.jsx',
  'ArcForgePalette.jsx','ArcForgeTransformPopup.jsx','ArcForgeInGameQueue.jsx',
];
import { writeFileSync } from 'node:fs';
const OVDST = resolve('src/classic/overlays');
mkdirSync(OVDST, { recursive: true });
for (const f of OVERLAYS) {
  let code = readFileSync(join(SRC, f), 'utf8');
  // overlays import engine modules as './X' — repoint to '../engine/X'
  code = code.replace(/from\s+(['"])\.\/(crypticD2CoreData|crypticAssets|CrypticRealmGame|crypticD2Engine|crypticD2Systems|FishingGame|crypticDatabase)(\.js)?\1/g,
    (_m, q, name) => `from ${q}../engine/${name}.js${q}`);
  writeFileSync(join(OVDST, f), code);
}
console.log('Copied overlays:', OVERLAYS.length);
```

- [ ] **Step 2: Re-run the vendor script**

Run: `node scripts/vendor-classic.mjs`
Expected: "Copied overlays: 9", exit 0.

- [ ] **Step 3: Grep for any remaining `./` engine imports in overlays (must be repointed)**

Run: `grep -rnE "from ['\"]\./(crypticD2CoreData|crypticAssets|CrypticRealmGame|crypticD2Engine|FishingGame|crypticDatabase)" src/classic/overlays/`
Expected: NO output (all repointed to `../engine/`). If any remain, fix the regex in step 1 and re-run.

- [ ] **Step 4: Confirm overlay exports**

Run: `grep -rnE "export default|export (function|const) (ArcForgeInGameQueue)" src/classic/overlays/ | head`
Expected: each overlay file shows a default or the named `ArcForgeInGameQueue` export.

- [ ] **Step 5: Commit**

```bash
git add scripts/vendor-classic.mjs src/classic/overlays
git commit -m "feat(classic): vendor Cryptic React overlays

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: ClassicCrypticMount — the focused React shell

**Files:**
- Create: `src/classic/ClassicCrypticMount.jsx`
- Create: `src/classic/classic.css`
- Test: `tests/classic/mount.spec.ts` (vitest + jsdom)

**Interfaces:**
- Consumes: `src/classic/engine/CrypticRealmGame.js` (`CrypticRealmGame`, `CR_CLASSES`, `CR_CLASS_ORDER`, `CR_ACTS`); overlays from `src/classic/overlays/`
- Produces: default-exported React component `ClassicCrypticMount` with props `{ onExit: () => void }`. It renders a class-select, then on "Play" instantiates `new CrypticRealmGame(canvasEl, classId, 'normal', 1, 'high', { current: savedState }, { settings:{}, accountKey:'classic', apiSettings:{}, characterId:null, chromeTopInset:0, isAdmin:false })` and mounts overlays.

- [ ] **Step 1: Write the failing test**

Create `tests/classic/mount.spec.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// engine is heavy/canvas — stub it
vi.mock('../../src/classic/engine/CrypticRealmGame.js', () => ({
  CrypticRealmGame: class { destroy(){} },
  CR_CLASSES: { ember_witch: { name: 'Ember Witch' } },
  CR_CLASS_ORDER: ['ember_witch'],
  CR_ACTS: [{ id: 1, name: 'Act I' }],
}));

import ClassicCrypticMount from '../../src/classic/ClassicCrypticMount.jsx';

describe('ClassicCrypticMount', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  it('renders class select with the back control', () => {
    render(React.createElement(ClassicCrypticMount, { onExit: () => {} }));
    expect(screen.getByText(/Ember Witch/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /back to crypticrealm/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Install test deps + run to confirm failure**

Run:
```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
npx vitest run tests/classic/mount.spec.ts 2>&1 | tail -15
```
Expected: FAIL — `ClassicCrypticMount.jsx` does not exist. (If vitest isn't configured for jsdom, add `environment: 'jsdom'` to `vitest.config` or a `// @vitest-environment jsdom` docblock at the top of the test.)

- [ ] **Step 3: Write ClassicCrypticMount.jsx (minimal: class-select + back + canvas mount)**

Create `src/classic/ClassicCrypticMount.jsx`:
```jsx
import React, { useState, useRef, useEffect } from 'react';
import { CrypticRealmGame, CR_CLASSES, CR_CLASS_ORDER } from './engine/CrypticRealmGame.js';
import './classic.css';

export default function ClassicCrypticMount({ onExit }) {
  const [started, setStarted] = useState(false);
  const [classId, setClassId] = useState(CR_CLASS_ORDER[0]);
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!started || !canvasRef.current) return;
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem('cr_classic_save') || 'null'); }
      catch { return null; }
    })();
    gameRef.current = new CrypticRealmGame(
      canvasRef.current, classId, 'normal', 1, 'high',
      { current: saved },
      { settings: {}, accountKey: 'classic', apiSettings: {},
        characterId: null, chromeTopInset: 0, isAdmin: false },
    );
    return () => { try { gameRef.current?.destroy?.(); } catch {} };
  }, [started, classId]);

  return (
    <div className="cr-classic-root">
      <button className="cr-classic-back" onClick={onExit}>← Back to CrypticRealm.com</button>
      {!started ? (
        <div className="cr-classic-select">
          <h1>Original Cryptic Realm</h1>
          <div className="cr-classic-classes">
            {CR_CLASS_ORDER.map((id) => (
              <button key={id} className={id === classId ? 'sel' : ''} onClick={() => setClassId(id)}>
                {CR_CLASSES[id]?.name ?? id}
              </button>
            ))}
          </div>
          <button className="cr-classic-play" onClick={() => setStarted(true)}>Play</button>
        </div>
      ) : (
        <canvas ref={canvasRef} className="cr-classic-canvas" />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write classic.css**

Create `src/classic/classic.css`:
```css
.cr-classic-root { position: fixed; inset: 0; background: #08060d; color: #e7d8ff; z-index: 9000; overflow: hidden; }
.cr-classic-back { position: absolute; top: 12px; left: 12px; z-index: 9100; padding: 8px 14px; cursor: pointer; }
.cr-classic-select { display: grid; place-content: center; gap: 18px; height: 100%; text-align: center; }
.cr-classic-classes { display: flex; flex-wrap: wrap; gap: 8px; max-width: 720px; }
.cr-classic-classes button.sel { outline: 2px solid #b07cff; }
.cr-classic-canvas { width: 100%; height: 100%; display: block; }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/classic/mount.spec.ts 2>&1 | tail -10`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/classic/ClassicCrypticMount.jsx src/classic/classic.css tests/classic/mount.spec.ts package.json package-lock.json
git commit -m "feat(classic): ClassicCrypticMount React shell

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: classic-entry.tsx — React root lifecycle API

**Files:**
- Create: `src/classic/classic-entry.tsx`
- Test: `tests/classic/entry.spec.ts`

**Interfaces:**
- Consumes: `ClassicCrypticMount` (default export, props `{ onExit }`)
- Produces: named exports `mountClassic(el: HTMLElement, opts?: { onExit?: () => void }): void` and `unmountClassic(): void`. `mountClassic` creates a React root on `el` and renders `ClassicCrypticMount`; `unmountClassic` unmounts and clears the root. These are what `landing.ts` dynamically imports.

- [ ] **Step 1: Write the failing test**

Create `tests/classic/entry.spec.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
vi.mock('../../src/classic/ClassicCrypticMount.jsx', () => ({
  default: ({ onExit }: { onExit: () => void }) =>
    // minimal stand-in element
    (require('react').createElement('div', { 'data-cr-mounted': true })),
}));
import { mountClassic, unmountClassic } from '../../src/classic/classic-entry';

describe('classic-entry', () => {
  it('mounts and unmounts on a host element', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mountClassic(host);
    await Promise.resolve();
    expect(host.querySelector('[data-cr-mounted]')).toBeTruthy();
    unmountClassic();
    await Promise.resolve();
    expect(host.querySelector('[data-cr-mounted]')).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run tests/classic/entry.spec.ts 2>&1 | tail -12`
Expected: FAIL — `classic-entry` not found.

- [ ] **Step 3: Implement classic-entry.tsx**

Create `src/classic/classic-entry.tsx`:
```tsx
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ClassicCrypticMount from './ClassicCrypticMount.jsx';

let root: Root | null = null;
let host: HTMLElement | null = null;

export function mountClassic(el: HTMLElement, opts?: { onExit?: () => void }): void {
  host = el;
  el.style.display = 'block';
  root = createRoot(el);
  root.render(
    React.createElement(ClassicCrypticMount, {
      onExit: () => { opts?.onExit?.(); unmountClassic(); },
    }),
  );
}

export function unmountClassic(): void {
  try { root?.unmount(); } catch { /* noop */ }
  root = null;
  if (host) { host.innerHTML = ''; host.style.display = 'none'; host = null; }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/classic/entry.spec.ts 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/classic/classic-entry.tsx tests/classic/entry.spec.ts
git commit -m "feat(classic): mount/unmount lifecycle API for the island

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Wire Classic into the landing mode-select

**Files:**
- Modify: `index.html` (add Classic button in `#mode-select` near line 7745; add `<div id="classic-root">`)
- Modify: `src/landing.ts` (add `launchClassic()` + click handler)
- Test: `tests/classic/landing-smoke.spec.ts` (Playwright, runs against dev build)

**Interfaces:**
- Consumes: `mountClassic`/`unmountClassic` from `./classic/classic-entry` (dynamic import)
- Produces: a `#btn-classic-mode` button and `#classic-root` container; clicking the button hides landing panels and mounts the island; the island's onExit restores `#mode-select`.

- [ ] **Step 1: Add the Classic button + root container to index.html**

In `index.html`, inside the `#mode-select` block (after the existing server-select, ~line 7757), add:
```html
<button type="button" id="btn-classic-mode" class="mode-classic-btn">Play Classic Cryptic Realm</button>
```
And just before `</body>` add:
```html
<div id="classic-root" style="display:none"></div>
```

- [ ] **Step 2: Write the failing Playwright smoke test**

Create `tests/classic/landing-smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
const BASE = process.env.CR_SMOKE_URL || 'http://localhost:8803';
test('classic mode launches the island and returns', async ({ page }) => {
  await page.goto(BASE);
  await page.click('#btn-classic-mode');
  await expect(page.locator('.cr-classic-root')).toBeVisible();
  await expect(page.getByText(/Original Cryptic Realm/i)).toBeVisible();
  await page.click('.cr-classic-back');
  await expect(page.locator('#mode-select')).toBeVisible();
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx playwright test tests/classic/landing-smoke.spec.ts 2>&1 | tail -15`
Expected: FAIL — button `#btn-classic-mode` has no handler / island never mounts. (Requires a dev server; if none running, this fails to connect — that still counts as red.)

- [ ] **Step 4: Add launchClassic() to landing.ts**

In `src/landing.ts`, add near the other panel helpers:
```ts
async function launchClassic(): Promise<void> {
  const host = document.getElementById('classic-root');
  if (!host) return;
  try {
    const mod = await import('./classic/classic-entry');
    document.querySelectorAll<HTMLElement>(
      '#mode-select,#login-panel,#realm-panel,#charselect-panel,#offline-select',
    ).forEach((el) => { el.style.display = 'none'; });
    mod.mountClassic(host, {
      onExit: () => {
        const ms = document.getElementById('mode-select');
        if (ms) ms.style.display = '';
      },
    });
  } catch (err) {
    console.error('[classic] failed to launch', err);
    host.style.display = 'none';
  }
}
```
And wire the button (in the same place existing buttons are bound):
```ts
document.getElementById('btn-classic-mode')?.addEventListener('click', () => { void launchClassic(); });
```

- [ ] **Step 5: Build + start a local preview, run the smoke test**

Run:
```bash
npx vite build && npx vite preview --port 8803 &
sleep 4
CR_SMOKE_URL=http://localhost:8803 npx playwright test tests/classic/landing-smoke.spec.ts 2>&1 | tail -15
kill %1 2>/dev/null
```
Expected: PASS — island appears, back returns to mode-select.

- [ ] **Step 6: Commit**

```bash
git add index.html src/landing.ts tests/classic/landing-smoke.spec.ts
git commit -m "feat(classic): mode-select entry that lazy-loads the island

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Resolve Classic engine asset base URLs

**Files:**
- Create: `public/classic/` (copied atlases/templates as needed) OR
- Modify: `src/classic/engine/crypticAssets.js` import-rewrite step in `scripts/vendor-classic.mjs` (repoint asset base)
- Test: `tests/classic/landing-smoke.spec.ts` extended (no console 404 storm)

**Interfaces:**
- Consumes: the running island from Task 6
- Produces: engine asset references (`CR_LOGO_URL`, sprite atlas URLs, KayKit GLB URLs) that resolve under the cryptic-realm origin without a 404 storm.

- [ ] **Step 1: Identify the asset base URL(s) the engine uses**

Run: `grep -rnE "https?://|/cryptic-assets|/assets/|CR_LOGO_URL|atlasUrl|kayBase|baseUrl" src/classic/engine/crypticAssets.js src/classic/engine/crypticKayKitMap.js | head -30`
Record each base path/URL.

- [ ] **Step 2: Decide per base: already-absolute (leave) vs relative (must host)**

For absolute `https://…moveweight…` URLs that still resolve publicly: leave them. For root-relative paths (`/cryptic-assets/…`, `/assets/cr/…`): they must exist under cryptic-realm `public/`. List which directories are needed.

- [ ] **Step 3: Copy required asset dirs into public/classic/ (only the relative ones)**

For each needed relative dir, copy from moveweight-ui public. Example (adjust to actual paths found):
```bash
mkdir -p public/classic
cp -r "//192.168.0.5/lvm_shared/moveweight-ui/public/cryptic-assets" public/classic/ 2>/dev/null || true
```
Then add a base-URL rewrite in `scripts/vendor-classic.mjs` so engine asset paths point at `/classic/...`:
```js
// after copying crypticAssets.js:
let a = readFileSync(join(DST,'crypticAssets.js'),'utf8');
a = a.replace(/(['"])\/cryptic-assets\//g, '$1/classic/cryptic-assets/');
writeFileSync(join(DST,'crypticAssets.js'), a);
```
Re-run `node scripts/vendor-classic.mjs`.

- [ ] **Step 4: Extend the smoke test to assert no 404 storm**

Append to `tests/classic/landing-smoke.spec.ts`:
```ts
test('classic island does not 404-storm on assets', async ({ page }) => {
  const bad: string[] = [];
  page.on('response', (r) => { if (r.status() === 404 && /cryptic|assets|atlas|glb/i.test(r.url())) bad.push(r.url()); });
  await page.goto(BASE);
  await page.click('#btn-classic-mode');
  await page.getByText(/Play/i).click();
  await page.waitForTimeout(3000);
  expect(bad, bad.slice(0, 8).join('\n')).toHaveLength(0);
});
```

- [ ] **Step 5: Build, preview, run the asset smoke test**

Run:
```bash
npx vite build && npx vite preview --port 8803 &
sleep 4
CR_SMOKE_URL=http://localhost:8803 npx playwright test tests/classic/landing-smoke.spec.ts 2>&1 | tail -20
kill %1 2>/dev/null
```
Expected: PASS — zero cryptic-asset 404s. If some remain, repeat steps 1-3 for the missing base.

- [ ] **Step 6: Commit**

```bash
git add public/classic scripts/vendor-classic.mjs src/classic/engine/crypticAssets.js tests/classic/landing-smoke.spec.ts
git commit -m "feat(classic): host engine assets under /classic, kill 404 storm

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Verify the existing ArcForge editor still builds + gates

**Files:**
- Read: `src/ui/cryptic/arcforge_editor.ts`, `server/arcforge_proxy.ts`, `server/dashboard.ts:203`
- Test: `tests/classic/arcforge-gate.spec.ts` (Playwright API-level)

**Interfaces:**
- Consumes: nothing new
- Produces: confirmation that `/me/api/arcforge/health` returns 403 for anon and the editor module imports cleanly. Establishes the baseline before Task 9 extends it.

- [ ] **Step 1: Write the failing gate test**

Create `tests/classic/arcforge-gate.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
const BASE = process.env.CR_SMOKE_URL || 'http://localhost:8803';
test('arcforge proxy rejects anonymous', async ({ request }) => {
  const res = await request.get(`${BASE}/me/api/arcforge/health`);
  expect([401, 403]).toContain(res.status());
});
```

- [ ] **Step 2: Confirm server build compiles the proxy**

Run: `npm run build:server 2>&1 | tail -8`
Expected: PASS (esbuild emits `dist-server/server.cjs`, no TS errors in `arcforge_proxy.ts`).

- [ ] **Step 3: Run the gate test against a server build**

Run (against a running stage, e.g. dev 8803, or local server):
```bash
CR_SMOKE_URL=http://localhost:8803 npx playwright test tests/classic/arcforge-gate.spec.ts 2>&1 | tail -10
```
Expected: PASS (401/403 for anon). If it returns 200, the gate regressed — stop and fix `arcforge_proxy.ts` before continuing.

- [ ] **Step 4: Commit**

```bash
git add tests/classic/arcforge-gate.spec.ts
git commit -m "test(arcforge): baseline anon-gate smoke for /me/api/arcforge

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Extend ArcForge editor with the placeable palette

**Files:**
- Create: `src/classic/placeables.ts` (catalog ported from original `CR_ADMIN_PLACEABLES`)
- Modify: `src/ui/cryptic/arcforge_editor.ts` (add a "Placeables" panel)
- Test: `tests/classic/placeables.spec.ts` (vitest — catalog shape) + manual editor open

**Interfaces:**
- Consumes: existing `openArcForgeEditor()` in `arcforge_editor.ts`; the original `CR_ADMIN_PLACEABLES`/`CR_ADMIN_PLACEABLE_CATEGORIES` shapes
- Produces: `CR_PLACEABLES: PlaceableDef[]` and `CR_PLACEABLE_CATEGORIES: string[]` from `src/classic/placeables.ts`, where `PlaceableDef = { id: string; label: string; category: string; assetUrl?: string }`. The editor renders a category-grouped palette built from these.

- [ ] **Step 1: Extract the catalog from the original**

Run: `sed -n '256,420p' "//192.168.0.5/lvm_shared/moveweight-ui/src/CrypticRealmGame.js"` to read `CR_ADMIN_PLACEABLES` + `CR_ADMIN_PLACEABLE_CATEGORIES`. Record the entries' real field names.

- [ ] **Step 2: Write the failing catalog test**

Create `tests/classic/placeables.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { CR_PLACEABLES, CR_PLACEABLE_CATEGORIES } from '../../src/classic/placeables';
describe('placeables catalog', () => {
  it('every placeable has id/label/category in a known category', () => {
    expect(CR_PLACEABLES.length).toBeGreaterThan(0);
    for (const p of CR_PLACEABLES) {
      expect(p.id && p.label && p.category).toBeTruthy();
      expect(CR_PLACEABLE_CATEGORIES).toContain(p.category);
    }
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run tests/classic/placeables.spec.ts 2>&1 | tail -10`
Expected: FAIL — `src/classic/placeables.ts` missing.

- [ ] **Step 4: Write placeables.ts (transcribe the catalog, typed)**

Create `src/classic/placeables.ts`. Transcribe the real entries from step 1 into:
```ts
export interface PlaceableDef { id: string; label: string; category: string; assetUrl?: string; }
export const CR_PLACEABLE_CATEGORIES: string[] = [ /* real categories from step 1 */ ];
export const CR_PLACEABLES: PlaceableDef[] = [ /* real entries from step 1, mapped to {id,label,category,assetUrl} */ ];
```
(Map the original field names to `{id,label,category,assetUrl}`; keep all entries.)

- [ ] **Step 5: Run the catalog test to verify it passes**

Run: `npx vitest run tests/classic/placeables.spec.ts 2>&1 | tail -10`
Expected: PASS.

- [ ] **Step 6: Add a Placeables panel to arcforge_editor.ts**

In `openArcForgeEditor()` HTML (after the pipeline-stages block ~line 142), add a palette section, and a render call. Minimal addition:
```ts
import { CR_PLACEABLES, CR_PLACEABLE_CATEGORIES } from '../../classic/placeables';
// ...in the editor HTML string, add:
//   <div class="cr-afe-placeables" data-cr-afe-placeables></div>
// ...after the host is built:
function renderPlaceables(rootEl: HTMLElement): void {
  const host = rootEl.querySelector('[data-cr-afe-placeables]') as HTMLElement | null;
  if (!host) return;
  host.innerHTML = CR_PLACEABLE_CATEGORIES.map((cat) => {
    const items = CR_PLACEABLES.filter((p) => p.category === cat)
      .map((p) => `<button type="button" class="cr-afe-place" data-place-id="${p.id}">${p.label}</button>`).join('');
    return `<section class="cr-afe-cat"><h4>${cat}</h4>${items}</section>`;
  }).join('');
}
```
Call `renderPlaceables(host)` where the editor finishes building its DOM. (Wiring click→live-scene placement is the hot-swap follow-up noted in the spec's out-of-scope-for-v1/TODO; v1 surfaces the palette.)

- [ ] **Step 7: Verify the editor build still compiles**

Run: `npx vite build 2>&1 | grep -iE "arcforge|placeable|error" | head; echo "exit: $?"`
Expected: no errors referencing arcforge_editor or placeables.

- [ ] **Step 8: Commit**

```bash
git add src/classic/placeables.ts src/ui/cryptic/arcforge_editor.ts tests/classic/placeables.spec.ts
git commit -m "feat(arcforge): placeable palette ported from original

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Full build gate + deploy to dev + verify live

**Files:**
- Read: all of the above
- No new source files; this task is the integration + deploy gate.

**Interfaces:**
- Consumes: everything
- Produces: a deployed, publicly-verified Classic mode + ArcForge on `dev.crypticrealm.com`, then rolled to live.

- [ ] **Step 1: Full client + server build**

Run: `npm run build && npm run build:server 2>&1 | tail -15`
Expected: both succeed.

- [ ] **Step 2: Run the whole classic test suite**

Run: `npx vitest run tests/classic 2>&1 | tail -15`
Expected: all unit tests PASS.

- [ ] **Step 3: Sync working branch → dev deploy branch + push**

Run:
```bash
git push origin codex/cryptic-v016-catchup
git branch -f codex/cryptic-token-runtime codex/cryptic-v016-catchup
git push origin codex/cryptic-token-runtime
```
Expected: pushes succeed (if non-fast-forward, use `git push origin $(git rev-parse HEAD):refs/heads/codex/cryptic-token-runtime`).

- [ ] **Step 4: Deploy the dev stage on CT171**

Run:
```bash
ssh 192.168.0.6 "pct exec 171 -- bash -lc 'cd /opt/cryptic-realm && bash scripts/admin/deploy-stage.sh crypticrealm dev'"
```
Expected: build+restart succeeds (exit 0). If env-file landmine hits, run `node scripts/admin/gen-stage-env.mjs` first (see staging memory).

- [ ] **Step 5: Playwright smoke against the PUBLIC dev URL**

Run: `CR_SMOKE_URL=https://dev.crypticrealm.com npx playwright test tests/classic 2>&1 | tail -20`
Expected: Classic launches, returns, no asset 404 storm, arcforge anon→403.

- [ ] **Step 6: Verify the public bundle hash actually changed**

Run: `curl -s https://dev.crypticrealm.com/ | grep -oE 'assets/[A-Za-z0-9_-]+\.js' | head; echo '--- compare to ---'; ssh 192.168.0.6 "pct exec 171 -- bash -lc 'ls /opt/cr-stages/crypticrealm/dev/dist/assets | grep -E \"index|landing\" | head'"`
Expected: the hash served publicly matches the freshly-built dist (NOT a stale bundle). "curl localhost=200" is not "live" — this step is the real gate.

- [ ] **Step 7: Roll out to live (after dev verified)**

Run:
```bash
git branch -f alpha codex/cryptic-token-runtime && git branch -f beta codex/cryptic-token-runtime && git branch -f live codex/cryptic-token-runtime
git push origin alpha beta live
ssh 192.168.0.6 "pct exec 171 -- bash -lc 'cd /opt/cryptic-realm && for s in alpha beta live; do bash scripts/admin/deploy-stage.sh crypticrealm \$s; done'"
```
Expected: all three stages redeploy. Then verify apex: `curl -s https://crypticrealm.com/ | grep -oE 'assets/[A-Za-z0-9_-]+\.js' | head` matches the live dist (apex Traefik → crypticrealm-live :8800).

- [ ] **Step 8: Final commit (any deploy-script tweaks) + push**

```bash
git add -A -- scripts/ docs/
git commit -m "chore(classic): deploy notes + script tweaks for Classic + ArcForge rollout

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" || echo "nothing to commit"
git push origin codex/cryptic-v016-catchup
```

---

## Self-Review

**Spec coverage:**
- Classic mode-select entry → Tasks 1,6 ✓
- React island (focused, not GameOverlay) → Tasks 4,5 ✓
- Vendor engine + overlays → Tasks 2,3 ✓
- Keep original's saves → Task 4 (localStorage `cr_classic_save` + engine's own D1 path, vendored) ✓
- ArcForge verify-existing → Task 8 ✓; extend with placeables → Task 9 ✓
- Asset base URL resolution → Task 7 ✓
- Deploy + public-hash verify → Task 10 ✓
- Testing (Playwright smoke a–d) → Tasks 6,7,8,10 ✓

**Placeholder scan:** Catalog entries in Task 9 step 4 are transcribed from a real `sed` read in step 1 (not a TODO) — the entries are data the engineer copies, with the source command given. No "add error handling"/"TBD" left.

**Type consistency:** `mountClassic(el, opts)`/`unmountClassic()` defined in Task 5, consumed in Task 6 ✓. `ClassicCrypticMount` props `{ onExit }` defined Task 4, consumed Task 5 ✓. `PlaceableDef`/`CR_PLACEABLES`/`CR_PLACEABLE_CATEGORIES` defined Task 9, used consistently ✓. `CrypticRealmGame` constructor arg order matches the verified `GameOverlay.jsx:2324` signature ✓.

**Known v1 limitation (carried from spec):** ArcForge placeable palette is surfaced but click→live-scene placement (hot-swap) is the documented follow-up, not in this plan.
