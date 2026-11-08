"""Rebuild the two derived data files used by the Call to Action page and the organization page.

  data/tbs-departmental-representation-2017-2025.json
      Representation by department or agency, March 31, 2017 to 2025, from four Treasury Board pages.
  data/snps-2025-by-organization.json
      Seven questions of the 2025 Staffing and Non-Partisanship Survey by organization and group.

Usage:
  python scripts/build-call-to-action-data.py --tbs DIR --snps DIR --retrieved YYYY-MM-DD [--check]

--tbs   a folder with saved copies of the four Treasury Board pages listed in PAGES, named
        <key>.html (or .html.gz): indigenous.html, disability.html, vismin.html, black.html.
--snps  a folder with the six Public Service Commission CSV files listed in SNPS_FILES, under their
        published names (cfppsc_snps01-1.csv and so on). A name may have a prefix or end in .gz.
--check compare the result with the files in data/ and write nothing.

Values are copied as published. A cell Treasury Board left blank stays null; it is never set to zero.
Survey results the Commission did not publish are left out; they are never set to zero.
data/call-to-action-letters.json is maintained by hand from the Privy Council Office pages and is not
written by this script.
"""
import argparse, csv, gzip, hashlib, html, io, json, pathlib, re, sys
from decimal import Decimal, ROUND_HALF_UP

ROOT = pathlib.Path(__file__).resolve().parent.parent
TBS = 'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/'
PAGES = {
 'i': ('indigenous', TBS + 'employment-equity-public-service-representation-indigenous-peoples-department-agency-departmental-workforce-availability-estimates.html'),
 'd': ('disability', TBS + 'employment-equity-public-service-representation-persons-disabilities-department-agency-departmental-workforce-availability-estimates.html'),
 'v': ('vismin', TBS + 'employment-equity-public-service-representation-members-visible-minority-group-department-agency-departmental-workforce-availability-estimates.html'),
 'b': ('black', TBS + 'distribution-public-service-canada-employees-designated-sub-group-department-members-visible-minorities.html'),
}
# Older Treasury Board labels for the same organization, mapped to the name the site uses.
ALIAS = {
 'Infrastructure Canada': 'Housing, Infrastructure and Communities Canada',
 "Office of the Governor General's Secretary": 'Office of the Secretary to the Governor General',
 'Office of the Governor General’s Secretary': 'Office of the Secretary to the Governor General',
 'Royal Canadian Mounted Police (Civilian Staff)': 'Royal Canadian Mounted Police (public service employees)',
 'Royal Canadian Mounted Police': 'Royal Canadian Mounted Police (public service employees)',
 'Royal Canadian Mounted Police (RCMP)': 'Royal Canadian Mounted Police (public service employees)',
 'Western Economic Diversification Canada': 'Western Economic Diversification Canada (incl. PacifiCan and PrairiesCan)',
 'Crown-Indigenous Relations and Northern Affairs': 'Crown-Indigenous Relations and Northern Affairs Canada',
 'Canadian Environmental Assessment Agency': 'Impact Assessment Agency of Canada',
 'lmpact Assessment Agency of Canada': 'Impact Assessment Agency of Canada',
 'Total': 'Public Service',
}
BASIS = {
 'Census 2011 and 2012 Survey on Disability - based on Canadian citizens only': ('2011 Census and 2012 Canadian Survey on Disability, Canadian citizens only', 'Recensement de 2011 et Enquête canadienne sur l’incapacité de 2012, citoyens canadiens seulement'),
 'Census 2016 and 2017 Survey on Disability - based on Canadian citizens only': ('2016 Census and 2017 Canadian Survey on Disability, Canadian citizens only', 'Recensement de 2016 et Enquête canadienne sur l’incapacité de 2017, citoyens canadiens seulement'),
 'Census 2016 and 2017 Survey on Disability - based on Canadian citizens and permanent residents': ('2016 Census and 2017 Canadian Survey on Disability, Canadian citizens and permanent residents', 'Recensement de 2016 et Enquête canadienne sur l’incapacité de 2017, citoyens canadiens et résidents permanents'),
}
NOTES = [
 {'en': 'Core public administration. Representation is based on voluntary self-identification. A blank (null) value was not published by Treasury Board, usually to protect small numbers; it is not zero.',
  'fr': 'Administration publique centrale. La représentation repose sur l’auto-identification volontaire. Une valeur vide (null) n’a pas été publiée par le Conseil du Trésor, habituellement pour protéger de petits nombres; elle ne vaut pas zéro.'},
 {'en': 'National Defence includes civilian staff only. The Royal Canadian Mounted Police rows include public service employees only; Treasury Board labelled this row “Civilian Staff” until 2023.',
  'fr': 'Défense nationale comprend le personnel civil seulement. Les lignes de la Gendarmerie royale du Canada comprennent seulement les employés de la fonction publique; le Conseil du Trésor désignait cette ligne « Civilian Staff » jusqu’en 2023.'},
 {'en': 'Indigenous Services Canada statistics are separate from Health Canada and Crown-Indigenous Relations and Northern Affairs Canada from March 31, 2021. Earlier values for those two departments include staff who moved to Indigenous Services Canada.',
  'fr': 'Les statistiques de Services aux Autochtones Canada sont distinctes de celles de Santé Canada et de Relations Couronne-Autochtones et Affaires du Nord Canada à partir du 31 mars 2021. Les valeurs antérieures de ces deux ministères comprennent le personnel passé à Services aux Autochtones Canada.'},
 {'en': 'Western Economic Diversification Canada includes employees now in Pacific Economic Development Canada and Prairies Economic Development Canada. Infrastructure Canada is shown under its current name, Housing, Infrastructure and Communities Canada.',
  'fr': 'Diversification de l’économie de l’Ouest Canada comprend les employés qui font maintenant partie de Développement économique Pacifique Canada et de Développement économique Canada pour les Prairies. Infrastructure Canada figure sous son nom actuel, Logement, Infrastructures et Collectivités Canada.'},
 {'en': 'The workforce availability benchmark changed in 2019 (2016 Census), 2022 (permanent residents added) and 2024 (2021 Census). Compare each year with its own benchmark. There is no workforce availability benchmark for Black employees.',
  'fr': 'La disponibilité de la main-d’œuvre a changé en 2019 (Recensement de 2016), en 2022 (ajout des résidents permanents) et en 2024 (Recensement de 2021). Comparez chaque année avec sa propre valeur de référence. Il n’existe pas de disponibilité de la main-d’œuvre pour les employés noirs.'},
]
SNPS_FILES = [  # (resource id, file, what it covers, column, {value: group key})
 ('a5a37b44-448e-4c2e-8c2f-e6ccf0ea128b', 'cfppsc_snps01-1.csv', 'All respondents by organization', None, None),
 ('37a83f7c-1352-42a5-ac94-d49391535793', 'cfppsc_snps02-1.csv', 'Gender', 'gdr_10_e', {'Woman': 'woman', 'Man': 'man'}),
 ('840e8e64-9177-4c72-a84d-3d1cfb8e280e', 'cfppsc_snps03-2.csv', 'Persons with disabilities', 'ddis_fl_e', {'Yes, has at least one disability': 'pwd', 'No, does not have a disability': 'nopwd'}),
 ('0aa3b961-db7b-492e-a692-01af431ad854', 'cfppsc_snps04-1.csv', 'Members of visible minorities', 'vismin_fl_e', {'Members of Visible Minorities': 'rac', 'Not members of visible minorities': 'nonrac'}),
 ('5903d97e-3ff7-4db9-8a9b-5338cddc0f12', 'cfppsc_snps05-1.csv', 'Indigenous Peoples', 'iidflag_e', {'Indigenous': 'ind', 'Non-Indigenous': 'nonind'}),
 ('143635eb-63b9-4756-8831-d8a2b0585e78', 'cfppsc_snps22.csv', 'Visible minority subgroups', 'pg_05_e', {'Black': 'black'}),
]
# question -> (answers counted as the result, direction, English, French, respondents, respondents in French)
QUESTIONS = {
 'STA_14A': (['Yes'], 'neg', 'Experienced biases or barriers that disadvantaged them in a staffing process', 'Ont été confrontés à des préjugés ou à des obstacles qui les ont désavantagés dans un processus de dotation', 'Respondents who took part in an advertised staffing process', 'Personnes ayant participé à un processus de dotation annoncé'),
 'STA_13': (['Yes'], 'pos', 'Staffing processes in their organization reduce or eliminate biases and barriers', 'Les processus de dotation de leur organisation réduisent ou éliminent les préjugés et les obstacles', 'All respondents', 'Tous les répondants'),
 'STA_01E': (['To a moderate extent', 'To a great extent'], 'pos', 'Selection for a position in their work unit is done fairly', 'Dans leur unité de travail, la sélection d’une personne pour un poste est équitable', 'All respondents who answered', 'Répondants qui ont répondu'),
 'STA_01F': (['To a moderate extent', 'To a great extent'], 'pos', 'Non-advertised appointments in their work unit are done fairly', 'Dans leur unité de travail, les nominations non annoncées sont équitables', 'All respondents who answered', 'Répondants qui ont répondu'),
 'STA_01A': (['To a moderate extent', 'To a great extent'], 'pos', 'Staffing in their work unit is carried out in a transparent way', 'Dans leur unité de travail, la dotation est menée de manière transparente', 'All respondents who answered', 'Répondants qui ont répondu'),
 'STA_09C': (['Yes'], 'pos', 'Received an offer of appointment', 'Ont reçu une offre de nomination', 'Respondents who took part in a staffing activity', 'Personnes ayant participé à une activité de dotation'),
 'STA_04': (['Yes'], 'pos', 'Acted in a position for 4 months or longer', 'Ont occupé un poste par intérim pendant 4 mois ou plus', 'All respondents', 'Tous les répondants'),
}
GROUPS = ['all', 'woman', 'man', 'pwd', 'nopwd', 'rac', 'nonrac', 'ind', 'nonind', 'black']
# The visible minority subgroup file labels one organization differently from the other files.
SNPS_SAME = {'Office of the Chief Electoral Officer (Elections Canada)': 'Office of the Chief Electoral Officer'}


def read(path):
    raw = path.read_bytes()
    return gzip.decompress(raw) if path.suffix == '.gz' else raw


def find(folder, name):
    hits = sorted(p for p in folder.iterdir() if p.name.endswith(name) or p.name.endswith(name + '.gz'))
    if len(hits) != 1:
        sys.exit(f'expected one file ending in {name} in {folder}, found {len(hits)}')
    return hits[0]


def clean(x):
    x = re.sub(r'<sup.*?</sup>', '', x, flags=re.S)
    x = re.sub(r'<span class="wb-inv">.*?</span>', '', x, flags=re.S)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', x))).strip()


def num(x):
    x = x.replace(',', '').replace('%', '').replace('−', '-').strip()
    try:
        return float(x) if '.' in x else int(x)
    except ValueError:
        return None   # suppressed or not available: kept as null, never zero


def tables(s):
    for m in re.finditer(r'<h2[^>]*>(.*?)</h2>', s, re.S):
        title = clean(m.group(1))
        y = re.search(r'as of March 31, (\d{4})', title)
        if not y:
            continue
        t0 = s.find('<table', m.end())
        t1 = s.find('</table>', t0)
        yield y.group(1), title, s[t0:t1]


def rows(tbl):
    body = tbl[tbl.find('<tbody'):]
    for r in re.findall(r'<tr[^>]*>(.*?)</tr>', body, re.S):
        cells = [clean(c) for c in re.findall(r'<t[hd][^>]*>(.*?)</t[hd]>', r, re.S)]
        if len(cells) >= 6 and num(cells[1]) is not None:   # skips repeated header rows
            yield cells


def basis(title):
    t = title[title.find('estimates') + 9:] if 'estimates' in title else ''
    b = t.strip(' ()')
    if b in BASIS:
        return {'en': BASIS[b][0], 'fr': BASIS[b][1]}
    if b.startswith('Census 2021 and 2022'):
        y = b[-4:]
        return {'en': '2021 Census and 2022 Canadian Survey on Disability, Canadian citizens and permanent residents, population data as of March 31, ' + y,
                'fr': 'Recensement de 2021 et Enquête canadienne sur l’incapacité de 2022, citoyens canadiens et résidents permanents, données sur la population au 31 mars ' + y}
    sys.exit('unknown workforce availability basis: ' + b)


def build_series(folder, retrieved):
    orgs, pages, titles = {}, {}, {}
    for key, (fname, url) in PAGES.items():
        raw = read(find(folder, fname + '.html'))
        pages[key] = {'url': url, 'sha256': hashlib.sha256(raw).hexdigest()}
        for year, title, tbl in tables(raw.decode('utf-8')):
            titles.setdefault(key, {})[year] = title
            for c in rows(tbl):
                name = ALIAS.get(c[0], c[0])
                org = orgs.setdefault(name, {})
                if c[0] != name and key != 'b':
                    org.setdefault('labels', {})[year] = c[0]
                if key == 'b':   # name, all employees, Black employees, Black %
                    org.setdefault('b', {})[year] = [num(c[1]), num(c[2]), num(c[3])]
                else:            # name, all employees, members, expected, gap, representation %, availability %
                    org.setdefault(key, {})[year] = [num(c[1]), num(c[2]), num(c[5]), num(c[6])]
    # Some older tables spell the same organization differently (a period for a comma, a lower-case letter).
    # Merge rows whose names differ only in punctuation or case, under the name used in the latest table.
    groups = {}
    for name in list(orgs):
        groups.setdefault(re.sub(r'[^a-z0-9]', '', name.lower()), []).append(name)
    for names in groups.values():
        if len(names) < 2:
            continue
        latest = lambda n: max([y for k in 'idvb' for y in orgs[n].get(k, {})] or ['0'])
        keep = sorted(names, key=lambda n: (latest(n), sum(len(orgs[n].get(k, {})) for k in 'idvb')))[-1]
        for other in names:
            if other == keep:
                continue
            for k, years in orgs.pop(other).items():
                if k == 'labels':
                    continue
                for y, v in years.items():
                    assert y not in orgs[keep].get(k, {}), (keep, other, k, y)
                    orgs[keep].setdefault(k, {})[y] = v
                    if k != 'b':
                        orgs[keep].setdefault('labels', {})[y] = other
    out = {}
    for name, o in sorted(orgs.items()):
        rec = {k: dict(sorted(o[k].items())) for k in ('i', 'd', 'v', 'b') if k in o}
        if 'labels' in o:
            rec['labels'] = dict(sorted(o['labels'].items()))
        out[name] = rec
    return {
     'title': 'Representation by department or agency, March 31, 2017 to March 31, 2025, with departmental workforce availability',
     'title_fr': 'Représentation par ministère ou organisme, du 31 mars 2017 au 31 mars 2025, avec la disponibilité de la main-d’œuvre propre à chaque organisation',
     'publisher': 'Treasury Board of Canada Secretariat', 'publisher_fr': 'Secrétariat du Conseil du Trésor du Canada',
     'retrieved': retrieved,
     'pages': pages,
     'fields': {'i': ['all employees', 'Indigenous employees', 'representation %', 'workforce availability %'],
                'd': ['all employees', 'employees with disabilities', 'representation %', 'workforce availability %'],
                'v': ['all employees', 'members of visible minorities', 'representation %', 'workforce availability %'],
                'b': ['all employees', 'Black employees', 'representation %']},
     'wfa_basis': {y: basis(t) for y, t in sorted(titles['i'].items())},
     'notes': NOTES,
     'orgs': out,
    }


LARGE = 2000   # weighted respondents; at this size the rounded counts are more precise than one-decimal percentages


def share_of(share, count, total):
    """Percentage answering as counted. Rounded counts can differ by half a respondent each, so for a group of
    fewer than LARGE respondents the published percentages are added instead of the counts."""
    p = Decimal(100 * count) / Decimal(total) if total >= LARGE else 100 * share
    return int(p.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def build_snps(folder, retrieved):
    acc, names_fr, files = {}, {}, []
    for rid, fname, covers, col, groups in SNPS_FILES:
        raw = read(find(folder, fname))
        files.append({'resource_id': rid, 'file': fname, 'covers': covers, 'sha256': hashlib.sha256(raw).hexdigest()})
        for r in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
            q = r['question']
            if q not in QUESTIONS:
                continue
            g = 'all' if col is None else groups.get(r[col])
            if not g:
                continue
            dept = r['dept_e'].strip()
            dept = SNPS_SAME.get(dept, dept)
            if r['dept_e'].strip() not in SNPS_SAME:   # French names come from the all-respondents file, read first
                names_fr.setdefault(dept, r['dept_f'].strip())
            # The Commission rounds weighted counts to whole numbers and gives percentages to one decimal place.
            # Keep both: for a small group the percentages are more precise, for a large group the counts are.
            cell = acc.setdefault(dept, {}).setdefault(g, {}).setdefault(q, [Decimal(0), 0, None])
            if r['question_value_e'] == 'All respondents':
                cell[2] = int(r['total_w_resp'])
            elif r['question_value_e'] in QUESTIONS[q][0]:
                cell[0] += Decimal(r['shr_w_resp'])
                cell[1] += int(r['total_w_resp'])
    orgs = {}
    for dept, groups in sorted(acc.items()):
        rec = {'fr': names_fr.get(dept, dept)}
        for g in GROUPS:
            # Whole per cent, rounded half up. A question without an "All respondents" row was not published for the group.
            v = {q: share_of(*cell) for q, cell in sorted(groups.get(g, {}).items()) if cell[2] is not None}
            if v:
                rec[g] = v
        orgs[dept] = rec
    return {
     'title': '2025 Staffing and Non-Partisanship Survey: seven staffing questions by organization and employment equity group',
     'title_fr': 'Sondage sur la dotation et l’impartialité politique de 2025 : sept questions sur la dotation par organisation et par groupe visé par l’équité en matière d’emploi',
     'publisher': 'Public Service Commission of Canada', 'publisher_fr': 'Commission de la fonction publique du Canada',
     'dataset': 'https://open.canada.ca/data/en/dataset/8766bf91-d14c-423b-a5d1-ac47f5b4dd22',
     'dataset_fr': 'https://ouvert.canada.ca/data/fr/dataset/8766bf91-d14c-423b-a5d1-ac47f5b4dd22',
     'retrieved': retrieved,
     'files': files,
     'method': 'Weighted results from the Public Service Commission open data, rounded to whole numbers. The Commission rounds weighted counts to whole numbers, so results for groups of fewer than 2,000 weighted respondents add the published percentages, and results for larger groups use the weighted counts. For agreement questions the result is the share answering “to a moderate extent” or “to a great extent”; for yes or no questions it is the share answering yes. “Don’t know” answers stay in the base, as in the Commission’s report. Results the Commission did not publish (fewer than 10 respondents) are absent, not zero.',
     'method_fr': 'Résultats pondérés tirés des données ouvertes de la Commission de la fonction publique, arrondis à l’unité. La Commission arrondit les nombres pondérés à l’unité; les résultats des groupes de moins de 2 000 répondants pondérés additionnent donc les pourcentages publiés, et ceux des groupes plus grands utilisent les nombres pondérés. Pour les questions d’accord, le résultat est la part des réponses « dans une mesure modérée » ou « dans une grande mesure »; pour les questions par oui ou non, la part des réponses oui. Les réponses « Ne sais pas » restent dans la base, comme dans le rapport de la Commission. Les résultats non publiés par la Commission (moins de 10 répondants) sont absents; ils ne valent pas zéro.',
     'questions': {q: {'dir': d, 'en': en, 'fr': fr, 'base': b, 'base_fr': bf} for q, (_, d, en, fr, b, bf) in QUESTIONS.items()},
     'period': 'Survey June 5 to August 14, 2025; staffing experiences from April 1, 2024, to March 31, 2025',
     'period_fr': 'Sondage du 5 juin au 14 août 2025; expériences de dotation du 1er avril 2024 au 31 mars 2025',
     'orgs': orgs,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--tbs', required=True, type=pathlib.Path)
    ap.add_argument('--snps', required=True, type=pathlib.Path)
    ap.add_argument('--retrieved', required=True, help='date the source copies were saved, YYYY-MM-DD')
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', a.retrieved):
        sys.exit('--retrieved must be YYYY-MM-DD')
    built = {'tbs-departmental-representation-2017-2025.json': build_series(a.tbs, a.retrieved),
             'snps-2025-by-organization.json': build_snps(a.snps, a.retrieved)}
    same = True
    for name, obj in built.items():
        text = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
        path = ROOT / 'data' / name
        if a.check:
            ok = path.read_text(encoding='utf-8') == text
            same &= ok
            print(('same: ' if ok else 'DIFFERENT: ') + name)
        else:
            path.write_text(text, encoding='utf-8')
            print(f'wrote {name} ({len(text.encode("utf-8")):,} bytes, {len(obj["orgs"])} organizations)')
    if a.check and not same:
        sys.exit(1)
    if not a.check:
        print('Review the changes, then update data/checksums.sha256 and data/source-dates.json.')


if __name__ == '__main__':
    main()
