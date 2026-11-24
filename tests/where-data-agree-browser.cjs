/* Browser checks for the "Where the data agree" page, in English and French, at desktop and phone widths.
   Run by the browser smoke workflow: npm install --no-save playwright axe-core, then node tests/where-data-agree-browser.cjs
   CHROME_PATH may name a local Chrome or Chromium when the Playwright browser is not installed. */
const { chromium, devices } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, bytes) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  });
});
const DATA = JSON.parse(fs.readFileSync(path.join(root, 'data/where-data-agree.json'), 'utf8'));
const EM_DASH = String.fromCharCode(8212);

async function audit(page, label) {
  await page.addScriptTag({ path: require.resolve('axe-core') });
  const found = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations
    .map(v => v.id + ' (' + v.nodes.length + '): ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')));
  if (found.length) console.error(await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => v.nodes.map(n => n.html).join(' | ')).join(' // ')));
  assert.deepEqual(found, [], 'Accessibility problems on ' + label + ': ' + found.join(' / '));
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/where-data-agree.html';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  try {
    for (const mode of [{ name: 'desktop', opts: { viewport: { width: 1366, height: 850 } } }, { name: 'phone', opts: { ...devices['Pixel 5'] } }]) {
      const ctx = await browser.newContext({ ...mode.opts, acceptDownloads: true });
      for (const lang of ['en', 'fr']) {
        const label = mode.name + ', ' + lang, page = await ctx.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(base + (lang === 'fr' ? '?lang=fr' : ''), { waitUntil: 'networkidle' });
        await page.waitForSelector('#wda-findings .wda-finding');
        assert.equal(await page.locator('html').getAttribute('lang'), lang, 'page language on ' + label);
        assert.equal(await page.locator('#wda-findings .wda-finding').count(), 5, 'five findings on ' + label);
        assert.equal(await page.locator('#wda-agree-body tr').count(), DATA.agree.black.orgs.length, 'survey agreement rows on ' + label);
        assert.ok(await page.locator('#wda-gap-body tr').count() > 10, 'gap rows on ' + label);
        assert.equal(await page.locator('#wda-link-body tr').count(), DATA.scan.clear, 'clear links on ' + label);
        // Choices update the tables.
        await page.selectOption('#wda-agree-group', 'pwd');
        assert.equal(await page.locator('#wda-agree-body tr').count(), DATA.agree.pwd.orgs.length, 'agreement rows after choosing a group on ' + label);
        await page.selectOption('#wda-gap-group', 'black');
        await page.selectOption('#wda-gap-q', 'Q58');
        assert.equal(await page.locator('#wda-gap-head th').count(), DATA.trends.groups.black.years.length + 3, 'gap columns for Black employees on ' + label);
        await page.selectOption('#wda-link-show', 'every');
        assert.equal(await page.locator('#wda-link-body tr').count(), DATA.scan.tests, 'every comparison on ' + label);
        await page.click('#wda-gap-head [data-sort="name"]');
        const dl = page.waitForEvent('download');
        await page.click('#wda-gap-csv');
        const file = await (await dl).path();
        assert.ok(fs.readFileSync(file, 'utf8').split('\n').length > 10, 'gap CSV on ' + label);
        const text = await page.locator('main').innerText();
        assert.ok(!text.includes(EM_DASH), 'em dash on ' + label);
        assert.ok(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(text), 'unformatted value on ' + label);
        if (lang === 'fr') assert.ok(!/ [:%;?!]/.test(text.replace(/https?:\S+/g, '')), 'French spacing on ' + label);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2), false, label + ' must reflow without horizontal scrolling');
        assert.deepEqual(errors, [], 'script errors on ' + label);
        await audit(page, label);
        fs.mkdirSync(path.join(root, 'qa-screenshots'), { recursive: true });
        await page.screenshot({ path: path.join(root, 'qa-screenshots', 'where-data-agree-' + mode.name + '-' + lang + '.png') });
        await page.close();
        console.log('PASS: where-data-agree.html, ' + label);
      }
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exit(1); });
