/* Exercise the published page controls without requiring external AI downloads.
   Also supports testing a deployed GitHub Pages URL via GCE_LIVE_URL. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const prefix='/GC-Equity-Equite-GC/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.gz':'application/gzip','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8'};
const server=http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}if(!pathname.startsWith(prefix)){res.writeHead(404);return res.end()}let file=path.resolve(root,pathname.slice(prefix.length));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const stat=fs.statSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size});fs.createReadStream(file).pipe(res)}catch{res.writeHead(404);res.end()}});
(async()=>{let browser;try{
 let base=process.env.GCE_LIVE_URL;if(!base){await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+prefix}if(!base.endsWith('/'))base+='/';
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 for(const lang of ['en','fr'])for(const width of [1280,390]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:lang==='fr'?'fr-CA':'en-CA'});await ctx.addInitScript(()=>{try{Object.defineProperty(window,'Summarizer',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__gceTestCopied=text}}})}catch{}});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(30000);
  await p.goto(base+'?lang='+lang,{waitUntil:'domcontentloaded'});await p.locator('#gce-local-query').waitFor({state:'visible'});
  await p.locator('#gce-local-query').fill(lang==='fr'?'mon gestionnaire refuse le télétravail':'my boss will not let me work from home');
  await p.locator('#gce-local-search button[type=submit]').click();
  await p.locator('#gce-local-search ol a[href*="duty-to-accommodate"]').first().waitFor({state:'visible'});
  await p.getByRole('button',{name:lang==='fr'?'Voir les extraits clés':'Show key excerpts',exact:true}).click();
  assert.ok(await p.locator('#gce-local-tools li').count()>0);
  await p.goto(base+'isc/?lang='+lang,{waitUntil:'domcontentloaded'});
  const findings=p.locator('#gce-key-findings');await findings.locator('select').waitFor({state:'visible'});
  const choices=await findings.locator('select option').count();assert.ok(choices>1);
  await findings.locator('select').selectOption({index:Math.min(1,choices-1)});
  await findings.getByRole('button',{name:lang==='fr'?'Créer une invite de note':'Create briefing prompt',exact:true}).click();
  const prompt=await findings.locator('textarea').inputValue();assert.match(prompt,/2024/);assert.match(prompt,/canada\.ca/);
  const branch=p.locator('#branch-results');await branch.scrollIntoViewIfNeeded();await branch.locator('table').waitFor({state:'visible',timeout:60000});
  const btn=branch.getByRole('button',{name:lang==='fr'?'Créer une invite de note':'Create briefing prompt',exact:true}).first();await btn.click();const branchPrompt=await branch.locator('.gce-local-copy').first().inputValue();assert.match(branchPrompt,/2024/);assert.match(branchPrompt,/canada\.ca/);
  await branch.locator('#gce-branch-group').selectOption('Black');
  await branch.locator('#gce-branch-unit').selectOption('203');
  await branch.locator('#gce-branch-view').selectOption('heatmap');
  const heatmap=branch.locator('section').filter({has:p.getByRole('heading',{name:lang==='fr'?'Carte thermique par direction et groupe':'Branch-by-group heatmap',exact:true})});
  await heatmap.locator('table').waitFor({state:'visible'});
  assert.match(await heatmap.locator('tbody').innerText(),lang==='fr'?/Indisponible/:/Unavailable/);
  await branch.getByRole('button',{name:lang==='fr'?'Copier le lien vers cette vue':'Copy link to this view',exact:true}).click();
  await p.waitForFunction(()=>typeof window.__gceTestCopied==='string'&&window.__gceTestCopied.includes('brpair=Black'));
  const shared=await p.evaluate(()=>window.__gceTestCopied),u=new URL(shared);
  assert.equal(u.searchParams.get('brorg'),'isc');assert.equal(u.searchParams.get('brq'),'Q65');assert.equal(u.searchParams.get('brunit'),'203');assert.equal(u.searchParams.get('brview'),'heatmap');
  await p.goto(shared,{waitUntil:'domcontentloaded'});
  await branch.locator('#gce-branch-view').waitFor({state:'visible'});
  assert.equal(await branch.locator('#gce-branch-view').inputValue(),'heatmap');assert.equal(await branch.locator('#gce-branch-group').inputValue(),'Black');assert.equal(await branch.locator('#gce-branch-unit').inputValue(),'203');
  await p.goto(base+'branch-equity.html?lang='+lang+'#q65-comparisons',{waitUntil:'domcontentloaded'});
  const comparisons=p.locator('#q65-comparisons');await comparisons.locator('#q65-gap-group').waitFor({state:'visible'});
  await comparisons.locator('#q65-gap-group').selectOption('Racialized');await comparisons.locator('#q65-gap-organization').selectOption('isc');
  const firstLink=comparisons.locator('tbody a').first();await firstLink.waitFor({state:'visible'});const linked=new URL(await firstLink.getAttribute('href'));assert.equal(linked.searchParams.get('brorg'),'isc');assert.equal(linked.searchParams.get('brq'),'Q65');assert.equal(linked.searchParams.get('brpair'),'Racialized');
  assert.ok(await comparisons.locator('tbody tr').count()>0);
  await p.goto(base+'accessibility-inclusion/?lang='+lang,{waitUntil:'domcontentloaded'});await p.locator('h1').waitFor({state:'visible'});assert.match(await p.locator('h1').innerText(),lang==='fr'?/Accessibilité et inclusion/:/Accessibility and inclusion/);
  const visible=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2);assert.ok(visible,'Accessibility landing page horizontally overflows');
  assert.deepEqual(errors,[],lang+' '+width+' JS errors');
  await ctx.close();console.log('Passed browser checks:',lang,width);
 }
}finally{await browser?.close();if(server.listening)server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
