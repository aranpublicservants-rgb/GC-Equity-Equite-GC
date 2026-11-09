#!/usr/bin/env python3
"""Compare what organizations reported in the Call to Action with published results.

Reads the Call to Action records, the Treasury Board departmental representation tables, the 2022 and 2024 Public
Service Employee Survey results in assets/workspace-data.json, the 2025 Staffing and Non-Partisanship Survey results and
the Public Service Commission staffing dashboard. Writes data/call-to-action-comparisons.json, which the Call to Action
page and scripts/check-site.py use. Pure Python, so the results are the same on any computer.

  python scripts/build-cta-comparisons.py          write the file
  python scripts/build-cta-comparisons.py --check  recalculate and fail if the file differs
"""
import json, math, random, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'call-to-action-comparisons.json'
PERMUTATIONS, SEED = 3000, 20211
BANDS = [(0, 500), (500, 5000), (5000, 10**9)]
BAND_LABELS = [['fewer than 500 employees', 'moins de 500 employés'], ['500 to 4,999 employees', 'de 500 à 4\u00a0999 employés'],
               ['5,000 employees or more', '5\u00a0000 employés ou plus']]

# Kinds of reported action, matched by keyword in the summaries of the 2021 letter commitments and the 2024
# self-assessment progress items.
CATS = {
    'sponsorship': (r'\bsponsor', 'sponsorship programs', 'programmes de parrainage'),
    'mentorship': (r'\bmentor', 'mentorship programs', 'programmes de mentorat'),
    'leadership_dev': (r'leadership development|talent management|mosaic|high[- ]potential|executive development|career development program|development program|succession',
                       'leadership or talent development programs', 'programmes de perfectionnement en leadership ou de gestion des talents'),
    'exec_accountability': (r'performance (management )?agreements?|performance (commitments?|objectives?)|executive (performance|accountability)|accountability framework|held accountable',
                            'equity commitments in executive performance agreements', 'engagements en matière d’équité dans les ententes de rendement des cadres'),
    'bias_training': (r'unconscious bias|bias training|bias-?free|anti-racism training|inclusive hiring training|bias awareness',
                      'bias or anti-racism training', 'formation sur les préjugés ou la lutte contre le racisme'),
    'mandatory_training': (r'mandatory', 'mandatory training or requirements', 'formation ou exigences obligatoires'),
    'name_blind': (r'name[- ]blind|anonymi[sz]|blind (screening|review)', 'name-blind screening', 'présélection anonyme'),
    'selection_boards': (r'(selection|assessment|hiring|interview) (board|panel|committee)s?|diverse boards?|representative boards?',
                         'diverse or representative selection boards', 'comités de sélection diversifiés ou représentatifs'),
    'targeted_recruitment': (r'targeted (recruitment|staffing|hiring|process|campaign|outreach|selection)|inventor(y|ies)|\bpools?\b|recruitment (initiative|campaign|strategy|program)|student|fswep|career navigator|outreach',
                             'targeted recruitment, inventories or outreach', 'recrutement ciblé, répertoires ou activités de sensibilisation'),
    'networks': (r'network|circle|employee resource group|\berg\b|advisory (committee|council|group|board)|champion',
                 'employee networks, circles or champions', 'réseaux d’employés, cercles ou champions'),
    'self_id': (r'self-?identif|self-?declar', 'self-identification campaigns', 'campagnes d’auto-identification'),
    'data': (r'\bdata\b|dashboard|disaggregat|measurement framework|indicator|analytics|power bi|workforce analysis',
             'data, dashboards or indicators', 'données, tableaux de bord ou indicateurs'),
    'esr': (r'employment systems? review|systems review', 'employment systems reviews', 'études des systèmes d’emploi'),
    'plan': (r'action plan|strategy|multi-year plan|framework|roadmap|road map', 'action plans, strategies or frameworks', 'plans d’action, stratégies ou cadres'),
    'listening': (r'listening|consultation|town hall|dialogue|conversation|safe space|brave space|focus group|engagement session',
                  'listening sessions or consultations', 'séances d’écoute ou consultations'),
    'language': (r'language training|second[- ]language|official language', 'second-language training', 'formation en langue seconde'),
    'recourse': (r'harass|ombuds|complaint|recourse|grievance|conflict management|informal conflict|reporting mechanism|anonymous reporting|safe reporting|disclosure',
                 'harassment, complaint or recourse measures', 'mesures sur le harcèlement, les plaintes ou les recours'),
    'black': (r'\bblack\b', 'actions naming Black employees', 'mesures qui nomment les employés noirs'),
    'indigenous': (r'indigenous|first nations|inuit|métis|metis|reconciliation', 'actions naming Indigenous employees or reconciliation',
                   'mesures qui nomment les employés autochtones ou la réconciliation'),
    'disability': (r'disabilit|accessib|accommodat', 'disability or accessibility actions', 'mesures sur le handicap ou l’accessibilité'),
}
GOALS = ['indigenous_recruitment', 'black_recruitment', 'racialized_recruitment', 'indigenous_promotion', 'black_promotion', 'racialized_promotion']
DATA_BARRIER = r'\bdata\b|self-identif|disaggregat|self-declar'
# Organizations that share one row of the Treasury Board tables are left out of representation results.
SHARED_NOTE = 'Organizations that share one row of the Treasury Board tables are left out of representation results.'

OUTCOMES = {
    'chg_v': ['change in racialized representation, 2021 to 2025 (points)', 'variation de la représentation des employés racisés, de 2021 à 2025 (points)'],
    'chg_i': ['change in Indigenous representation, 2021 to 2025 (points)', 'variation de la représentation des Autochtones, de 2021 à 2025 (points)'],
    'chg_d': ['change in representation of persons with disabilities, 2021 to 2025 (points)', 'variation de la représentation des personnes en situation de handicap, de 2021 à 2025 (points)'],
    'chg_b': ['change in Black representation, 2021 to 2025 (points)', 'variation de la représentation des employés noirs, de 2021 à 2025 (points)'],
    'chg2325_v': ['change in racialized representation, 2023 to 2025 (points)', 'variation de la représentation des employés racisés, de 2023 à 2025 (points)'],
    'chg2325_i': ['change in Indigenous representation, 2023 to 2025 (points)', 'variation de la représentation des Autochtones, de 2023 à 2025 (points)'],
    'chg2325_d': ['change in representation of persons with disabilities, 2023 to 2025 (points)', 'variation de la représentation des personnes en situation de handicap, de 2023 à 2025 (points)'],
    'chg2325_b': ['change in Black representation, 2023 to 2025 (points)', 'variation de la représentation des employés noirs, de 2023 à 2025 (points)'],
    'ratio_v': ['racialized representation as a share of availability, 2025', 'représentation des employés racisés par rapport à la disponibilité, 2025'],
    'ratio_i': ['Indigenous representation as a share of availability, 2025', 'représentation des Autochtones par rapport à la disponibilité, 2025'],
    'ratio_d': ['representation of persons with disabilities as a share of availability, 2025', 'représentation des personnes en situation de handicap par rapport à la disponibilité, 2025'],
    'psc_chg': ['change in the share of appointments to people who self-identified as members of an employment equity group, 2018-19 to 2020-21 compared with 2022-23 to 2024-25 (points)',
                'variation de la part des nominations de personnes auto-identifiées comme membres d’un groupe visé, de 2018-2019 à 2020-2021 par rapport à 2022-2023 à 2024-2025 (points)'],
    'psc_post': ['share of appointments to people who self-identified as members of an employment equity group, 2022-23 to 2024-25', 'part des nominations de personnes auto-identifiées comme membres d’un groupe visé, de 2022-2023 à 2024-2025'],
}
QS = ['Q12', 'Q24', 'Q42', 'Q45', 'Q49', 'Q52', 'Q58', 'Q65', 'Q63', 'Q70']
PAIRS = [('rac', 'nonrac'), ('black', 'nonrac'), ('ind', 'nonind'), ('pwd', 'nopwd')]
SNPS_OUT = [('all', 'STA_13'), ('all', 'STA_01E'), ('rac', 'STA_14A'), ('rac', 'STA_13')]
GROUPS = {'rac': ['racialized employees', 'employés racisés'], 'nonrac': ['non-racialized employees', 'employés non racisés'],
          'black': ['Black employees', 'employés noirs'], 'ind': ['Indigenous employees', 'employés autochtones'],
          'nonind': ['non-Indigenous employees', 'employés non autochtones'], 'pwd': ['persons with disabilities', 'personnes en situation de handicap'],
          'nopwd': ['persons without disabilities', 'personnes sans handicap']}
PSES_EN, PSES_FR = '2024 Public Service Employee Survey', 'Sondage auprès des fonctionnaires fédéraux de 2024'
SNPS_EN, SNPS_FR = '2025 Staffing and Non-Partisanship Survey', 'Sondage sur la dotation et l’impartialité politique de 2025'


def labels(ws, sn):
    """Names of every measure, in English and French, from the question labels used elsewhere on the site."""
    out = dict(OUTCOMES)
    q_en = {q: ws['PSES_QMETA'][q][1] for q in QS}
    q_fr = {q: ws['EEG_QMETA_FR'][q].replace("'", '’') for q in QS}
    for q in QS:
        out['pses_'+q] = [f'{PSES_EN}: {q_en[q]} (% of employees)', f'{PSES_FR}\u00a0: {q_fr[q]} (% des employés)']
        out['yoy_'+q] = [f'change from 2022 to 2024, Public Service Employee Survey: {q_en[q]} (points)',
                         f'variation de 2022 à 2024, Sondage auprès des fonctionnaires fédéraux\u00a0: {q_fr[q]} (points)']
    for q in ['Q24', 'Q45', 'Q52']:
        out['eeg_black_'+q] = [f'{PSES_EN}, Black employees: {q_en[q]} (%)', f'{PSES_FR}, employés noirs\u00a0: {q_fr[q]} (%)']
    for a, b in PAIRS:
        for q in ['Q24', 'Q45', 'Q52', 'Q65']:
            out[f'gap_{a}_{q}'] = [f'{PSES_EN}: {q_en[q]}, {GROUPS[a][0]} minus {GROUPS[b][0]} (points)',
                                   f'{PSES_FR}\u00a0: {q_fr[q]}, {GROUPS[a][1]} moins {GROUPS[b][1]} (points)']
    for grp, q in SNPS_OUT:
        who = ['all respondents', 'tous les répondants'] if grp == 'all' else ['racialized respondents', 'répondants racisés']
        out[f'snps_{grp}_{q}'] = [f'{SNPS_EN}, {who[0]}: {sn[q]["en"]} (%)', f'{SNPS_FR}, {who[1]}\u00a0: {sn[q]["fr"]} (%)']
    return out

# The comparisons quoted on the page. A baseline is the starting value taken into account for a change.
SELECTED = [
    ('E_self_id', 'chg_d', 'rep_d_2021'),
    ('E_bias_training', 'snps_rac_STA_14A', None),
    ('L_leadership_dev', 'yoy_Q52', 'p22_Q52'),
    ('G_racialized_recruitment', 'gap_rac_Q45', None),
    ('E_esr', 'pses_Q52', None),
    ('G_indigenous_recruitment', 'chg2325_i', 'rep_i_2023'),
    ('G_racialized_recruitment', 'chg2325_v', 'rep_v_2023'),
    ('G_black_recruitment', 'chg2325_b', 'rep_b_2023'),
    ('L_targeted_recruitment', 'chg_v', 'rep_v_2021'),
    ('L_targeted_recruitment', 'psc_chg', 'psc_pre'),
    ('E_sponsorship', 'gap_rac_Q45', None),
    ('E_sponsorship', 'gap_black_Q45', None),
    ('E_black', 'pses_Q52', None),
    ('E_black', 'eeg_black_Q52', None),
    ('E_exec_accountability', 'pses_Q52', None),
]


def load(p):
    return json.loads((ROOT / p).read_text(encoding='utf-8'))


def flags(texts):
    return {k: any(re.search(rx, t, re.I) for t in texts) for k, (rx, _, _) in CATS.items()}


def band(size):
    for i, (a, b) in enumerate(BANDS):
        if size is not None and a <= size < b:
            return i
    return None


def r3(v):
    return None if v is None else round(v, 3)


def build_rows():
    cta, ser, ws = load('data/call-to-action-letters.json'), load('data/tbs-departmental-representation-2017-2025.json')['orgs'], load('assets/workspace-data.json')
    snps, psc = load('data/snps-2025-by-organization.json'), load('data/psc/psc-equity.json')['hiring']
    sn = snps['orgs']
    names = {}
    for o in cta['organizations']:
        if o.get('site_name'):
            names.setdefault(o['site_name'], []).append(o['id'])
    shared = {i for ids in names.values() if len(ids) > 1 for i in ids}
    norm = lambda s: re.sub(r'[^a-z]', '', re.sub(r'\(.*?\)', '', s or '').lower().replace('&', 'and'))
    pscn = {norm(k): k for k in psc}
    rows = []
    for o in cta['organizations']:
        L, S = o.get('letter'), o.get('self_assessment')
        r = {'id': o['id'], 'name_en': o.get('name_en'), 'name_fr': o.get('name_fr'), 'shared_row': o['id'] in shared}
        lf = flags(L['commitments']) if L else None
        sf = flags(S.get('progress') or []) if S else None
        for k in CATS:
            r['L_'+k] = lf[k] if lf else None
            r['S_'+k] = sf[k] if sf else None
            r['E_'+k] = None if not (lf or sf) else bool(lf and lf[k]) or bool(sf and sf[k])
        if S:
            for k in GOALS:
                r['G_'+k] = S['goals'][k]['status'] == 'set'
            r['B_data'] = any(re.search(DATA_BARRIER, b, re.I) for b in S.get('barriers') or [])
        size = ws['planOrgs'].get(o.get('plan_name') or '', {}).get('employees')
        rec = ser.get(o.get('site_name') or '')
        if not size and rec:
            size = next((rec[g]['2025'][0] for g in 'ivdb' if rec.get(g, {}).get('2025')), None)
        r['size'], r['band'] = size, band(size)
        if rec and not r['shared_row']:
            for g in 'ivdb':
                for y in ['2021', '2023', '2025']:
                    v = rec.get(g, {}).get(y)
                    r[f'rep_{g}_{y}'] = v[2] if v and v[2] is not None else None
                    r[f'wfa_{g}_{y}'] = v[3] if v and len(v) > 3 and v[3] else None
                a, b, c = r[f'rep_{g}_2021'], r[f'rep_{g}_2025'], r[f'rep_{g}_2023']
                r['chg_'+g] = r3(b-a) if a is not None and b is not None else None
                r['chg2325_'+g] = r3(b-c) if c is not None and b is not None else None
                r['ratio_'+g] = r3(b/r[f'wfa_{g}_2025']) if b is not None and r[f'wfa_{g}_2025'] else None
        pn = o.get('pses_name')
        for q, v in (ws['PSES_DEPT'].get(pn) or {}).items() if pn else []:
            if q in QS:
                r['pses_'+q] = v
        for q, v in (ws['YOY'].get(pn) or {}).items() if pn else []:
            if q in QS and v.get('a') is not None and v.get('b') is not None:
                r['yoy_'+q], r['p22_'+q] = v['b']-v['a'], v['a']
        eg = (ws['EEG_DEPT'].get(pn) or {}) if pn else {}
        for grp in ['black']:
            for q in ['Q24', 'Q45', 'Q52']:
                if eg.get(grp, {}).get(q) is not None:
                    r[f'eeg_{grp}_{q}'] = eg[grp][q]
        for a, b in PAIRS:
            for q in ['Q24', 'Q45', 'Q52', 'Q65']:
                x, y = eg.get(a, {}).get(q), eg.get(b, {}).get(q)
                if x is not None and y is not None:
                    r[f'gap_{a}_{q}'] = x-y
        so = sn.get(o.get('snps_name') or '') or {}
        for grp, q in SNPS_OUT:
            if so.get(grp, {}).get(q) is not None:
                r[f'snps_{grp}_{q}'] = so[grp][q]
        k = next((pscn[norm(x)] for x in [o.get('name_en'), o.get('site_name'), pn, o.get('snps_name')] if x and norm(x) in pscn), None)
        if k:
            yrs = psc[k]['years']

            def pooled(ys):
                s = n = 0
                for y in ys:
                    c = yrs.get(y)
                    if not c or 'x' in c or None in c:
                        return None
                    s += c[0]; n += c[0]+c[1]
                return 100*s/n if n else None
            pre, post = pooled(['2018-2019', '2019-2020', '2020-2021']), pooled(['2022-2023', '2023-2024', '2024-2025'])
            r['psc_pre'], r['psc_post'] = r3(pre), r3(post)
            r['psc_chg'] = r3(post-pre) if pre is not None and post is not None else None
        rows.append(r)
    return rows, labels(ws, snps['questions'])


def mean(v):
    return sum(v)/len(v)


def strat_diff(x, y, b):
    num = den = 0.0
    for k in set(b):
        y1 = [yy for xx, yy, bb in zip(x, y, b) if bb == k and xx]
        y0 = [yy for xx, yy, bb in zip(x, y, b) if bb == k and not xx]
        if y1 and y0:
            w = len(y1)*len(y0)/(len(y1)+len(y0))
            num += w*(mean(y1)-mean(y0)); den += w
    return num/den if den else None


def ols(X, y):
    """Least squares with standard errors, by solving the normal equations."""
    p = len(X[0]); n = len(y)
    A = [[sum(X[i][a]*X[i][b] for i in range(n)) for b in range(p)] for a in range(p)]
    v = [sum(X[i][a]*y[i] for i in range(n)) for a in range(p)]
    inv = [[float(a == b) for b in range(p)] for a in range(p)]
    M = [row[:] for row in A]
    for c in range(p):
        piv = max(range(c, p), key=lambda r: abs(M[r][c]))
        M[c], M[piv], inv[c], inv[piv] = M[piv], M[c], inv[piv], inv[c]
        d = M[c][c]
        if abs(d) < 1e-12:
            return None
        M[c] = [x/d for x in M[c]]; inv[c] = [x/d for x in inv[c]]
        for r in range(p):
            if r != c and M[r][c]:
                f = M[r][c]
                M[r] = [a-f*b for a, b in zip(M[r], M[c])]; inv[r] = [a-f*b for a, b in zip(inv[r], inv[c])]
    beta = [sum(inv[a][b]*v[b] for b in range(p)) for a in range(p)]
    res = [y[i]-sum(X[i][a]*beta[a] for a in range(p)) for i in range(n)]
    dof = n-p
    if dof <= 0:
        return None
    s2 = sum(e*e for e in res)/dof
    return beta[1], beta[1]/math.sqrt(s2*inv[1][1]) if inv[1][1] > 0 else None


def sample(rows, f, o, base=None):
    out = []
    for r in rows:
        if r.get(f) is None or r.get(o) is None or r.get('band') is None:
            continue
        if base and r.get(base) is None:
            continue
        out.append(r)
    return out


def adjusted(rows, f, o, base=None):
    X = [[1.0, float(bool(r[f])), math.log(r['size'])]+([float(r[base])] if base else []) for r in rows]
    return ols(X, [float(r[o]) for r in rows])


def compare(rows, f, o, base=None, perms=PERMUTATIONS):
    d = sample(rows, f, o, base)
    x, y, b = [bool(r[f]) for r in d], [float(r[o]) for r in d], [r['band'] for r in d]
    n1, n0 = sum(x), len(x)-sum(x)
    obs = strat_diff(x, y, b)
    rnd = random.Random(f'{SEED}:{f}:{o}')
    idx = {k: [i for i, bb in enumerate(b) if bb == k] for k in set(b)}
    hits = 0
    for _ in range(perms):
        xp = x[:]
        for k, ii in idx.items():
            vals = [x[i] for i in ii]; rnd.shuffle(vals)
            for i, v in zip(ii, vals):
                xp[i] = v
        s = strat_diff(xp, y, b)
        if s is not None and abs(s) >= abs(obs)-1e-9:
            hits += 1
    p = (hits+1)/(perms+1)
    bands = []
    for k in range(len(BANDS)):
        y1 = [yy for xx, yy, bb in zip(x, y, b) if bb == k and xx]
        y0 = [yy for xx, yy, bb in zip(x, y, b) if bb == k and not xx]
        bands.append({'band': k, 'n1': len(y1), 'n0': len(y0), 'diff': r3(mean(y1)-mean(y0)) if y1 and y0 else None})
    checked = [bd for bd in bands if bd['n1'] >= 2 and bd['n0'] >= 2 and bd['diff'] is not None]
    holds = bool(checked) and all((bd['diff'] > 0) == (obs > 0) and bd['diff'] != 0 for bd in checked)
    adj = adjusted(d, f, o, base)
    level = 'moderate' if (p < 0.05 and holds and adj and abs(adj[1]) >= 2) else 'limited'
    out = {'feature': f, 'outcome': o, 'baseline': base, 'n1': n1, 'n0': n0, 'mean1': r3(mean([v for v, s in zip(y, x) if s])),
           'mean0': r3(mean([v for v, s in zip(y, x) if not s])), 'difference': r3(mean([v for v, s in zip(y, x) if s])-mean([v for v, s in zip(y, x) if not s])),
           'within_size_groups': r3(obs), 'p': round(p, 4), 'holds_in_each_size_group': holds, 'bands': bands,
           'adjusted': r3(adj[0]) if adj else None, 'adjusted_t': round(adj[1], 2) if adj and adj[1] is not None else None, 'level': level}
    if base:
        out['baseline1'] = r3(mean([float(r[base]) for r in d if r[f]])); out['baseline0'] = r3(mean([float(r[base]) for r in d if not r[f]]))
    return out


def scan(rows):
    feats = [p+k for k in CATS for p in ('L_', 'S_', 'E_')]+['G_'+g for g in GOALS]
    outs = sorted({k for r in rows for k in r if k.startswith(('chg', 'ratio_', 'psc_chg', 'psc_post', 'pses_', 'yoy_', 'gap_', 'snps_', 'eeg_'))})
    tests = hits = 0
    for f in feats:
        for o in outs:
            d = sample(rows, f, o)
            n1 = sum(1 for r in d if r[f]); n0 = len(d)-n1
            if n1 < 5 or n0 < 5 or len(d) < 12:
                continue
            a = adjusted(d, f, o)
            if not a or a[1] is None:
                continue
            tests += 1; hits += abs(a[1]) >= 1.96
    return {'features': len(feats), 'measures': len(outs), 'comparisons': tests, 'at_5_percent': hits, 'expected_by_chance': round(0.05*tests)}


def build():
    rows, names = build_rows()
    L = [r for r in rows if r['L_sponsorship'] is not None]; S = [r for r in rows if r['S_sponsorship'] is not None]
    both = [r for r in rows if r['L_sponsorship'] is not None and r['S_sponsorship'] is not None]
    reporting = {k: {'letters': sum(1 for r in L if r['L_'+k]), 'self_assessments': sum(1 for r in S if r['S_'+k]),
                     'both_documents': sum(1 for r in both if r['L_'+k]), 'both_documents_2024': sum(1 for r in both if r['L_'+k] and r['S_'+k])} for k in CATS}
    goals = {}
    for g, key in [('i', 'G_indigenous_recruitment'), ('v', 'G_racialized_recruitment')]:
        for st in (True, False):
            z = [r for r in rows if r.get(key) is st and r.get(f'rep_{g}_2023') is not None and r.get(f'wfa_{g}_2023')]
            goals[f'{key}_{"set" if st else "not_set"}'] = {'organizations': len(z), 'below_availability_2023': sum(1 for r in z if r[f'rep_{g}_2023'] < r[f'wfa_{g}_2023'])}
    for g, name in [('d', 'disability'), ('i', 'indigenous'), ('v', 'racialized')]:
        z = [r for r in S if r.get(f'rep_{g}_2023') is not None and r.get(f'wfa_{g}_2023')]
        goals[f'{name}_self_assessment_organizations'] = {'organizations': len(z), 'below_availability_2023': sum(1 for r in z if r[f'rep_{g}_2023'] < r[f'wfa_{g}_2023'])}
    goals['set'] = {k: sum(1 for r in S if r.get('G_'+k)) for k in GOALS}
    return {
        'title': 'What organizations reported in the Call to Action, compared with published results',
        'title_fr': 'Ce que les organisations ont déclaré dans le cadre de l’appel à l’action, comparé aux résultats publiés',
        'method': ['Each organization counts once. Actions are identified by keyword in the summaries of the 2021 letter commitments and the 2024 self-assessment progress items on the Call to Action page.',
                   'Size groups use employees on March 31, 2026, from the Treasury Board population statistics, or the 2025 Treasury Board employment equity count where that is missing.',
                   'A difference holds in each size group when it points the same way in every size group with at least two organizations on each side.',
                   f'The chance check reshuffles which organizations reported the action, within each size group, {PERMUTATIONS:,} times. p is the share of reshuffles with a difference at least as large.',
                   'The adjusted difference accounts for organization size (logarithm of employees) and, for changes, the starting value.',
                   'Moderate evidence: the difference holds in each size group, p is below 0.05 and the adjusted difference is at least twice its standard error. Limited evidence: one or more of these is not met.',
                   'The scan compares each kind of action, in the letters, in the self-assessments and in either document, and each goal, with each published measure, accounting for size, wherever at least 5 organizations are on each side and 12 in all. It counts the comparisons where the adjusted difference is at least 1.96 times its standard error, the usual 5% threshold, and the number that chance alone would produce.',
                   SHARED_NOTE],
        'method_fr': ['Chaque organisation compte une fois. Les mesures sont repérées par mots-clés dans les résumés des engagements des lettres de 2021 et des progrès déclarés dans les autoévaluations de 2024, présentés sur la page de l’appel à l’action.',
                      'Les groupes de taille utilisent le nombre d’employés au 31 mars 2026, tiré des statistiques sur la population du Conseil du Trésor, ou le nombre de 2025 du Conseil du Trésor sur l’équité en matière d’emploi lorsqu’il manque.',
                      'Un écart se maintient dans chaque groupe de taille lorsqu’il va dans le même sens dans chaque groupe de taille comptant au moins deux organisations de chaque côté.',
                      'La vérification du hasard redistribue '+f'{PERMUTATIONS:,}'.replace(',', ' ')+' fois, au sein de chaque groupe de taille, les organisations qui ont déclaré la mesure. p est la part des redistributions qui produisent un écart au moins aussi grand.',
                      'L’écart ajusté tient compte de la taille des organisations (logarithme du nombre d’employés) et, pour les variations, de la valeur de départ.',
                      'Niveau de preuve moyen\u00a0: l’écart se maintient dans chaque groupe de taille, p est inférieur à 0,05 et l’écart ajusté vaut au moins deux fois son erreur type. Niveau de preuve faible\u00a0: au moins une de ces conditions n’est pas remplie.',
                      'Le balayage compare chaque type de mesure, dans les lettres, dans les autoévaluations et dans l’un ou l’autre document, et chaque objectif, avec chaque mesure publiée, en tenant compte de la taille, partout où au moins 5 organisations se trouvent de chaque côté et 12 au total. Il compte les comparaisons où l’écart ajusté vaut au moins 1,96 fois son erreur type, le seuil habituel de 5\u00a0%, et le nombre que le hasard seul produirait.',
                      'Les organisations qui partagent une même ligne dans les tableaux du Conseil du Trésor sont exclues des résultats sur la représentation.'],
        'size_groups': [{'from': a, 'to': None if b == 10**9 else b-1, 'en': l[0], 'fr': l[1]} for (a, b), l in zip(BANDS, BAND_LABELS)],
        'categories': {k: {'keywords': rx, 'en': en, 'fr': fr} for k, (rx, en, fr) in CATS.items()},
        'outcomes': names,
        'reporting': reporting,
        'documents': {'letters': len(L), 'self_assessments': len(S), 'both': len(both)},
        'goals': goals,
        'comparisons': [compare(rows, f, o, b) for f, o, b in SELECTED],
        'scan': scan(rows),
        'organizations': rows,
    }


def main():
    data = build()
    text = json.dumps(data, ensure_ascii=False, indent=1)+'\n'
    if '--check' in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding='utf-8') != text:
            sys.exit('data/call-to-action-comparisons.json is out of date: run python scripts/build-cta-comparisons.py')
        print('same')
        return
    OUT.write_text(text, encoding='utf-8')
    print(f"{OUT.relative_to(ROOT)}: {len(data['organizations'])} organizations, {len(data['comparisons'])} comparisons, scan {data['scan']}")


if __name__ == '__main__':
    main()
