/* ZIP or neighborhood name search over window.CZ_AREAS (from map-data.js). Shows matching pages under the box. */
(function () {
  var form = document.getElementById('zipFind'), input = document.getElementById('zipInput'), msg = document.getElementById('zipMsg');
  if (!form || !input || !msg) return;
  var HUB = { 'lakeway': 'Lakeway', 'lake-travis': 'Lake Travis', 'the-hills': 'The Hills', 'bee-cave': 'Bee Cave', 'spanish-oaks': 'Spanish Oaks', 'steiner-ranch': 'Steiner Ranch', 'four-points': 'Four Points', 'river-place': 'River Place' };
  var ZIP_HUB = { '78734': 'lakeway', '78738': 'bee-cave', '78736': 'bee-cave', '78669': 'lake-travis', '78645': 'lake-travis', '78732': 'steiner-ranch', '78730': 'river-place', '78726': 'four-points', '78750': 'four-points', '78733': 'spanish-oaks', '78735': 'spanish-oaks', '78746': 'spanish-oaks' };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function link(a) { return '<a href="/' + a.slug + '">' + esc(a.name) + '</a>'; }
  function run(q) {
    var data = window.CZ_AREAS || [];
    q = (q || '').trim();
    if (!q) { msg.innerHTML = ''; return; }
    var zip = q.replace(/\D/g, '');
    var hits = [], hubKey = null;
    if (/^\d{5}$/.test(zip)) {
      hubKey = ZIP_HUB[zip] || null;
      hits = data.filter(function (a) { return a.kind !== 'hub' && a.zips && a.zips.indexOf(zip) !== -1; });
      if (typeof gtag === 'function') gtag('event', 'zip_search', { zip: zip, matched: (hits.length || hubKey) ? 'yes' : 'no' });
    } else {
      var t = q.toLowerCase();
      hits = data.filter(function (a) { return a.name.toLowerCase().indexOf(t) !== -1; });
      if (typeof gtag === 'function') gtag('event', 'area_name_search', { term: q, matched: hits.length ? 'yes' : 'no' });
    }
    var hub = hubKey ? data.filter(function (a) { return a.kind === 'hub' && a.hub === hubKey; })[0] : null;
    if (!hits.length && !hub) {
      msg.innerHTML = 'No page for that yet, but we may still serve you. <a href="/#quoteWizard">Request a quote</a> or text <a href="sms:+15125180512">(512) 518-0512</a>.';
      return;
    }
    hits.sort(function (a, b) { return a.name.localeCompare(b.name); });
    var html = '';
    if (hub) html += '<p class="zip-find__hub">Your area page: ' + link(hub) + '</p>';
    if (hits.length) html += '<p class="zip-find__label">' + (hits.length === 1 ? 'Your neighborhood:' : hits.length + ' neighborhoods' + (zip ? ' in ' + zip : '') + ':') + '</p><div class="zip-find__hits">' + hits.map(link).join('') + '</div>';
    msg.innerHTML = html;
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); run(input.value); });
  var timer = null;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { run(input.value); }, 250); });
})();
