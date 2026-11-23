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
   await page.locator('#language').click();
   await page.waitForFunction(()=>document.documentElement.lang==='fr'&&!document.querySelector('#lang-fr').hidden,{timeout:10000});
   assert.ok(await page.locator('#lang-fr h2').count()>=8,slug+': French sections');
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
