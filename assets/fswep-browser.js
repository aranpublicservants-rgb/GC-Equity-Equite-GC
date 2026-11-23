/* In-browser, read-only viewer of the pinned public PSC November 2026 CSV.
   No third-party service, remote search, server-side storage or derived equity metrics. */
(()=>{'use strict';
const url='data/open-canada-2026-11/psc-fswep-referrals/fswep_depts_ads_referrals_opengov-as-of-november-5-2026-single-tab.csv.gz';
const expectedRows=72822, pageSize=50;
const load=document.getElementById('fswep-load');
const search=document.getElementById('fswep-search');
const clear=document.getElementById('fswep-clear');
const status=document.getElementById('fswep-status');
const tableWrap=document.getElementById('fswep-table-wrap');
const head=document.getElementById('fswep-head');
const body=document.getElementById('fswep-body');
const pages=document.getElementById('fswep-pages');
const prev=document.getElementById('fswep-prev'),next=document.getElementById('fswep-next');
const pageLabel=document.getElementById('fswep-page');
let cols=[],rows=[],filtered=[],current=0,sortCol=-1,ascending=true,language='en',loaded=false,delay=null;
const messages={
 en:{ready:'The file loads only when requested. Your search stays in this browser.',loading:'Loading and checking the complete public source file…',bad:'This version could not be verified. Use the official publisher link above.',unsupported:'This browser cannot decompress GZIP. Use the publisher or archived download.',records:n=>n.toLocaleString('en-CA')+' of '+rows.length.toLocaleString('en-CA')+' source records shown.',page:(p,total)=>'Page '+p+' of '+total,empty:'No matching records'},
 fr:{ready:'Le fichier se charge seulement sur demande. Votre recherche demeure dans ce navigateur.',loading:'Chargement et vérification du fichier source public intégral…',bad:'Cette version ne peut être vérifiée. Utilisez le lien officiel ci-dessus.',unsupported:'Ce navigateur ne peut décompresser le format GZIP. Utilisez le téléchargement officiel ou archivé.',records:n=>n.toLocaleString('fr-CA')+' demandes affichées sur '+rows.length.toLocaleString('fr-CA')+'.',page:(p,total)=>'Page '+p+' sur '+total,empty:'Aucun résultat'}
};
const t=(k,...a)=>typeof messages[language][k]==='function'?messages[language][k](...a):messages[language][k];
function parseCsv(input){
 const output=[],record=[]; let field='',quoted=false;
 if(input.charCodeAt(0)===0xFEFF)input=input.slice(1);
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(c==='"'){
   if(quoted&&input[i+1]==='"'){field+='"';i++;}
   else quoted=!quoted;
  }else if(c===','&&!quoted){record.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&input[i+1]==='\n')i++;
   record.push(field);field='';
   if(record.some(x=>x!==''))output.push(record.splice(0));
   else record.length=0;
  }else{field+=c;}
 }
 if(quoted)throw Error('Unclosed quoted field');
 if(field!==''||record.length){record.push(field);output.push(record);}
 return output;
}
function drawHead(){
 head.replaceChildren();
 cols.forEach((name,i)=>{
  const th=document.createElement('th'),button=document.createElement('button');
  th.scope='col';th.setAttribute('aria-sort',sortCol===i?(ascending?'ascending':'descending'):'none');
  button.type='button';button.textContent=name||('Column '+(i+1));
  button.title=language==='fr'?'Trier cette colonne':'Sort this column';
  button.addEventListener('click',()=>{
   if(sortCol===i)ascending=!ascending;else{sortCol=i;ascending=true;}
   applyFilter();
  });
  th.append(button);head.append(th);
 });
}
function showPage(){
 const total=Math.max(1,Math.ceil(filtered.length/pageSize));
 current=Math.min(Math.max(0,current),total-1);
 const frag=document.createDocumentFragment();
 for(const idx of filtered.slice(current*pageSize,(current+1)*pageSize)){
  const tr=document.createElement('tr');
  for(let i=0;i<cols.length;i++){
   const td=document.createElement('td');
   td.textContent=rows[idx][i]||'';
   tr.append(td);
  }
  frag.append(tr);
 }
 body.replaceChildren(frag);
 prev.disabled=current===0;next.disabled=current>=total-1;
 pageLabel.textContent=t('page',current+1,total);
 status.textContent=filtered.length?t('records',filtered.length):t('empty');
}
function applyFilter(){
 if(!loaded)return;
 const q=search.value.trim().toLocaleLowerCase();
 filtered=[];
 rows.forEach((row,i)=>{if(!q||row.some(cell=>cell.toLocaleLowerCase().includes(q)))filtered.push(i);});
 if(sortCol>=0){
  const collator=new Intl.Collator(language==='fr'?'fr-CA':'en-CA',{numeric:true,sensitivity:'base'});
  filtered.sort((a,b)=>{const x=rows[a][sortCol]||'',y=rows[b][sortCol]||'';
   return (ascending?1:-1)*collator.compare(x,y);});
 }
 current=0;drawHead();showPage();
}
window._applyLang=lang=>{
 language=lang==='fr'?'fr':'en';
 document.documentElement.lang=language;
 document.title=language==='fr'?'Demandes de présentation du PFETÉ | Équité-GC':'FSWEP public referral requests | GC Equity';
 document.querySelectorAll('[data-en][data-fr]').forEach(el=>el.textContent=el.dataset[language]);
 if(loaded){drawHead();showPage();}
 else if(!load.disabled)status.textContent=t('ready');
};
let preferred=new URLSearchParams(location.search).get('lang');
try{preferred=preferred||localStorage.getItem('gcEquityLang');}catch{}
window._applyLang(preferred);
load.addEventListener('click',async()=>{
 if(loaded||load.disabled)return;
 load.disabled=true;status.textContent=t('loading');
 if(!('DecompressionStream' in window)){status.textContent=t('unsupported');load.disabled=false;return;}
 try{
  const response=await fetch(url);
  if(!response.ok||!response.body)throw Error('Source not hosted');
  const data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();
  const parsed=parseCsv(data);
  cols=parsed.shift()||[];rows=parsed;
  if(cols.length<3||rows.length!==expectedRows)throw Error('Incomplete source or unexpected version');
  loaded=true;search.disabled=false;clear.disabled=false;
  tableWrap.hidden=false;pages.hidden=false;
  applyFilter();
 }catch(error){console.error('FSWEP source validation failed:',error);status.textContent=t('bad');load.disabled=false;}
});
search.addEventListener('input',()=>{clearTimeout(delay);delay=setTimeout(applyFilter,180);});
clear.addEventListener('click',()=>{search.value='';applyFilter();search.focus();});
prev.addEventListener('click',()=>{if(current>0){current--;showPage();}});
next.addEventListener('click',()=>{if((current+1)*pageSize<filtered.length){current++;showPage();}});
})();