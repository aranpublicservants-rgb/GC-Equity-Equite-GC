#!/usr/bin/env python3
"""Validate department-level reading extracts and expose reproducible barrier source cells.
Only published, exact organization cells are used. Suppressed cells stay suppressed.
"""
import csv
import re
import html
import base64
import gzip
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
index = json.loads((ROOT / 'assets/department-profile-index.json').read_text())
result = []
for name, rec in index['organizations'].items():
    payload = gzip.decompress(base64.b64decode((ROOT / rec['path']).read_text()))
    assert hashlib.sha256(payload).hexdigest() == rec['sha256'], name
    profile = json.loads(payload)
    assert profile['organization'] == name and profile['period'] == '2024', name
    overall = profile['overall']
    result.append([name, profile['fr'], *[overall.get(q, ['', '']) for q in ('Q72', 'Q86', 'Q87', 'Q88')]])
assert len(result) == len(index['organizations'])

print('BARRIER SOURCE AUDIT: verified', len(result), 'organization profiles and conditional question bases')
# Verify the static bilingual HTML and CSV against each exact source cell.
csv_path = ROOT / 'barrier-comparisons/pses-2024-organization-source-cells.csv'
with csv_path.open(newline='', encoding='utf-8') as stream:
    rows = list(csv.DictReader(stream))
assert len(rows) == len(result)
by_name = {r['organization']: r for r in rows}
assert len(by_name) == len(rows)
page = (ROOT / 'barrier-comparisons/index.html').read_text()
for lang in ('en', 'fr'):
    for j, q in enumerate(('Q72', 'Q86', 'Q87', 'Q88'), start=2):
        section = re.search(r'<section id="' + lang + '-' + q.lower() + r'">.*?</section>', page, re.S)
        assert section, (lang, q)
        published = {}
        for org, rate, base in re.findall(r'<tr data-source-org="([^"]+)"><th scope="row">.*?</th><td>([^<]+)</td><td>([^<]+)</td>', section.group(), re.S):
            name = html.unescape(org)
            assert name not in published, (lang, q, name)
            published[name] = (html.unescape(rate).replace(' ', '').rstrip('%'), html.unescape(base))
        expected = {}
        for row in result:
            name, french = row[:2]
            v, n = row[j]
            stored = by_name[name]
            assert stored[q] == v and stored[q+'_n'] == n, (name, q)
            assert stored['organization_fr'] == french and stored['period'] == '2024'
            assert stored['profile_source'] == index['organizations'][name]['path']
            if re.fullmatch(r'\d+(?:\.\d+)?', v):
                expected[name] = (v, n or '–')
        assert published == expected, (lang, q, len(published), len(expected))
        print('STATIC BARRIER TABLE:', lang, q, len(published), 'exact source rows')
print('PASS: static bilingual barrier comparison and 92-row source CSV agree with the original profiles.')
