"""Check employer isolation, original PSES cells, suppression and source parity."""
import base64
import csv
import gzip
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
index = json.loads((ROOT / 'assets/department-profile-index.json').read_text())
profiles = {}
for name, entry in index['organizations'].items():
    raw = gzip.decompress(base64.b64decode((ROOT / entry['path']).read_bytes()))
    assert hashlib.sha256(raw).hexdigest() == entry['sha256'], name
    record = json.loads(raw)
    assert record['organization'] == name and record['period'] == '2024'
    assert name not in ['Public Service','Federal Public Service','Micro-organizations combined']
    assert len(record['overall']) == entry['overallQuestions']
    assert len(record['groups']) == entry['groups']
    assert sum(len(g['questions']) for g in record['groups'].values()) == entry['groupCells']
    for questions in [record['overall'],*[g['questions'] for g in record['groups'].values()]]:
        assert set(questions) <= set(index['definitions'])
        assert all(len(a) == 2 and all(isinstance(v,str) for v in a) for a in questions.values())
    profiles[name] = record

checked = 0
with gzip.open(ROOT / index['sources']['overall'], 'rt', encoding='cp1252', newline='') as stream:
    for row in csv.DictReader(stream):
        q, name = row['QUESTION'], row['DEPT_E']
        if row['SURVEYR'] == '2024' and name in profiles and q in index['definitions'] and not row['BYCOND']:
            field = index['definitions'][q]['field']
            assert profiles[name]['overall'][q] == [row[field],row['ANSCOUNT']], (name,q)
            checked += 1
assert checked == sum(e['overallQuestions'] for e in index['organizations'].values())

# Existing dedicated profiles are independent retained extracts of the source.
for folder, name in [('dfo','Fisheries and Oceans Canada'),('dnd','National Defence')]:
    source = json.loads((ROOT / folder / 'data/survey-summary.json').read_text())
    for group, record in source['groups'].items():
        for q, result in record['questions'].items():
            assert profiles[name]['groups'][group]['questions'][q] == [result['value'],result['n'] or ''], (folder,group,q)
assert profiles['Fisheries and Oceans Canada']['groups']['Black']['questions']['Q72'] == ['0','15']
assert profiles['Fisheries and Oceans Canada']['groups']['Indigenous']['questions']['Q72'][0] == 'X'
assert profiles['Indigenous Services Canada']['overall'] != profiles['Fisheries and Oceans Canada']['overall']
assert profiles['Indigenous Services Canada']['overall'] != profiles['National Defence']['overall']

if '--groups' in sys.argv:
    path = Path(sys.argv[sys.argv.index('--groups')+1]); count = 0
    assert hashlib.file_digest(path.open('rb'),'sha256').hexdigest() == index['sources']['groupsSha256']
    with path.open(encoding='cp1252',newline='') as stream:
        for row in csv.DictReader(stream):
            name,q = row['DEPT_E'],row['QUESTION']
            if (row['SURVEYR'] == '2024' and name in profiles and q in index['definitions']
                and (row['LEVEL2ID']=='0' or row['LEVEL1ID'].lstrip('0')=='95')
                and all(row[k]=='0' for k in ['LEVEL3ID','LEVEL4ID','LEVEL5ID'])):
                field=index['definitions'][q]['field']
                assert profiles[name]['groups'][row['DESCRIP_E']]['questions'][q] == [row[field],row['ANSCOUNT']], (name,q)
                count += 1
    assert count == sum(e['groupCells'] for e in index['organizations'].values())
    print('PASS:',count,'employee-group cells match the original publisher file')
print('PASS:',len(profiles),'isolated employer profiles;',checked,'original overall cells; DFO/DND parity; suppressed vs zero')
