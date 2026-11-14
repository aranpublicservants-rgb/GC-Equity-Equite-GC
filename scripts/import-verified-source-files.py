#!/usr/bin/env python3
"""Restore source files that already appear in the GC Equity data collection.

Each original CSV has an exact archived SHA-256, byte count, publisher URL
and resource title. Do not substitute another release or synthesize results.
The public site reads only complete, verified, successfully imported files.
"""
import argparse
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import time
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"scripts/archived-source-registry.json"
DEST=ROOT/"data/restored"
INDEX=ROOT/"assets/restored-datasets.json"
ORG_KEYS=("Department or agency","Department or Agency","department_e","dept_e","DEPT_E","organization_e","orgnization_e","Deparment_e","Organization","Organisation","Department/Agency")

def fetch_verified(e):
    url=e["source"]
    if not url.startswith(("https://open.canada.ca/","https://www.canada.ca/")):
        raise ValueError("Not an archived Government of Canada source URL")
    req=Request(url,headers={"User-Agent":"GC-Equity-archival-integrity-check/1.0","Accept":"text/csv,*/*"})
    h=hashlib.sha256()
    out=io.BytesIO()
    for attempt in range(3):
        try:
            with urlopen(req,timeout=120) as resp:
                while True:
                    b=resp.read(1024*1024)
                    if not b:break
                    h.update(b);out.write(b)
                    if out.tell()>e["bytes"]+1:raise ValueError("Response larger than original source")
            break
        except Exception:
            if attempt==2:raise
            h=hashlib.sha256();out=io.BytesIO();time.sleep(3*(attempt+1))
    raw=out.getvalue()
    if len(raw)!=e["bytes"] or h.hexdigest().lower()!=e["sha256"].lower():
        raise ValueError("Source byte count or checksum no longer matches the archived original")
    return raw

def decode(raw):
    try:return raw.decode("utf-8-sig"),"utf-8"
    except UnicodeDecodeError:
        try:return raw.decode("cp1252"),"windows-1252"
        except UnicodeDecodeError:return raw.decode("latin-1"),"iso-8859-1"

def row_info(text):
    reader=csv.reader(io.StringIO(text))
    head=next(reader,[])
    if len(head)<2:raise ValueError("Not a source table with at least two columns")
    field=next((key for key in ORG_KEYS if key in head),None)
    count=sum(1 for _ in reader)
    return head,field,count

def run():
    p=argparse.ArgumentParser()
    p.add_argument("--set",choices=["small","all"],default="small")
    p.add_argument("--max-files",type=int,default=0)
    opts=p.parse_args()
    manifest=json.loads(SOURCE.read_text())
    records=manifest["files"]
    if opts.set=="small":records=[e for e in records if e["bytes"]<=250_000]
    if opts.max_files:records=records[:opts.max_files]
    DEST.mkdir(parents=True,exist_ok=True)
    old=json.loads(INDEX.read_text()) if INDEX.exists() else {"version":"2026-11-14","files":[]}
    indexed={x["originalName"]:x for x in old["files"]}
    failures=[]
    for idx,e in enumerate(records,1):
        slug=e["name"].split("_",1)[0]
        if len(slug)>40:slug=hashlib.sha256(e["name"].encode()).hexdigest()[:16]
        path=DEST/(slug+".csv")
        if e["name"] in indexed and (ROOT/indexed[e["name"]]["path"]).exists():
            print("EXISTS",e["name"]);continue
        print("IMPORT",idx,len(records),e["name"],flush=True)
        try:
            raw=fetch_verified(e)
            text,codec=decode(raw)
            heads,org_field,count=row_info(text)
            if not count:raise ValueError("Source table has no rows")
            path.write_text(text,encoding="utf-8",newline="")
            indexed[e["name"]]={
                "originalName":e["name"],
                "path":path.relative_to(ROOT).as_posix(),
                "title":e["resource"].strip() or e["dataset"],
                "dataset":e["dataset"],
                "publisherUrl":e["source"],
                "archivedSha256":e["sha256"],
                "sourceBytes":e["bytes"],
                "encodingConvertedFrom":codec,
                "rows":count,
                "headers":heads,
                "organizationField":org_field,
                "reportingPeriod":"As published in original source"
            }
            print("VERIFIED",path.relative_to(ROOT),count,"records",flush=True)
        except Exception as err:
            failures.append({"name":e["name"],"reason":str(err)})
            print("UNAVAILABLE",e["name"],str(err),file=sys.stderr,flush=True)
    result={"version":"2026-11-14","files":sorted(indexed.values(),key=lambda x:x["originalName"])}
    INDEX.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"validated":len(result["files"]),"attempted":len(records),"unavailable":failures},ensure_ascii=False))
    if not result["files"]:raise SystemExit("No verified data files to publish")

if __name__=="__main__":run()
