#!/usr/bin/env python3
"""Check the 2017 results republished in the 2019 PSES file against the original 2017 file.

The department results-over-time tables use the 2008 to 2017 figures the publisher
republished in the 2019 subset 1 file. The original 2017 subset 1 file is now held
(data/register-gaps-2026-11, register entry GC-0018). For every department-level,
all-respondent cell with the same organization and identical question wording, the
positive, negative and response-count values must be identical; every question the
site follows back to 2017 must have identical wording in the original file.
"""
import csv, gzip, io, json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def norm(t):
    t = re.sub(r'^\s*Question\s+[0-9]+[a-z]?\.\s*', '', t or '', flags=re.I)
    t = unicodedata.normalize('NFKC', t).replace('’', "'")
    return re.sub(r'\s+', ' ', t).strip().lower()


man = json.loads((ROOT / 'data/register-gaps-manifest.json').read_text(encoding='utf-8'))
entry = next((e for e in man['entries'] if e['id'] == 'GC-0018'), None)
f = entry and next((x for x in entry['files'] if x.get('stored') and x.get('path')), None)
if not f:
    sys.exit('Original 2017 subset 1 copy (GC-0018) not found')
text = gzip.decompress((ROOT / f['path']).read_bytes()).decode('cp1252')
orig = {}
for row in csv.DictReader(io.StringIO(text, newline='')):
    if row['SURVEYR'] == '2017' and not row['BYCOND'].strip() and int(row['LEVEL2ID'] or 0) == 0:
        orig[(row['Dept_E'].strip(), norm(row['TITLE_E']))] = (row['POSITIVE'], row['NEGATIVE'], row['ANSCOUNT'])
rep, t19 = {}, {}
with gzip.open(ROOT / 'data/open-canada-2026-11/pses-2019/2019_PSES_SAFF_-20subset-1_Sous-ensemble-1.csv.gz', 'rt', encoding='cp1252', newline='') as s:
    for row in csv.DictReader(s):
        if row['SURVEYR'] == '2019':
            t19.setdefault(row['QUESTION'], norm(row['TITLE_E']))
        elif row['SURVEYR'] == '2017' and not row['BYCOND'].strip() and int(row['LEVEL2ID'] or 0) == 0:
            rep[(row['DEPT_E'].strip(), norm(row['TITLE_E']))] = (row['POSITIVE'], row['NEGATIVE'], row['ANSCOUNT'])
common = set(orig) & set(rep)
bad = [k for k in common if orig[k] != rep[k]]
summary = json.loads((ROOT / 'assets/department-survey-trends.json').read_text(encoding='utf-8'))
wording = {norm(t) for (_, t) in orig}
used = {c: m['2017'] for c, m in summary['comparableQuestions'].items() if '2017' in m}
reworded = [c for c, q in used.items() if t19.get(q) not in wording]
print(f'HISTORICAL 2017: {len(common):,} cells compared with the original file, {len(bad)} differ; '
      f'{len(used)} site questions use 2017, {len(reworded)} with different original wording')
if bad or reworded:
    sys.exit(f'Differences: {bad[:5]} reworded: {reworded}')
