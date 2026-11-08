"""Catalogue records (review only): package_show for the PSC datasets, to get official English and French resource names."""
import json, os, subprocess, time
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
OUT = 'raw3/packages'; os.makedirs(OUT, exist_ok=True)
PKGS = ['26ffad36-ca9b-431c-8f6d-a6df02665e2c', '2fe6b7f1-fbfe-4aaf-808f-b977d40d44db', '845f9e76-d03e-4652-8f43-bb777ab1d52b',
        '6857a6e6-4e50-4b0e-ba8c-3ad890fa2f2a', '88f45a5c-bc57-4483-bc85-2c19bc342039', '8766bf91-d14c-423b-a5d1-ac47f5b4dd22']
for p in PKGS:
    for attempt in range(4):
        r = subprocess.run(['curl', '-sSL', '--fail', '--http1.1', '--max-time', '90', '-A', UA, '-o', os.path.join(OUT, p + '.json'),
                            'https://open.canada.ca/data/api/action/package_show?id=' + p], capture_output=True, text=True)
        try:
            d = json.load(open(os.path.join(OUT, p + '.json')))
            print(p, 'ok', len(d['result']['resources']), 'resources', flush=True); break
        except Exception as e:
            print(p, 'attempt', attempt, r.returncode, str(e)[:80], flush=True); time.sleep(20)
