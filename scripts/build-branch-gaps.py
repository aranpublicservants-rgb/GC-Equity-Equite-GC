#!/usr/bin/env python3
"""Build the question 65 comparisons between employee groups in the same branch.

Every percentage and answer count is a published cell of the 2024 Public Service Employee
Survey file EELEVEL2ID.csv, as split by organization in data/pses-2024-branches. A comparison
is kept only when the survey published the yes share for both groups of a pair in the same
branch. Blank cells and cells coded 9999 are left out, never treated as zero, and no count
is derived from a percentage.

    python3 scripts/build-branch-gaps.py          rebuild the JSON and CSV
    python3 scripts/build-branch-gaps.py --check  verify the committed files against the source
"""
import csv
import gzip
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/pses-2024-branch-gaps'
JSON_OUT = OUT / 'q65.json'
CSV_OUT = OUT / 'q65.csv'
QUESTION = 'Q65'
WORKBOOK = ROOT / 'data/open-canada-2026-11/pses-2024/pses2024-supporting-documentation.xlsx'

# The same pairs and labels as the branch tool on each department page. Keys are the source
# category names, including the source spelling of the 2SLGBTQIA+ category.
PAIRS = [
    ('Indigenous', 'Indigenous and non-Indigenous employees', 'Employés autochtones et non autochtones'),
    ('Black', 'Black employees and employees who are not Black', 'Employés noirs et employés qui ne sont pas noirs'),
    ('Racialized', 'Racialized and non-racialized employees', 'Employés racisés et non racisés'),
    ('Persons with disability', 'Employees with and without a disability', 'Personnes en situation de handicap et sans handicap'),
    ('2SLBGTQIA+', '2SLGBTQIA+ employees and employees who are not 2SLGBTQIA+', 'Personnes 2ELGBTQIA+ et personnes qui ne le sont pas'),
    ('Woman', 'Women and employees who are not women', 'Femmes et personnes qui ne sont pas des femmes'),
    ('Executives', 'Executives and non-executives', 'Cadres supérieurs et autres employés'),
    ('Middle Managers', 'Middle managers and other employees', 'Gestionnaires intermédiaires et autres employés'),
    ('First official language', 'First official language: English and French', 'Première langue officielle : anglais et français'),
]

SOURCES = {
    'dataset': {
        'en': 'https://open.canada.ca/data/en/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f',
        'fr': 'https://ouvert.canada.ca/data/fr/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f',
    },
    'file': 'https://www.canada.ca/content/dam/tbs-sct/documents/datasets/pses-2024/EELEVEL2ID.csv',
    'documentation': 'https://www.canada.ca/content/dam/tbs-sct/documents/datasets/ses-2025/'
                     '2024%20PSES%20Supporting%20Documentation-Documents%20de%20r%C3%A9f%C3%A9rence%20du%20SAFF%202024.xlsx',
    'documentationCopy': 'data/open-canada-2026-11/pses-2024/pses2024-supporting-documentation.xlsx',
}

# Question 65 answer options and groupings, as listed in the 2024 supporting documentation
# (sheets RESPONSE OPTIONS DE RÉPONSES and POSITIVE_NEUTRAL_NEGATIVE_AGREE).
ANSWER = {'position': 1, 'en': 'Yes', 'fr': 'Oui'}


def published(value, percent):
    if value is None or value == '' or str(value) == '9999':
        return False
    try:
        number = float(value)
    except (TypeError, ValueError):
        return False
    return number >= 0 and (not percent or number <= 100)


def verify_documentation():
    """Confirm the answer labels from the archived workbook when openpyxl is available."""
    try:
        import openpyxl
    except ImportError:
        return False
    book = openpyxl.load_workbook(WORKBOOK, read_only=True)
    options = {r[0]: r for r in book['RESPONSE OPTIONS DE RÉPONSES'].iter_rows(values_only=True) if r and r[0]}
    groups = {r[0]: r for r in book['POSITIVE_NEUTRAL_NEGATIVE_AGREE'].iter_rows(values_only=True) if r and r[0]}
    row = options[QUESTION]
    assert (row[1], row[2], row[11], row[12]) == ('Yes', 'No', 'Oui', 'Non'), row
    assert str(groups[QUESTION][5]) == '1' and str(groups[QUESTION][6]) == '1', groups[QUESTION]
    return True


def build():
    index = json.loads((ROOT / 'assets/department-branch-index.json').read_text(encoding='utf-8'))
    meta = json.loads((ROOT / 'assets/department-branch-definitions.json').read_text(encoding='utf-8'))
    schema = meta['schema']
    field = {name: 3 + schema.index(name) for name in ['ANS1', 'MOSTNEG', 'AGREE', 'ANSCOUNT']}
    question = next(i for i, q in enumerate(meta['questions']) if q['id'] == QUESTION)
    members = {}
    for i, d in enumerate(meta['demographics']):
        members.setdefault(d['category'], {})[int(d['code'].split('=')[1])] = i
    pairs = []
    for key, en, fr in PAIRS:
        first, second = members[key][1], members[key][2]
        label = lambda m, lang: meta['demographics'][m][lang].strip()
        pairs.append({'key': key, 'en': en, 'fr': fr,
                      'first': {'en': label(first, 'en'), 'fr': label(first, 'fr'), 'code': meta['demographics'][first]['code']},
                      'second': {'en': label(second, 'en'), 'fr': label(second, 'fr'), 'code': meta['demographics'][second]['code']},
                      '_members': (first, second)})
    assert len({p['key'] for p in pairs}) == len(pairs) == len(members), 'every source category has one pair'

    organizations, rows, without = [], [], []
    for slug, rec in sorted(index.items(), key=lambda kv: kv[1]['en']):
        data = json.loads(gzip.decompress((ROOT / 'data/pses-2024-branches' / (rec['id'] + '.json.gz')).read_bytes()))
        assert len(data) == rec['count'], slug
        lookup = {}
        for r in data:
            if r[2] != question:
                continue
            yes = r[field['ANS1']]
            # Question 65 has two answers. The survey groups answer 1 (yes) as both the negative
            # and the affirmative answer, so the three published columns must agree.
            if any(published(r[field[n]], True) for n in ['ANS1', 'MOSTNEG', 'AGREE']):
                assert yes == r[field['MOSTNEG']] == r[field['AGREE']], (slug, r)
            if published(r[field['ANSCOUNT']], False):
                assert float(r[field['ANSCOUNT']]) % 5 == 0, (slug, r)
            lookup[(str(r[0]), r[1])] = r
        branches, used = [], {}
        for b in rec['branches']:
            for p_index, p in enumerate(pairs):
                a, c = (lookup.get((b['id'], m)) for m in p['_members'])
                if not (a and c and published(a[field['ANS1']], True) and published(c[field['ANS1']], True)):
                    continue
                if b['id'] not in used:
                    used[b['id']] = len(branches)
                    branches.append([b['id'], b['en'].strip(), b['fr'].strip()])
                count = lambda r: int(r[field['ANSCOUNT']]) if published(r[field['ANSCOUNT']], False) else None
                rows.append([len(organizations), used[b['id']], p_index,
                             int(a[field['ANS1']]), count(a), int(c[field['ANS1']]), count(c)])
        if branches:
            organizations.append({'slug': slug, 'code': rec['id'], 'en': rec['en'].strip(), 'fr': rec['fr'].strip(), 'branches': branches})
        else:
            without.append({'slug': slug, 'en': rec['en'].strip(), 'fr': rec['fr'].strip()})
    for p in pairs:
        del p['_members']
    org_names = [o['en'] for o in organizations]
    rows.sort(key=lambda r: (-abs(r[3] - r[5]), -min(r[4] or 0, r[6] or 0), org_names[r[0]],
                             organizations[r[0]]['branches'][r[1]][1], r[2]))
    q = meta['questions'][question]
    payload = {
        'schema': 1,
        'question': {'id': QUESTION, 'en': q['en'].strip(), 'fr': q['fr'].strip()},
        'answer': ANSWER,
        'sources': SOURCES,
        'coverage': {'organizations': len(index), 'withComparisons': len(organizations), 'without': without},
        'pairs': pairs,
        'organizations': organizations,
        'columns': ['organization', 'branch', 'pair', 'firstYesPercent', 'firstAnswers', 'secondYesPercent', 'secondAnswers'],
        'rows': rows,
    }
    text = json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n'

    out = io.StringIO()
    writer = csv.writer(out, lineterminator='\r\n')
    writer.writerow(['organization_en', 'organization_fr', 'level1id', 'branch_en', 'branch_fr', 'level2id',
                     'groups_en', 'groups_fr',
                     'first_group_en', 'first_group_fr', 'first_group_condition', 'first_group_yes_percent', 'first_group_answers',
                     'second_group_en', 'second_group_fr', 'second_group_condition', 'second_group_yes_percent', 'second_group_answers',
                     'difference_points_first_minus_second', 'question'])
    for o, b, p, fy, fn, sy, sn in rows:
        org, branch, pair = organizations[o], organizations[o]['branches'][b], pairs[p]
        writer.writerow([org['en'], org['fr'], org['code'], branch[1], branch[2], branch[0], pair['en'], pair['fr'],
                         pair['first']['en'], pair['first']['fr'], pair['first']['code'], fy, '' if fn is None else fn,
                         pair['second']['en'], pair['second']['fr'], pair['second']['code'], sy, '' if sn is None else sn,
                         fy - sy, QUESTION])
    return text, '\ufeff' + out.getvalue(), payload


if __name__ == '__main__':
    text, table, payload = build()
    if '--check' in sys.argv:
        assert JSON_OUT.read_bytes() == text.encode('utf-8'), 'q65.json differs from the source. Run scripts/build-branch-gaps.py.'
        assert CSV_OUT.read_bytes() == table.encode('utf-8'), 'q65.csv differs from the source. Run scripts/build-branch-gaps.py.'
        print(f"PASS: {len(payload['rows']):,} question 65 branch comparisons match the published source cells")
    else:
        verified = verify_documentation()
        OUT.mkdir(parents=True, exist_ok=True)
        JSON_OUT.write_bytes(text.encode('utf-8'))
        CSV_OUT.write_bytes(table.encode('utf-8'))
        print(f"Wrote {len(payload['rows']):,} comparisons in {payload['coverage']['withComparisons']} organizations"
              + ('' if verified else ' (answer labels not re-read: openpyxl unavailable)'))
