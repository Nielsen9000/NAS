// Stamp product figures from brand/specs.mjs into the website, in place.
//
//   node brand/build_site_specs.mjs           → rewrite the pages from config
//   node brand/build_site_specs.mjs --check   → verify only; exit 1 if any page
//                                               is stale against the config
//
// The site is static HTML served as-is, so this is not a build step the server
// depends on — the pages stay plain HTML. It is the enforcement step: every
// spec figure on the site is MARKED, and a marked figure can only ever be what
// specs.mjs says it is. Three marker forms:
//
//   <span data-spec="ds.currents.0">65A</span>
//       element text is replaced by the value at that config path
//
//   <span class="count" data-spec-target="nas2num.hp" data-target="35">
//       the data-target attribute (animated counters) is replaced
//
//   <meta name="description" data-spec-tpl="… {ds.currents.0} …" content="…">
//   'RANGE 847 / 1,000 KM', /* spec-tpl:RANGE 847 / {nas2num.rangeKmComma} KM */
//       content attribute / preceding JS string is re-rendered from the
//       template, {dotted.path} placeholders resolved against the config
//
// After stamping, every page is swept for FORBIDDEN patterns (stale figures,
// banned claims — e.g. the pre-August 60A rating, "NDAA-certified") and the
// run fails if one appears anywhere, marked or not.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DRONE_STACK_BASE, DRONE_STACK_FC_BASE, DRONE_STACK_65, DRONE_STACK_100, NAS2, NAS2_NUM, FORBIDDEN } from './specs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const CHECK = process.argv.includes('--check');

const PAGES = [
  'index.html',
  'nas/index.html',
  'engineering/index.html',
  'conduct/index.html',
  'careers/index.html',
  'contact/index.html',
  'intelligence/drone-stack/index.html',
  'intelligence/efi/index.html',
];

const ROOTS = {
  dsb: DRONE_STACK_BASE,      // shared between the two ESCs
  dsfc: DRONE_STACK_FC_BASE,  // shared by both flight controllers
  ds65: DRONE_STACK_65,
  ds100: DRONE_STACK_100,
  nas2: NAS2,
  nas2num: {
    ...NAS2_NUM,
    // '1,000' — the hero HUD ticker formats the range with a thousands separator
    rangeKmComma: Number(NAS2_NUM.rangeKm).toLocaleString('en-US'),
  },
};

function resolve(pathStr) {
  let v = ROOTS;
  for (const seg of pathStr.split('.')) {
    v = v?.[seg];
    if (v === undefined) throw new Error(`unknown spec path "${pathStr}"`);
  }
  if (typeof v !== 'string' && typeof v !== 'number')
    throw new Error(`spec path "${pathStr}" is not a scalar`);
  return String(v);
}
const render = (tpl) => tpl.replace(/\{([a-zA-Z0-9_.]+)\}/g, (_, p) => resolve(p));

async function processPage(rel) {
  const file = path.join(repoRoot, rel);
  const src = await fs.readFile(file, 'utf8');
  let out = src;
  let n = 0;

  // 1. element text from config
  out = out.replace(/(<span[^>]*\bdata-spec="([^"]+)"[^>]*>)([^<]*)(<\/span>)/g,
    (_, open, key, _text, close) => { n++; return open + resolve(key) + close; });

  // 2. animated-counter targets
  out = out.replace(/<span[^>]*\bdata-spec-target="[^"]+"[^>]*>/g, (tag) => {
    const key = tag.match(/data-spec-target="([^"]+)"/)[1];
    n++;
    return tag.replace(/data-target="[^"]*"/, `data-target="${resolve(key)}"`);
  });

  // 3. meta description templates
  out = out.replace(/<meta([^>]*)\bdata-spec-tpl="([^"]+)"([^>]*)>/g, (tag, pre, tpl, post) => {
    n++;
    const rendered = render(tpl);
    return tag.replace(/content="[^"]*"/, `content="${rendered}"`);
  });

  // 4. JS string templates
  out = out.replace(/'[^'\n]*',(\s*)\/\* spec-tpl:([^*]+?)\*\//g, (_, ws, tpl) => {
    n++;
    return `'${render(tpl.trim())}',${ws}/* spec-tpl:${tpl}*/`;
  });

  // 5. forbidden sweep — on the whole page, marked or not
  const hits = [];
  for (const re of FORBIDDEN) {
    const m = out.match(re);
    if (m) hits.push(`${re} → "${m[0]}"`);
  }
  if (hits.length)
    throw new Error(`${rel}: FORBIDDEN pattern(s) present:\n  ` + hits.join('\n  '));

  const stale = out !== src;
  if (stale && CHECK)
    throw new Error(`${rel}: page is stale against brand/specs.mjs — run node brand/build_site_specs.mjs`);
  if (stale && !CHECK) await fs.writeFile(file, out, 'utf8');
  console.log(`  ${rel.padEnd(38)} ${n} marker(s)` +
    (CHECK ? '  in sync' : stale ? '  RESTAMPED' : '  already in sync'));
  return n;
}

console.log(`Site spec stamp ${CHECK ? '(check only)' : ''} — source: brand/specs.mjs`);
let total = 0;
for (const p of PAGES) total += await processPage(p);
console.log(`${total} marker(s) across ${PAGES.length} pages; forbidden patterns: none. Done.`);
