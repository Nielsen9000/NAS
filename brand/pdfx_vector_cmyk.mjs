// RGB → DeviceCMYK for a VECTOR pdf, preserving fonts and the text layer.
//
// The sibling module pdfx_cmyk.mjs rasterises a page to one CMYK image. That is
// right for a roll-up or a business card, where the artwork is a picture — but
// wrong for a datasheet, where a reader has to be able to select a spec value
// and where the print master should keep its type as vector outlines. Rasterising
// destroys both.
//
// So this module edits the PDF instead of rebuilding it:
//
//   · every `r g b rg` / `RG` fill and stroke operator is converted to `c m y k k`
//     / `K` through the real FOGRA39 profile;
//   · every DeviceRGB image XObject is converted to DeviceCMYK;
//   · an OutputIntent with the embedded profile and PDF/X-3 metadata is added;
//   · fonts, glyph programs, ToUnicode CMaps and all text operators are left
//     byte-for-byte alone.
//
// Assumes the classic PDF structure Chromium emits: plain `N 0 obj` objects and
// a plain xref table, no object streams, no cross-reference streams, no
// encryption. It verifies that before touching anything.

import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { findCmykProfile, iccDescription } from './pdfx_cmyk.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- colour conversion, memoised -------------------------------------------
// Each distinct RGB triple is pushed through the actual output profile rather
// than a formula, so the datasheet separates the same way as anything else that
// carries this ICC.
function makeConverter(iccPath) {
  const cache = new Map();
  return async function rgb2cmyk(r, g, b) {
    const key = `${r},${g},${b}`;
    if (cache.has(key)) return cache.get(key);
    const { data } = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r, g, b } },
    }).withIccProfile(iccPath).toColourspace('cmyk').raw().toBuffer({ resolveWithObject: true });
    const out = [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255];
    cache.set(key, out);
    return out;
  };
}
const f4 = (n) => (Math.round(n * 10000) / 10000).toString();

// ---- object model ----------------------------------------------------------
// Parse `N 0 obj … endobj` into { num, dict, stream } keeping raw bytes, so
// anything we do not explicitly rewrite survives untouched.
function parseObjects(buf) {
  const s = buf.toString('latin1');
  const objs = [];
  const re = /(\d+)\s+0\s+obj\b/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const num = +m[1];
    const bodyStart = m.index + m[0].length;
    const endIdx = s.indexOf('endobj', bodyStart);
    if (endIdx === -1) continue;
    const sIdx = s.indexOf('stream', bodyStart);
    let dict, stream = null;
    if (sIdx !== -1 && sIdx < endIdx) {
      dict = s.slice(bodyStart, sIdx);
      let dataStart = sIdx + 6;
      if (s[dataStart] === '\r') dataStart++;
      if (s[dataStart] === '\n') dataStart++;
      const endStream = s.lastIndexOf('endstream', endIdx);
      let dataEnd = endStream;
      if (s[dataEnd - 1] === '\n') dataEnd--;
      if (s[dataEnd - 1] === '\r') dataEnd--;
      stream = buf.subarray(dataStart, dataEnd);
    } else {
      dict = s.slice(bodyStart, endIdx);
    }
    objs.push({ num, dict: dict.trim(), stream });
    re.lastIndex = endIdx;
  }
  return objs;
}

const isContentish = (d) => !/\/Subtype\s*\/Image/.test(d) && !/\/Type\s*\/(Font|Metadata|XRef|ObjStm)/.test(d);

async function inflateIfNeeded(dict, stream) {
  if (!stream) return null;
  if (/\/Filter\s*\/FlateDecode/.test(dict)) {
    try { return zlib.inflateSync(stream); } catch { return null; }
  }
  if (!/\/Filter/.test(dict)) return stream;
  return null;    // DCT, LZW etc — handled separately for images
}

// ---- content stream colour rewrite -----------------------------------------
// Operates on the token text. Only the colour operators are touched; text
// operators (Tj/TJ/Tf/Td) and everything else pass through unchanged.
async function convertContent(text, rgb2cmyk, counter) {
  const re = /(^|[\s])(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(rg|RG)(?=[\s\]\/<(]|$)/g;
  const jobs = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    jobs.push({ idx: m.index, len: m[0].length, lead: m[1],
                r: +m[2], g: +m[3], b: +m[4], op: m[5] });
  }
  if (!jobs.length) return text;
  let out = '', last = 0;
  for (const j of jobs) {
    const [c, mm, y, k] = await rgb2cmyk(
      Math.max(0, Math.min(255, Math.round(j.r * 255))),
      Math.max(0, Math.min(255, Math.round(j.g * 255))),
      Math.max(0, Math.min(255, Math.round(j.b * 255))));
    out += text.slice(last, j.idx) + j.lead +
           `${f4(c)} ${f4(mm)} ${f4(y)} ${f4(k)} ${j.op === 'rg' ? 'k' : 'K'}`;
    last = j.idx + j.len;
    counter.n++;
  }
  return out + text.slice(last);
}

// ---- image conversion ------------------------------------------------------
async function convertImage(obj, iccPath, counter) {
  const d = obj.dict;
  if (!/\/Subtype\s*\/Image/.test(d)) return false;
  if (!/\/ColorSpace\s*\/DeviceRGB/.test(d)) return false;     // gray/CMYK/indexed: leave alone
  const W = +(d.match(/\/Width\s+(\d+)/) || [])[1];
  const H = +(d.match(/\/Height\s+(\d+)/) || [])[1];
  if (!W || !H) return false;

  let raw;
  if (/\/Filter\s*\/FlateDecode/.test(d)) {
    try { raw = zlib.inflateSync(obj.stream); } catch { return false; }
  } else if (/\/Filter\s*\/DCTDecode/.test(d)) {
    raw = await sharp(obj.stream).removeAlpha().raw().toBuffer();
  } else return false;

  if (raw.length < W * H * 3) return false;
  const { data } = await sharp(raw.subarray(0, W * H * 3), { raw: { width: W, height: H, channels: 3 } })
    .withIccProfile(iccPath).toColourspace('cmyk').raw().toBuffer({ resolveWithObject: true });

  obj.stream = zlib.deflateSync(data, { level: 6 });
  obj.dict = d
    .replace(/\/ColorSpace\s*\/DeviceRGB/, '/ColorSpace /DeviceCMYK')
    .replace(/\/Filter\s*\/DCTDecode/, '/Filter /FlateDecode')
    .replace(/\/Length\s+\d+/, `/Length ${obj.stream.length}`);
  if (!/\/Filter/.test(obj.dict)) obj.dict = obj.dict.replace(/>>\s*$/, ` /Filter /FlateDecode >>`);
  if (!/\/Length/.test(obj.dict)) obj.dict = obj.dict.replace(/>>\s*$/, ` /Length ${obj.stream.length} >>`);
  counter.n++;
  return true;
}

// ---- main ------------------------------------------------------------------
export async function toPdfxCmyk({ inPath, outPath, title, creator }) {
  const buf = await fs.readFile(inPath);
  const head = buf.toString('latin1');

  if (/\/Encrypt/.test(head)) throw new Error(`${inPath}: encrypted PDFs are not supported.`);
  if (/\/Type\s*\/ObjStm/.test(head)) throw new Error(`${inPath}: uses object streams — not supported.`);
  if (/\/Type\s*\/XRef/.test(head)) throw new Error(`${inPath}: uses a cross-reference stream — not supported.`);

  const profile = await findCmykProfile();
  const rgb2cmyk = makeConverter(profile.path);
  const iccName = iccDescription(profile.buf);

  const objs = parseObjects(buf);
  if (!objs.length) throw new Error(`${inPath}: no objects found.`);

  const fills = { n: 0 }, imgs = { n: 0 };

  for (const o of objs) {
    if (await convertImage(o, profile.path, imgs)) continue;
    if (!o.stream || !isContentish(o.dict)) continue;
    const inflated = await inflateIfNeeded(o.dict, o.stream);
    if (!inflated) continue;
    const text = inflated.toString('latin1');
    if (!/\b(rg|RG)\b/.test(text)) continue;
    const converted = await convertContent(text, rgb2cmyk, fills);
    if (converted === text) continue;
    const outBuf = Buffer.from(converted, 'latin1');
    if (/\/Filter\s*\/FlateDecode/.test(o.dict)) {
      o.stream = zlib.deflateSync(outBuf, { level: 9 });
    } else {
      o.stream = outBuf;
    }
    o.dict = o.dict.replace(/\/Length\s+\d+/, `/Length ${o.stream.length}`);
  }

  const shadings = (head.match(/\/Shading/g) || []).length;

  // ---- new objects: ICC, OutputIntent, XMP ----
  const maxNum = objs.reduce((m, o) => Math.max(m, o.num), 0);
  const iccNum = maxNum + 1, oiNum = maxNum + 2, xmpNum = maxNum + 3;
  const iccZ = zlib.deflateSync(profile.buf, { level: 9 });
  const pdfStr = (s) => String(s).replace(/([\\()])/g, '\\$1');

  objs.push({ num: iccNum, dict: `<< /N 4 /Filter /FlateDecode /Length ${iccZ.length} >>`, stream: iccZ });
  objs.push({ num: oiNum, dict:
    `<< /Type /OutputIntent /S /GTS_PDFX ` +
    `/OutputConditionIdentifier (${pdfStr(iccName)}) ` +
    `/OutputCondition (${pdfStr(profile.family)}; profile embedded) ` +
    `/Info (${pdfStr(iccName)}) /RegistryName (http://www.color.org) ` +
    `/DestOutputProfile ${iccNum} 0 R >>`, stream: null });

  const now = new Date();
  const xmp = Buffer.from(`<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:pdfx="http://ns.adobe.com/pdfx/1.3/" xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title}</rdf:li></rdf:Alt></dc:title>
   <xmp:CreatorTool>${creator}</xmp:CreatorTool>
   <xmp:CreateDate>${now.toISOString()}</xmp:CreateDate>
   <pdf:Trapped>False</pdf:Trapped>
   <pdfx:GTS_PDFXVersion>PDF/X-3:2003</pdfx:GTS_PDFXVersion>
   <pdfxid:GTS_PDFXVersion>PDF/X-3:2003</pdfxid:GTS_PDFXVersion>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`, 'utf8');
  objs.push({ num: xmpNum, dict: `<< /Type /Metadata /Subtype /XML /Length ${xmp.length} >>`, stream: xmp });

  // ---- patch the Catalog ----
  const cat = objs.find(o => /\/Type\s*\/Catalog/.test(o.dict));
  if (!cat) throw new Error('no /Catalog found');
  let cd = cat.dict.replace(/\/OutputIntents\s*\[[^\]]*\]/, '').replace(/\/Metadata\s+\d+\s+0\s+R/, '');
  cat.dict = cd.replace(/>>\s*$/, ` /OutputIntents [${oiNum} 0 R] /Metadata ${xmpNum} 0 R >>`);

  // ---- re-serialise with a fresh xref ----
  objs.sort((a, b) => a.num - b.num);
  const chunks = [];
  const offsets = new Map();
  let pos = 0;
  const push = (b) => { chunks.push(b); pos += b.length; };
  push(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1'));
  for (const o of objs) {
    offsets.set(o.num, pos);
    push(Buffer.from(`${o.num} 0 obj\n${o.dict}\n`, 'latin1'));
    if (o.stream) {
      push(Buffer.from('stream\n', 'latin1'));
      push(o.stream);
      push(Buffer.from('\nendstream\n', 'latin1'));
    }
    push(Buffer.from('endobj\n', 'latin1'));
  }
  const maxObj = objs[objs.length - 1].num;
  const xrefPos = pos;
  let xref = `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxObj; i++) {
    xref += offsets.has(i)
      ? `${String(offsets.get(i)).padStart(10, '0')} 00000 n \n`
      : `0000000000 65535 f \n`;
  }
  const rootNum = cat.num;
  const infoMatch = head.match(/\/Info\s+(\d+)\s+0\s+R/);
  const docId = Buffer.from(`${title}|${now.toISOString()}`).toString('hex').slice(0, 32).padEnd(32, '0');
  xref += `trailer\n<< /Size ${maxObj + 1} /Root ${rootNum} 0 R` +
          (infoMatch && offsets.has(+infoMatch[1]) ? ` /Info ${infoMatch[1]} 0 R` : '') +
          ` /ID [<${docId}> <${docId}>] >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  push(Buffer.from(xref, 'latin1'));

  await fs.writeFile(outPath, Buffer.concat(chunks));
  const size = (await fs.stat(outPath)).size;

  return {
    size, fillsConverted: fills.n, imagesConverted: imgs.n, shadings,
    iccPath: profile.path, iccName, iccFamily: profile.family,
  };
}
