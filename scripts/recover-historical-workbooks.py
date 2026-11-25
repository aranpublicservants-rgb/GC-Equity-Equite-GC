#!/usr/bin/env python3
"""Recover the exact public survey workbooks from the verified archive transfer."""
import hashlib, json, subprocess, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data/open-canada-2026-11/pses-supporting-documentation"
TRANSFER = "f3b20fee22c55f79817fff5878e7711a512f5ee3"
EXPECTED = {
    2014: ("GC-0014", 6316838, "ed1ad7a0c58287c042caa896259626a3a5d5e0051a8bc415c88686d6dd9101af"),
    2017: ("GC-0023", 6351299, "e257218ec7f0115f54a2273c8f909c9372cb4016f3040571ffcbf588739e9300"),
    2018: ("GC-0032", 6354406, "e865faf7265c143f063ad55ba8195378f8ac5a3baa292133e6bdeacf38ca5cc8"),
    2019: ("GC-0039", 6400633, "6a69b6eccb62d309a1e09e9ed8b63c00ed2322a1943456aad377620eeaf9fb3b"),
}
def main():
    register = {x["id"]: x for x in json.loads((ROOT / "data/public-source-register-2026-11-24.json").read_text())["entries"]}
    manifest_path = DEST / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    existing = {x["year"]: x for x in manifest["files"]}
    for year, (id_, size, digest) in EXPECTED.items():
        rec = register[id_]
        assert rec["approved"] is True and rec["family"] == "PSES" and rec["bytes"] == size
        parts = [subprocess.check_output(["git", "show", f"{TRANSFER}:{year}/{i:03d}.part"], cwd=ROOT) for i in range(9)]
        data = b"".join(parts)
        assert len(data) == size and hashlib.sha256(data).hexdigest() == digest, year
        path = DEST / f"pses{year}-supporting-documentation.xlsx"
        path.write_bytes(data)
        with zipfile.ZipFile(path) as z:
            assert "xl/workbook.xml" in z.namelist() and z.testzip() is None, year
        existing[year] = {"year": year, "status": "hosted", "resource_id": id_,
            "path": str(path.relative_to(ROOT)), "publisher_url": rec["source"], "bytes": size,
            "sha256": digest, "size_matches_drive_inventory": True,
            "note": "Public-source workbook from the existing archive; original archived bytes verified, current publisher byte equivalence not independently established."}
        print("Verified and recovered", year, size, digest)
    manifest["files"] = sorted(existing.values(), key=lambda x:x["year"])
    manifest["not_verified"] = [x for x in manifest["not_verified"] if x["year"] not in existing]
    manifest["confirmed_hosted"] = len(existing)
    manifest["complete"] = len(existing) == manifest["total_attempted"]
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
if __name__ == "__main__":
    main()
