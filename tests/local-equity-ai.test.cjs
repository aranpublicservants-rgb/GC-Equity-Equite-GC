/* Test the exact checked-in findings, routing and briefing code without model downloads. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=p=>JSON.parse(read(p));
const registry=json('assets/department-pages.json'),index=json('assets/department-profile-index.json'),manifest=json('assets/department-key-findings.json');
const core=new Function(read('scripts/equity-findings-core.js')+';return {decodeProfile,matchSource,buildFinding}')();
const shards=new Map();
function shard(p){if(!shards.has(p))shards.set(p,json(p));return shards.get(p)}
const base='https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/';
function api(lang='en'){
 const document={currentScript:{src:base+'gc-built-in-ai.js'},documentElement:{lang}};
 const src=read('gc-built-in-ai.js'),body=src.slice(src.indexOf('(()=>'),src.indexOf('window.GCEBuiltIn='))+'return {lexical,route,percent,count,prompt,keyFindingData,dot};})();';
 return new Function('window','document','URL','location','fetch','return '+body)({},document,URL,new URL(base),async u=>{const f=u.pathname.slice(new URL(base).pathname.length);try{return {ok:true,json:async()=>json(f)}}catch{return{ok:false,status:404}}});
}
test('Every indexed source profile maps uniquely or through an explicit alias',()=>{
 const seen=new Set();for(const org of registry.organizations){const s=core.matchSource(org,index);if(!s){assert.equal(manifest.organizations[org.id],undefined);continue}seen.add(s);assert.equal(manifest.organizations[org.id].sourceName,s)}
 assert.deepEqual([...seen].sort(),Object.keys(index.organizations).sort());
});
test('Every generated finding exactly matches the underlying source, including suppression and counts',()=>{
 const decoded=new Map();
 for(const org of registry.organizations){const m=manifest.organizations[org.id];if(!m)continue;if(!decoded.has(m.sourceName))decoded.set(m.sourceName,core.decodeProfile(read(index.organizations[m.sourceName].path)));const actual=shard(m.shard).organizations[org.id];assert.deepEqual(actual,core.buildFinding(org,decoded.get(m.sourceName),index,m.sourceName));}
});
test('English and French plain-language routing and no suppressed values treated as zero',()=>{
 const a=api();
 for(const [q,want] of [['my boss will not let me work from home','duty-to-accommodate/'],['mon gestionnaire refuse le télétravail','duty-to-accommodate/'],['I want to file a grievance','recourse/'],['je veux déposer un grief','recourse/'],['my interview was unfair','career-development/'],['formation linguistique','career-development/'],['psychological safety','racism-hazard-prevention/'],['comparer mon ministère','organizations.html']]){
  assert.equal(a.route.map(d=>[d.url,a.lexical(d,q)]).sort((x,y)=>y[1]-x[1])[0][0],want,q);
 }
 for(const v of ['','X','9999','-1',null,undefined])assert.equal(a.percent(v),null);
 assert.equal(a.percent('0'),0);assert.equal(a.count('9999'),null);assert.equal(a.dot([1,0],[0,1]),0);
});
test('Briefing prompts preserve exact numbers and official sources in both languages',()=>{
 for(const lang of ['en','fr']){const p=api(lang).prompt({title:'2024 PSES',rows:[['Group','37'],['Overall','25'],['Suppressed','X']],sources:['https://www.canada.ca/'],url:base});assert.match(p,/37/);assert.match(p,/25/);assert.match(p,/https:\/\/www.canada.ca\//);assert.match(p,/Suppressed\s+X/);assert.match(p,lang==='fr'?/valeurs manquantes ou supprimées/:/Missing or suppressed values/);}
});
test('Department browser loader reads current manifest and a missing-profile boundary',async()=>{
 const a=api();
 for(const id of ['isc','cra','communications-security-establishment']){const m=manifest.organizations[id];assert.ok(m);const x=await a.keyFindingData(id);assert.deepEqual(x.org,shard(m.shard).organizations[id]);}
 const missing=registry.organizations.find(o=>!manifest.organizations[o.id]);const y=await a.keyFindingData(missing.id);assert.equal(y.org.status,'not-indexed');assert.deepEqual(y.org.groups,{});
});
test('Published page index contains unique IDs and titles',()=>{
 const x=json('assets/local-search-pages.json');assert.ok(x.docs.length);assert.equal(new Set(x.docs.map(d=>d.id)).size,x.docs.length);for(const d of x.docs)assert.ok(d.en||d.fr);
});
