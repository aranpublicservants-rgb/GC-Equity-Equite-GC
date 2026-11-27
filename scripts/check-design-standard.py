#!/usr/bin/env python3
"""Enforce the structural rules of docs/DESIGN-STANDARD.md on every published page.

Each visitor page must declare its language, character set, viewport and title, have a
main landmark, give every image a text alternative, and load the shared GC Equity shell
(except separately managed network pages). Redirect pages and archived source pages are
not checked. Run from check-site.py.
"""
import re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = ('archive-source/', 'lib/', 'vendor/', 'node_modules/', 'tests/')
SEPARATE = ('racialized-executives/',)
RULES = {
    'language declared on <html>': lambda s: re.search(r'<html[^>]*\blang=["\']?(en|fr)', s, re.I),
    'character set declared': lambda s: 'charset' in s[:1000].lower(),
    'mobile viewport declared': lambda s: re.search(r'<meta[^>]+name=["\']viewport', s, re.I),
    'page title present': lambda s: re.search(r'<title[^>]*>\s*\S', s, re.I),
    'main landmark present': lambda s: re.search(r'<main[\s>]|role=["\']main', s, re.I),
    'every image has alt text': lambda s: not re.search(r'<img(?![^>]*\balt=)[^>]*>', s, re.I),
}
failures = []
pages = 0
for name in subprocess.check_output(['git', 'ls-files', '*.html'], cwd=ROOT, text=True).split():
    if name.startswith(SKIP):
        continue
    s = (ROOT / name).read_text(encoding='utf-8', errors='replace')
    if re.search(r'http-equiv=["\']?refresh', s, re.I) or s.lstrip().lower().startswith('<!-- source'):
        continue
    pages += 1
    for rule, ok in RULES.items():
        if not ok(s):
            failures.append(f'{name}: {rule}')
    has_shell = s.count('data-gce-shared-shell') == 2
    if name.startswith(SEPARATE):
        if has_shell:
            failures.append(f'{name}: separately managed page must not carry GC Equity navigation')
    elif not has_shell:
        failures.append(f'{name}: shared GC Equity shell missing')
print(f'DESIGN STANDARD: {pages} pages checked, {len(failures)} problems')
for f in failures[:50]:
    print('DESIGN-STANDARD:', f)
sys.exit(1 if failures else 0)
