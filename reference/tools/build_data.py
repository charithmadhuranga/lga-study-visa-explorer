"""Build LGA Study Explorer data files from the scraper's processed JSON.
Usage: python3 -I build_data.py <repo_dir> <out_dir>
"""
import json, re, sys, os, html
from html.parser import HTMLParser
from datetime import date
from PIL import Image

REPO, OUT = sys.argv[1], sys.argv[2]
P = os.path.join(REPO, 'scraper/data/processed')
TODAY = date.today().isoformat()
os.makedirs(os.path.join(OUT, 'data'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'img/uni'), exist_ok=True)

unis = json.load(open(os.path.join(P, 'universities.json')))['universities']
cd = json.load(open(os.path.join(P, 'courses.json')))
courses, FX, FXDATE = cd['courses'], cd['fxToUsd'], cd['fxDate']

ALLOWED = {'p', 'ul', 'ol', 'li', 'h4', 'strong', 'b', 'em', 'i', 'br'}
class San(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.o = []; s.skip = 0
    def handle_starttag(s, t, a):
        if t in ('script', 'style', 'iframe'): s.skip += 1
        elif t in ('h1', 'h2', 'h3', 'h5', 'h6'): s.o.append('<h4>')
        elif t in ALLOWED: s.o.append('<%s>' % t)
    def handle_endtag(s, t):
        if t in ('script', 'style', 'iframe'): s.skip = max(0, s.skip - 1)
        elif t in ('h1', 'h2', 'h3', 'h5', 'h6'): s.o.append('</h4>')
        elif t in ALLOWED and t != 'br': s.o.append('</%s>' % t)
    def handle_data(s, d):
        if not s.skip: s.o.append(html.escape(d, quote=False))
def san(h):
    if not h: return ''
    x = San(); x.feed(h); r = ''.join(x.o)
    r = re.sub(r'<(p|li|h4)>\s*</\1>', '', r)
    return r.strip()

def first_sentences(t, n=230):
    t = re.sub(r'\s+', ' ', t or '').strip()
    if len(t) <= n: return t
    cut = t[:n]; dot = cut.rfind('. ')
    return (cut[:dot + 1] if dot > 80 else cut.rsplit(' ', 1)[0] + '…')

LEVELS = ["Bachelor's", "Master's", 'MBA']
FIELDS = sorted({c['field'] for c in courses}, key=lambda f: (f == 'Other', f))
TAGBITS = {'scholarship': 1, 'coop': 2, 'pathway': 4}

# local campus photos from the website (curated universities), matched by name
def norm(s): return re.sub(r'[^a-z]', '', re.sub(r'\([^)]*\)', '', s.lower()).replace('the ', ''))
curated_src = open(os.path.join(REPO, 'assets/js/data/universities.js'), encoding='utf8').read()
cur_pairs = [(a, b or c) for a, b, c in re.findall(r"id:\s*'([^']+)',\s*name:\s*(?:'((?:[^'\\]|\\.)*)'|\"([^\"]*)\")", curated_src)]
photo_for = {}
for cid, cname in cur_pairs:
    f = os.path.join(REPO, 'images/universities', cid + '.jpg')
    if os.path.exists(f): photo_for[norm(cname.replace("\\'", "'"))] = f
ALIAS = {norm('University of British Columbia'): norm('University of British Columbia (UBC)'),
         norm('Arizona State University (in partnership with Kaplan International)'): norm('Arizona State University')}

# main-campus city/region for featured universities whose scraped record has no location
LOCFIX = {
    'Australian National University': ('Canberra', 'Australian Capital Territory'), 'Monash University': ('Melbourne', 'Victoria'),
    'University of Melbourne': ('Melbourne', 'Victoria'), 'University of Queensland': ('Brisbane', 'Queensland'),
    'University of Sydney': ('Sydney', 'New South Wales'), 'McMaster University': ('Hamilton', 'Ontario'),
    'University of British Columbia': ('Vancouver', 'British Columbia'), 'University of Toronto': ('Toronto', 'Ontario'),
    'Massey University': ('Palmerston North', 'Manawatū-Whanganui'), 'University of Auckland': ('Auckland', 'Auckland'),
    'University of Canterbury': ('Christchurch', 'Canterbury'), 'University of Otago': ('Dunedin', 'Otago'),
    'Imperial College London': ('London', 'Greater London'), "King's College London": ('London', 'Greater London'),
    'University of Glasgow': ('Glasgow', 'Scotland'), 'University of Manchester': ('Manchester', 'North West'),
    'Stanford University': ('Stanford', 'California'), 'University of California, Berkeley': ('Berkeley', 'California'),
    'University of Illinois Urbana-Champaign': ('Urbana-Champaign', 'Illinois')}
for c in courses:  # source typo
    if c.get('city') == 'Camrbridge': c['city'] = 'Cambridge'
    c['cities'] = ['Cambridge' if x == 'Camrbridge' else x for x in (c.get('cities') or [])]
for u in unis:
    for x in [u.get('location') or {}] + (u.get('campuses') or []):
        if x.get('city') == 'Camrbridge': x['city'] = 'Cambridge'
    if u['name'] in LOCFIX and not (u.get('location') or {}).get('city'):
        city, prov = LOCFIX[u['name']]; u['location'] = {'city': city, 'province': prov}

uidx, U = {}, []
for u in sorted(unis, key=lambda x: (x['country'], x['name'])):
    if not u['courseCount']: continue
    k = norm(u['name']); src = photo_for.get(k) or photo_for.get(ALIAS.get(k, ''))
    img = ''
    if src:
        im = Image.open(src).convert('RGB'); im.thumbnail((1280, 900))
        img = 'img/uni/%s.webp' % u['id']; im.save(os.path.join(OUT, img), 'WEBP', quality=72)
    loc = dict(u.get('location') or {})
    camp = sorted({x['city'] for x in u.get('campuses') or [] if x.get('city')})
    if not loc.get('city') or not camp:  # fall back to the cities its courses are taught in
        from collections import Counter
        mine = [c for c in courses if c['universityId'] == u['id']]
        cc = Counter((c['city'], c['province']) for c in mine if c.get('city'))
        if cc and not loc.get('city'): loc['city'], loc['province'] = cc.most_common(1)[0][0]
        if not camp: camp = sorted({x for c in mine for x in (c.get('cities') or [c.get('city')]) if x})
    if not camp and loc.get('city'): camp = [loc['city']]
    uidx[u['id']] = len(U)
    U.append({'id': u['id'], 'n': u['name'], 'c': u['country'], 'cat': u['category'], 't': u['type'] or '',
              'f': u['founded'] or '', 'city': loc.get('city') or '', 'prov': loc.get('province') or '',
              'camp': camp,
              'logo': u['logoUrl'] or '', 'img': img, 'web': u['website'] or '', 'st': u['students'] or 0,
              'work': bool(u['canWorkAndStudy']), 'coop': bool(u['coopParticipating']), 'house': bool(u['onCampusHousing']),
              'dur': [d['label'] + ': ' + d['value'] for d in u.get('typicalDuration') or []],
              'ab': first_sentences(u['aboutText']), 'feat': bool(u['curated'])})

K, detail = [], {}
for c in courses:
    ui = uidx.get(c['universityId'])
    if ui is None: continue
    ins = []
    for i in c['intakes'] or []:
        if i.get('start') and i['start'] >= TODAY:
            ins.append(i['start'] if i.get('deadline') in (None, i['start']) else i['start'] + '|' + i['deadline'])
    tags = sum(b for t, b in TAGBITS.items() if t in (c['tags'] or []))
    dm = c['durationMonths'] or []
    K.append([c['key'], c['name'], ui, LEVELS.index(c['level']), FIELDS.index(c['field']),
              c['tuitionPerYear'] or 0, c['applicationFee'] or 0, (min(dm) if dm else 0), (max(dm) if dm else 0),
              sorted(ins), tags, c['city'] or '', c['province'] or ''])
    d = detail.setdefault(c['country'], {'u': {}, 'k': {}})
    s = san(c['summaryHtml'])
    if s: d['k'][c['key']] = s

for u in unis:
    if u['id'] in uidx:
        d = detail.setdefault(u['country'], {'u': {}, 'k': {}})
        d['u'][u['id']] = {'a': san(u['aboutHtml']), 'h': san(u['accommodationHtml'])}

cat = {'built': TODAY, 'fx': FX, 'fxDate': FXDATE, 'levels': LEVELS, 'fields': FIELDS, 'unis': U, 'courses': K}
def dump(o): return json.dumps(o, ensure_ascii=False, separators=(',', ':'))
open(os.path.join(OUT, 'data/catalog.js'), 'w').write('window.LGA_CATALOG=' + dump(cat) + ';\n')
for cty, d in detail.items():
    open(os.path.join(OUT, 'data/detail-%s.js' % cty), 'w').write(
        'window.LGA_DETAIL=window.LGA_DETAIL||{};window.LGA_DETAIL[%s]=%s;\n' % (json.dumps(cty), dump(d)))

# brand + destination imagery from the website
im = Image.open(os.path.join(REPO, 'images/logo-navy.png')).convert('RGBA'); im.thumbnail((256, 256))
im.save(os.path.join(OUT, 'img/logo.png'))
for cty, f in {'usa': 'dest-02', 'canada': 'dest-03', 'uk': 'dest-04', 'australia': 'dest-05', 'new-zealand': 'dest-06'}.items():
    Image.open(os.path.join(REPO, 'images/hero', f + '.webp')).save(os.path.join(OUT, 'img/dest-%s.webp' % cty), 'WEBP', quality=78)
Image.open(os.path.join(REPO, 'images/hero/graduates-1920.webp')).convert('RGB').save(os.path.join(OUT, 'img/hero.webp'), 'WEBP', quality=70)

print('unis', len(U), 'courses', len(K), 'photos', sum(1 for u in U if u['img']), 'fields', FIELDS)
print('no upcoming intake', sum(1 for k in K if not k[9]), 'zero fee', sum(1 for k in K if not k[5]))
