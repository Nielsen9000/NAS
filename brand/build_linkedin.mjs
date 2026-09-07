// NAS LinkedIn company-page assets — generated from our own brand assets only
// (own NAS mark/lockup SVG + CSS/SVG-drawn graphics). No third-party imagery → copyright-clean.
// Mirrors brand/build_business_card.mjs: inline HTML → Playwright Chromium → element screenshot at exact px.
//
//   node brand/build_linkedin.mjs
//
// Outputs (in brand/):
//   linkedin-logo-mark.png        300×300  company logo — NAS mark on navy   (+ @2x)
//   linkedin-logo-lockup.png      300×300  company logo — full NAS lockup    (+ @2x)
//   linkedin-banner.png          1128×191  cover — "three divisions" concept (+ @2x)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../.screenshots/node_modules/playwright/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = __dirname;
const repoRoot = path.resolve(__dirname, '..');

// ---- brand tokens (identical to the business cards) ----
const NAVY = '#08202a';
const CYAN = '#3bb6e8';
const INK = '#ffffff';
const INK2 = 'rgba(255,255,255,0.60)';

// ---- copy ----
const EYEBROW = 'NORDIC ADVANCED SYSTEMS';
const CLAIM_1 = 'Battle-proven';
const CLAIM_2 = 'defence technology';
const SITE = 'nordicadvancedsystems.com';
const DIVISIONS = [
  { idx: '01', icon: 'electronics', l1: 'ELECTRONICS', l2: '' },
  { idx: '02', icon: 'propulsion', l1: 'PROPULSION', l2: '' },
  { idx: '03', icon: 'gyro', l1: 'FIBER-OPTIC', l2: 'GYRO' },
];

// ---- hand-drawn division line-icons (own work, currentColor) ----
const ICONS = {
  // IC / chip with pins
  electronics: `<svg viewBox="0 0 32 32" class="dico"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
    <rect x="9" y="9" width="14" height="14" rx="1.5"/>
    <rect x="13.5" y="13.5" width="5" height="5" rx="0.6"/>
    <path d="M13 9V5M19 9V5M13 27v-4M19 27v-4M9 13H5M9 19H5M27 13h-4M27 19h-4"/>
  </g></svg>`,
  // propeller / rotary propulsion
  propulsion: `<svg viewBox="0 0 32 32" class="dico"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="16" cy="16" r="2.4"/>
    <path d="M16 13.6C16 8 17.5 4 20 4c2 0 3 2 1.6 4.2C20 11 16 13.6 16 13.6Z"/>
    <path d="M18 17.4c4.8 2.8 8.8 2.6 9.8.4 .9-1.9-.7-3.6-3.4-3.2-3.3.5-6.4 2.8-6.4 2.8Z"/>
    <path d="M14 17.4c-4.8 2.8-8.8 2.6-9.8.4-.9-1.9.7-3.6 3.4-3.2 3.3.5 6.4 2.8 6.4 2.8Z"/>
  </g></svg>`,
  // fiber-optic gyro: coil of loops
  gyro: `<svg viewBox="0 0 32 32" class="dico"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
    <ellipse cx="16" cy="16" rx="11" ry="6.4"/>
    <ellipse cx="16" cy="16" rx="6.6" ry="3.6"/>
    <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>
    <path d="M27 16c0 1.4-1 2.7-2.7 3.8"/>
  </g></svg>`,
};

// shared atmosphere layers (grid + glow + topo) — same recipe as the card backs
function atmosphere() {
  return `
    <div class="grid"></div>
    <div class="glow"></div>
    <div class="topo"></div>`;
}

const ATMO_CSS = `
  .grid{ position:absolute; inset:0; z-index:0;
    background-image:linear-gradient(${CYAN} .6px, transparent .6px), linear-gradient(90deg, ${CYAN} .6px, transparent .6px);
    background-size:26px 26px; opacity:.07;
    -webkit-mask-image:radial-gradient(120% 140% at 70% 0%, #000 35%, transparent 80%);
            mask-image:radial-gradient(120% 140% at 70% 0%, #000 35%, transparent 80%); }
  .glow{ position:absolute; inset:0; z-index:0;
    background:radial-gradient(70% 160% at 100% 0%, rgba(59,182,232,.20), transparent 60%); }
  .topo{ position:absolute; right:-120px; top:50%; transform:translateY(-50%); width:520px; height:520px; z-index:0;
    background:repeating-radial-gradient(circle at 50% 50%, transparent 0 22px, rgba(59,182,232,.13) 22px 23px);
    -webkit-mask-image:radial-gradient(50% 50% at 50% 50%, #000 45%, transparent 78%);
            mask-image:radial-gradient(50% 50% at 50% 50%, #000 45%, transparent 78%); }`;

function head(extra = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; background:#fff; }
  .stage{ position:relative; background:${NAVY}; color:${INK};
    font-family:'Inter',system-ui,sans-serif; overflow:hidden; isolation:isolate; }
  ${ATMO_CSS}
  ${extra}
</style></head><body>`;
}

// --------------------------------------------------------------------------
// LinkedIn cover. Two very different slots:
//   'personal' → personal-profile background = 1584×396 (4:1)  ← Simon's profile etc.
//   'company'  → company-page cover          = 1200×200 (6:1, → 4200×700 on upload)
// The profile photo / page logo overlaps the bottom-LEFT, so content sits right of it.
function bannerHtml(opts = {}) {
  const personal = (opts.format || 'personal') === 'personal';
  const fill = opts.fill || 'none';
  const cols = DIVISIONS.map((d, i) => `
    <div class="dcol">
      <div class="didx">${d.idx}</div>
      <div class="dicon">${ICONS[d.icon]}</div>
      <div class="dlabel">${d.l1}${d.l2 ? `<br>${d.l2}` : ''}</div>
    </div>
    ${i < DIVISIONS.length - 1 ? '<div class="dsep"></div>' : ''}`).join('');

  // per-format geometry
  // personal (4:1): photo bottom-left → content centred in the RIGHT area, prominent drones.
  // company  (6:1): no photo → SPREAD across full width (drones left · divisions · claim right).
  const C = personal
    ? { w: 1584, h: 396, eyebrow: 14, claim: 42, drGap: 46, col: 124, ico: 40, dlab: 12.5, didx: 11, dsep: 80,
        heroL: 470, heroR: 90, gap: 26,
        uav: { h: 660, top: -70, left: -36, m1: 30, m2: 62, op: 0.72 } }
    : { w: 1200, h: 200, eyebrow: 10, claim: 27, tag: 10, drGap: 30, col: 92, ico: 29, dlab: 9.5, didx: 9, dsep: 54,
        divLeft: 406, vrule: 812, vruleH: 112, claimR: 64,
        formation: { zoneW: 408, fade: 80, op: 0.6,
          lead: { w: 240, left: -16, top: 2 }, second: { w: 146, left: 126, top: 64 } } };

  // Left fill = UAVs, BACKGROUND TEXTURE only. personal: full formation image (tall enough);
  // company: two pre-cropped drones placed side-by-side (6:1 is too short for the vertical stack).
  let fillLayer = '', fillCss = '';
  if (fill === 'uav') {
    fillCss = `
  .uav{ position:absolute; left:${C.uav.left}px; top:${C.uav.top}px; height:${C.uav.h}px; z-index:1; opacity:${C.uav.op};
    filter:brightness(1.14) saturate(.92);
    -webkit-mask-image:linear-gradient(96deg, #000 ${C.uav.m1}%, transparent ${C.uav.m2}%), linear-gradient(#000, transparent 96%);
            mask-image:linear-gradient(96deg, #000 ${C.uav.m1}%, transparent ${C.uav.m2}%), linear-gradient(#000, transparent 96%);
    -webkit-mask-composite:source-in; mask-composite:intersect; }
  .uav img{ height:100%; width:auto; display:block; }`;
    fillLayer = `<div class="uav"><img src="${opts.uavUri}" alt=""></div>`;
  } else if (fill === 'formation') {
    const F = C.formation;
    fillCss = `
  .formation{ position:absolute; left:0; top:0; width:${F.zoneW}px; height:${C.h}px; z-index:1; opacity:${F.op};
    filter:brightness(1.14) saturate(.92);
    -webkit-mask-image:linear-gradient(90deg, #000 ${F.fade}%, transparent);
            mask-image:linear-gradient(90deg, #000 ${F.fade}%, transparent); }
  .formation img{ position:absolute; display:block; }
  .formation .lead{ width:${F.lead.w}px; left:${F.lead.left}px; top:${F.lead.top}px; }
  .formation .second{ width:${F.second.w}px; left:${F.second.left}px; top:${F.second.top}px; }`;
    fillLayer = `<div class="formation"><img class="lead" src="${opts.drones.lead}" alt=""><img class="second" src="${opts.drones.second}" alt=""></div>`;
  }

  const sharedCss = `
  .stage{ width:${C.w}px; height:${C.h}px; }
  .edge{ position:absolute; left:0; top:0; bottom:0; width:${personal ? 6 : 5}px; background:${CYAN}; z-index:4; }
  .dcol{ display:flex; flex-direction:column; align-items:center; gap:${personal ? 10 : 8}px; width:${C.col}px; }
  .didx{ font-family:'JetBrains Mono',monospace; font-size:${C.didx}px; letter-spacing:.2em; color:${CYAN}; opacity:.85; }
  .dicon{ color:${CYAN}; width:${C.ico}px; height:${C.ico}px; }
  .dico{ width:100%; height:100%; display:block; }
  .dlabel{ font-family:'JetBrains Mono',monospace; font-size:${C.dlab}px; line-height:1.35; letter-spacing:.16em; color:#fff; text-align:center; }
  .dsep{ width:1px; height:${C.dsep}px; align-self:center; background:linear-gradient(transparent, rgba(59,182,232,.34), transparent); }
  .eyebrow{ font-family:'JetBrains Mono',monospace; font-size:${C.eyebrow}px; letter-spacing:.33em; color:${CYAN}; font-weight:500; white-space:nowrap; }
  .claim{ font-weight:800; font-size:${C.claim}px; line-height:1.05; letter-spacing:-.01em; color:#fff; }
  .claim .c2{ color:${CYAN}; }`;

  const layoutCss = personal ? `
  /* centred in the area right of the bottom-left photo */
  .hero{ position:absolute; left:${C.heroL}px; right:${C.heroR}px; top:0; bottom:0; z-index:3;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:${C.gap}px; }
  .hero .claim{ text-align:center; }
  .divrow{ display:flex; align-items:flex-start; gap:${C.drGap}px; }` : `
  /* spread across the full width */
  .divs{ position:absolute; left:${C.divLeft}px; top:50%; transform:translateY(-50%); z-index:3;
    display:flex; align-items:flex-start; gap:${C.drGap}px; }
  .vrule{ position:absolute; left:${C.vrule}px; top:50%; transform:translateY(-50%); width:1px; height:${C.vruleH}px; z-index:3;
    background:linear-gradient(transparent, rgba(59,182,232,.30), transparent); }
  .brand{ position:absolute; right:${C.claimR}px; top:50%; transform:translateY(-50%); z-index:3; text-align:right; }
  .brand .claim{ margin-top:10px; white-space:nowrap; }
  .tag{ margin-top:10px; font-family:'JetBrains Mono',monospace; font-size:${C.tag}px; letter-spacing:.22em; color:${INK2}; white-space:nowrap; }`;

  const body = personal ? `
    <div class="hero">
      <div class="eyebrow">${EYEBROW}</div>
      <div class="claim">${CLAIM_1}<br><span class="c2">${CLAIM_2}</span></div>
      <div class="divrow">${cols}</div>
    </div>` : `
    <div class="divs">${cols}</div>
    <div class="vrule"></div>
    <div class="brand">
      <div class="eyebrow">${EYEBROW}</div>
      <div class="claim">${CLAIM_1}<br><span class="c2">${CLAIM_2}</span></div>
      <div class="tag">${SITE}</div>
    </div>`;

  return head(fillCss + sharedCss + layoutCss) + `
  <div class="stage">
    ${atmosphere()}
    ${fillLayer}
    <div class="edge"></div>
    ${body}
  </div></body></html>`;
}

// Text-only company avatar (no symbol): official "NAS" + wordmark on a
// contrasting fill so it never blends into the navy banner.
function textLogoHtml(textLogoSvg, bg, wm = null) {
  // wm = { svg, opacity, width, top, left } optional background watermark of the mark
  const wmLayer = wm ? `<div class="wm">${wm.svg}</div>` : '';
  const wmCss = wm ? `
  .wm{ position:absolute; width:${wm.width}px; opacity:${wm.opacity}; z-index:1;
    top:${wm.top}; left:${wm.left}; transform:translate(-50%,-50%); }
  .wm svg{ width:100%; height:auto; display:block; }` : '';
  return head(`
  .stage{ width:300px; height:300px; display:flex; align-items:center; justify-content:center; background:${bg}; }
  .tl{ position:relative; z-index:3; width:236px; }
  .tl svg{ width:100%; height:auto; display:block; }
  ${wmCss}
  `) + `
  <div class="stage">
    ${wmLayer}
    <div class="tl">${textLogoSvg}</div>
  </div></body></html>`;
}

// LinkedIn-style header preview: banner + round avatar overlaid bottom-left.
function previewHtml(bannerUri, avatarUri) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  *{ box-sizing:border-box; margin:0; padding:0; }
  body{ background:#eef3f8; }
  .wrap{ position:relative; width:1584px; height:560px; background:#fff; overflow:hidden; }
  .bn{ display:block; width:1584px; height:396px; }
  .av{ position:absolute; left:84px; top:248px; width:272px; height:272px; border-radius:50%;
    border:5px solid #fff; box-shadow:0 2px 14px rgba(0,0,0,.18); overflow:hidden; background:#fff; }
  .av img{ width:100%; height:100%; display:block; }
  .meta{ position:absolute; left:84px; top:534px; font-family:'Inter',system-ui,sans-serif; }
  .nm{ font-size:30px; font-weight:800; color:#0a2530; letter-spacing:-.01em; }
  .sb{ font-size:16px; color:#5c6b73; margin-top:5px; }
  /* mobile side-crop reference (personal banners crop less than company) */
  .crop{ position:absolute; top:0; height:396px; z-index:5;
    background:repeating-linear-gradient(45deg, rgba(255,80,80,.13) 0 6px, rgba(255,80,80,.03) 6px 12px); }
  .crop.l{ left:0; width:130px; border-right:1px dashed rgba(255,90,90,.5); }
  .crop.r{ right:0; width:130px; border-left:1px dashed rgba(255,90,90,.5); }
</style></head><body>
  <div class="wrap">
    <img class="bn" src="${bannerUri}">
    <div class="crop l"></div><div class="crop r"></div>
    <div class="av"><img src="${avatarUri}"></div>
    <div class="meta">
      <div class="nm">Simon Nielsen</div>
      <div class="sb">Webdesigner · Nordic Advanced Systems</div>
    </div>
  </div></body></html>`;
}

// --------------------------------------------------------------------------
async function shoot(page, html, sel, file, scale) {
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const el = await page.$(sel);
  await el.screenshot({ path: file });
  console.log(`✓ ${path.basename(file)} (${scale}x)`);
}

async function render() {
  // Clean v10 mark (extracted from the official lockup) — NOT the noisy potrace assets/nas-mark-*.svg
  const markCyan = await fs.readFile(path.join(repoRoot, 'assets/nas-mark-v10-cyan.svg'), 'utf8');
  const lockup = await fs.readFile(path.join(repoRoot, 'LOGER/v10/nas-logo-dark-transparent-v10.svg'), 'utf8');

  // Build the text-only lockup (NAS letters + wordmark, NO symbol) from the official file.
  // Lockup groups in order: [0]=mark, [1]=NAS letters (#FFFFFF), [2]=wordmark (#3BB6E8).
  const groups = lockup.match(/<g fill="[^"]*">[\s\S]*?<\/g>/g);
  const nasGroup = groups[1].replace(/fill="#FFFFFF"/i, `fill="${NAVY}"`);
  const wordGroup = groups[2].replace(/fill="#3BB6E8"/i, `fill="${NAVY}"`);
  // bbox of NAS+wordmark within the 3498×873 lockup, with padding
  const textLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1025 55 2432 763">${nasGroup}${wordGroup}</svg>`;

  // mark watermark sitting behind the avatar text
  const markNavy = markCyan.replace(/#3BB6E8/gi, NAVY);
  const wmOnCyan = { svg: markNavy, opacity: 0.10, width: 300, top: '46%', left: '50%' };   // tone-on-tone darker
  const wmOnWhite = { svg: markCyan, opacity: 0.14, width: 300, top: '46%', left: '50%' };  // cyan ghost

  const asDataUri = async (rel) =>
    `data:image/png;base64,${(await fs.readFile(path.join(repoRoot, rel))).toString('base64')}`;
  const uavUri = await asDataUri('assets/uav_formation_dark.png');

  // Logos/avatars → 300×300 (1x) + 600×600 (@2x). cyan = primary, white = alt.
  const logoJobs = [
    { html: textLogoHtml(textLogo, CYAN, wmOnCyan), base: 'linkedin-logo-text-cyan-wm' },
    { html: textLogoHtml(textLogo, '#ffffff', wmOnWhite), base: 'linkedin-logo-text-white-wm' },
  ];

  const browser = await chromium.launch();

  // Crop the lead + 2nd drone out of the formation image — the 6:1 company cover is too
  // short for the vertical stack, so we place the two drones side-by-side instead.
  // Flood-fill from a seed so each cutout is ONE connected drone (no stray fragments).
  const cropPage = await (await browser.newContext()).newPage();
  await cropPage.setContent('<canvas></canvas>');
  const cropComponent = (seedX, seedY) => cropPage.evaluate(({ src, seedX, seedY }) => new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const W = img.width, H = img.height;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
      const a = cx.getImageData(0, 0, W, H).data;
      const TH = 40, al = (i) => a[i * 4 + 3];
      let seed = -1;                                   // snap seed to nearest opaque pixel
      for (let r = 0; r < 500 && seed < 0; r += 4)
        for (let dy = -r; dy <= r && seed < 0; dy += 4)
          for (let dx = -r; dx <= r; dx += 4) {
            const x = seedX + dx, y = seedY + dy;
            if (x >= 0 && x < W && y >= 0 && y < H && al(y * W + x) > TH) { seed = y * W + x; break; }
          }
      const seen = new Uint8Array(W * H), stack = new Int32Array(W * H); let sp = 0;
      stack[sp++] = seed; seen[seed] = 1;
      let minx = W, maxx = 0, miny = H, maxy = 0; const comp = [];
      while (sp) {
        const p = stack[--sp], x = p % W, y = (p / W) | 0; comp.push(p);
        if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
        if (x > 0 && !seen[p - 1] && al(p - 1) > TH) { seen[p - 1] = 1; stack[sp++] = p - 1; }
        if (x < W - 1 && !seen[p + 1] && al(p + 1) > TH) { seen[p + 1] = 1; stack[sp++] = p + 1; }
        if (y > 0 && !seen[p - W] && al(p - W) > TH) { seen[p - W] = 1; stack[sp++] = p - W; }
        if (y < H - 1 && !seen[p + W] && al(p + W) > TH) { seen[p + W] = 1; stack[sp++] = p + W; }
      }
      const cw = maxx - minx + 1, ch = maxy - miny + 1;
      const out = document.createElement('canvas'); out.width = cw; out.height = ch;
      const ox = out.getContext('2d'), od = ox.createImageData(cw, ch);
      for (let i = 0; i < comp.length; i++) {
        const p = comp[i], x = p % W, y = (p / W) | 0;
        const di = ((y - miny) * cw + (x - minx)) * 4, si = p * 4;
        od.data[di] = a[si]; od.data[di + 1] = a[si + 1]; od.data[di + 2] = a[si + 2]; od.data[di + 3] = a[si + 3];
      }
      ox.putImageData(od, 0, 0); res(out.toDataURL('image/png'));
    };
    img.src = src;
  }), { src: uavUri, seedX, seedY });
  const drones = { lead: await cropComponent(320, 700), second: await cropComponent(1040, 1030) };
  await cropPage.context().close();

  // Covers → two slots. personal = 1584×396 (4:1) @ DSF 1; company = 4200×700 (6:1) @ DSF 3.5.
  const coverJobs = [
    { html: bannerHtml({ format: 'personal', fill: 'uav', uavUri }), base: 'linkedin-cover-personal', dsf: 2, fmt: 'personal' },
    { html: bannerHtml({ format: 'company', fill: 'formation', drones }), base: 'linkedin-cover-company', dsf: 5, fmt: 'company' },
  ];

  for (const j of coverJobs) {
    const ctx = await browser.newContext({ deviceScaleFactor: j.dsf });
    const page = await ctx.newPage();
    await shoot(page, j.html, '.stage', path.join(brandDir, `${j.base}.png`), j.fmt);
    await ctx.close();
  }

  for (const scale of [1, 2]) {
    const ctx = await browser.newContext({ deviceScaleFactor: scale });
    const page = await ctx.newPage();
    for (const j of logoJobs) {
      const suffix = scale === 2 ? '@2x' : '';
      await shoot(page, j.html, '.stage', path.join(brandDir, `${j.base}${suffix}.png`), scale);
    }
    await ctx.close();
  }

  // LinkedIn-style preview (personal-profile header: 4:1 cover + circular photo overlaid).
  const avatarUri = await asDataUri('brand/linkedin-logo-text-cyan-wm@2x.png');
  const pctx = await browser.newContext({ deviceScaleFactor: 2 });
  const ppage = await pctx.newPage();
  const bannerUri = await asDataUri('brand/linkedin-cover-personal.png');
  await shoot(ppage, previewHtml(bannerUri, avatarUri), '.wrap', path.join(brandDir, 'linkedin-preview.png'), 2);
  await pctx.close();

  await browser.close();
}

await render();
console.log('Done.');
