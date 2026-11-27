#!/usr/bin/env python3
"""Download public source register entries that have no copy in this repository.

Usage: fetch-register-gaps.py <work directory> [--plan] [--limit N] [--max-bytes B] [--ids GC-0001,GC-0002]
  --limit N      take at most N entries in this run (smaller runs finish within the
                 GitHub time limit; later runs continue with what is still missing)
  --max-bytes B  skip entries whose register size is larger than B bytes
  --ids          take only the listed register entries
  --budget M     stop starting new entries after M minutes, save what was stored and
                 print REMAINING <n> so the workflow can start the next run
Entries already recorded in data/register-gaps-manifest.json are kept and merged.

Targets are the in-scope entries of data/public-source-register-2026-11-24.json that
data/source-register-status.json marks as not hosted, minus entries with no publisher
address. Runs in GitHub Actions, where open.canada.ca and canada.ca can be reached.

Nothing is edited, rebuilt or summarised:
  * a direct CSV or file address is downloaded byte for byte;
  * CSV files up to SMALL_MAX bytes are stored as one gzip file under
    data/register-gaps-2026-11/<entry id>/ on main;
  * larger CSV files are split into gzip parts of at most PART_BYTES, each part
    starting with the published header, for the pses-data branch under
    register-gaps/<entry id>/ (the same method as scripts/partition-large-pses.py);
    the script stops unless the part rows add up to the source rows;
  * an open.canada.ca dataset page is resolved through the public catalogue API and
    each listed file (CSV, XLSX, XLS, DOCX, PDF, PPTX, TXT) up to FILE_MAX bytes is
    stored, gzip-compressed, with its own record;
  * a canada.ca or publications.gc.ca web page is stored as a gzip snapshot of the
    HTML for provenance; it is not served as a page.

<work>/main/ mirrors files for the main branch; <work>/branch/ mirrors files for the
pses-data branch. <work>/main/data/register-gaps-manifest.json records, for every
target, the publisher address, retrieval time, original bytes, SHA-256 of the
original bytes, row count for CSV files, stored paths, and any failure.
"""
import gzip, hashlib, json, re, subprocess, sys, time, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTER = json.loads((ROOT / 'data/public-source-register-2026-11-24.json').read_text(encoding='utf-8'))
STATUS = json.loads((ROOT / 'data/source-register-status.json').read_text(encoding='utf-8'))
API = 'https://open.canada.ca/data/api/action/package_show?id='
SMALL_MAX = 60_000_000      # stored whole (gzip) on main when the original is at most this size
FILE_MAX = 60_000_000       # largest single file taken from a dataset page
PART_BYTES = 40_000_000     # compressed size at which a new part starts
KEEP_FORMATS = {'CSV', 'XLSX', 'XLS', 'DOCX', 'DOC', 'PDF', 'PPTX', 'TXT', 'JSON'}
UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
# An honest maintenance agent: canada.ca slowed downloads to a crawl for a browser-like agent sent
# from GitHub's servers, while this agent (also used by scripts/partition-large-pses.py) is served.
UA = 'GC-Equity-Equite-GC site maintenance (github.com/aranpublicservants-rgb/GC-Equity-Equite-GC)'


def targets():
    by_id = {e['id']: e for e in REGISTER['entries']}
    out = []
    for r in STATUS['rows']:
        if r['excluded'] or r['hosted']:
            continue
        e = by_id[r['id']]
        if not (e.get('source') or '').startswith('http'):
            continue
        out.append(e)
    return out


def curl(url, dest=None, max_time=900, max_size=None):
    """Fetch with curl (Canada.ca refuses some other clients from GitHub servers)."""
    cmd = ['curl', '-sSL', '--fail', '--http1.1', '--retry', '1', '--retry-delay', '10', '--speed-limit', '100000', '--speed-time', '60',
           '--connect-timeout', '30', '--max-time', str(max_time), '-A', UA]
    if dest:
        cmd += ['-o', str(dest)]
    if max_size:
        cmd += ['--max-filesize', str(int(max_size))]
    out = subprocess.run(cmd + [url], capture_output=True, timeout=2 * max_time + 90)
    if out.returncode != 0:
        raise RuntimeError(f'curl exit {out.returncode}: {out.stderr.decode(errors="replace")[:200]}')
    return out.stdout


def safe_name(url):
    name = urllib.parse.unquote(url.split('?')[0].rstrip('/').split('/')[-1]) or 'index'
    return re.sub(r'[^A-Za-z0-9._-]+', '-', name)[:120]


def records(handle):
    """Complete CSV records as bytes, joining lines while a quote is open."""
    pending = b''
    for line in handle:
        pending += line
        if pending.count(b'"') % 2 == 0:
            yield pending
            pending = b''
    if pending:
        yield pending


def sha_and_size(path):
    h, n = hashlib.sha256(), 0
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
            n += len(block)
    return h.hexdigest(), n


def csv_rows(path):
    with open(path, 'rb') as f:
        return max(sum(1 for _ in records(f)) - 1, 0)


def store_whole(raw, dest_dir, name):
    dest_dir.mkdir(parents=True, exist_ok=True)
    target = dest_dir / (name + '.gz')
    with open(raw, 'rb') as src, gzip.GzipFile(filename=name, mode='wb', fileobj=open(target, 'wb'), compresslevel=9, mtime=0) as gz:
        for block in iter(lambda: src.read(1 << 20), b''):
            gz.write(block)
    return target


def split_parts(raw, dest_dir, stem):
    """Byte-for-byte gzip parts, each with the published header."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    parts, rows, n, header = [], 0, 0, None
    gz = fh = None
    path = None

    def close():
        nonlocal gz, fh
        gz.close()
        fh.close()
        digest, size = sha_and_size(path)
        parts[-1].update(bytes=size, sha256=digest)

    with open(raw, 'rb') as f:
        for rec in records(f):
            if header is None:
                header = rec if rec.endswith(b'\n') else rec + b'\n'
                continue
            if gz is None or fh.tell() >= PART_BYTES:
                if gz is not None:
                    close()
                n += 1
                path = dest_dir / f'{stem}-{n:03d}.csv.gz'
                fh = open(path, 'wb')
                gz = gzip.GzipFile(filename=path.name[:-3], mode='wb', fileobj=fh, compresslevel=9, mtime=0)
                gz.write(header)
                parts.append({'file': path.name, 'rows': 0})
            gz.write(rec)
            parts[-1]['rows'] += 1
            rows += 1
    if gz is not None:
        close()
    return parts, rows


MEMO = {}


def folder_for(url):
    """One storage folder per publisher file, so a file listed by several entries is kept once."""
    return 'u-' + hashlib.sha256(url.encode()).hexdigest()[:16]


def take_file(url, entry_id, work, label=None, fmt=None):
    if url in MEMO:
        return dict(MEMO[url], sharedWith=MEMO[url].get('sharedWith', []) + [entry_id])
    rec = _take_file(url, folder_for(url), work, label, fmt)
    MEMO[url] = rec
    return rec


MAX_SIZE = None  # set from --max-bytes; also caps files taken from dataset pages


def _take_file(url, entry_id, work, label=None, fmt=None):
    tmp = work / 'download.tmp'
    if tmp.exists():
        tmp.unlink()
    big = MAX_SIZE is None or MAX_SIZE > SMALL_MAX
    curl(url, tmp, max_time=3000 if big else 900, max_size=MAX_SIZE or None)
    digest, size = sha_and_size(tmp)
    name = safe_name(url)
    is_csv = (fmt or '').upper() == 'CSV' or name.lower().endswith('.csv')
    rec = {'url': url, 'title': label, 'bytes': size, 'sha256': digest,
           'retrieved': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    if is_csv:
        rec['rows'] = csv_rows(tmp)
    if is_csv and size > SMALL_MAX:
        stem = re.sub(r'\.csv$', '', name, flags=re.I)
        parts, rows = split_parts(tmp, work / 'branch/register-gaps' / entry_id, stem)
        if rows != rec['rows'] or sum(p['rows'] for p in parts) != rows:
            raise RuntimeError(f'row count mismatch for {url}')
        rec.update(branch='pses-data', directory=f'register-gaps/{entry_id}', parts=parts)
    else:
        target = store_whole(tmp, work / 'main/data/register-gaps-2026-11' / entry_id, name)
        rec['path'] = target.relative_to(work / 'main').as_posix()
    tmp.unlink()
    return rec


def opt(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    work = Path(sys.argv[1])
    plan = '--plan' in sys.argv
    limit = int(opt('--limit', '0') or 0)
    max_bytes = int(opt('--max-bytes', '0') or 0)
    only = {x.strip() for x in (opt('--ids', '') or '').split(',') if x.strip()}
    global MAX_SIZE
    MAX_SIZE = max_bytes or None
    budget = float(opt('--budget', '0') or 0) * 60
    started = time.time()
    work.mkdir(parents=True, exist_ok=True)
    manifest = {'note': ('Copies of public source register entries that had no copy in this repository. '
                         'Originals are stored unchanged, gzip-compressed; very large CSV files are split into '
                         'parts on the pses-data branch, each starting with the published header. SHA-256 and '
                         'bytes describe the original file as downloaded.'),
                'register': 'data/public-source-register-2026-11-24.json', 'entries': []}
    previous = ROOT / 'data/register-gaps-manifest.json'
    kept = []
    if previous.exists():
        kept = json.loads(previous.read_text(encoding='utf-8')).get('entries', [])
    attempted = {k['id'] for k in kept}
    stored_before = {k['id'] for k in kept if any(f.get('stored') for f in k.get('files', []))}
    retry = '--retry-failed' in sys.argv
    chosen = []
    for e in targets():
        if only and e['id'] not in only:
            continue
        if e['id'] in stored_before and not only:
            continue  # a copy is already held; never download it again
        if e['id'] in attempted and not only and not retry:
            continue  # tried before and recorded with its failure; rerun with --ids or --retry-failed
        if max_bytes and (e.get('bytes') or 0) > max_bytes:
            continue
        chosen.append(e)
    if limit:
        chosen = chosen[:limit]
    done_ids = {e['id'] for e in chosen}
    shared = {}
    for e in targets():
        shared[e['source']] = shared.get(e['source'], 0) + 1
    manifest['entries'] = [k for k in kept if k['id'] not in done_ids]
    remaining = 0
    for e in chosen:
        if budget and time.time() - started > budget:
            remaining += 1
            continue
        url = e['source']
        item = {'id': e['id'], 'name': e['name'], 'source': url, 'files': [], 'failures': []}
        print('TARGET', e['id'], e['kind'], url)
        if plan:
            manifest['entries'].append(item)
            continue
        try:
            m = re.search(r'open\.canada\.ca/data/(?:en/|fr/)?dataset/(' + UUID.pattern + r')/?$', url)
            if m:
                if ('api', m.group(1)) not in MEMO:
                    MEMO[('api', m.group(1))] = json.loads(curl(API + m.group(1), max_time=120))['result']
                pkg = MEMO[('api', m.group(1))]
                item['datasetTitle'] = pkg.get('title_translated') or pkg.get('title')
                resources = pkg.get('resources', [])
                if shared.get(url, 1) > 1:
                    # Several register entries share this dataset address: keep the files whose
                    # titles match this entry's name; if none match, keep them all (dataset level).
                    words = set(re.findall(r'[a-z]{4,}', e['name'].lower()))
                    def score(res):
                        t = ' '.join(str(x) for x in [res.get('name'), (res.get('name_translated') or {}).get('en') if isinstance(res.get('name_translated'), dict) else ''] if x).lower()
                        return len(words & set(re.findall(r'[a-z]{4,}', t)))
                    best = max((score(r) for r in resources), default=0)
                    if best >= 2:
                        resources = [r for r in resources if score(r) == best]
                    else:
                        item['datasetLevel'] = True
                for res in resources:
                    if budget and time.time() - started > budget * 1.25:
                        item['failures'].append({'url': res.get('url'), 'error': 'not attempted: run time budget reached'})
                        continue
                    fmt = str(res.get('format', '')).upper()
                    lang = res.get('language')
                    if fmt not in KEEP_FORMATS:
                        item['files'].append({'url': res.get('url'), 'format': fmt, 'language': lang, 'stored': False,
                                              'reason': 'web page or format not stored'})
                        continue
                    size = int(res.get('size') or 0)
                    if size and MAX_SIZE and size > MAX_SIZE:
                        item['files'].append({'url': res.get('url'), 'format': fmt, 'stored': False,
                                              'reason': f'larger than {MAX_SIZE} bytes (left for the large-file batch)'})
                        continue
                    try:
                        rec = take_file(res['url'], e['id'], work, res.get('name_translated') or res.get('name'), fmt)
                        rec.update(format=fmt, language=lang, stored=True)
                        item['files'].append(rec)
                    except Exception as err:
                        item['failures'].append({'url': res.get('url'), 'error': str(err)[:300]})
            elif re.search(r'\.(csv|xlsx?|docx?|pdf|pptx|txt)(\?|$)', url, re.I) or '/download/' in url:
                rec = take_file(url, e['id'], work, e['name'])
                rec['stored'] = True
                item['files'].append(rec)
            elif url in MEMO:
                item['files'].append(dict(MEMO[url], sharedWith=[e['id']]))
            else:
                html = curl(url, max_time=120)
                d = work / 'main/data/register-gaps-2026-11' / folder_for(url)
                d.mkdir(parents=True, exist_ok=True)
                target = d / 'page-snapshot.html.gz'
                with gzip.GzipFile(filename='page-snapshot.html', mode='wb', fileobj=open(target, 'wb'), compresslevel=9, mtime=0) as gz:
                    gz.write(html)
                MEMO[url] = {'url': url, 'kind': 'page-snapshot', 'stored': True,
                             'path': target.relative_to(work / 'main').as_posix(), 'bytes': len(html), 'sha256': hashlib.sha256(html).hexdigest(),
                             'retrieved': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
                item['files'].append({'url': url, 'kind': 'page-snapshot', 'stored': True,
                                      'path': target.relative_to(work / 'main').as_posix(),
                                      'bytes': len(html), 'sha256': hashlib.sha256(html).hexdigest(),
                                      'retrieved': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())})
        except Exception as err:
            item['failures'].append({'url': url, 'error': str(err)[:300]})
        print('  stored', sum(1 for f in item['files'] if f.get('stored')), 'failures', len(item['failures']))
        manifest['entries'].append(item)
    processed = {x['id'] for x in manifest['entries']}
    manifest['entries'] += [k for k in kept if k['id'] in done_ids and k['id'] not in processed]
    manifest['entries'].sort(key=lambda x: x['id'])
    out = work / 'main/data/register-gaps-manifest.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('ENTRIES', len(manifest['entries']))
    # Entries left by the time budget, plus any still missing beyond --limit.
    eligible = [e for e in targets() if (not only or e['id'] in only) and (not max_bytes or (e.get('bytes') or 0) <= max_bytes)
                and (only or retry or e['id'] not in attempted)]
    left = remaining + max(0, len(eligible) - len(chosen))
    print('REMAINING', left)
    (work / 'remaining.txt').write_text(str(left))


if __name__ == '__main__':
    main()
