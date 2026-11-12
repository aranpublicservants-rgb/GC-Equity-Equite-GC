/* GC Equity organization directory. Official roster and datasets are identified separately. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
let lang=new URL(location.href).searchParams.get('lang')||localStorage.getItem('gcEquityLang')||'en';
if(lang!=='fr')lang='en';
const txt={
home:['Home','Accueil'],data:['Equity data','Données sur l’équité'],staffing:['Staffing','Dotation'],sources:['Sources','Sources'],
title:['Find federal organizations and their data','Trouver les organismes fédéraux et leurs données'],
intro:["Search the Government of Canada's official directory, then see which datasets in this collection provide information about an organization. Being listed does not mean that comparable workforce statistics are available.","Recherchez un organisme dans le répertoire officiel du gouvernement du Canada, puis voyez quelles données publiées sont disponibles dans cette collection. La présence dans le répertoire ne signifie pas que des statistiques comparables sur l’effectif sont accessibles."],
scopeTitle:['Coverage matters.','La portée des données importe.'],
scope:["The government directory includes departments, agencies, Crown corporations, programs and other entities. Treasury Board employment-equity representation tables cover the core public administration, not every entity in the directory. A missing figure is not zero.","Le répertoire comprend des ministères, des organismes, des sociétés d’État, des programmes et d’autres entités. Les tableaux du Conseil du Trésor sur la représentation couvrent l’administration publique centrale, et non toutes les entités du répertoire. Une donnée manquante ne signifie pas zéro."],
official:['Official current federal directory','Répertoire fédéral officiel à jour'],search:['Organization or acronym','Organisme ou sigle'],
filter:['Show organizations','Afficher les organismes'],all:['All directory entries','Toutes les entrées du répertoire'],withdata:['With data in this collection','Avec données dans cette collection'],without:['Without data in these selected sources','Sans données dans les sources retenues'],
rep:['Core public administration representation','Représentation — administration publique centrale'],pses:['2024 employee survey','Sondage auprès des fonctionnaires de 2024'],cta:['Call to Action responses','Réponses à l’Appel à l’action'],snps:['2025 staffing survey','Sondage sur la dotation de 2025'],plans:['2026–27 departmental plans','Plans ministériels 2026-2027'],
csv:['Download CSV','Télécharger CSV'],loading:['Loading the directory…','Chargement du répertoire…'],organization:['Organization','Organisme'],coverage:['Published coverage','Données publiées'],action:['Details','Détails'],
caption:['Federal organizations and available published datasets','Organismes fédéraux et jeux de données publiés disponibles'],
notes:["Reporting years and populations differ. Inclusion in the directory does not imply an employment relationship with the Treasury Board. For the definitive current roster consult the official Government of Canada list.","Les années et populations varient selon la source. Une entrée au répertoire ne signifie pas que le Conseil du Trésor est l’employeur. Consultez le répertoire officiel du gouvernement du Canada pour la liste actuelle."],
compare:['Explore published equity statistics','Explorer les statistiques publiées sur l’équité'],related:['Other federal public service resources','Autres ressources sur la fonction publique fédérale'],
footer:['Independent research resource. Figures and links come from the identified published sources, not from estimates made by this website.','Ressource de recherche indépendante. Les chiffres et liens proviennent des sources publiées indiquées, sans estimation ajoutée par ce site.'],
none:['No data in the selected source files','Aucune donnée dans les fichiers sources retenus'],view:['View sources','Voir les sources'],close:['Close details','Fermer les détails'],
directory:['In the official government directory','Dans le répertoire gouvernemental officiel'],
sourceonly:['Dataset label (not an exact directory entry)','Libellé provenant des données (pas une entrée exacte du répertoire)'],
annual:['CSE 2025–26 annual report','Rapport annuel du CSTC 2025-2026'],cseNote:['CSE appears in the 2024 Public Service Employee Survey, but is not included in the Treasury Board core-public-administration representation table used by this site. CSE publishes separate, more recent figures in its own annual report. Do not treat these as the same reporting population or period.','Le CSTC figure dans le Sondage auprès des fonctionnaires fédéraux de 2024, mais pas dans le tableau de représentation de l’administration publique centrale du Conseil du Trésor utilisé ici. Le CSTC publie des chiffres distincts et plus récents dans son rapport annuel. Ne les confondez pas avec la même population ou période de référence.'],
employees:['Total employees (2025–26 report)','Effectif total (rapport 2025-2026)'],women:['Women','Femmes'],pwd:['Persons with disabilities','Personnes en situation de handicap'],racialized:['Racialized persons','Personnes racisées'],indigenous:['Indigenous persons','Personnes autochtones'],csePub:['CSE annual report, reporting year 2025–26','Rapport annuel du CSTC, exercice 2025-2026'],
psesHar:['2024 survey: reported harassment (Q58)','Sondage 2024 : harcèlement déclaré (Q58)'],psesDisc:['2024 survey: reported discrimination (Q65)','Sondage 2024 : discrimination déclarée (Q65)'],
results:['directory entries shown','entrées du répertoire affichées'],extra:['Additional source-specific labels','Autres libellés des sources'],extraNote:['Some published tables use historical names, combined units or employer labels that are not exact current directory entries. They appear separately below, not as new current federal organizations.','Certains tableaux publiés utilisent des noms historiques, des regroupements ou des noms d’employeurs qui ne correspondent pas exactement au répertoire actuel. Ils sont affichés séparément et ne sont pas considérés comme de nouveaux organismes actuels.']
};
const t=k=>txt[k]?.[lang==='fr'?1:0]||k;
const sourceNames={rep:['2025 employment equity representation (CPA)','Représentation en matière d’équité en emploi 2025 (APC)'],pses:['2024 Public Service Employee Survey','Sondage auprès des fonctionnaires de 2024'],cta:['2021–24 Call to Action reporting','Rapports de 2021 à 2024 sur l’Appel à l’action'],snps:['2025 Staffing and Non-Partisanship Survey','Sondage sur la dotation et l’impartialité politique de 2025'],plans:['2026–27 departmental plans','Plans ministériels de 2026-2027'],annual:['2025–26 CSE annual report','Rapport annuel du CSTC de 2025-2026']};
const namesFix={
'departmentoffinancecanada':'financecanadadepartmentof',
'departmentofjusticecanada':'justicecanadadepartmentof',
'officeoftheauditorgeneralofcanada':'auditorgeneralofcanadaofficeofthe',
'officeoftheprivacycommissionerofcanada':'privacycommissionerofcanadaofficeofthe',
'officeoftheinformationcommissionerofcanada':'informationcommissionerofficeofthe',
'officeofthesuperintendentoffinancialinstitutionscanada':'superintendentoffinancialinstitutionscanadaofficeofthe',
'correctionalinvestigatorcanada':'correctionalinvestigatorofficeofthe',
'thecorrectionalinvestigatorcanada':'correctionalinvestigatorofficeofthe',
'officeofthecorrectionalinvestigator':'correctionalinvestigatorofficeofthe',
'royalcanadianmountedpolicepublicserviceemployees':'royalcanadianmountedpolice',
'officeofthechiefelectoralofficer':'electionscanada',
'nationalfilmboardofcanada':'nationalfilmboard',
'naturalsciencesandengineeringresearchcouncilofcanada':'naturalsciencesandengineeringresearchcanada',
'canadiantransportationaccidentinvestigationandsafetyboard':'transportationsafetyboardofcanada',
'canadianradiotelevisionandtelecommunicationscommission':'canadianradiotelevisionandtelecommunicationscommission'
};
const getKey=s=>namesFix[norm(s)]||norm(s);
const load=p=>fetch(p,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error(p+': '+r.status);return r.json()});
let models=[],rows=[],extras=[],entries=new Map(),byKey=new Map(),visible=[],selected=null;
function add(name,langName,flag,url,extraMeta){
 if(!name||['Public Service','Micro-organizations combined','Total','Public Service (Canada)'].includes(name))return;
 const key=getKey(name);let rec=byKey.get(key);
 if(!rec){rec={name,fr:langName||'',official:false,flags:{},links:{},meta:{}};byKey.set(key,rec);extras.push(rec);}
 if(langName&&!rec.fr)rec.fr=langName;
 if(flag){rec.flags[flag]=true;rec.links[flag]=url||rec.links[flag]||'';if(extraMeta)rec.meta[flag]=extraMeta}
}
function urlFor(k,m,item){
 if(k==='rep')return 'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/employment-equity-demographic-snapshot-2024-2025.html';
 if(k==='pses')return m.sources.psesData||m.sources.pses;
 if(k==='cta')return 'call-to-action.html?org='+encodeURIComponent(item.id)+'#record';
 if(k==='snps')return 'data/snps-2025-by-organization.json';
 if(k==='plans')return 'departmental-plans-2026-27/index.html';
 return '';
}
function renderLang(){
 document.documentElement.lang=lang;
 localStorage.setItem('gcEquityLang',lang);
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
 $('lang').textContent=lang==='fr'?'English':'Français';
 $('official').href=lang==='fr'?'https://www.canada.ca/fr/gouvernement/min.html':'https://www.canada.ca/en/government/dept.html';
 $('q').placeholder=lang==='fr'?'p. ex. CSTC ou Centre de la sécurité des télécommunications':'e.g., CSE or Communications Security Establishment';
 render();
}
const label=r=>lang==='fr'&&r.fr?r.fr:r.name;
const any=r=>Object.values(r.flags).some(Boolean);
function render(){
 if(!rows.length)return;
 const q=norm($('q').value),cat=$('category').value;
 const hits=r=>(!q||norm(r.name).includes(q)||norm(r.fr).includes(q)||(r.name==='Communications Security Establishment Canada'&&['cse','cstc'].includes(q)))&&
 (cat==='all'||cat==='data'&&any(r)||cat==='nodata'&&!any(r)||r.flags[cat]);
 visible=rows.filter(hits).sort((a,b)=>label(a).localeCompare(label(b),lang));
 const extended=extras.filter(r=>!r.official&&hits(r)).sort((a,b)=>label(a).localeCompare(label(b),lang));
 $('count').textContent=visible.length+' '+t('results')+' ('+rows.length+' '+(lang==='fr'?'au répertoire':'in the directory')+').';
 const show=(r)=>'<tr><th scope="row">'+h(label(r))+(r.fr&&lang==='en'?'':'')+'</th><td>'+(Object.keys(r.flags).length?Object.keys(r.flags).map(k=>'<span class="pill">'+h(sourceNames[k]?.[lang==='fr'?1:0]||k)+'</span>').join(''):'<span class="small">'+h(t('none'))+'</span>')+'</td><td><button type="button" data-org="'+h(r.name)+'">'+h(t('view'))+'</button></td></tr>';
 $('rows').innerHTML=visible.map(show).join('')+(extended.length?'<tr><th colspan="3">'+h(t('extra'))+'</th></tr>'+extended.map(show).join(''):'');
 if(!visible.length&&!extended.length)$('rows').innerHTML='<tr><td colspan="3">'+(lang==='fr'?'Aucun résultat.':'No matches.')+'</td></tr>';
 if(selected){const rec=byKey.get(getKey(selected));if(rec)detail(rec);}
}
function detail(r){
 selected=r.name;
 const d=$('details'), links=Object.keys(r.flags).map(k=>'<li><a href="'+h(r.links[k])+'" target="_blank" rel="noopener noreferrer">'+h(sourceNames[k]?.[lang==='fr'?1:0]||k)+'</a></li>').join('');
 let extra='';
 if(r.name==='Communications Security Establishment Canada'){
  const m=models[0],q=m?.PSES_DEPT?.['Communications Security Establishment Canada'];
  extra='<p>'+h(t('cseNote'))+'</p><h3>'+h(t('csePub'))+'</h3><dl>'+[['employees','4,178'],['women','33.9%'],['pwd','14.1%'],['racialized','17.9%'],['indigenous','2.6%']].map(([k,v])=>'<dt>'+h(t(k))+'</dt><dd>'+h(v)+'</dd>').join('')+'</dl>';
  if(q)extra+='<p><strong>'+h(t('psesHar'))+': </strong>'+h(String(q.Q58??'n/a'))+'%; <strong>'+h(t('psesDisc'))+': </strong>'+h(String(q.Q65??'n/a'))+'%.</p>';
  extra+='<p><a href="https://www.cse-cst.gc.ca/en/accountability/transparency/reports/communications-security-establishment-canada-annual-report-2025-2026" target="_blank" rel="noopener noreferrer">'+h(t('annual'))+'</a></p>';
 }
 d.innerHTML='<div class="actions" style="justify-content:space-between;align-items:center"><h2>'+h(label(r))+'</h2><button type="button" id="close">'+h(t('close'))+'</button></div>'+
 '<p class="small">'+h(r.official?t('directory'):t('sourceonly'))+'</p>'+extra+
 (links?'<h3>'+h(t('coverage'))+'</h3><ul>'+links+'</ul>':'<p>'+h(t('none'))+'</p>')+
 '<p class="small">'+h(t('scope'))+'</p>';
 $('close').addEventListener('click',()=>{d.innerHTML='';selected=null;});
 d.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
function csv(){
 const headers=['Government of Canada directory entry','Name (French where available)','2025 CPA representation','2024 PSES','2021-24 Call to Action','2025 staffing survey','2026-27 departmental plan','CSE annual report'];
 const arr=[headers,...visible.map(r=>[r.name,r.fr||'',...['rep','pses','cta','snps','plans','annual'].map(k=>r.flags[k]?'Yes':'No')])];
 const line=r=>r.map(s=>'"'+String(s).replace(/"/g,'""')+'"').join(',');
 const blob=new Blob(['\ufeff'+arr.map(line).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='GC-Equity-Federal-Organizations.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function init(){
 try{
  const [m,d,c,s]=await Promise.all([load('assets/workspace-data.json'),load('assets/federal-organizations-2026-10-15.json'),load('data/call-to-action-comparisons.json'),load('data/snps-2025-by-organization.json')]);
  models=[m,d,c,s];
  for(const name of d.organizations){const rec={name,fr:m.DEPT_FR?.[name]||'',official:true,flags:{},links:{},meta:{}};rows.push(rec);byKey.set(getKey(name),rec);}
  m.DEPTS.forEach(x=>add(x[0],m.DEPT_FR?.[x[0]],'rep',urlFor('rep',m)));
  Object.keys(m.PSES_DEPT||{}).forEach(name=>add(name,m.DEPT_FR?.[name],'pses',urlFor('pses',m)));
  for(const item of c.organizations||[])add(item.name_en,item.name_fr,'cta',urlFor('cta',m,item));
  for(const [name,x] of Object.entries(s.orgs||{}))add(name,x.fr,'snps',urlFor('snps',m));
  for(const x of m.plans||[])add(x.name,m.DEPT_FR?.[x.name],'plans',urlFor('plans',m));
  add('Communications Security Establishment Canada','Centre de la sécurité des télécommunications Canada','annual','https://www.cse-cst.gc.ca/en/accountability/transparency/reports/communications-security-establishment-canada-annual-report-2025-2026');
  extras=extras.filter(x=>!x.official);
  const urlQ=new URLSearchParams(location.search).get('q');
  if(urlQ)$('q').value=urlQ;
  renderLang();
  document.querySelector('#rows').addEventListener('click',e=>{const b=e.target.closest('[data-org]');if(b){const rec=byKey.get(getKey(b.dataset.org));if(rec)detail(rec);}});
  $('q').addEventListener('input',render);$('category').addEventListener('change',render);$('download').addEventListener('click',csv);
  $('filters').addEventListener('submit',e=>e.preventDefault());
  $('lang').addEventListener('click',()=>{lang=lang==='fr'?'en':'fr';renderLang();});
  if(urlQ){let r=byKey.get(getKey(urlQ));if(!r&&['cse','cstc'].includes(getKey(urlQ)))r=byKey.get(getKey('Communications Security Establishment Canada'));if(r)detail(r);}
 }catch(err){$('count').textContent=(lang==='fr'?'Impossible de charger les fichiers du répertoire. ':'Could not load the directory files. ')+err.message;}
}
init();
})();
