#!/usr/bin/env python3
"""Repeatable source + publishing audit for the public GC Equity repository.

This deliberately distinguishes repository inventory from the historical Google
Drive package. A file listed in the Drive source manifest is not considered
live unless its declared GitHub path exists. No missing data are inferred.
"""
import csv
import gzip
import hashlib
import json
import pathlib
import re
import subprocess
from collections import Counter
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
errors, warnings = [], []
csv.field_size_limit(10_000_000)

class HTMLAudit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.id_values = []
        self.h1 = []
        self.attrs = []
        self.topics = []
        self.scripts = []
        self.current_h1 = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:self.id_values.append(a['id'])
        if tag == 'h1':self.current_h1=True
        if tag == 'a' and 'gce-primary-choice' in a.get('class',''):self.topics.append(a.get('href'))
        if tag in ('a','script','link'):
            dest = a.get('href') or a.get('src')
            if dest:self.attrs.append((tag,dest))
        if tag == 'script' and a.get('src'):self.scripts.append(a['src'])
    def handle_data(self, text):
        if self.current_h1:self.h1.append(text)
    def handle_endtag(self, tag):
        if tag == 'h1':self.current_h1=False

html_files = sorted(p for p in ROOT.rglob('*.html') if '.git' not in p.parts)
js_files = sorted(p for p in ROOT.rglob('*.js') if '.git' not in p.parts)
css_files = sorted(p for p in ROOT.rglob('*.css') if '.git' not in p.parts)
csv_files = sorted(p for p in ROOT.rglob('*.csv') if '.git' not in p.parts)
json_files = sorted(p for p in ROOT.rglob('*.json') if '.git' not in p.parts)

for path in html_files:
    html = path.read_text(encoding='utf-8-sig')
    parser = HTMLAudit()
    parser.feed(html)
    if len(parser.id_values) != len(set(parser.id_values)):
        errors.append('Duplicate IDs: '+str(path.relative_to(ROOT)))
    if path == ROOT/'index.html':
        if parser.topics != ['#department-data','#equity-data']:
            errors.append('Homepage must have exactly two same-page choices')
        if 'org-topic-picker' not in parser.id_values or 'public-topic-picker' not in parser.id_values:
            errors.append('Missing primary topic selectors')
        if len(parser.h1) < 1:
            errors.append('Homepage needs a single visible main title')
        for script in ('gc-workspace.js','gc-dashboard.js','gc-org-sources.js','gc-data-library.js'):
            if script not in parser.scripts:errors.append('Homepage script missing: '+script)
    for tag,dest in parser.attrs:
        u=urlsplit(dest)
        if u.scheme or dest.startswith('//') or not u.path:continue
        if u.path.startswith('/'):
            # These may be root-absolute links to other deployments.
            continue
        candidate = (path.parent/unquote(u.path)).resolve()
        if not candidate.is_relative_to(ROOT):errors.append('Relative link escapes repository: '+dest)
        elif not candidate.exists() and tag in ('script','link'):
            errors.append('Missing local script/styles: '+str(path.relative_to(ROOT))+' -> '+dest)
        elif not candidate.exists() and tag=='a':
            warnings.append('Missing local document/resource: '+str(path.relative_to(ROOT))+' -> '+dest)

visitor_sources=[ROOT/'index.html',ROOT/'gc-dashboard.js',ROOT/'gc-data-library.js',ROOT/'gc-restored-sources.js',ROOT/'gc-org-sources.js']
for path in visitor_sources:
    if not path.exists():continue
    page_text=path.read_text(encoding='utf-8').lower()
    for phrase in ('our conversation','our previous discussion','you asked me','as requested','my earlier response','chat history','user instructions','previous conversations','you told me to','the user asked'):
        if phrase in page_text:
            errors.append('Private conversation or development wording in visitor source: '+str(path.relative_to(ROOT))+' : '+phrase)

for path in js_files:
    result=subprocess.run(['node','--check',str(path)],capture_output=True,text=True)
    if result.returncode:errors.append('JavaScript syntax: '+str(path.relative_to(ROOT))+' :: '+result.stderr.splitlines()[-1])

for path in json_files:
    try:json.loads(path.read_text(encoding='utf-8-sig'))
    except Exception as e:errors.append('Invalid JSON: '+str(path.relative_to(ROOT))+' :: '+str(e))

csv_columns={}
for path in csv_files:
    try:
        with path.open(newline='',encoding='utf-8-sig') as f:
            reader=csv.reader(f)
            cols=next(reader,[])
            if len(cols)<2:warnings.append('CSV has fewer than two columns: '+str(path.relative_to(ROOT)))
            if len(cols)!=len(set(cols)):
                warnings.append('CSV duplicate header names: '+str(path.relative_to(ROOT)))
            csv_columns[path.relative_to(ROOT).as_posix()]=len(cols)
    except Exception as e:errors.append('Unparseable CSV header: '+str(path.relative_to(ROOT))+' :: '+str(e))

coverage=json.loads((ROOT/'assets/data-coverage-audit.json').read_text())
counts=Counter(r['status'] for r in coverage['drive']['rows'])
if sum(counts.values()) != 157:errors.append('Historical Drive manifest count changed')
if dict(counts) != coverage['drive']['counts']:errors.append('Historical Drive status counts inconsistent')
for kind,n in [('psc',55),('women',26),('other',9)]:
    items=coverage['hostedAdditional'][kind]
    if len(items)!=n:errors.append(f'{kind} source inventory should have {n} entries')
    for entry in items:
        if entry['path'] not in csv_columns:errors.append('Missing hosted source: '+entry['path'])
index=json.loads((ROOT/'assets/psc-organization-index.json').read_text())
if len(index['files'])!=17:errors.append('Department PSC source index should contain 17 files')
for entry in index['files']:
    if not (ROOT/'data/psc'/entry['file']).is_file():
        errors.append('Missing indexed departmental CSV: '+entry['file'])
branches=list((ROOT/'data/pses-2024-branches').glob('*.json.gz'))
branch_meta=re.search(r'<script type="application/json" id="eq-branch-meta">(.*?)</script>',(ROOT/'explorer.html').read_text(),re.S)
if not branch_meta:errors.append('Branch metadata is missing from explorer')
else:
    expected={str(d['id']) for d in json.loads(branch_meta.group(1))['departments']}
    actual={p.name.split('.')[0] for p in branches}
    if expected!=actual:errors.append('Branch assets differ from the exact published department IDs: missing '+str(sorted(expected-actual))+' extra '+str(sorted(actual-expected)))
for path in branches:
    try:
        with gzip.open(path,'rt',encoding='utf-8') as f:
            # Gzip CRC is checked when the stream is read to exhaustion.
            while f.read(1024*1024):pass
    except Exception as e:errors.append('Corrupt branch data file: '+path.name+' '+str(e))

# All imported tables must belong to the exact original source register.
source_registry={r['name']:r for r in json.loads((ROOT/'scripts/archived-source-registry.json').read_text())['files']}
restored_path=ROOT/'assets/restored-datasets.json'
if restored_path.exists():
    restored=json.loads(restored_path.read_text())
    restored_count=0
    restored_rows=0
    total_parts=0
    for entry in restored.get('files',[]):
        name=entry['originalName']
        original=source_registry.get(name)
        if original is None:
            errors.append('Restored source was never in the verified original dataset register: '+name)
            continue
        if entry['archivedSha256']!=original['sha256']:
            errors.append('Restored source checksum does not match original register: '+name)
        restored_rows+=int(entry['rows'])
        if entry.get('partitions'):
            parts=entry['partitions']
            total_parts+=len(parts)
            if sum(int(v['rows']) for v in parts.values())!=int(entry['rows']):
                errors.append('Source-partition row count mismatch: '+name)
            for org,part in parts.items():
                path=ROOT/part['path']
                if not path.exists():errors.append('Missing original complete source partition: '+part['path'])
                elif path.stat().st_size>100_000_000:errors.append('Source partition exceeds GitHub file limit: '+part['path'])
        else:
            path=ROOT/entry.get('path','')
            if not path.is_file():errors.append('Restored complete source missing: '+name)
            if name=='f5efcbba_imputation_estimates.csv' and path.is_file():
                checksum=hashlib.sha256(path.read_bytes()).hexdigest()
                if checksum!=original['sha256']:errors.append('Original derived imputation source bytes do not match SHA-256')
                if path.stat().st_size!=original['bytes']:errors.append('Original derived imputation source size mismatch')
        restored_count+=1
    if restored_count!=len(source_registry):
        errors.append(f'Complete source coverage regression: {restored_count}/{len(source_registry)}')
    if restored_rows!=10200710:
        errors.append(f'Imported row count changed unexpectedly: {restored_rows}')
    if total_parts!=2927:
        errors.append(f'Organization partition count changed unexpectedly: {total_parts}')
    print('COMPLETE-SOURCE-AUDIT:',restored_count,'of',len(source_registry),'original source files;',restored_rows,'source rows;',total_parts,'organization partitions')
    # Every complete imported source must be accessible in exactly the applicable
    # homepage area: named employer records in Department and agency, other source
    # tables and explicitly published Federal Public Service survey partitions in
    # Equity across the public service. No default-to-national substitution.
    source_view=(ROOT/'gc-data-library.js').read_text(encoding='utf-8')
    employer_view=(ROOT/'gc-restored-sources.js').read_text(encoding='utf-8')
    source_scope=json.loads((ROOT/'assets/organization-source-scopes.json').read_text(encoding='utf-8'))
    complete=restored['files']
    assert len(complete)==69, 'Complete imported source manifest is not 69 files'
    employer_files=[e for e in complete if e.get('organizationField') or e.get('dataset')=='Employment Equity']
    public_files=[e for e in complete if not e.get('organizationField') and e.get('dataset')!='Employment Equity']
    assert len(employer_files)==49 and len(public_files)==20, 'Original source scope mapping changed unexpectedly'
    psea=[e for e in public_files if e.get('dataset')=='Employment Equity Designated Groups under the Public Service Employment Act']
    assert len(psea)==5, 'Published employment-equity staffing datasets missing from public service area'
    aggregate=[e for e in employer_files if any(k.casefold()=='federal public service' for k in e.get('partitions',{}))]
    assert len(aggregate)==41, 'Published federal public service survey source partitions missing'
    for marker_text in ('const publicSurvey=','const complete=','federalpublicservice'):
        if marker_text not in source_view:errors.append('Public service source viewer no longer includes: '+marker_text)
    if "GCERestoredSources={render}" not in employer_view:
        errors.append('Original departmental source viewer is no longer connected')
    if len(source_scope.get('scopeOverrides',[]))!=2:
        errors.append('Employer-only employment equity source scope overrides missing')
    print('PUBLISHED-SOURCE-VIEWS:',len(employer_files),'employer-identified sources,',
          len(public_files),'complete non-employer sources,',
          len(aggregate),'published federal-service survey partitions; 5 PSEA equity staffing files')


print('REPOSITORY-PUBLISHING-AUDIT',json.dumps({
    'htmlFiles':len(html_files),'javascriptFiles':len(js_files),
    'cssFiles':len(css_files),'csvFiles':len(csv_files),'jsonFiles':len(json_files),
    'pscFiles':len(coverage['hostedAdditional']['psc']),
    'womenFiles':len(coverage['hostedAdditional']['women']),
    'tbsAndDerivedFiles':len(coverage['hostedAdditional']['other']),
    'branchGzipFiles':len(branches),'historicalDriveManifest':dict(counts),
    'warnings':len(warnings),'errors':len(errors)
},ensure_ascii=False))
for message in warnings[:40]:print('AUDIT-WARNING:',message)
if len(warnings)>40:print('AUDIT-WARNING:',len(warnings)-40,'additional warning(s) not printed')
for message in errors:print('AUDIT-ERROR:',message)
if errors:raise SystemExit(1)
