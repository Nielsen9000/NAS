import { chromium } from '../.screenshots/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';

// Re-clean from the original remove.bg source (avoid compounding artifacts).
const INPUT = 'assets/anatomy-static-removebg-preview.png';
const OUTPUT = 'assets/nas_engine_v2_clean.png';
const uri = 'data:image/png;base64,' + (await fs.readFile(INPUT)).toString('base64');

const b = await chromium.launch();
const p = await b.newPage();
await p.setContent('<canvas id=c></canvas><canvas id=pv></canvas>');

const out = await p.evaluate(async (u) => {
  const img = new Image();
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = u; });
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.getElementById('c'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, W, H); const d = im.data;
  let src = new Uint8ClampedArray(d);
  const A = (x, y) => src[(y * W + x) * 4 + 3];

  const before = (() => {
    let eN = 0, eLum = 0, light = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = (y * W + x) * 4; if (src[i + 3] === 0) continue;
      if (A(x-1,y)===0||A(x+1,y)===0||A(x,y-1)===0||A(x,y+1)===0){eN++;const l=0.299*src[i]+0.587*src[i+1]+0.114*src[i+2];eLum+=l;if(l>160)light++;}
    }
    return { edgeN: eN, edgeAvgLum: +(eLum/eN).toFixed(1), lightPct: +(100*light/eN).toFixed(1) };
  })();

  // 1) haze: alpha < 120 → gone (clean cutout, safe to be firm)
  for (let i = 0; i < d.length; i += 4) if (d[i+3] < 120) { d[i]=d[i+1]=d[i+2]=0; d[i+3]=0; }
  src.set(d);

  // 2) erode alpha mask by 1px: drop any visible pixel touching transparency
  //    (removes the outermost bright rim ring entirely)
  for (let pass = 0; pass < 1; pass++) {
    const snap = new Uint8ClampedArray(d);
    const a2 = (x,y)=>snap[(y*W+x)*4+3];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y*W+x)*4; if (snap[i+3]===0) continue;
      const edge = x===0||y===0||x===W-1||y===H-1||a2(x-1,y)===0||a2(x+1,y)===0||a2(x,y-1)===0||a2(x,y+1)===0;
      if (edge){ d[i]=d[i+1]=d[i+2]=0; d[i+3]=0; }
    }
    src.set(d);
  }

  // 3) colour-defringe: recolour remaining near-edge pixels to the engine's
  //    own colour (nearest opaque core), so no light rim survives on dark bg
  const R = 2, CORE = 210;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y*W+x)*4; if (src[i+3]===0) continue;
    let near = false;
    for (let dy=-R; dy<=R && !near; dy++) for (let dx=-R; dx<=R; dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H||A(nx,ny)===0){near=true;break;}}
    if (!near) continue;
    let cr=0,cg=0,cb=0,n=0;
    for (let dy=-R; dy<=R; dy++) for (let dx=-R; dx<=R; dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const j=(ny*W+nx)*4;if(src[j+3]>=CORE){cr+=src[j];cg+=src[j+1];cb+=src[j+2];n++;}}
    if (n===0){ d[i]=d[i+1]=d[i+2]=0; d[i+3]=0; continue; }
    const ar=cr/n,ag=cg/n,ab=cb/n;
    const lum=0.299*src[i]+0.587*src[i+1]+0.114*src[i+2];
    const cl=0.299*ar+0.587*ag+0.114*ab;
    if (lum > cl + 6){ d[i]=ar; d[i+1]=ag; d[i+2]=ab; }
  }
  src.set(d);

  // 4) knock out any bright low-alpha remnants
  for (let i = 0; i < d.length; i += 4){const a=d[i+3];if(a>0&&a<255){const l=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];if(l>195&&a<185){d[i]=d[i+1]=d[i+2]=0;d[i+3]=0;}}}

  const after = (() => {
    const a3=(x,y)=>d[(y*W+x)*4+3];
    let eN=0,eLum=0,light=0;
    for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++){const i=(y*W+x)*4;if(d[i+3]===0)continue;if(a3(x-1,y)===0||a3(x+1,y)===0||a3(x,y-1)===0||a3(x,y+1)===0){eN++;const l=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];eLum+=l;if(l>160)light++;}}
    return { edgeN:eN, edgeAvgLum:+(eLum/eN).toFixed(1), lightPct:+(100*light/eN).toFixed(1) };
  })();

  ctx.putImageData(im, 0, 0);
  const cleanPng = c.toDataURL('image/png');

  const pv = document.getElementById('pv'); pv.width = W; pv.height = H;
  const pc = pv.getContext('2d'); pc.fillStyle = '#08202a'; pc.fillRect(0,0,W,H); pc.drawImage(c,0,0);
  return { before, after, cleanPng, preview: pv.toDataURL('image/png'), W, H };
}, uri);

await b.close();
await fs.writeFile(OUTPUT, Buffer.from(out.cleanPng.split(',')[1], 'base64'));
await fs.writeFile('brand/_engine_dark.png', Buffer.from(out.preview.split(',')[1], 'base64'));
console.log('before:', JSON.stringify(out.before));
console.log('after :', JSON.stringify(out.after));
console.log('wrote', OUTPUT, out.W + 'x' + out.H);
