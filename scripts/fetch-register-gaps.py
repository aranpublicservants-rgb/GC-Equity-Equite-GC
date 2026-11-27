#!/usr/bin/env python3
"""Download public source register entries that have no copy in this repository.

Usage: fetch-register-gaps.py <work directory> [--plan] [--limit N] [--max-bytes B] [--ids GC-0001,GC-0002]
  --limit N      take at most N entries in this run (smaller runs finish within the
                 GitHub time limit; later runs continue with what is still missing)
  --max-bytes B  skip entries whose register size is larger than B bytes
  --ids          take only the listed register entries
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
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'


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


def curl(url, dest=None, max_time=2400):
    """Fetch with curl (Canada.ca refuses some other clients from GitHub servers)."""
    cmd = ['curl', '-sSL', '--fail', '--http1.1', '--retry', '2', '--retry-delay', '10', '--speed-limit', '20000', '--speed-time', '120',
           '--connect-timeout', '30', '--max-time', str(max_time), '-A', UA,
           '-H', 'Accept-Language: en-CA,en;q=0.8']
    if dest:
        cmd += ['-o', str(dest)]
    out = subprocess.run(cmd + [url], capture_output=True, timeout=max_time + 60)
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


def take_file(url, entry_id, work, label=None, fmt=None):
    tmp = work / 'download.tmp'
    if tmp.exists():
        tmp.unlink()
    curl(url, tmp)
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
    chosen = []
    for e in targets():
        if only and e['id'] not in only:
            continue
        if max_bytes and (e.get('bytes') or 0) > max_bytes:
            continue
        chosen.append(e)
    if limit:
        chosen = chosen[:limit]
    done_ids = {e['id'] for e in chosen}
    manifest['entries'] = [k for k in kept if k['id'] not in done_ids]
    for e in chosen:
        url = e['source']
        item = {'id': e['id'], 'name': e['name'], 'source': url, 'files': [], 'failures': []}
        print('TARGET', e['id'], e['kind'], url)
        if plan:
            manifest['entries'].append(item)
            continue
        try:
            m = re.search(r'open\.canada\.ca/data/(?:en/|fr/)?dataset/(' + UUID.pattern + r')/?$', url)
            if m:
                pkg = json.loads(curl(API + m.group(1), max_time=120))['result']
                item['datasetTitle'] = pkg.get('title_translated') or pkg.get('title')
                for res in pkg.get('resources', []):
                    fmt = str(res.get('format', '')).upper()
                    lang = res.get('language')
                    if fmt not in KEEP_FORMATS:
                        item['files'].append({'url': res.get('url'), 'format': fmt, 'language': lang, 'stored': False,
                                              'reason': 'web page or format not stored'})
                        continue
                    size = int(res.get('size') or 0)
                    if size and size > FILE_MAX:
                        item['files'].append({'url': res.get('url'), 'format': fmt, 'stored': False,
                                              'reason': f'larger than {FILE_MAX} bytes'})
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
            else:
                html = curl(url, max_time=120)
                d = work / 'main/data/register-gaps-2026-11' / e['id']
                d.mkdir(parents=True, exist_ok=True)
                target = d / 'page-snapshot.html.gz'
                with gzip.GzipFile(filename='page-snapshot.html', mode='wb', fileobj=open(target, 'wb'), compresslevel=9, mtime=0) as gz:
                    gz.write(html)
                item['files'].append({'url': url, 'kind': 'page-snapshot', 'stored': True,
                                      'path': target.relative_to(work / 'main').as_posix(),
                                      'bytes': len(html), 'sha256': hashlib.sha256(html).hexdigest(),
                                      'retrieved': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())})
        except Exception as err:
            item['failures'].append({'url': url, 'error': str(err)[:300]})
        print('  stored', sum(1 for f in item['files'] if f.get('stored')), 'failures', len(item['failures']))
        manifest['entries'].append(item)
    manifest['entries'].sort(key=lambda x: x['id'])
    out = work / 'main/data/register-gaps-manifest.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('ENTRIES', len(manifest['entries']))


if __name__ == '__main__':
    main()
