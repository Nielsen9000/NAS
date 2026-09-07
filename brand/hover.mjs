// Capture the Intelligence Solutions dropdown open, scrolled into the anatomy section.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('.screenshots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:3010/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Scroll so the header sits over the white anatomy section.
const top = await page.evaluate(() => document.querySelector('.anatomy-section').getBoundingClientRect().top + window.scrollY);
await page.evaluate((y) => window.scrollTo(0, y + 120), top);
await page.waitForTimeout(500);

// Hover the dropdown trigger to open the menu.
await page.hover('.nav-dd-trigger');
await page.waitForTimeout(600);
await page.screenshot({ path: '.screenshots/dropdown-open.png', clip: { x: 0, y: 0, width: 1440, height: 340 } });
await browser.close();
console.log('saved dropdown-open.png');
