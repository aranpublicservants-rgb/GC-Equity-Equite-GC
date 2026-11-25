"""Enrich generated profiles with scoped publication routes and compact repeated gaps."""
import argparse
import html
import json
import re
from collections import OrderedDict
from pathlib import Path

R=Path(__file__).resolve().parents[1]
E=lambda x:html.escape(str(x),quote=True)
REG=json.loads((R/'assets/department-pages.json').read_text())
INDEX=(R/'official-employer-publications/index.html').read_text()
ENTRIES=dict(re.findall(r'<details id="([^"]+)"[^>]*>([\s\S]*?)</details>',INDEX))
assert len(ENTRIES)==len(REG['organizations']), (len(ENTRIES),len(REG['organizations']))
args=argparse.ArgumentParser()
args.add_argument('--check',action='store_true')
check=args.parse_args().check
changed=[]; compacted=0; direct=0; scope=0
for rec in REG['organizations']:
    slug=rec['id']
    if rec.get('specialized') or slug in REG.get('redirects',{}):
        continue
    path=R/rec['path']/'index.html'
    original=path.read_text()
    if 'id="dp-data"' not in original:
        continue
    entry=ENTRIES[slug]
    sources=[]
    for group in re.findall(r'<ul>([\s\S]*?)</ul>',entry):
        sources+=re.findall(r'<a href="([^"]+)">([\s\S]*?)</a>',group)
    parent=re.search(r'<p class="scope-note">([\s\S]*?)</p>',entry)
    if sources:direct+=1
    if parent:scope+=1
    text=original
    for lang in ['en','fr']:
        fr=lang=='fr'
        pub='publications-fr' if fr else 'publications'
        gap='lacunes' if fr else 'missing'
        guide='guide-donnees' if fr else 'data-guide'
        # Existing French IDs are read from the actual page when different.
        def enrich(match):
            section=match.group(0)
            section=re.sub(r'<!-- profile-publications:start -->[\s\S]*?<!-- profile-publications:end -->','',section)
            href='../official-employer-publications/?lang='+lang+'#'+slug
            label='Consulter les publications officielles de cet organisme' if fr else 'Find official publications for this organization'
            block='<div class="profile-publications"><p><strong><a href="'+E(href)+'">'+label+'</a></strong></p>'
            new=[(u,t) for u,t in sources if ('href="'+u+'"') not in section]
            if new:
                block+='<ul>'+''.join('<li><a href="'+u+'">'+t.replace('\u2014','–')+'</a></li>' for u,t in new)+'</ul>'
            if parent:
                block+='<p>'+parent.group(1).replace('\u2014','–')+'</p>'
            if not sources and not parent:
                block+='<p>'+('Aucun rapport propre à cet organisme n’a été vérifié dans le répertoire. Consulter les sources originales ou demander les données; les chiffres nationaux ne remplacent pas les données manquantes.' if fr else 'No employer-specific report has been verified in the index. Consult original sources or request the evidence; national figures do not replace missing organization data.')+'</p>'
            block+='</div>'
            return section.replace('<div class="section-tools">','<!-- profile-publications:start -->'+block+'<!-- profile-publications:end --><div class="section-tools">',1)
        pat=r'<section aria-labelledby="'+pub+r'">[\s\S]*?</section>'
        text,n=re.subn(pat,enrich,text,count=1)
        assert n==1,(slug,pub)
        def compact(match):
            section=match.group(0)
            def tbody(m):
                nonlocal_dummy=None
                inner=m.group(1)
                rows=re.findall(r'<tr><th scope="row">([\s\S]*?)</th><td>([\s\S]*?)</td></tr>',inner)
                if not rows or ''.join('<tr><th scope="row">'+a+'</th><td>'+b+'</td></tr>' for a,b in rows)!=inner:
                    return m.group(0)
                grouped=OrderedDict()
                for label,note in rows:grouped.setdefault(note,[]).append(label)
                return '<tbody>'+''.join('<tr><th scope="row">'+'; '.join(labels)+'</th><td>'+note+'</td></tr>' for note,labels in grouped.items())+'</tbody>'
            return re.sub(r'<tbody>([\s\S]*?)</tbody>',tbody,section,count=1)
        prev=text
        text=re.sub(r'<section aria-labelledby="'+gap+r'">[\s\S]*?</section>',compact,text,count=1)
        if prev!=text:compacted+=1
    if text!=original:
        changed.append(str(path.relative_to(R)))
        if not check:path.write_text(text)
print(json.dumps({'profiles':len(REG['organizations']),'updated':len(changed),'compacted_language_sections':compacted,'direct_report_profiles':direct,'parent_scope_profiles':scope}))
if check and changed:raise SystemExit('Profile publications need regeneration: '+', '.join(changed[:5]))
