"""Check DFO source integrity, employer isolation, suppression and page structure."""
import base64
import csv
import gzip
import hashlib
import io
import json
import pathlib
import re
import subprocess
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
DFO = ROOT / 'dfo'
catalogue = json.loads((DFO / 'data/catalogue.json').read_text())
official = None
total = 0
for item in catalogue['files']:
    path = (DFO / item['path']).resolve()
    assert path.is_file(), item['path']
    encoded = path.read_bytes()
    if item['format'].endswith('.b64'):
        encoded = base64.b64decode(encoded)
    decoded = gzip.decompress(encoded)
    if item['format'] == 'branch-json.gz':
        rows = json.loads(decoded)
        assert len(rows) == item['rows']
        assert all(len(row) == 3 + len(item['schema']) for row in rows)
    else:
        if item['format'] == 'dictionary-json.gz.b64':
            assert hashlib.sha256(decoded).hexdigest() == item['encodedSha256']
            record = json.loads(decoded)
            headers = record['headers']
            rows = [[record['values'][i][value] for i, value in enumerate(row)] for row in record['rows']]
        else:
            reader = csv.reader(io.StringIO(decoded.decode('utf-8-sig')))
            headers = next(reader)
            rows = list(reader)
        if item['format'].endswith('.b64'):
            buf = io.StringIO(newline='')
            writer = csv.writer(buf, lineterminator='\n')
            writer.writerow(headers)
            writer.writerows(rows)
            assert hashlib.sha256(buf.getvalue().encode()).hexdigest() == item['sha256'], item['id']
        elif item.get('sha256'):
            assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], item['id']
        for field in ['DEPT_E', 'dept_e', 'department_e', 'Department']:
            if field in headers:
                ix = headers.index(field)
                assert all(row[ix] == 'Fisheries and Oceans Canada' for row in rows), (item['id'], field)
        if item['sourceFile'] == 'official/EEINFODV-dfo.csv':
            official = [dict(zip(headers, row)) for row in rows]
    assert len(rows) == item['rows'], item['id']
    total += len(rows)
assert total == catalogue['records']
assert official is not None
assert all(row['SURVEYR'] == '2024' and row['LEVEL1ID'] in ['05', '5'] and all(row[k] == '0' for k in ['LEVEL2ID', 'LEVEL3ID', 'LEVEL4ID', 'LEVEL5ID']) for row in official)

summary = json.loads((DFO / 'data/survey-summary.json').read_text())
source = {(row['DESCRIP_E'], row['QUESTION']): row for row in official}
for group, record in summary['groups'].items():
    for question, result in record['questions'].items():
        field = summary['definitions'][question]['field']
        row = source[group, question]
        assert result['value'] == row[field], (group, question, field)
        assert (result['n'] or '') == (row.get('ANSCOUNT') or ''), (group, question, 'response count')
assert summary['groups']['Black']['questions']['Q24']['value'] == '58'
assert summary['groups']['Black']['questions']['Q72'] == {'value': '0', 'n': '15'}
assert summary['groups']['Indigenous']['questions']['Q72']['value'] == 'X'
assert summary['groups']['Person with a disability']['questions']['Q86']['value'] == '71'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.anchors = []
        self.sections = 0
        self.tables = 0
        self.captions = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        if tag == 'a' and attrs.get('href', '').startswith('#'):
            self.anchors.append(attrs['href'][1:])
        if tag == 'section': self.sections += 1
        if tag == 'table': self.tables += 1
        if tag == 'caption': self.captions += 1

page = Page()
text = (DFO / 'index.html').read_text()
page.feed(text)
assert len(page.ids) == len(set(page.ids))
assert all(anchor in page.ids for anchor in page.anchors)
assert page.sections == 30 and page.tables == page.captions
assert not re.search(r'kakyze|Coast Guard scopeily|35 respondents|few dozen', text, re.I)
for name in ['app.js', 'site.css', 'action-tracker-en.csv', 'action-tracker-fr.csv']:
    assert (DFO / name).is_file()
subprocess.run(['node', '--check', str(DFO / 'app.js')], check=True)
print(f'PASS: {len(catalogue["files"])} DFO source files, {total:,} records, all source hashes, employer isolation, official summary cells, suppression, bilingual sections, anchors and captions')
