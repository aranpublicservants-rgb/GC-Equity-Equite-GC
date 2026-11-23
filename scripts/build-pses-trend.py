#!/usr/bin/env python3
"""Build data/pses-trend-2019-2024.json from the published 2024 PSES open dataset.

The 2024 file carries the department-level results for 2019, 2020, 2022 and 2024 under one set of
question numbers. For the 27 reading questions already used on the site, this keeps the same published
field (POSITIVE, NEGATIVE or ANSWER1) and the response count for each year. Values are copied as published.
Suppressed or missing values (9999 or blank) stay null. Nothing is calculated here.
"""
import csv, gzip, hashlib, json, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "data/open-canada-2026-11/pses-2024/subset-1-sous-ensemble-1.csv.gz"
idx = json.loads((root / "assets/department-profile-index.json").read_text(encoding="utf-8"))
defs = idx["definitions"]
orgs = set(idx["organizations"])
# Reading direction used for the plain-language summary. 1: a higher share is more favourable.
# -1: a higher share is less favourable. 0: describes who used a process, so no better or worse reading.
DIRECTION = {q: 1 for q in defs}
for q in ("Q44e", "Q51", "Q73p", "Q73q", "Q58", "Q65"):
    DIRECTION[q] = -1
for q in ("Q84", "Q85"):
    DIRECTION[q] = 0

def cell(v):
    v = (v or "").strip()
    if v in ("", "9999"):
        return None
    try:
        return int(v)
    except ValueError:
        return None

out, seen_years = {}, set()
with gzip.open(src, "rt", encoding="latin-1", newline="") as fh:
    for r in csv.DictReader(fh):
        q = r["QUESTION"]
        if q not in defs or r["DEMCODE"] != "":
            continue
        if any(r[k].strip("0") for k in ("LEVEL2ID", "LEVEL3ID", "LEVEL4ID", "LEVEL5ID")):
            continue  # keep department-level rows only
        y = r["SURVEYR"]
        seen_years.add(y)
        name = r["DEPT_E"].strip()
        field = defs[q]["field"]
        out.setdefault(name, {}).setdefault(q, {})[y] = [cell(r[field]), cell(r["ANSCOUNT"])]

years = sorted(seen_years)
missing = sorted(orgs - set(out))
extra = sorted(set(out) - orgs - {"Public Service"})
doc = {
    "schema": 1,
    "years": years,
    "source": "https://www.canada.ca/content/dam/tbs-sct/documents/datasets/ses-2025/subset-1-sous-ensemble-1.csv",
    "sourceSha256": hashlib.sha256(src.read_bytes()).hexdigest(),
    "method": "Department-level results for all respondents, copied from the 2024 Public Service Employee Survey open dataset, which includes 2019, 2020, 2022 and 2024. Each value is the published field named for the question, with the response count. Suppressed or missing values are null and are never estimated.",
    "direction": DIRECTION,
    "questions": {q: {"en": defs[q]["en"], "fr": defs[q]["fr"], "field": defs[q]["field"]} for q in defs},
    "organizations": {k: out[k] for k in sorted(out) if k in orgs or k == "Public Service"},
}
(root / "data/pses-trend-2019-2024.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("years", years, "orgs", len(doc["organizations"]), "no trend rows for", len(missing), "unmatched names", len(extra))
print("without data:", missing[:12]); print("unmatched:", extra[:12])
