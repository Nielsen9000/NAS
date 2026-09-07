// NAS business cards — print-ready, double-sided.
// Front = contact info, back = NAS v10 logo. Brand navy #08202a on both sides.
// Mirrors brand/build_rollup.mjs: inline HTML → Playwright Chromium → page.pdf at exact mm.
//
//   node brand/build_business_card.mjs
//
// It writes only deliverables. Per person:
//   business-card-<surname>-cmyk.pdf    THE print master — PDF/X-3:2003 DeviceCMYK
//                                       (FOGRA39), 2 pages, 105×74mm w/ bleed + crop marks
//   business-card-<slug>-front.png      preview of that person's front
// Plus one shared file:
//   business-card-back.png              the back — identical for everyone, so
//                                       rendered once and reused as page 2 of every card
//
// With --rgb it additionally re-emits the RGB single-side and combined PDFs.
// Those are the same two designs a third and fourth time and nothing consumes
// them, so they are opt-in rather than clutter after every build.
//
// Every card is also checked before it is written:
//   · name and title must each set on ONE line at the current type size, and
//     must clear the QR panel (both sit at the same height as it);
//   · the rendered QR is decoded back out of the PNG and must contain that
//     person's own contact URL — a copy-paste slip that pointed two cards at
//     the same page would otherwise only surface after printing.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '../.screenshots/node_modules/playwright/index.mjs';
import { COMPANY, PEOPLE, contactUrl } from './people.mjs';
import { writePdfXCmyk } from './pdfx_cmyk.mjs';

const require = createRequire(import.meta.url);

// Opt-in extras. Off by default so a build leaves only deliverables in brand/.
const RGB_PDFS = process.argv.includes('--rgb');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = __dirname;
const repoRoot = path.resolve(__dirname, '..');

// ---- brand tokens ----
const NAVY = '#08202a';
const CYAN = '#3bb6e8';
const INK = '#ffffff';                      // pure white text → maps to paper white (0/0/0/0) in CMYK
const INK2 = 'rgba(255,255,255,0.62)';       // dimmed footer (intentionally muted, not pure white)
const SIGNAL_BLUE = '#3a76f0';

const URL_TARGET = 'https://www.nordicadvancedsystems.com';
const QR_PATH = path.join(brandDir, 'business-card-qr-cyan.svg');
const SIGNAL_PATH = path.join(brandDir, 'signal-logo.svg');

// ---- print geometry (mm) ----
const TRIM_W = 85, TRIM_H = 54;     // finished card
const BLEED = 3;                    // bleed each side
const SLUG = 7;                     // white margin around bleed for crop marks
const PAGE_W = TRIM_W + 2 * (BLEED + SLUG);  // 105
const PAGE_H = TRIM_H + 2 * (BLEED + SLUG);  // 74
const SAFE = BLEED + 4;             // content inset from the bleed box (3 + 4mm safe)

// Boxes for the PDF/X master, measured in mm from the page's bottom-left.
// The page is symmetrical, so the same inset applies on all four edges.
const TRIM_BOX = { x: SLUG + BLEED, y: SLUG + BLEED, w: TRIM_W, h: TRIM_H };   // 10,10,85,54
const BLEED_BOX = { x: SLUG, y: SLUG, w: TRIM_W + 2 * BLEED, h: TRIM_H + 2 * BLEED }; // 7,7,91,60

// Minimum clear gap between the end of a text line and the QR panel (mm).
const QR_CLEARANCE = 1.5;

// (COMPANY + PEOPLE now live in ./people.mjs — shared with the contact-page builder.)

// Print masters are named by surname, which is what the trykkeri and the people
// themselves actually use. Two colleagues sharing a surname would silently
// overwrite each other's file, so the set is checked for collisions up front.
function surname(p) {
  return p.name.trim().split(/\s+/).pop().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // Radičh → radich
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function assertUniqueSurnames(people) {
  const seen = new Map();
  for (const p of people) {
    const s = surname(p);
    if (seen.has(s)) {
      throw new Error(
        `Surname collision: "${p.name}" and "${seen.get(s)}" both map to ` +
        `business-card-${s}-cmyk.pdf. Give one of them a distinguishing filename ` +
        `before building, or the second would overwrite the first.`);
    }
    seen.set(s, p.name);
  }
}

// ---- fit check -------------------------------------------------------------
// The name and the title sit at the same height as the QR panel, so "fits on
// one line" is two separate questions: does the text wrap, and does it run in
// under the QR. Both are measured on the real render rather than estimated from
// character counts, so a font swap or a longer name is caught by the build.
async function measureFit(page, pageWmm) {
  return page.evaluate((pageWmm) => {
    const pxPerMm = document.querySelector('.page').getBoundingClientRect().width / pageWmm;
    const qr = document.querySelector('.qr').getBoundingClientRect();
    const safe = document.querySelector('.safe.front').getBoundingClientRect();

    // One rect per line box, so rects.length is the rendered line count.
    const measure = (sel, label) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter(r => r.width > 0.01);
      const bb = range.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        label,
        text: el.textContent.trim(),
        lines: rects.length,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
        textWmm: bb.width / pxPerMm,
        availWmm: (safe.right - bb.left) / pxPerMm,
        // How far the line runs past the safe area's right edge (negative = clear).
        safeOverflowMm: (bb.right - safe.right) / pxPerMm,
        // Only meaningful for rows that vertically overlap the QR panel.
        overlapsQr: bb.top < qr.bottom && bb.bottom > qr.top,
        gapToQrMm: (qr.left - bb.right) / pxPerMm,
      };
    };

    const rows = [measure('.name', 'name'), measure('.title', 'title')];
    document.querySelectorAll('.crow .ct').forEach((_, i) =>
      rows.push(measure(`.crow:nth-child(${i + 1}) .ct`, `contact ${i + 1}`)));
    rows.push(measure('.addr', 'address'));
    return rows.filter(Boolean);
  }, pageWmm);
}

// Hard-fail the build on anything that would only be visible once printed.
function assertFits(person, rows) {
  const problems = [];
  for (const r of rows) {
    // A wrapped line is the failure the type size is being asserted against.
    if (r.lines !== 1) {
      problems.push(
        `${r.label} "${r.text}" set on ${r.lines} lines at ${r.fontSize} ${r.fontFamily} ` +
        `(${r.textWmm.toFixed(1)}mm of ${r.availWmm.toFixed(1)}mm available)`);
      continue;
    }
    // The name and title sit level with the QR panel, so clearing the safe area
    // is not enough — they must also stop short of the panel itself.
    if (r.overlapsQr && r.gapToQrMm < QR_CLEARANCE) {
      problems.push(
        `${r.label} "${r.text}" runs into the QR panel — ${r.gapToQrMm.toFixed(2)}mm clear, ` +
        `${QR_CLEARANCE}mm required`);
      continue;
    }
    // .addr is white-space:nowrap, so it can never report >1 line; it can only
    // silently run past the safe area. 0.2mm tolerates sub-pixel layout rounding.
    if (r.safeOverflowMm > 0.2) {
      problems.push(`${r.label} "${r.text}" runs ${r.safeOverflowMm.toFixed(2)}mm ` +
        `past the safe area`);
    }
  }
  if (problems.length) {
    throw new Error(`${person.name}: card does not fit at the current type size —\n` +
      problems.map(s => '    · ' + s).join('\n') +
      `\n  Shorten the text, or set a titlePt override on this person in people.mjs.`);
  }
}

// ---- QR read-back ----------------------------------------------------------
// Decode the QR straight out of the rendered PNG. The QR is generated from
// contactUrl(p), but generating and rendering are two different steps and only
// the rendered pixels get printed — so the check reads the image, not the input.
async function decodeCardQr(page, pngPath) {
  const sharp = require('sharp');
  const meta = await sharp(pngPath).metadata();
  const pxPerMm = meta.width / PAGE_W;

  // QR panel geometry, mm from the page's top-left (CSS origin).
  const panelRight = SLUG + BLEED + TRIM_W + BLEED - SAFE;   // .safe right edge = 91
  const M = 1.5;                                             // crop margin
  const crop = {
    left: Math.max(0, Math.round((panelRight - 18.5 - M) * pxPerMm)),
    top: Math.max(0, Math.round((SLUG + SAFE - M) * pxPerMm)),
    width: Math.round((18.5 + 2 * M) * pxPerMm),
    height: Math.round((18.5 + 2 * M) * pxPerMm),
  };

  const png = await sharp(pngPath).extract(crop).png().toBuffer();
  const dataUri = 'data:image/png;base64,' + png.toString('base64');

  return page.evaluate(async (uri) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = uri; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const r = window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'dontInvert' });
    return r ? r.data : null;
  }, dataUri);
}

// --------------------------------------------------------------------------
async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return r.text();
}

// Generate a QR SVG from arbitrary data (ECC level configurable).
async function makeQrSvg(data, ecc = 'M') {
  const libSrc = await fetchText('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js');
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: libSrc });
  const svg = await page.evaluate(({ data, ecc, dark }) => {
    const qr = window.qrcode(0, ecc); qr.addData(data); qr.make();
    const count = qr.getModuleCount(), margin = 4, size = count + margin * 2;
    let cells = '';
    for (let row = 0; row < count; row++) {
      let col = 0;
      while (col < count) {
        if (qr.isDark(row, col)) {
          let run = 1; while (col + run < count && qr.isDark(row, col + run)) run++;
          cells += `<rect x="${col + margin}" y="${row + margin}" width="${run}" height="1" fill="${dark}"/>`;
          col += run;
        } else col++;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${cells}</svg>`;
  }, { data, ecc, dark: NAVY });   // dark modules on a white panel → scans on every reader
  await browser.close();
  return svg;
}

// ---- Signal app badge: blue rounded square + white official bubble glyph ----
function signalBadge(bubblePathD) {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="sig">
    <rect x="0" y="0" width="24" height="24" rx="5.6" fill="${SIGNAL_BLUE}"/>
    <g transform="translate(12 12) scale(0.62) translate(-12 -12)" fill="#ffffff"><path d="${bubblePathD}"/></g>
  </svg>`;
}
async function loadSignal() {
  try { return await fs.readFile(SIGNAL_PATH, 'utf8'); } catch {}
  try {
    const raw = await fetchText('https://cdn.jsdelivr.net/npm/simple-icons@13/icons/signal.svg');
    const d = (raw.match(/<path d="([^"]+)"/) || [])[1];
    if (!d) throw new Error('no path in signal svg');
    const badge = signalBadge(d);
    await fs.writeFile(SIGNAL_PATH, badge);
    return badge;
  } catch (e) {
    // offline fallback: hand-drawn speech bubble
    const fallback = signalBadge('M12 3.4C6.9 3.4 2.8 6.9 2.8 11.2c0 2.2 1.1 4.2 2.8 5.6L4.4 21l4.8-1.4c.9.3 1.8.4 2.8.4 5.1 0 9.2-3.5 9.2-8.8S17.1 3.4 12 3.4z');
    await fs.writeFile(SIGNAL_PATH, fallback);
    return fallback;
  }
}

// ---- inline icon set (Material-style, currentColor) ----
const ICON = {
  phone: '<svg viewBox="0 0 24 24" class="ico"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" class="ico"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" class="ico"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
};

// ---- crop marks (8 hairlines in the white slug, aligned to the trim) ----
function cropMarks() {
  const T = 0.2;           // line thickness mm
  const L = 3.5;           // mark length mm
  const trimL = SLUG + BLEED, trimT = SLUG + BLEED;           // 10,10
  const trimR = PAGE_W - SLUG - BLEED, trimB = PAGE_H - SLUG - BLEED; // 95,64
  const bL = SLUG, bT = SLUG, bR = PAGE_W - SLUG, bB = PAGE_H - SLUG; // 7,7,98,67
  const GAP = 1;           // gap from bleed box
  const v = (x, y) => `<span class="cm" style="left:${x - T / 2}mm;top:${y}mm;width:${T}mm;height:${L}mm"></span>`;
  const h = (x, y) => `<span class="cm" style="left:${x}mm;top:${y - T / 2}mm;width:${L}mm;height:${T}mm"></span>`;
  return [
    v(trimL, bT - GAP - L), v(trimR, bT - GAP - L),       // top verticals
    v(trimL, bB + GAP), v(trimR, bB + GAP),               // bottom verticals
    h(bL - GAP - L, trimT), h(bL - GAP - L, trimB),       // left horizontals
    h(bR + GAP, trimT), h(bR + GAP, trimB),               // right horizontals
  ].join('');
}

// ---- one side as a .page block ----
function frontInner(p, qrSvg, markSvg, opts = {}) {
  const phoneTail = p.phoneIsSignal ? '<span class="sigtag">SIGNAL</span>' : '';
  const edge = opts.edge ? '<div class="edge"></div>' : '';
  const ghost = opts.ghost ? `<div class="ghost">${markSvg}</div>` : '';
  return `${edge}${ghost}
  <div class="safe front">
    <div class="idblock">
      <div class="name">${p.name}</div>
      <div class="title"${p.titlePt ? ` style="font-size:${p.titlePt}pt"` : ''}>${p.title}</div>
    </div>
    <div class="contact">
      <div class="crow"><span class="ic">${ICON.phone}</span><span class="ct">${p.phone}</span>${phoneTail}</div>
      <div class="crow"><span class="ic">${ICON.mail}</span><span class="ct">${p.email}</span></div>
      <div class="crow"><span class="ic">${ICON.globe}</span><span class="ct">${COMPANY.website}</span></div>
    </div>
    <div class="foot">
      <div class="addr">${COMPANY.address}</div>
    </div>
    <div class="qr">${qrSvg}</div>
  </div>`;
}
function backInner(backLogoSvg, markSvg, style = 'plain') {
  let tex = '';
  if (style === 'grid') tex = '<div class="grid"></div>';
  else if (style === 'topo') tex = '<div class="topo"></div>';
  else if (style === 'bigmark') tex = `<div class="bigmark">${markSvg}</div>`;
  const meta = style === 'plain' ? '' : `<div class="meta">${COMPANY.meta}</div>`;
  return `${tex}<div class="safe back"><div class="logo">${backLogoSvg}</div></div>${meta}`;
}
function pageBlock(inner, withMarks, last) {
  return `<div class="page${last ? '' : ' brk'}">
    <div class="bleed">${inner}</div>
    ${withMarks ? cropMarks() : ''}
  </div>`;
}

function doc(bodyInner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  @page { size: ${PAGE_W}mm ${PAGE_H}mm; margin: 0; }
  *,*::before,*::after{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; background:#fff; }
  .page{ position:relative; width:${PAGE_W}mm; height:${PAGE_H}mm; background:#fff; overflow:hidden; }
  .page.brk{ page-break-after:always; }
  .bleed{ position:absolute; left:${SLUG}mm; top:${SLUG}mm; width:${TRIM_W + 2 * BLEED}mm; height:${TRIM_H + 2 * BLEED}mm;
    background:${NAVY}; color:${INK}; font-family:'Inter',system-ui,sans-serif; overflow:hidden; isolation:isolate; }
  /* subtle brand atmosphere, fully inside bleed */
  .bleed::before{ content:""; position:absolute; inset:0;
    background:radial-gradient(120% 90% at 100% 0%, rgba(59,182,232,.16), transparent 55%); }
  .cm{ position:absolute; background:${NAVY}; }
  .safe{ position:absolute; inset:${SAFE}mm; z-index:2; }

  /* FRONT */
  .front{ display:flex; flex-direction:column; }
  .brandrow{ display:flex; align-items:center; gap:2.4mm; }
  .mark{ width:8.4mm; display:block; }
  .mark svg{ width:100%; height:auto; display:block; }
  .eyebrow{ font-family:'JetBrains Mono',monospace; font-size:5.4pt; letter-spacing:.34em; color:${CYAN}; font-weight:500; }
  .idblock{ margin-top:3.5mm; }
  .name{ font-weight:800; font-size:14pt; line-height:1.0; color:#fff; letter-spacing:.005em; }
  .title{ font-family:'JetBrains Mono',monospace; font-size:5.5pt; letter-spacing:.2em; color:${CYAN}; margin-top:1.4mm; text-transform:uppercase; }
  .contact{ margin-top:7.5mm; display:flex; flex-direction:column; gap:4.6mm; }
  .crow{ display:flex; align-items:center; gap:2.2mm; }
  .ic{ color:${CYAN}; width:3.4mm; height:3.4mm; display:inline-flex; align-items:center; flex:0 0 auto; }
  .ico{ width:100%; height:100%; display:block; }
  .ct{ font-family:'Space Grotesk',sans-serif; font-size:7.6pt; line-height:1; color:${INK}; letter-spacing:.01em; }
  .sigtag{ margin-left:.6mm; display:inline-flex; align-items:center; justify-content:center; padding:.5mm 1.2mm .5mm 1.45mm;
    border:.18mm solid ${CYAN}; border-radius:1mm; font-family:'JetBrains Mono',monospace; font-size:4.8pt; font-weight:500;
    letter-spacing:.16em; color:${CYAN}; line-height:1; transform:translateY(-0.12mm); }
  .foot{ position:absolute; left:0; right:0; bottom:0; }
  .addr{ font-family:'JetBrains Mono',monospace; font-size:5.3pt; letter-spacing:.03em; color:${INK2}; white-space:nowrap; }
  .qr{ position:absolute; right:0; top:0; width:18.5mm; height:18.5mm; background:#fff; border:.22mm solid ${CYAN}; border-radius:1.8mm; padding:1mm; }
  .qr svg{ width:100%; height:100%; display:block; }

  /* BACK */
  .back{ display:flex; align-items:center; justify-content:center; }
  .logo{ width:58mm; position:relative; z-index:2; }
  .logo svg{ width:100%; height:auto; display:block; }

  /* ---- concept enhancements ---- */
  .edge{ position:absolute; left:0; top:0; bottom:0; width:1.5mm; background:${CYAN}; z-index:3; }
  .ghost{ position:absolute; right:-12mm; bottom:-10mm; width:46mm; opacity:.07; z-index:1; pointer-events:none; }
  .ghost svg{ width:100%; height:auto; display:block; }
  .grid{ position:absolute; inset:0; z-index:0;
    background-image:linear-gradient(${CYAN} .1mm, transparent .1mm), linear-gradient(90deg, ${CYAN} .1mm, transparent .1mm);
    background-size:5mm 5mm; opacity:.09;
    -webkit-mask-image:radial-gradient(120% 100% at 50% 50%, #000 35%, transparent 78%);
            mask-image:radial-gradient(120% 100% at 50% 50%, #000 35%, transparent 78%); }
  .topo{ position:absolute; inset:-25mm; z-index:0;
    background:repeating-radial-gradient(circle at 50% 50%, transparent 0 4.2mm, rgba(59,182,232,.16) 4.2mm 4.45mm);
    -webkit-mask-image:radial-gradient(100% 100% at 50% 50%, #000 40%, transparent 85%);
            mask-image:radial-gradient(100% 100% at 50% 50%, #000 40%, transparent 85%); }
  .bigmark{ position:absolute; right:-16mm; top:50%; transform:translateY(-50%); width:78mm; opacity:.06; z-index:0; }
  .bigmark svg{ width:100%; height:auto; display:block; }
  .meta{ position:absolute; left:${SAFE}mm; right:${SAFE}mm; bottom:${SAFE}mm; text-align:center; z-index:2;
    font-family:'JetBrains Mono',monospace; font-size:5.2pt; letter-spacing:.24em; color:${CYAN}; opacity:.82; }
</style></head><body>${bodyInner}</body></html>`;
}

// --------------------------------------------------------------------------
async function render() {
  assertUniqueSurnames(PEOPLE);

  const markSvg = await fs.readFile(path.join(repoRoot, 'assets/nas-mark-cyan.svg'), 'utf8');
  const backLogoSvg = await fs.readFile(path.join(repoRoot, 'LOGER/v10/nas-logo-dark-transparent-v10.svg'), 'utf8');
  // per-person vCard QR (scan → save contact)
  const qrBySlug = {};
  for (const p of PEOPLE) qrBySlug[p.slug] = await makeQrSvg(contactUrl(p), 'L');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 5 });   // high-res so the QR is crisp/scannable in the PNG preview
  const page = await ctx.newPage();

  const fitReport = [];
  const cmykByPerson = [];

  // The back carries no personal detail at all — same logo, same coordinates for
  // everyone — so it is rendered ONCE and reused as page 2 of every card. Writing
  // it per person produced four byte-identical PNGs.
  const backHtml = doc(pageBlock(backInner(backLogoSvg, markSvg, 'bigmark'), true, true));
  await page.setContent(backHtml, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const backPng = path.join(brandDir, 'business-card-back.png');
  await (await page.$('.page')).screenshot({ path: backPng });
  console.log('✓ business-card-back.png  (shared by every card — the back is identical for everyone)\n');

  for (const p of PEOPLE) {
    const front = frontInner(p, qrBySlug[p.slug], markSvg, { edge: true, ghost: true });
    const back = backInner(backLogoSvg, markSvg, 'bigmark');

    const html = doc(pageBlock(front, true, true));
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    // Fit is measured with the real webfonts loaded, BEFORE anything is written
    // — a card that does not fit must not reach the PDFs.
    const rows = await measureFit(page, PAGE_W);
    assertFits(p, rows);
    fitReport.push({ person: p, rows });

    const frontPng = path.join(brandDir, `business-card-${p.slug}-front.png`);
    await (await page.$('.page')).screenshot({ path: frontPng });

    // CMYK print master — one PDF/X-3 per person, named by surname. This is the
    // file the trykkeri gets, and the only card output that is a deliverable.
    const cmykPath = path.join(brandDir, `business-card-${surname(p)}-cmyk.pdf`);
    const info = await writePdfXCmyk({
      pngPaths: [frontPng, backPng],
      outPath: cmykPath,
      title: `${p.name} — Nordic Advanced Systems business card`,
      widthMm: PAGE_W, heightMm: PAGE_H,
      trimMm: TRIM_BOX, bleedMm: BLEED_BOX,
      creator: 'brand/build_business_card.mjs',
    });
    const size = (await fs.stat(cmykPath)).size;
    cmykByPerson.push({ p, cmykPath, info, size });

    console.log(`✓ ${p.name}`);
    console.log(`    business-card-${surname(p)}-cmyk.pdf   PDF/X-3:2003 DeviceCMYK, ` +
      `${info.pages} pages, ${info.dpi} dpi, ${(size / 1048576).toFixed(2)} MB`);
    console.log(`    business-card-${p.slug}-front.png      preview`);

    // The RGB single-side and combined PDFs are the same two designs a third and
    // fourth time. Chromium can re-emit them on demand; they are not deliverables,
    // so they are opt-in rather than clutter in brand/ after every build.
    if (RGB_PDFS) {
      await page.pdf({
        path: path.join(brandDir, `business-card-${p.slug}-front.pdf`),
        width: `${PAGE_W}mm`, height: `${PAGE_H}mm`,
        printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      const combined = doc(pageBlock(front, true, false) + pageBlock(back, true, true));
      await page.setContent(combined, { waitUntil: 'networkidle', timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      await page.pdf({
        path: path.join(brandDir, `business-card-${p.slug}.pdf`),
        width: `${PAGE_W}mm`, height: `${PAGE_H}mm`,
        printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
      console.log(`    business-card-${p.slug}.pdf + -front.pdf   RGB (--rgb)`);
    }
  }

  // ---- QR read-back: decode what was actually rendered on each card ----
  console.log('\nQR read-back (decoded from the rendered PNG, not from the input):');
  const jsqr = await fetchText('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: jsqr });

  const seen = new Map();
  let qrFailures = 0;
  for (const p of PEOPLE) {
    const pngPath = path.join(brandDir, `business-card-${p.slug}-front.png`);
    const decoded = await decodeCardQr(page, pngPath);
    const expected = contactUrl(p);

    if (decoded === null) {
      console.log(`  ✗ ${p.name.padEnd(22)} QR could not be decoded from the render`);
      qrFailures++; continue;
    }
    const ok = decoded === expected;
    console.log(`  ${ok ? '✓' : '✗'} ${p.name.padEnd(22)} ${decoded}`);
    if (!ok) {
      console.log(`      expected: ${expected}`);
      qrFailures++;
    }
    if (seen.has(decoded)) {
      console.log(`      ✗ identical to the QR on ${seen.get(decoded)}'s card`);
      qrFailures++;
    }
    seen.set(decoded, p.name);
  }
  if (qrFailures) {
    await browser.close();
    throw new Error(`${qrFailures} QR check(s) failed — see above. Not safe to print.`);
  }

  // ---- fit report ----
  console.log('\nFit check (measured on the render, at the shipped type size):');
  for (const { person, rows } of fitReport) {
    console.log(`  ${person.name}`);
    for (const r of rows.filter(r => r.label === 'name' || r.label === 'title')) {
      console.log(`    ${r.label.padEnd(6)} "${r.text}"`.padEnd(46) +
        `${r.lines} line · ${r.fontSize} ${r.fontFamily} · ` +
        `${r.textWmm.toFixed(1)}mm wide · ${r.gapToQrMm.toFixed(1)}mm clear of QR`);
    }
  }

  const icc = cmykByPerson[0]?.info;
  if (icc) {
    console.log(`\nCMYK: ${icc.iccFamily}`);
    console.log(`      embedded as DestOutputProfile, OutputIntent GTS_PDFX`);
    console.log(`      TrimBox ${TRIM_W}×${TRIM_H}mm · BleedBox ${BLEED}mm all round · crop marks in the slug`);
  }

  await browser.close();
}

// Render review concepts (back-side variants + an enhanced front) to brand/concept-*.png
async function renderConcepts() {
  const qrSvg = await makeQrSvg(contactUrl(PEOPLE[0]), 'L');
  const markSvg = await fs.readFile(path.join(repoRoot, 'assets/nas-mark-cyan.svg'), 'utf8');
  const backLogoSvg = await fs.readFile(path.join(repoRoot, 'LOGER/v10/nas-logo-dark-transparent-v10.svg'), 'utf8');
  const p = PEOPLE[0];

  const variants = [
    ['back-grid', backInner(backLogoSvg, markSvg, 'grid')],
    ['back-topo', backInner(backLogoSvg, markSvg, 'topo')],
    ['back-bigmark', backInner(backLogoSvg, markSvg, 'bigmark')],
    ['front-enhanced', frontInner(p, qrSvg, markSvg, { edge: true, ghost: true })],
  ];

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ deviceScaleFactor: 2 })).newPage();
  for (const [name, inner] of variants) {
    await page.setContent(doc(pageBlock(inner, true, true)), { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await (await page.$('.page')).screenshot({ path: path.join(brandDir, `concept-${name}.png`) });
    console.log(`✓ concept-${name}.png`);
  }
  await browser.close();
}

if (process.argv.includes('--concepts')) await renderConcepts();
else await render();
console.log('Done.');
