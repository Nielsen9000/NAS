// NAS roll-up banners — trade-show eye-catchers with a "technical cockpit" feel.
//
// TWO VARIANTS live in this file. They share the palette, the hero-frame
// treatment, the HUD bracket / corner-tick overlays, the logo-lockup renderer
// and the inline-SVG QR generator:
//
//   engine      (default)  TYR 2 Series boxer engine — the original banner.
//   dronestack             NAS ESC + Drone Stack — "The brain of the aircraft".
//
// CLI:
//   node brand/build_rollup.mjs                        → engine, mockup
//   node brand/build_rollup.mjs --print                → engine, print-ready
//   node brand/build_rollup.mjs --variant=dronestack   → drone stack mockup
//   node brand/build_rollup.mjs --variant=dronestack --print-rgb
//                                                      → RGB print master (no ICC needed)
//   node brand/build_rollup.mjs --variant=dronestack --print
//                                                      → PDF/X CMYK master (needs FOGRA39)
//
// PURPOSE: stop people at distance and match the website hero mood
// (index.html): the hero-video mountain/cloud frame, heavily tinted in NAS deep
// teal, the engine floating with HUD overlays, and the
// "Engineered for endurance / Built on integrity" headline.
//
// Format: 850 × 2000 mm content + 20 mm bottom bleed (rolled into the cassette,
// not visible). Roll-up standard: 85 cm × 202 cm.
// Safe zones: keep important content ≥ 80 mm from the top and ≥ 100 mm from the
// bottom (before bleed) — clear of the roll-up cassette mechanism.
//
// COMPOSITION (top → bottom):
//   1. Large NAS logo (official v10 vector lock-up — cyan mark + white NAS + cyan
//      subtitle, already transparent, NO blend mode). First thing seen.
//   2. Eyebrow — "NAS 2 SERIES · NDAA-COMPLIANT" (mono, cyan, lead rule).
//   3. Headline — "Engineered for endurance" (white) / "Built on integrity"
//      (cyan), Inter ExtraBold. No subhead.
//   4. Floating engine (engine-hero-static.png, screen) with cockpit HUD:
//      corner brackets, target rings, RANGE / THRUST reticle callouts.
//   5. REC widget (bottom-left) — live cockpit readout.
//   6. Mission-ready lock-up (beside REC).
//   7. Bottom — real engine (nas_engine_transparent.png, screen) + cyan QR.
//
// The two screen-blended engines sit on subtle dark "scope pockets" so they
// read crisply even where the luminous cloud crest glows through the middle.
//
// CLI:
//   node brand/build_rollup.mjs           → mockup PNG + PDF (with bleed indicator)
//                                            + rollup-preview-small.png (1000px, fast preview)
//   node brand/build_rollup.mjs --print   → print-ready PNG + PDF (bleed indicator stripped)
//
// The QR code is generated locally as a pure vector SVG (qrcode-generator run
// inside headless Chromium, then cached) — never fetched from a third-party
// image API at print time.

import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '../.screenshots/node_modules/playwright/index.mjs';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = __dirname;
const repoRoot = path.resolve(__dirname, '..');

// --print-rgb implies --print. RGB is the route this job is taking: the first
// roll-up was sent as RGB and the trykkeri did the separation, so sending the
// second one the same way keeps both banners on the same conversion and the
// same RIP — which is what makes them match standing side by side.
const RGB_PRINT  = process.argv.includes('--rgb') || process.argv.includes('--print-rgb');
const PRINT_MODE = process.argv.includes('--print') || process.argv.includes('--print-rgb');
const VARIANT = (process.argv.find(a => a.startsWith('--variant=')) || '--variant=engine')
  .split('=')[1]
  .toLowerCase();

const URL_TARGET = 'https://nordicadvancedsystems.com';
const QR_DARK_PATH = path.join(brandDir, 'rollup-qr.svg');        // cached dark-on-white geometry
const QR_CYAN_PATH = path.join(brandDir, 'rollup-qr-cyan.svg');   // cyan-on-transparent variant

// 96 dpi web preview: 1 mm = 96 / 25.4 px. The full canvas is therefore
// 850 mm → 3213 px wide, 2020 mm → 7635 px tall.
const PX_PER_MM = 96 / 25.4;
const EXPECT_W = Math.round(850 * PX_PER_MM);   // 3213
const EXPECT_H = Math.round(2020 * PX_PER_MM);  // 7635

const QR_MODULE = '#3bb6e8'; // cyan modules

async function dataUri(filePath, mime) {
  const buf = await fs.readFile(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// Re-encode an (opaque) image to a JPEG data URI to shrink the embedded payload
// — used for the full-bleed photographic background so the PDF stays light and
// fast to open. Text and the QR remain real vector; only the photo is lossy.
async function toJpegDataUri(filePath, quality) {
  const srcUri = await dataUri(filePath, 'image/png');
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await page.setContent('<!doctype html><canvas id="c"></canvas>');
  const jpeg = await page.evaluate(async ({ uri, q }) => {
    const img = new Image();
    img.src = uri;
    await img.decode();
    const c = document.getElementById('c');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/jpeg', q);
  }, { uri: srcUri, q: quality });
  await browser.close();
  return jpeg;
}


// --- Step 1: cyan / transparent QR vector SVG ------------------------------
// Cyan modules on a transparent background (no white quiet-zone rect — the dark
// QR card behind it supplies a uniform quiet zone for scanners).
// Shared by both banner variants; each passes its own target URL + cache path.
async function generateCyanQrSvg(targetUrl, cachePath) {
  console.log(`Generating local cyan QR SVG for ${targetUrl}…`);
  const libUrl = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
  const libResp = await fetch(libUrl);
  if (!libResp.ok) throw new Error(`Failed to fetch ${libUrl}: ${libResp.status}`);
  const libSrc = await libResp.text();

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(`<!doctype html><html><body></body></html>`);
  await page.addScriptTag({ content: libSrc });

  const svg = await page.evaluate(({ url, dark }) => {
    const qr = window.qrcode(0, 'H'); // typeNumber 0 = auto, error correction H
    qr.addData(url);
    qr.make();
    const count = qr.getModuleCount();
    const margin = 4;
    const size = count + margin * 2;
    let cells = '';
    for (let row = 0; row < count; row++) {
      let col = 0;
      while (col < count) {
        if (qr.isDark(row, col)) {
          let run = 1;
          while (col + run < count && qr.isDark(row, col + run)) run++;
          cells += `<rect x="${col + margin}" y="${row + margin}" width="${run}" height="1" fill="${dark}"/>`;
          col += run;
        } else {
          col++;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
${cells}
</svg>`;
  }, { url: targetUrl, dark: QR_MODULE });

  await browser.close();
  await fs.writeFile(cachePath, svg);
  console.log(`Wrote ${cachePath}`);
  return svg;
}

// Cached-first QR loader. `fallbackDarkPath` (optional) lets the engine banner
// re-tint its older dark-on-white cache when offline.
async function loadCyanQr({ targetUrl, cachePath, fallbackDarkPath = null }) {
  try {
    const s = await fs.readFile(cachePath, 'utf8');
    console.log(`Reusing cached cyan QR SVG at ${path.relative(repoRoot, cachePath).replace(/\\/g, '/')}`);
    return s;
  } catch { /* fall through */ }
  if (fallbackDarkPath) {
    try {
      const base = await fs.readFile(fallbackDarkPath, 'utf8');
      const cyan = base
        .replace(/<rect width="100%" height="100%" fill="#ffffff"\/>\s*/i, '')
        .replace(/fill="#08202a"/g, `fill="${QR_MODULE}"`);
      await fs.writeFile(cachePath, cyan);
      console.log('Derived cyan QR SVG from cached brand/rollup-qr.svg (offline)');
      return cyan;
    } catch { /* fall through */ }
  }
  return generateCyanQrSvg(targetUrl, cachePath);
}

// --- Shared: logo lock-up renderer -----------------------------------------
// Horizontal lock-up — [mark]  NAS / NORDIC ADVANCED SYSTEMS.
// The official LOGER/v10 lock-up, inlined and trimmed to its ink box so it stays
// real vector at any print size. Both banners use it.
//
// It replaced a pair of raster crops (assets/NAS_LOGO_branded.png +
// nas-mark-cyan.png, positioned as backgrounds): that baked PNG is no longer in
// the tree, and cropping a 1200 px raster was always the weaker option at
// 550 mm reproduction.
//
//   scale        — 1 = 550 mm wide ink box
//   tone         — 'brand' (cyan mark, cyan wordmark) | 'white' (all white)
//   vectorSvg    — raw text of nas-logo-*-transparent-v10.svg
//   marginBottom — mm of clearance under the lock-up
const LOCKUP_INK = { x: 80, y: 90, w: 3337.6, h: 693.5 };  // measured getBBox() of the v10 lock-up
const LOCKUP_W_MM = 550;                                    // ink-box width at scale 1
const LOCKUP_SVG = 'LOGER/v10/nas-logo-dark-transparent-v10.svg';   // official vector lock-up

function logoLockupCss({ scale = 1, marginBottom = 0 }) {
  const m = (v) => `${+(v * scale).toFixed(4)}mm`;
  return `
  .logo-lockup{ display:flex; flex-direction:row; align-items:center; justify-content:center; margin-bottom:${m(marginBottom)}; }
  .logo-lockup svg{ width:${m(LOCKUP_W_MM)}; height:auto; display:block; }`;
}

function logoLockupHtml({ tone = 'brand', vectorSvg }) {
  const inner = vectorSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const toned = tone === 'white'
    ? inner.replace(/fill="#3BB6E8"/gi, 'fill="#ffffff"').replace(/fill="#FFFFFF"/gi, 'fill="#ffffff"')
    : inner;
  const { x, y, w, h } = LOCKUP_INK;
  return `<div class="logo-lockup"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="Nordic Advanced Systems">${toned}</svg></div>`;
}

// --- Shared: mark-only glyph (no wordmark) ----------------------------------
// The triangular NAS mark on its own — the 12 cyan paths at the head of the v10
// lock-up, with the "NAS" wordmark and the subtitle left behind. Pulled from the
// SAME file logoLockupHtml() uses, so the watermark can never drift from the
// logo it is derived from.
//
// The mark's ink box is the leading corner of LOCKUP_INK: it defines the
// lock-up's left edge (x 80) and its full height (y 90 → 782.55).
const MARK_INK = { x: 80, y: 90, w: 759.52, h: 692.55 };
const MARK_ASPECT = MARK_INK.h / MARK_INK.w;   // 0.9118 — height per unit width

function markOnlySvg(vectorSvg, fill) {
  const m = vectorSvg.match(/<g fill="#3BB6E8">([\s\S]*?)<\/g>/i);
  if (!m) throw new Error(`${LOCKUP_SVG}: cyan mark group not found — cannot build the mark-only glyph`);
  const { x, y, w, h } = MARK_INK;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" aria-hidden="true"><g fill="${fill}">${m[1]}</g></svg>`;
}

// ===========================================================================
//  VARIANT 1 — TYR 2 Series engine banner (the original; behaviour unchanged)
// ===========================================================================
async function buildEngineRollup() {

const qrSvg = await loadCyanQr({                 // inlined into the DOM so it stays vector in the PDF
  targetUrl: URL_TARGET,
  cachePath: QR_CYAN_PATH,
  fallbackDarkPath: QR_DARK_PATH,
});

// --- Step 2: load raster assets --------------------------------------------
// Front-page hero frame (mountain/cloud still from the hero video) — full bg.
// Embedded as JPEG (q0.82): it's an opaque photo, so this cuts the PDF/PNG size
// dramatically with no visible loss at banner viewing distance.
const heroDataUri = await toJpegDataUri(path.join(repoRoot, 'assets/hero-frame.png'), 0.82);
// Bare boxer engine — the hero visual, centred under the headline. Transparent PNG.
const engineRealDataUri = await dataUri(path.join(repoRoot, 'assets/nas_engine_transparent.png'), 'image/png');
// NAS lock-up — the official v10 vector file (cyan mark + white NAS + cyan
// subtitle), inlined by the shared renderer so it stays real vector in the PDF.
// This replaces the old assets/NAS_LOGO_branded.png + nas-mark-cyan.png crops:
// that baked PNG is no longer in the tree, and cropping a raster was always the
// weaker option at 850 mm reproduction.
const lockupSvg = await fs.readFile(path.join(repoRoot, LOCKUP_SVG), 'utf8');

// --- Step 3: compose banner HTML -------------------------------------------
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  /* PALETTE — matches index.html front page. */
  :root{
    --bg:#08202a;
    --accent:#3bb6e8;
    --ink-0:#f3f7f8;
    --ink-2:rgba(243,247,248,0.62);
    --rec:#ff4d4d;
  }
  *,*::before,*::after{ box-sizing:border-box; }
  html, body{ margin:0; padding:0; background:${PRINT_MODE ? '#08202a' : '#2a2a2a'}; }
  body{ display:flex; justify-content:center; }

  .banner{
    position:relative;
    width:850mm;
    height:2020mm;             /* 2000 mm content + 20 mm bottom bleed */
    background:var(--bg);
    color:var(--ink-0);
    font-family:'Inter', system-ui, sans-serif;
    overflow:hidden;
    isolation:isolate;         /* scope blend modes to the banner */
  }

  /* --- background layers (share .banner's stacking context so the floating
         engines can mix-blend-mode:screen against them) --- */
  .bg{
    position:absolute; inset:0;
    background:url('${heroDataUri}') center top / cover no-repeat;
  }
  /* dark teal overlay — strongest at top & bottom; the luminous cloud crest of
     the photo glows through the middle. */
  .overlay{
    position:absolute; inset:0;
    background:
      linear-gradient(to bottom,
        rgba(8,32,42,0.97) 0%,
        rgba(8,32,42,0.86) 13%,
        rgba(8,32,42,0.62) 33%,
        rgba(8,32,42,0.48) 50%,
        rgba(8,32,42,0.55) 60%,
        rgba(8,32,42,0.82) 80%,
        rgba(8,32,42,0.98) 100%);
  }
  /* brand accents echoing index.html .hero::before */
  .accents{
    position:absolute; inset:0;
    background:
      radial-gradient(900mm 520mm at 92% 8%, rgba(59,182,232,0.16), transparent 55%),
      radial-gradient(760mm 520mm at 4% 86%, rgba(16,82,97,0.55), transparent 60%);
  }
  /* faint HUD scanlines across the whole banner (index.html .hero-scanlines) */
  .scanlines{
    position:absolute; inset:0; pointer-events:none; opacity:0.6;
    background-image:repeating-linear-gradient(to bottom,
      rgba(59,182,232,0.05) 0, rgba(59,182,232,0.05) 0.4mm,
      transparent 0.4mm, transparent 3mm);
  }

  /* content column — no z-index → no isolated stacking context, so descendant
     blend modes still reach the bg layers. */
  .sheet{
    position:absolute; left:0; right:0;
    top:80mm; bottom:120mm;          /* 100 mm safe + 20 mm bleed */
    padding:0 56mm;
    display:flex; flex-direction:column; justify-content:flex-start;
    align-items:center; text-align:center;
  }
  /* Breathing room is concentrated in the upper sky gap (a clean hero space
     under the headline); the lower working cluster — engine, telemetry, footer
     — is packed tighter so the bottom never reads as isolated. */

  /* 1+2+3 — header cluster (logo, eyebrow, headline) */
  .header{ display:flex; flex-direction:column; align-items:center; gap:30mm; width:100%; }

  /* logo lock-up (shared renderer) — extra margin-bottom opens a comfortable
     gap before the eyebrow. */
${logoLockupCss({ scale: 1, marginBottom: 120 })}

  .eyebrow{
    display:flex; align-items:center; gap:24mm;
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-size:20mm; font-weight:600; letter-spacing:0.28em;
    text-transform:uppercase; color:var(--accent);
  }
  .eyebrow::before{ content:""; width:88mm; height:1.1mm; background:var(--accent); opacity:0.9; }

  .headline{
    font-family:'Inter', system-ui, sans-serif;
    font-weight:800; font-size:58mm; line-height:1.03;
    letter-spacing:-0.018em; word-spacing:0.05em;   /* clear word gaps */
    margin:0;
  }
  .headline .l1{ color:var(--ink-0); display:block; }
  .headline .l2{ color:var(--accent); display:block; }

  /* tagline — short, punchy, large; clearly secondary to the headline */
  .tagline{
    font-family:'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
    font-weight:500; font-size:30mm; line-height:1.4; letter-spacing:0.005em;
    color:#f3f7f8; max-width:740mm; margin:22mm 0 0;
  }

  /* 4 — bare boxer engine, centred under the headline. Moderate size, sits
     cleanly on the background with just a natural drop-shadow — no glow, no
     blend mode (the PNG is already transparent and renders solid). */
  .real{ position:relative; width:360mm; flex:0 0 auto; margin-top:80mm; }
  .real img{ width:100%; height:auto; display:block; filter:drop-shadow(0 6mm 22mm rgba(0,0,0,0.55)); }

  /* 5+6 — telemetry band: divider + label, then REC widget + mission-ready */
  .telemetry{ display:flex; flex-direction:column; align-items:center; width:100%; gap:30mm; margin-top:80mm; }
  /* REC widget + Mission-ready centred together with space between them */
  .statusbar{ display:flex; align-items:center; justify-content:center; gap:34mm; width:100%; }
  /* REC + Mission share identical box dimensions so the two HUD cards match */
  .rec{
    position:relative; text-align:center;
    background:rgba(8,32,42,0.62); width:350mm; height:190mm; padding:24mm;
    font-family:'JetBrains Mono', ui-monospace, monospace;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:9mm;
  }
  .rec .l1{ display:flex; align-items:center; gap:11mm; font-size:14mm; font-weight:500; letter-spacing:0.16em; text-transform:uppercase; color:var(--ink-0); }
  .rec .l1 .recdot{ width:9mm; height:9mm; border-radius:50%; background:var(--rec); box-shadow:0 0 12mm rgba(255,77,77,0.8); }
  .rec .l1 .live{ color:var(--accent); }
  .rec .l2{ font-size:26mm; font-weight:500; letter-spacing:0.1em; color:var(--ink-0); }
  .rec .l3{ font-size:11mm; font-weight:400; letter-spacing:0.16em; color:var(--ink-2); }
  /* Mission-ready in a HUD card with corner brackets (matches the website's
     corner-bracket cards): translucent dark like the REC widget, centred
     content, accent L-marks at the four corners instead of a full border. */
  .mission{
    position:relative; display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center;
    background:rgba(8,32,42,0.62); width:350mm; height:190mm; padding:24mm;
  }
  .rec .c, .mission .c{ position:absolute; width:26mm; height:26mm; border:1mm solid var(--accent); opacity:0.85; }
  .rec .c.tl, .mission .c.tl{ top:0; left:0; border-right:0; border-bottom:0; }
  .rec .c.tr, .mission .c.tr{ top:0; right:0; border-left:0; border-bottom:0; }
  .rec .c.bl, .mission .c.bl{ bottom:0; left:0; border-right:0; border-top:0; }
  .rec .c.br, .mission .c.br{ bottom:0; right:0; border-left:0; border-top:0; }
  .mission .t1{ font-family:'Inter', sans-serif; font-weight:800; font-size:42mm; line-height:1.02; letter-spacing:-0.025em; color:var(--ink-0); }
  .mission .t2{ font-family:'JetBrains Mono', ui-monospace, monospace; font-size:18mm; font-weight:500; letter-spacing:0.12em; color:var(--accent); margin-top:10mm; }

  /* 7 — bottom footer zone: divider + label, then real engine + cyan QR */
  .footerzone{ display:flex; flex-direction:column; width:100%; gap:34mm; margin-top:56mm; }
  .fdiv{
    display:flex; align-items:center; gap:16mm; width:100%;
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-size:10mm; font-weight:500; letter-spacing:0.24em; text-transform:uppercase;
    color:var(--accent); white-space:nowrap;
  }
  .fdiv::after{ content:""; flex:1 1 auto; height:1px; background:linear-gradient(90deg, rgba(59,182,232,0.55), rgba(59,182,232,0.06)); }

  /* QR now horizontally centred in the footer (engine moved up) */
  .showcase{ display:flex; align-items:center; justify-content:center; width:100%; gap:40mm; }

  .qr-block{ display:flex; flex-direction:column; align-items:center; gap:16mm; flex:0 0 auto; }
  .qr-card{
    width:320mm; height:320mm; padding:26mm;
    background:var(--bg);
    border:0.7mm solid rgba(59,182,232,0.55); border-radius:13mm;
    box-shadow:0 0 0 0.3mm rgba(8,32,42,0.9), 0 0 38mm rgba(59,182,232,0.22);
  }
  /* inline vector QR — stays crisp (vector paths) in the exported PDF */
  .qr-card svg{ width:100%; height:100%; display:block; }
  .qr-text{ display:flex; flex-direction:column; align-items:center; gap:6mm; }
  .qr-text .scan{
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-size:7.5mm; font-weight:500; letter-spacing:0.2em; text-transform:uppercase; color:var(--accent);
  }
  .qr-text .url{
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-size:6.6mm; font-weight:400; letter-spacing:0.1em; color:var(--ink-2);
  }

  ${PRINT_MODE ? '' : `
  /* ---- bleed indicator [2000–2020 mm] — mockup ONLY, stripped in --print ---- */
  .bleed-marker{
    position:absolute; left:0; right:0; bottom:0; height:20mm;
    background:repeating-linear-gradient(45deg,
      rgba(255,90,90,0.20), rgba(255,90,90,0.20) 4mm,
      rgba(255,90,90,0.05) 4mm, rgba(255,90,90,0.05) 8mm);
    border-top:1px dashed rgba(255,90,90,0.50);
  }
  .bleed-label{
    position:absolute; left:0; right:0; bottom:23mm; text-align:center;
    font-family:'JetBrains Mono', monospace; font-size:3.6mm; letter-spacing:0.2em;
    color:rgba(150,165,170,0.7); text-transform:uppercase;
  }
  `}
</style>
</head>
<body>
<div class="banner" id="banner">
  <div class="bg"></div>
  <div class="overlay"></div>
  <div class="accents"></div>
  <div class="scanlines"></div>

  <div class="sheet">

    <!-- 1+2+3 — header -->
    <div class="header">
      ${logoLockupHtml({ tone: 'brand', vectorSvg: lockupSvg })}
      <div class="eyebrow">NAS 2 Series · NDAA-Compliant</div>
      <h1 class="headline">
        <span class="l1">Engineered for endurance</span>
        <span class="l2">Built on integrity</span>
      </h1>
      <p class="tagline">Long-endurance dual-cylinder boxer engines for platforms requiring over 1000 km range. Engineered for altitude shifts and harsh weather.</p>
    </div>

    <!-- 4 — bare boxer engine, centred under the headline -->
    <div class="real"><img src="${engineRealDataUri}" alt="NAS 2 Series boxer engine" /></div>

    <!-- 5+6 — telemetry band -->
    <div class="telemetry">
      <div class="fdiv">/ Field Telemetry</div>
      <div class="statusbar">
      <div class="rec">
        <span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>
        <div class="l1"><span class="recdot"></span>REC&nbsp;&nbsp;NAS 2C · <span class="live">LIVE</span></div>
        <div class="l2">02:47:54 UTC</div>
        <div class="l3">CH-04 · 1080P · 24FPS</div>
      </div>
      <div class="mission">
        <span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>
        <div class="t1">Mission-ready</div>
        <div class="t2">Mounted, Tested, Proven</div>
      </div>
      </div>
    </div>

    <!-- 7 — footer zone: divider + label, then centred cyan QR -->
    <div class="footerzone">
      <div class="showcase">
        <div class="qr-block">
          <div class="qr-card" role="img" aria-label="QR code linking to nordicadvancedsystems.com">${qrSvg}</div>
          <div class="qr-text">
            <div class="scan">Scan for specifications</div>
            <div class="url">nordicadvancedsystems.com</div>
          </div>
        </div>
      </div>
    </div>

  </div>
${PRINT_MODE ? '' : `
  <!-- bleed indicator (mockup only) -->
  <div class="bleed-label">↑ Bleed · not visible when rolled</div>
  <div class="bleed-marker"></div>
`}
</div>
</body>
</html>`;

const htmlOutPath = path.join(brandDir, PRINT_MODE ? 'rollup-banner-print.html' : 'rollup-banner.html');
await fs.writeFile(htmlOutPath, html);
console.log(`Wrote ${htmlOutPath}`);

// --- Step 4: render PNG + PDF ----------------------------------------------
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: EXPECT_W + 80, height: 1200 },
  deviceScaleFactor: 1,            // 96 dpi → 1 mm = 96/25.4 px
});
const page = await ctx.newPage();
await page.setContent(html, { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

// Verify every image actually decoded.
const imgReport = await page.evaluate(() =>
  [...document.images].map(i => ({
    alt: i.alt, ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth,
  }))
);
const broken = imgReport.filter(i => !i.ok);
if (broken.length) {
  await browser.close();
  throw new Error('Broken images: ' + broken.map(b => b.alt || '(no alt)').join(', '));
}
console.log('All images loaded: ' + imgReport.map(i => `${i.alt || '?'} (${i.w}px)`).join(', '));

const el = await page.$('.banner');
const box = await el.boundingBox();
const pngOut = path.join(brandDir, PRINT_MODE ? 'rollup-banner-print.png' : 'rollup-banner-mockup.png');
await el.screenshot({ path: pngOut });
const stat = await fs.stat(pngOut);

// Flattened high-quality JPEG — opens instantly (single image, no vector/shadow
// rasterisation like the PDF) and is accepted by roll-up print shops. This is
// the "light, fast" deliverable alongside the vector PDF.
const jpgOut = path.join(brandDir, PRINT_MODE ? 'rollup-banner-print.jpg' : 'rollup-banner-mockup.jpg');
await el.screenshot({ path: jpgOut, type: 'jpeg', quality: 90 });
const jpgStat = await fs.stat(jpgOut);

// 1:1 PDF — true 850×2020 mm page (preview, not the final print master).
const pdfOut = path.join(brandDir, PRINT_MODE ? 'rollup-banner-print.pdf' : 'rollup-banner-mockup.pdf');
await page.pdf({
  path: pdfOut,
  width: '850mm',
  height: '2020mm',
  printBackground: true,
  preferCSSPageSize: false,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
const pdfStat = await fs.stat(pdfOut);

// --- Step 5: lightweight preview --------------------------------------------
// Downscale the full PNG to ~1000 px wide for a fast-loading preview. The full
// mockup PNG/PDF above are left untouched (they remain the print-quality 1:1).
const SMALL_W = 1000;
const smallOut = path.join(brandDir, 'rollup-preview-small.png');
const fullUri = 'data:image/png;base64,' + (await fs.readFile(pngOut)).toString('base64');
const sp = await ctx.newPage();
await sp.setContent('<!doctype html><canvas id="c"></canvas>');
const smallDataUrl = await sp.evaluate(async ({ uri, w }) => {
  const img = new Image();
  img.src = uri;
  await img.decode();
  const h = Math.round((w / img.width) * img.height);
  const c = document.getElementById('c');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/png');
}, { uri: fullUri, w: SMALL_W });
await sp.close();
await fs.writeFile(smallOut, Buffer.from(smallDataUrl.split(',')[1], 'base64'));
const smallStat = await fs.stat(smallOut);

// --- Step 6: lightweight screen-viewing PDF ---------------------------------
// rollup-banner-screen.pdf — same layout/text/colours/dimensions, but built so
// it opens and scrolls smoothly on screen. The print PDF is left untouched.
// Heavy GPU effects (engine drop-shadow, QR/dot glow box-shadows) make Chromium
// bake 30+ MP raster layers into the PDF, so we drop them here; the photo
// background is already JPEG and the lock-up is now vector (nothing to
// downsample). Text and the QR stay vector (sharp). Bleed indicator stripped.
const screenHtml = html
  .replace(/filter:drop-shadow[^;]*;/g, '')      // drop engine shadow (→ 31MP layers)
  .replace(/box-shadow:[^;]*;/g, '')             // drop QR glow (→ 33MP layer)
  .replace(/<div class="bleed-label">[\s\S]*?<\/div>\s*/g, '')
  .replace(/<div class="bleed-marker"><\/div>\s*/g, '');
const scr = await ctx.newPage();
await scr.setContent(screenHtml, { waitUntil: 'networkidle', timeout: 60000 });
await scr.evaluate(() => document.fonts.ready);
await scr.waitForTimeout(300);
const screenPdfOut = path.join(brandDir, 'rollup-banner-screen.pdf');
await scr.pdf({
  path: screenPdfOut,
  width: '850mm', height: '2020mm',
  printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await scr.close();
const screenStat = await fs.stat(screenPdfOut);

// --- Step 7: PDF/X-3 CMYK print master (--print only) ------------------------
// Same colour pipeline as the drone-stack banner, so #3BB6E8 is identical on
// both roll-ups. Chromium's own PDF above is RGB and is fine for review, but it
// is not what goes to the trykkeri. Re-rendered at 120 dpi (this page is
// composed at 96 dpi) because rasterising the 96 dpi screenshot would throw
// away resolution the print master needs.
let cmykInfo = null, cmykOut = null, cmykStat = null;
if (PRINT_MODE) {
  const CMYK_DPI = 120;
  const hiCtx = await browser.newContext({
    viewport: { width: EXPECT_W + 80, height: 1200 },
    deviceScaleFactor: CMYK_DPI / 96,
  });
  const hi = await hiCtx.newPage();
  await hi.setContent(html, { waitUntil: 'networkidle', timeout: 120000 });
  await hi.evaluate(() => document.fonts.ready);
  await hi.waitForTimeout(400);
  const hiPng = path.join(brandDir, 'rollup-banner-print-120dpi.png');
  await (await hi.$('.banner')).screenshot({ path: hiPng });
  await hiCtx.close();

  cmykOut = path.join(brandDir, 'rollup-banner-print-pdfx-cmyk.pdf');
  cmykInfo = await writePdfXCmyk({
    pngPath: hiPng,
    outPath: cmykOut,
    title: 'NAS TYR 2 Series roll-up 85x200cm',
    widthMm: 850,
    heightMm: 2020,
    trimBottomMm: 20,
    dpi: CMYK_DPI,
  });
  cmykStat = await fs.stat(cmykOut);
}

await browser.close();

const relPng = path.relative(repoRoot, pngOut).replace(/\\/g, '/');
const relSmall = path.relative(repoRoot, smallOut).replace(/\\/g, '/');
console.log(`✓ Banner mockup generated: ${relPng} (${EXPECT_W}×${EXPECT_H} px)`);
console.log(`  rendered box: ${Math.round(box.width)}×${Math.round(box.height)} px · PNG ${(stat.size/1024).toFixed(0)} KB · PDF ${(pdfStat.size/1024).toFixed(0)} KB`);
console.log(`  flattened JPEG: ${path.relative(repoRoot, jpgOut).replace(/\\/g, '/')} (${(jpgStat.size/1024).toFixed(0)} KB · fast to open, print-ready for roll-up)`);
console.log(`  lightweight preview: ${relSmall} (${SMALL_W}px wide · ${(smallStat.size/1024).toFixed(0)} KB)`);
console.log(`  screen PDF: ${path.relative(repoRoot, screenPdfOut).replace(/\\/g, '/')} (${(screenStat.size/1024).toFixed(0)} KB · vector text, fast to open)`);
if (PRINT_MODE) {
  console.log(`  print master (PDF/X-3:2003, DeviceCMYK, ${cmykInfo.dpi} dpi, 20 mm bottom bleed)`);
  console.log(`    ${path.relative(repoRoot, cmykOut).replace(/\\/g, '/')}  (${(cmykStat.size/1048576).toFixed(1)} MB)`);
  console.log(`    colour profile:   ${cmykInfo.iccFamily}`);
  console.log(`      embedded ICC:   ${cmykInfo.iccName}`);
  console.log(`      loaded from:    ${cmykInfo.iccPath}`);
  console.log('  (--print: bleed indicator stripped, ready for printer prepress)');
} else {
  console.log('  (no CMYK master in mockup mode — rerun with --print for the PDF/X print master)');
}

} // end buildEngineRollup


// ===========================================================================
//  VARIANT 2 — NAS ESC + Drone Stack roll-up
//  "The brain of the aircraft" — 85 × 200 cm portrait @ 120 dpi.
// ===========================================================================

// --- Canvas + zone map ------------------------------------------------------
// All measurements in mm, measured from the TOP of the 2000 mm content area.
// Bleed / safe-zone values are inherited from the engine rollup config above:
// 20 mm bottom bleed, 80 mm top safe, 100 mm bottom safe.
const DS_STATEMENT = { padMm: 20 };   // rule → text clearance, both sides

// QR section rule — the cyan rule that declares the QR block its own section.
// Both clearances are floors set by the brief and are asserted after render, on
// measured ink, not trusted from these numbers.
// QR card. The frame treatment is the ENGINE banner's, verbatim — full rounded
// rectangle, not the four corner ticks this banner used to carry. Standing side
// by side the style difference read louder than the size difference did.
//
// THE SECTION RULE IS GONE, and with it the 71.2 mm it cost (30 mm clearance,
// the rule, 40 mm clearance). It was introduced to stop a centred QR reading as
// unaligned against a spec grid whose ink ran 81–673 mm — an optical centre of
// 377 mm against the card's 425 mm. Centring the grid as a 540 mm block on
// 425 mm fixed that at the source: grid and card now share a centre line and
// the rule had nothing left to separate.
//
// Spending those 71.2 mm on the code itself is the better trade. Between the
// spec grid's last descriptor (1542.7 mm) and the 1845 mm ink floor there are
// 302.3 mm; a 20 mm gap above the card and 39 mm of caption below it leave
// 243 mm of ceiling, so 230 mm fits with room to spare rather than scraping.
const DS_QR = {
  cardMm: 230,
  // 17 mm, scaled with the card (14 x 230/190) so the quiet zone stays in
  // proportion to the frame rather than tightening as the code grows.
  padMm:  17,
  // Gap from the spec grid's last descriptor to the top of the frame. Asserted
  // after render on measured ink, because an element box carries line leading
  // and reads several millimetres tighter than the gap a person sees.
  gapAboveMm:    20,
  gapAboveMinMm: 18,
  // Engine banner's .qr-card, unchanged: 0.7 mm cyan stroke at 55 %, 13 mm
  // radius, solid marine fill, and the two-part shadow (a hairline seat plus a
  // wide soft glow). The radius is the engine's ABSOLUTE 13 mm rather than a
  // proportional scale-down — the two cards hang at different sizes, and equal
  // absolute curvature is what makes the corners read as the same treatment.
  radiusMm:  13,
  strokeMm:  0.7,
};

const DS_CANVAS = {
  contentW: 850,
  contentH: 2000,
  bleedBottom: 20,          // same as the engine rollup
  safeTop: 80,
  safeBottom: 100,
  margin: 80,               // 8 cm side margins
  gutter: 50,               // 5 cm spec-band gutters
  deadZoneTop: 1880,        // 188 cm — cassette covers everything below
  // 150, not 120: the trykkeri brief states a 150 dpi floor for raster at 1:1,
  // and the engine roll-up beside this one went out as a VECTOR pdf whose text
  // is sharp at any size. This banner rasterises, so its type sharpness is set
  // here — at 120 it would read softer than its neighbour on the stand.
  // 150 is also exactly where the artwork tops out: the aircraft cutout holds
  // 3754 px across 632 mm = 151 dpi, so this resolves all the detail that
  // actually exists without upscaling past it (see imageMm below).
  dpi: 150,
};
DS_CANVAS.totalH = DS_CANVAS.contentH + DS_CANVAS.bleedBottom;      // 2020 mm
// Spec band: FOUR cells as 2 × 2 across the 690 mm content width.
//
// One row of four was the first plan and it does not work: cell width sets the
// type size, and four 165 mm cells cap the values at 1.33 cm — SMALLER than the
// 1.58 cm of the twelve-cell grid it replaced. Two columns of 325 mm roughly
// doubles that. 40 mm of gutter, not 10: the fitter grows the widest value until
// it is flush with its cell edge, so the gutter is the only thing separating one
// spec from the next.
// 30 mm of gutter, down from 40: the value cap is bound by CELL WIDTH, not by
// the height available, so every millimetre taken off the gutter goes straight
// into the type. It also pulls the two columns closer, which is what makes the
// four cells read as one block rather than as two lists.
//
// FIXED 240 mm columns on a 60 mm gutter — a 540 mm block, centred — rather
// than two columns filling the 690 mm content width.
//
// The full-width version measured well and looked wrong. Cell TEXT is
// left-aligned (it is data; centring a value over its descriptor reads badly),
// so each column's ink starts at its left edge and stops wherever the string
// happens to end. With 330 mm columns the ink ran 81–673 mm: an optical centre
// of 377 mm on a sheet whose centre is 425 mm. The QR card beneath is centred
// on 425 mm, so it lined up with nothing — and worse, 425 mm fell in the gutter
// between the two columns, which is the one place there is no ink at all.
//
// 240 mm is set by the widest value, "128 Mbit SPI flash", which needs 236.6 mm
// at the 2 cm target cap. That leaves the block just wide enough to hold the
// type at full size and no wider, so the ink now runs ~155–692 mm and centres
// on ~423 mm. The row is centred with justify-content, not by padding, so the
// block stays centred if a column width ever changes.
DS_CANVAS.specGutter = 60;
DS_CANVAS.specColW   = 240;
// 55 mm, up from 30. At 70 the ink gap between the rows hit 79 mm — the single
// largest gap on the sheet, splitting the 2 × 2 into two unrelated pairs and
// working against the block reading. 55 keeps the value/descriptor pairing
// clearly tighter than the row separation without opening a hole.
DS_CANVAS.specRowGap = 30;

// top / height, mm from the top of the content area
//
// Deviation from the original 86–124 / 124–176 / 176–188 split. Each zone below
// is sized to what it actually holds, so no band carries more than ~40 mm of
// dead space; the spec band gives up 40 mm and the QR block moves up 40 mm, so
// the rhythm from the last spec row → QR → the 188 cm line is even. Everything
// still ends exactly on the dead-zone line.
//
// Measured content totals 1590 mm against 1880 mm of usable height, so there is
// 290 mm of slack to place. Pooling it (a 90 mm eyebrow band holding one 26 mm
// line) is what opens the gaps; every zone below is therefore sized to its own
// measured content plus an even ~32 mm share. The zoneSlack assertion enforces
// it — change a font size or a panel height and the build will say which band
// went hollow.
// UPPER BLOCK — SYNCHRONISED TO THE PRINTED ENGINE BANNER (2026-08-16).
//
// The two roll-ups stand side by side at the show, so their top blocks have to
// register against each other: logo, eyebrow and both headline lines must sit
// at the SAME height on both sheets, or the pair reads as a mistake. The engine
// banner is already printed and is therefore the fixed reference; every number
// in the upper block below is measured off brand/rollup-banner-print.png rather
// than chosen:
//
//                        engine (printed)      this banner, before
//   logo ink            79.9 – 193.9 mm        52.9 – 167.0 mm
//   eyebrow ink        349.5 – 364.8 mm       226.3 – 241.1 mm
//   headline line 1    406.9 – 463.8 mm       258.6 – 334.2 mm
//   headline line 2    466.2 – 523.3 mm       358.3 – 433.9 mm
//
// The lock-up itself did NOT change: it is 114 mm tall spanning L150–R700 on
// both sheets already, so only its vertical offset moves (53 → 80 mm).
//
// The headline DID change, and deliberately: 7.08 → 5.70 cm cap, with the
// line gap cut from 24 mm to 2 mm (see DS_TYPE.headlineCapCm). A 7 cm headline
// beside the engine banner's 5.7 cm one is the single loudest clash in the
// pair, so this banner gives way.
const DS_ZONES = {
  // Was a tall band with the lock-up centred in it, balancing the space above
  // against the lead-in below. That freedom is gone: the lock-up now has an
  // exact target (ink top 80 mm), so the band is sized to the lock-up and
  // placed at the target instead of being centred inside slack.
  logo:    { top:   80, height: 114.4, maxSlack: 120 },
  // Ink lands 6.3 mm below the band top, so 342.7 puts it at 349 mm.
  eyebrow: { top:  342.7, height:  28 },   // rule + line         27 mm
  // Two lines at 58 mm / 1.03 = 59.7 mm pitch, so 119.5 mm of content. The ink
  // top sits 6.3 mm BELOW the line box top (half-leading + the gap between the
  // font ascent and the ascender), so 399.8 puts line 1 ink on 406.9 mm — the
  // engine banner ink top, to a tenth of a millimetre.
  head:    { top:  405.5, height: 127 },   // two lines
  // --- everything below here absorbs the drop the headline caused -----------
  // Shrinking the headline from 97 mm type to the engine banner's 58 mm, then
  // moving it down to register with that banner, pushes the ink below it down
  // 78 mm. The four gaps named in the brief are set to their target values
  // (45 / 50 / 70 mm below, 20 mm above the QR), which gives back 79 mm — so
  // the sheet actually ends 1 mm HIGHER than before the synchronisation. Zone
  // TOPS carry the change; no band's own height moves except the QR band's.
  variant: { top:  561.5, height: 122 },   // ratings + note     114 mm
  claims:  { top:  684.4, height:  78 },   // one line, no panels
  // The field band is sized tight to its content (≈18 mm of slack, split by
  // centring) so the gap above the FIELD TEST header and the gap below the
  // caption both land near 35 mm — matching the 1–39 mm rhythm of the rest of
  // the sheet, instead of the 83 mm and 134 mm holes they used to be.
  //
  // Deleting the body-statement band moved this up a further 52 mm. All of it
  // went below the aircraft, into the QR block: the spec band cannot absorb
  // height without either a row gap that reads as a hole or type it has no
  // WIDTH for (see DS_CANVAS.specColW), so the QR card took it.
  field:   { top:  772.6, height: 448 },
  // Its own band between the drone caption and the spec rule — clearance on
  // both sides so it reads as a statement, not as a caption to either.
  statement:{ top: 1253.6, height: 122 },
  specs:   { top: 1377.6, height: 182 },   // 2 × 2, no rule of its own
  // Ends at 1849 mm, not 1880: cassette depth varies between roll-up hardware,
  // and 3 mm of clearance was one bad assumption away from a clipped URL. The
  // 31 mm gained here is dead space by design — see T.inkFloorMm.
  // Card cut 300 → 190 mm: it was the largest element in the lower half, putting
  // the most visual weight on the least interesting object.
  //
  // This zone is now the FIXED point of the layout. Three rounds of "absorb the
  // freed height above the QR" piled 165 mm of void immediately above it while
  // the upper block, having lost the sub-line and the claim panels, ran four
  // large type blocks at 27–35 mm apart. 100 mm of that void went back up top;
  // the QR did not move, so the sheet still ends on 1849 mm.
  //
  // It is no longer the fixed point. Synchronising the upper block pushed
  // everything here down 89 mm and only 79 mm of that could be taken back out
  // of the four named gaps, so this band gives up the last 10 mm from its OWN
  // height (266 → 236 mm) rather than from the gap above it. Its content is
  // 231.4 mm, so 236 still clears; the band bottom lands on 1843 mm, inside the
  // 1850 mm element floor, and the lowest actual ink on ~1838 mm.
  qr:      { top: 1561.6, height: 274 },   // card + caption
};

// --- CONTENT CONFIG ---------------------------------------------------------
// Change copy and numbers here; the layout code never hard-codes a value.

// Single source of truth for the three current ratings. Consumed BOTH by the
// variant band and by the POWER column of the spec band, so the two can never
// drift apart.
const DS_VARIANTS = ['65A', '100A', '200A'];

// What those ratings actually measure. Per the client: the ESC delivers current
// to whichever output requires it, so no per-motor / total qualifier applies —
// it is simply a 200 A stack.
//
// The variant-band caption and the POWER column's first descriptor both read
// this one value, so the wording cannot drift between the two places the ratings
// appear.
const DS_CURRENT_MEASURE = 'Max continuous current';

const DS_COPY = {
  // no leading "/" — the engine banner's eyebrow rule sits in front of it instead
  eyebrow:  'Intelligent Solutions',
  // line 1 white, line 2 cyan — mirrors "Engineered for endurance / Built on integrity"
  headline: ['The brain of', 'the aircraft'],
  variantCaption: `Three variants · ${DS_CURRENT_MEASURE}`,
  // ONE line, not three HUD panels. The panels put the banner's strongest
  // commercial claims at its smallest heading size — 1.48 cm cap, below the spec
  // values — so the two things a buyer actually screens on read as footnotes.
  // Set as one line they can carry real size.
  //
  // "Selected & certified components" is gone: a visitor cannot verify it, and
  // carrying it forced the other two to share the width three ways.
  claimLine: ['NDAA compliant', 'European built'],
  // Two lines, ruled above and below. No bracket box — the callout panel 40 mm
  // above already carries that treatment, and repeating it makes the two read
  // as a pair of cards rather than as a caption and a statement.
  statement: [
    'Engineered for continuous operation,',
    'not adapted to it.',
  ],
  qrUrl:   'https://nordicadvancedsystems.com/intelligence/drone-stack',
  qrLabel: 'Scan for the full stack',
  qrText:  'nordicadvancedsystems.com',
};

// Spec band — ONE row of four { value, desc } cells across the content width.
//
// Was three columns of four, sized to be read from about a metre. At three
// metres twelve cells at 2 cm cap are texture, not information, so the band now
// carries only the four numbers worth reading at that distance and spends the
// height on making them big. The column headers went with the columns: with a
// single row there is nothing left to group.
const DS_SPECS = [
  // NOT the current ratings: they already run at 9 cm cap in the variant band
  // 600 mm above, so repeating them spent one of only four cells restating
  // something the eye had just read.
  { value: '4S / 6S · 12–26V',    desc: 'Input voltage range' },
  { value: '6 × UART',              desc: 'VTX, RC, ESC tel, GPS' },
  { value: '2 × GPIO',              desc: 'Configurable I/O' },
  { value: '128 Mbit SPI flash',    desc: 'Integrated blackbox' },
];

// FIELD TEST STRIP — the 86–124 cm band. Four Kolibri Defence photographs in a
// single row: real NAS avionics on real platforms. These four files are the only
// ones permitted here; the build fails loudly if any is missing rather than
// substituting another asset.
//
// Row geometry: one 400 mm image on the left, 20 mm gutter, and a 270 mm text
// column beside it holding the callout above the caption — 400 + 20 + 270 = 690.
//
// The source is 1600 × 1067, which IS 3:2, so the crop is a straight fit with
// nothing thrown away and all 1600 px of width survive: 1600 px across 400 mm =
// 102 dpi. That is honest for a roll-up read from a metre, and it buys the
// aircraft real presence.
//
// darkenBrightBg: frames shot on a light studio background punch a bright hole
// in a dark banner. Any frame whose BORDER luminance exceeds this threshold has
// its background keyed to marine — see marineGrade().

// Callout panel — now sits directly beside the image in the text column, so it
// no longer needs a leader line to connect it to anything.
const DS_CALLOUT = { padX: 14, padY: 16 };

const DS_FIELD_TEST = {
  header:  'Field tested · Kolibri Defence',
  caption: 'NAS avionics flying on Kolibri Defence FPV platforms',
  callout: { l1: 'NAS FC + 4-IN-1 ESC', l2: 'INSIDE THIS AIRFRAME' },
  // 2:1, not the source's 3:2. Once marineGrade keys the studio sweep to the
  // sheet colour the aircraft is a floating cutout, and the measured subject
  // fills 91 % of the frame's width but only 60 % of its height — the rest is
  // empty marine. Cropping to 2:1 discards only that emptiness, which is what
  // lets the aircraft go to 520 mm without eating the vertical budget.
  // Fallback aspect for a photographic frame that has to be cover-cropped.
  // A `cutout` frame ignores it and uses its own measured alpha bounding box.
  aspect:  2.2,
  // 632 mm, not the 690 mm of content width now available.
  //
  // Collapsing the spec band freed 282 mm of height and the layout could carry a
  // full-width aircraft — but RESOLUTION, not space, is the binding constraint
  // here. The cutout holds 3754 px of real aircraft detail, so 150 dpi runs out
  // at 635.7 mm; 690 mm would print it at 138 dpi. 632 mm is the honest ceiling
  // (151 dpi) and buys 12 mm over the old 620. The freed height goes to the
  // spec type and to even gaps instead — see DS_ZONES.
  imageMm:   632,   // centred; nothing beside it
  calloutMm: 280,   // callout left, caption right, beneath the image
  footGutter: 40,
  minDpi:  150,     // the cutout carries enough resolution to demand a real floor
  // Subject-only tone curve. marineGrade darkens the backdrop to marine; without
  // this the matte-black airframe goes down with it and reads dark-on-dark.
  subject: { gain: 1.95, offset: 34, contrast: 1.30, pivot: 120 },
  darkenBrightBg: 0.60,   // key a light studio background to marine
  targetBgLum:    0.15,
  maxBgLumSpread: 0.10,
  frames: [
    // Pre-cut RGBA: background removed by a segmentation model and the white
    // matte already decontaminated out of the semi-transparent edge pixels.
    // cutout:true skips marineGrade entirely — there is no backdrop to key, and
    // running the pass would only pull the aircraft's own tones toward marine.
    { file: 'assets/koli-cutout-clean.png', cutout: true },
  ],
};

// --- Logo-mark watermark ----------------------------------------------------
// The same treatment as the back of the business card (.bigmark): the bare
// triangular mark, blown up far past its lock-up size, rotated and overlapping,
// sitting under the marine field as a texture rather than as a logo.
//
// OPACITY. The card runs its ghost mark at 6–7 %, but the card is a nearly empty
// sheet held at 40 cm. This banner is dense and read at 4 m, and its lowest-
// contrast text — the grey spec descriptors — has to stay clean, so the pattern
// runs at 3.5 %: inside the 3–4 % ceiling with headroom, not at it. The layer
// also sits BENEATH .accents, so the two radial brand gradients knock it back
// further wherever they land.
//
// PLACEMENT. Marks are positioned by hand (mm, box top-left, rotated about the
// box centre) so ink lands in the upper margin, at the sides of the drone zone
// and around the QR card. `keep` is the belt-and-braces on top of that: a
// vertical mask that zeroes the layer everywhere else, so no future nudge to a
// mark can walk the pattern under the type. Bands are OUTER limits — the fade
// ramps live inside them, so a masked-out region is masked out absolutely.
// The bands are DERIVED from the zone map, not typed in. They were literals
// until the spec band collapsed from twelve cells to four and every zone below
// the claims moved 96–152 mm — literals would have left the pattern sitting
// under the new drone caption and the new spec row while still reading as
// "masked". Deriving them means the mask follows the layout by construction.
const DS_WATERMARK = {
  opacity: 0.035,
  fadeMm:  30,             // ramp length just inside each band edge
  // Each band is [start, end] in mm, computed from DS_ZONES. Marks below give
  // `dy` RELATIVE to their band's start for the same reason.
  bands: (Z, totalH) => [
    // upper margin — around the lock-up, stopping short of the headline
    { key: 'top',   from: 0,                  to: Z.head.top - 16 },
    // inside the field zone: clear of its header at the top and of the
    // callout/caption foot row at the bottom
    { key: 'drone', from: Z.field.top + 58,   to: Z.field.top + Z.field.height - 130 },
    // beside the QR card, down through the cassette dead zone
    { key: 'qr',    from: Z.qr.top + 24,      to: totalH },
  ],
  // w = width in mm; x = box left in mm; dy = top relative to the band start;
  // rot = degrees about the box centre
  marks: [
    { band: 'top',   w: 560, x: -230, dy: -190, rot: -16 },  // bleeding off two edges
    { band: 'top',   w: 340, x:  -70, dy:  -50, rot:  24 },  // overlaps the above
    { band: 'top',   w: 400, x:  620, dy: -150, rot:  20 },  // top-right
    { band: 'drone', w: 620, x: -300, dy:  -60, rot:  12 },  // left of the drone
    { band: 'drone', w: 360, x:   40, dy:   80, rot: -28 },  // overlaps the above
    { band: 'drone', w: 520, x:  600, dy:   20, rot: -20 },  // right, bleeding off
    { band: 'qr',    w: 480, x: -220, dy:  -20, rot: -14 },  // left of the QR card
    { band: 'qr',    w: 420, x:  610, dy:   40, rot:  18 },  // right of the QR card
  ],
};

// Resolve the derived bands into the flat [[from,to],…] the mask builder wants,
// and the marks into absolute mm.
function resolveWatermark(W, Z, totalH) {
  const bands = W.bands(Z, totalH);
  const byKey = Object.fromEntries(bands.map(b => [b.key, b]));
  return {
    keep: bands.map(b => [Math.max(0, Math.round(b.from)), Math.round(b.to)]),
    marks: W.marks.map(m => {
      const b = byKey[m.band];
      if (!b) throw new Error(`watermark mark references unknown band "${m.band}"`);
      return { w: m.w, x: m.x, y: Math.round(b.from + m.dy), rot: m.rot };
    }),
  };
}

// Vertical mask for the watermark layer, built from DS_WATERMARK.keep. Ramps are
// placed INSIDE each band so a band edge is a hard guarantee: at 1096 mm the
// pattern is already at zero, and stays there through the whole spec band.
function watermarkMaskGradient(W, totalH) {
  const f = W.fadeMm;
  const stops = [];
  let prev = 0;
  for (const [a, b] of W.keep) {
    if (a > 0) stops.push(`transparent ${prev}mm`, `transparent ${a}mm`);
    stops.push(`#000 ${a <= 0 ? 0 : a + f}mm`, `#000 ${b >= totalH ? totalH : b - f}mm`);
    if (b < totalH) stops.push(`transparent ${b}mm`);
    prev = b;
  }
  if (prev < totalH) stops.push(`transparent ${totalH}mm`);
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}

// --- Typographic targets ----------------------------------------------------
// Cap heights in cm, per the zone map. Font sizes are derived from the FONT'S
// REAL measured cap ratio at render time, then shrunk to fit where necessary.
const DS_TYPE = {
  // HEADLINE — a fixed size, not a fitted one. Every other block on this sheet
  // is fitted to whatever space it has; the headline is not, because it has to
  // register with the already-printed engine banner standing beside it.
  //
  // WHAT IS BEING MATCHED: the INK BAND — the printed height of a line, from the
  // top of its tallest glyph to the bottom of its lowest. On the printed engine
  // banner those bands are 56.9 mm and 57.1 mm, separated by a 2.4 mm gap, and
  // reproducing them here is the brief.
  //
  // WHAT THAT COSTS, written down so nobody has to re-derive it. An ink band is
  // NOT a cap height. Inter 800 measures cap 0.730 em, ascender 0.775 em,
  // descender 0.220 em. Both engine lines carry descenders ("Engineered",
  // "integrity") so their bands span 0.995 em; NEITHER drone-stack line does
  // ("The brain of", "the aircraft") so theirs span 0.785 em. Forcing two
  // unequal spans to print the same height therefore forces unequal type:
  //
  //                  engine        this banner
  //     font size     58.0 mm        73.5 mm      1.27x
  //     cap height    42.3 mm        53.7 mm      capitals ARE larger here
  //     ink band      56.9 mm        56.9 mm      matched — the brief
  //
  // The two headlines match as printed BLOCKS and differ as LETTERFORMS. That
  // is an instructed trade-off (2026-08-16), not an oversight. If the priority
  // ever flips back to equal cap heights, set 58 / 1.03 — the engine banner's
  // own CSS values — and reposition DS_ZONES.head accordingly.
  //
  // 78.08 = the 57 mm CAP HEIGHT target / 0.730 em. Instructed 2026-08-16, in
  // preference to matching the ink band: the brief asks for cap height and this
  // is cap height.
  headlineFsMm:    78.08,
  // Line pitch 62.7 mm, NOT the engine banner's 59.3 mm, and this is forced
  // arithmetic rather than a choice. At 78.08 mm type these two descender-less
  // strings print a 60.7 mm ink band each. A 2 mm gap between the printed lines
  // therefore needs 60.7 + 2 = 62.7 mm of pitch. The 60 mm pitch implied by
  // "line 1 at 406, line 2 at 466" is SMALLER than the ink band itself, so at
  // that spacing the two lines would collide by 0.7 mm — line 2's ascenders
  // running up into line 1's round-letter overshoot.
  //
  // Line 1 is pinned to 406 mm, so line 2 lands on 468.7 mm instead of 466 mm.
  // Nothing can recover those 2.7 mm except giving up cap height: it is the
  // 57 mm cap that makes the lines too tall to sit 60 mm apart. At the previous
  // 53.7 mm cap the band was 57.1 mm and 466 mm fitted exactly.
  headlineLeading: 0.8030,   // 62.7 / 78.08
  variantCapCm:     9.0,   // ratings — loudest element after the headline
  variantCapMinCm:  4.0,
  variantCapNoteCm: 1.4,   // mono caption under the ratings
  variantNoteCapMinCm: 0.8,
  specDescMaxLines: 2,     // a descriptor may take a second line
  // One line across the content width now, not three panels. Fit is the
  // constraint, not the target: the fitter shrinks until the line clears the
  // 8 cm side margins rather than wrapping.
  claimCapCm:       4.0,   // target; reports what it actually reaches
  claimCapMinCm:    2.0,   // must still out-rank the statement line below
  claimLeading:     1.10,
  // Statement line — below the claim line, above the spec values.
  // Capped BELOW the claim line, which tops out at 2.66 cm — see the hierarchy
  // assertion. 3.0 would out-rank the claim it is supposed to sit under.
  statementCapCm:    2.50,
  statementCapMinCm: 1.6,
  // Spec band is now four cells read at 3 m rather than twelve read at 1 m.
  // The target is what the band ASKS for; the fitter shrinks to whatever the
  // longest value allows in a 325 mm cell, and the floor is what the build
  // refuses to go under.
  //
  // 2.8, not the 4.0 originally briefed: 4 cm cap needs 495 mm for the widest
  // value and only a full-width single column can give it that. In a 2 × 2 the
  // ceiling is ~2.6 cm, so a 4.0 target would just report a permanent miss.
  // The widest value is "65A / 100A / 200A", not "128 Mbit SPI flash" — the
  // spaces and slashes cost more width than the longer string's characters do.
  // Below the statement line, which is below the claim line. The ceiling on this
  // whole ladder is the claim line's 2.66 cm, and that is set by its own string
  // length against the 690 mm content width — not by any space on the sheet.
  specValCapCm:     2.0,   // spec value line
  // 2.0, raised from 1.0. Values carry white-space:nowrap and the fitter shrinks
  // them to fit, so an over-long value can never actually wrap — it silently
  // goes small instead, which is the same failure wearing a different hat. A
  // 1.0 cm floor let a value shrink BELOW the 1.58 cm of the twelve-cell band
  // this replaced and still pass. The floor is now the real guard: anything that
  // cannot be set at 2 cm in a 325 mm cell fails the build.
  specValCapMinCm:  1.6,   // hard floor — build fails below this
  specDescCapCm:    1.4,   // spec descriptor line
  specDescCapMinCm: 1.0,
  specHeadCapCm:    1.1,   // (unused since the spec column headers went)
  // Field-test section marker. Raised 1.1 → 1.8 cm so it reads as a band label
  // rather than a caption, but it stays under the spec values: it marks a
  // section, it does not make a claim.
  ftHeadCapCm:      1.8,
  ftCaptionCapCm:   1.3,
  ftCaptionCapMinCm: 0.8,
  ftCaptionMaxLines: 2,
  calloutCapCm:     1.5,   // callout line 1 (white, like a claim panel)
  calloutSubCapCm:  0.9,   // callout line 2 (mono cyan)
  minPt:            14,    // no text below 14 pt at print scale, anywhere
  maxZoneSlackMm:   40,    // no band may go hollow and open an unintended gap
  // Hard floor for ANY ink, 30 mm above the nominal cassette line. The dead zone
  // starts at 1880 mm on paper, but cassette depth varies between hardware, so
  // the artwork keeps a margin rather than trusting that number.
  inkFloorMm:     1850,
  // Tighter floor for MEASURED INK, as opposed to element boxes. inkFloorMm
  // above bounds where a box may end; this bounds where a pixel may actually
  // land. Introduced when the upper block was synchronised to the printed
  // engine banner: that pushed 89 mm of layout downward and the whole recovery
  // plan is only worth anything if the bottom of the sheet is checked against a
  // number rather than eyeballed.
  lowestInkMaxMm: 1845,
  // The eyebrow introduces the headline. Measured on rendered ink, the gap above
  // it must dominate the gap below it, or it reads as part of the logo lock-up.
  leadInMinRatio:   3,
  leadInAbovePct:   0.060,
  leadInBelowPct:   0.015,
};

// --- Top-block lead-in measurement ------------------------------------------
// Measured off the RENDERED PIXELS, not element boxes: a text element's box
// includes leading, so box gaps and the gaps a human sees on the proof are not
// the same number. This scans for rows containing ink the way you would measure
// them off the proof, finds the first three ink bands (lock-up, eyebrow,
// headline) and returns the two gaps between them.
async function measureLeadIn(pngPath, { canvasMm, scanToMm }) {
  const sharp = require('sharp');
  const meta = await sharp(pngPath).metadata();
  const pxPerMm = meta.height / canvasMm;
  const scanH = Math.min(meta.height, Math.round(scanToMm * pxPerMm));

  const { data, info } = await sharp(pngPath)
    .extract({ left: 0, top: 0, width: meta.width, height: scanH })
    // fit:'fill' with the original row count so rows stay 1:1 with the render —
    // a plain width resize would scale height too and break the mm mapping
    .resize({ width: 700, height: scanH, fit: 'fill' })
    .removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });

  const { width: W, height: H, channels: ch } = info;
  const INK = 100;        // marine ≈ 33, cyan ≈ 158, white ≈ 245
  const MIN_PX = 4;
  const rowHasInk = (y) => {
    let n = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (l > INK && ++n >= MIN_PX) return true;
    }
    return false;
  };

  const bands = [];
  let start = -1;
  for (let y = 0; y < H; y++) {
    if (rowHasInk(y)) { if (start < 0) start = y; }
    else if (start >= 0) { bands.push([start, y - 1]); start = -1; }
  }
  if (start >= 0) bands.push([start, H - 1]);

  const mmOf = (rows) => rows * (canvasMm / meta.height);
  if (bands.length < 3) return { ok: false, bands: bands.length };

  const [logo, eyebrow, headline] = bands;
  const above = mmOf(eyebrow[0] - logo[1]);
  const below = mmOf(headline[0] - eyebrow[1]);
  return {
    ok: true,
    aboveMm: +above.toFixed(1), belowMm: +below.toFixed(1),
    ratio: below > 0 ? +(above / below).toFixed(2) : Infinity,
    abovePct: +(100 * above / canvasMm).toFixed(2),
    belowPct: +(100 * below / canvasMm).toFixed(2),
    bandsMm: [logo, eyebrow, headline].map(b => [+mmOf(b[0]).toFixed(1), +mmOf(b[1]).toFixed(1)]),
  };
}

// Bounding box of everything meaningfully opaque — used to trim a pre-cut RGBA
// asset down to the subject itself.
async function alphaBBox(src, threshold = 8) {
  const sharp = require('sharp');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: ch } = info;
  let mnx = W, mny = H, mxx = -1, mxy = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * ch + 3] > threshold) {
        if (x < mnx) mnx = x; if (x > mxx) mxx = x;
        if (y < mny) mny = y; if (y > mxy) mxy = y;
      }
    }
  }
  if (mxx < 0) throw new Error(`${src} is fully transparent — nothing to composite`);
  return { left: mnx, top: mny, width: mxx - mnx + 1, height: mxy - mny + 1 };
}

// --- Cover-crop resampler ---------------------------------------------------
// Cover-fit `src` into `px` ({w,h}) with a Lanczos kernel, cropping to the
// CSS-style focus point ("50% 42%"), and return it as a JPEG data URI.
//
// `cropSrcW` is the number of ORIGINAL pixels the crop window spans
// horizontally — i.e. the real detail behind the frame, which is what effective
// dpi must be computed from. Resampling up to `px` does not create detail, so
// measuring the output width would flatter the image and hide a soft source.
async function coverCrop(src, px, focus) {
  const sharp = require('sharp');
  const meta = await sharp(src).metadata();
  const [fx, fy] = focus.split(/\s+/).map(v => parseFloat(v) / 100);

  const scale = Math.max(px.w / meta.width, px.h / meta.height);
  const sw = Math.ceil(meta.width * scale), sh = Math.ceil(meta.height * scale);

  const buf = await sharp(src)
    .resize(sw, sh, { kernel: 'lanczos3' })
    .extract({
      left: Math.max(0, Math.min(sw - px.w, Math.round((sw - px.w) * fx))),
      top:  Math.max(0, Math.min(sh - px.h, Math.round((sh - px.h) * fy))),
      width: px.w, height: px.h,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { raw: buf, srcW: meta.width, srcH: meta.height, cropSrcW: px.w / scale };
}

// Measure the BORDER luminance of a raw RGB frame (outer 12 %), which is the
// background rather than the subject, and — if it is brighter than `threshold`
// — key that background to marine so a light studio shot sits with the dark
// frames instead of punching a hole in the banner.
//
// Simply dimming the whole frame would not work: the subject is dark and the
// background is light, so a global multiply kills the aircraft along with the
// backdrop. Instead the mask keys on "bright AND desaturated", which is what a
// paper/seamless background is and what a matte black airframe is not.
const MARINE = [10, 37, 48];
const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function marineGrade({ data, info }, threshold, targetBgLum, S) {
  const { width: W, height: H, channels: ch } = info;

  // Mean luminance of the outer 12 % ring — the backdrop, not the subject.
  const borderLum = (buf) => {
    const bw = Math.max(1, Math.round(Math.min(W, H) * 0.12));
    let sum = 0, n = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (x >= bw && x < W - bw && y >= bw && y < H - bw) continue;
        const i = (y * W + x) * ch;
        sum += (0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]) / 255;
        n++;
      }
    }
    return sum / n;
  };

  const before = borderLum(data);
  if (before <= threshold) return { treated: false, before, after: before, keyLo: null };

  const orig = Uint8Array.from(data);          // pristine copy — each pass re-grades from source

  const applyKey = (keyLo, keyHi) => {
    data.set(orig);
    for (let p = 0; p < W * H; p++) {
      const i = p * ch;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      // background-ness: bright and neutral
      const t = smoothstep(keyLo, keyHi, L) * (1 - smoothstep(0.12, 0.32, sat));
      // Subject side gets LIFTED, not dimmed: these airframes are matte black on
      // a white sweep, so once the sweep goes marine an unlifted aircraft is
      // dark-on-dark and disappears. Scaling the lift by (1 − t) is what keeps
      // mid-grey backdrop from being brightened along with the subject — that
      // was why koli_1's soft gradient stayed lighter than the other frames.
      const liftAmt = 1 - t;
      for (let k = 0; k < 3; k++) {
        const v0 = data[i + k];
        // exposure, then contrast about a pivot — applied at full strength to a
        // pure subject pixel and at zero strength to pure backdrop, so the tone
        // curve can be aggressive without touching the already-marine field
        let v = v0 * S.gain + S.offset;
        v = S.pivot + (v - S.pivot) * S.contrast;
        v = Math.max(0, Math.min(255, v));
        const lifted = v0 + (v - v0) * liftAmt;
        const graded = lifted * 0.94 + MARINE[k] * 0.06;
        data[i + k] = Math.round(graded * (1 - t) + MARINE[k] * t);
      }
    }
  };

  // Walk the key window down until the backdrop actually reaches the target.
  // A single fixed window cannot do it: how much of a frame reads as "backdrop"
  // depends on how the shot was lit, so the strength has to be solved per frame.
  let keyLo = 0.46, keyHi = 0.82, after = before;
  for (let pass = 0; pass < 10; pass++) {
    applyKey(keyLo, keyHi);
    after = borderLum(data);
    if (after <= targetBgLum) break;
    keyLo = Math.max(0.04, keyLo - 0.05);
    keyHi = Math.max(keyLo + 0.10, keyHi - 0.05);
  }
  // Final pass → RGBA. The backdrop is keyed to TRANSPARENT rather than filled
  // with marine: the sheet carries a radial accent gradient and scanline
  // texture, so a flat marine fill reads as a rectangle sitting on top of it
  // (measured: flat 37 green inside vs 34–41 and a scanline ripple outside).
  // Transparency lets the sheet's own gradient and texture run under the
  // aircraft, which is what actually makes it float.
  const rgba = Buffer.alloc(W * H * 4);
  let sLum = 0, sN = 0;
  for (let p = 0; p < W * H; p++) {
    const i = p * ch;
    const r = orig[i], g = orig[i + 1], b = orig[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const t = smoothstep(keyLo, keyHi, L) * (1 - smoothstep(0.12, 0.32, sat));
    const liftAmt = 1 - t;
    for (let k = 0; k < 3; k++) {
      const v0 = orig[i + k];
      let v = v0 * S.gain + S.offset;
      v = S.pivot + (v - S.pivot) * S.contrast;
      v = Math.max(0, Math.min(255, v));
      const lifted = v0 + (v - v0) * liftAmt;
      rgba[p * 4 + k] = Math.round(Math.max(0, Math.min(255, lifted * 0.94 + MARINE[k] * 0.06)));
    }
    const a = Math.round(255 * (1 - t));
    rgba[p * 4 + 3] = a;
    if (a > 200) {
      sLum += (0.2126 * rgba[p * 4] + 0.7152 * rgba[p * 4 + 1] + 0.0722 * rgba[p * 4 + 2]) / 255;
      sN++;
    }
  }

  return {
    treated: true, before, after, keyLo: +keyLo.toFixed(2),
    rgba, subjectLum: sN ? sLum / sN : null, subjectPct: sN / (W * H),
  };
}

// Build the four field-test frames. Every file named in DS_FIELD_TEST.frames
// must exist — a missing one is a hard error, never a silent substitution.
async function buildFieldTestFrames({ frameMm, aspect, dpi, minDpi }) {
  const missing = [];
  for (const f of DS_FIELD_TEST.frames) {
    try { await fs.access(path.join(repoRoot, f.file)); } catch { missing.push(f.file); }
  }
  if (missing.length) {
    throw new Error(
      'Field-test strip: required photograph(s) not found — refusing to substitute another asset.\n' +
      missing.map(m => `  missing: ${m}`).join('\n'));
  }

  const px = {
    w: Math.round(frameMm / 25.4 * dpi),
    h: Math.round(frameMm / aspect / 25.4 * dpi),
  };

  const sharp = require('sharp');
  const out = [];
  for (const f of DS_FIELD_TEST.frames) {
    // ---- pre-cut RGBA: trim to the aircraft, scale, composite. No keying. ----
    if (f.cutout) {
      const src = path.join(repoRoot, f.file);
      const bbox = await alphaBBox(src);
      const aspect = bbox.width / bbox.height;
      const cpx = {
        w: Math.round(frameMm / 25.4 * dpi),
        h: Math.round(frameMm / aspect / 25.4 * dpi),
      };
      // Trimming to the alpha box is what makes `frameMm` mean the AIRCRAFT and
      // not a canvas that is part transparent padding — it also centres the
      // aircraft honestly instead of inheriting the source's uneven margins.
      const buf = await sharp(src)
        .extract(bbox)
        .resize(cpx.w, cpx.h, { kernel: 'lanczos3', fit: 'fill' })
        .png({ compressionLevel: 9 })
        .toBuffer();

      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let sLum = 0, sN = 0;
      for (let p = 0; p < info.width * info.height; p++) {
        const i = p * info.channels;
        if (data[i + 3] > 200) {
          sLum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
          sN++;
        }
      }
      const effDpi = Math.round(bbox.width / (frameMm / 25.4));
      out.push({
        ...f, srcW: bbox.width, srcH: bbox.height, cropSrcW: bbox.width, effDpi, px: cpx,
        aspect, cutout: true, bgAfter: null,
        subjectLum: sN ? sLum / sN : null, subjectPct: sN / (info.width * info.height),
        uri: `data:image/png;base64,${buf.toString('base64')}`,
      });
      console.log(`    ${path.basename(f.file).padEnd(26)} cutout, aircraft ${bbox.width}×${bbox.height} px ` +
                  `(of ${(await sharp(src).metadata()).width} px canvas) → ` +
                  `${cpx.w}×${cpx.h} px across ${frameMm.toFixed(2)} mm · ${effDpi} dpi · ` +
                  `aspect ${aspect.toFixed(3)}:1`);
      console.log(`    ${''.padEnd(26)} subject luminance ` +
                  `${(out[out.length - 1].subjectLum * 100).toFixed(0)}% · no marineGrade (nothing to key)`);
      continue;
    }

    const img = await coverCrop(path.join(repoRoot, f.file), px, f.focus);
    const grade = marineGrade(img.raw, DS_FIELD_TEST.darkenBrightBg,
                              DS_FIELD_TEST.targetBgLum, DS_FIELD_TEST.subject);
    // keyed frames carry alpha, so they ship as PNG and composite over the sheet
    const enc = grade.rgba
      ? { buf: await sharp(grade.rgba, { raw: { width: px.w, height: px.h, channels: 4 } })
              .png({ compressionLevel: 9 }).toBuffer(), mime: 'image/png' }
      : { buf: await sharp(img.raw.data, { raw: img.raw.info })
              .jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer(), mime: 'image/jpeg' };
    const effDpi = Math.round(img.cropSrcW / (frameMm / 25.4));
    out.push({
      ...f, srcW: img.srcW, srcH: img.srcH, cropSrcW: img.cropSrcW, effDpi, px,
      uri: `data:${enc.mime};base64,${enc.buf.toString('base64')}`,
      bgBefore: grade.before, bgAfter: grade.after, treated: grade.treated,
    });
    console.log(`    ${path.basename(f.file).padEnd(22)} ${img.srcW}×${img.srcH} → ` +
                `${px.w}×${px.h} px across ${frameMm.toFixed(2)} mm · ${effDpi} dpi · ` +
                `border luminance ${(grade.before * 100).toFixed(0)}%` +
                (grade.treated
                  ? ` → ${(grade.after * 100).toFixed(0)}% (keyed to marine, key floor ${grade.keyLo})`
                  : ' (untreated)'));
    if (grade.treated && grade.subjectLum !== null) {
      console.log(`    ${''.padEnd(22)} subject luminance ${(grade.subjectLum * 100).toFixed(0)}% ` +
                  `over a ${(grade.after * 100).toFixed(0)}% field ` +
                  `(subject is ${(grade.subjectPct * 100).toFixed(0)}% of the frame)`);
    }
  }

  // cutouts have no keyed backdrop to compare
  const lums = out.filter(f => !f.cutout).map(f => f.bgAfter);
  if (lums.length > 1) {
  const spread = Math.max(...lums) - Math.min(...lums);
  console.log(`    final border luminance: ${out.map(f => (f.bgAfter * 100).toFixed(0) + '%').join(' · ')} ` +
              `(spread ${(spread * 100).toFixed(1)} pts, max ${(DS_FIELD_TEST.maxBgLumSpread * 100).toFixed(0)})`);
  if (spread > DS_FIELD_TEST.maxBgLumSpread) {
    throw new Error(
      `Field-test strip: frame backgrounds do not match — border luminance spread is ` +
      `${(spread * 100).toFixed(1)} points (max ${(DS_FIELD_TEST.maxBgLumSpread * 100).toFixed(0)}):\n` +
      out.map(f => `  ${f.file} — ${(f.bgAfter * 100).toFixed(0)}%`).join('\n'));
  }
  }

  const soft = out.filter(f => f.effDpi < minDpi);
  if (soft.length) {
    throw new Error(
      `Field-test strip: ${soft.length} frame(s) below the ${minDpi} dpi minimum:\n` +
      soft.map(f => `  ${f.file} — ${f.effDpi} dpi (${Math.round(f.cropSrcW)} px of real detail ` +
                    `across ${frameMm.toFixed(2)} mm; needs ${Math.ceil(frameMm / 25.4 * minDpi)} px)`).join('\n'));
  }
  return out;
}

// --- PDF/X-3 CMYK writer ----------------------------------------------------
// Chromium only emits RGB PDF, so the print master is assembled here: the
// 120 dpi render is converted to DeviceCMYK through a real CMYK ICC profile and
// wrapped in a minimal PDF/X-3:2003 container with an OutputIntent, the profile
// embedded as DestOutputProfile, and MediaBox / TrimBox / BleedBox set so the
// printer sees the 20 mm bottom bleed.
// --- CMYK output profile ----------------------------------------------------
// FOGRA39 (ISO Coated v2) is the European offset standard and the profile the
// rest of the NAS print material is set up for, so the roll-ups must use it too
// or #3BB6E8 will not match across the set. US Web Coated SWOP is kept only as a
// mockup-time stand-in — a --print build refuses it outright, because shipping a
// US profile to a Danish trykkeri is a silent, expensive colour shift.
const ICC_FOGRA39_CANDIDATES = [
  '/usr/share/texlive/texmf-dist/tex/generic/colorprofiles/FOGRA39L_coated.icc',
  path.join(repoRoot, 'brand/icc/FOGRA39L_coated.icc'),
  path.join(repoRoot, 'assets/icc/FOGRA39L_coated.icc'),
];
const ICC_FALLBACK_CANDIDATES = [
  'C:/WINDOWS/System32/spool/drivers/color/RSWOP.icm',
  'C:/Windows/System32/spool/drivers/color/RSWOP.icm',
  '/usr/share/color/icc/USWebCoatedSWOP.icc',
];

// Read the profile's own `desc` tag so the OutputIntent names what is actually
// embedded rather than a hard-coded string that can drift from the file.
function iccDescription(buf) {
  try {
    const n = buf.readUInt32BE(128);
    for (let i = 0; i < n; i++) {
      const o = 132 + i * 12;
      if (buf.toString('ascii', o, o + 4) !== 'desc') continue;
      const off = buf.readUInt32BE(o + 4);
      const type = buf.toString('ascii', off, off + 4);
      if (type === 'desc') {                       // ICC v2
        const len = buf.readUInt32BE(off + 8);
        return buf.toString('latin1', off + 12, off + 12 + len - 1).replace(/\0+$/, '').trim();
      }
      if (type === 'mluc') {                       // ICC v4 — UTF-16BE
        const len = buf.readUInt32BE(off + 20), rec = buf.readUInt32BE(off + 24);
        const be = buf.subarray(off + rec, off + rec + len);
        const le = Buffer.alloc(be.length);
        for (let k = 0; k + 1 < be.length; k += 2) { le[k] = be[k + 1]; le[k + 1] = be[k]; }
        return le.toString('utf16le').replace(/\0+$/, '').trim();
      }
    }
  } catch { /* fall through */ }
  return 'Unnamed CMYK profile';
}

// A file sitting at a FOGRA39 path is not proof that it IS one — someone can
// copy any .icc into place. Read the profile and check it really is a CMYK
// output profile whose own description names FOGRA / ISO Coated, so a
// mislabelled US profile cannot reach the trykkeri through the back door.
const FOGRA_NAME = /fogra|iso\s*coated/i;

async function loadProfile(p) {
  const buf = await fs.readFile(p);
  const space = buf.length > 24 ? buf.toString('ascii', 16, 20).trim() : '';
  return { buf, name: iccDescription(buf), space };
}

async function findCmykProfile() {
  for (const p of ICC_FOGRA39_CANDIDATES) {
    let prof;
    try { prof = await loadProfile(p); } catch { continue; }

    if (prof.space !== 'CMYK') {
      throw new Error(
        `${p}\n  is not a CMYK profile (its data colour space is "${prof.space}"). ` +
        `Replace it with a real FOGRA39L_coated.icc.`);
    }
    if (!FOGRA_NAME.test(prof.name)) {
      const msg =
        `The file at\n    ${p}\n  is named FOGRA39L_coated.icc but the profile inside describes ` +
        `itself as:\n    "${prof.name}"\n  That is not a FOGRA39 / ISO Coated profile. Refusing to ` +
        `use it — this is exactly the\n  silent US-profile substitution the FOGRA39 requirement exists to prevent.`;
      if (PRINT_MODE) throw new Error(msg);
      console.log(`  ⚠ ${msg}`);
      continue;
    }
    return { path: p, family: `FOGRA39 (${prof.name})`, isFogra: true, buf: prof.buf };
  }

  if (PRINT_MODE) {
    throw new Error(
      'No FOGRA39 CMYK profile found — refusing to build a print master without it.\n' +
      '  NAS print material (company profile, datasheets) is set up for FOGRA39 / ISO Coated v2.\n' +
      '  Falling back to US Web Coated SWOP would send a US colour profile to a Danish trykkeri\n' +
      '  and shift the brand cyan #3BB6E8, so this is a hard stop rather than a warning.\n' +
      '  Place FOGRA39L_coated.icc at one of:\n' +
      ICC_FOGRA39_CANDIDATES.map(p => '    ' + p).join('\n')
    );
  }

  for (const p of ICC_FALLBACK_CANDIDATES) {
    try {
      const prof = await loadProfile(p);
      if (prof.space !== 'CMYK') continue;
      return { path: p, family: 'SWOP — MOCKUP ONLY, not print-valid', isFogra: false, buf: prof.buf };
    } catch { /* next */ }
  }

  throw new Error(
    'No CMYK ICC profile found at all — a PDF/X master cannot be built without one.\n' +
    '  FOGRA39 (required for print):\n' + ICC_FOGRA39_CANDIDATES.map(p => '    ' + p).join('\n') +
    '\n  Mockup fallback:\n' + ICC_FALLBACK_CANDIDATES.map(p => '    ' + p).join('\n')
  );
}

function pdfDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `D:${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
         `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}` +
         `${sign}${p(Math.floor(Math.abs(off) / 60))}'${p(Math.abs(off) % 60)}'`;
}

async function writePdfXCmyk({ pngPath, outPath, title, widthMm, heightMm, trimBottomMm, dpi }) {
  const sharp = require('sharp');
  const profile = await findCmykProfile();
  const iccPath = profile.path;
  const icc = profile.buf;
  const iccName = iccDescription(icc);

  const { data: cmyk, info } = await sharp(pngPath)
    .withIccProfile(iccPath)
    .toColourspace('cmyk')
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 4) throw new Error(`CMYK conversion produced ${info.channels} channels, expected 4`);

  const MM2PT = 72 / 25.4;
  const pageW = +(widthMm * MM2PT).toFixed(4);
  const pageH = +(heightMm * MM2PT).toFixed(4);
  const trimY = +(trimBottomMm * MM2PT).toFixed(4);

  const imgZ = zlib.deflateSync(cmyk, { level: 6 });
  const iccZ = zlib.deflateSync(icc, { level: 9 });
  const content = Buffer.from(`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`, 'latin1');
  const contentZ = zlib.deflateSync(content, { level: 9 });

  const now = new Date();
  const docId = Buffer.from(`${title}|${info.width}x${info.height}|${now.toISOString()}`)
    .toString('hex').slice(0, 32).padEnd(32, '0');

  const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:pdfx="http://ns.adobe.com/pdfx/1.3/"
    xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title}</rdf:li></rdf:Alt></dc:title>
   <xmp:CreatorTool>brand/build_rollup.mjs</xmp:CreatorTool>
   <xmp:CreateDate>${now.toISOString()}</xmp:CreateDate>
   <xmp:ModifyDate>${now.toISOString()}</xmp:ModifyDate>
   <pdf:Trapped>False</pdf:Trapped>
   <pdfx:GTS_PDFXVersion>PDF/X-3:2003</pdfx:GTS_PDFXVersion>
   <pdfxid:GTS_PDFXVersion>PDF/X-3:2003</pdfxid:GTS_PDFXVersion>
  </rdf:Description>
 </rdf:RDF>
</x:xpacket>`.replace('</x:xpacket>', '</x:xmpmeta>\n<?xpacket end="w"?>');
  const xmpBuf = Buffer.from(xmp, 'utf8');

  // ---- assemble objects ----
  const chunks = [];
  const offsets = [0];
  let pos = 0;
  const push = (buf) => { chunks.push(buf); pos += buf.length; };
  const obj = (n, body, stream = null) => {
    offsets[n] = pos;
    push(Buffer.from(`${n} 0 obj\n${body}\n`, 'latin1'));
    if (stream) {
      push(Buffer.from('stream\n', 'latin1'));
      push(stream);
      push(Buffer.from('\nendstream\n', 'latin1'));
    }
    push(Buffer.from('endobj\n', 'latin1'));
  };

  push(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1'));

  obj(1, `<< /Type /Catalog /Pages 2 0 R /Metadata 8 0 R /OutputIntents [7 0 R] >>`);
  obj(2, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  obj(3,
    `<< /Type /Page /Parent 2 0 R ` +
    `/MediaBox [0 0 ${pageW} ${pageH}] ` +
    `/BleedBox [0 0 ${pageW} ${pageH}] ` +
    `/TrimBox [0 ${trimY} ${pageW} ${pageH}] ` +
    `/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
  obj(4, `<< /Length ${contentZ.length} /Filter /FlateDecode >>`, contentZ);
  obj(5,
    `<< /Type /XObject /Subtype /Image /Name /Im0 ` +
    `/Width ${info.width} /Height ${info.height} ` +
    `/ColorSpace /DeviceCMYK /BitsPerComponent 8 ` +
    `/Filter /FlateDecode /Length ${imgZ.length} >>`, imgZ);
  obj(6, `<< /N 4 /Filter /FlateDecode /Length ${iccZ.length} >>`, iccZ);
  const pdfStr = (s) => s.replace(/([\\()])/g, '\\$1');
  obj(7,
    `<< /Type /OutputIntent /S /GTS_PDFX ` +
    `/OutputConditionIdentifier (${pdfStr(iccName)}) ` +
    `/OutputCondition (${pdfStr(profile.family)}; profile embedded) ` +
    `/Info (${pdfStr(iccName)}) ` +
    `/RegistryName (http://www.color.org) ` +
    `/DestOutputProfile 6 0 R >>`);
  obj(8, `<< /Type /Metadata /Subtype /XML /Length ${xmpBuf.length} >>`, xmpBuf);
  obj(9,
    `<< /Title (${title}) /Creator (brand/build_rollup.mjs) /Producer (Nordic Advanced Systems) ` +
    `/CreationDate (${pdfDate(now)}) /ModDate (${pdfDate(now)}) ` +
    `/GTS_PDFXVersion (PDF/X-3:2003) /GTS_PDFXConformance (PDF/X-3:2003) /Trapped /False >>`);

  const xrefPos = pos;
  const N = 10;
  let xref = `xref\n0 ${N}\n0000000000 65535 f \n`;
  for (let i = 1; i < N; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${N} /Root 1 0 R /Info 9 0 R /ID [<${docId}> <${docId}>] >>\n` +
          `startxref\n${xrefPos}\n%%EOF\n`;
  push(Buffer.from(xref, 'latin1'));

  await fs.writeFile(outPath, Buffer.concat(chunks));
  const effDpi = Math.round(info.width / (widthMm / 25.4));
  return {
    iccPath, iccName, iccFamily: profile.family, isFogra: profile.isFogra,
    width: info.width, height: info.height, dpi: effDpi, requestedDpi: dpi,
  };
}


// --- RGB print master --------------------------------------------------------
// Deliberately a sibling of writePdfXCmyk rather than a refactor of it: the CMYK
// path is the one that will carry the trykkeri's own FOGRA39 profile later, and
// it is not worth destabilising for the sake of sharing a page skeleton. Same
// page geometry, same TrimBox/BleedBox, same 120 dpi raster — the ONLY
// difference is that the image stays DeviceRGB and no ICC profile is involved,
// so this path can never hard-stop on a missing file.
async function writePdfRgb({ pngPath, outPath, title, widthMm, heightMm, trimBottomMm, dpi }) {
  const sharp = require('sharp');
  const { data: rgb, info } = await sharp(pngPath).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error(`expected 3 RGB channels, got ${info.channels}`);

  const MM2PT = 72 / 25.4;
  const pageW = +(widthMm * MM2PT).toFixed(4);
  const pageH = +(heightMm * MM2PT).toFixed(4);
  const trimY = +(trimBottomMm * MM2PT).toFixed(4);

  const imgZ = zlib.deflateSync(rgb, { level: 6 });
  const content = Buffer.from(`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`, 'latin1');
  const contentZ = zlib.deflateSync(content, { level: 9 });

  const now = new Date();
  const docId = Buffer.from(`${title}|${info.width}x${info.height}|${now.toISOString()}`)
    .toString('hex').slice(0, 32).padEnd(32, '0');

  const chunks = [];
  const offsets = [0];
  let pos = 0;
  const push = (buf) => { chunks.push(buf); pos += buf.length; };
  const obj = (n, body, stream = null) => {
    offsets[n] = pos;
    push(Buffer.from(`${n} 0 obj\n${body}\n`, 'latin1'));
    if (stream) {
      push(Buffer.from('stream\n', 'latin1'));
      push(stream);
      push(Buffer.from('\nendstream\n', 'latin1'));
    }
    push(Buffer.from('endobj\n', 'latin1'));
  };

  push(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1'));
  obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
  obj(2, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  obj(3,
    `<< /Type /Page /Parent 2 0 R ` +
    `/MediaBox [0 0 ${pageW} ${pageH}] ` +
    `/BleedBox [0 0 ${pageW} ${pageH}] ` +
    `/TrimBox [0 ${trimY} ${pageW} ${pageH}] ` +
    `/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
  obj(4, `<< /Length ${contentZ.length} /Filter /FlateDecode >>`, contentZ);
  obj(5,
    `<< /Type /XObject /Subtype /Image /Name /Im0 ` +
    `/Width ${info.width} /Height ${info.height} ` +
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
    `/Filter /FlateDecode /Length ${imgZ.length} >>`, imgZ);
  obj(6,
    `<< /Title (${title}) /Creator (brand/build_rollup.mjs) /Producer (Nordic Advanced Systems) ` +
    `/CreationDate (${pdfDate(now)}) /ModDate (${pdfDate(now)}) /Trapped /False >>`);

  const xrefPos = pos;
  const N = 7;
  let xref = `xref\n0 ${N}\n0000000000 65535 f \n`;
  for (let i = 1; i < N; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  xref += `trailer\n<< /Size ${N} /Root 1 0 R /Info 6 0 R /ID [<${docId}> <${docId}>] >>\n` +
          `startxref\n${xrefPos}\n%%EOF\n`;
  push(Buffer.from(xref, 'latin1'));

  await fs.writeFile(outPath, Buffer.concat(chunks));
  return {
    colour: 'DeviceRGB (no ICC — trykkeri converts, as with the first roll-up)',
    width: info.width, height: info.height,
    dpi: Math.round(info.width / (widthMm / 25.4)), requestedDpi: dpi,
  };
}

// --- guide-artwork guard -----------------------------------------------------
// The dead-zone hatching, its label and the bleed strip are all drawn in reds
// over a marine field, and all of them live below the dead-zone line. In a clean
// print render that band is background only, where red never beats green — so
// any pixel with r > g down there is guide artwork that would be printed.
//
// This is now the assertion that matters: a mis-coloured banner is a bad print,
// but a banner with "188–200 CM · CASSETTE DEAD ZONE" across the bottom is a
// wasted one.
// Independent pixel-level backstop for the ink floor. The DOM check above can
// only see elements it knows to look at; this sees whatever actually rendered.
// Below the floor the sheet is background only, which never exceeds ~70
// luminance — anything brighter is content that would sit in the cassette.
// Scan upward from the bottom for the last row carrying ink. This is the number
// that matters for cassette clearance — an element's box bottom includes its
// padding and line leading, so it reads lower than the ink actually sits.
// --- guide exemption, by provenance -----------------------------------------
// The ink scans below run on rendered pixels, which carry no provenance of their
// own. Rather than teach the scans to recognise a guide — by colour, or by
// carving out its bounding box — the guides simply sit out the render the guard
// inspects: renderWithoutGuides() hides every `data-guide` element and reshoots.
//
// Carving out bounding boxes was tried and is WRONG: the dead-zone band is a
// full-bleed overlay spanning 1880–2020 mm across the whole sheet, so exempting
// its rect exempts the entire bottom of the banner — real artwork included. A
// colour test fails the same way the day a design element happens to be reddish.
// Hiding the guides leaves the scan looking at every pixel of the real artwork,
// full width, with nothing exempt. In a print build no guides are rendered at
// all, so the reshoot is skipped and the guard is unchanged.
async function renderWithoutGuides(page, selector, outPath) {
  const n = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-guide]')];
    els.forEach(el => { el.dataset.prevDisplay = el.style.display; el.style.display = 'none'; });
    return els.length;
  });
  if (!n) return null;                       // print mode — nothing to hide
  await (await page.$(selector)).screenshot({ path: outPath });
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[data-guide]')) {
      el.style.display = el.dataset.prevDisplay || '';
      delete el.dataset.prevDisplay;
    }
  });
  return n;
}

// Measure the gap between the spec grid's last descriptor and the top of the QR
// frame, off the RENDERED INK, the same way a ruler on the proof would.
//
// Element boxes cannot answer this: the descriptor's box includes its line
// leading, so a box-based gap reads several millimetres tighter than the one a
// person sees. With the section rule gone this single gap is the only thing
// holding the two blocks apart, which is why it is asserted rather than assumed.
// The frame is located by POSITION — the first ink band at or below the QR
// zone's top edge — so it stays found whatever the frame treatment becomes.
async function measureQrSection(pngPath, { canvasMm, specsTopMm, qrTopMm }) {
  const sharp = require('sharp');
  const meta = await sharp(pngPath).metadata();
  const pxPerMm = meta.height / canvasMm;
  const top = Math.round(specsTopMm * pxPerMm);
  const height = Math.min(meta.height - top, Math.round((canvasMm - specsTopMm) * pxPerMm));
  const { data, info } = await sharp(pngPath)
    .extract({ left: 0, top, width: meta.width, height })
    .resize({ width: 700, height, fit: 'fill' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const { width: W, height: H, channels: ch } = info;
  const MIN_PX = 4;
  const rowHasInk = (y) => {
    let n = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (l > 100 && ++n >= MIN_PX) return true;
    }
    return false;
  };
  const mmOf = (rows) => specsTopMm + rows * (canvasMm / meta.height);

  const bands = [];
  let s = -1;
  for (let y = 0; y < H; y++) {
    if (rowHasInk(y)) { if (s < 0) s = y; }
    else if (s >= 0) { bands.push([mmOf(s), mmOf(y - 1)]); s = -1; }
  }
  if (s >= 0) bands.push([mmOf(s), mmOf(H - 1)]);

  const cardIdx = bands.findIndex(b => b[0] >= qrTopMm - 2);
  if (cardIdx < 1) return { ok: false, bands: bands.length };
  const lastSpec = bands[cardIdx - 1], card = bands[cardIdx];
  return {
    ok: true,
    lastSpecMm: +lastSpec[1].toFixed(1),
    cardTopMm:  +card[0].toFixed(1),
    gapMm:      +(card[0] - lastSpec[1]).toFixed(1),
  };
}

async function findLowestInk(pngPath, { canvasMm }) {
  const sharp = require('sharp');
  const meta = await sharp(pngPath).metadata();
  const pxPerMm = meta.height / canvasMm;
  const band = Math.round(400 * pxPerMm);          // bottom 400 mm is plenty
  const top = meta.height - band;
  const { data, info } = await sharp(pngPath)
    .extract({ left: 0, top, width: meta.width, height: band })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let y = info.height - 1; y >= 0; y--) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] > 100) {
        return +((top + y) / pxPerMm).toFixed(1);
      }
    }
  }
  return null;
}

async function findInkBelow(pngPath, { canvasMm, fromMm }) {
  const sharp = require('sharp');
  const meta = await sharp(pngPath).metadata();
  const pxPerMm = meta.height / canvasMm;
  const top = Math.round(fromMm * pxPerMm);
  const { data, info } = await sharp(pngPath)
    .extract({ left: 0, top, width: meta.width, height: meta.height - top })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });

  let count = 0, firstRow = -1, brightest = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (l > brightest) brightest = l;
      if (l > 100) { count++; if (firstRow < 0) firstRow = y; }
    }
  }
  return {
    count, brightest: Math.round(brightest),
    firstMm: firstRow < 0 ? null : +(fromMm + firstRow / pxPerMm).toFixed(1),
  };
}

async function findGuideArtwork(pngPath, { canvasMm, fromMm }) {
  const sharp = require('sharp');
  const meta = await sharp(pngPath).metadata();
  const pxPerMm = meta.height / canvasMm;
  const top = Math.round(fromMm * pxPerMm);
  const { data, info } = await sharp(pngPath)
    .extract({ left: 0, top, width: meta.width, height: meta.height - top })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });

  let count = 0, firstRow = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i] > data[i + 1]) {
        count++;
        if (firstRow < 0) firstRow = y;
      }
    }
  }
  return {
    count, scanned: info.width * info.height,
    firstMm: firstRow < 0 ? null : +(fromMm + firstRow / pxPerMm).toFixed(1),
  };
}


async function buildDroneStackRollup() {
  const Z = DS_ZONES, C = DS_CANVAS, T = DS_TYPE;
  const contentW = C.contentW - 2 * C.margin;

  console.log('NAS ESC + Drone Stack roll-up — 85 × 200 cm @ 120 dpi');

  const qrSvg = await loadCyanQr({
    targetUrl: DS_COPY.qrUrl,
    cachePath: path.join(brandDir, 'rollup-dronestack-qr-cyan.svg'),
  });

  // Field-test strip: 690 mm across, 15 mm gutters, N equal frames.
  const FT = DS_FIELD_TEST;
  const frameMm = FT.imageMm;                                  // 400 mm
  const textColMm = contentW - FT.imageMm - FT.gutter;         // 690 − 400 − 20 = 270 mm
  console.log('  Field-test strip:');
  const frames = await buildFieldTestFrames({
    frameMm, aspect: FT.aspect, dpi: C.dpi, minDpi: FT.minDpi,
  });
  // a cutout measures its own aspect from the alpha box; a photo uses the config
  const frameAspect = frames[0].aspect ?? FT.aspect;

  const lockupSvg = await fs.readFile(path.join(repoRoot, LOCKUP_SVG), 'utf8');

  // Same size as the engine banner: scale 1 = the 550 × 114 mm ink box, centred
  // in the 140 mm logo zone (≈13 mm clear top and bottom).
  const LOCKUP_SCALE = 1.0;

  // Oversized mark watermark — same vector source as the lock-up above, drawn in
  // cyan and knocked back to DS_WATERMARK.opacity by the .wm layer.
  const markSvg = markOnlySvg(lockupSvg, '#3bb6e8');
  // Bands and mark positions are derived from the CURRENT zone map, so the
  // pattern followed the layout when the spec band collapsed and everything
  // below the claims moved down.
  const wm      = resolveWatermark(DS_WATERMARK, Z, C.totalH);
  const wmMask  = watermarkMaskGradient({ ...DS_WATERMARK, keep: wm.keep }, C.totalH);
  const wmMarks = wm.marks.map(m =>
    `<i style="left:${m.x}mm; top:${m.y}mm; width:${m.w}mm; height:${+(m.w * MARK_ASPECT).toFixed(2)}mm; transform:rotate(${m.rot}deg)">${markSvg}</i>`
  ).join('\n    ');
  console.log(`  Watermark: ${wm.marks.length} marks @ ${(DS_WATERMARK.opacity * 100).toFixed(1)}% · ` +
              `visible bands ${wm.keep.map(([a, b]) => `${a}–${b}`).join(', ')} mm (derived from the zone map)`);

  const zoneCss = (name) =>
    `.z-${name}{ position:absolute; left:0; right:0; top:${Z[name].top}mm; height:${Z[name].height}mm; }`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0A2530;                 /* marine */
    --accent:#3bb6e8;             /* cyan */
    --ink-0:#f3f7f8;
    --ink-sub:rgba(243,247,248,0.70);
    --ink-desc:rgba(243,247,248,0.55);
  }
  *,*::before,*::after{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; background:${PRINT_MODE ? '#0A2530' : '#2a2a2a'}; }
  body{ display:flex; justify-content:center; }

  .banner{
    position:relative;
    width:${C.contentW}mm;
    height:${C.totalH}mm;                       /* ${C.contentH} mm content + ${C.bleedBottom} mm bottom bleed */
    background:var(--bg);
    color:var(--ink-0);
    font-family:'Inter', system-ui, sans-serif;
    overflow:hidden; isolation:isolate;
  }

  /* --- oversized logo-mark watermark (see DS_WATERMARK) ----------------
     First child of .banner, so it paints on the flat marine fill and UNDER
     .accents / .scanlines / every content zone. */
  .wm{
    position:absolute; inset:0; overflow:hidden; pointer-events:none;
    opacity:${DS_WATERMARK.opacity};
    -webkit-mask-image:${wmMask}; mask-image:${wmMask};
  }
  .wm i{ position:absolute; display:block; }
  .wm i svg{ width:100%; height:100%; display:block; }

  /* --- hero-frame treatment, reused from the engine banner ------------- */
  .accents{
    position:absolute; inset:0;
    background:
      radial-gradient(900mm 520mm at 96% 6%, rgba(59,182,232,0.14), transparent 55%),
      radial-gradient(760mm 620mm at 2% 62%, rgba(16,82,97,0.45), transparent 62%);
  }
  .scanlines{
    position:absolute; inset:0; pointer-events:none; opacity:0.55;
    background-image:repeating-linear-gradient(to bottom,
      rgba(59,182,232,0.05) 0, rgba(59,182,232,0.05) 0.4mm,
      transparent 0.4mm, transparent 3mm);
  }

  /* --- HUD corner brackets + ticks, reused from the engine banner ------- */
  .c{ position:absolute; width:26mm; height:26mm; border:1mm solid var(--accent); opacity:0.9; }
  .c.tl{ top:0; left:0; border-right:0; border-bottom:0; }
  .c.tr{ top:0; right:0; border-left:0; border-bottom:0; }
  .c.bl{ bottom:0; left:0; border-right:0; border-top:0; }
  .c.br{ bottom:0; right:0; border-left:0; border-top:0; }
  .tick{ position:absolute; background:var(--accent); opacity:0.75; }
  .tick.t{ top:0; left:50%; width:0.9mm; height:9mm; transform:translateX(-50%); }
  .tick.b{ bottom:0; left:50%; width:0.9mm; height:9mm; transform:translateX(-50%); }
  .tick.l{ left:0; top:50%; height:0.9mm; width:9mm; transform:translateY(-50%); }
  .tick.r{ right:0; top:50%; height:0.9mm; width:9mm; transform:translateY(-50%); }

  /* --- zones ------------------------------------------------------------ */
  ${Object.keys(Z).map(zoneCss).join('\n  ')}
  .pad{ padding-left:${C.margin}mm; padding-right:${C.margin}mm; }

  /* 0–14 cm — logo lock-up: same treatment, size and centred position as the
     engine banner (cyan mark, white NAS, cyan subline) */
  .z-logo{ display:flex; align-items:center; justify-content:center; }
${logoLockupCss({ scale: LOCKUP_SCALE, marginBottom: 0 })}

  /* eyebrow, engine treatment: centred, cyan rules either side. The band hugs
     the eyebrow now — the lead-in space sits under the lock-up above it. */
  .z-eyebrow{ display:flex; align-items:center; justify-content:center; }
  .eyebrow{
    display:flex; align-items:center; gap:24mm;
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-size:20mm; font-weight:600; letter-spacing:0.28em;
    text-transform:uppercase; color:var(--accent); white-space:nowrap;
  }
  /* rules on BOTH sides — the engine banner's left-only rule suits its
     left-aligned block; on a centred one it makes the text read as shoved right */
  .eyebrow::before, .eyebrow::after{
    content:""; width:88mm; height:1.1mm; background:var(--accent); opacity:0.9;
  }

  /* 23–50 cm — headline, sentence case, line 2 cyan (engine mirror) */
  .z-head{ display:flex; flex-direction:column; justify-content:center; align-items:center; }
  .headline{
    margin:0; font-weight:800; line-height:1.03;
    letter-spacing:-0.018em; word-spacing:0.05em; text-align:center;
  }
  /* width:max-content so each line's box IS its text box — the fitter measures it */
  .headline span{ display:block; width:max-content; margin:0 auto; white-space:nowrap; }
  .headline .l1{ color:var(--ink-0); }
  .headline .l2{ color:var(--accent); }


  /* 60–76 cm — VARIANT BAND, centred */
  .z-variant{ display:flex; flex-direction:column; justify-content:center; align-items:center; }
  .variants{
    display:flex; align-items:baseline; justify-content:center;
    font-weight:800; line-height:1.0; letter-spacing:-0.01em;
    white-space:nowrap; color:var(--ink-0);
  }
  .variants .sep{ color:var(--accent); padding:0 0.30em; font-weight:700; }
  /* width:max-content so the element's box IS its text box. As a plain flex
     child its width was clamped to the container while the nowrap text spilled
     past it, so the fitter measured 690 mm and never saw the overflow. */
  .variant-note{
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-weight:500; letter-spacing:0.24em; text-transform:uppercase;
    color:var(--accent); white-space:nowrap; width:max-content; margin-top:14mm;
  }

  /* CLAIM LINE — one centred line, white, uppercase, cyan mid-dot between the
     two claims. Replaces three bracket HUD panels that held these same claims at
     1.48 cm, smaller than the spec values below them. */
  .z-claims{ display:flex; align-items:center; justify-content:center; }
  /* width:max-content so the element's box IS its text box — the fitter measures
     that against the content width. As a plain flex child it would be clamped to
     the container while the nowrap text spilled past it. */
  .claim-line{
    font-family:'Inter', system-ui, -apple-system, sans-serif;
    font-weight:800; line-height:${T.claimLeading};
    letter-spacing:-0.005em; text-transform:uppercase;
    color:var(--ink-0); white-space:nowrap; width:max-content; margin:0;
  }
  .claim-line .sep{ color:var(--accent); padding:0 0.38em; font-weight:700; }

  /* STATEMENT — two centred lines between a pair of full-width cyan rules.
     Deliberately NOT a bracket box: the field-test callout above it is already
     a bracketed panel. */
  .z-statement{ display:flex; flex-direction:column; justify-content:center; }
  .st-rule{ height:1.2mm; background:var(--accent); opacity:0.85; flex:0 0 auto; }
  .statement{
    font-family:'Inter', system-ui, -apple-system, sans-serif;
    font-weight:700; line-height:1.16; letter-spacing:-0.012em;
    color:var(--ink-0); text-align:center; margin:${DS_STATEMENT.padMm}mm 0;
  }
  /* width:max-content so each line's box IS its text box — that is what the
     fitter measures against the content width. */
  .statement span{ display:block; width:max-content; margin:0 auto; white-space:nowrap; }

  /* 86–124 cm — FIELD TEST STRIP: header + rule, four equal frames in one row,
     caption beneath. Header styling matches the spec-column headers exactly. */
  .z-field{ display:flex; flex-direction:column; justify-content:center; }
  .ft-head{
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-weight:600; letter-spacing:0.20em; text-transform:uppercase;
    color:var(--accent); white-space:nowrap; padding-bottom:8mm;
    /* Centred over the full-width rule beneath it. text-indent cancels the
       trailing letter-space: letter-spacing adds 0.20em AFTER the last glyph as
       well as between glyphs, so the text BOX is 0.20em wider than the visible
       ink. Centring the box alone would therefore sit the ink 0.10em left of
       true centre — around 2.5 mm at this size, visible against a rule that
       runs the full 690 mm. An indent equal to the letter-spacing shifts the
       line back by exactly that half, landing the ink on the real centre. */
    text-align:center; text-indent:0.20em;
  }
  /* 2 mm, scaled with the 1.1 → 1.8 cm header above it — a 1.2 mm hairline read
     as thin once the type grew. */
  .ft-rule{ height:2mm; background:var(--accent); opacity:0.85; margin-bottom:22mm; }
  /* image centred across the full content width, text beneath it */
  .ft-row{ display:flex; justify-content:center; width:100%; }
  .ft-frame{
    position:relative; flex:0 0 auto; width:${FT.imageMm}mm;
    aspect-ratio:${frameAspect};
  }
  .ft-frame img{ width:100%; height:100%; object-fit:cover; display:block; }
  /* No corner bracket on the image: marineGrade keys the studio sweep to the
     sheet colour, so the aircraft floats and a bracket would enclose empty
     background. The callout panel keeps the HUD language in this zone. */
  /* beneath the image: callout left, caption right, across the full width */
  .ft-foot{ display:flex; align-items:flex-start; gap:${FT.footGutter}mm; margin-top:26mm; }
  .ft-cap{
    flex:1 1 0; min-width:0;
    font-family:'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
    font-weight:400; line-height:1.42; color:var(--ink-sub);
  }
  /* callout panel — same treatment as the claim panels / engine telemetry cards */
  .ft-callout{
    position:relative; flex:0 0 auto; width:${FT.calloutMm}mm;
    padding:${DS_CALLOUT.padY}mm ${DS_CALLOUT.padX}mm;
    background:rgba(8,32,42,0.62); text-align:center;
  }
  /* one line each — asserted, not hoped for */
  .ft-callout .l1{ font-weight:700; line-height:1.08; color:var(--ink-0); white-space:nowrap; }
  .ft-callout .l2{
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-weight:500; letter-spacing:0.14em; color:var(--accent);
    line-height:1.2; margin-top:7mm; white-space:nowrap;
  }

  /* SPEC BAND — four cells as 2 × 2. No rule of its own: the statement block
     directly above ends on a full-width cyan rule, and a second rule 20 mm under
     it read as a doubled divider. That lower rule now serves both. */
  /* No padding-top: it existed to clear a hero-band HUD tick that is no longer
     above this band, and it was pushing the cyan rule a further 20 mm down into
     the gap under the caption. */
  .z-specs{ display:flex; flex-direction:column; justify-content:center; }
  /* justify-content:center centres the two fixed-width columns inside the
     690 mm content width, so the 540 mm block lands on the page centre and
     therefore over the QR card below it. Centring the BLOCK, not the text:
     cell text stays flush left (see .spec-cell) because these are data pairs. */
  .spec-row{
    display:grid; grid-template-columns:repeat(2, ${C.specColW}mm);
    column-gap:${C.specGutter}mm; row-gap:${C.specRowGap}mm; width:100%; flex:0 0 auto;
    justify-content:center;
  }
  .spec-cell{ min-width:0; display:flex; flex-direction:column; justify-content:flex-start; }
  /* Values never wrap — the build fails instead of breaking one across lines. */
  .spec-cell .val{ white-space:nowrap; overflow:hidden; display:block; }
  /* Descriptors may take a second line; with only four of them one long
     qualifier no longer drags the size down for a whole grid. */
  .spec-cell .desc{ display:block; overflow:hidden; }
  .spec-cell .val{ font-weight:700; color:var(--ink-0); line-height:1.12; }
  .spec-cell .desc{
    font-family:'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
    font-weight:400; color:var(--ink-desc); line-height:1.2; margin-top:6mm;
  }

  /* 166–188 cm — QR block: large, centred, cyan corner-bracket box, engine
     caption styling beneath */
  /* QR block — scaled up with the band. At 185 mm it was the smallest element in
     the lower third and read as an afterthought against a 2.7 cm spec band. 185 → 300 mm
     across two passes; the
     card and both caption lines grow together so the block keeps its proportions. */
  /* Back to a simple centred row — the section rule that needed a column to
     stretch across is gone. The card centres on 425 mm, directly under the
     spec grid's own 425 mm centre line. */
  .z-qr{ display:flex; align-items:center; justify-content:center; }
  .qr-block{ display:flex; flex-direction:column; align-items:center; gap:14mm; flex:0 0 auto; }
  /* Full rounded-rectangle frame, copied from the engine banner's .qr-card so
     the pair reads as one system. Replaces the four corner ticks this banner
     carried: at 4 m the tick version reads as an unfinished box next to a
     closed one, and that difference was louder than the size difference.
     box-sizing is border-box, so the stroke sits inside the ${DS_QR.cardMm} mm
     and the card's footprint — and therefore the layout below it — is
     unchanged. */
  .qr-card{
    position:relative; width:${DS_QR.cardMm}mm; height:${DS_QR.cardMm}mm; padding:${DS_QR.padMm}mm;
    background:var(--bg);
    border:${DS_QR.strokeMm}mm solid rgba(59,182,232,0.55); border-radius:${DS_QR.radiusMm}mm;
    box-shadow:0 0 0 0.3mm rgba(8,32,42,0.9), 0 0 38mm rgba(59,182,232,0.22);
    flex:0 0 auto;
  }
  .qr-card svg{ width:100%; height:100%; display:block; }
  .qr-text{ display:flex; flex-direction:column; align-items:center; gap:6mm; }
  .qr-text .scan{
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-size:8.5mm; font-weight:500; letter-spacing:0.2em; text-transform:uppercase; color:var(--accent);
  }
  .qr-text .url{
    font-family:'JetBrains Mono', ui-monospace, monospace;
    font-size:7.5mm; font-weight:400; letter-spacing:0.1em; color:var(--ink-sub);
  }

  ${PRINT_MODE ? '' : `
  /* ---- guides — mockup ONLY, stripped in --print ---- */
  .dead-marker{
    position:absolute; left:0; right:0; top:${C.deadZoneTop}mm; height:${C.totalH - C.deadZoneTop}mm;
    background:repeating-linear-gradient(45deg,
      rgba(255,90,90,0.16), rgba(255,90,90,0.16) 6mm,
      rgba(255,90,90,0.04) 6mm, rgba(255,90,90,0.04) 12mm);
    border-top:1px dashed rgba(255,90,90,0.50);
  }
  .dead-label{
    position:absolute; left:${C.margin}mm; top:${C.deadZoneTop + 10}mm;
    font-family:'JetBrains Mono', monospace; font-size:7mm; letter-spacing:0.2em;
    color:rgba(255,140,140,0.75); text-transform:uppercase;
  }
  .bleed-marker{
    position:absolute; left:0; right:0; top:${C.contentH}mm; height:${C.bleedBottom}mm;
    background:rgba(255,90,90,0.30);
  }
  `}
</style>
</head>
<body>
<div class="banner" id="banner">
  <div class="wm">${wmMarks}</div>
  <div class="accents"></div>
  <div class="scanlines"></div>

  <!-- 0–14 cm -->
  <div class="zone z-logo pad">${logoLockupHtml({ tone: 'brand', vectorSvg: lockupSvg })}</div>

  <!-- 14–23 cm -->
  <div class="zone z-eyebrow pad"><div class="eyebrow">${DS_COPY.eyebrow}</div></div>

  <!-- 23–50 cm -->
  <div class="zone z-head pad">
    <h1 class="headline">${DS_COPY.headline.map((l, i) => `<span class="l${i + 1}">${l}</span>`).join('')}</h1>
  </div>

  <!-- 60–76 cm — variant band -->
  <div class="zone z-variant pad">
    <div class="variants">${DS_VARIANTS.map((v, i) => (i ? '<span class="sep">·</span>' : '') + `<span class="rating">${v}</span>`).join('')}</div>
    <div class="variant-note">${DS_COPY.variantCaption}</div>
  </div>

  <!-- 76–87 cm — claim band: three HUD panels -->
  <div class="zone z-claims pad">
    <p class="claim-line">${DS_COPY.claimLine.join('<span class="sep">·</span>')}</p>
  </div>

  <!-- field test strip -->
  <div class="zone z-field pad">
    <div class="ft-head">${FT.header}</div>
    <div class="ft-rule"></div>
    <div class="ft-row">
      ${frames.map(f => `<div class="ft-frame">
        <img data-ft="${path.basename(f.file)}" src="${f.uri}" alt="${FT.header}" />
      </div>`).join('')}
    </div>
    <div class="ft-foot">
      <div class="ft-callout">
        <span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>
        <div class="l1">${FT.callout.l1}</div>
        <div class="l2">${FT.callout.l2}</div>
      </div>
      <div class="ft-cap">${FT.caption}</div>
    </div>
  </div>

  <!-- statement line — its own band between the caption and the spec rule -->
  <div class="zone z-statement pad">
    <div class="st-rule"></div>
    <p class="statement">${DS_COPY.statement.map(l => `<span>${l}</span>`).join('')}</p>
    <div class="st-rule"></div>
  </div>

  <!-- spec band — cyan rule, then one row of four -->
  <div class="zone z-specs pad">
    <div class="spec-row">
      ${DS_SPECS.map(c => `<div class="spec-cell">
        <div class="val"><span>${c.value}</span></div>
        <div class="desc"><span>${c.desc}</span></div>
      </div>`).join('')}
    </div>
  </div>

  <!-- 176–188 cm — QR -->
  <div class="zone z-qr pad">
    <div class="qr-block">
      <!-- No corner ticks: the frame is a closed rounded rectangle now, matching
           the engine banner. The .c brackets remain in use on the hero callout. -->
      <div class="qr-card" role="img" aria-label="QR code linking to the NAS Drone Stack page">
        ${qrSvg}
      </div>
      <div class="qr-text">
        <div class="scan">${DS_COPY.qrLabel}</div>
        <div class="url">${DS_COPY.qrText}</div>
      </div>
    </div>
  </div>

  <!-- 188–200 cm — DEAD ZONE, intentionally empty (roll-up cassette) -->
${PRINT_MODE ? '' : `  <div class="dead-marker" data-guide="dead-zone band"></div>
  <div class="dead-label" data-guide="dead-zone label">188–200 cm · cassette dead zone</div>
  <div class="bleed-marker" data-guide="bleed strip"></div>`}
</div>
</body>
</html>`;

  const tag = PRINT_MODE ? (RGB_PRINT ? 'print-rgb' : 'print') : 'mockup';
  const htmlOut = path.join(brandDir, `rollup-dronestack-${tag}.html`);
  await fs.writeFile(htmlOut, html);
  console.log(`Wrote ${path.relative(repoRoot, htmlOut).replace(/\\/g, '/')}`);

  // --- render at 120 dpi ----------------------------------------------------
  const DSF = C.dpi / 96;                                   // 1.25 → 120 dpi
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    // wide enough that the 850 mm banner is never clipped by the viewport
    viewport: { width: Math.round(C.contentW * 96 / 25.4) + 80, height: 1200 },
    deviceScaleFactor: DSF,
  });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const brokenImgs = await page.evaluate(() =>
    [...document.images].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.alt || '(no alt)'));
  if (brokenImgs.length) { await browser.close(); throw new Error('Broken images: ' + brokenImgs.join(', ')); }

  // --- fit + assert (runs against the live DOM, so the PDF sees the result) --
  const report = await page.evaluate(async ({ T, Z, C, contentW }) => {
    const PPM = 96 / 25.4;                 // CSS px per mm
    const mm = (px) => px / PPM;
    // Real cap height of the loaded webfont, not a guessed em ratio. The face
    // must be explicitly loaded first or canvas silently measures a fallback.
    const capRatio = async (fontShorthand) => {
      await document.fonts.load(fontShorthand, 'H');
      if (!document.fonts.check(fontShorthand, 'H')) {
        throw new Error(`webfont not available for "${fontShorthand}" — cap heights would be measured off a fallback face`);
      }
      const cx = document.createElement('canvas').getContext('2d');
      cx.font = fontShorthand;
      return cx.measureText('H').actualBoundingBoxAscent / 200;
    };
    const rInter800 = await capRatio('800 200px Inter');
    const rInter700 = await capRatio('700 200px Inter');
    const rMono     = await capRatio('500 200px "JetBrains Mono"');
    const rGrotesk  = await capRatio('400 200px "Space Grotesk"');
    const fsFor = (capCm, ratio) => (capCm * 10) / ratio;      // mm

    // shrink `set(sizeMm)` until `ok()` — 0.25 mm resolution
    const fitDown = (startMm, minMm, set, ok) => {
      let lo = minMm, hi = startMm;
      set(hi); if (ok()) return hi;
      for (let i = 0; i < 40 && hi - lo > 0.25; i++) {
        const midv = (lo + hi) / 2;
        set(midv);
        if (ok()) lo = midv; else hi = midv;
      }
      set(lo);
      return ok() ? lo : null;
    };

    const notes = [];

    // ---- headline: PINNED to the printed engine banner's type ---------------
    // Not fitted. The engine roll-up is already printed and stands beside this
    // one, so the headline takes its font size and leading verbatim (see
    // T.headlineFsMm) rather than growing to fill this banner's band. If that
    // no longer clears the 8 cm margins the build fails rather than quietly
    // shrinking back out of register with the sheet next to it.
    const head = document.querySelector('.headline');
    const headSpans = [...head.querySelectorAll('span')];
    const headMax = contentW * PPM;
    const headFs = T.headlineFsMm;
    const headLeading = T.headlineLeading;
    head.style.fontSize = headFs + 'mm';
    head.style.lineHeight = String(headLeading);
    const headOverflowMm = +mm(Math.max(0,
      ...headSpans.map(s => s.getBoundingClientRect().width - headMax))).toFixed(1);
    const headWidthMm = +mm(Math.max(...headSpans.map(s => s.getBoundingClientRect().width))).toFixed(1);
    const headBoxMm = +mm(head.getBoundingClientRect().height).toFixed(1);

    // ---- variant band: three ratings on ONE line inside the margins ----
    const variants = document.querySelector('.variants');
    // Caption is fitted BEFORE the ratings, because the ratings fit accounts for
    // the caption's height. It is nowrap and now carries the "all 4 outputs"
    // qualifier, so it needs a real width fit rather than a fixed size.
    const vNote = document.querySelector('.variant-note');
    const vNoteFs = fitDown(fsFor(T.variantCapNoteCm, rMono), fsFor(T.variantNoteCapMinCm, rMono),
      (s) => { vNote.style.fontSize = s + 'mm'; },
      () => vNote.getBoundingClientRect().width <= contentW * PPM + 0.5);
    const vZone = document.querySelector('.z-variant');
    const variantStart = fsFor(T.variantCapCm, rInter800);
    const variantMin   = fsFor(T.variantCapMinCm, rInter800);
    const variantFs = fitDown(variantStart, variantMin,
      (s) => { variants.style.fontSize = s + 'mm'; },
      () => {
        const w = variants.scrollWidth;
        const oneLine = variants.getBoundingClientRect().height <= s2LineGuard(variants);
        return w <= contentW * PPM + 0.5 && oneLine
          && (variants.getBoundingClientRect().height + vNote.getBoundingClientRect().height
              + 14 * PPM) <= Z.variant.height * PPM + 0.5;
      });
    function s2LineGuard(el) {
      // single line == height within 1.25× the font size (line-height is 1.0)
      return parseFloat(getComputedStyle(el).fontSize) * 1.25;
    }
    if (variantFs !== null && variantFs < variantStart - 0.3) {
      notes.push(`variant band reduced from ${(T.variantCapCm).toFixed(1)} cm cap ` +
                 `to ${(variantFs * rInter800 / 10).toFixed(2)} cm to keep the three ratings on one line`);
    }

    // ---- claim band: one HUD panel per claim; text wraps inside the panel, so
    //      fit ONE size that clears every panel's content box (all three must
    //      match — a per-panel fit would make them read as different ranks) ----
    // ---- claim line: one line, as large as clears the 8 cm side margins ----
    const claimEl = document.querySelector('.claim-line');
    const claimStart = fsFor(T.claimCapCm, rInter700);
    const claimMin   = fsFor(T.claimCapMinCm, rInter700);
    const claimFs = fitDown(claimStart, claimMin,
      (s) => { claimEl.style.fontSize = s + 'mm'; },
      () => claimEl.getBoundingClientRect().width <= contentW * PPM + 0.5);
    const claimWidthMm = +mm(claimEl.getBoundingClientRect().width).toFixed(1);
    const claimLines = Math.round(claimEl.getBoundingClientRect().height /
                                  (parseFloat(getComputedStyle(claimEl).fontSize) * T.claimLeading));
    if (claimFs !== null && claimFs < claimStart - 0.3) {
      notes.push(`claim line reduced from ${T.claimCapCm.toFixed(1)} cm cap to ` +
                 `${(claimFs * rInter700 / 10).toFixed(2)} cm — that is the largest that clears ` +
                 `the ${C.margin} mm side margins on one line`);
    }

    // ---- statement line: same rule, its own band under the drone ----
    const stEl = document.querySelector('.statement');
    const stSpans = [...stEl.querySelectorAll('span')];
    const stStart = fsFor(T.statementCapCm, rInter700);
    const stFs = fitDown(stStart, fsFor(T.statementCapMinCm, rInter700),
      (s) => { stEl.style.fontSize = s + 'mm'; },
      () => stSpans.every(sp => sp.getBoundingClientRect().width <= contentW * PPM + 0.5));
    const stWidthMm = +Math.max(...stSpans.map(sp => mm(sp.getBoundingClientRect().width))).toFixed(1);
    const stLines = stSpans.length;

    // ---- spec band: one uniform size per role, largest that fits every cell ----
    // No column headers any more; specHeadFs now only drives the field-test
    // strip header, which kept the same treatment.
    const specHeadFs = fsFor(T.specHeadCapCm, rMono);

    // ---- field-test strip: header keeps the old spec-header treatment ----
    const ftHead = document.querySelector('.ft-head');
    const ftHeadFs = fsFor(T.ftHeadCapCm, rMono);
    ftHead.style.fontSize = ftHeadFs + 'mm';
    // callout panel first — it is flex:0 0 auto, so it claims its width before
    // the caption is fitted into whatever remains on the row
    // Both callout lines are nowrap and must STAY on one line — fit each to the
    // panel's content width rather than letting it spill or break.
    const callL1 = document.querySelector('.ft-callout .l1');
    const callL2 = document.querySelector('.ft-callout .l2');
    const linesOf = (el, lh) =>
      Math.round(el.getBoundingClientRect().height / (parseFloat(getComputedStyle(el).fontSize) * lh));
    const fitCallout = (el, capCm, ratio) => fitDown(
      fsFor(capCm, ratio), fsFor(capCm * 0.55, ratio),
      (s) => { el.style.fontSize = s + 'mm'; },
      () => el.scrollWidth <= el.clientWidth + 0.5);
    const callL1Fs = fitCallout(callL1, T.calloutCapCm, rInter700);
    const callL2Fs = fitCallout(callL2, T.calloutSubCapCm, rMono);
    const calloutLines = [linesOf(callL1, 1.08), linesOf(callL2, 1.2)];
    const calloutOverflow = [callL1, callL2].map(el => +mm(el.scrollWidth - el.clientWidth).toFixed(1));

    const ftCap = document.querySelector('.ft-cap');
    const ftCapFs = fitDown(fsFor(T.ftCaptionCapCm, rGrotesk), fsFor(T.ftCaptionCapMinCm, rGrotesk),
      (s) => { ftCap.style.fontSize = s + 'mm'; },
      () => ftCap.scrollWidth <= ftCap.clientWidth + 0.5
            && linesOf(ftCap, 1.42) <= T.ftCaptionMaxLines);
    const ftCapLines = linesOf(ftCap, 1.42);

    const colPx = C.specColW * PPM;
    const vals  = [...document.querySelectorAll('.spec-cell .val')];
    const descs = [...document.querySelectorAll('.spec-cell .desc')];
    // values are nowrap → measure the inner span; descriptors wrap → check for
    // horizontal overflow and cap the line count instead
    const valFits = () => vals.every(v => v.firstElementChild.getBoundingClientRect().width <= colPx + 0.5);
    const descLines = (d) =>
      Math.round(d.getBoundingClientRect().height / (parseFloat(getComputedStyle(d).fontSize) * 1.2));
    const descFits = (maxLines) => () => descs.every(d =>
      d.scrollWidth <= d.clientWidth + 0.5 && descLines(d) <= maxLines);

    const specValFs = fitDown(fsFor(T.specValCapCm, rInter700), fsFor(T.specValCapMinCm, rInter700),
      (s) => vals.forEach(v => { v.style.fontSize = s + 'mm'; }), valFits);

    // Prefer ONE line: a descriptor that merely needs a hair less type should
    // shrink, not wrap. Only fall back to wrapping when a genuinely long string
    // could not fit a single line without breaking the cap-height floor.
    const applyDesc = (s) => descs.forEach(d => { d.style.fontSize = s + 'mm'; });
    const descTarget = fsFor(T.specDescCapCm, rGrotesk);
    const descFloor  = fsFor(T.specDescCapMinCm, rGrotesk);
    let specDescFs = fitDown(descTarget, descFloor, applyDesc, descFits(1));
    if (specDescFs === null) {
      specDescFs = fitDown(descTarget, descFloor, applyDesc, descFits(T.specDescMaxLines));
    }

    const overflow = [];
    for (const n of vals) {
      const w = n.firstElementChild.getBoundingClientRect().width;
      if (w > colPx + 0.5) {
        overflow.push({ text: n.textContent.trim(), widthMm: +mm(w).toFixed(1), colMm: +C.specColW.toFixed(1) });
      }
    }
    for (const n of descs) {
      if (n.scrollWidth > n.clientWidth + 0.5 || descLines(n) > T.specDescMaxLines) {
        overflow.push({ text: n.textContent.trim(), widthMm: +mm(n.scrollWidth).toFixed(1),
                        colMm: +C.specColW.toFixed(1), lines: descLines(n) });
      }
    }
    const specDescMaxLines = Math.max(...descs.map(descLines));

    // Grid BLOCK geometry. "Centred" is a statement about the box, not the ink:
    // cell text is flush left, so the ink starts a side-bearing inside the left
    // edge and stops wherever the longest value happens to end. The box is what
    // must sit on the page centre, because that is what the QR card below is
    // aligned to.
    const bannerBox = document.querySelector('.banner').getBoundingClientRect();
    const cellRects = [...document.querySelectorAll('.spec-cell')].map(c => c.getBoundingClientRect());
    const gridLeftMm  = +mm(Math.min(...cellRects.map(r => r.left))  - bannerBox.left).toFixed(1);
    const gridRightMm = +mm(Math.max(...cellRects.map(r => r.right)) - bannerBox.left).toFixed(1);
    // Values carry white-space:nowrap, so this reads 1 unless that rule is ever
    // dropped — the width check above is what catches an over-long value today.
    // Both are reported: the assertion should survive someone removing nowrap.
    const valLines = vals.map(v => ({
      text: v.textContent.trim(),
      lines: Math.round(v.getBoundingClientRect().height /
                        (parseFloat(getComputedStyle(v).fontSize) * 1.12)),
      widthMm: +mm(v.firstElementChild.getBoundingClientRect().width).toFixed(1),
    }));

    // ---- global assertions ----
    // (a) smallest type anywhere, in pt at print scale
    let minPt = Infinity, minPtEl = '';
    for (const el of document.querySelectorAll('.banner *')) {
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const pt = parseFloat(getComputedStyle(el).fontSize) * 0.75;   // 96 px/in → 72 pt/in
      if (pt < minPt) { minPt = pt; minPtEl = el.className || el.tagName; }
    }

    // (b) nothing rendered below the dead-zone line
    const bannerTop = document.querySelector('.banner').getBoundingClientRect().top;
    const floorPx = T.inkFloorMm * PPM;
    const below = [];
    let lowest = 0;
    for (const el of document.querySelectorAll('.zone, .zone *')) {
      const b = el.getBoundingClientRect().bottom - bannerTop;
      if (b > lowest) lowest = b;
      if (b > floorPx + 0.5) below.push({ el: el.className || el.tagName, bottomMm: +mm(b).toFixed(1) });
    }

    // (c) hero art resolution at rendered size
    // (b2) per-zone slack: zone height minus the union bbox of its content.
    //      Catches a band that has silently gone hollow and opened a gap.
    const zoneSlack = [...document.querySelectorAll('.zone')].map(z => {
      const zr = z.getBoundingClientRect();
      let top = Infinity, bot = -Infinity;
      for (const el of z.querySelectorAll('*')) {
        // full-bleed overlays are not content — they span the zone by definition
        if (el.closest('[data-overlay]')) continue;
        const r = el.getBoundingClientRect();
        if (r.height === 0 && r.width === 0) continue;
        if (r.top < top) top = r.top;
        if (r.bottom > bot) bot = r.bottom;
      }
      const used = bot > top ? bot - top : 0;
      return {
        zone: [...z.classList].find(c => c.startsWith('z-')) || '?',
        heightMm: +mm(zr.height).toFixed(1),
        usedMm:   +mm(used).toFixed(1),
        slackMm:  +mm(zr.height - used).toFixed(1),
      };
    });

    // (b3) NOTHING may cross the 8 cm side margins. A clamped flex box can hide
    //      a nowrap overflow from a per-element width fit, so this is checked
    //      globally against the rendered geometry rather than trusted per fitter.
    const bannerRect = document.querySelector('.banner').getBoundingClientRect();
    const marginPx = C.margin * PPM;
    const sideBleed = [];
    for (const el of document.querySelectorAll('.zone *')) {
      if (el.closest('[data-overlay]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const left = r.left - bannerRect.left;
      const right = bannerRect.right - r.right;
      if (left < marginPx - 0.5 || right < marginPx - 0.5) {
        sideBleed.push({
          el: (el.className || el.tagName).toString().slice(0, 40),
          text: (el.textContent || '').trim().slice(0, 46),
          leftMm: +mm(left).toFixed(1), rightMm: +mm(right).toFixed(1),
          widthMm: +mm(r.width).toFixed(1),
        });
      }
    }

    // (b4) mockup-only guide elements must not exist in a print build.
    // data-guide is the single marker: it drives BOTH this assertion and the
    // ink-floor guard's exemption list, so a guide is identified by what it
    // declares itself to be, never by how it looks. Add a guide element without
    // the attribute and the floor guard will fail on it — which is correct.
    const guideEls = document.querySelectorAll('[data-guide]').length;

    // (c) rendered size of each field-test frame, for the dpi assertion
    const ftFrames = [...document.querySelectorAll('[data-ft]')].map(i => ({
      file: i.dataset.ft,
      widthMm:  +mm(i.getBoundingClientRect().width).toFixed(2),
      heightMm: +mm(i.getBoundingClientRect().height).toFixed(2),
    }));
    const ftGutterMm = 0, ftTextColMm = 0, ftTopAlignMm = 0;   // layout no longer has a side column

    return {
      caps: { inter800: +rInter800.toFixed(4), inter700: +rInter700.toFixed(4),
              mono: +rMono.toFixed(4), grotesk: +rGrotesk.toFixed(4) },
      headline: { fsMm: headFs, capCm: +(headFs * rInter800 / 10).toFixed(2),
                  leading: headLeading, pitchMm: +(headLeading * headFs).toFixed(1),
                  widthMm: headWidthMm,
                  availMm: contentW, overflowMm: headOverflowMm, boxMm: headBoxMm },
      variantNote: { widthMm: +mm(vNote.getBoundingClientRect().width).toFixed(1), fsMm: vNoteFs, capCm: vNoteFs === null ? null : +(vNoteFs * rMono / 10).toFixed(2) },
      variant:  { fsMm: variantFs, capCm: variantFs === null ? null : +(variantFs * rInter800 / 10).toFixed(2),
                  widthMm: +mm(variants.scrollWidth).toFixed(1), availMm: contentW,
                  lines: Math.round(variants.getBoundingClientRect().height /
                         parseFloat(getComputedStyle(variants).fontSize)) },
      claims:   { fsMm: claimFs, capCm: claimFs === null ? null : +(claimFs * rInter700 / 10).toFixed(2),
                  lines: claimLines, widthMm: claimWidthMm, availMm: contentW },
      statement:{ fsMm: stFs, capCm: stFs === null ? null : +(stFs * rInter700 / 10).toFixed(2),
                  lines: stLines, widthMm: stWidthMm, availMm: contentW },
      spec:     { valFsMm: specValFs, valCapCm: specValFs === null ? null : +(specValFs * rInter700 / 10).toFixed(2),
                  descFsMm: specDescFs, descMaxLines: specDescMaxLines, descCapCm: specDescFs === null ? null : +(specDescFs * rGrotesk / 10).toFixed(2),
                  overflow, valLines, gridLeftMm, gridRightMm },
      ftHead:   { fsMm: ftHeadFs, capCm: +(ftHeadFs * rMono / 10).toFixed(2) },
      minPt: +minPt.toFixed(2), minPtEl,
      lowestCm: +(mm(lowest) / 10).toFixed(2), lowestMm: +mm(lowest).toFixed(1),
      below, zoneSlack, sideBleed, guideEls, calloutLines, calloutOverflow, ftCapLines, ftFrames, ftGutterMm, ftTextColMm, ftTopAlignMm, ftCapFs, notes,
    };
  }, { T, Z, C, contentW });

  // --- evaluate assertions --------------------------------------------------
  const fail = [];
  const warn = [];

  // The headline is pinned, not fitted, so the only way it can fail is by
  // outgrowing the margins — which must stop the build, not shrink the type.
  if (report.headline.overflowMm > 0.5) {
    fail.push(`headline at the pinned ${T.headlineCapCm} cm cap needs ` +
              `${report.headline.widthMm} mm — ${report.headline.overflowMm} mm past the ` +
              `${report.headline.availMm} mm between the ${C.margin} mm side margins`);
  }
  if (report.variant.fsMm === null || report.variant.lines !== 1 || report.variant.widthMm > contentW + 0.5) {
    fail.push(`variant band: ${DS_VARIANTS.join(' · ')} does not fit on one line ` +
              `(${report.variant.widthMm} mm of ${contentW} mm available, ${report.variant.lines} line(s))`);
  }
  if (report.variantNote.fsMm === null || report.variantNote.widthMm > contentW + 0.5) {
    fail.push(`variant caption "${DS_COPY.variantCaption}" renders ${report.variantNote.widthMm} mm ` +
              `wide — it must fit the ${contentW} mm between the ${C.margin} mm side margins ` +
              `(floor ${T.variantNoteCapMinCm} cm cap). It must never print clipped.`);
  }
  if (report.sideBleed.length) {
    fail.push(`content crossing the ${C.margin} mm side margins (would print clipped):\n` +
      report.sideBleed.map(b => `      .${b.el} — ${b.widthMm} mm wide, ` +
        `left margin ${b.leftMm} mm, right margin ${b.rightMm} mm` +
        (b.text ? `\n        "${b.text}"` : '')).join('\n'));
  }
  if (report.variant.capCm !== null && report.variant.capCm < T.variantCapMinCm) {
    fail.push(`variant band cap height ${report.variant.capCm} cm is below the ${T.variantCapMinCm} cm floor`);
  }
  if (report.claims.fsMm === null) {
    fail.push(`claim line could not be fitted on one line above the ${T.claimCapMinCm} cm cap floor ` +
              `— it needs ${report.claims.widthMm} mm of the ${report.claims.availMm} mm content width`);
  } else if (report.claims.lines !== 1) {
    fail.push(`claim line wrapped to ${report.claims.lines} lines — it must stay on one`);
  } else if (report.claims.widthMm > report.claims.availMm + 0.5) {
    fail.push(`claim line crosses the ${C.margin} mm side margins: ` +
              `${report.claims.widthMm} mm of ${report.claims.availMm} mm`);
  }
  if (report.statement.fsMm === null) {
    fail.push(`statement line could not be fitted on one line above the ${T.statementCapMinCm} cm cap floor ` +
              `— it needs ${report.statement.widthMm} mm of the ${report.statement.availMm} mm content width`);
  } else if (report.statement.lines !== DS_COPY.statement.length) {
    fail.push(`statement rendered ${report.statement.lines} lines, expected ${DS_COPY.statement.length}`);
  } else if (report.statement.widthMm > report.statement.availMm + 0.5) {
    fail.push(`statement line crosses the ${C.margin} mm side margins: ` +
              `${report.statement.widthMm} mm of ${report.statement.availMm} mm`);
  }
  // Size hierarchy: variant band > claim line > statement > spec value > descriptor.
  // Each of these is fitted independently against a different constraint, so an
  // inversion is entirely possible and would read as a mis-ranked page.
  const ladder = [
    ['variant band',   report.variant.capCm],
    ['claim line',     report.claims.capCm],
    ['statement line', report.statement.capCm],
    ['spec value',     report.spec.valCapCm],
    ['field-test eyebrow', report.ftHead.capCm],
    ['descriptor',     report.spec.descCapCm],
  ];
  for (let i = 1; i < ladder.length; i++) {
    const [anm, a] = ladder[i - 1], [bnm, b] = ladder[i];
    if (a !== null && b !== null && b >= a) {
      fail.push(`size hierarchy inverted: ${bnm} (${b} cm cap) is not smaller than ${anm} (${a} cm cap)`);
    }
  }
  if (report.spec.valFsMm === null || report.spec.valCapCm < T.specValCapMinCm) {
    fail.push(`spec band VALUE cap height ${report.spec.valCapCm} cm is below the ` +
              `${T.specValCapMinCm} cm minimum — shorten a value or widen the cells`);
  }
  // The 540 mm block must sit on the page centre: the QR card below it is
  // centred there, and a grid that is merely NEAR the centre reads as a
  // misalignment rather than as a choice. Checked on the box, not the ink —
  // cell text is flush left by design.
  {
    const centreMm = (report.spec.gridLeftMm + report.spec.gridRightMm) / 2;
    if (Math.abs(centreMm - C.contentW / 2) > 0.5) {
      fail.push(`spec grid block is not centred: spans ${report.spec.gridLeftMm}–` +
                `${report.spec.gridRightMm} mm, centre ${centreMm.toFixed(1)} mm, ` +
                `page centre ${(C.contentW / 2).toFixed(1)} mm`);
    }
  }
  // A spec value must never break across lines: these are the four numbers the
  // banner exists to show at 3 m, and a wrapped one reads as two facts.
  if (report.spec.valLines && report.spec.valLines.some(v => v.lines > 1)) {
    fail.push('spec band VALUE wrapped — values must stay on one line:\n' +
      report.spec.valLines.filter(v => v.lines > 1)
        .map(v => `      "${v.text}" took ${v.lines} lines in a ${C.specColW.toFixed(1)} mm cell`)
        .join('\n'));
  }
  if (report.spec.overflow.length) {
    fail.push('spec band cell overflow:\n' + report.spec.overflow
      .map(o => `      "${o.text}" needs ${o.widthMm} mm in a ${o.colMm} mm column` +
                (o.lines ? ` (${o.lines} lines, max ${T.specDescMaxLines})` : '')).join('\n'));
  }
  if (report.minPt < T.minPt) {
    fail.push(`smallest type is ${report.minPt} pt (".${report.minPtEl}") — the floor is ${T.minPt} pt at print scale`);
  }
  const overflowing = report.zoneSlack.filter(z => z.slackMm < 0);
  if (overflowing.length) {
    fail.push('zone(s) whose content overflows the band:\n' +
      overflowing.map(z => `      .${z.zone} — ${z.usedMm} mm of content in a ${z.heightMm} mm band ` +
                           `(${-z.slackMm} mm over)`).join('\n'));
  }
  const slackBudget = (zoneClass) => {
    const key = zoneClass.replace('z-', '');
    return Z[key]?.maxSlack ?? T.maxZoneSlackMm;
  };
  const hollow = report.zoneSlack.filter(z => z.slackMm > slackBudget(z.zone));
  if (hollow.length) {
    fail.push('zone(s) carrying more than their empty-space budget:\n' +
      hollow.map(z => `      .${z.zone} — ${z.slackMm} mm slack, budget ${slackBudget(z.zone)} mm ` +
                      `(${z.usedMm} mm of content in a ${z.heightMm} mm band)`).join('\n'));
  }
  if (report.below.length) {
    fail.push(`content rendered below the ${T.inkFloorMm} mm ink floor ` +
      `(${C.deadZoneTop - T.inkFloorMm} mm of cassette safety margin):\n` +
      report.below.map(b => `      .${b.el} reaches ${b.bottomMm} mm`).join('\n'));
  }
  // Field-test strip: the four frames must be equal, gutters must be 15 mm, and
  // each frame's real detail must still clear 150 dpi at its RENDERED width
  // (buildFieldTestFrames already checked this against the computed width; this
  // re-checks against what actually laid out).
  if (report.ftFrames.length !== FT.frames.length) {
    fail.push(`field-test strip rendered ${report.ftFrames.length} frames, expected ${FT.frames.length}`);
  }
  const [l1Lines, l2Lines] = report.calloutLines;
  if (l1Lines !== 1 || l2Lines !== 1) {
    fail.push(`callout must be one line each — "${FT.callout.l1}" rendered ${l1Lines} line(s), ` +
              `"${FT.callout.l2}" rendered ${l2Lines}`);
  }
  if (report.calloutOverflow.some(o => o > 0.5)) {
    fail.push(`callout text overflows its ${FT.calloutMm} mm panel by ` +
              `${report.calloutOverflow.map(o => o.toFixed(1)).join(' / ')} mm`);
  }
  if (report.ftCapLines > T.ftCaptionMaxLines) {
    fail.push(`field-test caption wraps to ${report.ftCapLines} lines (max ${T.ftCaptionMaxLines})`);
  }
  for (let i = 0; i < report.ftFrames.length; i++) {
    const r = report.ftFrames[i], src = frames[i];
    const dpi = Math.round(src.cropSrcW / (r.widthMm / 25.4));
    if (dpi < FT.minDpi) {
      fail.push(`field-test frame ${r.file} renders at ${dpi} dpi (${r.widthMm} mm wide) — ` +
                `below the ${FT.minDpi} dpi minimum`);
    }
    const gotAspect = r.widthMm / r.heightMm;
    if (Math.abs(gotAspect - frameAspect) > 0.02) {
      fail.push(`field-test frame ${r.file} laid out at aspect ${gotAspect.toFixed(3)}, ` +
                `expected ${frameAspect.toFixed(3)}`);
    }
  }

  // --- report ---------------------------------------------------------------
  console.log('\n  layout report');
  console.log(`    measured cap ratios      Inter800 ${report.caps.inter800} · Inter700 ${report.caps.inter700} · Mono ${report.caps.mono}`);
  console.log(`    headline                 ${report.headline.fsMm.toFixed(1)} mm → ${report.headline.capCm} cm cap ` +
              `(PINNED to the engine banner) · leading ${report.headline.leading} → ` +
              `${report.headline.pitchMm} mm line pitch`);
  console.log(`      width                  ${report.headline.widthMm}/${report.headline.availMm} mm`);
  console.log(`    variant band             ${report.variant.fsMm?.toFixed(1)} mm → ${report.variant.capCm} cm cap · ` +
              `${report.variant.widthMm}/${contentW} mm · ${report.variant.lines} line`);
  console.log(`    claim line               ${report.claims.fsMm?.toFixed(1)} mm → ${report.claims.capCm} cm cap · ` +
              `${report.claims.widthMm}/${report.claims.availMm} mm · ${report.claims.lines} line`);
  console.log(`    statement line           ${report.statement.fsMm?.toFixed(1)} mm → ${report.statement.capCm} cm cap · ` +
              `${report.statement.widthMm}/${report.statement.availMm} mm · ${report.statement.lines} line`);
  console.log(`    field-test strip         ${report.ftFrames.length} frames · ` +
              `${report.ftFrames[0]?.widthMm} × ${report.ftFrames[0]?.heightMm} mm · ` +
              `callout ${FT.calloutMm} mm + caption beneath · ` +
              `${report.ftFrames.map((r, i) => Math.round(frames[i].cropSrcW / (r.widthMm / 25.4))).join('/')} dpi`);
  console.log(`    variant caption          ${report.variantNote.fsMm?.toFixed(1)} mm → ${report.variantNote.capCm} cm cap`);
  console.log(`    spec band                2 × 2 · cells ${C.specColW.toFixed(1)} mm · ${C.specGutter} mm gutter, ${C.specRowGap} mm row gap`);
  console.log(`      value / descriptor     ${report.spec.valCapCm} cm / ${report.spec.descCapCm} cm cap ` +
              `(target ${T.specValCapCm} / ${T.specDescCapCm} cm) · descriptors up to ${report.spec.descMaxLines} line(s)`);
  console.log(`      widest value           ` +
    (() => { const w = [...report.spec.valLines].sort((a, b) => b.widthMm - a.widthMm)[0];
             return `"${w.text}" ${w.widthMm} mm of ${C.specColW.toFixed(1)} mm`; })());
  console.log(`      block                  ${report.spec.gridLeftMm}–${report.spec.gridRightMm} mm ` +
              `(${(report.spec.gridRightMm - report.spec.gridLeftMm).toFixed(1)} mm wide) · ` +
              `centre ${((report.spec.gridLeftMm + report.spec.gridRightMm) / 2).toFixed(1)} mm ` +
              `of ${(C.contentW / 2).toFixed(1)} mm`);
  console.log(`    smallest type            ${report.minPt} pt (floor ${T.minPt} pt)`);
  console.log(`    lowest content           ${report.lowestMm} mm`);
  console.log(`    zone slack (max ${T.maxZoneSlackMm} mm)   ` +
    report.zoneSlack.map(z => `${z.zone.replace('z-', '')} ${z.slackMm}`).join(' · ') + ' mm');
  console.log(`    zone content             ` +
    report.zoneSlack.map(z => `${z.zone.replace('z-', '')} ${z.usedMm}/${z.heightMm}`).join(' · ') + ' mm');
  for (const n of report.notes) console.log(`    note: ${n}`);
  for (const w of warn) console.log(`    WARN: ${w}`);

  if (fail.length) {
    await browser.close();
    throw new Error('Build assertions failed:\n  - ' + fail.join('\n  - '));
  }

  // --- rasterise ------------------------------------------------------------
  const el = await page.$('.banner');
  const masterPng = path.join(brandDir, `rollup-dronestack-${tag}.png`);
  await el.screenshot({ path: masterPng });

  // Guide-free reshoot for the ink-floor guard. The master keeps its guides (a
  // mockup is meant to show them); the guard gets a sheet with only real
  // artwork on it, so every pixel below the floor is judged, full width.
  const floorPng = path.join(brandDir, `rollup-dronestack-${tag}-floorscan.png`);
  const hidden = await renderWithoutGuides(page, '.banner', floorPng);
  const floorScanPng = hidden ? floorPng : masterPng;
  await browser.close();

  const sharp = require('sharp');
  const meta = await sharp(masterPng).metadata();
  const expectW = Math.round(C.contentW / 25.4 * C.dpi);
  const expectH = Math.round(C.totalH / 25.4 * C.dpi);
  if (Math.abs(meta.width - expectW) > 2 || Math.abs(meta.height - expectH) > 2) {
    throw new Error(`render is ${meta.width}×${meta.height} px, expected ${expectW}×${expectH} px at ${C.dpi} dpi`);
  }
  console.log(`\n  master render            ${meta.width}×${meta.height} px @ ${C.dpi} dpi ` +
              `(${(( await fs.stat(masterPng)).size / 1048576).toFixed(1)} MB)`);

  // --- lead-in check: the eyebrow must belong to the headline, not the logo ---
  const lead = await measureLeadIn(masterPng, { canvasMm: C.totalH, scanToMm: 600 });
  if (!lead.ok) throw new Error(`lead-in check: expected 3 ink bands in the top block, found ${lead.bands}`);
  console.log(`  lead-in                  logo→eyebrow ${lead.aboveMm} mm (${lead.abovePct}%) · ` +
              `eyebrow→headline ${lead.belowMm} mm (${lead.belowPct}%) · ratio ${lead.ratio}:1 ` +
              `(min ${T.leadInMinRatio}:1)`);
  console.log(`    ink bands (mm)         lockup ${lead.bandsMm[0].join('–')} · ` +
              `eyebrow ${lead.bandsMm[1].join('–')} · headline ${lead.bandsMm[2].join('–')}`);
  if (lead.ratio < T.leadInMinRatio) {
    throw new Error(
      `Lead-in ratio is ${lead.ratio}:1 — the eyebrow is sitting closer to the logo lock-up than ` +
      `to the headline.\n  The eyebrow introduces the headline; it is not part of the lock-up, so the ` +
      `gap above it\n  must be at least ${T.leadInMinRatio}× the gap below it.\n` +
      `    logo → eyebrow      ${lead.aboveMm} mm (${lead.abovePct}% of canvas)\n` +
      `    eyebrow → headline  ${lead.belowMm} mm (${lead.belowPct}% of canvas)\n` +
      `  Targets: ~${(T.leadInAbovePct * 100).toFixed(1)}% above, ~${(T.leadInBelowPct * 100).toFixed(1)}% below. ` +
      `Take the space from the headline zone (DS_ZONES.head).`);
  }

  // --- ink-floor guard ------------------------------------------------------
  // Runs on the guide-free reshoot (see renderWithoutGuides). Nothing is exempt
  // by position or by colour — a guide is absent from this render because it
  // declared itself a guide; everything still visible here is real artwork.
  const inkBelow = await findInkBelow(floorScanPng, { canvasMm: C.totalH, fromMm: T.inkFloorMm });
  const lowestInkMm = await findLowestInk(floorScanPng, { canvasMm: C.totalH });
  console.log(`  ink floor                lowest ink ${lowestInkMm} mm (lowest element box ${report.lowestMm} mm) · ` +
              `floor ${T.inkFloorMm} mm · ${(C.deadZoneTop - lowestInkMm).toFixed(1)} mm clear of the ` +
              `${C.deadZoneTop} mm cassette line`);
  console.log(`    scanned                ${hidden ? `guide-free reshoot (${hidden} data-guide element(s) hidden)` : 'the master render (no guides in a print build)'}` +
              ` · full width, nothing exempt`);
  if (inkBelow.count > 0) {
    throw new Error(
      `Ink found below the ${T.inkFloorMm} mm floor — it risks being covered by the cassette.\n` +
      `    ${inkBelow.count} pixel(s), first at ${inkBelow.firstMm} mm, brightest ${inkBelow.brightest}/255.\n` +
      `  This was measured with every data-guide element hidden, so it is real artwork,\n` +
      `  not a mockup guide. Move it above ${T.inkFloorMm} mm — do not tag artwork as a guide.`);
  }
  // --- QR card clearance ----------------------------------------------------
  const qrSec = await measureQrSection(floorScanPng, {
    canvasMm: C.totalH, specsTopMm: Z.specs.top, qrTopMm: Z.qr.top,
  });
  if (!qrSec.ok) {
    throw new Error('QR card: could not find its top edge and the spec ink above it');
  }
  console.log(`  QR card                  spec descriptor ${qrSec.lastSpecMm} mm → frame top ` +
              `${qrSec.cardTopMm} mm · gap ${qrSec.gapMm} mm ` +
              `(target ${DS_QR.gapAboveMm}, min ${DS_QR.gapAboveMinMm})`);
  if (qrSec.gapMm < DS_QR.gapAboveMinMm) {
    throw new Error(
      `The QR frame sits ${qrSec.gapMm} mm below the spec grid's last descriptor, under the\n` +
      `  ${DS_QR.gapAboveMinMm} mm minimum. With no section rule between them this gap is the only thing\n` +
      `  separating the two blocks — closer and the frame reads as part of the grid.`);
  }
  if (lowestInkMm > T.lowestInkMaxMm) {
    throw new Error(
      `Lowest ink is ${lowestInkMm} mm — it must sit at or above ${T.lowestInkMaxMm} mm.\n` +
      `  The upper block is pinned to the printed engine banner, so the height it pushes\n` +
      `  down cannot be taken back from the top. Recover the extra ${(lowestInkMm - T.lowestInkMaxMm).toFixed(1)} mm from the\n` +
      `  four gaps named in DS_ZONES, or from the QR band's own height.`);
  }

  // Scratch only — kept on failure so the offending render can be inspected.
  if (hidden) await fs.rm(floorPng, { force: true });

  // --- guide-artwork guard --------------------------------------------------
  // Runs on the actual render, for every mode, before anything is written.
  const guides = await findGuideArtwork(masterPng, { canvasMm: C.totalH, fromMm: C.deadZoneTop });
  const guideEls = report.guideEls;
  if (PRINT_MODE) {
    if (guides.count > 0 || guideEls > 0) {
      throw new Error(
        `Guide artwork found in a PRINT render — this would be printed on the banner.\n` +
        `    ${guides.count} guide pixel(s) below ${C.deadZoneTop / 10} cm ` +
        `(first at ${guides.firstMm} cm from top), ${guideEls} guide element(s) in the DOM.\n` +
        `  Expected: no dead-zone hatching, no cassette label, no bleed strip.`);
    }
    console.log(`  guide check              clean — 0 guide pixels in ${guides.scanned.toLocaleString()} ` +
                `scanned below ${C.deadZoneTop / 10} cm, 0 guide elements`);
  } else {
    console.log(`  guide check              ${guides.count.toLocaleString()} guide pixels below ` +
                `${C.deadZoneTop / 10} cm (expected in a mockup)`);
  }

  // --- print PDF ------------------------------------------------------------
  // RGB is this job's route; the CMYK/PDX-X path is untouched and waits on the
  // trykkeri's own FOGRA39 profile.
  const pdfOut = path.join(brandDir,
    RGB_PRINT
      ? (PRINT_MODE ? 'rollup-dronestack-print-rgb.pdf' : 'rollup-dronestack-proof-rgb.pdf')
      : (PRINT_MODE ? 'rollup-dronestack-print-pdfx-cmyk.pdf' : 'rollup-dronestack-proof-pdfx.pdf'));
  const writePdf = RGB_PRINT ? writePdfRgb : writePdfXCmyk;
  const pdfInfo = await writePdf({
    pngPath: masterPng,
    outPath: pdfOut,
    title: 'NAS Drone Stack roll-up 85x200cm',
    widthMm: C.contentW,
    heightMm: C.totalH,
    trimBottomMm: C.bleedBottom,
    dpi: C.dpi,
  });
  const pdfStat = await fs.stat(pdfOut);

  // --- 1200 px-tall JPEG proof ---------------------------------------------
  const proofOut = path.join(brandDir, 'rollup-dronestack-proof.jpg');
  await sharp(masterPng).resize({ height: 1200, fit: 'inside' }).jpeg({ quality: 88 }).toFile(proofOut);
  const proofStat = await fs.stat(proofOut);
  const proofMeta = await sharp(proofOut).metadata();

  const rel = (p) => path.relative(repoRoot, p).replace(/\\/g, '/');
  console.log(`\n✓ NAS ESC + Drone Stack roll-up built`);
  if (RGB_PRINT) {
    console.log(`  ${PRINT_MODE ? '➜ SEND THIS FILE' : 'RGB proof'} ` +
                `(PDF 1.4, DeviceRGB, ${pdfInfo.dpi} dpi, ${C.contentW} × ${C.totalH} mm ` +
                `incl. ${C.bleedBottom} mm bottom bleed)`);
    console.log(`    ${rel(pdfOut)}  (${(pdfStat.size / 1048576).toFixed(1)} MB)`);
    console.log(`    colour:           ${pdfInfo.colour}`);
  } else {
    console.log(`  ${pdfInfo.isFogra ? 'print master' : 'PDF/X proof — NOT print-valid'} ` +
                `(PDF/X-3:2003, DeviceCMYK, ${pdfInfo.dpi} dpi, ${C.bleedBottom} mm bottom bleed)`);
    console.log(`    ${rel(pdfOut)}  (${(pdfStat.size / 1048576).toFixed(1)} MB)`);
    console.log(`    colour profile:   ${pdfInfo.iccFamily}`);
    console.log(`      embedded ICC:   ${pdfInfo.iccName}`);
    console.log(`      loaded from:    ${pdfInfo.iccPath}`);
    if (!pdfInfo.isFogra) {
      console.log('      ⚠ NOT FOGRA39 — this PDF is a mockup only. Rerun with --print for a');
      console.log('        print-valid master; --print refuses to build without FOGRA39.');
    }
  }
  console.log(`  on-screen proof`);
  console.log(`    ${rel(proofOut)}  (${proofMeta.width}×${proofMeta.height} px · ${(proofStat.size / 1024).toFixed(0)} KB)`);
  console.log(`  master render`);
  console.log(`    ${rel(masterPng)}`);
  if (!PRINT_MODE) {
    console.log('  (mockup: dead-zone hatching + bleed strip drawn — rerun with --print-rgb to strip them)');
  }
}


// ===========================================================================
//  Dispatch
// ===========================================================================
switch (VARIANT) {
  case 'engine':
    await buildEngineRollup();
    break;
  case 'dronestack':
  case 'drone-stack':
    await buildDroneStackRollup();
    break;
  default:
    throw new Error(`Unknown --variant=${VARIANT}. Use "engine" or "dronestack".`);
}
