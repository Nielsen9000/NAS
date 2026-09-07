// Build a branded "Save contact" landing page + .vcf per person, in NAS layout.
// Output: /c/<slug>.html  and  /c/<slug>.vcf  (served from nordicadvancedsystems.com/c/<slug>).
// The business-card QR points at /c/<slug>; the page has a big "Save contact" button.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPANY, PEOPLE, vcardFull, telDigits } from './people.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'c');

const NAVY = '#08202a', CYAN = '#3bb6e8';

const ICON = {
  phone: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
};

function page(p, logoSvg) {
  const tel = telDigits(p);
  const sig = p.phoneIsSignal ? '<span class="sig">SIGNAL</span>' : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.name} — Nordic Advanced Systems</title>
<meta name="description" content="${p.name}, ${p.title} at Nordic Advanced Systems. Save contact.">
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{ --navy:${NAVY}; --cyan:${CYAN}; --ink:#f3f7f8; --ink2:rgba(243,247,248,.6); --line:rgba(148,205,221,.16); }
  *,*::before,*::after{ box-sizing:border-box; }
  html,body{ margin:0; }
  a{ text-decoration:none; color:inherit; }
  body{ background:var(--navy); color:var(--ink); font-family:'Space Grotesk',system-ui,sans-serif;
    min-height:100svh; display:flex; align-items:flex-start; justify-content:center; -webkit-font-smoothing:antialiased; }
  .card{ position:relative; width:100%; max-width:430px; padding:46px 26px 40px; overflow:hidden; }
  .atmos{ position:absolute; inset:0; z-index:0; pointer-events:none;
    background:radial-gradient(120% 70% at 50% -10%, rgba(59,182,232,.18), transparent 60%); }
  .inner{ position:relative; z-index:1; }
  .logo{ width:188px; margin:0 auto 30px; }
  .logo svg{ width:100%; height:auto; display:block; }
  .name{ font-family:'Inter',sans-serif; font-weight:800; font-size:30px; line-height:1.05; text-align:center; margin:0; letter-spacing:.2px; }
  .title{ font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:.22em; text-transform:uppercase; color:var(--cyan);
    text-align:center; margin:10px 0 28px; }
  .save{ display:flex; align-items:center; justify-content:center; gap:9px; width:100%; padding:16px;
    background:var(--cyan); color:#062430; font-family:'Inter',sans-serif; font-weight:700; font-size:16px; letter-spacing:.2px;
    border-radius:14px; box-shadow:0 10px 30px rgba(59,182,232,.28); transition:transform .15s ease, box-shadow .15s ease; }
  .save:active{ transform:translateY(1px); }
  .save svg{ width:19px; height:19px; }
  .links{ margin-top:26px; border-top:1px solid var(--line); }
  .row{ display:flex; align-items:center; gap:14px; padding:15px 4px; border-bottom:1px solid var(--line); color:var(--ink); }
  .row svg{ width:20px; height:20px; color:var(--cyan); flex:0 0 auto; }
  .row .txt{ font-size:15.5px; word-break:break-word; }
  .row .sig{ margin-left:auto; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.16em; color:var(--cyan);
    border:1px solid var(--cyan); border-radius:5px; padding:3px 7px; }
  .addr{ margin:26px 0 0; text-align:center; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.04em; color:var(--ink2); line-height:1.7; }
</style>
</head>
<body>
  <main class="card">
    <div class="atmos"></div>
    <div class="inner">
      <div class="logo">${logoSvg}</div>
      <h1 class="name">${p.name}</h1>
      <p class="title">${p.title}</p>
      <a class="save" href="/c/${p.slug}.vcf">${ICON.download} Save contact</a>
      <nav class="links">
        <a class="row" href="tel:${tel}">${ICON.phone}<span class="txt">${p.phone}</span>${sig}</a>
        <a class="row" href="mailto:${p.email}">${ICON.mail}<span class="txt">${p.email}</span></a>
        <a class="row" href="${COMPANY.url}">${ICON.globe}<span class="txt">${COMPANY.website}</span></a>
      </nav>
      <p class="addr">${COMPANY.address}<br>${COMPANY.vat}</p>
    </div>
  </main>
</body>
</html>`;
}

const logoSvg = await fs.readFile(path.join(repoRoot, 'LOGER/v10/nas-logo-dark-transparent-v10.svg'), 'utf8');
await fs.mkdir(outDir, { recursive: true });
for (const p of PEOPLE) {
  await fs.writeFile(path.join(outDir, `${p.slug}.html`), page(p, logoSvg));
  await fs.writeFile(path.join(outDir, `${p.slug}.vcf`), vcardFull(p));
  console.log(`✓ c/${p.slug}.html + c/${p.slug}.vcf`);
}
console.log('Done. Pages live at', PEOPLE.map(p => `/c/${p.slug}`).join(', '));
