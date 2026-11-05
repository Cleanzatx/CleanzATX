"""Checks location JSON files: schema, lengths, forbidden words, dashes, duplicate sentences across pages.
python3 -I tools/validate_locations.py tools/locations [batch.json]"""
import json, sys, glob, re, os, collections
D = sys.argv[1]; only = None
if len(sys.argv) > 2:
    only = {r['Slug'] for r in json.load(open(sys.argv[2]))}
FORBID = ['shine', "pink's", 'pinks', 'window gang', 'a+ window', 'fish window', 'casa washa', 'lake travis power', 'thumbtack', 'yelp', 'angi',
          '1020 challenger', 'the row', "row's", 'the batch', 'json', 'schema', 'hub_key', 'per the list', 'nestled', 'boasts', 'elevate', 'unparalleled', 'luxury living', 'commercial', ' — ', '–', '—']
KEYS = ['slug','name','hub','kind','tier','city','title','description','h1','h1_em','intro','sections','streets','why','faq','services','neighbors','keywords']
sent = collections.defaultdict(list); problems = 0
files = sorted(glob.glob(f'{D}/*.json'))
def text_of(d):
    t = [d.get('intro','')]
    for s in d.get('sections', []): t.append(s.get('h2','')); t += s.get('paragraphs', [])
    t += d.get('why', [])
    for f in d.get('faq', []): t += [f.get('q',''), f.get('a','')]
    t += [d.get('title',''), d.get('description',''), d.get('h1_em','')]
    return t
alld = {}
for f in files:
    try: d = json.load(open(f, encoding='utf-8'))
    except Exception as e: print('BAD JSON', f, e); problems += 1; continue
    alld[f] = d
for f, d in alld.items():
    slug = d.get('slug', os.path.basename(f)[:-5])
    mine = only is None or slug in only
    txt = text_of(d); whole = ' '.join(txt)
    if mine:
        for k in KEYS:
            if k not in d: print(f'{slug}: missing key {k}'); problems += 1
        if os.path.basename(f) != slug + '.json': print(f'{slug}: file name does not match slug'); problems += 1
        if not (50 <= len(d.get('title','')) <= 62): print(f'{slug}: title length {len(d.get("title",""))}'); problems += 1
        if not (120 <= len(d.get('description','')) <= 158): print(f'{slug}: description length {len(d.get("description",""))}'); problems += 1
        if 'CleanzATX' not in d.get('title',''): print(f'{slug}: title lacks CleanzATX'); problems += 1
        if len(d.get('sections', [])) != 3: print(f'{slug}: needs 3 sections'); problems += 1
        if not (4 <= len(d.get('faq', [])) <= 6): print(f'{slug}: faq count {len(d.get("faq", []))}'); problems += 1
        if len(d.get('why', [])) != 4: print(f'{slug}: why count {len(d.get("why", []))}'); problems += 1
        if not (2 <= len(d.get('services', [])) <= 4): print(f'{slug}: services count'); problems += 1
        wc = len(whole.split())
        if wc < 500: print(f'{slug}: only {wc} words'); problems += 1
        low = whole.lower()
        for w in FORBID:
            if w in low: print(f'{slug}: forbidden "{w.strip()}"'); problems += 1
        if re.search(r'[A-Za-z]-[A-Za-z]', whole): print(f'{slug}: hyphenated word: ' + ', '.join(sorted(set(re.findall(r'[A-Za-z]+-[A-Za-z]+', whole)))[:6])); problems += 1
        if re.search(r'\$\s?\d', whole):
            for m in re.findall(r'\$\d[\d,.]*', whole):
                pass
        for s in d.get('streets', []):
            if len(s) > 40: print(f'{slug}: odd street "{s}"'); problems += 1
    for t in txt:
        for s in re.split(r'(?<=[.!?])\s+', t):
            s = s.strip().lower()
            if len(s.split()) >= 7: sent[s].append(slug)
dups = {s: v for s, v in sent.items() if len(set(v)) > 1 and (only is None or set(v) & only)}
for s, v in sorted(dups.items(), key=lambda x: -len(x[1]))[:40]:
    print(f'DUPLICATE in {sorted(set(v))}: {s[:90]}'); problems += 1
print(f'{len(alld)} files checked, {problems} problems')
