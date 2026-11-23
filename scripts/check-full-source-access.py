#!/usr/bin/env python3
"""Guard publisher-source completeness claims and the new bilingual access page."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import re
ROOT = Path(__file__).resolve().parents[1]
page = (ROOT / "source-access.html").read_text(encoding="utf-8")
reports = (ROOT / "reports.html").read_text(encoding="utf-8")
builder = (ROOT / "scripts/build-equity-reports.py").read_text(encoding="utf-8")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.links.append(dict(attrs).get("href", ""))
p = Links()
p.feed(page)
official = [url for url in p.links if url.startswith("https://")]
assert len(official) == 15, f"Expected 15 distinct official sources, got {len(official)}"
assert len(set(official)) == len(official), "Duplicate official sources"
assert all(urlparse(u).hostname in ("www.canada.ca", "open.canada.ca") for u in official)
assert not any("drive.google.com" in u for u in official)
assert all("data-en=" in card and "data-fr=" in card for card in re.findall(r"<li>.*?</li>", page, re.S))
assert page.count('role="status"') >= 1
assert 'id="source-filter"' in page and 'id="source-clear"' in page
assert 'source-access.html' in sitemap
assert 'href="source-access.html"' in reports
assert 'href="source-access.html"' in builder
assert 'subset-4-sous-ensemble-4_hist.csv' in page
assert 'fswep_depts_ads_referrals_opengov-as-of-november-5-2026-single-tab.csv' in page
assert 'source version mismatch' in (ROOT/'scripts/refresh-fswep-2026-11.py').read_text().lower()
print("SOURCE ACCESS: bilingual page, 15 distinct official publisher URLs, provenance and navigation checks passed")
