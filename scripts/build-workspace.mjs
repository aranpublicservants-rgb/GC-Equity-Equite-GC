import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const explorer=read('explorer.html');
function literal(source,name){
  const match=new RegExp('(?:const|let|var)\\s+'+name+'\\s*=').exec(source);
  if(!match)throw Error('Missing source constant '+name);
  let i=match.index+match[0].length,start=i,depth=0,quote='',escape=false,line=false,block=false;
  for(;i<source.length;i++){
    const c=source[i],n=source[i+1];
    if(line){if(c==='\n')line=false;continue;}
    if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}
    if(quote){if(escape){escape=false;continue;}if(c==='\\'){escape=true;continue;}if(c===quote)quote='';continue;}
    if(c==='/'&&n==='/'){line=true;i++;continue;}if(c==='/'&&n==='*'){block=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if('([{'.includes(c))depth++;if(')]}'.includes(c))depth--;
    if(c===';'&&depth===0)break;
  }
  return JSON.parse(JSON.stringify(vm.runInNewContext('('+source.slice(start,i)+')',{}, {timeout:1000})));
}
function csv(text){
  const rows=[];let row=[],v='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){row.push(v);v='';}else if(c==='\n'){row.push(v.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];v='';}else v+=c;}
  if(row.length||v){row.push(v);rows.push(row);}const head=rows.shift();return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??''])));
}
const strip=s=>String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|#160);/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const data={schema:1,assembled:'2026-11-07',periods:{workforce:'2025-03-31',survey:'2024',plans:'2026-27'}};
for(const name of ['DEPTS','DEPT_FR','WFA','CPA','EX','EXLEV','PSES_DEPT','EEG_DEPT','PSES_QMETA','EEG_QMETA_FR','YOY','HIST','SUBG','SGSAL','FLOW25','DEPT_WFA_2025','DEPT_WFA_SOURCES','SOURCES'])data[name]=literal(explorer,name);
data.rep=csv(read('data/october-2026/TBS_EE_representation_with_WFA_2017-2025.csv'));
data.executives=csv(read('data/october-2026/TBS_EE_executives_by_EX_level_with_WFA_2017-2025.csv'));
data.groups=[
  {key:'w',en:'Women',fr:'Femmes',field:'women',survey:'woman',picker:'women'},
  {key:'i',en:'Indigenous Peoples',fr:'Peuples autochtones',field:'indigenous_peoples',survey:'ind',picker:'indigenous'},
  {key:'d',en:'Persons with disabilities',fr:'Personnes en situation de handicap',field:'persons_with_disabilities',survey:'pwd',picker:'pwd'},
  {key:'v',en:'Racialized employees',fr:'Employés racisés',field:'members_of_visible_minorities',survey:'rac',picker:'racialized'},
  {key:'black',en:'Black employees',fr:'Employés noirs',field:null,survey:'black',picker:'black'}
];
const dates=JSON.parse(read('data/source-dates.json'));
data.sources={
 rep:dates.sources.find(s=>s.id==='tbs-representation').url,
 pses:'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/public-service-employee-survey/2024-25.html',
 psesData:dates.sources.find(s=>s.id==='pses-2024-second-level').url,
 executive:'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/distribution-public-service-canada-executive-employees.html',
 salary:'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/employment-equity-demographic-snapshot-2024-2025.html',
 statistics:dates.sources.find(s=>s.id==='tbs-diversity-statistics').url,
 call:'https://www.canada.ca/en/privy-council/corporate/clerk/call-to-action-anti-racism-equity-inclusion-federal-public-service.html'
};
const plans=read('departmental-plans-2026-27/index.html');
const jsonScript=id=>JSON.parse(plans.match(new RegExp('<script[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)<\\/script>'))[1]);
data.plans=jsonScript('plan-data');data.planOrgs=jsonScript('organisation-metadata');
data.history=[
 {year:2019,en:'Accessibility Strategy for the Public Service of Canada',fr:'Stratégie sur l’accessibilité au sein de la fonction publique du Canada',description:'The strategy sets goals for recruitment, retention, promotion and accessibility.',descriptionFr:'La stratégie établit des objectifs de recrutement, de maintien en poste, de promotion et d’accessibilité.',url:'https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/accessibility-public-service/accessibility-strategy-public-service-toc.html',group:'d'},
 {year:2021,en:'Clerk’s Call to Action',fr:'Appel à l’action du greffier',description:'The Call to Action asks leaders to address barriers, support employee networks and use disaggregated data to measure progress.',descriptionFr:'L’appel à l’action demande aux dirigeants de s’attaquer aux obstacles, d’appuyer les réseaux d’employés et de mesurer les progrès à l’aide de données désagrégées.',url:data.sources.call,group:'v'},
 {year:2023,en:'Employment Equity Act Review Task Force report',fr:'Rapport du Groupe de travail sur l’examen de la Loi sur l’équité en matière d’emploi',description:'The report proposes changes to employment equity coverage, implementation, consultation and oversight.',descriptionFr:'Le rapport propose des changements à la portée de l’équité en matière d’emploi, à sa mise en œuvre, aux consultations et à la surveillance.',url:'https://www.canada.ca/en/employment-social-development/corporate/portfolio/labour/programs/employment-equity/reports/act-review-task-force.html',group:'i'},
 {year:2024,en:'Call to Action self-assessments',fr:'Autoévaluations de l’appel à l’action',description:'An April 2024 message asks organizations to assess progress and engage employees and employee networks in preparing their responses.',descriptionFr:'Un message d’avril 2024 demande aux organismes d’évaluer les progrès et de faire participer les employés et leurs réseaux à la préparation des réponses.',url:'https://www.canada.ca/en/privy-council/corporate/about-call-action/message-call-to-action-and-values-ethics-self-assessments.html',group:'v'}
];
const docs=[];
function add(d){d.id='s'+docs.length;docs.push(d);}
const sections=[...explorer.matchAll(/<section\b[^>]*id="view-([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
for(const [,id,html] of sections){const heading=html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/);if(!heading)continue;const translated=html.match(/<h[1-4][^>]*data-fr="([^"]+)"/);add({site:'GC Equity',kind:'section',en:strip(heading[1]),fr:strip(translated?.[1]||heading[1]),text:strip(html).slice(0,1100),textFr:[...html.matchAll(/data-fr="([^"]+)"/g)].map(m=>strip(m[1])).join(' ').slice(0,1100),url:'explorer.html#'+id});}
const women=read('women-femmes/index.html');
for(const [,id,html] of women.matchAll(/<section\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)){const title=html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/);if(title)add({site:'Women / Femmes',kind:'section',en:strip(title[1]),fr:strip(title[1]),text:strip(html).slice(0,1300),url:'women-femmes/index.html#'+id});}
const branchMeta=JSON.parse(explorer.match(/<script type="application\/json" id="eq-branch-meta">([\s\S]*?)<\/script>/)[1]);
for(const q of branchMeta.questions||[]){add({site:'GC Equity',kind:'question',en:q.id+' · '+(q.en||q.label||''),fr:q.id+' · '+(q.fr||q.en||q.label||''),text:'PSES 2024 branch organizational unit '+(q.en||''),textFr:'SAFF 2024 direction unité organisationnelle '+(q.fr||''),url:'explorer.html#departments'});}
for(const r of data.DEPTS){add({site:'GC Equity',kind:'organization',en:r[0],fr:data.DEPT_FR[r[0]]||r[0],text:`Workforce representation, March 31, 2025: women ${r[2]}%; Indigenous Peoples ${r[3]}%; persons with disabilities ${r[4]}%; racialized employees ${r[5]}%. Explore this organization’s data and 2024 employee survey results on harassment, discrimination and career opportunities.`,textFr:`Représentation au 31 mars 2025 : femmes ${r[2]} %; peuples autochtones ${r[3]} %; personnes en situation de handicap ${r[4]} %; employés racisés ${r[5]} %. Consultez les données de cet organisme et les résultats du SAFF de 2024 sur le harcèlement, la discrimination et les perspectives de carrière.`,url:'explorer.html?org='+encodeURIComponent(r[0])+'#orgprofile'});}
for(const g of data.groups)add({site:'GC Equity',kind:'group',en:g.en,fr:g.fr,text:g.en+' representation executives salary recruitment promotion employee survey trends',textFr:g.fr+' représentation cadres rémunération recrutement promotion sondage tendances',url:'explorer.html?group='+g.picker+'#data'});
for(const r of csv(read('data/october-2026/public-source-inventory.csv')))add({site:'GC Equity',kind:'source',en:r.Title||r.File,fr:r.Title||r.File,text:[r.File,r.Topic,r.Type].join(' '),textFr:[r.File,r['Topic (French)'],r['Type (French)']].join(' '),url:'sources.html?q='+encodeURIComponent(r.File)});
for(const s of data.SOURCES)add({site:'GC Equity',kind:'source',en:s.n,fr:s.nf||s.n,text:strip(s.d),textFr:strip(s.df),url:s.u});
for(const [code,meta] of Object.entries(data.PSES_QMETA))add({site:'GC Equity',kind:'question',en:code+' · '+meta[1],fr:code+' · '+(data.EEG_QMETA_FR[code]||meta[1]),text:'2024 Public Service Employee Survey PSES '+meta[1],textFr:'Sondage auprès des fonctionnaires fédéraux SAFF 2024 '+(data.EEG_QMETA_FR[code]||meta[1]),url:'explorer.html#pses'});
for(const p of data.plans)add({site:'Departmental plans',kind:'plan',en:p.name,fr:data.planOrgs[p.name]?.nameFr||p.name,text:`2026-27 departmental plan anti-racism ${p.t[0]}, equity ${p.t[1]}, inclusion ${p.t[2]}, diversity ${p.t[3]}, accessibility ${p.t[4]}, reconciliation ${p.t[5]}. Counts of term mentions, not commitments or results.`,textFr:'Plan ministériel 2026-2027 mentions antiracisme équité inclusion diversité accessibilité réconciliation. Le nombre de mentions ne mesure pas les engagements ni les résultats.',url:'departmental-plans-2026-27/index.html?q='+encodeURIComponent(p.name)});
const relatedRoot=path.resolve(root,'../related');
const repos=[['isc-sac-equity-equite','ISC / SAC'],['Indigenous-GC---GC-Autochtone','Indigenous public servants'],['Black-Public-Servants---Fonctionnaires-noirs','Black public servants'],['aran-raar','ARAN / RAAR'],['GC-Equity-History-Histoire-de-l-equite-au-GC','Equity history'],['Accessibility-and-Inclusion-Accessibilit-et-inclusion','Accessibility and inclusion'],['pses-2024-branch.html','PSES branches']];
data.related=[];
for(const [repo,label] of repos){const dir=path.join(relatedRoot,repo);if(!fs.existsSync(path.join(dir,'index.html')))continue;const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');const url='https://aranpublicservants-rgb.github.io/'+repo+'/';let commit='';try{commit=execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
 data.related.push({repo,label,url,commit});
 add({site:label,kind:'site',en:strip(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||label),fr:label,text:([...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>strip(m[1])).filter(t=>t.length>70&&!/javascript|cookie/i.test(t)).slice(0,6).join(' ')||strip(html)).slice(0,1700),url});
 const blocks=[...html.matchAll(/<(section|article)\b([^>]*)>([\s\S]*?)<\/\1>/gi)];
 for(const [,tag,attrs,body] of blocks){const id=attrs.match(/\bid="([^"]+)"/)?.[1];const h=body.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/);if(!h||!id)continue;const hfr=body.match(/<h[1-4][^>]*data-fr="([^"]+)"/);const text=strip(body);if(text.length<40)continue;add({site:label,kind:'section',en:strip(h[1]),fr:strip(hfr?.[1]||h[1]),text:text.slice(0,1300),textFr:[...body.matchAll(/data-fr="([^"]+)"/g)].map(m=>strip(m[1])).join(' ').slice(0,1300),url:url+'#'+id});}
 if(repo.includes('History')){for(const e of literal(html,'ENTRIES')){if(!e.src?.url)continue;add({site:label,kind:'history',en:e.y+' · '+e.t.en,fr:e.y+' · '+e.t.fr,text:e.s?.en||'',textFr:e.s?.fr||'',url:url+'#e-'+e.id,source:e.src.url});}}
}
// Pages built from their own data files. They are added last so the identifiers of earlier entries do not change.
for(const d of pageDocs())add(d);
function pageDocs(){
 const findings=literal(read('call-to-action.js'),'FINDINGS'),catalogue=JSON.parse(read('data/psc/catalogue.json'));
 const out=[{site:'GC Equity',kind:'section',en:'Call to Action: what the data point to',fr:'Appel à l’action : ce que les données indiquent',text:findings.map(f=>f.t[0]).join('. ')+'.',textFr:findings.map(f=>f.t[1]).join('. ')+'.',url:'call-to-action.html#findings'},
  {site:'GC Equity',kind:'section',en:'Hiring and staffing data from the Public Service Commission',fr:'Données sur l’embauche et la dotation de la Commission de la fonction publique',text:'Public Service Commission applicants and appointments by employment equity group, appointments by sex and region, student applicants and hires, appointments by organization and self-identification, and every Commission data file on this site.',textFr:'Postulants et nominations de la Commission de la fonction publique selon le groupe visé par l’équité en matière d’emploi, nominations selon le sexe et la région, étudiants postulants et embauchés, nominations par organisation et selon l’auto-identification, et chaque fichier de données de la Commission sur ce site.',url:'staffing.html'}];
 for(const f of catalogue.files)out.push({site:'GC Equity',kind:'source',en:f.en,fr:f.fr,text:f.file+' · Public Service Commission'+(f.years?' · '+f.years.join(' to '):''),textFr:f.file+' · Commission de la fonction publique'+(f.years?' · '+f.years.join(' à '):''),url:'staffing.html#files'});
 return out;
}
fs.mkdirSync(path.join(root,'assets'),{recursive:true});
fs.writeFileSync(path.join(root,'assets/workspace-data.json'),JSON.stringify(data));
fs.writeFileSync(path.join(root,'assets/search-index.json'),JSON.stringify({schema:1,assembled:data.assembled,scope:'Published pages, organizations, questions and source catalogues; interactive table cells are searched in their data views.',docs}));
const manifests=['assets/workspace-data.json','assets/search-index.json'].map(file=>({file,bytes:fs.statSync(path.join(root,file)).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
fs.writeFileSync(path.join(root,'assets/workspace-manifest.json'),JSON.stringify({schema:1,assembled:data.assembled,files:manifests,related:data.related},null,2)+'\n');
console.log(JSON.stringify({documents:docs.length,relatedSites:data.related.length,files:manifests},null,2));
