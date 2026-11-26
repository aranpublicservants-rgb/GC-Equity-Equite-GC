#!/usr/bin/env python3
"""Build or verify checksums for every hosted data and data-catalogue file."""
import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/checksums.sha256'
FOLDERS = ['data', 'assets', 'dfo/data', 'dnd/data', 'isc/data', 'women-femmes/data',
           'women-femmes/assets', 'racism-hazard-prevention/data']


def manifest():
    files = {p for folder in FOLDERS for p in (ROOT / folder).rglob('*') if p.is_file() and p != OUT}
    return ''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(ROOT).as_posix()+'\n'
                   for p in sorted(files))


def assets_manifest():
    """Refresh only the assets subtree in a sparse checkout; preserve every other row."""
    rows = {}
    for line in OUT.read_text().splitlines():
        if line.strip():
            digest, name = line.split(None, 1)
            if not name.startswith('assets/'):
                rows[name] = digest
    for p in (ROOT / 'assets').rglob('*'):
        if p.is_file():
            rows[p.relative_to(ROOT).as_posix()] = hashlib.sha256(p.read_bytes()).hexdigest()
    return ''.join(rows[name]+'  '+name+'\n' for name in sorted(rows, key=Path))


if __name__ == '__main__':
    if '--assets-only' in sys.argv and '--check' in sys.argv:
        raise SystemExit('Use full checkout for checksum verification.')
    contents = assets_manifest() if '--assets-only' in sys.argv else manifest()
    if '--check' in sys.argv:
        old = OUT.read_text().splitlines()
        new = contents.splitlines()
        if old != new:
            import difflib
            differences = list(difflib.unified_diff(old, new, fromfile='committed checksums', tofile='computed checksums', n=0))
            print('Hosted data checksum manifest requires updating. First changed lines:', file=sys.stderr)
            for line in differences[:32]:
                print(line.rstrip(), file=sys.stderr)
            raise SystemExit('Hosted data checksum coverage is stale. Run scripts/update-data-checksums.py.')
        print(f'PASS: all {len(contents.splitlines()):,} hosted data and catalogue checksums match')
    else:
        OUT.write_text(contents)
        print(f'Updated {len(contents.splitlines()):,} hosted data and catalogue checksums')
