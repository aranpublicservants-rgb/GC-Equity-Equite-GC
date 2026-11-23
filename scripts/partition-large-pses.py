#!/usr/bin/env python3
"""Stream large open.canada.ca CSV files and split them into small gzip parts.

Usage: partition-large-pses.py <folder> <output directory>

For each CSV resource of the dataset (from scripts/large-sources.json) that is
larger than maxBytes, rows are copied byte for byte into one gzip part per
organization (LEVEL1ID), each part starting with the published header. A new
part starts when one reaches PART_BYTES compressed, so every part is small
enough for jsDelivr (50 MB). Nothing is changed, rebuilt or summarised.
manifest.json records the source link, size, SHA-256 and row count, plus each
part's rows and SHA-256. The script stops with an error unless the part rows add
up to the source rows. Runs in GitHub Actions, where open.canada.ca can be reached.
"""
import gzip, hashlib, json, os, re, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'scripts/large-sources.json').read_text(encoding='utf-8'))
API = 'https://open.canada.ca/data/api/action/package_show?id='
AGENT = {'User-Agent': 'GC-Equity-Equite-GC site maintenance (github.com/aranpublicservants-rgb/GC-Equity-Equite-GC)'}
PART_BYTES = 40_000_000
get = lambda url, t=120: urllib.request.urlopen(urllib.request.Request(urllib.parse.quote(url, safe=":/?&=%#+@~!$'()*,;"), headers=AGENT), timeout=t)

def records(resp):
    """Yield complete CSV records as bytes, joining lines while a quote is open."""
    pending = b''
    for line in resp:
        pending += line
        if pending.count(b'"') % 2 == 0:
            yield pending; pending = b''
    if pending: yield pending

class Part:
    def __init__(self, directory, key, n, header):
        self.name = f'{key}-{n:02d}.csv.gz'; self.path = directory / self.name
        self.raw = open(self.path, 'wb'); self.rows = 0; self.hash = None
        self.gz = gzip.GzipFile(filename=self.name[:-3], mode='wb', fileobj=self.raw, compresslevel=9, mtime=0)
        self.gz.write(header)
    def write(self, rec): self.gz.write(rec); self.rows += 1
    def size(self): return self.raw.tell()
    def close(self):
        self.gz.close(); self.raw.close()
        self.hash = hashlib.sha256(self.path.read_bytes()).hexdigest()
        return {'file': self.name, 'rows': self.rows, 'bytes': self.path.stat().st_size, 'sha256': self.hash}

folder, outdir = sys.argv[1], Path(sys.argv[2])
ds = next(d for d in CONFIG['datasets'] if d['folder'] == folder)
package = json.load(get(API + ds['id']))['result']
manifest = {'dataset': 'https://open.canada.ca/data/en/dataset/' + ds['id'], 'sources': []}
for res in package.get('resources', []):
    if str(res.get('format', '')).upper() != 'CSV':
        continue
    url = res['url']
    if not urllib.parse.unquote(url).lower().split('?')[0].endswith('.csv'):
        continue  # labelled CSV in the catalogue but not a CSV file
    stem = re.sub(r'[^A-Za-z0-9._-]+', '-', url.rstrip('/').split('/')[-1]).removesuffix('.csv').removesuffix('.CSV')
    directory = outdir / folder / stem
    directory.mkdir(parents=True, exist_ok=True)
    src_hash, src_bytes, rows, header = hashlib.sha256(), 0, 0, None
    parts, current, counters, done = {}, {}, {}, []
    def tee(r):
        global src_bytes
        for line in r:
            src_hash.update(line); src_bytes += len(line); yield line
    with get(url, 3600) as resp:
        first = True
        for rec in records(tee(resp)):
            if first:
                first = False
                if rec.endswith(b'\r\n') is False and rec.endswith(b'\n') is False: rec += b'\n'
                header = rec; continue
            key = re.sub(r'[^A-Za-z0-9]', '', rec.split(b',', 1)[0].decode('latin-1')) or 'blank'
            part = current.get(key)
            if part is None or part.size() >= PART_BYTES:
                if part: done.append(part.close())
                counters[key] = counters.get(key, 0) + 1
                part = current[key] = Part(directory, key, counters[key], header)
            part.write(rec); rows += 1
    for part in current.values(): done.append(part.close())
    if sum(p['rows'] for p in done) != rows:
        sys.exit(f'Row count mismatch for {url}')
    if src_bytes <= CONFIG['maxBytes']:
        for p in done: (directory / p['file']).unlink()
        directory.rmdir(); print(f'skipped (small enough to host): {url}'); continue
    manifest['sources'].append({'url': url, 'title': res.get('name_translated') or res.get('name'), 'bytes': src_bytes,
        'sha256': src_hash.hexdigest(), 'rows': rows, 'directory': f'{folder}/{stem}', 'parts': sorted(done, key=lambda p: p['file'])})
    print(f'PARTITIONED {folder}/{stem}: {rows} rows into {len(done)} parts')
(outdir / folder).mkdir(parents=True, exist_ok=True)
(outdir / folder / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
