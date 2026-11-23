/* GC Equity independent, privacy-safe evidence review. No remote analytics or personal data storage. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const G=['source','workforce','survey','staffing','action'];
const STATES=['unreviewed','checked','followup','unavailable'];
const S={
 en:{review:'Review status',notes:'Working note (no personal information)',notePlaceholder:'Optional: source, limitation or next step',follow:'Suggested next step and related evidence',open:'Open related evidence',shown:' checks shown',of:' of 50 checks',reviewed:'reviewed',followups:'need follow-up',unavailable:'evidence unavailable',nothing:'No checks match these filters.',retry:'The check list could not be loaded. Reload or consult the source inventory.',copied:'Review summary copied.',copyFailed:'Copy is not available here. Use the CSV download.',cleared:'Statuses and notes cleared.',confirm:'Clear every status and note from this page?',statusNames:['Not yet reviewed','Checked against source','Follow-up needed','Evidence unavailable'],csv:['ID','Evidence area','Check','Question to verify','Suggested next step','Review status','Working note','Related evidence URL'],summary:'Evidence quality review',noNotes:'No working note'},
 fr:{review:"État de l’examen",notes:"Note de travail (sans renseignements personnels)",notePlaceholder:"Facultatif : source, limite ou prochaine étape",follow:"Suivi proposé et données connexes",open:"Consulter les données connexes",shown:" vérifications affichées",of:" sur 50 vérifications",reviewed:"examinées",followups:"nécessitent un suivi",unavailable:"données indisponibles",nothing:"Aucune vérification ne correspond à ces filtres.",retry:"Impossible de charger les vérifications. Rechargez la page ou consultez le répertoire des sources.",copied:"Résumé de l’examen copié.",copyFailed:"La copie n’est pas disponible ici. Utilisez le téléchargement CSV.",cleared:"États et notes effacés.",confirm:"Effacer tous les états et toutes les notes de cette page?",statusNames:["Non encore examiné","Vérifié dans la source","Suivi nécessaire","Données indisponibles"],csv:["ID","Domaine de données","Vérification","Question à vérifier","Suivi proposé","État de l’examen","Note de travail","Adresse des données connexes"],summary:"Examen de la qualité des données",noNotes:"Aucune note de travail"}
};
let data=null;
const selected=new Map(),notes=new Map();
const fr=()=>document.documentElement.lang.toLowerCase().startsWith('fr');
const lang=()=>fr()?'fr':'en';
const t=(en,frText)=>fr()?frText:en;
const msg=text=>{$('review-message').textContent=text;};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
const make=(tag,cls,text,parent)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;if(parent)parent.appendChild(el);return el;};
const status=id=>selected.get(id)||'unreviewed';
const note=id=>notes.get(id)||'';
function localHref(path){const url=new URL(path,location.href);if(url.origin!==location.origin||!url.pathname.startsWith(new URL('.',location.href).pathname))return 'sources.html';url.searchParams.set('lang',lang());return url.pathname+url.search+url.hash;}
function labels(){
 document.querySelectorAll('[data-en][data-fr]').forEach(el=>{el.textContent=el.dataset[lang()];});
 document.querySelectorAll('[data-aria-en][data-aria-fr]').forEach(el=>el.setAttribute('aria-label',el.dataset[fr()?'ariaFr':'ariaEn']));
 document.querySelectorAll('[data-placeholder-en][data-placeholder-fr]').forEach(el=>el.setAttribute('placeholder',el.dataset[fr()?'placeholderFr':'placeholderEn']));
 document.querySelectorAll('[data-home-en][data-home-fr]').forEach(el=>el.textContent=el.dataset[fr()?'homeFr':'homeEn']);
 document.querySelectorAll('.site-header a[href],footer a[href]').forEach(a=>{if(a.hostname===location.hostname||!a.hostname){if(a.id==='home-link'||a.id==='footer-home'||a.closest('nav'))a.href=localHref(new URL(a.href,location.href).pathname.split('/').pop()+(new URL(a.href,location.href).hash||''));}});
 $('language-switch').textContent=fr()?'English':'Français';
 $('language-switch').lang=fr()?'en':'fr';
 document.title=t('Evidence quality review: 50 checks | GC Equity','Examen de la qualité des données : 50 vérifications | Équité-GC');
}
function statusSelect(check){
 const wrapper=make('div','',null),label=make('label','',S[lang()].review,wrapper);
 const input=make('select','review-status',null,label);input.id='state-'+check.id;label.htmlFor=input.id;
 STATES.forEach((key,i)=>{const option=new Option(S[lang()].statusNames[i],key);input.add(option);});
 input.value=status(check.id);input.addEventListener('change',()=>{
  if(input.value==='unreviewed')selected.delete(check.id);else selected.set(check.id,input.value);
  wrapper.closest('.review-item').dataset.status=input.value;
  count();
  if($('review-status-filter').value!=='all'){render();$('review-status-filter').focus();}
 });
 return wrapper;
}
function noteField(check){
 const wrapper=make('div','',null),label=make('label','',S[lang()].notes,wrapper),area=make('textarea','review-note',null,label);
 area.id='note-'+check.id;label.htmlFor=area.id;area.maxLength=280;area.rows=2;area.value=note(check.id);area.placeholder=S[lang()].notePlaceholder;
 area.addEventListener('input',()=>{if(area.value.trim())notes.set(check.id,area.value.slice(0,280));else notes.delete(check.id);});
 return wrapper;
}
function card(check){
 const entry=make('article','review-item',null);entry.id='review-'+check.id;entry.dataset.status=status(check.id);
 const top=make('div','item-top',null,entry);
 make('span','item-number',check.id,top);
 make('h3','',check[lang()].title,top);
 make('p','check-question',check[lang()].check,entry);
 const detail=make('details','',null,entry);
 make('summary','',S[lang()].follow,detail);
 make('p','',check[lang()].action,detail);
 const link=make('a','',S[lang()].open,make('p','',null,detail));
 link.href=localHref(check.url);
 const fields=make('div','item-fields',null,entry);
 fields.append(statusSelect(check),noteField(check));
 return entry;
}
function matches(c){
 const q=norm($('review-query').value),g=$('review-group').value,s=$('review-status-filter').value;
 if(g!=='all'&&g!==c.group)return false;
 if(s!=='all'&&s!==status(c.id))return false;
 if(!q)return true;
 const h=c[lang()];
 return norm([h.title,h.check,h.action,c.id,data.groups[c.group][lang()]].join(' ')).includes(q);
}
function count(){
 if(!data)return;
 const shown=data.checks.filter(matches).length;
 const done=data.checks.filter(c=>status(c.id)!=='unreviewed').length;
 const follow=data.checks.filter(c=>status(c.id)==='followup').length;
 const absent=data.checks.filter(c=>status(c.id)==='unavailable').length;
 const txt=String(shown)+S[lang()].of+' · '+String(done)+' '+S[lang()].reviewed+' · '+String(follow)+' '+S[lang()].followups+' · '+String(absent)+' '+S[lang()].unavailable;
 $('review-count').textContent=txt;
}
function render(){
 if(!data)return;
 const root=$('review-list');root.replaceChildren();root.setAttribute('aria-busy','true');
 let total=0;
 for(const group of G){
  const filtered=data.checks.filter(c=>c.group===group&&matches(c));if(!filtered.length)continue;
  total+=filtered.length;
  const section=make('section','review-group',null,root);section.id='checks-'+group;
  const head=make('div','review-group-header',null,section);
  const title=make('h2','',data.groups[group][lang()],head);title.id='checks-'+group+'-title';section.setAttribute('aria-labelledby',title.id);
  make('span','review-group-count',String(filtered.length),head);
  const cards=make('div','review-items',null,section);
  filtered.forEach(c=>cards.append(card(c)));
 }
 if(!total)make('p','empty',S[lang()].nothing,root);
 root.setAttribute('aria-busy','false');count();
}
function csvCell(value){
 let text=String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
 // Prefix possible spreadsheet formulas after whitespace; preserve legitimate negative numeric cells.
 if(/^\s*[=+@]/.test(text)||/^\s*-(?!\d+(?:[.,]\d+)?\s*$)/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
function download(){
 if(!data)return;
 const h=S[lang()].csv;
 const rows=[h,...data.checks.map(c=>[c.id,data.groups[c.group][lang()],c[lang()].title,c[lang()].check,c[lang()].action,S[lang()].statusNames[STATES.indexOf(status(c.id))],note(c.id),new URL(localHref(c.url),location.href).href])];
 const blob=new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=fr()?'Equite-GC-examen-50-points.csv':'GC-Equity-50-point-review.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
 msg(t('The 50 checks were exported, including statuses and notes.','Les 50 vérifications ont été exportées, avec les états et les notes.'));
}
function summary(){
 const header=S[lang()].summary+' — '+new Date().toLocaleDateString(fr()?'fr-CA':'en-CA');
 const lines=[header,'', $('review-count').textContent,''];
 for(const c of data.checks){lines.push(c.id+'. '+c[lang()].title+' — '+S[lang()].statusNames[STATES.indexOf(status(c.id))]);if(note(c.id))lines.push('   '+note(c.id));lines.push('   '+new URL(localHref(c.url),location.href).href);}
 return lines.join('\n');
}
async function copy(){
 if(!data)return;
 try{if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error('clipboard');await navigator.clipboard.writeText(summary());msg(S[lang()].copied);}catch{msg(S[lang()].copyFailed);}
}
function switchLanguage(){
 const next=fr()?'en':'fr';document.documentElement.lang=next;
 const url=new URL(location.href);url.searchParams.set('lang',next);history.replaceState(history.state,'',url.pathname+url.search+url.hash);
 labels();render();msg('');
}
async function load(){
 try{
  const response=await fetch('data/evidence-review-50.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
  const body=await response.json();
  if(body.schema!==1||!Array.isArray(body.checks)||body.checks.length!==50)throw Error('Invalid review catalogue');
  const ids=new Set();
  for(const c of body.checks){
   if(ids.has(c.id)||!G.includes(c.group)||!/^\d\d$/.test(c.id)||!c.en?.title||!c.fr?.title||!c.en?.check||!c.fr?.check||!c.en?.action||!c.fr?.action||!c.url)throw Error('Incomplete review content');
   ids.add(c.id);
  }
  data=body;$('download-review').disabled=false;$('copy-review').disabled=false;render();
 }catch(e){$('review-list').replaceChildren(make('p','empty',S[lang()].retry));$('review-list').setAttribute('aria-busy','false');msg(S[lang()].retry);}
}
$('language-switch').addEventListener('click',switchLanguage);
$('review-query').addEventListener('input',render);
$('review-group').addEventListener('change',render);
$('review-status-filter').addEventListener('change',render);
$('download-review').addEventListener('click',download);
$('copy-review').addEventListener('click',copy);
$('print-review').addEventListener('click',()=>window.print());
$('clear-review').addEventListener('click',()=>{if(!data||!window.confirm(S[lang()].confirm))return;selected.clear();notes.clear();render();msg(S[lang()].cleared);});
labels();load();
})();
