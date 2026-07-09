// E2E Verification Script: checks homepage layout, view switching, and localization.
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { BROWSER_PATH } from './browser_path.mjs';

const GAME_URL = process.env.GAME_URL ?? 'http://localhost:5173';
const EXPECTED_APP_VERSION =
  process.env.EXPECTED_APP_VERSION ??
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const BASE_URL = new URL(GAME_URL);
const IS_LOCAL = ['localhost', '127.0.0.1', '::1'].includes(BASE_URL.hostname);

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore connection errors
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

function isExpectedUnauthedResponse(url, status) {
  if (status !== 401 && status !== 403) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.pathname === '/api/oauth/authentik/status' ||
      parsed.pathname === '/me/api/me' ||
      parsed.pathname === '/api/account'
    );
  } catch {
    return false;
  }
}

function isExpectedConsoleNoise(text) {
  return (
    text.includes('502') ||
    text.includes('Bad Gateway') ||
    text.includes('project-stats') ||
    text.startsWith('Failed to load resource: the server responded with a status of 401') ||
    text.startsWith('Failed to load resource: the server responded with a status of 403')
  );
}

async function waitForIdlePaint(page) {
  await page.waitForSelector('#hero-view', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 500));
}

async function readText(page, selector) {
  return page.evaluate((sel) => document.querySelector(sel)?.textContent?.trim() ?? '', selector);
}

async function waitForHtmlLang(page, expected) {
  await page.waitForFunction(
    (lang) => document.documentElement.lang === lang,
    {
      timeout: 10000,
    },
    expected,
  );
}

async function main() {
  if (IS_LOCAL) {
    console.log('Waiting for local dev server and game server to be ready...');
    await waitForServer(BASE_URL.origin);
    await waitForServer(`${BASE_URL.origin}/api/project-stats`);
    console.log('Servers are ready.');
  } else {
    console.log(`Running production homepage verification against ${BASE_URL.origin}.`);
  }

  console.log(`Launching browser from: ${BROWSER_PATH}`);
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: 'new',
    args: ['--window-size=1280,800', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  const pageErrors = [];
  const unexpectedResponses = [];
  page.on('pageerror', (e) => {
    console.error(`Browser Page Error: ${e.message}`);
    pageErrors.push(e);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (isExpectedConsoleNoise(text)) {
        console.log(`Ignoring expected browser startup network noise: ${text}`);
        return;
      }
      console.error(`Browser Console Error: ${text}`);
      pageErrors.push(new Error(text));
    }
  });
  page.on('response', (res) => {
    const status = res.status();
    if (status < 400 || isExpectedUnauthedResponse(res.url(), status)) return;
    unexpectedResponses.push({ status, url: res.url() });
  });

  try {
    console.log(`Navigating to ${GAME_URL}...`);
    await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForIdlePaint(page);

    // Verify Title and Meta Description
    const pageTitle = await page.title();
    console.log(`Page Title: "${pageTitle}"`);
    if (pageTitle !== 'Cryptic Realm: Classic-Style Web MMO') {
      throw new Error(`Unexpected page title: "${pageTitle}"`);
    }

    const metaDescription = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="description"]');
      return meta ? meta.getAttribute('content') : null;
    });
    console.log(`Meta Description: "${metaDescription}"`);
    if (!metaDescription?.includes('Cryptic Realm')) {
      throw new Error(`Unexpected or missing meta description: "${metaDescription}"`);
    }

    const footerVersion = await readText(page, '#game-version');
    console.log(`Footer Version: "${footerVersion}"`);
    if (!footerVersion.startsWith(`v${EXPECTED_APP_VERSION}`)) {
      throw new Error(
        `Deployed footer version "${footerVersion}" does not match expected v${EXPECTED_APP_VERSION}.`,
      );
    }

    // Define views and their corresponding navigation buttons
    const views = [
      { id: '#hero-view', btn: '#nav-btn-play' },
      { id: '#highscores-view', btn: '#nav-btn-highscores' },
      { id: '#news-view', btn: '#nav-btn-news' },
      { id: '#download-view', btn: '#nav-btn-download' },
    ];

    // Helper to assert view visibility
    const assertActiveView = async (activeViewId) => {
      for (const view of views) {
        const isHidden = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return true;
          // check hidden attribute or display styling
          return el.hasAttribute('hidden') || el.style.display === 'none';
        }, view.id);

        const ariaHidden = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          return el ? el.getAttribute('aria-hidden') : null;
        }, view.id);

        if (view.id === activeViewId) {
          if (isHidden) {
            throw new Error(`Expected active view ${view.id} to be visible, but it is hidden.`);
          }
          if (ariaHidden !== 'false') {
            throw new Error(
              `Expected active view ${view.id} to have aria-hidden="false", got "${ariaHidden}".`,
            );
          }
        } else {
          if (!isHidden) {
            throw new Error(`Expected inactive view ${view.id} to be hidden, but it is visible.`);
          }
          if (ariaHidden !== 'true') {
            throw new Error(
              `Expected inactive view ${view.id} to have aria-hidden="true", got "${ariaHidden}".`,
            );
          }
        }
      }
    };

    // 1. Initial State Check (Hero view should be active by default)
    console.log('Verifying initial view state (Hero view active)...');
    await assertActiveView('#hero-view');

    // 2. Click through each navigation tab and assert section visibility
    for (const view of views) {
      if (view.id === '#hero-view') continue; // we already verified initial hero state, we'll click it later
      console.log(`Clicking ${view.btn} to open ${view.id}...`);
      await page.click(view.btn);
      // Wait a short time for transitions
      await new Promise((r) => setTimeout(r, 300));
      await assertActiveView(view.id);
    }

    // Go back to Hero view
    console.log('Clicking #nav-btn-play to return to Hero view...');
    await page.click('#nav-btn-play');
    await new Promise((r) => setTimeout(r, 300));
    await assertActiveView('#hero-view');

    // 3. Verify Dynamic Translation (English -> Spanish)
    console.log('Verifying dynamic localization switcher...');

    // Check initial English texts
    const engPlayText = await readText(page, '#nav-btn-play');
    console.log(`English Play nav text: "${engPlayText}"`);
    if (engPlayText !== 'Play') {
      throw new Error(`Expected English play nav text to be "Play", got "${engPlayText}"`);
    }

    // Change language to Spanish (es)
    console.log('Switching language to Spanish (es)...');
    await page.evaluate(() => {
      const select = document.querySelector('#lang-select');
      if (select) {
        select.value = 'es';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    // Wait for client translation
    await waitForHtmlLang(page, 'es');

    // Verify html lang attribute
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    console.log(`Document lang attribute: "${htmlLang}"`);
    if (htmlLang !== 'es') {
      throw new Error(`Expected html lang to be "es", got "${htmlLang}"`);
    }

    // Verify URL updates to include Spanish lang parameter
    const currentUrl = await page.url();
    console.log(`Current URL: "${currentUrl}"`);
    if (!currentUrl.includes('lang=es')) {
      throw new Error(`Expected URL to include "lang=es", got "${currentUrl}"`);
    }

    // Check Spanish translations
    const espPlayText = await readText(page, '#nav-btn-play');
    console.log(`Spanish Play nav text: "${espPlayText}"`);
    if (espPlayText !== 'Jugar') {
      throw new Error(`Expected Spanish play nav text to be "Jugar", got "${espPlayText}"`);
    }

    // Switch back to English (en)
    console.log('Switching back to English (en)...');
    await page.evaluate(() => {
      const select = document.querySelector('#lang-select');
      if (select) {
        select.value = 'en';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await waitForHtmlLang(page, 'en');

    // Verify URL updates to include English lang parameter
    const englishUrl = await page.url();
    console.log(`English URL: "${englishUrl}"`);
    if (!englishUrl.includes('lang=en')) {
      throw new Error(`Expected URL to include "lang=en", got "${englishUrl}"`);
    }

    // Verify back in English
    const engPlayRestored = await readText(page, '#nav-btn-play');
    console.log(`English Play nav text restored: "${engPlayRestored}"`);
    if (engPlayRestored !== 'Play') {
      throw new Error(`Expected English play nav text to be "Play", got "${engPlayRestored}"`);
    }

    // 4. Verify all new target languages from i18n via URL query parameters
    console.log('Verifying additional target languages via URL query parameters...');
    const langChecks = [
      { code: 'es_ES', expectedPlay: 'Jugar' },
      { code: 'fr_FR', expectedPlay: 'Jouer' },
      { code: 'fr_CA', expectedPlay: 'Jouer' },
      { code: 'en_CA', expectedPlay: 'Play' },
      { code: 'it_IT', expectedPlay: 'Gioca' },
      { code: 'de_DE', expectedPlay: 'Spielen' },
      { code: 'zh_CN', expectedPlay: '开始游戏' },
      { code: 'zh_TW', expectedPlay: '開始遊戲' },
      { code: 'ko_KR', expectedPlay: '플레이' },
      { code: 'ja_JP', expectedPlay: 'プレイ' },
      { code: 'pt_BR', expectedPlay: 'Jogar' },
      { code: 'ru_RU', expectedPlay: 'Играть' },
    ];

    for (const langCheck of langChecks) {
      console.log(`Checking language "${langCheck.code}"...`);
      const langUrl = `${GAME_URL}/?lang=${langCheck.code}`;
      await page.goto(langUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForIdlePaint(page);

      const currentHtmlLang = await page.evaluate(() => document.documentElement.lang);
      const expectedHtmlLang = langCheck.code.replace('_', '-');
      if (currentHtmlLang !== expectedHtmlLang) {
        throw new Error(`Expected html lang to be "${expectedHtmlLang}", got "${currentHtmlLang}"`);
      }

      const playText = await page.evaluate(() => {
        const el = document.querySelector('#nav-btn-play');
        return el ? el.textContent.trim() : '';
      });
      console.log(`  [${langCheck.code}] Play nav link text: "${playText}"`);
      if (playText !== langCheck.expectedPlay) {
        throw new Error(
          `Expected play nav link text for "${langCheck.code}" to be "${langCheck.expectedPlay}", got "${playText}"`,
        );
      }
    }

    if (pageErrors.length > 0) {
      throw new Error(`Page encountered errors during test execution: ${pageErrors[0].message}`);
    }
    if (unexpectedResponses.length > 0) {
      throw new Error(
        `Unexpected HTTP error during test execution: ${JSON.stringify(unexpectedResponses[0])}`,
      );
    }

    console.log('E2E Verification completed successfully! All checks passed.');
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('E2E Verification Failed!', error);
    await browser.close();
    process.exit(1);
  }
}

main();
