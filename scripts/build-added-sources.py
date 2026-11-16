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

listed = {t[l]['path'] for t in tables for l in ('en', 'fr')} | {rel(ALIGNED / 'README.json')}
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
