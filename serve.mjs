// Minimal static file server for this project.
// Usage: node serve.mjs
// Serves the current directory at http://localhost:3000
// Supports HTTP Range requests (required for <video> seeking / scroll-scrub).
import { createServer } from 'node:http';
import { stat, open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf'
};

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let filePath = normalize(join(ROOT, urlPath === '/' ? '/index.html' : urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

    let s;
    try { s = await stat(filePath); } catch { res.writeHead(404).end('Not found'); return; }
    if (s.isDirectory()) {
      filePath = join(filePath, 'index.html');
      try { s = await stat(filePath); } catch { res.writeHead(404).end('Not found'); return; }
    }

    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    const size = s.size;
    const range = req.headers.range;

    if (range) {
      // Parse "bytes=start-end"
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!m) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
      let start = m[1] === '' ? (size - Number(m[2])) : Number(m[1]);
      let end   = m[2] === '' ? (size - 1) : Number(m[2]);
      if (isNaN(start) || isNaN(end) || start < 0 || end >= size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return;
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Length': (end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store'
      });
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store'
    });
    createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500).end('Server error: ' + err.message);
  }
}).listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
});
