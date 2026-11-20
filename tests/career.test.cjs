'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../career-development/content.js'),M=require('../career-development/model.js'),V=require('../career-development/view.js'),R=require('../career-development/sources.js');
test('casual workers, students and external candidates get application steps for a move',()=>{
 for(const status of ['casual','student','external']){
  const result=M.guide('move',status);
  assert.equal(result.section,'applications');assert(result.sources.includes('jobs'));assert(!result.sources.includes('assignment'));
 }
 assert(M.guide('move','employee').sources.includes('assignment'));
 assert(M.guide('move','agency').sources.includes('deployment'));
 for(const goal of C.goals)for(const status of C.statuses){const g=M.guide(goal.id,status.id);assert(g.steps.length);for(const id of g.sources)assert(R.some(r=>r.id===id),id);assert(g.note.en&&g.note.fr);}
});
test('calendar-day planning survives leap days, DST and year changes',()=>{
 assert.equal(M.datePlus('2026-11-20',90),'2027-02-18');
 assert.equal(M.datePlus('2028-02-28',1),'2028-02-29');
 assert.equal(M.datePlus('2026-03-01',30),'2026-03-31');
 assert.equal(M.datePlus('2026-11-01',30),'2026-12-01');
 assert.equal(M.datePlus('2026-02-30',30),'');assert.equal(M.datePlus('',90),'');
});
test('CSV exports preserve quotes and lines and neutralize spreadsheet formula input',()=>{
 const out=M.csv([['=HYPERLINK("bad")',' +123','@SUM(1)','a,b','two\nlines','"quoted"']]);
 assert(out.startsWith('\ufeff'));assert(out.includes('"\'=HYPERLINK(""bad"")"'));assert(out.includes('"\' +123"'));assert(out.includes('"\'@SUM(1)"'));assert(out.includes('"two\nlines"'));assert(out.includes('""quoted""'));
 const p={goal:'My goal',start:'2026-11-20',review:'2027-02-18',notes:'My notes',actions:[]};
 assert(M.planCsv(p,'en').includes('My goal'));assert(M.planCsv(p,'fr').includes('My notes'));
});
test('resources have paired language URLs and search handles French accents',()=>{
 assert.equal(R.length,26);assert.equal(new Set(R.map(r=>r.id)).size,R.length);
 for(const r of R){assert(r.url.en.startsWith('https://'));assert(r.url.fr.startsWith('https://'));assert.notEqual(r.url.en,r.url.fr);assert(r.title.en&&r.title.fr&&r.desc.en&&r.desc.fr);assert.equal(r.reviewed,'2026-11-20');}
 assert(M.filterResources(R,'evaluation langue','languages').some(r=>r.id==='sle'));
 assert.deepEqual(M.filterResources(R,'','all',true,['bridging']).map(r=>r.id),['bridging']);
});
test('drafts preserve the visitor text and never invent missing experience',()=>{
 assert.equal(M.evidenceText({criterion:'Project management'},'en'),'Qualification or skill\nProject management');
 assert.equal(M.evidenceText({},'fr'),'');
 const s={lang:'fr',large:false,contrast:false,guide:{goal:null,status:'casual'},routeFilter:'all',routeView:'cards',search:'',topic:'all',savedOnly:false,showAll:true,saved:[],saveWork:false,evidence:{situation:'<img src=x onerror=alert(1)>'},template:{kind:'learning',topic:'<script>alert(1)</script>'},plan:{goal:'" onfocus="bad',start:'2026-11-20',review:'2027-02-18',notes:'',actions:[]}};
 const html=V.page(s);assert(!html.includes('<img src=x'));assert(!html.includes('<script>alert(1)</script>'));assert(html.includes('&lt;img'));assert(html.includes('Dans cette page'));assert(html.includes('Mon objectif'));assert(!html.includes('Your starting points'));
});
test('published English and French pages contain guidance and local assets without JavaScript',()=>{
 for(const [file,lang] of [['index.html','en'],['index-fr.html','fr']]){
  const html=fs.readFileSync(path.join(__dirname,'../career-development',file),'utf8');
  assert(html.includes('<html lang="'+lang+'"'));assert(html.includes('class="no-js"'));
  assert(html.includes(C.ui.title[lang]));assert(html.includes('id="resources"'));
  const ids=[...html.matchAll(/\bid="([^\"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
  for(const [,asset] of html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css|svg))"/g))assert(fs.existsSync(path.join(__dirname,'../career-development',asset)),asset);
  for(const r of R)assert(html.includes(r.url[lang]),r.id);
  assert(!html.includes('—'));assert(!/cdn\.tailwindcss|api\.openai|mailto:/.test(html));
 }
});
