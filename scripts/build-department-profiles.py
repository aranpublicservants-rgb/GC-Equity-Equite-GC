"""Build department-only PSES reading profiles from original published rows.

The 2024 overall source is already retained in this repository. Supply the
publisher's EEINFODV.csv with --groups to reproduce the employee-group extracts.
Only department-level 2024 rows are accepted. Conflicting duplicate cells fail.
No percentage, response count or suppressed value is reconstructed.
"""
import argparse
import base64
import csv
import gzip
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERALL = 'data/open-canada-2026-11/pses-2024/subset-1-sous-ensemble-1.csv.gz'
SOURCE = 'https://www.canada.ca/content/dam/tbs-sct/documents/datasets/ses-2025/EEINFODV.csv'
FIELDS = dict.fromkeys(['Q12','Q24','Q25','Q42','Q43','Q45','Q47','Q49','Q52','Q53','Q63','Q70','Q72','Q77','Q78','Q81','Q87','Q88'], 'POSITIVE')
FIELDS.update(dict.fromkeys(['Q58','Q65','Q84','Q85','Q86'], 'ANSWER1'))
FIELDS.update(dict.fromkeys(['Q44e','Q73p','Q73q','Q51'], 'NEGATIVE'))
args = argparse.ArgumentParser()
args.add_argument('--groups', type=Path, required=True)
opts = args.parse_args()
profiles, definitions = {}, {}
national = {'Public Service', 'Federal Public Service', 'Micro-organizations combined'}


def accept(row):
    return (row['SURVEYR'] == '2024' and row['DEPT_E'] not in national
            and (row['LEVEL2ID'] == '0' or row['LEVEL1ID'].lstrip('0') == '95')
            and all(row[k] == '0' for k in ['LEVEL3ID','LEVEL4ID','LEVEL5ID']))


def profile(row):
    name = row['DEPT_E']
    return profiles.setdefault(name, {'organization': name, 'fr': row['DEPT_F'],
                                     'period': '2024', 'overall': {}, 'groups': {}})


def put(target, q, value):
    if q in target and target[q] != value:
        raise ValueError('Conflicting original cells: '+q)
    target[q] = value


with gzip.open(ROOT / OVERALL, 'rt', encoding='cp1252', newline='') as stream:
    for row in csv.DictReader(stream):
        if accept(row) and not row['BYCOND'] and row['QUESTION'] in FIELDS:
            q = row['QUESTION']
            definitions[q] = {'en': row['TITLE_E'], 'fr': row['TITLE_F'], 'field': FIELDS[q]}
            put(profile(row)['overall'], q, [row[FIELDS[q]], row['ANSCOUNT']])

with opts.groups.open(encoding='cp1252', newline='') as stream:
    for row in csv.DictReader(stream):
        if accept(row) and row['QUESTION'] in FIELDS:
            record = profile(row)
            group = record['groups'].setdefault(row['DESCRIP_E'], {'fr': row['DESCRIP_F'], 'questions': {}})
            q = row['QUESTION']
            put(group['questions'], q, [row[FIELDS[q]], row['ANSCOUNT']])

index = {'schema': 1, 'period': '2024', 'definitions': definitions,
         'sources': {'groups': SOURCE, 'overall': OVERALL,
                     'overallPublisherUrl': 'https://www.canada.ca/content/dam/tbs-sct/documents/datasets/ses-2025/subset-1-sous-ensemble-1.csv',
                     'groupsSha256': hashlib.file_digest(opts.groups.open('rb'), 'sha256').hexdigest(),
                     'overallSha256': hashlib.sha256((ROOT / OVERALL).read_bytes()).hexdigest()},
         'method': 'Exact department-level 2024 source cells for 27 reading questions. Values and question response counts are retained as strings. Missing/suppressed values are never calculated. Groups overlap. These extracts do not reconcile the separate historical PSES assembly.',
         'organizations': {}}
folder = ROOT / 'data/department-profiles'
folder.mkdir(exist_ok=True)
for name, record in sorted(profiles.items()):
    slug = re.sub('[^a-z0-9]+', '-', name.lower()).strip('-')[:85]
    path = 'data/department-profiles/'+slug+'-'+hashlib.sha256(name.encode()).hexdigest()[:8]+'.json.gz.b64'
    data = json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()
    (ROOT / path).write_text(base64.b64encode(gzip.compress(data, mtime=0)).decode()+'\n')
    index['organizations'][name] = {'fr': record['fr'], 'path': path,
                                  'groups': len(record['groups']),
                                  'overallQuestions': len(record['overall']),
                                  'groupCells': sum(len(g['questions']) for g in record['groups'].values()),
                                  'sha256': hashlib.sha256(data).hexdigest()}
expected = {entry['path'] for entry in index['organizations'].values()}
for candidate in folder.glob('*.json.gz.b64'):
    if candidate.relative_to(ROOT).as_posix() not in expected:
        candidate.unlink()
(ROOT / 'assets/department-profile-index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2)+'\n')
print('Built',len(profiles),'department-only profiles;',sum(v['groupCells'] for v in index['organizations'].values()),'original group cells')
