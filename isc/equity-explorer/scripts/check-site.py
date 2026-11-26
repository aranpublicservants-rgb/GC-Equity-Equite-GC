#!/usr/bin/env python3
"""Check source integrity, ISC scope and the facts used by the interface."""
import base64
import csv
import gzip
import hashlib
import io
import json
from pathlib import Path
from html.parser import HTMLParser
import subprocess

ROOT = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT / path).read_text())
def require(condition, message):
    if not condition:
        raise AssertionError(message)

catalogue = read('data/catalogue.json')
files = catalogue['files']
ids = {f['id'] for f in files}
require(len(ids) == len(files), 'Duplicate source IDs')
require(sum(f['rows'] for f in files) == catalogue['records'], 'Catalogue record count')
tables = {}
employer_fields = {'organization', 'department_en', 'organization_e', 'organization_f',
                  'department_e', 'department_f', 'dept_f', 'dept_e', 'Department',
                  'DEPT_E', 'DEPT_F', 'organization_en', 'organization_fr',
                  'Department or agency', 'department_or_agency', 'Organization'}
aliases = {'Indigenous Services Canada', 'Department of Indigenous Services',
           'Department of Indigenous Services Canada', 'Services aux Autochtones Canada',
           'Services aux autochtones Canada', 'Ministère des Services aux Autochtones du Canada'}
for f in files:
    payload = gzip.decompress(base64.b64decode((ROOT / f['path']).read_bytes()))
    if f['format'] == 'dictionary-json.gz.b64':
        require(hashlib.sha256(payload).hexdigest() == f['encodedSha256'], f['id'] + ' dictionary hash')
        d = json.loads(payload)
        rows = [d['headers']] + [[d['values'][i][v] for i, v in enumerate(r)] for r in d['rows']]
        output = io.StringIO(newline='')
        csv.writer(output, lineterminator='\n').writerows(rows)
        canonical = output.getvalue().encode('utf-8')
    else:
        require(f['format'] == 'csv.gz.b64', 'Unexpected format')
        canonical = payload
        rows = list(csv.reader(io.StringIO(payload.decode('utf-8-sig'))))
    require(hashlib.sha256(canonical).hexdigest() == f['sha256'], f['id'] + ' source hash')
    headers, body = rows[0], rows[1:]
    require(len(body) == f['rows'], f['id'] + ' row count')
    require(all(len(r) == len(headers) for r in body), f['id'] + ' column widths')
    for i, h in enumerate(headers):
        if h in employer_fields:
            require({str(r[i]) for r in body} <= aliases, f['id'] + ' foreign employer')
        if h == 'LEVEL1ID':
            require({str(r[i]) for r in body} == {'17'}, f['id'] + ' employer ID')
    if f['id'] in {'source-a2e4ddf5f38c', 'pses-2024-branches', 'source-be334a7752e6', 'source-ea7677867d57'}:
        tables[f['id']] = [dict(zip(headers, row)) for row in body]

summary = read('data/survey-summary.json')
official = {(r['DESCRIP_E'], r['QUESTION']): r for r in tables['source-a2e4ddf5f38c']}
require(len(summary['groups']) == 165, 'Published employee groups')
checked = 0
for group, values in summary['groups'].items():
    for q, cell in values['questions'].items():
        row = official[(group, q)]
        require(row['SURVEYR'] == '2024' and all(row['LEVEL'+str(n)+'ID'] == '0' for n in range(2, 6)), 'Direct department scope')
        require(cell['value'] == row[summary['definitions'][q]['field']], group + ' ' + q + ' percentage')
        require((cell['n'] or '') == row['ANSCOUNT'], group + ' ' + q + ' respondent base')
        checked += 1

facts = read('data/visuals.json')
require(facts['population'] == 8389, 'ISC EE population')
require(facts['collection'] == {'files': len(files), 'records': catalogue['records']}, 'UI collection totals')
overall_source = {(r['SURVEYR'], r['QUESTION']): r for r in tables['source-be334a7752e6']}
for q, cell in facts['overall'].items():
    row = overall_source[('2024', q)]
    require(cell['value'] == row[summary['definitions'][q]['field']], 'ISC overall ' + q)
    require((cell['n'] or '') == row['ANSCOUNT'], 'ISC overall respondent base ' + q)
require(facts['overall']['Q42']['value'] == '46', 'ISC recourse result')
require(facts['overall']['Q72'] == {'value': '11', 'n': '205'}, 'ISC Q72 overall result')
for group in ['Indigenous', 'Black', 'Racialized', 'Person with a disability', '2SLGBTQIA+', 'Woman', 'Man']:
    require(summary['groups'][group]['questions']['Q72']['value'] == 'X', 'Q72 group suppression')
require(summary['groups']['Person with a disability']['questions']['Q58']['value'] == '30', 'ISC disability harassment')
require(summary['groups']['Black']['questions']['Q65']['value'] == '15', 'ISC Black discrimination')
for group in facts['representation']:
    require(len(group['values']) == len(group['counts']) == len(facts['years']), 'Trend lengths')
    if group['id'] == 'black':
        require(group['counts'][-1] == 380 and group['values'][-1] == 4.5 and group['wfa'] is None, 'ISC Black employees and benchmark')
require([x['total'] for x in facts['fte']] == [8619, 8018, 7567], 'ISC FTEs')
require(all(sum(x['values']) == x['total'] for x in facts['fte']), 'FTE component totals')

branches = read('data/branch-summary.json')
require(len(branches['branches']) == 11 and len(branches['groups']) == 18, 'Branch and demographic coverage')
direct = {(r['Branch ID'], r['Employee group (English)'], r['Question']): r for r in tables['pses-2024-branches']}
branch_checked = 0
for bid, groups in branches['cells'].items():
    for gid, questions in groups.items():
        group = next(g for g in branches['groups'] if g['id'] == gid)
        for q, cell in questions.items():
            row = direct[(bid, group['en'], q)]
            require(('' if cell['value'] is None else str(cell['value'])) == row[branches['questions'][q]['field']], 'Branch percentage')
            require(('' if cell['n'] is None else str(cell['n'])) == row['ANSCOUNT'], 'Branch respondent base')
            branch_checked += 1

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.links=[]; self.assets=[]; self.sections=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'a': self.links.append(a.get('href', ''))
        if tag == 'script' and a.get('src'): self.assets.append(a['src'])
        if tag == 'link' and a.get('rel') == 'stylesheet': self.assets.append(a['href'])
        if tag == 'section': self.sections += 1
html = (ROOT / 'index.html').read_text()
page = Page(); page.feed(html)
require(len(page.ids) == len(set(page.ids)), 'Duplicate HTML IDs')
require(page.sections == 34, 'Bilingual section coverage')
for href in page.links:
    if href.startswith('#'): require(href[1:] in page.ids, 'Missing anchor: ' + href)
    elif href and not href.startswith(('https:', 'http:', 'mailto:')): require((ROOT / href.split('?')[0]).exists(), 'Missing local file: ' + href)
for asset in page.assets: require((ROOT / asset).exists(), 'Missing asset: ' + asset)
for filename in ['index.html', 'explore.js', 'guide-model.js', 'isc-tools.js']:
    text=(ROOT / filename).read_text()
    require(all(x not in text for x in ['Coast Guard', 'Garde côtière', '13,924', '14,880', 'kakyze', '__FILE_COUNT__', '—']), 'Stale or private text: ' + filename)
subprocess.run(['node', str(ROOT / 'scripts/check-models.js')], check=True, cwd=ROOT)
print(f'PASS: {len(files)} source files, {catalogue["records"]:,} source rows, {checked:,} direct group cells, {branch_checked:,} direct branch cells; bilingual links and assets.')
