#!/usr/bin/env python3
"""Build register-copies.html: every public source register entry copied by
scripts/fetch-register-gaps.py, with the stored copy, the publisher address, the
retrieval date, the size and SHA-256 of the original, and any file not stored.

Built from data/register-gaps-manifest.json and the register only (not from the
register status), so it can be built before scripts/reconcile-source-register.py.
Usage: build-register-copies.py [--check]
"""
import html, json, sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'register-copies.html'
e = html.escape
man = json.loads((ROOT / 'data/register-gaps-manifest.json').read_text(encoding='utf-8'))
reg = {x['id']: x for x in json.loads((ROOT / 'data/public-source-register-2026-11-24.json').read_text(encoding='utf-8'))['entries']}
FAMILY = {
    'PSES': ('Public Service Employee Survey', 'Sondage auprès des fonctionnaires fédéraux'),
    'PSC-surveys': ('Public Service Commission surveys', 'Sondages de la Commission de la fonction publique'),
    'PSC-staffing': ('Public Service Commission staffing data', 'Données de dotation de la Commission de la fonction publique'),
    'TBS-EE-reports': ('Treasury Board employment equity reports', 'Rapports sur l’équité en matière d’emploi du Conseil du Trésor'),
    'InfoBase': ('GC InfoBase', 'InfoBase du GC'),
    'departmental-EE': ('Departmental employment equity publications', 'Publications ministérielles sur l’équité en matière d’emploi'),
    'pay-equity': ('Pay equity', 'Équité salariale'), 'official-languages': ('Official languages', 'Langues officielles'),
    'harassment-violence': ('Harassment and violence', 'Harcèlement et violence'), 'accessibility': ('Accessibility', 'Accessibilité'),
    'StatCan': ('Statistics Canada', 'Statistique Canada'), 'PBO': ('Parliamentary Budget Officer', 'Directeur parlementaire du budget'),
    'CHRC': ('Canadian Human Rights Commission', 'Commission canadienne des droits de la personne'),
}


def size(n, l):
    if n is None:
        return ''
    mb = n / 1_000_000
    s = f'{mb:,.1f} MB' if mb >= 0.1 else f'{n / 1000:,.0f} KB'
    return s.replace(',', ' ').replace('.', ',').replace('MB', 'Mo').replace('KB', 'ko') if l == 'fr' else s


def block(l):
    T = lambda en, fr: fr if l == 'fr' else en
    by_fam = defaultdict(list)
    for item in man['entries']:
        by_fam[reg[item['id']]['family']].append(item)
    stored = sum(1 for i in man['entries'] if any(f.get('stored') for f in i['files']))
    out = [f'<div lang="{l}" data-cov-lang="{l}"{" hidden" if l == "fr" else ""}>',
           '<h1>' + e(T('Copies of public source register entries', 'Copies des entrées du registre public des sources')) + '</h1>',
           '<p>' + e(T(f'This page lists the {len(man["entries"])} register entries that had no copy on this site and were downloaded from their publishers. {stored} have at least one stored file. Files are stored unchanged and compressed with gzip; very large survey files are split into parts, each starting with the published header.',
                       f'Cette page présente les {len(man["entries"])} entrées du registre qui n’avaient pas de copie sur ce site et qui ont été téléchargées chez leurs éditeurs. {stored} ont au moins un fichier conservé. Les fichiers sont conservés tels quels et compressés avec gzip; les très gros fichiers de sondage sont divisés en parties qui commencent chacune par l’en-tête publié.')) + '</p>',
           '<p>' + e(T('The size and SHA-256 checksum describe the original file as downloaded. A web page is kept as a compressed snapshot of its HTML for reference and is not shown as a page.',
                       'La taille et la somme SHA-256 décrivent le fichier original tel que téléchargé. Une page Web est conservée comme instantané compressé de son HTML, à titre de référence, et n’est pas affichée comme page.')) + '</p>',
           '<p><a href="data-coverage.html">' + e(T('Data coverage and limitations', 'Couverture des données et limites')) + '</a> · <a href="data/register-gaps-manifest.json" download>' + e(T('Download the full record (JSON)', 'Télécharger le registre complet (JSON)')) + '</a></p>']
    for fam in sorted(by_fam, key=lambda f: FAMILY.get(f, (f, f))[0 if l == 'en' else 1]):
        title = FAMILY.get(fam, (fam, fam))[0 if l == 'en' else 1]
        hid = f'{fam}-{l}'.lower()
        out.append(f'<h2 id="{e(hid)}">{e(title)}</h2><div class="cov-table" role="region" tabindex="0" aria-labelledby="{e(hid)}"><table><thead><tr><th scope="col">' + e(T('Register entry', 'Entrée du registre')) + '</th><th scope="col">' +
                   e(T('Stored copy', 'Copie conservée')) + '</th><th scope="col">' + e(T('Original', 'Original')) + '</th><th scope="col">' + e(T('Retrieved', 'Téléchargé le')) + '</th></tr></thead><tbody>')
        for item in sorted(by_fam[fam], key=lambda i: i['id']):
            r = reg[item['id']]
            files = [f for f in item['files'] if f.get('stored')]
            copies, originals, dates = [], [], []
            for f in files:
                name = f.get('path', '').split('/')[-1] or f.get('directory', '').split('/')[-1]
                if f.get('kind') == 'page-snapshot':
                    label = T('Page snapshot (HTML, gzip)', 'Instantané de page (HTML, gzip)')
                else:
                    label = name
                if f.get('path'):
                    copies.append(f'<a href="{e(f["path"])}" download>{e(label)}</a>')
                elif f.get('directory'):
                    copies.append(e(T(f'{len(f["parts"])} parts on the pses-data branch: {f["directory"]}', f'{len(f["parts"])} parties dans la branche pses-data : {f["directory"]}')))
                originals.append(f'<a href="{e(f["url"])}">{e(T("Publisher file", "Fichier de l’éditeur"))}</a> <span class="small">({e(size(f.get("bytes"), l))}; SHA-256 <code>{e(f.get("sha256", "")[:16])}…</code>)</span>')
                dates.append(f.get('retrieved', '')[:10])
            notes = [f for f in item['files'] if not f.get('stored')]
            if not files:
                why = T('No file stored: ', 'Aucun fichier conservé : ') + (T('the publisher offers this only as a web page or in a format not stored here.', 'l’éditeur l’offre seulement comme page Web ou dans un format non conservé ici.') if notes and not item['failures'] else T('the download failed.', 'le téléchargement a échoué.'))
                copies.append(e(why))
            if item['failures']:
                copies.append('<span class="small">' + e(T(f'{len(item["failures"])} file(s) not stored (too large for this batch or download failed).', f'{len(item["failures"])} fichier(s) non conservé(s) (trop volumineux pour ce lot ou téléchargement échoué).')) + '</span>')
            out.append(f'<tr><th scope="row">{e(item["id"])} · {e(r["name"])}<br><span class="small">{e(r.get("period") or "")} · <a href="{e(item["source"])}">{e(T("Publisher page", "Page de l’éditeur"))}</a></span></th><td>{"<br>".join(copies)}</td><td>{"<br>".join(originals)}</td><td>{e(" ".join(sorted(set(d for d in dates if d))))}</td></tr>')
        out.append('</tbody></table></div>')
    out.append('</div>')
    return '\n'.join(out)


page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Copies of public source register entries | GC Equity</title>
<meta name="description" content="Files downloaded from their publishers for public source register entries that had no copy on this site, with checksums and retrieval dates.">
<style>body{{margin:0;font:1rem/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#173848;background:#fff}}main{{max-width:76rem;margin:auto;padding:1rem}}.cov-table{{overflow:auto;max-width:100%;border:1px solid #c2d0d5;margin:.5rem 0 1.5rem}}table{{border-collapse:collapse;min-width:100%}}th,td{{padding:.45rem .6rem;border:1px solid #c2d0d5;text-align:start;vertical-align:top}}thead th{{background:#eef4f5}}tbody th{{font-weight:600;max-width:28rem}}.small{{font-size:.88rem;font-weight:400}}code{{font-size:.85em}}a{{color:#0b5c8c}}a:focus-visible,.cov-table:focus-visible{{outline:3px solid #ba7900;outline-offset:2px}}</style>
<link rel="stylesheet" href="./gc-shared-shell.css?v=20261127-2" data-gce-shared-shell="css"><script src="./gc-shared-shell.js?v=20261127-2" defer data-gce-shared-shell="js"></script></head>
<body><main id="main">
<p><a id="lang-switch" href="?lang=fr" hreflang="fr" lang="fr">Français</a></p>
{block("en")}
{block("fr")}
</main>
<script>
(function(){{var q=new URLSearchParams(location.search).get('lang'),fr=q==='fr'||(!q&&(function(){{try{{return localStorage.getItem('gcEquityLang')==='fr'}}catch(e){{return false}}}})());
document.documentElement.lang=fr?'fr':'en';document.title=fr?'Copies des entrées du registre public des sources | Équité-GC':'Copies of public source register entries | GC Equity';
document.querySelectorAll('[data-cov-lang]').forEach(function(b){{b.hidden=b.getAttribute('data-cov-lang')!==(fr?'fr':'en')}});
var s=document.getElementById('lang-switch');s.textContent=fr?'English':'Français';s.href=fr?'?lang=en':'?lang=fr';s.hreflang=fr?'en':'fr';s.lang=fr?'en':'fr';
s.addEventListener('click',function(){{try{{localStorage.setItem('gcEquityLang',fr?'en':'fr')}}catch(e){{}}}});}})();
</script></body></html>
'''

if '--check' in sys.argv:
    if not OUT.exists() or OUT.read_text(encoding='utf-8') != page:
        sys.exit('register-copies.html is out of date: run scripts/build-register-copies.py')
    print('REGISTER COPIES PAGE: current')
else:
    OUT.write_text(page, encoding='utf-8')
    print('REGISTER COPIES PAGE:', len(man['entries']), 'entries')
