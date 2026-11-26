#!/usr/bin/env python3
"""Recover only explicitly approved, public federal-service source files.

The publisher file and the earlier Drive copy are separate provenance claims.
Never substitute another release, accept an HTML error page, or infer counts.
"""
import csv
import gzip
import hashlib
import io
import json
import zipfile
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ARCH = ROOT / 'data/public-source-archive-2026-11-24'
REG = ROOT / 'data/public-source-register-2026-11-24.json'
ADDED = ROOT / 'assets/added-sources.json'
PSES = ROOT / 'data/open-canada-2026-11/pses-2024'
REPORT = ROOT / 'docs/publisher-recovery-2026-11-25.json'
register = json.loads(REG.read_text(encoding='utf-8'))
entries = {x['id']: x for x in register['entries']}
archive_path = ARCH / 'manifest.json'
archive = json.loads(archive_path.read_text(encoding='utf-8'))
added = json.loads(ADDED.read_text(encoding='utf-8'))
large_path = PSES / 'large-files.json'
large = json.loads(large_path.read_text(encoding='utf-8'))
results = []
def sha(raw): return hashlib.sha256(raw).hexdigest()
def blob(raw): return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def dump(path, data, pretty=False):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2 if pretty else None,
                               separators=None if pretty else (',', ':'))+'\n', encoding='utf-8')
def fetch(url, limit, expected=None):
    allowed = {'www.canada.ca','open.canada.ca','www.csps-efpc.gc.ca',
               'raw.githubusercontent.com','csps-efpc.gc.ca'}
    req = Request(url, headers={'User-Agent':'GC Equity public-source integrity review/1.0',
                                'Accept':'*/*'})
    with urlopen(req, timeout=90) as response:
        if urlsplit(response.geturl()).hostname not in allowed:
            raise ValueError('unexpected redirect host')
        raw = response.read(limit+1)
    if len(raw)>limit or not raw: raise ValueError('source exceeds bound or is empty')
    if expected is not None and len(raw)!=expected:
        raise ValueError(f'publisher bytes {len(raw)} differ from recorded {expected}')
    return raw
def validate_xlsx(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        if 'xl/workbook.xml' not in z.namelist() or '[Content_Types].xml' not in z.namelist():
            raise ValueError('not an XLSX workbook')
        if any(n.lower().endswith('vbaproject.bin') for n in z.namelist()):
            raise ValueError('macro-bearing file')
        if sum(x.file_size for x in z.infolist())>150_000_000:
            raise ValueError('workbook expansion exceeds safe bound')
def decode_csv(raw):
    for enc in ('utf-8-sig','cp1252'):
        try: text = raw.decode(enc); break
        except UnicodeDecodeError: pass
    else: raise ValueError('unknown CSV encoding')
    if text.lstrip().lower().startswith(('<html','<!doctype','<?xml')):
        raise ValueError('not a CSV source')
    rows = csv.reader(io.StringIO(text, newline=''))
    header = next(rows, [])
    if len(header)<2: raise ValueError('not a tabular CSV')
    count = sum(1 for _ in rows)
    if not count: raise ValueError('no data rows')
    return header,count,'windows-1252' if enc=='cp1252' else 'utf-8'
def approved(id):
    e=entries[id]
    if not e['approved'] or e['scope'] in ('benchmark','mixed','wider','consultation'):
        raise ValueError('not approved for this recovery')
    return e
def archive_source(id, filename, url, limit, expected=None, expected_blob=None):
    e=approved(id)
    raw=fetch(url,limit,expected)
    if expected_blob and blob(raw)!=expected_blob: raise ValueError('publisher Git blob mismatch')
    rec={'id':id,'path':(ARCH/filename).relative_to(ROOT).as_posix(),'bytes':len(raw),
         'sha256':sha(raw),'gitBlob':blob(raw),'publisherUrl':url,
         'verification':'Publisher response archived unchanged; source SHA-256 and Git blob recorded. Not a comparison with the Drive original.'}
    if expected_blob: rec['verification']='Publisher Git blob and byte count matched exactly; original publisher workbook preserved.'
    if filename.endswith('.xlsx'):
        validate_xlsx(raw)
        if e.get('rows') is not None: rec['reportedRows']=e['rows']
    else:
        h,n,enc=decode_csv(raw)
        if id.startswith('GC-040') and not any('equity' in c.lower() or 'women' in c.lower() or 'minority' in c.lower() or 'aboriginal' in c.lower() or 'fiscal' in c.lower() for c in h):
            raise ValueError('unexpected historical CSPS table header')
        rec.update(rows=n,encoding=enc,headerRows=1)
    path=ARCH/filename
    if path.exists() and path.read_bytes()!=raw: raise ValueError('existing source differs; do not overwrite')
    path.write_bytes(raw)
    archive['files']=[a for a in archive['files'] if a['id']!=id]+[rec]
    results.append({'id':id,'status':'archived-publisher-source','path':rec['path'],'bytes':len(raw),'sha256':sha(raw),'publisherUrl':url})
    return rec
def attempt(id,fn):
    try: fn()
    except Exception as err: results.append({'id':id,'status':'not-acquired','reason':str(err)[:500]})
def hrinfo():
    id='GC-0080'; e=approved(id); raw=fetch(e['source'],60_000_000,e['bytes'])
    heads,n,enc=decode_csv(raw)
    if not any('LEVEL1ID' in h.upper() or 'DEPT' in h.upper() or 'ORGANIZATION' in h.upper() for h in heads):
        raise ValueError('HRINFO organization field not established')
    target=PSES/'HRINFO.csv.gz'
    compressed=gzip.compress(raw,compresslevel=9,mtime=0)
    if len(compressed)>20_000_000 or gzip.decompress(compressed)!=raw: raise ValueError('compression bound or integrity')
    if target.exists() and gzip.decompress(target.read_bytes())!=raw: raise ValueError('existing source differs')
    target.write_bytes(compressed)
    title={'en':'2024 PSES HR Information Derived Variable Dataset','fr':'SAFF 2024 : ensemble de données sur les variables dérivées des ressources humaines'}
    meta={'gz':target.name,'name':'HRINFO.csv','url':e['source'],'bytes':len(raw),'sha256':sha(raw),'rows':n,'encoding':enc,'title':title}
    large['files']=[x for x in large['files'] if x['gz']!=target.name]+[meta]
    dump(large_path,large,True)
    pkg=next(x for x in added['packages'] if x['id']=='pses-2024')
    rel=target.relative_to(ROOT).as_posix()
    pkg['files']=[f for f in pkg['files'] if f['path']!=rel]+[{'path':rel,'bytes':len(compressed),'format':'GZ','name':target.name,'originalBytes':len(raw),'originalSha256':sha(raw),'sourceUrl':e['source'],'rows':n,'titleEn':title['en'],'titleFr':title['fr']}]
    pkg['files'].sort(key=lambda f:f['path'])
    for p in (target,large_path):
        rel=p.relative_to(ROOT).as_posix(); data=p.read_bytes()
        added['files']=[f for f in added['files'] if f['path']!=rel]+[{'path':rel,'bytes':len(data),'sha256':sha(data)}]
    added['files'].sort(key=lambda f:f['path'])
    dump(ADDED,added)
    results.append({'id':id,'status':'archived-publisher-source','path':target.relative_to(ROOT).as_posix(),'bytes':len(raw),'rows':n,'sha256':sha(raw),'publisherUrl':e['source'],'encoding':enc,'note':'Publisher response compressed losslessly. Earlier Drive original not independently compared.'})
attempt('GC-0080',hrinfo)
attempt('GC-0516',lambda:archive_source('GC-0516','fett-monthly-20260915.xlsx','https://raw.githubusercontent.com/pbo-dpb/FETT--OSEF/main/20260915.xlsx',5_000_000,4703868,'57a78934316a49573afa37f5680fe776c64f0ec2'))
attempt('GC-0435',lambda:archive_source('GC-0435','olrre-2021-phase-1.xlsx','https://open.canada.ca/data/dataset/9d3f2393-edce-4110-9624-df29a173df28/resource/f4426e17-8a27-43c1-9673-af173ff39dbc/download/open-gov-2021-olrre-results-phase-1.xlsx',10_000_000))
for id,filename in [('GC-0403','csps-ee-representation-2013-2017.csv'),('GC-0404','csps-ee-representation-2013-2017.xlsx'),('GC-0405','csps-ee-representation-2017-2018.csv')]:
    attempt(id,lambda id=id,filename=filename:archive_source(id,filename,entries[id]['source'],2_000_000))
for id,source in [('GC-0466','https://open.canada.ca/data/dataset/d7aae979-e1e3-4017-a77b-b83bf9ae5f34/resource/4a496dbb-d881-48a1-af19-2aca36ae36c3/download/cusersmlittledocumentsles-resultats-du-sondage-de-lamop-de-la-puadr.csv'),('GC-0467','https://open.canada.ca/data/dataset/d7aae979-e1e3-4017-a77b-b83bf9ae5f34/resource/de9b01c1-0d69-482b-980c-e1764d574080/download/pandu-status-for-open-portal.csv')]:
    e=entries[id]; e.setdefault('reportedSource',e['source']);e['source']=source;e['scope']='institutional';e['kind']='context'
    results.append({'id':id,'status':'publisher-link-resolved-context-only','publisherUrl':source,'note':'2018 implementation surveys on access to web services. No employee equity outcome is established; do not use as an equity outcome dataset.'})
if any(x['id']=='GC-0435' and x['status']=='archived-publisher-source' for x in results):
    entries['GC-0435']['format']='XLSX'
    entries['GC-0435']['resolvedSource']='https://open.canada.ca/data/dataset/9d3f2393-edce-4110-9624-df29a173df28/resource/f4426e17-8a27-43c1-9673-af173ff39dbc/download/open-gov-2021-olrre-results-phase-1.xlsx'
archive['files'].sort(key=lambda x:x['id'])
dump(archive_path,archive,True)
dump(REG,register)
dump(REPORT,{'asOf':'2026-11-25','basis':'Publisher responses, bounded downloads, exact PBO Git blob and reported HRINFO size checks; no original Drive equivalence inferred. Institutional context is separate from employee outcomes.','results':results},True)
print(json.dumps(results,ensure_ascii=False,indent=2))
