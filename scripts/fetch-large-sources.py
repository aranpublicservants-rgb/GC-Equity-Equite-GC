#!/usr/bin/env python3
"""Download large open.canada.ca CSV files and store them compressed with gzip.

For each dataset in scripts/large-sources.json this asks the open.canada.ca
catalogue for the dataset's CSV resources, downloads each one, and keeps those
between minBytes and maxBytes. The kept file is written as <name>.csv.gz: opening
it gives back the published bytes exactly. large-files.json in each folder records
the source link, the published size and the SHA-256 of the published bytes.
Runs in GitHub Actions, where open.canada.ca can be reached.
"""
import gzip, hashlib, json, os, re, shutil, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/open-canada-2026-11'
CONFIG = json.loads((ROOT / 'scripts/large-sources.json').read_text(encoding='utf-8'))
API = 'https://open.canada.ca/data/api/action/package_show?id='
AGENT = {'User-Agent': 'GC-Equity-Equite-GC site maintenance (github.com/aranpublicservants-rgb/GC-Equity-Equite-GC)'}

def get(url, timeout=120):
    return urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=timeout)

failures = 0
for ds in CONFIG['datasets']:
    folder = BASE / ds['folder']
    try:
        package = json.load(get(API + ds['id']))['result']
    except Exception as e:
        print(f"FAILED catalogue lookup {ds['folder']}: {e}"); failures += 1; continue
    kept = []
    pattern = re.compile(ds['name'], re.I) if ds.get('name') else None
    for res in package.get('resources', []):
        if str(res.get('format', '')).upper() != 'CSV':
            continue
        names = ' | '.join(str(v) for v in [res.get('name'), *(res.get('name_translated') or {}).values(), res.get('url')])
        if pattern and not pattern.search(names):
            continue
        url = res['url']
        stem = re.sub(r'[^A-Za-z0-9._-]+', '-', url.rstrip('/').split('/')[-1])
        if not stem.lower().endswith('.csv'):
            stem += '.csv'
        target = folder / (stem + '.gz')
        try:
            digest, size = hashlib.sha256(), 0
            with tempfile.NamedTemporaryFile(delete=False) as tmp, get(url, 600) as r:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk: break
                    digest.update(chunk); size += len(chunk); tmp.write(chunk)
                    if size > CONFIG['maxBytes']: break
            if CONFIG['minBytes'] < size <= CONFIG['maxBytes']:
                folder.mkdir(parents=True, exist_ok=True)
                with open(tmp.name, 'rb') as src, open(target, 'wb') as raw:
                    with gzip.GzipFile(filename=stem, mode='wb', fileobj=raw, compresslevel=9, mtime=0) as out:
                        shutil.copyfileobj(src, out, 1 << 20)
                if target.stat().st_size > 95_000_000:
                    target.unlink(); print(f'SKIPPED still over 95 MB compressed: {url}')
                else:
                    kept.append({'gz': target.name, 'name': stem, 'url': url, 'bytes': size, 'sha256': digest.hexdigest(),
                                 'title': res.get('name_translated') or res.get('name')})
                    print(f'KEPT {ds["folder"]}/{target.name}: {size} bytes published, {target.stat().st_size} compressed')
            else:
                print(f'not kept ({size} bytes): {url}')
            os.unlink(tmp.name)
        except Exception as e:
            print(f'FAILED {url}: {e}'); failures += 1
    if kept:
        (folder / 'large-files.json').write_text(json.dumps({'dataset': 'https://open.canada.ca/data/en/dataset/' + ds['id'], 'files': kept}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(f'done, {failures} failures')
