#!/usr/bin/env python3
"""Apply or verify the common shell without replacing page content."""
import argparse, os, re, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
MARK = 'data-gce-shared-shell'
EXCLUDED = {'data','assets','archive-source','lib','vendor','tests','node_modules','qa-screenshots','dist','.github'}
def eligible(path, html):
    parts = path.relative_to(ROOT).parts
    if any(p in EXCLUDED or p.startswith('.') for p in parts[:-1]):
        return False
    if not re.search(r'</head\s*>',html,re.I) or not re.search(r'<body(?:\s[^>]*)?>',html,re.I):
        return False
    return not re.search(r'<meta\b[^>]*http-equiv\s*=\s*["\']?refresh',html,re.I)
def apply(path, html):
    if MARK in html:
        return html
    rel = os.path.relpath(ROOT, path.parent).replace(os.sep,'/')
    block = f'<link rel="stylesheet" href="{rel}/gc-shared-shell.css?v=20261126-1" {MARK}="css"><script src="{rel}/gc-shared-shell.js?v=20261126-1" defer {MARK}="js"></script>'
    return re.sub(r'</head\s*>',lambda m:block+m.group(0),html,count=1,flags=re.I)
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    names=subprocess.check_output(['git','ls-files','-z','--','*.html'],cwd=ROOT).decode().split('\0')
    count=changed=skipped=0
    failures=[]
    for name in filter(None,names):
        path=ROOT/name
        html=path.read_bytes().decode('utf-8')
        if not eligible(path,html):
            skipped+=1
            continue
        count+=1
        result=apply(path,html)
        if result!=html:
            changed+=1
            if args.check: failures.append(name)
            else: path.write_bytes(result.encode('utf-8'))
        elif html.count(MARK)!=2: failures.append(name)
    print(f'Shared shell: {count} eligible pages, {changed} needing changes, {skipped} excluded redirects/source pages.')
    if failures: raise SystemExit('Missing or duplicated shared shell: '+', '.join(failures[:30]))
if __name__=='__main__': main()
