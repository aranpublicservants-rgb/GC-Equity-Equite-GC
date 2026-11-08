"""Build the Public Service Commission files used by staffing.html from the CSV copies in data/psc/.

  data/psc/catalogue.json     every PSC file on the site, with its official link, years, rows, size and SHA-256,
                              and the official links for the Staffing and Non-Partisanship Survey files
  data/psc/psc-equity.json    the employment equity tables (AR4A to AR4E) and hiring by self-identification

Usage:  python scripts/build-psc-data.py [--check]

Each CSV in data/psc/ must match the SHA-256 recorded in data/october-2026/public-source-inventory.csv.
Values are copied as published. A blank value stays null; it is never set to zero.
"""
import argparse, csv, hashlib, io, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PSC = ROOT / 'data' / 'psc'
SOURCES = json.loads((ROOT / 'scripts' / 'psc-sources.json').read_text(encoding='utf-8'))
GROUPS = {'Women': 'w', 'Members of visible minorities': 'v', 'Indigenous peoples': 'i', 'Persons with disabilities': 'd'}


def text(path):
    raw = path.read_bytes()
    try:
        return raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        return raw.decode('cp1252')


def rows(name):
    return list(csv.DictReader(io.StringIO(text(PSC / name))))


def fy(s):
    """2012_2013 or 2012-2013 to 2012-2013."""
    s = s.strip().replace('_', '-')
    return s if re.fullmatch(r'\d{4}-\d{4}', s) else s


def num(s):
    s = (s or '').strip()
    if s == '':
        return None
    v = float(s)
    return round(v, 3)


def inventory():
    inv = {}
    for r in csv.DictReader(open(ROOT / 'data/october-2026/public-source-inventory.csv', encoding='utf-8-sig')):
        name = re.sub(r' \(1\)', '', re.sub(r'^[0-9a-f-]{36}_', '', r['File']))
        if r['SHA256']:
            inv.setdefault(name, set()).add(r['SHA256'])
    return inv


def years_of(table):
    keys = [k for k in (table[0].keys() if table else []) if re.search(r'fiscal_year|month_end_date|month_year_e', k, re.I)]
    if not keys:
        return None
    vals = sorted({fy(r[keys[0]]) for r in table if r.get(keys[0])})
    return [vals[0], vals[-1]] if vals else None


def catalogue(inv):
    files = []
    for path in sorted(PSC.glob('*.csv')):
        name = path.name
        data = path.read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        if sha not in inv.get(name, set()):
            sys.exit(f'{name}: SHA-256 does not match the inventory')
        src = SOURCES['files'].get(name)
        if not src or not src.get('url') or not src.get('title_fr'):
            sys.exit(f'{name}: missing source link or French title in scripts/psc-sources.json')
        table = rows(name)
        cols = list(table[0].keys()) if table else []
        files.append({'file': name, 'path': 'data/psc/' + name, 'en': src['title_en'], 'fr': src['title_fr'],
                      'url': src['url'], 'dataset': src.get('package'), 'years': years_of(table),
                      'rows': len(table), 'bytes': len(data), 'sha256': sha,
                      'equity': any(re.search(r'emp_equity|^ee_', c) for c in cols)})
    snps = []
    for r in csv.DictReader(open(ROOT / 'data/october-2026/public-source-inventory.csv', encoding='utf-8-sig')):
        m = re.match(r'^([0-9a-f-]{36})_(cfppsc_snps[\w-]+\.csv)$', r['File'])
        if not m:
            continue
        year = '2025' if r['Title'].startswith('2025') else '2023'
        pkg = SOURCES['snps'][year]
        res = SOURCES['snps_names'].get(m.group(1), {})
        snps.append({'file': m.group(2), 'year': year, 'en': res.get('en') or r['Title'], 'fr': res.get('fr') or '',
                     'url': 'https://open.canada.ca/data/dataset/%s/resource/%s/download/%s' % (pkg, m.group(1), m.group(2)),
                     'dataset': pkg, 'bytes': int(r['Bytes']), 'sha256': r['SHA256']})
    snps.sort(key=lambda s: (s['year'], s['file']))
    return {'title': 'Public Service Commission data files on this site', 'title_fr': 'Fichiers de données de la Commission de la fonction publique sur ce site',
            'publisher': 'Public Service Commission of Canada', 'publisher_fr': 'Commission de la fonction publique du Canada',
            'retrieved': SOURCES['retrieved'], 'datasets': SOURCES['datasets'], 'files': files, 'snps': snps}


def equity():
    def by_year_group(name):
        out = {}
        for r in rows(name):
            y = fy(r.get('FISCAL_YEAR') or r.get('fiscal_year'))
            g = GROUPS[r['emp_equity_designated_group_e'].strip()]
            out.setdefault(y, {})[g] = num(r['n'])
        return dict(sorted(out.items()))
    students = {'applicants': {}, 'hires': {}}
    for r in rows('ar4b.csv'):
        kind = 'applicants' if 'Applicants' in r['description_e'] else 'hires'
        students[kind].setdefault(fy(r['fiscal_year']), {})[GROUPS[r['emp_equity_designated_group_e'].strip()]] = num(r['n'])
    by_sex = {}
    for r in rows('ar4d.csv'):
        y = fy(r['FISCAL_YEAR'])
        by_sex.setdefault(y, {}).setdefault(GROUPS[r['emp_equity_designated_group_e'].strip()], {})[r['sex_e'].strip().lower()] = num(r['n'])
    regions, by_region = {}, {}
    for r in rows('ar4e.csv'):
        reg = r['geo_region_e'].strip()
        regions[reg] = r['geo_region_f'].strip()
        by_region.setdefault(fy(r['fiscal_year']), {}).setdefault(reg, {})[GROUPS[r['emp_equity_designated_group_e'].strip()]] = num(r['n'])
    hiring = {}
    for r in rows('demo_ee.csv'):
        org = r['department_e'].strip()
        rec = hiring.setdefault(org, {'fr': r['department_f'].strip(), 'years': {}})
        cell = rec['years'].setdefault(fy(r['fiscal_year']), [None, None])
        count = r['count'].strip()
        # The staffing dashboard publishes -1 where it suppressed a small count. Keep it as 'x', never as a number.
        cell[0 if r['ee_e'].startswith('Self-identified') else 1] = None if count == '' else ('x' if int(count) < 0 else int(count))
    for rec in hiring.values():
        rec['years'] = dict(sorted(rec['years'].items()))
    return {
        'title': 'Employment equity in Public Service Commission staffing data',
        'title_fr': 'Équité en matière d’emploi dans les données de dotation de la Commission de la fonction publique',
        'publisher': 'Public Service Commission of Canada', 'publisher_fr': 'Commission de la fonction publique du Canada',
        'retrieved': SOURCES['retrieved'],
        'notes': {'en': 'Percentages are copied from the published files, rounded to three decimal places. null means the file has no value. '
                        'In hiring, each year is [self-identified as a member of an employment equity group, did not self-identify]; '
                        'x marks a count the staffing dashboard suppressed (published as -1).',
                  'fr': 'Les pourcentages sont copiés des fichiers publiés et arrondis à trois décimales. null signifie que le fichier ne contient pas de valeur. '
                        'Dans hiring, chaque année correspond à [auto-identifiés comme membres d’un groupe visé, non auto-identifiés]; '
                        'x signale un nombre supprimé par le tableau de bord de la dotation (publié comme -1).'},
        'groups': {'w': ['Women', 'Femmes'], 'v': ['Members of visible minorities', 'Membres des minorités visibles'],
                   'i': ['Indigenous peoples', 'Autochtones'], 'd': ['Persons with disabilities', 'Personnes en situation de handicap']},
        'applicants': by_year_group('ar4a.csv'),
        'appointments': by_year_group('ar4c.csv'),
        'students': {k: dict(sorted(v.items())) for k, v in students.items()},
        'by_sex': dict(sorted(by_sex.items())),
        'regions': regions,
        'by_region': dict(sorted(by_region.items())),
        'hiring': hiring,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    built = {'catalogue.json': catalogue(inventory()), 'psc-equity.json': equity()}
    same = True
    for name, obj in built.items():
        out = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
        path = PSC / name
        if a.check:
            ok = path.exists() and path.read_text(encoding='utf-8') == out
            same &= ok
            print(('same: ' if ok else 'DIFFERENT: ') + name)
        else:
            path.write_text(out, encoding='utf-8')
            print(f'wrote data/psc/{name} ({len(out.encode("utf-8")):,} bytes)')
    if a.check and not same:
        sys.exit(1)


if __name__ == '__main__':
    main()
