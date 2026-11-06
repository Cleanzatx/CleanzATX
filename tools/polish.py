"""Removes hyphens from compound words and em dashes from visible site copy (Tyler, Nov 2:
"Remove all the hyphens ... It makes it look like it was made with AI").
Touches text between tags, a few text attributes and JSON-LD strings; never URLs, classes or code.
Run after build_pages.py:  python3 polish.py <site dir>"""
import re, sys, glob, os
SITE = sys.argv[1]
WORDS = ['pure-water','7-day','water-fed','spot-free','interior-only','touch-ups','touch-up','streak-free','one-time',
 'low-pressure','once-a-year','power-washing','top-notch','post-construction','add-ons','add-on','spanish-style',
 'llm-readable','fact-checked','commercial-grade','hard-water','same-week','5-star','five-star','inside-and-out',
 'exterior-only','third-story','honda-powered','per-window','truck-mounted','one-story','two-story','three-story',
 'austin-area','di-filtered','service-area','twice-a-year','every-two-months','10-digit','lake-view','well-priced',
 'master-planned','full-time','walk-out','floor-to-ceiling','high-end','locally-owned','real-time','follow-up','on-site']
SPECIAL = {'re-clean': 'reclean', 're-cleans': 'recleans', 'de-ionization': 'deionization', 'de-ionized': 'deionized'}
pat = re.compile(r'(?<![\w/.-])(' + '|'.join(sorted(map(re.escape, WORDS + list(SPECIAL)), key=len, reverse=True)) + r')(?![\w-])', re.I)
def fix_words(t):
    def r(m):
        w = m.group(1); low = w.lower()
        if low in SPECIAL:
            out = SPECIAL[low]
            return out.capitalize() if w[0].isupper() else out
        return w.replace('-', ' ')
    return pat.sub(r, t)
DASH = [  # em dashes in copy, most specific first
 (' — use code', ': use code'), ('Almost done — how', 'Almost done. How'), (' — 20% off', ' (20% off)'), (' — 10% off', ' (10% off)'),
 (' — 5% off', ' (5% off)'), ('online — takes less than 60 seconds', 'online. It takes less than a minute'),
 ('business — such as', 'business (such as'), ('bookkeeping — and only', 'bookkeeping) and only'),
 ('>— ', '>'), (' — ', ', '), ('—', '–'),
]
def fix_dashes(t):
    for a, b in DASH: t = t.replace(a, b)
    return t
def polish_html(s):
    parts = re.split(r'(<script\b[^>]*>.*?</script>|<style\b.*?</style>|<svg\b.*?</svg>|<!--.*?-->)', s, flags=re.S | re.I)
    out = []
    for p in parts:
        if p.startswith('<script') and 'application/ld+json' in p[:80]:
            p = re.sub(r'"((?:[^"\\]|\\.)*)"', lambda m: '"' + (m.group(1) if m.group(1).startswith(('http', '/')) else fix_dashes(fix_words(m.group(1)))) + '"', p)
        elif not p.startswith(('<script', '<style', '<svg', '<!--')):
            p = re.sub(r'>([^<]+)<', lambda m: '>' + fix_dashes(fix_words(m.group(1))) + '<', p)
            p = re.sub(r'((?:alt|title|aria-label|placeholder|content|data-title|data-sub)=")([^"]*)"',
                       lambda m: m.group(1) + (m.group(2) if m.group(2).startswith(('http', '/', 'width=')) else fix_dashes(fix_words(m.group(2)))) + '"', p)
        out.append(p)
    return ''.join(out)
pages = [f'{SITE}/{n}' for n in ('index.html','pricing.html','plans.html','about.html','gallery.html','ai-info.html','privacy-policy.html','terms-of-service.html')]
pages += glob.glob(f'{SITE}/window-cleaning-*/index.html')
for f in pages:
    s = open(f, encoding='utf-8').read(); n = polish_html(s)
    if n != s: open(f, 'w', encoding='utf-8').write(n); print('polished', os.path.relpath(f, SITE))
