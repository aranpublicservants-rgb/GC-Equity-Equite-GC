"""Keep the direct-link inventory synchronized with tracked HTML pages.

Pages that only forward visitors to a new address are left out, so the directory lists
each destination once. Pages without a curated bilingual label use their own title."""
import html, json, re, subprocess
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'website-directory/routes.json'
old=json.loads(OUT.read_text())
previous={r['path']:r for r in old}
reg=json.loads((ROOT/'assets/department-pages.json').read_text())['organizations']
org={r['path']:r for r in reg if r['id']!='youth'}
paths=subprocess.check_output(['git','ls-files','*.html'],cwd=ROOT,text=True).splitlines()
class Links(HTMLParser):
    def __init__(self): super().__init__();self.rows=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);h=a.get('href','')
        if tag=='a' and h.startswith('../') and ('?' in h or '#' in h) and a.get('data-en') and a.get('data-fr'):
            self.rows.append(dict(path=h[3:],en=a['data-en'],fr=a['data-fr'],group='views'))
def redirect_only(p):
    """A small page whose head immediately sends the visitor to another address."""
    f=ROOT/p
    if f.stat().st_size>4000: return False
    head=f.read_text(errors='replace').split('</head>')[0].lower()
    return 'http-equiv="refresh"' in head or 'location.replace(' in head
def title_of(p):
    m=re.search(r'<title[^>]*>(.*?)</title>',(ROOT/p).read_text(errors='replace')[:200000],re.S|re.I)
    if not m: return None
    title=html.unescape(re.sub(r'\s+',' ',m.group(1))).strip()
    title=title.split(' | ')[0].split(' · ')[0].split(' / ')[0].strip()
    return title or None
def entry(p):
    route='./' if p=='index.html' else p[:-10] if p.endswith('/index.html') else p
    r=org.get(route)
    kept=previous.get(route)
    if kept and (kept.get('fr') or r): return kept
    group=kept['group'] if kept else 'departments' if r or route.startswith('isc/') else 'systemic' if route.startswith('systemic-change/') else 'rights' if route.startswith(('recourse/','duty-to-accommodate/','career-development/')) else 'other'
    label=Path(route.rstrip('/')).stem.replace('-',' ').replace('_',' ')
    return dict(path=route,en=r['en'] if r else title_of(p) or label,fr=r['fr'] if r else None,group=group)
rows=[entry(p) for p in sorted(paths) if p!='404.html' and not redirect_only(p)]
links=Links();links.feed((ROOT/'companion-sites/index.html').read_text())
known={r['path'] for r in rows}
for r in links.rows:
    if r['path'] not in known:
        target=urlsplit(r['path']).path
        if not target or not (ROOT/target).exists(): continue
        rows.append(r);known.add(r['path'])
OUT.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(f'{len(rows)} direct links')
