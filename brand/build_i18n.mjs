// i18n infrastructure for nordicadvancedsystems.com. English is the source
// language and stays at the site root; every other language is generated
// under its own prefix: /de/ /fi/ /fr/ /es/ /pt/ /it/ /uk/ (ISO codes; the
// routes are the bare codes, while <html lang> carries the regional form for
// the European variants: es-ES, pt-PT).
//
//   node brand/build_i18n.mjs --mark        one-time/idempotent codemod: stamp the
//                                           language switcher into every EN page,
//                                           add data-i18n markers to every
//                                           translatable element, then extract
//   node brand/build_i18n.mjs --extract     re-extract locales/en.json from the
//                                           marked pages and sync every
//                                           locales/<lang>.json (existing
//                                           translations preserved)
//   node brand/build_i18n.mjs --build <langs|all>   generate <lang>/<page>/index.html
//         --pseudo     pseudo-localise (lookalike glyphs + ~15% length) —
//                      for layout testing, never for deployment
//         --strict     a missing translation FAILS the build instead of
//                      falling back to English. Production gate: no en fallback
//                      in production — better no /<lang>/ page than a half one.
//                      Keys deliberately NOT translated are exempt via
//                      sentinels (see HOLD-BACK SENTINELS below).
//         --preview    bake ALL configured languages into the switcher list
//                      regardless of their `live` flag (i18n-preview branch
//                      and screenshots only — production stamps live langs).
//   node brand/build_i18n.mjs --check-layout [langs|all] [--real]
//                                           pseudo-build + Playwright: nav,
//                                           buttons and pages must hold with
//                                           15% longer text, desktop and mobile.
//                                           --real measures the actual copy in
//                                           the locale files instead.
//   (--build-uk is kept as an alias for --build uk.)
//
// HOLD-BACK SENTINELS in the locale files — a value that is exactly:
//   "@hold"  the key is deliberately untranslated because the ENGLISH source
//            is awaiting a rewrite (the 65A/100A drone-stack split and the
//            final NDAA wording). The build ships the current English text,
//            counts these loudly in its output, and --strict does not fail on
//            them — but they never silently disappear into an en fallback.
//   "@en"    the key stays English BY DECISION (the Code of Conduct's ten
//            legal sections: a mistranslated compliance sentence is a claim,
//            not a typo). Reported separately from @hold.
//
// WHAT GOES IN THE LOCALE FILES — and what does not. Spec figures never do:
// they live in brand/specs.mjs and are stamped by brand/build_site_specs.mjs,
// so they stay byte-identical across languages. A marked element containing a
// figure stores it as a {spec:path} placeholder ("requiring over {spec:nas2.range}
// range"); the uk build re-expands the placeholder from the config. Only the
// words around the figure are translatable.
//
// Never-translate tokens (NAS-BRAND.md) are skipped at extraction: an element
// whose whole text is part numbers / protocols / units ("STM32F405", "6× UART")
// is not a string a translator should ever see. The tagline "Built on
// integrity" stays English by decision (Jesper), the company name and postal
// address stay Latin, and the decorative HUD/REC telemetry strings stay
// English exactly as the print material keeps them.
//
// FONTS. Space Grotesk has no Cyrillic, so /uk/ pages swap every Space
// Grotesk stack for Inter (whose cyrillic subsets css2 serves on demand
// behind unicode-range). The six Latin languages keep Space Grotesk: its
// latin + latin-ext subsets cover ä ö ü ß, ã õ ç, à è é ì ò ù, ñ, ¿ ¡ and
// æ ø å — verified at runtime by --check-layout via document.fonts.check.
//
// ROUTING. /<lang>/<same path>/ for every page; internal links inside a
// language tree are rewritten to stay inside it. The switcher (text only, no
// flags — closed it shows just the active code plus a chevron, open it lists
// every offered language in its OWN name) swaps the prefix on the CURRENT
// path; if a page has no counterpart in the target language the link goes to
// the nearest existing parent, never blindly to the front page. The choice
// is remembered in localStorage. There is deliberately NO automatic redirect
// from IP or Accept-Language.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { DRONE_STACK, NAS2, NAS2_NUM } from './specs.mjs';
import { LANGS, UK_IN_SWITCHER } from '../locales/config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const localesDir = path.join(repoRoot, 'locales');
const RAW_ARGS = process.argv.slice(2);
const ARGS = new Set(RAW_ARGS);
const MODE = ['--mark', '--extract', '--build-uk', '--build', '--check-layout'].find(m => ARGS.has(m));
if (!MODE) throw new Error('mode required: --mark | --extract | --build <langs|all> [--pseudo|--strict] | --check-layout [langs|all] [--real]');
let PSEUDO = ARGS.has('--pseudo');
const STRICT = ARGS.has('--strict');
const PREVIEW = ARGS.has('--preview');

// ---------------------------------------------------------------------------
// language metadata. `code` is what the closed switcher shows; `native` is
// the open list entry (people look for their own word — "Deutsch", never
// "German"); `selectLabel` is the button's aria-label; `authoritative` is the
// locked footer line from NAS_TERMINOLOGI_6SPROG.md §7 (uk's is Claude's
// translation, flagged for native review in REVIEW-NOTES-UA.md).
// ---------------------------------------------------------------------------
const LANG_META = {
  en: { htmlLang: 'en',    native: 'English',    code: 'EN',  selectLabel: 'Select language' },
  de: { htmlLang: 'de',    native: 'Deutsch',    code: 'DE',  selectLabel: 'Sprache wählen',
        authoritative: 'Maßgeblich ist die englische Fassung.' },
  fi: { htmlLang: 'fi',    native: 'Suomi',      code: 'FI',  selectLabel: 'Valitse kieli',
        authoritative: 'Englanninkielinen versio on virallinen.' },
  fr: { htmlLang: 'fr',    native: 'Français',   code: 'FR',  selectLabel: 'Choisir la langue',
        authoritative: 'La version anglaise fait foi.' },
  es: { htmlLang: 'es-ES', native: 'Español',    code: 'ES',  selectLabel: 'Seleccionar idioma',
        authoritative: 'La versión en inglés es la versión auténtica.' },
  pt: { htmlLang: 'pt-PT', native: 'Português',  code: 'PT',  selectLabel: 'Selecionar idioma',
        authoritative: 'A versão em inglês é a versão autêntica.' },
  it: { htmlLang: 'it',    native: 'Italiano',   code: 'IT',  selectLabel: 'Seleziona la lingua',
        authoritative: 'Fa fede la versione inglese.' },
  uk: { htmlLang: 'uk',    native: 'Українська', code: 'УКР', selectLabel: 'Вибрати мову',
        authoritative: 'Англійська версія є автентичною.', cyrillic: true },
};
// Open-list order (decision): English, Deutsch, Suomi, Français, Español,
// Português, Italiano. uk joins the end only via UK_IN_SWITCHER.
const SWITCHER_ORDER = ['de', 'fi', 'fr', 'es', 'pt', 'it', 'uk'];
const BUILD_LANGS = Object.keys(LANGS);
// The Code of Conduct page stays English in every language version.
const EN_ONLY_NOTE = 'This section is available in English only.';

// Which languages a page's switcher OFFERS: English always; a build with
// --preview offers everything configured; production offers `live` languages
// only — and uk additionally requires UK_IN_SWITCHER (being live deploys the
// route, it does not put uk in the list; that is a separate decision).
// `self` (the language of the page being generated) is always included so a
// visitor who reached a preview by direct link can see where they are.
function offeredLangs(self) {
  const out = ['en'];
  for (const l of SWITCHER_ORDER) {
    // uk is gated by UK_IN_SWITCHER in EVERY mode, --preview included — the
    // decision is that /uk/ is reached by direct link only.
    const gate = l !== 'uk' || UK_IN_SWITCHER;
    const offered = gate && (PREVIEW || LANGS[l]?.live);
    if (offered || l === self) out.push(l);
  }
  return out;
}

const PAGES = [
  { rel: 'index.html',                          key: 'home' },
  { rel: 'nas/index.html',                      key: 'nas' },
  { rel: 'engineering/index.html',              key: 'engineering' },
  { rel: 'conduct/index.html',                  key: 'conduct' },
  { rel: 'careers/index.html',                  key: 'careers' },
  { rel: 'contact/index.html',                  key: 'contact' },
  { rel: 'intelligence/drone-stack/index.html', key: 'drone-stack' },
  { rel: 'intelligence/efi/index.html',         key: 'efi' },
];

// Routes that exist in the /uk/ tree; internal links to these are prefixed.
const ROUTE_FIRST_SEGMENTS = new Set(['', 'nas', 'engineering', 'conduct', 'careers', 'contact', 'intelligence']);

// ---------------------------------------------------------------------------
// skip rules — what a translator must never be asked to translate
// ---------------------------------------------------------------------------
const SKIP_TOKENS = new Set([
  'STM32F405', 'STM32F051', 'ICM-42688-P', 'DSHOT', 'ELRS', 'I2C', 'SBUS', 'IBUS',
  'CRSF', 'UART', 'GPIO', 'SPI', 'VTX', 'RC', 'GPS', 'NDAA', 'NAS', 'ESC', 'FC',
  'EFI', 'CDI', 'ECU', 'IEMS', 'XT60', 'FPV', 'CVR', 'ApS', 'REC', 'LIVE', 'UTC',
  '2C', '2E', 'hp', 'kW', 'kg', 'km', 'cm³', 'CC', 'MWH', 'WH', 'RPM', 'EGT',
  'CH-04', '1080P', '24FPS', 'A', 'V', 'IP', 'OEM', 'OEMs', 'UAV', // UAV alone is a token; in prose it is part of a sentence and gets extracted
]);
const SKIP_EXACT = [
  /^nordic advanced systems(\s+aps)?$/i,
  /^built on integrity$/i,          // tagline stays English by decision
  /^nas\s*[·—-]\s*/i,               // "NAS · Test Rig"-style artwork labels
  /lufthavnvej/i,                   // postal address stays Latin
  /^©\s*\d{4}\s*$/,
  /@nordicadvancedsystems\.com$/i,
  /^\+45[\d\s]+$/,
  /^www\./i,
];
const looksSkippable = (text) => {
  let t = text.replace(/\s+/g, ' ').trim();
  if (!/[A-Za-zА-Яа-я]/.test(t)) return true;                       // no letters at all
  if (SKIP_EXACT.some(re => re.test(t))) return true;
  // brand phrases stay Latin/English everywhere; strip them, then judge the rest
  t = t.replace(/nordic advanced systems(\s+aps)?/gi, ' ').replace(/built on integrity/gi, ' ').trim();
  if (!/[A-Za-zА-Яа-я]/.test(t)) return true;
  const words = t.split(/[^\p{L}\p{N}³-]+/u).filter(Boolean);
  return words.length > 0 && words.every(w => SKIP_TOKENS.has(w) || /^[\d.,:%×+–-]+$/.test(w) || /^\d/.test(w));
};

// ---------------------------------------------------------------------------
// minimal HTML parser — offsets into the source, script/style as raw text.
// Fails loudly on malformed nesting rather than guessing: these pages are
// hand-written and well-formed, and a parser that guesses writes bad codemods.
// ---------------------------------------------------------------------------
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAWTEXT = new Set(['script', 'style']);

function parseHtml(src, rel) {
  const root = { tag: '#root', children: [], attrs: '', innerStart: 0, innerEnd: src.length };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>|<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m[0][1] === '!') continue;                                   // comment / doctype
    if (m[1]) {                                                      // closing tag
      const tag = m[1].toLowerCase();
      const top = stack[stack.length - 1];
      if (top.tag !== tag) throw new Error(`${rel}: </${tag}> at ${m.index} closes <${top.tag}> opened at ${top.openStart}`);
      top.innerEnd = m.index;
      top.end = m.index + m[0].length;
      stack.pop();
      continue;
    }
    const tag = m[2].toLowerCase();
    const selfClosed = /\/\s*$/.test(m[3]) || VOID.has(tag);
    const node = {
      tag, attrs: m[3], children: [],
      openStart: m.index, openEnd: m.index + m[0].length,
      innerStart: m.index + m[0].length, innerEnd: m.index + m[0].length,
      end: m.index + m[0].length, selfClosed,
    };
    stack[stack.length - 1].children.push(node);
    if (selfClosed) continue;
    if (RAWTEXT.has(tag)) {                                          // jump over raw text
      const close = src.toLowerCase().indexOf('</' + tag, node.innerStart);
      if (close === -1) throw new Error(`${rel}: unclosed <${tag}> at ${node.openStart}`);
      node.innerEnd = close;
      node.end = src.indexOf('>', close) + 1;
      re.lastIndex = node.end;
      continue;
    }
    stack.push(node);
  }
  if (stack.length !== 1) throw new Error(`${rel}: ${stack.length - 1} unclosed element(s), first <${stack[1].tag}> at ${stack[1].openStart}`);
  return root;
}

const attrOf = (node, name) => {
  const m = node.attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : null;
};
const hasAttr = (node, name) => new RegExp(`\\b${name}(\\s*=|\\s|$)`).test(node.attrs);

const stripTags = (html) => html.replace(/<[^>]*>/g, ' ');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&ldquo;|&rdquo;/g, '"').replace(/&nbsp;/g, ' ');
const visibleText = (src, node) => decode(stripTags(src.slice(node.innerStart, node.innerEnd))).replace(/\s+/g, ' ').trim();

// Block-level content disqualifies an element from being one translation unit.
const BLOCKY = new Set(['p', 'div', 'section', 'article', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'figure', 'figcaption', 'blockquote', 'nav', 'header', 'footer',
  'dl', 'dt', 'dd', 'form', 'video', 'select', 'textarea', 'button', 'label',
  // svg: never part of a translation unit — inline diagrams keep their text,
  // and their translatable description travels as an aria-label attribute
  'svg']);
const NEVER_MARK = new Set(['html', 'head', 'body', 'script', 'style', 'svg', 'title', 'select', 'video', 'form']);
function containsBlocky(node) {
  return node.children.some(c => BLOCKY.has(c.tag) || containsBlocky(c));
}
// An element carrying data-i18n-skip (the language switcher) must never be
// swallowed into a parent's translation unit.
function containsSkipMarked(node) {
  return node.children.some(c => hasAttr(c, 'data-i18n-skip') || containsSkipMarked(c));
}

// Trim letterless head/tail children (caret spans, arrow spans) out of the
// translation unit so translators never see decorative markup they must not
// touch. Returns [start, end] offsets of the core range.
function coreRange(src, node) {
  let start = node.innerStart, end = node.innerEnd;
  const parts = [];                                                  // children + text gaps in order
  let cursor = node.innerStart;
  for (const c of node.children) { parts.push({ s: cursor, e: c.openStart, el: null }); parts.push({ s: c.openStart, e: c.end, el: c }); cursor = c.end; }
  parts.push({ s: cursor, e: node.innerEnd, el: null });
  const hasLetters = (p) => /[A-Za-zА-Яа-я]/.test(p.el ? visibleText(src, p.el) : src.slice(p.s, p.e));
  let i = 0, j = parts.length - 1;
  while (i <= j && !hasLetters(parts[i])) i++;
  while (j >= i && !hasLetters(parts[j])) j--;
  if (i > j) return null;
  start = parts[i].el ? parts[i].el.openStart : parts[i].s + (src.slice(parts[i].s, parts[i].e).match(/^\s*/)[0].length);
  end = parts[j].el ? parts[j].el.end : parts[j].e - (src.slice(parts[j].s, parts[j].e).match(/\s*$/)[0].length);
  return [start, end];
}

// {spec:...} placeholders keep figures out of the locale files.
const SPEC_ROOTS = { ds: DRONE_STACK, nas2: NAS2, nas2num: { ...NAS2_NUM, rangeKmComma: Number(NAS2_NUM.rangeKm).toLocaleString('en-US') } };
function specValue(p) {
  let v = SPEC_ROOTS;
  for (const seg of p.split('.')) { v = v?.[seg]; if (v === undefined) throw new Error(`unknown spec path ${p}`); }
  return String(v);
}
const placeholderize = (html) => html.replace(/<span[^>]*\bdata-spec="([^"]+)"[^>]*>[^<]*<\/span>/g, (_, p) => `{spec:${p}}`);
const expandSpecs = (s) => s.replace(/\{spec:([^}]+)\}/g, (_, p) => `<span data-spec="${p}">${specValue(p)}</span>`);

// ---------------------------------------------------------------------------
// JS-embedded user-facing strings (contact form). Anchored to the exact
// source literal so a drifted page fails the build instead of shipping a
// half-replaced script.
// ---------------------------------------------------------------------------
const JS_STRINGS = {
  contact: [
    { key: 'js-sending', find: `'<span class="cf-spin" aria-hidden="true"></span> Sending…'`, value: 'Sending…' },
    { key: 'js-error-generic', find: `'Something went wrong. Please try again.'`, value: 'Something went wrong. Please try again.' },
    { key: 'js-error-network', find: `'Network error — please check your connection and try again.'`, value: 'Network error — please check your connection and try again.' },
  ],
};
// The ROLES and COUNTRIES dropdown option lists are translatable content too;
// they are extracted as arrays. PREFIXES (phone codes) are not language.
const JS_ARRAYS = { contact: ['ROLES', 'COUNTRIES'] };

// ---------------------------------------------------------------------------
// language switcher — stamped into every EN page, re-stamped per language
// build with that language active. Closed state: just the active code plus a
// chevron ("EN ⌄") — no more width than the old EN · УКР pair. Open state: a
// list of the offered languages, each written in its OWN language, active one
// marked. Text only, no flags. All hrefs are BAKED per page at build time
// (same page in the target language; nearest existing parent if the page has
// no counterpart there — never blindly the front page), so navigation works
// without JavaScript; the script only handles open/close, keyboard and the
// localStorage memory. Mobile (≤900px): mobile-nav.js renders the same links
// as a plain list inside the menu — no dropdown inside a dropdown.
// ---------------------------------------------------------------------------
const routeOf = (rel) => rel === 'index.html' ? '' : path.posix.dirname(rel.replace(/\\/g, '/'));
const LANG_ROUTES = new Set(PAGES.map(p => routeOf(p.rel)));

// Same page in the target language; walk up to the nearest parent that
// exists there. ('' — the front page — is the root every route descends from.)
function targetHref(lang, route) {
  let segs = route ? route.split('/') : [];
  while (segs.length && !LANG_ROUTES.has(segs.join('/'))) segs.pop();
  const base = segs.length ? segs.join('/') + '/' : '';
  return (lang === 'en' ? '/' : `/${lang}/`) + base;
}

function switcherHtml(rel, active, hidden) {
  const route = routeOf(rel);
  const items = offeredLangs(active).map(l => {
    const m = LANG_META[l];
    const cur = l === active;
    return `<li role="none"><a role="menuitem" lang="${m.htmlLang}" hreflang="${m.htmlLang}" ` +
      `href="${targetHref(l, route)}"${cur ? ' class="active" aria-current="true"' : ''}>${m.native}</a></li>`;
  }).join('');
  return `<div class="lang-switch" id="lang-switch"${hidden ? ' hidden' : ''} data-i18n-skip>` +
    `<button class="ls-btn" type="button" aria-haspopup="true" aria-expanded="false" ` +
    `aria-label="${LANG_META[active].selectLabel}">` +
    `<span class="ls-code">${LANG_META[active].code}</span><span class="ls-caret" aria-hidden="true"></span></button>` +
    `<ul class="ls-menu" role="menu" hidden>${items}</ul>` +
    `</div>`;
}
const SWITCHER_RE = /<div class="lang-switch" id="lang-switch"[\s\S]*?<\/ul><\/div>/;
const OLD_SWITCHER_RE = /<a class="lang-switch" id="lang-switch"[^>]*>[\s\S]*?<\/a>/;

const SWITCHER_CSS = `
/* i18n:switcher-css */
.lang-switch{ position:relative; display:inline-flex; align-items:center; margin-left:16px; }
.ls-btn{ display:inline-flex; align-items:center; gap:7px; background:none; border:0;
  font-family:"JetBrains Mono", ui-monospace, monospace; font-size:11.5px; font-weight:500;
  letter-spacing:0.14em; color:var(--ink-2); padding:6px 2px; cursor:pointer;
  white-space:nowrap; transition:color .2s ease; }
.ls-btn:hover, .ls-btn:focus-visible, .lang-switch.open .ls-btn{ color:var(--accent); }
.ls-caret{ width:6px; height:6px; margin-top:-3px; border-right:1.5px solid currentColor;
  border-bottom:1.5px solid currentColor; transform:rotate(45deg); opacity:.65;
  transition:transform .3s var(--ease-spring), opacity .2s ease; }
.lang-switch.open .ls-caret{ transform:rotate(-135deg); margin-top:2px; opacity:1; }
.ls-menu{ position:absolute; top:calc(100% + 14px); right:-2px; min-width:172px; margin:0;
  padding:8px; list-style:none; background:rgba(8,32,42,0.94); border:1px solid var(--line-dark);
  border-radius:var(--radius-sm,10px); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
  box-shadow:0 24px 60px -20px rgba(0,0,0,0.6); display:flex; flex-direction:column; gap:2px; z-index:130; }
.ls-menu[hidden]{ display:none; }
.ls-menu a{ display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:7px;
  color:var(--ink-1); font-size:14px; font-weight:500; text-decoration:none; white-space:nowrap;
  transition:background .2s ease, color .2s ease; }
.ls-menu a::before{ content:""; flex:none; width:6px; height:6px; border:1px solid var(--accent);
  transform:rotate(45deg); opacity:.55; transition:opacity .2s ease, background .2s ease; }
.ls-menu a:hover{ background:rgba(59,182,232,0.18); color:var(--accent); }
.ls-menu a:hover::before{ opacity:1; background:var(--accent); }
.ls-menu a.active{ color:var(--accent); }
.ls-menu a.active::before{ opacity:1; background:var(--accent); }
/* desktop only — mobile-nav.js renders the same links as a plain list in the menu */
@media (max-width:900px){ .lang-switch{ display:none; } }
/* footer note on generated language pages (rule is inert on EN pages) */
.footer-authoritative{ padding:14px 0 0; font-size:11px; letter-spacing:0.04em; color:var(--ink-3); }
/* the switcher must never squeeze the nav into wrapping */
.site-header .nav a, .site-header .nav-dd-trigger{ white-space:nowrap; }
/* display:flex included: only the front page declared it locally — on the
   other pages a visible switcher would otherwise stack UNDER the CTA
   button and grow the header by a full row. Desktop-scoped: at ≤900px
   mobile-nav.css hides .header-cta entirely, and an unscoped display:flex
   would override that and push the hamburger off-screen. */
@media (min-width:901px){ .site-header .header-cta{ display:flex; align-items:center; flex-wrap:nowrap; } }
.site-header .header-cta .btn{ white-space:nowrap; }
/* i18n:switcher-css-end */
`;
// No automatic redirect anywhere — the stored preference is a memory, not a
// router; navigation happens exclusively on the visitor's click, and every
// href is baked into the markup (the menu works with JS disabled too, it
// just can't fold shut).
const SWITCHER_JS = `<script>/* i18n:switcher-js */
(function(){
  var root = document.getElementById('lang-switch'); if (!root) return;
  var btn = root.querySelector('.ls-btn'), menu = root.querySelector('.ls-menu');
  if (!btn || !menu) return;
  function setOpen(o){
    root.classList.toggle('open', o);
    btn.setAttribute('aria-expanded', o ? 'true' : 'false');
    menu.hidden = !o;
  }
  btn.addEventListener('click', function(){
    var open = menu.hidden; setOpen(open);
    if (open) { var a = menu.querySelector('a.active') || menu.querySelector('a'); if (a) a.focus(); }
  });
  document.addEventListener('click', function(e){ if (!root.contains(e.target)) setOpen(false); });
  root.addEventListener('focusout', function(){
    setTimeout(function(){ if (!root.contains(document.activeElement)) setOpen(false); }, 0);
  });
  root.addEventListener('keydown', function(e){
    if (e.key === 'Escape') { setOpen(false); btn.focus(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (menu.hidden) setOpen(true);
    var links = [].slice.call(menu.querySelectorAll('a'));
    var i = links.indexOf(document.activeElement);
    if (i === -1) i = e.key === 'ArrowDown' ? -1 : 0;
    links[(i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length].focus();
  });
  menu.addEventListener('click', function(e){
    var a = e.target.closest('a'); if (!a) return;
    try { localStorage.setItem('nas-lang', a.getAttribute('lang') === 'en' ? 'en' : (a.getAttribute('lang') || 'en').slice(0,2)); } catch (err) {}
  });
})();
</script>
`;

function stampSwitcher(src, rel) {
  // Whether the (hidden-capable) switcher shows on EN pages: any language
  // actually offered beyond English. Generated language pages always show it.
  const hidden = offeredLangs('en').length <= 1;
  const html = switcherHtml(rel, 'en', hidden);
  if (OLD_SWITCHER_RE.test(src)) src = src.replace(OLD_SWITCHER_RE, html);           // migrate the old EN · УКР anchor
  else if (SWITCHER_RE.test(src)) src = src.replace(SWITCHER_RE, html);              // idempotent re-stamp
  else {
    const anchor = /(<div class="header-cta">\s*<a class="btn btn-pill-accent" href="\/contact">[\s\S]*?<\/a>)/;
    if (!anchor.test(src)) throw new Error(`${rel}: header-cta anchor not found for switcher stamp`);
    src = src.replace(anchor, `$1\n      ${html}`);
  }
  // Re-stamping REPLACES the existing block so a CSS change in this file
  // actually reaches pages that were stamped by an earlier version.
  if (src.includes('/* i18n:switcher-css-end */'))
    src = src.replace(/\/\* i18n:switcher-css \*\/[\s\S]*?\/\* i18n:switcher-css-end \*\/\n?/,
      SWITCHER_CSS.trimStart());
  else if (src.includes('i18n:switcher-css'))
    src = src.replace(/\/\* i18n:switcher-css \*\/[\s\S]*?(?=<\/style>)/, SWITCHER_CSS.trimStart());
  else src = src.replace('\n</style>', '\n' + SWITCHER_CSS + '</style>');
  // the JS block is replaced wholesale too (it changed shape over versions)
  if (src.includes('i18n:switcher-js'))
    src = src.replace(/<script>\/\* i18n:switcher-js \*\/[\s\S]*?<\/script>\n?/, SWITCHER_JS);
  else src = src.replace('</body>', SWITCHER_JS + '</body>');
  return src;
}

// ---------------------------------------------------------------------------
// MARK — insert data-i18n markers (idempotent), collect candidates
// ---------------------------------------------------------------------------
function collectCandidates(src, root) {
  const found = [];        // marker targets: {node, core:[s,e], text}
  const attrs = [];        // attr targets:  {node, name, value}
  (function walk(node, insideMarked) {
    if (RAWTEXT.has(node.tag)) return;
    if (hasAttr(node, 'data-i18n-skip')) return;
    // Attribute strings — but never on elements inside a marked translation
    // unit: their markup is part of that unit's string and is translated there.
    if (node.attrs && !insideMarked) {
      for (const name of ['alt', 'placeholder', 'aria-label', 'title']) {
        const v = attrOf(node, name);
        if (v && !looksSkippable(v)) attrs.push({ node, name, value: v });
      }
    }
    // an svg's own aria-label is collected above; its INTERIOR never is
    if (node.tag === 'svg') return;
    const markable = !insideMarked && !NEVER_MARK.has(node.tag) && !node.selfClosed &&
      !hasAttr(node, 'data-spec') && !containsBlocky(node) && !containsSkipMarked(node);
    if (markable) {
      const text = visibleText(src, node);
      if (text && !looksSkippable(text)) {
        const core = coreRange(src, node);
        // An id inside the unit means JavaScript owns those nodes (live
        // telemetry, counters) — replacing the markup wholesale would orphan
        // the script. Recurse instead; the JS-owned leaves are then skipped
        // by the same rule, which is correct: they are decorative EN HUD text.
        if (core && !/\bid\s*=\s*"/.test(src.slice(core[0], core[1]))) {
          found.push({ node, core }); node.children.forEach(c => walk(c, true)); return;
        }
      }
    }
    node.children.forEach(c => walk(c, insideMarked));
  })(root, false);
  return { found, attrs };
}

const slugOf = (text, max = 4) => decode(text).toLowerCase().replace(/\{spec:[^}]+\}/g, '')
  .replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).slice(0, max).join('-') || 'str';

function markPages(sources) {
  // pass 1 — gather all strings so identical ones across pages share a key
  const perPage = new Map();
  const stringPages = new Map();
  for (const p of PAGES) {
    let src = sources.get(p.rel);
    src = stampSwitcher(src, p.rel);
    sources.set(p.rel, src);
    const root = parseHtml(src, p.rel);
    const { found, attrs } = collectCandidates(src, root);
    perPage.set(p.rel, { found, attrs, root });
    for (const f of found) {
      const s = placeholderize(src.slice(f.core[0], f.core[1])).replace(/\s+/g, ' ').trim();
      f.str = s;
      stringPages.set(s, (stringPages.get(s) || new Set()).add(p.key));
    }
    for (const a of attrs) stringPages.set(a.value, (stringPages.get(a.value) || new Set()).add(p.key));
  }
  // pass 2 — assign keys and splice markers bottom-up
  const en = { shared: {} };
  const usedKeys = new Set();
  const keyFor = (pageKey, str) => {
    const shared = stringPages.get(str).size > 1;
    const ns = shared ? 'shared' : pageKey;
    let base = `${ns}.${slugOf(stripTags(str))}`;
    let k = base, i = 2;
    while (usedKeys.has(k) && enLookup(en, k) !== str) k = `${base}-${i++}`;
    usedKeys.add(k);
    setKey(en, k, str);
    return k;
  };
  for (const p of PAGES) {
    let src = sources.get(p.rel);
    const { found, attrs } = perPage.get(p.rel);
    const edits = [];
    for (const f of found) {
      if (attrOf(f.node, 'data-i18n')) { keyReuse(en, attrOf(f.node, 'data-i18n'), f.str, usedKeys); continue; }
      const k = keyFor(p.key, f.str);
      edits.push({ at: f.node.openEnd - (/\/\s*>$/.test(src.slice(f.node.openStart, f.node.openEnd)) ? 2 : 1), ins: ` data-i18n="${k}"` });
    }
    const attrGroups = new Map();
    for (const a of attrs) {
      const existing = attrOf(a.node, 'data-i18n-attrs');
      if (existing) { existing.split(',').forEach(pair => { const [nm, kk] = pair.split(':'); if (nm === a.name) keyReuse(en, kk, a.value, usedKeys); }); continue; }
      const k = keyFor(p.key, a.value);
      const g = attrGroups.get(a.node) || [];
      g.push(`${a.name}:${k}`);
      attrGroups.set(a.node, g);
    }
    for (const [node, pairs] of attrGroups)
      edits.push({ at: node.openEnd - (/\/\s*>$/.test(src.slice(node.openStart, node.openEnd)) ? 2 : 1), ins: ` data-i18n-attrs="${pairs.join(',')}"` });
    edits.sort((a, b) => b.at - a.at);
    for (const e of edits) src = src.slice(0, e.at) + e.ins + src.slice(e.at);
    sources.set(p.rel, src);
  }
  return en;
}
function setKey(obj, dotted, value) {
  const [ns, ...rest] = dotted.split('.');
  (obj[ns] ||= {})[rest.join('.')] = value;
}
function enLookup(obj, dotted) {
  const [ns, ...rest] = dotted.split('.');
  return obj[ns]?.[rest.join('.')];
}
function keyReuse(en, key, str, usedKeys) {
  const cur = enLookup(en, key);
  if (cur !== undefined && cur !== str)
    throw new Error(`key ${key} maps to two different strings:\n  "${cur}"\n  "${str}"`);
  setKey(en, key, str);
  usedKeys.add(key);
}

// ---------------------------------------------------------------------------
// EXTRACT — read marked pages, produce en.json, sync uk.json
// ---------------------------------------------------------------------------
function extract(sources) {
  const en = { shared: {} };
  for (const p of PAGES) {
    const src = sources.get(p.rel);
    const root = parseHtml(src, p.rel);
    en[p.key] ||= {};
    // head
    const title = src.match(/<title>([^<]*)<\/title>/);
    if (title) en[p.key]['meta.title'] = title[1];
    const meta = src.match(/<meta name="description"([^>]*)>/);
    if (meta) {
      const tpl = meta[1].match(/data-spec-tpl="([^"]*)"/);
      const content = meta[1].match(/content="([^"]*)"/);
      en[p.key]['meta.description'] = tpl ? tpl[1].replace(/\{([a-z0-9_.]+)\}/gi, '{spec:$1}') : content[1];
    }
    (function walk(node) {
      const k = attrOf(node, 'data-i18n');
      if (k) {
        const core = coreRange(src, node);
        setKey(en, k, placeholderize(src.slice(core[0], core[1])).replace(/\s+/g, ' ').trim());
      }
      const ka = attrOf(node, 'data-i18n-attrs');
      if (ka) for (const pair of ka.split(',')) {
        const [name, kk] = pair.split(':');
        setKey(en, kk, attrOf(node, name));
      }
      node.children.forEach(walk);
    })(root);
    // JS strings + arrays
    for (const e of JS_STRINGS[p.key] || []) {
      if (!src.includes(e.find)) throw new Error(`${p.rel}: JS anchor not found: ${e.find.slice(0, 50)}`);
      en[p.key][`js.${e.key}`] = e.value;
    }
    for (const arr of JS_ARRAYS[p.key] || []) {
      const m = src.match(new RegExp(`const ${arr} = (\\[[^\\]]*\\]);`));
      if (!m) throw new Error(`${p.rel}: JS array ${arr} not found`);
      en[p.key][`js.${arr}`] = JSON.parse(m[1].replace(/'/g, '"'));
    }
  }
  return en;
}

async function writeLocales(en) {
  await fs.mkdir(localesDir, { recursive: true });
  await fs.writeFile(path.join(localesDir, 'en.json'), JSON.stringify(en, null, 2) + '\n', 'utf8');
  // every language: same keys, existing translations (and @hold/@en
  // sentinels) preserved, new keys default ""
  const stats = {};
  for (const lang of BUILD_LANGS) {
    let prev = {};
    try { prev = JSON.parse(await fs.readFile(path.join(localesDir, `${lang}.json`), 'utf8')); } catch {}
    const synced = {};
    let kept = 0, added = 0, orphaned = 0;
    for (const [ns, entries] of Object.entries(en)) {
      synced[ns] = {};
      for (const [k, v] of Object.entries(entries)) {
        const p = prev[ns]?.[k];
        if (p !== undefined && p !== '' && !(Array.isArray(p) && p.length === 0)) { synced[ns][k] = p; kept++; }
        else { synced[ns][k] = Array.isArray(v) ? [] : ''; added++; }
      }
    }
    for (const [ns, entries] of Object.entries(prev))
      for (const k of Object.keys(entries || {}))
        if (en[ns]?.[k] === undefined) orphaned++;
    await fs.writeFile(path.join(localesDir, `${lang}.json`), JSON.stringify(synced, null, 2) + '\n', 'utf8');
    stats[lang] = { kept, added, orphaned };
  }
  return stats;
}

// ---------------------------------------------------------------------------
// word-count report
// ---------------------------------------------------------------------------
function wordCount(s) {
  return decode(stripTags(String(s))).replace(/\{spec:[^}]+\}/g, ' ')
    .split(/\s+/).filter(w => /[A-Za-zА-Яа-я]/.test(w)).length;
}
function report(en) {
  console.log('\nString extraction — words per page (spec figures excluded, they stay in brand/specs.mjs):');
  let totalW = 0, totalS = 0;
  const rows = [];
  for (const p of PAGES) {
    const entries = Object.entries(en[p.key] || {});
    let w = 0, s = 0, listW = 0;
    for (const [k, v] of entries) {
      if (Array.isArray(v)) { listW += v.reduce((a, x) => a + wordCount(x), 0); s++; continue; }
      w += wordCount(v); s++;
    }
    rows.push([p.key, s, w, listW]);
    totalW += w + listW; totalS += s;
  }
  const sharedEntries = Object.entries(en.shared || {});
  const sharedW = sharedEntries.reduce((a, [, v]) => a + wordCount(v), 0);
  rows.push(['shared (nav/footer/cta)', sharedEntries.length, sharedW, 0]);
  totalW += sharedW; totalS += sharedEntries.length;
  const pad = (s, n) => String(s).padEnd(n);
  console.log('  ' + pad('page', 26) + pad('strings', 9) + pad('words', 8) + 'list-words (roles/countries)');
  for (const [k, s, w, lw] of rows)
    console.log('  ' + pad(k, 26) + pad(s, 9) + pad(w, 8) + (lw || ''));
  console.log(`  ${pad('TOTAL', 26)}${pad(totalS, 9)}${totalW}`);
}

// ---------------------------------------------------------------------------
// BUILD-UK
// ---------------------------------------------------------------------------
const pseudoCyr = { a: 'а', c: 'с', e: 'е', i: 'і', o: 'о', p: 'р', x: 'х', y: 'у', A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н', I: 'І', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х' };
const pseudoLat = { a: 'ä', c: 'ç', e: 'é', i: 'ì', n: 'ñ', o: 'õ', u: 'ü', y: 'ý', A: 'Ä', C: 'Ç', E: 'É', I: 'Ì', N: 'Ñ', O: 'Õ', U: 'Ü' };
function pseudo(s, lang) {
  // Lookalike glyphs exercise the font subset the language actually uses
  // (Cyrillic → Inter's cyrillic files, Latin diacritics → Space Grotesk's
  // latin-ext); the suffix adds ~15–18% length so the layout test measures
  // real expansion, not hope.
  const cyr = LANG_META[lang]?.cyrillic;
  const map = cyr ? pseudoCyr : pseudoLat;
  const parts = String(s).split(/(<[^>]*>|\{spec:[^}]+\}|&[a-z]+;)/);
  let visible = 0;
  const swapped = parts.map((part, i) => {
    if (i % 2 === 1) return part;
    visible += part.length;
    return part.replace(/[a-zA-Z]/g, (ch) => map[ch] || ch);
  }).join('');
  const pad = (cyr ? 'ѐйїщ' : 'ößàù').repeat(20); // the stress char set
  // Distribute the expansion as short words: real translations are ~15%
  // longer but break at spaces - one giant unbreakable token would only
  // prove the absence of 80-character words, which no language has.
  const need = Math.max(1, Math.ceil(visible * 0.16));
  const chunks = [];
  for (let left = need; left > 0; left -= 6) chunks.push(pad.repeat(2).slice(0, Math.min(6, left)));
  return swapped + ' ' + chunks.join(' ');
}

// Sentinels: "@hold" (awaiting the English rewrite) and "@en" (English by
// decision). Both resolve to the English source, both are exempt from
// --strict, and both are counted LOUDLY so the fallback is never invisible.
const isHold = (v) => v === '@hold';
const isEnByDecision = (v) => v === '@en';
const isSentinel = (v) => isHold(v) || isEnByDecision(v);

function trValue(tr, en, key, missing, held) {
  const u = enLookup(tr, key);
  const e = enLookup(en, key);
  if (isSentinel(u)) { held.push({ key, kind: isHold(u) ? '@hold' : '@en' }); return e; }
  if (u !== undefined && u !== '' && !(Array.isArray(u) && u.length === 0)) return u;
  missing.push(key);
  return e;                                                          // en fallback (dev only)
}

// A translation must carry the exact same markup skeleton and the exact same
// spec placeholders as its English source — only the words between them may
// differ. Numbers are never translated and never reformatted: every numeric
// token in the English source must appear byte-identically in the
// translation (no comma/point conversion, no thousands separators). And for
// Cyrillic languages no token may mix Cyrillic with Latin/digits: А В Е О Р
// С Т Х are indistinguishable from their Latin twins on the page (same rule
// as the datasheet builds).
function validateTranslations(en, tr, lang) {
  const problems = [];
  const skeleton = (s) => (String(s).match(/<[^>]+>|\{spec:[^}]+\}/g) || []).join('|');
  const CYRRE = /[Ѐ-ӿ]/, LATRE = /[A-Za-z]/;
  const cyr = LANG_META[lang]?.cyrillic;
  // Standalone figures only: "46.5", "49" in "49°C". Digits fused into a
  // word ("2-stroke", "4-in-1", "F405") may legitimately become words in a
  // translation ("Zweitakt", "kaksitahtinen") and are not spec figures.
  // The rule is one-directional: every figure in the EN source must appear
  // BYTE-IDENTICALLY in the translation (no comma/point conversion, no
  // thousands separators, no dropped figures); the translation's own digit
  // usage around words ("2 цил.") is its business.
  const stripMarkup = (s) => String(s).replace(/<[^>]+>|\{spec:[^}]+\}/g, ' ');
  const numTokens = (s) => (stripMarkup(s)
    .match(/(?<![\p{L}\d-])\d+(?:[.,]\d+)*(?![\p{L}\d-])/gu) || []).sort();
  const countIn = (hay, needle) => hay.split(needle).length - 1;
  for (const [ns, entries] of Object.entries(en)) {
    for (const [k, v] of Object.entries(entries)) {
      const u = tr[ns]?.[k];
      if (u === undefined || u === '' || (Array.isArray(u) && u.length === 0) || isSentinel(u)) continue;
      if (Array.isArray(v)) {
        if (!Array.isArray(u) || u.length !== v.length)
          problems.push(`${ns}.${k}: array length ${Array.isArray(u) ? u.length : '?'} vs ${v.length}`);
      } else if (skeleton(u) !== skeleton(v)) {
        problems.push(`${ns}.${k}: markup/placeholder skeleton differs\n      en: ${skeleton(v) || '(none)'}\n      ${lang}: ${skeleton(u) || '(none)'}`);
      }
      if (!Array.isArray(v) && !Array.isArray(u)) {
        const hay = stripMarkup(u);
        const lost = numTokens(v).filter(t => countIn(hay, t) < 1);
        if (lost.length)
          problems.push(`${ns}.${k}: figure(s) from the EN source missing byte-identically in the translation ` +
            `(numbers are never translated/reformatted): ${[...new Set(lost)].join(' ')}`);
      }
      if (cyr) for (const str of Array.isArray(u) ? u : [u]) {
        for (const tok of String(str).replace(/<[^>]+>|\{spec:[^}]+\}|&[a-z]+;/g, ' ').split(/[^\p{L}\p{N}]+/u)) {
          if (tok && CYRRE.test(tok) && (LATRE.test(tok) || /\d/.test(tok)))
            problems.push(`${ns}.${k}: mixed-script token "${tok}"`);
        }
      }
    }
  }
  if (problems.length) {
    problems.forEach(m => console.log('  · ' + m));
    throw new Error(`${problems.length} translation validation problem(s) in locales/${lang}.json`);
  }
}

// a sitemap must never carry a /<lang>/ URL while that language is noindex
async function guardSitemaps() {
  for (const sm of ['sitemap.xml', 'sitemap.txt']) {
    try {
      const s = await fs.readFile(path.join(repoRoot, sm), 'utf8');
      for (const lang of BUILD_LANGS)
        if (LANGS[lang].noindex && new RegExp(`/${lang}/`).test(s))
          throw new Error(`${sm} lists /${lang}/ URLs while ${lang} is noindex`);
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}

async function buildLang(sources, lang) {
  const meta = LANG_META[lang];
  if (!meta || lang === 'en') throw new Error(`unknown language ${lang}`);
  const en = JSON.parse(await fs.readFile(path.join(localesDir, 'en.json'), 'utf8'));
  const tr = JSON.parse(await fs.readFile(path.join(localesDir, `${lang}.json`), 'utf8'));
  validateTranslations(en, tr, lang);
  await guardSitemaps();
  const noindex = LANGS[lang].noindex;
  console.log(`\nBuilding /${lang}/ — noindex: ${noindex} · mode: ${PSEUDO ? 'PSEUDO-LOCALISED (layout test only)' : STRICT ? 'strict (no fallback)' : 'dev (en fallback allowed)'}`);
  const allMissing = [], allHeld = [];
  for (const p of PAGES) {
    let src = sources.get(p.rel);
    if (!src.includes('<meta name="description"')) throw new Error(`${p.rel}: no meta description — robots/noindex injection has no anchor`);
    const missing = [], held = [];
    const T = (key) => {
      let v = trValue(tr, en, key, missing, held);
      return PSEUDO ? (Array.isArray(v) ? v.map(s => pseudo(s, lang)) : pseudo(v, lang)) : v;
    };
    // 1. lang + head
    src = src.replace('<html lang="en">', `<html lang="${meta.htmlLang}">`);
    src = src.replace(/<title>[^<]*<\/title>/, () => `<title>${T(`${p.key}.meta.title`)}</title>`);
    src = src.replace(/<meta name="description"([^>]*?)\/?>/, (tag, attrs) => {
      const desc = String(T(`${p.key}.meta.description`));
      const rendered = desc.replace(/\{spec:([^}]+)\}/g, (_, sp) => specValue(sp));
      let out = tag.replace(/content="[^"]*"/, `content="${rendered}"`);
      if (/data-spec-tpl=/.test(out)) out = out.replace(/data-spec-tpl="[^"]*"/, `data-spec-tpl="${desc.replace(/\{spec:/g, '{')}"`);
      return out;
    });
    // hreflang is COUPLED to the noindex flag: while a language is noindex it
    // emits no hreflang anywhere and appears in no sitemap; when management
    // opens indexing, both switch on together.
    const route = routeOf(p.rel);
    const alt = (l) => `<link rel="alternate" hreflang="${l === 'en' ? 'en' : LANG_META[l].htmlLang}" ` +
      `href="https://www.nordicadvancedsystems.com${targetHref(l, route)}" />`;
    const indexableLangs = BUILD_LANGS.filter(l => !LANGS[l].noindex);
    const robots = noindex
      ? '<meta name="robots" content="noindex" />'
      : ['en', ...indexableLangs].map(alt).join('\n');
    src = src.replace(/(<meta name="description"[^>]*>)/, `$1\n${robots}`);
    // 2. marked elements + attrs (bottom-up)
    const root = parseHtml(src, p.rel);
    const edits = [];
    (function walk(node) {
      const k = attrOf(node, 'data-i18n');
      if (k) {
        const core = coreRange(src, node);
        let replacement = expandSpecs(String(T(k)));
        // valueless <option>: pin the submitted value to the English text so
        // the payload the backend sees is language-independent
        if (node.tag === 'option' && !/\bvalue\s*=/.test(node.attrs))
          edits.push({ s: node.openEnd - 1, e: node.openEnd - 1, ins: ` value="${enLookup(en, k).replace(/"/g, '&quot;')}"` });
        edits.push({ s: core[0], e: core[1], ins: replacement });
      }
      const ka = attrOf(node, 'data-i18n-attrs');
      if (ka) {
        let open = src.slice(node.openStart, node.openEnd);
        for (const pair of ka.split(',')) {
          const [name, kk] = pair.split(':');
          open = open.replace(new RegExp(`(\\b${name}\\s*=\\s*")[^"]*(")`), `$1${String(T(kk)).replace(/"/g, '&quot;')}$2`);
        }
        edits.push({ s: node.openStart, e: node.openEnd, ins: open });
      }
      node.children.forEach(walk);
    })(root);
    edits.sort((a, b) => b.s - a.s);
    for (const e of edits) src = src.slice(0, e.s) + e.ins + src.slice(e.e);
    // 3. JS strings + arrays
    for (const e of JS_STRINGS[p.key] || []) {
      const v = String(T(`${p.key}.js.${e.key}`));
      if (src.split(e.find).length - 1 !== 1) throw new Error(`${p.rel}: JS anchor not unique: ${e.find.slice(0, 40)}`);
      src = src.replace(e.find, e.find.replace(e.value, v.replace(/'/g, "\\'")));
    }
    for (const arr of JS_ARRAYS[p.key] || []) {
      const v = T(`${p.key}.js.${arr}`);
      // The ENGLISH array stays in place — it feeds the submitted <option>
      // values, which are language-independent. Only the *_L10N display
      // labels are replaced.
      const anchor = `let ${arr}_L10N = null;`;
      if (!src.includes(anchor)) throw new Error(`${p.rel}: L10N anchor not found: ${anchor}`);
      src = src.replace(anchor,
        `let ${arr}_L10N = [${v.map(x => `'${String(x).replace(/'/g, "\\'")}'`).join(',')}];`);
    }
    // 4. fonts — Space Grotesk has no Cyrillic, so on Cyrillic builds (uk)
    // every BODY stack swaps to Inter (whose cyrillic/cyrillic-ext subsets
    // css2 serves as separate unicode-range files — an English visitor never
    // downloads a Cyrillic byte). ONE exemption: the brand wordmark. It is
    // identity typography in pure Latin ("Nordic Advanced Systems", never
    // translated), and NAS-BRAND only mandates the swap for body copy —
    // reflowing the logo lock-up into Inter grew the header 17px. The six
    // Latin languages keep Space Grotesk untouched: its latin + latin-ext
    // subsets cover every diacritic they need (verified by --check-layout).
    if (meta.cyrillic) {
      src = src.replaceAll('"Space Grotesk", ', '"Inter", ').replaceAll("'Space Grotesk', ", "'Inter', ").replaceAll('"Space Grotesk",', '"Inter",');
      src = src.replace('</head>',
        '<style>/* uk: the Latin brand wordmark keeps its identity face */\n' +
        '.brand-wordmark{ font-family:"Space Grotesk",sans-serif; }</style>\n</head>');
      const sgCount = (src.match(/Space[+ ]Grotesk/g) || []).length;
      if (sgCount !== 2)                                 // font link + wordmark rule
        throw new Error(`${p.rel}: expected exactly 2 Space Grotesk references (font link + wordmark rule), found ${sgCount}`);
    }
    // 5. internal links → stay inside /<lang>/
    src = src.replace(/href="\/([^"]*)"/g, (m0, rest) => {
      const first = rest.split(/[/#?]/)[0];
      if (BUILD_LANGS.some(l => rest === l || rest.startsWith(l + '/')) ||
          rest.startsWith('assets/') || rest.startsWith('api/') || rest.startsWith('c/') || /\.\w+$/.test(first)) return m0;
      if (!ROUTE_FIRST_SEGMENTS.has(first)) return m0;
      return `href="/${lang}/${rest}"`;
    });
    // 6. switcher — re-stamped with THIS language active and always visible
    // (a generated page only exists on builds where its language exists).
    // Runs after the link rewrite on purpose: the switcher's baked hrefs are
    // cross-language by design and must not be prefixed.
    if (!SWITCHER_RE.test(src)) throw new Error(`${p.rel}: stamped switcher not found — run --mark first`);
    src = src.replace(SWITCHER_RE, switcherHtml(p.rel, lang, false));
    // 7. footer — the locked line "English is the authoritative version."
    // (NAS_TERMINOLOGI_6SPROG.md §7) on every generated language page.
    if (!src.includes('</footer>')) throw new Error(`${p.rel}: no </footer> — authoritative-version line has no anchor`);
    src = src.replace('</footer>',
      `  <div class="wrap footer-authoritative">${meta.authoritative}</div>\n</footer>`);
    // 8. Code of Conduct stays English in the six new languages (ten legal
    // sections — a mistranslated compliance sentence is a claim, not a
    // typo; uk translated it before this decision and keeps its
    // translation). The note only appears when the page's content is
    // actually held on English via @en sentinels.
    if (p.key === 'conduct' && held.some(h => h.kind === '@en')) {
      const h1End = src.indexOf('</h1>');
      if (h1End === -1) throw new Error(`${p.rel}: no </h1> — EN-only note has no anchor`);
      src = src.slice(0, h1End + 5) +
        `\n        <p class="conduct-en-note" lang="en">${EN_ONLY_NOTE}</p>` +
        src.slice(h1End + 5);
      src = src.replace('</head>',
        '<style>/* i18n: conduct stays English in every language */\n' +
        '.conduct-en-note{ display:inline-block; margin:18px 0 0; padding:9px 14px;\n' +
        '  font-family:"JetBrains Mono", ui-monospace, monospace; font-size:11.5px;\n' +
        '  letter-spacing:0.08em; color:var(--ink-2); border:1px solid var(--line-dark);\n' +
        '  border-left:2px solid var(--accent); }</style>\n</head>');
    }
    const outPath = path.join(repoRoot, lang, p.rel);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, src, 'utf8');
    allMissing.push(...missing);
    allHeld.push(...held);
    const holdN = held.filter(h => h.kind === '@hold').length;
    const enN = held.filter(h => h.kind === '@en').length;
    console.log(`  ${lang}/${p.rel.padEnd(38)} ${edits.length} replacement(s), ${missing.length} missing` +
      `${missing.length && !STRICT ? ' → en fallback' : ''}` +
      `${holdN ? `, ${holdN} HELD @hold → English shown (awaiting EN rewrite)` : ''}` +
      `${enN ? `, ${enN} English by decision (@en)` : ''}`);
  }
  const totalHold = allHeld.filter(h => h.kind === '@hold').length;
  if (totalHold)
    console.log(`  ⚑ ${totalHold} string(s) across /${lang}/ are @hold — they SHIP IN ENGLISH until the ` +
      '65A/100A drone-stack rewrite and the final NDAA wording land in the EN source.');
  if (allMissing.length && STRICT)
    throw new Error(`--strict: ${allMissing.length} ${lang} string(s) missing. No English fallback in production — ` +
      `better no /${lang}/ page than a half-translated one.`);
  if (allMissing.length && !PSEUDO)
    console.log(`  ${allMissing.length} string(s) fell back to English — fine during development, blocked by --strict for production.`);
}

// ---------------------------------------------------------------------------
// CHECK-LAYOUT — pseudo-build (or --real), then measure nav/buttons/pages
// under the longer text; plus a font-subset probe: Space Grotesk must cover
// every special character the six Latin languages can produce.
// ---------------------------------------------------------------------------
const FONT_PROBE_CHARS = 'æøå äöüß ãõç àèéìòù ñ ¿¡';
async function checkLayout(langs) {
  const { chromium } = await import('../.screenshots/node_modules/playwright/index.mjs');
  const server = spawn(process.execPath, ['serve.mjs'], { cwd: repoRoot, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));
  const browser = await chromium.launch();
  const problems = [];
  try {
    for (const vp of [{ width: 1440, height: 900, name: 'desktop' }, { width: 390, height: 844, name: 'mobile' }]) {
      const page = await (await browser.newContext({ viewport: vp })).newPage();
      // the intro loader must not be mid-animation when the header is measured
      await page.addInitScript(() => { try { sessionStorage.setItem('nas-loader-seen', '1'); } catch (e) {} });
      for (const p of PAGES) {
        const route = p.rel === 'index.html' ? '' : path.dirname(p.rel) + '/';
        for (const lang of ['', ...langs.map(l => l + '/')]) {
          await page.goto(`http://localhost:3000/${lang}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(500);
          const r = await page.evaluate(() => {
            // the switcher's open list must hold its text too — unfold it for
            // the measurement pass (offsetParent is null while [hidden])
            document.querySelectorAll('.lang-switch:not([hidden]) .ls-menu').forEach(m => { m.hidden = false; });
            const out = { overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, items: [] };
            document.querySelectorAll('.site-header .nav a, .site-header .nav-dd-trigger, .header-cta .btn, .lang-switch:not([hidden]) .ls-btn, .lang-switch:not([hidden]) .ls-menu a, .btn').forEach(el => {
              const cs = getComputedStyle(el);
              if (cs.display === 'none' || !el.offsetParent) return;
              // +3px: the nav caret is a 6px square rotated 45deg - its corner pokes
              // ~1.4px past the border box by design. Real text clipping is never 3px.
              if (el.scrollWidth > el.clientWidth + 3)
                out.items.push({ text: el.textContent.trim().slice(0, 32), by: el.scrollWidth - el.clientWidth });
              // Header items must stay on one line under longer text. Count
              // real line boxes; the dropdown menu items are two-line by
              // design (label + sublabel) and are exempt.
              if (el.closest('.site-header') && !el.closest('.nav-dd-menu')) {
                const r = document.createRange(); r.selectNodeContents(el);
                const rects = [...r.getClientRects()].filter(b => b.width > 2 && b.height > 2)
                  .sort((a, b) => a.top - b.top);
                let lines = 0, bottom = -Infinity;
                for (const b of rects) {                 // a rect on the same visual
                  if (b.top >= bottom - 2) lines++;      // line overlaps the previous
                  bottom = Math.max(bottom, b.bottom);   // one vertically
                }
                if (lines > 1)
                  out.items.push({ text: el.textContent.trim().slice(0, 32) + ' [WRAPPED to ' + lines + ' lines]', by: 0 });
              }
            });
            const h = document.querySelector('.site-header .header-inner');
            out.headerH = h ? h.getBoundingClientRect().height : null;
            return out;
          });
          const id = `${vp.name} ${lang || 'en/'}${route || '(front)'}`;
          if (r.overflowX > 2) problems.push(`${id}: page overflows horizontally by ${r.overflowX}px`);
          for (const it of r.items) problems.push(`${id}: "${it.text}" clipped by ${it.by}px`);
          // +20px: under width pressure the brand wordmark legitimately stacks
          // from two lines to the three-line vertical lock-up (same as the
          // logo), which costs ~17px on the front page. Text clipping and nav
          // wrapping are caught by their own checks above; growth beyond 20px
          // would mean something actually broke (a ballooning button measured
          // +22px before it was pinned with nowrap).
          if (lang === '') pageHeaderRef.set(vp.name + route, r.headerH);
          else if (r.headerH && pageHeaderRef.get(vp.name + route) && r.headerH > pageHeaderRef.get(vp.name + route) + 20)
            problems.push(`${id}: header grows ${(r.headerH - pageHeaderRef.get(vp.name + route)).toFixed(0)}px vs EN`);
        }
      }
      await page.close();
    }
    // ---- font-subset probe: the loaded Space Grotesk (or, on Cyrillic
    // builds, Inter) must actually carry every special character the site's
    // languages can produce — a missing glyph falls back silently otherwise.
    {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
      for (const lang of langs) {
        await page.goto(`http://localhost:3000/${lang}/`, { waitUntil: 'load', timeout: 30000 });
        const face = LANG_META[lang]?.cyrillic ? 'Inter' : 'Space Grotesk';
        const probe = LANG_META[lang]?.cyrillic ? 'ЄїҐібВ' : FONT_PROBE_CHARS;
        const missing = await page.evaluate(async ([face, probe]) => {
          await document.fonts.ready;
          // fonts.load first: css2 splits faces into unicode-range subset
          // files and the browser only fetches the ones the page's own text
          // needs — a glyph in an unfetched subset is covered, not missing.
          await document.fonts.load(`16px "${face}"`, probe);
          return [...probe].filter(ch => ch !== ' ' && !document.fonts.check(`16px "${face}"`, ch));
        }, [face, probe]);
        if (missing.length)
          problems.push(`/${lang}/: ${face} subset is missing glyph(s): ${missing.join(' ')}`);
        else
          console.log(`  /${lang}/: ${face} covers "${probe}"`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(`\nLayout under ${PSEUDO ? 'pseudo-localised (+~15%)' : 'the real translated'} text — ${problems.length === 0 ? 'nav, buttons and pages all hold, desktop and mobile' : problems.length + ' PROBLEM(S):'}`);
  problems.forEach(m => console.log('  · ' + m));
  if (problems.length) throw new Error(`Layout check failed (${langs.join(', ')}).`);
}
const pageHeaderRef = new Map();

// ---------------------------------------------------------------------------
async function main() {
  const sources = new Map();
  for (const p of PAGES) sources.set(p.rel, await fs.readFile(path.join(repoRoot, p.rel), 'utf8'));

  const bodyText = (src) => {
    const noRaw = src.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
    const body = noRaw.match(/<body[^>]*>([\s\S]*)<\/body>/);
    return decode(stripTags(body ? body[1] : noRaw)
      .replace(/\s*EN\s*·\s*УКР\s*/g, ' '))         // the pre-2026-09 switcher anchor, scrubbed
      .replace(/\s+/g, ' ').trim();
  };
  // the switcher's own text (EN + native language names) is stamp-owned, not
  // page content — cut the whole element before comparing visible text
  const scrubSwitcher = (src) => src.replace(OLD_SWITCHER_RE, ' ').replace(SWITCHER_RE, ' ');

  // languages named on the command line (after the mode flag): codes or "all"
  const langArgs = RAW_ARGS.filter(a => !a.startsWith('--'));
  const pickLangs = (fallback) => {
    if (langArgs.includes('all') || (!langArgs.length && fallback === 'all')) return BUILD_LANGS;
    const picked = langArgs.filter(a => BUILD_LANGS.includes(a));
    const unknown = langArgs.filter(a => a !== 'all' && !BUILD_LANGS.includes(a));
    if (unknown.length) throw new Error(`unknown language(s): ${unknown.join(', ')} (configured: ${BUILD_LANGS.join(', ')})`);
    if (!picked.length) throw new Error(`no language given — pass codes (${BUILD_LANGS.join(' ')}) or "all"`);
    return picked;
  };

  if (MODE === '--mark') {
    const before = new Map();
    for (const p of PAGES) before.set(p.rel, bodyText(scrubSwitcher(sources.get(p.rel))));
    markPages(sources);
    // The codemod may only ADD inert attributes and the (hidden) switcher —
    // the visible text of every page must be byte-identical afterwards.
    for (const p of PAGES) {
      const after = bodyText(scrubSwitcher(sources.get(p.rel)));
      const prev = before.get(p.rel);
      if (after !== prev) {
        const i = [...after].findIndex((c, idx) => c !== prev[idx]);
        throw new Error(`${p.rel}: visible text changed by the codemod near "${after.slice(Math.max(0, i - 40), i + 40)}" — refusing to write`);
      }
    }
    for (const p of PAGES) await fs.writeFile(path.join(repoRoot, p.rel), sources.get(p.rel), 'utf8');
    console.log('Markers stamped into the English pages (inert data-i18n attributes + switcher).');
    const en = extract(sources);
    const sync = await writeLocales(en);
    for (const [l, s] of Object.entries(sync))
      console.log(`  ${l}.json synced (${s.kept} kept, ${s.added} empty, ${s.orphaned} orphaned)`);
    report(en);
  } else if (MODE === '--extract') {
    const en = extract(sources);
    const sync = await writeLocales(en);
    console.log('locales/en.json written');
    for (const [l, s] of Object.entries(sync))
      console.log(`  ${l}.json synced (${s.kept} kept, ${s.added} empty, ${s.orphaned} orphaned)`);
    report(en);
  } else if (MODE === '--build-uk' || MODE === '--build') {
    const langs = MODE === '--build-uk' ? ['uk'] : pickLangs();
    for (const lang of langs) await buildLang(sources, lang);
  } else if (MODE === '--check-layout') {
    // default: pseudo-localised stress test; --real measures the actual
    // translated copy currently in the locale files instead.
    PSEUDO = !ARGS.has('--real');
    const langs = pickLangs('all');
    for (const lang of langs) await buildLang(sources, lang);
    await checkLayout(langs);
  }
}
await main();
console.log('\nDone.');
