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
  en:'Explore departments and agencies using the complete existing explorer: employee surveys, staffing, promotion, salary, leadership, mental-health and historical evidence. Select an organization inside the explorer where available.',
  fr:'Explorer les ministères et organismes dans l’explorateur existant : sondages, dotation, promotions, salaires, direction, santé mentale et données historiques. Choisir un organisme dans l’explorateur lorsque cette option existe.'
 },
 groups:{
  en:'Compare groups within the federal public service using the original charts, tables, filters and datasets. Use the original explorer’s group controls and check denominators, years and suppressed values before drawing conclusions.',
  fr:'Comparer les groupes de la fonction publique fédérale grâce aux graphiques, tableaux, filtres et ensembles de données d’origine. Utiliser les filtres et vérifier les populations, les années et les valeurs supprimées.'
 },
 tools:{
  en:'Use the briefing and presentation builders above, consult the complete explorer for supporting evidence, and open the searchable October source catalogue within this page. Inventory-only sources are not represented as deployed data.',
  fr:'Utiliser les outils de notes et de présentations plus haut, consulter l’explorateur pour étayer les analyses et rechercher le catalogue des sources d’octobre ici même. Les sources seulement inventoriées ne sont pas présentées comme données publiées.'
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
  translated('Search all 157 October inventory entries. Only eight curated October CSV sources were separately deployed.','Rechercher les 157 entrées de l’inventaire. Seuls huit fichiers CSV d’octobre ont été publiés séparément.'):
  translated('Complete preserved interactive explorer, shown within the main site. Use its own navigation and filters.','Explorateur interactif intégral, affiché dans le site principal. Utiliser ses menus et filtres.');
}
function openWorkspace(group,showCatalogue){
 setTab(group||lastSelection);
 showView(showCatalogue?'catalogue':'explorer');
 workspace.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
tabButtons.forEach((b,i)=>{
 b.addEventListener('click',()=>{setTab(b.dataset.workspaceTab);showView('explorer')});
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
 }
});
for(const frame of [explorer,catalogue]){
 frame.addEventListener('load',()=>{
  if(frame.hidden)return;
  try{
   const d=frame.contentDocument;
   const title=d&&d.title||'';
   if(!d||!d.body||d.body.textContent.trim().length<150||/404|not found/i.test(title)){
    $('workspace-status').textContent=translated('Could not verify this embedded view. The original page remains preserved in the repository.','Impossible de vérifier cet affichage intégré. La page d’origine demeure conservée dans le dépôt.');
   }
  }catch(_){
   $('workspace-status').textContent=translated('Embedded view loaded; browser settings prevented direct verification of its contents.','Vue intégrée chargée; les paramètres du navigateur empêchent la vérification de son contenu.');
  }
 });
}
setTab(active,false);
})();
