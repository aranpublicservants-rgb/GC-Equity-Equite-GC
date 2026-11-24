#!/usr/bin/env python3
"""Build data/where-data-agree.json for the "Where the data agree" page.

Part 1, links between sources. Every pair of organization results that come from two different sources is compared
across organizations: Treasury Board representation, the 2024 Public Service Employee Survey (PSES), the 2025 Staffing and
Non-Partisanship Survey (SNPS) and the Public Service Commission staffing dashboard. The results are the ones already
used in data/call-to-action-comparisons.json. Each comparison is a rank correlation that accounts for organization size
(log of employees), with a two-sided p-value and a Benjamini-Hochberg false discovery rate across all comparisons.
Follow-up checks use the 2024 PSES results by group in data/department-profiles/ and the SNPS results by group in
data/snps-2025-by-organization.json. The lists of organizations where both surveys point the same way use the same files.

Part 2, survey gaps over time. Needs a checkout of the pses-data branch (--pses DIR). It reads the official files listed
in data/pses-large-manifest.json and checks every part against its SHA-256:
  * the 2024 PSES main dataset, which carries 2019, 2020, 2022 and 2024 results under the 2024 question numbers, for
    persons with and without disabilities and for Indigenous and non-Indigenous employees;
  * the 2022 Employment Equity derived-variable files, for racialized, non-racialized (labelled "White" in 2022), Black
    employees, women and men. The 2022 questions are matched to the 2024 questions by wording, and every matched result
    for all employees must equal the 2022 value carried in the 2024 main dataset;
  * the 2024 Employment Equity derived-variable file, for the 2024 results of those groups.
Values are copied as published. Suppressed or missing values stay empty and are never estimated.

Pure Python, so the file is the same on any computer.
  git fetch --depth=1 origin pses-data:refs/remotes/origin/pses-data
  git worktree add ../pses-data origin/pses-data
  python scripts/build-where-data-agree.py --pses ../pses-data     write the file
  python scripts/build-where-data-agree.py --check                 recalculate part 1 and fail if the file differs
"""
import argparse, base64, csv, glob, gzip, hashlib, io, json, math, os, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'where-data-agree.json'
MIN_ORGS = 15          # fewest organizations for a comparison
CLEAR_Q = 0.10         # false discovery rate for a "clear" link
CHANGE_POINTS = 5      # the site's reading rule for a change in a survey result
Z95 = 1.96

# ---------------------------------------------------------------- names
def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

cw = json.loads((ROOT / 'data/department-identity-crosswalk.json').read_text(encoding='utf-8'))
CANON, FRNAME = {}, {}
for o in cw['organizations']:
    names = [o['en'], o.get('fr') or ''] + list(o.get('datasetNames') or [])
    for lst in (o.get('sources') or {}).values():
        names += list(lst or [])
    for nm in names:
        if nm:
            CANON[norm(nm)] = o['en']
    FRNAME[o['en']] = o.get('fr') or o['en']
for a in cw.get('identityAliases', []):
    if a.get('alias') and a.get('canonical'):
        CANON[norm(a['alias'])] = CANON.get(norm(a['canonical']), a['canonical'])
# The 2022 employment equity survey file lists this organization under a shorter name.
CANON.setdefault(norm('Natural Sciences and Engineering Research Council'), 'Natural Sciences and Engineering Research Council of Canada')
def canon(name):
    return CANON.get(norm(name), (name or '').strip())

# ---------------------------------------------------------------- statistics
def ranks(xs):
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    r = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return r

def residuals(y, x):
    n = len(y); mx = sum(x) / n; my = sum(y) / n
    sxx = sum((a - mx) ** 2 for a in x)
    b = sum((a - mx) * (c - my) for a, c in zip(x, y)) / sxx if sxx else 0.0
    return [c - my - b * (a - mx) for a, c in zip(x, y)]

def pearson(a, b):
    n = len(a); ma = sum(a) / n; mb = sum(b) / n
    sab = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    saa = sum((x - ma) ** 2 for x in a); sbb = sum((y - mb) ** 2 for y in b)
    return sab / math.sqrt(saa * sbb) if saa > 0 and sbb > 0 else None

def betacf(x, a, b):
    tiny = 1e-300; qab, qap, qam = a + b, a + 1, a - 1
    c, d = 1.0, 1 - qab * x / qap
    d = 1 / (d if abs(d) > tiny else tiny); h = d
    for m in range(1, 400):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c if abs(1 + aa / c) > tiny else tiny
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d; d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c if abs(1 + aa / c) > tiny else tiny
        delta = d * c; h *= delta
        if abs(delta - 1) < 3e-15:
            break
    return h

def ibeta(x, a, b):
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    bt = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x))
    return bt * betacf(x, a, b) / a if x < (a + 1) / (a + b + 2) else 1 - bt * betacf(1 - x, b, a) / b

def p_from_r(r, df):
    if df < 1: return 1.0
    if abs(r) >= 1: return 0.0
    t2 = r * r * df / (1 - r * r)
    return ibeta(df / (df + t2), df / 2, 0.5)

def size_adjusted(xs, ys, size, keep=None):
    """Rank correlation of xs and ys after removing the rank of log size from both. Returns n, r, p or None."""
    rows = [(x, y, math.log(s)) for i, (x, y, s) in enumerate(zip(xs, ys, size))
            if x is not None and y is not None and s and (keep is None or keep[i])]
    n = len(rows)
    if n < MIN_ORGS:
        return None
    rx, ry, rz = ranks([a for a, _, _ in rows]), ranks([b for _, b, _ in rows]), ranks([c for _, _, c in rows])
    r = pearson(residuals(rx, rz), residuals(ry, rz))
    if r is None:
        return None
    return n, r, p_from_r(r, n - 3)

def bh(ps):
    m = len(ps); order = sorted(range(m), key=lambda i: ps[i]); q = [0.0] * m; prev = 1.0
    for k in range(m - 1, -1, -1):
        i = order[k]; prev = min(prev, ps[i] * m / (k + 1)); q[i] = prev
    return q

def strength(r):
    a = abs(r)
    return 'none' if a < 0.15 else 'weak' if a < 0.3 else 'moderate' if a < 0.5 else 'strong'

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None

# ---------------------------------------------------------------- inputs on this branch
CTA_PATH = ROOT / 'data/call-to-action-comparisons.json'
SNPS_PATH = ROOT / 'data/snps-2025-by-organization.json'
cta = json.loads(CTA_PATH.read_text(encoding='utf-8'))
snps = json.loads(SNPS_PATH.read_text(encoding='utf-8'))
idx = json.loads((ROOT / 'assets/department-profile-index.json').read_text(encoding='utf-8'))
DEF = idx['definitions']

ORGS = []   # one record per Call to Action organization, with its published results
for o in cta['organizations']:
    rec = {k: v for k, v in o.items() if not k.startswith(('L_', 'S_', 'E_', 'G_', 'B_'))}
    rec['canon'] = canon(o['name_en'])
    ORGS.append(rec)
BY_CANON = {r['canon']: r for r in ORGS}

PROFILE_GROUPS = {'all': None, 'black': 'Black', 'rac': 'Racialized', 'nonrac': 'Non-racialized', 'ind': 'Indigenous',
                  'nonind': 'Non-Indigenous', 'pwd': 'Person with a disability', 'nopwd': 'Person without a disability',
                  'woman': 'Woman', 'man': 'Man'}
profile_files = sorted((ROOT / 'data/department-profiles').glob('*.json.gz.b64'))
for p in profile_files:
    d = json.loads(gzip.decompress(base64.b64decode(p.read_bytes())).decode('utf-8'))
    rec = BY_CANON.get(canon(d['organization']))
    if not rec:
        continue
    for g, label in PROFILE_GROUPS.items():
        qs = d['overall'] if label is None else d['groups'].get(label, {}).get('questions', {})
        for q, v in qs.items():
            if v and v[0] not in ('X', '', None):
                rec[f'p_{g}_{q}'] = int(v[0])
                rec[f'p_{g}_{q}_n'] = int(v[1]) if v[1] not in ('', None) else None
for org, d in snps['orgs'].items():
    rec = BY_CANON.get(canon(org))
    if not rec:
        continue
    for g, qs in d.items():
        if isinstance(qs, dict):
            for q, v in qs.items():
                rec[f's_{g}_{q}'] = v

# TBS subgroup tables by department (published counts and shares of all employees; "suppressed" cells stay blank).
SUBGROUP_FILES = [
    ('data/october-2026/TBS_Indigenous_subgroups_by_department_2025.csv', 2025, 'ind', [
        ('first_nations_pct', 'rep_fn_2025', 'First Nations employees as a share of the workforce, March 31, 2025 (%)',
         'Part des employés des Premières Nations dans l’effectif, au 31 mars 2025 (%)'),
        ('metis_pct', 'rep_mt_2025', 'Métis employees as a share of the workforce, March 31, 2025 (%)',
         'Part des employés métis dans l’effectif, au 31 mars 2025 (%)')]),
    ('data/october-2026/TBS_disability_subgroups_by_department_2024.csv', 2024, 'pwd', [
        ('mobility_pct', 'rep_dmo_2024', 'Employees with a mobility disability as a share of the workforce, March 31, 2024 (%)',
         'Part des employés ayant une incapacité liée à la mobilité dans l’effectif, au 31 mars 2024 (%)'),
        ('deaf_hard_of_hearing_pct', 'rep_ddh_2024', 'Deaf or hard of hearing employees as a share of the workforce, March 31, 2024 (%)',
         'Part des employés sourds ou malentendants dans l’effectif, au 31 mars 2024 (%)'),
        ('blind_visual_impairment_pct', 'rep_dbv_2024', 'Blind or visually impaired employees as a share of the workforce, March 31, 2024 (%)',
         'Part des employés aveugles ou ayant une déficience visuelle dans l’effectif, au 31 mars 2024 (%)'),
        ('other_disability_pct', 'rep_dot_2024', 'Employees with an other disability as a share of the workforce, March 31, 2024 (%)',
         'Part des employés ayant une autre incapacité dans l’effectif, au 31 mars 2024 (%)')]),
]
SUBGROUP_MEASURES, SUBGROUP_GROUP = {}, {}
for rel, yr, grp, cols in SUBGROUP_FILES:
    for r in csv.DictReader(open(ROOT / rel, encoding='utf-8-sig', newline='')):
        rec = BY_CANON.get(canon(re.sub(r'\s*\([^)]*\)', '', r['department_or_agency'])))
        if not rec:
            continue
        for src_col, key, en, fr in cols:
            try:
                rec[key] = float(r[src_col])
            except (TypeError, ValueError):
                pass   # suppressed or blank: stays blank
            SUBGROUP_MEASURES[key] = {'en': en, 'fr': fr}
            SUBGROUP_GROUP[key] = grp

def col(key, rows=None):
    rows = ORGS if rows is None else rows
    tbs = key.startswith(('rep_', 'chg_', 'chg2325_', 'ratio_'))
    return [None if (tbs and r.get('shared_row')) else num(r.get(key)) for r in rows]
SIZE = [num(r.get('size')) for r in ORGS]

# ---------------------------------------------------------------- part 1a: every pair from two different sources
def source_of(k):
    if k.startswith(('rep_', 'chg_', 'chg2325_', 'ratio_')): return 'tbs'
    if k.startswith(('pses_', 'yoy_', 'eeg_', 'gap_')): return 'pses'
    if k.startswith('snps_'): return 'snps'
    if k.startswith('psc_'): return 'psc'
    raise SystemExit('unknown source for ' + k)

def group_of(k):
    """The employee group a measure describes, for the filter on the page."""
    if k in SUBGROUP_GROUP:
        return SUBGROUP_GROUP[k]
    if 'black' in k:
        return 'black'
    for tag, g in (('_rac_', 'rac'), ('_ind_', 'ind'), ('_pwd_', 'pwd')):
        if tag in k:
            return g
    m = re.match(r'(?:rep|chg|chg2325|ratio)_([ivdb])(?:_|$)', k)
    if m:
        return {'i': 'ind', 'v': 'rac', 'd': 'pwd', 'b': 'black'}[m.group(1)]
    return 'all'

MEASURES = {k: {'en': v[0], 'fr': v[1]} for k, v in cta['outcomes'].items()}
MEASURES.update({
    'rep_i_2025': {'en': 'Indigenous employees as a share of the workforce, March 31, 2025 (%)',
                   'fr': 'Part des employés autochtones dans l’effectif, au 31 mars 2025 (%)'},
    'rep_v_2025': {'en': 'racialized employees as a share of the workforce, March 31, 2025 (%)',
                   'fr': 'part des employés racisés dans l’effectif, au 31 mars 2025 (%)'},
    'rep_d_2025': {'en': 'persons with disabilities as a share of the workforce, March 31, 2025 (%)',
                   'fr': 'part des personnes en situation de handicap dans l’effectif, au 31 mars 2025 (%)'},
    'rep_b_2025': {'en': 'Black employees as a share of the workforce, March 31, 2025 (%)',
                   'fr': 'part des employés noirs dans l’effectif, au 31 mars 2025 (%)'},
})
MEASURES.update(SUBGROUP_MEASURES)
for k, m in MEASURES.items():
    m['src'] = source_of(k); m['group'] = group_of(k)

keys = list(MEASURES)
pairs = []
for i, a in enumerate(keys):
    for b in keys[i + 1:]:
        if MEASURES[a]['src'] == MEASURES[b]['src']:
            continue
        res = size_adjusted(col(a), col(b), SIZE)
        if res:
            pairs.append([a, b, res[0], res[1], res[2]])
qs = bh([p[4] for p in pairs])
for p, q in zip(pairs, qs):
    p.append(q)
pairs.sort(key=lambda p: (p[4], p[0], p[1]))
scan = {
    'tests': len(pairs),
    'p05': sum(p[4] < 0.05 for p in pairs),
    'chance05': round(0.05 * len(pairs), 1),
    'clear': sum(p[5] < CLEAR_Q for p in pairs),
    'cta_tests': cta['scan']['comparisons'], 'cta_p05': cta['scan']['at_5_percent'], 'cta_chance05': cta['scan']['expected_by_chance'],
    'pairs': [[a, b, n, round(r, 3), float(f'{p:.3g}'), float(f'{q:.3g}')] for a, b, n, r, p, q in pairs],
}

# ---------------------------------------------------------------- part 1b: follow-up checks
def check(xkey, ykey, keep=None):
    res = size_adjusted(col(xkey), col(ykey), SIZE, keep)
    if not res:
        return None
    n, r, p = res
    return {'n': n, 'r': round(r, 3), 'p': float(f'{p:.3g}')}

LEFT_OUT = ['Indigenous Services Canada', 'Crown-Indigenous Relations and Northern Affairs Canada', 'Correctional Service of Canada',
            'Royal Canadian Mounted Police', 'Canada Border Services Agency', 'Department of National Defence',
            'Fisheries and Oceans Canada', 'Parks Canada']
left_canon = {canon(n) for n in LEFT_OUT}
missing = sorted(n for n in LEFT_OUT if canon(n) not in BY_CANON)
if missing:
    raise SystemExit('organizations to leave out are not in the data: ' + ', '.join(missing))
keep_out = [r['canon'] not in left_canon for r in ORGS]

checks = {
    'surveys': {g: check(f'p_{g}_Q65', f's_{g}_STA_14A') for g in ('black', 'rac', 'ind', 'pwd', 'woman', 'nonrac')},
    'indigenous': {q: {'all': check('rep_i_2025', f'p_nonind_{q}'), 'left_out': check('rep_i_2025', f'p_nonind_{q}', keep_out)}
                   for q in ('Q58', 'Q65', 'Q63', 'Q70')},
    'indigenous_left_out': [{'en': r['name_en'], 'fr': r['name_fr']} for r in ORGS if r['canon'] in left_canon],
    'black_cta': {g: check('chg_b', f'p_{g}_Q52') for g in ('black', 'nonrac')},
}

# ---------------------------------------------------------------- part 1c: where both surveys point the same way
AGREE_GROUPS = {'black': 'chg2325_b', 'rac': 'chg2325_v', 'ind': 'chg2325_i', 'pwd': 'chg2325_d', 'woman': None}
def top_third(values):
    s = sorted(values); n = len(s); b = round(2 * n / 3)
    while 0 < b < n and s[b] == s[b - 1]:
        b += 1
    return s[b] if b < n else None

agree = {}
for g, chg in AGREE_GROUPS.items():
    both = [r for r in ORGS if num(r.get(f'p_{g}_Q65')) is not None and num(r.get(f's_{g}_STA_14A')) is not None]
    cp, cs = top_third([r[f'p_{g}_Q65'] for r in both]), top_third([r[f's_{g}_STA_14A'] for r in both])
    hit = [r for r in both if cp is not None and cs is not None and r[f'p_{g}_Q65'] >= cp and r[f's_{g}_STA_14A'] >= cs]
    hit.sort(key=lambda r: (-r[f'p_{g}_Q65'], -r[f's_{g}_STA_14A'], r['name_en']))
    agree[g] = {
        'orgs_with_both': len(both), 'cut_pses': cp, 'cut_snps': cs,
        'orgs': [{'en': r['name_en'], 'fr': r['name_fr'], 'id': r['id'], 'pses': r[f'p_{g}_Q65'], 'pses_n': r.get(f'p_{g}_Q65_n'),
                  'snps': r[f's_{g}_STA_14A'], 'rep_change': None if (not chg or r.get('shared_row')) else num(r.get(chg))}
                 for r in hit],
    }

# ---------------------------------------------------------------- part 2: survey gaps over time
TREND_Q = ['Q65', 'Q58', 'Q53', 'Q12', 'Q45', 'Q43', 'Q42', 'Q47', 'Q63', 'Q70', 'Q81']
DIRECTION = {q: (-1 if q in ('Q58', 'Q65') else 1) for q in TREND_Q}
TREND_GROUPS = {   # group, comparison group, where each year comes from
    'ind': ['ind', 'nonind'], 'pwd': ['pwd', 'nopwd'], 'black': ['black', 'nonrac'], 'rac': ['rac', 'nonrac'], 'woman': ['woman', 'man']}
MAIN_CODES = {'D112 = 1': 'pwd', 'D112 = 2': 'nopwd', 'D113 = 1': 'ind', 'D113 = 2': 'nonind', '': 'all'}
EE22_CODES = {'EEDV_21 = 1': 'rac', 'EEDV_21 = 2': 'nonrac', 'EEDV_07 = 1': 'black', 'EEDV_02 = 1': 'woman', 'EEDV_01 = 1': 'man', '': 'all'}
EE24_CODES = {'D114 = 1': 'rac', 'D114 = 2': 'nonrac', 'EEDV_19 = 1': 'black', 'D111A = 1': 'woman', 'D111B = 1': 'man'}

def cell(v):
    v = (v or '').strip()
    if v in ('', '9999', 'NA'):
        return None
    try:
        return int(float(v))
    except ValueError:
        return None

def read_rows(path):
    with gzip.open(path, 'rb') as fh:
        for r in csv.DictReader(io.TextIOWrapper(fh, encoding='cp1252', newline='')):
            yield {k.upper(): v for k, v in r.items()}

def department_level(r):
    return all(not (r.get(k) or '0').strip('0') for k in ('LEVEL2ID', 'LEVEL3ID', 'LEVEL4ID', 'LEVEL5ID'))

def qtext(s):
    s = re.sub(r'^\s*Question\s+\w+\.\s*', '', s or '')
    s = re.sub(r'\(only asked[^)]*\)', '', s, flags=re.I).replace(' above', '').replace('’', "'")
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()

def build_trends(pses_root):
    manifest = json.loads((ROOT / 'data/pses-large-manifest.json').read_text(encoding='utf-8'))
    files = {}
    for d in manifest['datasets']:
        for s in d['sources']:
            dr = s['directory']
            kind = ('main24' if dr == 'pses-2024/main-principal' else 'ee24' if dr == 'pses-2024/EEINFODV'
                    else 'ee22' if dr.startswith('pses-2022-2023/') and 'EEinfoDV' in dr else None)
            if not kind:
                continue
            for part in s['parts']:
                fp = Path(pses_root) / 'pses' / dr / part['file']
                if sha(fp) != part['sha256']:
                    raise SystemExit(f'part does not match the manifest: {fp}')
                files.setdefault(kind, []).append(fp)
    level1 = json.loads((ROOT / 'data/pses-level1-map.json').read_text(encoding='utf-8'))
    id2name = {v.zfill(2): k for k, v in level1.items()}
    data = {}            # canonical name -> group -> year -> question -> [value, count]
    carried22 = {}       # 2022 results for all employees, under 2024 numbers, as carried in the 2024 main dataset
    def put(name, g, y, q, v, n):
        data.setdefault(name, {}).setdefault(g, {}).setdefault(y, {})[q] = [v, n]
    for fp in sorted(files['main24']):
        for r in read_rows(fp):
            b = (r['BYCOND'] or '').strip()
            if b not in MAIN_CODES or not department_level(r) or r['QUESTION'] not in DEF:
                continue
            lid = r['LEVEL1ID'].strip().zfill(2)
            name = 'Public Service' if lid == '00' else canon(id2name.get(lid, ''))
            if not name:
                continue
            q, y, field = r['QUESTION'], r['SURVEYR'], DEF[r['QUESTION']]['field'].upper()
            if MAIN_CODES[b] == 'all':
                if y == '2022':
                    carried22.setdefault(name, {})[q] = cell(r[field])
            elif q in TREND_Q:
                put(name, MAIN_CODES[b], y, q, cell(r[field]), cell(r['ANSCOUNT']))
    by_text = {qtext(DEF[q]['en']): q for q in DEF}
    q22map, matched, differ = {}, 0, 0
    field22 = {'POSITIVE': 'MOST_POSITIVE_OR_LEAST_NEGATIVE', 'NEGATIVE': 'MOST_NEGATIVE_OR_LEAST_POSITIVE'}
    for fp in sorted(files['ee22']):
        for r in read_rows(fp):
            b = (r['BYCOND'] or '').strip()
            if b not in EE22_CODES or not department_level(r):
                continue
            q22 = r['QUESTION']
            if q22 not in q22map:
                q22map[q22] = by_text.get(qtext(r.get('TITLE_E', '')))
            q = q22map[q22]
            if not q:
                continue
            name = 'Public Service' if r['LEVEL1ID'].strip('0') == '' else canon(r['DEPT_E'])
            f = DEF[q]['field'].upper(); v = cell(r.get(field22.get(f, f)))
            if EE22_CODES[b] == 'all':
                w = carried22.get(name, {}).get(q)
                if v is not None and w is not None:
                    matched += v == w; differ += v != w
            elif q in TREND_Q:
                put(name, EE22_CODES[b], '2022', q, v, cell(r['ANSCOUNT']))
    if differ:
        raise SystemExit(f'{differ} matched 2022 results differ from the 2022 values in the 2024 file')
    for fp in sorted(files['ee24']):
        for r in read_rows(fp):
            b = (r['BYCOND'] or '').strip()
            if b not in EE24_CODES or not department_level(r) or r['QUESTION'] not in TREND_Q or r['SURVEYR'] != '2024':
                continue
            name = 'Public Service' if r['LEVEL1ID'].strip('0') == '' else canon(r['DEPT_E'])
            q = r['QUESTION']
            put(name, EE24_CODES[b], '2024', q, cell(r[DEF[q]['field'].upper()]), cell(r['ANSCOUNT']))
    # gaps: points by which the group's result is less favourable than the comparison group's
    out = {}
    for name, groups in data.items():
        for g, (a, c) in TREND_GROUPS.items():
            ga, gc = groups.get(a, {}), groups.get(c, {})
            for q in TREND_Q:
                years = {}
                for y in sorted(set(ga) | set(gc)):
                    av, an = (ga.get(y, {}).get(q) or [None, None])
                    cv, cn = (gc.get(y, {}).get(q) or [None, None])
                    if av is None and cv is None:
                        continue
                    gap = None if av is None or cv is None else (av - cv if DIRECTION[q] < 0 else cv - av)
                    years[y] = [av, an, cv, cn, gap]
                if not years:
                    continue
                with_gap = [y for y in sorted(years) if years[y][4] is not None]
                item = {'y': years}
                if len(with_gap) >= 2 and with_gap[-1] == '2024':
                    y0, y1 = with_gap[0], with_gap[-1]
                    change = years[y1][4] - years[y0][4]
                    def var(row):
                        av, an, cv, cn, _ = row
                        if not an or not cn:
                            return None
                        pa, pc = av / 100, cv / 100
                        return 1e4 * (pa * (1 - pa) / an + pc * (1 - pc) / cn)
                    v0, v1 = var(years[y0]), var(years[y1])
                    z = abs(change) / math.sqrt(v0 + v1) if v0 is not None and v1 is not None and v0 + v1 > 0 else None
                    label = ('same' if abs(change) < CHANGE_POINTS else
                             ('grew' if change > 0 else 'shrank') if z is not None and z >= Z95 else 'unsure')
                    item.update({'from': y0, 'to': y1, 'change': change, 'z': None if z is None else round(z, 2), 'label': label})
                out.setdefault(name, {}).setdefault(g, {})[q] = item
    names = {}
    for name in out:
        rec = BY_CANON.get(name)
        names[name] = ['Fonction publique' if name == 'Public Service' else (rec['name_fr'] if rec else FRNAME.get(name, name)),
                       rec['name_en'] if rec else name]
    return {
        'groups': {g: {'years': sorted({y for o in out.values() for y in (o.get(g) or {}).get('Q65', {}).get('y', {})})}
                   for g in TREND_GROUPS},
        'questions': {q: {'dir': DIRECTION[q], 'en': DEF[q]['en'], 'fr': DEF[q]['fr']} for q in TREND_Q},
        'question_match_2022': {'questions': sum(1 for v in q22map.values() if v in TREND_Q), 'cells_equal': matched, 'cells_different': differ},
        'names': {k: names[k] for k in sorted(names)},
        'orgs': {k: out[k] for k in sorted(out)},
        'sources': {k: len(v) for k, v in sorted(files.items())},
    }

# ---------------------------------------------------------------- write or check
ap = argparse.ArgumentParser()
ap.add_argument('--pses', help='checkout of the pses-data branch, needed for the survey gaps over time')
ap.add_argument('--check', action='store_true', help='recalculate and fail if the published file differs')
args = ap.parse_args()

# ---------------------------------------------------------------- part 3: staffing survey, 2018, 2021 and 2025
SNPS21 = ROOT / 'data/open-canada-2026-11/snps-2021'
SNPS18 = ROOT / 'data/open-canada-2026-11/snps-2018'
S21_FILES = {'woman': ('CFPPSC_SNPS02.csv.gz', 'Female'), 'pwd': ('CFPPSC_SNPS03.csv.gz', 'Yes, has at least one disability'),
             'rac': ('CFPPSC_SNPS04.csv.gz', 'Visible minority'), 'ind': ('CFPPSC_SNPS05.csv.gz', 'Indigenous identity')}
S18_FILES = {'woman': ('CFPPSC_SNPS02.csv.gz', 'Female'), 'pwd': ('CFPPSC_SNPS03.csv.gz', 'Yes'),
             'rac': ('CFPPSC_SNPS04.csv.gz', 'Yes'), 'ind': ('CFPPSC_SNPS05.csv.gz', 'Yes')}
# 2021 and 2018 questions -> the 2025 question with the same meaning, matched by wording.
S21_Q = {'sta_10g': 'STA_01E', 'sta_10a': 'STA_01A'}
S18_Q = {'ALL_05D': 'STA_01E', 'ALL_05A': 'STA_01A'}
UNMATCHED = {'2018': set(), '2021': set()}
# Names used in the older survey files for an organization that has since been renamed, or whose name the file cut short.
OLD_NAMES = {
    'National Energy Board': ('Canada Energy Regulator', 'successor'),
    'Canadian Environmental Assessment Agency': ('Impact Assessment Agency of Canada', 'successor'),
    'Status of Women Canada': ('Women and Gender Equality Canada', 'renamed'),
    'Office of the Commissioner for Federal Judicial Affairs Can.': ('Office of the Commissioner for Federal Judicial Affairs', 'cut short'),
    'Office of the Superintendent of Financial Institutions Can': ('Office of the Superintendent of Financial Institutions Canada', 'cut short'),
    'Military Police Complaints Commission': ('Military Police Complaints Commission of Canada', 'cut short'),
    'Patented Medicine Prices Review Board of Canada': ('Patented Medicine Prices Review Board', 'cut short'),
}
USED_OLD = {}
def snps_old(path, label, qmap, year):
    """Whole-number share and weighted base per department. 2021: moderate or great extent. 2018: strongly or somewhat agree
    (a five-point agreement scale, so 2018 is not directly comparable with 2021 and 2025). Blank when not published."""
    cells = {}
    with gzip.open(path, 'rt', encoding='utf-8-sig', newline='') as fh:
        rd = csv.DictReader(fh)
        low = {k.lower(): k for k in rd.fieldnames}
        gkey, qkey, dkey = rd.fieldnames[3], low['question' if year == '2021' else 'variable_name'], low['dept_e']
        vkey = low['question_value_e']; tkey = low['total_w_resp' if year == '2021' else 'total_w_resp_e']
        for r in rd:
            if r[qkey] in qmap and r[gkey] == label:
                cells.setdefault((r[dkey], r[qkey]), {})[r[vkey]] = r[tkey]
    out = {}
    for (dept, q), v in cells.items():
        try:
            if year == '2021':
                base, hit = float(v['All respondents']), float(v['To a moderate extent']) + float(v['To a great extent'])
            else:
                base = float(v['All respondants'])
                hit = float(v['Strongly agree']) + float(v['Somewhat agree'])
        except (KeyError, ValueError):
            continue
        if base > 0:
            out[(dept, q)] = (round(100 * hit / base), int(base))
    return out
staffing_trend = {'questions': {}, 'groups': {}}
for q25 in S21_Q.values():
    qd = snps['questions'][q25]
    staffing_trend['questions'][q25] = {'en': qd['en'], 'fr': qd['fr']}
PS_NAMES = ('Federal public service',)
for g in S21_FILES:
    r21 = snps_old(SNPS21 / S21_FILES[g][0], S21_FILES[g][1], S21_Q, '2021')
    r18 = snps_old(SNPS18 / S18_FILES[g][0], S18_FILES[g][1], S18_Q, '2018')
    rows = {}
    def slot(key, q25):
        return rows.setdefault(key, {}).setdefault(q25, [None, None, None, None, None, None])   # 2021, base, 2025, change, 2018, base
    for rec in ORGS:
        for q25 in S21_Q.values():
            v25 = num(rec.get(f's_{g}_{q25}'))
            if v25 is not None:
                slot(rec['name_en'], q25)[2] = v25
    for (dept, q21), (v, n) in r21.items():
        q25 = S21_Q[q21]
        if dept in PS_NAMES:
            slot('Public Service', q25)[0:2] = [v, n]; continue
        rec = BY_CANON.get(canon(OLD_NAMES.get(dept, (dept,))[0]))
        if rec and dept in OLD_NAMES:
            USED_OLD[dept] = OLD_NAMES[dept]
        if rec:
            slot(rec['name_en'], q25)[0:2] = [v, n]
        else:
            UNMATCHED['2021'].add(dept)
    for (dept, q18), (v, n) in r18.items():
        q25 = S18_Q[q18]
        if dept in PS_NAMES:
            slot('Public Service', q25)[4:6] = [v, n]; continue
        rec = BY_CANON.get(canon(OLD_NAMES.get(dept, (dept,))[0]))
        if rec and dept in OLD_NAMES:
            USED_OLD[dept] = OLD_NAMES[dept]
        if rec:
            slot(rec['name_en'], q25)[4:6] = [v, n]
        else:
            UNMATCHED['2018'].add(dept)
    for org, d in snps['orgs'].items():
        if org == 'Federal Public Service':
            for q25 in S21_Q.values():
                v = num((d.get(g) or {}).get(q25))
                if v is not None:
                    slot('Public Service', q25)[2] = v
    for key, qs in rows.items():
        for c in qs.values():
            if c[0] is not None and c[2] is not None:
                c[3] = c[2] - c[0]
    staffing_trend['groups'][g] = rows
# Survey of Staffing, cycles 2011 to 2013 (published in 2017): all employees only, no equity groups.
SOS_PATH = ROOT / 'data/open-canada-2026-11/survey-of-staffing-2017/sos-2017-summary-of-results-by-organization.csv'
SOS_Q = {'20': 'selection', '22': 'transparent', '5': 'barriers'}
SOS_NAMES = {   # names in the 2011 to 2013 file that differ from today's
    'Environment Canada': 'Environment and Climate Change Canada', 'Industry Canada': 'Innovation, Science and Economic Development Canada',
    'Citizenship and Immigration Canada': 'Immigration, Refugees and Citizenship Canada',
    'Public Works and Government Services Canada': 'Public Services and Procurement Canada',
    'Foreign Affairs, Trade and Development Canada': 'Global Affairs Canada', 'National Energy Board': 'Canada Energy Regulator'}
sos, sos_unmatched, sos_renamed = {}, set(), {}
sos_questions = {}
for r in csv.DictReader(open(SOS_PATH, encoding='utf-8-sig', newline='')):
    qn = r['question_e'].split('.')[0].strip()
    if qn not in SOS_Q or r['answer_choice_e'] != 'Agree' or r['n_type_e'] != 'percentage':
        continue
    sos_questions[SOS_Q[qn]] = {'en': r['question_e'].split('.', 1)[1].strip(), 'fr': r['question_f'].split('.', 1)[1].strip()}
    dept = r['organization_e']
    if dept.startswith('Average'):
        continue
    if dept == 'Public Service of Canada':
        key = 'Public Service'
    else:
        rec = BY_CANON.get(canon(SOS_NAMES.get(dept, dept)))
        if not rec:
            sos_unmatched.add(dept); continue
        key = rec['name_en']
        if dept in SOS_NAMES:
            sos_renamed[dept] = rec['name_en']
    try:
        sos.setdefault(key, {}).setdefault(SOS_Q[qn], {})[r['survey_cycle']] = int(float(r['n']))
    except ValueError:
        pass
staffing_trend['sos'] = sos
staffing_trend['sos_questions'] = sos_questions
staffing_trend['sos_renamed'] = sorted(sos_renamed.items())
staffing_trend['sos_unmatched'] = sorted(sos_unmatched)
staffing_trend['names'] = {r['name_en']: [r['name_fr'], r['name_en']] for r in ORGS}
staffing_trend['renamed'] = [[old, new, how] for old, (new, how) in sorted(USED_OLD.items())]
staffing_trend['unmatched'] = {y: sorted(v - {'Department not specified'}) for y, v in UNMATCHED.items()}

doc = {
    'schema': 1,
    'inputs': {'call_to_action_comparisons': sha(CTA_PATH), 'snps_2025': sha(SNPS_PATH),
               'tbs_subgroups': hashlib.sha256(b''.join(sha(ROOT / f[0]).encode() for f in SUBGROUP_FILES)).hexdigest(),
               'department_profiles': hashlib.sha256(b''.join(sha(p).encode() for p in profile_files)).hexdigest()},
    'rules': {'min_orgs': MIN_ORGS, 'clear_q': CLEAR_Q, 'change_points': CHANGE_POINTS, 'z': Z95},
    'measures': MEASURES,
    'scan': scan,
    'checks': checks,
    'agree': agree,
}
doc['staffing_trend'] = staffing_trend
def _has(rec, prefixes):
    return any(k.startswith(prefixes) and rec[k] is not None for k in rec)
staffing_orgs = {k for rows in staffing_trend['groups'].values() for k in rows}
doc['orgs'] = [{'id': r['id'], 'en': r['name_en'], 'fr': r['name_fr'],
                'has': [k for k, ok in (('tbs', _has(r, ('rep_',)) and not r.get('shared_row')), ('pses', _has(r, ('p_',))), ('snps', _has(r, ('s_',))),
                                         ('staffing', r['name_en'] in staffing_orgs), ('sos', r['name_en'] in staffing_trend['sos'])) if ok]} for r in sorted(ORGS, key=lambda r: r['name_en'])]
old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else None
if args.pses:
    doc['trends'] = build_trends(args.pses)
elif old and 'trends' in old:
    doc['trends'] = old['trends']
else:
    raise SystemExit('the survey gaps over time need --pses DIR the first time')
_tk = {canon(k): k for k in doc['trends']['orgs'] if k != 'Public Service'}
_tk_alias = {'Natural Sciences and Engineering Research Council': 'Natural Sciences and Engineering Research Council of Canada'}
for k, full in _tk_alias.items():
    if k in doc['trends']['orgs']:
        _tk[canon(full)] = k
for o in doc['orgs']:
    k = o['en'] if o['en'] in doc['trends']['orgs'] else _tk.get(canon(o['en']))
    if k:
        o['tk'] = k
        o['has'].append('trends')
# organizations with survey results but no Call to Action record are listed too, so none is missing from the page
for k in sorted(set(_tk.values()) - {o.get('tk') for o in doc['orgs']}):
    nm = doc['trends']['names'].get(k, [k, k])
    doc['orgs'].append({'id': None, 'en': k, 'fr': nm[0], 'has': ['trends'], 'tk': k})
doc['orgs'].sort(key=lambda o: o['en'])
text = json.dumps(doc, ensure_ascii=False, separators=(',', ':'), sort_keys=False)
if args.check:
    if old is None or json.dumps(old, ensure_ascii=False, separators=(',', ':')) != text:
        raise SystemExit('data/where-data-agree.json differs from a fresh build; rebuild it and review the page wording')
    print('where-data-agree.json matches its sources')
else:
    OUT.write_text(text, encoding='utf-8')
    print(f"wrote {OUT.relative_to(ROOT)}: {scan['tests']} comparisons, {scan['p05']} at 5% (chance {scan['chance05']}), "
          f"{scan['clear']} clear; trend organizations {len(doc['trends']['orgs'])}; {len(text):,} bytes")
