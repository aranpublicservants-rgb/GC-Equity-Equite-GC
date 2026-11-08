"""Check that the published site serves the files on main (review only)."""
import hashlib, subprocess
BASE = 'https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/'
EXPECTED = {'call-to-action.html': 'b750f4c3e4b5edeff0528bc4c547ce42d107189c1de9e90b94b45e5030cecb3d', 'call-to-action.js': '1dc0fcb2a456312187ca000202d46d15086c5229b348c6d6a6c639e1fe3c0121', 'gc-tools.js': '3af12ecdee5cf60047a27021ef29d3efc4ba92925278a0b835694538fc3c3313', 'gc-workspace.js': '7772822f85615ff8f38775e84f9514a7032795926e7aaf412adc652067077f9d', 'gc-workspace.css': '04ba46c540144c61036d31d2570b087f73b3083f47057a0ca5dfb0a4f51ac53d', 'explorer.html': '18feb9fe8e8b263b889d672d490b3b635d5f7bf55461b67171f35507d98115fa', 'index.html': '847618699159dd03ac9b8e7fd480f7c107242dd83d04af376ea4ab9ccf0674e3', 'sources.html': '792bfa25f8d35ae22a42ab0ebcc1d38923a06916afe86551200041dacff1243f', 'data/call-to-action-letters.json': 'cd6ea0a936fb227fed31520d00b3d27160717ed492ebe70ec1ee257c5fe68413', 'data/snps-2025-by-organization.json': '9f1a5920cd429f642db8b02afc9cf61c10ab7fb741f1600a9801a91062cc32f6', 'data/tbs-departmental-representation-2017-2025.json': '2af455a42aab0be5881e71e5ddd9ee547e5c7afd816720bc5a2f45108908a4b4', 'departmental-plans-2026-27/index.html': '3ed72fe32972d09e90ffed3a95ca76430d5ab16b5231784811d4a869658d69e5'}
bad = 0
for f, sha in EXPECTED.items():
    out = subprocess.run(['curl', '-sSL', '--fail', '--max-time', '60', '-H', 'Cache-Control: no-cache', BASE + f + '?v=check'], capture_output=True)
    got = hashlib.sha256(out.stdout).hexdigest() if out.returncode == 0 else None
    ok = got == sha
    bad += not ok
    print(('OK   ' if ok else 'DIFF ') + f + ' ' + str(len(out.stdout)) + ' bytes, curl ' + str(out.returncode))
print('live files matching main:', len(EXPECTED) - bad, 'of', len(EXPECTED))
