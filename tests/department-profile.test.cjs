const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),M=require('../gc-department-profile.js');
global.document={documentElement:{lang:'en'}};
const root=path.join(__dirname,'..'),model=JSON.parse(fs.readFileSync(path.join(root,'assets/workspace-data.json'))),series=JSON.parse(fs.readFileSync(path.join(root,'data/tbs-departmental-representation-2017-2025.json')));
const norm=s=>String(s).replace(/[^a-z]/gi,'').toLowerCase(),D={model,series};
const findEntry=(o,n)=>M.sameEntry(o,n,norm),context=name=>({name,norm,D,findEntry,group:'all'});
for(const value of [null,undefined,'','X','x','9999','-1','suppressed','not published'])assert.equal(M.published(value),null);
assert.equal(M.published('0'),0);assert.equal(M.published('12.4'),12.4);
for(const name of Object.keys(series.orgs).filter(n=>n!=='Public Service')){
 const c=context(name);for(const row of M.representationRows(c)){
  if(row.key!=='w')assert.equal(row.share,M.published(series.orgs[name][row.key]?.['2025']?.[2]));
  if(row.key==='b')assert.equal(row.availability,null);
  if(row.gap!==null)assert.equal(row.gap,Math.round((row.share-row.availability)*100)/100);
 }
}
const unrelated=context('An organization without data');assert.deepEqual(M.representationRows(unrelated),[]);assert.deepEqual(M.findings(unrelated),[]);
assert.equal(M.cell({overall:{Q65:['4','100']},groups:{Black:{questions:{Q65:['0','15']}}}},'b','Q65')[0],'0');
assert.equal(M.cell({overall:{Q65:['4','100']},groups:{}},'b','Q65'),null);
const isc=M.representationRows(context('Indigenous Services Canada')),dfo=M.representationRows(context('Fisheries and Oceans Canada'));assert.notDeepEqual(isc,dfo);
console.log('PASS: every workforce chart uses its employer, missing groups never fall back, gap arithmetic, suppression and zero');
