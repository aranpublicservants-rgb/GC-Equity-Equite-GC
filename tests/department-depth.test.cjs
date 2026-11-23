'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const registry=JSON.parse(read('assets/department-pages.json'));
const source=JSON.parse(read('data/recourse-case-index-2026-11.json'));
const ex=JSON.parse(read('data/executive-levels-2025-national.json'));
const app=read('assets/department-depth.js');
const missing=read('assets/department-completeness.js');
const page=read('assets/department-page.js');
const index=JSON.parse(read('assets/department-profile-index.json'));
assert.equal(source.records.length,176,'entire reviewed source-index coverage');
assert.equal(source.lastPrepared,'2026-11-18');
assert.equal(source.records.filter(c=>c.scope==='Not an employment dispute').length,8);
assert.ok(source.records.every(x=>x.id&&x.title&&x.citation&&/^https:\/\//.test(x.url)));
assert.ok(app.includes("c.scope==='Federal public service'"),'program-delivery cases must not be employment matches');
assert.ok(app.includes('recourse-case-index-2026-11.json'),'locally retained source index');
assert.ok(!app.includes('fetch("https://aranpublicservants-rgb.github.io/aran-raar/recourse/data/cases.json")'),'do not require cross-site fetch');
assert.equal(ex.rows.length,6);
assert.deepEqual(ex.rows.map(x=>x.level),['EX-01','EX-02','EX-03','EX-04','EX-05','EX and LC total']);
for(let j=0;j<ex.rows[0].values.length;j++){
 const sum=ex.rows.slice(0,5).reduce((n,r)=>n+(j===0||j%2===1?r.values[j]:0),0);
 if(j===0||j%2===1)assert.equal(sum,ex.rows[5].values[j],'national EX headcount sum '+j);
}
assert.equal(ex.asOf,'2025-03-31');
assert.ok(/not department-specific/i.test(ex.population));
assert.ok(ex.source.startsWith('https://www.canada.ca/'));
for(const n of ['Fisheries and Oceans Canada','National Defence','Indigenous Services Canada']){
 const entry=index.organizations[n];
 assert.ok(entry&&entry.overallQuestions===27&&entry.groups>0&&entry.path.endsWith('.gz.b64'),n);
}
assert.ok(app.includes('function exportSurvey()'),'CSV export missing');
assert.ok(app.includes('function csvCell(value)'),'spreadsheet safety missing');
assert.ok(app.includes('function shareView()'),'shareable view missing');
assert.ok(app.includes('function executives()'),'official executive reference missing');
assert.ok(app.includes("profile?.groups?.[k]?.fr"),'French group label fallback missing');
assert.ok(app.includes('data/executive-levels-2025-national.json'),'2025 national reference not wired');
assert.ok(app.includes('27-question employee group table'),'27-question table semantics missing');
assert.ok(app.includes('<caption>'),'data table captions missing');
const headings=['who-works','experience','harassment','accommodation','hiring','branches','promised','planned','accessibility-plan','recourse'];
for(const s of headings){assert.ok(missing.includes("'"+s+"':["),'missing bilingual coverage category: '+s);}
assert.ok(missing.includes('aria-labelledby')&&missing.includes('aria-current'));
assert.ok(missing.includes('new CustomEvent('));
assert.ok(page.includes('department-completeness.js'));
assert.ok(!missing.includes('localStorage')&&!missing.includes('sessionStorage'),'no private form history');
const generated=registry.organizations.filter(x=>!x.specialized&&!registry.redirects?.[x.id]);
assert.ok(generated.length>220);
for(const x of generated){
 const html=read(x.path+'index.html');
 assert.ok(html.includes('assets/department-page.js'),'missing shared module '+x.path);
 assert.ok(html.includes('id="dp-data"'),'missing source-isolated profile '+x.path);
}
console.log('PASS: 176 source-linked cases, 2025 national EX counts, specialist 27-question extracts, 10 missing-evidence sections, '+generated.length+' generated pages and safe exports');
