/* Public-service data library: one page, one selected dataset, full-source exports.
   Files are loaded only when opened. Department-labelled files are never treated as
   whole-public-service totals. The Drive manifest is only an audit of file coverage. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fr=()=>document.documentElement.lang.startsWith('fr');
const T=(en,frs)=>fr()?frs:en;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
let coverage=null,pscIndex=null,cache=new Map(),request=0,active=null;
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
 const W=(coverage?.hostedAdditional?.women||[]).map(x=>({...x,category:'women',titleEn:human(x.name),titleFr:human(x.name),kind:'Women and intersectional dataset',kindFr:'Données sur les femmes et l’intersectionnalité'}));
 const O=(coverage?.hostedAdditional?.other||[]).map(x=>({...x,category:x.kind==='derived'?'derived':'tbs',titleEn:human(x.name),titleFr:human(x.name),kind:x.kind==='derived'?'Independent derived analysis':'Treasury Board source file',kindFr:x.kind==='derived'?'Analyse dérivée indépendante':'Fichier source du Conseil du Trésor'}));
 return PSC.concat(W,O);
}
function human(s){return s.replace(/\.csv$/i,'').replace(/^(TBS_|DI_)/,'').replace(/_/g,' ').replace(/-/g,' ');}
function heading(e){return T(e.titleEn||e.name,e.titleFr||e.titleEn||e.name);}
function fields(h){
 const wanted=[],seen=new Set();
 for(let i=0;i<h.length;i++){
  const v=h[i],base=v.replace(/_(e|f|E|F)$/,'');
  if(/_(?:f|F)$/.test(v)&&h.includes(base+'_e'))continue;
  if(seen.has(base))continue;
  seen.add(base);
  const french=h.indexOf(base+'_f');
  wanted.push({col:i,fr:/(?:_e|_E)$/.test(v)&&french>=0?french:-1,label:v.replace(/_e$/,'').replace(/_/g,' ')});
 }
 return wanted;
}
function quote(s){let v=String(s??'');if(/^[\s]*[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function exportCSV(entry,rows){
 const b='\ufeff'+[entry.data.head,...rows].map(r=>r.map(quote).join(',')).join('\r\n');
 const u=URL.createObjectURL(new Blob([b],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=u;a.download='GC-Equity-'+entry.name.replace(/\.csv$/i,'')+'-filtered.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);
}
async function loadEntry(e){
 if(cache.has(e.path))return cache.get(e.path);
 const promise=fetch(e.path).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text();}).then(parseCSV);
 cache.set(e.path,promise);
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
 ['derived',T('Independent salary estimates','Estimations salariales indépendantes')]
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
  $('gce-raw-source').textContent=T('Source: ','Source : ')+active.name+'. '+T(active.category==='derived'?'Independent estimates; not official published TBS values.':'Published dataset. Source reporting populations and periods vary.',active.category==='derived'?'Estimations indépendantes, non officielles du Conseil du Trésor.':'Données publiées. Les populations et périodes de référence varient.');
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
  if(!coverage){const [a,b]=await Promise.all([
   fetch('assets/data-coverage-audit.json').then(r=>r.json()),
   fetch('assets/psc-organization-index.json').then(r=>r.json())
  ]);coverage=a;pscIndex=b;}
  if(!host.isConnected)return;
  mount();
 }catch(e){host.innerHTML='<p role="alert">'+E(T('The source catalogue could not be loaded. Published summary tables remain available.','Impossible de charger le catalogue de sources. Les tableaux sommaires publiés demeurent disponibles.'))+'</p>';console.warn('dataset finder',e);}
}
window.GCEDataLibrary={render};
})();