"""Render the bilingual report directory and index its public source metadata."""
import csv
import hashlib
import html
import json
from pathlib import Path

R=Path(__file__).resolve().parents[1]
catalog=json.loads((R/'assets/equity-reports.json').read_text())
E=lambda value:html.escape(str(value),quote=True)
def text(tag,values,attrs=''):
    return f'<{tag} {attrs} data-en="{E(values["en"])}" data-fr="{E(values["fr"])}">{E(values["en"])}</{tag}>'
def label(tag,en,fr,attrs=''):return text(tag,{'en':en,'fr':fr},attrs)
def card(record):
    out=f'<article class="report-card" id="{record["id"]}" data-scope="{record["scope"]}" data-org="{E(record["organization"])}">'
    out+=text('h3',record['title'])+text('p',record['publisher'],'class="publisher"')+text('p',record['period'])
    out+=text('p',record['population'],'class="scope-note"')
    if record.get('note'):out+=text('p',record['note'],'class="scope-note"')
    out+='<ul class="report-links">'
    for lang,url in record['sources'].items():
        title='Read the publisher’s English version' if lang=='en' else 'Lire la version française de l’éditeur'
        out+=f'<li><a href="{E(url)}" lang="{lang}" hreflang="{lang}">{E(title)}</a></li>'
    for f in record['files']:
        assert (R/f['path']).is_file()
        assert hashlib.sha256((R/f['path']).read_bytes()).hexdigest()==f['sha256']
        title=('Download hosted English copy' if f['lang']=='en' else 'Télécharger la copie française hébergée')+f' ({f["format"]}, {f["bytes"]:,} bytes)'
        if f['lang']=='fr':title=title.replace('bytes','octets')
        out+=f'<li><a href="{E(f["path"])}" download lang="{f["lang"]}">{E(title)}</a></li>'
    out+='</ul>'
    for f in record['files']:
        if f.get('provenance'):out+=text('p',f['provenance'],'class="provenance"')
    return out+'</article>'

body='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Employment equity reports | GC Equity</title><meta name="description" content="Employment equity reports, promotion-rate studies and source downloads. Each report identifies its employer, population and reporting period."><link rel="stylesheet" href="gc-workspace.css?v=20261116-2"><link rel="stylesheet" href="assets/equity-reports.css?v=20261120"><script src="assets/equity-reports.js?v=20261120" defer></script><script src="assets/employer-equity-csv-viewer.js?v=20261123" defer></script><script src="gc-workspace.js?v=20261120-reports" defer></script></head><body><main id="main" class="reports-page">'
body+=label('h1','Employment equity reports','Rapports sur l’équité en matière d’emploi')
body+=label('p','Read promotion-rate studies and employer reports alongside the data tables. Each edition keeps its own population, reporting period and availability benchmark.','Consultez les études sur les taux de promotion et les rapports des employeurs avec les tableaux de données. Chaque édition conserve sa population, sa période de référence et sa référence de disponibilité.')
body+='<nav class="report-nav" aria-label="Report sections">'+label('a','Public service and separate-agency reports','Rapports sur la fonction publique et les organismes distincts','href="#public-service"')+' · '+label('a','Private-sector context','Contexte du secteur privé','href="#external-context"')+' · '+label('a','Related datasets','Jeux de données connexes','href="#dataset-links"')+' · '+label('a','Full public source files','Sources intégrales des données publiques','href="source-access.html"')+'</nav>'
body+='<form id="report-filters" role="search">'+label('label','Search reports','Rechercher des rapports','for="report-search"')+'<input id="report-search" type="search" name="q">'+label('label','Reporting population','Population visée','for="report-scope"')+'<select id="report-scope">'+''.join(label('option',en,fr,'value="'+v+'"') for v,en,fr in [('', 'All populations','Toutes les populations'),('public','Public service studies and core public administration','Études sur la fonction publique et administration publique centrale'),('agency','Separate-agency workforce','Effectif d’un organisme distinct'),('private','Federally regulated private sector','Secteur privé sous réglementation fédérale')])+'</select><button type="reset" data-en="Clear filters" data-fr="Effacer les filtres">Clear filters</button></form><p id="report-count" role="status" aria-live="polite"></p>'
body+='<section id="public-service" class="report-section">'+label('h2','Public service and separate-agency reports','Rapports sur la fonction publique et les organismes distincts')
body+=''.join(card(r) for r in catalog['reports'] if r['scope']!='private')+'</section>'
body+='<section id="external-context" class="report-section">'+label('h2','Federally regulated private-sector context','Contexte du secteur privé sous réglementation fédérale')
body+=label('p','These reports analyze federally regulated private-sector employers covered by the Employment Equity Act, including Crown corporations within that reporting population. They do not measure the federal public service or ESDC’s departmental workforce. Keep these results separate from departmental comparisons.','Ces rapports analysent les employeurs du secteur privé sous réglementation fédérale visés par la Loi sur l’équité en matière d’emploi, y compris les sociétés d’État comprises dans cette population. Ils ne mesurent ni la fonction publique fédérale ni l’effectif ministériel d’EDSC. Gardez ces résultats à part des comparaisons ministérielles.','class="population-warning"')
body+=''.join(card(r) for r in catalog['reports'] if r['scope']=='private')+'</section>'
body+=label('p','No report matches these filters.','Aucun rapport ne correspond à ces filtres.','id="report-empty" hidden')
body+='<section id="dataset-links">'+label('h2','Related datasets','Jeux de données connexes')
for d in catalog['datasets']:
    body+=f'<article class="dataset-card" id="{d["id"]}">'+text('h3',d['title'])+text('p',d['population'])+'<ul>'
    body+='<li>'+label('a','Publisher’s dataset record','Fiche du jeu de données de l’éditeur','href="'+E(d['source'])+'"')+'</li>'
    for f in d['links']:
        assert (R/f['path'].split('#')[0]).exists()
        title={'en':'English','fr':'Français','both':'English and French / Anglais et français'}[f['lang']]+' ('+f['format']+')'
        if f['path'].startswith('data/employer-equity-sources-2026-11/'):
            title += ': ' + f['path'].rsplit('/', 1)[-1]
        body+='<li><a href="'+E(f['path'])+'">'+E(title)+'</a></li>'
    body+='</ul></article>'
body+='</section><section>'+label('h2','Source copies and methods','Copies des sources et méthodes')+label('p','Hosted copies preserve the supplied files. The NRC 2023-2024 PDF’s archive origin is recorded beside its download. Use each report’s tables and methodology for its detailed breakdowns.','Les copies hébergées conservent les fichiers fournis. L’origine d’archive du PDF du CNRC de 2023-2024 est indiquée à côté du téléchargement. Consultez les tableaux et la méthode de chaque rapport pour ses ventilations détaillées.')+'<p>'+label('a','Download the file register with source URLs and SHA-256 checksums (CSV)','Télécharger le registre des fichiers avec leurs URL sources et sommes SHA-256 (CSV)','href="data/ee-reports/manifest.csv" download')+' · '+label('a','Sources and methods','Sources et méthodes','href="sources.html"')+'</p></section></main></body></html>\n'
assert '\u2014' not in body
(R/'reports.html').write_text(body)
with (R/'data/ee-reports/manifest.csv').open('w',newline='') as stream:
    fields=['report_id','title_en','title_fr','population','period_en','lang','format','path','bytes','sha256','publisher_url','download_source_url','provenance_en','provenance_fr']
    writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
    for r in catalog['reports']:
        for f in r['files']:
            writer.writerow(dict(report_id=r['id'],title_en=r['title']['en'],title_fr=r['title']['fr'],population=r['scope'],period_en=r['period']['en'],lang=f['lang'],format=f['format'],path=f['path'],bytes=f['bytes'],sha256=f['sha256'],publisher_url=r['sources'].get(f['lang'],''),download_source_url=f['source'],provenance_en=f.get('provenance',{}).get('en',''),provenance_fr=f.get('provenance',{}).get('fr','')))
index_path=R/'assets/search-index.json';index=json.loads(index_path.read_text())
index['docs']=[d for d in index['docs'] if not d['url'].startswith('reports.html#')]
for r in catalog['reports']:
    index['docs'].append(dict(id='ee-report-'+r['id'],site='GC Equity',kind='source',en=r['title']['en'],fr=r['title']['fr'],text=r['publisher']['en']+' '+r['population']['en']+' '+r['period']['en'],textFr=r['publisher']['fr']+' '+r['population']['fr']+' '+r['period']['fr'],url='reports.html#'+r['id']))
index_path.write_text(json.dumps(index,ensure_ascii=False,separators=(',',':')))
manifest_path=R/'assets/workspace-manifest.json';manifest=json.loads(manifest_path.read_text())
for entry in manifest['files']:
    if entry['file']=='assets/search-index.json':
        raw=index_path.read_bytes();entry.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Rendered {len(catalog["reports"])} report editions; indexed titles in English and French')
