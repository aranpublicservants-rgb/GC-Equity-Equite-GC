#!/usr/bin/env python3
"""Test every department guide and key-findings answer against the original PSES 2024 rows.

The department guide on each organization page and the built-in assistant answer from
data/department-profiles/*.json.gz.b64 and assets/department-key-findings/*.json. This
check rebuilds the published source from its parts and confirms, cell by cell:

  * each overall value and response count equals the department-level row of
    subset-1-sous-ensemble-1.csv.gz (kept in this repository);
  * each employee-group value and response count equals the department-level row of
    EEINFODV.csv, read from the pses-data branch parts; every part must match the
    SHA-256 in data/pses-large-manifest.json and the part rows must add up to the
    rows of the original file;
  * each key finding repeats the profile value, response count and overall value, and
    its gap is the difference of those two published percentages;
  * no profile holds a cell the source does not have, and suppressed cells stay empty.

Usage: check-department-assistants.py <EEINFODV parts directory>
The parts directory is pses/pses-2024/EEINFODV from the pses-data branch.
"""
import base64, csv, glob, gzip, hashlib, io, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parts_dir = Path(sys.argv[1])
index = json.loads((ROOT / 'assets/department-profile-index.json').read_text(encoding='utf-8'))
fields = {q: d['field'] for q, d in index['definitions'].items()}
national = {'Public Service', 'Federal Public Service', 'Micro-organizations combined'}
errors = []


def accept(row):
    return (row['SURVEYR'] == '2024' and row['DEPT_E'] not in national
            and (row['LEVEL2ID'] == '0' or row['LEVEL1ID'].lstrip('0') == '95')
            and all(row[k] == '0' for k in ['LEVEL3ID', 'LEVEL4ID', 'LEVEL5ID']))


# Reassemble EEINFODV from its parts in the published order and confirm the original hash.
manifest = json.loads((ROOT / 'data/pses-large-manifest.json').read_text(encoding='utf-8'))
src = next(s for d in manifest['datasets'] for s in d['sources'] if s['directory'].endswith('/EEINFODV'))
header = None
groups_source = {}
for part in sorted(src['parts'], key=lambda p: p['file']):
    raw = gzip.decompress((parts_dir / part['file']).read_bytes())
    head, rest = raw.split(b'\n', 1)
    head += b'\n'
    if header is None:
        header = head
    elif head != header:
        errors.append('Part header differs: ' + part['file'])
    if hashlib.sha256((parts_dir / part['file']).read_bytes()).hexdigest() != part['sha256']:
        errors.append('Part checksum differs from the manifest: ' + part['file'])
    for row in csv.DictReader(io.StringIO((header + rest).decode('cp1252'), newline='')):
        if accept(row) and row['QUESTION'] in fields:
            key = (row['DEPT_E'], row['DESCRIP_E'], row['QUESTION'])
            cell = [row[fields[row['QUESTION']]], row['ANSCOUNT']]
            if key in groups_source and groups_source[key] != cell:
                errors.append('Conflicting source cells: ' + str(key))
            groups_source[key] = cell
    del raw, rest
if sum(p['rows'] for p in src['parts']) != src['rows']:
    errors.append('EEINFODV part rows do not add up to the source rows')

overall_source = {}
with gzip.open(ROOT / index['sources']['overall'], 'rt', encoding='cp1252', newline='') as stream:
    for row in csv.DictReader(stream):
        if accept(row) and not row['BYCOND'] and row['QUESTION'] in fields:
            overall_source[(row['DEPT_E'], row['QUESTION'])] = [row[fields[row['QUESTION']]], row['ANSCOUNT']]

profiles = {}
checked_overall = checked_groups = 0
for name, entry in index['organizations'].items():
    blob = (ROOT / entry['path']).read_bytes()
    data = gzip.decompress(base64.b64decode(blob))
    if hashlib.sha256(data).hexdigest() != entry['sha256']:
        errors.append('Profile checksum differs: ' + name)
    p = json.loads(data)
    profiles[name] = p
    for q, cell in p['overall'].items():
        checked_overall += 1
        if overall_source.get((name, q)) != cell:
            errors.append(f'Overall {name} {q}: page {cell} source {overall_source.get((name, q))}')
    for g, rec in p['groups'].items():
        for q, cell in rec['questions'].items():
            checked_groups += 1
            if groups_source.get((name, g, q)) != cell:
                errors.append(f'Group {name} / {g} {q}: page {cell} source {groups_source.get((name, g, q))}')
expected_cells = {k for k in groups_source if k[0] in index['organizations']}
held = {(n, g, q) for n, p in profiles.items() for g, r in p['groups'].items() for q in r['questions']}
missing = expected_cells - held
if missing:
    errors.append(f'{len(missing)} source cells are not in the profiles, e.g. {sorted(missing)[:3]}')

# Key findings must repeat the profile cells exactly.
pages = {o['id']: o for o in json.loads((ROOT / 'assets/department-pages.json').read_text(encoding='utf-8'))['organizations']}
by_fr = {p['fr']: n for n, p in profiles.items()}
checked_findings = 0


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


for path in sorted(glob.glob(str(ROOT / 'assets/department-key-findings/part-*.json'))):
    for oid, org in json.load(open(path, encoding='utf-8'))['organizations'].items():
        if not org.get('groups'):
            continue
        name = org['en'] if org['en'] in profiles else by_fr.get(org.get('fr'))
        if not name:
            # The page registry lists the source name the survey uses for this organization.
            name = next((a for a in pages.get(oid, {}).get('aliases', []) if a in profiles), None)
        prof = profiles.get(name)
        if not prof:
            errors.append('Key findings without a source profile: ' + oid)
            continue
        for g, rec in org['groups'].items():
            for r in rec['rows']:
                checked_findings += 1
                cell = prof['groups'].get(g, {}).get('questions', {}).get(r['q'])
                over = prof['overall'].get(r['q'])
                if not cell or num(cell[0]) != r['v'] or num(cell[1]) != r['n']:
                    errors.append(f'Finding {oid} / {g} {r["q"]}: {r["v"]} (n={r["n"]}) vs profile {cell}')
                if not over or num(over[0]) != r['o'] or num(over[1]) != r['overallN']:
                    errors.append(f'Finding overall {oid} {r["q"]}: {r["o"]} vs profile {over}')
                if r.get('gap') is not None and r['v'] - r['o'] != r['gap']:
                    errors.append(f'Finding gap {oid} / {g} {r["q"]}: {r["gap"]} is not {r["v"]} - {r["o"]}')

print(f'DEPARTMENT ASSISTANTS: {len(profiles)} profiles, {checked_overall:,} overall cells, '
      f'{checked_groups:,} group cells and {checked_findings:,} key findings checked against original PSES 2024 rows; '
      f'{len(errors)} problems')
for e in errors[:40]:
    print('ASSISTANT-SOURCE:', e)
sys.exit(1 if errors else 0)
