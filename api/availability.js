// Vercel serverless function: which weekday mornings and afternoons are already booked.
// Used by the hidden /book page. Returns only dates and booked halves, never customer
// names, addresses or prices.
//
// Rotor's open API has no calendar or visit length, only each job's first visit start
// time and its line items, so this uses Tyler's scheduling rules (confirmed 2026-10-27):
//   - one crew, Monday to Friday
//   - arrival windows: morning 8 to 9 AM, afternoon 12 to 1 PM
//   - a job worth $800 or more takes the whole day
//   - otherwise: starts by 9:00 blocks the morning, 9:01 to 11:59 blocks both, noon or later blocks the afternoon
// Setup: ROTOR_API_KEY (needs jobs:read) in Vercel > cleanzatx > Settings > Environment Variables.

const ROTOR_JOBS_URL = 'https://api.getrotor.com/open-api/serviced-jobs';
const ROTOR_API_VERSION = '1.1.0';
const TZ = 'America/Chicago';
const DAYS_AHEAD = 21;
const FULL_DAY_PRICE = 800;
// Closed days (Austin dates). Add time off here until Rotor's API exposes it.
const CLOSED = new Set(['2026-11-26', '2026-11-27', '2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01']);

// Date parts in Austin time: { date: 'YYYY-MM-DD', minutes: minutes after midnight, weekday: 0-6 }
function austin(d) {
  const p = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(d).forEach(x => { p[x.type] = x.value; });
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: (+p.hour) * 60 + (+p.minute), weekday: wd };
}

function jobTotal(job) {
  return (job.line_items || []).reduce((sum, li) => sum + (Number(li.total_price) || 0), 0);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false });
  }
  const apiKey = process.env.ROTOR_API_KEY;
  if (!apiKey) {
    console.error('[availability] ROTOR_API_KEY is not set');
    return res.status(500).json({ ok: false });
  }

  const now = new Date();
  const start = new Date(now.getTime() - 24 * 3600 * 1000);
  const end = new Date(now.getTime() + (DAYS_AHEAD + 2) * 24 * 3600 * 1000);
  const url = `${ROTOR_JOBS_URL}?only_completed=false&limit=1000`
    + `&service_date_range_start=${encodeURIComponent(start.toISOString())}`
    + `&service_date_range_end=${encodeURIComponent(end.toISOString())}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      headers: { 'x-api-key': apiKey, 'rotor-api-version': ROTOR_API_VERSION },
      signal: controller.signal,
    });
    if (!r.ok) {
      console.error(`[availability] Rotor returned ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`);
      return res.status(502).json({ ok: false });
    }
    const body = await r.json();
    const booked = {};
    for (const job of body.data || []) {
      if (!job.service_date) continue;
      if (/cancel/i.test(String(job.status || ''))) continue;
      const t = austin(new Date(job.service_date));
      const day = booked[t.date] || (booked[t.date] = { am: false, pm: false });
      if (jobTotal(job) >= FULL_DAY_PRICE) { day.am = true; day.pm = true; }
      else if (t.minutes <= 9 * 60) day.am = true;
      else if (t.minutes < 12 * 60) { day.am = true; day.pm = true; }
      else day.pm = true;
    }

    // Weekdays from tomorrow through DAYS_AHEAD days out
    const days = [];
    const seen = new Set([austin(now).date]);
    for (let i = 1; i <= DAYS_AHEAD; i++) {
      const d = austin(new Date(now.getTime() + i * 24 * 3600 * 1000));
      if (seen.has(d.date)) continue;
      seen.add(d.date);
      const b = booked[d.date] || { am: false, pm: false };
      days.push({ date: d.date, weekday: d.weekday, open: d.weekday >= 1 && d.weekday <= 5 && !CLOSED.has(d.date), am: b.am, pm: b.pm });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ ok: true, days });
  } catch (err) {
    console.error(`[availability] Rotor request failed: ${err && err.name === 'AbortError' ? 'timed out' : err && err.message}`);
    return res.status(502).json({ ok: false });
  } finally {
    clearTimeout(timer);
  }
};
