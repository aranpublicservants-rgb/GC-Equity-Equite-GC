/* Department PSES explorer: exact employer-specific cells, no fallback or aggregation. */
(function(root,factory){
 'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root?.document)api.start(root);
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const topics=[
 ['inclusion','Inclusion and respect','Inclusion et respect',['Q12','Q47','Q49','Q52','Q53']],
 ['career','Career development','Perfectionnement professionnel',['Q43','Q45','Q44e']],
 ['safety','Psychological safety and mental health','Sécurité psychologique et santé mentale',['Q24','Q25','Q51','Q73p','Q73q','Q77','Q78','Q81']],
 ['harassment','Harassment, discrimination and recourse','Harcèlement, discrimination et recours',['Q58','Q65','Q42','Q63','Q70','Q72']],
 ['accommodation','Workplace accommodation','Mesures d’adaptation au travail',['Q84','Q85','Q86','Q87','Q88','Q44e','Q73p']]
 ];
 const L=(l,en,fr)=>l==='fr'?fr:en;
 const clean=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const valid=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&!['X','*','-1','9999'].includes(String(x).trim().toUpperCase())&&/^\d+(?:\.\d+)?$/.test(String(x).trim());
 const aliases={w:'Woman',woman:'Woman',i:'Indigenous',ind:'Indigenous',d:'Person with a disability',pwd:'Person with a disability',v:'Racialized',rac:'Racialized',b:'Black',black:'Black',lgbt:'2SLGBTQIA+'};
 function findEmployer(index,org,explicit){
  const names=Object.keys(index.organizations||{});if(explicit)return names.includes(explicit)?explicit:null;
  const exact=new Set([org.en,org.fr,...(org.aliases||[])].filter(Boolean));const matches=names.filter(n=>exact.has(n)||exact.has(index.organizations[n].fr));return matches.length===1?matches[0]:null;
 }
 function currentRows(profile,q,group,compare){
  if(!profile||profile.period!=='2024')return [];
  if(group!=='all'&&!Object.hasOwn(profile.groups||{},group))return [];
  const selected=group==='all'?profile.overall?.[q]:profile.groups[group].questions?.[q];
  const rows=[{group,cell:selected||null}];
  if(compare&&group!=='all')rows.push({group:'all',cell:profile.overall?.[q]||null});
  return rows;
 }
 function historicalRows(overall,groups,org,q,group){
  const data=group==='all'?overall:groups;if(!data||data.organization!==org)return [];
  const g=group==='all'?null:data.groups?.find(x=>x.group===group);
  if(group!=='all'&&!g)return [];
  const row=(g?.rows||data.rows||[]).find(x=>x.q===q);if(!row)return [];
  return (data.cycles||[]).map(c=>({cycle:c,cell:row.values?.[c]||null,source:data.sources?.[c]?.url||'',label:g?.published?.[c]||null})).filter(x=>x.source);
 }
 function start(win){
  const doc=win.document,script=doc.currentScript;if(!script?.src||doc.querySelector('[data-pses-explorer]'))return;
  const base=new URL('../',script.src),relative=win.location.pathname.slice(base.pathname.length).replace(/index\.html$/,'').replace(/\/$/,'');
  if(!relative||relative.includes('/')||!doc.querySelector('#experience,#experience-fr'))return;
  const fetchJSON=async p=>{const r=await win.fetch(new URL(p,base));if(!r.ok)throw Error('HTTP '+r.status);return r.json();};
  let loading,historyLoading,model,profile,org,overallHistory,groupHistory,explicit;
  try{explicit=JSON.parse(doc.getElementById('dp-data')?.textContent||'null');}catch{}
  const el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const style=el('link');style.rel='stylesheet';style.href=new URL('pses-explorer.css',script.src).href;doc.head.append(style);
  async function load(){
   if(!loading)loading=(async()=>{
    const [idx,registry]=await Promise.all([fetchJSON('assets/department-profile-index.json'),fetchJSON('assets/department-pages.json')]);
    org=registry.organizations.find(o=>o.path.replace(/\/$/,'')===relative&&o.id===relative);
    if(!org)throw Error('Organization not identified');
    const name=findEmployer(idx,org,explicit?.psesOrganization);
    if(!name)throw Error('No exact published employer match');
    const entry=idx.organizations[name],r=await win.fetch(new URL(entry.path,base));if(!r.ok)throw Error('Source unavailable');
    const bytes=Uint8Array.from(win.atob((await r.text()).trim()),c=>c.charCodeAt(0));
    const unpacked=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():bytes;
    const p=JSON.parse(new TextDecoder().decode(unpacked));
    if(p.organization!==name||p.period!=='2024')throw Error('Source identity mismatch');
    model=idx;profile=p;return p;
   })().catch(e=>{loading=null;throw e;});return loading;
  }
  async function history(){
   if(!historyLoading)historyLoading=Promise.all(['department-survey-trends','department-group-trends'].map(folder=>fetchJSON('assets/'+folder+'/'+org.id+'.json').catch(()=>null))).then(([a,b])=>{overallHistory=a?.organization===org.id?a:null;groupHistory=b?.organization===org.id?b:null;});
   return historyLoading;
  }
  const state={topic:'harassment',q:'Q65',group:aliases[new URL(win.location.href).searchParams.get('group')]||new URL(win.location.href).searchParams.get('group')||'all',mode:'current',compare:true,query:''};
  const views=[];let token=0;
  const cellText=(v,l,percent=false)=>valid(v)?(percent?String(v).replace('.',l==='fr'?',':'.')+(l==='fr'?' %':'%'):String(v)):/^(X|\*|-1)$/i.test(String(v??''))?L(l,'Suppressed','Supprimé'):L(l,'Not published / unavailable','Non publié / indisponible');
  const name=(g,l)=>g==='all'?L(l,'All respondents','Tous les répondants'):l==='fr'?profile?.groups[g]?.fr||g:g;
  const fmt=(l,n)=>L(l,'Published result (%)','Résultat publié (%)');
  function sourceLine(urls,l){const p=el('p',L(l,'Source: ','Source : '),'source');for(const [i,[label,url]] of urls.entries()){if(!url)continue;const a=el('a',label);a.href=url;p.append(i?' · ':'',a);}return p;}
  function table(l,title,headers,rows,links){
   const wrap=el('div',undefined,'table-scroll psx-table');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',title);
   const t=el('table'),cap=el('caption',title),head=t.createTHead().insertRow();t.prepend(cap);for(const h of headers){const th=el('th',h);th.scope='col';head.append(th);}
   const body=t.createTBody();for(const row of rows){const tr=body.insertRow();row.forEach((v,i)=>{const td=el(i?'td':'th',String(v??''));if(!i)td.scope='row';tr.append(td);});}
   wrap.append(t);const box=el('div');box.append(wrap,sourceLine(links,l));
   const download=el('button',L(l,'Download selected results (CSV)','Télécharger les résultats sélectionnés (CSV)'));download.type='button';download.addEventListener('click',()=>{const quote=v=>'"'+String(v??'').replace(/^[=+@]/,"'$&").replace(/"/g,'""')+'"';const csv=[headers,...rows].map(r=>r.map(quote).join(',')).join('\r\n'),u=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=el('a');a.href=u;a.download='pses-'+org.id+'-'+state.q+'-'+l+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);});box.append(download);return box;
  }
  function questionOptions(v){
   const l=v.l,allowed=state.topic==='all'?Object.keys(model.definitions):topics.find(t=>t[0]===state.topic)?.[3]||[];
   const terms=clean(state.query);const found=allowed.filter(q=>!terms||clean(q+' '+model.definitions[q]?.en+' '+model.definitions[q]?.fr).includes(terms));
   v.q.replaceChildren();for(const q of found){const d=model.definitions[q];if(d)v.q.append(new Option(q+' · '+d[l],q));}
   if(!found.includes(state.q))state.q=found[0]||'';v.q.value=state.q;v.q.disabled=!found.length;
  }
  function groupOptions(v){const l=v.l;v.group.replaceChildren(new Option(name('all',l),'all'));for(const g of Object.keys(profile.groups||{}).sort((a,b)=>name(a,l).localeCompare(name(b,l),l)))v.group.append(new Option(name(g,l),g));if(![...v.group.options].some(o=>o.value===state.group))state.group='all';v.group.value=state.group;}
  function updateControls(){for(const v of views){if(!v.loaded)continue;v.topic.value=state.topic;v.search.value=state.query;questionOptions(v);groupOptions(v);v.mode.value=state.mode;v.compare.checked=state.compare;v.compare.disabled=state.mode==='history'||state.group==='all';v.compareLabel.hidden=state.mode==='history';}}
  function render(v){
   const l=v.l,def=model.definitions[state.q];v.output.replaceChildren();if(!def){v.output.append(el('p',L(l,'No question matches this search.','Aucune question ne correspond à la recherche.')));return;}
   v.output.append(el('h4',state.q+' · '+def[l]));
   const field={POSITIVE:['Published positive response','Réponse positive publiée'],NEGATIVE:['Published negative response','Réponse négative publiée'],ANSWER1:['Published first response category','Première catégorie de réponse publiée']}[def.field]||[def.field,def.field];v.output.append(el('p',L(l,field[0],field[1])+' ('+def.field+').'));
   const current=()=>{const rr=currentRows(profile,state.q,state.group,state.compare),rows=rr.map(r=>[name(r.group,l),cellText(r.cell?.[0],l,true),cellText(r.cell?.[1],l)]);const links=[];if(state.group!=='all')links.push([L(l,'2024 employee-group results (EEINFODV.csv)','Résultats de 2024 par groupe (EEINFODV.csv)'),model.sources.groups]);if(state.group==='all'||state.compare)links.push([L(l,'2024 all-respondent results (subset 1)','Résultats globaux de 2024 (sous-ensemble 1)'),model.sources.overallPublisherUrl]);v.output.append(table(l,L(l,'PSES 2024 · ','SAFF 2024 · ')+profile[l==='fr'?'fr':'organization']+' · '+state.q,[L(l,'Employee group','Groupe d’employés'),fmt(l),L(l,'Rounded responses','Réponses arrondies')],rows,links));};
   if(state.mode==='current'){current();return;}
   const rr=historicalRows(overallHistory,groupHistory,org.id,state.q,state.group);
   const published=rr.filter(r=>valid(r.cell?.[0]));
   if(published.length<2){v.output.append(el('p',L(l,'Fewer than two comparable published survey cycles are available for this selection. The 2024 source is shown instead.','Moins de deux cycles de sondage comparables sont publiés pour cette sélection. La source de 2024 est affichée.')));current();return;}
   const labelSet=new Set(rr.filter(r=>r.cell&&r.label).map(r=>r.label[0])),changed=labelSet.size>1;
   const rows=rr.map(r=>[r.cycle,...(state.group==='all'?[]:[r.label?.[l==='fr'?1:0]||L(l,'Not published','Non publié')]),cellText(r.cell?.[0],l,true),cellText(r.cell?.[1],l),r.cell?.[2]||L(l,'Not available','Indisponible')]);
   const links=rr.map(r=>[L(l,'PSES ','SAFF ')+r.cycle,r.source]);
   v.output.append(el('p',L(l,'Historical extract: only questions matched by the existing wording crosswalk are included. Earlier question numbers are shown. The 2024 historical extract and current 2024 source are kept separate.','Extrait historique : seules les questions appariées selon la concordance des libellés sont incluses. Les anciens numéros sont indiqués. L’extrait historique de 2024 et la source actuelle de 2024 demeurent distincts.')));
   if(changed)v.output.append(el('p',L(l,'Published employee-group labels changed between cycles. Compare individual published results with caution; no continuous trend is drawn.','Les libellés publiés des groupes ont changé entre les cycles. Comparez les résultats individuels avec prudence; aucune tendance continue n’est tracée.')));
   const output=table(l,L(l,'Historical PSES · ','SAFF historique · ')+name(state.group,l)+' · '+state.q,[changed?L(l,'Survey cycle','Cycle du sondage'):L(l,'Period','Période'),...(state.group==='all'?[]:[L(l,'Published group label','Libellé publié du groupe')]),fmt(l),L(l,'Rounded responses','Réponses arrondies'),L(l,'Original question code','Code de question original')],rows,links);
   v.output.append(output);
  }
  async function refresh(){const t=++token;updateControls();const opened=views.filter(v=>v.loaded&&v.panel.open);if(state.mode==='history'){for(const v of opened)v.output.replaceChildren(el('p',L(v.l,'Loading historical sources…','Chargement des sources historiques…')));await history();}if(t!==token)return;for(const v of opened)render(v);}
  function make(l,heading){
   const panel=el('details',undefined,'pses-explorer');panel.id='pses-explorer-'+l;panel.dataset.psesExplorer='1';panel.lang=l;
   const title=el('summary',L(l,'Explore employee survey results','Explorer les résultats du sondage auprès des employés'));panel.append(title);
   const body=el('div',undefined,'psx-body'),status=el('p',L(l,'Open to load published department results.','Ouvrez pour charger les résultats publiés du ministère.'));status.setAttribute('role','status');body.append(status);
   const controls=el('div',undefined,'psx-controls');controls.hidden=true;
   function control(text,id,type='select'){const lab=el('label',text),n=el(type);n.id='psx-'+id+'-'+l;lab.htmlFor=n.id;if(type==='input')n.type='search';lab.append(n);controls.append(lab);return n;}
   const topic=control(L(l,'Topic','Sujet'),'topic'),search=control(L(l,'Find a question by word or number','Trouver une question par mot ou numéro'),'search','input'),q=control(L(l,'Question','Question'),'question'),group=control(L(l,'Employee group','Groupe d’employés'),'group'),mode=control(L(l,'Reporting period','Période de référence'),'mode');
   for(const [id,en,fr] of topics)topic.append(new Option(L(l,en,fr),id));topic.append(new Option(L(l,'All 27 selected questions','Les 27 questions sélectionnées'),'all'));
   mode.append(new Option(L(l,'2024 published results','Résultats publiés de 2024'),'current'),new Option(L(l,'Historical comparison (where available)','Comparaison historique (si disponible)'),'history'));
   const compareLabel=el('label',undefined,'psx-check'),compare=el('input');compare.type='checkbox';compareLabel.append(compare,doc.createTextNode(L(l,' Compare with all respondents in this organization',' Comparer à tous les répondants de cet organisme')));controls.append(compareLabel);
   const note=el('p',L(l,'The 27 selected questions use published response categories and rounded response counts. Groups may overlap. Conditional questions use only eligible respondents. No suppressed values are reconstructed. Results are descriptive, not tests of statistical significance.','Les 27 questions sélectionnées utilisent les catégories publiées et les nombres de réponses arrondis. Les groupes peuvent se chevaucher. Les questions conditionnelles visent seulement les répondants admissibles. Aucune valeur supprimée n’est reconstituée. Les résultats sont descriptifs et ne constituent pas des tests de signification statistique.'));
   const output=el('div',undefined,'psx-output');body.append(controls,note,output);panel.append(body);heading.after(panel);
   const v={l,panel,status,controls,topic,search,q,group,mode,compare,compareLabel,output,loaded:false};views.push(v);
   topic.addEventListener('change',()=>{state.topic=topic.value;state.query='';refresh();});search.addEventListener('input',()=>{state.query=search.value;refresh();});q.addEventListener('change',()=>{state.q=q.value;refresh();});group.addEventListener('change',()=>{state.group=group.value;refresh();});mode.addEventListener('change',()=>{state.mode=mode.value;refresh();});compare.addEventListener('change',()=>{state.compare=compare.checked;refresh();});
   panel.addEventListener('toggle',async()=>{if(!panel.open)return;if(v.loaded){refresh();return;}status.textContent=L(l,'Loading exact source results…','Chargement des résultats sources exacts…');try{await load();v.loaded=true;controls.hidden=false;status.textContent=L(l,'Source: 2024 Public Service Employee Survey.','Source : Sondage auprès des fonctionnaires fédéraux de 2024.');refresh();}catch{status.textContent=L(l,'An exact department source could not be loaded. Original tables and source links remain available below. Close and reopen to retry.','Une source ministérielle exacte n’a pas pu être chargée. Les tableaux originaux et les liens sources demeurent accessibles ci-dessous. Fermez et rouvrez pour réessayer.');}});
  }
  for(const [l,id] of [['en','experience'],['fr','experience-fr']]){const h=doc.getElementById(id);if(h)make(l,h);}
 }
 return {topics,valid,findEmployer,currentRows,historicalRows,start};
});
