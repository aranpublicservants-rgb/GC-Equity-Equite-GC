#!/usr/bin/env python3
"""Validate department-level reading extracts and expose reproducible barrier source cells.
Only published, exact organization cells are used. Suppressed cells stay suppressed.
"""
import base64
import gzip
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
index = json.loads((ROOT / 'assets/department-profile-index.json').read_text())
result = []
for name, rec in index['organizations'].items():
    payload = gzip.decompress(base64.b64decode((ROOT / rec['path']).read_text()))
    assert hashlib.sha256(payload).hexdigest() == rec['sha256'], name
    profile = json.loads(payload)
    assert profile['organization'] == name and profile['period'] == '2024', name
    overall = profile['overall']
    result.append([name, profile['fr'], *[overall.get(q, ['', '']) for q in ('Q72', 'Q86', 'Q87', 'Q88')]])
assert len(result) == len(index['organizations'])
# These are public source cells, not individual records. The structured line is
# suitable for independently reproducing the static comparative tables.
print('BARRIER_SOURCE_CELLS=' + json.dumps(result, ensure_ascii=False, separators=(',', ':')))
print('BARRIER SOURCE AUDIT: verified', len(result), 'organization profiles and conditional question bases')
