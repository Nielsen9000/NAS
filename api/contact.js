import { Resend } from 'resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_ORIGINS = [
  'https://nordicadvancedsystems.com',
  'https://www.nordicadvancedsystems.com',
];
const FROM = 'NAS Contact <noreply@nordicadvancedsystems.com>';
const TO = 'contact@nordicadvancedsystems.com';

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function buildHtml({ name, email, company, country, phone, subject, message, ts }) {
  const row = (label, value) => value
    ? `<tr><td style="padding:14px 0;border-bottom:1px solid rgba(148,205,221,0.14);width:160px;vertical-align:top">
        <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#3bb6e8">${escapeHtml(label)}</div>
       </td>
       <td style="padding:14px 0;border-bottom:1px solid rgba(148,205,221,0.14);color:#f3f7f8;font-size:15px;line-height:1.6;font-family:Inter,Arial,sans-serif">${escapeHtml(value).replace(/\n/g, '<br/>')}</td></tr>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>New contact submission</title></head>
<body style="margin:0;background:#08202a;font-family:Inter,Arial,sans-serif;color:#f3f7f8">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08202a">
    <tr><td align="center" style="padding:40px 20px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0d2a31;border:1px solid rgba(148,205,221,0.14);border-radius:14px;overflow:hidden">
        <tr><td style="padding:32px 36px 20px 36px;border-bottom:1px solid rgba(148,205,221,0.14)">
          <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#3bb6e8">/ NEW CONTACT SUBMISSION</div>
          <div style="margin-top:10px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:600;letter-spacing:-0.01em;color:#f3f7f8">${escapeHtml(name)}</div>
        </td></tr>
        <tr><td style="padding:8px 36px 20px 36px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row('Name', name)}
            ${row('Email', email)}
            ${row('Company', company)}
            ${row('Country', country)}
            ${row('Phone', phone)}
            ${row('Subject', subject)}
            ${row('Message', message)}
          </table>
        </td></tr>
        <tr><td style="padding:18px 36px 28px 36px;border-top:1px solid rgba(148,205,221,0.14)">
          <div style="font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(243,247,248,0.38)">
            ${escapeHtml(ts)} · Sent via nordicadvancedsystems.com
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildText({ name, email, company, country, phone, subject, message, ts }) {
  const lines = ['/ NEW CONTACT SUBMISSION', ''];
  const add = (k, v) => { if (v) lines.push(`${k}: ${v}`); };
  add('Name', name);
  add('Email', email);
  add('Company', company);
  add('Country', country);
  add('Phone', phone);
  add('Subject', subject);
  if (message) {
    lines.push('', 'Message:', message);
  }
  lines.push('', '—', `${ts} · Sent via nordicadvancedsystems.com`);
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

  if (typeof body._gotcha === 'string' && body._gotcha.trim() !== '') {
    console.log(`[contact] honeypot tripped ip=${ip}`);
    res.status(200).json({ success: true });
    return;
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const country = typeof body.country === 'string' ? body.country.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';

  if (!name || !email || !message) {
    res.status(400).json({ error: 'Name, email, and message are required.' });
    return;
  }
  if (name.length > 200 || email.length > 320) {
    res.status(400).json({ error: 'Input too long.' });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (message.length > 5000) {
    res.status(400).json({ error: 'Message must be 5000 characters or fewer.' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY missing');
    res.status(500).json({ error: 'Email service is not configured.' });
    return;
  }

  const ts = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const senderName = subject ? `${name} — ${subject}` : name;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to: [TO],
      replyTo: email,
      subject: `New contact form submission — ${senderName}`,
      html: buildHtml({ name, email, company, country, phone, subject, message, ts }),
      text: buildText({ name, email, company, country, phone, subject, message, ts }),
    });

    if (error) {
      console.error('[contact] resend error', { ip, message: error.message || error });
      res.status(502).json({ error: 'Could not send your message. Please try again shortly.' });
      return;
    }

    console.log(`[contact] sent ip=${ip} from=${email}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[contact] unexpected error', { ip, message: err?.message });
    res.status(500).json({ error: 'Could not send your message. Please try again shortly.' });
  }
}
