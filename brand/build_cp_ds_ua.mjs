// Ukrainian variants of the Company Profile (CP-2026-UA) and the NAS 2C / 2E
// engine datasheet (DS-2026-UA) — A4 portrait, print-ready.
//
//   node brand/build_cp_ds_ua.mjs             → both docs, RGB + PDF/X CMYK
//   node brand/build_cp_ds_ua.mjs --doc=cp    → company profile only
//   node brand/build_cp_ds_ua.mjs --doc=ds    → engine datasheet only
//   --rgb-only    skip the CMYK pass
//   --allow-fit   write deliverables even when fit assertions fire
//
// BUILT FROM THE SOURCE HTML, NOT FROM THE CMYK PDFs. The English masters are
// .tmp_pdf/profile_print.html and .tmp_pdf/datasheet_print.html; the published
// 2C/2E CMYK PDF has a defective text layer and must never be a build input.
// The English masters themselves are NOT touched: this script reads them,
// applies an explicit list of replacements (every one verified to match the
// source exactly, so a drifted master fails the build rather than silently
// building the wrong document), and writes .tmp_pdf/*_ua.html next to them.
//
// Ukrainian copy comes 1:1 from NAS_UA_COPYDECK_CP_DS.md — no translation is
// invented here. Decisions already taken (do not re-open):
//   · the FUEL EFFICIENCY star-rating row is OMITTED in DS-2026-UA (rule
//     breach in the source: no star ratings in datasheets, NAS-BRAND.md);
//     EN/DA get the same fix at their next REV — TODO comment sits on the row
//     in datasheet_print.html;
//   · the tagline "Built on integrity" stays English, cover included;
//   · "UAV" → БПЛА in running text.
//
// FONT. Space Grotesk has no Cyrillic glyphs (latin, latin-ext, vietnamese
// only), so all Space Grotesk body copy is set in Inter — in the UA variants
// only. The UA font link does not even request Space Grotesk, and the build
// reads the finished PDF back to prove which faces are embedded.
//
// GRADIENTS. Chromium turns CSS gradients into PDF shading objects in their
// own DeviceRGB space, which the vector CMYK pass cannot convert. Same cure as
// the drone-stack datasheet: the decorative layer (radial atmosphere + grain)
// is pre-rendered once to a flat background plate, the gridlines become a
// tiled SVG (rasterised to a plain image, not a shading), and the few small
// linear-gradients are flattened to solid fills. The build asserts that zero
// shadings remain after conversion.
//
// NUMBERS. Every figure the copydeck extends the byte-identity assertion to
// (35, 26, 340, 9, 1000, 1:50) lives once in F below. The UA strings are
// composed from F, and the build asserts each value appears byte-identically
// in the English source, the UA HTML and the extracted UA PDF text. On top of
// that, every replacement pair must carry the same numeric-token multiset in
// both languages unless it declares why not (the copydeck deliberately spells
// two counts as words: двотактних / двоциліндрових).

import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from '../.screenshots/node_modules/playwright/index.mjs';
import { toPdfxCmyk } from './pdfx_vector_cmyk.mjs';
import { NAS2 } from './specs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = __dirname;
const repoRoot = path.resolve(__dirname, '..');
const tmpDir = path.join(repoRoot, '.tmp_pdf');
// Every datasheet/company-profile deliverable lives in DATASHEETS/ — outputs
// land there directly so nothing has to be moved by hand after a rebuild.
const outDir = path.join(repoRoot, 'DATASHEETS');

const RGB_ONLY = process.argv.includes('--rgb-only');
const ALLOW_FIT = process.argv.includes('--allow-fit');
const ONLY = (process.argv.find(a => a.startsWith('--doc=')) || '--doc=both').split('=')[1];
if (!['cp', 'ds', 'both'].includes(ONLY)) throw new Error(`unknown --doc=${ONLY} — want cp, ds or both`);

// ---------------------------------------------------------------------------
// FIGURES — the copydeck's byte-identity list. Written down exactly once; the
// UA strings below are composed from these, and assertConfigValues() proves
// the same bytes sit in the English master and in the finished UA PDF.
// ---------------------------------------------------------------------------
// The values themselves live in brand/specs.mjs — ONE source shared with the
// drone-stack datasheet build and with the website (brand/build_site_specs.mjs).
const F = NAS2;
const CONFIG_VALUES = [F.powerHp, F.powerKw, F.displacement, F.dryWeight, F.range, F.premix];

// ---------------------------------------------------------------------------
// FIT REPORT — same policy as the drone-stack build: no check fixes anything
// on its own; everything is collected, printed in full, and the build fails
// once so each case is a decision rather than a silent type-size nudge.
// ---------------------------------------------------------------------------
const FIT = [];
const fit = (where, msg, detail) => FIT.push({ where, msg, detail });

// ---------------------------------------------------------------------------
// SHARED CSS TRANSFORMS — identical strings in both English masters
// ---------------------------------------------------------------------------
const FONTLINK_EN = 'family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono';
const FONTLINK_UA = 'family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono';
const BODYFONT_EN = 'font-family:"Space Grotesk", ui-sans-serif, system-ui, sans-serif;';
const BODYFONT_UA = 'font-family:"Inter", ui-sans-serif, system-ui, sans-serif;';

const PAGE_BG_EN = `  background:
    radial-gradient(110mm 70mm at 85% -5%, rgba(59,182,232,0.10), transparent 60%),
    radial-gradient(95mm 65mm at -10% 25%, rgba(14,70,85,0.55), transparent 65%),
    radial-gradient(120mm 80mm at 50% 115%, rgba(59,182,232,0.06), transparent 60%),
    var(--bg-base);`;
const PAGE_BG_UA = `  background-image:url("__PLATE__");
  background-size:210mm 297mm;
  background-color:var(--bg-base);`;

// Grain is baked into the plate; the div stays in the markup but paints nothing.
const GRAIN_EN = `.grain{
  position:absolute; inset:0; pointer-events:none; opacity:0.04;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9 0 0 0 0 0.95 0 0 0 0 1 0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}`;
const GRAIN_UA = `.grain{ display:none; } /* grain baked into the page plate — no gradients allowed in this file */`;

const gridlinesEn = (alpha) => `.gridlines{
  position:absolute; inset:0; pointer-events:none;
  background-image:
    linear-gradient(to right, rgba(59,182,232,${alpha}) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(59,182,232,${alpha}) 1px, transparent 1px);
  background-size: 20mm 20mm;
}`;
// 76 SVG px scale to the 20mm tile, so the 1px rects land at 0.263mm — the
// same weight as the CSS 1px lines they replace. An SVG background rasterises
// to a plain image in the PDF; a CSS gradient becomes a shading. That is the
// whole point of this swap.
const gridlinesUa = (alpha) => `.gridlines{
  position:absolute; inset:0; pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='76' height='76'><rect width='1' height='76' fill='rgba(59,182,232,${alpha})'/><rect width='76' height='1' fill='rgba(59,182,232,${alpha})'/></svg>");
  background-size: 20mm 20mm;
}`;

// Image-key module, lifted from the drone-stack datasheet (.diagkey): mono,
// one step below the caption, English term in accent with a dot, translation
// after. Added to both UA files; the English masters never carry it.
const IMGKEY_CSS = `
/* ---- image translation key -------------------------------------------------
   For artwork that carries English text: the English term (cyan, the string
   the reader sees on/inside the figure) then the Ukrainian translation.
   Same pattern as DS-2026-FC-UA. */
.imgkey{ display:flex; flex-wrap:wrap; justify-content:center; gap:0.9mm 4.5mm;
  margin-top:1.5mm;
  font-family:"JetBrains Mono",ui-monospace,monospace; font-size:6.2pt; font-weight:400;
  letter-spacing:0.04em; line-height:1.35; color:var(--ink-2); }
.imgkey .k{ display:inline-flex; align-items:baseline; gap:1.4mm; white-space:nowrap; }
.imgkey i{ font-style:normal; font-weight:500; color:var(--accent); opacity:.85; }
.imgkey i::after{ content:" ·"; opacity:.6; }
.figcol{ display:flex; flex-direction:column; }
</style>`;

const imgkey = (en, ua) => `<div class="imgkey"><span class="k"><i>${en}</i>${ua}</span></div>`;

// ---------------------------------------------------------------------------
// DOCUMENTS
// Each replacement: { from, to, n = expected occurrences (default 1),
//                     numNote = why numeric tokens legitimately differ }.
// ---------------------------------------------------------------------------
const DOCS = {
  // =========================================================================
  cp: {
    key: 'cp',
    src: path.join(tmpDir, 'profile_print.html'),
    out: path.join(tmpDir, 'profile_print_ua.html'),
    outBase: 'NAS_COMPANY_PROFILE_2026_UA',
    docIdEn: 'CP-2026', docIdUa: 'CP-2026-UA', revision: '01',
    title: 'NAS Company Profile 2026 (UA) — CP-2026-UA Rev 01',
    pages: 4,
    counters: ['02 / 04', '03 / 04', '04 / 04'],   // the cover carries none
    gridAlpha: '0.05',
    latinTokens: [
      'NAS', 'Nordic Advanced Systems', 'ApS', 'CP-2026-UA', 'Rev 01',
      'Lufthavnvej 131', '5270 Odense N', 'Denmark',
      'contact@nordicadvancedsystems.com', 'www.nordicadvancedsystems.com',
      '+45 2362 1040', 'Signal', 'Built on integrity',
      'Test Rig', 'Schematic', 'REC', 'LIVE', 'UTC', 'CH-04', '1080P', '24FPS',
    ],
    replacements: [
      // ---- head / fonts ----
      { from: '<html lang="en">', to: '<html lang="uk">' },
      // css:true = structural/metadata: not page content, so excluded from the
      // extraction fidelity list (a <title> never reaches the text layer).
      { from: '<title>NAS — Company Profile 2026 (Print)</title>',
        to:   '<title>NAS — Профіль компанії 2026 (Print, UA)</title>', css: true },
      { from: FONTLINK_EN, to: FONTLINK_UA, css: true },
      { from: BODYFONT_EN, to: BODYFONT_UA, css: true },
      // ---- de-gradient ----
      { from: PAGE_BG_EN, to: PAGE_BG_UA, css: true },
      { from: GRAIN_EN, to: GRAIN_UA, css: true },
      { from: gridlinesEn('0.05'), to: gridlinesUa('0.05'), css: true },
      { from: 'background:linear-gradient(to top, rgba(8,32,42,0.92), rgba(8,32,42,0));',
        to:   'background:rgba(8,32,42,0.85);', css: true },
      { from: 'background:linear-gradient(180deg, rgba(59,182,232,0.04), rgba(59,182,232,0.01));',
        to:   'background:rgba(59,182,232,0.03);', css: true },
      { from: `background:linear-gradient(to right,
    transparent 0%, rgba(59,182,232,0.0) 28%,
    rgba(59,182,232,0.35) 50%,
    rgba(59,182,232,0.0) 72%, transparent 100%);`,
        to: 'background:rgba(59,182,232,0.25);', css: true },
      { from: `background:linear-gradient(to bottom,
    transparent 0%, rgba(59,182,232,0.0) 28%,
    rgba(59,182,232,0.35) 50%,
    rgba(59,182,232,0.0) 72%, transparent 100%);`,
        to: 'background:rgba(59,182,232,0.25);', css: true },
      { from: '\n</style>', to: '\n' + IMGKEY_CSS, css: true },
      // ---- UA-only fit: page 3 ran 1.6mm past the footer rule (measured).
      // Margins give the ground back; no type size changes.
      { from: '  margin:4mm 0 4mm;', to: '  margin:4mm 0 2.5mm;', css: true },          // .test-rig-banner
      { from: `  letter-spacing:0.22em; text-transform:uppercase;
  color:var(--accent);
  margin-top:4mm;`,
        to: `  letter-spacing:0.22em; text-transform:uppercase;
  color:var(--accent);
  margin-top:3mm;`, css: true },                                                        // .proto-eyebrow
      // ---- document identity ----
      { from: 'Doc · CP-2026 · Rev 01', to: 'Doc · CP-2026-UA · Rev 01', n: 2 },
      // ---- cover ----
      { from: '<div class="cover-title">Company<br/>Profile</div>',
        to:   '<div class="cover-title">Профіль<br/>компанії</div>' },
      { from: '<span class="label">Confidential — Controlled Document</span>',
        to:   '<span class="label">КОНФІДЕНЦІЙНО — КОНТРОЛЬОВАНИЙ ДОКУМЕНТ</span>' },
      { from: '<p>Restricted distribution. No forwarding or disclosure without written authorization from Nordic Advanced Systems ApS.</p>',
        to:   '<p>Обмежене розповсюдження. Пересилання чи розкриття без письмового дозволу Nordic Advanced Systems ApS заборонено.</p>' },
      // ---- page 2 ----
      { from: '<span class="eyebrow">/ About — Nordic Advanced Systems</span>',
        to:   '<span class="eyebrow">/ Про компанію — Nordic Advanced Systems</span>' },
      { from: '<h2>Built for operations where propulsion <span class="accent">must work</span></h2>',
        to:   '<h2>Створено для операцій, де силова установка <span class="accent">має працювати</span></h2>' },
      { from: '<h3>About Nordic Advanced Systems</h3>',
        to:   '<h3>Про Nordic Advanced Systems</h3>' },
      { from: '<p>Nordic Advanced Systems is a Danish company that develops and manufactures propulsion systems for UAV platforms. The engines are used in operations where propulsion must function correctly and predictably throughout the mission. The focus is on stable operation, consistent quality, and known behavior under load.</p>',
        to:   '<p>Nordic Advanced Systems — данська компанія, що розробляє та виробляє силові установки для платформ БПЛА. Двигуни використовуються в операціях, де силова установка має функціонувати коректно й передбачувано впродовж усієї місії. У фокусі — стабільна робота, незмінна якість і відома поведінка під навантаженням.</p>' },
      { from: '<h3>Our contribution to UAV operations</h3>',
        to:   '<h3>Наш внесок в операції БПЛА</h3>' },
      { from: '<p>In many UAV operations, the propulsion system must behave consistently from unit to unit and be produced in series with known characteristics. NAS develops engines based on this premise — designed to provide predictable mechanical and thermal behavior so overall platform performance is well understood in operational use.</p>',
        to:   '<p>У багатьох операціях БПЛА силова установка має поводитися однаково від виробу до виробу й вироблятися серійно з відомими характеристиками. NAS розробляє двигуни саме з цієї передумови — вони спроєктовані так, щоб забезпечувати передбачувану механічну й термічну поведінку, завдяки чому загальні характеристики платформи добре зрозумілі в експлуатації.</p>' },
      { from: '<h3>How we work</h3>', to: '<h3>Як ми працюємо</h3>' },
      { from: '<p>NAS is organized as an industrial supplier with established processes and clear responsibility. The company draws on experience from operational military environments — experience that has shaped our approach to function, testing, and accountability for what is delivered. The working method is characterized by clear decision-making and clear ownership of both design and delivery.</p>',
        to:   '<p>NAS організована як промисловий постачальник з усталеними процесами та чіткою відповідальністю. Компанія спирається на досвід операційних військових середовищ — досвід, що сформував наш підхід до функціональності, тестування та відповідальності за те, що постачається. Робочий метод характеризується чітким ухваленням рішень і чіткою відповідальністю як за проєктування, так і за постачання.</p>' },
      { from: '<h3>Design philosophy</h3>', to: '<h3>Філософія проєктування</h3>' },
      { from: '<p>Engines are developed based on actual operating conditions and known load profiles, ensuring:</p>',
        to:   '<p>Двигуни розробляються на основі реальних умов експлуатації та відомих профілів навантаження, що забезпечує:</p>' },
      { from: '<span>Stable rotational speed throughout the mission</span>',
        to:   '<span>Стабільні оберти впродовж усієї місії</span>' },
      { from: '<span>Controlled vibration during operation</span>',
        to:   '<span>Контрольовану вібрацію під час роботи</span>' },
      { from: '<span>Predictable thermal behavior until mission completion</span>',
        to:   '<span>Передбачувану термічну поведінку до завершення місії</span>' },
      { from: '<span>Consistent performance across series production</span>',
        to:   '<span>Незмінні характеристики в серійному виробництві</span>' },
      { from: '<h3>Collaboration &amp; framework</h3>', to: '<h3>Співпраця та рамки</h3>' },
      { from: '<p>NAS works with clear specifications and defined frameworks. Configurations are finalized before production. Any changes are handled in a structured manner and through direct dialogue between technical counterparts. Deliveries are carried out at the agreed pace and in the agreed form. If underlying conditions change, this is communicated early.</p>',
        to:   '<p>NAS працює з чіткими специфікаціями та визначеними рамками. Конфігурації фіналізуються до початку виробництва. Будь-які зміни опрацьовуються структуровано, через прямий діалог між технічними контрагентами. Постачання здійснюються в узгодженому темпі та в узгодженій формі. Якщо базові умови змінюються, про це повідомляється завчасно.</p>' },
      // ---- page 3 ----
      { from: '<span class="eyebrow">/ Engineering &amp; Delivery</span>',
        to:   '<span class="eyebrow">/ Інженерія та постачання</span>' },
      { from: '<div class="sub">Continued — production, quality, and the <span class="accent">NAS Series</span>.</div>',
        to:   '<div class="sub">Продовження — виробництво, якість і <span class="accent">серія NAS</span>.</div>' },
      { from: '<h3>Production &amp; quality</h3>', to: '<h3>Виробництво та якість</h3>' },
      { from: '<p>All engines are assembled and tested in Denmark. <span class="muted">For security and discretion, the production address is not publicly disclosed.</span></p>',
        to:   '<p>Усі двигуни складаються й тестуються в Данії. <span class="muted">З міркувань безпеки та обачності виробнича адреса публічно не розкривається.</span></p>' },
      // Test-rig photo: the label on the photo stays English (it sits inside
      // the artwork, like the silkscreen on the drone-stack pinout); the key
      // beneath carries the copydeck translation.
      { from: `<div class="trlabel">NAS · Test Rig</div>
      </div>`,
        to: `<div class="trlabel">NAS · Test Rig</div>
      </div>
      ${imgkey('Test Rig', 'Випробувальний стенд')}` },
      { from: '<div class="proto-eyebrow">/ Test Protocol</div>',
        to:   '<div class="proto-eyebrow">/ Протокол випробувань</div>' },
      { from: '<div class="plabel">Cold-run<br/>testing</div>',
        to:   '<div class="plabel">Холодний<br/>прогін</div>' },
      { from: '<div class="pdesc">Mechanical verification under controlled conditions</div>',
        to:   '<div class="pdesc">Механічна перевірка в контрольованих умовах</div>' },
      { from: '<div class="plabel">Hot-run<br/>testing</div>',
        to:   '<div class="plabel">Гарячий<br/>прогін</div>' },
      { from: '<div class="pdesc">Performance validation at operational load</div>',
        to:   '<div class="pdesc">Перевірка характеристик під експлуатаційним навантаженням</div>' },
      { from: '<div class="plabel">Visual<br/>inspection</div>',
        to:   '<div class="plabel">Візуальний<br/>контроль</div>' },
      { from: '<div class="pdesc">Final review before unit release</div>',
        to:   '<div class="pdesc">Фінальний огляд перед випуском виробу</div>' },
      { from: '<div class="plabel">Unit<br/>traceability</div>',
        to:   '<div class="plabel">Простежуваність<br/>виробів</div>' },
      { from: '<div class="pdesc">Documentation provided with every delivery</div>',
        to:   '<div class="pdesc">Документація надається з кожною поставкою</div>' },
      { from: '<h3>The NAS Series</h3>', to: '<h3>Серія NAS</h3>' },
      { from: '<p>NAS 2C and NAS 2E are not modified hobby or industrial engines. They are purpose-built UAV engines, designed from the ground up for:</p>',
        to:   '<p>NAS 2C і NAS 2E — це не модифіковані хобійні чи промислові двигуни. Це двигуни, спеціально створені для БПЛА та спроєктовані з нуля для:</p>' },
      { from: '<span>Constant high load</span>', to: '<span>Постійного високого навантаження</span>' },
      { from: '<span>Direct propeller coupling</span>', to: '<span>Прямого приводу повітряного гвинта</span>' },
      { from: '<span>Long endurance</span>', to: '<span>Тривалої безперервної роботи</span>' },
      { from: '<span>Mechanical and thermal stability</span>', to: '<span>Механічної та термічної стабільності</span>' },
      { from: '<span>Precision-balanced crankshaft</span>', to: '<span>Прецизійно збалансованого колінчастого вала</span>' },
      { from: '<span>High-grade bearings rated for continuous cyclic loads</span>',
        to:   '<span>Підшипників високого класу, розрахованих на безперервні циклічні навантаження</span>' },
      { from: '<div class="footnote">Full engine specifications enclosed separately</div>',
        to:   '<div class="footnote">Повні характеристики двигуна додаються окремо</div>' },
      // Schematic: wrap the figure so the key can sit directly beneath it in
      // the same grid column.
      { from: `<div class="motor-figure">
          <img src="./motor_thumb.png" alt="NAS 2 Series engine schematic" />
          <div class="mc mc-tl"></div>
          <div class="mc mc-tr"></div>
          <div class="mc mc-bl"></div>
          <div class="mc mc-br"></div>
          <div class="mlabel">NAS 2 · Schematic</div>
        </div>`,
        to: `<div class="figcol">
        <div class="motor-figure">
          <img src="./motor_thumb.png" alt="NAS 2 Series engine schematic" />
          <div class="mc mc-tl"></div>
          <div class="mc mc-tr"></div>
          <div class="mc mc-bl"></div>
          <div class="mc mc-br"></div>
          <div class="mlabel">NAS 2 · Schematic</div>
        </div>
        ${imgkey('Schematic', 'Схема')}
        </div>` },
      // ---- page 4 ----
      { from: '<div class="ceyebrow">/ Contact</div>', to: '<div class="ceyebrow">/ Контакт</div>' },
      // ---- footers ----
      { from: 'All rights reserved', to: 'Усі права захищені' },
      { from: '<span class="dot">·</span> Confidential</div>',
        to:   '<span class="dot">·</span> Конфіденційно</div>', n: 3 },
    ],
  },

  // =========================================================================
  ds: {
    key: 'ds',
    src: path.join(tmpDir, 'datasheet_print.html'),
    out: path.join(tmpDir, 'datasheet_print_ua.html'),
    outBase: 'NAS_DATASHEET_2C2E_2026_UA',
    docIdEn: 'DS-2026', docIdUa: 'DS-2026-UA', revision: '01',
    title: 'NAS 2C / NAS 2E Datasheet 2026 (UA) — DS-2026-UA Rev 01',
    pages: 2,
    counters: ['01 / 02', '02 / 02'],
    gridAlpha: '0.04',
    latinTokens: [
      'NAS 2C', 'NAS 2E', 'Nordic Advanced Systems', 'ApS', 'DS-2026-UA', 'Rev 01',
      'EFI', 'ECU', 'CDI', 'CAN', 'UART', 'NDAA', 'boxer', 'premix', 'windmilling',
      'Boxer Engine', ...CONFIG_VALUES,
    ],
    replacements: [
      // ---- head / fonts ----
      { from: '<html lang="en">', to: '<html lang="uk">' },
      { from: '<title>NAS — NAS 2C / NAS 2E Datasheet 2026 (Print)</title>',
        to:   '<title>NAS — NAS 2C / NAS 2E Технічний опис 2026 (Print, UA)</title>', css: true },
      { from: FONTLINK_EN, to: FONTLINK_UA, css: true },
      { from: BODYFONT_EN, to: BODYFONT_UA, css: true },
      // ---- de-gradient ----
      { from: PAGE_BG_EN, to: PAGE_BG_UA, css: true },
      { from: GRAIN_EN, to: GRAIN_UA, css: true },
      { from: gridlinesEn('0.04'), to: gridlinesUa('0.04'), css: true },
      { from: 'background:linear-gradient(180deg, rgba(59,182,232,0.06), rgba(59,182,232,0.02));',
        to:   'background:rgba(59,182,232,0.04);', css: true },
      { from: '\n</style>', to: '\n' + IMGKEY_CSS, css: true },
      // ---- UA-only fit: p1 ran 2.5mm and p2 0.6mm past the footer rule
      // (measured). Margins give the ground back; no type size changes.
      { from: `.ds-hero{
  margin:0 0 8mm;
}`,
        to: `.ds-hero{
  margin:0 0 6mm;
}`, css: true },
      { from: `.section-block{
  margin-bottom:6mm;
}`,
        to: `.section-block{
  margin-bottom:5mm;
}`, css: true },
      { from: `.specs-h2{
  margin-bottom:8mm;
}`,
        to: `.specs-h2{
  margin-bottom:6mm;
}`, css: true },
      // ---- document identity ----
      { from: 'Doc · DS-2026 · Rev 01', to: 'Doc · DS-2026-UA · Rev 01', n: 2 },
      // ---- page 1: hero ----
      { from: '<div class="eyebrow">/ Datasheet — NAS 2 Series</div>',
        to:   '<div class="eyebrow">/ Технічний опис — Серія NAS 2</div>' },
      { from: '<div class="sub-mono">Boxer engine</div>',
        to:   '<div class="sub-mono">Опозитний двигун</div>' },
      { from: `<div class="lede">
      Continuous-operation platforms requiring over 1000 km range. Built for altitude shifts and harsh weather conditions.
    </div>`,
        to: `<div class="lede">
      Платформи безперервної роботи з дальністю понад ${F.range}. Створено для перепадів висоти та суворих погодних умов.
    </div>` },
      // ---- page 1: overview ----
      { from: '<div class="eyebrow">/ 01 — Overview</div>', to: '<div class="eyebrow">/ 01 — Огляд</div>' },
      { from: '<p>The NAS 2 series includes two dual-cylinder, 2-stroke boxer engine models designed for long-endurance platforms:</p>',
        to:   '<p>Серія NAS 2 включає дві моделі двоциліндрових двотактних опозитних двигунів для платформ тривалої дії:</p>',
        numNote: 'copydeck spells "dual-cylinder, 2-stroke" as words (двоциліндрових двотактних)' },
      { from: '<span><strong>NAS 2C</strong> — Dual-cylinder, 2-stroke boxer engine with carburettor.</span>',
        to:   '<span><strong>NAS 2C</strong> — двоциліндровий двотактний опозитний двигун з карбюратором.</span>',
        numNote: 'copydeck spells "Dual-cylinder, 2-stroke" as words (двоциліндровий двотактний)' },
      { from: '<span><strong>NAS 2E</strong> — Features electronic fuel injection (EFI) and ignition adjustment with barometric-compensated ECU for altitude-independent operation.</span>',
        to:   '<span><strong>NAS 2E</strong> — має електронне впорскування палива (EFI) та корекцію запалювання з барометрично компенсованим ECU для роботи незалежно від висоти.</span>' },
      { from: '<p>Both models feature dual-spark redundancy and a high-strength crankshaft assembly, ensuring reliable performance in continuous operation.</p>',
        to:   '<p>Обидві моделі мають резервування подвійного запалювання та високоміцний вузол колінчастого вала, що забезпечує надійну роботу в безперервній експлуатації.</p>' },
      // Engine photo: label stays English as printed artwork furniture; the key
      // beneath carries the copydeck translation.
      { from: '<div class="elabel">NAS 2 · Boxer Engine</div>',
        to: `<div class="elabel">NAS 2 · Boxer Engine</div>
        ${imgkey('Boxer Engine', 'Опозитний двигун')}` },
      // ---- page 1: features ----
      { from: '<div class="eyebrow">/ 02 — Mechanical &amp; Functional Features</div>',
        to:   '<div class="eyebrow">/ 02 — Механічні та функціональні особливості</div>' },
      { from: '<span>Dual-spark system reduces misfire risk and improves combustion stability.</span>',
        to:   '<span>Система подвійних свічок знижує ризик пропусків запалювання та покращує стабільність згоряння.</span>' },
      { from: '<span>High-strength crankshaft with large bearing surfaces supports continuous load and high RPM.</span>',
        to:   '<span>Високоміцний колінчастий вал з великими опорними поверхнями витримує безперервне навантаження та високі оберти.</span>' },
      { from: '<span>High-precision rods with needle bearings at both ends deliver efficiency and long endurance.</span>',
        to:   '<span>Прецизійні шатуни з голчастими підшипниками на обох кінцях забезпечують ефективність і тривалий ресурс.</span>' },
      { from: '<span>The rear output shaft allows integration of a generator or auxiliary systems.</span>',
        to:   '<span>Задній вихідний вал дозволяє інтегрувати генератор або допоміжні системи.</span>' },
      // ---- page 1: origin ----
      { from: '<div class="eyebrow">/ 03 — Origin</div>', to: '<div class="eyebrow">/ 03 — Походження</div>' },
      { from: '<div class="origin-box">European origin with secure, NDAA-compliant electronics.</div>',
        to:   '<div class="origin-box">Європейське походження із захищеною електронікою, що відповідає NDAA.</div>' },
      // ---- page 2: specs ----
      { from: '<div class="eyebrow">/ 04 — Technical Specifications</div>',
        to:   '<div class="eyebrow">/ 04 — Технічні характеристики</div>' },
      { from: '<h2>Engineered for <span class="accent">predictable behavior</span></h2>',
        to:   '<h2>Спроєктовано для <span class="accent">передбачуваної поведінки</span></h2>' },
      { from: '<div class="specs-eyebrow">/ Common Specs</div>',
        to:   '<div class="specs-eyebrow">/ Загальні характеристики</div>' },
      { from: '<td class="label">Engine Configuration</td>', to: '<td class="label">Конфігурація двигуна</td>' },
      { from: '<td class="value">2-cylinder, 2-stroke, horizontally opposed (boxer layout)</td>',
        to:   '<td class="value">2 циліндри, 2-тактний, горизонтально опозитний (boxer)</td>' },
      { from: '<td class="label">Displacement</td>', to: `<td class="label">Робочий об'єм</td>` },
      { from: '<td class="label">Cooling</td>', to: '<td class="label">Охолодження</td>' },
      { from: '<td class="value">Air-cooled, finned cylinder heads</td>',
        to:   '<td class="value">Повітряне, оребрені головки циліндрів</td>' },
      { from: '<td class="label">Power Output</td>', to: '<td class="label">Потужність</td>' },
      { from: '<td class="value">Up to 35 hp / 26 kW</td>',
        to:   `<td class="value">До ${F.powerHp} / ${F.powerKw}</td>` },
      { from: '<td class="label">Fuel Type</td>', to: '<td class="label">Паливо</td>' },
      { from: '<td class="value">Unleaded gasoline with premix oil (typically 1:50 ratio)</td>',
        to:   `<td class="value">Неетильований бензин з маслом premix (типово ${F.premix})</td>` },
      { from: '<td class="label">Starter System</td>', to: '<td class="label">Стартер</td>' },
      { from: '<td class="value">Integrated electric starter with gear reduction + external square drive option</td>',
        to:   '<td class="value">Інтегрований електростартер з редуктором + опція зовнішнього квадратного привода</td>' },
      { from: '<td class="label">Dry Weight</td>', to: '<td class="label">Суха маса</td>' },
      // ---- page 2: model comparison ----
      { from: '<td class="label">/ Model Comparison</td>', to: '<td class="label">/ Порівняння моделей</td>' },
      { from: `<tr>
          <td class="label">Altitude Adaptation</td>
          <td class="col-c">Manual tuning</td>
          <td class="col-e">Automatic via ECU with barometric sensor</td>
        </tr>`,
        to: `<tr>
          <td class="label">Адаптація до висоти</td>
          <td class="col-c">Ручне налаштування</td>
          <td class="col-e">Автоматична через ECU з барометричним датчиком</td>
        </tr>` },
      { from: `<tr>
          <td class="label">Ignition Control</td>
          <td class="col-c">Dual independent CDI coils</td>
          <td class="col-e">ECU-tuned ignition curve</td>
        </tr>`,
        to: `<tr>
          <td class="label">Керування запалюванням</td>
          <td class="col-c">Дві незалежні котушки CDI</td>
          <td class="col-e">Крива запалювання, налаштована ECU</td>
        </tr>` },
      { from: `<tr>
          <td class="label">Fuel System</td>
          <td class="col-c">Carburettor</td>
          <td class="col-e">Electronic Fuel Injection (EFI) with throttle position &amp; temperature sensors</td>
        </tr>`,
        to: `<tr>
          <td class="label">Паливна система</td>
          <td class="col-c">Карбюратор</td>
          <td class="col-e">Електронне впорскування палива (EFI) з датчиками положення дросельної заслінки та температури</td>
        </tr>` },
      // FUEL EFFICIENCY: omitted entirely. Star ratings are a rule breach in
      // the source (NAS-BRAND: no star ratings in datasheets) and there are no
      // measured figures to replace them with. EN/DA lose the row at their
      // next REV — TODO comment sits on the row in datasheet_print.html.
      { from: `<tr>
          <td class="label">Fuel Efficiency</td>
          <td class="col-c"><span class="stars">★★★★☆</span></td>
          <td class="col-e"><span class="stars">★★★★★</span></td>
        </tr>
        `,
        to: '' },
      { from: `<tr>
          <td class="label">Weather Resistance</td>
          <td class="col-c">Standard</td>
          <td class="col-e">All-weather compatible</td>
        </tr>`,
        to: `<tr>
          <td class="label">Стійкість до погодних умов</td>
          <td class="col-c">Стандартна</td>
          <td class="col-e">Всепогодна</td>
        </tr>` },
      { from: `<tr>
          <td class="label">Cold Start Performance</td>
          <td class="col-c">Standard</td>
          <td class="col-e">ECU enrichment, temperature and altitude aware</td>
        </tr>`,
        to: `<tr>
          <td class="label">Холодний запуск</td>
          <td class="col-c">Стандартний</td>
          <td class="col-e">Збагачення ECU з урахуванням температури та висоти</td>
        </tr>` },
      { from: `<tr>
          <td class="label">Telemetry Interface</td>
          <td class="col-c">None</td>
          <td class="col-e">Live CAN/UART reporting</td>
        </tr>`,
        to: `<tr>
          <td class="label">Інтерфейс телеметрії</td>
          <td class="col-c">Немає</td>
          <td class="col-e">Телеметрія CAN/UART у реальному часі</td>
        </tr>` },
      { from: `<tr>
          <td class="label">Maintenance Load</td>
          <td class="col-c">Carburettor tuning</td>
          <td class="col-e">Low (programmable)</td>
        </tr>`,
        to: `<tr>
          <td class="label">Обсяг обслуговування</td>
          <td class="col-c">Налаштування карбюратора</td>
          <td class="col-e">Низький (програмований)</td>
        </tr>` },
      { from: `<tr>
          <td class="label">In-flight Restart Capability</td>
          <td class="col-c">Not supported</td>
          <td class="col-e">Windmilling-assisted automatic restart</td>
        </tr>`,
        to: `<tr>
          <td class="label">Перезапуск у польоті</td>
          <td class="col-c">Не підтримується</td>
          <td class="col-e">Автоматичний перезапуск з авторотацією (windmilling)</td>
        </tr>` },
      // ---- footers ----
      { from: '<span class="dot">·</span> Confidential</div>',
        to:   '<span class="dot">·</span> Конфіденційно</div>', n: 2 },
    ],
  },
};

// ---------------------------------------------------------------------------
// SCRIPT INTEGRITY — ported from build_datasheet_dronestack.mjs
// ---------------------------------------------------------------------------
const CYR = /[Ѐ-ӿ]/;
const LAT = /[A-Za-z]/;
const NUM_TOKEN = /\d+(?:[.,:]\d+)*(?:[–-]\d+)*(?:[A-Za-z]+)?/g;
const stripTags = (s) => s.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '');

function assertNoHomoglyphs(strings) {
  const bad = [];
  for (const str of strings) {
    for (const tok of String(str).split(/[^\p{L}\p{N}]+/u)) {
      if (!tok) continue;
      if (CYR.test(tok) && (LAT.test(tok) || /\d/.test(tok))) bad.push({ tok, str: String(str).slice(0, 60) });
    }
  }
  return bad;
}

function numericTokens(s) {
  return (stripTags(s).match(NUM_TOKEN) || []).sort();
}

// ---- which faces are genuinely embedded in a finished PDF ------------------
// pdffonts is not installed on this machine; the answer sits in the file
// anyway. Chromium's Skia writer names each embedded font in /FontName inside
// its FontDescriptor — the object the font programme hangs off — so reading
// those is the same evidence pdffonts would print.
const FACE_SUFFIX = /^(Thin|ExtraLight|UltraLight|Light|Regular|Book|Medium|SemiBold|DemiBold|Bold|ExtraBold|UltraBold|Black|Heavy|Italic|Oblique)$/i;
function fontFamilyOf(name) {
  const parts = name.split('-').filter(Boolean);
  while (parts.length > 1 && FACE_SUFFIX.test(parts[parts.length - 1])) parts.pop();
  return parts.join('');
}
export function pdfFonts(pdfPath) {
  const raw = readFileSync(pdfPath, 'latin1');
  const found = new Map();
  for (const m of raw.matchAll(/\/FontName\s*\/([A-Za-z0-9+\-_,.]+)/g)) {
    const full = m[1];
    const subset = /^[A-Z]{6}\+/.test(full);
    const name = full.replace(/^[A-Z]{6}\+/, '');
    const family = fontFamilyOf(name);
    const rec = found.get(family) || { family, names: new Set(), subset: true };
    rec.names.add(name);
    if (!subset) rec.subset = false;
    found.set(family, rec);
  }
  if (!found.size) throw new Error('no /FontName entries in ' + pdfPath + ' — cannot verify fonts');
  return [...found.values()].sort((x, y) => x.family.localeCompare(y.family));
}

const EXPECT_FONTS = ['Inter', 'JetBrainsMono'];
const FORBID_FONTS = ['SpaceGrotesk'];
function assertFonts(pdfPath) {
  const fonts = pdfFonts(pdfPath);
  const families = fonts.map(f => f.family);
  const problems = [];
  for (const want of EXPECT_FONTS)
    if (!families.includes(want)) problems.push(`expected ${want} in the PDF, not found`);
  for (const no of FORBID_FONTS)
    if (families.includes(no)) problems.push(`${no} is in the PDF and must not be — it has no Cyrillic ` +
      'glyphs, so its presence means Cyrillic text fell back to a substitute');
  for (const f of families)
    if (!EXPECT_FONTS.includes(f))
      problems.push(`unexpected font "${f}" — nothing in this document asks for it, ` +
        'so it is a fallback for a glyph the intended face could not supply');
  for (const f of fonts)
    if (!f.subset) problems.push(`${f.family} is embedded whole, not subset — likely a system font`);
  return { fonts, problems };
}

// ---- pdftotext, both layout modes ------------------------------------------
function extractText(pdfPath, mode) {
  const args = ['-enc', 'UTF-8', ...(mode ? [mode] : []), pdfPath, '-'];
  return execFileSync('pdftotext', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}
function makeHas(pdfPath) {
  const reading = extractText(pdfPath, null);
  const layout = extractText(pdfPath, '-layout');
  const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
  const noHyphen = (s) => norm(s).replace(/[-‐‑–—]/g, '');
  const flatR = norm(reading), flatL = norm(layout);
  const flatRh = noHyphen(reading), flatLh = noHyphen(layout);
  return {
    text: reading + '\n' + layout,
    invalidUtf8: /�/.test(reading + layout),
    has: (s) => flatL.includes(norm(s)) || flatR.includes(norm(s)) ||
                flatLh.includes(noHyphen(s)) || flatRh.includes(noHyphen(s)),
  };
}

// ---------------------------------------------------------------------------
// LAYOUT — measured on the live DOM before any PDF is written. Ported from the
// drone-stack build; adapted for pages that have no footer (the CP cover) and
// for this document's stamp containers.
// ---------------------------------------------------------------------------
async function measureLayout(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.page').forEach((pg, idx) => {
      const pr = pg.getBoundingClientRect();
      const pxPerMm = pr.width / 210;
      const mm = (px) => +(px / pxPerMm).toFixed(2);

      const foot = pg.querySelector('.page-footer');
      const stamp = pg.querySelector('.ds-stamp, .outro-stamp-wrap, .stamp-plate');
      const boxes = [];
      const walk = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT);
      let t;
      while ((t = walk.nextNode())) {
        if (!t.nodeValue.trim()) continue;
        const el = t.parentElement;
        if (foot && foot.contains(el)) continue;
        if (stamp && stamp.contains(el)) continue;
        // Deliberate overlays: photo labels sit ON their photos, the REC
        // widget sits on the cover art, and the outro/cover stacks sit on the
        // full-bleed background image. Overlap with an image is their design,
        // not a defect.
        const overlay = !!el.closest('.trlabel,.mlabel,.elabel,.rec-hud,.outro-contact,.outro-mark,.cover-stack,.cover-meta');
        // Adjacent lines inside ONE block legitimately touch when the block
        // sets a tight line-height (the 0.98 cover title, the 1.1 h2) — only
        // ink from two different blocks sharing space is a defect.
        let blk = el;
        while (blk && blk !== pg && getComputedStyle(blk).display === 'inline') blk = blk.parentElement;
        const r = document.createRange(); r.selectNodeContents(t);
        for (const b of r.getClientRects()) if (b.width > 0.5 && b.height > 0.5)
          boxes.push({ kind: 'text', what: t.nodeValue.trim().slice(0, 44), overlay, blk, b });
      }
      pg.querySelectorAll('img').forEach(im => {
        if (stamp && stamp.contains(im)) return;
        // .outro-uav is the full-bleed background plate of the outro page —
        // everything sits on top of it by design, footer included.
        if (im.closest('.outro-uav')) return;
        const b = im.getBoundingClientRect();
        if (b.width > 0.5) boxes.push({ kind: 'image', what: im.className || im.src.split('/').pop(), b });
      });
      pg.querySelectorAll('.motor-figure, .test-rig-banner, .engine-frame, .origin-box, .proto-card').forEach(el => {
        boxes.push({ kind: 'box', what: el.className, b: el.getBoundingClientRect() });
      });

      // text-on-text and text-on-image collisions
      const TOL = 0.4 * pxPerMm;
      const texts = boxes.filter(x => x.kind === 'text');
      const imgs = boxes.filter(x => x.kind === 'image');
      const collisions = [];
      const overlap = (a, c) => {
        const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left);
        const oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        return (ox > TOL && oy > TOL) ? { xMm: mm(ox), yMm: mm(oy) } : null;
      };
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          if (texts[i].blk === texts[j].blk) continue;
          const o = overlap(texts[i].b, texts[j].b);
          if (o) collisions.push({ a: texts[i].what, bWhat: texts[j].what, ...o });
        }
        // text over an image is a defect unless the text is a deliberate
        // overlay (see the walk above).
        for (const im of imgs) {
          const el = texts[i];
          if (el.overlay) continue;
          const o = overlap(el.b, im.b);
          if (o && /motor_thumb|test_rig|nas_engine/.test(im.what)) {
            collisions.push({ a: el.what, bWhat: 'image ' + im.what, ...o });
          }
        }
      }

      // footer band
      let footerClashes = [], footerTopMm = null, freeAboveFooterMm = null;
      const lowest = boxes.reduce((m, x) => Math.max(m, x.b.bottom), pr.top);
      if (foot) {
        const fb = foot.getBoundingClientRect();
        footerTopMm = mm(fb.top - pr.top);
        const band = { left: fb.left, right: fb.right, top: fb.top, bottom: pr.bottom };
        footerClashes = boxes.filter(x => x.b.left < band.right - 0.5 && x.b.right > band.left + 0.5 &&
                                          x.b.top < band.bottom - 0.5 && x.b.bottom > band.top + 0.5)
          .filter(x => {
            // the outro page positions its contact block and stamp near the
            // footer deliberately; anything actually inside the band is still
            // a clash, so no exclusion here beyond the footer itself.
            return true;
          })
          .map(x => ({ kind: x.kind, what: x.what,
                       byMm: mm(Math.min(x.b.bottom, band.bottom) - Math.max(x.b.top, band.top)) }));
        freeAboveFooterMm = mm(fb.top - lowest);
      }

      // nowrap overruns: the footnote pill and spec-table labels
      const overruns = [];
      pg.querySelectorAll('.footnote').forEach(el => {
        const parent = el.parentElement.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        if (b.right > parent.right + 0.5)
          overruns.push({ what: 'footnote', byMm: mm(b.right - parent.right) });
      });

      out.push({
        page: idx + 1,
        collisions, footerClashes, footerTopMm, freeAboveFooterMm, overruns,
        overflowMm: mm(lowest - pr.bottom),
      });
    });
    return out;
  });
}

// ---------------------------------------------------------------------------
// background plate — radial atmosphere + grain, flattened to one image
// ---------------------------------------------------------------------------
async function renderPlate(browser) {
  const DPI = 200;
  const w = Math.round(210 / 25.4 * DPI), h = Math.round(297 / 25.4 * DPI);
  const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden}
    .plate{position:relative;width:${w}px;height:${h}px;background:
      radial-gradient(${110 / 210 * 100}% ${70 / 297 * 100}% at 85% -5%, rgba(59,182,232,0.10), transparent 60%),
      radial-gradient(${95 / 210 * 100}% ${65 / 297 * 100}% at -10% 25%, rgba(14,70,85,0.55), transparent 65%),
      radial-gradient(${120 / 210 * 100}% ${80 / 297 * 100}% at 50% 115%, rgba(59,182,232,0.06), transparent 60%),
      #08202a;}
    .grain{position:absolute;inset:0;opacity:.04;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9 0 0 0 0 0.95 0 0 0 0 1 0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");}
  </style></head><body><div class="plate"><div class="grain"></div></div></body></html>`);
  await page.waitForTimeout(200);
  const buf = await page.locator('.plate').screenshot({ type: 'png' });
  await page.close();
  return 'data:image/png;base64,' + buf.toString('base64');
}

// ---------------------------------------------------------------------------
// BUILD one document
// ---------------------------------------------------------------------------
async function buildDoc(doc, browser, plateUri) {
  console.log('\n' + '='.repeat(72));
  console.log(`  ${doc.title}`);
  console.log('='.repeat(72));

  const src = await fs.readFile(doc.src, 'utf8');

  // ---- apply replacements, each verified against the source ----------------
  let html = src;
  const uaStrings = [];
  const parityProblems = [];
  const parityNotes = [];
  for (const r of doc.replacements) {
    const n = r.n || 1;
    const count = html.split(r.from).length - 1;
    if (count !== n) {
      throw new Error(`replacement anchor found ${count}× (expected ${n}) in ${path.basename(doc.src)}:\n  ` +
        JSON.stringify(r.from.slice(0, 90)));
    }
    html = html.split(r.from).join(r.to);
    if (r.css) continue;
    // Fidelity is checked piece by piece — the text between tags — because
    // CSS-generated content (the key's " ·") sits between adjacent pieces in
    // the extracted text and would break a whole-string match.
    for (const piece of r.to.split(/<[^>]*>/)) {
      const s = piece.replace(/\s+/g, ' ').trim();
      if (s.length > 1 && CYR.test(s)) uaStrings.push(s);
    }
    // numeric parity per pair
    const a = numericTokens(r.from), b = numericTokens(r.to);
    if (a.join(' ') !== b.join(' ')) {
      if (r.numNote) parityNotes.push({ from: stripTags(r.from).trim().slice(0, 60), note: r.numNote });
      else parityProblems.push(`tokens [${a}] vs [${b}] in:\n      "${stripTags(r.from).trim().slice(0, 70)}"` +
                               `\n    → "${stripTags(r.to).trim().slice(0, 70)}"`);
    }
  }
  html = html.replace('__PLATE__', plateUri);

  // ---- static assertions on the generated HTML -----------------------------
  if (/(?:linear|radial)-gradient\(/.test(html))
    throw new Error('a CSS gradient survived the transform — it would become an RGB shading the CMYK pass cannot convert');
  if (/Space Grotesk/i.test(html))
    throw new Error('Space Grotesk is still referenced in the UA HTML');
  if (html.includes('★'))
    throw new Error('a star rating survived — the FUEL EFFICIENCY row must be gone');
  for (const v of CONFIG_VALUES) {
    if (doc.key === 'ds') {
      if (!src.includes(v)) throw new Error(`config value "${v}" not byte-identical in the ENGLISH source — F has drifted from the master`);
      if (!html.includes(v)) throw new Error(`config value "${v}" not byte-identical in the UA HTML`);
    }
  }

  console.log(`\nReplacements applied: ${doc.replacements.length} (every anchor matched the English master exactly)`);
  console.log(`Numeric parity: ${parityProblems.length === 0 ? 'token multisets identical in every pair' : parityProblems.length + ' DIVERGENT'}` +
    (parityNotes.length ? ` — ${parityNotes.length} declared exception(s):` : ''));
  for (const p of parityNotes) console.log(`    · "${p.from}" — ${p.note}`);
  if (parityProblems.length) {
    parityProblems.forEach(m => console.log('    · ' + m));
    throw new Error('Numeric values differ between the English source and the Ukrainian copy.');
  }

  const homoglyphs = assertNoHomoglyphs(uaStrings);
  console.log(`Script integrity: ${uaStrings.length} UA strings scanned, ` +
    `${homoglyphs.length === 0 ? 'no mixed-script tokens' : homoglyphs.length + ' MIXED-SCRIPT'}`);
  if (homoglyphs.length) {
    homoglyphs.forEach(h => console.log(`    · "${h.tok}" in "${h.str}"`));
    throw new Error('Cyrillic homoglyphs found inside Latin tokens.');
  }

  await fs.writeFile(doc.out, html, 'utf8');

  // ---- render --------------------------------------------------------------
  const ctx = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + doc.out.replace(/\\/g, '/'), { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);

  const layout = await measureLayout(page);
  console.log('\nLayout (Ukrainian sets 10–15% longer — every mm is measured, nothing shrunk silently):');
  for (const p of layout) {
    console.log(`  page ${p.page}: ` +
      (p.footerTopMm !== null
        ? `${p.freeAboveFooterMm.toFixed(1)}mm free above the footer rule · ${p.footerClashes.length} footer clash(es)`
        : 'no footer (cover)') +
      ` · ${p.collisions.length} collision(s)` +
      (p.overruns.length ? ` · OVERRUN: ${p.overruns.map(o => `${o.what} +${o.byMm}mm`).join(', ')}` : ''));
    for (const c of p.collisions) fit(`${doc.key} p${p.page}`, `"${c.a}" overlaps "${c.bWhat}" (${c.xMm}×${c.yMm}mm)`);
    for (const c of p.footerClashes) fit(`${doc.key} p${p.page}`, `footer band overlapped by ${c.kind} "${c.what}" (${c.byMm}mm)`);
    for (const o of p.overruns) fit(`${doc.key} p${p.page}`, `${o.what} overruns its column by ${o.byMm}mm`);
    if (p.footerTopMm !== null && p.freeAboveFooterMm < 0)
      fit(`${doc.key} p${p.page}`, `content runs ${(-p.freeAboveFooterMm).toFixed(1)}mm past the footer rule`);
  }

  // preview PNGs — for review, not deliverables
  for (let i = 0; i < doc.pages; i++) {
    await page.locator('.page').nth(i).screenshot({
      path: path.join(brandDir, `${doc.key}-ua-p${i + 1}.png`) });
  }
  console.log(`  preview PNGs: brand/${doc.key}-ua-p1..${doc.pages}.png`);

  if (FIT.length && !ALLOW_FIT) {
    await ctx.close();
    return { fitOnly: true };
  }

  await fs.mkdir(outDir, { recursive: true });
  const rgbPath = path.join(outDir, `${doc.outBase}_RGB.pdf`);
  await page.pdf({
    path: rgbPath, format: 'A4', printBackground: true, preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await ctx.close();

  // ---- text fidelity on the RGB master -------------------------------------
  const checkPdf = (pdfPath, label) => {
    const x = makeHas(pdfPath);
    const expected = [...uaStrings.filter(s => s.trim().length > 1),
                      `Doc · ${doc.docIdUa} · Rev ${doc.revision}`, ...doc.counters];
    const missing = expected.filter(s => !x.has(s));
    const missingTokens = doc.latinTokens.filter(t => !x.has(t));
    const problems = [];
    if (missing.length) problems.push(...missing.map(s => `missing from extraction: ${JSON.stringify(s.slice(0, 70))}`));
    if (missingTokens.length) problems.push(`Latin tokens missing: ${missingTokens.join(', ')}`);
    if (x.invalidUtf8) problems.push('invalid UTF-8 in extracted text — broken ToUnicode CMap');
    const oldId = new RegExp(doc.docIdEn + '(?!-UA)');
    if (oldId.test(x.text)) problems.push(`old document number ${doc.docIdEn} (without -UA) still extractable`);
    if (!x.has('Конфіденційно')) problems.push('Конфіденційно not extractable — the handling marking must be translated');
    if (doc.key === 'ds') {
      if (x.has('Fuel Efficiency') || x.text.includes('★')) problems.push('the FUEL EFFICIENCY row is still in the PDF');
      for (const v of CONFIG_VALUES) if (!x.text.replace(/\s+/g, ' ').includes(v))
        problems.push(`config value "${v}" not byte-identical in extracted text`);
    }
    console.log(`\n${label}: ${expected.length} UA strings + ${doc.latinTokens.length} Latin tokens checked — ` +
      (problems.length ? problems.length + ' PROBLEM(S)' : 'all present, doc number Latin, Конфіденційно translated'));
    problems.forEach(m => console.log('    · ' + m));
    if (problems.length) throw new Error(`${label} failed.`);
  };

  checkPdf(rgbPath, `Text extraction (${path.basename(rgbPath)})`);

  const fontReport = (pdfPath) => {
    const fc = assertFonts(pdfPath);
    console.log(`Fonts embedded in ${path.basename(pdfPath)} (pdffonts equivalent — /FontName in every FontDescriptor):`);
    for (const f of fc.fonts)
      console.log(`  ${fc.problems.some(p => p.includes(f.family)) ? 'FAIL' : 'OK  '} ` +
        `${f.family.padEnd(16)} ${f.subset ? 'subset' : 'FULL FACE'}  (${[...f.names].join(', ')})`);
    console.log(`  forbidden: SpaceGrotesk — ${fc.fonts.some(f => f.family === 'SpaceGrotesk') ? 'PRESENT (FAIL)' : 'absent, as required'}`);
    if (fc.problems.length) {
      fc.problems.forEach(m => console.log('    · ' + m));
      throw new Error('Font check failed on ' + pdfPath);
    }
    return fc.fonts.map(f => f.family);
  };
  fontReport(rgbPath);

  const rgbSize = (await fs.stat(rgbPath)).size;
  console.log(`\n  ${path.relative(repoRoot, rgbPath)}  (${(rgbSize / 1048576).toFixed(2)} MB, DeviceRGB)`);

  if (RGB_ONLY) { console.log('  --rgb-only: stopping before the CMYK pass.'); return {}; }

  // ---- PDF/X CMYK, text preserved ------------------------------------------
  const cmykPath = path.join(outDir, `${doc.outBase}_CMYK.pdf`);
  const info = await toPdfxCmyk({
    inPath: rgbPath, outPath: cmykPath,
    title: doc.title,
    creator: 'brand/build_cp_ds_ua.mjs',
  });
  console.log(`\nPDF/X-3 CMYK conversion (vector, text preserved):`);
  console.log(`  colours converted    ${info.fillsConverted} fill/stroke operators`);
  console.log(`  images converted     ${info.imagesConverted} (DeviceRGB → DeviceCMYK)`);
  console.log(`  shadings remaining   ${info.shadings}`);
  console.log(`  profile              ${info.iccFamily}`);
  console.log(`  ${path.relative(repoRoot, cmykPath)}  (${(info.size / 1048576).toFixed(2)} MB)`);
  if (info.shadings > 0)
    throw new Error(`${info.shadings} shading object(s) remain — they would print RGB. A gradient slipped through.`);

  checkPdf(cmykPath, `Text extraction after CMYK (${path.basename(cmykPath)})`);
  console.log('');
  fontReport(cmykPath);

  return { cmykPath };
}

// ---------------------------------------------------------------------------
async function main() {
  const browser = await chromium.launch();
  const plateUri = await renderPlate(browser);

  const docs = ONLY === 'both' ? ['cp', 'ds'] : [ONLY];
  for (const key of docs) await buildDoc(DOCS[key], browser, plateUri);
  await browser.close();

  // ---- fit report ----------------------------------------------------------
  console.log(`\nFit report: ${FIT.length === 0 ? 'no assertions fired' : FIT.length + ' ASSERTION(S) FIRED'}`);
  if (FIT.length) {
    let last = null;
    for (const f of FIT) {
      if (f.where !== last) { console.log(`  [${f.where}]`); last = f.where; }
      console.log(`    · ${f.msg}`);
    }
    if (!ALLOW_FIT)
      throw new Error(`${FIT.length} fit assertion(s) fired. Nothing has been shrunk to hide them; ` +
        'each is a decision. Re-run with --allow-fit to write the files anyway and look at them.');
    console.log('  --allow-fit: files were written anyway.');
  }

  // ---- while we are at it: verify DS-2026-FC-UA fonts (was never verified
  // with a font listing after its own build) --------------------------------
  if (!RGB_ONLY && ONLY === 'both') {
    const fcUa = path.join(repoRoot, 'DATASHEETS', 'NAS_DATASHEET_DRONESTACK_2026_UA_CMYK.pdf');
    try {
      const fonts = pdfFonts(fcUa);
      console.log('\nDS-2026-FC-UA (drone stack) font verification — NAS_DATASHEET_DRONESTACK_2026_UA_CMYK.pdf:');
      for (const f of fonts)
        console.log(`  ${f.family === 'SpaceGrotesk' ? 'FAIL' : 'OK  '} ${f.family.padEnd(16)} ` +
          `${f.subset ? 'subset' : 'FULL FACE'}  (${[...f.names].join(', ')})`);
      console.log(`  SpaceGrotesk: ${fonts.some(f => f.family === 'SpaceGrotesk') ? 'PRESENT — WRONG' : 'absent, as required'}`);
    } catch (e) {
      console.log('\nDS-2026-FC-UA font verification skipped: ' + e.message);
    }
  }
}

await main();
console.log('\nDone.');
