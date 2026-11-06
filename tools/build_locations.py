"""Builds every location page (hubs and neighborhoods) from tools/locations/*.json, plus the
areas section of the home page, the /areas directory, map-data.js, sitemap.xml and the llms.txt area list.
Every page is unique by construction: the only shared copy is the stats strip, the quote card and the CTA band.
Run:  python3 tools/build_locations.py <site dir>   then  python3 tools/polish.py <site dir>"""
import json, os, re, sys, glob, html, subprocess, datetime

SITE = sys.argv[1]
TOOLS = os.path.dirname(os.path.abspath(__file__))
LOC = os.path.join(TOOLS, 'locations')
home = open(f'{SITE}/index.html', encoding='utf-8').read()

def between(a, b, inclusive_end=False):
    i = home.index(a); j = home.index(b, i) + (len(b) if inclusive_end else 0)
    return home[i:j]
header = between('  <!-- ===== PROMO TOPBAR ===== -->', '  <!-- ===== HERO ===== -->')
header = re.sub(r'href="#', 'href="/#', header).replace('src="logo-mark-light.png"', 'src="/logo-mark-light.png"')
footer = between('  <!-- ===== FOOTER ===== -->', '</footer>', inclusive_end=True)
css_ver = re.search(r'styles\.css\?v=(\d+)', home).group(1)
MAP_VER = '2'
import math
try:
    MAP_BOUNDS = json.load(open(os.path.join(TOOLS, 'map_bounds.json')))   # s, n, w, e from the rendered image
except Exception:
    MAP_BOUNDS = None
FALLBACK_LL = {'window-cleaning-rough-hollow': (30.3335, -97.9885), 'window-cleaning-serene-hills': (30.3290, -97.9700), 'window-cleaning-flintrock-falls': (30.3390, -97.9640),
               'window-cleaning-falconhead': (30.3200, -97.9560), 'window-cleaning-lake-pointe': (30.3230, -97.9340), 'window-cleaning-westminster-glen': (30.3800, -97.8560),
               'window-cleaning-ut-golf-club': (30.3900, -97.9060), 'window-cleaning-apache-shores': (30.3780, -97.9660), 'window-cleaning-sweetwater': (30.3000, -97.9930)}
def _merc(lat): return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
def pin_pos(lat, lon):
    b = MAP_BOUNDS
    x = (lon - b['w']) / (b['e'] - b['w']) * 100
    y = (_merc(b['n']) - _merc(lat)) / (_merc(b['n']) - _merc(b['s'])) * 100
    return round(x, 2), round(y, 2)
CURATED_LL = {'window-cleaning-lake-travis': (30.4110, -97.9420), 'window-cleaning-sweetwater': (30.3000, -97.9930), 'window-cleaning-spanish-oaks': (30.2990, -97.9400),
              'window-cleaning-lakeway': (30.3647, -97.9797), 'window-cleaning-bee-cave': (30.3080, -97.9480), 'window-cleaning-the-hills': (30.3440, -97.9600),
              'window-cleaning-steiner-ranch': (30.3870, -97.8990), 'window-cleaning-four-points': (30.4000, -97.8720), 'window-cleaning-river-place': (30.3760, -97.8600)}
def static_map():
    if not MAP_BOUNDS: return ''
    pins = ''
    items = [(p, True) for p in hubs.values()] + [(pages[s], False) for s in MAP_PINS if s in pages]
    for p, is_hub in items:
        lat, lon = p.get('lat'), p.get('lon')
        if p['slug'] in CURATED_LL: lat, lon = CURATED_LL[p['slug']]
        elif not (lat and lon and str(p.get('geo_source', '')).startswith('osm')) and p['slug'] in FALLBACK_LL: lat, lon = FALLBACK_LL[p['slug']]
        if not (lat and lon): continue
        x, y = pin_pos(lat, lon)
        if not (0 <= x <= 100 and 0 <= y <= 100): continue
        side = ' smap__pin--left' if x > 72 else ''
        pins += f'<a class="smap__pin{" smap__pin--hub" if is_hub else ""}{side}" style="left:{x}%;top:{y}%" href="/{p["slug"]}" title="Window cleaning in {esc(p["name"])}">{esc(p["name"])}</a>'
    return f'<div class="smap" style="background-image:url(\'/img/map/service-area.jpg\')" role="navigation" aria-label="Map of the areas we serve">{pins}<span class="smap__hint">Tap a pin to open that area. Map: Esri, HERE, Garmin, OpenStreetMap contributors.</span></div>'


REVIEW_COUNT = 214
ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>'
PIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'
SMS = 'sms:+15125180512'

SERVICES = {
  'window-cleaning': ('Window cleaning', '/pricing#windows'),
  'screen-cleaning': ('Screen and track cleaning', '/pricing#screens'),
  'hard-water': ('Hard water spot removal', '/pricing#windows'),
  'house-washing': ('House soft washing', '/pricing#exterior'),
  'roof-cleaning': ('Roof soft washing', '/pricing#exterior'),
  'pressure-washing': ('Driveway and patio pressure washing', '/pricing#flatwork'),
  'gutter-cleaning': ('Gutter cleaning', '/pricing#exterior'),
}
HUB_NAMES = {'lakeway': 'Lakeway', 'lake-travis': 'Lake Travis', 'the-hills': 'The Hills', 'bee-cave': 'Bee Cave', 'spanish-oaks': 'Spanish Oaks',
             'steiner-ranch': 'Steiner Ranch', 'four-points': 'Four Points', 'river-place': 'River Place'}
ORDER = ['lakeway', 'lake-travis', 'the-hills', 'bee-cave', 'spanish-oaks', 'steiner-ranch', 'four-points', 'river-place']
# The map stays clean: the 8 areas plus the neighborhoods people search by name. Everything else is reached by the ZIP and name search.
MAP_PINS = ['window-cleaning-rough-hollow', 'window-cleaning-serene-hills', 'window-cleaning-flintrock-falls', 'window-cleaning-falconhead',
            'window-cleaning-westminster-glen', 'window-cleaning-apache-shores', 'window-cleaning-sweetwater']

pages = {}
for f in sorted(glob.glob(f'{LOC}/*.json')):
    d = json.load(open(f, encoding='utf-8'))
    pages[d['slug']] = d
hubs = {p['slug']: p for p in pages.values() if p.get('kind') == 'hub'}
HUB_BY_KEY = {p['hub']: p for p in hubs.values()}

# ---- photos: real job photos from the hub's own area (EXIF stripped), rotated so pages differ; honest captions
try:
    AREA_PHOTOS = json.load(open(os.path.join(TOOLS, 'area_photos.json')))
except Exception:
    AREA_PHOTOS = []
FALLBACK = [('/photos/pole-stone-home.jpg', 825, 1100, 'CleanzATX crew cleaning upper story windows on a stone home with a water fed pole', 'Pure water pole work, up to three stories from the ground'),
            ('/photos/pole-modern-home.jpg', 825, 1100, 'CleanzATX tech cleaning tall windows on a modern home from the ground with a water fed pole', 'Tall glass cleaned from the ground, no ladders on the house'),
            ('/photos/trucks-estate-driveway.jpg', 1400, 1050, 'Two CleanzATX trucks on the driveway of a Lake Travis area estate', 'Windows and exterior washing on one visit')]
_counter = {}
def month_year(d):
    try: return datetime.date.fromisoformat(d).strftime('%B %Y')
    except Exception: return ''
for p in sorted(pages.values(), key=lambda p: p['slug']):
    if p.get('photo'): continue
    pool = [a for a in AREA_PHOTOS if a['hub'] == p['hub']]
    if pool:
        i = _counter.get(p['hub'], 0); a = pool[i % len(pool)]; _counter[p['hub']] = i + 1
        hn = HUB_NAMES.get(p['hub'], p['hub']); my = month_year(a.get('date', ''))
        p['photo'] = {'src': a['src'], 'w': a['w'], 'h': a['h'], 'alt': f'A home in the {hn} area after a CleanzATX window cleaning visit',
                      'caption': f'A CleanzATX job in the {hn} area' + (f', {my}' if my else '')}
    else:
        i = _counter.get('_fb', 0); f = FALLBACK[i % len(FALLBACK)]; _counter['_fb'] = i + 1
        p['photo'] = {'src': f[0], 'w': f[1], 'h': f[2], 'alt': f[3], 'caption': f[4]}
HERO_BG = {}
for k in HUB_NAMES:
    pool = [a for a in AREA_PHOTOS if a['hub'] == k and a['w'] > a['h']]
    HERO_BG[k] = [a['src'] for a in pool] or ['/img/hero/slide-1-lg.jpg', '/img/hero/slide-2-lg.jpg', '/img/hero/slide-4-lg.jpg']

def esc(t): return html.escape(str(t), quote=False)

def shell(slug, title, desc, body, schemas, og, extra_head='', body_class='subpage loc-page', sms_text=''):
    sch = '\n'.join(f'  <script type="application/ld+json">\n{json.dumps(b, ensure_ascii=False, indent=2)}\n  </script>' for b in schemas)
    sms_href = SMS + ('?&body=' + html.escape(sms_text).replace(' ', '%20') if sms_text else '')
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-QL4RJE3056"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-QL4RJE3056');
    gtag('config', 'AW-11122883575', {{ allow_enhanced_conversions: true }});
  </script>
  <script src="/analytics.js?v=4" defer></script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
  <link rel="canonical" href="https://www.cleanzatx.com/{slug}">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:url" content="https://www.cleanzatx.com/{slug}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://www.cleanzatx.com{og}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="/logo.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css?v={css_ver}" />
{extra_head}{sch}
</head>
<body class="{body_class}">

{header}
{body}

{footer}

  <!-- Sticky phone bar -->
  <div class="mobile-cta-bar">
    <a href="/#quoteWizard" class="mobile-cta-bar__quote">Get My Free Quote</a>
    <a href="{sms_href}" class="mobile-cta-bar__call">Text for a Quote</a>
  </div>

  <script>
    (function () {{
      var burger = document.getElementById('burger'), menu = document.getElementById('mobileMenu');
      if (!burger || !menu) return;
      burger.addEventListener('click', function () {{
        var open = menu.classList.toggle('open');
        burger.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', open);
      }});
    }})();
  </script>
</body>
</html>
'''

def faq_html(items):
    return ''.join(f'        <details class="pfaq">\n          <summary>{esc(q)}</summary>\n          <p>{esc(a)}</p>\n        </details>\n' for q, a in items)

def chip_links(slugs, current=None):
    out = ''
    for s in slugs:
        p = pages.get(s)
        if not p or s == current: continue
        out += f'<a href="/{s}">{PIN}{esc(p["name"])}</a>'
    return f'<div class="loc-grid">{out}</div>'

def quote_card(n):
    return f'''<aside class="loc-card">
            <h2>Get your {n} price by text</h2>
            <p>Tell Tyler the address and what you need. A price and the next open dates come back by text, usually within the hour during business hours.</p>
            <a href="/#quoteWizard" class="prices__btn prices__btn--solid">Get My Free Quote {ARROW}</a>
            <a href="{SMS}" class="prices__btn">Text (512) 518-0512</a>
            <ul class="loc-card__list">
              <li>{CHECK}<span>5.0 stars, 200+ Google reviews</span></li>
              <li>{CHECK}<span>$1M insured, 7 day touch up on every job</span></li>
              <li>{CHECK}<span>Owner answers the phone, not a call center</span></li>
            </ul>
          </aside>'''

def render(d):
    n = esc(d['name']); slug = d['slug']; hub = HUB_BY_KEY.get(d['hub'])
    is_hub = d.get('kind') == 'hub'
    photo = d['photo']
    bgs = HERO_BG.get(d['hub']) or ['/img/hero/slide-1-lg.jpg']
    bg = bgs[sum(map(ord, slug)) % len(bgs)]
    secs = d['sections']
    lat, lon = d.get('lat'), d.get('lon')
    fig = f'<figure class="loc-figure"><img src="{photo["src"]}" alt="{esc(photo["alt"])}" width="{photo["w"]}" height="{photo["h"]}" loading="lazy"><figcaption>{esc(photo.get("caption",""))}</figcaption></figure>'
    streets = ''
    if d.get('streets'):
        streets = '<div class="loc-streets">' + ''.join(f'<span>{esc(s)}</span>' for s in d['streets']) + '</div>'
    minimap = ''
    sec_html = ''
    for i, s in enumerate(secs):
        paras = ''.join(f'<p>{esc(p)}</p>' for p in s['paragraphs'])
        extra = ''
        if i == 0: extra = streets + minimap
        if i == 1: extra = fig
        sec_html += f'      <section><h2>{esc(s["h2"])}</h2>{paras}{extra}</section>\n'
    why = ''.join(f'<li>{CHECK}<span>{esc(w)}</span></li>' for w in d.get('why', []))
    svc = ''.join(f'<a href="{SERVICES[k][1]}">{PIN}{SERVICES[k][0]}</a>' for k in d.get('services', []) if k in SERVICES)
    kids = ''
    if is_hub:
        children = [p for p in pages.values() if p.get('hub') == d['hub'] and p.get('kind') != 'hub']
        children.sort(key=lambda p: (p.get('tier', 'C'), p['name']))
        if children:
            kids = f'''      <section id="neighborhoods"><h2>Neighborhoods in {n} we clean</h2><p>Each has its own page with what the homes there deal with and how we work it.</p>{chip_links([p['slug'] for p in children])}</section>
'''
    faq = [(f['q'], f['a']) for f in d.get('faq', [])]
    crumb_hub = f'<a href="/{hub["slug"]}">{esc(hub["name"])}</a> / ' if hub and not is_hub else ''
    body = f'''  <main class="loc">
    <section class="loc-hero">
      <div class="loc-hero__bg" style="background-image:url('{bg}')"></div>
      <div class="container loc-hero__inner">
        <div>
          <p class="crumbs crumbs--hero"><a href="/">Home</a> / <a href="/areas">Areas</a> / {crumb_hub}{n}</p>
          <p class="loc-hero__eyebrow">Serving {n} · {esc(d['city'])}</p>
          <h1>{esc(d['h1'])} <em>{esc(d.get('h1_em',''))}</em></h1>
          <p class="loc-hero__sub">{esc(d['intro'])}</p>
          <div class="loc-hero__ctas">
            <a href="/#quoteWizard" class="prices__btn prices__btn--solid">Get My Free Quote {ARROW}</a>
            <a href="{SMS}" class="prices__btn">Text (512) 518-0512</a>
          </div>
          <ul class="loc-stats"><li><strong>5.0★</strong><span>200+ Google reviews</span></li><li><strong>3,000+</strong><span>homes cleaned</span></li><li><strong>3 stories</strong><span>from the ground</span></li><li><strong>$1M</strong><span>insured</span></li></ul>
        </div>
        <div>{quote_card(n)}</div>
      </div>
    </section>

    <div class="loc-body">
      <div class="container loc-body__inner">
        <div class="loc-main">
{sec_html}      <section><h2>Why {n} neighbors call CleanzATX</h2><ul class="loc-why">{why}</ul></section>
{kids}      <section class="loc-faq"><h2>{n} questions</h2>
{faq_html(faq)}      </section>
      <section><h2>Nearby</h2>{chip_links(d.get('neighbors', []), slug)}</section>
        </div>
        <div class="loc-aside">
          {quote_card(n).replace('class="loc-card"', 'class="loc-card loc-card--compact"')}
          <div class="loc-aside__box"><h3>What {n} homes book most</h3><div class="loc-grid">{svc}</div><p class="prices__fine" style="margin:12px 0 0">Prices for everything are on the <a href="/pricing">pricing page</a>. Window plans in {n} save 10 to 20 percent on every visit; see <a href="/plans">the plans</a>.</p><p class="prices__fine" style="margin:8px 0 0"><a href="https://www.google.com/maps/search/?api=1&query={html.escape(d['name'] + ', TX').replace(' ', '+')}" target="_blank" rel="noopener">{n} on Google Maps</a></p></div>
        </div>
      </div>
    </div>

    <section class="pg-cta">
      <div class="container">
        <h2>Get your {n} price by text.</h2>
        <p>Tell us about your home and we text back a price and the next open dates, usually within the hour during business hours.</p>
        <a href="/#quoteWizard" class="prices__btn prices__btn--solid pg-cta__btn">Get My Free Quote {ARROW}</a>
      </div>
    </section>
  </main>
'''
    url = f'https://www.cleanzatx.com/{slug}'
    place = {"@type": "Place", "name": f"{d['name']}, TX"}
    if lat and lon: place["geo"] = {"@type": "GeoCoordinates", "latitude": lat, "longitude": lon}
    service = {"@context": "https://schema.org", "@type": "Service", "name": f"Window cleaning in {d['name']}, TX", "serviceType": "Window cleaning, pressure washing and soft washing", "url": url,
               "areaServed": place,
               "provider": {"@type": "HomeAndConstructionBusiness", "name": "CleanzATX", "telephone": "+15125180512", "url": "https://www.cleanzatx.com",
                            "founder": {"@type": "Person", "name": "Tyler Durham"},
                            "address": {"@type": "PostalAddress", "addressLocality": "Lakeway", "addressRegion": "TX", "addressCountry": "US"},
                            "aggregateRating": {"@type": "AggregateRating", "ratingValue": "5.0", "reviewCount": str(REVIEW_COUNT), "bestRating": "5"}},
               "offers": {"@type": "Offer", "priceCurrency": "USD", "price": "10.00", "description": "Exterior window cleaning, per window"}}
    crumbs = [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.cleanzatx.com/"}, {"@type": "ListItem", "position": 2, "name": "Areas", "item": "https://www.cleanzatx.com/areas"}]
    if hub and not is_hub:
        crumbs.append({"@type": "ListItem", "position": 3, "name": hub['name'], "item": f"https://www.cleanzatx.com/{hub['slug']}"})
    crumbs.append({"@type": "ListItem", "position": len(crumbs) + 1, "name": d['name'], "item": url})
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs}
    fq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}
    return shell(slug, d['title'], d['description'], body, [service, bc, fq], photo['src'], sms_text=f"Hi Tyler, I would like a window cleaning quote in {d['name']}.")

built = 0
for d in pages.values():
    out = f'{SITE}/{d["slug"]}'
    os.makedirs(out, exist_ok=True)
    open(f'{out}/index.html', 'w', encoding='utf-8').write(render(d))
    built += 1
print(f'built {built} location pages ({len(hubs)} hubs)')

# ---- map data: pins for the hubs and the named neighborhoods only; every page in the search index with its ZIPs
def zips(p): return sorted(set(re.findall(r'\b78\d{3}\b', p.get('city', ''))))
areas = []
for p in pages.values():
    pinned = p.get('kind') == 'hub' or p['slug'] in MAP_PINS
    rec = {'slug': p['slug'], 'name': p['name'], 'hub': p['hub'], 'kind': p.get('kind', 'neighborhood'), 'zips': zips(p)}
    if pinned and p.get('lat') and p.get('lon'):
        rec['lat'] = p['lat']; rec['lon'] = p['lon']; rec['pin'] = 1
    areas.append(rec)
open(f'{SITE}/map-data.js', 'w').write('window.CZ_AREAS=' + json.dumps(areas, separators=(',', ':'), ensure_ascii=False) + ';\n')
print(f'map-data.js: {sum(1 for a in areas if a.get("pin"))} pins, {len(areas)} searchable places')

# ---- home page areas block: map plus the 8 area links
hub_links = ''.join(f'<a href="/{HUB_BY_KEY[k]["slug"]}" class="hood-areas__a hood-areas__a--hub">{PIN}<span>{esc(HUB_BY_KEY[k]["name"])}</span></a>' for k in ORDER if k in HUB_BY_KEY)
areas_block = f'''<!-- areas:start -->
        {static_map()}
        <nav class="hood-areas hood-areas--home" aria-label="Areas we serve">{hub_links}</nav>
        <p class="areas__sub">Every neighborhood inside the loop of RM 620, Highway 71, Bee Cave Road, Loop 360 and RM 2222, plus the lake side of Lake Travis. <a href="/areas">See all {len(pages) - len(hubs)} neighborhoods</a>, or search your ZIP above.</p>
        <!-- areas:end -->'''
if '<!-- areas:start -->' in home:
    home2 = re.sub(r'<!-- areas:start -->.*?<!-- areas:end -->', lambda m: areas_block, home, flags=re.S)
    if 'map-data.js' not in home2:
        home2 = home2.replace('</body>', f'  <script src="/map-data.js?v={MAP_VER}" defer></script>\n</body>')
    if home2 != home:
        open(f'{SITE}/index.html', 'w', encoding='utf-8').write(home2); print('updated home areas section')

# ---- /areas directory page
dir_sections = ''
for k in ORDER:
    h = HUB_BY_KEY.get(k)
    if not h: continue
    kids = sorted([p for p in pages.values() if p.get('hub') == k and p.get('kind') != 'hub'], key=lambda p: (p.get('tier', 'C'), p['name']))
    dir_sections += f'''      <section class="dir-hub"><h2><a href="/{h["slug"]}">{esc(h["name"])}</a></h2><p>{esc(h["intro"])}</p>{chip_links([p["slug"] for p in kids])}</section>
'''
dir_body = f'''  <main class="loc">
    <section class="loc-hero">
      <div class="loc-hero__bg" style="background-image:url('/img/hero/slide-2-lg.jpg')"></div>
      <div class="container loc-hero__inner">
        <div>
          <p class="crumbs crumbs--hero"><a href="/">Home</a> / Areas</p>
          <p class="loc-hero__eyebrow">Full directory</p>
          <h1>Every neighborhood we clean <em>around Lake Travis.</em></h1>
          <p class="loc-hero__sub">CleanzATX works inside the loop of RM 620, Highway 71, Bee Cave Road, Loop 360 and RM 2222, plus the lake side of Lake Travis. {len(pages) - len(hubs)} neighborhoods across {len(hubs)} areas, each with its own page. Tap a pin, search your ZIP, or pick a name.</p>
          <form class="zip-find zip-find--light" id="zipFind" novalidate>
            <label for="zipInput">Find your neighborhood</label>
            <div class="zip-find__row">
              <input type="text" id="zipInput" placeholder="ZIP code or neighborhood name" autocomplete="postal-code" />
              <button type="submit">Search</button>
            </div>
            <p class="zip-find__msg" id="zipMsg" aria-live="polite"></p>
          </form>
        </div>
        <div>{quote_card('Lake Travis area')}</div>
      </div>
    </section>
    <div class="loc-body">
      <div class="container loc-body__inner">
        <div class="loc-main">
{dir_sections}        </div>
        <div class="loc-aside">{quote_card('Lake Travis area')}</div>
      </div>
    </div>
  </main>
'''
dir_schema = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Areas CleanzATX serves", "url": "https://www.cleanzatx.com/areas",
              "hasPart": [{"@type": "WebPage", "name": p['name'], "url": f"https://www.cleanzatx.com/{p['slug']}"} for p in hubs.values()]}
open(f'{SITE}/areas.html', 'w', encoding='utf-8').write(shell('areas', 'Areas We Serve: Lakeway, Bee Cave, Steiner Ranch, Four Points | CleanzATX',
    f'Every neighborhood CleanzATX cleans around Lake Travis: {len(pages) - len(hubs)} neighborhoods in Lakeway, Bee Cave, The Hills, Spanish Oaks, Steiner Ranch, Four Points and River Place.',
    dir_body, [dir_schema], '/img/hero/slide-2-lg.jpg', extra_head=f'  <script src="/map-data.js?v={MAP_VER}" defer></script>\n  <script src="/zip-find.js?v={MAP_VER}" defer></script>\n'))
print('built areas.html')

# ---- sitemap with honest lastmod from git (falls back to today)
def lastmod(path):
    try:
        out = subprocess.run(['git', '-C', SITE, 'log', '-1', '--format=%cs', '--', path], capture_output=True, text=True).stdout.strip()
        changed = subprocess.run(['git', '-C', SITE, 'status', '--porcelain', '--', path], capture_output=True, text=True).stdout.strip()
        if changed or not out: return datetime.date.today().isoformat()
        return out
    except Exception:
        return datetime.date.today().isoformat()
urls = [('', 'index.html', 'weekly', '1.0'), ('pricing', 'pricing.html', 'monthly', '0.9'), ('plans', 'plans.html', 'monthly', '0.8'), ('areas', 'areas.html', 'weekly', '0.8'),
        ('about', 'about.html', 'monthly', '0.7'), ('gallery', 'gallery.html', 'monthly', '0.7'), ('ai-info', 'ai-info.html', 'monthly', '0.5'),
        ('privacy-policy', 'privacy-policy.html', 'yearly', '0.2'), ('terms-of-service', 'terms-of-service.html', 'yearly', '0.2')]
for d in sorted(pages.values(), key=lambda p: (p.get('kind') != 'hub', p.get('tier', 'C'), p['name'])):
    pr = '0.9' if d.get('kind') == 'hub' else {'A': '0.8', 'B': '0.7'}.get(d.get('tier'), '0.6')
    urls.append((d['slug'], f'{d["slug"]}/index.html', 'monthly', pr))
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u, f, cf, pr in urls:
    sm.append(f'  <url>\n    <loc>https://www.cleanzatx.com/{u}</loc>\n    <lastmod>{lastmod(f)}</lastmod>\n    <changefreq>{cf}</changefreq>\n    <priority>{pr}</priority>\n  </url>')
sm.append('</urlset>\n')
open(f'{SITE}/sitemap.xml', 'w').write('\n'.join(sm))
print(f'sitemap: {len(urls)} urls')

# ---- llms.txt link list
lp = f'{SITE}/llms.txt'
if os.path.exists(lp):
    t = open(lp, encoding='utf-8').read()
    lines = ['## Area pages', '- Directory of every area: https://www.cleanzatx.com/areas']
    for k in ORDER:
        h = HUB_BY_KEY.get(k)
        if not h: continue
        lines.append(f'- {h["name"]}: https://www.cleanzatx.com/{h["slug"]}')
        for p in sorted([p for p in pages.values() if p.get('hub') == k and p.get('kind') != 'hub'], key=lambda p: p['name']):
            lines.append(f'  - {p["name"]}: https://www.cleanzatx.com/{p["slug"]}')
    block = '<!-- areas:start -->\n' + '\n'.join(lines) + '\n<!-- areas:end -->'
    if '<!-- areas:start -->' in t:
        t = re.sub(r'<!-- areas:start -->.*?<!-- areas:end -->', lambda m: block, t, flags=re.S)
        open(lp, 'w', encoding='utf-8').write(t); print('updated llms.txt area list')
