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
    if raw[:3] == b'\xef\xbb\xbf':
        raw = raw[3:]
    try:
        return raw.decode('utf-8')
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

# 2. Three tables kept with suppression aligned across the two language files ---
ALIGNED = BASE / 'tbs-fps-population-2010-2026-suppression-aligned'
readme = json.loads((ALIGNED / 'README.json').read_text(encoding='utf-8'))
for en in sorted(ALIGNED.glob('*-en.csv')):
    fr = en.with_name(en.name[:-7] + '-fr.csv')
    he, re_ = table(en); hf, rf = table(fr)
    tid = en.name[len(PREFIX):-7]
    key = tid[:-len('-march-2026')] if tid.endswith('-march-2026') else tid
    years = sorted({r[0] for r in re_})
    hidden = readme['tables'][key]
    entry = {
        'id': 'fps-' + tid, 'scope': 'org', 'measure': [he[-1], hf[-1]],
        'titleEn': he[-1] + ': department or agency, ' + he[2].lower(),
        'titleFr': hf[-1] + ' : ministère ou organisme, ' + hf[2].lower(),
        'en': {'path': rel(en), 'field': he[1]}, 'fr': {'path': rel(fr), 'field': hf[1]},
        'rows': len(re_), 'period': [years[0], years[-1]], 'publisher': TBS,
        'dataset': ['Federal public service statistics', 'Statistiques sur la fonction publique fédérale'],
        'url': PORTAL + 'f0d12b41-54dc-4784-ad2b-83dffed2ab84', 'noDownload': True,
        'note': ['The English and French files published for this table do not suppress the same cells. Here a cell shows * when either file suppresses it (%d cells in the English file, %d in the French file). No number is changed.' % (hidden['cellsSuppressedInEnglishCopy'], hidden['cellsSuppressedInFrenchCopy']),
                 'Les fichiers anglais et français publiés pour ce tableau ne suppriment pas les mêmes cellules. Ici, une cellule affiche * lorsque l’un ou l’autre fichier la supprime (%d cellules dans le fichier anglais, %d dans le fichier français). Aucun nombre n’est modifié.' % (hidden['cellsSuppressedInEnglishCopy'], hidden['cellsSuppressedInFrenchCopy'])],
    }
    strip = lambda n: n[:-6] if n.endswith(' Total') else n
    for a in re_:
        name = strip(a[1])
        o = orgs.setdefault(norm(name), {'en': name, 'fr': [], 't': {}})
        o['t'][entry['id']] = o['t'].get(entry['id'], 0) + 1
        for fr_name in readme['frenchNames'][key].get(name, []):
            if fr_name not in o['fr']: o['fr'].append(fr_name)
    tables.append(entry)

employers = []

# 3. Other datasets that cover the public service or its organizations generally ---
PSC = ['Public Service Commission of Canada', 'Commission de la fonction publique du Canada']
ESDC = ['Employment and Social Development Canada', 'Emploi et Développement social Canada']
PACKAGES = [
 ('psc-advertisements-by-year', PSC, 'Advertisements to the Public Service', 'Annonces d’emploi à la fonction publique', 'e61c8587-2cc9-4775-b34e-f1041ad00410', ['2017-2018 to 2026-2027', '2017-2018 à 2026-2027']),
 ('psc-priority-entitlements', PSC, 'Priority Entitlements', 'Droits de priorité', '83dcf122-d050-4def-8456-d23b718c6b22', ['2011-2012 to 2023-2024', '2011-2012 à 2023-2024']),
 ('psc-drf-indicators', PSC, 'Public Service Commission Departmental Results Framework Indicators', 'Indicateurs du Cadre ministériel des résultats de la Commission de la fonction publique', '00887ede-ac6b-47c1-af0c-aea61f2be345', ['2018-2019 to 2023-2024', '2018-2019 à 2023-2024']),
 ('psc-hiring-staffing-ar1-legacy', PSC, 'Public Service Hiring and Staffing Activities under the Public Service Employment Act, files valid to March 2018', 'Activités d’embauche et de dotation à la fonction publique en vertu de la Loi sur l’emploi dans la fonction publique, fichiers valides jusqu’en mars 2018', '2fe6b7f1-fbfe-4aaf-808f-b977d40d44db', ['2013-2014 to 2017-2018', '2013-2014 à 2017-2018']),
 ('psc-population-ar2', PSC, 'Population under the Public Service Employment Act: indeterminate employees under 35', 'Effectif assujetti à la Loi sur l’emploi dans la fonction publique : employés nommés pour une période indéterminée de moins de 35 ans', '845f9e76-d03e-4652-8f43-bb777ab1d52b', ['1996 to 2025', '1996 à 2025']),
 ('psc-staffing-audit-tool', PSC, 'Staffing Audit Tool', 'Outil de vérification de la dotation', '349e07cf-7df8-4714-8f44-7afd7d997aa6', ['2013 to 2016', '2013 à 2016']),
 ('psc-system-wide-staffing-audit', PSC, 'System-Wide Staffing Audit', 'Vérification de la dotation à l’échelle du système', '45db0901-fe73-4f7f-beb9-598d7ab98acd', ['April to November 2016', 'avril à novembre 2016']),
 ('survey-of-staffing-2017', PSC, 'Survey of Staffing 2017', 'Sondage sur la dotation de 2017', 'a8d64d9c-db9a-4f71-8be4-f11eaf4d306d', ['2017', '2017']),
 ('snps-2018', PSC, 'Staffing and Non-Partisanship Survey 2018', 'Sondage sur la dotation et l’impartialité politique de 2018', '060a017e-3c68-4754-a0c7-91cd031b4480', ['2018', '2018']),
 ('snps-2021', PSC, 'Staffing and Non-Partisanship Survey 2021', 'Sondage sur la dotation et l’impartialité politique de 2021', '90705678-982e-49db-8f1b-13e93ede3a95', ['2021', '2021']),
 ('tbs-executives-wfa-2019', TBS, 'Distribution and workforce availability estimates of public service of Canada employees by designated group, Executives', 'Répartition des employés de la fonction publique du Canada par groupe désigné et estimations de la disponibilité au sein de la population active, cadres supérieurs', '73fe0c0f-cdf8-4932-b8a6-c32f4edd3cea', ['2019', '2019']),
 ('pses-2020', TBS, 'Public Service Employee Survey 2020: diversity and inclusion tables', 'Sondage auprès des fonctionnaires fédéraux de 2020 : tableaux sur la diversité et l’inclusion', '4301f4bb-1daa-4b50-afab-d1193b5d2284', ['2020', '2020']),

 ('psc-applicants-ar6', PSC, 'Applications to the Public Service', 'Demandes d’emploi à la fonction publique', '7f459f0c-979f-4d2f-b22b-8484571dc543', ['2012-2013 to 2024-2025', '2012-2013 à 2024-2025']),
 ('esdc-wfa-benchmarks', ESDC, 'Workforce availability by designated group, employment equity occupational group and National Occupational Classification unit group', 'Disponibilité au sein de la population active par groupe désigné, groupe professionnel de l’équité en matière d’emploi et groupe de base de la Classification nationale des professions', '07deee9b-4275-40ab-a0d3-9cd913feed47', ['2006, 2016 and 2021 Census', 'Recensements de 2006, de 2016 et de 2021']),
 ('harassment-violence-occurrences', ESDC, 'Harassment and Violence Occurrences in the Canadian Federal Jurisdiction', 'Incidents de harcèlement et de violence dans les secteurs de compétence fédérale au Canada', '340a348c-79b3-42b3-a3e5-ab8098ea7aed', ['2021 to 2024', '2021 à 2024']),
]
NOTES = {
 'harassment-violence-occurrences': ['These tables cover federally regulated employers, public and private. They are not limited to the federal public service.', 'Ces tableaux portent sur les employeurs sous réglementation fédérale, publics et privés. Ils ne se limitent pas à la fonction publique fédérale.'],
 'esdc-wfa-benchmarks': ['These files come from several Employment and Social Development Canada datasets. The link opens the 2021 Census dataset.', 'Ces fichiers proviennent de plusieurs jeux de données d’Emploi et Développement social Canada. Le lien ouvre le jeu de données du Recensement de 2021.'],
 'snps-2018': ['Only the smaller files of this survey are stored here.', 'Seuls les plus petits fichiers de ce sondage sont conservés ici.'],
 'snps-2021': ['Only the smaller files of this survey are stored here.', 'Seuls les plus petits fichiers de ce sondage sont conservés ici.'],
}
PREVIEW_BYTES, PREVIEW_COLUMNS, ORG_BYTES = 3_000_000, 30, 7_000_000
fr_names = {norm(f): k for k, o in orgs.items() for f in o['fr']}
packages = []
for folder, publisher, title_en, title_fr, uuid, span in PACKAGES:
    entries = []
    for p in sorted((BASE / folder).iterdir()):
        size = p.stat().st_size
        item = {'path': rel(p), 'bytes': size, 'format': p.suffix[1:].upper(), 'name': p.name}
        lang = re.search(r'-(en|fr)$', p.stem)
        if lang: item['lang'] = lang.group(1)
        if p.suffix.lower() == '.csv':
            head, rows = table(p)
            item['columns'] = len(head)
            item['preview'] = size <= PREVIEW_BYTES and len(head) <= PREVIEW_COLUMNS
            if size <= ORG_BYTES and len(head) <= PREVIEW_COLUMNS and rows and 'list-of-' not in p.name:
                # An organization column is one where most rows name a known organization.
                share = lambda i, known: sum(1 for r in rows if i < len(r) and norm(r[i]) in known) / len(rows)
                en_col = max(range(len(head)), key=lambda i: share(i, orgs))
                fr_col = max(range(len(head)), key=lambda i: share(i, fr_names))
                if share(en_col, orgs) >= 0.5:
                    tid = 'pkg-' + p.stem
                    has_fr = fr_col != en_col and share(fr_col, fr_names) >= 0.5
                    for r in rows:
                        k = norm(r[en_col]) if en_col < len(r) else ''
                        if k in orgs:
                            orgs[k]['t'][tid] = orgs[k]['t'].get(tid, 0) + 1
                    tables.append({'id': tid, 'scope': 'org', 'bilingualFile': True,
                                   'titleEn': title_en + ': ' + p.name, 'titleFr': title_fr + ' : ' + p.name,
                                   'en': {'path': rel(p), 'field': head[en_col]},
                                   'fr': {'path': rel(p), 'field': head[fr_col] if has_fr else head[en_col], 'names': 'fr' if has_fr else 'en'},
                                   'hide': [head[en_col]] + ([head[fr_col]] if has_fr else []),
                                   'rows': len(rows), 'periodText': span, 'publisher': publisher,
                                   'dataset': [title_en, title_fr], 'url': PORTAL + uuid})
        entries.append(item)
    packages.append({'id': folder, 'titleEn': title_en, 'titleFr': title_fr, 'publisher': publisher,
                     'url': PORTAL + uuid, 'periodText': span, 'files': entries,
                     **({'note': NOTES[folder]} if folder in NOTES else {})})

listed = {t[l]['path'] for t in tables for l in ('en', 'fr')} | {rel(ALIGNED / 'README.json')} | {f['path'] for p in packages for f in p['files']}
for f in files:
    if f['path'] not in listed:
        errors.append('File is stored but not indexed: ' + f['path'])

out = {
    'version': '2026-11-14',
    'note': 'Files downloaded from open.canada.ca and stored unchanged. Row counts count published rows; no value is recalculated.',
    'tables': tables, 'employers': employers, 'packages': packages, 'organizations': orgs, 'files': files,
}
if errors:
    print('\n'.join('ERROR: ' + e for e in errors)); sys.exit(1)
(ROOT / 'assets/added-sources.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'added-sources: {len(files)} files, {len(tables)} tables, {len(packages)} packages, {len(orgs)} organization names')
