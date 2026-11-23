/* Static checks for the systemic change tools (systemic-change/). Run by scripts/check-site.py.
   Checks the shared tool content, the page shells, the redirects from retired addresses and the visitor text. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..'), dir = path.join(root, 'systemic-change');
const EM_DASH = String.fromCharCode(8212);
const read = f => fs.readFileSync(f, 'utf8');

/* Every file in the folder: no em dash, no internal wording, valid JavaScript. */
const files = [];
for (const name of fs.readdirSync(dir)) {
  const full = path.join(dir, name);
  if (fs.statSync(full).isDirectory()) { if (fs.existsSync(path.join(full, 'index.html'))) files.push(path.join(full, 'index.html')); }
  else if (/\.(js|css|html)$/.test(name)) files.push(full);
}
for (const f of files) {
  const text = read(f), rel = path.relative(root, f);
  assert.ok(!text.includes(EM_DASH), 'em dash: ' + rel);
  for (const phrase of ['as requested', 'your instructions', 'make it perfect', 'lorem ipsum']) assert.ok(!text.toLowerCase().includes(phrase), 'internal wording in ' + rel + ': ' + phrase);
  if (f.endsWith('.js')) new vm.Script(text, { filename: rel });
}

/* Tool content: two non-empty languages everywhere, known sources, real pages. */
const sandbox = { window: {} };
vm.runInNewContext(read(path.join(dir, 'tools-content.js')), sandbox, { filename: 'tools-content.js' });
const T = sandbox.window.GCE_TOOLS;
assert.ok(T && T.S && T.tools && T.pages && Array.isArray(T.scanRules), 'tool content incomplete');
const pair = (v, where) => assert.ok(Array.isArray(v) && v.length >= 2 && typeof v[0] === 'string' && typeof v[1] === 'string' && v[0].trim() && v[1].trim(), 'English and French text needed: ' + where);
for (const [k, s] of Object.entries(T.S)) {
  assert.ok(Array.isArray(s) && s.length === 4 && s.every(x => typeof x === 'string' && x.trim()), 'source needs two titles and two addresses: ' + k);
  assert.ok(/^https:\/\//.test(s[2]) && /^https:\/\//.test(s[3]), 'source address must use https: ' + k);
}
let items = 0;
function walk(node, where) {
  if (Array.isArray(node)) { node.forEach((x, i) => walk(x, where + '[' + i + ']')); return; }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (['title', 'intro', 'l', 'v', 'why', 'change', 'note', 'label'].includes(k) && Array.isArray(v) && typeof v[0] === 'string') pair(v, where + '.' + k);
    else if ((k === 'sources' || k === 'src') && Array.isArray(v)) v.forEach(s => assert.ok(typeof s !== 'string' || T.S[s], 'unknown source ' + s + ' at ' + where));
    else walk(v, where + '.' + k);
  }
  if (node.id && node.fields) items++;
}
walk(T.pages, 'pages');
walk(T.tools, 'tools');
for (const [slug, page] of Object.entries(T.pages)) {
  pair(page.title, slug + '.title');
  const shell = path.join(dir, slug === 'hub' ? '' : slug, 'index.html');
  assert.ok(fs.existsSync(shell), 'page shell missing: ' + slug);
  assert.ok(read(shell).includes('data-tool="' + slug + '"'), 'page shell names another tool: ' + slug);
  const ids = page.sections.map(s => s.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'duplicate section id: ' + slug);
}
for (const [key, tool] of Object.entries(T.tools)) {
  if (tool.external) continue;
  assert.ok(fs.existsSync(path.join(dir, tool.href, 'index.html')), 'hub links to a missing tool: ' + key);
}
for (const k of ['equity-under-austerity', 'global-public-service-equity']) assert.ok(T.tools[k] && T.order.includes(k), 'tool missing from the tools page: ' + k);
assert.ok(read(path.join(dir, 'equity-under-austerity', 'index.html')).includes('department-evidence.js'), 'the austerity page runs on department-evidence.js');
for (const r of T.scanRules) {
  assert.equal(Object.prototype.toString.call(r.rx), '[object RegExp]', 'posting rule without a pattern');
  pair(r.title, 'rule'); pair(r.why, 'rule ' + r.title[0]); pair(r.change, 'rule ' + r.title[0]);
  assert.ok(!new RegExp(r.rx.source, r.rx.flags.replace('g', '')).test(''), 'posting rule matches empty text: ' + r.title[0]);
  for (const s of r.src || []) assert.ok(T.S[s], 'unknown source in rule ' + r.title[0]);
}

/* Retired addresses: each redirect points to a page that exists and keeps the language and department. */
let redirects = 0;
for (const name of fs.readdirSync(dir)) {
  const f = path.join(dir, name, 'index.html');
  if (!fs.existsSync(f)) continue;
  const html = read(f), m = html.match(/http-equiv="refresh" content="0; url=([^"#?]+)/);
  if (!m) continue;
  redirects++;
  assert.ok(fs.existsSync(path.join(dir, name, m[1], 'index.html')), 'redirect target missing: ' + name);
  assert.ok(/searchParams|location\.search/.test(html), 'redirect must keep the language and department: ' + name);
}

/* The History site loads department-evidence.js from this site: keep its interface. */
const engine = read(path.join(dir, 'department-evidence.js'));
for (const needle of ['window.GCEEvidenceWorkspace', 'setSelection', 'GC-Equity-History']) assert.ok(engine.includes(needle), 'department-evidence.js interface changed: ' + needle);

console.log('SYSTEMIC CHANGE: ' + files.length + ' files, ' + Object.keys(T.pages).length + ' pages, ' + items + ' items, ' + T.scanRules.length + ' posting rules, ' + Object.keys(T.S).length + ' sources, ' + redirects + ' redirects checked');
