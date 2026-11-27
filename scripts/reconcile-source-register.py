#!/usr/bin/env python3
"""Reconcile the 538-entry public source register against the current repository.

Reads data/public-source-register-2026-11-24.json (left unchanged) and the
2026-11-25 metadata reconciliation, then checks the current repository tree.
Writes data/source-register-status.json with one record per register entry and
seven separate statuses:

  verified      repository bytes (or the decompressed original of a .gz copy)
                match a recorded SHA-256 (or, for files kept on
                the pses-data branch, the partition manifest hash matches the
                large-source inventory hash)
  hosted        a repository copy exists (main tree or pses-data branch)
  downloadable  a hosted copy is linked from a visitor page or catalogue
  searchable    the source is listed in the data assistant catalogue
  departmental  the source or its hosted copy is cited on an organization page
  analysis      the source or its hosted copy is used by a build or analysis file
  excluded      the register marks it out of scope, nonexistent, blocked or
                not approved

Matching is by publisher URL, resource UUID, file name and repository path.
A missing match is recorded as "no evidence found", not as proof of absence.

Usage: python3 scripts/reconcile-source-register.py [--check]
"""
import gzip, hashlib, json, re, sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/source-register-status.json'
REGISTER = ROOT / 'data/public-source-register-2026-11-24.json'
PRIOR = ROOT / 'docs/source-reconciliation-2026-11-25.json'
EXCLUDED_STATUS = {'out-of-scope', 'nonexistent', 'blocked'}
UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
SKIP_DIRS = {'.git', 'node_modules'}
SELF = {OUT.name, REGISTER.name, PRIOR.name, 'source-reconciliation-2026-11-24.json'}


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def read_text_files():
    groups = {'visitor': {}, 'assistant': {}, 'departmental': {}, 'analysis': {}}
    org_dirs = set()
    pages = json.loads((ROOT / 'assets/department-pages.json').read_text(encoding='utf-8'))
    for org in pages.get('organizations', []):
        slug = org.get('slug') or org.get('id') or ''
        if slug:
            org_dirs.add(slug.strip('/').split('/')[0])
    org_dirs |= {p.parent.name for p in ROOT.glob('*/index.html')
                 if (p.parent / 'index.html').read_text(encoding='utf-8', errors='ignore').count('dept-') > 0}
    for p in ROOT.rglob('*'):
        if not p.is_file() or SKIP_DIRS & set(p.parts) or p.name in SELF:
            continue
        if p.suffix not in {'.html', '.json', '.js', '.mjs', '.cjs', '.py'} or p.stat().st_size > 30e6:
            continue
        rel = p.relative_to(ROOT).as_posix()
        text = p.read_text(encoding='utf-8', errors='ignore')
        top = rel.split('/')[0]
        if rel in ('assets/assistant-catalogue.json', 'gc-data-library.js', 'data-catalogue.html'):
            groups['assistant'][rel] = text
        if p.suffix == '.html' or rel.endswith('catalogue.json') or rel.startswith('assets/'):
            groups['visitor'][rel] = text
        if top in org_dirs or rel.startswith('data/department-profiles/') or rel == 'assets/department-pages.json':
            groups['departmental'][rel] = text
        if (rel.startswith('scripts/build-') or rel in ('data/where-data-agree.json', 'data/evidence-review-50.json',
                'data/pses-trend-2019-2024.json', 'data/call-to-action-comparisons.json', 'where-data-agree.js')
                or rel.startswith('systemic-change/')):
            groups['analysis'][rel] = text
    return groups


def keys_for(entry, hosted_paths):
    keys = set()
    url = entry.get('source') or ''
    if url.startswith('http'):
        clean = unquote(url).split('?')[0].rstrip('/')
        keys |= {url, clean}
        tail = clean.split('/')[-1]
        if len(tail) > 12 and '.' in tail:
            keys.add(tail)
        # Resource UUIDs identify a single file; dataset UUIDs alone are too broad.
        m = re.search(r'/resource/(' + UUID.pattern + ')', clean)
        if m:
            keys.add(m.group(1))
    for path in hosted_paths:
        keys.add(path)
        name = path.split('/')[-1]
        if len(name) > 12:
            keys.add(name)
    return keys


def found_in(group, keys):
    return sorted(f for f, t in group.items() if any(k in t for k in keys))


def main():
    register = json.loads(REGISTER.read_text(encoding='utf-8'))
    prior = {r['id']: r for r in json.loads(PRIOR.read_text(encoding='utf-8'))['rows']}
    checksums = {}
    for line in (ROOT / 'data/checksums.sha256').read_text().splitlines():
        if '  ' in line:
            digest, path = line.split('  ', 1)
            checksums[path] = digest
    large = {f['url']: f for f in json.loads((ROOT / 'data/large-sources-inventory.json').read_text())['files']}
    manifest = {}
    for ds in json.loads((ROOT / 'data/pses-large-manifest.json').read_text())['datasets']:
        for src in ds['sources']:
            manifest[src['url']] = src
    url_paths = {}
    psc = json.loads((ROOT / 'data/psc/catalogue.json').read_text(encoding='utf-8'))
    for f in psc.get('files', []) + psc.get('snps', []):
        if f.get('url') and f.get('path'):
            url_paths.setdefault(f['url'], []).append((f['path'], f.get('sha256')))
    for r in json.loads((ROOT / 'docs/publisher-recovery-2026-11-25.json').read_text())['results']:
        if r.get('publisherUrl') and r.get('path'):
            url_paths.setdefault(r['publisherUrl'], []).append((r['path'], r.get('sha256')))

    groups = read_text_files()
    rows, counts = [], {k: 0 for k in ('verified', 'hosted', 'downloadable', 'searchable',
                                         'departmental', 'analysis', 'excluded', 'noEvidence')}
    for e in register['entries']:
        url = e.get('source') or ''
        candidates = []  # (path, expected sha, how)
        for m in prior.get(e['id'], {}).get('matches', []):
            candidates.append((m.get('path'), m.get('sha256'), m.get('type'), m))
        for path, digest in url_paths.get(url, []):
            candidates.append((path, digest, 'publisher-catalogue', {}))
        hosted, verified = [], None
        for path, digest, how, m in candidates:
            if not path:
                continue
            if m.get('branch') == 'pses-data':
                src = manifest.get(url)
                inv = large.get(url)
                if src and len(src.get('parts', [])) == m.get('parts'):
                    hosted.append('pses-data:' + path)
                    if src.get('sha256') in {(inv or {}).get('sha256'), m.get('sha256')}:
                        verified = verified or 'partition-manifest-hash'
                continue
            p = ROOT / path
            if not p.is_file():
                continue
            hosted.append(path)
            expected = digest or checksums.get(path)
            if expected and sha256(p) == expected:
                verified = 'sha256'
            elif expected and p.suffix == '.gz' and hashlib.sha256(gzip.decompress(p.read_bytes())).hexdigest() == expected:
                verified = 'sha256-of-decompressed-original'
        hosted = sorted(set(hosted))
        plain = [h for h in hosted if not h.startswith('pses-data:')]
        keys = keys_for(e, plain + [h.split(':', 1)[1] for h in hosted if h.startswith('pses-data:')])
        link_keys = keys if plain else {k for k in keys if not k.startswith('data/')}
        status = {
            'verified': verified or False,
            'hosted': hosted,
            'downloadable': bool(hosted) and bool(found_in(groups['visitor'], keys)),
            'searchable': found_in(groups['assistant'], keys) != [],
            'departmental': len(found_in(groups['departmental'], link_keys)),
            'analysis': found_in(groups['analysis'], keys),
            'excluded': None,
        }
        if not e.get('approved'):
            status['excluded'] = 'not approved in the source register'
        elif e.get('inventoryStatus') in EXCLUDED_STATUS:
            status['excluded'] = 'register status: ' + e['inventoryStatus']
        for k in ('verified', 'hosted', 'downloadable', 'searchable', 'departmental', 'analysis'):
            if status[k]:
                counts[k] += 1
        if status['excluded']:
            counts['excluded'] += 1
        elif not any(status[k] for k in ('hosted', 'searchable', 'departmental', 'analysis')):
            counts['noEvidence'] += 1
        rows.append({'id': e['id'], 'name': e['name'], 'family': e['family'], 'period': e.get('period'),
                     'publisher': e.get('publisher'), 'source': url, 'inventoryStatus': e.get('inventoryStatus'),
                     'approved': e.get('approved'), **status})
    out = {
        'asOf': '2026-11-26',
        'register': REGISTER.relative_to(ROOT).as_posix(),
        'method': ('Each register entry is checked against the current repository: recorded SHA-256 values, '
                   'the pses-data partition manifest, publisher URLs, resource UUIDs, file names and repository '
                   'paths. Counts for departmental pages are the number of organization files citing the source. '
                   'No match means no evidence was found in this repository, not that the source is unavailable.'),
        'entries': len(rows),
        'counts': counts,
        'rows': rows,
    }
    text = json.dumps(out, ensure_ascii=False, indent=1) + '\n'
    if '--check' in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding='utf-8') != text:
            sys.exit('source-register-status.json is out of date: run scripts/reconcile-source-register.py')
        print('SOURCE REGISTER STATUS: current;', json.dumps(counts))
        return
    OUT.write_text(text, encoding='utf-8')
    print('SOURCE REGISTER STATUS:', len(rows), 'entries', json.dumps(counts))


if __name__ == '__main__':
    main()
