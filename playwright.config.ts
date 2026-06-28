import { defineConfig } from '@playwright/test';

// Playwright e2e specs for the Classic island + ArcForge gate. These run
// against a live URL (local `vite preview` or a deployed stage) via
// CR_SMOKE_URL, not under vitest. Run with: npx playwright test
export default defineConfig({
  testDir: './tests/classic',
  testMatch: ['landing-smoke.spec.ts', 'arcforge-gate.spec.ts'],
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.CR_SMOKE_URL || 'http://localhost:8803',
  },
});
