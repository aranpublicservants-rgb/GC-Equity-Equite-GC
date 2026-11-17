/* GC Equity: open.canada.ca files added in November 2026.
   The files are stored unchanged and read only when a visitor opens a table.
   Organization tables show only rows that name the selected organization.
   Values, including suppression symbols, appear exactly as published. */
(function(){
'use strict';
const fr=()=>document.documentElement.lang.toLowerCase().startsWith('fr');
const L=(en,f)=>fr()?f:en;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').replace(/civilianstaffonly|publicserviceemployees/g,'');
const PER_PAGE=18,cache=new Map();
let manifestPromise=null,orgRequest=0,publicRequest=0;
function manifest(){
 if(!manifestPromise)manifestPromise=fetch('assets/added-sources.json').then(r=>{if(!r.ok)throw Error('added sources HTTP '+r.status);return r.json();}).catch(e=>{manifestPromise=null;throw e;});
 return manifestPromise;
}
function decode(buffer){
 let bytes=new Uint8Array(buffer);
 if(bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF)bytes=bytes.subarray(3);
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
 catch(e){return new TextDecoder('windows-1252').decode(bytes);}
}
/* In a file that holds both languages, columns ending in _e/_en or _f/_fr come in pairs.
   Returns the positions of the columns written in the language not being read. */
function otherLanguage(head){
 const lower=head.map(h=>h.toLowerCase()),other=fr()?/_(e|en)$/:/_(f|fr)$/,swap={'_e':'_f','_en':'_fr','_f':'_e','_fr':'_en'},out=new Set();
 lower.forEach((h,i)=>{if(other.test(h)&&lower.includes(h.replace(other,m=>swap[m])))out.add(i);});
 return out;
}
function size(bytes){
 const mb=bytes/1048576,text=mb>=1?mb.toFixed(1):Math.max(1,Math.round(bytes/1024)).toString();
 return (fr()?text.replace('.',','):text)+(mb>=1?L(' MB',' Mo'):L(' KB',' Ko'));
}
function parse(text){
 const rows=[];let row=[],value='',quoted=false;
 const end=()=>{row.push(value);value='';if(row.some(x=>x.trim()!==''))rows.push(row);row=[];};
 text=text.replace(/^﻿/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){value+='"';i++;}else if(c==='"')quoted=false;else value+=c;}
  else if(c==='"')quoted=true;
  else if(c===','){row.push(value);value='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;end();}
  else value+=c;
 }
 if(value!==''||row.length)end();
 return rows;
}
function load(path){
 if(!cache.has(path)){
  const p=fetch(path).then(r=>{if(!r.ok)throw Error(path+': HTTP '+r.status);return r.arrayBuffer();}).then(b=>parse(decode(b)));
  cache.set(path,p);p.catch(()=>cache.delete(path));
  while(cache.size>10)cache.delete(cache.keys().next().value);
 }
 return cache.get(path);
}
function saveCsv(head,rows,name){
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const csv='﻿'+[head,...rows].map(r=>r.map(q).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function sourceLine(publisher,path,url){
 return '<p class="gce-source">'+esc(L('Published by ','Publié par ')+L(publisher[0],publisher[1]))+'. '+(path?'<a href="'+esc(path)+'" download>'+esc(L('Download the file as published','Télécharger le fichier tel que publié'))+'</a>. ':'')+'<a href="'+esc(url)+'">'+esc(L('Dataset page on open.canada.ca','Page du jeu de données sur ouvert.canada.ca'))+'</a>.</p>';
}
/* Draw one paged table. head and rows are shown as given; nothing is reformatted. */
function drawTable(box,caption,head,rows,exportName,exportHead,exportRows){
 box.innerHTML=(exportName?'<div class="gce-table-actions"><button type="button" class="gce-download">'+esc(L('Download these rows (CSV)','Télécharger ces lignes (CSV)'))+'</button></div>':'')+
 '<div class="gce-table-wrap" role="region" tabindex="0" aria-label="'+esc(caption)+'"><table data-gcw-ready="yes"><caption>'+esc(caption)+'</caption><thead><tr>'+head.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody></tbody></table></div>'+
 '<div class="gce-pager"><button type="button" class="gce-added-prev">'+esc(L('Previous','Précédent'))+'</button><span role="status" aria-live="polite"></span><button type="button" class="gce-added-next">'+esc(L('Next','Suivant'))+'</button></div>';
 const body=box.querySelector('tbody'),status=box.querySelector('.gce-pager span'),prev=box.querySelector('.gce-added-prev'),next=box.querySelector('.gce-added-next');
 let page=0;
 const show=()=>{
  body.innerHTML=rows.slice(page*PER_PAGE,(page+1)*PER_PAGE).map(r=>'<tr>'+head.map((_,j)=>j===0?'<th scope="row">'+esc(r[j]??'')+'</th>':'<td>'+esc(r[j]??'')+'</td>').join('')+'</tr>').join('');
  status.textContent=rows.length?L('Rows ','Lignes ')+(page*PER_PAGE+1)+'–'+Math.min((page+1)*PER_PAGE,rows.length)+' / '+rows.length:L('No rows.','Aucune ligne.');
  prev.disabled=page===0;next.disabled=(page+1)*PER_PAGE>=rows.length;
 };
 prev.addEventListener('click',()=>{if(page>0){page--;show();}});
 next.addEventListener('click',()=>{if((page+1)*PER_PAGE<rows.length){page++;show();}});
 const button=box.querySelector('.gce-download');
 if(button)button.addEventListener('click',()=>saveCsv(exportHead||head,exportRows||rows,exportName));
 show();
}
/* A closed <details> element that loads its file the first time it is opened. */
function lazy(title,fill){
 const d=document.createElement('details');d.className='gce-added';
 d.innerHTML='<summary>'+esc(title)+'</summary><div class="gce-added-body"></div>';
 d.addEventListener('toggle',()=>{
  if(!d.open||d.dataset.loaded)return;
  d.dataset.loaded='yes';
  const box=d.querySelector('.gce-added-body');
  box.innerHTML='<p role="status">'+esc(L('Loading the published file…','Chargement du fichier publié…'))+'</p>';
  fill(box).catch(e=>{delete d.dataset.loaded;box.innerHTML='<p role="alert">'+esc(L('This file could not be loaded. No other figures have been substituted.','Impossible de charger ce fichier. Aucun autre chiffre ne le remplace.'))+'</p>';console.warn('added source',e);});
 });
 return d;
}
function period(t){
 return t.period[0]===t.period[1]?t.period[0]:L('March '+t.period[0]+' to March '+t.period[1],'mars '+t.period[0]+' à mars '+t.period[1]);
}
function tableTitle(t){return L(t.titleEn,t.titleFr)+' ('+(t.periodText?L(t.periodText[0],t.periodText[1]):period(t))+')';}
function fullTable(t){
 return lazy(tableTitle(t),async box=>{
  const side=fr()?t.fr:t.en,rows=await load(side.path),head=rows[0].map(h=>h.trim());
  const holder=document.createElement('div');
  box.innerHTML='';box.append(holder);
  drawTable(holder,tableTitle(t),head,rows.slice(1));
  box.insertAdjacentHTML('beforeend',sourceLine(t.publisher,side.path,t.url));
 });
}
function orgTable(t,org){
 return lazy(tableTitle(t),async box=>{
  const side=fr()?t.fr:t.en,rows=await load(side.path),head=rows[0].map(h=>h.trim()),at=head.indexOf(side.field);
  if(at<0)throw Error('organization column missing: '+side.field);
  const wanted=new Set((fr()&&side.names!=='en'&&org.fr.length?org.fr:[org.en]).map(norm));
  const names=r=>{const c=String(r[at]||'');return wanted.has(norm(c))||(/ Total$/.test(c)&&wanted.has(norm(c.slice(0,-6))));};
  const hidden=new Set([at]);
  (t.hide||[]).forEach(f=>{const i=head.indexOf(f);if(i>=0)hidden.add(i);});
  if(t.bilingualFile)otherLanguage(head).forEach(i=>hidden.add(i));
  const keep=head.map((_,i)=>i).filter(i=>!hidden.has(i));
  const match=rows.slice(1).filter(names);
  const holder=document.createElement('div');
  box.innerHTML=t.note?'<p class="gce-explain">'+esc(L(t.note[0],t.note[1]))+'</p>':'';
  box.append(holder);
  drawTable(holder,tableTitle(t)+': '+L(org.en,org.fr[0]||org.en),keep.map(i=>head[i]),match.map(r=>keep.map(i=>r[i])),'GC-Equity-'+t.id+'-selected-organization.csv',head,match);
  box.insertAdjacentHTML('beforeend',sourceLine(t.publisher,t.noDownload?'':side.path,t.url));
 });
}
/* Files published by one employer keep their own layout. A first row with a single
   filled cell is the publisher's table title; the next row holds the column names. */
function employerFile(f,employer){
 const title=L(f.titleEn,f.titleFr)+(f.label?' ('+f.label+')':'');
 return lazy(title,async box=>{
  const rows=(await load(f.path)).map(r=>r.map(c=>c.replace(/\s+/g,' ').trim()));
  const titles=[];
  while(rows.length>1&&rows[0].filter(c=>c!=='').length===1&&rows.some(r=>r.filter(c=>c!=='').length>1))titles.push(rows.shift().find(c=>c!==''));
  const width=Math.max(...rows.map(r=>r.length));
  const cols=[...Array(width).keys()].filter(i=>rows.some(r=>(r[i]||'')!==''));
  const grid=rows.map(r=>cols.map(i=>r[i]||''));
  if(f.head&&f.head.length===cols.length)grid.unshift(f.head);
  const holder=document.createElement('div');
  box.innerHTML=titles.length?'<p class="gce-explain">'+esc(titles.join(' '))+'</p>':'';
  box.append(holder);
  drawTable(holder,title,grid[0],grid.slice(1));
  box.insertAdjacentHTML('beforeend',sourceLine(employer.publisher,f.path,f.url));
 });
}
function packageFile(f,pack){
 return lazy(f.name+' ('+size(f.bytes)+')',async box=>{
  const rows=await load(f.path),head=rows[0].map(h=>h.trim()),skip=otherLanguage(head),keep=head.map((_,i)=>i).filter(i=>!skip.has(i));
  const holder=document.createElement('div');
  box.innerHTML='';box.append(holder);
  drawTable(holder,L(pack.titleEn,pack.titleFr)+': '+f.name,keep.map(i=>head[i]),rows.slice(1).map(r=>keep.map(i=>r[i])));
  box.insertAdjacentHTML('beforeend','<p class="gce-source"><a href="'+esc(f.path)+'" download>'+esc(L('Download the file as published','Télécharger le fichier tel que publié'))+'</a>.</p>');
 });
}
function packageBlock(pack){
 const d=document.createElement('details');d.className='gce-added';
 const title=pack.titleEn||'';
 d.dataset.gceTopics='sources '+(/survey|harassment|violence/i.test(title)?'experience ': '')+(/staffing|hiring|applications|advertisements|referrals|priority/i.test(title)?'staffing ': '')+(/population|availability|executive/i.test(title)?'workforce':'');
 d.innerHTML='<summary>'+esc(L(pack.titleEn,pack.titleFr)+' ('+L(pack.periodText[0],pack.periodText[1])+')')+'</summary><div class="gce-added-body">'+sourceLine(pack.publisher,'',pack.url)+'</div>';
 const body=d.querySelector('.gce-added-body'),links=[];
 if(pack.note)body.insertAdjacentHTML('beforeend','<p class="gce-explain">'+esc(L(pack.note[0],pack.note[1]))+'</p>');
 pack.files.filter(f=>!f.lang||f.lang===(fr()?'fr':'en')).forEach(f=>{if(f.preview)body.append(packageFile(f,pack));else links.push(f);});
 if(links.length)body.insertAdjacentHTML('beforeend','<p class="gce-explain">'+esc(L('These files are too large or too wide to show as a table here. Download them as published:','Ces fichiers sont trop volumineux ou trop larges pour être affichés ici sous forme de tableau. Téléchargez-les tels que publiés :'))+'</p><ul class="gce-added-files">'+links.map(f=>'<li><a href="'+esc(f.path)+'" download>'+esc(f.titleEn?L(f.titleEn,f.titleFr)+' ['+f.name+']':f.name)+'</a> ('+esc((f.format==='GZ'?L('CSV compressed with gzip','CSV compressé avec gzip'):f.format)+', '+size(f.bytes)+(f.originalBytes?L('; ',' ; ')+size(f.originalBytes)+L(' once opened',' une fois ouvert'):''))+')</li>').join('')+'</ul>');
 return d;
}
function heading(text){return '<h3>'+esc(text)+'</h3>';}
async function renderOrg(name){
 const anchor=document.getElementById('org-complete-sources');
 let host=document.getElementById('org-added-sources');
 const id=++orgRequest;
 if(!name||!anchor){if(host)host.remove();return;}
 if(!host){host=document.createElement('section');host.className='gce-data-block';host.id='org-added-sources';}
 anchor.after(host);
 const title=heading(L('More published tables for this organization','Autres tableaux publiés pour cet organisme'));
 host.innerHTML=title+'<p role="status">'+esc(L('Checking the added files…','Vérification des fichiers ajoutés…'))+'</p>';
 try{
  const m=await manifest();
  if(id!==orgRequest||!host.isConnected)return;
  const key=norm(name),same=n=>window.GCEOrganizationKey?window.GCEOrganizationKey(n)===window.GCEOrganizationKey(name):norm(n)===key;
  const org=m.organizations[key]||Object.values(m.organizations).find(o=>same(o.en)),employer=m.employers.find(e=>e.names.some(same));
  const tables=org?m.tables.filter(t=>t.scope==='org'&&org.t[t.id]):[];
  if(!tables.length&&!employer){
   host.innerHTML=title+'<p class="gce-explain">'+esc(L('None of the files added in November 2026 names this organization.','Aucun des fichiers ajoutés en novembre 2026 ne nomme cet organisme.'))+'</p>';
   return;
  }
  host.innerHTML=title+'<p class="gce-explain">'+esc(L('Open a table to read the published rows for this organization. Counts and suppression symbols appear as published. Reporting periods and populations differ from one file to the next.','Ouvrez un tableau pour lire les lignes publiées pour cet organisme. Les nombres et les symboles de suppression sont présentés tels que publiés. Les périodes de référence et les populations varient d’un fichier à l’autre.'))+'</p>';
  tables.forEach(t=>host.append(orgTable(t,org)));
  if(employer){
   const lang=fr()?'fr':'en';
   host.insertAdjacentHTML('beforeend','<h4>'+esc(L('Files published by this organization','Fichiers publiés par cet organisme'))+'</h4>'+(employer.note?'<p class="gce-explain">'+esc(L(employer.note[0],employer.note[1]))+'</p>':''));
   const workbooks=[];
   employer.files.filter(f=>!f.lang||f.lang===lang).forEach(f=>{if(f.format==='CSV')host.append(employerFile(f,employer));else workbooks.push(f);});
   if(workbooks.length)host.insertAdjacentHTML('beforeend','<ul class="gce-added-files">'+workbooks.map(f=>'<li><a href="'+esc(f.path)+'" download>'+esc(L(f.titleEn,f.titleFr)+(f.label?' ('+f.label+')':''))+'</a></li>').join('')+'</ul>');
  }
 }catch(e){
  if(id!==orgRequest||!host.isConnected)return;
  host.innerHTML=title+'<p role="alert">'+esc(L('The list of added files could not be loaded. The other tables on this page are not affected.','Impossible de charger la liste des fichiers ajoutés. Les autres tableaux de cette page ne sont pas touchés.'))+'</p>';
  console.warn('added sources',e);
 }
}
async function renderPublic(){
 const anchor=document.getElementById('public-data-library');
 if(!anchor)return;
 let host=document.getElementById('public-added-sources');
 if(!host){host=document.createElement('section');host.className='gce-data-block';host.id='public-added-sources';}
 anchor.after(host);
 const id=++publicRequest;
 const title=heading(L('More published workforce and survey tables','Autres tableaux publiés sur l’effectif et les sondages'));
 host.innerHTML=title+'<p role="status">'+esc(L('Loading the list of tables…','Chargement de la liste des tableaux…'))+'</p>';
 try{
  const m=await manifest();
  if(id!==publicRequest||!host.isConnected)return;
  host.innerHTML=title+'<p class="gce-explain">'+esc(L('Treasury Board of Canada Secretariat tables for the whole federal public service. CPA is the core public administration. SA is separate agencies. Tables by department or agency appear under Departments and agencies once an organization is chosen.','Tableaux du Secrétariat du Conseil du Trésor du Canada pour l’ensemble de la fonction publique fédérale. APC désigne l’administration publique centrale. OD désigne les organismes distincts. Les tableaux par ministère ou organisme se trouvent sous Ministères et organismes, une fois un organisme choisi.'))+'</p>';
  m.tables.filter(t=>t.scope==='all').forEach(t=>{const el=fullTable(t);el.dataset.gceTopics='workforce sources';host.append(el);});
  if((m.packages||[]).length){
   host.insertAdjacentHTML('beforeend','<h4>'+esc(L('Staffing, survey, workforce availability and executive files','Fichiers sur la dotation, les sondages, la disponibilité au sein de la population active et les cadres supérieurs'))+'</h4><p class="gce-explain">'+esc(L('Files from federal publishers that cover the public service or its organizations generally. Each file keeps its own population and reporting period.','Fichiers d’éditeurs fédéraux qui portent sur l’ensemble de la fonction publique ou de ses organismes. Chaque fichier conserve sa propre population et sa propre période de référence.'))+'</p>');
   m.packages.forEach(pack=>host.append(packageBlock(pack)));
  }
  try{
   const r=await fetch('assets/library-documents.json');
   if(r.ok&&id===publicRequest&&host.isConnected){
    const lang=fr()?'fr':'en',docs=(await r.json()).documents.filter(d=>d.lang===lang||d.lang==='both');
    if(docs.length){
     const d=document.createElement('details');d.className='gce-added';d.dataset.gceTopics='sources';
     d.innerHTML='<summary>'+esc(L('Federal public service documents','Documents sur la fonction publique fédérale')+' ('+docs.length+')')+'</summary><div class="gce-added-body"><p class="gce-explain">'+esc(L('Each link opens the copy held by the publisher. No document is stored on this site.','Chaque lien ouvre l’exemplaire conservé par l’éditeur. Aucun document n’est conservé sur ce site.'))+'</p><ul class="gce-added-files">'+docs.map(x=>'<li><a href="'+esc(x.url)+'">'+esc(x.title)+'</a>. '+esc(x.publisher+(x.year?', '+x.year:'')+' ('+x.format+')')+'</li>').join('')+'</ul></div>';
     host.append(d);
    }
   }
  }catch(e){console.warn('library documents',e);}
 }catch(e){
  if(id!==publicRequest||!host.isConnected)return;
  host.innerHTML=title+'<p role="alert">'+esc(L('The list of tables could not be loaded.','Impossible de charger la liste des tableaux.'))+'</p>';
  console.warn('added sources',e);
 }
}
/* Run after the existing organization and library viewers, without changing them. */
const orgViewer=window.GCEOrgSources&&window.GCEOrgSources.render;
window.GCEOrgSources=Object.assign({},window.GCEOrgSources,{render(name,group){
 const result=orgViewer?orgViewer(name,group):undefined;
 try{renderOrg(name);}catch(e){console.warn('added sources',e);}
 return result;
}});
const libraryViewer=window.GCEDataLibrary&&window.GCEDataLibrary.render;
window.GCEDataLibrary=Object.assign({},window.GCEDataLibrary,{render(){
 const result=libraryViewer?libraryViewer.apply(this,arguments):undefined;
 try{renderPublic();}catch(e){console.warn('added sources',e);}
 return result;
}});
window.GCEAddedSources={renderOrg,renderPublic};
})();
