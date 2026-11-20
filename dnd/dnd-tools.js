/* DND branch comparisons and local drafting tools. No personal information is sent. */
(function(root,factory){'use strict';const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else{root.DNDTools=model;model.mount();}})(typeof globalThis==='object'?globalThis:this,function(){'use strict';
const L=(a,b,l)=>l==='fr'?b:a;
function difference(actual,availability){
 if(String(actual??'').trim()===''||String(availability??'').trim()==='')return null;
 const a=Number(actual),b=Number(availability);
 return Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&a<=100&&b>=0&&b<=100?Math.round((a-b)*1000000)/1000000:null;
}
function requestText({language='en',recipient='',items=[],purpose=''}={}){
 if(!items.length)return null;
 const l=language,lines=[L('To: ','Destinataire : ',l)+recipient,'',L('Subject: Request for aggregate DND workforce and barrier data','Objet : Demande de données agrégées sur l’effectif et les obstacles au MDN',l),'',L('Please provide the latest available published or releasable aggregate information on:','Veuillez fournir les renseignements agrégés les plus récents, publiés ou communicables, sur les éléments suivants :',l),'',...items.map(x=>'• '+x),''];
 if(purpose.trim())lines.push(L('Purpose: ','But : ',l)+purpose.trim(),'');
 lines.push(L('For each table, include the reference date or period, population and exclusions, definitions, original source, and the method used. Where available, include comparable earlier periods, targets, a responsible office and reported results.','Pour chaque tableau, veuillez préciser la date ou période de référence, la population et les exclusions, les définitions, la source originale et la méthode. Si disponibles, veuillez inclure des périodes antérieures comparables, les cibles, le bureau responsable et les résultats déclarés.',l),'',L('Please provide an accessible spreadsheet or CSV, with suppressed and unavailable values clearly identified. Do not provide names, personal case details or information that could identify individuals. Preserve disclosure controls and explain any limits on release.','Veuillez fournir un tableur accessible ou un fichier CSV, en indiquant clairement les valeurs supprimées ou indisponibles. Veuillez exclure les noms, les détails de dossiers personnels et tout renseignement permettant d’identifier une personne. Veuillez respecter les règles de confidentialité et expliquer toute limite à la communication.',l),'',L('If the information is held elsewhere, please identify the responsible office or the published source. For unavailable information, please explain the gap and whether an aggregate table can be produced.','Si un autre bureau détient les renseignements, veuillez l’indiquer ou préciser la source publiée. Pour les renseignements indisponibles, veuillez expliquer la lacune et préciser si un tableau agrégé peut être produit.',l));
 return lines.join('\n');
}
function cellValue(value,l){
 if(/^x$/i.test(String(value)))return L('Suppressed (X)','Supprimé (X)',l);
 if(value===null||value===undefined||String(value).trim()===''||String(value)==='9999')return L('Unavailable','Non disponible',l);
 const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=100?n.toLocaleString(l,{maximumFractionDigits:2})+L('%',' %',l):L('Unavailable','Non disponible',l);
}
function branchRows(data,{question='Q42',group='5',branch='205',view='branches'}={}){
 const labels=view==='groups'?data.groups:data.branches;
 return labels.map(label=>({en:label.en,fr:label.fr,...(data.cells[view==='groups'?branch:label.id]?.[view==='groups'?label.id:group]?.[question]||{value:null,n:null})}));
}
function mount(){
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function download(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 $$('.request-builder').forEach(box=>{
  const l=box.dataset.lang,out=$('.request-output',box),status=$('.request-status',box),copy=$('.copy-request',box),save=$('.download-request',box);
  function invalidate(){copy.disabled=true;save.disabled=true;out.hidden=true;out.textContent='';status.textContent='';}
  box.addEventListener('input',invalidate);
  $('.generate-request',box).addEventListener('click',()=>{
   const items=$$('input[type=checkbox]:checked',box).map(x=>x.dataset.requestLabel);
   const text=requestText({language:l,recipient:$('.request-recipient',box).value,items,purpose:$('.request-purpose',box).value});
   if(!text){status.textContent=L('Select at least one data topic.','Choisissez au moins un sujet de données.',l);$('input[type=checkbox]',box).focus();return;}
   out.textContent=text;out.hidden=false;copy.disabled=false;save.disabled=false;status.textContent=L('Request ready. Review it, then copy or download it.','Demande prête. Vérifiez-la, puis copiez-la ou téléchargez-la.',l);out.focus({preventScroll:true});out.scrollIntoView({block:'nearest'});
  });
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(out.textContent);status.textContent=L('Request copied.','Demande copiée.',l);}catch(e){const range=document.createRange();range.selectNodeContents(out);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);out.focus();status.textContent=L('Text selected. Use your device’s copy command.','Texte sélectionné. Utilisez la commande de copie de votre appareil.',l);}});
  save.addEventListener('click',()=>download('dnd-data-request-'+l+'.txt',out.textContent));
 });
 $$('.gap-calculator').forEach(box=>{
  const l=box.dataset.lang,a=$('.calc-representation',box),b=$('.calc-wfa',box),out=$('.calc-result',box);
  const calculate=()=>{const d=difference(a.value,b.value);a.setAttribute('aria-invalid',String(!a.validity.valid||a.value===''));b.setAttribute('aria-invalid',String(!b.validity.valid||b.value===''));if(d===null){out.textContent=L('Enter two percentages between 0 and 100.','Saisissez deux pourcentages de 0 à 100.',l);(!a.value||!a.validity.valid?a:b).focus();return;}out.textContent=d===0?L('Representation equals availability: 0 percentage points.','La représentation est égale à la disponibilité : 0 point de pourcentage.',l):Math.abs(d).toLocaleString(l,{maximumFractionDigits:6})+' '+(d<0?L('percentage points below availability.','points de pourcentage sous la disponibilité.',l):L('percentage points above availability.','points de pourcentage au-dessus de la disponibilité.',l));};
  $('.calculate-gap',box).addEventListener('click',calculate);box.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();calculate();}});box.addEventListener('input',()=>{out.textContent='';a.removeAttribute('aria-invalid');b.removeAttribute('aria-invalid');});
 });
 let branchPromise;const load=()=>branchPromise??=fetch('data/branch-summary.json').then(r=>{if(!r.ok)throw Error('Branch data unavailable');return r.json();});
 const state={question:'Q42',group:null,branch:null,view:'branches'};
 const branchRoots=[];
 $$('.branch-explorer').forEach(box=>{
  const l=box.dataset.lang;let data,started=false,rows=[];
  function render(){
   const q=data.questions[state.question],g=data.groups.find(x=>x.id===state.group),b=data.branches.find(x=>x.id===state.branch),unit=state.view==='groups'?L('Employee group','Groupe de personnes',l):L('Branch','Secteur',l);
   $('.branch-question',box).value=state.question;$('.branch-group',box).value=state.group;$('.branch-unit',box).value=state.branch;$('.branch-view',box).value=state.view;
   $('.branch-group',box).closest('label').hidden=state.view!=='branches';$('.branch-unit',box).closest('label').hidden=state.view!=='groups';
   rows=branchRows(data,state);const caption=L('Civilian PSES 2024 · ','SAFF civil 2024 · ',l)+q[l]+' · '+(state.view==='groups'?b[l]:g[l]);
   $('.branch-results',box).innerHTML='<div class="table-scroll" role="region" tabindex="0" aria-label="'+esc(caption)+'"><table><caption>'+esc(caption)+'</caption><thead><tr><th scope="col">'+unit+'</th><th scope="col">'+L('Published result','Résultat publié',l)+'</th><th scope="col">'+L('Rounded responses','Réponses arrondies',l)+'</th></tr></thead><tbody>'+rows.map(r=>'<tr><th scope="row">'+esc(r[l])+'</th><td>'+esc(cellValue(r.value,l))+'</td><td>'+esc(r.n===null||r.n===undefined||r.n===''||String(r.n)==='9999'?L('Unavailable','Non disponible',l):r.n)+'</td></tr>').join('')+'</tbody></table></div>';
   $('.branch-method',box).textContent=(q.direction==='coast-guard'?L('This question describes requests or their basis; its percentage is not a performance rating.','Cette question décrit les demandes ou leur motif; son pourcentage n’est pas une évaluation du rendement.',l):q.direction==='lower'?L('A lower percentage is favourable for this selected response.','Un pourcentage plus faible est favorable pour la réponse choisie.',l):L('A higher percentage is favourable for this selected response.','Un pourcentage plus élevé est favorable pour la réponse choisie.',l))+' '+L('Blank values and code 9999 are unavailable; X is suppressed. They are never displayed as zero. Groups overlap. Do not average these percentages to create a departmental result.','Les valeurs vides et le code 9999 sont indisponibles; X est supprimé. Ces valeurs ne sont jamais affichées comme zéro. Les groupes se chevauchent. Ne faites pas la moyenne des pourcentages pour produire un résultat ministériel.',l);
  }
  async function start(){if(started)return;started=true;box.setAttribute('aria-busy','true');try{
   data=await load();if(state.group===null)state.group=data.groups.find(x=>x.en==='Indigenous')?.id||data.groups[0].id;if(state.branch===null)state.branch=data.branches[0].id;const options=items=>items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x[l])+'</option>').join('');
   box.innerHTML='<div class="branch-controls filter-grid"><label>'+L('Question','Question',l)+'<select class="branch-question">'+options(Object.values(data.questions))+'</select></label><label>'+L('Compare','Comparer',l)+'<select class="branch-view"><option value="branches">'+L('Branches for one group','Secteurs pour un groupe',l)+'</option><option value="groups">'+L('Groups within one branch','Groupes dans un secteur',l)+'</option></select></label><label>'+L('Employee group','Groupe de personnes',l)+'<select class="branch-group">'+options(data.groups)+'</select></label><label>'+L('Branch','Secteur',l)+'<select class="branch-unit">'+options(data.branches)+'</select></label></div><p class="branch-method small"></p><div class="branch-results"></div><div class="data-toolbar"><button type="button" class="branch-download">'+L('Download this comparison (CSV)','Télécharger cette comparaison (CSV)',l)+'</button><button type="button" class="branch-full">'+L('Open complete branch source','Ouvrir la source complète par secteur',l)+'</button></div><p class="source"><a href="'+esc(data.source[l])+'">'+L('Official branch data and methods','Données et méthodes officielles par secteur',l)+'</a></p><div class="branch-status visually-hidden" role="status"></div>';
   for(const[key,cls]of[['question','branch-question'],['view','branch-view'],['group','branch-group'],['branch','branch-unit']])$('.'+cls,box).addEventListener('change',e=>{state[key]=e.target.value;for(const item of branchRoots)item.render();$('.branch-status',box).textContent=L('Comparison updated.','Comparaison mise à jour.',l);});
   $('.branch-download',box).addEventListener('click',()=>{const q=data.questions[state.question],quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"',headers=[L('Question','Question',l),state.view==='groups'?L('Group','Groupe',l):L('Branch','Secteur',l),L('Published result (%) or source marker','Résultat publié (%) ou code source',l),L('Rounded responses','Réponses arrondies',l)];download('dnd-branches-'+state.question+'-'+l+'.csv',[headers,...rows.map(r=>[q[l],r[l],r.value,r.n])].map(r=>r.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');});
   $('.branch-full',box).addEventListener('click',()=>document.dispatchEvent(new CustomEvent('dnd:open-dataset',{detail:{language:l,id:'pses-2024-branches',filters:{question:state.question}}})));
   branchRoots.push({render});render();
  }catch(e){box.innerHTML='<p role="alert">'+L('The focused branch view could not load. Use the complete branch source in the data library.','La vue par secteur n’a pas pu être chargée. Consultez la source complète par secteur dans la bibliothèque.',l)+'</p>';}finally{box.removeAttribute('aria-busy');}}
  document.addEventListener('dnd:languagechange',()=>{if(data)render();});
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){start();observer.disconnect();}},{rootMargin:'300px'});observer.observe(box);}else start();
 });
}
return{difference,requestText,cellValue,branchRows,mount};
});
