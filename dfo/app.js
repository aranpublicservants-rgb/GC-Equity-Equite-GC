/* DFO evidence: direct published records, with source-specific populations. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const matches=(hay,q)=>norm(q).split(/\s+/).filter(Boolean).every(t=>norm(hay).includes(t));
const norm=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const en=['at-a-glance','data-guide','who-works','hiring','experience','harassment','accommodation','promised','planned','accessibility-plan','recourse','coast-guard','missing','data-library','actions','sources'];
const fr=['apercu','guide-donnees','qui-travaille','embauche','experience-fr','harcelement','mesures-adaptation','promesses','plans','plan-accessibilite','recours','garde-cotiere','manquant','bibliotheque','agir','sources-fr'];
let lang=new URL(location.href).searchParams.get('lang')==='fr'?'fr':'en';
const L=(a,b,l=lang)=>l==='fr'?b:a;
const money=v=>String(v??'');
function csvDownload(name,headers,rows){const cell=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const blob=new Blob(['\ufeff'+[headers,...rows].map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);}
function tableExports(root=document){$$('.table-scroll',root).forEach(w=>{if(w.dataset.exportReady||w.closest('.library')||w.closest('.evidence-chart'))return;w.dataset.exportReady='true';const t=$('table',w);if(!t)return;const wrap=document.createElement('div');wrap.className='table-tools';const b=document.createElement('button');b.type='button';const l=w.closest('[lang]')?.lang||lang;b.textContent=L('Download this table (CSV)','Télécharger ce tableau (CSV)',l);b.addEventListener('click',()=>{const rows=$$('tr',t).map(tr=>$$('th,td',tr).map(c=>c.textContent.trim()));csvDownload('dfo-table.csv',rows.shift()||[],rows);});wrap.append(b);w.after(wrap);});}
function setLanguage(next,update=true){
 const previous=lang;lang=next==='fr'?'fr':'en';document.documentElement.lang=lang;
 $('#lang-en').hidden=lang!=='en';$('#lang-fr').hidden=lang!=='fr';
 $$('[data-label-en]').forEach(n=>n.textContent=n.dataset[lang==='fr'?'labelFr':'labelEn']);
 const b=$('#language');b.textContent=L('Français','English');b.lang=L('fr','en');b.setAttribute('aria-label',L('Afficher cette page en français','Read this page in English'));
 $('#skip').textContent=L('Skip to main content','Aller au contenu principal');document.title=L('Equity at DFO | GC Equity','Équité au MPO | Équité GC');
 if(update){const u=new URL(location.href);u.searchParams.set('lang',lang);const old=decodeURIComponent(u.hash.slice(1)),source=previous==='fr'?fr:en,target=lang==='fr'?fr:en;const i=source.indexOf(old);if(i>=0)u.hash=target[i];history.replaceState(null,'',u);if(u.hash){const n=document.getElementById(u.hash.slice(1));if(n)n.scrollIntoView();}}
 $('#notice').textContent=L('English selected.','Français sélectionné.');
 document.dispatchEvent(new CustomEvent('dfo:languagechange',{detail:{language:lang}}));
}
$('#language').addEventListener('click',()=>setLanguage(lang==='en'?'fr':'en'));
$$('.mobile-jump select').forEach(s=>s.addEventListener('change',()=>{location.hash=s.value;document.getElementById(s.value)?.focus({preventScroll:true});}));
$$('h2').forEach(h=>h.tabIndex=-1);
function expandAnchor(){const id=decodeURIComponent(location.hash.slice(1));if(!id)return;let n=document.getElementById(id);if(!n)return;const l=n.closest('[lang]')?.lang;if(l&&l!==lang)setLanguage(l);for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;}
window.addEventListener('hashchange',expandAnchor);
if('IntersectionObserver'in window){const io=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){const id=e.target.id;$$('.contents a').forEach(a=>{if(a.hash==='#'+id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-5% 0px -75% 0px'});$$('article>section>h2').forEach(h=>io.observe(h));}

let summaryPromise;
const summary=()=>summaryPromise??=fetch('data/survey-summary.json').then(r=>{if(!r.ok)throw Error('Survey unavailable');return r.json();}).then(d=>{for(const g of Object.values(d.groups))for(const[q,r]of Object.entries(g.questions)){r.label_en=d.definitions[q].en;r.label_fr=d.definitions[q].fr;}return d.groups;});
const keys={experience:['Q12','Q24','Q42','Q43','Q45','Q47','Q49','Q52','Q53','Q58','Q63','Q65','Q70','Q72'],accommodation:['Q84','Q85','Q86','Q87','Q88','Q44e','Q73p','Q73q'],mentalhealth:['Q25','Q51','Q77','Q78','Q81']};
const val=(v,l)=>v==='X'||v==='x'?L('Suppressed (X)','Supprimé (X)',l):v==='9999'||v===''||v===null||v===undefined?L('Not applicable / unavailable','Sans objet / non disponible',l):v+'%';
$$('.survey-widget').forEach(w=>{const picker=$('select',w),box=$('.survey-result',w);let sequence=0;picker.addEventListener('change',async()=>{const token=++sequence,l=w.dataset.lang;box.setAttribute('aria-busy','true');box.innerHTML='<p role="status">'+L('Loading group results…','Chargement des résultats du groupe…',l)+'</p>';try{const d=await summary();if(token!==sequence)return;const g=d[picker.value];const rows=keys[w.dataset.kind].filter(q=>g.questions[q]).map(q=>{const v=g.questions[q];return'<tr><th scope="row">'+esc(v[l==='fr'?'label_fr':'label_en'])+'</th><td>'+esc(val(v.value,l))+'</td><td>'+esc(v.n===null||v.n===undefined?L('Not published','Non publié',l):v.n==='X'?L('Suppressed','Supprimé',l):v.n)+'</td></tr>';}).join('');box.innerHTML='<div class="table-scroll" role="region" tabindex="0" aria-label="'+esc(g[l])+'"><table><caption>'+esc(L('PSES 2024 · DFO · ','SAFF 2024 · MPO · ',l)+g[l])+'</caption><thead><tr><th scope="col">Question</th><th scope="col">'+L('Published result','Résultat publié',l)+'</th><th scope="col">'+L('Rounded responses','Réponses arrondies',l)+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>';tableExports(box);}catch(e){box.innerHTML='<p role="alert">'+L('The selected group could not be loaded. Use the official CSV linked below.','Impossible de charger le groupe choisi. Consultez le fichier CSV officiel ci-dessous.',l)+'</p>';}finally{box.removeAttribute('aria-busy');}});});

function parseCSV(text){text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quote=false;for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quote=false;else cell+=c;}else if(c==='"')quote=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}const headers=rows.shift()||[];return{headers,rows};}
const decode=async bytes=>{if(!('DecompressionStream'in window))throw Error('Compressed sources require a modern browser');return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();};
let cataloguePromise;const catalogue=()=>cataloguePromise??=fetch('data/catalogue.json').then(r=>{if(!r.ok)throw Error('Catalogue unavailable');return r.json();});
const cache=new Map();
async function readFile(file,l){
 if(cache.has(file.id))return cache.get(file.id);
 const response=await fetch(file.path);if(!response.ok)throw Error('Source unavailable');let result;
 if(file.format==='csv.gz.b64'||file.format==='dictionary-json.gz.b64'){const binary=atob((await response.text()).trim());const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const text=await decode(bytes);if(file.format==='dictionary-json.gz.b64'){const d=JSON.parse(text);result={headers:d.headers,rows:d.rows.map(r=>r.map((v,i)=>d.values[i][v]))};}else result=parseCSV(text);}
 else if(file.format==='csv.gz')result=parseCSV(await decode(await response.arrayBuffer()));
 else if(file.format==='branch-json.gz'){
  const rows=JSON.parse(await decode(await response.arrayBuffer())),m=file.meta,branches=new Map(file.department.branches.map(b=>[Number(b.id),b]));
  result={headers:['Department','Branch ID','Branch (English)','Branch (French)','Employee group (English)','Employee group (French)','Demographic condition','Question','Question (English)','Question (French)',...file.schema],rows:rows.map(r=>['Fisheries and Oceans Canada',r[0],branches.get(r[0])?.en||'',branches.get(r[0])?.fr||'',m.demographics[r[1]]?.en||'',m.demographics[r[1]]?.fr||'',m.demographics[r[1]]?.code||'',m.questions[r[2]]?.id||r[2],m.questions[r[2]]?.en||'',m.questions[r[2]]?.fr||'',...r.slice(3)])};
 }else result=parseCSV(await response.text());
 if(cache.size>3)cache.delete(cache.keys().next().value);cache.set(file.id,result);return result;
}
const headerLabels={DESCRIP_E:['Employee group (English)','Groupe (anglais)'],DESCRIP_F:['Employee group (French)','Groupe (français)'],QUESTION:['Question code','Code de question'],TITLE_E:['Question (English)','Question (anglais)'],TITLE_F:['Question (French)','Question (français)'],SURVEYR:['Survey year','Année du sondage'],POSITIVE:['Positive answers (%)','Réponses positives (%)'],NEGATIVE:['Negative answers (%)','Réponses négatives (%)'],ANSCOUNT:['Rounded responses','Réponses arrondies'],shr_w_resp:['Weighted share','Part pondérée'],total_w_resp:['Weighted total','Total pondéré'],department_e:['Department (English)','Ministère (anglais)'],department_f:['Department (French)','Ministère (français)'],fiscal_year:['Fiscal year','Exercice'],question:['Question code','Code de question'],question_value_e:['Response (English)','Réponse (anglais)'],question_value_f:['Response (French)','Réponse (français)']};
const label=(h,l)=>headerLabels[h]?.[l==='fr'?1:0]||h;
function usefulColumns(headers,l){
 const target=l==='fr'?['SURVEYR','DESCRIP_F','QUESTION','TITLE_F','ANSWER1','POSITIVE','NEGATIVE','ANSCOUNT']:['SURVEYR','DESCRIP_E','QUESTION','TITLE_E','ANSWER1','POSITIVE','NEGATIVE','ANSCOUNT'];
 if(headers.includes('DESCRIP_E'))return target.map(h=>headers.indexOf(h)).filter(i=>i>=0);
 if(headers.includes('Branch ID'))return [l==='fr'?'Branch (French)':'Branch (English)',l==='fr'?'Employee group (French)':'Employee group (English)','Question',l==='fr'?'Question (French)':'Question (English)','AGREE','MOSTNEG','ANSCOUNT'].map(h=>headers.indexOf(h)).filter(i=>i>=0);
 const excluded=/^(dept_|department_|LEVEL\d|BYCOND)|_f$|_fr$|^French|^fr$/i;
 const other=headers.map((h,i)=>[h,i]).filter(([h])=>!excluded.test(h));
 return other.slice(0,9).map(([,i])=>i);
}
function dimensions(headers,rows,l){
 const candidates=[];const year=headers.findIndex(h=>/^(SURVEYR|fiscal_year|year|Year|Fiscal Year|Année)$/.test(h));
 const group=headers.indexOf(l==='fr'?'DESCRIP_F':'DESCRIP_E');if(group>=0)candidates.push(group);
 if(year>=0)candidates.push(year);
 const q=headers.findIndex(h=>/^(QUESTION|Question|question)$/.test(h));if(q>=0)candidates.push(q);
 if(headers.includes('Branch ID'))candidates.push(headers.indexOf(l==='fr'?'Branch (French)':'Branch (English)'),headers.indexOf(l==='fr'?'Employee group (French)':'Employee group (English)'));
 for(let i=0;i<headers.length&&candidates.length<4;i++){
  if(candidates.includes(i)||/dept|department|level|title|value|resp|count|positive|negative|neutral|agree|mostpos|mostneg|^ans|score|^shr|^total|_f$|_fr$/i.test(headers[i]))continue;
  const vals=new Set(rows.map(r=>r[i]));if(vals.size>1&&vals.size<100&&[...vals].some(v=>isNaN(Number(v))))candidates.push(i);
 }
 return [...new Set(candidates)].slice(0,4);
}

$$('.library').forEach(lib=>{
 const l=lib.dataset.lang,topic=$('.topic-filter',lib),search=$('.file-search',lib),picker=$('.dataset-picker',lib),box=$('.data-view',lib);let files=[],active=null,sequence=0;
 function fileList(preferredId,initialFilters={}){if(typeof preferredId!=='string')preferredId='';const q=norm(search.value);const choices=files.filter(f=>(topic.value==='all'||f.topic===topic.value)&&(!q||matches(f.en+' '+f.fr+' '+f.sourceFile,q)));const previous=picker.value;picker.innerHTML=choices.map(f=>'<option value="'+esc(f.id)+'">'+esc(f[l]+' ('+f.rows.toLocaleString(l)+' '+L('rows','lignes',l)+')')+'</option>').join('');if(preferredId&&choices.some(f=>f.id===preferredId))picker.value=preferredId;else if(choices.some(f=>f.id===previous))picker.value=previous;else if(!q&&topic.value==='all'){const official=choices.find(f=>f.sourceFile==='official/EEINFODV-dfo.csv');if(official)picker.value=official.id;}if(!choices.length){box.innerHTML='<p role="status">'+L('No files match. Clear the search or change the topic.','Aucun fichier correspondant. Effacez la recherche ou changez de sujet.',l)+'</p>';return;}return show(initialFilters);}
 async function show(initialFilters={}){
  const file=files.find(f=>f.id===picker.value);if(!file)return;const token=++sequence;active=file;box.innerHTML='<p role="status">'+L('Loading DFO records…','Chargement des données du MPO…',l)+'</p>';box.setAttribute('aria-busy','true');
  try{
   const data=await readFile(file,l);if(token!==sequence)return;const{headers,rows}=data;let selected=new Set(usefulColumns(headers,l)),filtered=rows,page=0,sortIndex=-1,sortDirection=1;
   box.innerHTML='<h3>'+esc(file[l])+'</h3><p class="small">'+esc(L('Scope: DFO only. Keep the source year, population and response definition.','Portée : MPO seulement. Conservez l’année, la population et la définition des réponses de la source.',l))+'</p><p class="small">'+(file.method==='cross-site-extract'?L('Source: existing research collection. Check its methods and underlying primary references.','Source : collection de recherche existante. Consultez ses méthodes et ses références primaires.',l):L('Published cells are retained. X means suppressed; blank and 9999 remain distinct in the download. Weighted totals are not sample counts.','Les cellules publiées sont conservées. X signifie supprimé; les champs vides et 9999 restent distincts dans le téléchargement. Les totaux pondérés ne sont pas des effectifs de répondants.',l))+'</p><div class="record-filters"></div><label>'+L('Search within this file','Rechercher dans ce fichier',l)+'<input class="row-query" type="search" placeholder="'+L('Question, group, region or year','Question, groupe, région ou année',l)+'"></label><div class="data-toolbar"><button type="button" class="download-rows">'+L('Download filtered records (CSV)','Télécharger les lignes filtrées (CSV)',l)+'</button><button type="button" class="reset-records">'+L('Clear record filters','Effacer les filtres des lignes',l)+'</button></div><details class="column-picker"><summary>'+L('Choose columns','Choisir les colonnes',l)+'</summary><div></div></details><div class="table-scroll" role="region" tabindex="0" aria-label="'+esc(file[l])+'"><table class="record-table"><caption>'+esc(file[l])+'</caption><thead></thead><tbody></tbody></table></div><div class="pager"><button class="previous" type="button">'+L('Previous','Précédent',l)+'</button><span class="page-count" role="status"></span><button class="next" type="button">'+L('Next','Suivant',l)+'</button></div><p class="source"><a href="'+esc(file.source)+'">'+L('Published source and documentation','Source publiée et documentation',l)+'</a></p>';
   const filters=$('.record-filters',box),query=$('.row-query',box),thead=$('thead',box),tbody=$('tbody',box),columns=$('.column-picker div',box),count=$('.page-count',box),prev=$('.previous',box),next=$('.next',box),dims=dimensions(headers,rows,l);let selectors=[];
   for(const ix of dims){const vals=[...new Set(rows.map(r=>r[ix]).filter(v=>v!==''&&v!==undefined))].sort((a,b)=>String(a).localeCompare(String(b),l,{numeric:true}));const lab=document.createElement('label');lab.textContent=label(headers[ix],l);const s=document.createElement('select');s.setAttribute('aria-label',label(headers[ix],l));s.innerHTML='<option value="">'+L('All','Tous',l)+'</option>'+vals.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');lab.append(s);filters.append(lab);s.addEventListener('change',()=>draw(true));selectors.push({ix,s});}
   headers.forEach((h,i)=>{const lab=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.checked=selected.has(i);c.addEventListener('change',()=>{if(c.checked)selected.add(i);else if(selected.size>1)selected.delete(i);else c.checked=true;draw(false);});lab.append(c,document.createTextNode(label(h,l)));columns.append(lab);});
   function draw(reset){if(reset){const q=norm(query.value);filtered=rows.filter(r=>selectors.every(({ix,s})=>!s.value||r[ix]===s.value)&&(!q||matches(r.join(' '),q)));page=0;}
    if(sortIndex>=0)filtered=[...filtered].sort((a,b)=>String(a[sortIndex]??'').localeCompare(String(b[sortIndex]??''),l,{numeric:true})*sortDirection);
    const cols=[...selected].sort((a,b)=>a-b);thead.innerHTML='<tr>'+cols.map(i=>'<th scope="col"'+(sortIndex===i?' aria-sort="'+(sortDirection===1?'ascending':'descending')+'"':'')+'><button type="button" data-column="'+i+'">'+esc(label(headers[i],l))+(sortIndex===i?(sortDirection===1?' ↑':' ↓'):'')+'</button></th>').join('')+'</tr>';
    tbody.innerHTML=filtered.slice(page*20,page*20+20).map(r=>'<tr>'+cols.map((i,j)=>{const v=r[i],display=v===null||v===undefined||v===''?L('Unavailable','Non disponible',l):v==='9999'?L('Not applicable (9999)','Sans objet (9999)',l):v==='X'?L('Suppressed (X)','Supprimé (X)',l):v;return(j===0?'<th scope="row">':'<td>')+esc(display)+(j===0?'</th>':'</td>');}).join('')+'</tr>').join('')||'<tr><td colspan="'+cols.length+'">'+L('No matching records','Aucune ligne correspondante',l)+'</td></tr>';
    count.textContent=filtered.length?L('Rows ','Lignes ',l)+(page*20+1)+'–'+Math.min(page*20+20,filtered.length)+' / '+filtered.length.toLocaleString(l):L('No matching records','Aucune ligne correspondante',l);prev.disabled=page===0;next.disabled=(page+1)*20>=filtered.length;
   }
   thead.addEventListener('click',e=>{const b=e.target.closest('[data-column]');if(!b)return;const ix=Number(b.dataset.column);sortDirection=sortIndex===ix?-sortDirection:1;sortIndex=ix;page=0;draw(false);});
   query.addEventListener('input',()=>draw(true));prev.addEventListener('click',()=>{if(page>0){page--;draw(false);}});next.addEventListener('click',()=>{if((page+1)*20<filtered.length){page++;draw(false);}});
   $('.download-rows',box).addEventListener('click',()=>csvDownload('dfo-'+file.id+'.csv',headers,filtered));$('.reset-records',box).addEventListener('click',()=>{query.value='';selectors.forEach(({s})=>s.value='');sortIndex=-1;draw(true);});
   if(initialFilters&&typeof initialFilters==='object'){
    if(initialFilters.group){const group=selectors.find(({ix})=>headers[ix]===(l==='fr'?'DESCRIP_F':'DESCRIP_E'));if(group&&[...group.s.options].some(o=>o.value===initialFilters.group))group.s.value=initialFilters.group;}
    if(initialFilters.question){const q=selectors.find(({ix})=>/^(QUESTION|Question|question)$/.test(headers[ix]));if(q&&[...q.s.options].some(o=>o.value===initialFilters.question))q.s.value=initialFilters.question;}
   }draw(true);
  }catch(e){if(token!==sequence)return;box.innerHTML='<p role="alert">'+L('This file could not be opened. Use its published source below. No substitute figures are shown.','Ce fichier n’a pas pu être ouvert. Consultez la source publiée ci-dessous. Aucune autre donnée n’est substituée.',l)+'</p><a href="'+esc(file.source)+'">'+L('Open source','Ouvrir la source',l)+'</a>';}
  finally{if(token===sequence)box.removeAttribute('aria-busy');}
 }
 topic.addEventListener('change',fileList);let debounce;search.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(fileList,180);});picker.addEventListener('change',show);
 let started=false;async function start(){if(started)return;started=true;try{files=(await catalogue()).files;fileList();}catch(e){box.innerHTML='<p role="alert">'+L('The source register could not be loaded. The evidence sections and source links remain available.','Impossible de charger le registre. Les sections de données et les liens sources restent disponibles.',l)+'</p>';}}
 document.addEventListener('dfo:open-dataset',async e=>{const request=e.detail;if(request?.language!==l||!request.id)return;started=true;try{files=(await catalogue()).files;if(!files.some(f=>f.id===request.id))throw Error('Unknown source');topic.value='all';search.value='';clearTimeout(debounce);await fileList(request.id,request.filters||{});const h=$('h3',box);if(h){h.tabIndex=-1;h.focus({preventScroll:true});h.scrollIntoView({block:'start',behavior:'auto'});}else lib.scrollIntoView({block:'start'});}catch(error){box.innerHTML='<p role="alert">'+L('The requested source could not be opened. Choose it from the source list.','La source demandée n’a pas pu être ouverte. Choisissez-la dans la liste des sources.',l)+'</p>';}});
 if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){start();io.disconnect();}},{rootMargin:'400px'});io.observe(lib);}else start();
});

let opened=[];
function beforePrint(){opened=$$('details[open]');$$('details').forEach(d=>d.open=true);}
function afterPrint(){$$('details').forEach(d=>d.open=opened.includes(d));document.body.classList.remove('print-single');$$('.print-target').forEach(n=>n.classList.remove('print-target'));}
window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
$$('.print-section').forEach(b=>b.addEventListener('click',()=>{document.body.classList.add('print-single');b.closest('section').classList.add('print-target');window.print();}));
tableExports();setLanguage(lang,false);expandAnchor();
})();
