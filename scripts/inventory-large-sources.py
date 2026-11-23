#!/usr/bin/env python3
"""Record size, row count and SHA-256 for open.canada.ca CSV files too large to host.

Files above maxBytes in scripts/large-sources.json are streamed, never stored.
The result is data/large-sources-inventory.json: the published link, the published
size, the number of lines and the SHA-256 of the published bytes. Nothing is
reconstructed or summarised. Runs in GitHub Actions, where open.canada.ca can be reached.
"""
import hashlib, json, re, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'scripts/large-sources.json').read_text(encoding='utf-8'))
API = 'https://open.canada.ca/data/api/action/package_show?id='
AGENT = {'User-Agent': 'GC-Equity-Equite-GC site maintenance (github.com/aranpublicservants-rgb/GC-Equity-Equite-GC)'}
get = lambda url, t=120: urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=t)

out, failures = [], 0
for ds in CONFIG['datasets']:
    try:
        package = json.load(get(API + ds['id']))['result']
    except Exception as e:
        print(f"FAILED catalogue lookup {ds['folder']}: {e}"); failures += 1; continue
    for res in package.get('resources', []):
        if str(res.get('format', '')).upper() != 'CSV':
            continue
        url = res['url']
        try:
            digest, size, lines = hashlib.sha256(), 0, 0
            with get(url, 1800) as r:
                while True:
                    chunk = r.read(1 << 22)
                    if not chunk: break
                    digest.update(chunk); size += len(chunk); lines += chunk.count(b'\n')
            if size <= CONFIG['maxBytes']:
                continue  # small enough to be hosted by fetch-large-sources.py
            out.append({'folder': ds['folder'], 'dataset': 'https://open.canada.ca/data/en/dataset/' + ds['id'],
                        'title': res.get('name_translated') or res.get('name'), 'url': url,
                        'bytes': size, 'lines': lines, 'sha256': digest.hexdigest()})
            print(f'RECORDED {ds["folder"]}: {size} bytes, {lines} lines')
        except Exception as e:
            print(f'FAILED {url}: {e}'); failures += 1
(ROOT / 'data/large-sources-inventory.json').write_text(json.dumps({'files': out}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(f'done, {len(out)} recorded, {failures} failures')
