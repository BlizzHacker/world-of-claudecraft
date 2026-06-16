// Resolves a local Chromium-family browser binary for puppeteer-core.
// Override with BROWSER_PATH=/path/to/browser if yours lives elsewhere.
import fs from 'node:fs';

const CANDIDATES = [
  process.env.BROWSER_PATH,
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  // Windows
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  // Linux
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

export const BROWSER_PATH = CANDIDATES.find((p) => fs.existsSync(p));

if (!BROWSER_PATH) {
  throw new Error(
    'No Chrome/Edge/Chromium binary found. Set BROWSER_PATH to your browser executable.',
  );
}
