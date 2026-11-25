#!/usr/bin/env python3
"""Archive only confirmed public publisher PSES supporting-workbook bytes.

Uses official Government of Canada download URLs, not private Drive links.
Each workbook is independently verified as XLSX. Missing/changed sources stay
unclaimed in the emitted manifest for auditability.
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
AGENT = {"User-Agent": "GC-Equity-Equite-GC/1.0 (public-source-archive)"}
RESOURCE_API = "https://open.canada.ca/data/api/action/resource_show?id="
RESOURCES = [
    {"year": 2014, "id": "GC-0014", "drive_size": 6316838,
     "url": "https://www.canada.ca/content/dam/canada/tbs-sct/migration/psm-fpfm/modernizing-modernisation/pses-saff/data/2014-documentation.xlsx"},
    {"year": 2017, "id": "GC-0023", "drive_size": 6351299,
     "url": "https://www.canada.ca/content/dam/tbs-sct/documents/datasets/pses-saff/2017/2017_PSES_Supporting_Documentation_Document_reference_SAFF_2017.xlsx"},
    {"year": 2018, "id": "f93d3fc3-94b7-4902-bbc1-21ebed7f0744", "drive_size": 6354406,
     "url": "https://www.canada.ca/content/dam/tbs-sct/documents/datasets/pses-saff/2018/2018_PSES_Supporting_Documentation_Document_de_r%C3%A9f%C3%A9rence_du_SAFF_2018.xlsx"},
    {"year": 2019, "id": "cd371005-0746-459c-8a8a-cec36b006343", "drive_size": 6400633,
     "url": None},
    {"year": 2020, "id": "25076d6a-84c0-48d0-97a9-f9d20ec2a10d", "drive_size": 6204842,
     "url": "https://open.canada.ca/data/dataset/4301f4bb-1daa-4b50-afab-d1193b5d2284/resource/25076d6a-84c0-48d0-97a9-f9d20ec2a10d/download/2020-pses-supporting-documentation_document-de-reference-du-saff-2020.xlsx"},
]


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=210)


def lookup(resource):
    if resource["url"]:
        return resource["url"]
    with get(RESOURCE_API + resource["id"]) as response:
        metadata = json.load(response)
    url = metadata.get("result", {}).get("url")
    if not metadata.get("success") or not url:
        raise ValueError("Publisher resource not returned by Open Government API")
    return url


def archive(resource):
    year = resource["year"]
    url = lookup(resource)
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ("open.canada.ca", "www.canada.ca"):
        raise ValueError("Publisher URL is not an approved public Government of Canada source")
    fd, temporary = tempfile.mkstemp(prefix=f"pses{year}-", suffix=".xlsx", dir=DEST)
    os.close(fd)
    checksum = hashlib.sha256()
    size = 0
    try:
        with get(url) as response, open(temporary, "wb") as output:
            while True:
                chunk = response.read(1048576)
                if not chunk:
                    break
                size += len(chunk)
                if size > 20000000:
                    raise ValueError("Publisher source larger than 20 MB")
                checksum.update(chunk)
                output.write(chunk)
        if not zipfile.is_zipfile(temporary):
            raise ValueError("Publisher returned a response that is not an XLSX ZIP archive")
        with zipfile.ZipFile(temporary) as z:
            if "xl/workbook.xml" not in z.namelist():
                raise ValueError("Office Open XML workbook marker not found")
        if size != resource["drive_size"]:
            raise ValueError("Publisher byte size differs from source inventory")
        filename = f"pses{year}-supporting-documentation.xlsx"
        os.replace(temporary, DEST / filename)
        return {
            "year": year, "status": "hosted", "resource_id": resource["id"],
            "path": str((DEST / filename).relative_to(ROOT)),
            "publisher_url": url, "bytes": size, "sha256": checksum.hexdigest(),
            "size_matches_drive_inventory": size == resource["drive_size"],
            "note": "Original public survey supporting workbook; not raw respondent records",
        }
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    present = []
    missing = []
    prior_path = DEST / "manifest.json"
    prior = {x["year"]: x for x in json.loads(prior_path.read_text(encoding="utf-8")).get("files", [])} if prior_path.exists() else {}
    for resource in RESOURCES:
        try:
            record = archive(resource)
            present.append(record)
            print(f"ARCHIVED {record['year']}: {record['bytes']} bytes; SHA256 {record['sha256']}")
        except Exception as error:
            previous = prior.get(resource["year"])
            if previous:
                path = ROOT / previous["path"]
                if path.is_file() and path.stat().st_size == resource["drive_size"] and hashlib.sha256(path.read_bytes()).hexdigest() == previous["sha256"]:
                    present.append(previous)
                    print(f"RETAINED {resource['year']}: previously verified workbook")
                    continue
            missing.append({"year": resource["year"], "resource_id": resource["id"],
                            "status": "unverified", "reason": str(error)[:220]})
            print(f"NOT HOSTED {resource['year']}: {error}")
    manifest = {
        "source": "Treasury Board of Canada Secretariat via Open Government Portal",
        "files": present, "not_verified": missing,
        "total_attempted": len(RESOURCES), "confirmed_hosted": len(present),
        "complete": len(present) == len(RESOURCES),
    }
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Public PSES supporting sources: {len(present)} hosted, {len(missing)} unverified")


if __name__ == "__main__":
    main()
