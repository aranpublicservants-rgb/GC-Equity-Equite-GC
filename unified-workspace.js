/* GC Equity integrated evidence workspace.
 * Loads the original, unchanged explorer and source catalogue within the main page.
 * No remote requests or API credentials. The legacy explorer owns its own filters.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const workspace=$('full-evidence'),desc=$('workspace-description');
const explorer=$('integrated-explorer'),catalogue=$('integrated-catalogue');
const tabButtons=[...document.querySelectorAll('[data-workspace-tab]')];
if(!workspace||!desc||!explorer||!catalogue||tabButtons.length!==3)return;
const descriptions={
 departments:{
  en:'Explore departments and agencies in the data explorer: employee surveys, staffing, promotion, salary, leadership, mental health and historical data. If you chose an organization above, the explorer opens on it when its list includes it.',
  fr:'Explorer les ministères et organismes dans l’explorateur de données : sondages, dotation, promotions, salaires, direction, santé mentale et données historiques. Si vous avez choisi un organisme plus haut, l’explorateur s’ouvre sur celui-ci lorsque sa liste le comprend.'
 },
 groups:{
  en:'Compare groups in the federal public service with the explorer’s charts, tables and filters. Check denominators, years and suppressed values before drawing conclusions.',
  fr:'Comparer les groupes de la fonction publique fédérale grâce aux graphiques, aux tableaux et aux filtres de l’explorateur. Vérifier les dénominateurs, les années et les valeurs supprimées avant de tirer des conclusions.'
 },
 tools:{
  en:'Use the briefing and presentation builders above, or the explorer’s own briefing and data request builders. The list of data sources is under Data sources.',
  fr:'Utiliser les outils de notes et de présentations plus haut, ou les outils de notes et de demandes de données de l’explorateur. La liste des sources se trouve sous Sources des données.'
 }
};
let active='departments',currentView='explorer',lastSelection='departments';
const lang=()=>document.documentElement.lang==='fr'?'fr':'en';
const translated=(en,fr)=>lang()==='fr'?fr:en;
function setTab(name,focus){
 if(!descriptions[name])name='departments';
 active=name;
 tabButtons.forEach(b=>{
  const selected=b.dataset.workspaceTab===name;
  b.setAttribute('aria-selected',String(selected));
  b.tabIndex=selected?0:-1;
 });
 desc.textContent=descriptions[name][lang()];
 desc.setAttribute('aria-labelledby','workspace-'+name);
 if(focus)tabButtons.find(b=>b.dataset.workspaceTab===name).focus();
}
function showView(view){
 currentView=view==='catalogue'?'catalogue':'explorer';
 explorer.hidden=currentView!=='explorer';
 catalogue.hidden=currentView!=='catalogue';
 $('workspace-show-explorer').setAttribute('aria-pressed',String(currentView==='explorer'));
 $('workspace-show-catalogue').setAttribute('aria-pressed',String(currentView==='catalogue'));
 $('workspace-status').textContent=currentView==='catalogue'?
  translated('List of the 157 source files gathered for this site.','Liste des 157 fichiers sources réunis pour ce site.'):
  translated('Data explorer, shown within this page. Use its own menus and filters.','Explorateur de données, affiché dans cette page. Utiliser ses menus et ses filtres.');
}
/* Open the matching part of the data explorer, so a visitor chooses an organization, group or tool once. */
const GROUP_VIEW={black:'black',indigenous:'indigenous',first_nations:'indigenous',metis:'indigenous',inuit:'indigenous'};
// Names match when they are the same after removing a trailing note in brackets, such as (civilian staff only).
const orgKey=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2019']/g,"'").replace(/&/g,'and').replace(/\s*\([^)]*\)\s*$/,'').replace(/\s+/g,' ').trim().toLowerCase();
let pendingTarget=null;
function explorerReady(){
 try{const d=explorer.contentDocument;return d&&d.readyState==='complete'&&d.getElementById('eqStartOrg')?d:null;}catch(_){return null;}
}
function syncLanguage(){
 const d=explorerReady();
 if(d){const want=lang(),have=(d.documentElement.getAttribute('lang')||'en').slice(0,2);if(want!==have){const b=d.querySelector('[data-lang-set="'+want+'"]');if(b)b.click();}}
 try{const w=catalogue.contentWindow;if(w&&typeof w.gcSetLang==='function')w.gcSetLang(lang());}catch(_){}
}
function syncExplorer(){
 const d=explorerReady();if(!d||!pendingTarget)return;
 const name=pendingTarget;pendingTarget=null;
 let hash='bhome',note='';
 if(name==='departments'){
  const org=$('org')?$('org').value:'';
  if(org){
   const match=[...d.querySelectorAll('#eqStartOrg option')].map(o=>o.value).find(v=>v&&orgKey(v)===orgKey(org));
   if(match)hash='org='+encodeURIComponent(match);
   else{hash='orgprofile';note=translated('Choose '+org+' in the explorer’s list, where it has a different name.','Choisir '+org+' dans la liste de l’explorateur, où son nom est différent.');}
  }else hash='depts';
 }else if(name==='groups'){
  hash=GROUP_VIEW[$('group')?$('group').value:'']||'groups';
 }
 try{if(explorer.contentWindow.location.hash.slice(1)!==hash)explorer.contentWindow.location.hash=hash;}catch(_){}
 if(note)$('workspace-status').textContent=note;
}
function openWorkspace(group,showCatalogue){
 setTab(group||lastSelection);
 showView(showCatalogue?'catalogue':'explorer');
 if(!showCatalogue){pendingTarget=group||lastSelection;syncExplorer();}
 workspace.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
tabButtons.forEach((b,i)=>{
 b.addEventListener('click',()=>{setTab(b.dataset.workspaceTab);showView('explorer');pendingTarget=b.dataset.workspaceTab;syncExplorer();});
 b.addEventListener('keydown',e=>{
  const keys=['ArrowRight','ArrowLeft','Home','End'];
  if(!keys.includes(e.key))return;
  e.preventDefault();
  const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;
  setTab(tabButtons[next].dataset.workspaceTab,true);
 });
});
$('workspace-show-explorer').addEventListener('click',()=>showView('explorer'));
$('workspace-show-catalogue').addEventListener('click',()=>showView('catalogue'));
$('workspace-expand').addEventListener('click',function(){
 const expanded=this.getAttribute('aria-pressed')!=='true';
 this.setAttribute('aria-pressed',String(expanded));
 explorer.classList.toggle('expanded',expanded);
 catalogue.classList.toggle('expanded',expanded);
 this.textContent=expanded?translated('Standard viewing area','Zone de consultation normale'):translated('Expand viewing area','Agrandir la zone');
});
document.addEventListener('click',e=>{
 const source=e.target.closest('a[data-workspace],a[href="explorer.html"],a[href="sources.html"]');
 if(source){
  const href=source.getAttribute('href')||'';
  if(href==='explorer.html'||href==='sources.html'||href==='#full-evidence'){
   e.preventDefault();
   const group=source.dataset.workspace||((href==='sources.html')?'tools':lastSelection);
   openWorkspace(group,source.dataset.catalogue==='true'||href==='sources.html');
  }
 }
 if(e.target.closest('#orgGo'))lastSelection='departments';
 if(e.target.closest('#groupGo'))lastSelection='groups';
 if(e.target.closest('#toolGo'))lastSelection='tools';
 if(e.target.closest('#en,#fr')){
  setTab(active,false);
  // Dynamic labels need manual update because the original app translates static elements.
  if($('workspace-expand').getAttribute('aria-pressed')==='true')$('workspace-expand').textContent=translated('Standard viewing area','Zone de consultation normale');
  showView(currentView);
  syncLanguage();
 }
});
for(const frame of [explorer,catalogue]){
 frame.addEventListener('load',()=>{
  syncLanguage();
  if(frame===explorer)syncExplorer();
  if(frame.hidden)return;
  try{
   const d=frame.contentDocument;
   const title=d&&d.title||'';
   if(!d||!d.body||d.body.textContent.trim().length<150||/404|not found/i.test(title)){
    $('workspace-status').textContent=translated('This view did not load. Reload the page to try again.','Cette vue ne s’est pas chargée. Recharger la page pour réessayer.');
   }
  }catch(_){
   $('workspace-status').textContent=translated('View loaded.','Vue chargée.');
  }
 });
}
setTab(active,false);
})();
