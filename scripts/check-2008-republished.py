#!/usr/bin/env python3
"""Reproduce the 2008 numeric comparison using the 2011 question dictionary.

This does not independently establish 2008 question wording or employer identity.
Run from the repository root, or supply --original, --dictionary and --republished.
"""
import argparse
import csv
import gzip
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'data/register-gaps-manifest.json').read_text())
entry = next(e for e in manifest['entries'] if e['id'] == 'GC-0002')
archive = next(f for f in entry['files'] if f.get('path') and f.get('stored'))
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--original', type=Path, default=ROOT / archive['path'])
parser.add_argument('--dictionary', type=Path, default=ROOT / 'data/public-source-archive-2026-11-24/pses2011-overall.csv')
parser.add_argument('--republished', type=Path, default=ROOT / 'data/open-canada-2026-11/pses-2019/2019_PSES_SAFF_-20subset-1_Sous-ensemble-1.csv.gz')
args = parser.parse_args()

def opener(path, mode):
    fn = gzip.open if path.suffix == '.gz' else open
    return fn(path, mode, **({'encoding': 'cp1252', 'newline': ''} if mode == 'rt' else {}))

def checksum(path):
    h = hashlib.sha256()
    with opener(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()

assert checksum(args.original) == archive['sha256'], '2008 original checksum mismatch'
assert checksum(args.dictionary) == 'fa418a834355dbaad096cabf1b7e96a6c2a39441df13e673bea65c0715e0f235', '2011 dictionary checksum mismatch'
assert checksum(args.republished) == '37a736b0614af8a4cf594b24598731b43911a306ba84c0ee47d1f0bb72983a37', '2019 subset checksum mismatch'

def norm(s):
    s = unicodedata.normalize('NFKC', s).replace('’', "'")
    return re.sub(r'\s+', ' ', re.sub(r'^Question\s+\d+[a-z]?\.\s*', '', s, flags=re.I)).strip().lower()

with opener(args.dictionary, 'rt') as f:
    labels = {norm(x['TITLE_E']): x['QUESTION'] for x in csv.DictReader(f)}
orig = {}
with opener(args.original, 'rt') as f:
    for row in csv.reader(f):
        if len(row) != 22 or row[5] != '2008' or row[6].strip() or any(int(v or 0) for v in row[1:5]):
            continue
        key = (int(row[0]), row[8])
        value = (row[16], row[18], row[21])
        assert key not in orig or orig[key] == value, ('Conflicting original cells', key)
        orig[key] = value
rep = {}
with opener(args.republished, 'rt') as f:
    for row in csv.DictReader(f):
        if row['SURVEYR'] != '2008' or row['BYCOND'].strip() or any(int(row[k] or 0) for k in ('LEVEL2ID','LEVEL3ID','LEVEL4ID','LEVEL5ID')):
            continue
        q = labels.get(norm(row['TITLE_E']))
        if q:
            key = (int(row['LEVEL1ID']), q)
            value = tuple(row[k] for k in ('POSITIVE','NEGATIVE','ANSCOUNT'))
            assert key not in rep or rep[key] == value, ('Conflicting republished cells', key)
            rep[key] = value
common = orig.keys() & rep.keys()
bad = [k for k in common if orig[k] != rep[k]]
assert len(orig) == 4560 and len(rep) == 1080 and len(common) == 1040, 'Unexpected coverage'
assert len({k[0] for k in common}) == 52 and sum(k[0] == 0 for k in common) == 20, 'Unexpected organization coverage'
assert not bad, ('Differences', bad[:10])
print('2008 PSES: 1,040 matched numerical records, no differences; 2011 dictionary used; original 2008 wording and identity not independently verified.')
