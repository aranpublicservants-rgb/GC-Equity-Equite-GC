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
 const skip=el('a','',bar);skip.className='gce-global-skip';
 const note=el('p','',bar);note.className='gce-global-note';
 function refresh(){
  brand.textContent=L('GC Equity / Équité-GC','Équité-GC / GC Equity');brand.href=route('index.html');brand.setAttribute('aria-label',L('GC Equity home','Accueil Équité-GC'));
  nav.setAttribute('aria-label',L('GC Equity site navigation','Navigation du site Équité-GC'));
  for(let i=0;i<items.length;i++){const [path,hash,en,f]=items[i],a=links[i];a.textContent=L(en,f);a.href=route(path,hash);const u=new URL(a.href);const current=location.pathname.replace(/index\.html$/,'');const next=u.pathname.replace(/index\.html$/,'');if(next===current&&hash===location.hash.slice(1))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  skip.textContent=L('Skip to page content','Passer au contenu de la page');
  note.textContent=L('Independent resource based on published information. Not an official Government of Canada website.','Ressource indépendante fondée sur des renseignements publiés. Ce site n’est pas un site officiel du gouvernement du Canada.');
 }
 const main=document.querySelector('main,[role="main"]');if(main){if(!main.id)main.id='gce-global-main';skip.href='#'+main.id;skip.addEventListener('click',()=>{if(!main.hasAttribute('tabindex'))main.tabIndex=-1;main.focus({preventScroll:true});});}else skip.hidden=true;
 refresh();document.body.prepend(bar);
 new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('hashchange',refresh);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
