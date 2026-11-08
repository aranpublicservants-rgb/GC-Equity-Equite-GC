"""Check that the published site serves the files on main (review only)."""
import hashlib, subprocess
BASE = 'https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/'
EXPECTED = {"staffing.html": "b03c7a6accfd7ba9bc70150188a25cd2cb96101f5e7bf90ed3e7ec7327e5610f", "staffing.js": "a7e2d09c0aeaafc7c1612f09c2aaa378b8e5262f65c418b5d1bdf795afdfb505", "call-to-action.html": "6f6054d3a74ae0360f24b273eb5f32089a956f34553f4c62820484063531fba2", "call-to-action.js": "999284a847a9fec73b1d44c8dc2fa358283913723e843c5f9784246cd3b68768", "gc-workspace.js": "b460c8b6e85afc3f3821bd2f3030f558b5e4c7ffe206497fa47d80af16a71ece", "explorer.html": "1f1df064f7f7fd3e97bfab64a15256874ab5530e9eee31447013fb9d30ba1b96", "index.html": "847618699159dd03ac9b8e7fd480f7c107242dd83d04af376ea4ab9ccf0674e3", "sources.html": "f428174f8e95be62993b4868a15d6e60bf18c5b06d4023291a7ccc1cf111505d", "assets/search-index.json": "815df8b74f05d1167c83f357b6acec80282666842de61464bbd611d539b0f852", "assets/workspace-data.json": "b377103ec69a261edc7d9537cc5d06198a8dfa8bd3ecb7c4b6f92a730fdc71df", "assets/workspace-manifest.json": "d92bf2bdb4d8988c5dfd9db996f25fa3cdd004b06087ce35fe9b8ae96e21d212", "data/psc/psc-equity.json": "3fadb2adb4c3b16738185cbc11ecc07904ef5a04287f7ba87b95e29cc499eae0", "data/psc/catalogue.json": "234bbba0911ee933d3b374cf09fd12bb9febc9c117e79bea65d8e297fca4f3e0", "data/psc/ar4a.csv": "96b19eaf890e469bbf777c6d9a1599e06ce4ae495f9fe6a7378ac235fa802b7e", "data/psc/ar4c.csv": "e8e6245b1d740602b969a624a4e10b4af7f99ebc129ef639955ef10b9a6ac04f", "data/psc/demo_ee.csv": "0f0216568883a111efa41de26d6f2af715486c788e891151fc83391a069a005b", "data/psc/demo_region.csv": "23d277525648c50ed0d11a5bb7c9dc0374b54d3fc0d5bef0da9a6d970ad3af36", "data/checksums.sha256": "1ce64bfdba557606fef8e780ef9c178ab7f47fccdd2a48b9fb752a208578c902"}
bad = 0
for f, sha in EXPECTED.items():
    out = subprocess.run(['curl', '-sSL', '--fail', '--max-time', '60', '-H', 'Cache-Control: no-cache', BASE + f + '?v=check'], capture_output=True)
    got = hashlib.sha256(out.stdout).hexdigest() if out.returncode == 0 else None
    ok = got == sha
    bad += not ok
    print(('OK   ' if ok else 'DIFF ') + f + ' ' + str(len(out.stdout)) + ' bytes, curl ' + str(out.returncode))
print('live files matching main:', len(EXPECTED) - bad, 'of', len(EXPECTED))
