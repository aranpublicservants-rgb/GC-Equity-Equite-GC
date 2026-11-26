"""Copy public portal source files, preserving relative assets and old repos."""
from pathlib import Path
import shutil, subprocess, tempfile, re, xml.etree.ElementTree as ET
OWNER = 'aranpublicservants-rgb'
ROOT = 'https://aranpublicservants-rgb.github.io/'
GC = ROOT + 'GC-Equity-Equite-GC/'
MIGRATIONS = {
 'Accessibility-and-Inclusion-Accessibilit-et-inclusion': [('.', 'accessibility-inclusion')],
 'isc-sac-equity-equite': [('.', 'isc/equity-explorer')],
 'aran-raar': [('isc-racialized', 'isc/racialized-employees'), ('recourse', 'recourse'), ('racialized-executives', 'racialized-executives')],
}
mapping = {
 'Accessibility-and-Inclusion-Accessibilit-et-inclusion/':'accessibility-inclusion/',
 'isc-sac-equity-equite/':'isc/equity-explorer/',
 'aran-raar/isc-racialized/':'isc/racialized-employees/',
 'aran-raar/recourse/':'recourse/',
 'aran-raar/racialized-executives/':'racialized-executives/',
 'aran-raar/#resources':'resource-library/',
 'Indigenous-GC---GC-Autochtone/':'communities/indigenous/',
 'Black-Public-Servants---Fonctionnaires-noirs/':'communities/black/',
 'Filipino-Public-Servants-Fonctionnaires-Philippins/':'communities/filipino/',
 'GC-Equity-History-Histoire-de-l-equite-au-GC/':'equity-history/',
}
def rewrite(path):
    txt=path.read_text(encoding='utf-8')
    for old,new in mapping.items():
        txt=txt.replace(ROOT+old,GC+new)
    path.write_text(txt,encoding='utf-8')
with tempfile.TemporaryDirectory() as tmp:
    for repo, pairs in MIGRATIONS.items():
        clone=Path(tmp)/repo
        subprocess.run(['git','clone','--depth','1','--branch','main','https://github.com/'+OWNER+'/'+repo+'.git',str(clone)],check=True)
        for src,dst in pairs:
            source=clone/src
            dest=Path(dst)
            dest.mkdir(parents=True,exist_ok=True)
            shutil.copytree(source,dest,dirs_exist_ok=True,ignore=shutil.ignore_patterns('.git','.github'))
            assert (dest/'index.html').stat().st_size>1000, dst
            for p in dest.rglob('*'):
                if p.is_file() and p.suffix in {'.html','.js','.css'}: rewrite(p)
for name in ['index.html','companion-sites/index.html','website-directory/index.html','resource-library/index.html','isc/index.html']:
    rewrite(Path(name))
# Add new portal routes to the existing sitemap without dropping existing URLs.
p=Path('sitemap.xml')
ns='http://www.sitemaps.org/schemas/sitemap/0.9'
ET.register_namespace('',ns)
tree=ET.parse(p)
urlset=tree.getroot()
known={x.text for x in urlset.findall('.//{'+ns+'}loc')}
for directory in ['accessibility-inclusion','isc/equity-explorer','isc/racialized-employees','recourse','racialized-executives','communities','equity-history','resource-library','website-directory']:
    for html in sorted(Path(directory).rglob('*.html')):
        route=str(html)
        if route.endswith('/index.html'): route=route[:-len('index.html')]
        url=GC+route
        if url not in known:
            item=ET.SubElement(urlset,'{'+ns+'}url')
            ET.SubElement(item,'{'+ns+'}loc').text=url
            known.add(url)
tree.write(p,encoding='utf-8',xml_declaration=True)
print('All portal roots and copied assets are present.')
