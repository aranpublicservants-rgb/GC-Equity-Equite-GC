/* Shared bilingual navigation; no external dependencies or tracking. */
(function(){
'use strict';
const script=document.currentScript;if(!script)return;
const base=new URL('./',script.src);
const fr=()=>document.documentElement.lang.toLowerCase().startsWith('fr');
const L=(en,f)=>fr()?f:en;
const route=(path,hash='')=>{const u=new URL(path,base);u.searchParams.set('lang',fr()?'fr':'en');u.hash=hash;return u.href;};
const el=(tag,txt,parent)=>{const n=document.createElement(tag);if(txt)n.textContent=txt;if(parent)parent.append(n);return n;};
function mount(){
 if(!document.body||document.getElementById('gce-global-shell'))return;
 const bar=el('header');bar.id='gce-global-shell';bar.className='gce-global-shell';
 const inner=el('div','',bar);inner.className='gce-global-inner';
 const brand=el('a','',inner);brand.className='gce-global-brand';
 const nav=el('nav','',inner);
 const items=[['index.html','department-data','Departments and agencies','Ministères et organismes'],['index.html','equity-data','Equity across the public service','Équité dans la fonction publique'],['website-directory/','workplace','Workplace rights and support','Droits et soutien au travail'],['companion-sites/','','All tools and websites','Tous les outils et sites']];
 const links=items.map(()=>el('a','',nav));
 const language=el('button','',inner);language.type='button';language.className='gce-global-language';language.hidden=true;
 function nativeLanguage(){
  const other=fr()?'en':'fr',pair=fr()?['#enLang','#enBtn']:['#frLang','#frBtn'];
  const selectors=[...pair,'#gcw-lang','#lang-switch','#language','#switch-language','#language-switch','#langbtn','#switch','#lang','a[hreflang="'+other+'"]'];
  for(const sel of selectors){for(const candidate of document.querySelectorAll(sel)){if(bar.contains(candidate)||!candidate.matches('button,a[href]')||candidate.closest('[hidden]')||!candidate.getClientRects().length||candidate.disabled)continue;
   const declared=candidate.getAttribute('hreflang')||candidate.getAttribute('lang');
   if(declared&&declared.toLowerCase().slice(0,2)!==other)continue;
   if(candidate.tagName==='A'){try{const u=new URL(candidate.href);if(u.origin!==location.origin||!u.pathname.startsWith(base.pathname))continue;}catch{continue;}}
   return candidate;
  }}return null;
 }
 language.addEventListener('click',()=>{const candidate=nativeLanguage();if(candidate)candidate.click();});
 const skip=el('a','',bar);skip.className='gce-global-skip';
 const note=el('p','',bar);note.className='gce-global-note';
 function refresh(){
  brand.textContent=L('GC Equity / Équité-GC','Équité-GC / GC Equity');brand.href=route('index.html');brand.setAttribute('aria-label',L('GC Equity / Équité-GC home page','Équité-GC / GC Equity, page d’accueil'));
  nav.setAttribute('aria-label',L('GC Equity site navigation','Navigation du site Équité-GC'));
  for(let i=0;i<items.length;i++){const [path,hash,en,f]=items[i],a=links[i];a.textContent=L(en,f);a.href=route(path,hash);const u=new URL(a.href);const current=location.pathname.replace(/index\.html$/,'');const next=u.pathname.replace(/index\.html$/,'');if(next===current&&hash===location.hash.slice(1))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  const target=nativeLanguage();language.hidden=!target;language.textContent=L('Français','English');language.lang=fr()?'en':'fr';language.setAttribute('aria-label',L('Lire cette page en français','Read this page in English'));
  skip.textContent=L('Skip to page content','Passer au contenu de la page');
  note.textContent=L('Independent resource based on published information. Not an official Government of Canada website.','Ressource indépendante fondée sur des renseignements publiés. Ce site n’est pas un site officiel du gouvernement du Canada.');
 }
 const main=document.querySelector('main,[role="main"]');if(main){if(!main.id)main.id='gce-global-main';skip.href='#'+main.id;skip.addEventListener('click',()=>{if(!main.hasAttribute('tabindex'))main.tabIndex=-1;main.focus({preventScroll:true});});}else skip.hidden=true;
 document.body.prepend(bar);refresh();
 new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('hashchange',refresh);
}
// Source lines under tables: show the date modified recorded for the official source
// (data/source-dates.json, refreshed by the weekly source check).
let sourceDates=null;
function annotateSources(root){
 if(!sourceDates)return;
 root.querySelectorAll('.source a[href], .source-line a[href], .factsource a[href], .smallsource a[href]').forEach(a=>{
  if(a.dataset.gceDated)return;const key=a.href.split('#')[0].replace(/\/$/,'');const date=sourceDates[key];a.dataset.gceDated='1';if(!date)return;
  const s=document.createElement('span');s.className='gce-source-date';s.dataset.gceDate=date;
  const set=()=>{s.textContent=fr()?' (date de modification à la source : '+date+')':' (date modified at source: '+date+')';};set();
  new MutationObserver(set).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});a.after(s);});
}
let datesRequested=false;
function loadSourceDates(){
 if(datesRequested)return;
 if(!document.querySelector('.source a[href], .source-line a[href], .factsource a[href], .smallsource a[href]'))return;
 datesRequested=true;
 fetch(new URL('data/source-dates.json',base)).then(r=>r.ok?r.json():null).then(d=>{if(!d)return;sourceDates={};for(const x of d.sources||[])if(x.url&&x.checked)sourceDates[x.url.replace(/\/$/,'')]=x.checked;annotateSources(document);
  new MutationObserver(m=>{for(const r of m)for(const n of r.addedNodes)if(n.nodeType===1)annotateSources(n);}).observe(document.body,{childList:true,subtree:true});}).catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(loadSourceDates,0),{once:true});else setTimeout(loadSourceDates,0);
let sourceWatch=new MutationObserver(()=>{if(!sourceDates&&document.querySelector('.source a[href]')){sourceWatch.disconnect();loadSourceDates();}});
if(document.documentElement)sourceWatch.observe(document.documentElement,{childList:true,subtree:true});
// Carry the chosen organization and employee group to the tools that accept them.
const CARRY=/(?:^|\/)(?:index\.html|where-data-agree\.html)?$/;
function carry(event){
 const a=event.target.closest&&event.target.closest('a[href]');if(!a||a.target==='_blank'||a.hasAttribute('download'))return;
 const here=new URL(location.href),org=here.searchParams.get('org')||here.searchParams.get('dept'),group=here.searchParams.get('group');
 if(!org&&!group)return;
 let u;try{u=new URL(a.href);}catch{return;}
 if(u.origin!==location.origin||!u.pathname.startsWith(base.pathname)||!CARRY.test(u.pathname.slice(base.pathname.length)))return;
 if(u.pathname===here.pathname)return;
 if(org&&!u.searchParams.has('org')&&!u.searchParams.has('dept'))u.searchParams.set('org',org);
 if(group&&group!=='all'&&!u.searchParams.has('group'))u.searchParams.set('group',group);
 a.href=u.href;
}
document.addEventListener('click',carry,true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
