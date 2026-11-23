'use strict';
/* Real-browser source-access smoke test, in English and French and on mobile. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT,'data/open-canada-2026-11/psc-fswep-referrals/large-files.json'),'utf8'));
const record = manifest.files.find(r=>r.name.includes('november-5-2026'));
assert.ok(record,'November 5 source manifest missing');
assert.equal(record.rows,72822);
assert.equal(record.bytes,30887309);
assert.ok(fs.statSync(path.join(ROOT,'data/open-canada-2026-11/psc-fswep-referrals',record.gz)).size>0);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let file=path.resolve(ROOT,'.'+rel);
 if(!file.startsWith(ROOT+path.sep) && file!==ROOT){res.writeHead(403);return res.end();}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  res.end(data);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const variant of [{name:'desktop',options:{viewport:{width:1280,height:800}}},{name:'mobile',options:{...devices['Pixel 5']}}]){
   const context=await browser.newContext(variant.options);
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'fswep-browser.html?lang=en');
   assert.match(await page.locator('h1').innerText(),/FSWEP referral requests/);
   assert.ok(await page.locator('a[download][href$=".gz"]').count());
   await page.locator('#fswep-load').click();
   await page.waitForFunction(()=>document.querySelector('#fswep-status').textContent.includes('72,822 of 72,822'),null,{timeout:120000});
   assert.equal(await page.locator('#fswep-body tr').count(),50);
   assert.ok(await page.locator('#fswep-head th').count()>=3);
   await page.locator('#fswep-next').click();
   assert.match(await page.locator('#fswep-page').innerText(),/Page 2/);
   await page.locator('#fswep-search').fill('zzzx-unlikely-to-match-public-source');
   await page.waitForFunction(()=>document.querySelector('#fswep-status').textContent.includes('No matching records'),null,{timeout:30000});
   assert.equal(await page.locator('#fswep-body tr').count(),0);
   await page.locator('#fswep-clear').click();
   await page.waitForFunction(()=>document.querySelector('#fswep-status').textContent.includes('72,822 of 72,822'),null,{timeout:30000});
   await page.locator('#fswep-head th button').first().click();
   assert.equal(await page.locator('#fswep-head th').first().getAttribute('aria-sort'),'ascending');
   assert.equal(errors.length,0,errors.join('; '));
   await page.goto(origin+'fswep-browser.html?lang=fr');
   assert.match(await page.locator('h1').innerText(),/Demandes de présentation/);
   assert.equal(await page.locator('html').getAttribute('lang'),'fr');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+3)) {
     throw Error('Unexpected horizontal page overflow: '+variant.name);
   }
   await context.close();
   process.stdout.write('FSWEP browser passed: '+variant.name+' (load, filter, sort, navigation, French)\n');
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;server.close();});
