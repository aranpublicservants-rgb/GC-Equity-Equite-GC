'use strict';
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+pathname);
  if(file===root||fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,b)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(b);});
 }catch{res.writeHead(400);res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const mode of [{lang:'en',options:{viewport:{width:1366,height:850}}},{lang:'fr',options:{...devices['Pixel 5']}}]){
   const ctx=await browser.newContext({...mode.options,acceptDownloads:true});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'evidence-review.html?lang='+mode.lang);
   await page.locator('.review-item').first().waitFor();
   assert.equal(await page.locator('.review-item').count(),50,'all 50 checks must render');
   assert.equal(await page.locator('.review-group').count(),5,'five areas must render');
   assert.equal(await page.locator('.review-item .item-number').first().innerText(),'01');
   await page.selectOption('#review-group','survey');
   assert.equal(await page.locator('.review-item').count(),10,'one area has ten reviews');
   await page.selectOption('#review-group','all');
   const state=page.locator('#state-01'),note=page.locator('#note-01');
   await state.selectOption('followup');
   await note.fill('=1+2');
   assert.match(await page.locator('#review-count').innerText(),/1/);
   await page.locator('#language-switch').click();
   assert.equal(await page.locator('#state-01').inputValue(),'followup','language switch must not erase selections');
   assert.equal(await page.locator('#note-01').inputValue(),'=1+2','language switch must not erase notes');
   assert.equal(await page.locator('html').getAttribute('lang'),mode.lang==='en'?'fr':'en');
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download-review').click()]);
   const csv=fs.readFileSync(await download.path(),'utf8');
   assert.ok(csv.includes('01'));
   assert.ok(csv.includes(`"'=1+2"`),'spreadsheet-formula note must be escaped in CSV');
   await page.locator('#review-query').fill('NONEXISTENT_SEARCH_TERM_XYZ');
   assert.equal(await page.locator('.review-item').count(),0);
   await page.locator('#review-query').fill('');
   assert.equal(await page.locator('.review-item').count(),50);
   await page.reload();
   await page.locator('.review-item').first().waitFor();
   assert.equal(await page.locator('#state-01').inputValue(),'unreviewed','review status cannot persist after reload');
   assert.equal(await page.locator('#note-01').inputValue(),'','private notes cannot persist after reload');
   assert.deepEqual(errors,[],'browser JS errors: '+errors.join(' | '));
   const axePath=require.resolve('axe-core');
   await page.addScriptTag({path:axePath});
   const audit=await page.evaluate(async()=>await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
   const severe=audit.violations.filter(v=>v.impact==='critical'||v.impact==='serious');
   assert.equal(severe.length,0,'severe automated accessibility violations: '+JSON.stringify(severe.map(x=>x.id)));
   await ctx.close();
   console.log('PASS '+mode.lang+': 50 rendered reviews, filters, language, safe CSV, ephemeral notes, automated accessibility');
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1);});
