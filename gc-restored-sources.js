/* Verified original source tables: organization-only, one table at a time.
   No public-service aggregate or unverified value is assigned to an employer. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const fr=()=>document.documentElement.lang.startsWith('fr');
const L=(e,f)=>fr()?f:e;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const PAGE=18;
let pending=0,manifestPromise=null;
const cache=new Map();
function parseCsv(s){
 let h=[],rows=[],row=[],v='',q=false;
 for(let i=0;i<s.length;i++){const c=s[i];
  if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
  else if(c==='"')q=true;
  else if(c===','){row.push(v);v='';}
  else if(c==='\r'||c==='\n'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(v);v='';if(row.some(x=>x!==''))rows.push(row);row=[];}
  else v+=c;
 }
 if(row.length||v){row.push(v);rows.push(row);}
 h=(rows.shift()||[]).map(x=>x.trim().replace(/^\ufeff/,''));
 return {headers:h,rows};
}
async function loadSource(path){
 if(cache.has(path)){const x=cache.get(path);cache.delete(path);cache.set(path,x);return x;}
 const promise=fetch(path).then(async r=>{
  if(!r.ok)throw Error('Source HTTP '+r.status);
  if(path.endsWith('.gz')){
   if(!window.DecompressionStream)throw Error('Gzip decompression unsupported');
   return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text();
  }
  return r.text();
 }).then(parseCsv);
 cache.set(path,promise);while(cache.size>4)cache.delete(cache.keys().next().value);
 try{return await promise;}catch(e){cache.delete(path);throw e;}
}
const quote=v=>{let s=String(v??'');if(/^\s*[=+@]/.test(s)||/^\s*-(?!\d+(\.\d+)?$)/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
function download(file,head,rows){
 const csv='\ufeff'+[head,...rows].map(r=>r.map(quote).join(',')).join('\r\n');
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 a.href=url;a.download='GC-Equity-'+file.originalName.replace(/\.csv$/i,'')+'-department.csv';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function sourceParts(file,name,frenchName){
 if(file.organizationScope){return norm(file.organizationScope)===norm(name)||norm(file.organizationScope)===norm(frenchName)?file.path||null:null;}
 if(!file.organizationField)return null;
 if(file.partitions){
  const key=Object.keys(file.partitions).find(x=>norm(x)===norm(name)||norm(x)===norm(frenchName));
  return key?file.partitions[key].path:null;
 }
 return file.path||null;
}
function attach(host,kind,files,name,frenchName,requestId){
 if(!host||!host.isConnected)return;
 if(!files.length){host.replaceChildren();return;}
 const title=kind==='workforce'?L('Detailed workforce and executive population tables','Tableaux détaillés sur l’effectif et les cadres'):L('Detailed staffing survey tables','Tableaux détaillés des sondages sur la dotation');
 host.innerHTML='<section class="gce-data-block">'+
  '<h3>'+esc(title)+'</h3>'+
  '<p class="gce-explain">'+esc(L('Choose a published dataset. Only records naming this organization will be displayed, with all original columns available for download.','Choisissez un jeu de données publié. Seules les lignes qui nomment cet organisme seront affichées, avec toutes les colonnes originales téléchargeables.'))+'</p>'+
  '<div class="gce-filter-panel"><div><label for="gce-restored-'+kind+'">'+esc(L('Dataset','Jeu de données'))+'</label><select id="gce-restored-'+kind+'">'+files.map((x,i)=>'<option value="'+i+'">'+esc(x.title||x.dataset)+'</option>').join('')+'</select></div>'+
  '<div><label for="gce-restored-query-'+kind+'">'+esc(L('Search within this dataset','Rechercher dans ce jeu de données'))+'</label><input type="search" id="gce-restored-query-'+kind+'" placeholder="'+esc(L('Question, group, year or term','Question, groupe, année ou terme'))+'"></div></div>'+
  '<div id="gce-restored-current-'+kind+'"></div></section>';
 const picker=$('gce-restored-'+kind),query=$('gce-restored-query-'+kind),area=$('gce-restored-current-'+kind);
 let active=null,serial=0,page=0,filtered=[],rows=[];
 async function show(){
  const token=++serial;
  const file=files[Number(picker.value)];
  const path=sourceParts(file,name,frenchName);
  if(!path)return;
  query.value='';area.innerHTML='<p role="status">'+esc(L('Loading published records…','Chargement des données publiées…'))+'</p>';
  try{
   const raw=await loadSource(path);
   if(requestId!==pending||token!==serial||!area.isConnected)return;
   const ix=file.organizationField?raw.headers.indexOf(file.organizationField):-1;
   if(file.organizationField&&ix<0)throw Error('Published organization field missing');
   rows=file.organizationScope?raw.rows:raw.rows.filter(r=>norm(r[ix])===norm(name)||norm(r[ix])===norm(frenchName));
   if(!rows.length){area.innerHTML='<p class="gce-unavailable">'+esc(L('No matching published rows for this employer in the selected file.','Aucune ligne publiée pour cet employeur dans le fichier choisi.'))+'</p>';return;}
   const visibleHeaders=raw.headers.slice(0,8),headers=raw.headers;
   area.innerHTML='<p class="gce-explain">'+esc(L('Published rows for this organization: ','Lignes publiées pour cet organisme : ')+rows.length)+'</p>'+
    '<div class="gce-inline-tools"><label><input type="checkbox" id="gce-restored-all-'+kind+'"> '+esc(L('Show all original columns','Afficher toutes les colonnes originales'))+'</label>'+
    '<button type="button" class="gce-download" id="gce-restored-export-'+kind+'">'+esc(L('Download all matching rows (CSV)','Télécharger toutes les lignes correspondantes (CSV)'))+'</button></div>'+
    '<div class="gce-table-wrap" role="region" tabindex="0" aria-label="'+esc(file.title||file.dataset)+'"><table data-gcw-ready="yes"><caption>'+esc(file.title||file.dataset)+'</caption><thead></thead><tbody></tbody></table></div>'+
    '<div class="gce-pager"><button type="button" class="gce-prev">'+esc(L('Previous','Précédent'))+'</button><span class="gce-count" role="status" aria-live="polite"></span><button type="button" class="gce-next">'+esc(L('Next','Suivant'))+'</button></div>'+
    '<p class="gce-source"><a href="'+esc(file.publisherUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(L('Original published source','Source originale publiée'))+'</a></p>';
   const header=area.querySelector('thead'),body=area.querySelector('tbody'),count=area.querySelector('.gce-count');
   const prev=area.querySelector('.gce-prev'),next=area.querySelector('.gce-next'),all=area.querySelector('input[type="checkbox"]');
   function draw(reset){
    if(reset){const q=norm(query.value);filtered=q?rows.filter(r=>norm(r.join(' ')).includes(q)):rows;page=0;}
    const cols=all.checked?headers.length:Math.min(8,headers.length);
    header.innerHTML='<tr>'+headers.slice(0,cols).map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr>';
    body.innerHTML=filtered.slice(page*PAGE,(page+1)*PAGE).map(r=>'<tr>'+r.slice(0,cols).map((v,i)=>i===0?'<th scope="row">'+esc(v)+'</th>':'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
    count.textContent=filtered.length?L('Rows ','Lignes ')+(page*PAGE+1)+'–'+Math.min((page+1)*PAGE,filtered.length)+' / '+filtered.length:L('No matching rows','Aucune ligne correspondante');
    prev.disabled=page===0;next.disabled=(page+1)*PAGE>=filtered.length;
   }
   area.querySelector('.gce-download').onclick=()=>download(file,headers,filtered);
   prev.onclick=()=>{if(page>0){page--;draw(false);}};
   next.onclick=()=>{if((page+1)*PAGE<filtered.length){page++;draw(false);}};
   all.onchange=()=>draw(false);
   query.oninput=()=>draw(true);
   draw(true);
  }catch(error){
   if(requestId!==pending||token!==serial)return;
   area.innerHTML='<p role="alert">'+esc(L('This source could not be opened. No alternative figures have been substituted.','Impossible d’ouvrir cette source. Aucune autre donnée ne lui a été substituée.'))+'</p>';
   console.warn('Original departmental source',error);
  }
 }
 picker.onchange=show;show();
}
async function render(name,frenchName,group){
 const id=++pending,workforce=$('org-restored-workforce'),surveys=$('org-restored-surveys');
 if(!workforce||!surveys)return;
 workforce.replaceChildren();surveys.replaceChildren();
 if(!name||group!=='all')return;
 try{
  if(!manifestPromise)manifestPromise=Promise.all([
    fetch('assets/restored-datasets.json').then(r=>{if(!r.ok)throw Error('No source index');return r.json();}),
    fetch('assets/organization-source-scopes.json').then(r=>{if(!r.ok)throw Error('No employer scope index');return r.json();})
  ]);
  const [source,scope]=await manifestPromise;
  if(id!==pending)return;
  const records=(source.files||[]).map(f=>{
   const override=(scope.scopeOverrides||[]).find(x=>f.originalName.startsWith(x.namePrefix));
   return override?{...f,organizationScope:override.organizationScope}:f;
  }).concat(scope.files||[]);
  const files=records.filter(f=>sourceParts(f,name,frenchName));
  const workforceFiles=files.filter(f=>!/Survey/i.test(f.dataset||''));
  const surveyFiles=files.filter(f=>/Survey/i.test(f.dataset||''));
  attach(workforce,'workforce',workforceFiles,name,frenchName,id);
  attach(surveys,'surveys',surveyFiles,name,frenchName,id);
 }catch(error){console.warn('Original source index',error);}
}
window.GCERestoredSources={render};
})();