/* GC Equity: complete organization-scoped Public Service Commission source tables.
   Only rows with a matching published organization field appear. No national figures
   are substituted when a department lacks records. */
(function(){
'use strict';
const L=(en,fr)=>document.documentElement.lang.toLowerCase().startsWith('fr')?fr:en;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').replace(/civilianstaffonly|publicserviceemployees/g,'');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headerName={
 fiscal_year:['Fiscal year','Exercice'],Fiscal_Year:['Fiscal year','Exercice'],quarter:['Quarter','Trimestre'],
 month_year_e:['Reference month','Mois de référence'],month_end_date:['Reference date','Date de référence'],
 geo_region_e:['Region','Région'],region_e:['Region','Région'],
 description_e:['Measure','Indicateur'],hire_e:['Hiring category','Catégorie d’embauche'],
 age_group_e:['Age group','Groupe d’âge'],class_e:['Occupational classification','Classification professionnelle'],
 group_e:['Occupational group','Groupe professionnel'],program_e:['Program','Programme'],
 adv_e:['Advertisement type','Type d’annonce'],days_cat_e:['Days category','Catégorie du nombre de jours'],
 staffing_act_appt_type_e:['Staffing / appointment type','Type de dotation ou de nomination'],
 staff_type_e:['Staffing type','Type de dotation'],tenure_e:['Employment tenure','Durée d’emploi'],
 first_official_language_e:['First official language','Première langue officielle'],
 fol_e:['First official language','Première langue officielle'],
 sex_e:['Sex as reported','Sexe déclaré'],ee_e:['Employment equity self-identification','Auto-identification en matière d’équité'],
 mob_type_e:['Movement type','Type de mouvement'],
 sep_reason_e:['Reason for departure','Motif de départ'],
 N:['Published count','Nombre publié'],n:['Published count','Nombre publié'],
 count:['Published count','Nombre publié'],qtr_count:['Quarterly count','Nombre trimestriel'],
 priority_count:['Priority appointments','Nominations prioritaires'],
 pct_chg_qtr:['Quarter-over-quarter change as published','Variation trimestrielle telle que publiée']
};
let cataloguePromise=null,indexPromise=null,requestId=0,io=null;
const cache=new Map(),PER_PAGE=18;
function sourceIndex(){
 if(!indexPromise)indexPromise=fetch('assets/psc-organization-index.json').then(r=>{if(!r.ok)throw Error('organization index HTTP '+r.status);return r.json();});
 return indexPromise;
}
function catalogue(){
 if(!cataloguePromise)cataloguePromise=fetch('data/psc/catalogue.json').then(r=>{if(!r.ok)throw Error('PSC source catalogue HTTP '+r.status);return r.json();});
 return cataloguePromise;
}
function columnName(col){
 if(headerName[col])return L(...headerName[col]);
 const base=col.replace(/_(e|f)$/,'').replaceAll('_',' ');
 return base.replace(/(^|\s)\S/g,x=>x.toUpperCase());
}
function parseOnlyOrganization(text,field,orgName){
 let headers=null,col=-1,orgValues=[],fieldAt=-1,result=[],row=[],value='',quoted=false;
 function finish(){
  row.push(value);value='';
  if(!headers){headers=row.map(x=>x.replace(/^\ufeff/,'').trim());fieldAt=headers.indexOf(field);
   if(fieldAt<0)throw Error('Expected organization column is absent: '+field);
  }else if(row.some(x=>x!=='')){
   if(norm(row[fieldAt])===norm(orgName))result.push(row.slice());
  }
  row=[];
 }
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c==='"'&&text[i+1]==='"'){value+='"';i++;}
   else if(c==='"')quoted=false;
   else value+=c;
  }else if(c==='"')quoted=true;
  else if(c===','){row.push(value);value='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;finish();}
  else value+=c;
 }
 if(value||row.length)finish();
 return {headers,rows:result};
}
async function departmentRows(file,field,originalName){
 const key=file+'|'+norm(originalName);
 if(cache.has(key)){const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit;}
 const p=fetch('data/psc/'+file).then(async response=>{
  if(!response.ok)throw Error(file+': HTTP '+response.status);
  return parseOnlyOrganization(await response.text(),field,originalName);
 });
 cache.set(key,p);
 // Bound memory usage: each raw file can have tens of thousands of records.
 while(cache.size>8)cache.delete(cache.keys().next().value);
 try{return await p;}catch(e){cache.delete(key);throw e;}
}
function displayColumns(headers,field){
 const orgFields=new Set(['organization_e','organization_f','orgnization_e','department_e','department_f','department_or_agency']);
 const keep=[];
 for(let i=0;i<headers.length;i++){
  const key=headers[i];
  if(orgFields.has(key))continue;
  if(key.endsWith('_f')&&headers.includes(key.slice(0,-2)+'_e'))continue;
  const alt=key.endsWith('_e')?headers.indexOf(key.slice(0,-2)+'_f'):-1;
  keep.push({key,index:i,french:alt,name:columnName(key)});
 }
 return keep;
}
function createCsv(rows,headers,file){
 const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const csv='\ufeff'+[headers,...rows].map(row=>row.map(q).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download='GC-Equity-'+file.replace(/\.csv$/i,'')+'-selected-organization.csv';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function fileTitle(file,catalogueData){
 const item=(catalogueData.files||[]).find(x=>x.file===file);
 return item?L(item.en||file,item.fr||item.en||file):file;
}
function options(items){
 return items.map(([value,label])=>'<option value="'+esc(value)+'">'+esc(label)+'</option>').join('');
}
function buildTable(card,file,selectedOriginal,raw,source,group){
 if(!card.isConnected||card.dataset.request!==String(requestId))return;
 const {headers,rows}=raw,cols=displayColumns(headers,source.field);
 const timeKey=['fiscal_year','Fiscal_Year','month_end_date','month_year_e'].find(k=>headers.includes(k));
 const timeCol=timeKey?headers.indexOf(timeKey):-1;
 const periods=[...new Set(timeCol>=0?rows.map(r=>r[timeCol]):[])].filter(Boolean).sort().reverse();
 const groupOptions=[['all',L('All published periods','Toutes les périodes publiées')],...periods.map(t=>[t,t])];
 const heading=fileTitle(file,source.catalogue);
 card.innerHTML='<h4>'+esc(heading)+'</h4>'+
 '<p class="gce-explain">'+esc(L('Only published rows for ','Uniquement les lignes publiées pour ')+selectedOriginal+
 '. '+L('These are Public Service Commission records. Percentages, counts and reporting periods retain their original source definitions; this file is not necessarily disaggregated by your chosen equity group.',' Il s’agit de données de la Commission de la fonction publique. Les pourcentages, nombres et périodes conservent les définitions de la source; ce fichier n’est pas nécessairement ventilé selon le groupe visé par l’équité choisi.'))+'</p>'+
 (periods.length>1?'<div class="gce-filter-panel"><div><label for="gce-org-year-'+esc(file.replace('.csv',''))+'">'+esc(L('Reporting period','Période de référence'))+'</label><select id="gce-org-year-'+esc(file.replace('.csv',''))+'">'+options(groupOptions)+'</select></div></div>':'')+
 '<div class="gce-table-actions"><button type="button" class="gce-download gce-source-export">'+esc(L('Download all matching department records (CSV)','Télécharger toutes les données correspondantes du ministère (CSV)'))+'</button></div>'+
 '<div class="gce-table-wrap" role="region" tabindex="0" aria-label="'+esc(heading)+'"><table data-gcw-ready="yes"><caption>'+esc(L('Department-only source records: ','Données sources pour le ministère seulement : ')+heading)+'</caption><thead><tr>'+cols.map(x=>'<th scope="col">'+esc(x.name)+'</th>').join('')+'</tr></thead><tbody></tbody></table></div>'+
 '<div class="gce-pager"><button type="button" class="gce-org-prev" disabled>'+esc(L('Previous','Précédent'))+'</button><span role="status" aria-live="polite" class="gce-org-count"></span><button type="button" class="gce-org-next">'+esc(L('Next','Suivant'))+'</button></div>'+
 '<p class="gce-source">'+esc(L('Published Public Service Commission source file','Fichier source publié par la Commission de la fonction publique'))+': '+esc(file)+'. '+esc(L('The downloadable table contains only this organization’s rows.','Le tableau téléchargeable contient uniquement les lignes de cet organisme.'))+'</p>';
 const period=card.querySelector('select'),body=card.querySelector('tbody'),status=card.querySelector('.gce-org-count');
 const prev=card.querySelector('.gce-org-prev'),next=card.querySelector('.gce-org-next');
 let filtered=rows.slice(),page=0;
 function renderRows(){
  if(!card.isConnected)return;
  body.innerHTML=filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE).map(r=>'<tr>'+cols.map((col,j)=>{
   const value=col.french>=0&&document.documentElement.lang.startsWith('fr')?(r[col.french]||r[col.index]):r[col.index];
   return j===0?'<th scope="row">'+esc(value)+'</th>':'<td>'+esc(value)+'</td>';
  }).join('')+'</tr>').join('');
  status.textContent=filtered.length?L('Rows ','Lignes ')+(page*PER_PAGE+1)+'–'+Math.min((page+1)*PER_PAGE,filtered.length)+' / '+filtered.length:
   L('No records for this period.','Aucune donnée pour cette période.');
  prev.disabled=page===0;
  next.disabled=(page+1)*PER_PAGE>=filtered.length;
 }
 if(period)period.addEventListener('change',()=>{filtered=period.value==='all'?rows:rows.filter(r=>r[timeCol]===period.value);page=0;renderRows();});
 prev.addEventListener('click',()=>{if(page>0){page--;renderRows();}});
 next.addEventListener('click',()=>{if((page+1)*PER_PAGE<filtered.length){page++;renderRows();}});
 card.querySelector('.gce-source-export').addEventListener('click',()=>createCsv(filtered,headers,file));
 renderRows();
}
async function loadCard(card,source,catalogueData,selectedOrg,req,group){
 if(card.dataset.loaded||!card.isConnected||req!==requestId)return;
 card.dataset.loaded='yes';card.innerHTML='<h4>'+esc(fileTitle(source.file,catalogueData))+'</h4><p role="status">'+esc(L('Loading this organization’s published records…','Chargement des données publiées pour cet organisme…'))+'</p>';
 try{
  const entry=Object.keys(source.organizations).find(x=>norm(x)===norm(selectedOrg));
  if(!entry){card.remove();return;}
  const result=await departmentRows(source.file,source.field,entry);
  if(!card.isConnected||req!==requestId)return;
  if(!result.rows.length){card.innerHTML='<p class="gce-unavailable">'+esc(L('No matching published rows for this organization.','Aucune ligne publiée correspondant à cet organisme.'))+'</p>';return;}
  source.catalogue=catalogueData;
  buildTable(card,source.file,entry,result,source,group);
 }catch(e){
  if(req!==requestId||!card.isConnected)return;
  card.innerHTML='<h4>'+esc(fileTitle(source.file,catalogueData))+'</h4><p role="alert">'+esc(L('This source file could not be loaded. Its data have not been substituted with totals from another organization.','Impossible de charger ce fichier source. Ses données n’ont pas été remplacées par les chiffres d’un autre organisme.'))+'</p>';
  console.warn('PSC organization source:',source.file,e);
 }
}
async function render(name,group){
 const id=++requestId,host=document.getElementById('org-complete-sources');
 if(io){io.disconnect();io=null;}
 if(!host)return;
 if(!name){host.innerHTML='';return;}
 host.innerHTML='<p role="status">'+esc(L('Checking department-specific source coverage…','Vérification des sources propres au ministère…'))+'</p>';
 try{
  const [index,sourceData]=await Promise.all([sourceIndex(),catalogue()]);
  if(id!==requestId||!host.isConnected)return;
  const matching=index.files.filter(x=>Object.keys(x.organizations||{}).some(org=>norm(org)===norm(name)));
  if(!matching.length){
   host.innerHTML='<section class="gce-data-block"><h3>'+esc(L('Additional Public Service Commission records','Autres données de la Commission de la fonction publique'))+'</h3><p class="gce-explain">'+esc(L('No organization-named rows were found for this employer in the locally available PSC files. This does not mean the organization has no workforce or staffing data elsewhere.','Aucune ligne nommant cet employeur n’a été trouvée dans les fichiers de la Commission de la fonction publique hébergés ici. Cela ne signifie pas que l’organisme ne possède aucune donnée sur l’effectif ou la dotation ailleurs.'))+'</p></section>';
   return;
  }
  const period=(cat)=>cat==='all'?L('All categories','Toutes les catégories'):cat;
  const classified=f=>{
   if(/^demo_|^CFPPSC_AR2C|^ar2d/.test(f))return 'workforce';
   if(/^advs|^adv_type|^CFPPSC_AR1CC|^CFPPSC_AR1U|^ar1ff|^ar1gg/.test(f))return 'recruitment';
   return 'movement';
  };
  const cats=[['all','All department datasets','Toutes les données ministérielles'],['workforce','Workforce and demographics','Effectif et données démographiques'],['recruitment','Recruitment and staffing','Recrutement et dotation'],['movement','Movement and departures','Mouvements et départs']];
  host.innerHTML='<section class="gce-data-block" id="org-psc-full-data"><h3>'+esc(L('Complete Public Service Commission datasets for this organization','Jeux de données complets de la Commission de la fonction publique pour cet organisme'))+'</h3>'+
   '<p class="gce-explain">'+esc(L('These source files contain explicit published records for ','Ces fichiers sources contiennent des données publiées nommant ')+name+'. '+
   L('Select a category to reduce the number of tables. Tables load as you scroll, display 18 records at a time, and allow full department-only CSV exports. National-only files are deliberately excluded.','Sélectionnez une catégorie pour réduire le nombre de tableaux. Les tableaux se chargent au défilement, affichent 18 lignes à la fois et permettent d’exporter toutes les lignes propres au ministère. Les fichiers contenant uniquement des totaux nationaux sont exclus.'))+'</p>'+
   '<div class="gce-filter-panel"><div><label for="gce-org-source-category">'+esc(L('Dataset category','Catégorie de données'))+'</label><select id="gce-org-source-category">'+cats.map(([v,en,fr])=>'<option value="'+v+'">'+esc(L(en,fr))+'</option>').join('')+'</select></div></div>'+
   '<p role="status" id="gce-org-sources-total">'+esc(matching.length+' '+L('organization-specific PSC source files found','fichiers sources de la CFP propres à cet organisme trouvés'))+'</p>'+
   '<div id="gce-org-source-tables">'+matching.map(source=>{
    const cat=classified(source.file);
    return '<section class="gce-org-source" data-source="'+esc(source.file)+'" data-category="'+cat+'" data-request="'+id+'">'+
     '<h4>'+esc(fileTitle(source.file,sourceData))+'</h4><p class="gce-explain">'+
     esc(L('Published department rows: ','Lignes publiées pour le ministère : ')+Object.entries(source.organizations).filter(([k])=>norm(k)===norm(name)).reduce((n,[k,v])=>n+v,0))+'</p></section>';
   }).join('')+'</div></section>';
  const cards=[...host.querySelectorAll('.gce-org-source')],lookup=new Map(matching.map(x=>[x.file,x]));
  const observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{
   for(const e of entries){if(e.isIntersecting){observer.unobserve(e.target);loadCard(e.target,lookup.get(e.target.dataset.source),sourceData,name,id,group);}}
  },{rootMargin:'450px'}):null;
  io=observer;
  function showCategory(){
   const selected=host.querySelector('#gce-org-source-category')?.value||'all';
   for(const card of cards){
    const show=selected==='all'||card.dataset.category===selected;
    card.hidden=!show;
    if(show){if(observer)observer.observe(card);else loadCard(card,lookup.get(card.dataset.source),sourceData,name,id,group);}
    else if(observer)observer.unobserve(card);
   }
  }
  host.querySelector('#gce-org-source-category').addEventListener('change',showCategory);
  showCategory();
 }catch(e){
  if(id!==requestId)return;
  host.innerHTML='<section class="gce-data-block"><h3>'+esc(L('Additional departmental datasets','Autres données ministérielles'))+'</h3><p role="alert">'+esc(L('The organization-specific source index could not be loaded. Existing verified tables remain available.','Impossible de charger l’index des sources par organisme. Les tableaux vérifiés existants demeurent accessibles.'))+'</p></section>';
  console.warn('PSC organization source index:',e);
 }
}
window.GCEOrgSources={render};
})();