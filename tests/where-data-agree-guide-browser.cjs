/* Checks for the guide page: language blocks, accessibility, no horizontal scrolling, and that every group link opens the right table.
   Run: npm install --no-save playwright axe-core, then node tests/where-data-agree-guide-browser.cjs
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
const EM_DASH = String.fromCharCode(8212);
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port, base = origin + '/where-data-agree-guide.html';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  try {
    for (const mode of [{ name: 'desktop', opts: { viewport: { width: 1366, height: 850 } } }, { name: 'phone', opts: { ...devices['Pixel 5'] } }]) {
      const ctx = await browser.newContext(mode.opts);
      for (const lang of ['en', 'fr']) {
        const label = mode.name + ', ' + lang, page = await ctx.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(base + (lang === 'fr' ? '?lang=fr' : ''), { waitUntil: 'networkidle' });
        assert.equal(await page.locator('#wdag-en').isVisible(), lang === 'en', 'English block on ' + label);
        assert.equal(await page.locator('#wdag-fr').isVisible(), lang === 'fr', 'French block on ' + label);
        const text = await page.locator('main').innerText();
        assert.ok(!text.includes(EM_DASH), 'em dash on ' + label);
        if (lang === 'fr') assert.ok(!/ [:%;?!]/.test(text), 'French spacing on ' + label);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2), false, label + ' must reflow');
        await page.addScriptTag({ path: require.resolve('axe-core') });
        const found = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => v.id + ': ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')));
        assert.deepEqual(found, [], 'Accessibility problems on ' + label + ': ' + found.join(' / '));
        assert.deepEqual(errors, [], 'script errors on ' + label);
        // Every group link opens the main page set to that group.
        const hrefs = await page.locator('.wdag-links a:visible').evaluateAll(a => a.map(x => x.getAttribute('href')));
        assert.equal(hrefs.length, 14, 'five groups, with four having a staffing link, on ' + label);
        for (const href of hrefs) {
          const p2 = await ctx.newPage(), e2 = [];
          p2.on('pageerror', e => e2.push(e.message));
          await p2.goto(origin + '/' + href, { waitUntil: 'networkidle' });
          const q = new URL(origin + '/' + href).searchParams, sel = q.get('both') ? '#wda-agree-group' : q.get('group') ? '#wda-gap-group' : '#wda-staff-group', want = q.get('both') || q.get('group') || q.get('sg');
          assert.equal(await p2.inputValue(sel), want, 'link ' + href + ' sets its group');
          assert.deepEqual(e2, [], 'script errors for ' + href);
          await p2.close();
        }
        await page.close();
        console.log('PASS: where-data-agree-guide.html, ' + label);
      }
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exit(1); });
