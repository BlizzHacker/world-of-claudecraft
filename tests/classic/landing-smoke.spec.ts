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

test('classic island does not 404-storm on assets', async ({ page }) => {
  const bad: string[] = [];
  page.on('response', (r) => {
    if (r.status() === 404 && /cryptic|assets|atlas|glb/i.test(r.url())) bad.push(r.url());
  });
  await page.goto(BASE);
  await page.click('#btn-classic-mode');
  await page.click('.cr-classic-play');
  await page.waitForTimeout(3000);
  expect(bad, bad.slice(0, 8).join('\n')).toHaveLength(0);
});
