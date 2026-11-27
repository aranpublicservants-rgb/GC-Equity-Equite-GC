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
function optionText(o){return (o.textContent||'').trim();}
function annotate(s){
 if(!s.isConnected||s.multiple||s.size>1)return;
 for(const o of s.options){const text=optionText(o);if(text&&o.title!==text)o.title=text;}
 if(!isQuestion(s)||s.closest('.gce-question-reader'))return;
 let m=managed.get(s);
 if(!m){
  const box=node('div',undefined,'gce-question-reader'),selected=node('p',undefined,'gce-question-selected'),details=node('details'),summary=node('summary'),input=node('input'),list=node('div',undefined,'gce-question-list'),hover=node('p',undefined,'gce-question-hover');
  selected.id='gce-question-selected-'+(++seq);selected.setAttribute('aria-live','polite');input.type='search';input.autocomplete='off';list.setAttribute('role','group');hover.setAttribute('aria-live','polite');
  details.append(summary,input,hover,list);box.append(selected,details);
  const target=s.closest('label')||s;target.after(box);const described=(s.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);s.setAttribute('aria-describedby',[...described,selected.id].join(' '));
  m={box,selected,details,summary,input,list,hover,signature:''};managed.set(s,m);
  const update=()=>{const text=optionText(s.selectedOptions[0]||{});m.selected.textContent=text?tr(s,'Selected: ','Sélection : ')+text:tr(s,'No question selected.','Aucune question sélectionnée.');s.title=text;};
  m.update=update;
  m.fill=()=>{const q=m.input.value.trim().toLocaleLowerCase();m.list.replaceChildren();const opts=[...s.options].filter(o=>!o.disabled&&(!q||optionText(o).toLocaleLowerCase().includes(q)||o.value.toLocaleLowerCase().includes(q)));for(const o of opts){const b=node('button',optionText(o));b.type='button';b.title=optionText(o);b.setAttribute('aria-pressed',String(o.value===s.value));const show=()=>{m.hover.textContent=optionText(o);};b.addEventListener('pointerenter',show);b.addEventListener('focus',show);b.addEventListener('click',()=>{s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));m.update();m.details.open=false;s.focus();});m.list.append(b);}if(!opts.length)m.list.append(node('p',tr(s,'No matching options.','Aucune option correspondante.')));};
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
