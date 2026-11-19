"""Retain report links actually present in each department's official plan.

Only links in the same departmental namespace are accepted. This is a link
register, not a claim to have audited the publications or exhausted all reports.
"""
import concurrent.futures
import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
plans = json.loads((ROOT / 'assets/workspace-data.json').read_text())['plans']
pattern = re.compile(r'accessib\w*.*(?:plan|progress)|(?:plan|progress).*accessib|results.report|gender.based.analysis|gba.plus|employment.equity|employment.systems.review|anti.racism.(?:action|strategy|plan)', re.I)


class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []; self.href = None; self.words = []
    def handle_starttag(self, tag, attrs):
        if tag == 'a': self.href = dict(attrs).get('href'); self.words = []
    def handle_data(self, text):
        if self.href is not None: self.words.append(text)
    def handle_endtag(self, tag):
        if tag == 'a' and self.href is not None:
            self.links.append((self.href, ' '.join(''.join(self.words).split())))
            self.href = None


def inspect(plan):
    try:
        req = urllib.request.Request(plan['url'], headers={'User-Agent': 'GC-Equity-source-register/1.0'})
        with urllib.request.urlopen(req, timeout=18) as response:
            page_url = response.url
            html = response.read().decode('utf-8', errors='replace')
        base = urllib.parse.urlsplit(page_url)
        namespace = '/'.join(base.path.split('/')[:3])+'/' if base.hostname == 'www.canada.ca' else '/'
        parser = Links(); parser.feed(html)
        found = {}; seen = set()
        for href, title in parser.links:
            url = urllib.parse.urljoin(page_url, href); parsed = urllib.parse.urlsplit(url)
            if (not title or not pattern.search(title+' '+parsed.path)
                or parsed.hostname != base.hostname or not parsed.path.startswith(namespace)
                or parsed.scheme != 'https' or parsed.path == base.path): continue
            url = urllib.parse.urlunsplit((parsed.scheme,parsed.netloc,parsed.path,parsed.query,''))
            # Keep organizational reporting. Public policy/program links and
            # mismatched report labels are not departmental workforce evidence.
            if not re.search(r'plan|report|framework|rapport',title+' '+parsed.path,re.I): continue
            if 'canada-anti-racism-strategy' in parsed.path or '/site/planning-performance-reporting/site/' in parsed.path: continue
            if 'departmental-plan' in parsed.path and 'Results Report' in title: continue
            years = [int(y) for y in re.findall(r'20\d\d',parsed.path)]
            if years and max(years) < 2024: continue
            if title == 'PDF': title = 'Accessibility plan (PDF)'
            if url in seen: continue
            seen.add(url); found[url] = {'title': title, 'url': url, 'source': page_url, 'lang': 'en'}
        return plan['name'], {'plan': page_url, 'publications': list(found.values())[:14]}
    except Exception as exc:
        return plan['name'], {'plan': plan['url'], 'publications': [], 'unverified': type(exc).__name__}


with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    records = dict(pool.map(inspect, plans))
out = {'method': 'Links read from each organization’s official 2026–27 plan. Same departmental namespace only. A link listing is not a substantive review or an exhaustive publication inventory.', 'organizations': dict(sorted(records.items()))}
(ROOT / 'assets/department-publication-links.json').write_text(json.dumps(out, ensure_ascii=False, indent=2)+'\n')
print(sum(len(v['publications']) for v in records.values()),'department-specific report links;',sum('unverified' in v for v in records.values()),'plan pages unavailable')
