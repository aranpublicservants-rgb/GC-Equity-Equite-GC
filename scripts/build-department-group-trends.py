#!/usr/bin/env python3
"""Build department survey results over time by employee group (PSES 2018 to 2024).

Sources, each the published file of its cycle that holds department results by
employment equity group, kept unchanged in parts on the pses-data branch:
  2018     Subset 2 (demographic codes 2005, 2012, 2014, 2016)
  2019     Main subset 2 (2156, 2158, 2163, 2177, 2179)
  2020     Subset 3 (2012, 2014, 2019, 2041, 2043)
  2022-23  Subset 3 (1088, 1114, 1090, 1119, 1121)
  2024     EEINFODV, through the department profiles already checked cell by cell
           against it (scripts/check-department-assistants.py)
Every part is checked against the SHA-256 in data/pses-large-manifest.json.

Groups change definition between cycles: the earlier cycles report "Female gender",
"Aboriginal" and "Visible minority"; 2022-23 reports "Racialized, non-Indigenous
population"; the disability questions changed. The label published in each cycle is
kept with every value so readers see what was measured, and the page says these are
not identical definitions. Questions are followed only where the published wording is
identical (the same rule and mapping as scripts/build-department-survey-trends.py).
Values and response counts are copied as published; suppressed cells stay empty.

Usage: build-department-group-trends.py <pses-data checkout> [--check]
"""
import base64, csv, gzip, hashlib, importlib.util, io, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/department-group-trends'
spec = importlib.util.spec_from_file_location('trends', ROOT / 'scripts/build-department-survey-trends.py')
T = importlib.util.module_from_spec(spec)
spec.loader.exec_module(T)

GROUPS = {  # site group name: {cycle: DEMCODE in that cycle's file}
    'Woman': {'2018': '2005', '2019': '2156', '2020': '2012', '2022-23': '1088'},
    'Indigenous': {'2018': '2012', '2019': '2158', '2020': '2014', '2022-23': '1114'},
    'Person with a disability': {'2018': '2014', '2019': '2163', '2020': '2019', '2022-23': '1090'},
    'Racialized': {'2018': '2016', '2019': '2177', '2020': '2041', '2022-23': '1119'},
    'Black': {'2019': '2179', '2020': '2043', '2022-23': '1121'},
}
GROUP_FR = {'Woman': 'Femmes', 'Indigenous': 'Autochtones', 'Person with a disability': 'Personnes en situation de handicap',
            'Racialized': 'Personnes racisées', 'Black': 'Personnes noires'}
FILES = {
    '2018': ('pses-2018', '2018_PSES_SAFF_Subset-2_Sous-ensemble-2', {'2018'}),
    '2019': ('pses-2019', 'Main_9.12.03.b_subset_2', {'2019'}),
    '2020': ('pses-2020', 'subset-3-sous-ensemble-3', {'2020'}),
    '2022-23': ('pses-2022-2023', 'Subset-203-20--202022_2023-20PSES-20open-20dataset-20--20with-20labels_Sous-ensemble-203-20--20Ensemble-20de-20donn-C3-A9es-20ouvertes-20du-20SAFF-20de-202022_23', {'2022', '2023'}),
}


def main():
    data_root = Path(sys.argv[1])
    summary = json.loads((ROOT / 'assets/department-survey-trends.json').read_text(encoding='utf-8'))
    follow = summary['comparableQuestions']
    index = json.loads((ROOT / 'assets/department-profile-index.json').read_text(encoding='utf-8'))
    definitions = index['definitions']
    pages = json.loads((ROOT / 'assets/department-pages.json').read_text(encoding='utf-8'))['organizations']
    by_name = {}
    for name, oid in T.NAME_CROSSWALK.items():
        by_name.setdefault(T.N(name), set()).add(oid)
    for o in pages:
        for name in [o['en'], o['fr'], *o.get('aliases', [])]:
            by_name.setdefault(T.N(name), set()).add(o['id'])
    manifest = json.loads((ROOT / 'data/pses-large-manifest.json').read_text(encoding='utf-8'))
    sources = {s['directory']: (s, ds) for ds in manifest['datasets'] for s in ds['sources']}
    want = {(cycle, code): g for g, m in GROUPS.items() for cycle, code in m.items()}
    values, labels, src_out = {}, {}, {}
    for cycle, (folder, directory, years) in FILES.items():
        src, ds = sources[folder + '/' + directory]
        src_out[cycle] = {'url': src['url'], 'dataset': ds.get('dataset'), 'sha256': src['sha256']}
        qmap = {yq: q24 for q24, m in follow.items() for c, yq in m.items() if c == cycle}
        for part in src['parts']:
            path = data_root / 'pses' / folder / directory / part['file']
            raw = path.read_bytes()
            if hashlib.sha256(raw).hexdigest() != part['sha256']:
                sys.exit('Part does not match the manifest: ' + str(path))
            text = gzip.decompress(raw).decode('cp1252')
            for row in csv.DictReader(io.StringIO(text, newline='')):
                row = {k.upper() if k.lower() in ('descrip_e', 'descrip_f', 'answer1') else k: v for k, v in row.items()}
                if row['SURVEYR'] not in years or row['QUESTION'] not in qmap:
                    continue
                group = want.get((cycle, (row.get('DEMCODE') or '').strip()))
                if not group:
                    continue
                if any(int(row[k] or 0) != 0 for k in ('LEVEL2ID', 'LEVEL3ID', 'LEVEL4ID', 'LEVEL5ID')):
                    continue
                ids = by_name.get(T.N(row['DEPT_E']), set())
                if len(ids) != 1:
                    continue
                labels.setdefault((group, cycle), (row['DESCRIP_E'].strip(), row['DESCRIP_F'].strip()))
                if labels[(group, cycle)][0] != row['DESCRIP_E'].strip():
                    sys.exit(f'Demographic code {row["DEMCODE"]} has two labels in {cycle}')
                q24 = qmap[row['QUESTION']]
                field = definitions[q24]['field']
                v = [T.cell(row, field), (row.get('ANSCOUNT') or '').strip(), row['QUESTION']]
                key = (next(iter(ids)), group, q24, cycle)
                if key in values and values[key] != v:
                    sys.exit(f'Conflicting original cells for {key}')
                values[key] = v
    # 2024 from the checked department profiles.
    page_by_profile = {}
    for o in pages:
        for a in [o['en'], *o.get('aliases', [])]:
            if a in index['organizations']:
                page_by_profile.setdefault(a, o['id'])
    for name, entry in index['organizations'].items():
        oid = page_by_profile.get(name)
        if not oid:
            continue
        p = json.loads(gzip.decompress(base64.b64decode((ROOT / entry['path']).read_bytes())))
        for group in GROUPS:
            g = p['groups'].get(group)
            if not g:
                continue
            labels.setdefault((group, '2024'), (group, g['fr']))
            for q24, cell in g['questions'].items():
                if q24 in follow:
                    values[(oid, group, q24, '2024')] = [cell[0], cell[1], q24]
    cycles = summary['cycles']
    files = {}
    for oid in sorted({k[0] for k in values}):
        groups = []
        for group in GROUPS:
            rows = []
            for q24 in follow:
                per = {c: values[(oid, group, q24, c)] for c in cycles if (oid, group, q24, c) in values and values[(oid, group, q24, c)][0] != ''}
                if len(per) >= 2:
                    rows.append({'q': q24, 'en': definitions[q24]['en'], 'fr': definitions[q24]['fr'], 'values': per})
            if rows:
                groups.append({'group': group, 'fr': GROUP_FR[group],
                               'published': {c: list(labels[(group, c)]) for c in cycles if (group, c) in labels}, 'rows': rows})
        if groups:
            files[oid] = {'organization': oid, 'cycles': cycles, 'groups': groups,
                          'sources': {**src_out, '2024': {'url': index['sources']['groups']}}}
    if '--check' in sys.argv:
        bad = [oid for oid, d in files.items() if not (OUT / (oid + '.json')).exists() or json.loads((OUT / (oid + '.json')).read_text(encoding='utf-8')) != d]
        extra = {p.stem for p in OUT.glob('*.json')} - set(files)
        if bad or extra:
            sys.exit(f'Department group trends are out of date ({len(bad)} changed, {len(extra)} extra)')
        print('DEPARTMENT GROUP TRENDS: current;', len(files), 'organizations')
        return
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.json'):
        old.unlink()
    for oid, d in files.items():
        (OUT / (oid + '.json')).write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print('DEPARTMENT GROUP TRENDS:', len(files), 'organizations,', sum(len(f['groups']) for f in files.values()), 'group tables,',
          sum(len(g['rows']) for f in files.values() for g in f['groups']), 'question series')
    print('Published labels:', {f'{g} {c}': labels[(g, c)][0] for (g, c) in sorted(labels)})


if __name__ == '__main__':
    main()
