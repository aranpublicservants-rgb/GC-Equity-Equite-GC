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
# The original 15 publisher URLs remain required. Historical partitions add
# three original publisher URLs and repository-hosted, source-versioned files.
external = [url for url in p.links if url.startswith("https://")]
official = [u for u in external if urlparse(u).hostname in ("www.canada.ca", "open.canada.ca")]
hosted = [u for u in external if u not in official]
assert len(set(external)) == len(external), "Duplicate source or partition link"
for section_id, count in (("pses-title", 11), ("documentation-title", 3), ("fswep-title", 1)):
    section = re.search(r'<section aria-labelledby="' + section_id + r'">.*?</section>', page, re.S)
    assert section, section_id
    links = Links()
    links.feed(section.group())
    urls = [u for u in links.links if u.startswith("https://")]
    assert len(urls) == count, (section_id, len(urls))
    assert all(u in official for u in urls), section_id
assert len(official) >= 18, "Original publishers or historical source URLs missing"
prefixes = (
    "https://github.com/aranpublicservants-rgb/GC-Equity-Equite-GC/tree/pses-data/pses/",
    "https://raw.githubusercontent.com/aranpublicservants-rgb/GC-Equity-Equite-GC/pses-data/pses/",
)
assert hosted and all(u.startswith(prefixes) for u in hosted), "Unexpected external host or partition route"
assert not any("drive.google.com" in u for u in external)
assert all("data-en=" in card and "data-fr=" in card for card in re.findall(r"<li\b[^>]*>.*?</li>", page, re.S))
assert page.count('role="status"') >= 1
assert 'id="source-filter"' in page and 'id="source-clear"' in page
assert 'source-access.html' in sitemap
assert 'href="source-access.html"' in reports
assert 'href="source-access.html"' in builder
assert 'subset-4-sous-ensemble-4_hist.csv' in page
assert 'fswep_depts_ads_referrals_opengov-as-of-november-5-2026-single-tab.csv' in page
assert 'source version mismatch' in (ROOT/'scripts/refresh-fswep-2026-11.py').read_text().lower()
print(f"SOURCE ACCESS: {len(official)} official publisher URLs and {len(hosted)} repository links; bilingual provenance and navigation checks passed")
