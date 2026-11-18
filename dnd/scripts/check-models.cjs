const assert=require('node:assert/strict'),fs=require('node:fs');
const guide=require('../guide-model.js'),tools=require('../dnd-tools.js');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8')),catalogue=json('data/catalogue.json'),facts=json('data/visuals.json'),survey=json('data/survey-summary.json'),branches=json('data/branch-summary.json');
const ids=new Set(catalogue.files.map(f=>f.id)),html=fs.readFileSync('index.html','utf8');
for(const topic of guide.topics){for(const anchor of topic.section)assert(html.includes(`id="${anchor}"`),anchor);for(const group of guide.groups)for(const file of guide.recordsFor(topic.id,group.id,facts))assert(ids.has(file.id),file.id);}
for(const v of ['X','',9999,null,undefined])assert.equal(guide.published(v),null);assert.equal(guide.published(0),0);assert.equal(guide.published(99),99);
assert.equal(guide.surveyRows(facts,survey,'harassment','ind')[2].value,8);assert.equal(guide.surveyRows(facts,survey,'harassment','black')[2].value,null);
assert.equal(guide.staffingRows(facts,'all')[0].value,16);assert.equal(guide.staffingRows(facts,'pwd')[0].value,22);
assert.equal(tools.difference(7.3,12),-4.7);assert.equal(tools.difference(13.1,17.2),-4.1);assert.equal(tools.difference('',12),null);assert.equal(tools.difference(101,12),null);assert.equal(tools.difference(0,0),0);
assert.equal(tools.requestText(),null);assert(tools.requestText({items:['Hiring'],recipient:'DND data team'}).includes('Hiring'));
assert.equal(tools.cellValue(0,'en'),'0%');assert.equal(tools.cellValue(9999,'en'),'Unavailable');
assert.equal(tools.branchRows(branches,{question:'Q42',group:branches.groups.find(g=>g.en==='Indigenous').id,view:'branches'}).length,25);
for(const file of ['app.js','guide-model.js','explore.js','dnd-tools.js','defence-sources.js'])require('node:child_process').execFileSync('node',['--check',file]);
console.log('PASS: guide source paths, distinct DND suppression, group answers, staffing measures, source markers, request drafts and arithmetic.');
