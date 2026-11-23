#!/usr/bin/env python3
"""Archive public PSES supporting workbooks and preserve source provenance.

Use publisher resource IDs, not the user's private Drive links. Fail rather
than label changed source bytes as matching an independently inventoried copy.
"""
import hashlib
import json
import os
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data/open-canada-2026-11/pses-supporting-documentation"
API = "https://open.canada.ca/data/api/action/resource_show?id="
RESOURCES = [
    ("2018", "f93d3fc3-94b7-4902-bbc1-21ebed7f0744", 6354406),
    ("2019", "cd371005-0746-459c-8a8a-cec36b006343", 6400633),
    ("2020", "25076d6a-84c0-48d0-97a9-f9d20ec2a10d", 6204842),
]
HEADERS = {"User-Agent": "GC-Equity-Equite-GC/1.0 (public-source-archive)"}


def open_url(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=180)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    items = []
    for year, resource_id, expected_bytes in RESOURCES:
        with open_url(API + resource_id) as response:
            raw = json.load(response)
        if not raw.get("success") or not raw.get("result", {}).get("url"):
            raise ValueError(f"Publisher resource not available: {resource_id}")
        url = raw["result"]["url"]
        if urlparse(url).scheme != "https" or urlparse(url).hostname not in ("www.canada.ca", "open.canada.ca"):
            raise ValueError(f"Unexpected publisher domain for {year}")
        fd, tmp = tempfile.mkstemp(prefix=f"pses-{year}-", suffix=".xlsx", dir=DEST)
        os.close(fd)
        h = hashlib.sha256()
        size = 0
        try:
            with open_url(url) as response, open(tmp, "wb") as output:
                while True:
                    block = response.read(1 << 20)
                    if not block:
                        break
                    size += len(block)
                    if size > expected_bytes:
                        raise ValueError(f"Unexpected {year} source version: file too large")
                    h.update(block)
                    output.write(block)
            if size != expected_bytes:
                raise ValueError(f"Unexpected {year} source version: {size} bytes rather than {expected_bytes}")
            if not zipfile.is_zipfile(tmp):
                raise ValueError(f"Downloaded {year} source is not an Office Open XML archive")
            with zipfile.ZipFile(tmp) as z:
                if "xl/workbook.xml" not in z.namelist():
                    raise ValueError(f"Downloaded {year} source is not an XLSX workbook")
            filename = f"pses{year}-supporting-documentation.xlsx"
            os.replace(tmp, DEST / filename)
            items.append({"year": int(year), "resource_id": resource_id, "path": str((DEST / filename).relative_to(ROOT)),
                          "publisher_url": url, "bytes": size, "sha256": h.hexdigest(),
                          "note": "Original public supporting documentation; not raw respondent records"})
            print(f"ARCHIVED {year} PSES supporting workbook: {size} bytes")
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)
    (DEST / "manifest.json").write_text(
        json.dumps({"source": "Treasury Board of Canada Secretariat, Open Government Portal", "files": items},
                   indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
