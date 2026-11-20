/* The directory filters report metadata; source files remain unchanged. */
(()=>{
'use strict';
const cards=[...document.querySelectorAll('.report-card')];
const search=document.getElementById('report-search'),scope=document.getElementById('report-scope');
const norm=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
cards.forEach(card=>{card.dataset.search=norm([...card.querySelectorAll('[data-en]')].map(el=>el.dataset.en+' '+el.dataset.fr).join(' '));});
function filter(){
 const query=norm(search.value.trim()),tokens=query.split(/\s+/).filter(Boolean);let count=0;
 cards.forEach(card=>{card.hidden=Boolean(scope.value&&card.dataset.scope!==scope.value)||!tokens.every(t=>card.dataset.search.includes(t));if(!card.hidden)count++;});
 const french=document.documentElement.lang==='fr';
 document.getElementById('report-count').textContent=french?`${count} rapports affichés sur ${cards.length}`:`Showing ${count} of ${cards.length} reports`;
 document.getElementById('report-empty').hidden=count!==0;
 document.querySelectorAll('.report-section').forEach(section=>{section.hidden=![...section.querySelectorAll('.report-card')].some(card=>!card.hidden);});
}
window._applyLang=lang=>{
 document.documentElement.lang=lang;
 document.querySelectorAll('[data-en][data-fr]').forEach(el=>{el.textContent=el.dataset[lang];});
 document.title=lang==='fr'?'Rapports sur l’équité en matière d’emploi | Équité-GC':'Employment equity reports | GC Equity';
 document.querySelector('.report-nav').setAttribute('aria-label',lang==='fr'?'Sections des rapports':'Report sections');
 filter();
};
const params=new URLSearchParams(location.search);search.value=params.get('q')||'';
if(['public','agency','private'].includes(params.get('scope')))scope.value=params.get('scope');
let lang=params.get('lang');try{lang=lang||localStorage.getItem('gcEquityLang');}catch{}
window._applyLang(lang==='fr'?'fr':'en');
search.addEventListener('input',filter);scope.addEventListener('change',filter);
document.getElementById('report-filters').addEventListener('submit',event=>event.preventDefault());
document.getElementById('report-filters').addEventListener('reset',event=>{event.preventDefault();search.value='';scope.value='';filter();});
})();
