"""Builds pricing.html and plans.html for cleanzatx-site, reusing the homepage's
topbar, header and footer so every page matches."""
import json, re, sys

SITE = sys.argv[1]

# ---- single source of truth for numbers that appear on many pages (Tyler, Nov 5 2026)
REVIEW_COUNT = 214          # exact Google count, schema only
REVIEWS_COPY = '200+'       # what visible copy says, so it never goes stale
PLANS = [  # key, name, discount, visits per year, short line, perks tier
  ('6month',    'Twice a Year',   10, 2, 'Spring and fall, scheduled for you.',            'basic'),
  ('triannual', 'Triannual',      15, 3, 'Three visits a year, every four months.',       'full'),
  ('quarterly', 'Quarterly',      15, 4, 'Every season, our most popular plan.',          'full'),
  ('bimonthly', 'Every 2 Months', 20, 6, 'Always spotless, our biggest discount.',        'full'),
]
PLAN_PCT = {k: p for k, _, p, _, _, _ in PLANS}
PLANS_SENTENCE = 'Twice a Year (10% off), Triannual (15% off), Quarterly (15% off) or Every 2 Months (20% off)'
RAIN_PLANS = 'Triannual, Quarterly and Every 2 Months'
home = open(f'{SITE}/index.html', encoding='utf-8').read()

def between(a, b, inclusive_end=False):
    i = home.index(a)
    j = home.index(b, i) + (len(b) if inclusive_end else 0)
    return home[i:j]

header = between('  <!-- ===== PROMO TOPBAR ===== -->', '  <!-- ===== HERO ===== -->')
header = re.sub(r'href="#', 'href="/#', header).replace('src="logo-mark-light.png"', 'src="/logo-mark-light.png"')
footer = between('  <!-- ===== FOOTER ===== -->', '</footer>', inclusive_end=True)
css_ver = re.search(r'styles\.css\?v=(\d+)', home).group(1)

ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>'
CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>'

def page(slug, title, desc, schema_blocks, body):
    schemas = '\n'.join(f'  <script type="application/ld+json">\n{json.dumps(b, ensure_ascii=False, indent=2)}\n  </script>' for b in schema_blocks)
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
  <meta property="og:image" content="https://www.cleanzatx.com/img/hero/slide-1-lg.jpg">
  <link rel="icon" type="image/png" href="/logo.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css?v={css_ver}" />
{schemas}
</head>
<body class="subpage">

{header}
{body}

{footer}

  <!-- Sticky phone bar -->
  <div class="mobile-cta-bar">
    <a href="/#quoteWizard" class="mobile-cta-bar__quote">Get My Free Quote</a>
    <a href="tel:5125180512" class="mobile-cta-bar__call">Call / Text</a>
  </div>

  <script>
    // Mobile menu (the homepage's main.js isn't loaded on inner pages)
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
    return ''.join(f'''        <details class="pfaq">
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
''' for q, a in items)

def faq_schema(items):
    strip = lambda t: re.sub(r'<[^>]+>', '', t).replace('&amp;', '&')
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": strip(q), "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in items]}

def li(points):
    return ''.join(f'<li>{CHECK}<span>{p}</span></li>' for p in points)

# ------------------------------------------------------------------ pricing
# Prices from Tyler's pricing sheet (Oct 2026) plus his Nov 2 updates:
# inside & out $15/window, screens $5, track cleaning $5/track.
win_cards = [
    ('Exterior Windows', '$10', '/ window', ['$5 per pane (most windows are 2 panes)', 'Or $0.10 per sq ft of home (3,000 sq ft ≈ $300)', 'Pure-water rinse that dries spot-free', 'Free sill and track dusting on every job', 'Water-fed poles reach up to three stories'], ''),
    ('Inside &amp; Out', '$15', '/ window', ['Every window cleaned on both sides', 'Interior-only cleaning $8 per pane', 'Someone needs to be home for interior work', '100% satisfaction guarantee'], ''),
    ('Screen Cleaning', '$5', '/ screen', ['Full screens $10, solar screens $15', 'Removed, washed and reinstalled', 'Free once a year on Triannual, Quarterly and Every 2 Months plans'], ''),
    ('Track Cleaning', '$5', '/ track', ['Add to any window cleaning', 'Deep track detail $10 per track', 'Basic sill and track dusting always included'], ''),
]
def card(name, price, unit, points, flag):
    fl = f'<span class="price-card__flag">{flag}</span>' if flag else ''
    return f"""        <article class="price-card">{fl}
          <h3>{name}</h3>
          <p class="price-card__price">{price}<span>{unit}</span></p>
          <ul>{li(points)}</ul>
        </article>
"""
examples = [(20, 200, 300), (30, 300, 450), (40, 400, 600), (50, 500, 750)]
ex_rows = ''.join(f'<tr><td>{n} windows</td><td>${ext}</td><td>${io}</td></tr>' for n, ext, io in examples)
def rows(items):
    return ''.join(f'<tr><td>{a}</td><td>{b}</td></tr>' for a, b in items)

window_more = [
    ('Interior-only window cleaning', '$8 per pane'),
    ('Sliding glass doors', '$20 exterior / $10 interior (about 2 windows)'),
    ('Skylights', '$10 each'),
    ('Hard water spot removal', '$10 per pane'),
    ('Post-construction cleaning', '$20 exterior / $10 interior per pane'),
]
screens_tracks = [
    ('Bug screens', '$5 each'),
    ('Full screens', '$10 each'),
    ('Solar screens', '$15 each'),
    ('Track cleaning', '$5 per track'),
    ('Deep track detail', '$10 per track'),
]
house_wash = [
    ('Vinyl and Hardie siding', '$0.22 per sq ft'),
    ('Stucco', '$0.20 per sq ft'),
    ('Brick and limestone', '$0.25 per sq ft'),
    ('Metal siding', '$0.22 per sq ft'),
    ('Painted wood, with scrub', '$0.30+ per sq ft'),
]
roof = [
    ('Asphalt shingle', '$0.25 per sq ft'),
    ('Tile', '$0.30 to $0.35 per sq ft'),
    ('Metal', '$0.35 to $0.50 per sq ft'),
]
gutters = [
    ('One story', '$1.50 per linear ft'),
    ('Two story', '$2.25 per linear ft'),
    ('Three story', '$3.25 per linear ft'),
]
flatwork = [
    ('Concrete driveways, patios &amp; walkways', '$0.18 per sq ft'),
    ('Pavers', '$0.25 per sq ft'),
    ('Wood fence', '$0.22 per sq ft, per side'),
    ('Vinyl fence', '$0.20 per sq ft, per side'),
    ('Outdoor furniture', '$100 flat'),
    ('Oil, rust &amp; gum treatment', '$50 add-on'),
    ('Pergola', '$100 add-on'),
    ('Mailbox', '$50'),
    ('Exterior light fixtures', '$8 to $15 each'),
]
def table(head, items):
    return f'<table class="pg-table"><tr><th>{head}</th><th>Price</th></tr>{rows(items)}</table>'

pricing_faq = [
    ('How much does window cleaning cost in Lakeway and Bee Cave?', 'Exterior window cleaning is $10 per window, or $0.10 per square foot of home (a 3,000 sq ft home runs about $300). Inside and out is $15 per window. The minimum job is $200, and a typical home runs about $350.'),
    ('How much is screen and track cleaning?', 'Bug screens are $5 each, full screens $10 and solar screens $15. Track cleaning is $5 per track, or $10 per track for a deep track detail. Basic sill and track dusting is included with every window cleaning.'),
    ('How much does a house wash cost?', 'Soft washing runs $0.20 per sq ft for stucco, $0.22 for vinyl, Hardie and metal siding, $0.25 for brick and limestone, and $0.30 and up for painted wood that needs scrubbing. House washes have a $400 minimum.'),
    ('How much does roof cleaning cost?', 'Roof soft washing is $0.25 per sq ft for asphalt shingle, $0.30 to $0.35 for tile, and $0.35 to $0.50 for metal, with a $400 minimum. It kills black streaks and algae without high pressure on the roof.'),
    ('How much does gutter cleaning cost?', '$1.50 per linear foot for one-story homes, $2.25 for two-story, and $3.25 for three-story. Gutters can be added to any window or wash visit.'),
    ('How much does driveway or patio power washing cost?', 'Concrete is $0.18 per sq ft and pavers $0.25 per sq ft, with a $250 minimum on flatwork. Wood fences are $0.22 per sq ft per side and vinyl fences $0.20.'),
    ('Is there a minimum charge?', 'Yes. The minimum job is $200. House washes and roof soft washes have a $400 minimum, and driveway and patio flatwork has a $250 minimum.'),
    ('Do you offer any discounts?', 'Military and seniors get 10% off. Clean Windows Club members save 10% to 20% on every visit. Our seasonal sale takes 10% off a first window cleaning with the code shown in the banner at the top of the page, and referring a neighbor earns a $50 account credit when they book.'),
]
offer = lambda name, price, unit: {"@type": "Offer", "itemOffered": {"@type": "Service", "name": name},
    "priceSpecification": {"@type": "UnitPriceSpecification", "price": price, "priceCurrency": "USD", "unitText": unit}}
pricing_schema = {
    "@context": "https://schema.org", "@type": "OfferCatalog", "name": "CleanzATX window cleaning and exterior cleaning prices",
    "url": "https://www.cleanzatx.com/pricing",
    "provider": {"@type": "HomeAndConstructionBusiness", "name": "CleanzATX", "telephone": "+15125180512", "url": "https://www.cleanzatx.com"},
    "itemListElement": [
        offer("Exterior window cleaning", "10.00", "per window"),
        offer("Exterior window cleaning by home size", "0.10", "per square foot of home"),
        offer("Inside and out window cleaning", "15.00", "per window"),
        offer("Interior-only window cleaning", "8.00", "per pane"),
        offer("Skylight cleaning", "10.00", "each"),
        offer("Hard water spot removal", "10.00", "per pane"),
        offer("Bug screen cleaning", "5.00", "per screen"),
        offer("Full screen cleaning", "10.00", "per screen"),
        offer("Solar screen cleaning", "15.00", "per screen"),
        offer("Track cleaning", "5.00", "per track"),
        offer("Deep track detail", "10.00", "per track"),
        offer("House soft wash, stucco", "0.20", "per square foot"),
        offer("House soft wash, vinyl or Hardie siding", "0.22", "per square foot"),
        offer("House soft wash, brick or limestone", "0.25", "per square foot"),
        offer("Roof soft wash, asphalt shingle", "0.25", "per square foot"),
        offer("Gutter cleaning, one story", "1.50", "per linear foot"),
        offer("Gutter cleaning, two story", "2.25", "per linear foot"),
        offer("Gutter cleaning, three story", "3.25", "per linear foot"),
        offer("Concrete power washing", "0.18", "per square foot"),
        offer("Paver power washing", "0.25", "per square foot"),
        offer("Minimum job", "200.00", "per job"),
    ]}

pricing_body = f"""  <main class="pg">
    <section class="pg-hero">
      <div class="container">
        <p class="prices__eyebrow">Published Pricing</p>
        <h1 class="pg-hero__title">Window cleaning pricing <em>for Lakeway &amp; Bee Cave.</em></h1>
        <p class="pg-hero__sub">Every price we charge, published before you ever pick up the phone. No mystery quotes, no surprises at the door.</p>
        <div class="prices__ctas pg-hero__ctas">
          <a href="/#quoteWizard" class="prices__btn prices__btn--solid">Get My Exact Price {ARROW}</a>
          <a href="tel:5125180512" class="prices__btn">Call or Text (512) 518-0512</a>
        </div>
        <nav class="pg-jump" aria-label="Jump to"><a href="#windows">Windows</a><a href="#screens">Screens &amp; tracks</a><a href="#exterior">House &amp; roof</a><a href="#flatwork">Power washing</a><a href="#club">Plans</a></nav>
      </div>
    </section>

    <section class="pg-section" id="windows">
      <div class="container">
        <h2 class="pg-h2">Window cleaning</h2>
        <p class="pg-lead">Our main service. Every exterior clean uses purified RO/DI water that dries spot-free.</p>
        <div class="prices__grid">
{''.join(card(*c) for c in win_cards)}        </div>
        <p class="prices__fine">Minimum job $200 · Typical home about $350</p>
      </div>
    </section>

    <section class="pg-section pg-section--alt">
      <div class="container pg-two">
        <div>
          <h2 class="pg-h2">What most homes pay</h2>
          <p class="pg-lead">Examples at the per-window rate. Pricing by your home's square footage ($0.10 per sq ft) can come in lower.</p>
          <table class="pg-table">
            <tr><th>Home</th><th>Exterior only</th><th>Inside &amp; out</th></tr>
            {ex_rows}
          </table>
        </div>
        <div>
          <h2 class="pg-h2">More glass services</h2>
          <p class="pg-lead">Added to any window cleaning visit.</p>
          {table('Service', window_more)}
        </div>
      </div>
    </section>

    <section class="pg-section" id="screens">
      <div class="container pg-two">
        <div>
          <h2 class="pg-h2">Screens &amp; tracks</h2>
          <p class="pg-lead">Screens are removed, washed and reinstalled. Triannual, Quarterly and Every 2 Months Club members get one free screen cleaning a year.</p>
          {table('Service', screens_tracks)}
        </div>
        <div id="exterior">
          <h2 class="pg-h2">House soft wash</h2>
          <p class="pg-lead">Low-pressure soft washing that's safe for siding, paint and landscaping. $400 minimum.</p>
          {table('Surface', house_wash)}
        </div>
      </div>
    </section>

    <section class="pg-section pg-section--alt">
      <div class="container pg-two">
        <div>
          <h2 class="pg-h2">Roof soft wash</h2>
          <p class="pg-lead">Kills black streaks and algae at the root with no high pressure on the roof. $400 minimum.</p>
          {table('Roof type', roof)}
        </div>
        <div>
          <h2 class="pg-h2">Gutter cleaning</h2>
          <p class="pg-lead">Debris cleared and gutters flushed. Add it to any window or wash visit with no extra trip.</p>
          {table('Home', gutters)}
        </div>
      </div>
    </section>

    <section class="pg-section" id="flatwork">
      <div class="container pg-two">
        <div>
          <h2 class="pg-h2">Driveways, patios &amp; fences</h2>
          <p class="pg-lead">Power washed with an 8 GPM truck-mounted machine. $250 minimum on flatwork.</p>
          {table('Service', flatwork)}
        </div>
        <div>
          <h2 class="pg-h2">Discounts &amp; offers</h2>
          <p class="pg-lead">Ways to save on your cleaning.</p>
          <table class="pg-table">
            <tr><th>Offer</th><th>Savings</th></tr>
            <tr><td>Clean Windows Club</td><td>10 to 20% off every visit</td></tr>
            <tr><td>Military &amp; seniors</td><td>10% off</td></tr>
            <tr><td>Seasonal sale (code in the top banner)</td><td>10% off a first window cleaning</td></tr>
            <tr><td>Club plans</td><td>Touch-ups, hard water removal and more. <a href="/plans">See plans</a></td></tr>
            <tr><td>Refer a neighbor</td><td>$50 account credit when they book</td></tr>
          </table>
        </div>
      </div>
    </section>

    <section class="pg-section pg-section--alt" id="club">
      <div class="container">
        <h2 class="pg-h2">Book once, or put it on autopilot</h2>
        <div class="plan-compare">
          <article class="plan-col"><h3>One-time</h3><p class="plan-col__big">Regular price</p><p>Book whenever you want. No commitment.</p></article>
          <article class="plan-col"><h3>Twice a year</h3><p class="plan-col__big">10% off</p><p>Spring and fall, scheduled for you.</p></article>
          <article class="plan-col"><h3>Triannual</h3><p class="plan-col__big">15% off</p><p>Three visits a year, with every perk.</p></article>
          <article class="plan-col plan-col--pop"><span class="price-card__flag">Most popular</span><h3>Quarterly</h3><p class="plan-col__big">15% off</p><p>Four visits a year, every season covered.</p></article>
          <article class="plan-col"><h3>Every 2 months</h3><p class="plan-col__big">20% off</p><p>Always spotless, our biggest discount.</p></article>
        </div>
        <div class="prices__ctas"><a href="/plans" class="prices__btn">See All Club Plans {ARROW}</a></div>
      </div>
    </section>

    <section class="pg-section">
      <div class="container pg-narrow">
        <h2 class="pg-h2">Pricing questions</h2>
{faq_html(pricing_faq)}      </div>
    </section>

    <section class="pg-cta">
      <div class="container">
        <h2>Get your exact price by text.</h2>
        <p>Prices are starting rates for standard conditions; we confirm your exact price after a quick look at your home. Tell us about it and we'll text your price and next open dates, usually within the hour.</p>
        <a href="/#quoteWizard" class="prices__btn prices__btn--solid pg-cta__btn">Get My Free Quote {ARROW}</a>
      </div>
    </section>
  </main>
"""
open(f'{SITE}/pricing.html', 'w', encoding='utf-8').write(page(
    'pricing', 'Window Cleaning Prices in Lakeway &amp; Bee Cave | CleanzATX',
    'Published prices: windows $10 each, inside and out $15, screens $5, house soft wash from $0.20 per sq ft, roof, gutters and power washing. Plans save 10 to 20%.',
    [pricing_schema, faq_schema(pricing_faq)], pricing_body))

# ------------------------------------------------------------------ plans
# Plan perks from Tyler (Nov 2): yearly gets nothing; twice a year gets the
# discount and 7-day touch-ups; quarterly and every 2 months add a free yearly
# screen cleaning, hard water on up to 5 windows and the 7-day rain guarantee
# (rain guarantee moved to Quarterly and up on Nov 2). Track dusting comes with every job.
FULL_PERKS = ['Free screen cleaning once a year', 'Hard water removal on up to 5 windows every visit', '7-day rain guarantee', '7-day touch-up guarantee', 'Free sill and track dusting']
plans = [
    ('Twice a Year', '10%', 'Spring &amp; fall', ['10% off every visit', '7-day touch-up guarantee', 'Visits scheduled for you', 'Free sill and track dusting'], '', '6month'),
    ('Triannual', '15%', 'Every 4 months', ['15% off every visit', 'Three visits a year'] + FULL_PERKS, '', 'triannual'),
    ('Quarterly', '15%', 'Every season', ['15% off every visit'] + FULL_PERKS, 'Most popular', 'quarterly'),
    ('Every 2 Months', '20%', 'Always spotless', ['20% off every visit'] + FULL_PERKS, '', 'bimonthly'),
]
def plan_card(name, pct, sub, points, flag, key):
    fl = f'<span class="price-card__flag">{flag}</span>' if flag else ''
    unit = 'off every visit' if pct.endswith('%') else 'pricing'
    href = f'/?plan={key}#quoteWizard' if key else '/#quoteWizard'
    label = f'Start {name}' if key else 'Get a Quote'
    return f'''        <article class="price-card plan-card">{fl}
          <h3>{name}</h3>
          <p class="plan-card__sub">{sub}</p>
          <p class="price-card__price">{pct}<span>{unit}</span></p>
          <ul>{li(points)}</ul>
          <a href="{href}" class="prices__btn prices__btn--solid plan-card__btn">{label} {ARROW}</a>
        </article>
'''
YES, NO = '<span class="pk pk--yes" aria-label="Included">✓</span>', '<span class="pk pk--no" aria-label="Not included">✕</span>'
perks = [
    ('Discount on every visit', 'None', '10%', '15%', '15%', '20%'),
    ('7-day touch-up guarantee', YES, YES, YES, YES, YES),
    ('Free screen cleaning once a year', NO, NO, YES, YES, YES),
    ('Hard water removal, up to 5 windows every visit', NO, NO, YES, YES, YES),
    ('Free track dusting', YES, YES, YES, YES, YES),
    ('7-day rain guarantee', NO, NO, YES, YES, YES),
]
perk_rows = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in perks)
sav = [('Twice a year', 2, .10), ('Triannual', 3, .15), ('Quarterly', 4, .15), ('Every 2 months', 6, .20)]
sav_rows = ''.join(f'<tr><td>{n}</td><td>{v} visits</td><td>${350*p:.2f}</td><td>${350*p*v:,.2f}</td></tr>' for n, v, p in sav)
plans_faq = [
    ('What is the Clean Windows Club?', 'Our recurring window cleaning plans. Choose twice a year, three times a year, quarterly, or every two months. We schedule every visit for you, text a reminder before we arrive, and take 10%, 15% or 20% off every visit, plus the perks that come with your plan.'),
    ('What comes with each plan?', 'Twice a year: 10% off every visit and our 7-day touch-up guarantee. Triannual, quarterly and every two months: 15%, 15% or 20% off every visit, one free screen cleaning a year, hard water spot removal on up to 5 windows every visit, the 7-day rain guarantee and the 7-day touch-up guarantee. Every cleaning, plan or not, includes free sill and track dusting.'),
    ('What is the Triannual plan?', 'Three window cleanings a year, about every four months, at 15% off every visit. It comes with every perk the Quarterly plan has: the yearly screen cleaning, hard water removal on up to 5 windows, the 7-day rain guarantee and the 7-day touch-up guarantee.'),
    ('What is the 7-day touch-up guarantee?', 'If you notice a streak or a spot we missed within 7 days of your cleaning, text us and we come back and touch it up for free.'),
    ('What is the 7-day rain guarantee?', 'It comes with the Triannual, Quarterly and Every 2 Months plans: if rain affects your results within 7 days of a visit, we come back and re-clean for free.'),
    ('Is there a discount for once-a-year cleanings?', 'No. Once-a-year and one-time cleanings are billed at our regular published prices. They still include free sill and track dusting and our 100% satisfaction guarantee.'),
    ('How do I join?', 'Pick a plan on this page or choose your frequency in the quote form. We text your price and first open dates, usually within the hour.'),
]
# What one exterior visit costs on each plan, by home size ($10 per window)
cost_rows = ''.join(
    f'<tr><td>{n} <span class="th-full">windows</span><span class="th-short">win.</span></td><td>${n*10:,}</td><td>${n*10*.90:,.0f}</td><td>${n*10*.85:,.0f}</td><td>${n*10*.85:,.0f}</td><td>${n*10*.80:,.0f}</td></tr>'
    for n in (20, 30, 40, 50))
included = [
    ('Pure-water rinse that dries spot-free', 'Every visit'),
    ('Sill and track dusting', 'Free'),
    ('100% satisfaction guarantee', 'Included'),
    ('Text reminder before we arrive', 'Included'),
    ('$1M insured crew', 'Included'),
]
perk_explain = [
    ('7-day touch-up guarantee', 'See a streak or missed spot within 7 days? Text us and we come back free.'),
    ('Free screen cleaning', 'Once a year, on Triannual, Quarterly and Every 2 Months plans.'),
    ('Hard water removal', 'Spot treatment on up to 5 windows at every visit, on Triannual, Quarterly and Every 2 Months plans.'),
    ('7-day rain guarantee', 'Rain spots your windows within 7 days of a visit? We re-clean free. Triannual, Quarterly and Every 2 Months plans.'),
    ('Member discount', '10%, 15% or 20% off every window cleaning visit, locked in for your plan.'),
]
plans_body = f'''  <main class="pg">
    <section class="pg-hero">
      <div class="container">
        <p class="prices__eyebrow">The Clean Windows Club</p>
        <h1 class="pg-hero__title">Window cleaning plans <em>for Lakeway &amp; Bee Cave.</em></h1>
        <p class="pg-hero__sub">Pick how often you want us back: twice a year, three times a year, quarterly or every two months. We lock in your member discount, schedule every visit for you, and add perks one-time customers don't get.</p>
        <div class="prices__ctas pg-hero__ctas">
          <a href="/?plan=quarterly#quoteWizard" class="prices__btn prices__btn--solid">Start My Plan {ARROW}</a>
          <a href="tel:5125180512" class="prices__btn">Call or Text (512) 518-0512</a>
        </div>
        <nav class="pg-jump" aria-label="Jump to"><a href="#plans">Plans</a><a href="#cost">What you pay</a><a href="#compare">Compare</a><a href="#perks">Perks</a><a href="#faq">Questions</a></nav>
      </div>
    </section>

    <section class="pg-section" id="plans">
      <div class="container">
        <h2 class="pg-h2">Pick your plan</h2>
        <p class="pg-lead">The more often we come, the more you save on every visit.</p>
        <div class="prices__grid">
{''.join(plan_card(*p) for p in plans)}        </div>
        <p class="prices__fine">Plan discounts apply to window cleaning visits · Minimum job $200 · See <a href="/pricing">full pricing</a></p>
      </div>
    </section>

    <section class="pg-section pg-section--alt" id="cost">
      <div class="container">
        <h2 class="pg-h2">What a visit costs on each plan</h2>
        <p class="pg-lead">Exterior window cleaning at $10 per window, before add-ons. Your plan discount comes off every visit.</p>
        <div class="pg-table-wrap">
        <table class="pg-table pg-table--perks">
          <tr><th>Home</th><th><span class="th-full">Regular</span><span class="th-short">Reg.</span></th><th><span class="th-full">Twice a year</span><span class="th-short">2x/yr</span></th><th><span class="th-full">Triannual</span><span class="th-short">3x/yr</span></th><th><span class="th-full">Quarterly</span><span class="th-short">4x/yr</span></th><th><span class="th-full">Every 2 months</span><span class="th-short">6x/yr</span></th></tr>
          {cost_rows}
        </table>
        </div>
      </div>
    </section>

    <section class="pg-section">
      <div class="container pg-two">
        <div>
          <h2 class="pg-h2">What members save</h2>
          <p class="pg-lead">On a typical $350 home.</p>
          <table class="pg-table">
            <tr><th>Plan</th><th>Per visit</th><th>Per year</th></tr>
            {''.join(f'<tr><td>{n} ({v} visits)</td><td>${350*p:.2f}</td><td>${350*p*v:,.2f}</td></tr>' for n, v, p in sav)}
          </table>
        </div>
        <div>
          <h2 class="pg-h2">Included with every cleaning</h2>
          <p class="pg-lead">Plan or not, every visit comes with these.</p>
          {table('What you get', included).replace('<th>Price</th>', '<th></th>')}
        </div>
      </div>
    </section>

    <section class="pg-section pg-section--alt" id="compare">
      <div class="container">
        <h2 class="pg-h2">Compare plans</h2>
        <p class="pg-lead">Triannual, Quarterly and Every 2 Months get every perk.</p>
        <div class="pg-table-wrap">
        <table class="pg-table pg-table--perks">
          <tr><th>What you get</th><th><span class="th-full">One time</span><span class="th-short">1x</span></th><th><span class="th-full">Twice a year</span><span class="th-short">2x/yr</span></th><th><span class="th-full">Triannual</span><span class="th-short">3x/yr</span></th><th><span class="th-full">Quarterly</span><span class="th-short">4x/yr</span></th><th><span class="th-full">Every 2 months</span><span class="th-short">6x/yr</span></th></tr>
          {perk_rows}
        </table>
        </div>
        <div class="prices__ctas"><a href="/?plan=quarterly#quoteWizard" class="prices__btn prices__btn--solid">Start Quarterly {ARROW}</a><a href="/?plan=bimonthly#quoteWizard" class="prices__btn">Start Every 2 Months {ARROW}</a></div>
      </div>
    </section>

    <section class="pg-section" id="perks">
      <div class="container pg-two">
        <div>
          <h2 class="pg-h2">Plan perks, explained</h2>
          <p class="pg-lead">What you get on top of the discount.</p>
          {table('Perk', perk_explain).replace('<th>Price</th>', '<th>How it works</th>')}
        </div>
        <div>
          <h2 class="pg-h2">How the Club works</h2>
          <p class="pg-lead">Set it once and we handle the rest.</p>
          <table class="pg-table pg-table--steps">
            <tr><th>Step</th><th></th></tr>
            <tr><td>01 · Pick your plan</td><td>Twice a year, three times a year, quarterly, or every two months.</td></tr>
            <tr><td>02 · We schedule it</td><td>Every visit goes on the calendar, with a text reminder before we arrive.</td></tr>
            <tr><td>03 · You save every visit</td><td>Your discount and perks apply automatically.</td></tr>
          </table>
        </div>
      </div>
    </section>

    <section class="pg-section pg-section--alt" id="faq">
      <div class="container pg-narrow">
        <h2 class="pg-h2">Plan questions</h2>
{faq_html(plans_faq)}      </div>
    </section>

    <section class="pg-cta">
      <div class="container">
        <h2>Lock in your member price.</h2>
        <p>Choose your plan in the quote form and we'll text your price and first open dates, usually within the hour.</p>
        <a href="/?plan=quarterly#quoteWizard" class="prices__btn prices__btn--solid pg-cta__btn">Start My Plan {ARROW}</a>
      </div>
    </section>
  </main>
'''
open(f'{SITE}/plans.html', 'w', encoding='utf-8').write(page(
    'plans', 'Window Cleaning Plans, 10 to 20% Off Every Visit | CleanzATX',
    'Window cleaning plans for Lakeway and Bee Cave: 10% off twice a year, 15% off triannual or quarterly, 20% off every two months, with free screens yearly.',
    [faq_schema(plans_faq)], plans_body))
print('built pricing.html and plans.html')

# ------------------------------------------------------------------ areas (pages come from build_locations.py)
import os, glob as _glob
PIN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'
_LOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'locations')
_hubs = [json.load(open(f, encoding='utf-8')) for f in sorted(_glob.glob(f'{_LOC}/*.json'))]
_hubs = [h for h in _hubs if h.get('kind') == 'hub']
_order = ['lakeway', 'lake-travis', 'the-hills', 'bee-cave', 'spanish-oaks', 'steiner-ranch', 'four-points', 'river-place']
_hubs.sort(key=lambda h: _order.index(h['hub']) if h['hub'] in _order else 99)
def area_grid(current=None):
    out = ''.join(f'<a href="/{h["slug"]}" class="hood-areas__a">{PIN}<span>{h["name"]}</span></a>' for h in _hubs)
    return f'<nav class="hood-areas" aria-label="Areas we serve">{out}</nav>'


# ------------------------------------------------------------------ about / our story
# From what Tyler has shared: Lakeway local, Lake Travis High School class of 2021,
# started in 2020, grew through local groups, realtors and Nextdoor, a couple hundred
# saves and recommendations in the first few years, Nextdoor Neighborhood Favorite
# 2023-2025, 116 Nextdoor recommendations, 210 Google reviews, 3,000+ homes.
story = [
    ('2020', 'It started with a post', 'I started CleanzATX in Lakeway in 2020. No ads, no call center, just me posting in local neighborhood groups, showing up when I said I would and doing the job right.'),
    ('Early on', 'Realtors and neighbors', 'Local realtors started calling us to get homes ready for listing photos, and the neighbors who saw the results started calling too. One clean driveway or set of windows turned into the next three on the street.'),
    ('The first few years', 'Word of mouth on Nextdoor', 'Neighbors kept recommending us on Nextdoor. Within the first few years we had a couple hundred saves and recommendations, almost all from people we had worked for.'),
    ('2023 to 2025', 'Neighborhood Favorite, three years running', 'Nextdoor named us a Neighborhood Favorite in 2023, 2024 and 2025. Today we have 116 Nextdoor recommendations and more than 200 five star Google reviews.'),
    ('Today', 'The company neighbors call', 'We&#x27;ve cleaned 3,000+ homes and are one of the companies Lakeway and Bee Cave neighbors depend on. It&#x27;s still locally owned and run by me.'),
]
story_rows = ''.join(f'<li class="story-step"><span class="story-step__when">{w}</span><h3>{t}</h3><p>{p}</p></li>' for w, t, p in story)
values = [
    ('We show up when we say we will', 'Fast replies by text, a price before we come out, and reminders before every visit.'),
    ('We do it safely', 'Water fed poles reach up to three stories from the ground. No ladders against your home, nobody on your roof.'),
    ('We use the right gear', 'Every truck carries a pure water RO/DI system and commercial gear, so your windows dry spot free.'),
    ('We stand behind it', 'If anything is missed or streaked, we come back and fix it. $1M insured on every job.'),
]
value_rows = ''.join(f'<li>{CHECK}<div><strong>{t}</strong><span>{p}</span></div></li>' for t, p in values)
about_body = f'''  <main class="pg">
    <section class="pg-hero story-hero">
      <div class="container story-hero__inner">
        <div>
          <p class="prices__eyebrow">Our Story</p>
          <h1 class="pg-hero__title">Started in Lakeway. <em>Still run by a neighbor.</em></h1>
          <p class="pg-hero__sub">I&#x27;m Tyler, a Lakeway local and Lake Travis High School grad (class of 2021). I started CleanzATX in 2020 because neighbors were tired of contractors who didn&#x27;t show up or call back.</p>
        </div>
        <div>
          <figure class="story-hero__photo"><img src="/photos/tyler-selfie.jpg" alt="Tyler, owner of CleanzATX, holding a water fed pole next to his wrapped work truck" width="1200" height="900"></figure>
          <div class="prices__ctas pg-hero__ctas story-hero__ctas">
            <a href="/#quoteWizard" class="prices__btn prices__btn--solid">Get My Free Quote {ARROW}</a>
            <a href="tel:5125180512" class="prices__btn">Call or Text (512) 518-0512</a>
          </div>
        </div>
      </div>
    </section>

    <section class="pg-section">
      <div class="container pg-narrow">
        <h2 class="pg-h2">How we got here</h2>
        <p class="pg-lead">With 8 years of pressure washing and 6 years of window cleaning behind me, here&#x27;s how one truck in Lakeway became the company neighbors call.</p>
        <ol class="story-steps">{story_rows}</ol>
      </div>
    </section>

    <section class="pg-section pg-section--tight">
      <div class="container">
        <div class="story-photos">
          <figure><img src="/photos/tyler-truck-sm.jpg" alt="Tyler sitting on his wrapped CleanzATX truck in front of the Austin skyline" width="1200" height="882" loading="lazy"><figcaption>Tyler and the truck, downtown Austin</figcaption></figure>
          <figure><img src="/photos/trucks-estate-driveway.jpg" alt="Two CleanzATX trucks on the driveway of a Lake Travis area estate" width="1400" height="1050" loading="lazy"><figcaption>Two trucks today: windows and power washing in one visit</figcaption></figure>
          <figure><img src="/photos/pole-stone-balcony.jpg" alt="CleanzATX tech cleaning third story windows on a stone home with a water fed pole" width="825" height="1100" loading="lazy"><figcaption>Third story glass, cleaned from the ground</figcaption></figure>
        </div>
      </div>
    </section>

    <section class="pg-section pg-section--alt" id="nextdoor">
      <div class="container pg-two">
        <div>
          <h2 class="pg-h2">Built on Nextdoor</h2>
          <p class="pg-lead">Most of our customers found us the same way: a neighbor recommended us. That&#x27;s still how we grow.</p>
          <ul class="story-nums"><li><strong>116</strong><span>Nextdoor recommendations</span></li><li><strong>3x</strong><span>Neighborhood Favorite, 2023 to 2025</span></li><li><strong>200+</strong><span>five star Google reviews</span></li><li><strong>3,000+</strong><span>homes cleaned</span></li></ul>
          <div class="prices__ctas story-links"><a href="https://nextdoor.com/page/cleanz-atx-lakeway-tx" class="prices__btn" target="_blank" rel="noopener">See us on Nextdoor {ARROW}</a></div>
        </div>
        <div>
          <h2 class="pg-h2">How we work</h2>
          <ul class="story-values">{value_rows}</ul>
        </div>
      </div>
    </section>

    <section class="pg-section">
      <div class="container">
        <h2 class="pg-h2">Where we work</h2>
        <p class="pg-lead">Based in Lakeway and cleaning homes across the Lake Travis area and West Austin.</p>
        {area_grid()}
      </div>
    </section>

    <section class="pg-cta">
      <div class="container">
        <h2>Let&#x27;s get your windows done.</h2>
        <p>Tell us about your home and we&#x27;ll text your price and next open dates, usually within the hour.</p>
        <a href="/#quoteWizard" class="prices__btn prices__btn--solid pg-cta__btn">Get My Free Quote {ARROW}</a>
      </div>
    </section>
  </main>
'''
about_schema = {"@context": "https://schema.org", "@type": "AboutPage", "url": "https://www.cleanzatx.com/about", "name": "About CleanzATX",
    "mainEntity": {"@type": "HomeAndConstructionBusiness", "name": "CleanzATX", "foundingDate": "2020", "url": "https://www.cleanzatx.com", "telephone": "+15125180512",
        "founder": {"@type": "Person", "name": "Tyler Durham"},
        "address": {"@type": "PostalAddress", "addressLocality": "Lakeway", "addressRegion": "TX", "addressCountry": "US"},
        "sameAs": ["https://nextdoor.com/page/cleanz-atx-lakeway-tx", "https://www.facebook.com/p/cleanzatx-100067454648100/", "https://www.instagram.com/cleanzatx/", "https://www.yelp.com/biz/cleanzatx-austin"]}}
open(f'{SITE}/about.html', 'w', encoding='utf-8').write(page(
    'about', 'About Us | Our Story | CleanzATX Window Cleaning, Lakeway TX',
    'CleanzATX was started in Lakeway in 2020 by Tyler Durham, a Lake Travis High School grad. Nextdoor Neighborhood Favorite 2023 to 2025. 200+ five star reviews.',
    [about_schema], about_body))
print('built about.html')

# ------------------------------------------------------------------ gallery (Nov 2)
# Drag-to-compare gallery. Before/after pairs were split from the composites and lined up
# (scratchpad tools/ba_align2.py -> gallery/ba/*.jpg, gallery/ba/alignment.json). Pairs shot from
# the same spot get a slider; pairs shot from different angles are shown side by side instead.
# The previous design is kept at /gallery-old (captions are read from it).
gal = open(f'{SITE}/gallery-old.html', encoding='utf-8').read()
ALIGN = json.load(open(f'{SITE}/gallery/ba/alignment.json'))
CAT_NAMES = {'windows': 'Windows', 'stone': 'Stone &amp; Exterior', 'driveways': 'Driveways', 'patios': 'Patios &amp; Decks', 'roofs': 'Roofs', 'screens': 'Screens'}
gitems = re.findall(r'<div class="gpage-card" data-cat="([a-z]+)" data-title="([^"]*)" data-sub="([^"]*)">\s*<img src="/gallery/([^"]+)" alt="([^"]*)"', gal)
def ba_size(base):
    w, h = map(int, ALIGN[base]['size'].split('x')); return w, h
def ba_tile(cat, title, sub, img, alt):
    base = img[:-4]; w, h = ba_size(base); shape = 'tall' if h > w else 'wide'
    cap = f'<figcaption><strong>{title}</strong><span>{sub}</span><em>{CAT_NAMES.get(cat, cat)}</em></figcaption>'
    if ALIGN[base]['method'] == 'resize':
        return f"""        <figure class="gt-card" data-cat="{cat}">
          <div class="gt-two gt-two--{shape}">
            <div><img src="/gallery/ba/{base}-before.jpg" alt="{alt}, before" width="{w}" height="{h}" loading="lazy"><span class="gt-ba__tag gt-ba__tag--before">Before</span></div>
            <div><img src="/gallery/ba/{base}-after.jpg" alt="{alt}, after" width="{w}" height="{h}" loading="lazy"><span class="gt-ba__tag gt-ba__tag--after">After</span></div>
          </div>
          {cap}
        </figure>
"""
    return f"""        <figure class="gt-card" data-cat="{cat}">
          <div class="gt-ba gt-ba--{shape}" role="slider" tabindex="0" aria-label="{title}: drag to compare before and after" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
            <img class="gt-ba__after" src="/gallery/ba/{base}-after.jpg" alt="{alt}, after" width="{w}" height="{h}" loading="lazy" draggable="false">
            <img class="gt-ba__before" src="/gallery/ba/{base}-before.jpg" alt="" width="{w}" height="{h}" loading="lazy" draggable="false">
            <span class="gt-ba__tag gt-ba__tag--before">Before</span><span class="gt-ba__tag gt-ba__tag--after">After</span>
            <span class="gt-ba__handle" aria-hidden="true"><span>‹ ›</span></span>
          </div>
          {cap}
        </figure>
"""
# sliders first, then the side by side pairs, keeping the original order within each
gitems.sort(key=lambda g: ALIGN[g[3][:-4]]['method'] == 'resize')
counts = {}
for c, *_ in gitems: counts[c] = counts.get(c, 0) + 1
chips = f'<button type="button" class="gt-chip is-on" data-filter="all">All <span>{len(gitems)}</span></button>' + ''.join(
    f'<button type="button" class="gt-chip" data-filter="{c}">{n} <span>{counts[c]}</span></button>' for c, n in CAT_NAMES.items() if c in counts)
gallery_body = f'''  <main class="pg">
    <section class="pg-hero">
      <div class="container">
        <p class="prices__eyebrow">Our Work</p>
        <h1 class="pg-hero__title">Before &amp; after, <em>from real homes.</em></h1>
        <p class="pg-hero__sub">Drag the slider to compare. Every photo is from a real CleanzATX job around Lakeway, Bee Cave and Lake Travis.</p>
        <div class="prices__ctas pg-hero__ctas">
          <a href="/#quoteWizard" class="prices__btn prices__btn--solid">Get My Free Quote {ARROW}</a>
          <a href="tel:5125180512" class="prices__btn">Call or Text (512) 518-0512</a>
        </div>
      </div>
    </section>
    <div class="gt-filters"><div class="container gt-filters__row" role="group" aria-label="Filter photos">{chips}</div></div>
    <section class="pg-section gt-section">
      <div class="container">
        <div class="gt-grid" id="gtGrid">
{''.join(ba_tile(*g) for g in gitems)}        </div>
      </div>
    </section>
    <section class="pg-cta">
      <div class="container">
        <h2>Want results like these?</h2>
        <p>Tell us about your home and we&#x27;ll text your price and next open dates, usually within the hour.</p>
        <a href="/#quoteWizard" class="prices__btn prices__btn--solid pg-cta__btn">Get My Free Quote {ARROW}</a>
      </div>
    </section>
  </main>
  <script>
    (function () {{
      // Filter chips
      var cards = [].slice.call(document.querySelectorAll('.gt-card'));
      [].forEach.call(document.querySelectorAll('.gt-chip'), function (chip) {{
        chip.addEventListener('click', function () {{
          [].forEach.call(document.querySelectorAll('.gt-chip'), function (c) {{ c.classList.toggle('is-on', c === chip); }});
          var f = chip.dataset.filter;
          cards.forEach(function (c) {{ c.hidden = !(f === 'all' || c.dataset.cat === f); }});
        }});
      }});
      // Before/after sliders: drag sideways (the page still scrolls up and down)
      function set(ba, pct) {{
        pct = Math.max(0, Math.min(100, pct));
        ba.style.setProperty('--pos', pct + '%');
        ba.setAttribute('aria-valuenow', Math.round(pct));
      }}
      [].forEach.call(document.querySelectorAll('.gt-ba'), function (ba) {{
        var down = false, used = false;
        function at(e) {{ var r = ba.getBoundingClientRect(); set(ba, (e.clientX - r.left) / r.width * 100); }}
        ba.addEventListener('pointerdown', function (e) {{ down = true; ba.classList.add('is-moving'); try {{ ba.setPointerCapture(e.pointerId); }} catch (_) {{}} at(e); }});
        ba.addEventListener('pointermove', function (e) {{ if (down) at(e); }});
        function up() {{
          if (!down) return; down = false; ba.classList.remove('is-moving');
          if (!used && typeof gtag === 'function') gtag('event', 'gallery_compare', {{ photo_name: ba.getAttribute('aria-label') }});
          used = true;
        }}
        ba.addEventListener('pointerup', up); ba.addEventListener('pointercancel', up);
        ba.addEventListener('keydown', function (e) {{
          var now = parseFloat(ba.getAttribute('aria-valuenow'));
          if (e.key === 'ArrowLeft') {{ set(ba, now - 5); e.preventDefault(); }}
          if (e.key === 'ArrowRight') {{ set(ba, now + 5); e.preventDefault(); }}
        }});
      }});
      // Nudge each slider once when it first shows up, so people see it moves
      if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {{
        var io = new IntersectionObserver(function (es) {{
          es.forEach(function (en) {{
            if (!en.isIntersecting) return;
            io.unobserve(en.target);
            var ba = en.target, t0 = null;
            function step(t) {{
              if (ba.classList.contains('is-moving')) return;
              if (t0 === null) t0 = t;
              var k = (t - t0) / 1400;
              if (k >= 1) {{ set(ba, 50); return; }}
              set(ba, 50 + Math.sin(k * Math.PI * 2) * 18);
              requestAnimationFrame(step);
            }}
            setTimeout(function () {{ requestAnimationFrame(step); }}, 250);
          }});
        }}, {{ threshold: 0.6 }});
        [].forEach.call(document.querySelectorAll('.gt-ba'), function (ba) {{ io.observe(ba); }});
      }}
    }})();
  </script>
'''
gt = page('gallery', 'Before &amp; After Photo Gallery | CleanzATX Window &amp; Exterior Cleaning',
          'Drag to compare real before and after photos from CleanzATX window cleaning, stone, driveway, patio and roof cleaning jobs in Lakeway, Bee Cave and Lake Travis.',
          [], gallery_body)
gt = gt.replace('<body class="subpage">', '<body class="subpage gt-page">')
open(f'{SITE}/gallery.html', 'w', encoding='utf-8').write(gt)
print(f'built gallery.html ({len(gitems)} photos)')
