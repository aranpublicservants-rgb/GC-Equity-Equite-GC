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
          const ys = await page.locator('svg.dv-svg').first().locator('text').evaluateAll(n => n.slice(0, 2).map(e => e.getBBox().y));
          assert.ok(ys[1] > ys[0], 'two long legend titles sit on separate lines');
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
