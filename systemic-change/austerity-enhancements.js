/* Equity under austerity: browser-only supplementary source views.
   Every percentage is hypothetical, no personal data is collected or uploaded. */
(function () {
  'use strict';
  const root = new URL('../', document.currentScript.src);
  const FILES = {
    population:'data/open-canada-2026-11/tbs-fps-population-2010-2026/population-of-the-federal-public-service-by-department-or-agency-march-2026-en.csv',
    province:'data/open-canada-2026-11/tbs-fps-population-2010-2026/population-of-the-federal-public-service-by-department-and-province-march-2026-en.csv',
    representation:'data/tbs-departmental-representation-2017-2025.json',
    women:'women-femmes/data/csv/women-by-organization-2025.csv'
  };
  const cache = {};
  const labels = {
    w:['Women','Femmes'],i:['Indigenous employees','Employés autochtones'],
    v:['Members of visible minorities','Membres des minorités visibles'],
    b:['Black employees','Employés noirs'],
    d:['Employees with disabilities','Employés en situation de handicap']
  };
  const fr = () => document.documentElement.lang.startsWith('fr');
  const L = (en, french) => fr() ? french : en;
  const norm = x => String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const num = x => x==null ? L('Not published','Non publié') : Number(x).toLocaleString(fr()?'fr-CA':'en-CA',{maximumFractionDigits:2});
  const val = x => {
    if(x==null||String(x).trim()===''||/^(x|\*|n\/a|not available|suppressed|9999)$/i.test(String(x).trim()))return null;
    const n=Number(x);return Number.isFinite(n)?n:null;
  };
  function parse(raw){
    const result=[];let row=[],v='',quoted=false;
    raw=raw.replace(/^\uFEFF/,'');
    for(let i=0;i<raw.length;i++){
      const c=raw[i];
      if(c==='"'){if(quoted&&raw[i+1]==='"'){v+='"';i++}else quoted=!quoted}
      else if(!quoted&&(c===','||c==='\r'||c==='\n')){
        row.push(v);v='';
        if(c!==','){
          if(c==='\r'&&raw[i+1]==='\n')i++;
          if(row.some(s=>s!==''))result.push(row);row=[];
        }
      }else v+=c;
    }
    if(row.length||v){row.push(v);result.push(row)}
    const keys=(result.shift()||[]).map(x=>x.trim());
    return result.map(r=>Object.fromEntries(keys.map((k,i)=>[k,r[i]||''])));
  }
  async function get(name){
    if(!cache[name]){
      const p=FILES[name];
      cache[name]=fetch(new URL(p,root).href).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return p.endsWith('.json')?r.json():r.text().then(parse)}).catch(e=>{delete cache[name];throw e});
    }return cache[name];
  }
  function el(tag,text,className){
    const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;
  }
  function para(parent,text){const p=el('p',text);parent.append(p);return p}
  function title(parent,text){parent.append(el('h4',text))}
  function source(parent,url,text){const p=el('p');const a=el('a',text);a.href=url;p.append(a);parent.append(p)}
  function table(parent,caption,headers,rows){
    const container=el('div',undefined,'dew-scroll');container.tabIndex=0;container.setAttribute('role','region');container.setAttribute('aria-label',caption);
    const t=el('table'),c=el('caption',caption),head=el('thead'),hr=el('tr'),body=el('tbody');
    headers.forEach(h=>{const th=el('th',h);th.scope='col';hr.append(th)});
    head.append(hr);t.append(c,head);
    rows.forEach(row=>{
      const r=el('tr');row.forEach((v,i)=>{const cell=el(i===0?'th':'td',String(v));if(i===0)cell.scope='row';r.append(cell)});body.append(r);
    });
    t.append(body);container.append(t);parent.append(container);
  }
  function matches(record,o,key){
    if(!o)return false;
    const n=norm(record[key]);
    return [o.en,o.fr,...(o.aliases||[])].some(x=>norm(x)===n);
  }
  function groupRecord(rep,o){
    if(!o)return null;
    if(rep.orgs[o.en])return rep.orgs[o.en];
    return Object.entries(rep.orgs).find(([name])=>matches({name},o,'name'))?.[1]||null;
  }
  function pane(form,labelText){
    const holder=el('div'),lab=el('label',labelText),input=el('input');
    input.type='number';input.step='1';input.min='0';lab.append(input);holder.append(lab);form.append(holder);return input;
  }
  function activateInputs(parent,base,removed,total) {
    title(parent,L('Test an absolute number or target headcount','Tester un nombre absolu ou un effectif visé'));
    const controls=el('div',undefined,'dew-columns');
    const n=pane(controls,L('Hypothetical number removed','Nombre hypothétique retranché'));
    const target=pane(controls,L('Hypothetical total employees left','Effectif total hypothétique restant'));
    n.value=removed;target.value=total-removed;
    n.max=Math.floor(base/2);target.max=total;target.min=total-Math.floor(base/2);
    const percent=document.getElementById('dew-reduction'),tenure=document.getElementById('dew-type');
    const enabled=tenure?.value==='all';
    n.disabled=target.disabled=!enabled;
    parent.append(controls);
    para(parent,L('These controls work when “All employees” is selected. They convert to the closest permitted percentage (0–50%, two decimal places), so rounding may change the requested whole-person count. The calculation displayed above is authoritative for this hypothetical example.',
      'Ces champs fonctionnent lorsque « Tous les employés » est sélectionné. Ils convertissent le résultat au pourcentage permis le plus proche (de 0 à 50 %, deux décimales); l’arrondissement peut modifier le nombre entier demandé. Le calcul affiché ci-dessus fait foi pour cet exemple.'));
    if(!enabled)return;
    const set = value => {
      if(!Number.isFinite(value)||value<0||value>Math.floor(base/2))return;
      percent.value=String(Math.round(value/base*10000)/100);
      percent.dispatchEvent(new Event('change',{bubbles:true}));
    };
    n.addEventListener('change',()=>set(Number(n.value)));
    target.addEventListener('change',()=>set(total-Number(target.value)));
  }
  async function draw(panel,orgId,year,rate,peerId){
    const data=await Promise.all([get('population'),get('province'),get('representation'),get('women')]);
    if(!panel.isConnected)return;
    const [pop,provinces,representation,women]=data;
    const api=window.GCEEvidenceWorkspace;
    if(!api)return;
    const st=api.state(),o=st.d?.organizations?.find(x=>x.id===orgId),peer=st.d?.organizations?.find(x=>x.id===peerId);
    if(!o)return;
    const region=pop.filter(r=>matches(r,o,'Department or agency')&&r.Year===year);
    const n=val(region.find(x=>x['Number of employees']!==undefined)?.['Number of employees']);
    if(n===null){para(panel,L('No comparable published headcount is available for this organization and year.','Aucun effectif publié comparable n’est disponible pour cet organisme et cette année.'));return}
    const removed=Math.round(n*rate/100),left=n-removed;
    const onlyAll=(document.getElementById('dew-type')?.value||'all')==='all';
    title(panel,L('Main findings: source dates and example arithmetic','Principaux constats : dates sources et calcul illustratif'));
    if(!onlyAll)para(panel,L('The reduction above is applied to one employment type only. The group, region and comparison views below apply one percentage to all employees, so they are not shown for a single employment type. Choose “All employees” to see them.',
      'La réduction ci-dessus ne vise qu’un type d’emploi. Les vues par groupe, par région et de comparaison appliquent un pourcentage à tous les employés; elles ne sont donc pas présentées pour un seul type d’emploi. Choisissez « Tous les employés » pour les voir.'));
    else para(panel,L('March '+year+': '+num(n)+' published employees. At '+rate+'%, '+num(removed)+' would be removed hypothetically and '+num(left)+' would remain. Formula: round('+num(n)+' × '+rate+' ÷ 100) = '+num(removed)+'.',
      'Mars '+year+' : '+num(n)+' employés publiés. À '+rate+' %, '+num(removed)+' seraient retranchés hypothétiquement et '+num(left)+' demeureraient. Formule : arrondir ('+num(n)+' × '+rate+' ÷ 100) = '+num(removed)+'.'));
    para(panel,L('This figure is not a staffing plan, projected layoffs, a compliance finding or a forecast. Real decisions rarely affect every role evenly. All unassessed impacts remain unknown.',
      'Il ne s’agit ni d’un plan de dotation, ni de mises à pied prévues, ni d’une conclusion de conformité, ni d’une prévision. Les décisions réelles touchent rarement chaque poste de manière uniforme. Les effets non évalués demeurent inconnus.'));
    activateInputs(panel,n,removed,n);
    title(panel,L('PBO quarterly FTE context and Budget 2025 target','Contexte trimestriel des ETP du DPB et cible du budget de 2025'));
    table(panel,L('PBO federal full-time equivalents, not departmental headcounts','Équivalents temps plein fédéraux du DPB, non effectifs ministériels'),
      [L('Period','Période'),L('PBO federal FTEs, approximately','ETP fédéraux du DPB, environ')],[['June 2024','367,000'],['June 2026','342,000']]);
    para(panel,L('Budget 2025 expected about 40,000 fewer public-service positions (10%) than the 2023–24 peak by 2028–29, to roughly 330,000. The default 5% in this tool is an illustrative choice, not the Budget target. PBO FTEs, TBS March headcounts and employment-equity populations have different definitions and cannot be subtracted from one another.',
      'Le budget de 2025 prévoyait environ 40 000 postes de moins dans la fonction publique (10 %) que le sommet de 2023-2024 d’ici 2028-2029, soit quelque 330 000. La valeur initiale de 5 % dans cet outil est un choix illustratif, non la cible budgétaire. Les ETP du DPB, les effectifs de mars du SCT et les populations d’équité en emploi n’ont pas les mêmes définitions et ne doivent pas être soustraits les uns des autres.'));
    source(panel,'https://www.pbo-dpb.ca/en/publications/NT-2627-011-S--pbo-releases-federal-employment-tracking-tool--bdpb-lance-outil-suivi-emploi-federal',L('PBO Federal Employment Tracking Tool, September 15, 2026','Outil de suivi de l’emploi fédéral du DPB, 15 septembre 2026'));
    source(panel,L('https://www.budget.canada.ca/2025/report-rapport/chap5-en.html','https://www.budget.canada.ca/2025/report-rapport/chap5-fr.html'),L('Budget 2025, Chapter 5','Budget de 2025, chapitre 5'));
    if(peer&&onlyAll){
      const pn=val(pop.find(r=>r.Year===year&&matches(r,peer,'Department or agency'))?.['Number of employees']);
      title(panel,L('Comparison organization, same hypothetical percentage','Organisme de comparaison, même pourcentage hypothétique'));
      if(pn===null)para(panel,L('No matching published count for this comparison.','Aucun effectif publié correspondant pour cette comparaison.'));
      else table(panel,L('Same scenario applied separately to two March headcounts','Même scénario appliqué séparément à deux effectifs de mars'),
        [L('Organization','Organisme'),L('Published headcount','Effectif publié'),L('Removed, hypothetical','Retranchés, hypothétiques'),L('Left, hypothetical','Restants, hypothétiques')],
        [[o.en,num(n),num(removed),num(left)],[peer.en,num(pn),num(Math.round(pn*rate/100)),num(pn-Math.round(pn*rate/100))]]);
    }
    if(onlyAll){
    title(panel,L('Employment equity: separate March 2025 population','Équité en matière d’emploi : population distincte de mars 2025'));
    const a=groupRecord(representation,o),w=women.find(r=>matches(r,o,'Organization'));
    const groups=Object.keys(labels).map(k=>{
      const x=a?.[k]?.['2025'];
      const count=k==='w'?null:val(x?.[1]);
      const share=k==='w'?val(w?.['Women (%)']):val(x?.[2]);
      const avail=k==='w'?val(w?.['Departmental workforce availability for women (%)']):val(x?.[3]);
      if(count===null&&share===null)return null;
      const gone=count===null?null:Math.round(count*rate/100);
      return [L(...labels[k]),num(count),num(gone),num(count===null?null:count-gone),share===null?num(null):share+'%',avail===null?num(null):avail+'%'];
    }).filter(Boolean);
    if(groups.length)table(panel,L('March 2025 group values; example counts only where exact counts are published','Valeurs par groupe de mars 2025; nombres illustratifs seulement si un effectif exact est publié'),
      [L('Group','Groupe'),L('Published count','Effectif publié'),L('Hypothetical removed','Retranchés hypothétiques'),L('Hypothetical left','Restants hypothétiques'),L('Representation','Représentation'),L('Availability','Disponibilité')],groups);
    else para(panel,L('No comparable group counts are published for this employer in the TBS departmental representation file. That source covers fewer organizations than the headcount file. Missing is not zero.',
      'Aucun effectif de groupe comparable n’est publié pour cet employeur dans la série ministérielle du SCT. Cette source couvre moins d’organismes que le fichier d’effectifs. Une valeur manquante n’est pas zéro.'));
    para(panel,L('Group counts use March 2025, whereas the selected headcount may be March '+year+'. The underlying reporting populations differ. Groups overlap and must not be added. Women’s source contains percentages but not an exact women count: no count is reconstructed from rounded percentages. Suppressed values remain unpublished. No figure forecasts who would be affected.',
      'Les effectifs par groupe datent de mars 2025, tandis que l’effectif choisi peut dater de mars '+year+'. Les populations de référence diffèrent. Les groupes se chevauchent et ne doivent pas être additionnés. La source sur les femmes contient des pourcentages, mais aucun effectif exact : aucun nombre n’est reconstitué à partir de pourcentages arrondis. Les valeurs supprimées demeurent non publiées. Aucun chiffre ne prévoit les personnes touchées.'));
    title(panel,L('Region-of-work illustration','Illustration selon la région de travail'));
    const rows=provinces.filter(r=>r.Year===year&&matches(r,o,'Department or agency')).map(r=>{
      const v=val(r['Number of employees']);
      return [r['Province or territory of work'],num(v),num(v===null?null:Math.round(v*rate/100)),num(v===null?null:v-Math.round(v*rate/100))];
    });
    if(rows.length)table(panel,L('March '+year+' regional population: hypothetical uniform rate applied independently','Effectifs régionaux de mars '+year+' : taux hypothétique uniforme appliqué séparément'),
      [L('Province or territory of work','Province ou territoire de travail'),L('Published employees','Employés publiés'),L('Hypothetical removed','Retranchés hypothétiques'),L('Hypothetical left','Restants hypothétiques')],rows);
    else para(panel,L('No matching regional table for this organization and year.','Aucun tableau régional correspondant pour cet organisme et cette année.'));
    para(panel,L('Regional rounded estimates may not add exactly to the overall hypothetical result. Published suppression is preserved; no suppressed regional count is reconstructed. Net workforce changes may reflect transfers and restructuring, not necessarily employment growth or layoffs.',
      'Les estimations régionales arrondies peuvent différer du résultat global hypothétique. Les données supprimées demeurent supprimées; aucun effectif régional n’est reconstitué. Les variations nettes de l’effectif peuvent découler de mutations ou de réorganisations, et non nécessairement de croissance ou de mises à pied.'));
    }
    title(panel,L('Decision checklist: what must be verified before changes','Liste de vérification : ce qu’il faut confirmer avant les changements'));
    const prompts=[
      [L('Who is affected?','Qui est touché?'),L('Request affected occupations, locations, classifications and tenure; do not treat an organization-wide rate as the actual selection method.','Demander les professions, lieux, classifications et types d’emploi touchés; ne pas assimiler un taux général aux critères réels de sélection.')],
      [L('Whose career options change?','Quelles possibilités de carrière changent?'),L('Compare access to acting roles, training, mobility and redeployment using privacy-safe evidence.','Comparer l’accès aux intérims, à la formation, à la mobilité et à la réaffectation grâce à des données respectueuses de la vie privée.')],
      [L('What accommodations remain in place?','Quelles mesures d’adaptation demeurent?'),L('Check accommodation continuity, accessible tools and alternative assignments before decisions.','Vérifier la continuité des adaptations, l’accessibilité des outils et les affectations de rechange avant toute décision.')],
      [L('How are employees consulted?','Comment consulter les employés?'),L('Engage employees and representatives before decisions become irreversible; record responses and mitigation.','Mobiliser les employés et leurs représentants avant que les décisions soient irréversibles; consigner les réponses et les mesures d’atténuation.')],
      [L('How will results be assessed?','Comment évaluer les résultats?'),L('Require documented accountable owners, disaggregated privacy-safe monitoring and review dates.','Exiger des responsables désignés, un suivi ventilé respectueux de la vie privée et des dates de révision.')]
    ];
    prompts.forEach(([q,a])=>{const d=el('details'),s=el('summary',q);d.append(s,el('p',a));panel.append(d)});
    para(panel,L('Source review: November 23, 2026. Historical representation and newer FTE data should be updated when an equivalent published source is available.',
      'Sources vérifiées le 23 novembre 2026. La représentation historique et les nouvelles données sur les ETP doivent être actualisées lorsqu’une source comparable est publiée.'));
  }
  let pending=false;
  function refresh(){
    if(pending)return;
    pending=true;
    Promise.resolve().then(async()=>{
      pending=false;
      const api=window.GCEEvidenceWorkspace,box=document.querySelector('#dew-reduction');
      if(!box||!api)return;
      const state=api.state();
      if(state.lens!=='austerity')return;
      const scenario=box.closest('section.dew-box');
      if(!scenario||scenario.querySelector('#dew-austerity-extra'))return;
      // Selectors unrelated to a reduction are deliberately hidden on this tab.
      ['dew-year','dew-pg','dew-sg'].forEach(id=>{
        const x=document.getElementById(id);if(x&&x.parentElement)x.parentElement.hidden=true;
      });
      const p=el('section',undefined,'dew-austerity-extra');p.id='dew-austerity-extra';
      p.setAttribute('aria-label',L('Scenario context and risk review','Contexte du scénario et examen des risques'));
      scenario.append(p);
      const year=document.getElementById('dew-y2')?.value||'2026';
      const rate=Number(box.value)||0;
      para(p,L('Loading original source tables…','Chargement des tableaux sources…'));
      try{p.replaceChildren();await draw(p,state.org,year,rate,state.peer)}
      catch(err){p.replaceChildren();para(p,L('The supplementary source tables could not be loaded. Original source links remain available in the dataset library.','Les tableaux sources complémentaires n’ont pas pu être chargés. Les liens vers les sources originales demeurent disponibles dans la bibliothèque de données.'))}
    });
  }
  function init(){
    const main=document.querySelector('main');if(!main)return;
    new MutationObserver(refresh).observe(main,{subtree:true,childList:true});
    document.addEventListener('gce-evidence-change',refresh);
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
