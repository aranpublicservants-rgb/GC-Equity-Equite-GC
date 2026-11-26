'use strict';
/* Question 65 comparisons between employee groups in the same branch: published cells only,
   filters, downloads, links into each department's branch tool, English and French, desktop and phone. */
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const gaps=read('data/pses-2024-branch-gaps/q65.json'),index=read('assets/department-branch-index.json'),meta=read('assets/department-branch-definitions.json');
const F=name=>3+meta.schema.indexOf(name),q65=meta.questions.findIndex(q=>q.id==='Q65');
const published=v=>v!==null&&v!==undefined&&v!==''&&String(v)!=='9999'&&Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100;

/* Every row is two published source cells in the same branch, for the two groups of one pair. */
assert.equal(gaps.coverage.organizations,Object.keys(index).length);
const cache=new Map(),rowsFor=slug=>{if(!cache.has(slug))cache.set(slug,JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'data/pses-2024-branches',index[slug].id+'.json.gz')))));return cache.get(slug)};
const memberIndex=code=>meta.demographics.findIndex(d=>d.code===code);
for(const r of gaps.rows){
 const org=gaps.organizations[r[0]],branch=org.branches[r[1]],pair=gaps.pairs[r[2]],data=rowsFor(org.slug);
 const cell=code=>data.find(x=>String(x[0])===branch[0]&&x[1]===memberIndex(code)&&x[2]===q65);
 const a=cell(pair.first.code),b=cell(pair.second.code);
 assert.ok(a&&b&&published(a[F('ANS1')])&&published(b[F('ANS1')]),'both groups published: '+org.slug+' '+branch[0]+' '+pair.key);
 assert.deepEqual([r[3],r[4],r[5],r[6]],[a[F('ANS1')],a[F('ANSCOUNT')],b[F('ANS1')],b[F('ANSCOUNT')]],'exact source cells');
}
let expectedCount=0;
for(const [slug,rec] of Object.entries(index)){const data=rowsFor(slug);for(const b of rec.branches)for(const p of gaps.pairs){const get=code=>data.find(x=>String(x[0])===b.id&&x[1]===memberIndex(code)&&x[2]===q65);const a=get(p.first.code),c=get(p.second.code);if(a&&c&&published(a[F('ANS1')])&&published(c[F('ANS1')]))expectedCount++}}
assert.equal(gaps.rows.length,expectedCount,'no published comparison is missing');

const diff=r=>r[3]-r[5],pairIndex=key=>gaps.pairs.findIndex(p=>p.key===key);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.csv':'text/csv; charset=utf-8','.gz':'application/gzip'};
const server=http.createServer((req,res)=>{try{let p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root)){res.writeHead(403);res.end();return}if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(b)})}catch(e){res.writeHead(400);res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 for(const [lang,width] of [['en',1366],['fr',390]]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'branch-gaps/'+(lang==='fr'?'?lang=fr':''),{waitUntil:'domcontentloaded'});
  await page.locator('#gaps-body tr').first().waitFor({timeout:30000});
  const fmt=n=>Number(n).toLocaleString(lang==='fr'?'fr-CA':'en-CA');
  assert.equal(await page.locator('#gaps-body tr').count(),50,lang+' first page of rows');
  assert.equal(await page.locator('#status').innerText(),lang==='fr'?'50 sur '+fmt(gaps.rows.length)+' comparaisons affichées.':'Showing 50 of '+fmt(gaps.rows.length)+' comparisons.');
  /* The first row is the largest difference, with both published values and answer counts. */
  const top=gaps.rows[0],first=(await page.locator('#gaps-body tr').first().innerText()).replace(/\s+/g,' ');
  const org=gaps.organizations[top[0]],branch=org.branches[top[1]];
  for(const part of [lang==='fr'?branch[2]:branch[1],org[lang],fmt(top[3]),fmt(top[5]),fmt(top[4]),fmt(top[6]),fmt(Math.abs(diff(top)))])assert.ok(first.includes(part),lang+' first row has '+part+': '+first);
  assert.ok(gaps.rows.every((r,i)=>!i||Math.abs(diff(gaps.rows[i-1]))>=Math.abs(diff(r))),'sorted by largest difference');
  /* Filters: one pair, a minimum number of answers in each group, and which group is higher. */
  await page.locator('#f-pair').selectOption('Black');await page.locator('#f-min').selectOption('50');
  const black=gaps.rows.filter(r=>r[2]===pairIndex('Black')&&r[4]>=50&&r[6]>=50);
  assert.equal(await page.locator('#gaps-body tr').count(),Math.min(50,black.length),lang+' Black rows with 50 or more answers');
  assert.ok((await page.locator('#status').innerText()).includes(fmt(black.length)));
  assert.ok(page.url().includes('pair=Black')&&page.url().includes('min=50'),'filters kept in the address');
  await page.locator('#f-higher').selectOption('second');
  const second=black.filter(r=>diff(r)<0);
  assert.equal(await page.locator('#gaps-body tr').count(),second.length,lang+' comparison group higher');
  const higherTexts=await page.locator('#gaps-body tr td:last-child span').allInnerTexts();
  assert.ok(higherTexts.every(t=>t.includes(gaps.pairs[pairIndex('Black')].second[lang])),lang+' higher group label');
  /* The overview follows the organization and minimum answers. */
  const overview=await page.locator('#overview-body tr').nth(pairIndex('Black')).locator('td').allInnerTexts(),higherFirst=black.filter(r=>diff(r)>0).length;
  assert.deepEqual([overview[0],overview[1].split(/\s*:\s*/).pop(),overview[2].split(/\s*:\s*/).pop(),overview[3]],[fmt(black.length),fmt(higherFirst),fmt(second.length),fmt(black.length-higherFirst-second.length)],lang+' overview counts');
  /* One organization, all pairs, then show more. */
  await page.locator('#reset').click();await page.locator('#f-org').selectOption('isc');
  const isc=gaps.rows.filter(r=>gaps.organizations[r[0]].slug==='isc');
  assert.equal(await page.locator('#gaps-body tr').count(),Math.min(50,isc.length),lang+' ISC rows');
  if(isc.length>50){await page.locator('#more').click();assert.equal(await page.locator('#gaps-body tr').count(),Math.min(100,isc.length),lang+' show more')}
  const download=page.waitForEvent('download');await page.locator('#download').click();const file=await download;const csv=fs.readFileSync(await file.path(),'utf8');
  assert.ok(csv.startsWith('\ufefforganization_en,'),'selection CSV header');assert.equal(csv.trim().split(/\r\n/).length,isc.length+1,lang+' selection CSV rows');
  /* No made-up or missing values, no em dash, no page overflow. */
  const main=await page.locator('main').innerText();
  assert.ok(!/\b(NaN|undefined|null|Infinity)\b/.test(main),lang+' no invalid values');assert.ok(!main.includes('—'),lang+' no em dash');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),lang+' no page-width overflow');
  /* A branch link opens the same comparison in the department's branch tool. */
  await page.locator('#reset').click();await page.locator('#f-pair').selectOption('Racialized');await page.locator('#f-min').selectOption('20');
  const target=new URL(await page.locator('#gaps-body tr th a').first().getAttribute('href'),page.url()),slug=target.pathname.split('/').filter(Boolean).pop();
  assert.equal(target.searchParams.get('branch-question'),'Q65');assert.equal(target.searchParams.get('branch-group'),'Racialized');assert.equal(target.hash,'#branch-results');assert.equal(target.searchParams.get('lang'),lang==='fr'?'fr':null);
  const pick=gaps.rows.find(r=>r[2]===pairIndex('Racialized')&&gaps.organizations[r[0]].slug===slug&&gaps.organizations[r[0]].branches[r[1]][0]===target.searchParams.get('branch'));assert.ok(pick&&pick[4]>=20&&pick[6]>=20,lang+' linked row is in the selection');
  const pickBranch=gaps.organizations[pick[0]].branches[pick[1]];
  await Promise.all([page.waitForURL(u=>u.pathname.endsWith('/'+slug+'/')),page.locator('#gaps-body tr th a').first().click()]);
  const box=page.locator('#branch-results');await box.locator('#gce-branch-output tbody tr').first().waitFor({timeout:60000});
  assert.equal(await box.locator('#gce-branch-question').inputValue(),String(q65),lang+' linked question');
  assert.equal(await box.locator('#gce-branch-group').inputValue(),'Racialized',lang+' linked group');
  assert.equal(await box.locator('#gce-branch-unit').inputValue(),pickBranch[0],lang+' linked branch');
  const headers=await box.locator('thead th').allInnerTexts(),col=headers.indexOf(lang==='fr'?'Les plus négatives (%)':'Most negative (%)');
  const cells=[await box.locator('#gce-branch-output tbody tr').nth(0).locator('th,td').allInnerTexts(),await box.locator('#gce-branch-output tbody tr').nth(1).locator('th,td').allInnerTexts()];
  assert.equal(cells[0][col],fmt(pick[3]),lang+' linked first group value');assert.equal(cells[1][col-1],fmt(pick[5]),lang+' linked second group value');
  const back=box.locator('#gce-branch-gaps-link');assert.ok((await back.getAttribute('href')).includes('branch-gaps/?pair=Racialized'),lang+' link back to the list');
  assert.deepEqual(errors,[],lang+' page errors');
  await context.close();
 }
 console.log('PASS: '+gaps.rows.length+' question 65 comparisons from published cells, filters, overview, downloads and branch links in English and French, desktop and phone');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exit(1)});
