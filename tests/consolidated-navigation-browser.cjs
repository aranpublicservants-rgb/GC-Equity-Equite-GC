'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const index=read('assets/department-branch-index.json'),meta=read('assets/department-branch-definitions.json');
assert.equal(Object.keys(index).length,66);
for(const [slug,rec] of Object.entries(index)){
 assert.ok(fs.existsSync(path.join(root,slug,'index.html')),slug);
 const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'data/pses-2024-branches',rec.id+'.json.gz'))));
 assert.equal(data.length,rec.count,slug);
 assert.ok(data.every(r=>r.length>=3+meta.schema.length),slug);
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{try{let p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return}fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(b)})}catch{res.writeHead(400);res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 for(const [slug,lang,width] of [['isc','en',1366],['cra','fr',390],['agriculture-and-agri-food-canada','en',390]]){
  const context=await browser.newContext({viewport:{width,height:850}}),page=await context.newPage();
  await page.goto(base+slug+'/?lang='+lang,{waitUntil:'domcontentloaded'});const box=page.locator('#branch-results');
  await box.locator('button').click({timeout:30000});await box.locator('#gce-branch-group').waitFor({timeout:30000});
  const rec=index[slug],rows=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'data/pses-2024-branches',rec.id+'.json.gz')))),g=meta.demographics.findIndex(x=>x.en==='Black'),f=meta.schema.indexOf('MOSTPOS');
  const row=rows.find(r=>r[1]===g&&r[3+f]!==null&&r[3+f]!==''&&Number.isFinite(Number(r[3+f]))&&Number(r[3+f])>=0&&Number(r[3+f])<=100);assert.ok(row,slug);
  await box.locator('#gce-branch-group').selectOption(String(g));await box.locator('#gce-branch-question').selectOption(String(row[2]));await box.locator('#gce-branch-unit').selectOption(String(row[0]));
  const dataRow=box.locator('tbody tr').first();await dataRow.waitFor();
  assert.equal(await box.locator('tbody tr').count(),1,slug);
  assert.equal(await dataRow.locator('td').first().innerText(),Number(row[3+f]).toLocaleString(lang==='fr'?'fr-CA':'en-CA',{maximumFractionDigits:1}),slug);
  await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'accessibility-standards-canada/?lang=en',{waitUntil:'domcontentloaded'});await page.locator('#branch-results').getByText(/No separate branch-level extract/).waitFor({timeout:30000});
 await page.goto(base+'website-directory/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Number(document.getElementById('route-count').textContent.split(' ')[0])>300);await page.locator('#route-query').fill('duty to accommodate');assert.ok(await page.locator('#route-list a').count()>0);
 await page.goto(base+'youth-and-students/',{waitUntil:'domcontentloaded'});assert.ok(await page.locator('a[href="../fswep-browser.html"]').count());
 await context.close();console.log('PASS: 66 source partitions, exact Black branch cells in three departments, English/French, desktop/mobile, missing coverage, directory and youth links');
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exit(1)});
