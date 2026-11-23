'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/equity-reports.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'reports.html'), 'utf8');
const prefix = 'data/employer-equity-sources-2026-11/';
const supplemental = catalog.datasets.filter(d => d.links.some(l => l.path.startsWith(prefix)));
test('every restored employer CSV has a publisher, an explicit population and a linked published card', () => {
  assert.equal(supplemental.length, 13);
  let count = 0;
  for (const record of supplemental) {
    assert.match(record.source, /^https:\/\/open\.canada\.ca\/data\/en\/dataset\/[a-f0-9-]{36}$/);
    assert.ok(record.title.en && record.title.fr && record.population.en && record.population.fr);
    assert.ok(html.includes('id="' + record.id + '"'), 'missing public report card: ' + record.id);
    for (const link of record.links) {
      assert.ok(link.path.startsWith(prefix), 'unexpected unrelated source');
      assert.ok(fs.existsSync(path.join(ROOT, link.path)), 'missing original source: ' + link.path);
      assert.ok(html.includes('href="' + link.path + '"'), 'not linked on reports page: ' + link.path);
      const bytes = fs.readFileSync(path.join(ROOT, link.path));
      assert.ok(bytes.length > 0 && bytes.length < 150000, 'preview size limit not respected: ' + link.path);
      assert.ok(!bytes.includes(0), 'a binary source was incorrectly saved as CSV: ' + link.path);
      count++;
    }
  }
  assert.equal(count, 30);
});
test('hosted employer figures are not silently labelled public-service-wide', () => {
  const expectation = new Map([
    ['dnd-', 'dnd/'], ['cse-', 'cse/'], ['csis-', 'csis/'],
    ['vac-', 'vac/'], ['csps-', 'csps/']
  ]);
  for (const record of supplemental) {
    const folder = Array.from(expectation).find(([prefix]) => record.id.startsWith(prefix))?.[1];
    assert.ok(folder, 'unrecognized employer grouping: ' + record.id);
    assert.ok(record.links.every(x => x.path.includes('/' + folder)), 'mismatched employer: ' + record.id);
    assert.ok(!/public[- ]service[- ]wide|national workforce totals/i.test(record.population.en),
      'employer records may not replace national figures');
  }
});
test('read-only viewer can be loaded and generated reports preserve readable file names', () => {
  const viewer = fs.readFileSync(path.join(ROOT, 'assets/employer-equity-csv-viewer.js'), 'utf8');
  const builder = fs.readFileSync(path.join(ROOT, 'scripts/build-equity-reports.py'), 'utf8');
  assert.ok(html.includes('assets/employer-equity-csv-viewer.js'));
  assert.ok(builder.includes('assets/employer-equity-csv-viewer.js'));
  assert.ok(builder.includes('data/employer-equity-sources-2026-11/'));
  assert.ok(viewer.includes('textContent') && !viewer.includes('localStorage'));
});
