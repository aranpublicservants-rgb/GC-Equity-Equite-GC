#!/usr/bin/env python3
"""Build data/pses-level1-map.json: published LEVEL1ID code for each organization name.

Read from the published 2024 PSES open dataset (subset 1), where each department row carries LEVEL1ID and DEPT_E.
Used to find the split survey parts for an organization. Codes are copied as published.
"""
import csv, gzip, json
from pathlib import Path
root = Path(__file__).resolve().parent.parent
src = root / "data/open-canada-2026-11/pses-2024/subset-1-sous-ensemble-1.csv.gz"
orgs = set(json.loads((root / "assets/department-profile-index.json").read_text(encoding="utf-8"))["organizations"])
out = {}
with gzip.open(src, "rt", encoding="latin-1", newline="") as fh:
    for r in csv.DictReader(fh):
        n = r["DEPT_E"].strip()
        if n in orgs and n not in out and not any(r[k].strip("0") for k in ("LEVEL2ID", "LEVEL3ID", "LEVEL4ID", "LEVEL5ID")):
            out[n] = r["LEVEL1ID"].strip()
(root / "data/pses-level1-map.json").write_text(json.dumps(out, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
print(len(out), "of", len(orgs), "organizations; without a code:", sorted(orgs - set(out))[:10])
