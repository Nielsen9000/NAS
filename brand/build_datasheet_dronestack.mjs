// NAS Drone Stack datasheet — A4 portrait, 2 pages, print-ready.
//
//   node brand/build_datasheet_dronestack.mjs            → RGB + PDF/X CMYK
//   node brand/build_datasheet_dronestack.mjs --rgb-only → skip the CMYK pass
//
// Matches NAS_DATASHEET_2C-2E_2026 (the engine datasheet): same header, footer
// band, numbered section markers, label/value spec rows, palette and type.
//
// Two deliberate departures from that document:
//
//   1. NO CSS GRADIENTS. Chromium turns them into PDF shading objects with their
//      own DeviceRGB colour space, which the vector CMYK pass cannot convert
//      without rewriting shading functions. The decorative layer (atmosphere,
//      grain, gridlines) is therefore pre-rendered ONCE to a background plate
//      and used as a flat image, so the page carries flat fills + text + images
//      and nothing else. The look is identical; the colour pipeline is sound.
//
//   2. NO STAR RATINGS. The engine datasheet scores fuel efficiency out of five
//      stars; in a technical document that reads as marketing, so every value
//      here is a measured figure or an explicit capability.
//
// Everything the printer or a reader keys on is asserted before the file is
// written — see the ASSERTIONS section at the bottom.

import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { chromium } from '../.screenshots/node_modules/playwright/index.mjs';
import { toPdfxCmyk } from './pdfx_vector_cmyk.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandDir = __dirname;
const repoRoot = path.resolve(__dirname, '..');
const RGB_ONLY = process.argv.includes('--rgb-only');
// --preview also writes a PNG of each page for visual review (not a deliverable).
const PREVIEW = process.argv.includes('--preview');
// --allow-fit writes the deliverables even when fit assertions fire, so a
// too-long page can be looked at rather than only described. It never silences
// anything: every problem is still printed in full under FIT REPORT.
const ALLOW_FIT = process.argv.includes('--allow-fit');

// ---------------------------------------------------------------------------
// FIT REPORT — Ukrainian sets roughly 10–15% longer than English for the same
// copy, so this document's fit assertions are expected to fire on the UA
// variant. The wrong response to that is a quiet type-size nudge: it produces a
// sheet that fits and nobody notices it now sets 8pt where the English sets
// 9.5pt. So no check throws on its own any more. Every one of them appends here
// instead, the whole list is printed at the end of the run, and the build fails
// once — with all of it visible — so each case can be decided rather than
// absorbed.
// ---------------------------------------------------------------------------
const FIT = [];
const fit = (where, msg, detail) => FIT.push({ where, msg, detail });

// ---------------------------------------------------------------------------
// LOCALE — this document ships in two languages, and they are VARIANTS, not
// replacements: nothing the Ukrainian sheet needs is allowed to change the
// English master. Everything language-dependent lives in LOCALES below; the
// rest of the file reads the derived consts and never learns which language it
// is setting.
//
//   node brand/build_datasheet_dronestack.mjs             → English  (DS-2026-FC)
//   node brand/build_datasheet_dronestack.mjs --lang=uk   → Ukrainian (DS-2026-FC-UA)
//   node brand/build_datasheet_dronestack.mjs --both      → both, compared side by side
//
// FONT. Space Grotesk ships latin, latin-ext and vietnamese subsets and nothing
// else — verified against the Google Fonts API, there is no Cyrillic block in
// the family at all. Setting Ukrainian body copy in it does not fail loudly; it
// falls back to whatever system face Chromium finds, which puts an unintended
// (and possibly non-embedded) font into a print master. So the Ukrainian variant
// substitutes Inter for body copy — and ONLY for body copy. Headings were
// already Inter and mono labels were already JetBrains Mono; both families carry
// cyrillic (U+0400–045F) and cyrillic-ext, which covers і ї є ґ, so neither
// moves. The Ukrainian font link does not even request Space Grotesk, and
// assertFonts() reads the finished PDF back to prove which faces are embedded.
//
// TECHNICAL TOKENS. Part numbers, protocols, interfaces and units stay in Latin
// script, as they do in Ukrainian engineering documentation. Only descriptive
// text is translated: titles, standfirst, section names, prose and spec labels.
// This is asserted rather than trusted — see assertLatinTokens() and
// assertNoHomoglyphs(), the latter because Cyrillic А В Е О Р С Т Х are visually
// identical to their Latin counterparts and a single one inside "100A" or
// "STM32F405" would be invisible on the page and wrong in every search index.
// ---------------------------------------------------------------------------
const LANG = (process.argv.find(a => a.startsWith('--lang=')) || '--lang=en').split('=')[1];
if (!['en', 'uk'].includes(LANG)) throw new Error(`unknown --lang=${LANG} — want en or uk`);

// Must appear in the finished PDF in Latin script, in every language.
const LATIN_TOKENS = [
  'STM32F405', 'STM32F051', 'ICM-42688-P', 'DSHOT', 'ELRS', 'I2C', 'SBUS', 'IBUS',
  'CRSF', 'UART', 'GPIO', 'SPI', 'NDAA', 'NAS', 'ESC', 'FC', 'VTX', 'RC', 'GPS',
  '4S', '6S', '65A', '100A', '200A', 'Mbit',
];

const LOCALES = {
  // -------------------------------------------------------------------------
  en: {
    htmlLang: 'en',
    // Space Grotesk for body copy — the house text face, latin-only and fine here.
    bodyFont: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    fontLink: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800' +
              '&family=Space+Grotesk:wght@300;400;500;600;700' +
              '&family=JetBrains+Mono:wght@400;500&display=swap',
    // Faces allowed to appear in the finished PDF. Anything else is a fallback
    // that crept in, which is exactly what this variant system exists to catch.
    expectFonts: ['SpaceGrotesk', 'Inter', 'JetBrainsMono'],
    forbidFonts: [],
    doc: {
      id: 'DS-2026-FC',
      revision: '01',
      title: 'NAS Drone Stack — FC + 4-in-1 ESC',
      year: 2026,
      company: 'Nordic Advanced Systems ApS',
      confidentiality: 'Confidential',
      outBase: 'NAS_DATASHEET_DRONESTACK_2026',
    },
    ui: { doc: 'Doc', rev: 'Rev' },
    sections: { overview: 'Overview', specs: 'Technical specifications' },
    hero: {
      eyebrow: '/ Datasheet — Drone Stack',
      titleMain: 'NAS DRONE STACK',
      titleTail: '— FC + 4-IN-1 ESC',
      standfirst: 'Flight controller and ESC engineered for continuous operation. ' +
                  'Designed and manufactured in Europe.',
      ndaa: 'NDAA-compliant silicon. No components, chips or software from sanctioned manufacturers.',
    },
    overview: {
      lead: 'The NAS Drone Stack pairs a flight controller with a 4-in-1 electronic ' +
            'speed controller on a single stack. The FC carries the sensing, link and ' +
            'logging; the ESC carries the current. Built exclusively from certified ' +
            'components.',
      bullets: [
        ['Flight controller', 'STM32F405 with a 6-axis ICM-42688-P IMU and six UARTs.'],
        ['4-in-1 ESC', 'STM32F051, DSHOT motor output, 4S / 6S operation across a 12–26V input range.'],
      ],
      variantsLabel: 'Three current variants',
      variants: ['65A', '100A', '200A'],
      variantsNote: 'Maximum continuous current',
    },
    specs: [
      ['Max continuous current', '65A / 100A / 200A'],
      ['Input voltage',          '4S / 6S · 12–26V'],
      ['Flight controller MCU',  'STM32F405'],
      ['ESC MCU',                'STM32F051'],
      ['IMU',                    'ICM-42688-P, 6-axis'],
      ['Blackbox',               '128 Mbit integrated SPI flash'],
      ['UART',                   '6 × (VTX, RC, ESC telemetry, GPS)'],
      ['GPIO',                   '2 × configurable'],
      ['Protocols',              'ELRS · I2C · SBUS / IBUS / CRSF'],
      ['Camera',                 'Dual, 5V and 12V up to 2A'],
      ['Motor output',           'DSHOT, quad'],
      ['Power rails',            '5V / 12V selectable, up to 2A'],
    ],
    diagrams: [
      { n: '03', title: 'Pinout reference', src: 'assets/fragment.png', redact: true,
        caption: 'Flight controller · ESC — pad and connector assignment',
        // No key in English: the drawings are already in English.
        key: [] },
      { n: '04', title: 'Wiring', src: 'assets/ESC.jpeg',
        caption: '4-in-1 ESC — motor, battery and FC connections',
        key: [] },
    ],
    omittedSpecs: ['Physical dimensions', 'Mounting hole pattern', 'Operating temperature'],
    omittedNote: 'Mechanical drawings issued at Rev 02',
  },

  // -------------------------------------------------------------------------
  // Ukrainian. Roughly 10–15% longer than the English for the same content,
  // which is why the fit report exists rather than a quiet type-size nudge.
  uk: {
    htmlLang: 'uk',
    // THE substitution. Inter carries Cyrillic; Space Grotesk does not.
    bodyFont: '"Inter", ui-sans-serif, system-ui, sans-serif',
    // Space Grotesk is not even requested here, so it cannot be reached by
    // accident through an inherited rule.
    fontLink: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800' +
              '&family=JetBrains+Mono:wght@400;500&display=swap',
    expectFonts: ['Inter', 'JetBrainsMono'],
    forbidFonts: ['SpaceGrotesk'],
    doc: {
      // -UA per the brief. Revision stays 01: this is the same document in
      // another language, not a newer one.
      id: 'DS-2026-FC-UA',
      revision: '01',
      title: 'NAS Drone Stack — FC + 4-in-1 ESC (UA)',
      year: 2026,
      company: 'Nordic Advanced Systems ApS',
      confidentiality: 'Конфіденційно',
      outBase: 'NAS_DATASHEET_DRONESTACK_2026_UA',
    },
    // NOT translated, deliberately. The document reference is an identifier
    // before it is a phrase: a Ukrainian customer has to be able to quote
    // "DOC DS-2026-FC-UA REV 01" to a Danish rep and have both people read the
    // same string. Конфіденційно below IS translated, because a handling
    // marking that the reader cannot read does not mark anything.
    ui: { doc: 'Doc', rev: 'Rev' },
    sections: { overview: 'Огляд', specs: 'Технічні характеристики' },
    hero: {
      eyebrow: '/ Технічний опис — Drone Stack',
      // Product name — not translated, exactly as NAS writes it everywhere else.
      titleMain: 'NAS DRONE STACK',
      titleTail: '— FC + 4-IN-1 ESC',
      standfirst: 'Політний контролер і ESC, розроблені для тривалої безперервної роботи. ' +
                  'Розробка та виробництво в Європі.',
      // "Відповідність" mirrors the English "compliant", not "certified" — the
      // two documents must not say different things about NDAA §889 status.
      ndaa: 'Відповідність NDAA. Жодних компонентів, мікросхем чи програмного забезпечення ' +
            'від виробників під санкціями.',
    },
    overview: {
      lead: 'NAS Drone Stack поєднує політний контролер і 4-in-1 регулятор обертів ' +
            'двигунів в одному стеку. FC відповідає за датчики, зв’язок і журналювання; ' +
            'ESC — за струм. Зібрано виключно із сертифікованих компонентів.',
      bullets: [
        ['Політний контролер', 'STM32F405 з 6-осьовим IMU ICM-42688-P та шістьма UART.'],
        ['4-in-1 ESC', 'STM32F051, вихід DSHOT на двигуни, робота 4S / 6S у діапазоні входу 12–26V.'],
      ],
      variantsLabel: 'Три струмові варіанти',
      variants: ['65A', '100A', '200A'],
      variantsNote: 'Максимальний тривалий струм',
    },
    specs: [
      ['Макс. тривалий струм',     '65A / 100A / 200A'],
      ['Вхідна напруга',           '4S / 6S · 12–26V'],
      ['MCU політного контролера', 'STM32F405'],
      ['MCU ESC',                  'STM32F051'],
      ['IMU',                      'ICM-42688-P, 6 осей'],
      // Blackbox stays Latin: it is the feature's name in Betaflight and it is
      // what Ukrainian FPV documentation calls it. Translating it to "чорна
      // скринька" would make the row harder to match against the firmware UI.
      ['Blackbox',                 '128 Mbit, вбудована SPI flash'],
      ['UART',                     '6 × (VTX, RC, телеметрія ESC, GPS)'],
      ['GPIO',                     '2 × налаштовувані'],
      ['Протоколи',                'ELRS · I2C · SBUS / IBUS / CRSF'],
      ['Камера',                   'Дві, 5V і 12V до 2A'],
      ['Вихід на двигуни',         'DSHOT, 4 канали'],
      ['Лінії живлення',           '5V / 12V на вибір, до 2A'],
    ],
    diagrams: [
      { n: '03', title: 'Призначення виводів', src: 'assets/fragment.png', redact: true,
        caption: 'Політний контролер · ESC — призначення площадок і роз’ємів',
        // English term first, because that is the string physically printed on
        // the drawing the reader is looking at; the translation follows it.
        key: [
          ['Camera A / B',       'Камера A / B'],
          ['Extra Power',        'Додаткове живлення'],
          ['Video Transmitter',  'Відеопередавач'],
        ] },
      { n: '04', title: 'Схема підключення', src: 'assets/ESC.jpeg',
        caption: '4-in-1 ESC — підключення двигунів, акумулятора та FC',
        key: [
          ['XT60 Power Cable',         'Кабель живлення XT60'],
          ['1500uF Low ESR Capacitor', 'Конденсатор 1500uF, низький ESR'],
          ['Motor 1–4',                'Двигуни 1–4'],
          ['Extra Power',              'Додаткове живлення'],
        ] },
    ],
    omittedSpecs: ['Габаритні розміри', 'Розташування монтажних отворів', 'Робоча температура'],
    omittedNote: 'Механічні креслення — у Rev 02',
  },
};

const L = LOCALES[LANG];

// ---------------------------------------------------------------------------
// CONFIG — the document's identity, now supplied by the active locale. Nothing
// below this line hardcodes a language. The engine datasheet is DS-2026; this
// document gets its own number so the two can never be confused in a filename,
// a print queue or a version conversation. REVISION goes to 02 when physical
// dimensions arrive (see OMITTED_SPECS) — in BOTH languages, together.
// ---------------------------------------------------------------------------
const DOC = L.doc;

// Rows that are deliberately absent. A datasheet with "TBD" in it reads as an
// unfinished product, so these are omitted entirely rather than shown empty.
// When the measurements land, add them here and bump DOC.revision to '02'.
const OMITTED_SPECS = L.omittedSpecs;
// Shown on the page so the gap is declared rather than silently absent.
const OMITTED_NOTE = L.omittedNote;

// ---- page geometry (mm) ----
const PAGE_W = 210, PAGE_H = 297;
const PAD_X = 20, PAD_TOP = 14, PAD_BOTTOM = 18;
const CONTENT_W = PAGE_W - 2 * PAD_X;        // 170
const FOOTER_BOTTOM = 10;                    // footer sits 10mm from page bottom
// Seal offset from the page bottom. The footer band (rule + 4mm padding + 7pt
// line, from FOOTER_BOTTOM up) tops out near 17mm, so 22mm leaves ~5mm of clear
// air beneath the seal. Asserted, not assumed.
const STAMP_BOTTOM = 22;

// ---- brand tokens (flat — no gradients) ----
const T = {
  bg: '#08202a', ink: '#ffffff', ink2: '#edf2f3',
  accent: '#3bb6e8', line: 'rgba(148,205,221,0.14)', accentDim: 'rgba(59,182,232,0.18)',
  panelFill: '#ffffff',
};
// Panel spec lifted from the business-card QR panel so the two carry the same
// detailing: same corner radius, same hairline cyan stroke, same white fill.
// padMm was 16 in the brief. At 16 the two panels cost 64mm across the two
// pages and the solver drove the wiring diagram down to 38mm wide — a diagram
// with text labels on it, rendered too small to read, which defeats the point
// of printing it. 6mm keeps the panel reading as the same component as the
// business-card QR panel (same stroke, same radius, same white fill) while
// giving both diagrams a legible size. Raise it back to 16 and the diagrams
// shrink again — that is the trade.
const PANEL = { radiusMm: 1.8, strokeMm: 0.22, padMm: 6 };

// ---- shared diagram width --------------------------------------------------
// ONE width for every language variant, so both sheets show the drawings at the
// same size and can be laid side by side. This is a constant rather than a
// per-language solve because a solver optimises for the page it is handed, and
// Ukrainian page 2 carries two translation keys that the English page does not.
// Left to itself the solver answered 93.6mm for English and 83.3mm for
// Ukrainian — which is exactly the mismatch a two-language datasheet must not
// have, and it would not have announced itself.
//
// The value is the CONSTRAINED language's answer: what fits the fullest page
// fits the emptier one. Re-derive it with --solve-width (which runs the old
// search and prints what it would pick, per language, without writing files) if
// the artwork or the copy changes. The build fails if the pinned width no
// longer fits, rather than quietly shrinking back.
const DIAGRAM_W_MM = 83.0;
const SOLVE_WIDTH = process.argv.includes('--solve-width');

// ---------------------------------------------------------------------------
// CONTENT — supplied by the active locale (see LOCALES at the top of the file).
// The English strings are the master; the Ukrainian ones are a translation of
// the same document, not a different document.
// ---------------------------------------------------------------------------
// The only claim worth keeping from the removed capability grid: the other
// three cards (blackbox, dual camera, ELRS) all restate rows of the spec table.
//
// "compliant", NOT "certified". The printed roll-up says NDAA COMPLIANT and the
// two documents must not contradict each other. It is also the accurate word:
// NDAA §889 status is a self-declared contractual position — there is no
// certifying body — which is how the website's own explanation puts it.
// Note this is a DIFFERENT claim from "certified components" in OVERVIEW.lead,
// which is about component sourcing and stays as it is.
const HERO = L.hero;

// Only the two boards. The four capability bullets went with the card grid:
// three of them (blackbox, dual camera, ELRS) restate rows of the spec table,
// and the NDAA claim survives as HERO.ndaa under the standfirst.
//
// The current variants are TOTAL across all four outputs, not per motor
// (client-confirmed). The earlier "per motor output" wording overstated the
// rating fourfold. No qualifier at all, at the client's request — do not re-add.
const OVERVIEW = L.overview;

// The Kolibri airframe photograph is gone: it pictures someone else's aircraft
// rather than the product, and a datasheet reader gets nothing from it. The two
// diagrams carry the document visually instead.

// ORIGIN section removed — it said nothing the page had not already said. The
// standfirst carries "Designed and manufactured in Europe" and capability card 01
// carries the sanctioned-manufacturer point, so the box was the third telling of
// the same two facts. The content is not lost, only the duplicate.

// Section 04 — every value is a figure or an explicit capability. No ratings.
// No "(three variants)" on the current row — the band directly above the table
// already says THREE CURRENT VARIANTS, a few centimetres away on the same page.
const SPECS = L.specs;

// The two diagrams are the document's visual spine now that the airframe photo
// is gone. They share the panel treatment — cyan hairline, 1.8 mm radius, white
// fill, 6 mm padding — and, on this layout, one shared width and one shared
// centre. Their heights differ because their shapes do:
//   pinout (landscape 1.72) — a wide band closing page 2
//   wiring (portrait  0.82) — a tall plate beneath it
// Only the titles and captions are localised; the source artwork is shared, so
// the two language variants are guaranteed to show identical drawings.
const DIAGRAMS = L.diagrams;

// ---------------------------------------------------------------------------
// image prep — composite away alpha, size for the placement, embed as data URI
// ---------------------------------------------------------------------------
// Transparency is the usual cause of RIP surprises, and an SMask would also have
// to be carried through the CMYK pass, so every image is flattened onto the
// background it actually sits on before it reaches the PDF.
// ---- IP redaction outlines -------------------------------------------------
// fragment.png has three chip areas deliberately blurred out. Unmarked they read
// as a damaged scan; a thin cyan rule around each says "withheld on purpose".
//
// The rectangles are NOT eyeballed. They were found by measuring local Laplacian
// energy across the board: sharp silkscreen, solder mask and component edges give
// a high value, a blurred patch gives almost none. Three components came back
// solid (97–100% fill) at plausible chip sizes; a fourth (the USB-C shield, also
// smooth) came back 53% filled and was rejected on that basis. Coordinates are in
// untrimmed fragment.png pixels, expanded 2px so the rule frames the blur rather
// than cutting into its soft edge.
//
// If the artwork is ever re-exported these coordinates go stale. REDACTION_CHECK
// re-runs the detection at build time and fails if the boxes no longer sit on
// low-detail areas, so a stale outline cannot reach print silently.
const REDACTIONS = [
  { x: 363, y: 286, w: 106, h: 107 },   // centre — main MCU
  { x: 243, y: 315, w: 64, h: 88 },     // left
  { x: 427, y: 411, w: 74, h: 58 },     // lower
];
// 3.5 source px lands at 0.269mm printed — the same weight as the 1px CSS corner
// brackets on the figure plates.
const REDACTION_STROKE_PX = 3.5;

function redactionOverlay(imgW, imgH) {
  const rects = REDACTIONS.map(r =>
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" ` +
    `stroke="${T.accent}" stroke-width="${REDACTION_STROKE_PX}"/>`).join('');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">${rects}</svg>`);
}

// Confirm each rectangle still sits on a blurred area of the CURRENT artwork.
async function verifyRedactions(srcRel) {
  const { data, info } = await sharp(path.join(repoRoot, srcRel))
    .flatten({ background: '#ffffff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const g = (x, y) => data[y * W + x];
  const out = [];
  for (const r of REDACTIONS) {
    let sum = 0, lum = 0, n = 0;
    for (let y = r.y + 4; y < r.y + r.h - 4; y++) {
      for (let x = r.x + 4; x < r.x + r.w - 4; x++) {
        if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
        sum += Math.abs(4 * g(x, y) - g(x - 1, y) - g(x + 1, y) - g(x, y - 1) - g(x, y + 1));
        lum += g(x, y);
        n++;
      }
    }
    // Detail alone is not enough: blank paper is also perfectly smooth, so a box
    // that drifted off the board entirely would pass a detail-only test. The
    // redacted chips sit mid-grey on a near-black board, so brightness pins it
    // to the artwork as well as to a blurred area.
    out.push({ ...r, detail: n ? sum / n : Infinity, lum: n ? lum / n : 255 });
  }
  return out;
}

async function placeImage(srcRel, widthMm, bgHex, targetDpi = 300, redact = false) {
  const src = path.join(repoRoot, srcRel);
  const meta = await sharp(src).metadata();

  // Trim the dead white border baked into the source artwork BEFORE sizing.
  // fragment.png carries 22% empty margin and ESC.jpeg 15%; left in, that margin
  // becomes plate area, which is why the diagrams read as small objects adrift in
  // big white boxes. Trimming first means the plate hugs the drawing and the
  // same page area buys a visibly larger diagram.
  const { r, g, b } = hexRgb(bgHex);
  let pre = sharp(src);
  if (meta.hasAlpha) pre = pre.flatten({ background: { r, g, b } });
  // Outlines go on BEFORE the trim and the resize, so they are drawn at source
  // resolution and scale down with the artwork rather than being pasted on after.
  if (redact) {
    pre = sharp(await pre.composite([
      { input: redactionOverlay(meta.width, meta.height), top: 0, left: 0 },
    ]).png().toBuffer());
  }
  const trimmed = await pre.trim({ background: '#ffffff', threshold: 12 }).toBuffer()
    .catch(() => null);
  const base = trimmed ? sharp(trimmed) : (meta.hasAlpha
    ? sharp(src).flatten({ background: { r, g, b } }) : sharp(src));
  const baseMeta = await base.clone().metadata();

  const wantPx = Math.round(widthMm / 25.4 * targetDpi);
  // Never upscale: a bigger pixel count invents detail that is not in the source.
  const outPx = Math.min(wantPx, baseMeta.width);
  const img = base.resize({ width: outPx, withoutEnlargement: true });
  const buf = await img.png({ compressionLevel: 9 }).toBuffer();
  const finalMeta = await sharp(buf).metadata();
  const dpi = finalMeta.width / (widthMm / 25.4);
  return {
    srcRel, widthMm, dpi,
    aspect: finalMeta.width / finalMeta.height,
    trimmedFrom: meta.width + 'x' + meta.height,
    sourcePx: baseMeta.width, placedPx: finalMeta.width,
    dataUri: 'data:image/png;base64,' + buf.toString('base64'),
  };
}
function hexRgb(h) {
  const v = h.replace('#', '');
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
}

// ---------------------------------------------------------------------------
// background plate — the decorative layer, rendered once to a flat image so the
// page itself carries no gradients (see the header note).
// ---------------------------------------------------------------------------
async function renderPlate(browser) {
  const DPI = 200;
  const w = Math.round(PAGE_W / 25.4 * DPI), h = Math.round(PAGE_H / 25.4 * DPI);
  const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden}
    .plate{position:relative;width:${w}px;height:${h}px;background:
      radial-gradient(${110 / PAGE_W * 100}% ${70 / PAGE_H * 100}% at 85% -5%, rgba(59,182,232,0.10), transparent 60%),
      radial-gradient(${95 / PAGE_W * 100}% ${65 / PAGE_H * 100}% at -10% 25%, rgba(14,70,85,0.55), transparent 65%),
      radial-gradient(${120 / PAGE_W * 100}% ${80 / PAGE_H * 100}% at 50% 115%, rgba(59,182,232,0.06), transparent 60%),
      ${T.bg};}
    /* line weight = 1 CSS px at 96 dpi, the weight both other NAS documents use */
    .grid{position:absolute;inset:0;background-image:
      linear-gradient(to right, rgba(59,182,232,0.04) ${DPI/96}px, transparent ${DPI/96}px),
      linear-gradient(to bottom, rgba(59,182,232,0.04) ${DPI/96}px, transparent ${DPI/96}px);
      background-size:${20 / 25.4 * DPI}px ${20 / 25.4 * DPI}px;}
    .grain{position:absolute;inset:0;opacity:.04;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.9 0 0 0 0 0.95 0 0 0 0 1 0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");}
  </style></head><body><div class="plate"><div class="grid"></div><div class="grain"></div></div></body></html>`);
  await page.waitForTimeout(200);
  const buf = await page.locator('.plate').screenshot({ type: 'png' });
  await page.close();
  return 'data:image/png;base64,' + buf.toString('base64');
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pageNo = (i, total) => `${String(i).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

function header() {
  return `<div class="page-header">
    <div class="brand-mark"><img class="brand-logo" src="LOGO_URI" alt="NAS"> Nordic Advanced Systems</div>
    <div class="doc-id">${esc(L.ui.doc)} <span class="dot">·</span> ${esc(DOC.id)} <span class="dot">·</span> ${esc(L.ui.rev)} ${esc(DOC.revision)}</div>
  </div>`;
}
function footer(i, total) {
  return `<div class="page-footer">
    <div>© ${DOC.year} ${esc(DOC.company)} <span class="dot">·</span> ${esc(DOC.confidentiality)}</div>
    <div class="pageno">${pageNo(i, total)}</div>
  </div>`;
}
// Company-profile section module: a large cyan number in a 16mm left gutter,
// title and body indented into the column beside it, hairline rule above.
// Replaces the full-width "/ 01 — OVERVIEW" bar this document used before.
function numbered(n, title, body) {
  return `<div class="numbered-section">
    <div class="section-num">${esc(n)}</div>
    <div class="section-body">
      <h3>${esc(title)}</h3>
      ${body}
    </div>
  </div>`;
}

// Company-profile image treatment: cyan corner brackets, no rounded border and
// no fill of its own. These diagrams are dark-on-light artwork, so a white plate
// stays underneath for legibility — the brackets frame the plate instead of a
// border boxing it in.
function figure(dataUri, widthMm) {
  return `<div class="fig" style="width:${widthMm}mm">
      <img class="diagram" src="${dataUri}" alt="">
      <div class="mc mc-tl"></div><div class="mc mc-tr"></div>
      <div class="mc mc-bl"></div><div class="mc mc-br"></div>
    </div>`;
}

// Key for the labels silkscreened into a diagram. Empty in English, where the
// drawing already reads. Mono and small, like the caption above it — it is
// reference furniture, not body copy, and must not compete with the drawing.
function diagramKey(pairs, widthMm) {
  if (!pairs || !pairs.length) return '';
  // Held to the width of the plate it belongs to. That is correct typographically
  // — a legend should not be wider than its figure — and it is also what keeps
  // the key clear of the NAS seal in the bottom-right corner: the plate is
  // centred in the column and already stops short of the seal, so anything no
  // wider than the plate stops short of it too.
  return `<div class="diagkey" style="max-width:${widthMm}mm">` + pairs.map(([en, uk]) =>
    `<span class="k"><i>${esc(en)}</i>${esc(uk)}</span>`).join('') + `</div>`;
}

function buildHtml({ plateUri, logoUri, stampUri, diagrams, total }) {
  const specRows = SPECS.map(([l, v]) =>
    `<tr><td class="label">${esc(l)}</td><td class="value">${esc(v)}</td></tr>`).join('');

  // The two hardware bullets stay running text — they describe what the boards
  // ARE. The four capabilities become cards, because they are parallel claims of
  // the same shape and a flat list made them all look alike.
  const hardware = OVERVIEW.bullets;

  // PAGE 1 — the product. Hero, the headline numbers, what it is, what it does.
  //
  // The variants band moves up to sit directly under the standfirst. 65A/100A/
  // 200A is the strongest thing this product has to say, and buried in the middle
  // of a section it read as a footnote of the overview; given the full width and
  // its own rules it anchors the page.
  //
  // "/ 01 Overview" used to carry the intro, the bullets, the cards AND the
  // variants — four jobs, which is why it sprawled. It now carries one.
  const page1 = `<section class="page" data-page="1">
    ${header()}
    <div class="ds-hero">
      <div class="eyebrow">${esc(HERO.eyebrow)}</div>
      <h1>${esc(HERO.titleMain)} <span class="accent">${esc(HERO.titleTail)}</span></h1>
      <p class="lede">${esc(HERO.standfirst)}</p>
      <p class="ndaa">${esc(HERO.ndaa)}</p>
    </div>
    <div class="vband">
      <div class="vlabel">${esc(OVERVIEW.variantsLabel)}</div>
      <div class="vrow">${OVERVIEW.variants.map(v => `<span class="v">${esc(v)}</span>`).join('<span class="vsep">·</span>')}</div>
      <div class="vnote">${esc(OVERVIEW.variantsNote)}</div>
    </div>
    ${numbered('01', L.sections.overview, `
      <p>${esc(OVERVIEW.lead)}</p>
      <div class="bullet-list">
        ${hardware.map(([k, t]) => `<div class="b"><span class="dot">—</span><span><b>${esc(k)}</b> ${esc(t)}</span></div>`).join('')}
      </div>`)}
    ${numbered('02', L.sections.specs, `
      <table class="spec-table">${specRows}</table>
      <div class="footnote">${esc(OMITTED_NOTE)}</div>`)}
    ${footer(1, total)}
  </section>`;

  // PAGE 2 — both diagrams, stacked, at one shared width and one shared centre.
  // Removing the capability grid is what pays for this: with the spec table moved
  // up to page 1, page 2 carries nothing but the two figures, so neither has to
  // be squeezed and they can be measured against each other.
  const page2 = `<section class="page" data-page="2">
    ${header()}
    ${numbered(DIAGRAMS[0].n, DIAGRAMS[0].title, `
      <div class="figwrap wide">
        ${figure(diagrams[0].dataUri, diagrams[0].figWmm)}
        <div class="diagcap">${esc(DIAGRAMS[0].caption)}</div>
        ${diagramKey(DIAGRAMS[0].key, diagrams[0].figWmm)}
      </div>`)}
    ${numbered(DIAGRAMS[1].n, DIAGRAMS[1].title, `
      <div class="figwrap wide">
        ${figure(diagrams[1].dataUri, diagrams[1].figWmm)}
        <div class="diagcap">${esc(DIAGRAMS[1].caption)}</div>
        ${diagramKey(DIAGRAMS[1].key, diagrams[1].figWmm)}
      </div>`)}
    <div class="ds-stamp"><img src="${stampUri}" alt=""></div>
    ${footer(2, total)}
  </section>`;


  return `<!doctype html><html lang="${L.htmlLang}"><head><meta charset="utf-8">
<title>${esc(DOC.title)} — ${esc(DOC.id)} ${esc(L.ui.rev)} ${esc(DOC.revision)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${L.fontLink}" rel="stylesheet">
<style>
:root{
  --bg:${T.bg}; --ink:${T.ink}; --ink2:${T.ink2};
  --accent:${T.accent}; --line:${T.line}; --accent-dim:${T.accentDim};
}
@page{ size:A4 portrait; margin:0; }
*,*::before,*::after{ box-sizing:border-box; }
html,body{ margin:0; padding:0; background:var(--bg); color:var(--ink);
  font-family:${L.bodyFont}; font-weight:400;
  -webkit-font-smoothing:antialiased; }

.page{ position:relative; width:${PAGE_W}mm; height:${PAGE_H}mm;
  padding:${PAD_TOP}mm ${PAD_X}mm ${PAD_BOTTOM}mm;
  background-image:url("${plateUri}"); background-size:${PAGE_W}mm ${PAGE_H}mm;
  background-color:var(--bg); color:var(--ink); overflow:hidden;
  page-break-after:always; break-after:page; }
.page:last-child{ page-break-after:auto; break-after:auto; }

h1,h2,h3{ font-family:'Inter',system-ui,sans-serif; font-weight:600; line-height:1.04;
  letter-spacing:-0.02em; margin:0; color:var(--ink); }
h1{ font-size:24pt; font-weight:700; letter-spacing:-0.03em; line-height:1.02; }
h2{ font-size:17pt; line-height:1.15; letter-spacing:-0.02em; margin-bottom:5mm; }
p{ margin:0; color:var(--ink); font-size:9.5pt; line-height:1.55; }
b{ font-weight:700; color:var(--ink); }
.accent{ color:var(--accent); }
.dot{ color:var(--accent); }

.eyebrow{ font-family:"JetBrains Mono",ui-monospace,monospace; font-size:8.5pt; font-weight:500;
  letter-spacing:0.22em; text-transform:uppercase; color:var(--accent);
  display:flex; align-items:center; gap:10px; }
.eyebrow::before{ content:""; display:inline-block; width:18mm; height:1px;
  background:var(--accent); opacity:.8; }

.page-header{ display:flex; justify-content:space-between; align-items:center;
  border-bottom:1px solid var(--line); padding-bottom:4mm; margin-bottom:5mm;
  position:relative; z-index:2; }
.brand-mark{ display:flex; align-items:center; gap:16px;
  font-family:"JetBrains Mono",ui-monospace,monospace; font-size:10pt; font-weight:500;
  letter-spacing:0.26em; text-transform:uppercase; color:var(--ink2); }
.brand-logo{ width:14mm; height:14mm; object-fit:contain; filter:brightness(0) invert(1); display:block; }
.doc-id{ font-family:"JetBrains Mono",ui-monospace,monospace; font-size:9pt; font-weight:500;
  letter-spacing:0.2em; text-transform:uppercase; color:var(--ink2); white-space:nowrap; }

.page-footer{ position:absolute; bottom:${FOOTER_BOTTOM}mm; left:${PAD_X}mm; right:${PAD_X}mm;
  display:flex; justify-content:space-between; align-items:center;
  font-family:"JetBrains Mono",ui-monospace,monospace; font-size:7pt; font-weight:500;
  letter-spacing:0.18em; text-transform:uppercase; color:var(--ink2);
  border-top:1px solid var(--line); padding-top:4mm; white-space:nowrap; z-index:3; }

.ds-hero{ margin-bottom:2mm; }
.ds-hero .eyebrow{ margin-bottom:4mm; }
.sub-mono{ font-family:"JetBrains Mono",ui-monospace,monospace; font-size:9pt; font-weight:500;
  letter-spacing:0.22em; text-transform:uppercase; color:var(--accent); margin-top:2.5mm; }
.ndaa{ margin-top:2.4mm; font-size:8.2pt; line-height:1.4; color:var(--ink2);
  max-width:158mm; }
.lede{ margin-top:3mm; font-size:9.4pt; line-height:1.45; max-width:158mm; }

/* ---- company-profile section module ----------------------------------------
   Large cyan number in a 16mm left gutter, title and body in the column beside
   it, hairline rule above. Lifted from NAS_COMPANY_PROFILE_2026 so the two
   documents read as one system. */
.numbered-section{ display:grid; grid-template-columns:16mm 1fr; gap:5mm;
  padding:4mm 0; border-top:1px solid var(--line); }
.section-num{ font-family:'Inter',sans-serif; font-size:16pt; font-weight:300;
  color:var(--accent); letter-spacing:-0.02em; line-height:1; }
.section-num::before{ content:"/ "; font-weight:400; opacity:0.6; }
.section-body h3{ font-family:'Inter',sans-serif; font-size:12pt; font-weight:600;
  letter-spacing:-0.015em; color:var(--ink); margin:0 0 2mm; }
.section-body p{ color:var(--ink); font-size:9pt; line-height:1.45; }
.section-body p + p{ margin-top:1.5mm; }

/* ---- capability cards (profile's TEST PROTOCOL grid) ---- */
.proto-eyebrow{ font-family:"JetBrains Mono",ui-monospace,monospace; font-size:7.5pt;
  font-weight:500; letter-spacing:0.22em; text-transform:uppercase; color:var(--accent);
  margin-top:3mm; display:flex; align-items:center; gap:6px; }
.proto-grid{ position:relative; margin-top:1mm; display:grid;
  grid-template-columns:1fr 1fr; gap:5.5mm; }
.proto-card{ position:relative; padding:4.2mm 4.5mm; background:rgba(13,42,49,0.55);
  border:1px solid rgba(59,182,232,0.18); border-radius:1.5mm; min-height:30mm; }
.proto-card::after{ content:""; position:absolute; top:2.5mm; right:2.5mm;
  width:1.6mm; height:1.6mm; background:var(--accent); border-radius:50%; opacity:0.7; }
.proto-card .pnum{ font-family:"JetBrains Mono",ui-monospace,monospace; font-size:7.5pt;
  font-weight:500; letter-spacing:0.22em; color:var(--accent); margin-bottom:1.4mm; }
.proto-card .plabel{ font-family:'Inter',sans-serif; font-size:9.5pt; font-weight:600;
  letter-spacing:0.04em; text-transform:uppercase; line-height:1.15; color:var(--ink);
  margin-bottom:1.4mm; }
.proto-card .pdesc{ font-size:8.1pt; line-height:1.45; color:var(--ink2); }

/* ---- profile bullet list ---- */
.bullet-list{ margin-top:2mm; display:flex; flex-direction:column; gap:0; }
.bullet-list .b{ display:flex; align-items:flex-start; gap:3mm; padding:1.9mm 0;
  border-bottom:1px solid var(--line); font-size:8.5pt; line-height:1.45; color:var(--ink); }
.bullet-list .b:first-child{ border-top:1px solid var(--line); }
.bullet-list{ margin-top:2.5mm; }
.bullet-list .b .dot{ flex-shrink:0; font-family:"JetBrains Mono",ui-monospace,monospace;
  font-size:7.5pt; color:var(--accent); opacity:0.9; padding-top:0.3mm; }


/* ---- variants band: the page-1 anchor, full content width ---- */
.vband{ margin:5mm 0 2mm; padding:5mm 0 5.5mm; text-align:center;
  border-top:1px solid var(--accent-dim); border-bottom:1px solid var(--accent-dim); }
.footnote{ margin-top:2.5mm; display:inline-flex; align-items:center; gap:6px;
  padding:1.4mm 2.8mm; border:1px solid var(--accent-dim); border-left:2px solid var(--accent);
  background:rgba(59,182,232,0.06); border-radius:1mm;
  font-family:"JetBrains Mono",ui-monospace,monospace; font-size:6.5pt; font-weight:500;
  letter-spacing:0.14em; text-transform:uppercase; color:var(--accent); }
.footnote::before{ content:"+"; font-size:9.5pt; font-weight:700; line-height:1; opacity:0.75; }

.section-block{ margin-bottom:4mm; }
/* ---- diagram key ----------------------------------------------------------
   Same mono family and tracking family as .diagcap, one step down in size and
   held at ink2 rather than accent so the caption stays the louder line. The
   English term keeps the accent colour because it is the string the reader is
   hunting for on the drawing; the translation follows in text colour. Mixed
   case, not uppercase: uppercase Cyrillic is appreciably wider and this block
   has to earn its millimetres on a page that is already full. */
.diagkey{ margin-top:2mm; display:flex; flex-wrap:wrap; justify-content:center;
  gap:0.9mm 4.5mm;
  font-family:"JetBrains Mono",ui-monospace,monospace; font-size:6.2pt; font-weight:400;
  letter-spacing:0.04em; line-height:1.35; color:var(--ink2); }
.diagkey .k{ display:inline-flex; align-items:baseline; gap:1.4mm; white-space:nowrap; }
.diagkey i{ font-style:normal; font-weight:500; color:var(--accent); opacity:.85; }
.diagkey i::after{ content:" ·"; opacity:.6; }
.diagcap{ font-family:"JetBrains Mono",ui-monospace,monospace; font-size:7.5pt;
  font-weight:500; letter-spacing:0.16em; text-transform:uppercase; color:var(--accent);
  margin-top:2.5mm; }

.vlabel{ font-family:"JetBrains Mono",ui-monospace,monospace; font-size:7.5pt; font-weight:500;
  letter-spacing:0.18em; text-transform:uppercase; color:var(--ink2); }
.vrow{ margin-top:2.5mm; display:flex; align-items:baseline; justify-content:center; gap:5mm;
  font-family:'Inter',sans-serif; font-weight:700; font-size:26pt; color:var(--accent);
  letter-spacing:-0.02em; line-height:1; }
.vsep{ opacity:.55; font-weight:400; }
.vnote{ margin-top:3mm; font-family:"JetBrains Mono",ui-monospace,monospace;
  font-size:7pt; font-weight:500; letter-spacing:0.2em; text-transform:uppercase;
  color:var(--ink2); opacity:.75; }

.origin-box{ padding:3.6mm 4.5mm; border:1px solid var(--accent-dim); border-left:2px solid var(--accent);
  background:rgba(59,182,232,0.05); font-family:'Inter',sans-serif; font-weight:600; font-size:10pt;
  line-height:1.35; }

.spec-table{ width:100%; border-collapse:collapse; font-feature-settings:"tnum"; }
.spec-table tr{ border-bottom:1px solid var(--line); }
.spec-table tr:last-child{ border-bottom:0; }
.spec-table td{ padding:1.6mm 3mm; vertical-align:top; font-size:8.5pt; line-height:1.35; }
.spec-table td.label{ font-family:"JetBrains Mono",ui-monospace,monospace; font-size:8pt;
  font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:var(--ink2);
  width:44%; white-space:nowrap; }
.spec-table td.value{ color:var(--ink); font-weight:500; }

/* ---- diagram figures: profile corner-bracket treatment --------------------
   No rounded border and no panel fill — the frame IS the four cyan brackets,
   exactly as on the profile's test-rig photo and NAS 2 schematic. These two
   diagrams are dark artwork on light ground, so a white plate stays behind them
   for legibility; the brackets sit on its corners. Same 3.5mm bracket, same 1px
   cyan stroke, same 1.2mm inset as the profile. */
.figwrap{ display:flex; flex-direction:column; align-items:flex-start; }
.figwrap.wide{ align-items:center; }
.fig{ position:relative; background:${T.panelFill}; padding:${PANEL.padMm}mm; }
.fig .diagram{ display:block; width:100%; }
.fig .mc{ position:absolute; width:3.5mm; height:3.5mm;
  border:1px solid var(--accent); opacity:0.8; }
.fig .mc-tl{ top:1.2mm; left:1.2mm; border-right:0; border-bottom:0; }
.fig .mc-tr{ top:1.2mm; right:1.2mm; border-left:0; border-bottom:0; }
.fig .mc-bl{ bottom:1.2mm; left:1.2mm; border-right:0; border-top:0; }
.fig .mc-br{ bottom:1.2mm; right:1.2mm; border-left:0; border-top:0; }

.ref-page{ display:flex; flex-direction:column; }
.ref-page .page-header{ flex:0 0 auto; }
.ref-page .numbered-section{ flex:1 1 auto; display:grid; align-content:center;
  border-top:1px solid var(--line); }
/* NAS seal — same 20mm circle and same right margin as the engine datasheet.
   Its bottom offset is NOT the engine's 14mm: the footer band reaches roughly
   17mm up the page, so at 14mm the seal sits partly inside it, which is the
   overlap this document is required not to reproduce. STAMP_BOTTOM clears the
   band with a margin, and assertLayout fails the build if it ever stops doing so. */
.ds-stamp{ position:absolute; bottom:${STAMP_BOTTOM}mm; right:${PAD_X}mm; width:20mm; height:20mm; z-index:2; opacity:.85; }
.ds-stamp img{ width:100%; height:100%; object-fit:contain; display:block; }
</style></head><body>${page1}${page2}</body></html>`
    .replace(/LOGO_URI/g, logoUri);
}

// ---------------------------------------------------------------------------
// ASSERTIONS — measured on the live DOM, before any PDF is written
// ---------------------------------------------------------------------------
// ---- panel geometry -------------------------------------------------------
// The two diagram panels are one component used twice, so "they look about the
// same" is not good enough: width, left edge and centre are measured off the
// render and must match to a rounding tolerance. Height is expected to DIFFER —
// it is the image's aspect ratio plus the padding, and the two images are not
// the same shape. Fill is the image box against the panel's inner box; at 100%
// the image meets the padding on all four edges with no floating.
async function measurePanels(page, contentWmm) {
  return page.evaluate((contentWmm) => {
    const out = [];
    document.querySelectorAll('.page').forEach((pg) => {
      const pr = pg.getBoundingClientRect();
      const pxPerMm = pr.width / 210;
      const mm = (px) => +(px / pxPerMm).toFixed(2);
      const colLeft = pr.left + parseFloat(getComputedStyle(pg).paddingLeft);
      pg.querySelectorAll('.figwrap').forEach((blk) => {
        const panel = blk.querySelector('.fig');
        // In the gutter module every element lives in the section body column,
        // so "centred" means centred on THAT column — which is where the company
        // profile's own test-rig photo and schematic sit. Measuring against the
        // full page width would call a correctly placed figure off-centre.
        const bodyEl = blk.closest('.section-body') || pg;
        const bodyR = bodyEl.getBoundingClientRect();
        const img = blk.querySelector('.diagram');
        const p = panel.getBoundingClientRect();
        const i = img.getBoundingClientRect();
        const cs = getComputedStyle(panel);
        const padL = parseFloat(cs.paddingLeft), padT = parseFloat(cs.paddingTop);
        // clientWidth/Height exclude the border, so the content box is those
        // minus the padding. Measuring off getBoundingClientRect would leave the
        // 0.22mm hairline in and make a perfectly filled image read as 99%.
        const innerW = panel.clientWidth - padL - parseFloat(cs.paddingRight);
        const innerH = panel.clientHeight - padT - parseFloat(cs.paddingBottom);
        out.push({
          page: +pg.dataset.page,
          section: (blk.closest('.numbered-section')?.querySelector('h3')?.textContent || '?').trim(),
          widthMm: mm(p.width), heightMm: mm(p.height),
          leftMm: mm(p.left - colLeft),
          centreMm: mm(p.left + p.width / 2 - colLeft),
          colLeftMm: mm(bodyR.left - colLeft),
          colWidthMm: mm(bodyR.width),
          colCentreMm: mm(bodyR.left + bodyR.width / 2 - colLeft),
          contentCentreMm: contentWmm / 2,
          imgWmm: mm(i.width), imgHmm: mm(i.height),
          fillWpct: +(i.width / innerW * 100).toFixed(1),
          fillHpct: +(i.height / innerH * 100).toFixed(1),
          strokeMm: mm(parseFloat(cs.borderTopWidth)),
          radiusMm: mm(parseFloat(cs.borderTopLeftRadius)),
          padMm: mm(padL),
        });
      });
    });
    return out;
  }, contentWmm);
}

// WIDTH is the invariant: the two figures are one component, so a mismatch is a
// bug. HEIGHT is expected to differ — it is aspect ratio plus padding, and the
// two images are not the same shape. CENTRE can only be asserted for the page-1
// figure: page 2's sits in the right column of the closing composition, which is
// what the brief asked for, and a column element cannot also be page-centred.
function assertPanelsMatch(panels) {
  if (panels.length < 2) return;
  const problems = [];
  const [a, ...rest] = panels;
  // Both figures are stacked on one page at one size: width and centre must match.
  for (const b of rest) {
    for (const [k, lbl] of [['widthMm','widths'],['centreMm','centres']])
      if (Math.abs(a[k] - b[k]) > 0.15)
        problems.push(`figure ${lbl} differ: ${a[k]}mm (p${a.page}) vs ${b[k]}mm (p${b.page})`);
    for (const k of ['strokeMm', 'padMm'])
      if (Math.abs(a[k] - b[k]) > 0.05)
        problems.push(`${k} differs: ${a[k]} (p${a.page}) vs ${b[k]} (p${b.page})`);
  }
  for (const p of panels) {
    if (p.fillWpct < 99.5 || p.fillHpct < 99.5)
      problems.push(`p${p.page} image does not fill its plate: ` +
        `${p.fillWpct}% x ${p.fillHpct}% of the inner box`);
  }
  for (const msg of problems) fit('figure geometry', msg);
}

// ---- spec table: no value may wrap ----------------------------------------
// A wrapped value is not just ugly — when the label is two lines and the value
// one, pdftotext interleaves them and the label stops being extractable as a
// single string. This is what happened when the table shared a row with a figure.
async function measureTableWrap(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.spec-table tr').forEach((tr) => {
      const cells = tr.querySelectorAll('td');
      if (cells.length < 2) return;
      const lines = (td) => {
        const r = document.createRange();
        r.selectNodeContents(td);
        return [...r.getClientRects()].filter(b => b.width > 0.01).length;
      };
      // Text width vs cell width, both in mm, so an overrun is a number rather
      // than something you have to spot in a proof.
      const pg = tr.closest('.page');
      const pxPerMm = pg.getBoundingClientRect().width / 210;
      const mm = (px) => +(px / pxPerMm).toFixed(2);
      const cellR = cells[0].getBoundingClientRect();
      const valR = cells[1].getBoundingClientRect();
      const rng = document.createRange();
      rng.selectNodeContents(cells[0]);
      const textR = rng.getBoundingClientRect();
      const csL = getComputedStyle(cells[0]);
      const padR = parseFloat(csL.paddingRight);
      out.push({
        label: cells[0].textContent.trim(),
        value: cells[1].textContent.trim(),
        labelLines: lines(cells[0]),
        valueLines: lines(cells[1]),
        labelColWmm: mm(cellR.width),
        labelTextWmm: mm(textR.width + parseFloat(csL.paddingLeft) + padR),
        labelOverflowMm: mm(Math.max(0, textR.right + padR - cellR.right)),
        gapMm: mm(valR.left - textR.right),
      });
    });
    return out;
  });
}

function assertNoWrap(rows) {
  for (const r of rows.filter(r => r.valueLines !== 1 || r.labelLines !== 1)) {
    fit('spec table', `row wraps: "${r.label}" (${r.labelLines} lines) / "${r.value}" (${r.valueLines} lines)`,
        'a wrapped row interleaves label and value in pdftotext output');
  }
  // white-space:nowrap does not prevent a long label from overrunning its cell —
  // it prevents the BREAK, so the text simply extends past the column edge and
  // can end up sitting on the value. That is invisible to a line count, so the
  // geometry is measured separately. This is the check most likely to fire on a
  // language whose spec labels are longer than English's.
  for (const r of rows) {
    if (r.labelOverflowMm > 0.15)
      fit('spec table', `label overruns its column by ${r.labelOverflowMm}mm: "${r.label}"`,
          `label column is ${r.labelColWmm}mm, the text needs ${r.labelTextWmm}mm`);
    if (r.gapMm < 1.5)
      fit('spec table', `only ${r.gapMm}mm between label and value on "${r.label}"`,
          'below ~1.5mm the two columns read as one string');
  }
}

async function assertLayout(page) {
  const report = await page.evaluate(() => {
    const mm = (px, pxPerMm) => +(px / pxPerMm).toFixed(2);
    const out = [];
    document.querySelectorAll('.page').forEach((pg) => {
      const pr = pg.getBoundingClientRect();
      const pxPerMm = pr.width / 210;
      const n = pg.dataset.page;

      // Every leaf text box + every image on the page, excluding the two
      // furniture elements we are testing against.
      const foot = pg.querySelector('.page-footer');
      const stamp = pg.querySelector('.ds-stamp');
      const boxes = [];
      const walk = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT);
      let t;
      while ((t = walk.nextNode())) {
        if (!t.nodeValue.trim()) continue;
        const el = t.parentElement;
        if (foot && foot.contains(el)) continue;
        if (stamp && stamp.contains(el)) continue;
        const r = document.createRange(); r.selectNodeContents(t);
        for (const b of r.getClientRects()) if (b.width > 0.5 && b.height > 0.5)
          boxes.push({ kind: 'text', what: t.nodeValue.trim().slice(0, 44), b });
      }
      pg.querySelectorAll('img').forEach(im => {
        if (stamp && stamp.contains(im)) return;
        const b = im.getBoundingClientRect();
        if (b.width > 0.5) boxes.push({ kind: 'image', what: im.className || 'img', b });
      });
      // Drawn boxes are not text but are still ink — the diagram plates count as
      // content for the seal test, otherwise a seal could sit on one unnoticed.
      pg.querySelectorAll('.fig, .origin-box').forEach(el => {
        const b = el.getBoundingClientRect();
        boxes.push({ kind: 'box', what: el.className, b });
      });

      const clash = (target) => {
        if (!target) return [];
        const t2 = target.getBoundingClientRect();
        return boxes.filter(x => x.b.left < t2.right - 0.5 && x.b.right > t2.left + 0.5 &&
                                 x.b.top < t2.bottom - 0.5 && x.b.bottom > t2.top + 0.5)
          .map(x => ({ kind: x.kind, what: x.what,
                       byMm: mm(Math.min(x.b.bottom, t2.bottom) - Math.max(x.b.top, t2.top), pxPerMm) }));
      };

      // Footer band = the footer box plus its rule, full content width.
      const fb = foot.getBoundingClientRect();
      const band = { left: fb.left, right: fb.right, top: fb.top, bottom: pr.bottom };
      const bandHits = boxes.filter(x => x.b.left < band.right - 0.5 && x.b.right > band.left + 0.5 &&
                                         x.b.top < band.bottom - 0.5 && x.b.bottom > band.top + 0.5)
        .map(x => ({ kind: x.kind, what: x.what,
                     byMm: mm(Math.min(x.b.bottom, band.bottom) - Math.max(x.b.top, band.top), pxPerMm) }));

      // How much free height is left between the last content and the footer.
      const lowest = boxes.reduce((m, x) => Math.max(m, x.b.bottom), pr.top);
      // The seal must clear the footer band too — that is precisely where the
      // engine datasheet's seal sits, and reproducing it is what this checks for.
      let stampBandOverlapMm = null, stampClearOfBandMm = null;
      if (stamp) {
        const sb = stamp.getBoundingClientRect();
        const overlap = Math.min(sb.bottom, band.bottom) - Math.max(sb.top, band.top);
        const horizontallyOverlapping = sb.left < band.right - 0.5 && sb.right > band.left + 0.5;
        stampBandOverlapMm = (horizontallyOverlapping && overlap > 0) ? mm(overlap, pxPerMm) : 0;
        stampClearOfBandMm = mm(band.top - sb.bottom, pxPerMm);
      }

      // Text-on-text collisions. Only leaf text runs are compared: images and
      // plates legitimately contain other boxes, but two glyph runs sharing
      // space is always a defect. A 0.4mm tolerance absorbs the sub-pixel
      // rounding of letter-spaced mono and the trailing-space rect a line box
      // can report; anything above that is real ink on ink.
      const TOL = 0.4 * pxPerMm;
      const texts = boxes.filter(x => x.kind === 'text');
      const collisions = [];
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i].b, c = texts[j].b;
          const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left);
          const oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
          if (ox > TOL && oy > TOL)
            collisions.push({ a: texts[i].what, b: texts[j].what,
                              xMm: mm(ox, pxPerMm), yMm: mm(oy, pxPerMm) });
        }
      }

      out.push({
        page: +n,
        textCollisions: collisions,
        textRuns: texts.length,
        footerTopMm: mm(fb.top - pr.top, pxPerMm),
        footerClashes: bandHits,
        stampPresent: !!stamp,
        stampClashes: clash(stamp),
        stampBandOverlapMm,
        stampClearOfBandMm,
        freeAboveFooterMm: mm(fb.top - lowest, pxPerMm),
        overflowMm: mm(lowest - (pr.bottom - 0), pxPerMm),
      });
    });
    return out;
  });

  const problems = [];
  for (const p of report) {
    for (const c of p.textCollisions)
      problems.push(`page ${p.page}: text overlaps text — "${c.a}" / "${c.b}" ` +
        `(${c.xMm}mm × ${c.yMm}mm)`);
    for (const c of p.footerClashes)
      problems.push(`page ${p.page}: footer band is overlapped by ${c.kind} "${c.what}" (${c.byMm}mm)`);
    for (const c of p.stampClashes)
      problems.push(`page ${p.page}: seal overlaps ${c.kind} "${c.what}" (${c.byMm}mm)`);
    if (p.stampPresent && p.stampBandOverlapMm > 0)
      problems.push(`page ${p.page}: seal sits ${p.stampBandOverlapMm}mm inside the footer band ` +
        `— this is the engine datasheet's defect; raise STAMP_BOTTOM`);
    if (p.freeAboveFooterMm < 0)
      problems.push(`page ${p.page}: content runs ${(-p.freeAboveFooterMm).toFixed(1)}mm past the footer rule`);
  }
  for (const msg of problems) fit('layout', msg);
  return report;
}

// ---------------------------------------------------------------------------
// TEXT FIDELITY — extract the finished PDF and diff against the source strings
// ---------------------------------------------------------------------------
// The engine datasheet was reported to mangle text. It does not: its ToUnicode
// maps are correct and the apparent damage came from how it was extracted
// (see the notes printed at the end of a build). This check is kept anyway,
// because it is the only thing that actually proves a reader can copy a spec
// value out of the sheet — and it runs against THIS document, not that one.
// -enc UTF-8 is mandatory: this pdftotext build (Glyph & Cog 4.00) emits Latin-1
// by default, which turns ©, · and × into lone high bytes and reads exactly like
// a broken font. That, not the PDF, is what the engine datasheet fell foul of.
//
// The two layout modes each lie in one direction, so both are run:
//   default  — reading order, handles the two-column overview correctly, but
//              de-hyphenates words split across a line break ("4-in-1" → "4in1");
//   -layout  — keeps hyphens, but interleaves columns, so a paragraph beside a
//              figure comes out sliced by the caption.
// A string passes if it survives EITHER. Anything that fails both is genuinely
// not recoverable from the file.
function extractText(pdfPath, mode) {
  const args = ['-enc', 'UTF-8', ...(mode ? [mode] : []), pdfPath, '-'];
  return execFileSync('pdftotext', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function assertTextFidelity(pdfPath, total) {
  const reading = extractText(pdfPath, null);
  const layout = extractText(pdfPath, '-layout');
  const got = reading + '\n' + layout;
  // Lowercased because CSS text-transform:uppercase means the glyphs on the page
  // really are uppercase — the PDF is correct, the source string is just cased
  // differently. Whitespace is dropped so line wrapping cannot cause a miss.
  const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
  const noHyphen = (s) => norm(s).replace(/[-‐‑–—]/g, '');
  const flatR = norm(reading), flatL = norm(layout);
  const flatRh = noHyphen(reading), flatLh = noHyphen(layout);
  const has = (s) => flatL.includes(norm(s)) || flatR.includes(norm(s)) ||
                     flatLh.includes(noHyphen(s)) || flatRh.includes(noHyphen(s));
  const flat = got.replace(/\s+/g, ' ').trim();

  const expected = [
    DOC.id, `${L.ui.rev} ${DOC.revision}`,
    HERO.titleMain, HERO.titleTail, HERO.standfirst, HERO.ndaa,
    OVERVIEW.lead, OVERVIEW.variantsNote,
    ...OVERVIEW.bullets.flat(),
    ...SPECS.flat(),
    ...DIAGRAMS.map(d => d.caption),
    ...DIAGRAMS.flatMap(d => (d.key || []).flat()),
    `© ${DOC.year} ${DOC.company}`,
  ];

  const missing = expected.filter(s => !has(s));
  // page counter must come from config on every page
  const counters = Array.from({ length: total }, (_, i) => pageNo(i + 1, total));
  const missingCounters = counters.filter(c => !has(c));

  // any byte that is not valid UTF-8 would indicate a genuinely broken CMap
  const invalidUtf8 = /�/.test(got);

  return { missing, missingCounters, invalidUtf8, counters, text: got };
}

// ---------------------------------------------------------------------------
// SCRIPT INTEGRITY — the checks that make "keep these tokens in Latin" real
// ---------------------------------------------------------------------------
// Cyrillic А В Е І К М Н О Р С Т У Х and а е і о р с у х are visually identical
// to Latin letters at any size. A single one inside "100A" or "STM32F405" is
// invisible on the printed page, breaks every text search a customer runs, and
// would survive proofreading by anyone — including a native speaker — because
// there is nothing to see. So mixed-script tokens are a build failure, not a
// style note.
const CYR = /[\u0400-\u04FF]/;
const LAT = /[A-Za-z]/;

function assertNoHomoglyphs(strings) {
  const bad = [];
  for (const str of strings) {
    // Split on everything that is not a letter or digit, so "телеметрія ESC"
    // is two tokens (fine) while "10\u04100A" would be one (not fine).
    for (const tok of String(str).split(/[^\p{L}\p{N}]+/u)) {
      if (!tok) continue;
      const hasCyr = CYR.test(tok), hasLat = LAT.test(tok);
      // Digits alone are script-neutral; the failure is Cyrillic letters sharing
      // a token with Latin letters, or with digits in an otherwise Latin part
      // number or rating.
      if (hasCyr && (hasLat || /\d/.test(tok)))
        bad.push({ tok, str: String(str).slice(0, 60) });
    }
  }
  return bad;
}

// Every protected token must actually be present in the finished PDF, spelled
// in Latin. This catches the opposite failure from the homoglyph check: a
// translation that helpfully rendered "ESC" as "РЕГУЛЯТОР" and lost the term the
// customer's firmware and wiring loom actually use.
function assertLatinTokens(extracted) {
  const flat = extracted.replace(/\s+/g, ' ');
  return LATIN_TOKENS.filter(t => !flat.includes(t));
}

// ---- which faces actually made it into the PDF -----------------------------
// pdffonts is not installed here, and the answer is sitting in the file anyway:
// Chromium writes plain `/BaseFont /ABCDEF+Family-Style` entries and embeds the
// programme alongside. This is the check that turns "Inter has Cyrillic" from an
// assumption into a fact about the artefact — if a glyph had fallen back to a
// system face, that face's name appears here and nowhere else would show it.
// Weight and style words that are part of a font's NAME, not its family:
// Skia writes "Space-Grotesk-Light" and "JetBrains-Mono-Medium", so the family
// is what is left once these are peeled off the end.
const FACE_SUFFIX = /^(Thin|ExtraLight|UltraLight|Light|Regular|Book|Medium|SemiBold|DemiBold|Bold|ExtraBold|UltraBold|Black|Heavy|Italic|Oblique)$/i;
function fontFamilyOf(name) {
  const parts = name.split('-').filter(Boolean);
  while (parts.length > 1 && FACE_SUFFIX.test(parts[parts.length - 1])) parts.pop();
  return parts.join('');
}

function pdfFonts(pdfPath) {
  const raw = readFileSync(pdfPath, 'latin1');
  const found = new Map();
  // Chromium's Skia PDF writer does not emit /BaseFont at all — the authoritative
  // name is /FontName inside each FontDescriptor, carrying the same six-letter
  // subset tag. Reading the descriptor also means we are looking at fonts that
  // are genuinely embedded, since that is the object the font programme hangs off.
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

function assertFonts(pdfPath) {
  const fonts = pdfFonts(pdfPath);
  const families = fonts.map(f => f.family);
  const problems = [];
  for (const want of L.expectFonts)
    if (!families.includes(want)) problems.push(`expected ${want} in the PDF, not found`);
  for (const no of L.forbidFonts)
    if (families.includes(no)) problems.push(`${no} is in the PDF and must not be — ` +
      'it has no Cyrillic glyphs, so its presence means Cyrillic text fell back to a substitute');
  // Anything outside the allowed list is a fallback that crept in.
  for (const f of families)
    if (!L.expectFonts.includes(f))
      problems.push(`unexpected font "${f}" — nothing in this document asks for it, ` +
        'so it is a fallback for a glyph the intended face could not supply');
  // A non-subset font means the whole face was embedded, which is legal but
  // usually signals the font was loaded from the system rather than the webfont.
  for (const f of fonts)
    if (!f.subset) problems.push(`${f.family} is embedded whole, not subset — likely a system font`);
  return { fonts, problems };
}

// ---------------------------------------------------------------------------
// BUILD
// ---------------------------------------------------------------------------
async function build() {
  const TOTAL = 2;   // page count — the footer counter is derived from this
  const browser = await chromium.launch();

  const logoBuf = await fs.readFile(path.join(repoRoot, 'assets/logo.png'));
  const stampBuf = await fs.readFile(path.join(repoRoot, 'assets/nas_stamp_original.png'));
  const logoUri = 'data:image/png;base64,' + logoBuf.toString('base64');
  const stampUri = 'data:image/png;base64,' + stampBuf.toString('base64');

  const plateUri = await renderPlate(browser);

  const PANEL_INNER = CONTENT_W - 2 * PANEL.padMm;      // 138mm

  // Aspect ratios turn a width into a height, which is what the fit loop needs.
  const aspects = [];
  for (const d of DIAGRAMS) {
    const m = await sharp(path.join(repoRoot, d.src)).metadata();
    aspects.push(m.width / m.height);
  }

  const ctx = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  let diagrams, layout, html;
  const TARGET_SLACK = 5;            // mm of clearance to leave above the footer

  // The two figures no longer share a width, and that is the point. A portrait
  // drawing and a landscape drawing have no common width that flatters both —
  // forcing one was what made the old pages look wrong. Instead each gets the
  // slot its shape wants, and the shared identity comes from the treatment:
  // same cyan brackets, same stroke, same plate, same padding.
  //
  //   pinout  (landscape 1.72) — full content width band closing page 2
  //   wiring  (portrait  0.82) — the right column beside the spec table
  //
  // Only the wiring column is solved for: it is the one whose height decides
  // whether page 2 fits. The pinout then takes whatever the band has left.
  const GUTTER = 16, GUTTER_GAP = 5;
  const BODY_W = CONTENT_W - GUTTER - GUTTER_GAP;          // 149mm — section body column
  const IMG_MAX = BODY_W - 2 * PANEL.padMm;                // image at full column width

  // ONE width for both diagrams, so the two plates come out the same size and
  // share a centre — and, since it is pinned, the same size in every language.
  // The pinout is landscape and the wiring portrait, so a shared width W costs
  // W/1.67 + W/0.88 of height; --solve-width searches on that, a normal build
  // renders once at DIAGRAM_W_MM and checks it still fits.
  let imgWidthMm = SOLVE_WIDTH ? IMG_MAX : DIAGRAM_W_MM;
  const PASSES = SOLVE_WIDTH ? 14 : 1;

  for (let pass = 1; pass <= PASSES; pass++) {
    diagrams = [];
    for (const d of DIAGRAMS) {
      diagrams.push({
        ...(await placeImage(d.src, imgWidthMm, T.panelFill, 300, !!d.redact)),
        figWmm: +(imgWidthMm + 2 * PANEL.padMm).toFixed(2),
      });
    }
    html = buildHtml({ plateUri, logoUri, stampUri, diagrams, total: TOTAL });
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 90000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(350);

    const slacks = await page.evaluate((n) => {
      const out = [];
      for (let i = 1; i <= n; i++) {
        const pg = document.querySelector(`.page[data-page="${i}"]`);
        const pr = pg.getBoundingClientRect(), pxPerMm = pr.width / 210;
        const foot = pg.querySelector('.page-footer').getBoundingClientRect();
        let lowest = pr.top;
        pg.querySelectorAll('.section-block, .numbered-section').forEach(d => {
          lowest = Math.max(lowest, d.getBoundingClientRect().bottom);
        });
        out.push((foot.top - lowest) / pxPerMm);
      }
      return out;
    }, TOTAL);

    // Page 1 has no solver — it is type, not images, so nothing on it can be
    // scaled without changing the document's type sizes. If it overflows, that
    // is a content decision (cut a clause, or accept a smaller size) and it goes
    // to the fit report rather than being silently absorbed here.
    if (slacks[0] < 0 && pass === 1) {
      fit('page 1', `content overruns the footer rule by ${(-slacks[0]).toFixed(1)}mm`,
          'page 1 is all type — no image can be shrunk to recover this; ' +
          'either the copy shortens or a type size changes, and both are decisions');
    }

    const s2 = slacks[1];
    if (!SOLVE_WIDTH) {
      // Pinned width: the only question is whether it still fits.
      if (s2 < 0)
        fit('page 2', `content overruns the footer rule by ${(-s2).toFixed(1)}mm ` +
          `at the pinned diagram width of ${DIAGRAM_W_MM}mm`,
          'run --solve-width to see what each language would choose, then set ' +
          'DIAGRAM_W_MM to the smallest of them — never to a per-language value');
      break;
    }
    const atCap = imgWidthMm >= IMG_MAX - 0.01;
    if (s2 >= TARGET_SLACK - 1 && (atCap || s2 <= TARGET_SLACK + 6)) break;
    // Both plates grow and shrink together, so a 1mm change in the shared width
    // moves the page by (1/1.72 + 1/0.82) mm.
    imgWidthMm += (s2 - TARGET_SLACK) / (1 / aspects[0] + 1 / aspects[1]);
    imgWidthMm = Math.max(45, Math.min(IMG_MAX, imgWidthMm));
  }

  if (SOLVE_WIDTH) {
    console.log(`--solve-width (${LANG}): this page would take ${imgWidthMm.toFixed(1)}mm. ` +
      `DIAGRAM_W_MM is ${DIAGRAM_W_MM}mm.`);
    console.log('  Set the constant to the SMALLEST value across all languages — a ' +
                'per-language width breaks the side-by-side match.');
  }
  console.log(`Both figures at one shared width: image ${imgWidthMm.toFixed(1)}mm ` +
              `in a ${(imgWidthMm + 2 * PANEL.padMm).toFixed(1)}mm plate (column max ${BODY_W}mm)` +
              `${SOLVE_WIDTH ? ' — SOLVED, not pinned' : ' — pinned, identical in every language'}`);
  console.log(`  pinout landscape ${aspects[0].toFixed(2)} · wiring portrait ${aspects[1].toFixed(2)} ` +
              `— same width and centre, heights follow their aspect ratios`);

  // Redaction outlines must still sit on blurred artwork. Median board detail is
  // ~52; a blurred patch reads near 1. Anything above 8 means the artwork moved
  // and the outlines would be framing sharp detail — fail rather than print that.
  const redactionCheck = await verifyRedactions(DIAGRAMS[0].src);
  const strayOutline = redactionCheck.filter(r => r.detail > 8 || r.lum > 200 || r.lum < 20);
  if (strayOutline.length) {
    throw new Error('Redaction outlines no longer sit on blurred artwork —\n' +
      strayOutline.map(r =>
        `    · box ${r.w}x${r.h} at (${r.x},${r.y}): detail ${r.detail.toFixed(1)} (want < 8), ` +
        `brightness ${r.lum.toFixed(0)} (want 20–200) — ` +
        (r.lum > 200 ? 'this box is on blank paper, not the board'
         : r.lum < 20 ? 'this box is on bare board, not a redacted chip'
         : 'this box is on sharp detail') +
        `. fragment.png has changed; re-run the detector.`).join('\n'));
  }

  console.log('\nIP redaction outlines (detail inside each box — blurred reads ~1, sharp board ~52):');
  for (const r of redactionCheck) {
    console.log(`  OK   ${String(r.w).padStart(3)}x${String(r.h).padEnd(3)} at (${r.x},${r.y})` +
      `   detail ${r.detail.toFixed(2)}  brightness ${r.lum.toFixed(0)}  stroke ${REDACTION_STROKE_PX}px ≈ 0.27mm printed`);
  }

  const tableRows = await measureTableWrap(page);
  assertNoWrap(tableRows);
  const widestLabel = tableRows.reduce((a, r) => r.labelTextWmm > a.labelTextWmm ? r : a, tableRows[0]);
  const tightest = tableRows.reduce((a, r) => r.gapMm < a.gapMm ? r : a, tableRows[0]);
  console.log(`\nSpec table: ${tableRows.length} rows, every label and value on ONE line`);
  console.log(`  label column   ${tableRows[0].labelColWmm}mm  (44% of the section body column)`);
  console.log(`  widest label   ${widestLabel.labelTextWmm}mm  "${widestLabel.label}"`);
  console.log(`  tightest gap   ${tightest.gapMm}mm to the value  "${tightest.label}"`);
  console.log(`  overruns       ${tableRows.filter(r => r.labelOverflowMm > 0.15).length} of ${tableRows.length} rows`);

  const panels = await measurePanels(page, CONTENT_W);
  assertPanelsMatch(panels);

  layout = await assertLayout(page);

  // ---- script integrity, on the source strings, before anything is rendered --
  const allStrings = [
    DOC.id, DOC.title, DOC.company, DOC.confidentiality, L.ui.doc, L.ui.rev,
    L.sections.overview, L.sections.specs,
    HERO.eyebrow, HERO.titleMain, HERO.titleTail, HERO.standfirst, HERO.ndaa,
    OVERVIEW.lead, OVERVIEW.variantsLabel, OVERVIEW.variantsNote, ...OVERVIEW.variants,
    ...OVERVIEW.bullets.flat(), ...SPECS.flat(),
    ...DIAGRAMS.map(d => d.title), ...DIAGRAMS.map(d => d.caption),
    ...DIAGRAMS.flatMap(d => (d.key || []).flat()),
    OMITTED_NOTE, ...OMITTED_SPECS,
  ];
  const homoglyphs = assertNoHomoglyphs(allStrings);
  console.log(`\nScript integrity (${LANG}): ` +
    `${allStrings.length} strings scanned, ` +
    `${homoglyphs.length === 0 ? 'no mixed-script tokens' : homoglyphs.length + ' MIXED-SCRIPT'}`);
  if (homoglyphs.length) {
    for (const h of homoglyphs)
      console.log(`    · "${h.tok}" in "${h.str}" — Cyrillic and Latin in one token`);
    throw new Error('Cyrillic homoglyphs found inside Latin technical tokens.');
  }

  // ---- FIT REPORT ----------------------------------------------------------
  console.log(`\nFit report (${LANG}): ` +
    (FIT.length === 0 ? 'no assertions fired' : `${FIT.length} ASSERTION(S) FIRED`));
  if (FIT.length) {
    let last = null;
    for (const f of FIT) {
      if (f.where !== last) { console.log(`  [${f.where}]`); last = f.where; }
      console.log(`    · ${f.msg}`);
      if (f.detail) console.log(`      ${f.detail}`);
    }
    console.log('\n  Nothing has been shrunk to make these go away. Each one is a\n' +
                '  decision: shorten the copy, change a column width, or accept a\n' +
                '  smaller type size on that element specifically.');
    if (!ALLOW_FIT)
      throw new Error(`${FIT.length} fit assertion(s) fired on --lang=${LANG}. ` +
        'Re-run with --allow-fit to write the files anyway and look at them.');
    console.log('\n  --allow-fit: writing the files anyway.');
  }

  if (PREVIEW) {
    for (let i = 1; i <= TOTAL; i++) {
      await page.locator('.page[data-page="' + i + '"]').screenshot({
        path: path.join(brandDir, 'ds-dronestack' + (LANG === 'en' ? '' : '-' + LANG) + '-p' + i + '.png') });
    }
    console.log('preview PNGs: brand/ds-dronestack' + (LANG === 'en' ? '' : '-' + LANG) + '-p1..' + TOTAL + '.png');
  }

  const rgbPath = path.join(repoRoot, `${DOC.outBase}_RGB.pdf`);
  await page.pdf({
    path: rgbPath, format: 'A4', printBackground: true, preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();

  // ---- image dpi ----
  const images = [
    { name: 'fragment.png (p2, pinout band)', ...diagrams[0] },
    { name: 'ESC.jpeg (p2, wiring column)', ...diagrams[1] },
    { name: 'logo.png (header, all pages)', widthMm: 14, dpi: 354 / (14 / 25.4), sourcePx: 354, placedPx: 354 },
    ];
  const softImages = images.filter(i => i.dpi < 90);

  console.log(`\n${DOC.title}`);
  console.log(`Doc ${DOC.id} · Rev ${DOC.revision} · ${TOTAL} pages\n`);

  console.log('Image resolution at placed size (floor 90 dpi):');
  for (const i of images) {
    console.log(`  ${i.dpi >= 90 ? 'OK  ' : 'FAIL'} ${String(Math.round(i.dpi)).padStart(4)} dpi  ` +
      `${i.name.padEnd(38)} ${i.placedPx}px across ${i.widthMm}mm`);
  }
  if (softImages.length) throw new Error(`${softImages.length} image(s) below the 90 dpi floor.`);

  console.log('\nFigure geometry (width is the invariant):');
  for (const p of panels) {
    console.log(`  p${p.page} ${p.section.padEnd(22)} ` +
      `w ${String(p.widthMm).padStart(6)}mm  h ${String(p.heightMm).padStart(6)}mm  ` +
      `left ${String(p.leftMm).padStart(6)}mm  centre ${String(p.centreMm).padStart(6)}mm  ` +
      `fill ${p.fillWpct}% x ${p.fillHpct}%`);
  }

  console.log('\nLayout assertions:');
  for (const p of layout) {
    console.log(`  page ${p.page}: ${p.textRuns} text runs, ` +
      `${p.textCollisions.length} overlapping · ` +
      `footer clear (${p.footerClashes.length} clashes) · ` +
      `seal ${p.stampPresent
        ? `clear — ${p.stampClashes.length} content clashes, ${p.stampClearOfBandMm}mm above the footer band`
        : 'none'} · ` +
      `${p.freeAboveFooterMm.toFixed(1)}mm free above the footer rule`);
  }

  // ---- text fidelity on the RGB master ----
  const t = assertTextFidelity(rgbPath, TOTAL);
  console.log('\nText extraction (pdftotext -enc UTF-8 -layout):');
  console.log(`  strings checked      ${t.missing.length === 0 ? 'all present' : t.missing.length + ' MISSING'}`);
  console.log(`  page counters        ${t.missingCounters.length === 0 ? t.counters.join('  ') : 'MISSING ' + t.missingCounters}`);
  console.log(`  invalid UTF-8        ${t.invalidUtf8 ? 'YES' : 'none'}`);
  if (t.missing.length) {
    console.log('  missing:');
    t.missing.forEach(s => console.log('    · ' + JSON.stringify(s.slice(0, 70))));
    throw new Error('Text fidelity check failed — strings above do not extract from the PDF.');
  }
  if (t.missingCounters.length) throw new Error('Page counters missing: ' + t.missingCounters);
  if (t.invalidUtf8) throw new Error('PDF text contains invalid UTF-8 — ToUnicode CMap is broken.');

  // ---- fonts actually embedded in the master -------------------------------
  const fontCheck = assertFonts(rgbPath);
  console.log('\nFonts embedded in the PDF:');
  for (const f of fontCheck.fonts)
    console.log(`  ${fontCheck.problems.some(p => p.includes(f.family)) ? 'FAIL' : 'OK  '} ` +
      `${f.family.padEnd(16)} ${f.subset ? 'subset' : 'FULL FACE'}  ` +
      `(${[...f.names].join(', ')})`);
  if (L.forbidFonts.length)
    console.log(`  forbidden here: ${L.forbidFonts.join(', ')} — ` +
      `${fontCheck.problems.length ? 'SEE FAILURES' : 'absent, as required'}`);
  if (fontCheck.problems.length) {
    fontCheck.problems.forEach(m => console.log('    · ' + m));
    throw new Error('Font check failed — see above.');
  }

  // ---- protected Latin tokens survived translation -------------------------
  const missingTokens = assertLatinTokens(t.text);
  console.log(`\nProtected Latin tokens: ${LATIN_TOKENS.length} checked, ` +
    `${missingTokens.length === 0 ? 'all present in Latin script' : 'MISSING ' + missingTokens.join(', ')}`);
  if (missingTokens.length)
    throw new Error('Latin technical tokens missing from the PDF: ' + missingTokens.join(', '));

  const rgbSize = (await fs.stat(rgbPath)).size;
  console.log(`\n  ${path.relative(repoRoot, rgbPath)}  (${(rgbSize / 1048576).toFixed(2)} MB, DeviceRGB)`);

  if (RGB_ONLY) { console.log('\n--rgb-only: stopping before the CMYK pass.'); return; }

  // ---- PDF/X CMYK, text preserved ----
  const cmykPath = path.join(repoRoot, `${DOC.outBase}_CMYK.pdf`);
  const info = await toPdfxCmyk({
    inPath: rgbPath, outPath: cmykPath,
    title: `${DOC.title} — ${DOC.id} Rev ${DOC.revision}`,
    creator: 'brand/build_datasheet_dronestack.mjs',
  });
  console.log(`\nPDF/X-3 CMYK conversion (vector, text preserved):`);
  console.log(`  colours converted    ${info.fillsConverted} fill/stroke operators`);
  console.log(`  images converted     ${info.imagesConverted} (DeviceRGB → DeviceCMYK)`);
  console.log(`  shadings remaining   ${info.shadings} ${info.shadings ? '← would still be RGB' : ''}`);
  console.log(`  profile              ${info.iccFamily}`);
  console.log(`  ${path.relative(repoRoot, cmykPath)}  (${(info.size / 1048576).toFixed(2)} MB)`);

  // text must survive the colour conversion untouched
  const t2 = assertTextFidelity(cmykPath, TOTAL);
  console.log('\nText extraction after CMYK conversion:');
  console.log(`  strings checked      ${t2.missing.length === 0 ? 'all present' : t2.missing.length + ' MISSING'}`);
  console.log(`  page counters        ${t2.missingCounters.length === 0 ? t2.counters.join('  ') : 'MISSING'}`);
  console.log(`  invalid UTF-8        ${t2.invalidUtf8 ? 'YES' : 'none'}`);
  if (t2.missing.length || t2.missingCounters.length || t2.invalidUtf8) {
    t2.missing.forEach(s => console.log('    · ' + JSON.stringify(s.slice(0, 70))));
    throw new Error('CMYK conversion damaged the text layer.');
  }

  await writeReport({
    lang: LANG, docId: DOC.id, revision: DOC.revision, outBase: DOC.outBase,
    bodyFont: L.bodyFont.split(',')[0].replace(/"/g, ''),
    fonts: fontCheck.fonts.map(f => f.family),
    forbidden: L.forbidFonts,
    fitFired: FIT.length,
    freeAboveFooterMm: layout.map(x => +x.freeAboveFooterMm.toFixed(1)),
    sealClearMm: layout.find(x => x.stampPresent)?.stampClearOfBandMm ?? null,
    panels: panels.map(x => ({ page: x.page, w: x.widthMm, h: x.heightMm, centre: x.centreMm })),
    labelColWmm: tableRows[0].labelColWmm,
    widestLabelMm: widestLabel.labelTextWmm,
    widestLabel: widestLabel.label,
    tightestGapMm: tightest.gapMm,
    imgWidthMm: +imgWidthMm.toFixed(2),
    rgbMB: +(rgbSize / 1048576).toFixed(2),
    cmykMB: RGB_ONLY ? null : +(info.size / 1048576).toFixed(2),
    iccFamily: RGB_ONLY ? null : info.iccFamily,
  });

  console.log(`\nOmitted by design (no TBD rows): ${OMITTED_SPECS.join(' · ')}`);
  console.log(`Add them and set DOC.revision = '02' when the measurements arrive.`);
}

// Written per language so --both can lay the two variants against each other
// without either build knowing the other exists.
const reportPath = (lang) => path.join(brandDir, `.datasheet-report-${lang}.json`);
async function writeReport(obj) {
  await fs.writeFile(reportPath(obj.lang), JSON.stringify(obj, null, 2));
}

// ---------------------------------------------------------------------------
// --both — build English then Ukrainian in separate processes and print them
// side by side. Separate processes because the locale is fixed at module load:
// one process is one language, which is also what makes the English master
// provably untouched by the Ukrainian build.
// ---------------------------------------------------------------------------
function compareVariants() {
  const [en, uk] = ['en', 'uk'].map(l => {
    try { return JSON.parse(readFileSync(reportPath(l), 'utf8')); }
    catch { throw new Error('no build report for ' + l + ' — --both needs the full CMYK pass, so it cannot be combined with --rgb-only'); }
  });
  const rows = [
    ['document number',      en.docId,               uk.docId],
    ['revision',             en.revision,            uk.revision],
    ['body font',            en.bodyFont,            uk.bodyFont],
    ['fonts embedded',       en.fonts.join(' · '),   uk.fonts.join(' · ')],
    ['Space Grotesk',        'present',              uk.fonts.includes('SpaceGrotesk') ? 'PRESENT — WRONG' : 'absent (no Cyrillic)'],
    ['fit assertions fired', String(en.fitFired),    String(uk.fitFired)],
    ['p1 free above footer', en.freeAboveFooterMm[0] + 'mm', uk.freeAboveFooterMm[0] + 'mm'],
    ['p2 free above footer', en.freeAboveFooterMm[1] + 'mm', uk.freeAboveFooterMm[1] + 'mm'],
    ['seal above footer',    en.sealClearMm + 'mm',  uk.sealClearMm + 'mm'],
    ['spec label column',    en.labelColWmm + 'mm',  uk.labelColWmm + 'mm'],
    ['widest spec label',    en.widestLabelMm + 'mm', uk.widestLabelMm + 'mm'],
    ['',                     '"' + en.widestLabel + '"', '"' + uk.widestLabel + '"'],
    ['tightest label gap',   en.tightestGapMm + 'mm', uk.tightestGapMm + 'mm'],
    ['diagram width',        en.imgWidthMm + 'mm',   uk.imgWidthMm + 'mm'],
    ['p2 panel 1',           en.panels[0].w + ' × ' + en.panels[0].h + 'mm', uk.panels[0].w + ' × ' + uk.panels[0].h + 'mm'],
    ['p2 panel 2',           en.panels[1].w + ' × ' + en.panels[1].h + 'mm', uk.panels[1].w + ' × ' + uk.panels[1].h + 'mm'],
    ['panel centre',         en.panels[0].centre + 'mm', uk.panels[0].centre + 'mm'],
    ['output intent',        en.iccFamily || '—',    uk.iccFamily || '—'],
    ['RGB master',           en.rgbMB + ' MB',       uk.rgbMB + ' MB'],
    ['CMYK master',          (en.cmykMB ?? '—') + ' MB', (uk.cmykMB ?? '—') + ' MB'],
  ];
  const w0 = Math.max(...rows.map(r => r[0].length));
  const w1 = Math.max(...rows.map(r => String(r[1]).length), 'ENGLISH'.length);
  const line = (a, b, c) => '  ' + String(a).padEnd(w0) + '   ' + String(b).padEnd(w1) + '   ' + c;
  console.log('\n' + '='.repeat(w0 + w1 + 34));
  console.log('  VARIANTS SIDE BY SIDE');
  console.log('='.repeat(w0 + w1 + 34));
  console.log(line('', 'ENGLISH', 'UKRAINIAN'));
  console.log('  ' + '-'.repeat(w0 + w1 + 30));
  for (const r of rows) console.log(line(...r));

  // The two sheets must show the SAME drawings at the SAME size — a reader
  // comparing them side by side should see one document in two languages.
  const problems = [];
  for (let i = 0; i < en.panels.length; i++) {
    for (const k of ['w', 'h', 'centre'])
      if (Math.abs(en.panels[i][k] - uk.panels[i][k]) > 0.15)
        problems.push(`panel ${i + 1} ${k}: ${en.panels[i][k]}mm (en) vs ${uk.panels[i][k]}mm (uk)`);
  }
  if (en.revision !== uk.revision) problems.push('revisions differ');
  if (uk.docId !== en.docId + '-UA') problems.push(`uk document number is ${uk.docId}, expected ${en.docId}-UA`);
  if (uk.fonts.includes('SpaceGrotesk')) problems.push('Space Grotesk reached the Ukrainian PDF');
  console.log('\n  Cross-variant checks: ' +
    (problems.length ? problems.length + ' FAILED' : 'diagram panels identical, revisions match, -UA suffix correct'));
  problems.forEach(m => console.log('    · ' + m));
  if (problems.length) throw new Error('Cross-variant checks failed.');
}

if (process.argv.includes('--both')) {
  const self = fileURLToPath(import.meta.url);
  const pass = process.argv.slice(2).filter(a => a !== '--both' && !a.startsWith('--lang='));
  for (const lang of ['en', 'uk']) {
    console.log('\n' + '#'.repeat(72));
    console.log('#  BUILDING --lang=' + lang);
    console.log('#'.repeat(72));
    execFileSync(process.execPath, [self, '--lang=' + lang, ...pass], { stdio: 'inherit' });
  }
  compareVariants();
} else {
  await build();
}
console.log('\nDone.');
