/* Complete original department-specific workforce and staffing source tables.
   Sources are displayed only when this organization is explicitly named.
   No aggregate, neighbouring department, or missing value is substituted. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const lang=()=>document.documentElement.lang.startsWith('fr');
const L=(en,fr)=>lang()?fr:en;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const PER=18;
let indexPromise=null,request=0;
const fileCache=new Map();
function csvParse(input){
 let lines=[],row=[],v='',q=false;
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(q){if(c==='"'&&input[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
  else if(c==='"')q=true;
  else if(c===','){row.push(v);v='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;row.push(v);v='';if(row.some(z=>z!==''))lines.push(row);row=[];}
  else v+=c;
 }
 if(row.length||v){row.push(v);lines.push(row);}
 return {headers:(lines.shift()||[]).map(x=>x.trim().replace(/^\ufeff/,'')),rows:lines};
}
async function fileData(file){
 const key=file.path;
 if(fileCache.has(key))return fileCache.get(key);
 const result=fetch(key).then(r=>{if(!r.ok)throw Error('Source '+r.status);return r.text();}).then(csvParse);
 fileCache.set(key,result);
 while(fileCache.size>4)fileCache.delete(fileCache.keys().next().value);
 try{return await result;}catch(e){fileCache.delete(key);throw e;}
}
function csvDownload(file,headers,rows){
 const safe=s=>{let v=String(s??'');if(/^\s*[=+@]/.test(v)||/^\s*-(?!\d+(?:\.\d+)?$)/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
 const text='\ufeff'+[headers,...rows].map(a=>a.map(safe).join(',')).join('\r\n');
 const u=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=u;a.download='GC-Equity-'+file.path.split('/').pop().replace(/\.csv$/,'')+'-department.csv';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);
}
function addTable(host,file,data,rows,requestId){
 if(request!==requestId||!host.isConnected||!rows.length)return;
 const card=document.createElement('section');card.className='gce-data-block';card.dataset.fullSource=file.path;
 let page=0;
 const originalTitle=file.title||file.dataset;
 card.innerHTML='<h3>'+esc(originalTitle)+'</h3>'+
 '<p class="gce-explain">'+esc(L('Results are restricted to the selected organization. The source defines the reporting population and period.','Les résultats concernent uniquement l’organisme sélectionné. La source définit la population et la période de référence.'))+'</p>'+
 '<div class="gce-table-actions"><button type="button" class="gce-download">'+esc(L('Download all matching rows (CSV)','Télécharger toutes les lignes correspondantes (CSV)'))+'</button></div>'+
 '<div class="gce-table-wrap" role="region" tabindex="0" aria-label="'+esc(originalTitle)+'"><table data-gcw-ready="yes"><caption>'+esc(originalTitle)+'</caption><thead><tr>'+data.headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody></tbody></table></div>'+
 '<div class="gce-pager"><button type="button" class="gce-prev">'+esc(L('Previous','Précédent'))+'</button><span class="gce-count" role="status" aria-live="polite"></span><button type="button" class="gce-next">'+esc(L('Next','Suivant'))+'</button></div>'+
 '<p class="gce-source">'+esc(L('Source: ','Source : '))+'<a href="'+esc(file.publisherUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(L('Original published table','Tableau original publié'))+'</a></p>';
 const prev=card.querySelector('.gce-prev'),next=card.querySelector('.gce-next'),count=card.querySelector('.gce-count'),body=card.querySelector('tbody');
 const draw=()=>{
  body.innerHTML=rows.slice(page*PER,(page+1)*PER).map(row=>'<tr>'+row.map((x,i)=>i===0?'<th scope="row">'+esc(x)+'</th>':'<td>'+esc(x)+'</td>').join('')+'</tr>').join('');
  count.textContent=L('Rows ','Lignes ')+(page*PER+1)+'–'+Math.min((page+1)*PER,rows.length)+' / '+rows.length;
  prev.disabled=page===0;next.disabled=(page+1)*PER>=rows.length;
 };
 prev.onclick=()=>{if(page>0){page--;draw();}};
 next.onclick=()=>{if((page+1)*PER<rows.length){page++;draw();}};
 card.querySelector('.gce-download').onclick=()=>csvDownload(file,data.headers,rows);
 host.appendChild(card);draw();
}
async function render(name,frenchName,group){
 const id=++request;
 const workforce=$('org-restored-workforce'),surveys=$('org-restored-surveys');
 if(!workforce||!surveys)return;
 workforce.replaceChildren();surveys.replaceChildren();
 if(!name||group!=='all')return;
 try{
  if(!indexPromise)indexPromise=fetch('assets/restored-datasets.json').then(r=>{if(!r.ok)throw Error('No source index');return r.json();});
  const manifest=await indexPromise;
  if(id!==request)return;
  const files=(manifest.files||[]).filter(f=>!!f.organizationField);
  for(const file of files){
   const data=await fileData(file);
   if(id!==request)return;
   const column=data.headers.indexOf(file.organizationField);
   if(column<0)continue;
   const rows=data.rows.filter(r=>norm(r[column])===norm(name)||norm(r[column])===norm(frenchName));
   if(!rows.length)continue;
   const target=/Survey/.test(file.dataset)?surveys:workforce;
   addTable(target,file,data,rows,id);
  }
 }catch(e){console.warn('Organization source:',e);}
}
window.GCERestoredSources={render};
})();