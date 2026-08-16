// PDF/X-3:2003 DeviceCMYK writer — multi-page, arbitrary TrimBox/BleedBox.
//
// Chromium only emits RGB PDF, so any print master has to be assembled by hand.
// This module is the business-card counterpart to the writer inside
// build_rollup.mjs: same PDF/X-3 container, same OutputIntent + embedded
// DestOutputProfile, but generalised in the two ways a card needs and a roll-up
// does not — N pages in one file (front + back), and a TrimBox that is inset on
// all four edges rather than bleeding off a single edge.
//
// Kept as a separate file rather than a refactor of build_rollup.mjs: that
// script's CMYK path is the one that will carry the trykkeri's own profile
// later, so it is not worth destabilising to share a page skeleton.

import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export const MM2PT = 72 / 25.4;

// --- CMYK output profile ----------------------------------------------------
// FOGRA39 (ISO Coated v2) is the European offset standard the rest of the NAS
// print material is set up for. US Web Coated SWOP is NOT an acceptable
// substitute — shipping a US profile to a Danish trykkeri silently shifts the
// brand cyan #3BB6E8 — so there is no fallback here at all.
const ICC_FOGRA39_CANDIDATES = [
  path.join(repoRoot, 'brand/icc/FOGRA39L_coated.icc'),
  path.join(repoRoot, 'assets/icc/FOGRA39L_coated.icc'),
  '/usr/share/texlive/texmf-dist/tex/generic/colorprofiles/FOGRA39L_coated.icc',
];

// Read the profile's own `desc` tag so the OutputIntent names what is actually
// embedded rather than a hard-coded string that can drift from the file.
export function iccDescription(buf) {
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
// copy any .icc into place. Check the header really is a CMYK *output* profile
// and that its own description names FOGRA / ISO Coated, so a mislabelled US
// profile cannot reach the trykkeri through the back door.
const FOGRA_NAME = /fogra|iso\s*coated/i;

export async function findCmykProfile() {
  const tried = [];
  for (const p of ICC_FOGRA39_CANDIDATES) {
    let buf;
    try { buf = await fs.readFile(p); } catch { tried.push(p + '  (not found)'); continue; }

    const space = buf.length > 24 ? buf.toString('ascii', 16, 20).trim() : '';
    const cls = buf.length > 16 ? buf.toString('ascii', 12, 16).trim() : '';
    const name = iccDescription(buf);

    if (space !== 'CMYK') {
      throw new Error(p + '\n  is not a CMYK profile (data colour space is "' + space + '"). ' +
        'Replace it with a real FOGRA39L_coated.icc.');
    }
    if (cls !== 'prtr') {
      throw new Error(p + '\n  is not an output/printer profile (class "' + cls + '", expected "prtr").');
    }
    if (!FOGRA_NAME.test(name)) {
      throw new Error(
        'The file at\n    ' + p + '\n  is named FOGRA39L_coated.icc but the profile inside describes ' +
        'itself as:\n    "' + name + '"\n  That is not a FOGRA39 / ISO Coated profile. Refusing to use ' +
        'it — this is exactly the\n  silent US-profile substitution the FOGRA39 requirement exists to prevent.');
    }
    return { path: p, name, family: 'FOGRA39 (' + name + ')', buf };
  }

  throw new Error(
    'No FOGRA39 CMYK profile found — refusing to build a print master without it.\n' +
    '  NAS print material is set up for FOGRA39 / ISO Coated v2; falling back to US Web Coated\n' +
    '  SWOP would shift the brand cyan #3BB6E8 at a Danish trykkeri, so this is a hard stop.\n' +
    '  Place FOGRA39L_coated.icc at one of:\n' + tried.map(t => '    ' + t).join('\n') +
    '\n  It is freely available from CTAN: https://mirrors.ctan.org/support/colorprofiles/');
}

function pdfDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return 'D:' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
         p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) +
         sign + p(Math.floor(Math.abs(off) / 60)) + "'" + p(Math.abs(off) % 60) + "'";
}

const pdfStr = (s) => s.replace(/([\\()])/g, '\\$1');
const pt = (mm) => +(mm * MM2PT).toFixed(4);

/**
 * Write a multi-page PDF/X-3:2003 DeviceCMYK file.
 *
 * @param {string[]} pngPaths  one RGB PNG per page (full page incl. slug + crop marks)
 * @param {string}   outPath
 * @param {string}   title
 * @param {number}   widthMm   MediaBox width  (the full page, marks included)
 * @param {number}   heightMm  MediaBox height
 * @param {{x:number,y:number,w:number,h:number}} trimMm   TrimBox,  mm from bottom-left
 * @param {{x:number,y:number,w:number,h:number}} bleedMm  BleedBox, mm from bottom-left
 * @param {string}   creator
 */
export async function writePdfXCmyk({ pngPaths, outPath, title, widthMm, heightMm, trimMm, bleedMm, creator }) {
  const sharp = require('sharp');
  const profile = await findCmykProfile();
  const iccName = profile.name;

  // Convert every page to DeviceCMYK through the real output profile.
  const images = [];
  for (const pngPath of pngPaths) {
    const { data, info } = await sharp(pngPath)
      .withIccProfile(profile.path)
      .toColourspace('cmyk')
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.channels !== 4) {
      throw new Error(pngPath + ': CMYK conversion produced ' + info.channels + ' channels, expected 4');
    }
    images.push({ z: zlib.deflateSync(data, { level: 6 }), w: info.width, h: info.height });
  }

  const pageW = pt(widthMm), pageH = pt(heightMm);
  const box = (b) => '[' + pt(b.x) + ' ' + pt(b.y) + ' ' + pt(b.x + b.w) + ' ' + pt(b.y + b.h) + ']';
  const trimBox = box(trimMm);
  const bleedBox = box(bleedMm);

  // Full-page image placement — identical for every page.
  const contentZ = zlib.deflateSync(
    Buffer.from('q\n' + pageW + ' 0 0 ' + pageH + ' 0 0 cm\n/Im0 Do\nQ\n', 'latin1'), { level: 9 });

  const now = new Date();
  const docId = Buffer.from(title + '|' + images.map(i => i.w + 'x' + i.h).join(',') + '|' + now.toISOString())
    .toString('hex').slice(0, 32).padEnd(32, '0');

  const xmp = ('<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n' +
'<x:xmpmeta xmlns:x="adobe:ns:meta/">\n' +
' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
'  <rdf:Description rdf:about=""\n' +
'    xmlns:dc="http://purl.org/dc/elements/1.1/"\n' +
'    xmlns:xmp="http://ns.adobe.com/xap/1.0/"\n' +
'    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"\n' +
'    xmlns:pdfx="http://ns.adobe.com/pdfx/1.3/"\n' +
'    xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/">\n' +
'   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">' + title + '</rdf:li></rdf:Alt></dc:title>\n' +
'   <xmp:CreatorTool>' + creator + '</xmp:CreatorTool>\n' +
'   <xmp:CreateDate>' + now.toISOString() + '</xmp:CreateDate>\n' +
'   <xmp:ModifyDate>' + now.toISOString() + '</xmp:ModifyDate>\n' +
'   <pdf:Trapped>False</pdf:Trapped>\n' +
'   <pdfx:GTS_PDFXVersion>PDF/X-3:2003</pdfx:GTS_PDFXVersion>\n' +
'   <pdfxid:GTS_PDFXVersion>PDF/X-3:2003</pdfxid:GTS_PDFXVersion>\n' +
'  </rdf:Description>\n' +
' </rdf:RDF>\n' +
'</x:xmpmeta>\n<?xpacket end="w"?>');
  const xmpBuf = Buffer.from(xmp, 'utf8');
  const iccZ = zlib.deflateSync(profile.buf, { level: 9 });

  // ---- object numbering -----------------------------------------------------
  // 1 Catalog · 2 Pages · 3 OutputIntent · 4 DestOutputProfile · 5 Metadata
  // 6 Info · then three objects per page: Page, Contents, Image.
  const N_FIXED = 6;
  const pageObj    = (i) => N_FIXED + 1 + i * 3;
  const contentObj = (i) => N_FIXED + 2 + i * 3;
  const imageObj   = (i) => N_FIXED + 3 + i * 3;
  const total = N_FIXED + images.length * 3;

  const chunks = [];
  const offsets = new Array(total + 1).fill(0);
  let pos = 0;
  const push = (buf) => { chunks.push(buf); pos += buf.length; };
  const obj = (n, body, stream = null) => {
    offsets[n] = pos;
    push(Buffer.from(n + ' 0 obj\n' + body + '\n', 'latin1'));
    if (stream) {
      push(Buffer.from('stream\n', 'latin1'));
      push(stream);
      push(Buffer.from('\nendstream\n', 'latin1'));
    }
    push(Buffer.from('endobj\n', 'latin1'));
  };

  push(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1'));

  obj(1, '<< /Type /Catalog /Pages 2 0 R /Metadata 5 0 R /OutputIntents [3 0 R] >>');
  obj(2, '<< /Type /Pages /Kids [' + images.map((_, i) => pageObj(i) + ' 0 R').join(' ') +
         '] /Count ' + images.length + ' >>');
  obj(3,
    '<< /Type /OutputIntent /S /GTS_PDFX ' +
    '/OutputConditionIdentifier (' + pdfStr(iccName) + ') ' +
    '/OutputCondition (' + pdfStr(profile.family) + '; profile embedded) ' +
    '/Info (' + pdfStr(iccName) + ') ' +
    '/RegistryName (http://www.color.org) ' +
    '/DestOutputProfile 4 0 R >>');
  obj(4, '<< /N 4 /Filter /FlateDecode /Length ' + iccZ.length + ' >>', iccZ);
  obj(5, '<< /Type /Metadata /Subtype /XML /Length ' + xmpBuf.length + ' >>', xmpBuf);
  obj(6,
    '<< /Title (' + pdfStr(title) + ') /Creator (' + pdfStr(creator) + ') ' +
    '/Producer (Nordic Advanced Systems) ' +
    '/CreationDate (' + pdfDate(now) + ') /ModDate (' + pdfDate(now) + ') ' +
    '/GTS_PDFXVersion (PDF/X-3:2003) /GTS_PDFXConformance (PDF/X-3:2003) /Trapped /False >>');

  images.forEach((img, i) => {
    obj(pageObj(i),
      '<< /Type /Page /Parent 2 0 R ' +
      '/MediaBox [0 0 ' + pageW + ' ' + pageH + '] ' +
      '/BleedBox ' + bleedBox + ' ' +
      '/TrimBox ' + trimBox + ' ' +
      '/Resources << /XObject << /Im0 ' + imageObj(i) + ' 0 R >> >> ' +
      '/Contents ' + contentObj(i) + ' 0 R >>');
    obj(contentObj(i), '<< /Length ' + contentZ.length + ' /Filter /FlateDecode >>', contentZ);
    obj(imageObj(i),
      '<< /Type /XObject /Subtype /Image /Name /Im0 ' +
      '/Width ' + img.w + ' /Height ' + img.h + ' ' +
      '/ColorSpace /DeviceCMYK /BitsPerComponent 8 ' +
      '/Filter /FlateDecode /Length ' + img.z.length + ' >>', img.z);
  });

  const xrefPos = pos;
  const N = total + 1;
  let xref = 'xref\n0 ' + N + '\n0000000000 65535 f \n';
  for (let i = 1; i < N; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer\n<< /Size ' + N + ' /Root 1 0 R /Info 6 0 R /ID [<' + docId + '> <' + docId + '>] >>\n' +
          'startxref\n' + xrefPos + '\n%%EOF\n';
  push(Buffer.from(xref, 'latin1'));

  await fs.writeFile(outPath, Buffer.concat(chunks));

  return {
    iccPath: profile.path, iccName, iccFamily: profile.family,
    pages: images.length,
    width: images[0].w, height: images[0].h,
    dpi: Math.round(images[0].w / (widthMm / 25.4)),
  };
}
