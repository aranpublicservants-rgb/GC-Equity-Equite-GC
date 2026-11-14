#!/usr/bin/env python3
"""Repeatable source + publishing audit for the public GC Equity repository.

This deliberately distinguishes repository inventory from the historical Google
Drive package. A file listed in the Drive source manifest is not considered
live unless its declared GitHub path exists. No missing data are inferred.
"""
import csv
import gzip
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
