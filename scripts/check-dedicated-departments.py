#!/usr/bin/env python3
"""Check the shared section contract and ISC source isolation and reading cells."""
import base64
import csv
import gzip
import hashlib
import io
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT=Path(__file__).resolve().parents[1]
J=lambda p:json.loads((ROOT/p).read_text())
template=J('data/department-page-template.json')
order=[s['id'] for s in template['sections']]

class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=[];self.anchors=[];self.assets=[];self.headings=[];self.in_h2=False;self.current=None;self.nav=False;self.nav_links=[];self.tables=0;self.captions=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.append(a['id'])
  if tag=='a' and a.get('href','').startswith('#'):
   self.anchors.append(a['href'][1:])
   if self.nav:self.nav_links.append(a['href'][1:])
  if tag=='nav' and a.get('class')=='contents':self.nav=True
  if tag=='h2':self.in_h2=True;self.current=[a.get('id'),'']
  if tag=='table':self.tables+=1
  if tag=='caption':self.captions+=1
  if tag=='script' and a.get('src'):self.assets.append(a['src'])
  if tag=='link' and a.get('rel')=='stylesheet':self.assets.append(a['href'])
 def handle_data(self,data):
  if self.in_h2:self.current[1]+=data
 def handle_endtag(self,tag):
  if tag=='h2' and self.in_h2:self.headings.append(self.current);self.in_h2=False
  if tag=='nav':self.nav=False

for folder,count in [('dfo',19),('dnd',22),('isc',18)]:
 text=(ROOT/folder/'index.html').read_text();p=Page();p.feed(text)
 assert len(p.ids)==len(set(p.ids)),(folder,'duplicate ID')
 assert all(a in p.ids for a in p.anchors),(folder,'broken fragment')
 assert p.tables==p.captions,(folder,'table missing caption')
 assert '\u2014' not in text,(folder,'em dash')
 heads=[(i,t) for i,t in p.headings if i!='accessibility-title']
 assert len(heads)==count*2,(folder,'section count')
 expected=[key for key in order if key not in template['nonApplicable'].get(folder,[])]
 assert [x[0] for x in heads[:count]]==expected,(folder,'English section order')
 assert p.nav_links==[x[0] for x in heads],(folder,'menu and headings differ')
 assert '../index.html?org=' in text,(folder,'organization return link')
 for asset in p.assets:
  assert (ROOT/folder/unquote(urlsplit(asset).path)).is_file(),(folder,asset)
  if asset.endswith('.js'):subprocess.run(['node','--check',str((ROOT/folder/asset).resolve())],check=True,capture_output=True)
 css=(ROOT/folder/'site.css').read_text()
 assert '236px' in css and 'position:sticky' in css and 'overflow-y:auto' in css,(folder,'contents layout')
 if folder=='dnd':
  for key in ['Commitments and employee networks','What data are missing','All National Defence datasets','Sources and definitions']:
   assert key in [t for _,t in heads[:count]],key
  assert 'id="coast-guard"' in text and 'id="context"' not in text

name='Indigenous Services Canada'
index=J('assets/department-profile-index.json')
profile=json.loads(gzip.decompress(base64.b64decode((ROOT/index['organizations'][name]['path']).read_bytes())))
summary=J('isc/data/survey-summary.json')
assert set(profile['groups'])==set(summary['groups'])
cells=0
for group,record in profile['groups'].items():
 for q,value in record['questions'].items():
  assert summary['groups'][group]['questions'][q]=={'value':value[0],'n':value[1]},(group,q)
  cells+=1
evidence=J('isc/data/reading-evidence.json')
assert evidence['overall']==profile['overall']
assert evidence['representation']==J('data/tbs-departmental-representation-2017-2025.json')['orgs'][name]
assert evidence['staffing']==J('data/snps-2025-by-organization.json')['orgs'][name]
assert evidence['population']==8389 and evidence['overall']['Q86']==['64','980']
assert evidence['womenCount2025']==J('data/isc-women-representation-2021-2025.json')['years']['2025']['count']==5890
assert evidence['staffing']['black']['STA_14A']==26 and evidence['staffing']['all']['STA_01A']==67
assert all(urlsplit(u).scheme=='https' for u in evidence['sources'].values())
assert summary['groups']['Black']['questions']['Q72']['value']=='X'
text=(ROOT/'isc/index.html').read_text()
assert 'Transparent staffing · STA_01A' in text and 'Transparent staffing · STA_01F' not in text
assert '13,924' not in text and '28,241' not in text
catalogue=J('isc/data/catalogue.json');total=0
for rec in catalogue['files']:
 p=(ROOT/'isc'/rec['path']).resolve();assert p.is_file(),rec['id']
 raw=p.read_bytes()
 if rec.get('sha256'):assert hashlib.sha256(raw).hexdigest()==rec['sha256'],rec['id']
 data=gzip.decompress(raw)
 if rec['format']=='branch-json.gz':rows=json.loads(data)
 else:
  reader=csv.reader(io.StringIO(data.decode('utf-8-sig')));headers=next(reader);rows=list(reader)
  for field in ['Department','DEPT_E','department_e','dept_e','organization_e','Department or agency','\ufeffOrganization','Organization']:
   if field in headers:
    ix=headers.index(field)
    assert all(r[ix].removesuffix(' Total')==name for r in rows),(rec['id'],field)
 assert len(rows)==rec['rows'],rec['id'];total+=len(rows)
assert total==catalogue['records']
for folder in ['dfo','dnd','isc']:
 assert '/'+folder+'/' in (ROOT/'sitemap.xml').read_text()
print(f'PASS: DFO/DND/ISC section order, bilingual menus, fragments, scripts and source links; {cells:,} exact ISC group cells; {len(catalogue["files"])} isolated source files and {total:,} records.')
