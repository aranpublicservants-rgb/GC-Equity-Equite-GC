(function(){
'use strict';
const C=window.CareerContent,R=window.CareerSources,M=window.CareerModel,V=window.CareerView;
const $=id=>document.getElementById(id),workKey='aranCareerWorkV1',prefKey='aranCareerPreferencesV1';
let storageError=false,scrollPending=false;
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
function fresh(){const date=today();return {lang:'en',large:false,contrast:false,guide:{goal:null,status:'employee'},routeFilter:'all',routeView:'cards',search:'',topic:'all',savedOnly:false,showAll:false,saved:[],saveWork:false,evidence:{criterion:'',situation:'',task:'',action:'',result:''},template:{kind:'learning',topic:'',context:'',ask:''},plan:{goal:'',start:date,review:M.datePlus(date,90),notes:'',actions:[]}};}
let state=fresh();state.lang=document.documentElement.lang==='fr'?'fr':'en';
const string=v=>typeof v==='string'?v.slice(0,6000):'';
function restore(){
 try{
  const prefs=JSON.parse(localStorage.getItem(prefKey)||'null');
  if(prefs){state.lang=prefs.lang==='fr'?'fr':'en';state.large=prefs.large===true;state.contrast=prefs.contrast===true;}
  const saved=JSON.parse(localStorage.getItem(workKey)||'null');
  if(saved&&saved.version===1){
   state.saveWork=true;
   for(const key of ['goal','notes'])state.plan[key]=string(saved.plan?.[key]);
   for(const key of ['start','review'])if(M.datePlus(saved.plan?.[key],0))state.plan[key]=saved.plan[key];
   state.plan.actions=Array.isArray(saved.plan?.actions)?saved.plan.actions.slice(0,60).map((a,i)=>({id:'restored'+i,text:string(a.text),evidence:string(a.evidence),support:string(a.support),due:M.datePlus(a.due,0)?a.due:'',stage:['30','60','90'].includes(a.stage)?a.stage:'30',status:['todo','underway','done'].includes(a.status)?a.status:'todo'})):[];
   for(const key of Object.keys(state.evidence))state.evidence[key]=string(saved.evidence?.[key]);
   for(const key of ['topic','context','ask'])state.template[key]=string(saved.template?.[key]);
   if(C.templateTypes.some(x=>x.id===saved.template?.kind))state.template.kind=saved.template.kind;
   state.saved=Array.isArray(saved.saved)?saved.saved.filter(id=>R.some(r=>r.id===id)):[];
   if(C.goals.some(g=>g.id===saved.guide?.goal))state.guide.goal=saved.guide.goal;
   if(C.statuses.some(g=>g.id===saved.guide?.status))state.guide.status=saved.guide.status;
  }
 }catch(e){storageError=true;}
 const language=new URLSearchParams(location.search).get('lang');if(['en','fr'].includes(language))state.lang=language;else if(location.pathname.endsWith('/index-fr.html'))state.lang='fr';
}
function announce(text){$('announcer').textContent='';requestAnimationFrame(()=>{if($('announcer'))$('announcer').textContent=text;});}
const t=k=>M.t(C.ui[k],state.lang);
function savePreferences(){try{localStorage.setItem(prefKey,JSON.stringify({lang:state.lang,large:state.large,contrast:state.contrast}));}catch(e){/* Display choices still work for the session. */}}
function persist(){
 storageError=false;
 try{
  if(state.saveWork)localStorage.setItem(workKey,JSON.stringify({version:1,plan:state.plan,template:state.template,evidence:state.evidence,saved:state.saved,guide:state.guide}));
  else localStorage.removeItem(workKey);
 }catch(e){storageError=true;state.saveWork=false;if($('save-work'))$('save-work').checked=false;}
 updateSaveState();
}
function updateSaveState(){if($('save-state'))$('save-state').textContent=t(storageError?'storageFailed':state.saveWork?'saved':'unsaved');}
function setAppearance(){document.documentElement.lang=state.lang;document.documentElement.classList.toggle('large-text',state.large);document.documentElement.classList.toggle('high-contrast',state.contrast);document.title=t('title');document.querySelector('meta[name=description]').content=t('heroBody');const og=document.querySelector('meta[property="og:title"]');if(og)og.content=t('title');}
function render(){setAppearance();$('app').innerHTML=V.page(state);updateSaveState();updateCompletion();updateScroll();document.dispatchEvent(new CustomEvent('career:render'));}
function updateCompletion(){const count=state.plan.actions.filter(a=>a.status==='done').length,total=state.plan.actions.length;$('plan-completion').innerHTML='<span>'+count+' / '+total+' '+V.esc(t('completeCount'))+'</span><progress value="'+count+'" max="'+(total||1)+'" aria-label="'+V.esc(t('completeCount'))+'">'+count+' / '+total+'</progress>';}
function updateScroll(){
 const header=document.querySelector('.site-header'),offset=getComputedStyle(header).position==='sticky'?header.getBoundingClientRect().height+22:20,sections=[...document.querySelectorAll('[data-section]')];
 document.documentElement.style.setProperty('--section-offset',offset+'px');
 let current=sections[0]?.id;
 for(const section of sections)if(section.getBoundingClientRect().top<=offset)current=section.id;
 const max=document.documentElement.scrollHeight-innerHeight;
 if(max>0&&scrollY>=max-3)current='resources';
 document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
 const chosen=C.sections.find(([id])=>id===current);if($('section-jump')&&document.activeElement!==$('section-jump'))$('section-jump').value=current;if($('mobile-current')&&chosen)$('mobile-current').textContent=t(chosen[1]);
 if($('reading-progress'))$('reading-progress').value=max>0?Math.min(100,Math.max(0,scrollY/max*100)):100;
}
function updateGuide(focusGoal){$('guide-tool').innerHTML=V.guide(state);if(focusGoal)document.querySelector('[data-goal="'+focusGoal+'"]')?.focus({preventScroll:true});persist();}
function updateResources(focusId){$('resource-results').innerHTML=V.resources(state);if(focusId){const next=document.querySelector('[data-save-resource="'+focusId+'"]');(next||$('saved-only')).focus({preventScroll:true});}}
function updateDrafts(){$('evidence-output').textContent=M.evidenceText(state.evidence,state.lang)||t('emptyEvidence');$('template-output').textContent=M.draftMessage(state.template,state.lang);persist();}
function download(text,name,type='text/plain;charset=utf-8'){
 const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function draft(kind){return kind==='evidence'?M.evidenceText(state.evidence,state.lang):M.draftMessage(state.template,state.lang);}
async function copy(kind){const value=draft(kind);if(!value){announce(t('evidenceEmpty'));return;}try{await navigator.clipboard.writeText(value);announce(t('copied'));}catch(e){const sel=getSelection(),range=document.createRange();range.selectNodeContents($(kind+'-output'));sel.removeAllRanges();sel.addRange(range);announce(t('copyFallback'));}}
function addAction(suggestion){
 if(state.plan.actions.length>=60)return;
 const l=state.lang,stage=suggestion?.stage||'30',a={id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),text:suggestion?M.t(suggestion.text,l):'',evidence:suggestion?M.t(suggestion.evidence,l):'',support:'',due:M.datePlus(state.plan.start,Number(stage)),stage,status:'todo'};
 state.plan.actions.push(a);$('plan-actions').innerHTML=V.planActions(state);updateCompletion();persist();$('a-text-'+a.id).focus();announce(t('added'));
}
function savedResourcesText(){return state.saved.length?'\n\n'+t('resources')+'\n'+R.filter(r=>state.saved.includes(r.id)).map(r=>M.t(r.title,state.lang)+'\n'+r.url[state.lang]).join('\n\n'):'';}
function preparePrint(){
 const l=state.lang,p=state.plan,e=V.esc;
 $('print-plan').innerHTML='<h1>'+e(t('title'))+'</h1><h2>'+e(t('plan'))+'</h2><p>'+e(t('planGoal'))+': '+e(p.goal)+'</p><p class="print-meta">'+e(t('startDate'))+': '+e(p.start)+' · '+e(t('reviewDate'))+': '+e(p.review)+'</p>'+p.actions.map((a,i)=>'<div class="print-action"><h2>'+(i+1)+'. '+e(a.text)+'</h2><p>'+e(t('stage'))+': '+e(t('day'+a.stage))+' · '+e(t('due'))+': '+e(a.due)+' · '+e(t('status'))+': '+e(t(a.status))+'</p><p>'+e(t('evidenceLabel'))+': '+e(a.evidence)+'</p><p>'+e(t('supportLabel'))+': '+e(a.support)+'</p></div>').join('')+'<h2>'+e(t('notes'))+'</h2><pre>'+e(p.notes)+'</pre>'+(state.saved.length?'<h2>'+e(t('resources'))+'</h2>'+R.filter(r=>state.saved.includes(r.id)).map(r=>'<p>'+e(M.t(r.title,l))+'<br>'+e(r.url[l])+'</p>').join(''):'')+'<p class="print-meta">'+e(t('footer'))+'</p>';
}
document.addEventListener('click',event=>{
 const target=event.target.closest('button,a');if(!target)return;
 if(target.id==='lang'){
  event.preventDefault();
  state.lang=state.lang==='en'?'fr':'en';savePreferences();const url=new URL(location.href);url.searchParams.set('lang',state.lang);history.replaceState(null,'',url);render();$('lang').focus({preventScroll:true});announce(t('languageChanged'));return;
 }
 if(target.id==='text-size'||target.id==='contrast'){
  const key=target.id==='text-size'?'large':'contrast';state[key]=!state[key];setAppearance();target.setAttribute('aria-pressed',String(state[key]));savePreferences();updateScroll();return;
 }
 if(target.dataset.goal){state.guide.goal=target.dataset.goal;updateGuide(target.dataset.goal);announce(t('results')+': '+M.t(C.goals.find(g=>g.id===state.guide.goal).title,state.lang));return;}
 if(target.dataset.routeView){state.routeView=target.dataset.routeView;$('mobility-tool').innerHTML=V.mobility(state);document.querySelector('[data-route-view="'+state.routeView+'"]').focus({preventScroll:true});return;}
 if(target.dataset.suggestion){addAction(C.suggestions.find(s=>s.id===target.dataset.suggestion));return;}
 if(target.dataset.removeAction){const index=state.plan.actions.findIndex(a=>a.id===target.dataset.removeAction);state.plan.actions=state.plan.actions.filter(a=>a.id!==target.dataset.removeAction);$('plan-actions').innerHTML=V.planActions(state);updateCompletion();persist();const next=state.plan.actions[Math.min(index,state.plan.actions.length-1)];if(next)$('a-text-'+next.id).focus({preventScroll:true});else document.querySelector('[data-action="add-action"]').focus({preventScroll:true});announce(t('removed'));return;}
 if(target.dataset.saveResource){const id=target.dataset.saveResource;state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];updateResources(id);persist();announce(t(state.saved.includes(id)?'save':'unsave'));return;}
 if(target.dataset.copy){copy(target.dataset.copy);return;}
 if(target.dataset.download){const value=draft(target.dataset.download);if(value)download(value,'career-'+target.dataset.download+'-'+state.lang+'.txt');else announce(t('evidenceEmpty'));return;}
 if(target.matches('a[href^="#"]')){
  const id=target.getAttribute('href').slice(1),drawer=document.querySelector('.mobile-toc');
  if(drawer?.open)drawer.open=false;
  if($(id))setTimeout(()=>{$(id).setAttribute('tabindex','-1');$(id).focus({preventScroll:true});updateScroll();},0);
 }
 switch(target.dataset.action){
  case'reset-guide':state.guide={goal:null,status:'employee'};updateGuide();document.querySelector('[data-goal]')?.focus({preventScroll:true});break;
  case'use-goal':{const g=C.goals.find(g=>g.id===state.guide.goal);if(g){state.plan.goal=M.t(g.title,state.lang);$('plan-goal').value=state.plan.goal;persist();$('plan').scrollIntoView({block:'start'});$('plan-goal').focus({preventScroll:true});}break;}
  case'add-action':addAction();break;
  case'show-all':state.showAll=true;updateResources();document.querySelectorAll('.resource-card h3 a')[6]?.focus({preventScroll:true});break;
  case'print':preparePrint();window.print();break;
  case'plan-text':download(M.planText(state.plan,state.lang)+savedResourcesText(),'career-plan-'+state.lang+'.txt');break;
  case'plan-csv':download(M.planCsv(state.plan,state.lang),'career-plan-'+state.lang+'.csv','text/csv;charset=utf-8');break;
  case'resources-csv':{const found=M.filterResources(R,state.search,state.topic,state.savedOnly,state.saved);download(M.csv([[t('resources'),t('topic'),t('source'),t('sourceDate'),'URL'],...found.map(r=>[M.t(r.title,state.lang),r.topics.map(k=>M.t(C.topics[k],state.lang)).join('; '),r.publisher,r.reviewed,r.url[state.lang]])]),'career-resources-'+state.lang+'.csv','text/csv;charset=utf-8');break;}
  case'clear':if(window.confirm(t('clearConfirm'))){const keep={lang:state.lang,large:state.large,contrast:state.contrast};state={...fresh(),...keep};persist();render();$('plan').scrollIntoView({block:'start'});$('plan-goal').focus({preventScroll:true});}break;
 }
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(el.dataset.evidence){state.evidence[el.dataset.evidence]=el.value;updateDrafts();return;}
 if(el.dataset.template){state.template[el.dataset.template]=el.value;updateDrafts();return;}
 if(el.dataset.plan){const key=el.dataset.plan,old=state.plan.start;state.plan[key]=el.value;if(key==='start'){
  if(state.plan.review===M.datePlus(old,90)){state.plan.review=M.datePlus(el.value,90);$('plan-review').value=state.plan.review;}
  state.plan.actions.forEach(a=>{if(a.due===M.datePlus(old,Number(a.stage))){a.due=M.datePlus(el.value,Number(a.stage));$('a-due-'+a.id).value=a.due;}});
 }persist();return;}
 if(el.dataset.actionField){const a=state.plan.actions.find(a=>a.id===el.dataset.id);if(!a)return;const key=el.dataset.actionField,old=a.stage;a[key]=el.value;if(key==='stage'&&a.due===M.datePlus(state.plan.start,Number(old))){a.due=M.datePlus(state.plan.start,Number(a.stage));$('a-due-'+a.id).value=a.due;}if(key==='status')updateCompletion();persist();return;}
 if(el.id==='resource-search'){state.search=el.value;updateResources();}
});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el.id==='guide-status'){state.guide.status=el.value;updateGuide();$('guide-status').focus({preventScroll:true});if(state.guide.goal)announce(t('results'));}
 if(el.id==='route-filter'){state.routeFilter=el.value;$('mobility-tool').innerHTML=V.mobility(state);$('route-filter').focus({preventScroll:true});}
 if(el.id==='resource-topic'){state.topic=el.value;updateResources();}
 if(el.id==='saved-only'){state.savedOnly=el.checked;updateResources();}
 if(el.id==='save-work'){state.saveWork=el.checked;persist();}
 if(el.id==='template-kind'){state.template.kind=el.value;updateDrafts();}
});
addEventListener('scroll',()=>{if(!scrollPending){scrollPending=true;requestAnimationFrame(()=>{scrollPending=false;updateScroll();});}},{passive:true});
addEventListener('resize',updateScroll);addEventListener('beforeprint',preparePrint);
document.documentElement.classList.remove('no-js');restore();render();
if(location.hash){const id=decodeURIComponent(location.hash.slice(1));requestAnimationFrame(()=>$(id)?.scrollIntoView());}
})();
