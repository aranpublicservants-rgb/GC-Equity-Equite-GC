#!/usr/bin/env python3
"""Reconcile the 538-entry public source register against the current repository.

Reads data/public-source-register-2026-11-24.json (left unchanged) and the
2026-11-25 metadata reconciliation, then checks the current repository tree.
Writes data/source-register-status.json with one record per register entry and
seven separate statuses:

  verified      how the copy was confirmed: sha256 (or of the decompressed original),
                partition-manifest-hash, or exact-size (same byte count as the
                register, used only when one hosted file has that size).
                Repository bytes (or the decompressed original of a .gz copy)
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


# Entries excluded by standing site content rules, in addition to the register's own statuses.
RULE_EXCLUDED = {'GC-0460': 'site content rule: no vaccination data'}
DATA_ROOTS = ('data/', 'women-femmes/data/', 'dfo/data/', 'dnd/data/', 'isc/data/')


def period_match(period, path):
    """True when a file name carries the entry's period (2018-2019, 2018-19, 2018_2019)."""
    years = re.findall(r'(?:19|20)\d\d', period or '')
    if not years:
        return False
    name = path.rsplit('/', 1)[-1]
    if len(years) >= 2:
        a, b = years[0], years[1]
        return any(x in name for x in (f'{a}-{b}', f'{a}-{b[2:]}', f'{a}_{b}', f'{a}{b[2:]}'))
    return years[0] in name


def size_index():
    """Map byte size to hosted files, using the decompressed size for .gz copies."""
    index = {}
    for p in ROOT.rglob('*'):
        rel = p.relative_to(ROOT).as_posix()
        if not p.is_file() or not rel.startswith(DATA_ROOTS) or p.suffix in ('.json', '.b64') or 'checksums' in p.name:
            continue
        index.setdefault(p.stat().st_size, []).append((rel, 'file'))
        if p.suffix == '.gz' and p.stat().st_size < 60e6:
            with gzip.open(p, 'rb') as f:
                n = 0
                for block in iter(lambda: f.read(1 << 20), b''):
                    n += len(block)
            index.setdefault(n, []).append((rel, 'decompressed'))
    return index


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

    eq = json.loads((ROOT / 'assets/equity-reports.json').read_text(encoding='utf-8'))
    for item in eq.get('datasets', []) + eq.get('reports', []):
        for link in item.get('links', []):
            if item.get('source') and link.get('path'):
                url_paths.setdefault(item['source'], []).append((link['path'], None))
    added = json.loads((ROOT / 'assets/added-sources.json').read_text(encoding='utf-8'))
    for pkg in added.get('packages', []):
        for f in pkg.get('files', []):
            url_paths.setdefault(pkg['url'], []).append((f['path'], f.get('sha256')))
    for t in added.get('tables', []):
        for side in ('en', 'fr'):
            if t.get(side, {}).get('path'):
                url_paths.setdefault(t['url'], []).append((t[side]['path'], None))
    gaps = {}
    gap_file = ROOT / 'data/register-gaps-manifest.json'
    if gap_file.exists():
        for item in json.loads(gap_file.read_text(encoding='utf-8'))['entries']:
            gaps[item['id']] = [dict(f, datasetLevel=item.get('datasetLevel', False)) for f in item.get('files', []) if f.get('stored')]
    sizes = size_index()
    url_count = {}
    for x in register['entries']:
        url_count[x.get('source')] = url_count.get(x.get('source'), 0) + 1

    def url_candidates(url, entry):
        """Hosted files a catalogue links to this publisher address. When several register
        entries share one dataset address, keep only files named for this entry's period,
        and only if they are one table (allowing CSV/XLSX and English/French copies)."""
        items = [(p, d) for p, d in url_paths.get(url, []) if (ROOT / p).is_file()]
        if url_count.get(url, 0) <= 1:
            return items
        items = [(p, d) for p, d in items if period_match(entry.get('period'), p)]
        stems = {re.sub(r'(-(en|fr))?\.(csv|xlsx|xls|csv\.gz)$', '', p) for p, _ in items}
        return items if len(stems) == 1 else []
    groups = read_text_files()
    rows, counts = [], {k: 0 for k in ('verified', 'hosted', 'downloadable', 'searchable',
                                         'departmental', 'analysis', 'excluded', 'noEvidence')}
    for e in register['entries']:
        url = e.get('source') or ''
        candidates = []  # (path, expected sha, how)
        for m in prior.get(e['id'], {}).get('matches', []):
            candidates.append((m.get('path'), m.get('sha256'), m.get('type'), m))
        for path, digest in url_candidates(url, e):
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
            expected = digest
            if expected and sha256(p) == expected:
                verified = 'sha256'
            elif expected and p.suffix == '.gz' and hashlib.sha256(gzip.decompress(p.read_bytes())).hexdigest() == expected:
                verified = 'sha256-of-decompressed-original'
        for f in gaps.get(e['id'], []) if not hosted else []:
            # Copies made by scripts/fetch-register-gaps.py: check the stored bytes again.
            if f.get('path') and (ROOT / f['path']).is_file():
                p = ROOT / f['path']
                ok = hashlib.sha256(gzip.decompress(p.read_bytes())).hexdigest() == f['sha256']
                hosted.append(f['path'])
                if ok and not verified:
                    verified = ('page-snapshot' if f.get('kind') == 'page-snapshot' else
                                'dataset-level-copy' if f.get('datasetLevel') else 'sha256-recorded-at-download')
            elif f.get('branch') == 'pses-data':
                hosted.append('pses-data:' + f['directory'])
                if not verified and sum(x['rows'] for x in f['parts']) == f.get('rows'):
                    verified = 'sha256-recorded-at-download'
        size = e.get('bytes')
        same = sizes.get(size, []) if size and size > 400 else []
        if hosted and not verified and any(p in hosted for p, _ in same):
            verified = 'exact-size-' + next(h for p, h in same if p in hosted)
        if not hosted and not verified and len(same) == 1:
            # One hosted file has exactly the register's byte count: that file is the copy.
            path, how = same[0]
            hosted = [path]
            verified = 'exact-size-' + how
        if e['id'] in RULE_EXCLUDED:
            hosted = []
            verified = None
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
        if e['id'] in RULE_EXCLUDED:
            status['excluded'] = RULE_EXCLUDED[e['id']]
        elif not e.get('approved'):
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
