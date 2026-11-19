#!/usr/bin/env python3
"""Apply documented corrections to the independent salary-index transcription.

The received index is retained in data/october-2026/inputs. Counts and imputation estimates
are inputs from the independent project and are never altered or reconstructed.
Only the 2021 band shares/ratios and the documented band labels are corrected.
"""
import csv
import io
import json
import re
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / 'data/october-2026'
NAME = 'DI_di_disproportionality_index_2017-2025.csv'
ORIGINAL = FOLDER / 'inputs/salary-index-as-received-2026-11-18.csv'
GROUPS = {'all': 'all', 'black': 'black', 'vm': 'vm', 'non_vm': 'nvm',
          'indigenous': 'ind', 'pwd': 'dis'}


def rounded(v):
    return str(v.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def build():
    with ORIGINAL.open(newline='') as stream:
        reader = csv.DictReader(stream)
        fields, rows = reader.fieldnames, list(reader)
    with (FOLDER / 'DI_cleaned_imputed_salary_counts_2017-2025.csv').open(newline='') as stream:
        counts = [r for r in csv.DictReader(stream) if r['Year'] == '2021']
    total = next(r for r in counts if r['salary_range'] == 'Total')
    bands = [(0, 60000), (60000, 70000), (70000, 85000), (85000, 100000), (100000, None)]
    selected = [r for r in rows if r['year_di'] == '2021' and r['quintile'] != 'All ranges']
    assert len(selected) == len(bands) == 5
    for group in GROUPS:
        assert sum(int(r['count_'+group]) for r in counts if r['salary_range'] != 'Total') == int(total['count_'+group])
    for row, (low, high) in zip(selected, bands):
        bucket = []
        for r in counts:
            if r['salary_range'] == 'Total':
                continue
            floor = 0 if r['salary_range'].startswith('Under') else int(re.search(r'[\d,]+', r['salary_range'])[0].replace(',', ''))
            if floor >= low and (high is None or floor < high):
                bucket.append(r)
        shares = {g: Decimal(sum(int(r['count_'+g]) for r in bucket)) * 100 / Decimal(total['count_'+g]) for g in GROUPS}
        for g in GROUPS:
            row['per_'+g] = rounded(shares[g])
            row['di_'+g] = rounded(shares[g] / shares['all'])
    for row in rows:
        if row['year_di'] == '2023' and row['quintile'] == 'Over $150,000':
            row['quintile'], row['range_label'] = 'Over $104,999', '>104.999K'
        if row['year_di'] in ['2024', '2025'] and row['quintile'] == 'Less than $69,999':
            row['quintile'], row['range_label'] = 'Less than $70,000', '<70.0K'
        if row['year_di'] == '2025' and row['quintile'] == '$69,000 to $79,999':
            row['quintile'], row['range_label'] = '$70,000 to $79,999', '70.0-79.9K'
        if row['year_di'] == '2025' and row['quintile'] == 'NA':
            row['quintile'] = 'All ranges'
    inline = {}
    for row in rows:
        if row['quintile'] == 'All ranges':
            continue
        d = inline.setdefault(row['year_di'], {'ranges': [], 'all': [], **{v: [] for k, v in GROUPS.items() if k != 'all'}})
        d['ranges'].append(row['quintile'])
        d['all'].append(float(row['per_all']))
        for key, label in GROUPS.items():
            if key != 'all':
                d[label].append([float(row['per_'+key]), float(row['di_'+key])])
    # Check the corrected year without normalizing gaps in the upstream series.
    for year in inline:
        yr = [r for r in rows if r['year_di'] == year and r['quintile'] != 'All ranges']
        assert len(yr) == 5
        if year == '2021':
            for g in GROUPS:
                assert abs(sum(Decimal(r['per_'+g]) for r in yr) - 100) <= Decimal('0.03'), (year, g)
    out = io.StringIO(newline='')
    writer = csv.DictWriter(out, fieldnames=fields, lineterminator='\n')
    writer.writeheader(); writer.writerows(rows)
    return out.getvalue(), inline


def main():
    output, inline = build()
    page = ROOT / 'explorer.html'
    source = page.read_text()
    literal = json.dumps(json.dumps(inline, separators=(',', ':'), ensure_ascii=False), ensure_ascii=False)
    pattern = r'const DI_DATA=JSON\.parse\("(?:[^"\\]|\\.)*"\);'
    updated, n = re.subn(pattern, lambda _: 'const DI_DATA=JSON.parse('+literal+');', source)
    assert n == 1
    if '--check' in sys.argv:
        assert (FOLDER / NAME).read_text() == output, 'salary CSV differs from its documented inputs'
        assert source == updated, 'inline salary index differs from the corrected CSV'
        print('PASS: corrected 2021 salary shares sum to 100; CSV and inline data agree for all years')
    else:
        (FOLDER / NAME).write_text(output)
        page.write_text(updated)
        print('Updated independent salary index and matching explorer data')


if __name__ == '__main__':
    main()
