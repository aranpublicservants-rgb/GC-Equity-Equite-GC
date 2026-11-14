/* Public-service data library: one page, one selected dataset, full-source exports.
   Files are loaded only when opened. Department-labelled files are never treated as
   whole-public-service totals. All files are part of the verified local dataset registry. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fr=()=>document.documentElement.lang.startsWith('fr');
const T=(en,frs)=>fr()?frs:en;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
let coverage=null,pscIndex=null,restored=null,cache=new Map(),request=0,active=null;
const SIZE=18;
function parseCSV(s){
 let rows=[],row=[],v='',quoted=false;
 for(let i=0;i<s.length;i++){let c=s[i];if(quoted){if(c==='"'&&s[i+1]==='"'){v+='"';i++;}else if(c==='"')quoted=false;else v+=c;}
 else if(c==='"')quoted=true;else if(c===','){row.push(v);v='';}
 else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(v);v='';if(row.some(x=>x!==''))rows.push(row);row=[];}else v+=c;
 }if(row.length||v){row.push(v);rows.push(row);}
 const head=(rows.shift()||[]).map(v=>v.replace(/^\ufeff/,'').trim());
 return {head,rows};
}
function entries(){
 const PSC=(coverage?.hostedAdditional?.psc||[]).filter(x=>!(pscIndex?.files||[]).some(f=>f.file===x.name)).map(x=>({...x,category:'psc',kind:'PSC source without explicit organization field',kindFr:'Source de la CFP sans champ d’organisme explicite'}));
 const W=(coverage?.hostedAdditional?.women||[]).map(x=>({...x,category:'women',titleEn:W_TITLES[x.name]?.[0]||human(x.name),titleFr:W_TITLES[x.name]?.[1]||human(x.name),kind:'Women and intersectional dataset',kindFr:'Données sur les femmes et l’intersectionnalité'}));
 const O=(coverage?.hostedAdditional?.other||[]).map(x=>({...x,category:x.kind==='derived'?'derived':'tbs',titleEn:human(x.name),titleFr:human(x.name),kind:x.kind==='derived'?'Independent derived analysis':'Treasury Board source file',kindFr:x.kind==='derived'?'Analyse dérivée indépendante':'Fichier source du Conseil du Trésor'}));
 // Use only complete source files already in the verified local manifest.
 // Employer-specific Employment Equity records remain in the employer view.
 const complete=(restored?.files||[]).filter(x=>!x.organizationField&&x.dataset!=='Employment Equity'&&x.path).map(x=>({
   name:x.originalName,path:x.path,category:x.dataset==='Disproportionality Index supplementary imputation'?'derived':'restored',
   titleEn:(/^(2023|2025) Staffing/.test(x.dataset||'')?x.dataset+' – ':'')+(x.title||x.dataset),
   titleFr:(/^(2023|2025) Staffing/.test(x.dataset||'')?('Sondage sur la dotation de '+x.dataset.slice(0,4)+' – '):'')+(x.title||x.dataset),
   dataset:x.dataset,publisherUrl:x.publisherUrl,rows:x.rows,sourceScope:x.dataset
 }));
 // These 2023/2025 staffing survey CSVs have a published Federal Public
 // Service respondent group. Display only that original partition here,
 // never all employers mixed together.
 const publicSurvey=(restored?.files||[]).filter(x=>x.organizationField).flatMap(x=>{
   const key=Object.keys(x.partitions||{}).find(k=>norm(k)==='federalpublicservice');
   if(!key)return [];
   const part=x.partitions[key];if(!part.path)return [];
   return [{
     name:x.originalName,path:part.path,category:'restored',
     titleEn:x.dataset+' – '+(x.title||x.originalName)+' – '+key,
     titleFr:'Sondage sur la dotation de '+x.dataset.slice(0,4)+' – '+(x.title||x.originalName)+' – '+key,
     dataset:x.dataset,publisherUrl:x.publisherUrl,rows:part.rows,sourceScope:key
   }];
 });
 return PSC.concat(W,O,complete,publicSurvey);
}
const W_TITLES={
 'pses2022-indigenous-women.csv':['2022 employee survey: Indigenous women','Sondage de 2022 : femmes autochtones'],
 'pses2022-racialized-women.csv':['2022 employee survey: racialized women','Sondage de 2022 : femmes racisées'],
 'pses2022-women-with-disability.csv':['2022 employee survey: women with disabilities','Sondage de 2022 : femmes en situation de handicap'],
 'pses2022-women.csv':['2022 employee survey: women','Sondage de 2022 : femmes'],
 'pses2024-women-with-disabilities.csv':['2024 employee survey: women with disabilities','Sondage de 2024 : femmes en situation de handicap'],
 'pses2024-women-men.csv':['2024 employee survey: women and men','Sondage de 2024 : femmes et hommes'],
 'pses2024-groups.csv':['2024 employee survey: equity groups','Sondage de 2024 : groupes visés par l’équité'],
 'snps2021-men-intersections.csv':['2021 staffing survey: intersecting identities among men','Sondage sur la dotation de 2021 : identités croisées chez les hommes'],
 'snps2021-women-intersections.csv':['2021 staffing survey: intersecting identities among women','Sondage sur la dotation de 2021 : identités croisées chez les femmes'],
 'snps2025-biases-barriers.csv':['2025 staffing survey: barriers and bias','Sondage sur la dotation de 2025 : obstacles et préjugés'],
 'women-by-organization-2025.csv':['Women by department and agency, 2025','Femmes selon le ministère ou l’organisme, 2025'],
 'women-by-region-2025.csv':['Women by region of work, 2025','Femmes selon la région de travail, 2025'],
 'women-by-occupational-category-2025.csv':['Women by occupational category, 2025','Femmes selon la catégorie professionnelle, 2025'],
 'women-by-occupational-group-2025.csv':['Women by occupational group, 2025','Femmes selon le groupe professionnel, 2025'],
 'women-executives-by-level-2017-2025.csv':['Women executives by level, 2017–2025','Femmes cadres selon le niveau, 2017-2025'],
 'women-representation-2017-2025.csv':['Women: workforce representation, 2017–2025','Femmes : représentation au sein de l’effectif, 2017-2025'],
 'women-hires-promotions-separations.csv':['Women: hiring, promotions and departures','Femmes : embauches, promotions et départs'],
 'women-share-of-salary-ranges-2025.csv':['Women: published salary bands, 2025','Femmes : tranches salariales publiées, 2025'],
 'women-in-other-groups-2025.csv':['Women in intersecting equity groups, 2025','Femmes dans les groupes visés par l’équité, 2025'],
 'women-age-language-2025.csv':['Women by age and first official language, 2025','Femmes selon l’âge et la première langue officielle, 2025'],
 'women-executive-movements-2024-25.csv':['Women: executive-level employment movements, 2024–25','Femmes : mouvements de l’effectif de direction, 2024-2025'],
 'salary-distribution-by-group-2025.csv':['Published salary distribution by group, 2025','Répartition salariale publiée selon le groupe, 2025'],
 'share-women-by-group-2025.csv':['Share of women by equity group, 2025','Part des femmes selon le groupe visé par l’équité, 2025'],
 'psc-promotion-rates-women-vs-men-2010-2023.csv':['Staffing: promotion rates for women and men, 2010–2023','Dotation : taux de promotion des femmes et des hommes, 2010-2023'],
 'psc-promotion-rates-women-by-group-2010-2023.csv':['Staffing: promotion rates for women by group, 2010–2023','Dotation : taux de promotion des femmes selon le groupe, 2010-2023'],
 'psc-audit-recruitment-stages.csv':['Recruitment stages: PSC audit evidence','Étapes de recrutement : données de vérification de la CFP']
};
function human(s){return s.replace(/\.csv$/i,'').replace(/^(TBS_|DI_)/,'').replace(/_/g,' ').replace(/-/g,' ');}
const LABELS={
 FISCAL_YEAR:['Fiscal year','Exercice'],fiscal_year:['Fiscal year','Exercice'],Fiscal_Year:['Fiscal year','Exercice'],
 Year:['Year','Année'],year:['Year','Année'],month_end_date:['Reference date','Date de référence'],
 description_e:['Reported measure','Indicateur publié'],Description:['Reported measure','Indicateur publié'],
 description_f:['Reported measure','Indicateur publié'],geo_region_e:['Region','Région'],
 geo_region_f:['Region','Région'],region_e:['Region','Région'],region_f:['Region','Région'],
 first_official_language_e:['First official language','Première langue officielle'],
 staffing_act_appt_type_e:['Staffing or appointment type','Type de dotation ou de nomination'],
 emp_equity_designated_group_e:['Employment equity group','Groupe visé par l’équité en matière d’emploi'],
 age_group_e:['Age group','Groupe d’âge'],department_e:['Department or agency','Ministère ou organisme'],
 Organization:['Department or agency','Ministère ou organisme'],Organisation:['Department or agency','Ministère ou organisme'],
 n:['Published number','Nombre publié'],N:['Published number','Nombre publié'],count:['Published number','Nombre publié'],
 Women:['Women','Femmes'],'Women (%)':['Women (%)','Femmes (%)'],
 'Persons with disabilities':['Persons with disabilities','Personnes en situation de handicap'],
 'Indigenous Peoples':['Indigenous peoples','Peuples autochtones'],
 'All Employees':['All employees','Tous les employés'],
 'Question':['Survey question','Question du sondage'],
 'Question Value':['Reported answer','Réponse déclarée'],
 'Women with disabilities (%)':['Women with disabilities (%)','Femmes en situation de handicap (%)'],
 'Employees':['Employees (count)','Employés (nombre)']
};
function headerName(s){return T(...(LABELS[s]||LABELS[s.replace(/_(?:e|f)$/,'')]||[s.replace(/_e$/,'').replace(/_/g,' '),s.replace(/_e$/,'').replace(/_/g,' ')]));}

function heading(e){return T(e.titleEn||e.name,e.titleFr||e.titleEn||e.name);}
function fields(h){
 const wanted=[],seen=new Set();
 for(let i=0;i<h.length;i++){
  const v=h[i],base=v.replace(/_(e|f|E|F)$/,'');
  if(/_(?:f|F)$/.test(v)&&h.includes(base+'_e'))continue;
  if(seen.has(base))continue;
  seen.add(base);
  const french=h.indexOf(base+'_f');
  wanted.push({col:i,fr:/(?:_e|_E)$/.test(v)&&french>=0?french:-1,label:headerName(v)});
 }
 return wanted;
}
function quote(s){let v=String(s??'');if(/^[\s]*[=+@]/.test(v)||/^\s*-(?!\d+(?:[.,]\d+)?$)/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function exportCSV(entry,rows){
 const b='\ufeff'+[entry.data.head,...rows].map(r=>r.map(quote).join(',')).join('\r\n');
 const u=URL.createObjectURL(new Blob([b],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=u;a.download='GC-Equity-'+entry.name.replace(/\.csv$/i,'')+'-filtered.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);
}
async function loadEntry(e){
 if(cache.has(e.path)){const existing=cache.get(e.path);cache.delete(e.path);cache.set(e.path,existing);return existing;}
 const promise=fetch(e.path).then(async r=>{
  if(!r.ok)throw Error('HTTP '+r.status);
  if(e.path.endsWith('.gz')){
   if(!window.DecompressionStream)throw Error('Compressed dataset is not supported in this browser');
   return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text();
  }
  return r.text();
 }).then(parseCSV);
 cache.set(e.path,promise);
 // Two source files are enough for quick switching without accumulating a large
 // number of parsed CSV arrays during a long browser session.
 while(cache.size>2)cache.delete(cache.keys().next().value);
 try{return await promise;}catch(error){cache.delete(e.path);throw error;}
}
function setState(message){const el=$('gce-raw-status');if(el)el.textContent=message;}
function mount(){
 const host=$('public-data-library');if(!host)return;
 if(!coverage||!pscIndex)return;
 const data=entries();
 const cats=[
 ['psc',T('PSC data across the public service','Données de la CFP dans l’ensemble de la fonction publique')],
 ['women',T('Women and intersectional data','Données sur les femmes et l’intersectionnalité')],
 ['tbs',T('Workforce source tables','Tableaux sources sur l’effectif')],
 ['derived',T('Independent salary estimates','Estimations salariales indépendantes')],
 ['restored',T('Additional complete workforce and staffing tables','Autres tableaux complets sur l’effectif et la dotation')]
 ];
 const options=cats.map(([v,label])=>'<option value="'+v+'">'+E(label)+' ('+data.filter(x=>x.category===v).length+')</option>').join('');
 host.innerHTML='<h3>'+E(T('Explore a complete published data table','Explorer un tableau de données publiées complet'))+'</h3>'+
 '<p class="gce-explain">'+E(T('Choose a dataset without leaving this page. Only 18 rows and up to eight columns are shown at once. View more columns if needed, search within the source, or download the full filtered table. Data categories have different reporting populations and should not be added together.','Choisissez un jeu de données sans quitter cette page. Seulement 18 lignes et au plus huit colonnes sont affichées à la fois. Vous pouvez afficher plus de colonnes, rechercher dans la source ou télécharger toutes les lignes filtrées. Les catégories n’ont pas les mêmes populations de référence et ne doivent pas être additionnées.'))+'</p>'+
 '<div class="gce-filter-panel"><div><label for="gce-raw-kind">'+E(T('Data collection','Collection de données'))+'</label><select id="gce-raw-kind">'+options+'</select></div>'+
 '<div><label for="gce-raw-file">'+E(T('Dataset','Jeu de données'))+'</label><select id="gce-raw-file"></select></div>'+
 '<div><label for="gce-raw-search">'+E(T('Find values in this dataset','Rechercher dans ces données'))+'</label><input type="search" id="gce-raw-search" placeholder="'+E(T('Search a term or value','Rechercher un terme ou une valeur'))+'"></div></div>'+
 '<div class="gce-inline-tools"><label><input type="checkbox" id="gce-raw-allcols"> '+E(T('Display all original columns','Afficher toutes les colonnes originales'))+'</label>'+
 '<button type="button" class="gce-download" id="gce-raw-export" disabled>'+E(T('Download filtered results (CSV)','Télécharger les résultats filtrés (CSV)'))+'</button></div>'+
 '<p role="status" aria-live="polite" id="gce-raw-status"></p><div id="gce-raw-table"></div>'+
 '<div class="gce-pager" id="gce-raw-pager" hidden><button type="button" id="gce-raw-prev">'+E(T('Previous','Précédent'))+'</button><span id="gce-raw-count" role="status" aria-live="polite"></span><button type="button" id="gce-raw-next">'+E(T('Next','Suivant'))+'</button></div>'+
 '<p class="gce-source" id="gce-raw-source"></p>';
 const kind=$('gce-raw-kind'),file=$('gce-raw-file'),search=$('gce-raw-search'),allCols=$('gce-raw-allcols'),button=$('gce-raw-export');
 function setFiles(){
  const choices=data.filter(x=>x.category===kind.value).sort((a,b)=>heading(a).localeCompare(heading(b),fr()?'fr':'en'));
  file.innerHTML=choices.map(x=>'<option value="'+E(x.path)+'">'+E(heading(x))+'</option>').join('');
  setEntry();
 }
 function setEntry(){
  const e=data.find(x=>x.path===file.value),id=++request;
  if(!e)return;
  active={...e,data:null,filtered:[],page:0};
  search.value='';allCols.checked=false;button.disabled=true;
  $('gce-raw-table').innerHTML='';$('gce-raw-pager').hidden=true;
  setState(T('Loading the selected source table…','Chargement du tableau source sélectionné…'));
  loadEntry(e).then(result=>{
   if(id!==request)return;
   active.data=result;button.disabled=false;
   setState(T('Showing records from this source only.','Données provenant uniquement de cette source.'));
   redraw(true);
  }).catch(error=>{if(id!==request)return;setState(T('This file could not be loaded; it is not replaced by another dataset.','Impossible de charger ce fichier; il n’est pas remplacé par un autre jeu de données.'));console.warn('GC Equity data source:',e.path,error);});
 }
 function redraw(reset){
  if(!active?.data)return;
  if(reset){const term=norm(search.value);active.filtered=term?active.data.rows.filter(r=>norm(r.join(' ')).includes(term)):active.data.rows;active.page=0;}
  const page=active.page,max=active.filtered.length;
  const cols=fields(active.data.head);
  let visible=allCols.checked?cols:cols.slice(0,8);
  if(!allCols.checked&&cols.length>8){
   const tail=cols.find(x=>/^(count|n|value|percent|percentage|weighted_response|pct)/i.test(x.label));
   if(tail&&!visible.includes(tail))visible=[...cols.slice(0,7),tail];
  }
  const body=active.filtered.slice(page*SIZE,(page+1)*SIZE).map(r=>'<tr>'+visible.map((x,j)=>{
   const val=x.fr>=0&&fr()?r[x.fr]||r[x.col]:r[x.col];
   return j===0?'<th scope="row">'+E(val)+'</th>':'<td>'+E(val)+'</td>';
  }).join('')+'</tr>').join('');
  $('gce-raw-table').innerHTML='<div class="gce-table-wrap" role="region" tabindex="0" aria-label="'+E(heading(active))+'"><table data-gcw-ready="yes"><caption>'+E(heading(active))+'</caption><thead><tr>'+visible.map(x=>'<th scope="col">'+E(x.label)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>';
  $('gce-raw-count').textContent=max?T('Rows ','Lignes ')+(page*SIZE+1)+'–'+Math.min((page+1)*SIZE,max)+' / '+max:T('No matching data.','Aucune donnée correspondante.');
  $('gce-raw-pager').hidden=max<=SIZE;
  $('gce-raw-prev').disabled=page===0;
  $('gce-raw-next').disabled=(page+1)*SIZE>=max;
  const source=$('gce-raw-source'),title=T('Source file: ','Fichier source : ')+active.name+'. ';
  source.textContent=title+(active.sourceScope?T('Published population or source category: ','Population publiée ou catégorie de source : ')+active.sourceScope+'. ':'')+T(active.category==='derived'?'Independent estimates; not official published TBS values.':'Reporting period and measures retain the original source definitions.',active.category==='derived'?'Estimations indépendantes, non officielles du Conseil du Trésor.':'La période et les indicateurs conservent les définitions de la source originale.');
  if(active.publisherUrl){const a=document.createElement('a');a.href=active.publisherUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=T('Original source','Source originale');source.append(' ');source.append(a);}
 }
 kind.addEventListener('change',setFiles);
 file.addEventListener('change',setEntry);
 let debounce=0;search.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(()=>redraw(true),160);});
 allCols.addEventListener('change',()=>redraw(false));
 $('gce-raw-prev').addEventListener('click',()=>{if(active?.page>0){active.page--;redraw(false);}});
 $('gce-raw-next').addEventListener('click',()=>{if(active&&(active.page+1)*SIZE<active.filtered.length){active.page++;redraw(false);}});
 button.addEventListener('click',()=>{if(active?.data)exportCSV(active,active.filtered);});
 setFiles();
}
async function render(){
 const host=$('public-data-library');if(!host)return;
 try{
  if(!coverage){const [a,b,d]=await Promise.all([
   fetch('assets/hosted-datasets.json').then(r=>r.json()),
   fetch('assets/psc-organization-index.json').then(r=>r.json()),
   fetch('assets/restored-datasets.json').then(r=>r.ok?r.json():{files:[]}).catch(()=>({files:[]}))
  ]);coverage=a;pscIndex=b;restored=d;}
  if(!host.isConnected)return;
  mount();
 }catch(e){host.innerHTML='<p role="alert">'+E(T('The source catalogue could not be loaded. Published summary tables remain available.','Impossible de charger le catalogue de sources. Les tableaux sommaires publiés demeurent disponibles.'))+'</p>';console.warn('dataset finder',e);}
}
window.GCEDataLibrary={render};
})();