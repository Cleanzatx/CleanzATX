// Vercel serverless function: a customer picked a day on the hidden /book page.
//
// Rotor's open API can't create jobs, so this creates a high priority Rotor task dated
// on the day and arrival window they picked, linked to their Rotor customer or lead
// when the phone number matches. Tyler (or the office) then schedules the job on that
// day in Rotor and texts them to confirm.
// Setup: ROTOR_API_KEY (needs tasks:create, customers:read, leads:read) in Vercel env.

const ROTOR = 'https://api.getrotor.com/open-api';
const ROTOR_API_VERSION = '1.1.0';
const TZ = 'America/Chicago';
const SLOTS = { am: { hour: 8, label: 'morning, 8 to 9 AM arrival' }, pm: { hour: 12, label: 'afternoon, 12 to 1 PM arrival' } };

function clean(value, max = 300) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function headers(apiKey) {
  return { 'x-api-key': apiKey, 'rotor-api-version': ROTOR_API_VERSION, 'Content-Type': 'application/json' };
}

// "2026-11-10" + 8 -> "2026-11-10T08:00:00-06:00" in Austin time
function austinIso(date, hour) {
  const guess = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' })
    .formatToParts(guess).find(p => p.type === 'timeZoneName').value; // "GMT-6"
  const m = name.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const off = m ? `${m[1]}${m[2].padStart(2, '0')}:${(m[3] || '00').padStart(2, '0')}` : '-06:00';
  return `${date}T${String(hour).padStart(2, '0')}:00:00${off}`;
}

function prettyDate(date) {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' });
}

// Rotor customer or lead with this phone, or null. Never blocks the task.
async function findContact(apiKey, digits) {
  for (const [path, type] of [['customers', 'customer'], ['leads', 'lead']]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const r = await fetch(`${ROTOR}/${path}?limit=5&search=${digits}`, { headers: headers(apiKey), signal: controller.signal });
      if (!r.ok) continue;
      const d = await r.json();
      const hit = (d.data || []).find(c => String(c.phone || c.phone_number || '').replace(/\D/g, '').slice(-10) === digits);
      if (hit && hit.id) return { id: hit.id, type };
    } catch (e) {
      // try the next list
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }
  let f = req.body;
  if (typeof f === 'string') { try { f = JSON.parse(f); } catch (e) { f = null; } }
  if (!f || typeof f !== 'object') return res.status(400).json({ ok: false });
  if (clean(f.website)) return res.status(200).json({ ok: true }); // honeypot

  const name = clean(f.name, 120);
  const phone = clean(f.phone, 30);
  const digits = phone.replace(/\D/g, '').slice(-10);
  const date = clean(f.date, 10);
  const slot = SLOTS[f.slot];
  if (!name || digits.length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !slot) {
    return res.status(400).json({ ok: false, error: 'Missing name, phone, day or time.' });
  }

  const apiKey = process.env.ROTOR_API_KEY;
  if (!apiKey) {
    console.error('[book-request] ROTOR_API_KEY is not set; booking not sent for', name);
    return res.status(500).json({ ok: false });
  }

  const contact = await findContact(apiKey, digits);
  const notes = [
    `Booked on the website /book page: ${prettyDate(date)}, ${slot.label}.`,
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Address: ${clean(f.address, 255) || 'not given'}`,
    `Customer notes: ${clean(f.notes, 1000) || 'none'}`,
    contact ? `Linked to their Rotor ${contact.type} by phone.` : 'No Rotor customer or lead matched this phone.',
    'Next: schedule the job on this day in Rotor, then text them to confirm.',
  ].join('\n');

  const task = {
    name: `Schedule ${name}: ${prettyDate(date)} ${f.slot === 'am' ? 'AM' : 'PM'}`.slice(0, 255),
    priority: 'high',
    status: 'open',
    due_date: austinIso(date, slot.hour),
    notes: notes.slice(0, 2000),
  };
  if (contact) { task.contact_id = contact.id; task.contact_type = contact.type; }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(`${ROTOR}/tasks`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify(task), signal: controller.signal });
    if (!r.ok) {
      console.error(`[book-request] Rotor returned ${r.status} for ${name}: ${(await r.text().catch(() => '')).slice(0, 500)}`);
      return res.status(502).json({ ok: false });
    }
    console.log(`[book-request] Rotor task created for ${name} on ${date} ${f.slot}${contact ? ` (${contact.type})` : ''}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[book-request] Rotor request failed for ${name}: ${err && err.name === 'AbortError' ? 'timed out' : err && err.message}`);
    return res.status(502).json({ ok: false });
  } finally {
    clearTimeout(timer);
  }
};
