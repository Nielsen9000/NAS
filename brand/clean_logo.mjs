// Clean an AI-rendered NAS logo raster: despeckle + solidify hollow/broken letters,
// preserving exact shapes/colours. Palette auto-detected (2 inks).
import sharp from 'sharp';

// Returns cleaned per-colour binary masks at native resolution.
export async function cleanMasks(src, {
  closeR = 2, speck = 120, alphaT = 40, restrictSecondaryToMark = false,
} = {}) {
  const { info, data } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels, N = W * H;

  // ---- auto-detect up to 2 dominant ink colours ----
  const buckets = new Map();
  for (let i = 0; i < N; i++) {
    if (data[i * C + 3] < alphaT) continue;
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    const key = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4);
    let e = buckets.get(key); if (!e) buckets.set(key, e = { n: 0, r: 0, g: 0, b: 0 });
    e.n++; e.r += r; e.g += g; e.b += b;
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n)
    .map(e => ({ n: e.n, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n }));
  const palette = [sorted[0]];
  for (const c of sorted.slice(1)) {
    if (Math.hypot(c.r - palette[0].r, c.g - palette[0].g, c.b - palette[0].b) > 80) { palette.push(c); break; }
  }
  const snap = palette.map(c => [Math.round(c.r), Math.round(c.g), Math.round(c.b)]);

  // ---- per-colour masks (nearest palette colour) ----
  const masks = palette.map(() => new Uint8Array(N));
  for (let i = 0; i < N; i++) {
    if (data[i * C + 3] < alphaT) continue;
    const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
    let best = 0, bd = 1e9;
    for (let k = 0; k < palette.length; k++) {
      const d = Math.hypot(r - palette[k].r, g - palette[k].g, b - palette[k].b);
      if (d < bd) { bd = d; best = k; }
    }
    masks[best][i] = 1;
  }

  // ---- light version: keep secondary colour (cyan) only inside the mark ----
  if (restrictSecondaryToMark && masks.length > 1) {
    const colInk = new Int32Array(W);
    for (let i = 0; i < N; i++) if (data[i * C + 3] >= alphaT) colInk[i % W]++;
    let markStart = 0; while (markStart < W && colInk[markStart] === 0) markStart++;
    const GAP = Math.round(W * 0.02);
    let cutoff = W, run = 0;
    for (let x = markStart; x < W; x++) { if (colInk[x] === 0) { if (++run >= GAP) { cutoff = x - run + 1; break; } } else run = 0; }
    for (let y = 0; y < H; y++) for (let x = cutoff; x < W; x++) { const i = y * W + x; if (masks[1][i]) { masks[1][i] = 0; masks[0][i] = 1; } }
  }

  // ---- morphology + despeckle ----
  const dil = (s, r) => { const o = new Uint8Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let on = 0; for (let dy = -r; dy <= r && !on; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue; if (s[yy * W + xx]) { on = 1; break; } } } o[y * W + x] = on; } return o; };
  const ero = (s, r) => { const o = new Uint8Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let all = 1; for (let dy = -r; dy <= r && all; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) { all = 0; break; } for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) { all = 0; break; } if (!s[yy * W + xx]) { all = 0; break; } } } o[y * W + x] = all; } return o; };
  function despeckle(m, min) { const seen = new Uint8Array(N), st = []; for (let s = 0; s < N; s++) { if (seen[s] || !m[s]) continue; st.length = 0; st.push(s); seen[s] = 1; const px = [s]; while (st.length) { const p = st.pop(); const x = p % W, y = (p / W) | 0; if (x > 0 && !seen[p-1] && m[p-1]) { seen[p-1]=1; st.push(p-1); px.push(p-1); } if (x < W-1 && !seen[p+1] && m[p+1]) { seen[p+1]=1; st.push(p+1); px.push(p+1); } if (y > 0 && !seen[p-W] && m[p-W]) { seen[p-W]=1; st.push(p-W); px.push(p-W); } if (y < H-1 && !seen[p+W] && m[p+W]) { seen[p+W]=1; st.push(p+W); px.push(p+W); } } if (px.length < min) for (const q of px) m[q] = 0; } }
  const clean = masks.map(m => { const c = closeR > 0 ? ero(dil(m, closeR), closeR) : m; despeckle(c, speck); return c; });
  return { masks: clean, W, H, snap };
}

// Compose cleaned masks into an anti-aliased RGBA PNG (raster output path).
export async function cleanLogo(src, opts = {}) {
  const { superscale = 3, outScale = 2 } = opts;
  const { masks, W, H, snap } = await cleanMasks(src, opts);
  const N = W * H, out = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) for (let k = 0; k < masks.length; k++) if (masks[k][i]) { out[i*4]=snap[k][0]; out[i*4+1]=snap[k][1]; out[i*4+2]=snap[k][2]; out[i*4+3]=255; }
  const up = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).resize(W * superscale, H * superscale, { kernel: 'nearest' }).png().toBuffer();
  const aa = await sharp(up).resize(Math.round(W * outScale), Math.round(H * outScale), { kernel: 'lanczos3' }).png().toBuffer();
  return { buf: await sharp(aa).trim({ threshold: 10 }).toBuffer(), palette: snap };
}
