// Vectorize a cleaned NAS logo: trace each colour layer with potrace -> one crisp SVG.
import sharp from 'sharp';
import pkg from 'potrace';
import fs from 'fs';
import { cleanMasks } from './clean_logo.mjs';
const { Potrace } = pkg;

const UP = 6;                 // trace at 6x native for clean straight edges
const BLUR = 3.2;             // smooth staircase jaggies before tracing
const params = { turdSize: 30, alphaMax: 0.30, optCurve: true, optTolerance: 0.9, threshold: 128, blackOnWhite: true };

function tracePath(pngBuf) {
  return new Promise((res, rej) => {
    const p = new Potrace(params);
    p.loadImage(pngBuf, err => {
      if (err) return rej(err);
      const tag = p.getPathTag();                       // <path .../>
      const d = (tag.match(/ d="([^"]+)"/) || [])[1] || '';
      res(d);
    });
  });
}

export async function vectorize(src, outSvg, opts = {}) {
  const { masks, W, H, snap } = await cleanMasks(src, opts);
  const N = W * H;
  // content bbox (union of masks) for tight viewBox
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let k = 0; k < masks.length; k++) for (let i = 0; i < N; i++) if (masks[k][i]) { const x = i % W, y = (i / W) | 0; if (x<minX)minX=x; if (x>maxX)maxX=x; if (y<minY)minY=y; if (y>maxY)maxY=y; }

  const layers = [];
  for (let k = 0; k < masks.length; k++) {
    // native bitmap: shape black(0) on white(255)
    const gray = Buffer.alloc(N);
    for (let i = 0; i < N; i++) gray[i] = masks[k][i] ? 0 : 255;
    const up = await sharp(gray, { raw: { width: W, height: H, channels: 1 } })
      .resize(W * UP, H * UP, { kernel: 'lanczos3' }).blur(BLUR).png().toBuffer();
    const d = await tracePath(up);
    layers.push({ d, fill: `rgb(${snap[k][0]},${snap[k][1]},${snap[k][2]})` });
  }

  const pad = Math.round((maxY - minY) * 0.14) * UP;
  const vbX = minX * UP - pad, vbY = minY * UP - pad;
  const vbW = (maxX - minX + 1) * UP + pad * 2, vbH = (maxY - minY + 1) * UP + pad * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${vbW}" height="${vbH}">
${layers.map(l => `<path fill="${l.fill}" d="${l.d}"/>`).join('\n')}
</svg>`;
  fs.writeFileSync(outSvg, svg);
  return { svg: outSvg, palette: snap, vb: [vbX, vbY, vbW, vbH] };
}

// run both versions when invoked directly
const r1 = await vectorize('assets/NAS LOGO.png', 'assets/NAS_logo_light.svg', { restrictSecondaryToMark: true, closeR: 0 });
console.log('light', r1.palette);
const r2 = await vectorize('assets/NAS_LOGO_final.png', 'assets/NAS_logo_dark.svg', { closeR: 2 });
console.log('dark', r2.palette);
console.log('done');
