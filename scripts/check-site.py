"""Validate shipped assets, published data integrity and the research tools."""
import csv
import gzip
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

ROOT=pathlib.Path(__file__).resolve().parent.parent
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.assets=[]; self.scripts=[]; self.in_script=False; self.script=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if attrs.get('id'): self.ids.append(attrs['id'])
        if tag=='script':
            self.in_script=not attrs.get('src') and attrs.get('type','')!='application/json';self.script=[]
            if attrs.get('src'):self.assets.append(attrs['src'])
        if tag=='link' and attrs.get('rel')=='stylesheet':self.assets.append(attrs['href'])
    def handle_data(self,data):
        if self.in_script:self.script.append(data)
    def handle_endtag(self,tag):
        if tag=='script' and self.in_script:
            self.scripts.append(''.join(self.script));self.in_script=False

for name in ['index.html','explorer.html','sources.html','departmental-plans-2026-27/index.html','women-femmes/index.html']:
    p=ROOT/name;html=p.read_text();page=Page();page.feed(html)
    assert len(page.ids)==len(set(page.ids)),f'duplicate static IDs: {name}'
    assert 'gc-workspace.js' in html and 'gc-workspace.css' in html,f'shared tools missing: {name}'
    for asset in page.assets:
        if not urlsplit(asset).scheme:assert (p.parent/unquote(urlsplit(asset).path)).is_file(),f'missing asset {name}: {asset}'
    for script in page.scripts:
        with tempfile.NamedTemporaryFile(suffix='.js',mode='w') as f:
            f.write(script);f.flush();subprocess.run(['node','--check',f.name],check=True,capture_output=True)
    assert p.stat().st_size<2_500_000,f'page too large: {name}'
for name in ['gc-workspace.js','gc-ai.js','gc-equity-additions.js','gc-tools.js','women-femmes/assets/site.js','lib/pptxgen.bundle.js']:
    subprocess.run(['node','--check',str(ROOT/name)],check=True,capture_output=True)
for line in (ROOT/'data/checksums.sha256').read_text().splitlines():
    if line.strip():
        digest,name=line.split(None,1)
        assert hashlib.sha256((ROOT/name.strip()).read_bytes()).hexdigest()==digest,f'published data changed: {name}'
explorer=(ROOT/'explorer.html').read_text()
meta=json.loads(re.search(r'<script type="application/json" id="eq-branch-meta">(.*?)</script>',explorer,re.S)[1])
assert sum(len(json.loads(gzip.decompress((ROOT/f'data/pses-2024-branches/{d["id"]}.json.gz').read_bytes()))) for d in meta['departments'])==meta['totalRows']
model=json.loads((ROOT/'assets/workspace-data.json').read_text())
with (ROOT/'data/october-2026/TBS_EE_representation_with_WFA_2017-2025.csv').open(newline='') as f:assert list(csv.DictReader(f))==model['rep']
with (ROOT/'data/october-2026/TBS_EE_executives_by_EX_level_with_WFA_2017-2025.csv').open(newline='') as f:assert list(csv.DictReader(f))==model['executives']
manifest=json.loads((ROOT/'assets/workspace-manifest.json').read_text())
for entry in manifest['files']:
    contents=(ROOT/entry['file']).read_bytes()
    assert len(contents)==entry['bytes'] and hashlib.sha256(contents).hexdigest()==entry['sha256'],f'snapshot checksum mismatch: {entry["file"]}'
index=json.loads((ROOT/'assets/search-index.json').read_text())
assert len(model['related'])==8 and len(index['docs'])>700
assert len({d['id'] for d in index['docs']})==len(index['docs'])
assert all(d.get('en') and d.get('url') and 'undefined' not in d['en'] for d in index['docs'])
for name in ['gc-workspace.js','gc-workspace.css','index.html']:
    text=(ROOT/name).read_text()
    assert '—' not in text, f'em dash: {name}'
    assert not re.search(r'sk-[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9]',text),f'possible credential: {name}'
    for phrase in ['million-dollar','as requested','your instructions','make it perfect']:
        assert phrase not in text.lower(),f'internal wording: {name}'
subprocess.run(['node','scripts/check-workspace.mjs'],cwd=ROOT,check=True)
print(f'PASS: five pages, local assets, JavaScript, published-data checksums, {meta["totalRows"]:,} branch rows, {len(index["docs"])} search entries, and snapshot provenance')
