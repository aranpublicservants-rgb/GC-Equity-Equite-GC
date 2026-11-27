#!/usr/bin/env python3
"""Check that English and French visitor text carries the same facts.

For every element with paired data-en / data-fr (or data-gce-en / data-gce-fr)
attributes in published pages, and for JavaScript L(l,'en','fr') / T('en','fr') pairs
in site scripts, both texts must be present and contain the same numbers (years,
counts, percentages, question codes). Thousands separators and decimal commas are
normalized first. Usage: check-bilingual.py [--report FILE]
"""
import html, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = ('archive-source/', 'lib/', 'vendor/', 'node_modules/', 'tests/', 'racialized-executives/')
PAIR_ATTR = re.compile(r'data-(gce-)?en="([^"]*)"\s+data-\1fr="([^"]*)"|data-(gce-)?fr="([^"]*)"\s+data-\4en="([^"]*)"')
PAIR_JS = re.compile(r"\b(?:L\(\s*[a-z]+\s*,|T\(|tr\()\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)")
NUM = re.compile(r'(?<![\w.])(\d{1,3}(?:[   ,]\d{3})+|\d+)(?:[.,](\d+))?')
QCODE = re.compile(r'\b(?:Q|STA_)\d+[a-z]?\b', re.I)


def numbers(text):
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\$\{[^}]*\}', ' ', text)  # template placeholders
    text = re.sub(r'https?://\S+', ' ', text)  # addresses differ by language
    # ISO dates (2026-11-05) are written out in French (5 novembre 2026): compare year and day.
    text = re.sub(r'\b((?:19|20)\d\d)-(\d\d)-(\d\d)\b', lambda m: m.group(1) + ' ' + str(int(m.group(3))), text)
    # Fiscal years are written 2026-27 in English and 2026-2027 in French.
    text = re.sub(r'\b((?:19|20)(\d\d))\s*[-\u2013]\s*(\d\d)\b(?!\d)', lambda m: m.group(1) + '-' + m.group(1)[:2] + m.group(3), text)
    out = []
    for m in NUM.finditer(text):
        whole = re.sub(r'[   ,]', '', m.group(1))
        out.append(whole + ('.' + m.group(2) if m.group(2) else ''))
    return sorted(set(out)), sorted({q.upper() for q in QCODE.findall(text)})


def compare(where, en, fr, problems):
    if not en.strip() or not fr.strip():
        problems.append({'where': where, 'problem': 'missing ' + ('English' if not en.strip() else 'French'), 'en': en[:160], 'fr': fr[:160]})
        return
    ne, qe = numbers(en)
    nf, qf = numbers(fr)
    if ne != nf or qe != qf:
        problems.append({'where': where, 'problem': 'different numbers', 'en': en[:200], 'fr': fr[:200],
                         'enNumbers': ne + qe, 'frNumbers': nf + qf})


def main():
    problems = []
    pairs = 0
    files = subprocess.check_output(['git', 'ls-files', '*.html', '*.js'], cwd=ROOT, text=True).split()
    for name in files:
        if name.startswith(SKIP) or name.endswith('.min.js'):
            continue
        text = (ROOT / name).read_text(encoding='utf-8', errors='replace')
        if len(text) > 3_000_000:
            continue
        if name.endswith('.html'):
            for m in PAIR_ATTR.finditer(text):
                en, fr = (m.group(2), m.group(3)) if m.group(2) is not None else (m.group(6), m.group(5))
                pairs += 1
                compare(name, en, fr, problems)
        for m in PAIR_JS.finditer(text):
            pairs += 1
            compare(name, m.group(1), m.group(2), problems)
    # Bilingual records in the site's JSON data: objects holding both "en" and "fr" text.
    def walk(node, where):
        nonlocal pairs
        if isinstance(node, dict):
            en, fr = node.get('en'), node.get('fr')
            if isinstance(en, str) and isinstance(fr, str) and len(en) > 3:
                pairs += 1
                compare(where, en, fr, problems)
            for v in node.values():
                walk(v, where)
        elif isinstance(node, list):
            for v in node:
                walk(v, where)
    for name in subprocess.check_output(['git', 'ls-files', 'assets/*.json', 'data/*.json', '*/data/*.json'], cwd=ROOT, text=True).split():
        if name.startswith(SKIP) or (ROOT / name).stat().st_size > 20_000_000:
            continue
        try:
            walk(json.loads((ROOT / name).read_text(encoding='utf-8')), name)
        except ValueError:
            continue
    if '--report' in sys.argv:
        Path(sys.argv[sys.argv.index('--report') + 1]).write_text(json.dumps(problems, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'BILINGUAL: {pairs:,} English and French pairs checked, {len(problems)} differences')
    for p in problems[:30]:
        print('BILINGUAL:', p['where'], p['problem'], '|', p['en'][:90], '|', p['fr'][:90])
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
