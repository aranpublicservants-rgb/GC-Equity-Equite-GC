// Build reproducible public-data artifacts independently of optional neural inference.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {runInNewContext} from 'node:vm';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,x)=>fs.writeFile(p,JSON.stringify(x)+'\n');
const clean=x=>String(x??'').replace(/\s+/g,' ').trim();
const embedText=d=>'passage: '+clean([d.en,d.fr,d.text,d.textFr].join(' ')).slice(0,2200);
const registry=await read('assets/department-pages.json'),idx=await read('assets/department-profile-index.json');
const mode=process.argv[2]||'--all';
if(!['--all','--findings-only','--pages-only','--vectors-only'].includes(mode))throw Error('Unknown build mode');
if(mode==='--all'||mode==='--findings-only'){
 const {matchSource,buildFinding}=runInNewContext((await fs.readFile('scripts/equity-findings-core.js','utf8'))+'\n;({matchSource,buildFinding})');
 const manifest={schema:2,period:idx.period,sources:idx.sources,definitions:idx.definitions,organizations:{},registered:registry.organizations.length};
 const matches=registry.organizations.map(o=>({o,name:matchSource(o,idx)})).filter(x=>x.name);
 const shards=new Map();
 await fs.mkdir('assets/department-key-findings',{recursive:true});
 for(const [i,{o,name}] of matches.entries()){
  const path='assets/department-key-findings/part-'+String(Math.floor(i/10)).padStart(2,'0')+'.json';
  const profile=JSON.parse(gunzipSync(Buffer.from((await fs.readFile(idx.organizations[name].path,'utf8')).trim(),'base64')).toString('utf8'));
  const result=buildFinding(o,profile,idx,name);
  manifest.organizations[o.id]={sourceName:name,shard:path};
  if(!shards.has(path))shards.set(path,{schema:2,organizations:{}});
  shards.get(path).organizations[o.id]=result;
 }
 for(const [path,data] of shards)await write(path,data);
 await write('assets/department-key-findings.json',manifest);
 console.log('Built',matches.length,'directory mappings covering',new Set(matches.map(x=>x.name)).size,'source profiles');
 if(mode==='--findings-only')process.exit(0);
}
const index=await read('assets/search-index.json');
const orgDoc=o=>({id:'org-local-'+o.id,url:o.path,en:o.en,fr:o.fr,text:'Departmental profile: representation, staffing, PSES, employee groups, branches and commitments.',textFr:'Profil ministériel : représentation, dotation, SAFF, groupes, directions et engagements.'});
const base=new URL('https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/');
let publicPages;
if(mode==='--all'||mode==='--pages-only'){
const {load}=await import('cheerio');
publicPages=[];
const sitemap=await fs.readFile('sitemap.xml','utf8');
for(const [,location] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)){
 let u;try{u=new URL(location)}catch{continue}
 if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname)||/\/(?:racialized-executives|communities\/filipino|youth)(?:\/|$)/i.test(u.pathname))continue;
 const relative=decodeURIComponent(u.pathname.slice(base.pathname.length));
 if(relative.includes('..')||relative.startsWith('/'))continue;
 const file=relative.endsWith('/')||!relative?relative+'index.html':relative;
 if(registry.organizations.some(o=>o.path===relative))continue;
 if(!file.endsWith('.html'))continue;
 let html;try{html=await fs.readFile(file,'utf8')}catch{continue}
 const $=load(html);if($('meta[http-equiv="refresh" i]').length)continue;
 $('script,style,nav,footer,template,noscript').remove();
 const title=clean($('title').first().text()||$('h1').first().text());if(!title)continue;
 const first=clean($('main').first().text()||$('body').text()).slice(0,1500);
 const en=clean($('h1[data-en]').first().attr('data-en')||$('h1[data-gce-en]').first().attr('data-gce-en')||$('h1[data-label-en]').first().attr('data-label-en')||title);
 const fr=clean($('h1[data-fr]').first().attr('data-fr')||$('h1[data-gce-fr]').first().attr('data-gce-fr')||$('h1[data-label-fr]').first().attr('data-label-fr')||title);
 const desc=clean($('meta[name="description"]').attr('content')||'');
 publicPages.push({id:'page-local-'+file,url:relative||'./',en,fr,text:desc+' '+first,textFr:clean($('main [lang="fr"],main #lang-fr').text()).slice(0,1200)});
}
await write('assets/local-search-pages.json',{schema:1,docs:publicPages});

if(mode==='--pages-only')process.exit(0);
}else{publicPages=(await read('assets/local-search-pages.json')).docs;}
const {pipeline}=await import('@huggingface/transformers');
const model='Xenova/multilingual-e5-small';
const pipe=await pipeline('feature-extraction',model,{dtype:'q8',device:'cpu'});
const docs=[...registry.organizations.map(orgDoc),...index.docs,...publicPages].filter(d=>{try{const u=new URL(d.url,base);return d.id&&u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&!(/\/(?:racialized-executives|communities\/filipino|youth)(?:\/|$)/i.test(u.pathname))}catch{return false}});
const rows=[];
for(let i=0;i<docs.length;i+=8){
 const batch=docs.slice(i,i+8),texts=batch.map(embedText);
 const out=await pipe(texts,{pooling:'mean',normalize:true});
 const size=out.dims.at(-1);
 for(let j=0;j<batch.length;j++)rows.push({id:batch[j].id,url:batch[j].url,text:texts[j],vector:Array.from(out.data.slice(j*size,(j+1)*size),x=>Math.round(x*100000)/100000)});
}
await write('assets/semantic-vectors.json',{schema:1,model,rows});
console.log('Built',rows.length,'semantic vectors');
