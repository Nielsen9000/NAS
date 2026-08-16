// Single source of truth for the business cards AND the branded contact pages.
export const SITE = 'https://www.nordicadvancedsystems.com';   // canonical (non-www 307-redirects here)

export const COMPANY = {
  name: 'Nordic Advanced Systems',
  website: 'www.nordicadvancedsystems.com',
  url: 'https://www.nordicadvancedsystems.com',
  address: 'Lufthavnvej 131 · Beldringe · 5270 Odense N · Denmark',
  vat: 'VAT 459 76645',
  eyebrow: 'NORDIC ADVANCED SYSTEMS',
  meta: 'DENMARK · 55.476°N 10.331°E',
};

export const PEOPLE = [
  {
    slug: 'claus-vilsen',
    name: 'Claus Vilsen',
    title: 'Executive Board Member',
    phone: '+45 21 19 90 40',
    phoneIsSignal: true,
    email: 'cvi@nordicadvancedsystems.com',
  },
  {
    slug: 'christoffer-feilberg',
    name: 'Christoffer Feilberg',
    title: 'Chief Executive Officer',
    phone: '+45 26 88 02 50',
    phoneIsSignal: true,
    email: 'cfe@nordicadvancedsystems.com',
  },
  {
    slug: 'henrik-radich',
    name: 'Henrik Radich',
    title: 'Partner',
    phone: '+45 23 62 10 40',
    phoneIsSignal: true,
    email: 'hro@nordicadvancedsystems.com',
  },
  {
    slug: 'jesper-nielsen',
    name: 'Jesper Nielsen',
    title: 'Intelligent Solutions',
    phone: '+45 27 83 13 23',
    phoneIsSignal: true,
    email: 'jni@nordicadvancedsystems.com',
  },
];

// The card QR points here — a short URL keeps the QR coarse and easy to scan.
export function contactUrl(p) { return `${SITE}/c/${p.slug}`; }

export function telDigits(p) { return '+' + p.phone.replace(/[^0-9]/g, ''); }

// Full vCard for the downloadable .vcf (no QR density limit here, so include everything).
export function vcardFull(p) {
  const parts = p.name.trim().split(/\s+/);
  const last = parts.pop();
  const first = parts.join(' ');
  return [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${last};${first};;;`, `FN:${p.name}`,
    `ORG:${COMPANY.name}`, `TITLE:${p.title}`,
    `TEL;TYPE=CELL:${telDigits(p)}`,
    `EMAIL;TYPE=WORK:${p.email}`,
    `URL:${COMPANY.url}`,
    'ADR;TYPE=WORK:;;Lufthavnvej 131;Beldringe;5270 Odense N;;Denmark',
    'END:VCARD',
  ].join('\r\n');
}
