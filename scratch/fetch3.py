"""Third fetch (review only): Public Service Commission staffing and workforce tables listed in the site inventory.
Each file is checked against the SHA-256 recorded in the inventory. SNPS files are checked for a working official link only."""
import csv, gzip, hashlib, json, os, re, subprocess, time, urllib.parse
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
OUT = 'raw3'; os.makedirs(OUT, exist_ok=True)
man = json.load(open('raw/manifest.json'))['files']
inv = list(csv.DictReader(open('data/october-2026/public-source-inventory.csv', encoding='utf-8-sig')))
def curl(url, dest=None, head=False, maxtime=180):
    cmd = ['curl', '-sSL', '--fail', '--http1.1', '--connect-timeout', '20', '--max-time', str(maxtime), '-A', UA, '-w', '%{http_code} %{url_effective}']
    if head: cmd += ['-r', '0-1023', '-o', '/dev/null']
    else: cmd += ['-o', dest + '.part']
    p = subprocess.run(cmd + [url], capture_output=True, text=True)
    return p.returncode, p.stdout.strip(), p.stderr.strip()[:160]
def get(url, name, expect):
    dest = os.path.join(OUT, name)
    for attempt in range(3):
        rc, info, err = curl(url, dest)
        if rc == 0 and os.path.exists(dest + '.part'):
            data = open(dest + '.part', 'rb').read(); os.remove(dest + '.part')
            sha = hashlib.sha256(data).hexdigest()
            with gzip.open(dest + '.gz', 'wb', compresslevel=9) as g: g.write(data)
            return {'bytes': len(data), 'sha256': sha, 'matches': sha in expect, 'final': info}
        time.sleep(20 * (attempt + 1))
    return {'error': 'curl %s %s %s' % (rc, info, err)}
def absolute(u):
    return u if u.startswith('http') else 'https://open.canada.ca' + u
log = []
done = {re.sub(r'^[0-9a-f]{8}_', '', f[:-3]) for f in os.listdir('raw') if f.endswith('.gz')} | {'demo_ee.csv'}
targets = [e for e in man if not e.get('downloads') or not any(d.get('matches_inventory') for d in e['downloads'])]
for e in targets:
    name = e['inventory_name']
    if name.startswith(('cfppsc_snps', 'population', 'effectif', '4b707eed', 'equite_', 'representation-designated')) or name in done:
        continue
    rec = {'name': name, 'expected': e['inventory_sha256']}
    urls = [absolute(c['url']) for c in e.get('candidates', []) if c.get('url')]
    if not urls:
        # Look the file up by name in the Open Government catalogue.
        stem = name[:-4]
        for q in ['https://open.canada.ca/data/api/action/resource_search?query=url:%s' % urllib.parse.quote(name),
                  'https://open.canada.ca/data/api/action/package_search?q=%s&rows=10' % urllib.parse.quote(stem)]:
            rc, info, err = curl(q, os.path.join(OUT, '_search'), maxtime=60)
            try:
                txt = open(os.path.join(OUT, '_search.part'), encoding='utf-8').read(); os.remove(os.path.join(OUT, '_search.part'))
                found = re.findall(r'https?://[^"\s]*?/' + re.escape(name), txt, flags=re.I)
                urls += [u for u in dict.fromkeys(found)]
                rec.setdefault('search', []).append({'q': q[:120], 'rc': rc, 'found': len(found)})
            except Exception as ex:
                rec.setdefault('search', []).append({'q': q[:120], 'rc': rc, 'error': str(ex)[:80]})
            if urls: break
            time.sleep(5)
    rec['urls'] = urls[:3]
    for u in urls[:3]:
        res = get(u, name, e['inventory_sha256'])
        rec.update(res)
        if res.get('matches'): break
        time.sleep(5)
    log.append(rec); print({k: v for k, v in rec.items() if k not in ('expected',)}, flush=True); time.sleep(3)
# Official links for every SNPS file in the inventory (checked, not downloaded).
pkg = {'2023': '88f45a5c-bc57-4483-bc85-2c19bc342039', '2025': '8766bf91-d14c-423b-a5d1-ac47f5b4dd22'}
links = []
for r in inv:
    m = re.match(r'^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(cfppsc_snps[\w-]+\.csv)$', r['File'])
    if not m: continue
    year = '2025' if r['Title'].startswith('2025') else '2023'
    url = 'https://open.canada.ca/data/dataset/%s/resource/%s/download/%s' % (pkg[year], m.group(1), m.group(2))
    rc, info, err = curl(url, head=True, maxtime=60)
    links.append({'file': m.group(2), 'resource_id': m.group(1), 'year': year, 'title': r['Title'], 'bytes': r['Bytes'], 'sha256': r['SHA256'], 'url': url, 'check': info, 'rc': rc})
    print(links[-1]['file'], rc, info[:60], flush=True); time.sleep(2)
json.dump({'fetched': log, 'snps_links': links}, open(os.path.join(OUT, 'manifest3.json'), 'w'), indent=1)
