"""Check that the published site serves the files on main (review only)."""
import hashlib, subprocess
BASE = 'https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/'
EXPECTED = {"call-to-action.html": "ef75c4078853750c42e29dadc54d69dba4730b81f60473bc0fe9188141da7157", "call-to-action.js": "cc1defa1d43b3cf84b8142f26f5add4453e90a3363fbae337e0bbc144dae6316", "data/call-to-action-comparisons.json": "a45b079d643c2d6a2bbef70ad6463053c394827b9e1195bc40ec7f16bd6f2d52", "assets/search-index.json": "16c9ecbed47c947d5509d5d683603b7d36cf37df5230bfe34eea1a464d16dc12", "assets/workspace-manifest.json": "cdd1caad89efdcba2ccca42c369f1847b4565a43bd2055ef4f1f8946f9971231", "data/checksums.sha256": "c1d6d3f5df9a20350d7a1cd4dbf2706b78d773424db32c45ca733c6e275e4474", "data/call-to-action-letters.json": "cd6ea0a936fb227fed31520d00b3d27160717ed492ebe70ec1ee257c5fe68413", "staffing.html": "b03c7a6accfd7ba9bc70150188a25cd2cb96101f5e7bf90ed3e7ec7327e5610f", "index.html": "847618699159dd03ac9b8e7fd480f7c107242dd83d04af376ea4ab9ccf0674e3"}
bad = 0
for f, sha in EXPECTED.items():
    out = subprocess.run(['curl', '-sSL', '--fail', '--max-time', '60', '-H', 'Cache-Control: no-cache', BASE + f + '?v=check'], capture_output=True)
    got = hashlib.sha256(out.stdout).hexdigest() if out.returncode == 0 else None
    ok = got == sha
    bad += not ok
    print(('OK   ' if ok else 'DIFF ') + f + ' ' + str(len(out.stdout)) + ' bytes, curl ' + str(out.returncode))
print('live files matching main:', len(EXPECTED) - bad, 'of', len(EXPECTED))
