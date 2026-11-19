#!/usr/bin/env python3
"""Check the numerical and source-handling regressions identified in November 2026."""
import csv
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
subprocess.run(['python3', str(ROOT / 'scripts/build-salary-index.py'), '--check'], check=True)
subprocess.run(['python3', str(ROOT / 'scripts/update-data-checksums.py'), '--check'], check=True)

model = json.loads((ROOT / 'assets/workspace-data.json').read_text())
page = (ROOT / 'explorer.html').read_text()
assert len(model['DEPTS']) == 71
assert '72 organizations' not in page and '72 organisations' not in page
assert 'nothing is estimated' not in page and "rien n'est estimé" not in page
assert 'id="c_sal" value="143271"' in page

inventory = list(csv.DictReader((ROOT / 'data/october-2026/public-source-inventory.csv').open(newline='')))
assert sum(r['Type'] == 'Data table' for r in inventory) == 126
assert 'id="tables">126<' in (ROOT / 'sources.html').read_text()
# A file that exists in Git can still be excluded from the GitHub Pages build.
excluded = [line.strip()[2:] for line in (ROOT / '_config.yml').read_text().splitlines() if line.strip().startswith('- ')]
for target in ['data/checksums.sha256', 'data/october-2026/inputs/salary-index-as-received-2026-11-18.csv']:
    assert target in (ROOT / 'sources.html').read_text()
    assert (ROOT / target).is_file()
    assert not any(target == item or target.startswith(item.rstrip('/')+'/') for item in excluded), f'download excluded from publication: {target}'
for name in ['TBS_Indigenous_subgroups_by_department_2025.csv', 'TBS_disability_subgroups_by_department_2024.csv']:
    rows = list(csv.DictReader((ROOT / 'data/october-2026' / name).open(newline='')))
    assert not any(r['department_or_agency'].startswith('SOURCE:') for r in rows)
    assert not any('ANOMALY:' in str(r) for r in rows)

comparison = json.loads((ROOT / 'data/call-to-action-comparisons.json').read_text())
c = next(c for c in comparison['comparisons'] if (c['feature'], c['outcome']) == ('E_bias_training', 'snps_rac_STA_14A'))
included = [r for r in comparison['organizations'] if r.get(c['feature']) is False and r.get(c['outcome']) is not None and r.get('band') is not None]
assert c['n0'] == len(included) == 18
assert round(sum(r[c['outcome']] for r in included) / len(included), 3) == c['mean0']
assert c['excluded_missing_size'] == ['office-superintendent-financial-institutions-canada']
letters = json.loads((ROOT / 'data/call-to-action-letters.json').read_text())
assert all(o['name_fr'] for o in letters['organizations'])
assert all(o['employer'] or o.get('employer_note') for o in letters['organizations'])

for path in ['gc-workspace.js', 'equity.html', 'organizations.html', 'assets/search-index.json']:
    text = (ROOT / path).read_text()
    assert not re.search(r'explorer\.html(?:\?[^#"\s]*)?#(?:data|departments)\b', text), path
    assert not re.search(r'aran-raar/#(?:about|join|ways|work)-(?:en|fr)\b', text), path

# Survey extracts retain their own source and population; they are not sums of branch rows.
for section in ['dnd', 'dfo']:
    summary = json.loads((ROOT / section / 'data/survey-summary.json').read_text())
    assert summary['source']['url'].endswith('/EEINFODV.csv')
    assert all(summary['source']['filters']['LEVEL'+str(i)+'ID'] == 0 for i in range(2, 6))
    assert summary['source']['filters']['SURVEYR'] == 2024
print('PASS: audited figures, cohort exclusions, source cuts, French names, and repaired internal links')
