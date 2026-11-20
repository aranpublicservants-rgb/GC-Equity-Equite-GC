"""Verify the DND source pack and every displayed PSES/branch summary cell."""
from pathlib import Path
import json,base64,gzip,hashlib,csv,io,subprocess
from html.parser import HTMLParser
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
c=read('data/catalogue.json');ids=set();tables={};total=0
for f in c['files']:
 assert f['id'] not in ids;ids.add(f['id']);raw=gzip.decompress(base64.b64decode((R/f['path']).read_bytes()))
 if f['format']=='dictionary-json.gz.b64':
  assert hashlib.sha256(raw).hexdigest()==f['encodedSha256'];d=json.loads(raw);h=d['headers'];rows=[[d['values'][i][v] for i,v in enumerate(row)] for row in d['rows']];s=io.StringIO(newline='');csv.writer(s,lineterminator='\n').writerows([h,*rows]);canonical=s.getvalue().encode()
 else:
  assert f['format']=='csv.gz.b64';canonical=raw;data=list(csv.reader(io.StringIO(raw.decode('utf-8-sig'))));h,rows=data[0],data[1:]
 assert hashlib.sha256(canonical).hexdigest()==f['sha256'],f['id']+' hash'
 assert len(rows)==f['rows'] and all(len(x)==len(h) for x in rows),f['id']+' dimensions';total+=len(rows)
 assert f.get('population') and f['populationType'] in ['civilian','military','mixed','public','family','programs']
 if f['id'] in ['source-a2e4ddf5f38c','source-be334a7752e6','pses-2024-branches']:tables[f['id']]=[dict(zip(h,row)) for row in rows]
assert total==c['records']
summary=read('data/survey-summary.json');facts=read('data/visuals.json');branch=read('data/branch-summary.json')
assert len(summary['groups'])==167 and len(branch['branches'])==25 and len(tables['pses-2024-branches'])==91701
direct={(x['DESCRIP_E'],x['QUESTION']):x for x in tables['source-a2e4ddf5f38c']};checked=0
for g,values in summary['groups'].items():
 for q,cell in values['questions'].items():
  r=direct[g,q];assert int(r['LEVEL1ID'])==3 and int(r['SURVEYR'])==2024 and all(int(r['LEVEL'+str(i)+'ID'])==0 for i in range(2,6));assert cell['value']==r[summary['definitions'][q]['field']];assert (cell['n'] or '')==r['ANSCOUNT'];checked+=1
overall={(x['SURVEYR'],x['QUESTION']):x for x in tables['source-be334a7752e6']}
for year,qs in facts['history'].items():
 for q,cell in qs.items():
  r=overall[year,q];assert cell['value']==r[summary['definitions'][q]['field']];assert (cell['n'] or '')==r['ANSCOUNT']
assert facts['population']==28241 and facts['overall']['Q42']=={'value':'56','n':'13145'}
assert facts['overall']['Q72']=={'value':'14','n':'260'}
assert summary['groups']['Black']['questions']['Q72']['value']=='X'
assert summary['groups']['Indigenous']['questions']['Q72']=={'value':'8','n':'25'}
assert summary['groups']['Person with a disability']['questions']['Q58']['value']=='26'
assert [x['total'] for x in facts['fte']]==[90587,92674,104040,104951,106453,107706]
assert all(sum(x['values'])==x['total'] for x in facts['fte'])
assert next(x for x in facts['representation'] if x['id']=='black')['counts'][-1]==719
assert facts['collection']=={'files':len(c['files']),'records':total}
bsource={(x['Branch ID'],x['Employee group (English)'],x['Question']):x for x in tables['pses-2024-branches']};bchecked=0
for bid,groups in branch['cells'].items():
 for gid,qs in groups.items():
  group=next(x for x in branch['groups'] if x['id']==gid)
  for q,cell in qs.items():
   row=bsource[bid,group['en'],q];assert ('' if cell['value'] is None else str(cell['value']))==row[branch['questions'][q]['field']];assert ('' if cell['n'] is None else str(cell['n']))==row['ANSCOUNT'];bchecked+=1
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.links=[];self.assets=[];self.sections=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('id'):self.ids.append(a['id'])
  if tag=='a':self.links.append(a.get('href',''))
  if tag=='script' and a.get('src'):self.assets.append(a['src'])
  if tag=='link' and a.get('rel')=='stylesheet':self.assets.append(a['href'])
  if tag=='section':self.sections+=1
html=(R/'index.html').read_text();page=Page();page.feed(html);assert len(page.ids)==len(set(page.ids)) and page.sections==44
for link in page.links:
 if link.startswith('#'):assert link[1:] in page.ids,link
 elif link and not link.startswith(('https:','http:','mailto:')):assert (R/link.split('?')[0]).exists(),link
for file in page.assets:assert (R/file).exists(),file
for p in list(R.glob('*.js'))+[R/'index.html']:
 text=p.read_text();assert not any(x in text for x in ['Indigenous Services Canada','ISC overall','SAC','13,924','8,389','kakyze','—']),p.name
 for anchor in ['qui-travaille','promesses','manquant']:assert ('#'+anchor) not in text,p.name+' stale anchor'
subprocess.run(['node',str(R/'scripts/check-models.cjs')],cwd=R,check=True)
print(f'PASS: {len(ids)} assets, {total:,} rows, {checked:,} direct department-group cells and {bchecked:,} branch cells; 44 bilingual sections.')
