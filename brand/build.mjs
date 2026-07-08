// Generate the NAS logo kit (vector SVGs + PNG@2x).
//
// Flow per variant:
//   1. Build an intermediate SVG with the mark + text (placeholder width).
//   2. Render it in headless Chrome with Inter + JetBrains Mono loaded, then
//      measure the rendered width of the "NAS" wordmark via getBBox().
//   3. Re-emit the SVG with the subtitle forced to that exact width using
//      textLength + lengthAdjust — that locks the lockup alignment so
//      "NORDIC ADVANCED SYSTEMS" can never overflow the wordmark.
//   4. Render PNG @2x from the final SVG.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../.screenshots/node_modules/playwright/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = __dirname;
const assetsDir = path.resolve(__dirname, '..', 'assets');

// --- Extract mark paths from the source cyan SVG ---------------------------
const markSrc = await fs.readFile(path.join(assetsDir, 'nas-mark-cyan.svg'), 'utf8');
const gMatch = markSrc.match(/<g[^>]*>([\s\S]*?)<\/g>/);
if (!gMatch) throw new Error('Could not extract mark paths from nas-mark-cyan.svg');
const MARK_PATHS = gMatch[1].trim();
const MARK_VB_W = 1260;
const MARK_VB_H = 1350;
const MARK_INNER = 'translate(0,1350) scale(0.1,-0.1)';

// Place the mark at (x,y) at a target height, preserving aspect ratio.
function placeMark(x, y, height, fill) {
  const s = height / MARK_VB_H;
  return `<g transform="translate(${x} ${y}) scale(${s})">` +
         `<g transform="${MARK_INNER}" fill="${fill}" stroke="none">${MARK_PATHS}</g>` +
         `</g>`;
}

const STYLE_BLOCK = `<style>
  text { font-family: 'Inter', 'Inter Tight', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }
  .nas { font-weight: 800; letter-spacing: -0.01em; }
  .sub { font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace; font-weight: 500; letter-spacing: 0.18em; }
</style>`;

function svg(viewBox, bg, body) {
  const [, , w, h] = viewBox.split(' ');
  const bgRect = bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}" role="img" aria-label="Nordic Advanced Systems">
${STYLE_BLOCK}
${bgRect}
${body}
</svg>`;
}

// --- Layout constants -----------------------------------------------------
const HORIZ = {
  pad: 40,
  markH: 130,
  gap: 36,
  nasFont: 100,
  subFont: 14,
  totalH: 220,
  // baselines tuned so cap height of NAS visually centers on the mark
  nasBaseline: 130,
  subBaseline: 168,
};

const STACK = {
  pad: 44,
  markH: 110,
  gapMarkNas: 28,
  gapNasSub: 14,
  nasFont: 100,
  subFont: 14,
  // computed dynamically
};

const MARK_ONLY = {
  pad: 28,
  markH: 220,
};

// Stamp: round seal. NAS curves along top, DENMARK along bottom, triangle in center.
// All radii are in the stamp's local coordinate space (viewBox 0 0 400 400).
const STAMP = {
  size: 400,
  cx: 200, cy: 200,
  rOuter: 178,         // outer ring stroke center
  rInner: 122,         // inner ring stroke center (encloses the mark)
  topTextBaseline: 142, // top text baseline radius (letters extend outward)
  botTextBaseline: 158, // bottom text baseline radius (letters extend inward)
  markH: 170,           // mark height inside inner ring
  fontSize: 22,         // curved-text font size
  letterSpacing: 6,
};

const DARK_BG = '#08202a';
const CYAN = '#3BB6E8';
const WHITE = '#FFFFFF';

// --- Builders -------------------------------------------------------------
function buildHorizontal({ markColor, nasColor, subColor, bgColor, nasWidth = null, totalW = null }) {
  const { pad, markH, gap, nasFont, subFont, totalH, nasBaseline, subBaseline } = HORIZ;
  const markW = markH * (MARK_VB_W / MARK_VB_H);
  const textX = pad + markW + gap;
  const w = totalW || (textX + 360 + pad);
  const subLen = nasWidth ? ` textLength="${nasWidth.toFixed(2)}" lengthAdjust="spacingAndGlyphs"` : '';
  const body =
    placeMark(pad, (totalH - markH) / 2, markH, markColor) +
    `\n<text class="nas" x="${textX}" y="${nasBaseline}" fill="${nasColor}" font-size="${nasFont}">NAS</text>` +
    `\n<text class="sub" x="${textX}" y="${subBaseline}" fill="${subColor}" font-size="${subFont}"${subLen}>NORDIC ADVANCED SYSTEMS</text>`;
  return svg(`0 0 ${w} ${totalH}`, bgColor, body);
}

function buildStacked({ markColor, nasColor, subColor, bgColor, nasWidth = null, totalW = null }) {
  const { pad, markH, gapMarkNas, gapNasSub, nasFont, subFont } = STACK;
  const markW = markH * (MARK_VB_W / MARK_VB_H);
  // NAS cap-height ~ 0.72 * font-size for Inter (approximation)
  const nasCapH = nasFont * 0.72;
  const subH = subFont * 1.1;
  const totalContentH = markH + gapMarkNas + nasCapH + gapNasSub + subH;
  const totalH = Math.ceil(totalContentH + pad * 2);
  const w = totalW || 480;
  const cx = w / 2;
  const markY = pad;
  const nasBaseline = markY + markH + gapMarkNas + nasCapH;
  const subBaseline = nasBaseline + gapNasSub + subH;
  const subLen = nasWidth ? ` textLength="${nasWidth.toFixed(2)}" lengthAdjust="spacingAndGlyphs"` : '';
  const body =
    placeMark(cx - markW / 2, markY, markH, markColor) +
    `\n<text class="nas" x="${cx}" y="${nasBaseline}" fill="${nasColor}" font-size="${nasFont}" text-anchor="middle">NAS</text>` +
    `\n<text class="sub" x="${cx}" y="${subBaseline}" fill="${subColor}" font-size="${subFont}" text-anchor="middle"${subLen}>NORDIC ADVANCED SYSTEMS</text>`;
  return svg(`0 0 ${w} ${totalH}`, bgColor, body);
}

function buildMark({ markColor, bgColor }) {
  const { pad, markH } = MARK_ONLY;
  const markW = markH * (MARK_VB_W / MARK_VB_H);
  const w = Math.ceil(markW + pad * 2);
  const h = markH + pad * 2;
  const body = placeMark(pad, pad, markH, markColor);
  return svg(`0 0 ${w} ${h}`, bgColor, body);
}

function buildStamp({ inkColor, bgColor, topText = 'NAS', bottomText = 'DENMARK' }) {
  const { size, cx, cy, rOuter, rInner, topTextBaseline, botTextBaseline, markH, fontSize, letterSpacing } = STAMP;
  const markW = markH * (MARK_VB_W / MARK_VB_H);
  const markX = cx - markW / 2;
  const markY = cy - markH / 2 + 4; // small visual offset since the mark is slightly bottom-weighted

  // Top arc: sweep=1 → clockwise on screen, passes through 12 o'clock, text reads L-to-R, tops point outward
  const topArcD = `M ${cx - topTextBaseline} ${cy} A ${topTextBaseline} ${topTextBaseline} 0 0 1 ${cx + topTextBaseline} ${cy}`;
  // Bottom arc: sweep=0 → CCW on screen, passes through 6 o'clock. Text reads L-to-R, tops point toward center (= up for viewer)
  const botArcD = `M ${cx - botTextBaseline} ${cy} A ${botTextBaseline} ${botTextBaseline} 0 0 0 ${cx + botTextBaseline} ${cy}`;

  // Side ornaments at 3 and 9 o'clock, placed between the two text-baseline radii
  const ornR = (topTextBaseline + botTextBaseline) / 2;

  const body = `
<defs>
  <path id="stamp-top-arc" d="${topArcD}" fill="none"/>
  <path id="stamp-bot-arc" d="${botArcD}" fill="none"/>
</defs>
<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="none" stroke="${inkColor}" stroke-width="2.5"/>
<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="none" stroke="${inkColor}" stroke-width="1.5"/>
<circle cx="${cx - ornR}" cy="${cy}" r="3" fill="${inkColor}"/>
<circle cx="${cx + ornR}" cy="${cy}" r="3" fill="${inkColor}"/>
<text fill="${inkColor}" font-family="'JetBrains Mono', ui-monospace, monospace" font-weight="500" font-size="${fontSize}" letter-spacing="${letterSpacing}">
  <textPath href="#stamp-top-arc" startOffset="50%" text-anchor="middle">${topText}</textPath>
</text>
<text fill="${inkColor}" font-family="'JetBrains Mono', ui-monospace, monospace" font-weight="500" font-size="${fontSize}" letter-spacing="${letterSpacing}">
  <textPath href="#stamp-bot-arc" startOffset="50%" text-anchor="middle">${bottomText}</textPath>
</text>
${placeMark(markX, markY, markH, inkColor)}`;

  return svg(`0 0 ${size} ${size}`, bgColor, body);
}

// --- Variant catalog ------------------------------------------------------
const HORIZ_VARIANTS = [
  { name: 'nas-logo-horizontal-dark',         mark: CYAN, nas: WHITE,   sub: CYAN,    bg: DARK_BG },
  { name: 'nas-logo-horizontal-light',        mark: CYAN, nas: DARK_BG, sub: DARK_BG, bg: WHITE },
  { name: 'nas-logo-horizontal-transparent',  mark: CYAN, nas: WHITE,   sub: CYAN,    bg: null    },
  { name: 'nas-logo-horizontal-white',        mark: WHITE, nas: WHITE,  sub: WHITE,   bg: null    },
];
const STACKED_VARIANTS = [
  { name: 'nas-logo-stacked-dark',            mark: CYAN, nas: WHITE,   sub: CYAN,    bg: DARK_BG },
  { name: 'nas-logo-stacked-transparent',     mark: CYAN, nas: WHITE,   sub: CYAN,    bg: null    },
];
const MARK_VARIANTS = [
  { name: 'nas-mark-dark',         mark: CYAN,  bg: DARK_BG },
  { name: 'nas-mark-transparent',  mark: CYAN,  bg: null    },
  { name: 'nas-mark-white',        mark: WHITE, bg: null    },
];
const STAMP_VARIANTS = [
  { name: 'nas-stamp-dark',         ink: CYAN,    bg: DARK_BG },
  { name: 'nas-stamp-transparent',  ink: CYAN,    bg: null    },
  { name: 'nas-stamp-white',        ink: WHITE,   bg: null    },
  { name: 'nas-stamp-mono-dark',    ink: DARK_BG, bg: null    },
];

// --- Playwright bootstrap -------------------------------------------------
const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
const page = await ctx.newPage();

// Pre-load fonts on a host page (used for measurement + PNG renders)
await page.setContent(`<!DOCTYPE html>
<html><head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;background:#fff;}</style>
</head><body></body></html>`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

async function measureNasWidth(svgString) {
  await page.evaluate((s) => { document.body.innerHTML = s; }, svgString);
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const t = document.querySelector('text.nas');
    if (!t) return null;
    const bb = t.getBBox();
    return bb.width;
  });
}

async function renderToPng(svgString, outPath) {
  const m = svgString.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const vw = Math.ceil(parseFloat(m[1]));
  const vh = Math.ceil(parseFloat(m[2]));
  await page.setViewportSize({ width: Math.max(vw, 320), height: Math.max(vh, 320) });
  await page.evaluate(({ s, w, h }) => {
    document.body.innerHTML = s;
    const svg = document.querySelector('svg');
    if (svg) {
      svg.style.width = w + 'px';
      svg.style.height = h + 'px';
      svg.style.display = 'block';
    }
  }, { s: svgString, w: vw, h: vh });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(80);
  const el = await page.$('svg');
  await el.screenshot({ path: outPath, omitBackground: true });
}

// --- Process variants -----------------------------------------------------
const built = [];

for (const v of HORIZ_VARIANTS) {
  const interim = buildHorizontal({ markColor: v.mark, nasColor: v.nas, subColor: v.sub, bgColor: v.bg });
  const nasW = await measureNasWidth(interim);
  const { pad, markH, gap } = HORIZ;
  const markW = markH * (MARK_VB_W / MARK_VB_H);
  const textX = pad + markW + gap;
  const totalW = Math.ceil(textX + nasW + pad);
  const finalSvg = buildHorizontal({ markColor: v.mark, nasColor: v.nas, subColor: v.sub, bgColor: v.bg, nasWidth: nasW, totalW });
  await fs.writeFile(path.join(brandDir, `${v.name}.svg`), finalSvg);
  await renderToPng(finalSvg, path.join(brandDir, `${v.name}@2x.png`));
  built.push({ name: v.name, w: totalW, h: HORIZ.totalH, nasW: nasW.toFixed(1) });
}

for (const v of STACKED_VARIANTS) {
  const interim = buildStacked({ markColor: v.mark, nasColor: v.nas, subColor: v.sub, bgColor: v.bg, totalW: 480 });
  const nasW = await measureNasWidth(interim);
  const totalW = Math.max(280, Math.ceil(nasW + STACK.pad * 2));
  const finalSvg = buildStacked({ markColor: v.mark, nasColor: v.nas, subColor: v.sub, bgColor: v.bg, nasWidth: nasW, totalW });
  const m = finalSvg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  await fs.writeFile(path.join(brandDir, `${v.name}.svg`), finalSvg);
  await renderToPng(finalSvg, path.join(brandDir, `${v.name}@2x.png`));
  built.push({ name: v.name, w: totalW, h: parseInt(m[2]), nasW: nasW.toFixed(1) });
}

for (const v of MARK_VARIANTS) {
  const s = buildMark({ markColor: v.mark, bgColor: v.bg });
  await fs.writeFile(path.join(brandDir, `${v.name}.svg`), s);
  await renderToPng(s, path.join(brandDir, `${v.name}@2x.png`));
  const m = s.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  built.push({ name: v.name, w: parseInt(m[1]), h: parseInt(m[2]), nasW: '—' });
}

for (const v of STAMP_VARIANTS) {
  const s = buildStamp({ inkColor: v.ink, bgColor: v.bg });
  await fs.writeFile(path.join(brandDir, `${v.name}.svg`), s);
  await renderToPng(s, path.join(brandDir, `${v.name}@2x.png`));
  built.push({ name: v.name, w: STAMP.size, h: STAMP.size, nasW: '—' });
}

await browser.close();

console.log('\nBuilt variants:');
console.table(built);
console.log('Done. Files in', brandDir);
