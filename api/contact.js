import { Resend } from 'resend';

/* ------------------------------------------------------------------
   Routing map — every enquiry type currently goes to the shared inbox.
   To route a type to a dedicated inbox later, change only its value.
   ------------------------------------------------------------------ */
const DEFAULT_TO = 'contact@nordicadvancedsystems.com';
const ROUTING = {
  'NAS Engine 2C or 2E': 'contact@nordicadvancedsystems.com',
  'Drone Stack':         'contact@nordicadvancedsystems.com',
  'EFI system':          'contact@nordicadvancedsystems.com',
  'Job':                 'contact@nordicadvancedsystems.com',
  'Partnership':         'contact@nordicadvancedsystems.com',
  'Finance':             'contact@nordicadvancedsystems.com',
  'Press':               'contact@nordicadvancedsystems.com',
  'General':             'contact@nordicadvancedsystems.com',
};
export const ENQUIRY_TYPES = Object.keys(ROUTING);
export function routeTo(type) { return ROUTING[type] || DEFAULT_TO; }

const FROM = 'NAS Contact <noreply@nordicadvancedsystems.com>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_ORIGINS = [
  'https://nordicadvancedsystems.com',
  'https://www.nordicadvancedsystems.com',
];

export function buildSubject({ name, company, type }) {
  const tag = String(type || 'GENERAL').toUpperCase();
  const who = [name, company].filter(Boolean).join(', ');
  return `[${tag}] New enquiry from ${who || 'website'}`;
}

function escapeHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pickOrigin(req) {
  const origin = req.headers?.origin;
  const host = req.headers?.host || '';
  if (process.env.VERCEL_ENV !== 'production') return origin || '*';
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  if (ALLOWED_ORIGINS.some(o => o.endsWith(host))) return `https://${host}`;
  return ALLOWED_ORIGINS[0];
}

function setCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', pickOrigin(req));
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const FIELD_ORDER = [
  ['type', 'Enquiry type'],
  ['name', 'Name'],
  ['email', 'Company email'],
  ['company', 'Company name'],
  ['phone', 'Phone'],
  ['hours', 'Business hours'],
  ['role', 'Job role'],
  ['country', 'Country/Region'],
  ['consent', 'Marketing consent'],
];

function buildHtml(f) {
  const row = (label, value) => value
    ? `<tr><td style="padding:14px 0;border-bottom:1px solid rgba(148,205,221,0.14);width:170px;vertical-align:top">
        <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#3bb6e8">${escapeHtml(label)}</div>
       </td>
       <td style="padding:14px 0;border-bottom:1px solid rgba(148,205,221,0.14);color:#f3f7f8;font-size:15px;line-height:1.6;font-family:Inter,Arial,sans-serif">${escapeHtml(value).replace(/\n/g, '<br/>')}</td></tr>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>New enquiry</title></head>
<body style="margin:0;background:#08202a;font-family:Inter,Arial,sans-serif;color:#f3f7f8">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08202a">
    <tr><td align="center" style="padding:40px 20px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0d2a31;border:1px solid rgba(148,205,221,0.14);border-radius:14px;overflow:hidden">
        <tr><td style="padding:32px 36px 20px 36px;border-bottom:1px solid rgba(148,205,221,0.14)">
          <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#3bb6e8">/ NEW ENQUIRY &middot; ${escapeHtml(String(f.type || '').toUpperCase())}</div>
          <div style="margin-top:10px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:600;letter-spacing:-0.01em;color:#f3f7f8">${escapeHtml(f.name || 'Website enquiry')}</div>
        </td></tr>
        <tr><td style="padding:8px 36px 20px 36px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${FIELD_ORDER.map(([k, l]) => row(l, f[k])).join('')}
            ${f.message ? row('Message', f.message) : ''}
          </table>
        </td></tr>
        <tr><td style="padding:18px 36px 28px 36px;border-top:1px solid rgba(148,205,221,0.14)">
          <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(243,247,248,0.38)">
            ${escapeHtml(f.ts)} &middot; Sent via nordicadvancedsystems.com
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildText(f) {
  const lines = [`/ NEW ENQUIRY · ${String(f.type || '').toUpperCase()}`, ''];
  const add = (k, v) => { if (v) lines.push(`${k}: ${v}`); };
  FIELD_ORDER.forEach(([k, l]) => add(l, f[k]));
  if (f.message) lines.push('', 'Message:', f.message);
  lines.push('', '—', `${f.ts} · Sent via nordicadvancedsystems.com`);
  return lines.join('\n');
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 64 * 1024) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const body = await readJson(req);
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid request body.' });
    return;
  }

  // Honeypot — silently accept, send nothing.
  if (typeof body._gotcha === 'string' && body._gotcha.trim() !== '') {
    console.log(`[contact] honeypot tripped ip=${ip}`);
    res.status(200).json({ success: true });
    return;
  }

  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const firstName = str(body.firstName);
  const lastName = str(body.lastName);
  const email = str(body.email);
  const company = str(body.company);
  const type = str(body.type);
  const message = str(body.message);
  const prefix = str(body.prefix);
  const phone = str(body.phone);
  const hours = str(body.hours);
  const role = str(body.role);
  const country = str(body.country);
  const consent = body.consent === true || body.consent === 'true' || body.consent === 'on';
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const phoneFull = [prefix, phone].filter(Boolean).join(' ');

  // Server-side validation
  if (!ENQUIRY_TYPES.includes(type)) { res.status(400).json({ error: 'Please choose a valid enquiry type.' }); return; }
  if (!firstName) { res.status(400).json({ error: 'First name is required.' }); return; }
  if (!email || !EMAIL_RE.test(email)) { res.status(400).json({ error: 'A valid company email is required.' }); return; }
  if (!message) { res.status(400).json({ error: 'Please describe your enquiry.' }); return; }
  if (!consent) { res.status(400).json({ error: 'Consent is required to submit this form.' }); return; }
  if (name.length > 200 || email.length > 320 || message.length > 2000) {
    res.status(400).json({ error: 'Input too long.' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY missing');
    res.status(500).json({ error: 'Email service is not configured.' });
    return;
  }

  const to = routeTo(type);
  const ts = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const fields = {
    type, name, email, company,
    phone: phoneFull, hours, role, country,
    consent: consent ? 'Yes — marketing consent given' : '',
    message, ts,
  };

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to: [to],
      replyTo: email,
      subject: buildSubject({ name, company, type }),
      html: buildHtml(fields),
      text: buildText(fields),
    });

    if (error) {
      console.error('[contact] resend error', { ip, message: error.message || error });
      res.status(500).json({ error: 'Could not send your message. Please try again shortly.' });
      return;
    }

    console.log(`[contact] sent ip=${ip} type="${type}" to=${to} from=${email}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[contact] unexpected error', { ip, message: err?.message, stack: err?.stack });
    res.status(500).json({ error: 'Could not send your message. Please try again shortly.' });
  }
}
