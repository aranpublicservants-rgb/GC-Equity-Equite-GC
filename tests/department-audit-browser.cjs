'use strict';
/* Browser smoke of six department templates, both languages, and route navigation. */
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.csv':'text/csv; charset=utf-8','.svg':'image/svg+xml'};
const pages=['dfo','dnd','isc','cra','esdc','canada-post'];
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
  let target=path.resolve(root,'.'+pathname);
  if(target===root||fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});res.end(data);});
 }catch{res.writeHead(400);res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1366]){
   const ctx=await browser.newContext({viewport:{width,height:850}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'data-catalogue.html?lang=en',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.getElementById('access').disabled&&document.getElementById('records').rows.length>0);
   await page.locator('#access').selectOption('local');
   await page.locator('#q').fill('PSES 2024');
   await page.waitForFunction(()=>document.querySelector('#records a[href*="survey-file-browser.html"]'));
   await page.locator('#reset').click();
   await page.locator('#q').fill('SNPS 2025');
   await page.waitForFunction(()=>document.querySelector('#records details summary')?.textContent.includes('Choose an organization'));
   await page.goto(base+'source-access.html?lang=fr&dataset=pses-2024%2Fsubset-2-sous-ensemble-2',{waitUntil:'domcontentloaded'});
   const details=page.locator('details[data-partition-directory="pses-2024/subset-2-sous-ensemble-2"]');
   await details.locator('a').first().waitFor();assert.equal(await details.locator('a').count(),71);
   assert.match(await details.locator('a').first().innerText(),/lignes/);
   await page.locator('#source-filter').fill('SAFF 2024');assert.ok(await page.locator('ul.sources li:visible').count()>=11);
   await page.locator('#source-clear').click();assert.equal(await page.locator('details[data-partition-directory]:visible').count(),37);
   assert.equal(await page.locator('#fswep-title').isVisible(),true);
   await page.route('https://raw.githubusercontent.com/**/pses/pses-2024/subset-2-sous-ensemble-2/*',r=>r.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/gzip'},body:require('node:zlib').gzipSync('QUESTION,TITLE_E,POSITIVE,ANSCOUNT\nQ1,"Test, quoted",50,10\nQ2,"Other",9999,20\n')}));
   await page.goto(base+'survey-file-browser.html?lang=fr&dataset=pses-2024%2Fsubset-2-sous-ensemble-2',{waitUntil:'domcontentloaded'});
   await page.locator('#load').waitFor();await page.waitForFunction(()=>!document.getElementById('load').disabled);
   await page.locator('#query').fill('Q1');await page.locator('#load').click();
   await page.locator('#results').waitFor();assert.equal(await page.locator('#rows tr').count(),1);assert.match(await page.locator('#rows').innerText(),/Test, quoted/);
   assert.match(await page.locator('#status').innerText(),/1 lignes correspondantes/);
   await page.goto(base+'survey-file-browser.html?lang=en&restored=GC-0223',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.getElementById('load').disabled);
   await page.locator('#load').click();await page.locator('#results').waitFor();
   assert.ok(await page.locator('#rows tr').count()>0,'Restored CSV is readable');
   assert.match(await page.locator('#download').getAttribute('href'),/data\/restored\//);
   await page.goto(base+'survey-file-browser.html?lang=fr&restored=GC-0102',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.getElementById('load').disabled);await page.locator('#load').click();await page.locator('#results').waitFor();assert.ok(await page.locator('#rows tr').count()>0);
   await page.goto(base+'survey-file-browser.html?lang=fr&restored=GC-0080',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.getElementById('load').disabled);
   await page.locator('#load').click();await page.locator('#results').waitFor();
   assert.ok(await page.locator('#rows tr').count()>0,'HRINFO source is readable');
   assert.match(await page.locator('#download').getAttribute('href'),/HRINFO\.csv\.gz$/);
   await page.goto(base+'reports.html?lang=fr',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('#report-scope option[value="private"]').count(),0);
   assert.deepEqual(errors,[]);await ctx.close();
  }
  for(const slug of pages){
   const ctx=await browser.newContext({viewport:{width:1350,height:850}});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+slug+'/?lang=en',{waitUntil:'domcontentloaded'});
   await page.locator('#lang-en h2').first().waitFor({timeout:30000});
   if(slug==='canada-post'){
    await page.locator('#lang-en .dp-coverage-gap').first().waitFor({timeout:15000});
    assert.equal(await page.locator('#lang-en .dp-coverage-gap').count(),10,'thin page shows ten transparent missing-source areas');
    assert.equal(await page.locator('#lang-fr .dp-coverage-gap').count(),10,'French thin page source status');
   }
   assert.ok(await page.locator('#lang-en h2').count()>=8,slug+': section coverage');
   const ids=await page.locator('#lang-en h2[id]').evaluateAll(els=>els.map(e=>e.id));
   const nav=await page.locator('#lang-en .contents a[href^="#"]').evaluateAll(els=>els.map(e=>e.getAttribute('href').slice(1)));
   assert.deepEqual(nav,ids,slug+': section menu must follow headings');
   assert.ok(await page.locator('#lang-en .contents').isVisible(),slug+': desktop menu');
   assert.ok(await page.locator('#lang-fr').count(),slug+': French sections missing');
   if(slug==='cra'){
    const search=page.locator('#dp-org-search-en');await search.waitFor();await search.fill('Health Canada');
    await page.waitForFunction(()=>document.querySelector('#lang-en .dp-organization option[value="health-canada"]'));
    assert.ok(await page.locator('#lang-en .dp-organization option').count()<10,'Search narrows the organization list');
    await search.fill('');assert.ok(await page.locator('#lang-en .dp-organization option').count()>100,'Clearing search restores organizations');
   }
   if(slug==='dfo'){
    for(const lang of ['en','fr']){
     assert.equal(await page.locator('#dfo-merge-staffing-2025-'+lang+' [data-dfo-merge-source]').count(),23);
     assert.equal(await page.locator('#dfo-merge-staffing-2023-'+lang+' [data-dfo-merge-source]').count(),3);
     assert.equal(await page.locator('#dfo-merge-representation-2023-'+lang+' table').count(),3);
    }
    await page.locator('#dfo-merge-staffing-2025-en summary').click();
    const source=page.locator('#dfo-merge-staffing-2025-en [data-dfo-merge-source]').first();
    const id=await source.getAttribute('data-dfo-merge-source');
    await source.click();
    await page.waitForFunction(id=>document.querySelector('#lang-en .dataset-picker')?.value===id&&document.querySelector('#lang-en .data-view h3')!==null,id,{timeout:30000});
   }
   await page.locator('#language').click();
   await page.waitForFunction(()=>document.documentElement.lang==='fr'&&!document.querySelector('#lang-fr').hidden,{timeout:10000});
   assert.ok(await page.locator('#lang-fr h2').count()>=8,slug+': French sections');
   if(slug==='dfo'){
    await page.locator('#dfo-merge-staffing-2023-fr summary').click();
    const source=page.locator('#dfo-merge-staffing-2023-fr [data-dfo-merge-source]').first();
    const id=await source.getAttribute('data-dfo-merge-source');
    await source.click();
    await page.waitForFunction(id=>document.querySelector('#lang-fr .dataset-picker')?.value===id&&document.querySelector('#lang-fr .data-view h3')!==null,id,{timeout:30000});
   }
   assert.deepEqual(errors,[],slug+': page script errors');
   await ctx.close();
   const mobile=await browser.newContext({...devices['Pixel 5']});
   const small=await mobile.newPage();
   await small.goto(base+slug+'/?lang=fr',{waitUntil:'domcontentloaded'});
   await small.locator('#lang-fr h2').first().waitFor({timeout:30000});
   assert.ok(await small.locator('#lang-fr .mobile-jump select').isVisible(),slug+': mobile section selector');
   assert.ok(!await small.locator('#lang-fr .contents').isVisible(),slug+': mobile sticky menu must be hidden');
   await mobile.close();
   console.log('PASS '+slug+': bilingual sections, desktop menu, mobile jump control, navigation links and browser errors');
  }
 }finally{await browser.close();server.close();}
})().catch(err=>{console.error(err);server.close();process.exit(1);});
