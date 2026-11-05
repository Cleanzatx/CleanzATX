"""Post build checks: duplicate sentences across built pages, titles, descriptions, H1s, canonicals, forbidden words.
python3 -I tools/check_site.py <site dir>"""
import re, sys, glob, os, collections, html
SITE = sys.argv[1]
files = [f'{SITE}/index.html', f'{SITE}/about.html', f'{SITE}/pricing.html', f'{SITE}/plans.html', f'{SITE}/ai-info.html'] + sorted(glob.glob(f'{SITE}/window-cleaning-*/index.html'))
def main_text(s):
    m = re.search(r'<main.*?</main>', s, re.S); body = m.group(0) if m else s
    body = re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>', ' ', body, flags=re.S)
    body = re.sub(r'<nav class="hood-areas.*?</nav>', ' ', body, flags=re.S)   # link chips are allowed to repeat
    body = re.sub(r'<ul class="hood-stats">.*?</ul>', ' ', body, flags=re.S)
    body = re.sub(r'<section class="pg-cta">.*?</section>', ' ', body, flags=re.S)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', body)); return re.sub(r'\s+', ' ', t)
sent = collections.defaultdict(set); probs = 0; rows = []
FORBID = ['shine', "pink's", 'window gang', 'casa washa', 'thumbtack', 'cleanz atx', 'cleanzatx is a dba of durmgeneral llc. ', '—', '–']
for f in files:
    s = open(f, encoding='utf-8').read(); slug = os.path.relpath(f, SITE)
    title = re.search(r'<title>(.*?)</title>', s, re.S); title = html.unescape(title.group(1).strip()) if title else ''
    desc = re.search(r'name="description" content="(.*?)"', s); desc = html.unescape(desc.group(1)) if desc else ''
    h1 = re.findall(r'<h1', s); canon = re.search(r'rel="canonical" href="(.*?)"', s)
    if len(h1) != 1: print(f'{slug}: {len(h1)} h1'); probs += 1
    if not canon: print(f'{slug}: no canonical'); probs += 1
    if len(title) > 65: print(f'{slug}: title {len(title)} chars'); probs += 1
    if len(desc) > 160: print(f'{slug}: description {len(desc)} chars'); probs += 1
    t = main_text(s); words = len(t.split()); rows.append((slug, words))
    low = t.lower()
    for w in FORBID:
        if w in low and not (w == 'cleanz atx' and 'index.html' == slug): print(f'{slug}: forbidden "{w}"'); probs += 1
    if 'window-cleaning-' in slug and re.search(r'[A-Za-z]-[A-Za-z]', t): print(f'{slug}: hyphen: {sorted(set(re.findall(r"[A-Za-z]+-[A-Za-z]+", t)))[:5]}'); probs += 1
    for sn in re.split(r'(?<=[.!?])\s+', t):
        sn = sn.strip().lower()
        if len(sn.split()) >= 8: sent[sn].add(slug)
dups = [(s, v) for s, v in sent.items() if len(v) > 2]
dups.sort(key=lambda x: -len(x[1]))
for s, v in dups[:25]: print(f'SHARED by {len(v)} pages: {s[:100]}'); probs += 1
small = [r for r in rows if r[0].startswith('window-cleaning-') and r[1] < 450]
for r in small: print(f'{r[0]}: only {r[1]} words'); probs += 1
print(f'{len(files)} pages, {probs} problems; location words min/avg/max:', min(r[1] for r in rows if r[0].startswith('window')), sum(r[1] for r in rows if r[0].startswith('window'))//max(1,len([r for r in rows if r[0].startswith('window')])), max(r[1] for r in rows if r[0].startswith('window')))
