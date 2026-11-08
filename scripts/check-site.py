"""Validate shipped assets, published data integrity and the research tools."""
import csv
import gzip
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

ROOT=pathlib.Path(__file__).resolve().parent.parent
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.assets=[]; self.scripts=[]; self.in_script=False; self.script=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if attrs.get('id'): self.ids.append(attrs['id'])
        if tag=='script':
            self.in_script=not attrs.get('src') and attrs.get('type','')!='application/json';self.script=[]
            if attrs.get('src'):self.assets.append(attrs['src'])
        if tag=='link' and attrs.get('rel')=='stylesheet':self.assets.append(attrs['href'])
    def handle_data(self,data):
        if self.in_script:self.script.append(data)
    def handle_endtag(self,tag):
        if tag=='script' and self.in_script:
            self.scripts.append(''.join(self.script));self.in_script=False

for name in ['index.html','explorer.html','sources.html','call-to-action.html','staffing.html','departmental-plans-2026-27/index.html','women-femmes/index.html']:
    p=ROOT/name;html=p.read_text();page=Page();page.feed(html)
    assert len(page.ids)==len(set(page.ids)),f'duplicate static IDs: {name}'
    assert 'gc-workspace.js' in html and 'gc-workspace.css' in html,f'shared tools missing: {name}'
    for asset in page.assets:
        if not urlsplit(asset).scheme:assert (p.parent/unquote(urlsplit(asset).path)).is_file(),f'missing asset {name}: {asset}'
    for script in page.scripts:
        with tempfile.NamedTemporaryFile(suffix='.js',mode='w') as f:
            f.write(script);f.flush();subprocess.run(['node','--check',f.name],check=True,capture_output=True)
    assert p.stat().st_size<2_500_000,f'page too large: {name}'
for name in ['gc-workspace.js','gc-ai.js','gc-equity-additions.js','gc-tools.js','call-to-action.js','staffing.js','women-femmes/assets/site.js','lib/pptxgen.bundle.js']:
    subprocess.run(['node','--check',str(ROOT/name)],check=True,capture_output=True)
for line in (ROOT/'data/checksums.sha256').read_text().splitlines():
    if line.strip():
        digest,name=line.split(None,1)
        assert hashlib.sha256((ROOT/name.strip()).read_bytes()).hexdigest()==digest,f'published data changed: {name}'
explorer=(ROOT/'explorer.html').read_text()
meta=json.loads(re.search(r'<script type="application/json" id="eq-branch-meta">(.*?)</script>',explorer,re.S)[1])
assert sum(len(json.loads(gzip.decompress((ROOT/f'data/pses-2024-branches/{d["id"]}.json.gz').read_bytes()))) for d in meta['departments'])==meta['totalRows']
model=json.loads((ROOT/'assets/workspace-data.json').read_text())
with (ROOT/'data/october-2026/TBS_EE_representation_with_WFA_2017-2025.csv').open(newline='') as f:assert list(csv.DictReader(f))==model['rep']
with (ROOT/'data/october-2026/TBS_EE_executives_by_EX_level_with_WFA_2017-2025.csv').open(newline='') as f:assert list(csv.DictReader(f))==model['executives']
manifest=json.loads((ROOT/'assets/workspace-manifest.json').read_text())
for entry in manifest['files']:
    contents=(ROOT/entry['file']).read_bytes()
    assert len(contents)==entry['bytes'] and hashlib.sha256(contents).hexdigest()==entry['sha256'],f'snapshot checksum mismatch: {entry["file"]}'
index=json.loads((ROOT/'assets/search-index.json').read_text())
assert len(model['related'])==8 and len(index['docs'])>700
assert len({d['id'] for d in index['docs']})==len(index['docs'])
assert all(d.get('en') and d.get('url') and 'undefined' not in d['en'] for d in index['docs'])
# Call to Action records point to rows that exist in the representation, survey and plan data.
cta=json.loads((ROOT/'data/call-to-action-letters.json').read_text())
series=json.loads((ROOT/'data/tbs-departmental-representation-2017-2025.json').read_text())
snps=json.loads((ROOT/'data/snps-2025-by-organization.json').read_text())
orgs=cta['organizations']
assert len({o['id'] for o in orgs})==len(orgs)==cta['counts']['organizations']
assert sum(1 for o in orgs if o['letter'])==cta['counts']['letters'] and sum(1 for o in orgs if o['self_assessment'])==cta['counts']['self_assessments']
for o in orgs:
    assert not o.get('site_name') or o['site_name'] in series['orgs'],f'representation row missing: {o["id"]}'
    assert not o.get('snps_name') or o['snps_name'] in snps['orgs'],f'staffing survey row missing: {o["id"]}'
    assert not o.get('pses_name') or o['pses_name'] in model['PSES_DEPT'] or o['pses_name'] in model['EEG_DEPT'],f'employee survey row missing: {o["id"]}'
    assert not o.get('plan_name') or any(p['name']==o['plan_name'] for p in model['plans']),f'plan missing: {o["id"]}'
    if o['self_assessment']:assert all(v['status'] in ('set','underway','none') for v in o['self_assessment']['goals'].values())
for org,rec in series['orgs'].items():
    for k,years in rec.items():
        if k=='labels':continue
        for y,v in years.items():assert re.fullmatch(r'20(1[7-9]|2[0-5])',y) and all(x is None or isinstance(x,(int,float)) for x in v),f'bad value: {org} {k} {y}'
assert all(set(q)<=set(snps['questions']) and all(isinstance(x,int) and 0<=x<=100 for x in q.values()) for rec in snps['orgs'].values() for g,q in rec.items() if g!='fr')
# Public Service Commission files: each CSV matches the inventory checksum and the derived JSON files are current.
subprocess.run(['python3','scripts/build-psc-data.py','--check'],cwd=ROOT,check=True,capture_output=True)
psc=json.loads((ROOT/'data/psc/psc-equity.json').read_text())
pcat=json.loads((ROOT/'data/psc/catalogue.json').read_text())
assert len(pcat['files'])==len(list((ROOT/'data/psc').glob('*.csv'))) and all(f['url'].startswith('https://') for f in pcat['files']+pcat['snps'])
for org,rec in psc['hiring'].items():
    assert all(v is None or v=='x' or (isinstance(v,int) and v>=0) for pair in rec['years'].values() for v in pair),f'PSC count not a published value: {org}'
# The conclusions on the Call to Action page quote figures from the data. Recalculate each one; a change in the data
# fails here until the wording is updated.
ctajs=(ROOT/'call-to-action.js').read_text()
def quoted(text):
    assert text in ctajs,f'Call to Action conclusion no longer matches the data: {text}'
def p1(v):
    return f'{v:.1f}'
sa=[o for o in orgs if o['self_assessment']]
goal=lambda o,k:o['self_assessment']['goals'][k]['status']=='set'
ngoal=lambda k:sum(1 for o in sa if goal(o,k))
quoted(f"({ngoal('indigenous_promotion')} compared with {ngoal('indigenous_recruitment')} of {len(sa)} for Indigenous employees, {ngoal('racialized_promotion')} compared with {ngoal('racialized_recruitment')} for racialized employees, and {ngoal('black_promotion')} compared with {ngoal('black_recruitment')} for Black employees)")
quoted(f"Of the {len(sa)} organizations that completed a self-assessment, {ngoal('indigenous_recruitment')} reported an Indigenous recruitment goal")
assert ngoal('indigenous_recruitment')==max(ngoal(k) for k in ['indigenous_recruitment','racialized_recruitment','black_recruitment'])
quoted(f"Of the {len(sa)} self-assessments, {sum(1 for o in sa if goal(o,'black_recruitment') or goal(o,'black_promotion'))} reported a recruitment or promotion goal for Black employees")
databar=sum(1 for o in sa if any(re.search(r'\bdata\b|self-identif|disaggregat|self-declar',b,re.I) for b in o['self_assessment'].get('barriers') or []))
quoted(f'{databar} of {len(sa)} organizations named a data problem among their barriers')
quoted(f"Of the {len(orgs)} organizations on this page, {sum(1 for o in orgs if o.get('site_name') not in series['orgs'])} are not in the Treasury Board departmental tables, {sum(1 for o in orgs if o['letter'] and not o['self_assessment'])} have a 2021 letter but no 2024 self-assessment, and {sum(1 for o in orgs if o['self_assessment'] and not o['letter'])} have a self-assessment but no letter")
ps=series['orgs']['Public Service']
def moved(g,a='2021',b='2025'):
    up=down=n=0
    for org,rec in series['orgs'].items():
        x,y=rec.get(g,{}).get(a),rec.get(g,{}).get(b)
        if org=='Public Service' or not x or not y or x[2] is None or y[2] is None:continue
        n+=1;up+=y[2]>x[2];down+=y[2]<x[2]
    return up,down,n
def marked(g,y):
    rows=[r[g][y] for o,r in series['orgs'].items() if o!='Public Service' and r.get(g,{}).get(y) and r[g][y][2] is not None and r[g][y][3]]
    return sum(1 for r in rows if r[2]/r[3]<=0.85),len(rows)
quoted(f"rose from {p1(ps['i']['2021'][2])}% in 2021 to {p1(ps['i']['2025'][2])}% in 2025, the smallest increase of the four groups on this page, and it fell in {moved('i')[1]} of the {moved('i')[2]} organizations")
assert ps['i']['2025'][2]-ps['i']['2021'][2]<min(ps[g]['2025'][2]-ps[g]['2021'][2] for g in 'vdb')
quoted(f"rose from {p1(ps['b']['2021'][2])}% in 2021 to {p1(ps['b']['2025'][2])}% in 2025, and it rose in {moved('b')[0]} of the {moved('b')[2]} organizations")
quoted(f"rose from {p1(ps['v']['2021'][2])}% in 2021 to {p1(ps['v']['2025'][2])}% in 2025, and it rose in {moved('v')[0]} of the {moved('v')[2]} organizations")
quoted(f"rose from {p1(ps['v']['2021'][3])}% to {p1(ps['v']['2025'][3])}% when Treasury Board added permanent residents")
quoted(f"In 2025, {marked('v','2025')[0]} of {marked('v','2025')[1]} organizations were at 0.85 or less of their own availability, compared with {marked('v','2021')[0]} of {marked('v','2021')[1]} in 2021")
quoted(f"rose from {p1(ps['d']['2021'][2])}% in 2021 to {p1(ps['d']['2025'][2])}% in 2025")
quoted(f"The availability estimate rose to {p1(ps['d']['2024'][3])}% in 2024")
quoted(f"In 2025, {marked('d','2025')[0]} of {marked('d','2025')[1]} organizations were at 0.85 or less")
shared={n for n in (o.get('site_name') for o in orgs) if n and sum(1 for x in orgs if x.get('site_name')==n)>1}
three=[(o,[(r.get(g,{}).get('2021'),r.get(g,{}).get('2025')) for g in 'idv']) for o,r in series['orgs'].items() if o!='Public Service']
three=[(o,v) for o,v in three if all(a and b and a[2] is not None and b[2] is not None for a,b in v)]
quoted(f"Of the {len(three)} organizations with published values for Indigenous employees, persons with disabilities and racialized employees in both 2021 and 2025, {sum(1 for o,v in three if all(b[2]>a[2] for a,b in v))} saw representation rise for all three groups and none saw it fall for all three")
assert not any(all(b[2]<a[2] for a,b in v) for o,v in three)
below=sorted(o for o,r in series['orgs'].items() if o!='Public Service' and all(r.get(g,{}).get('2025') and r[g]['2025'][2] is not None and r[g]['2025'][3] and r[g]['2025'][2]<r[g]['2025'][3] for g in 'idv'))
assert below==['National Defence','Royal Canadian Mounted Police (public service employees)','Secretariat of the National Security and Intelligence Committee of Parliamentarians','Veterans Affairs Canada'],f'organizations below availability for all three groups changed: {below}'
quoted('four organizations were below their own availability for all three groups')
big=sum(series['orgs'][o]['i']['2025'][0] for o in below if 'Secretariat' not in o)
assert 42000<big<43000 and series['orgs'][below[2]]['i']['2025'][0]==8
quoted('together employ more than 42,000 people. The Secretariat has 8 employees')
for o in orgs:
    if o.get('site_name') in below:
        g=(o['self_assessment'] or {}).get('goals')
        assert (g is None)==('Secretariat' in o['site_name']) and (g is None or (g['indigenous_recruitment']['status']==g['racialized_recruitment']['status']=='set')),f'goals changed: {o["id"]}'
def gap(g,keys):
    yes,no=[],[]
    for o in sa:
        n=o.get('site_name')
        if not n or n in shared or n not in series['orgs']:continue
        x,y=series['orgs'][n].get(g,{}).get('2021'),series['orgs'][n].get(g,{}).get('2025')
        if not x or not y or x[2] is None or y[2] is None:continue
        (yes if any(goal(o,k) for k in keys) else no).append(y[2]-x[2])
    r=lambda v:f'{(sum(v)/len(v))+1e-9:.1f}'
    return r(yes),len(yes),r(no),len(no)
gv,gb,gi=gap('v',['racialized_recruitment','racialized_promotion']),gap('b',['black_recruitment','black_promotion']),gap('i',['indigenous_recruitment','indigenous_promotion'])
quoted(f'rose by an average of {gv[0]} percentage points in the {gv[1]} organizations whose 2024 self-assessment reported a recruitment or promotion goal for racialized employees, and by {gv[2]} points in the {gv[3]} that did not')
assert gb[0]==gb[2];quoted(f'the average rise was {gb[0]} points in both groups ({gb[1]} and {gb[3]} organizations)')
quoted(f'it was {gi[0]} points where a goal was reported ({gi[1]} organizations) and {gi[2]} points where none was ({gi[3]})')
cpa,ex,fl=model['CPA'],model['EX'],model['FLOW25']
quoted(f"racialized employees were {p1(cpa['v'])}% of employees and {p1(ex['v'])}% of executives. Black employees were {p1(cpa['black'])}% of employees and {p1(ex['black'])}% of executives")
quoted(f"availability estimate for executive jobs ({p1(ex['wfa']['v'])}%)")
quoted(f"racialized employees received {p1(fl['v']['p'])}% of promotions and Black employees {p1(fl['black']['p'])}%, above their shares of employees")
assert fl['v']['p']>cpa['v'] and fl['black']['p']>cpa['black']
quoted(f"Indigenous employees made up {p1(fl['i']['h'])}% of people hired and {p1(fl['i']['s'])}% of people who left, compared with {p1(fl['i']['rep'])}% of employees")
quoted(f"racialized employees made up {p1(fl['v']['h'])}% of people hired and {p1(fl['v']['s'])}% of people who left")
sal={r[0]:r for r in model['SGSAL']}
quoted(f"{p1(sal['Black'][4])}% of Black employees earned $100,000 or more, compared with {p1(sal['All employees'][4])}% of all employees, and {p1(sal['Black'][2])}% were in the $50,000 to $74,999 band, compared with {p1(sal['All employees'][2])}%")
inuit=next(r for r in model['SUBG']['i']['rows'] if r['name']=='Inuit');other=model['SUBG']['d']['rows'][0]
quoted(f"There were {inuit['n']} Inuit employees in 2025, {p1(inuit['p'])}% of the workforce")
quoted(f"({p1(other['trend'][3])}% to {p1(other['trend'][-1])}%)")
e=model['EEG_DEPT']['Public Service'];yoy=model['YOY']['Public Service']
quoted(f"{e['black']['Q24']}% of Black employees said they would feel safe speaking about racism without fear of reprisal, compared with {e['nonrac']['Q24']}% of non-racialized employees")
quoted(f"({e['black']['Q65']}%, compared with {e['nonrac']['Q65']}%)")
quoted(f"harassment ({e['pwd']['Q58']}%) and discrimination ({e['pwd']['Q65']}%), compared with {e['nopwd']['Q58']}% and {e['nopwd']['Q65']}%")
quoted(f"rates of {e['ind']['Q58']}% and {e['ind']['Q65']}%, compared with {e['nonind']['Q58']}% and {e['nonind']['Q65']}%")
quoted(f"({e['pwd']['Q45']}%, compared with {e['nopwd']['Q45']}% of employees without disabilities)")
quoted(f"fell from {yoy['Q52']['a']}% in 2022 to {yoy['Q52']['b']}% in 2024")
quoted(f"({yoy['Q24']['a']}% to {yoy['Q24']['b']}%) and agreeing that the department implements anti-racism initiatives ({yoy['Q49']['a']}% to {yoy['Q49']['b']}%)")
quoted(f"feeling valued at work ({yoy['Q12']['a']}% to {yoy['Q12']['b']}%)")
quoted(f"Black employees ({e['black']['Q52']}%) and racialized employees ({e['rac']['Q52']}%) were more likely than non-racialized employees ({e['nonrac']['Q52']}%)")
quoted(f"Persons with disabilities ({e['pwd']['Q52']}%) and Indigenous employees ({e['ind']['Q52']}%) were less likely than their comparison groups ({e['nopwd']['Q52']}% and {e['nonind']['Q52']}%)")
plans=model['plans']
quoted(f"words for inclusion appear {sum(x['t'][2] for x in plans):,} times and words for diversity {sum(x['t'][3] for x in plans):,} times")
assert all(x['t'][2] and x['t'][3] for x in plans)
quoted(f"Words for anti-racism appear {sum(x['t'][0] for x in plans)} times, in {sum(1 for x in plans if x['t'][0])} of the {len(plans)} plans")
fy=lambda y:y[:5]+y[-2:]
last=max(y for y in psc['applicants'] if y in psc['appointments'])
quoted(f"In {fy(last)}, they were {p1(psc['applicants'][last]['v'])}% of applicants and {p1(psc['appointments'][last]['v'])}% of appointments")
both=[y for y in psc['appointments'] if y in psc['applicants']]
assert all(psc['appointments'][y]['v']<psc['applicants'][y]['v'] for y in both)
quoted(f'In every year from {fy(min(both))} to {fy(max(both))}, members of visible minorities made up a smaller share of appointments')
for cell in ['Black candidates</td><td class="num">10.3%','<td class="num">6.6%</td><td class="num below-mark">0.64</td>']:
    assert cell in explorer,f'audit figures changed in the data explorer: {cell}'
for name in ['gc-workspace.js','gc-workspace.css','index.html','call-to-action.html','call-to-action.js','staffing.html','staffing.js','gc-tools.js','data/call-to-action-letters.json','data/tbs-departmental-representation-2017-2025.json','data/snps-2025-by-organization.json','data/psc/catalogue.json','data/psc/psc-equity.json']:
    text=(ROOT/name).read_text()
    assert '—' not in text, f'em dash: {name}'
    assert not re.search(r'sk-[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9]',text),f'possible credential: {name}'
    for phrase in ['million-dollar','as requested','your instructions','make it perfect']:
        assert phrase not in text.lower(),f'internal wording: {name}'
subprocess.run(['node','scripts/check-workspace.mjs'],cwd=ROOT,check=True)
subprocess.run(['node','scripts/check-findings.js'],cwd=ROOT,check=True)
print(f'PASS: seven pages, local assets, JavaScript, published-data checksums, {meta["totalRows"]:,} branch rows, {len(index["docs"])} search entries, {len(orgs)} Call to Action records with {len(re.findall(chr(10)+" {level:'",ctajs))} conclusions checked against the data, {len(pcat['files'])} Public Service Commission files, and snapshot provenance')
