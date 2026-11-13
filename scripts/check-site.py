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

for name in ['index.html','equity.html','branch-equity.html','explorer.html','sources.html','call-to-action.html','staffing.html','departmental-plans-2026-27/index.html','women-femmes/index.html']:
    p=ROOT/name;html=p.read_text();page=Page();page.feed(html)
    assert len(page.ids)==len(set(page.ids)),f'duplicate static IDs: {name}'
    assert 'gc-workspace.js' in html and 'gc-workspace.css' in html,f'shared tools missing: {name}'
    for asset in page.assets:
        if not urlsplit(asset).scheme:assert (p.parent/unquote(urlsplit(asset).path)).is_file(),f'missing asset {name}: {asset}'
    for script in page.scripts:
        with tempfile.NamedTemporaryFile(suffix='.js',mode='w') as f:
            f.write(script);f.flush();subprocess.run(['node','--check',f.name],check=True,capture_output=True)
    assert p.stat().st_size<2_500_000,f'page too large: {name}'
# Two homepage links lead to the two sections of the same page.
home_html=(ROOT/'index.html').read_text()
assert 'href="#department-data"' in home_html, 'department anchor missing'
assert 'href="#equity-data"' in home_html, 'public service-wide anchor missing'
assert 'id="org-picker"' in home_html, 'organization selector missing'
assert 'id="org-output"' in home_html, 'inline organization tables missing'
assert 'id="public-output"' in home_html, 'inline public service-wide tables missing'
assert 'gc-dashboard.js' in home_html and 'gc-dashboard.css' in home_html, 'dashboard assets missing'
assert 'Browse below' not in home_html and 'Open the second page' not in home_html, 'navigation instructions leaked onto visitor page'

for name in ['gc-workspace.js','gc-dashboard.js','gc-ai.js','gc-equity-additions.js','gc-tools.js','call-to-action.js','staffing.js','women-femmes/assets/site.js','lib/pptxgen.bundle.js']:
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
# The findings on the Call to Action page quote figures from data/call-to-action-comparisons.json. Recalculate that file,
# then check each finding against it; a change in the data fails here until the wording is updated.
subprocess.run(['python3','scripts/build-cta-comparisons.py','--check'],cwd=ROOT,check=True)
from decimal import Decimal,ROUND_HALF_UP
ctajs=(ROOT/'call-to-action.js').read_text()
comp=json.loads((ROOT/'data/call-to-action-comparisons.json').read_text())
findings=json.loads(subprocess.run(['node','scripts/check-findings.js','--json'],cwd=ROOT,check=True,capture_output=True,text=True).stdout)
assert len(findings)==12
def h1(v):
    return str(Decimal(str(v)).quantize(Decimal('0.1'),rounding=ROUND_HALF_UP))
def p3(v):
    return str(Decimal(str(v)).quantize(Decimal('0.001'),rounding=ROUND_HALF_UP))
def sg(v):
    t=h1(abs(v));return ('+' if v>0 else '−' if v<0 else '')+t
def quoted(i,text):
    f=findings[i];en=' '.join([f['t'][0],f['b'][0],f['e'][0]])
    assert text in en,f'Call to Action finding {i+1} no longer matches the data: {text}'
C={(c['feature'],c['outcome']):c for c in comp['comparisons']}
rank={'strong':0,'moderate':1,'limited':2}
assert [rank[f['level']] for f in findings]==sorted(rank[f['level']] for f in findings),'findings are not ordered from the strongest link to the weakest'
assert all(f['src'][-1]=='comparisons' for f in findings)
sc=comp['scan']
assert f"Across {sc['comparisons']:,} comparisons of this kind, {sc['at_5_percent']} met the usual 5% threshold for a difference, while chance alone would produce about {sc['expected_by_chance']}," in ctajs
assert '3,000 times' in comp['method'][3] and 'reshuffles 3,000 times which organizations reported the action' in ctajs
rp,dc,gl=comp['reporting'],comp['documents'],comp['goals']
quoted(0,f"Bias or anti-racism training was among the commitments in {rp['bias_training']['letters']} of the {dc['letters']} letters in 2021 and in the progress reported in {rp['bias_training']['self_assessments']} of the {dc['self_assessments']} self-assessments in 2024.")
quoted(0,f"Of the {dc['both']} organizations that have both documents, {rp['bias_training']['both_documents']} described training in 2021 and {rp['bias_training']['both_documents_2024']} of them described it again in 2024.")
quoted(0,f"Action plans or strategies went from {rp['plan']['letters']} letters to {rp['plan']['self_assessments']} self-assessments, and listening sessions from {rp['listening']['letters']} to {rp['listening']['self_assessments']}.")
quoted(0,f"Sponsorship programs went the other way, from {rp['sponsorship']['letters']} letters to {rp['sponsorship']['self_assessments']} self-assessments, and data or dashboards from {rp['data']['letters']} to {rp['data']['self_assessments']}.")
assert all(rp[k]['letters']>rp[k]['self_assessments'] for k in ['bias_training','plan','listening']) and all(rp[k]['letters']<rp[k]['self_assessments'] for k in ['sponsorship','data'])
gi,gv,gd=gl['G_indigenous_recruitment_set'],gl['G_racialized_recruitment_set'],gl['disability_self_assessment_organizations']
quoted(1,f"Of the {gi['organizations']} organizations that reported having set an Indigenous recruitment goal and have published figures, {gi['organizations']-gi['below_availability_2023']} were already at or above their Indigenous availability in 2023.")
quoted(1,f"Of the {gv['organizations']} that reported having set a racialized recruitment goal, {gv['organizations']-gv['below_availability_2023']} were at or above their availability.")
quoted(1,f"Persons with disabilities were below availability in {gd['below_availability_2023']} of the {gd['organizations']} organizations that completed a self-assessment")
share=lambda k:gl[k]['below_availability_2023']/gl[k]['organizations']
assert share('disability_self_assessment_organizations')>max(share('indigenous_self_assessment_organizations'),share('racialized_self_assessment_organizations'))
assert all(set(o['self_assessment']['goals'])=={'indigenous_recruitment','black_recruitment','racialized_recruitment','indigenous_promotion','black_promotion','racialized_promotion','inclusion'} for o in orgs if o['self_assessment'])
def moderate(c):
    assert c['level']=='moderate' and c['holds_in_each_size_group'] and c['p']<0.05 and abs(c['adjusted_t'])>=2,f"no longer moderate: {c['feature']} {c['outcome']}"
def limited(c):
    assert c['level']=='limited' and not (c['p']<0.05 and c['holds_in_each_size_group']),f"no longer limited: {c['feature']} {c['outcome']}"
c=C['E_bias_training','snps_rac_STA_14A'];moderate(c);b=c['bands']
quoted(2,f"In the {c['n1']} organizations that reported bias or anti-racism training in their 2021 letter or 2024 self-assessment, {h1(c['mean1'])}% of racialized respondents")
quoted(2,f"In the {c['n0']} organizations that did not report such training, the share was {h1(c['mean0'])}%.")
assert b[0]['n0']<2 and b[1]['diff']<0 and b[2]['diff']<0
quoted(2,f"The difference holds among organizations of 500 to 4,999 employees ({h1(-b[1]['diff'])} points) and of 5,000 or more ({h1(-b[2]['diff'])} points), passes the chance check (p = {p3(c['p'])})")
c=C['E_self_id','chg_d'];moderate(c)
quoted(3,f"In the {c['n1']} organizations that reported a self-identification campaign in 2021 or 2024, representation of persons with disabilities rose by {h1(c['mean1'])} points from 2021 to 2025, on average, compared with {h1(c['mean0'])} points in the {c['n0']} organizations that did not.")
quoted(3,f"(p = {p3(c['p'])})")
c=C['L_leadership_dev','yoy_Q52'];moderate(c)
assert c['mean1']<0 and c['mean0']<0 and c['baseline1']>c['baseline0'] and c['adjusted']<0
quoted(4,f"In the {c['n1']} organizations whose 2021 letters described leadership or talent development programs, the share of employees who said the Call to Action had a positive impact fell by {h1(-c['mean1'])} points from 2022 to 2024, on average. In the {c['n0']} organizations whose letters did not, it fell by {h1(-c['mean0'])} points. The first group started slightly higher in 2022 ({h1(c['baseline1'])}% compared with {h1(c['baseline0'])}%).")
quoted(4,f"(p = {p3(c['p'])}) and, after accounting for size and 2022 levels, the drop is still {h1(-c['adjusted'])} points larger.")
a,c=C['E_black','pses_Q52'],C['E_black','eeg_black_Q52'];moderate(a);limited(c)
assert a['mean1']>a['mean0'] and c['mean1']<c['mean0'] and not c['holds_in_each_size_group'] and c['p']>=0.05
quoted(5,f"In the {a['n1']} organizations whose letter or self-assessment named Black employees, {h1(a['mean1'])}% of employees said the Call to Action had a positive impact in 2024, on average, compared with {h1(a['mean0'])}% in the {a['n0']} organizations that did not.")
quoted(5,f"Among Black employees, the shares were {h1(c['mean1'])}% and {h1(c['mean0'])}% ({c['n1']} and {c['n0']} organizations with published results for Black employees).")
quoted(5,f"(p = {p3(a['p'])})")
c=C['G_racialized_recruitment','gap_rac_Q45'];moderate(c)
assert c['mean1']>0>c['mean0']
quoted(6,f"In the {c['n1']} organizations whose 2024 self-assessment reported that a recruitment goal for racialized employees was set, the share of racialized employees who believe they have opportunities for promotion was {h1(c['mean1'])} points higher than among non-racialized employees")
quoted(6,f"In the {c['n0']} organizations that had not set such a goal, it was {h1(-c['mean0'])} points lower.")
quoted(6,f"(p = {p3(c['p'])})");quoted(6,f"Only {c['n0']} organizations had not set a racialized recruitment goal.")
c=C['E_esr','pses_Q52'];moderate(c)
quoted(7,f"In the {c['n1']} organizations that reported an employment systems review in 2021 or 2024, {h1(c['mean1'])}% of employees said the Call to Action had a positive impact in 2024, on average, compared with {h1(c['mean0'])}% in the {c['n0']} organizations that did not.")
quoted(7,f"(p = {p3(c['p'])})")
i,v,b=C['G_indigenous_recruitment','chg2325_i'],C['G_racialized_recruitment','chg2325_v'],C['G_black_recruitment','chg2325_b']
for x in (i,v,b):limited(x);assert x['p']>=0.05
quoted(8,f"Indigenous representation changed by {sg(i['mean1'])} points where a recruitment goal was set ({i['n1']} organizations) and by {sg(i['mean0'])} points where none was set ({i['n0']}).")
quoted(8,f"For racialized employees the changes were {sg(v['mean1'])} and {sg(v['mean0'])} points ({v['n1']} and {v['n0']} organizations), and for Black employees {sg(b['mean1'])} and {sg(b['mean0'])} points ({b['n1']} and {b['n0']}).")
quoted(8,f"only {i['n0']} of the organizations compared had not set an Indigenous recruitment goal.")
v,h=C['L_targeted_recruitment','chg_v'],C['L_targeted_recruitment','psc_chg']
for x in (v,h):limited(x);assert x['p']>=0.05
assert h['n1']==h['n0'] and not h['holds_in_each_size_group']
quoted(9,f"In the {v['n1']} organizations whose 2021 letters described targeted recruitment, inventories or outreach, racialized representation rose by {h1(v['mean1'])} points from 2021 to 2025, on average, compared with {h1(v['mean0'])} points in the {v['n0']} that did not.")
quoted(9,f"rose by {h1(h['mean1'])} points in these organizations and by {h1(h['mean0'])} points in the others ({h['n1']} organizations in each group).")
r,b=C['E_sponsorship','gap_rac_Q45'],C['E_sponsorship','gap_black_Q45']
for x in (r,b):limited(x);assert x['p']>=0.05 and x['mean1']>0>x['mean0']
assert not b['holds_in_each_size_group']
quoted(10,f"In the {r['n1']} organizations that reported sponsorship programs in 2021 or 2024, the share of racialized employees who believe they have opportunities for promotion was {h1(r['mean1'])} points higher than among non-racialized employees, on average, compared with {h1(-r['mean0'])} points lower in the {r['n0']} organizations that did not.")
quoted(10,f"For Black employees, the differences were {h1(b['mean1'])} points higher and {h1(-b['mean0'])} points lower ({b['n1']} and {b['n0']} organizations).")
c=C['E_exec_accountability','pses_Q52'];limited(c)
assert c['p']>=0.05 and c['bands'][0]['diff']>0 and all(x['diff']<=0 for x in c['bands'][1:])
quoted(11,f"In the {c['n1']} organizations that reported equity commitments in executive performance agreements in 2021 or 2024, {h1(c['mean1'])}% of employees said the Call to Action had a positive impact in 2024, on average, compared with {h1(c['mean0'])}% in the {c['n0']} organizations that did not.")
for cell in ['Black candidates</td><td class="num">10.3%','<td class="num">6.6%</td><td class="num below-mark">0.64</td>']:
    assert cell in explorer,f'audit figures changed in the data explorer: {cell}'
for name in ['gc-workspace.js','gc-workspace.css','gc-dashboard.css','gc-dashboard.js','index.html','call-to-action.html','call-to-action.js','staffing.html','staffing.js','gc-tools.js','data/call-to-action-letters.json','data/call-to-action-comparisons.json','data/tbs-departmental-representation-2017-2025.json','data/snps-2025-by-organization.json','data/psc/catalogue.json','data/psc/psc-equity.json']:
    text=(ROOT/name).read_text()
    assert '—' not in text, f'em dash: {name}'
    assert not re.search(r'sk-[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9]',text),f'possible credential: {name}'
    for phrase in ['million-dollar','as requested','your instructions','make it perfect']:
        assert phrase not in text.lower(),f'internal wording: {name}'
subprocess.run(['node','scripts/check-workspace.mjs'],cwd=ROOT,check=True)
subprocess.run(['node','scripts/check-findings.js'],cwd=ROOT,check=True)
print(f'PASS: all published pages, local assets, JavaScript, published-data checksums, {meta["totalRows"]:,} branch rows, {len(index["docs"])} search entries, {len(orgs)} Call to Action records with {len(findings)} findings checked against the data, {len(pcat['files'])} Public Service Commission files, and snapshot provenance')
