"""Audit which locally stored CSV sources actually have department-level records.
Never infer a department from a regional or public-service-wide source.
Usage: python scripts/audit-organization-datasets.py
"""
import csv
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parent.parent
ORG_FIELDS=("department_e","organization_e","department_or_agency","Department","Organization","DEPARTMENT","ORGANIZATION")
items=[]
for path in sorted((ROOT/"data"/"psc").glob("*.csv")):
    with path.open("r",encoding="utf-8-sig",newline="") as f:
        reader=csv.DictReader(f)
        fields=list(reader.fieldnames or [])
        col=next((k for k in ORG_FIELDS if k in fields),None)
        if not col:
            print("PSC-NATIONAL-ONLY:",path.name,",".join(fields[:10]))
            continue
        count=Counter()
        for row in reader:
            value=(row.get(col) or "").strip()
            if value:count[value]+=1
        items.append((path.name,col,len(count),sum(count.values()),count.get("Canada Revenue Agency",0),count.get("Administrative Tribunals Support Service of Canada",0)))
        print("PSC-DEPARTMENT:",path.name,"field="+col,"orgs="+str(len(count)),"rows="+str(sum(count.values())),"CRA="+str(count.get("Canada Revenue Agency",0)),"ATSSC="+str(count.get("Administrative Tribunals Support Service of Canada",0)))
print("PSC-ORG-AUDIT-SUMMARY:",len(items),"of",len(list((ROOT/"data"/"psc").glob("*.csv"))),"PSC CSVs have explicit organization fields")
assert len(items)>=12, "The organization dataset inventory is unexpectedly small"
