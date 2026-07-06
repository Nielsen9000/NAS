// Headless screenshot helper (dev-only, not shipped to the site).
// Usage:
//   node brand/shot.mjs <url> <out.png> [width] [height] [selector]
// Examples:
//   node brand/shot.mjs http://localhost:3000/ .screenshots/home.png 1440 900
//   node brand/shot.mjs http://localhost:3000/ .screenshots/anatomy.png 1440 900 "#anatomy"
// If a selector is given, the element is scrolled into view and the shot is
// clipped to that element (plus a little padding). Otherwise the viewport is shot.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const [, , url, out, w = '1440', h = '900', selector] = process.argv;
if (!url || !out) {
  console.error('Usage: node brand/shot.mjs <url> <out.png> [width] [height] [selector]');
  process.exit(1);
}

await mkdir(dirname(out), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: 'networkidle' });
// Let intro loaders / transitions settle.
await page.waitForTimeout(1200);

const mode = process.argv[7]; // "clip" (default) or "header" (scroll to selector, shoot top viewport strip)
if (selector && mode === 'header') {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: Number(w), height: 120 } });
} else if (selector) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await el.screenshot({ path: out });
} else {
  await page.screenshot({ path: out });
}

await browser.close();
console.log('saved', out);
