'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const text=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(text('data/evidence-review-50.json'));
const html=text('evidence-review.html');
const script=text('assets/evidence-review.js');
const css=text('assets/evidence-review.css');
const dashboard=text('gc-dashboard.js');
const workspace=text('gc-workspace.js');
const homepage=text('index.html');
const groups=['source','workforce','survey','staffing','action'];
assert.equal(data.schema,1);
assert.equal(data.checks.length,50);
assert.deepEqual(data.checks.map(c=>c.id),Array.from({length:50},(_,i)=>String(i+1).padStart(2,'0')));
assert.equal(new Set(data.checks.map(c=>c.id)).size,50);
assert.deepEqual(groups.map(g=>data.checks.filter(c=>c.group===g).length),[10,10,10,10,10]);
for(const group of groups){
 assert.ok(data.groups[group].en&&data.groups[group].fr);
}
const normalized=new Set();
for(const row of data.checks){
 assert.ok(groups.includes(row.group));
 for(const locale of ['en','fr']){
  for(const field of ['title','check','action'])assert.ok(row[locale][field].length>=15, row.id+':'+locale+':'+field);
 }
 const key=row.en.title.toLowerCase();
 assert.ok(!normalized.has(key),'duplicate evidence quality check: '+key);normalized.add(key);
 assert.match(row.url,/^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.html(?:#[a-z0-9-]+)?$|^[a-z0-9-]+\/$/);
 const [name,anchor]=row.url.split('#');
 const filename=name.endsWith('/')?name+'index.html':name;
 assert.ok(fs.existsSync(path.join(root,filename)),'missing linked page: '+filename);
 if(anchor)assert.ok(text(filename).includes('id="'+anchor+'"'),'missing linked anchor: '+row.url);
 assert.ok(!/https?:\/\/|\b(?:personal|medical)\s+(?:email|address)\b/i.test(row.url));
}
for(const id of ['review-main','language-switch','review-query','review-group','review-status-filter','review-list','download-review','copy-review','clear-review','print-review','review-count','review-message']){
 assert.ok(html.includes('id="'+id+'"'),'missing UI control '+id);
}
assert.ok(homepage.includes('href="evidence-review.html"'),'main-page link absent');
assert.ok(workspace.includes("localized('evidence-review.html')"),'sitewide link absent');
assert.ok(html.includes('data-fr=')&&html.includes('data-en='),'static labels not bilingual');
assert.ok(html.includes('data-aria-fr=')&&html.includes('data-aria-en='),'navigation aria labels not bilingual');
assert.ok(html.includes('href="sources.html"'),'missing source fallback');
assert.ok(script.includes("const selected=new Map(),notes=new Map()"),'review is not in memory');
assert.ok(!/localStorage\.setItem|sessionStorage\.setItem|sendBeacon|fetch\(['"]https?:/.test(script),'review must not transmit or retain notes');
assert.ok(script.includes('aria-busy'),'loading indication removed');
assert.ok(script.includes('new URL(localHref(c.url),location.href).href'),'export lacks provenance links');
assert.ok(script.includes('function csvCell(value)'),'CSV export guard removed');
assert.ok(css.includes('prefers-reduced-motion'),'reduced-motion support removed');
assert.ok(css.includes(':focus-visible'),'keyboard indicator removed');
assert.ok(css.includes('@media print'),'print layout removed');
assert.ok(css.includes('max-width:800px'),'mobile support removed');
assert.ok(css.includes('data-theme="contrast"'),'site high-contrast support removed');
assert.ok(dashboard.includes("const quoted=v=>{let x="),'branch CSV safeguard removed');
assert.ok(dashboard.includes("quote=v=>{let x=clean(v)"),'dashboard CSV safeguard removed');
// Execute the shipped CSV escaping function itself, not a reimplementation.
const match=script.match(/function csvCell\(value\)\{[\s\S]*?\n\}/);
assert.ok(match,'CSV helper not found');
const quote=vm.runInNewContext('('+match[0]+')');
for(const bad of ['=2+3','+SUM(A1:A2)','@foo','-SUM(1,2)',' \t=HYPERLINK(1)']){
 assert.ok(quote(bad).startsWith('"\''),'formula string was not neutralized: '+bad);
}
for(const good of ['-12','-12.5','-2,4','0','12.5','Not published']){
 assert.ok(!quote(good).startsWith('"\''),'ordinary data changed: '+good);
}
assert.match(quote('a "quoted" item'),/^"a ""quoted"" item"$/);
console.log('PASS: 50 unique bilingual review checks, five areas, working links, accessible controls, ephemeral notes, and formula-safe exports');
