#!/usr/bin/env python3
"""Retrieve the November 5, 2026 public PSC FSWEP source without using private Drive files.

This source covers departmental requests for student referrals, not students hired,
employee-equity representation, or job offers. Preserve all publisher columns and
rows; do not derive or publish equity-specific counts from request records.
"""
import csv
import gzip
import hashlib
import io
import json
import os
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "data/open-canada-2026-11/psc-fswep-referrals"
URL = (
    "https://open.canada.ca/data/dataset/"
    "3fe41e48-850e-4df2-81db-9df16d3c56a5/resource/"
    "51e8f1c1-7f2b-4245-900a-2304342410c0/download/"
    "fswep_depts_ads_referrals_opengov-as-of-november-5-2026-single-tab.csv"
)
FILENAME = "fswep_depts_ads_referrals_opengov-as-of-november-5-2026-single-tab.csv"
EXPECTED_BYTES = 30887309  # publisher snapshot independently located in Drive
MANIFEST = FOLDER / "large-files.json"
TARGET = FOLDER / (FILENAME + ".gz")


def main():
    FOLDER.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    count = 0
    fd, name = tempfile.mkstemp(prefix="fswep-2026-11-", suffix=".gz", dir=FOLDER)
    os.close(fd)
    try:
        request = urllib.request.Request(URL, headers={"User-Agent": "GC-Equity-Equite-GC/1.0 (source-archive)"})
        with urllib.request.urlopen(request, timeout=180) as response, open(name, "wb") as output:
            with gzip.GzipFile(filename="", fileobj=output, mode="wb", mtime=0, compresslevel=6) as gz:
                while True:
                    block = response.read(1024 * 1024)
                    if not block:
                        break
                    count += len(block)
                    if count > EXPECTED_BYTES:
                        raise ValueError("Downloaded file exceeds the pinned November 5, 2026 size")
                    digest.update(block)
                    gz.write(block)
        if count != EXPECTED_BYTES:
            raise ValueError(f"Source version mismatch: expected {EXPECTED_BYTES} bytes, got {count}")
        csv.field_size_limit(20_000_000)
        with gzip.open(name, "rb") as binary:
            with io.TextIOWrapper(binary, encoding="utf-8-sig", errors="replace", newline="") as text:
                reader = csv.reader(text)
                header = next(reader, [])
                if len(header) < 3:
                    raise ValueError("Expected a multicolumn public PSC CSV")
                rows = sum(1 for record in reader if record)
        if rows < 70000:
            raise ValueError(f"Unexpectedly incomplete FSWEP source: {rows} records")
        os.replace(name, TARGET)
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        entry = {
            "gz": TARGET.name, "name": FILENAME, "url": URL,
            "bytes": count, "rows": rows, "sha256": digest.hexdigest(),
            "title": {
                "en": "FSWEP Requests for Referrals as of 2026-11-05",
                "fr": "Demandes de présentation du PFETE au 5 novembre 2026"
            },
            "source_scope": "Departmental requests for student referrals, not hires or equity representation",
        }
        existing = [item for item in data.get("files", []) if item.get("gz") != TARGET.name]
        data["files"] = existing + [entry]
        MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Verified and archived FSWEP source: {count} original bytes, {rows} CSV records, SHA256 {digest.hexdigest()}")
    finally:
        if os.path.exists(name):
            os.unlink(name)


if __name__ == "__main__":
    main()
