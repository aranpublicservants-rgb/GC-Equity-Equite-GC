#!/usr/bin/env python3
"""Build data-coverage.html: what evidence each organization page holds and what the
public source register shows about hosting and use.

Inputs (unchanged): assets/department-pages.json, data/department-page-template.json,
data/source-register-status.json. Usage: build-data-coverage.py [--check]
"""
import html, json, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data-coverage.html'
pages = json.loads((ROOT / 'assets/department-pages.json').read_text(encoding='utf-8'))
template = json.loads((ROOT / 'data/department-page-template.json').read_text(encoding='utf-8'))
status = json.loads((ROOT / 'data/source-register-status.json').read_text(encoding='utf-8'))
register = json.loads((ROOT / status['register']).read_text(encoding='utf-8'))

# Sections every page carries are structural; coverage is reported for evidence sections.
STRUCTURAL = {'at-a-glance', 'data-guide', 'missing', 'data-library', 'publications', 'requests', 'actions', 'sources'}
labels = {s['id']: s for s in template['sections']}
orgs = sorted(pages['organizations'], key=lambda o: o['en'].lower())
total = len(orgs)
counts = Counter(s for o in orgs for s in o['sections'])
evidence = [s['id'] for s in template['sections'] if s['id'] not in STRUCTURAL and counts[s['id']]]
evidence.sort(key=lambda s: -counts[s])
e = html.escape


def label(sid, lang):
    return labels[sid][lang].replace('{dept}', 'the organization' if lang == 'en' else 'l’organisme')


def n(value, lang):
    return f'{value:,}' if lang == 'en' else f'{value:,}'.replace(',', ' ')


FAMILY = {
    'PSES': ('Public Service Employee Survey', 'Sondage auprès des fonctionnaires fédéraux'),
    'PSC-surveys': ('Public Service Commission surveys', 'Sondages de la Commission de la fonction publique'),
    'PSC-staffing': ('Public Service Commission staffing data', 'Données de dotation de la Commission de la fonction publique'),
    'TBS-EE-reports': ('Treasury Board employment equity reports', 'Rapports sur l’équité en matière d’emploi du Conseil du Trésor'),
    'InfoBase': ('GC InfoBase', 'InfoBase du GC'),
    'departmental-EE': ('Departmental employment equity publications', 'Publications ministérielles sur l’équité en matière d’emploi'),
    'pay-equity': ('Pay equity', 'Équité salariale'),
    'official-languages': ('Official languages', 'Langues officielles'),
    'harassment-violence': ('Harassment and violence', 'Harcèlement et violence'),
    'accessibility': ('Accessibility', 'Accessibilité'),
    'StatCan': ('Statistics Canada', 'Statistique Canada'),
    'PBO': ('Parliamentary Budget Officer', 'Directeur parlementaire du budget'),
    'CHRC': ('Canadian Human Rights Commission', 'Commission canadienne des droits de la personne'),
}
by_family = defaultdict(Counter)
for r in status['rows']:
    f = by_family[r['family']]
    f['entries'] += 1
    if r['excluded']:
        f['excluded'] += 1
        continue
    f['included'] += 1
    for k in ('verified', 'hosted', 'downloadable', 'searchable', 'departmental', 'analysis'):
        if r[k]:
            f[k] += 1
    if not any(r[k] for k in ('hosted', 'searchable', 'departmental', 'analysis')):
        f['none'] += 1

T = {
 'en': dict(
  title='Data coverage and limitations', lang='Français', langhref='?lang=fr', hl='fr',
  intro=f'This page shows which kinds of evidence each of the {n(total,"en")} organization pages contains, and what this site holds for each entry in the public source register. It is generated from the site’s own data files.',
  h_org='Evidence sections on organization pages',
  org_note='A section appears only where a published source has data for that organization. A missing section can mean the organization was not covered by a survey or report, its results were suppressed, or it has different reporting obligations. Every organization page lists its own gaps under Evidence gaps. Figures from one organization are never used for another.',
  th_section='Section', th_pages='Organization pages with the section', th_share='Share of pages',
  h_each='Sections present for each organization', each_sum=f'Show all {n(total,"en")} organizations', th_org='Organization', th_has='Evidence sections present', th_lacks='Evidence sections not present', none='None',
  h_reg='Public source register', reg_note=f'The register lists {n(status["entries"],"en")} publications and datasets recorded on {register["asOf"]}. Each entry was checked against this repository on {status["asOf"]}.',
  defs=[('Verified','The copy on this site matches the original by SHA-256 checksum, by the checksum recorded when it was downloaded, by the partition manifest for very large survey files split into parts, or by exact byte count when only one file on this site has the size recorded in the register. The status file names the method for each entry. A size match is not proof of identical bytes.'),
        ('Hosted','At least one corresponding copy is stored in this repository. This does not establish complete coverage of every edition, format or language.'),
        ('Downloadable','A hosted copy is linked from a page or data catalogue on this site.'),
        ('Searchable','The source is listed in the data assistant catalogue.'),
        ('On organization pages','The source or its copy is cited on at least one organization page.'),
        ('Used in analysis','The source or its copy is read by a comparison or analysis on this site.'),
        ('Excluded','Not approved for this site, outside the federal public service scope, not found at the publisher, or blocked.'),
        ('No evidence found','Included in scope, but no copy, citation or use was found in this repository. This does not mean the source does not exist.')],
  th_family='Source family', th_entries='Entries', th_excl='Excluded', th_incl='In scope', th_ver='Verified', th_host='Hosted', th_dl='Downloadable', th_search='Searchable', th_dept='On organization pages', th_an='Used in analysis', th_none='No evidence found', total='Total',
  h_lim='Limitations',
  lims=['Survey results describe respondents to each question, not the whole workforce.',
        'Treasury Board employment equity counts for the core public administration and for separate agencies cover different populations. They are shown separately.',
        'Suppressed values stay suppressed. This site does not reconstruct suppressed counts or derive headcounts from rounded percentages.',
        'A commitment in a plan or report is shown as a commitment, not as a result.',
        'Matching between the register and this repository uses publisher addresses, resource identifiers, file names and checksums. A match confirms that a copy exists here. It does not confirm that every row has been analysed.',
        'Only evidence specific to the Canadian federal public service is included. General labour market benchmarks are excluded.'],
  files='Data files used for this page', dl='Download the full register status (JSON)', copies='Copies of register entries downloaded for this site'),
 'fr': dict(
  title='Couverture des données et limites', lang='English', langhref='?lang=en', hl='en',
  intro=f'Cette page indique les types de données que contient chacune des {n(total,"fr")} pages d’organisme et ce que ce site conserve pour chaque entrée du registre public des sources. Elle est produite à partir des fichiers de données du site.',
  h_org='Sections de données des pages d’organisme',
  org_note='Une section n’apparaît que si une source publiée contient des données pour cet organisme. L’absence d’une section peut signifier que l’organisme n’était pas visé par un sondage ou un rapport, que ses résultats ont été supprimés ou qu’il a d’autres obligations de déclaration. Chaque page d’organisme présente ses propres lacunes sous Lacunes dans les données. Les chiffres d’un organisme ne sont jamais utilisés pour un autre.',
  th_section='Section', th_pages='Pages d’organisme comportant la section', th_share='Proportion des pages',
  h_each='Sections présentes pour chaque organisme', each_sum=f'Afficher les {n(total,"fr")} organismes', th_org='Organisme', th_has='Sections de données présentes', th_lacks='Sections de données absentes', none='Aucune',
  h_reg='Registre public des sources', reg_note=f'Le registre compte {n(status["entries"],"fr")} publications et jeux de données consignés le {register["asOf"]}. Chaque entrée a été vérifiée dans ce dépôt le {status["asOf"]}.',
  defs=[('Vérifiée','La copie sur ce site correspond à l’original selon la somme de contrôle SHA-256, la somme consignée au téléchargement, le manifeste des très gros fichiers de sondage divisés en parties, ou le nombre exact d’octets lorsqu’un seul fichier du site a la taille consignée au registre. Le fichier d’état précise la méthode pour chaque entrée. Une concordance de taille ne prouve pas l’identité des octets.'),
        ('Hébergée','Au moins une copie correspondante est conservée dans ce dépôt. Cela ne garantit pas la couverture de toutes les éditions, de tous les formats ou des deux langues.'),
        ('Téléchargeable','Une copie hébergée est liée à partir d’une page ou d’un catalogue de données du site.'),
        ('Consultable','La source figure dans le catalogue de l’assistant de données.'),
        ('Sur les pages d’organisme','La source ou sa copie est citée sur au moins une page d’organisme.'),
        ('Utilisée dans les analyses','La source ou sa copie est lue par une comparaison ou une analyse du site.'),
        ('Exclue','Non approuvée pour ce site, hors du champ de la fonction publique fédérale, introuvable chez l’éditeur ou bloquée.'),
        ('Aucune trace','Dans le champ, mais aucune copie, citation ou utilisation n’a été trouvée dans ce dépôt. Cela ne signifie pas que la source n’existe pas.')],
  th_family='Famille de sources', th_entries='Entrées', th_excl='Exclues', th_incl='Dans le champ', th_ver='Vérifiées', th_host='Hébergées', th_dl='Téléchargeables', th_search='Consultables', th_dept='Sur les pages d’organisme', th_an='Utilisées dans les analyses', th_none='Aucune trace', total='Total',
  h_lim='Limites',
  lims=['Les résultats de sondage décrivent les répondants à chaque question, et non l’ensemble de l’effectif.',
        'Les nombres du Conseil du Trésor sur l’équité en matière d’emploi pour l’administration publique centrale et pour les organismes distincts visent des populations différentes. Ils sont présentés séparément.',
        'Les valeurs supprimées restent supprimées. Ce site ne reconstitue pas les nombres supprimés et ne calcule pas d’effectifs à partir de pourcentages arrondis.',
        'Un engagement figurant dans un plan ou un rapport est présenté comme un engagement, et non comme un résultat.',
        'Le rapprochement entre le registre et ce dépôt repose sur les adresses des éditeurs, les identifiants de ressources, les noms de fichiers et les sommes de contrôle. Une correspondance confirme qu’une copie existe ici. Elle ne confirme pas que chaque ligne a été analysée.',
        'Seules les données propres à la fonction publique fédérale du Canada sont incluses. Les repères généraux du marché du travail sont exclus.'],
  files='Fichiers de données utilisés pour cette page', dl='Télécharger l’état complet du registre (JSON)', copies='Copies des entrées du registre téléchargées pour ce site'),
}


def block(lang):
    t = T[lang]
    o = [f'<div lang="{lang}" data-cov-lang="{lang}"{" hidden" if lang == "fr" else ""}>',
         f'<h1>{e(t["title"])}</h1><p>{e(t["intro"])}</p>',
         f'<h2 id="org-{lang}">{e(t["h_org"])}</h2><p>{e(t["org_note"])}</p>',
         f'<div class="cov-table" role="region" tabindex="0" aria-labelledby="org-{lang}"><table><thead><tr><th scope="col">{e(t["th_section"])}</th><th scope="col">{e(t["th_pages"])}</th><th scope="col">{e(t["th_share"])}</th></tr></thead><tbody>']
    for sid in evidence:
        pct = round(100 * counts[sid] / total)
        o.append(f'<tr><th scope="row">{e(label(sid, lang))}</th><td>{n(counts[sid], lang)} / {n(total, lang)}</td><td>{pct}{" %" if lang == "fr" else "%"}</td></tr>')
    o.append('</tbody></table></div>')
    o.append(f'<p class="cov-source">{e(t["files"])}: <a href="assets/department-pages.json">assets/department-pages.json</a>, <a href="data/department-page-template.json">data/department-page-template.json</a></p>')
    o.append(f'<h3 id="each-{lang}">{e(t["h_each"])}</h3><details><summary>{e(t["each_sum"])}</summary><div class="cov-table" role="region" tabindex="0" aria-labelledby="each-{lang}"><table><thead><tr><th scope="col">{e(t["th_org"])}</th><th scope="col">{e(t["th_has"])}</th><th scope="col">{e(t["th_lacks"])}</th></tr></thead><tbody>')
    for org in sorted(orgs, key=lambda x: x[lang].lower()):
        has = [label(s, lang) for s in evidence if s in org['sections']]
        lacks = [label(s, lang) for s in evidence if s not in org['sections']]
        o.append(f'<tr><th scope="row"><a href="{e(org["path"])}?lang={lang}">{e(org[lang])}</a></th><td>{e("; ".join(has) or t["none"])}</td><td>{e("; ".join(lacks) or t["none"])}</td></tr>')
    o.append('</tbody></table></div></details>')
    o.append(f'<h2 id="reg-{lang}">{e(t["h_reg"])}</h2><p>{e(t["reg_note"])}</p><dl>')
    for term, d in t['defs']:
        o.append(f'<dt>{e(term)}</dt><dd>{e(d)}</dd>')
    o.append('</dl>')
    cols = [('entries', 'th_entries'), ('excluded', 'th_excl'), ('included', 'th_incl'), ('verified', 'th_ver'), ('hosted', 'th_host'),
            ('downloadable', 'th_dl'), ('searchable', 'th_search'), ('departmental', 'th_dept'), ('analysis', 'th_an'), ('none', 'th_none')]
    o.append(f'<div class="cov-table" role="region" tabindex="0" aria-labelledby="reg-{lang}"><table><thead><tr><th scope="col">{e(t["th_family"])}</th>' + ''.join(f'<th scope="col">{e(t[h])}</th>' for _, h in cols) + '</tr></thead><tbody>')
    tot = Counter()
    for fam in sorted(by_family, key=lambda f: -by_family[f]['entries']):
        c = by_family[fam]
        tot.update(c)
        name = FAMILY.get(fam, (fam, fam))[0 if lang == 'en' else 1]
        o.append(f'<tr><th scope="row">{e(name)}</th>' + ''.join(f'<td>{n(c[k], lang)}</td>' for k, _ in cols) + '</tr>')
    o.append(f'</tbody><tfoot><tr><th scope="row">{e(t["total"])}</th>' + ''.join(f'<td>{n(tot[k], lang)}</td>' for k, _ in cols) + '</tr></tfoot></table></div>')
    o.append(f'<p class="cov-source"><a href="data/source-register-status.json" download>{e(t["dl"])}</a> · <a href="register-copies.html">{e(t["copies"])}</a> · <a href="{e(status["register"])}">{e(status["register"])}</a></p>')
    multi = [r for r in status['rows'] if r.get('snapshotCoverage')]
    if multi:
        heading = 'Report collections: verified archive copies' if lang == 'en' else 'Collections de rapports : copies d’archive vérifiées'
        o.append(f'<h3>{e(heading)}</h3><ul>')
        for r in multi:
            c = r['snapshotCoverage']
            label_text = f'{c["verifiedCopies"]} / {c["expected"]}' + (' copies verified' if lang == 'en' else ' copies vérifiées')
            o.append(f'<li>{e(r["id"])} — {e(label_text)}. <a href="{e(r["source"])}">' + ('Publisher source' if lang == 'en' else 'Source de l’éditeur') + '</a></li>')
        o.append('</ul>')
    o.append(f'<h2>{e(t["h_lim"])}</h2><ul>' + ''.join(f'<li>{e(x)}</li>' for x in t['lims']) + '</ul></div>')
    return '\n'.join(o)


page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Data coverage and limitations | GC Equity</title>
<meta name="description" content="Which evidence each organization page contains and what this site holds for each source in the public source register.">
<style>body{{margin:0;font:1rem/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#173848;background:#fff}}main{{max-width:72rem;margin:auto;padding:1rem}}.cov-table{{overflow:auto;max-width:100%;border:1px solid #c2d0d5;margin:.5rem 0}}table{{border-collapse:collapse;min-width:100%}}th,td{{padding:.45rem .6rem;border:1px solid #c2d0d5;text-align:start;vertical-align:top}}thead th{{background:#eef4f5}}tfoot th,tfoot td{{font-weight:700;background:#f6f9f9}}td{{font-variant-numeric:tabular-nums}}dt{{font-weight:700;margin-top:.5rem}}dd{{margin:0 0 .25rem 0}}.cov-source{{font-size:.92rem}}a{{color:#0b5c8c}}a:focus-visible,summary:focus-visible,.cov-table:focus-visible{{outline:3px solid #ba7900;outline-offset:2px}}summary{{cursor:pointer;padding:.4rem 0}}@media print{{details{{display:block}}.cov-table{{overflow:visible}}}}</style>
<link rel="stylesheet" href="./gc-shared-shell.css?v=20261127-2" data-gce-shared-shell="css"><script src="./gc-shared-shell.js?v=20261127-2" defer data-gce-shared-shell="js"></script></head>
<body><main id="main">
<p><a id="lang-switch" href="?lang=fr" hreflang="fr" lang="fr">Français</a></p>
{block("en")}
{block("fr")}
</main>
<script>
(function(){{var fr=new URLSearchParams(location.search).get('lang')==='fr'||(!new URLSearchParams(location.search).get('lang')&&(function(){{try{{return localStorage.getItem('gcEquityLang')==='fr'}}catch(e){{return false}}}})());
document.documentElement.lang=fr?'fr':'en';document.title=fr?'Couverture des données et limites | Équité-GC':'Data coverage and limitations | GC Equity';
document.querySelectorAll('[data-cov-lang]').forEach(function(b){{b.hidden=b.getAttribute('data-cov-lang')!==(fr?'fr':'en')}});
var s=document.getElementById('lang-switch');s.textContent=fr?'English':'Français';s.href=fr?'?lang=en':'?lang=fr';s.hreflang=fr?'en':'fr';s.lang=fr?'en':'fr';
s.addEventListener('click',function(){{try{{localStorage.setItem('gcEquityLang',fr?'en':'fr')}}catch(e){{}}}});}})();
</script></body></html>
'''

if '--check' in sys.argv:
    if OUT.read_text(encoding='utf-8') != page:
        sys.exit('data-coverage.html is out of date: run scripts/build-data-coverage.py')
    print('DATA COVERAGE PAGE: current')
else:
    OUT.write_text(page, encoding='utf-8')
    print('DATA COVERAGE PAGE:', total, 'organizations,', len(evidence), 'evidence sections,', status['entries'], 'register entries')
