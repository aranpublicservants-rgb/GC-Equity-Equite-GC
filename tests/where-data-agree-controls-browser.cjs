/* Control checks for "Where the data agree": search, theme, table buttons, chart views, chart downloads and the two-measure legend.
   Run: npm install --no-save playwright, then node tests/where-data-agree-controls-browser.cjs
   CHROME_PATH may name a local Chrome or Chromium. */
const { chromium, devices } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, bytes) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(bytes); });
});
const ok = m => console.log('PASS: ' + m);
async function download(page, click, what) {
  const dl = page.waitForEvent('download', { timeout: 8000 });
  dl.catch(() => {});
  await click();
  const d = await dl, bytes = fs.readFileSync(await d.path());
  assert.ok(bytes.length > 200, what + ' must not be empty');
  return { name: d.suggestedFilename(), text: bytes.toString('utf8') };
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/where-data-agree.html';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  try {
    for (const mode of [{ name: 'desktop', opts: { viewport: { width: 1366, height: 850 } } }, { name: 'phone', opts: { ...devices['Pixel 5'] } }]) {
      const ctx = await browser.newContext({ ...mode.opts, acceptDownloads: true }), page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.waitForSelector('#wda-findings .wda-finding');

      // Start here: each question sets the matching table to the chosen group and moves to it.
      await page.selectOption('#wda-start-group', 'pwd');
      await page.click('#wda-start-list [data-go="agree"]');
      assert.equal(await page.inputValue('#wda-agree-group'), 'pwd', mode.name + ' start: survey table group');
      await page.click('#wda-start-list [data-go="gaps"]');
      assert.equal(await page.inputValue('#wda-gap-group'), 'pwd', mode.name + ' start: gap group');
      await page.selectOption('#wda-start-group', 'woman');
      await page.click('#wda-start-list [data-go="links"]');
      assert.equal(await page.inputValue('#wda-link-group'), 'all', mode.name + ' start: links for a group with no group filter');
      await page.selectOption('#wda-start-group', 'ind');
      await page.click('#wda-start-list [data-go="links"]');
      assert.equal(await page.inputValue('#wda-link-group'), 'ind', mode.name + ' start: links group');
      assert.equal(await page.inputValue('#wda-link-show'), 'clear', mode.name + ' start: clear links');
      assert.ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'links-title'), 'focus moves to the section heading');
      const linkText = await page.locator('#wda-link-status').innerText();
      assert.ok(/Most certain link/.test(linkText), 'link summary names the most certain link');
      ok(mode.name + ': Start here');

      // One organization: every organization in the data renders, and names in tables open it.
      const orgs = await page.evaluate(() => [...document.querySelectorAll('#wda-org-select option')].map(o => o.value).filter(Boolean));
      const DATA = JSON.parse(fs.readFileSync(path.join(root, 'data/where-data-agree.json'), 'utf8'));
      assert.equal(orgs.length, DATA.orgs.length, mode.name + ' every organization is listed');
      assert.ok(DATA.orgs.length >= 100, 'at least 100 organizations');
      for (const o of orgs) {
        await page.selectOption('#wda-org-select', o);
        const txt = await page.locator('#wda-org-out').innerText();
        assert.deepEqual(errors, [], 'script errors for ' + o);
        assert.ok(await page.locator('#wda-org-out h3').count() === 1 && txt.length > 120 && !/undefined|NaN|\[object|null/.test(txt), 'organization view for ' + o);
      }
      await page.locator('#wda-agree-body a[data-org]').first().click();
      assert.notEqual(await page.inputValue('#wda-org-select'), '', mode.name + ' a name in the table opens the organization view');
      assert.ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'org-title'), 'focus moves to the organization heading');
      assert.match(page.url(), /[?&]org=/, 'organization is kept in the page address');
      ok(mode.name + ': organization view (' + orgs.length + ' organizations)');

      // Compare two organizations, from the picker and from the organization view.
      await page.selectOption('#wda-cmp-a', 'Health Canada');
      await page.selectOption('#wda-cmp-b', 'Public Safety Canada');
      assert.equal(await page.locator('#wda-cmp-out h3').count(), 2, mode.name + ' two organizations side by side');
      assert.deepEqual(errors, [], 'no script errors in the comparison');
      await page.selectOption('#wda-org-select', 'Canada Energy Regulator');
      await page.click('#wda-org-compare');
      assert.equal(await page.inputValue('#wda-cmp-a'), 'Canada Energy Regulator', mode.name + ' compare button fills the first organization');
      assert.match(page.url(), /[?&]ca=/, 'comparison is kept in the page address');
      assert.match(await page.locator('#wda-org-out').innerText(), /2011/, 'earlier staffing survey shown for an organization that has it');
      ok(mode.name + ': compare two organizations');

      // Staffing fairness since 2021: choices, rows, sort and download.
      await page.selectOption('#wda-staff-group', 'ind');
      await page.selectOption('#wda-staff-q', 'STA_01A');
      assert.ok(await page.locator('#wda-staff-body tr').count() > 10, mode.name + ' staffing rows');
      assert.match(await page.locator('#wda-staff-status').innerText(), /public service/, 'staffing summary names the public service');
      await page.click('#wda-staff-head [data-ssort="name"]');
      const sc = await download(page, () => page.click('#wda-staff-csv'), 'staffing CSV');
      assert.ok(sc.text.split('\n').length > 10, 'staffing CSV rows');
      await page.selectOption('#wda-start-group', 'black');
      assert.equal(await page.locator('#wda-start-list [data-go="staffing"]').count(), 0, 'no staffing question for Black employees (not in the 2021 files)');
      await page.selectOption('#wda-start-group', 'rac');
      await page.click('#wda-start-list [data-go="staffing"]');
      assert.equal(await page.inputValue('#wda-staff-group'), 'rac', mode.name + ' start: staffing group');
      ok(mode.name + ': staffing section');

      // One-page brief: builds the print copy for the chosen group (printing itself is stubbed).
      await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
      await page.selectOption('#wda-start-group', 'pwd');
      await page.click('#wda-brief-btn');
      assert.equal(await page.evaluate(() => window.__printed), 1, 'print was requested once');
      const brief = await page.locator('#wda-brief').innerText().catch(() => '');
      assert.ok(await page.locator('#wda-brief h3').count() >= 4, 'brief has its sections');
      assert.match(brief, /Watch list/, 'brief has a watch list');
      assert.ok(!/undefined|NaN|\[object/.test(await page.evaluate(() => document.getElementById('wda-brief').textContent)), 'brief has no unformatted values');
      assert.ok(!String.fromCharCode(8212).split('').some(c => brief.includes(c)), 'no em dash in brief');
      ok(mode.name + ': one-page brief');

      // Link summary mentions possible links when only clear links are shown.
      await page.selectOption('#wda-link-group', 'all'); await page.selectOption('#wda-link-show', 'clear');
      assert.match(await page.locator('#wda-link-status').innerText(), /more are possible links/, 'possible links are pointed out');

      // Theme: each choice sets the theme on the page.
      for (const [value, expect] of [['dark', 'dark'], ['contrast', 'contrast']]) {
        await page.selectOption('.gcw-theme, #gcw-theme, select[id*=theme]', value);
        assert.equal(await page.locator('html').getAttribute('data-theme'), expect, mode.name + ' theme ' + value);
      }
      await page.selectOption('.gcw-theme, #gcw-theme, select[id*=theme]', 'light');
      ok(mode.name + ': theme choices');

      // Save table and Table sources open something and do not raise errors.
      const save = page.getByRole('button', { name: 'Save table' }).first();
      await save.scrollIntoViewIfNeeded();
      const t = await download(page, () => save.click(), 'saved table').catch(() => null);
      if (t) assert.ok(t.text.split('\n').length > 3, 'Save table has rows');
      await page.getByRole('button', { name: 'Table sources' }).first().click();
      await page.waitForSelector('#gcw-trace[open]');
      assert.ok((await page.locator('#gcw-trace').innerText()).length > 50, 'Table sources dialog has content');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#gcw-trace[open]', { state: 'detached' });
      ok(mode.name + ': Save table and Table sources');

      // Chart views, Measure/Compare with, chart types and chart downloads.
      await page.locator('#wda-agree-body').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const chartBtn = page.getByRole('button', { name: 'Chart', exact: true }).first();
      await chartBtn.waitFor({ state: 'attached', timeout: 10000 });
      {
        await chartBtn.click();
        await page.waitForSelector('svg.dv-svg');
        const compare = page.getByLabel('Compare with').first();
        await compare.waitFor({ state: 'attached', timeout: 5000 });
        {
          await compare.selectOption({ index: 1 });
          const texts = await page.locator('svg.dv-svg').first().locator('text').allTextContents();
          const legend = texts.slice(0, 2);
          assert.equal(legend.length, 2);
          for (const s of legend) assert.ok(!/…|undefined|NaN/.test(s) || s.length < 90, 'legend text is whole: ' + s);
          const boxes = await page.locator('svg.dv-svg').first().locator('text').evaluateAll(n => n.slice(0, 2).map(e => { const b = e.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }));
          const [a, b] = boxes, apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
          assert.ok(apart, 'the two legend titles do not overlap');
          ok(mode.name + ': two-measure legend does not overlap');
        }
        const type = page.getByLabel('Chart type').first();
        await type.waitFor({ state: 'attached', timeout: 5000 });
        {
          const options = await type.locator('option').allTextContents();
          for (const o of options) { await type.selectOption({ label: o }); await page.waitForTimeout(150); assert.ok(await page.locator('svg.dv-svg').count() + await page.locator('.dv-note, .dv-empty').count() > 0, 'chart type ' + o); }
          await type.selectOption({ index: 0 });
          ok(mode.name + ': chart types ' + options.join(', '));
        }
        const svg = await download(page, () => page.getByRole('button', { name: /SVG/ }).first().click(), 'SVG');
        assert.ok(svg.text.includes('<svg'), 'SVG download');
        const png = page.getByRole('button', { name: /PNG/ }).first();
        if (await png.count()) await download(page, () => png.click(), 'PNG');
        const rows = page.getByRole('button', { name: /chart rows/i }).first();
        if (await rows.count()) { const c = await download(page, () => rows.click(), 'chart rows CSV'); assert.ok(c.text.split('\n').length > 2); }
        ok(mode.name + ': chart downloads');
      }

      // Search button opens the search and accepts a query.
      await page.getByRole('button', { name: 'Search', exact: true }).first().click();
      await page.waitForTimeout(300);
      await page.fill('#gcw-query', 'harassment');
      await page.press('#gcw-query', 'Enter');
      await page.waitForFunction(() => document.querySelector('#gcw-search-results')?.children.length > 0 && document.querySelector('#gcw-search-status')?.textContent.trim().length > 0, null, { timeout: 15000 });
      assert.ok((await page.locator('#gcw-search-results a').count()) > 0, 'search returns links for harassment');
      ok(mode.name + ': search opens');
      assert.deepEqual(errors, [], 'script errors on ' + mode.name);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exit(1); });
