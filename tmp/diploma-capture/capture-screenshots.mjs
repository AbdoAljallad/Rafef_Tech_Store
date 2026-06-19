import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(repoRoot, 'docs', 'screenshots');

const browserCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate));

if (!executablePath) {
  throw new Error('No Chrome or Edge executable was found for screenshot capture.');
}

fs.mkdirSync(outputDir, { recursive: true });

const pages = [
  { name: '01-login', path: '/login', waitMs: 1200 },
  { name: '02-home', path: '/home', waitMs: 2200 },
  { name: '03-customers', path: '/customers', waitMs: 2200 },
  { name: '04-products', path: '/catalog/products', waitMs: 2200 },
  { name: '05-inventory-stock', path: '/inventory/stock', waitMs: 2200 },
  { name: '06-repair-orders', path: '/repair/orders/list', waitMs: 2200 },
  { name: '07-sales-pos', path: '/sales/pos', waitMs: 2200 },
  { name: '08-reports', path: '/reports', waitMs: 2200 },
  { name: '09-integrations', path: '/integrations/health', waitMs: 2200 },
  { name: '10-settings-users', path: '/settings/users', waitMs: 2200 },
];

async function waitForSettledUi(page, waitMs) {
  await page.waitForLoadState('domcontentloaded');

  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    // Some pages may keep polling; a short fixed wait keeps the capture stable.
  }

  await page.waitForTimeout(waitMs);
}

async function openAndSettle(page, url, waitMs) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForSettledUi(page, waitMs);
}

async function switchRoute(page, url, waitMs) {
  await Promise.all([
    page.waitForURL(url, { timeout: 30000, waitUntil: 'commit' }),
    page.evaluate((nextUrl) => {
      window.location.assign(nextUrl);
    }, url),
  ]);

  await waitForSettledUi(page, waitMs);
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

const page = await context.newPage();
const baseUrl = 'http://localhost:5173';

for (const entry of pages) {
  const url = `${baseUrl}${entry.path}`;
  console.log(`Capturing ${entry.name} -> ${entry.path}`);

  if (entry.path === '/login') {
    await openAndSettle(page, url, entry.waitMs);
    await page.screenshot({
      path: path.join(outputDir, `${entry.name}.png`),
      fullPage: false,
    });

    if (new URL(page.url()).pathname === '/login') {
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/home', { timeout: 30000, waitUntil: 'commit' });
      await waitForSettledUi(page, 2500);
    }

    continue;
  }

  if (new URL(page.url()).pathname !== entry.path) {
    await switchRoute(page, url, entry.waitMs);
  } else {
    await waitForSettledUi(page, entry.waitMs);
  }

  await page.screenshot({
    path: path.join(outputDir, `${entry.name}.png`),
    fullPage: false,
  });
}

await browser.close();

console.log(`Saved screenshots to ${outputDir}`);
