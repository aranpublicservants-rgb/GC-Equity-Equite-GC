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
const orgDoc=o=>({id:'org-local-'+o.id,url:o.path,en:o.en,fr:o.fr,text:'Departmental profile: representation, staffing, PSES, employee groups, branches and commitments.',textFr:'Profil ministériel : représentation, dotation, SAFF, groupes, directions et engagements.'});
const base=new URL('https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/');
const {load}=await import('cheerio');
const publicPages=[];
const sitemap=await fs.readFile('sitemap.xml','utf8');
for(const [,location] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)){
 let u;try{u=new URL(location)}catch{continue}
 if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname)||/\/(?:racialized-executives|communities\/filipino|youth)(?:\/|$)/i.test(u.pathname))continue;
 const relative=decodeURIComponent(u.pathname.slice(base.pathname.length));
 if(relative.includes('..')||relative.startsWith('/'))continue;
 const file=relative.endsWith('/')||!relative?relative+'index.html':relative;
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

const docs=[...registry.organizations.map(orgDoc),...index.docs,...publicPages].filter(d=>{try{const u=new URL(d.url,base);return d.id&&u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&!(/\/(?:racialized-executives|communities\/filipino|youth)(?:\/|$)/i.test(u.pathname))}catch{return false}});
const rows=[];
for(let i=0;i<docs.length;i+=16){
 const batch=docs.slice(i,i+16),texts=batch.map(embedText);
 const out=await pipe(texts,{pooling:'mean',normalize:true});
 const size=out.dims.at(-1);
 for(let j=0;j<batch.length;j++)rows.push({id:batch[j].id,url:batch[j].url,text:texts[j],vector:Array.from(out.data.slice(j*size,(j+1)*size),x=>Math.round(x*100000)/100000)});
}
await write('assets/semantic-vectors.json',{schema:1,model,rows});
console.log('Built',rows.length,'semantic vectors');
