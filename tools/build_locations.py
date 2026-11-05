"""Builds every location page (hubs and neighborhoods) from tools/locations/*.json, plus the
areas section of the home page, sitemap.xml and llms.txt. Every page is unique by construction:
the only shared copy is the stats bar, one plan sentence and the quote block.
Run:  python3 tools/build_locations.py <site dir>   then  python3 tools/polish.py <site dir>"""
import json, os, re, sys, glob, html, subprocess, datetime

SITE = sys.argv[1]
LOC = os.path.join(os.path.dirname(__file__), 'locations')
home = open(f'{SITE}/index.html', encoding='utf-8').read()

def between(a, b, inclusive_end=False):
    i = home.index(a); j = home.index(b, i) + (len(b) if inclusive_end else 0)
    return home[i:j]
header = between('  <!-- ===== PROMO TOPBAR ===== -->', '  <!-- ===== HERO ===== -->')
header = re.sub(r'href="#', 'href="/#', header).replace('src="logo-mark-light.png"', 'src="/logo-mark-light.png"')
footer = between('  <!-- ===== FOOTER ===== -->', '</footer>', inclusive_end=True)
css_ver = re.search(r'styles\.css\?v=(\d+)', home).group(1)

REVIEW_COUNT = 214
ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>'
PIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'

SERVICES = {
  'window-cleaning': ('Window cleaning', '/pricing#windows'),
  'screen-cleaning': ('Screen and track cleaning', '/pricing#screens'),
  'hard-water': ('Hard water spot removal', '/pricing#windows'),
  'house-washing': ('House soft washing', '/pricing#exterior'),
  'roof-cleaning': ('Roof soft washing', '/pricing#exterior'),
  'pressure-washing': ('Driveway and patio pressure washing', '/pricing#flatwork'),
  'gutter-cleaning': ('Gutter cleaning', '/pricing#exterior'),
}

pages = {}
for f in sorted(glob.glob(f'{LOC}/*.json')):
    d = json.load(open(f, encoding='utf-8'))
    pages[d['slug']] = d
hubs = {p['slug']: p for p in pages.values() if p.get('kind') == 'hub'}

# ---- photos: real job photos from the hub's own area (EXIF stripped), rotated so pages differ; honest captions
HUB_NAMES = {'lakeway': 'Lakeway', 'lake-travis': 'Lake Travis', 'the-hills': 'The Hills', 'bee-cave': 'Bee Cave', 'spanish-oaks': 'Spanish Oaks',
             'steiner-ranch': 'Steiner Ranch', 'four-points': 'Four Points', 'river-place': 'River Place'}
try:
    AREA_PHOTOS = json.load(open(os.path.join(os.path.dirname(__file__), 'area_photos.json')))
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
        hn = HUB_NAMES.get(p['hub'], p['hub'])
        my = month_year(a.get('date', ''))
        p['photo'] = {'src': a['src'], 'w': a['w'], 'h': a['h'],
                      'alt': f'A home in the {hn} area after a CleanzATX window cleaning visit',
                      'caption': f'A CleanzATX job in the {hn} area' + (f', {my}' if my else '')}
    else:
        i = _counter.get('_fb', 0); f = FALLBACK[i % len(FALLBACK)]; _counter['_fb'] = i + 1
        p['photo'] = {'src': f[0], 'w': f[1], 'h': f[2], 'alt': f[3], 'caption': f[4]}

HUB_BY_KEY = {p['hub']: p for p in hubs.values()}  # hub key (e.g. 'lakeway') -> hub page

def esc(t): return html.escape(t, quote=False)

def page_html(d, body, schemas):
    slug = d['slug']; title = esc(d['title']); desc = esc(d['description'])
    sch = '\n'.join(f'  <script type="application/ld+json">\n{json.dumps(b, ensure_ascii=False, indent=2)}\n  </script>' for b in schemas)
    og = d.get('photo', {}).get('src', '/img/hero/slide-1-lg.jpg')
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
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="https://www.cleanzatx.com/{slug}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
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
{sch}
</head>
<body class="subpage">

{header}
{body}

{footer}

  <!-- Sticky phone bar -->
  <div class="mobile-cta-bar">
    <a href="/#quoteWizard" class="mobile-cta-bar__quote">Get My Free Quote</a>
    <a href="sms:+15125180512?&body=Hi%20Tyler%2C%20I%20would%20like%20a%20window%20cleaning%20quote%20in%20{html.escape(d['name']).replace(' ', '%20')}." class="mobile-cta-bar__call">Text for a Quote</a>
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

def chips(slugs, current=None):
    out = ''
    for s in slugs:
        p = pages.get(s)
        if not p: continue
        cur = ' hood-areas__a--on" aria-current="page' if s == current else ''
        out += f'<a href="/{s}" class="hood-areas__a{cur}">{PIN}<span>{esc(p["name"])}</span></a>'
    return f'<nav class="hood-areas" aria-label="Nearby areas">{out}</nav>'

def render(d):
    n = esc(d['name']); slug = d['slug']; hub = HUB_BY_KEY.get(d['hub'])
    is_hub = d.get('kind') == 'hub'
    photo = d.get('photo')
    fig = ''
    if photo:
        fig = f'<figure class="hood-photo"><img src="{photo["src"]}" alt="{esc(photo["alt"])}" width="{photo["w"]}" height="{photo["h"]}" loading="lazy"><figcaption>{esc(photo.get("caption",""))}</figcaption></figure>'
    secs = d['sections']
    sec_html = ''
    for i, s in enumerate(secs):
        paras = ''.join(f'<p>{esc(p)}</p>' for p in s['paragraphs'])
        extra = ''
        if i == 0 and d.get('streets'):
            extra = '<p class="hood-streets"><strong>Streets and landmarks:</strong> ' + esc(', '.join(d['streets'])) + '.</p>'
        alt = ' pg-section--alt' if i % 2 else ''
        side = fig if i == 0 else ''
        if side:
            sec_html += f'''    <section class="pg-section{alt}">
      <div class="container pg-two">
        <div class="hood-local"><h2 class="pg-h2">{esc(s['h2'])}</h2>{paras}{extra}</div>
        <div>{side}</div>
      </div>
    </section>
'''
        else:
            sec_html += f'''    <section class="pg-section{alt}">
      <div class="container pg-narrow hood-local"><h2 class="pg-h2">{esc(s['h2'])}</h2>{paras}{extra}</div>
    </section>
'''
    why = ''.join(f'<li>{CHECK}<span>{esc(w)}</span></li>' for w in d.get('why', []))
    svc = ''.join(f'<a href="{SERVICES[k][1]}" class="hood-areas__a">{PIN}<span>{SERVICES[k][0]}</span></a>' for k in d.get('services', []) if k in SERVICES)
    kids = ''
    if is_hub:
        children = [p for p in pages.values() if p.get('hub') == d['hub'] and p.get('kind') != 'hub']
        children.sort(key=lambda p: (p.get('tier', 'C'), p['name']))
        if children:
            kids = f'''    <section class="pg-section pg-section--alt" id="neighborhoods">
      <div class="container">
        <h2 class="pg-h2">Neighborhoods in {n} we clean</h2>
        <p class="pg-lead">Each one has its own page with what the homes there deal with and how we work it.</p>
        {chips([p['slug'] for p in children])}
      </div>
    </section>
'''
    neighbors = chips(d.get('neighbors', []), slug)
    crumb_hub = f'<a href="/{hub["slug"]}">{esc(hub["name"])}</a> / ' if hub and not is_hub else ''
    faq = [(f['q'], f['a']) for f in d.get('faq', [])]
    body = f'''  <main class="pg">
    <section class="pg-hero">
      <div class="container">
        <p class="crumbs crumbs--hero"><a href="/">Home</a> / <a href="/#areas">Areas</a> / {crumb_hub}{n}</p>
        <p class="prices__eyebrow">Serving {n} · {esc(d['city'])}</p>
        <h1 class="pg-hero__title">{esc(d['h1'])} <em>{esc(d.get('h1_em',''))}</em></h1>
        <p class="pg-hero__sub">{esc(d['intro'])}</p>
        <div class="prices__ctas pg-hero__ctas">
          <a href="/#quoteWizard" class="prices__btn prices__btn--solid">Get My Free Quote {ARROW}</a>
          <a href="sms:+15125180512" class="prices__btn">Text (512) 518-0512</a>
        </div>
        <ul class="hood-stats"><li><strong>5.0★</strong><span>200+ Google reviews</span></li><li><strong>3,000+</strong><span>homes cleaned</span></li><li><strong>3 stories</strong><span>from the ground</span></li><li><strong>$1M</strong><span>insured</span></li></ul>
      </div>
    </section>
{sec_html}
    <section class="pg-section">
      <div class="container pg-two">
        <div>
          <h2 class="pg-h2">Why {n} neighbors call CleanzATX</h2>
          <ul class="hood-why">{why}</ul>
          <a href="/#quoteWizard" class="prices__btn prices__btn--solid">Get My Free Quote {ARROW}</a>
        </div>
        <div>
          <h2 class="pg-h2">What {n} homes book most</h2>
          <nav class="hood-areas" aria-label="Services">{svc}</nav>
          <p class="prices__fine">Published prices for everything are on the <a href="/pricing">pricing page</a>. Window plans in {n} save 10 to 20 percent on every visit; see <a href="/plans">the plans</a>.</p>
        </div>
      </div>
    </section>
{kids}
    <section class="pg-section pg-section--alt" id="faq">
      <div class="container pg-narrow">
        <h2 class="pg-h2">{n} questions</h2>
{faq_html(faq)}      </div>
    </section>

    <section class="pg-section">
      <div class="container">
        <h2 class="pg-h2">Nearby</h2>
        {neighbors}
      </div>
    </section>

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
    service = {"@context": "https://schema.org", "@type": "Service", "name": f"Window cleaning in {d['name']}, TX", "serviceType": "Window cleaning, pressure washing and soft washing", "url": url,
               "areaServed": place,
               "provider": {"@type": "HomeAndConstructionBusiness", "name": "CleanzATX", "telephone": "+15125180512", "url": "https://www.cleanzatx.com",
                            "founder": {"@type": "Person", "name": "Tyler Durham"},
                            "address": {"@type": "PostalAddress", "addressLocality": "Lakeway", "addressRegion": "TX", "addressCountry": "US"},
                            "aggregateRating": {"@type": "AggregateRating", "ratingValue": "5.0", "reviewCount": str(REVIEW_COUNT), "bestRating": "5"}},
               "offers": {"@type": "Offer", "priceCurrency": "USD", "price": "10.00", "description": "Exterior window cleaning, per window"}}
    crumbs = [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.cleanzatx.com/"}]
    if hub and not is_hub:
        crumbs.append({"@type": "ListItem", "position": 2, "name": hub['name'], "item": f"https://www.cleanzatx.com/{hub['slug']}"})
    crumbs.append({"@type": "ListItem", "position": len(crumbs) + 1, "name": d['name'], "item": url})
    bc = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": crumbs}
    fq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}
    return page_html(d, body, [service, bc, fq])

built = 0
for d in pages.values():
    out = f'{SITE}/{d["slug"]}'
    os.makedirs(out, exist_ok=True)
    open(f'{out}/index.html', 'w', encoding='utf-8').write(render(d))
    built += 1
print(f'built {built} location pages ({len(hubs)} hubs)')

# ---- home page areas section: hubs plus the A tier neighborhoods
order = ['lakeway', 'lake-travis', 'the-hills', 'bee-cave', 'spanish-oaks', 'steiner-ranch', 'four-points', 'river-place']
hub_links = ''.join(f'<a href="/{HUB_BY_KEY[k]["slug"]}" class="hood-areas__a hood-areas__a--hub">{PIN}<span>{esc(HUB_BY_KEY[k]["name"])}</span></a>' for k in order if k in HUB_BY_KEY)
tierA = sorted([p for p in pages.values() if p.get('kind') != 'hub' and p.get('tier') == 'A'], key=lambda p: p['name'])
a_links = ''.join(f'<a href="/{p["slug"]}" class="hood-areas__a">{PIN}<span>{esc(p["name"])}</span></a>' for p in tierA)
areas_block = f'''<!-- areas:start -->
        <nav class="hood-areas hood-areas--home" aria-label="Areas we serve">{hub_links}</nav>
        <p class="areas__sub">Neighborhood pages: </p>
        <nav class="hood-areas hood-areas--home hood-areas--small" aria-label="Neighborhoods">{a_links}</nav>
        <p class="areas__sub">Every neighborhood inside the loop of RM 620, Highway 71, Bee Cave Road, Loop 360 and RM 2222, plus the lake side of Lake Travis. <a href="/{HUB_BY_KEY["lakeway"]["slug"]}#neighborhoods">See all {len(pages) - len(hubs)} neighborhoods</a>.</p>
        <!-- areas:end -->'''
if '<!-- areas:start -->' in home:
    home2 = re.sub(r'<!-- areas:start -->.*?<!-- areas:end -->', lambda m: areas_block, home, flags=re.S)
    if home2 != home:
        open(f'{SITE}/index.html', 'w', encoding='utf-8').write(home2); print('updated home areas section')

# ---- sitemap with honest lastmod from git (falls back to today)
def lastmod(path):
    try:
        out = subprocess.run(['git', '-C', SITE, 'log', '-1', '--format=%cs', '--', path], capture_output=True, text=True).stdout.strip()
        changed = subprocess.run(['git', '-C', SITE, 'status', '--porcelain', '--', path], capture_output=True, text=True).stdout.strip()
        if changed or not out: return datetime.date.today().isoformat()
        return out
    except Exception:
        return datetime.date.today().isoformat()
urls = [('', 'index.html', 'weekly', '1.0'), ('pricing', 'pricing.html', 'monthly', '0.9'), ('plans', 'plans.html', 'monthly', '0.8'),
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

# ---- llms.txt link list (the rest of llms.txt is hand written above the marker)
lp = f'{SITE}/llms.txt'
if os.path.exists(lp):
    t = open(lp, encoding='utf-8').read()
    lines = ['## Area pages']
    for k in order:
        h = HUB_BY_KEY.get(k)
        if not h: continue
        lines.append(f'- {h["name"]}: https://www.cleanzatx.com/{h["slug"]}')
        for p in sorted([p for p in pages.values() if p.get('hub') == k and p.get('kind') != 'hub'], key=lambda p: p['name']):
            lines.append(f'  - {p["name"]}: https://www.cleanzatx.com/{p["slug"]}')
    block = '<!-- areas:start -->\n' + '\n'.join(lines) + '\n<!-- areas:end -->'
    if '<!-- areas:start -->' in t:
        t = re.sub(r'<!-- areas:start -->.*?<!-- areas:end -->', lambda m: block, t, flags=re.S)
        open(lp, 'w', encoding='utf-8').write(t); print('updated llms.txt area list')
