/* Readable option labels and keyboard/touch equivalents to native hover tooltips. */
(()=>{
'use strict';
const doc=document,script=doc.currentScript;if(!script?.src||doc.documentElement.dataset.gceOptionDescriptions)return;
doc.documentElement.dataset.gceOptionDescriptions='1';
const base=new URL('./',script.src),style=doc.createElement('link');style.rel='stylesheet';style.href=new URL('gc-option-descriptions.css',base);doc.head.append(style);
const managed=new WeakMap(),pending=new Set();let queued=false,seq=0;
const fr=s=>(s.closest('[lang]')?.lang||doc.documentElement.lang||'en').toLowerCase().startsWith('fr');
const tr=(s,en,f)=>fr(s)?f:en;
const node=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function label(s){return [...(s.labels||[])].map(n=>[...n.childNodes].filter(x=>x.nodeType===3).map(x=>x.textContent.trim()).join(' ')).join(' ')||s.getAttribute('aria-label')||'';}
function isQuestion(s){return /question|(?:^|-)staff-q$|(?:^|-)gap-q$/.test(s.id)||/question|énoncé|statement/i.test(label(s));}
const typo=(s,text)=>fr(s)?String(text).replace(/ (?=[:%;?!])/g,'\u00a0'):String(text);
function optionText(o){return (o.textContent||'').trim();}
const dictionaryCache=new Map();
function sourceDictionary(s,code){
 const scope=s.closest('.dv-widget,.dp-data-view,.data-view,.gce-data-block,.psx-output,.staff-explorer');
 if(!scope)return null;
 const links=[...scope.querySelectorAll('a[href]')].map(a=>a.href);
 if(/^STA_/i.test(code)&&links.some(u=>/8766bf91-d14c-423b-a5d1-ac47f5b4dd22/i.test(u)))return 'staffing-2025';
 if(!/^Q\d/i.test(code))return null;
 const pses=links.filter(u=>/pses|saff|ses-2025|EEINFODV|subset-1-sous-ensemble-1/i.test(u));
 if(pses.length&&pses.some(u=>/\/(?:ses-2025|pses-2024)\//i.test(u))&&!pses.some(u=>/2017|2018|2019|2020|2022|2023/i.test(u)))return 'pses-2024';
 return null;
}
function dictionary(kind){
 if(!dictionaryCache.has(kind)){
  const entry={data:null,promise:null};dictionaryCache.set(kind,entry);
  const path=kind==='pses-2024'?'assets/department-branch-definitions.json':'assets/department-page-model.json';
  entry.promise=fetch(new URL(path,base)).then(r=>{if(!r.ok)throw Error('Source unavailable');return r.json();}).then(data=>{
   entry.data=kind==='pses-2024'?Object.fromEntries(data.questions.map(q=>[q.id,q])):data.staffingQuestions;
  }).catch(()=>{entry.data={};});
 }
 return dictionaryCache.get(kind);
}
function codeLabel(s,o){
 const code=o.dataset.gceQuestionCode||optionText(o);
 if(!/^(?:Q\d{1,3}(?:[a-z]|\_\d+)?|STA_[A-Z0-9_]+)$/i.test(code))return optionText(o);
 o.dataset.gceQuestionCode=code;
 const kind=sourceDictionary(s,code);let found=null;
 if(kind){
  const entry=dictionary(kind);
  const key=kind==='pses-2024'?code.replace(/^Q(\d{1,2})(?=[a-z_]|$)/i,(_,n)=>'Q'+n.padStart(2,'0')):code;
  if(entry.data===null){if(s.dataset.gceQuestionWaiting!==kind){s.dataset.gceQuestionWaiting=kind;entry.promise.finally(()=>{delete s.dataset.gceQuestionWaiting;queue(s);});}}
  else found=entry.data[key]||entry.data[code];
 }
 if(found?.[fr(s)?'fr':'en'])return typo(s,found[fr(s)?'fr':'en']+' ('+code+')');
 return typo(s,tr(s,'Source question code '+code+' (wording not verified for this file)','Code de question source '+code+' (libellé non vérifié pour ce fichier)'));
}
function annotate(s){
 if(!s.isConnected||s.multiple||s.size>1)return;
 const question=isQuestion(s);
 for(const o of s.options){const text=question?codeLabel(s,o):optionText(o);if(question&&o.dataset.gceQuestionCode&&optionText(o)!==text)o.textContent=text;if(text&&o.title!==text)o.title=text;}
 if(!question||s.closest('.gce-question-reader'))return;
 let m=managed.get(s);
 if(!m){
  const box=node('div',undefined,'gce-question-reader'),selected=node('p',undefined,'gce-question-selected'),details=node('details'),summary=node('summary'),input=node('input'),list=node('div',undefined,'gce-question-list'),hover=node('p',undefined,'gce-question-hover');
  selected.id='gce-question-selected-'+(++seq);selected.setAttribute('aria-live','polite');input.type='search';input.autocomplete='off';list.setAttribute('role','group');hover.setAttribute('aria-live','polite');
  details.append(summary,input,hover,list);box.append(selected,details);
  const target=s.closest('label')||s;target.after(box);const described=(s.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);s.setAttribute('aria-describedby',[...described,selected.id].join(' '));
  m={box,selected,details,summary,input,list,hover,signature:''};managed.set(s,m);
  const update=()=>{const text=optionText(s.selectedOptions[0]||{});m.selected.textContent=text?typo(s,tr(s,'Selected: ','Sélection : ')+text):tr(s,'No question selected.','Aucune question sélectionnée.');s.title=text;};
  m.update=update;
  m.fill=()=>{const q=m.input.value.trim().toLocaleLowerCase();m.list.replaceChildren();const opts=[...s.options].filter(o=>!o.disabled&&(!q||optionText(o).toLocaleLowerCase().includes(q)||o.value.toLocaleLowerCase().includes(q)));for(const o of opts){const b=node('button',typo(s,optionText(o)));b.type='button';b.title=typo(s,optionText(o));b.setAttribute('aria-pressed',String(o.value===s.value));const show=()=>{m.hover.textContent=typo(s,optionText(o));};b.addEventListener('pointerenter',show);b.addEventListener('focus',show);b.addEventListener('click',()=>{s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));m.update();m.details.open=false;s.focus();});m.list.append(b);}if(!opts.length)m.list.append(node('p',tr(s,'No matching options.','Aucune option correspondante.')));};
  s.addEventListener('change',()=>{m.update();if(m.details.open)m.fill();});summary.addEventListener('click',()=>{if(!details.open)m.fill();});details.addEventListener('toggle',()=>{if(details.open&&!m.list.children.length)m.fill();});input.addEventListener('input',m.fill);
 }
 m.summary.textContent=tr(s,'Browse full question wording','Parcourir le libellé complet des questions');
 m.input.placeholder=tr(s,'Find a question','Trouver une question');m.input.setAttribute('aria-label',m.input.placeholder);m.list.setAttribute('aria-label',m.summary.textContent);m.box.hidden=s.disabled||!s.options.length;
 m.update();const signature=[...s.options].map(o=>o.value+'|'+optionText(o)).join('\n');if(signature!==m.signature){m.signature=signature;if(m.details.open)m.fill();}
}
function queue(s){if(!s||s.tagName!=='SELECT')return;pending.add(s);if(!queued){queued=true;queueMicrotask(()=>{queued=false;for(const n of pending)annotate(n);pending.clear();});}}
function scan(n){if(n.nodeType!==1)return;if(n.closest('.gce-question-reader'))return;queue(n.closest('select'));if(n.matches('select'))queue(n);n.querySelectorAll('select').forEach(queue);}
function init(){doc.querySelectorAll('select').forEach(queue);new MutationObserver(changes=>{for(const r of changes){if(r.target.nodeType===1&&r.target.closest('.gce-question-reader'))continue;queue(r.target.parentElement?.closest('select'));queue(r.target.closest?.('select'));for(const n of r.addedNodes)scan(n);}}).observe(doc.body,{childList:true,subtree:true,characterData:true});new MutationObserver(()=>doc.querySelectorAll('select').forEach(queue)).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
