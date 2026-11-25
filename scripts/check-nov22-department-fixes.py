#!/usr/bin/env python3
"""Regression checks for the November 2026 source-scoped departmental fixes."""
import csv
import gzip
import json
import re
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
read = lambda rel: (ROOT / rel).read_text(encoding='utf-8')
redirects = json.loads(read('data/department-duplicate-routes.json'))['routes']
assert len(redirects) == 11 and len(set(redirects.values())) >= 8
sitemap = read('sitemap.xml')
for old, target in redirects.items():
    html = read(f'{old}/index.html')
    canonical = f'https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/{target}/'
    assert f'<link rel="canonical" href="{canonical}">' in html, old
    assert 'location.search+location.hash' in html and 'location.replace(' in html, old
    assert (ROOT / target / 'index.html').is_file(), old
    assert f'<loc>https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/{old}/</loc>' not in sitemap, old

reasons = {
    'canada-post': ('Crown corporation', 'société d’État'),
    'bank-of-canada': ('outside the core public administration', 'ne fait pas partie de l’administration publique centrale'),
    'canada-infrastructure-bank': ('Crown corporation', 'société d’État'),
    'service-canada': ('part of Employment and Social Development Canada', 'fait partie d’Emploi et Développement social Canada'),
    'canadian-coast-guard': ('September 2, 2025', '2 septembre 2025')
}
for slug, (en, fr) in reasons.items():
    html = read(f'{slug}/index.html')
    assert en in html and fr in html, slug
    assert 'No matching source in this reading collection. Check the issuing organization' not in html, slug
    assert 'Aucune source correspondante dans cette collection de lecture.' not in html, slug

dnd = read('dnd/index.html')
for question, pct, base in [
    ('84', '15%', '13140'), ('85', '58%', '2110'),
    ('44e', '27%', '13145'), ('73p', '29%', '13095')
]:
    en_table = dnd.split('<h2 id="accommodation">')[1].split('<h2 id=',1)[0]
    fr_table = dnd.split('<h2 id="mesures-adaptation">')[1].split('<h2 id=',1)[0]
    assert f'Question {question}.' in en_table and pct in en_table and base in en_table
    assert f'Question {question}.' in fr_table and base in fr_table

dfo = read('dfo/index.html')
for question, rate, base in [('Q44e.', '28%', '6,625'), ('Q73p.', '31%', '6,615')]:
    en_table=dfo.split('<h2 id="accommodation">')[1].split('<h2 id=',1)[0]
    assert question in en_table and rate in en_table and base in en_table
assert '15 respondents' in dfo and '15 réponses' in dfo
isc = read('isc/index.html')
assert '20 respondents' in isc and '20 réponses' in isc

for slug in ['cra', 'esdc', 'correctional-service-canada',
             'canada-border-services-agency', 'dnd', 'dfo', 'isc']:
    html = read(f'{slug}/index.html')
    assert html.count('recourse-cross-reference') >= 2, slug
    assert 'aran-raar/recourse/cases/' in html, slug
    assert 'non-exhaustive' in html, slug

assert '47.2%' in dfo and '44.8%' in dfo
assert '15.4%' in dfo and '14.7%' in dfo
assert '14,816' in dfo and '4,952' in dfo
for value in ('4.5%', '66.7%', '75.0%', '3.8%'):
    assert value in dfo
assert '125% increase in demand' in dfo
assert '65% male and 35% female' in dfo
assert '58% male and 41% female' in dfo
assert 'Fleet Operational Capability' in dfo
assert 'Indigenous Gathering Space' in dfo
# Reconcile the two formerly contested cells against the original PSC 2023
# source partition, retaining the published weighted percentage and base.
catalogue = json.loads(read('dfo/data/catalogue.json'))['files']
for original, group_field, group, expected, base, en_label, fr_label in [
    ('1c3e883f-b5c4-4ac8-96f0-f9757139bd13_cfppsc_snps21.csv', 'pg_05_e',
     'Black', Decimal('16.2'), '138', 'Black', 'Personnes noires'),
    ('77c9c20e-691b-4c13-8243-9cf9cf81c8dc_cfppsc_snps05.csv', 'iidflag_e',
     'Indigenous identity', Decimal('21.8'), '396', 'Indigenous', 'Autochtones'),
]:
    entry = next(x for x in catalogue if x['sourceFile'] == original)
    with gzip.open(ROOT / 'dfo' / entry['path'], 'rt', encoding='utf-8-sig', newline='') as stream:
        rows = [r for r in csv.DictReader(stream) if r['dept_e'] == 'Fisheries and Oceans Canada'
                and r[group_field] == group and r['question'].lower() == 'sta_57']
    yes = next(r for r in rows if r['question_value_e'] == 'Yes')
    total = next(r for r in rows if r['question_value_e'] == 'All respondents')
    assert Decimal(yes['shr_w_resp']) * 100 == expected, (group, yes)
    assert total['total_w_resp'] == base, (group, total)
    for label, formatted in [(en_label, str(expected)+'%'), (fr_label, str(expected).replace('.', ',')+' %')]:
        assert re.search(r'<tr><th scope="row">' + re.escape(label) +
                         r'</th><td>[^<]+</td><td>' + re.escape(formatted) + r'</td>', dfo), label
assert 'published weighted total 138' in dfo and 'published weighted total 396' in dfo
assert 'Under source verification' not in dfo and 'Vérification de la source en cours' not in dfo

generator=read('scripts/build-department-pages.py')
dashboard=read('gc-dashboard.js')
assert "if slug in redirects:" in generator
assert "scope_reasons=" in generator
assert "recourse_additions(d,l)" in generator
assert "redirects':redirects" in generator
assert 'redirects?.[o.id]' in dashboard
assert 'canonicalName' in dashboard
print('PASS: 11 canonical routes, 5 scope-specific thin pages, 6 accommodation measures, 7 recourse cross-references, 2 small-base cautions, detailed DFO findings, original weighted staffing cells and rebuild protections')
