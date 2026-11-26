/* Runs in GitHub Actions against the checked-out revision, with no accounts. */
const {chromium,devices}=require('playwright');
const {readFileSync,statSync}=require('node:fs');
const http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{if(statSync(file).isDirectory())file=path.join(file,'index.html');const bytes=readFileSync(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes)}catch{res.writeHead(404);res.end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/recourse/';
 const browser=await chromium.launch({headless:true});
 try{
  for(const mode of [{name:'desktop',opts:{viewport:{width:1366,height:900}}},{name:'phone',opts:devices['Pixel 5']}]){
   const ctx=await browser.newContext({...mode.opts,acceptDownloads:true}),page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));const requests=[];page.on('request',req=>requests.push(req.url()));
   for(const lang of ['en','fr']){
    await page.goto(base+(lang==='fr'?'?lang=fr':''));
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert.equal(await page.locator('#issues>article').count(),6);
    assert.equal(await page.locator('.quick-form').getAttribute('open'),null);
    await page.locator('#more-topics').click();assert.equal(await page.locator('#issues>article').count(),12);
    await page.locator('#search').fill('racis');assert.ok(await page.locator('#issues>article').count()>0);
    await page.locator('#issues button.add').first().click();assert.equal(await page.locator('#issues button.add').first().getAttribute('aria-pressed'),'true');
    assert.ok((await page.locator('#selected-issues').innerText()).length>20);
    await page.locator('#reset-topics').click();assert.equal(await page.locator('#issues>article').count(),6);
    await page.locator('#agreement-file').setInputFiles({name:'sample-agreement.txt',mimeType:'text/plain',buffer:Buffer.from('Sample public test agreement. Grievance filing and leave provisions. No personal details.')});await page.locator('#agreement-term').fill('grievance');await page.locator('#agreement-find').click();assert.match(await page.locator('#agreement-hits').innerText(),/1/);await page.locator('#agreement-clear').click();
    await page.goto(base+'#assistant');assert.notEqual(await page.locator('.quick-form').getAttribute('open'),null);
    await page.goto(base+(lang==='fr'?'?lang=fr':''));
    const href=await page.locator('#t-hero1').getAttribute('href');assert.equal(href.includes('lang=fr'),lang==='fr');
    await page.locator('#t-hero1').click();
    await page.locator('[data-answer="discrimination"]').click();
    await page.locator('[data-answer="race"]').click();
    await page.locator('[data-answer="disability"]').click();
    await page.locator('#continue-answer').click();
    assert.ok(await page.locator('#route-results article').count()>0);
    assert.ok(await page.locator('#suggestions button').count()>1);
    await page.locator('#show-guidance').click();
    await page.locator('#prepare-message').click();assert.ok((await page.locator('#draft-text').inputValue()).length>200);
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download-guidance').click()]);
    assert.match(readFileSync(await download.path(),'utf8'),/https:\/\//);
    assert.ok(!requests.some(u=>u.includes('esm.run')||u.includes('huggingface')));
    const other=lang==='fr'?'en':'fr';await page.locator('#switch-language').click();
    assert.equal(await page.locator('html').getAttribute('lang'),other);
    assert.equal((new URL(page.url()).searchParams.get('lang')==='fr'),other==='fr');
    await page.locator('#clear').click();assert.equal(await page.locator('#draft-panel').isVisible(),false);assert.equal(await page.locator('#prepare-message').isEnabled(),false);
    await page.goto(base+'cases/'+(lang==='fr'?'?lang=fr':''));
    await page.waitForFunction(()=>document.querySelectorAll('#body-decisions article').length===12);
    await page.locator('#next-page').click();assert.equal(await page.locator('#body-decisions article').count(),12);
    await page.locator('#f-ground').selectOption('race');
    await page.locator('#extra-filters summary').click();await page.locator('#f-scope').selectOption('Federal public service');
    const [csv]=await Promise.all([page.waitForEvent('download'),page.locator('#download-results').click()]);
    const text=readFileSync(await csv.path(),'utf8');assert.ok(text.split('\n').length>2);assert.ok(!text.includes('Other federally regulated employment'));
    await page.locator('#q').fill('nothing-matches-982173');assert.equal(await page.locator('#noresults').isVisible(),true);assert.equal(await page.locator('#download-results').isEnabled(),false);
    await page.locator('#reset').click();assert.match(await page.locator('#showing').innerText(),/176/);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    const sent=[];
    await page.route('https://api.a2aj.ca/**',async route=>{sent.push(route.request().url());await route.fulfill({contentType:'application/json',body:JSON.stringify({results:[{name_en:'Public test decision',name_fr:'Décision publique de test',citation_en:'2026 TEST 1',dataset:'FC',document_date_en:'2026-01-01',url_en:'https://decisions.fct-cf.gc.ca/'}]})})});
    await page.locator('#all-published-decisions>summary').click();
    await page.locator('#a2aj-query').fill('public test phrase');assert.equal(sent.length,0,'External search must require an explicit action');
    await page.locator('[data-a2aj-topic]').first().click();await page.waitForFunction(()=>document.querySelectorAll('#a2aj-results>li').length===1);
    assert.equal(new URL(sent[0]).searchParams.get('search_language'),lang);
    assert.match(new URL(sent[0]).searchParams.get('query'),lang==='fr'?/discrimination raciale/:/racial discrimination/);
    assert.ok(!(await page.locator('#a2aj-status').innerText()).includes(' / '));
    await page.unroute('https://api.a2aj.ca/**');await page.route('https://api.a2aj.ca/**',route=>route.fulfill({status:503,body:'unavailable'}));
    await page.locator('#a2aj-form button[type=submit]').click();await page.waitForFunction(()=>/unavailable|indisponible/.test(document.querySelector('#a2aj-status').textContent));
    assert.ok(await page.locator('#a2aj-results a').count()>=2);
    await page.locator('#a2aj-reset').click();assert.equal(await page.locator('#a2aj-language').inputValue(),lang);
    await page.unroute('https://api.a2aj.ca/**');
    for(const url of [base+(lang==='fr'?'?lang=fr':''),base+'companion/'+(lang==='fr'?'?lang=fr':''),base+'cases/'+(lang==='fr'?'?lang=fr':'')]){
     await page.goto(url);await page.waitForFunction(()=>!document.querySelector('#showing')||!document.querySelector('#showing').textContent.match(/Loading|Chargement/));
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2),false,'Viewport overflow '+url+' '+mode.name);
     if(new URL(url).pathname==='/recourse/'){await page.locator('.quick-form>summary').click();await page.locator('.directory-disclosure>summary').click();await page.locator('.research-disclosure>summary').click();await page.locator('.selected-examples>summary').click();}
     await page.addScriptTag({path:require.resolve('axe-core')});
     const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
     assert.deepEqual(violations,[],'Accessibility '+url+' '+JSON.stringify(violations));
    }
   }
   assert.deepEqual(errors,[]);await ctx.close();console.log('PASS '+mode.name+': EN/FR guide, adaptive support, messages, exports, library, reflow and accessibility');
  }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
