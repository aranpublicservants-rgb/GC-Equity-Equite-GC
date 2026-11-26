"""Keep the direct-link inventory synchronized with tracked HTML pages."""
import json, subprocess
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
def entry(p):
    route='./' if p=='index.html' else p[:-10] if p.endswith('/index.html') else p
    if route in previous: return previous[route]
    r=org.get(route)
    group='departments' if r or route.startswith('isc/') else 'systemic' if route.startswith('systemic-change/') else 'rights' if route.startswith(('recourse/','duty-to-accommodate/','career-development/')) else 'other'
    label=Path(route.rstrip('/')).stem.replace('-',' ').replace('_',' ')
    return dict(path=route,en=r['en'] if r else label,fr=r['fr'] if r else None,group=group)
rows=[entry(p) for p in sorted(paths) if p!='404.html']
links=Links();links.feed((ROOT/'companion-sites/index.html').read_text())
known={r['path'] for r in rows}
for r in links.rows:
    if r['path'] not in known:
        target=urlsplit(r['path']).path
        if not target or not (ROOT/target).exists(): continue
        rows.append(r);known.add(r['path'])
OUT.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(f'{len(rows)} direct links')
