// Vercel serverless function: sends website leads to Rotor.
//
// Two kinds of lead post here (main.js):
//   - the quote form (kind "quote", the default)
//   - the free screens pop-up (kind "screens"): a phone number only, sent when the
//     visitor leaves without finishing the quote form, so Tyler can call them back.
// When someone claims free screens and then finishes the quote form, main.js sends
// only the quote, with free_screens set, so Rotor gets one combined lead.
//
// The quote form sends a short first submission (name, phone, address, service), then
// optionally a second one with follow_up: true carrying the extra details. Same name/phone.
//
// Rotor's open API can create and search leads but can't edit one, so if the phone
// is already on a Rotor lead, the new lead's notes say so and name the earlier one.
//
// The visitor's confirmation never waits on this, so a Rotor outage only shows up
// in the logs: Vercel dashboard > cleanzatx > Logs, search "[quote-lead]".
// Setup: ROTOR_API_KEY in Vercel > cleanzatx > Settings > Environment Variables.

const ROTOR_URL = 'https://api.getrotor.com/open-api/leads';
const ROTOR_API_VERSION = '1.1.0';
const ROTOR_TIMEOUT_MS = 8000;
const LOOKUP_TIMEOUT_MS = 3000;

const FREE_SCREENS_NOTE = 'FREE SCREENS OFFER: claimed with the website pop-up. Free screen cleaning applies to their first window cleaning only, not every service. Tech: tell the customer "Free screen cleaning applied to your service."';

const WINDOW_SERVICES = ['Exterior Windows', 'Interior Windows', 'Screen Cleaning', 'Track Cleaning', 'Skylights', 'Post Construction', 'Hard Water Removal'];

// Trim, flatten line breaks, and cap length so one field can't flood the notes
function clean(value, max = 300) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

// "2026-11-05" -> "11/5/2026"; anything else passes through cleaned
function formatDate(value) {
  const v = clean(value, 20);
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${+m[2]}/${+m[3]}/${m[1]}` : v;
}

function submissionDate(d = new Date()) {
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/Chicago', month: 'numeric', day: 'numeric', year: 'numeric',
  });
}

function serviceList(f) {
  return Array.isArray(f.services) ? f.services.map(s => clean(s, 60)).filter(Boolean) : [];
}

// "Window Cleaning", "Power Washing", or both, from the services they picked
function serviceType(services) {
  const types = [];
  if (!services.length || services.some(s => WINDOW_SERVICES.includes(s))) types.push('Window Cleaning');
  if (services.some(s => !WINDOW_SERVICES.includes(s))) types.push('Power Washing');
  return types.join(' + ');
}

function quoteNotes(f, services) {
  const foundUs = clean(f.referral) + (clean(f.referrer) ? ` (${clean(f.referrer)})` : '');
  return [
    f.follow_up ? 'FOLLOW-UP DETAILS: the same visitor (same name and phone) sent the short quote form first, then added these details. Combine with that lead.' : '',
    f.free_screens ? FREE_SCREENS_NOTE : '',
    `Website quote request ${submissionDate()}`,
    `OK to text: ${f.sms_consent === true || f.sms_consent === 'Yes' ? 'Yes' : 'No'}`,
    `Services requested: ${services.join(', ')}`,
    `Frequency: ${clean(f.frequency)}`,
    `Timeline: ${clean(f.timeline)}`,
    `Target date: ${formatDate(f.target_date)}`,
    `Last serviced: ${clean(f.last_serviced)}`,
    `Property type: ${clean(f.property_type)}`,
    `Square footage: ${clean(f.sqft, 12)}`,
    `Stories: ${clean(f.stories, 4)}`,
    `How they found us: ${foundUs}`,
    `Customer notes: ${clean(f.notes, 1000)}`,
  ].filter(Boolean).join('\n');
}

function screensNotes() {
  return [
    FREE_SCREENS_NOTE,
    `Entered their number in the website pop-up on ${submissionDate()} but left before finishing the quote form. Call or text them to finish the quote.`,
    'OK to text: Yes (agreed in the pop-up)',
  ].join('\n');
}

function rotorHeaders(apiKey) {
  return { 'x-api-key': apiKey, 'rotor-api-version': ROTOR_API_VERSION, 'Content-Type': 'application/json' };
}

// An existing Rotor lead with the same phone, or null. Never blocks the new lead.
async function findLeadByPhone(apiKey, digits) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const r = await fetch(`${ROTOR_URL}?limit=5&search=${digits}`, { headers: rotorHeaders(apiKey), signal: controller.signal });
    if (!r.ok) return null;
    const d = await r.json();
    return (d.data || []).find(l => String(l.phone || '').replace(/\D/g, '').slice(-10) === digits) || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  // The pop-up sends with navigator.sendBeacon, which arrives as a text body
  let f = req.body;
  if (typeof f === 'string') { try { f = JSON.parse(f); } catch (e) { f = null; } }
  if (!f || typeof f !== 'object') return res.status(400).json({ ok: false });

  const isScreens = f.kind === 'screens';
  const phone = clean(f.phone, 30);
  const digits = phone.replace(/\D/g, '').slice(-10);
  const name = isScreens ? 'Free screens lead (no name yet)' : clean(f.name, 120);
  // Same minimum the forms enforce: a 10 digit phone, and a name on the quote form
  if (!name || digits.length < 10) return res.status(400).json({ ok: false });

  const apiKey = process.env.ROTOR_API_KEY;
  if (!apiKey) {
    console.error('[quote-lead] ROTOR_API_KEY is not set; lead not sent to Rotor for', name);
    return res.status(500).json({ ok: false });
  }

  const services = serviceList(f);
  let notes = isScreens ? screensNotes() : quoteNotes(f, services);
  const existing = await findLeadByPhone(apiKey, digits);
  if (existing) {
    const when = existing.created_at ? submissionDate(new Date(existing.created_at)) : 'earlier';
    notes = `SAME PHONE as the Rotor lead "${clean(existing.name, 80) || 'no name'}" added ${when}. Combine these two.\n` + notes;
  }

  const tags = ['website'];
  if (isScreens || f.free_screens) tags.push('free-screens');
  if (!isScreens && f.follow_up) tags.push('follow-up');
  const lead = {
    name,
    phone,
    source: isScreens ? 'Website free screens pop-up' : (f.follow_up ? 'Website quote form (follow-up details)' : 'Website quote form'),
    service_type: isScreens ? 'Window Cleaning' : serviceType(services),
    priority: 'high',
    tags,
    notes: notes.slice(0, 2000),
  };
  const email = clean(f.email, 200);
  const address = clean(f.address, 255);
  if (email) lead.email = email;
  if (address) lead.address_street1 = address;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROTOR_TIMEOUT_MS);
  try {
    const r = await fetch(ROTOR_URL, {
      method: 'POST',
      headers: rotorHeaders(apiKey),
      body: JSON.stringify(lead),
      signal: controller.signal,
    });
    if (!r.ok) {
      const detail = (await r.text().catch(() => '')).slice(0, 500);
      console.error(`[quote-lead] Rotor returned ${r.status} for ${name}: ${detail}`);
      return res.status(502).json({ ok: false });
    }
    console.log(`[quote-lead] Rotor ${isScreens ? 'free screens' : 'quote'} lead sent for ${name} (${r.status})${existing ? ', same phone as an earlier lead' : ''}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[quote-lead] Rotor request failed for ${name}: ${err && err.name === 'AbortError' ? 'timed out' : err && err.message}`);
    return res.status(502).json({ ok: false });
  } finally {
    clearTimeout(timer);
  }
};
