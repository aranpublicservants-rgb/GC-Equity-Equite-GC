#!/usr/bin/env python3
"""Check that every link and asset reference between pages of this site resolves.

Covers relative links and absolute links to the site's own GitHub Pages address in
tracked HTML files. External sites are checked by the weekly link workflow instead.
Usage: check-internal-links.py [--report FILE]
"""
import re, subprocess, sys, json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/'
SKIP_DIRS = ('archive-source/', 'node_modules/', 'lib/', 'vendor/')
tracked = set(subprocess.check_output(['git', 'ls-files'], cwd=ROOT, text=True).splitlines())
dirs = {str(Path(p).parent).replace('\\', '/') for p in tracked}


class Refs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids = [], set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.add(a['id'])
        for key in ('href', 'src'):
            v = a.get(key)
            if v and not (tag == 'link' and a.get('rel') in ('canonical', 'alternate')):
                self.refs.append((tag, v.strip()))


def exists(path):
    path = path.lstrip('/')
    if path in ('', '.'):
        return True
    if path in tracked:
        return True
    if path.endswith('/') or path.rstrip('/') in dirs:
        return path.rstrip('/') + '/index.html' in tracked
    return False


broken = []
pages = sorted(p for p in tracked if p.endswith('.html') and not p.startswith(SKIP_DIRS))
for page in pages:
    text = (ROOT / page).read_text(encoding='utf-8', errors='replace')
    parser = Refs()
    try:
        parser.feed(text)
    except Exception:
        continue
    base = page.rsplit('/', 1)[0] + '/' if '/' in page else ''
    for tag, ref in parser.refs:
        if '${' in ref or '{{' in ref or ref.startswith(('mailto:', 'tel:', 'javascript:', 'data:', '#', 'blob:')):
            continue
        if ref.startswith(SITE):
            target = ref[len(SITE):]
        elif re.match(r'^[a-z][a-z0-9+.-]*:', ref, re.I) or ref.startswith('//'):
            continue
        elif ref.startswith('/'):
            continue  # root-relative links point at other GitHub Pages sites on the account
        else:
            target = base + ref
        target = unquote(urlsplit(target).path)
        parts = []
        for seg in target.split('/'):
            if seg == '..':
                if parts:
                    parts.pop()
            elif seg not in ('.',):
                parts.append(seg)
        resolved = '/'.join(parts)
        if not exists(resolved):
            broken.append({'page': page, 'tag': tag, 'ref': ref, 'resolved': resolved})

if '--report' in sys.argv:
    Path(sys.argv[sys.argv.index('--report') + 1]).write_text(json.dumps(broken, indent=1), encoding='utf-8')
print(f'INTERNAL LINKS: {len(pages)} pages checked, {len(broken)} broken references')
for b in broken[:60]:
    print(f"BROKEN: {b['page']} -> {b['ref']}")
if broken:
    sys.exit(1)
