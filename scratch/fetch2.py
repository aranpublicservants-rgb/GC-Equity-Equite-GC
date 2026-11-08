"""Second, small fetch: three open-data files and the Treasury Board departmental tables (direct, else the Internet Archive copy)."""
import gzip, hashlib, json, os, subprocess, time
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
OUT = 'raw2'; os.makedirs(OUT, exist_ok=True)
OPEN = [
 ('demo_ee.csv', 'https://open.canada.ca/data/dataset/26ffad36-ca9b-431c-8f6d-a6df02665e2c/resource/bc1f4229-b228-4000-9233-86c763b012ec/download/demo_ee.csv', '0f0216568883a111efa41de26d6f2af715486c788e891151fc83391a069a005b'),
 ('840e8e64_cfppsc_snps03-2.csv', 'https://open.canada.ca/data/dataset/8766bf91-d14c-423b-a5d1-ac47f5b4dd22/resource/840e8e64-9177-4c72-a84d-3d1cfb8e280e/download/cfppsc_snps03-2.csv', None),
 ('77c9c20e_cfppsc_snps05.csv', 'https://open.canada.ca/data/dataset/88f45a5c-bc57-4483-bc85-2c19bc342039/resource/77c9c20e-691b-4c13-8243-9cf9cf81c8dc/download/cfppsc_snps05.csv', None),
]
TBS = 'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/'
PAGES = [
 ('tbs_indigenous_dept_wfa.html', TBS + 'employment-equity-public-service-representation-indigenous-peoples-department-agency-departmental-workforce-availability-estimates.html'),
 ('tbs_disability_dept_wfa.html', TBS + 'employment-equity-public-service-representation-persons-disabilities-department-agency-departmental-workforce-availability-estimates.html'),
 ('tbs_vismin_dept_wfa.html', TBS + 'employment-equity-public-service-representation-members-visible-minority-group-department-agency-departmental-workforce-availability-estimates.html'),
 ('tbs_vismin_subgroup_dept.html', TBS + 'distribution-public-service-canada-employees-designated-sub-group-department-members-visible-minorities.html'),
]
def curl(url, dest, extra=()):
    tmp = dest + '.part'
    p = subprocess.run(['curl', '-sSL', '--fail', '--http1.1', '--connect-timeout', '15', '--max-time', '120', '-A', UA,
                        '-w', '%{url_effective}', '-o', tmp, *extra, url], capture_output=True, text=True)
    if p.returncode != 0 or not os.path.exists(tmp):
        return None, 'curl exit %d %s' % (p.returncode, p.stderr.strip()[:160])
    data = open(tmp, 'rb').read(); os.remove(tmp)
    with gzip.open(dest, 'wb', compresslevel=9) as g: g.write(data)
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'final_url': p.stdout.strip()}, None
log = []
for name, url, sha in OPEN:
    rec = {'file': name, 'url': url, 'expected_sha256': sha}
    for attempt in range(3):
        info, err = curl(url, os.path.join(OUT, name + '.gz'))
        if info and info['bytes'] > 4000: rec.update(info); rec.pop('error', None); break
        rec['error'] = err or 'short response %s bytes' % (info or {}).get('bytes'); time.sleep(45)
    rec['matches'] = (rec.get('sha256') == sha) if sha else None
    log.append(rec); print(rec, flush=True); time.sleep(5)
for name, url in PAGES:
    rec = {'file': name, 'url': url}
    info, err = curl(url, os.path.join(OUT, name + '.gz'))
    if info and info['bytes'] > 20000:
        rec.update(info); rec['via'] = 'canada.ca'
    else:
        rec['direct_error'] = err or 'short response'
        for stamp in ('2026', '2025'):
            info, err = curl('https://web.archive.org/web/%sid_/%s' % (stamp, url), os.path.join(OUT, name + '.gz'))
            if info and info['bytes'] > 20000:
                rec.update(info); rec['via'] = 'web.archive.org'; break
            rec['archive_error'] = err or 'short response'
            time.sleep(10)
    log.append(rec); print({k: v for k, v in rec.items() if k != 'url'}, flush=True); time.sleep(5)
json.dump(log, open(os.path.join(OUT, 'manifest2.json'), 'w'), indent=1)
