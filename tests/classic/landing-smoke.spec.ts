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
