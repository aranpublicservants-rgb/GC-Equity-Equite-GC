// Rebuild static GC Equity findings and multilingual search vectors from the retained public data.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x)+'\n');
const clean=x=>String(x??'').replace(/\s+/g,' ').trim();
const embedText=d=>'passage: '+clean([d.en,d.fr,d.text,d.textFr].join(' ')).slice(0,2200);
const percent=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=100?Number(x):null;
const count=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&!['9999','-1','X','x','*','—'].includes(String(x))&&Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
const registry=await read('assets/department-pages.json'),idx=await read('assets/department-profile-index.json');
const findings={schema:1,period:idx.period,sources:idx.sources,definitions:idx.definitions,organizations:{}};
for(const org of registry.organizations){
 const entry=idx.organizations[org.en];
 const result={en:org.en,fr:org.fr,status:'not-indexed',groups:{}};
 findings.organizations[org.id]=result;
 if(!entry?.path)continue;
 const profile=JSON.parse(gunzipSync(Buffer.from((await fs.readFile(entry.path,'utf8')).trim(),'base64')).toString('utf8'));
 if(profile.organization!==org.en)throw Error('Organization mismatch: '+org.en);
 result.status='indexed';
 for(const [key,group] of Object.entries(profile.groups||{})){
  const rows=[];
  for(const [q,cell] of Object.entries(group.questions||{})){
   const overall=profile.overall?.[q];
   const v=percent(cell?.[0]),o=percent(overall?.[0]);
   if(!idx.definitions[q]||v===null||o===null)continue;
   rows.push({q,v,o,n:count(cell?.[1]),overallN:count(overall?.[1]),gap:Math.round((v-o)*100)/100});
  }
  result.groups[key]={fr:group.fr||key,rows:rows.sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap)||a.q.localeCompare(b.q)).slice(0,3),comparable:rows.length};
 }
}
await write('assets/department-key-findings.json',findings);
console.log('Built findings for',Object.keys(findings.organizations).length,'registered organizations');
if(process.argv.includes('--findings-only'))process.exit(0);
const {pipeline}=await import('@huggingface/transformers');
const model='Xenova/multilingual-e5-small';
const pipe=await pipeline('feature-extraction',model,{dtype:'q8',device:'cpu'});
const index=await read('assets/search-index.json');
const docs=index.docs.filter(d=>d.id&&d.url&&!/^(?:https?:)?\/\//i.test(d.url)&&!/(?:^|\/)(?:racialized-executives|communities\/filipino|youth)(?:\/|$)/i.test(d.url));
const rows=[];
for(let i=0;i<docs.length;i+=16){
 const batch=docs.slice(i,i+16),texts=batch.map(embedText);
 const out=await pipe(texts,{pooling:'mean',normalize:true});
 const size=out.dims.at(-1);
 for(let j=0;j<batch.length;j++)rows.push({id:batch[j].id,url:batch[j].url,text:texts[j],vector:Array.from(out.data.slice(j*size,(j+1)*size),x=>Math.round(x*100000)/100000)});
}
await write('assets/semantic-vectors.json',{schema:1,model,rows});
console.log('Built',rows.length,'semantic vectors');
