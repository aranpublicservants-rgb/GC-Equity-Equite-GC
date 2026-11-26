/* Reconcile the complete Q65 branch comparison index with the retained source extracts. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{gunzipSync}=require('node:zlib');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p));
const index=json('assets/department-branch-index.json'),meta=json('assets/department-branch-definitions.json'),manifest=json('assets/branch-q65-gaps.json');
const core=new Function(read('scripts/branch-gap-core.js').toString()+';return {q65Groups,buildQ65Organization}')();
test('Every source organization and published Q65 comparison is included exactly once',()=>{
 const seen=new Set();let comparisons=0,possible=0;
 assert.deepEqual(manifest.groups,core.q65Groups(meta));
 assert.equal(manifest.question.id,'Q65');assert.equal(manifest.measure,'AGREE');
 for(const file of manifest.shards){const shard=json(file);for(const [slug,actual] of Object.entries(shard.organizations)){
  assert.ok(index[slug]);assert.ok(!seen.has(slug));seen.add(slug);
  const record=index[slug],data=JSON.parse(gunzipSync(read('data/pses-2024-branches/'+record.id+'.json.gz')));
  assert.deepEqual(actual,core.buildQ65Organization(slug,record,meta,data),slug);
  assert.equal(manifest.organizations[slug].shard,file);assert.equal(manifest.organizations[slug].comparisons,actual.rows.length);comparisons+=actual.rows.length;possible+=actual.possible;
 }}
 assert.deepEqual([...seen].sort(),Object.keys(index).sort());
 assert.equal(comparisons,manifest.totalComparisons);assert.equal(possible,manifest.totalPossible);
});
test('A published zero is retained and missing comparison percentages are excluded',()=>{
 const q=meta.questions.findIndex(x=>x.id==='Q65'),groups=core.q65Groups(meta),g=groups.find(x=>x.key==='Black'),n=3+meta.schema.indexOf('ANSCOUNT'),a=3+meta.schema.indexOf('AGREE'),y=3+meta.schema.indexOf('ANS1');
 function row(id,m,v,c){const r=[id,m.i,q,...Array(meta.schema.length).fill(9999)];r[n]=c;r[a]=r[y]=v;return r}
 const record={id:'example',count:4,branches:[{id:'200'},{id:'201'}]};
 const result=core.buildQ65Organization('example',record,meta,[row(200,g.members[0],0,10),row(200,g.members[1],15,40),row(201,g.members[0],9999,9999),row(201,g.members[1],15,40)]);
 assert.deepEqual(result.rows,[['200','Black',0,15,10,40,-15]]);
});
