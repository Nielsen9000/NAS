// NAS roll-up banner — trade-show eye-catcher with a "technical cockpit" feel.
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
//   1. Large NAS logo (NAS_LOGO_branded.png — cyan mark + white NAS + cyan
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
import { fileURLToPath } from 'node:url';
import { chromium } from '../.screenshots/node_modules/playwright/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = __dirname;
const repoRoot = path.resolve(__dirname, '..');

const PRINT_MODE = process.argv.includes('--print');
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

// Downscale a (transparent) PNG to a max width, preserving alpha — used to
// shrink the logo for the lightweight screen PDF.
async function toScaledPngDataUri(filePath, maxWidth) {
  const srcUri = await dataUri(filePath, 'image/png');
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await page.setContent('<!doctype html><canvas id="c"></canvas>');
  const png = await page.evaluate(async ({ uri, mw }) => {
    const img = new Image();
    img.src = uri;
    await img.decode();
    const w = Math.min(mw, img.width);
    const h = Math.round(img.height * w / img.width);
    const c = document.getElementById('c');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/png');
  }, { uri: srcUri, mw: maxWidth });
  await browser.close();
  return png;
}

// --- Step 1: cyan / transparent QR vector SVG ------------------------------
// Cyan modules on a transparent background (no white quiet-zone rect — the dark
// QR card behind it supplies a uniform quiet zone for scanners).
async function generateCyanQrSvg() {
  console.log('Generating local cyan QR SVG…');
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
  }, { url: URL_TARGET, dark: QR_MODULE });

  await browser.close();
  await fs.writeFile(QR_CYAN_PATH, svg);
  console.log(`Wrote ${QR_CYAN_PATH}`);
  return svg;
}

async function loadCyanQr() {
  try {
    const s = await fs.readFile(QR_CYAN_PATH, 'utf8');
    console.log('Reusing cached cyan QR SVG at brand/rollup-qr-cyan.svg');
    return s;
  } catch { /* fall through */ }
  try {
    const base = await fs.readFile(QR_DARK_PATH, 'utf8');
    const cyan = base
      .replace(/<rect width="100%" height="100%" fill="#ffffff"\/>\s*/i, '')
      .replace(/fill="#08202a"/g, `fill="${QR_MODULE}"`);
    await fs.writeFile(QR_CYAN_PATH, cyan);
    console.log('Derived cyan QR SVG from cached brand/rollup-qr.svg (offline)');
    return cyan;
  } catch { /* fall through */ }
  return generateCyanQrSvg();
}

const qrSvg = await loadCyanQr(); // inlined into the DOM so it stays vector in the PDF

// --- Step 2: load raster assets --------------------------------------------
// Front-page hero frame (mountain/cloud still from the hero video) — full bg.
// Embedded as JPEG (q0.82): it's an opaque photo, so this cuts the PDF/PNG size
// dramatically with no visible loss at banner viewing distance.
const heroDataUri = await toJpegDataUri(path.join(repoRoot, 'assets/hero-frame.png'), 0.82);
// Bare boxer engine — the hero visual, centred under the headline. Transparent PNG.
const engineRealDataUri = await dataUri(path.join(repoRoot, 'assets/nas_engine_transparent.png'), 'image/png');
// NAS branded lock-up (cyan mark + white NAS + cyan subtitle). Transparent PNG —
// used only for the "NAS" wordmark crop now.
const logoDataUri = await dataUri(path.join(repoRoot, 'assets/NAS_LOGO_branded.png'), 'image/png');
// Standalone cyan mark (clean dedicated asset) — used for the lockup mark.
const markDataUri = await dataUri(path.join(repoRoot, 'assets/nas-mark-cyan.png'), 'image/png');

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

  /* logo lock-up: horizontal — [mark]  NAS / NORDIC ADVANCED SYSTEMS.
     The mark and "NAS" are cropped from the same baked PNG (each shown via a
     positioned background), so they position independently; the subtitle is
     sharp live text under "NAS", left-aligned to it. Extra margin-bottom opens
     a comfortable gap before the eyebrow. */
  .logo-lockup{ display:flex; flex-direction:row; align-items:center; justify-content:center; gap:34mm; margin-bottom:120mm; }
  /* mark — dedicated standalone cyan asset, trimmed of its transparent padding
     so the box matches the NAS + subtitle block height (ink box 51,143–1111,1111
     of a 1200×1286 image). */
  .mark{
    flex:0 0 auto; width:134mm; height:122mm;
    background-image:url('${markDataUri}'); background-repeat:no-repeat;
    background-size:151.1mm 161.9mm; background-position:-6.4mm -18mm;
  }
  .lock-right{ display:flex; flex-direction:column; align-items:flex-start; gap:9mm; }
  /* "NAS" wordmark only — source cols 506–1469 × rows 328–570 */
  .wordmark-nas{
    width:382mm; height:97mm;
    background-image:url('${logoDataUri}'); background-repeat:no-repeat;
    background-size:605.5mm 403.7mm; background-position:-199.5mm -129.3mm;
  }
  /* sharp vector subtitle, left-aligned under "NAS", width tuned to match it */
  .subtitle{
    font-family:'Arial Narrow','Helvetica Neue',Arial,sans-serif;
    font-weight:700; font-size:16mm; letter-spacing:24px; line-height:1;
    white-space:nowrap;
  }
  .subtitle .w{ color:#ffffff; }
  .subtitle .a{ color:var(--accent); }

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
      <div class="logo-lockup" role="img" aria-label="Nordic Advanced Systems">
        <div class="mark"></div>
        <div class="lock-right">
          <div class="wordmark-nas"></div>
          <div class="subtitle"><span class="w">NORDIC </span><span class="a">ADVANCED</span><span class="w"> SYSTEMS</span></div>
        </div>
      </div>
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
// bake 30+ MP raster layers into the PDF, so we drop them here; the logo is
// downsampled; the photo background is already JPEG. Text and the QR stay
// vector (sharp). Bleed indicator stripped.
const screenLogoUri = await toScaledPngDataUri(path.join(repoRoot, 'assets/NAS_LOGO_branded.png'), 1100);
const screenHtml = html
  .split(logoDataUri).join(screenLogoUri)        // smaller logo
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

await browser.close();

const relPng = path.relative(repoRoot, pngOut).replace(/\\/g, '/');
const relSmall = path.relative(repoRoot, smallOut).replace(/\\/g, '/');
console.log(`✓ Banner mockup generated: ${relPng} (${EXPECT_W}×${EXPECT_H} px)`);
console.log(`  rendered box: ${Math.round(box.width)}×${Math.round(box.height)} px · PNG ${(stat.size/1024).toFixed(0)} KB · PDF ${(pdfStat.size/1024).toFixed(0)} KB`);
console.log(`  flattened JPEG: ${path.relative(repoRoot, jpgOut).replace(/\\/g, '/')} (${(jpgStat.size/1024).toFixed(0)} KB · fast to open, print-ready for roll-up)`);
console.log(`  lightweight preview: ${relSmall} (${SMALL_W}px wide · ${(smallStat.size/1024).toFixed(0)} KB)`);
console.log(`  screen PDF: ${path.relative(repoRoot, screenPdfOut).replace(/\\/g, '/')} (${(screenStat.size/1024).toFixed(0)} KB · vector text, fast to open)`);
if (PRINT_MODE) console.log('  (--print: bleed indicator stripped, ready for printer prepress)');
