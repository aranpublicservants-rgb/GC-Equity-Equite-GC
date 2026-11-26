// Rebuild the cross-organization Q65 comparison index from retained public branch extracts.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {runInNewContext} from 'node:vm';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x)+'\n');
const {q65Groups,buildQ65Organization}=runInNewContext((await fs.readFile('scripts/branch-gap-core.js','utf8'))+'\n;({q65Groups,buildQ65Organization})');
const [index,meta]=await Promise.all([read('assets/department-branch-index.json'),read('assets/department-branch-definitions.json')]);
const entries=Object.entries(index).sort((a,b)=>a[0].localeCompare(b[0],'en')),groups=q65Groups(meta);
const manifest={schema:1,year:meta.year,question:meta.questions.find(x=>x.id==='Q65'),measure:'AGREE',source:meta.source,sourceCsv:meta.sourceCsv,groups,organizations:{},shards:[],totalComparisons:0,totalPossible:0};
const dir='assets/branch-q65-gaps';await fs.mkdir(dir,{recursive:true});
const generated=new Map();
for(const [i,[slug,record]] of entries.entries()){
 const path=dir+'/part-'+String(Math.floor(i/10)).padStart(2,'0')+'.json';
 if(!generated.has(path))generated.set(path,{schema:1,organizations:{}});
 const data=JSON.parse(gunzipSync(await fs.readFile('data/pses-2024-branches/'+record.id+'.json.gz')).toString('utf8'));
 const result=buildQ65Organization(slug,record,meta,data);
 generated.get(path).organizations[slug]=result;
 manifest.organizations[slug]={en:record.en,fr:record.fr,shard:path,branches:result.branches,comparisons:result.rows.length,possible:result.possible};
 manifest.totalComparisons+=result.rows.length;manifest.totalPossible+=result.possible;
}
manifest.shards=[...generated.keys()];
for(const [path,data] of generated)await write(path,data);
await write('assets/branch-q65-gaps.json',manifest);
console.log('Verified',entries.length,'organizations;',manifest.totalComparisons,'published pairs out of',manifest.totalPossible,'branch/group combinations');
