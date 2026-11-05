"""Fetch official open-data files listed in the October 2026 public-source inventory,
check them against the inventory SHA-256 values, and store gzip copies for review."""
import csv, gzip, hashlib, json, os, re, subprocess, sys, time, urllib.parse, urllib.request

API = 'https://open.canada.ca/data/api/action/'
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
INV = 'data/october-2026/public-source-inventory.csv'
OUT = 'raw'
os.makedirs(OUT, exist_ok=True)

def api(action, **params):
    url = API + action + '?' + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            err = str(e)
            time.sleep(4 * (attempt + 1))
    return {'success': False, 'error': err}

UUID = re.compile(r'^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_(.+)| ?\(1\)\.csv|\.csv)$')
MAX_BYTES = 150_000_000
SNPS_KEEP = re.compile(r'Employment Equity Group|subgroup|type of disability|2SLGBTQIA|sexual orientation|by identity|list of questions|list of departments|response profile|including all departments')
rows = list(csv.DictReader(open(INV, encoding='utf-8-sig')))
targets = {}
for r in rows:
    f, title, topic = r['File'], r['Title'], r['Topic']
    size = int(r['Bytes']) if (r['Bytes'] or '').isdigit() else None
    if topic.startswith('Public Service Employee Survey') or topic == 'Methodology':
        continue
    if f.startswith(('TBS_', 'DI_', '00_', 'f5efcbba')):
        continue
    if topic.startswith('Staffing and Non') and not SNPS_KEEP.search(title):
        continue
    m = UUID.match(f)
    rid, name = (m.group(1), m.group(2) or (m.group(1) + '.csv')) if m else (None, re.sub(r' ?\(1\)', '', f))
    key = rid or name
    t = targets.setdefault(key, {'rid': rid, 'name': name, 'titles': set(), 'inventory_sha': set(), 'inventory_bytes': set()})
    t['titles'].add(title)
    if r['SHA256']: t['inventory_sha'].add(r['SHA256'].lower())
    if size: t['inventory_bytes'].add(size)
# Entries without a resource id that also appear with one are the same file.
named = {t['name'] for t in targets.values() if t['rid']}
for k in [k for k, t in targets.items() if not t['rid'] and t['name'] in named]:
    other = next(t for t in targets.values() if t['rid'] and t['name'] == targets[k]['name'] and (targets[k]['inventory_sha'] & t['inventory_sha'] or not targets[k]['inventory_sha']))
    other['inventory_sha'] |= targets[k]['inventory_sha']
    del targets[k]

def download(url, dest):
    tmp = dest + '.part'
    cmd = ['curl', '-sSL', '--fail', '--retry', '3', '--retry-delay', '5', '--connect-timeout', '20',
           '--max-time', '1200', '--max-filesize', '300000000', '-A', UA, '-o', tmp, url]
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        return None, 'curl exit %d %s' % (p.returncode, p.stderr.strip()[:200])
    h = hashlib.sha256(); n = 0
    with open(tmp, 'rb') as fh, gzip.open(dest, 'wb', compresslevel=9) as gz:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk); n += len(chunk); gz.write(chunk)
    os.remove(tmp)
    return {'sha256': h.hexdigest(), 'bytes': n}, None

packages = {}
manifest = []
for key, t in sorted(targets.items()):
    entry = {'inventory_name': t['name'], 'resource_id': t['rid'], 'titles': sorted(t['titles']),
             'inventory_sha256': sorted(t['inventory_sha']), 'inventory_bytes': sorted(t['inventory_bytes'])}
    candidates = []
    if t['rid']:
        res = api('resource_show', id=t['rid'])
        if res.get('success'): candidates = [res['result']]
        else: entry['error'] = 'resource_show failed: %s' % str(res.get('error'))[:200]
    else:
        res = api('resource_search', query='url:' + t['name'], limit=50)
        if res.get('success'):
            candidates = [c for c in res['result']['results'] if (c.get('url') or '').split('?')[0].rstrip('/').endswith('/' + t['name'])]
            if not candidates: entry['error'] = 'no resource found for file name'
        else: entry['error'] = 'resource_search failed: %s' % str(res.get('error'))[:200]
    entry['candidates'] = [{'id': c.get('id'), 'url': c.get('url'), 'package_id': c.get('package_id'),
                            'last_modified': c.get('last_modified'), 'metadata_modified': c.get('metadata_modified'),
                            'name': c.get('name'), 'name_translated': c.get('name_translated'), 'language': c.get('language'),
                            'format': c.get('format'), 'size': c.get('size')} for c in candidates]
    for c in candidates:
        pid = c.get('package_id')
        if pid and pid not in packages:
            p = api('package_show', id=pid)
            if p.get('success'):
                pr = p['result']
                packages[pid] = {'title_translated': pr.get('title_translated'), 'organization': (pr.get('organization') or {}).get('title'),
                                 'metadata_modified': pr.get('metadata_modified'), 'url': 'https://open.canada.ca/data/en/dataset/' + pid}
    entry['downloads'] = []
    too_big = any(b > MAX_BYTES for b in t['inventory_bytes']) or any((c.get('size') or 0) > MAX_BYTES for c in candidates)
    if too_big: entry['skipped'] = 'larger than %d bytes; metadata only' % MAX_BYTES
    for c in ([] if too_big else candidates):
        url = c.get('url')
        if not url: continue
        safe = re.sub(r'[^A-Za-z0-9._-]+', '_', (c.get('id') or 'x')[:8] + '_' + t['name'])
        dest = os.path.join(OUT, safe + '.gz')
        info, err = download(url, dest)
        d = {'resource_id': c.get('id'), 'url': url, 'file': dest}
        if err: d['error'] = err
        else:
            d.update(info)
            d['matches_inventory'] = (info['sha256'] in t['inventory_sha']) if t['inventory_sha'] else None
        entry['downloads'].append(d)
        if d.get('matches_inventory'): break
    manifest.append(entry)
    print(key[:40].ljust(40), [ (d.get('bytes'), d.get('matches_inventory'), d.get('error')) for d in entry['downloads']], entry.get('error',''), flush=True)

json.dump({'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'packages': packages, 'files': manifest},
          open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
ok = sum(1 for e in manifest if any(d.get('matches_inventory') for d in e['downloads']))
print('verified', ok, 'of', len(manifest))
