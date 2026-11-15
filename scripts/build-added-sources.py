#!/usr/bin/env python3
"""Index the open.canada.ca files added in November 2026.

Reads data/open-canada-2026-11/ and writes assets/added-sources.json. The files are
stored byte for byte as downloaded. Nothing is recalculated: the index records paths,
sizes, SHA-256 values, column names and, for tables with an organization column, how
many published rows name each organization.
"""
import csv, hashlib, io, json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/open-canada-2026-11'
PORTAL = 'https://open.canada.ca/data/en/dataset/'
TBS = ['Treasury Board of Canada Secretariat', 'Secrétariat du Conseil du Trésor du Canada']

def norm(s):
    s = unicodedata.normalize('NFD', s or '')
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    s = re.sub(r'[^a-z0-9]+', '', s)
    return re.sub(r'civilianstaffonly|publicserviceemployees', '', s)

def text(path):
    raw = path.read_bytes()
    try:
        return raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        return raw.decode('cp1252', errors='replace')

def table(path):
    rows = [r for r in csv.reader(io.StringIO(text(path))) if any(c != '' for c in r)]
    return [h.strip() for h in rows[0]], rows[1:]

def rel(path):
    return path.relative_to(ROOT).as_posix()

errors = []
files = []
for p in sorted(BASE.rglob('*')):
    if p.is_file():
        files.append({'path': rel(p), 'bytes': p.stat().st_size,
                      'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})

# 1. Tables with one row per published record -------------------------------
tables, orgs = [], {}
POP = BASE / 'tbs-fps-population-2010-2026'
PREFIX = 'population-of-the-federal-public-service-'
for en in sorted(POP.glob('*-en.csv')):
    fr = en.with_name(en.name[:-7] + '-fr.csv')
    if not fr.is_file():
        errors.append('No French file for ' + en.name); continue
    he, re_ = table(en); hf, rf = table(fr)
    if len(re_) != len(rf) or len(he) != len(hf):
        errors.append('English and French files differ in shape: ' + en.name); continue
    # A table is indexed only when both language files hold the same year and value on
    # every row. Where they differ, one file can show a count the other suppresses.
    if any(a[0] != b[0] or a[-1] != b[-1] for a, b in zip(re_, rf)):
        errors.append('English and French rows differ, table not indexed: ' + en.name); continue
    tid = en.name[len(PREFIX):-7] or 'total'
    drop = {he[0], he[-1], 'Universe'}
    dims_en = [h for h in he if h not in drop]
    dims_fr = [hf[i] for i, h in enumerate(he) if h not in drop]
    years = sorted({r[0] for r in re_})
    field_en = 'Department or agency' if 'Department or agency' in he else None
    entry = {
        'id': 'fps-' + tid, 'scope': 'org' if field_en else 'all',
        'measure': [he[-1], hf[-1]],
        'titleEn': he[-1] + ': ' + ('National Capital Region' if tid.startswith('national-capital-region') else (', '.join(dims_en).lower() if dims_en else 'total')),
        'titleFr': hf[-1] + ' : ' + (', '.join(dims_fr).lower() if dims_fr else 'total').replace('région de la capitale nationale', 'région de la capitale nationale'),
        'en': {'path': rel(en)}, 'fr': {'path': rel(fr)},
        'rows': len(re_), 'period': [years[0], years[-1]],
        'publisher': TBS, 'dataset': ['Federal public service statistics', 'Statistiques sur la fonction publique fédérale'],
        'url': PORTAL + 'f0d12b41-54dc-4784-ad2b-83dffed2ab84',
    }
    if field_en:
        i = he.index(field_en)
        entry['en']['field'] = field_en; entry['fr']['field'] = hf[i]
        for a, b in zip(re_, rf):
            o = orgs.setdefault(norm(a[i]), {'en': a[i], 'fr': [], 't': {}})
            if b[i] not in o['fr']:
                o['fr'].append(b[i])
            o['t'][entry['id']] = o['t'].get(entry['id'], 0) + 1
    tables.append(entry)

vacc = BASE / 'tbs-vaccination-accommodations/tbs-vaccination-and-accommodations-status-2022-06-20.csv'
hv, rv = table(vacc)
if hv[:2] != ['d_nm_e', 'd_nm_f']:
    errors.append('Unexpected vaccination file header')
tables.append({
    'id': 'tbs-vaccination-accommodations', 'scope': 'org', 'asPublished': True,
    'titleEn': 'Vaccination and accommodation status, 20 June 2022',
    'titleFr': 'État de la vaccination et des mesures d’adaptation, 20 juin 2022',
    'en': {'path': rel(vacc), 'field': 'd_nm_e'}, 'fr': {'path': rel(vacc), 'field': 'd_nm_f'},
    'rows': len(rv), 'period': ['2022-06-20', '2022-06-20'], 'publisher': TBS,
    'dataset': ['Public Service Vaccination and Accommodations Status', 'État de la vaccination et des mesures d’adaptation dans la fonction publique'],
    'url': PORTAL + '9e57c237-13af-4c99-a2c1-88eee597f9b1',
})
for r in rv:
    o = orgs.setdefault(norm(r[0]), {'en': r[0], 'fr': [], 't': {}})
    if r[1] not in o['fr']:
        o['fr'].append(r[1])
    o['t']['tbs-vaccination-accommodations'] = o['t'].get('tbs-vaccination-accommodations', 0) + 1

# 2. Files published by a single employer ------------------------------------
def emp(key, names, publisher, note, items):
    out = []
    for pattern, title_en, title_fr, uuid in items:
        hits = sorted(BASE.glob(pattern))
        if not hits:
            errors.append('No file matches ' + pattern)
        for p in hits:
            label = re.search(r'(\d{4}-\d{2}-\d{2}|\d{4}-\d{4}|\d{4})(?:-(en|fr))?\.\w+$', p.name)
            out.append({'path': rel(p), 'bytes': p.stat().st_size, 'format': p.suffix[1:].upper(),
                        **({'head': ['No.', 'English', 'Français']} if '-notes-' in p.name else {}),
                        'titleEn': title_en, 'titleFr': title_fr,
                        'label': label.group(1) if label else '', 'lang': (label.group(2) if label else None),
                        'url': PORTAL + uuid})
    return {'key': key, 'names': names, 'publisher': publisher, 'note': note, 'files': out}

employers = [
 emp('vac', ['Veterans Affairs Canada', 'Veterans Affairs'], ['Veterans Affairs Canada', 'Anciens Combattants Canada'], None, [
  ('vac-ee-representation/vac-ee-women-*.csv', 'Employment equity representation: women', 'Représentation en matière d’équité en emploi : femmes', '16f12254-53d0-44e7-8ec0-f597ce6c073e'),
  ('vac-ee-representation/vac-ee-aboriginal-peoples-*.csv', 'Employment equity representation: Aboriginal peoples', 'Représentation en matière d’équité en emploi : Autochtones', '16f12254-53d0-44e7-8ec0-f597ce6c073e'),
  ('vac-ee-representation/vac-ee-persons-with-disabilities-*.csv', 'Employment equity representation: persons with disabilities', 'Représentation en matière d’équité en emploi : personnes handicapées', '16f12254-53d0-44e7-8ec0-f597ce6c073e'),
  ('vac-ee-representation/vac-ee-visible-minorities-*.csv', 'Employment equity representation: visible minorities', 'Représentation en matière d’équité en emploi : minorités visibles', '16f12254-53d0-44e7-8ec0-f597ce6c073e'),
  ('vac-ee-representation/vac-ee-notes-*.csv', 'Notes published with the tables', 'Notes publiées avec les tableaux', '16f12254-53d0-44e7-8ec0-f597ce6c073e'),
  ('vac-ee-representation/vac-ee-occupational-categories.csv', 'Occupational categories used in the tables', 'Catégories professionnelles utilisées dans les tableaux', '16f12254-53d0-44e7-8ec0-f597ce6c073e'),
  ('vac-ee-representation/vac-ee-representation-by-occ-category-*.xlsx', 'Representation by occupational category (Excel workbook)', 'Représentation par catégorie professionnelle (classeur Excel)', '16f12254-53d0-44e7-8ec0-f597ce6c073e'),
 ]),
 emp('csps', ['Canada School of Public Service'], ['Canada School of Public Service', 'École de la fonction publique du Canada'], None, [
  ('csps-ee-representation/csps-ee-representation-20*.csv', 'Employment equity representation', 'Représentation des groupes d’équité en matière d’emploi', 'c57a38fb-62e0-4025-b83d-583f4f880a43'),
  ('csps-ee-representation/csps-ee-representation-20*.xlsx', 'Employment equity representation (Excel workbook)', 'Représentation des groupes d’équité en matière d’emploi (classeur Excel)', 'c57a38fb-62e0-4025-b83d-583f4f880a43'),
  ('csps-ee-representation/csps-ee-representation-data-dictionary-*.xlsx', 'Data dictionary, 2021 onward (Excel workbook)', 'Dictionnaire de données, à compter de 2021 (classeur Excel)', 'c57a38fb-62e0-4025-b83d-583f4f880a43'),
 ]),
 emp('csis', ['Canadian Security Intelligence Service'], ['Canadian Security Intelligence Service', 'Service canadien du renseignement de sécurité'], None, [
  ('csis-ee-representation/csis-ee-representation-2020.csv', 'Employment equity representation', 'Représentation en matière d’équité d’emploi', 'd77a24fe-eb38-4d02-8e00-32148a708b11'),
  ('csis-ee-representation/csis-designated-group-members-by-age-range-2018-2019.csv', 'Designated group members by age range', 'Membres des groupes désignés par groupe d’âge', '479112da-a42a-4bf7-91bc-f40f810050a9'),
  ('csis-ee-representation/csis-designated-group-members-by-age-range-2017-2018.csv', 'Designated group members by age range', 'Membres des groupes désignés par groupe d’âge', 'f3b563cc-e1cb-4889-88a1-30e93d38cd68'),
  ('csis-pay-scale/csis-pay-scale-2019.csv', 'Pay scale', 'Échelle salariale', '633ea9e6-1d4c-4372-8627-36f02c1969ad'),
 ]),
 emp('cse', ['Communications Security Establishment', 'Communications Security Establishment Canada'], ['Communications Security Establishment', 'Centre de la sécurité des télécommunications'], None, [
  ('cse-ee-representation/cse-ee-and-first-official-languages-2024-2025.csv', 'Employment equity and first official languages', 'Équité en matière d’emploi et premières langues officielles', '112ed90e-da6c-49d7-8bd5-81964bcab466'),
  ('cse-ee-representation/cse-ee-and-first-official-languages-2022-2023.csv', 'Employment equity and first official languages', 'Équité en matière d’emploi et premières langues officielles', 'f6afd910-e246-4676-90dd-51c0ea6f6ff3'),
  ('cse-ee-representation/cse-workforce-representation-2022-06-30-*.csv', 'Workforce representation', 'Représentation de l’effectif', '3fb07d1b-8521-4c9a-b7de-6695f46b0d80'),
  ('cse-ee-representation/cse-employment-equity-2020.csv', 'Employment equity representation, series to March 2020', 'Représentation de l’équité en matière d’emploi, série jusqu’en mars 2020', '945948ff-ab9c-4461-b7de-225bfd2a02db'),
  ('cse-ee-representation/cse-employment-equity-2019.csv', 'Employment equity representation, series to March 2019', 'Représentation de l’équité en matière d’emploi, série jusqu’en mars 2019', '55c43516-3470-4245-a4a2-db3fa453d7bb'),
  ('cse-ee-representation/cse-employment-equity-2018.csv', 'Employment equity representation, series to March 2018', 'Représentation de l’équité en matière d’emploi, série jusqu’en mars 2018', '396cb8b1-8b7c-4c95-9943-b6788a26db6b'),
 ]),
 emp('dnd', ['National Defence', 'Department of National Defence'], ['Department of National Defence', 'Ministère de la Défense nationale'],
  ['These files cover civilian employees only.', 'Ces fichiers portent uniquement sur les employés civils.'], [
  ('dnd-civilian-representation/dnd-civilians-workplace-representation-2019-2022.csv', 'Civilian workplace representation, departmental results indicators', 'Représentation des civils en milieu de travail, indicateurs de résultats ministériels', '79ec0e13-2a2c-44a2-9723-bf9c706a72ff'),
  ('dnd-civilian-representation/dnd-civilian-employee-gender-distribution-2021-2023.csv', 'Civilian employee gender distribution', 'Répartition des employés civils par sexe', '881a781c-8247-4990-b7e7-1d99317bd4b2'),
  ('dnd-civilian-representation/dnd-civilian-employee-gender-distribution-2009-2024.xlsx', 'Civilian employee gender distribution (Excel workbook)', 'Répartition des employés civils par sexe (classeur Excel)', '881a781c-8247-4990-b7e7-1d99317bd4b2'),
  ('dnd-civilian-representation/dnd-civilians-self-identify-woman-2019-2025.xlsx', 'Civilians who self-identify as a woman (Excel workbook)', 'Civils qui s’identifient comme femmes (classeur Excel)', '148911d8-a1e0-4942-a1fa-0cecd9958bc4'),
  ('dnd-civilian-representation/dnd-civilians-self-identify-visible-minority-2019-2025.xlsx', 'Civilians who self-identify as a visible minority (Excel workbook)', 'Civils qui s’identifient comme membres d’une minorité visible (classeur Excel)', 'd5ff6db3-831b-488d-8f10-64b690386fe0'),
  ('dnd-civilian-representation/dnd-civilians-self-identify-indigenous-2019-2025.xlsx', 'Civilians who self-identify as an Indigenous person (Excel workbook)', 'Civils qui s’identifient comme Autochtones (classeur Excel)', '4a0db3f7-f57e-44d8-b0c7-00f38c212ad7'),
 ]),
]

# Each Canada School of Public Service CSV must name its own fiscal year.
for e in employers:
    for f in e['files']:
        if e['key'] == 'csps' and f['format'] == 'CSV' and f['label'] not in text(ROOT / f['path']):
            errors.append('Fiscal year in file name does not match file content: ' + f['path'])

listed = {t[l]['path'] for t in tables for l in ('en', 'fr')} | {f['path'] for e in employers for f in e['files']}
for f in files:
    if f['path'] not in listed:
        errors.append('File is stored but not indexed: ' + f['path'])

out = {
    'version': '2026-11-14',
    'note': 'Files downloaded from open.canada.ca and stored unchanged. Row counts count published rows; no value is recalculated.',
    'tables': tables, 'employers': employers, 'organizations': orgs, 'files': files,
}
if errors:
    print('\n'.join('ERROR: ' + e for e in errors)); sys.exit(1)
(ROOT / 'assets/added-sources.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'added-sources: {len(files)} files, {len(tables)} tables, {len(employers)} employers, {len(orgs)} organization names')
