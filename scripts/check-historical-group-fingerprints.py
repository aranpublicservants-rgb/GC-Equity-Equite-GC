#!/usr/bin/env python3
"""Protect numeric matrices checked against the original 2008–2017 survey files.

The expected values are fingerprints independently extracted from the original files;
the records are kept in docs/verification-*.json. Check only successful matches.
The noncryptographic FNV-1a fingerprint is a regression check, not original-file
SHA-256 verification. Missing or ambiguous historical identities are documented
separately and must not be silently filled.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'docs'
GROUPS = ['Woman', 'Indigenous', 'Person with a disability', 'Racialized']
Q17 = ['Q12','Q42','Q43','Q45','Q53','Q63','Q70','Q81']
Q14 = ['Q42','Q43','Q45','Q53','Q63','Q70']
QOLD = ['Q43','Q45','Q53']

def load(p):
    return json.loads(p.read_text(encoding='utf-8'))

def fingerprint(values):
    h = 14695981039346656037
    for b in '|'.join(values).encode('ascii'):
        h = ((h ^ b) * 1099511628211) & ((1 << 64) - 1)
    return f'{h:016x}'

def cells(org, year, questions, field='values'):
    data = load(ROOT / 'assets/department-group-trends' / (org + '.json'))
    groups = {g['group']: {r['q']: r for r in g['rows']} for g in data['groups']}
    out = []
    for g in GROUPS:
        for q in questions:
            v = groups.get(g, {}).get(q, {}).get(field, {}).get(year)
            out.append(','.join(map(str, v[:2])) if v else ',')
    return out

def assert_matrix(org, year, questions, expected, count, field='values'):
    values = cells(org, year, questions, field)
    assert len([v for v in values if v != ',']) == count, (org, year, field, 'coverage changed')
    assert fingerprint(values) == expected, (org, year, field, 'values changed; review original source')

def main():
    tested = set()
    n = 0
    for p in sorted(DOC.glob('verification-2017-group-fingerprints-*.json')):
        for r in load(p)['rows']:
            if not r.get('count') or r.get('actual') != r.get('expected'):
                continue
            assert_matrix(r['id'], '2017', Q17, r['expected'], r['count'])
            if r.get('national') == '32387b6cf7895b04':
                assert_matrix(r['id'], '2017', Q17, '32387b6cf7895b04', 32, 'ps')
            tested.add((r['id'], '2017'))
            n += r['count']
    extra = load(DOC / 'verification-2017-group-summary.json')['additionalCanonicalMatch']
    assert_matrix(extra['canonical'], '2017', Q17, extra['expected'], extra['count'])
    tested.add((extra['canonical'], '2017'))
    n += extra['count']
    for p in sorted(DOC.glob('verification-2008-2014-group-matrices-*.json')):
        for r in load(p)['rows']:
            for c in r.get('cycles', []):
                if c['expected'] == '-' or c['actual'] != c['expected']:
                    continue
                assert_matrix(r['id'], c['year'], Q14 if c['year'] == '2014' else QOLD, c['expected'], c['count'])
                tested.add((r['id'], c['year']))
                n += c['count']
    for year, qs, expected, count in [('2014', Q14, 'd1e97affc46c5e45', 24), ('2011', QOLD, '6e2a8f99c86d9bf4', 12), ('2008', QOLD, '0465152205bdae97', 12)]:
        assert_matrix('dnd', year, qs, expected, count, 'ps')
    assert len(tested) == 218, len(tested)
    assert n == 4152, n
    print(f'HISTORICAL GROUP MATRICES: {len(tested)} organization-cycle checks; {n:,} matched departmental records and 80 distinct national comparator records.')

if __name__ == '__main__':
    main()
