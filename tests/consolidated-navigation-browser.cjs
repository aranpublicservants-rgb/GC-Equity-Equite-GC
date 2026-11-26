'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const index=read('assets/department-branch-index.json'),meta=read('assets/department-branch-definitions.json');
const rowsFor=slug=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'data/pses-2024-branches',index[slug].id+'.json.gz'))));
assert.equal(Object.keys(index).length,66);
for(const [slug,rec] of Object.entries(index)){
 assert.ok(fs.existsSync(path.join(root,slug,'index.html')),slug);
 const data=rowsFor(slug);
 assert.equal(data.length,rec.count,slug);
 assert.ok(data.every(r=>r.length>=3+meta.schema.length),slug);
}
const F=name=>3+meta.schema.indexOf(name);
const ok=(v,percent=true)=>v!==null&&v!==undefined&&v!==''&&String(v)!=='9999'&&Number.isFinite(Number(v))&&Number(v)>=0&&(!percent||Number(v)<=100);
const summary=['MOSTPOS','NEUTRAL','MOSTNEG','AGREE','SCORE100'];
const published=r=>!!r&&summary.some(f=>ok(r[F(f)],f!=='SCORE100'));
const members=key=>meta.demographics.map((d,i)=>[d,i]).filter(([d])=>d.category===key).sort((a,b)=>Number(a[0].code.split('=')[1])-Number(b[0].code.split('=')[1])).map(([,i])=>i);
const order=['Racialized','Indigenous','Black','Persons with disability','2SLBGTQIA+','Woman','Executives','Middle Managers','First official language'];
const q65=String(meta.questions.findIndex(q=>q.id==='Q65'));
/* The same default rule as the widget: racialized and non-racialized employees, else the first pair with a published comparison. */
function expectedPair(rows){
 for(const key of order){const m=members(key),seen=new Map();for(const r of rows){if(String(r[2])!==q65||!m.includes(r[1])||!published(r))continue;const s=(seen.get(r[0])||new Set()).add(r[1]);seen.set(r[0],s);if(s.size===m.length)return key}}
 return 'Racialized';
}
const fmt=(v,lang)=>Number(v).toLocaleString(lang==='fr'?'fr-CA':'en-CA',{maximumFractionDigits:1});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{try{let p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return}fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(b)})}catch{res.writeHead(400);res.end()}});
async function cellText(box,rowLocator,label){
 const headers=await box.locator('thead th').allInnerTexts();const col=headers.indexOf(label);assert.ok(col>1,'missing column '+label);
 const cells=await rowLocator.locator('th,td').allInnerTexts();
 /* The first row of each branch starts with the branch header (rowspan), the second row does not. */
 return cells.length===headers.length?cells[col]:cells[col-1];
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 // Selecting a topic before a department must open the requested section in the current language.
 for(const [name,slug,language,topic,anchor,width] of [
  ['Indigenous Services Canada','isc','en','branches','branches',1366],
  ['National Defence','dnd','fr','branches','secteurs',390],
  ['Fisheries and Oceans Canada','dfo','fr','commitments','promesses',390],
  ['Accessibility Standards Canada','accessibility-standards-canada','en','branches','missing',1366],
  ['Health Canada','health-canada','en','staffing','hiring',1366]
 ]){
  const context=await browser.newContext({viewport:{width,height:850}}),page=await context.newPage();
  await page.goto(base+'?lang='+language,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(name=>Array.from(document.querySelector('#org-picker').options).some(o=>o.value===name),name,{timeout:60000});
  await page.locator('#org-topic-picker').selectOption(topic);
  if(slug==='isc')await page.locator('#org-group-picker').selectOption('b');
  await Promise.all([page.waitForURL(u=>u.pathname==='/'+slug+'/'&&u.hash==='#'+anchor,{timeout:30000}),page.locator('#org-picker').selectOption(name)]);
  await page.locator('#'+anchor).waitFor({state:'visible',timeout:30000});
  assert.equal(new URL(page.url()).searchParams.get('lang'),language,slug+' topic navigation language');
  if(slug==='isc'){
   assert.equal(new URL(page.url()).searchParams.get('brpair'),'Black');
   await page.locator('#branch-results').scrollIntoViewIfNeeded();
   await page.locator('#gce-branch-output tbody tr').first().waitFor({timeout:60000});
   assert.equal(await page.locator('#gce-branch-group').inputValue(),'Black','homepage employee group retained in branch widget');
  }
  await context.close();
 }
 for(const [slug,lang,width] of [['isc','en',1366],['cra','fr',390],['agriculture-and-agri-food-canada','en',390]]){
  const context=await browser.newContext({viewport:{width,height:850}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+slug+'/?lang='+lang,{waitUntil:'domcontentloaded'});const box=page.locator('#branch-results');
  await box.waitFor({timeout:30000});await box.scrollIntoViewIfNeeded();
  /* Opening the section loads the results and shows the default comparison without any selection. */
  await box.locator('#gce-branch-output tbody tr').first().waitFor({timeout:60000});
  const rec=index[slug],rows=rowsFor(slug),pair=expectedPair(rows),m=members(pair);
  assert.equal(await box.locator('#gce-branch-question').inputValue(),q65,slug+' default question');
  assert.equal(await box.locator('#gce-branch-group').inputValue(),pair,slug+' default group');
  assert.equal(await box.locator('#gce-branch-unit').inputValue(),'',slug+' default branch');
  assert.equal(await box.locator('#gce-branch-output tbody').count(),rec.branches.length,slug+' one row group per branch');
  assert.equal(await box.locator('#gce-branch-output tbody tr').count(),rec.branches.length*m.length,slug+' two rows per branch');
  const label=lang==='fr'?'Les plus négatives (%)':'Most negative (%)';
  const cell=rows.find(r=>String(r[2])===q65&&r[1]===m[0]&&ok(r[F('MOSTNEG')]));assert.ok(cell,slug);
  await box.locator('#gce-branch-unit').selectOption(String(cell[0]));
  assert.equal(await box.locator('#gce-branch-output tbody tr').count(),m.length,slug+' selected branch');
  assert.equal(await cellText(box,box.locator('#gce-branch-output tbody tr').first(),label),fmt(cell[F('MOSTNEG')],lang),slug+' exact default cell');
  /* An exact Black cell for another question. */
  const g=meta.demographics.findIndex(x=>x.en==='Black'),f=F('MOSTPOS');
  const row=rows.find(r=>r[1]===g&&ok(r[f]));assert.ok(row,slug);
  await box.locator('#gce-branch-group').selectOption('Black');await box.locator('#gce-branch-question').selectOption(String(row[2]));await box.locator('#gce-branch-unit').selectOption(String(row[0]));
  const blackRow=box.locator('#gce-branch-output tbody tr').nth(members('Black').indexOf(g));
  assert.equal(await cellText(box,blackRow,lang==='fr'?'Les plus positives (%)':'Most positive (%)'),fmt(row[f],lang),slug+' exact Black cell');
  /* A suppressed or missing cell displays as unavailable, never as zero. */
  const hidden=rows.find(r=>!published(r)&&rows.some(o=>o[2]===r[2]&&published(o)));
  if(hidden){
   const key=meta.demographics[hidden[1]].category;
   await box.locator('#gce-branch-group').selectOption(key);await box.locator('#gce-branch-question').selectOption(String(hidden[2]));await box.locator('#gce-branch-unit').selectOption(String(hidden[0]));
   const target=box.locator('#gce-branch-output tbody tr').nth(members(key).indexOf(hidden[1]));
   const values=(await target.locator('td').allInnerTexts()).slice(0,-1);
   assert.ok(values.length&&values.every(v=>v===(lang==='fr'?'Indisponible':'Unavailable')),slug+' suppressed cell shown as unavailable: '+values.join('|'));
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),slug+' no page-width overflow');
  assert.deepEqual(errors,[],slug+' page errors');
  await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'accessibility-standards-canada/?lang=en',{waitUntil:'domcontentloaded'});await page.locator('#branch-results').getByText(/No separate branch-level extract/).waitFor({timeout:30000});
 await page.goto(base+'website-directory/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Number(document.getElementById('route-count').textContent.split(' ')[0])>300);await page.locator('#route-query').fill('duty to accommodate');assert.ok(await page.locator('#route-list a').count()>0);
 assert.ok(!(await page.locator('main').innerText()).includes('—'),'no em dash in the directory');
 await page.goto(base+'youth-and-students/',{waitUntil:'domcontentloaded'});assert.ok(await page.locator('a[href="../fswep-browser.html"]').count());
 await context.close();console.log('PASS: 66 source partitions, default comparison on open, exact and suppressed branch cells in three departments, English/French, desktop/mobile, missing coverage, directory and youth links');
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exit(1)});
