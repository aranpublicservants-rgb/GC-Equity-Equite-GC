#!/usr/bin/env python3
"""Prepare three Treasury Board population tables whose language files disagree.

For the tables by department and sex, first official language, and age band, the
English and French files published on open.canada.ca are not identical: in a few
rows one file gives a count where the other gives the suppression symbol "*".
This script writes a copy of each file in which a cell is "*" whenever EITHER
language file suppresses it. No number is changed or calculated. The untouched
originals are not stored in this repository.

Usage: build-harmonized-population.py FOLDER_WITH_THE_SIX_ORIGINAL_FILES
"""
import csv, io, json, sys, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POP = ROOT / 'data/open-canada-2026-11/tbs-fps-population-2010-2026'
OUT = ROOT / 'data/open-canada-2026-11/tbs-fps-population-2010-2026-suppression-aligned'
PREFIX = 'population-of-the-federal-public-service-'
TOTAL = '\x00total'
TABLES = ['by-department-and-sex', 'by-department-and-first-official-language', 'by-department-and-age-band']

def read(path):
    raw = path.read_bytes()
    try: text = raw.decode('utf-8-sig')
    except UnicodeDecodeError: text = raw.decode('cp1252')
    rows = [r for r in csv.reader(io.StringIO(text)) if any(c != '' for c in r)]
    return rows[0], rows[1:]

def write(path, head, rows):
    buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n'); w.writerow(head); w.writerows(rows)
    path.write_bytes(('﻿' + buf.getvalue()).encode('utf-8'))

src = Path(sys.argv[1])
# English to French organization names, from the row-aligned tables already stored.
fr_of = {}
for en in POP.glob('*by-department*-en.csv'):
    he, re_ = read(en); hf, rf = read(en.with_name(en.name[:-7] + '-fr.csv'))
    i = he.index('Department or agency')
    for a, b in zip(re_, rf): fr_of.setdefault(a[i], set()).add(b[i])
en_of = {f: e for e, fs in fr_of.items() for f in fs}
import re, unicodedata
def loose(name):
    name = unicodedata.normalize('NFD', name)
    return re.sub(r'[^a-z0-9]+', '', ''.join(c for c in name if unicodedata.category(c) != 'Mn').lower())
loose_en_of = {loose(f): e for f, e in en_of.items()}

OUT.mkdir(parents=True, exist_ok=True)
report = {}
paired = {}
french = {}
for t in TABLES:
    he, e = read(src / f'{PREFIX}{t}-march-2026-en.csv'); hf, f = read(src / f'{PREFIX}{t}-march-2026-fr.csv')
    assert len(he) == 4 and len(hf) == 4, 'unexpected columns'
    # Both files mark an organization total as "<name> Total" in the name column.
    base = lambda n: n[:-6] if n.endswith(' Total') else n
    en_names = {base(a[1]) for a in e}
    pair = {}
    for name in sorted({base(b[1]) for b in f}):
        guess = en_of.get(name) or loose_en_of.get(loose(name))
        if guess in en_names: pair[name] = guess
    # Organizations named differently here than in the row-aligned tables are paired by
    # their published values: the pair must share nearly every (year, value) entry.
    for name in sorted({base(b[1]) for b in f} - set(pair)):
        mine = collections.Counter((b[0], b[3]) for b in f if base(b[1]) == name and b[3] != '*')
        score = lambda c: sum((mine & collections.Counter((a[0], a[3]) for a in e if base(a[1]) == c and a[3] != '*')).values())
        best = max(sorted(en_names), key=score)
        assert score(best) > 0.9 * max(1, sum(mine.values())), f'no reliable English match for {name}'
        pair[name] = best; paired[name] = best
    # A French name can change over the years while the English name stays the same.
    def en_key(a):
        return (a[0], base(a[1])), (TOTAL if a[1].endswith(' Total') or a[2] == 'Total' else a[2])
    def fr_key(b):
        return (b[0], pair[base(b[1])]), (TOTAL if b[1].endswith(' Total') or b[2] == 'Total' else b[2])
    E = collections.defaultdict(dict); F = collections.defaultdict(dict)
    for a in e:
        k, label = en_key(a); E[k][label] = a[3]
    for b in f:
        k, label = fr_key(b); F[k][label] = b[3]
    votes = collections.Counter()
    for k, ev in E.items():
        for c, v in ev.items():
            for c2, v2 in F.get(k, {}).items():
                if v == v2 and v != '*': votes[(c, c2)] += 1
    cat = {}
    for c in sorted({en_key(a)[1] for a in e}):
        fr_labels = {fr_key(b)[1] for b in f}
        en_labels = {en_key(a)[1] for a in e}
        cat[c] = c if c in fr_labels else max((n, c2) for (c1, c2), n in votes.items() if c1 == c and c2 not in en_labels)[1]
    assert len(set(cat.values())) == len(cat), 'category labels do not pair one to one'
    back = {v: k for k, v in cat.items()}
    en_hidden = fr_hidden = other = 0
    for a in e:
        k, label = en_key(a)
        v2 = F.get(k, {}).get(cat[label])
        if v2 == '*' and a[3] != '*': a[3] = '*'; en_hidden += 1
        elif v2 is not None and v2 != a[3] and a[3] != '*': other += 1
    for b in f:
        k, label = fr_key(b)
        v = E.get(k, {}).get(back[label])
        if v == '*' and b[3] != '*': b[3] = '*'; fr_hidden += 1
    assert other == 0, f'{t}: {other} rows differ in a published number, not only in suppression'
    write(OUT / f'{PREFIX}{t}-march-2026-en.csv', he, e); write(OUT / f'{PREFIX}{t}-march-2026-fr.csv', hf, f)
    names = {}
    for fr_name, en_name in pair.items(): names.setdefault(en_name, []).append(fr_name)
    french[t] = names
    report[t] = {'cellsSuppressedInEnglishCopy': en_hidden, 'cellsSuppressedInFrenchCopy': fr_hidden}
(OUT / 'README.json').write_text(json.dumps({'method': 'A cell is "*" when either official-language file published by the Treasury Board of Canada Secretariat suppresses it. No number is changed.', 'tables': report, 'organizationNamesPairedByValues': paired, 'frenchNames': french}, indent=1) + '\n', encoding='utf-8')
print(json.dumps(report))
