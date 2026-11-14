#!/usr/bin/env python3
"""Restore only complete original GC Equity source files, split large files by employer.

The 69 source names, official download URLs, byte counts and SHA-256 values
are from the archived GC Equity source package. Missing or mismatched files
are NEVER silently replaced. Every row is retained exactly once.
"""
import csv
import hashlib
import io
import gzip
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import time
import unicodedata
from urllib.request import Request,urlopen

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"scripts/archived-source-registry.json"
DEST=ROOT/"data/restored"
INDEX=ROOT/"assets/restored-datasets.json"
ORG_KEYS=("Department or agency","Department or Agency","Ministère ou organisme",
          "Ministère ou agence","department_e","dept_e","DEPT_E",
          "organization_e","orgnization_e","Deparment_e","Organization",
          "Organisation","Department/Agency","final_dept_e","final_dept_f")
csv.field_size_limit(100000000)

def verified_source(item):
    url=item["source"]
    if not (url.startswith("https://open.canada.ca/") or url.startswith("https://www.canada.ca/")):
        raise ValueError("Not the archived original publisher URL")
    req=Request(url,headers={"User-Agent":"GCEqDataIntegrity/1.0","Accept":"text/csv,*/*"})
    for attempt in range(3):
        try:
            tmp=tempfile.TemporaryFile(mode="w+b")
            sha=hashlib.sha256()
            count=0
            with urlopen(req,timeout=150) as response:
                while True:
                    b=response.read(2*1024*1024)
                    if not b:break
                    count+=len(b)
                    if count>int(item["bytes"]):raise ValueError("Downloaded source exceeds archived length")
                    sha.update(b)
                    tmp.write(b)
            if count!=item["bytes"] or sha.hexdigest()!=item["sha256"]:
                raise ValueError("Checksum or size differs from archived dataset")
            tmp.seek(0)
            return tmp
        except Exception:
            tmp.close()
            if attempt==2:raise
            time.sleep(3*(attempt+1))

def text_source(binary):
    raw=binary.read()
    for codec in ("utf-8-sig","cp1252","latin-1"):
        try:return io.StringIO(raw.decode(codec)),codec
        except UnicodeDecodeError:continue
    raise ValueError("Unable to decode complete source")

def slug(key):
    base=unicodedata.normalize("NFKD",key).encode("ascii","ignore").decode().lower()
    base=re.sub(r"[^a-z0-9]+","-",base).strip("-")[:56]
    return (base or "unlabelled")+"-"+hashlib.sha256(key.encode()).hexdigest()[:8]

def import_file(item):
    sourceid=hashlib.sha256(item["name"].encode()).hexdigest()[:18]
    with verified_source(item) as binary:
        readertext,codec=text_source(binary)
    reader=csv.reader(readertext)
    head=[c.strip() for c in next(reader,[])]
    if len(head)<2:raise ValueError("Missing CSV source headers")
    orgkey=next((x for x in ORG_KEYS if x in head),None)
    total=0
    if not orgkey:
        dest=DEST/(sourceid+".csv.gz")
        with gzip.open(dest,"wt",encoding="utf-8",newline="",compresslevel=6) as output:
            writer=csv.writer(output);writer.writerow(head)
            for row in reader:
                if not row or not any(x.strip() for x in row):continue
                writer.writerow(row);total+=1
        if not total:raise ValueError("Source has no records")
        if dest.stat().st_size>95_000_000:raise ValueError("Compressed source too large for GitHub")
        return {**base_meta(item,sourceid,codec,head,orgkey,total),"path":dest.relative_to(ROOT).as_posix()}
    ix=head.index(orgkey)
    scratch=Path(tempfile.mkdtemp(prefix="gce-partitions-"))
    counts={}
    names={}
    seen=set()
    try:
        for row in reader:
            if not row or not any(x.strip() for x in row):continue
            group=(row[ix] if ix<len(row) else "").strip() or "(Not specified in source)"
            key=slug(group)
            names[key]=group
            # Open for append each time: avoids hundreds of open file descriptors.
            # Only one header per group, preserving all source column values.
            t=scratch/(key+".csv")
            first=key not in seen
            with t.open("a",encoding="utf-8",newline="") as f:
                wr=csv.writer(f)
                if first:wr.writerow(head);seen.add(key)
                wr.writerow(row)
            counts[key]=counts.get(key,0)+1
            total+=1
        if not total:raise ValueError("Source contains zero data rows")
        destroot=DEST/"org"/sourceid
        destroot.mkdir(parents=True,exist_ok=True)
        partitions={}
        for key,count in sorted(counts.items()):
            src=scratch/(key+".csv")
            output=destroot/(key+".csv.gz")
            with src.open("rb") as inp,gzip.open(output,"wb",compresslevel=6) as out:
                shutil.copyfileobj(inp,out,1024*1024)
            src.unlink()
            if output.stat().st_size>95_000_000:raise ValueError("An organization file exceeds GitHub object size")
            partitions[names[key]]={"path":output.relative_to(ROOT).as_posix(),"rows":count}
        if sum(x["rows"] for x in partitions.values())!=total:
            raise ValueError("Department partition accounting mismatch")
        return {**base_meta(item,sourceid,codec,head,orgkey,total),"partitions":partitions}
    finally:shutil.rmtree(scratch,ignore_errors=True)

def base_meta(item,key,codec,head,orgfield,rows):
    return {
        "originalName":item["name"],
        "dataset":item["dataset"],"title":item["resource"].strip() or item["dataset"],
        "publisherUrl":item["source"],"archivedSha256":item["sha256"],
        "sourceBytes":item["bytes"],"encodingConvertedFrom":codec,
        "headers":head,"organizationField":orgfield,"rows":rows
    }

def main():
    DEST.mkdir(parents=True,exist_ok=True)
    source=json.loads(MANIFEST.read_text())["files"]
    old=json.loads(INDEX.read_text()) if INDEX.exists() else {"files":[]}
    entries={r["originalName"]:r for r in old.get("files",[])}
    failures=[]
    for i,item in enumerate(source,1):
        if item["name"] in entries:
            e=entries[item["name"]]
            local=bool(e.get("path") and (ROOT/e["path"]).exists())
            parts=bool(e.get("partitions") and all((ROOT/v["path"]).exists() for v in e["partitions"].values()))
            if local or parts:continue
        print(f"RESTORE {i}/{len(source)} {item['name']} ({item['bytes']} bytes)",flush=True)
        try:
            entry=import_file(item)
            entries[item["name"]]=entry
            INDEX.write_text(json.dumps({"version":"2026-11-14","files":sorted(entries.values(),key=lambda x:x["originalName"])},ensure_ascii=False,indent=2)+"\n")
            print("VERIFIED",entry["rows"],"rows",entry.get("organizationField"),flush=True)
        except Exception as exc:
            failures.append({"file":item["name"],"message":str(exc)})
            print("NOT-VERIFIED",item["name"],str(exc),file=sys.stderr,flush=True)
    print(json.dumps({"verified_complete_sources":len(entries),"original_sources":len(source),"unavailable":failures},ensure_ascii=False))
    if not entries:raise SystemExit("No complete source file restored")

if __name__=="__main__":main()
