#!/usr/bin/env python3
"""Validate every route against its exact source-specific identity and cells."""
import base64
import gzip
import json
import re
import subprocess
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote,urlsplit

R=Path(__file__).resolve().parents[1]
J=lambda p:json.loads((R/p).read_text())
N=lambda x:re.sub('[^a-z0-9]','',unicodedata.normalize('NFD',str(x)).encode('ascii','ignore').decode().lower())
registry=J('assets/department-pages.json');cross=J('data/department-identity-crosswalk.json')
redirects=J('data/department-duplicate-routes.json')['routes']
profiles=J('assets/department-profile-index.json');series=J('data/tbs-departmental-representation-2017-2025.json')['orgs'];staffing=J('data/snps-2025-by-organization.json')['orgs'];women=J('data/tbs-women-departmental-2025.json')['orgs']
template=[s['id'] for s in J('data/department-page-template.json')['sections']]

class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=[];self.hrefs=[];self.assets=[];self.navs=[];self.headings=[];self.nav=False;self.h2=None;self.tables=0;self.captions=0;self.need_source=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.append(a['id'])
  if tag=='a' and a.get('href','').startswith('#'):
   self.hrefs.append(a['href'][1:])
   if self.nav:self.navs.append(a['href'][1:])
  if tag=='nav' and a.get('class')=='contents':self.nav=True
  if tag=='h2':
   assert not self.need_source,'Table has no source before the next section'
   self.h2=a.get('id')
  if tag=='table':
   assert not self.need_source,'Table has no following source'
   self.tables+=1
  if tag=='caption':self.captions+=1
  if tag=='p' and 'source' in a.get('class','').split():self.need_source=False
  if tag=='script' and a.get('src'):self.assets.append(a['src'])
  if tag=='link' and a.get('rel')=='stylesheet':self.assets.append(a['href'])
 def handle_endtag(self,tag):
  if tag=='nav':self.nav=False
  if tag=='h2' and self.h2:self.headings.append(self.h2);self.h2=None
  if tag=='table':self.need_source=True

assert len(registry['selectorLabels'])==255
assert len(registry['organizations'])==len(cross['organizations'])
assert len({x['path'] for x in registry['organizations']})==len(registry['organizations'])
assert len({x['en'] for x in registry['organizations']})==len(registry['organizations'])
assert all(not re.match(r'^(Public Service|Federal Public Service|Micro-organizations combined)$',o['en']) for o in registry['organizations'])
for label in registry['selectorLabels']:
 matches=[o for o in registry['organizations'] if N(label['en']) in {N(n) for n in o['aliases']}]
 assert len(matches)==1,(label['en'],'must have exactly one full profile route',len(matches))
cellcount=0;generated=0;seen={}
for o in registry['organizations']:
 p=R/o['path']/'index.html';assert p.is_file(),o['path'];text=p.read_text()
 if o['id'] in redirects:
  target=redirects[o['id']]
  canonical='https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/'+target+'/'
  assert target!=o['id'] and (R/target/'index.html').is_file(),(o['id'],'missing canonical route')
  assert '<link rel="canonical" href="'+canonical+'">' in text,(o['id'],'canonical link missing')
  assert 'location.search+location.hash' in text and 'location.replace(' in text,(o['id'],'redirect loses filters')
  assert 'dp-data' not in text,(o['id'],'duplicate profile still live')
  continue
 assert '<loc>https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/'+o['path']+'</loc>' in (R/'sitemap.xml').read_text(),o['path']
 if o['specialized']:continue
 generated+=1;page=Page();page.feed(text)
 assert len(page.ids)==len(set(page.ids)),(o['en'],'duplicate IDs')
 assert all(h in page.ids for h in page.hrefs),(o['en'],'broken fragment')
 assert page.tables==page.captions and not page.need_source,(o['en'],'missing table caption/source')
 assert '\u2014' not in text,(o['en'],'em dash')
 heads=[h for h in page.headings if h!='accessibility-title'];count=len(o['sections'])
 assert heads[:count]==o['sections'],(o['en'],'wrong English headings')
 assert page.navs==heads,(o['en'],'contents links do not match bilingual sections')
 assert [k for k in template if k in o['sections']]==o['sections'],(o['en'],'wrong template order')
 for asset in page.assets:assert (p.parent/unquote(urlsplit(asset).path)).is_file(),(o['en'],asset)
 data=json.loads(re.search(r'<script id="dp-data" type="application/json">(.*?)</script>',text,re.S)[1]);seen[o['en']]=data
 assert data['en']==o['en'] and data['fr']==o['fr'] and data['path']==o['path']
 if data['psesEntry']:
  raw=json.loads(gzip.decompress(base64.b64decode((R/data['psesEntry']['path']).read_bytes())))
  assert raw['organization']==data['psesOrganization'] and data['overall']==raw['overall'],o['en']
  assert raw['organization'] in data['sourceNames']['psesDetailed'],o['en']
  cellcount+=len(raw['overall'])+sum(len(g['questions']) for g in raw['groups'].values())
 if data['representation']:
  assert data['representationName'] in data['sourceNames']['tbsRepresentation'],o['en']
  assert data['representation']==series[data['representationName']],o['en']
 if data['staffing']:
  assert any(staffing[n]==data['staffing'] for n in data['sourceNames']['snps2025']),o['en']
 if data['women'] and 'Published count' in data['women']:
  matches=[v for n,v in women.items() if N(n) in {N(x) for x in data['sourceNames']['tbsRepresentation']}]
  assert len(matches)==1 and data['women']['Published count']==matches[0]['count'],o['en']
 if data['branch']:assert data['branch']['en'] in data['sourceNames']['psesDetailed']+data['sourceNames']['psesSummary'],o['en']
 for required in ['data-guide','missing','data-library','requests','actions','sources']:assert required in o['sections'],o['en']
for name in ['Office of the Information Commissioner of Canada','Office of the Privacy Commissioner of Canada','Prairies Economic Development Canada','Pacific Economic Development Agency of Canada']:
 assert name in seen,name
 assert not seen[name]['representation'],(name,'combined population leaked into separate organization')
assert seen['Canada Revenue Agency']['overall'] and not seen['Canada Revenue Agency']['representation']
assert not seen['Canada Revenue Agency']['staffing'],'CRA must not borrow the 2025 CPA staffing row'
for alias in registry['identityAliases']:
 target=next(o for o in registry['organizations'] if o['en']==alias['canonical'])
 assert alias['alias'] in target['aliases'],alias
for script in ['assets/department-page.js','gc-dashboard.js']:subprocess.run(['node','--check',str(R/script)],check=True,capture_output=True)
assert 'departmentPages' in (R/'gc-dashboard.js').read_text() and "searchParams.get('view')!=='table'" in (R/'gc-dashboard.js').read_text()
assert all('caf' not in o['sections'] for o in registry['organizations'] if o['id'] not in ['dnd'])
print(f'PASS: all 255 selector identities route to {len(registry["organizations"])} distinct bilingual profiles; {generated} generated pages; {cellcount:,} exact reading cells; captions, sources, menus, assets, suppression and combined-population boundaries.')
