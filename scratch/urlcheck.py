"""Check that each link added to the site answers, and read the French page linked from each English Canada.ca page."""
import json, re, subprocess, pathlib
lists = json.load(open('scratch/urlcheck.json'))
out = {'pages': {}, 'files': {}}
def curl(url, extra):
    r = subprocess.run(['curl', '-sS', '--http1.1', '-L', '--max-time', '75', '-A', 'Mozilla/5.0 (GC Equity link check)',
                        '-w', '\n%{http_code} %{url_effective}'] + extra + [url], capture_output=True, timeout=100)
    body = r.stdout.decode('utf-8', 'replace')
    tail = body.rsplit('\n', 1)[-1] if body else ''
    return body[:-len(tail)] if tail else body, tail, r.stderr.decode()[:200]
for url in lists['pages']:
    try:
        body, tail, err = curl(url, [])
        fr = ''
        if 'canada.ca/en/' in url:
            m = re.search(r'<a[^>]*\blang="fr"[^>]*\bhref="([^"]+)"', body) or re.search(r'<a[^>]*\bhref="([^"]+)"[^>]*\blang="fr"', body)
            fr = m.group(1) if m else ''
        title = re.search(r'<title>(.*?)</title>', body, re.S)
        out['pages'][url] = {'status': tail, 'fr': fr, 'title': (title.group(1).strip()[:150] if title else ''), 'err': err}
    except Exception as e:
        out['pages'][url] = {'status': 'error', 'err': str(e)[:200]}
    print(url, '->', out['pages'][url].get('status'), '| fr:', out['pages'][url].get('fr'), '|', out['pages'][url].get('title'), flush=True)
for url in lists['files']:
    try:
        r = subprocess.run(['curl', '-sS', '--http1.1', '-L', '--max-time', '75', '-r', '0-99', '-o', '/dev/null', '-w', '%{http_code}', url],
                           capture_output=True, timeout=100)
        out['files'][url] = r.stdout.decode().strip() or r.stderr.decode()[:120]
    except Exception as e:
        out['files'][url] = 'error ' + str(e)[:100]
    print(url.rsplit('/', 1)[-1], out['files'][url], flush=True)
pathlib.Path('raw3').mkdir(exist_ok=True)
json.dump(out, open('raw3/urlcheck.json', 'w'), indent=1)
bad = [u for u, v in out['files'].items() if v not in ('200', '206')]
print('files not answering:', len(bad), bad[:10])
