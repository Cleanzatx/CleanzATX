/* ==========================================================================
   CleanzATX — holiday promo banner
   Picks this week's sale from the date in Austin (Central time) and fills the
   topbar on every page that has one. The banner in each page's HTML is only the
   fallback for visitors without JavaScript.
   Preview any date with ?promo=2026-12-10 on the end of a page's URL.
   To change a sale: edit its line in SALES (name, code, line).
   ========================================================================== */
(function () {
  'use strict';

  // Holidays that move every year
  function nthWeekday(y, month, weekday, n) { // n-th weekday (0=Sun) of a month (0=Jan)
    var d = new Date(y, month, 1);
    d.setDate(1 + ((weekday - d.getDay() + 7) % 7) + (n - 1) * 7);
    return d;
  }
  function lastWeekday(y, month, weekday) {
    var d = new Date(y, month + 1, 0);
    d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7));
    return d;
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

  function today() {
    var q = location.search.match(/[?&]promo=(\d{4})-(\d{2})-(\d{2})/);
    if (q) return new Date(+q[1], +q[2] - 1, +q[3]);
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return new Date(+p.year, +p.month - 1, +p.day);
  }

  // Every sale is 10% off a first window cleaning. Each runs from its start date
  // until the next sale starts; `line` is the second message in the banner.
  function sales(y) {
    var thanksgiving = nthWeekday(y, 10, 4, 4);
    var mothers = nthWeekday(y, 4, 0, 2);
    var memorial = lastWeekday(y, 4, 1);
    var fathers = nthWeekday(y, 5, 0, 3);
    var labor = nthWeekday(y, 8, 1, 1);
    return [
      { from: new Date(y, 0, 1),        icon: '🎆', name: 'New Year Sale',        code: 'NEWYEAR',  line: 'Start the year with a clear view' },
      { from: new Date(y, 1, 1),        icon: '💝', name: "Valentine's Sale",      code: 'LOVE',     line: 'Show your home some love' },
      { from: new Date(y, 1, 15),       icon: '☘️', name: "St. Patrick's Sale",    code: 'LUCKY',    line: 'Wash off the winter cedar pollen' },
      { from: new Date(y, 2, 18),       icon: '🌸', name: 'Spring Sale',          code: 'SPRING',   line: 'Spring cleaning, from the ground up' },
      { from: new Date(y, 4, 1),        icon: '💐', name: "Mother's Day Sale",     code: 'MOM',      line: 'Give Mom spotless windows' },
      { from: addDays(mothers, 1),      icon: '🇺🇸', name: 'Memorial Day Sale',     code: 'MEMORIAL', line: 'Clear windows for the start of summer' },
      { from: addDays(memorial, 1),     icon: '👔', name: "Father's Day Sale",     code: 'DAD',      line: 'One less chore for Dad' },
      { from: addDays(fathers, 1),      icon: '🎆', name: '4th of July Sale',     code: 'JULY4',    line: 'Lake views ready for the fireworks' },
      { from: new Date(y, 6, 5),        icon: '☀️', name: 'Summer Sale',          code: 'SUMMER',   line: 'Beat the Texas heat, we do the work' },
      { from: addDays(labor, -7),       icon: '🇺🇸', name: 'Labor Day Sale',        code: 'LABORDAY', line: 'Take the day off, we have the windows' },
      { from: addDays(labor, 1),        icon: '🍂', name: 'Fall Sale',            code: 'FALL',     line: 'Clear glass for the cooler months' },
      { from: new Date(y, 9, 15),       icon: '🎃', name: 'Halloween Sale',       code: 'BOO',      line: 'No spooky spots on your glass' },
      { from: new Date(y, 10, 1),       icon: '🦃', name: 'Thanksgiving Sale',    code: 'THANKS',   line: 'Spotless windows before the family arrives' },
      { from: addDays(thanksgiving, 1), icon: '🛍️', name: 'Black Friday Sale',    code: 'FRIDAY',   line: 'Our best time of year to book' },
      { from: new Date(y, 11, 1),       icon: '🎄', name: 'Christmas Sale',       code: 'MERRY',    line: 'Clean windows for the holiday lights' },
      { from: new Date(y, 11, 26),      icon: '🎆', name: 'New Year Sale',        code: 'NEWYEAR',  line: 'Start the year with a clear view' },
    ];
  }

  function current() {
    var d = today(), list = sales(d.getFullYear()), pick = list[0];
    list.forEach(function (s) { if (d >= s.from) pick = s; });
    return pick;
  }

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function fill() {
    var s = current();
    window.CZ_PROMO = { name: s.name, code: s.code };
    var offer = '<span class="topbar__item">' + s.icon + ' ' + esc(s.name) + ': use code <span class="topbar__code">' + esc(s.code) + '</span> for 10% off your first window cleaning</span>';
    var line = '<span class="topbar__item">' + s.icon + ' ' + esc(s.line) + '</span>';
    var html = offer + line + offer + line;
    var groups = document.querySelectorAll('.topbar__group');
    for (var i = 0; i < groups.length; i++) groups[i].innerHTML = html;
    // The strip above the quote form says the same sale
    var strip = document.querySelector('[data-promo-strip]');
    if (strip) strip.innerHTML = s.icon + ' <strong>' + esc(s.name) + ':</strong> code ' + esc(s.code) + ' takes 10% off your first window cleaning';
  }

  if (document.querySelector('.topbar__group')) fill();
  // Run again once the whole page (and the quote strip further down) has loaded
  document.addEventListener('DOMContentLoaded', fill);
})();
