"""Geocode every location JSON with Nominatim (OpenStreetMap), 1 request per second, and store lat/lon in the JSON.
Falls back to the hub's coordinates when a neighborhood does not resolve inside the service area."""
import json, glob, time, urllib.request, urllib.parse, os, sys
LOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'locations')
HUB_LL = {'lakeway': (30.3647, -97.9797), 'lake-travis': (30.4080, -97.9300), 'the-hills': (30.3440, -97.9600), 'bee-cave': (30.3080, -97.9480),
          'spanish-oaks': (30.2990, -97.9400), 'steiner-ranch': (30.3870, -97.8990), 'four-points': (30.4000, -97.8720), 'river-place': (30.3760, -97.8600)}
BOX = (30.22, 30.50, -98.12, -97.72)  # lat min, lat max, lon min, lon max
def q(query):
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': query, 'format': 'json', 'limit': 3, 'countrycodes': 'us', 'viewbox': '-98.12,30.50,-97.72,30.22', 'bounded': 1})
    req = urllib.request.Request(url, headers={'User-Agent': 'cleanzatx-site-builder/1.0 (cleanzatx@gmail.com)'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r: return json.load(r)
    except Exception as e:
        return []
files = sorted(glob.glob(f'{LOC}/*.json')); done = 0; hit = 0
for f in files:
    d = json.load(open(f, encoding='utf-8'))
    if d.get('lat') and not ('--force' in sys.argv): continue
    name = d['name']; city = d.get('city', '').split(',')[0]
    tries = [f'{name}, {city}, Texas', f'{name}, Texas', f'{name} subdivision, Travis County, Texas']
    if d.get('kind') == 'hub': tries = [f'{name}, Texas', f'{name}, Travis County, Texas']
    res = []
    for t in tries:
        res = q(t); time.sleep(1.1)
        res = [r for r in res if BOX[0] <= float(r['lat']) <= BOX[1] and BOX[2] <= float(r['lon']) <= BOX[3]]
        if res: break
    if res:
        d['lat'] = round(float(res[0]['lat']), 5); d['lon'] = round(float(res[0]['lon']), 5); d['geo_source'] = 'osm:' + res[0].get('type', ''); hit += 1
    else:
        d['lat'], d['lon'] = HUB_LL[d['hub']]; d['geo_source'] = 'hub'
    json.dump(d, open(f, 'w', encoding='utf-8'), indent=1, ensure_ascii=False); done += 1
print(f'geocoded {done} files, {hit} resolved by OSM, {done - hit} fell back to hub center')
