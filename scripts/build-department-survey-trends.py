#!/usr/bin/env python3
"""Build department survey results over time (PSES 2018 to 2024) from original rows.

Sources: the published "subset 1" file of each survey cycle, kept unchanged in this
repository (data/open-canada-2026-11/pses-*/). Only each cycle's own rows are used
(later files repeat earlier years). Department-level, all-respondent rows only.

Comparability rule: a question is followed back to an earlier cycle only when the
published English wording is identical after removing the question number and
normalizing spaces and quotation marks. Question numbers change between cycles, so
numbers are never used to match. Questions whose wording changed (for example the
harassment and discrimination questions, whose definitions changed) are listed as not
comparable. Values and response counts are copied as published; suppressed or blank
cells stay empty. Nothing is averaged, recalculated or carried forward.

Organizations are matched to site pages by their published names and the aliases in
assets/department-pages.json. Unmatched names are reported, never guessed.

Each question also carries the public service result for the same cycle and question
("ps"), from the same file's Public Service row.

Output: assets/department-survey-trends/<page id>.json and an index file.
Usage: build-department-survey-trends.py [--check]
"""
import csv, gzip, hashlib, json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/department-survey-trends'
CYCLES = [
    ('2018', 'pses-2018', '2018_PSES_SAFF_Subset-1_Sous-ensemble-1.csv.gz', {'2018'}),
    ('2019', 'pses-2019', '2019_PSES_SAFF_-20subset-1_Sous-ensemble-1.csv.gz', {'2019'}),
    ('2020', 'pses-2020', 'subset-1-sous-ensemble-1.csv.gz', {'2020'}),
    ('2022-23', 'pses-2022-2023', 'subset-1-2022_2023-pses-open-dataset-with-labels_sous-ensemble-1-ensemble-de-donnees-ouvertes-du.csv.gz', {'2022', '2023'}),
    ('2024', 'pses-2024', 'subset-1-sous-ensemble-1.csv.gz', {'2024'}),
]
FIELD_ALIASES = {'POSITIVE': ['POSITIVE', 'MOST_POSITIVE_OR_LEAST_NEGATIVE'],
                 'NEGATIVE': ['NEGATIVE', 'MOST_NEGATIVE_OR_LEAST_POSITIVE'],
                 'ANSWER1': ['ANSWER1', 'answer1']}
# Earlier survey cycles used shorter names for these organizations. Each pair names the
# same organization; Statistical Survey Operations is a separate employer and is not matched.
NAME_CROSSWALK = {
    'Crown-Indigenous Relations and Northern Affairs': 'cirnac',
    'Natural Sciences and Engineering Research Council': 'natural-sciences-and-engineering-research-council-of-canada',
    'Department for Women and Gender Equality': 'women-and-gender-equality-canada',
}
# 2008 to 2017 results as republished by the publisher in the 2019 subset 1 file, under
# the 2019 question numbers and wording (the publisher matched them to 2019 questions).
# The 2018 file republishes the same years with identical values for every common cell.
HIST = ['2008', '2011', '2014', '2017']
HIST_FILE = '2019'
NATIONAL = {'public service', 'federal public service', 'micro-organizations combined'}


def wording(t):
    t = re.sub(r'^\s*Question\s+[0-9]+[a-z]?\.\s*', '', t or '', flags=re.I)
    t = unicodedata.normalize('NFKC', t).replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', t).strip().lower()


def N(s):
    return re.sub('[^a-z0-9]', '', unicodedata.normalize('NFD', str(s)).encode('ascii', 'ignore').decode().lower())


def cell(row, field):
    for name in FIELD_ALIASES[field]:
        if name in row:
            v = (row[name] or '').strip()
            return '' if v in ('', '9999', '999') else v
    return ''


def main():
    index = json.loads((ROOT / 'assets/department-profile-index.json').read_text(encoding='utf-8'))
    definitions = index['definitions']
    pages = json.loads((ROOT / 'assets/department-pages.json').read_text(encoding='utf-8'))['organizations']
    by_name = {}
    known = {o['id'] for o in pages}
    for name, oid in NAME_CROSSWALK.items():
        assert oid in known, oid
        by_name.setdefault(N(name), set()).add(oid)
    for o in pages:
        for name in [o['en'], o['fr'], *o.get('aliases', [])]:
            by_name.setdefault(N(name), set()).add(o['id'])
    titles, values, sources, unmatched, national = {}, {}, {}, {}, {}
    for label, folder, name, years in CYCLES:
        path = ROOT / 'data/open-canada-2026-11' / folder / name
        meta = json.loads((ROOT / 'data/open-canada-2026-11' / folder / 'large-files.json').read_text(encoding='utf-8'))
        rec = next(f for f in meta['files'] if f['gz'] == name)
        if hashlib.sha256(gzip.decompress(path.read_bytes())).hexdigest() != rec['sha256']:
            sys.exit('Source file does not match its recorded checksum: ' + name)
        sources[label] = {'url': rec['url'], 'dataset': meta['dataset'], 'sha256': rec['sha256']}
        titles[label] = {}
        with gzip.open(path, 'rt', encoding='cp1252', newline='') as stream:
            for row in csv.DictReader(stream):
                hist = label == HIST_FILE and row['SURVEYR'] in HIST
                if row['SURVEYR'] not in years and not hist:
                    continue
                q = row['QUESTION']
                if not hist:
                    titles[label].setdefault(q, (row['TITLE_E'], row['TITLE_F']))
                cyc = row['SURVEYR'] if hist else label
                if (row.get('BYCOND') or '').strip():
                    continue
                if any(int(row[k] or 0) != 0 for k in ('LEVEL2ID', 'LEVEL3ID', 'LEVEL4ID', 'LEVEL5ID')):
                    continue
                dept = row['DEPT_E']
                if int(row['LEVEL1ID'] or 0) == 0 and dept.strip().lower() == 'public service':
                    v = {f: cell(row, f) for f in FIELD_ALIASES}
                    v['n'] = (row.get('ANSCOUNT') or '').strip()
                    national[(cyc, q)] = v
                    continue
                if dept.strip().lower() in NATIONAL or int(row['LEVEL1ID'] or 0) == 0:
                    continue
                ids = by_name.get(N(dept), set())
                if len(ids) != 1:
                    unmatched.setdefault(cyc, set()).add(dept)
                    continue
                key = (next(iter(ids)), cyc, q)
                v = {f: cell(row, f) for f in FIELD_ALIASES}
                v['n'] = (row.get('ANSCOUNT') or '').strip()
                if key in values and values[key] != v:
                    sys.exit(f'Conflicting original cells for {key}')
                values[key] = v
    # Follow each 2024 reading question back by identical wording.
    follow = {}
    for code, d in definitions.items():
        target = wording(titles['2024'].get(code, ('', ''))[0])
        follow[code] = {}
        for label, *_ in CYCLES:
            hits = [q for q, (te, _) in titles[label].items() if wording(te) == target]
            if len(hits) == 1:
                follow[code][label] = hits[0]
    for code, m in follow.items():
        if HIST_FILE in m:
            for h in HIST:
                m[h] = m[HIST_FILE]
    for h in HIST:
        sources[h] = {**sources[HIST_FILE], 'republishedIn': HIST_FILE}
    comparable = {c: m for c, m in follow.items() if len(m) >= 2}
    not_comparable = sorted(c for c, m in follow.items() if len(m) < 2)
    org_ids = sorted({k[0] for k in values})
    files = {}
    for oid in org_ids:
        rows = []
        for code, m in comparable.items():
            field = definitions[code]['field']
            per = {}
            for label, q in m.items():
                v = values.get((oid, label, q))
                if v is not None:
                    per[label] = [v[field], v['n'], q]
            if len(per) >= 2:
                ps = {label: [national[(label, q)][field], national[(label, q)]['n'], q] for label, q in m.items() if (label, q) in national}
                rows.append({'q': code, 'field': field, 'en': definitions[code]['en'], 'fr': definitions[code]['fr'], 'values': per, 'ps': ps})
        if rows:
            files[oid] = {'organization': oid, 'cycles': HIST + [c[0] for c in CYCLES], 'rows': rows, 'sources': sources,
                          'notComparable': not_comparable}
    if '--check' in sys.argv:
        for oid, data in files.items():
            p = OUT / (oid + '.json')
            if not p.exists() or json.loads(p.read_text(encoding='utf-8')) != data:
                sys.exit('Department survey trends are out of date: run scripts/build-department-survey-trends.py')
        print('DEPARTMENT SURVEY TRENDS: current;', len(files), 'organizations')
        return
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.json'):
        old.unlink()
    for oid, data in files.items():
        (OUT / (oid + '.json')).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    summary = {'schema': 1, 'method': __doc__.split('\n\n')[2].replace('\n', ' '), 'cycles': HIST + [c[0] for c in CYCLES],
               'comparableQuestions': {c: m for c, m in comparable.items()}, 'notComparable': not_comparable,
               'organizations': sorted(files), 'unmatchedNames': {k: sorted(v) for k, v in unmatched.items()}, 'sources': sources}
    (ROOT / 'assets/department-survey-trends.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('DEPARTMENT SURVEY TRENDS:', len(files), 'organizations,', len(comparable), 'comparable questions,',
          sum(len(f['rows']) for f in files.values()), 'question series; unmatched names per cycle:',
          {k: len(v) for k, v in unmatched.items()})


if __name__ == '__main__':
    main()
