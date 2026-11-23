/* Browser checks for the systemic change tools, in English and French, at desktop and phone widths.
   Run by the browser smoke workflow: npm install --no-save playwright axe-core, then node tests/systemic-change-browser.cjs
   CHROME_PATH may name a local Chrome or Chromium when the Playwright browser is not installed. */
const { chromium, devices } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.gz': 'application/gzip', '.csv': 'text/csv; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, bytes) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  });
});

const EM_DASH = String.fromCharCode(8212);
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const TOOLS = ['hr-process-toolkit/', 'managers-equity-toolkit/', 'decision-equity-check/', 'equity-impact-simulator/', 'commitments-tracker/', 'invisible-work-project/', 'global-public-service-equity/'];
/* Old addresses must keep working: each one opens the tool that replaced it. */
const REDIRECTS = [
  ['barrier-breaker/', 'hr-process-toolkit/', '#barriers'],
  ['job-posting-barrier-scanner/', 'hr-process-toolkit/', '#posting'],
  ['what-worked/', 'commitments-tracker/', '#practices'],
  ['federal-glass-ceiling/', 'department-evidence-explorer/', 'lens=career'],
  ['public-service-pay-gap-atlas/', 'department-evidence-explorer/', 'lens=pay']
];

async function audit(page, label) {
  if (!await page.evaluate(() => typeof window.axe === 'object')) await page.addScriptTag({ path: require.resolve('axe-core') });
  const found = await page.evaluate(async tags => (await axe.run(document, { runOnly: { type: 'tag', values: tags } })).violations
    .map(v => v.id + ' (' + v.nodes.length + '): ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')), AXE_TAGS);
  assert.deepEqual(found, [], 'Accessibility problems on ' + label + ': ' + found.join(' / '));
}

async function common(page, label, lang, errors) {
  assert.equal(await page.locator('html').getAttribute('lang'), lang, 'Page language not set on ' + label);
  const text = await page.locator('body').innerText();
  assert.ok(!text.includes(EM_DASH), 'Em dash in visitor text on ' + label);
  assert.ok(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(text), 'Unformatted value on ' + label);
  assert.ok(!/your instructions|as requested|\bTODO\b/i.test(text), 'Internal wording on ' + label);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2), false, label + ' must reflow without horizontal scrolling');
  assert.deepEqual(errors, [], 'Script errors on ' + label);
  await audit(page, label);
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/systemic-change/';
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
  try {
    for (const mode of [{ name: 'desktop', opts: { viewport: { width: 1366, height: 850 } } }, { name: 'phone', opts: { ...devices['Pixel 5'] } }]) {
      const ctx = await browser.newContext({ ...mode.opts, acceptDownloads: true });
      for (const lang of ['en', 'fr']) {
        const page = await ctx.newPage(), errors = [];
        page.on('pageerror', e => errors.push(e.message));
        const where = name => name + ' (' + mode.name + ', ' + lang + ')';

        /* Hub: one link to each tool, in the page language. */
        await page.goto(base + '?lang=' + lang);
        await page.locator('#app h1').waitFor();
        for (const t of ['department-evidence-explorer/', 'equity-under-austerity/', ...TOOLS]) assert.ok(await page.locator('#app a[href*="' + t + '"]').count() >= 1, 'Hub link missing: ' + t);
        await common(page, where('hub'), lang, errors);

        /* Department evidence explorer: findings for one department, three topics and a brief. */
        await page.goto(base + 'department-evidence-explorer/?lang=' + lang);
        await page.locator('#dew-org option[value="isc"]').waitFor({ state: 'attached', timeout: 60000 });
        await page.selectOption('#dew-org', 'isc');
        const findings = page.locator('.dew-findings');
        await findings.waitFor({ timeout: 120000 });
        assert.match(await findings.innerText(), lang === 'fr' ? /Services aux Autochtones Canada/ : /Indigenous Services Canada/);
        assert.ok(await findings.locator('li').count() >= 4, 'Main findings are too few');
        assert.ok(await findings.locator('li a').count() >= 4, 'Each finding needs a source link');
        await common(page, where('explorer, ISC findings'), lang, errors);
        for (const lens of ['workforce', 'regions', 'pay']) {
          await page.click('[data-lens="' + lens + '"]');
          await page.locator('#dew-result table caption').first().waitFor({ timeout: 60000 });
          assert.equal(await page.locator('[data-lens="' + lens + '"]').getAttribute('aria-pressed'), 'true', 'Chosen topic must be announced: ' + lens);
        }
        await common(page, where('explorer, pay'), lang, errors);
        await page.click('[data-lens="overview"]');
        await findings.waitFor({ timeout: 60000 });
        await page.click('#dew-build');
        assert.match(await page.locator('#dew-report').textContent(), lang === 'fr' ? /Principaux constats/ : /Main findings/);
        await page.click('#switch');
        await page.waitForFunction(l => document.documentElement.lang === l, lang === 'fr' ? 'en' : 'fr');
        assert.match(page.url(), new RegExp('lang=' + (lang === 'fr' ? 'en' : 'fr')), 'Language switch must update the address');

        /* Equity under austerity: published headcounts for two years and an explicitly hypothetical reduction. */
        await page.goto(base + 'equity-under-austerity/?lang=' + lang + '&org=isc');
        await page.locator('#dew-reduction').waitFor({ timeout: 120000 });
        await page.fill('#dew-reduction', '10');
        await page.locator('#dew-reduction').press('Enter');
        await page.locator('#dew-reduction').dispatchEvent('change');
        await page.waitForFunction(() => /10/.test(new URL(location.href).searchParams.get('cut') || ''), null, { timeout: 30000 });
        assert.match(await page.locator('#dew-result').innerText(), lang === 'fr' ? /explicitement|hypoth/ : /hypothetical/);
        assert.ok(await page.locator('#dew-result table caption').count() >= 2, 'Austerity tables missing');
        /* The reduction can apply to one employment type only. */
        const typeValues = await page.locator('#dew-type option').evaluateAll(o => o.map(x => x.value));
        assert.ok(typeValues.includes('all') && typeValues.length >= 2, 'Employment type choices missing');
        const oneType = typeValues.find(v => v !== 'all');
        await page.selectOption('#dew-type', oneType);
        await page.waitForFunction(v => new URL(location.href).searchParams.get('type') === v, oneType, { timeout: 30000 });
        assert.match(await page.locator('#dew-result').innerText(), lang === 'fr' ? /des employés/ : /headcount of/);
        await common(page, where('equity under austerity'), lang, errors);

        /* The process tools, the hours tool and the global observatory. */
        for (const t of TOOLS) {
          await page.goto(base + t + '?lang=' + lang);
          await page.locator('#app h1').waitFor();
          if (t === 'hr-process-toolkit/') {
            await page.fill('#scan-text', lang === 'fr'
              ? 'Le candidat doit posséder un permis de conduire valide. Disponibilité pour faire des heures supplémentaires à court préavis.'
              : 'The candidate must have a valid driver’s licence. Must be available for overtime on short notice.');
            await page.click('#scan-run');
            await page.locator('#scan-out .flag').first().waitFor();
            assert.ok(await page.locator('#scan-out .flag').count() >= 2, 'Posting check found too few wordings');
          }
          if (t === 'global-public-service-equity/') {
            await page.selectOption('#gl-country', 'uk');
            await page.selectOption('#gl-topic', 'disability');
            await page.locator('#compare article.item').first().waitFor();
            assert.equal(await page.locator('#compare article.item').count(), 1, 'Global observatory should show one United Kingdom disability figure');
            await page.selectOption('#gl-country', 'ca');
            await page.selectOption('#gl-topic', 'women');
            assert.equal(await page.locator('#compare article.item').count(), 2, 'Women dimension should show the country figure and the OECD average');
            assert.match(await page.locator('#compare').innerText(), lang === 'fr' ? /41,1/ : /41\.1%/);
          }
          if (t === 'equity-impact-simulator/') {
            assert.equal(await page.locator('#scenarios select').count(), 8, 'Simulator should rate two options for four scenarios');
            assert.ok(await page.locator('#scenarios a[href*="department-evidence-explorer/?lens="]').count() >= 3, 'Simulator scenarios should link to the explorer');
            await page.fill('#opt-a', 'Option A test');
            await page.selectOption('#sa-sim-workforce-reductions-or-restructuring', '3');
            await page.selectOption('#sb-sim-workforce-reductions-or-restructuring', '1');
            await page.click('#rec-build');
            const text = await page.locator('#rec-out').innerText();
            assert.ok(text.includes('Option A test') && text.includes('Option B'), 'Record should name both options');
          }
          if (t === 'commitments-tracker/') {
            await page.locator('#cta-org option[value="indigenous-services-canada"]').waitFor({ state: 'attached', timeout: 60000 });
            await page.selectOption('#cta-org', 'indigenous-services-canada');
            await page.locator('#department ol li').first().waitFor();
          }
          await page.click('#rec-build');
          assert.ok(await page.locator('#rec-out').isVisible(), 'Record missing on ' + t);
          const [file] = await Promise.all([page.waitForEvent('download'), page.click('#rec-download')]);
          assert.ok(fs.readFileSync(await file.path(), 'utf8').length > 40, 'Downloaded record is empty: ' + t);
          await common(page, where(t), lang, errors);
        }

        /* Old addresses. */
        for (const [from, to, keep] of REDIRECTS) {
          await page.goto(base + from + '?lang=' + lang + '&org=isc');
          await page.waitForURL(u => u.href.includes(to) && !u.href.includes(from), { timeout: 15000 });
          assert.ok(page.url().includes('lang=' + lang) && page.url().includes('org=isc'), 'Redirect lost the language or department: ' + from);
          if (keep) assert.ok(page.url().includes(keep), 'Redirect lost its section: ' + from);
        }
        assert.deepEqual(errors, [], 'Script errors');
        await page.close();
        console.log('PASS: systemic change tools, ' + mode.name + ', ' + lang);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); server.close(); process.exit(1); });
