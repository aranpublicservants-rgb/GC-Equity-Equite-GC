const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {matches,csvCell} = require('../cases/library.js');
const data = JSON.parse(readFileSync(new URL('../data/cases.json','file://'+__filename)));
const meta = JSON.parse(readFileSync(new URL('../cases/library-meta.json','file://'+__filename)));
test('all published records remain reachable and classified filters cover the source',()=>{
  assert.equal(data.cases.length,176);
  assert.equal(new Set(data.cases.map(c=>c.id)).size,176);
  assert.equal(data.cases.filter(c=>matches(c,{})).length,176);
  for(const c of data.cases){assert.ok(meta.routes[c.route],c.id);assert.ok(meta.scope[c.scope],c.id);assert.ok(meta.outcomes[c.status],c.id);for(const issue of c.issues||[])assert.ok(meta.issues[issue],issue);for(const ground of c.grounds||[])assert.ok(meta.grounds[ground],ground);}
  for(const [route,count] of Object.entries(data.coverage.byRoute))assert.equal(data.cases.filter(c=>matches(c,{body:route})).length,count);
});
test('combined filters stay within the requested context and search both languages',()=>{
  const found=data.cases.filter(c=>matches(c,{ground:'race',scope:'Federal public service'}));
  assert.ok(found.length>0);assert.ok(found.every(c=>c.grounds.includes('race')&&c.scope==='Federal public service'));
  assert.ok(data.cases.filter(c=>matches(c,{q:'réintégration'})).length>0);
  assert.deepEqual(data.cases.filter(c=>matches(c,{q:'réintégration'})),data.cases.filter(c=>matches(c,{q:'reintegration'})));
  assert.equal(data.cases.filter(c=>matches(c,{q:'no-record-can-match-this-89231'})).length,0);
});
test('CSV protects spreadsheet formula entry and preserves quotes and newlines',()=>{
  assert.equal(csvCell('=1+2'),'"\'=1+2"');assert.equal(csvCell('Case "A"\nline'),'"Case ""A""\nline"');
});
