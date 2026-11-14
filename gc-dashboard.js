/* GC Equity single-page published data tables. All values come from the cited source files.
   No additional paid service, API, account or generated values. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const root=$('gc-dashboard');if(!root)return;
const lang=()=>document.documentElement.lang.toLowerCase().startsWith('fr');
const L=(en,fr)=>lang()?fr:en;
const escape=s=>String(s===null||s===undefined?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
const N=v=>number(v)===null?L('Not published','Non publié'):Number(v).toLocaleString(lang()?'fr-CA':'en-CA',{maximumFractionDigits:2});
const P=v=>number(v)===null?L('Not published','Non publié'):Number(v).toLocaleString(lang()?'fr-CA':'en-CA',{maximumFractionDigits:2})+(lang()?' %':'%');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').replace(/civilianstaffonly|publicserviceemployees/g,'');
const link=(href,label)=>'<a href="'+escape(href)+'"'+(/^https?:/.test(href)?' target="_blank" rel="noopener noreferrer"':'')+'>'+escape(label)+'</a>';
const groups=[['w','Women','Femmes','women','woman'],['i','Indigenous employees','Employés autochtones','indigenous_peoples','ind'],['d','Employees with disabilities','Employés en situation de handicap','persons_with_disabilities','pwd'],['v','Racialized employees','Employés racisés','members_of_visible_minorities','rac'],['b','Black employees','Employés noirs',null,'black']];
const surveyGroups=[['all','All respondents','Tous les répondants'],['woman','Women','Femmes'],['man','Men','Hommes'],['pwd','Persons with disabilities','Personnes en situation de handicap'],['nopwd','Persons without disabilities','Personnes sans handicap'],['ind','Indigenous respondents','Répondants autochtones'],['nonind','Non-Indigenous respondents','Répondants non autochtones'],['rac','Racialized respondents','Répondants racisés'],['nonrac','Non-racialized respondents','Répondants non racisés'],['black','Black respondents','Répondants noirs']];
const source={
 tbs:'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics.html',
 pses:'https://www.canada.ca/en/treasury-board-secretariat/services/values-ethics/public-service-employee-survey.html',
 psc:'https://www.canada.ca/en/public-service-commission.html',
 plans:'https://www.canada.ca/en/treasury-board-secretariat/services/reporting-government-spending/plans-priorities.html',
 catalogue:'sources.html'
};
let D=null,selected='',tableSequence=0;
const tableStore=new Map();
const PAGE_ROWS=18;
const GROUP_OPTIONS=[['all','All employees / respondents','Tous les employés / répondants'],['w','Women','Femmes'],['man','Men','Hommes'],['i','Indigenous employees','Employés autochtones'],['nonind','Non-Indigenous employees','Employés non autochtones'],['d','Employees with disabilities','Employés en situation de handicap'],['nopwd','Employees without disabilities','Employés sans handicap'],['v','Racialized employees','Employés racisés'],['nonrac','Non-racialized employees','Employés non racisés'],['b','Black employees','Employés noirs'],['lgbt','2SLGBTQIA+ employees','Employés 2ELGBTQIA+']];
const selectGroup=where=>$(where+'-group-picker')?.value||'all';
const groupWord=g=>{const x=GROUP_OPTIONS.find(z=>z[0]===g)||GROUP_OPTIONS[0];return L(x[1],x[2]);};
const surveyGroup=g=>({all:'all',w:'woman',man:'man',i:'ind',nonind:'nonind',d:'pwd',nopwd:'nopwd',v:'rac',nonrac:'nonrac',b:'black',lgbt:'lgbt'})[g]||'all';
function sCard(id,title,description,body,srcLabel,srcUrl){
 if(!body)return '';
 return '<section class="gce-data-block" id="'+id+'"><h3>'+escape(title)+'</h3><p class="gce-explain">'+escape(description)+'</p>'+body+(srcUrl?'<p class="gce-source">'+L('Source','Source')+': '+link(srcUrl,srcLabel)+'.</p>':'')+'</section>';
}
function table(caption,heads,rows,filename){
 if(!rows||!rows.length)return '<p class="gce-unavailable">'+escape(L('No published result for this selection.','Aucun résultat publié pour cette sélection.'))+'</p>';
 const id='gce-table-'+(++tableSequence);
 tableStore.set(id,{caption,heads,rows,filename:filename||'gc-equity-data',page:0});
 const body=tableRows(rows,0);
 return '<div class="gce-table-actions"><button type="button" class="gce-download" data-table="'+id+'" data-file="'+escape(filename||'gc-equity-data')+'">'+escape(L('Download full table (CSV)','Télécharger le tableau complet (CSV)'))+'</button></div>'+
 '<div class="gce-table-wrap" role="region" tabindex="0" aria-label="'+escape(caption)+'"><table id="'+id+'" data-gcw-ready="yes"><caption>'+escape(caption)+'</caption><thead><tr>'+heads.map(h=>'<th scope="col">'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></div>'+
 (rows.length>PAGE_ROWS?'<div class="gce-pager" data-for="'+id+'"><button type="button" class="gce-page-prev" disabled>'+escape(L('Previous','Précédent'))+'</button><span class="gce-page-count" role="status" aria-live="polite">'+escape(pageText(0,rows.length))+'</span><button type="button" class="gce-page-next">'+escape(L('Next','Suivant'))+'</button></div>':'');
}
function tableRows(rows,page){
 return rows.slice(page*PAGE_ROWS,(page+1)*PAGE_ROWS).map(r=>'<tr>'+r.map((v,i)=>i===0?'<th scope="row">'+escape(v)+'</th>':'<td>'+escape(v)+'</td>').join('')+'</tr>').join('');
}
function pageText(page,total){
 return L('Rows ','Lignes ')+(page*PAGE_ROWS+1)+'–'+Math.min((page+1)*PAGE_ROWS,total)+' / '+total;
}
function paginate(btn,delta){
 const controls=btn.closest('.gce-pager'),key=controls?.dataset.for,entry=tableStore.get(key),target=$(key);
 if(!entry||!target)return;
 entry.page=Math.max(0,Math.min(Math.ceil(entry.rows.length/PAGE_ROWS)-1,entry.page+delta));
 target.tBodies[0].innerHTML=tableRows(entry.rows,entry.page);
 controls.querySelector('.gce-page-count').textContent=pageText(entry.page,entry.rows.length);
 controls.querySelector('.gce-page-prev').disabled=entry.page===0;
 controls.querySelector('.gce-page-next').disabled=(entry.page+1)*PAGE_ROWS>=entry.rows.length;
}
function updateGroupLabels(){
 for(const area of ['org','public']){
  const el=$(area+'-group-picker');if(!el)continue;
  const current=el.value;
  el.innerHTML=GROUP_OPTIONS.map(g=>'<option value="'+g[0]+'">'+escape(L(g[1],g[2]))+'</option>').join('');
  el.value=current||'all';
 }
}
const rowsTitle=(group)=>L(group[1],group[2]);
const missing=()=>L('Not published','Non publié');
function csvParse(s){
 s=String(s).replace(/^\ufeff/,'');let out=[],row=[],v='',inQuotes=false;
 for(let i=0;i<s.length;i++){const c=s[i];if(inQuotes){if(c==='"'&&s[i+1]==='"'){v+='"';i++;}else if(c==='"')inQuotes=false;else v+=c;}
 else if(c==='"')inQuotes=true;else if(c===','){row.push(v);v='';}
 else if(c==='\r'||c==='\n'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(v);if(row.some(x=>x!==''))out.push(row);row=[];v='';}
 else v+=c;}
 if(v||row.length){row.push(v);out.push(row);}
 const h=(out.shift()||[]).map(x=>x.trim());return out.map(r=>Object.fromEntries(h.map((key,i)=>[key,r[i]||''])));
}
async function load(){
 const files=[
  ['model','assets/workspace-data.json','json'],
  ['pscCatalog','data/psc/catalogue.json','json'],
  ['pscPopulation','data/psc/CFPPSC_AR2C.csv','csv'],
  ['pscTenure','data/psc/ar2a.csv','csv'],
  ['pscOfficialLanguage','data/psc/demo_fol.csv','csv'],
  ['orglist','assets/federal-organizations-2026-10-15.json','json'],
  ['series','data/tbs-departmental-representation-2017-2025.json','json'],
  ['snps','data/snps-2025-by-organization.json','json'],
  ['cta','data/call-to-action-letters.json','json'],
  ['psc','data/psc/psc-equity.json','json'],
  ['ind','data/october-2026/TBS_Indigenous_subgroups_by_department_2025.csv','csv'],
  ['dis','data/october-2026/TBS_disability_subgroups_by_department_2024.csv','csv'],
  ['salary','data/october-2026/DI_medians_salary_by_group_2017-2025.csv','csv'],
  ['di','data/october-2026/DI_di_disproportionality_index_2017-2025.csv','csv'],
  ['inventory','data/october-2026/public-source-inventory.csv','csv']
 ];
 const results=await Promise.all(files.map(async ([k,path,type])=>{
  const res=await fetch(path);if(!res.ok)throw Error(path+': HTTP '+res.status);
  return [k,type==='json'?await res.json():csvParse(await res.text())];
 }));
 return Object.fromEntries(results);
}
function findKey(keys,name){const n=norm(name);return keys.find(x=>norm(x)===n)||null;}
function findEntry(obj,name){if(!obj)return null;const k=findKey(Object.keys(obj),name);return k?obj[k]:null;}
function findRow(rows,name){return (rows||[]).find(r=>norm(r.department_or_agency)===norm(name))||
 (rows||[]).find(r=>norm(r.department_or_agency).startsWith(norm(name))||norm(name).startsWith(norm(r.department_or_agency))&&norm(r.department_or_agency).length>10)||null;}
function recordFor(name){return D.cta.organizations.find(o=>[o.site_name,o.pses_name,o.plan_name,o.snps_name,o.name_en].some(n=>norm(n)===norm(name)))||null;}
function planFor(name){return D.model.plans.find(p=>norm(p.name)===norm(name))||null;}
function deptName(name){if(!lang())return name;return D.model.DEPT_FR[name]||D.model.planOrgs[name]?.nameFr||recordFor(name)?.name_fr||name;}
function statusTable(name){
 const labels=[
 [L('Core public administration representation, 2017–2025','Représentation dans l’administration publique centrale, 2017-2025'),!!findEntry(D.series.orgs,name),'2017–2025',L('Core public administration','Administration publique centrale')],
 [L('2024 employee survey by organization','Sondage auprès des fonctionnaires de 2024, par organisme'),!!findEntry(D.model.PSES_DEPT,name),'2024',L('Survey respondents','Répondants au sondage')],
 [L('2025 staffing survey by organization','Sondage sur la dotation de 2025, par organisme'),!!findEntry(D.snps.orgs,name),'2025',L('Staffing survey respondents','Répondants au sondage sur la dotation')],
 [L('Staffing appointments by self-identification','Nominations selon l’auto-identification'),!!findEntry(D.psc.hiring,name),'2011–2025',L('Organizations in the Commission staffing dashboard','Organismes du tableau de bord de dotation')],
 [L('Call to Action documents','Documents de l’appel à l’action'),!!recordFor(name),'2021 and 2024',L('Participating organizations','Organismes participants')],
 [L('Departmental plan term counts','Fréquence de termes dans les plans ministériels'),!!planFor(name),'2026–27',L('Organizations with a published plan','Organismes ayant un plan publié')]
 ];
 return table(L('Dataset coverage for ','Données disponibles pour ')+deptName(name),
 [L('Published dataset','Jeu de données publié'),L('Available here','Disponible ici'),L('Period','Période'),L('Population or scope','Population ou portée')],
 labels.map(x=>[x[0],x[1]?L('Yes','Oui'):L('Not in this collection','Absent de cette collection'),x[2],x[3]]),'organization-source-coverage');
}
function representation(name){
 const rec=findEntry(D.series.orgs,name),d=D.model.DEPTS.find(z=>norm(z[0])===norm(name));
 const wfa=findEntry(D.model.DEPT_WFA_2025,name)||{},current=selectGroup('org');
 const shown=current==='all'?groups:groups.filter(x=>x[0]===current);
 if(!shown.length)return '';
 const rows=shown.map(g=>{
  if(g[0]==='w')return [rowsTitle(g),missing(),d?P(d[2]):missing(),number(wfa.w)===null?missing():P(wfa.w),L('Workforce snapshot, March 2025','Aperçu de l’effectif, mars 2025')];
  const key=g[0],v=rec?.[key]?.['2025']||[];
  return [rowsTitle(g),v[1]===null||v[1]===undefined?missing():N(v[1]),P(v[2]),key==='b'?L('Not established','Non établie'):P(v[3]),L('March 31, 2025','31 mars 2025')];
 });
 return sCard('org-representation',L('Workforce representation, 2025','Représentation au sein de l’effectif, 2025'),
  L('These published workforce figures cover the core public administration, not every listed organization. Workforce availability is a benchmark, not a hiring target. Missing values are not zero.','Ces chiffres publiés visent l’administration publique centrale et non tous les organismes du répertoire. La disponibilité est une valeur de référence, non un objectif d’embauche. Les valeurs manquantes ne sont pas des zéros.'),
  table(L('Representation in ','Représentation dans ')+deptName(name),
 [L('Group','Groupe'),L('Published count','Nombre publié'),L('Share of workforce (%)','Part de l’effectif (%)'),L('Workforce availability (%)','Disponibilité (%)'),L('Period','Période')],rows,'organization-representation'),
 L('Treasury Board Secretariat','Secrétariat du Conseil du Trésor'),source.tbs);
}

function trendTables(name){
 const rec=findEntry(D.series.orgs,name),selectedGroup=selectGroup('org');
 if(!rec)return '';
 if(selectedGroup==='all'){
  const years=[...new Set(['i','d','v','b'].flatMap(k=>Object.keys(rec[k]||{})))].sort();
  const rows=years.map(y=>[y,...['i','d','v','b'].map(k=>P(rec[k]?.[y]?.[2]))]);
  return sCard('org-trends',L('Workforce representation over time','Évolution de la représentation au sein de l’effectif'),
   L('Percentage of the workforce belonging to each group as published in each year. A blank is not zero; benchmark methods and departmental structures changed over time.','Pourcentage de l’effectif appartenant à chaque groupe selon les données publiées chaque année. Une valeur manquante ne vaut pas zéro; les méthodes et la structure des ministères ont changé.'),
   table(L('Published representation trends: ','Tendances de représentation publiées : ')+deptName(name),
    [L('Year','Année'),L('Indigenous (%)','Autochtones (%)'),L('Disability (%)','Handicap (%)'),L('Racialized (%)','Racisés (%)'),L('Black (%)','Noirs (%)')],rows,'organization-representation-trends'),
   L('Treasury Board Secretariat, departmental representation','Secrétariat du Conseil du Trésor, représentation ministérielle'),source.tbs);
 }
 if(!['i','d','v','b'].includes(selectedGroup))return '';
 const group=groups.find(g=>g[0]===selectedGroup),years=Object.keys(rec[selectedGroup]||{}).sort();
 if(!years.length)return '';
 return sCard('org-trends',L('Representation over time: ','Évolution de la représentation : ')+rowsTitle(group),
  L('The organization’s published representation, counts and comparison benchmark for the selected group. The benchmark may change between years.','La représentation, le nombre d’employés et la valeur de référence publiés pour le groupe choisi. La valeur de référence peut changer selon l’année.'),
  table(rowsTitle(group)+' · '+deptName(name),
  [L('Year','Année'),L('Workforce size','Effectif total'),L('Group employees','Employés du groupe'),L('Representation (%)','Représentation (%)'),L('Availability (%)','Disponibilité (%)')],
  years.map(y=>{const a=rec[selectedGroup][y];return[y,N(a[0]),N(a[1]),P(a[2]),selectedGroup==='b'?L('Not available','Non disponible'):P(a[3])]}),'organization-selected-group-trend'),
  L('Treasury Board Secretariat','Secrétariat du Conseil du Trésor'),D.series.pages?.[selectedGroup]?.url||source.tbs);
}

function subgroupTables(name){
 const choice=selectGroup('org');
 if(choice!=='i'&&choice!=='d')return '';
 const data=choice==='i'?{
  year:'2025',cols:[['inuit','Inuit','Inuits'],['metis','Métis','Métis'],['first_nations','First Nations','Premières Nations'],['other','Other or not specified','Autres ou non précisés']]
 }:{
  year:'2024',cols:[['coordination_dexterity','Coordination or dexterity','Coordination ou dextérité'],['mobility','Mobility','Mobilité'],['speech_impairment','Speech','Parole'],['blind_visual_impairment','Blind or visual impairment','Cécité ou déficience visuelle'],['deaf_hard_of_hearing','Deaf or hard of hearing','Surdité ou perte auditive'],['other_disability','Other disability','Autre handicap']]
 };
 const row=findRow(D[choice==='i'?'ind':'dis'],name);if(!row)return '';
 const rows=data.cols.map(x=>[L(x[1],x[2]),/^suppressed$/i.test(row[x[0]+'_number'])?L('Suppressed','Supprimé'):N(row[x[0]+'_number']),/^suppressed$/i.test(row[x[0]+'_pct'])?L('Suppressed','Supprimé'):P(row[x[0]+'_pct'])]);
 return sCard('org-subgroups',L('Subgroups in ','Sous-groupes dans ')+deptName(name)+' · '+data.year,
  L('These shares describe the organization’s published workforce. Subgroup figures may be suppressed or incomplete, and subgroups are not automatically additive.','Ces parts concernent l’effectif publié de l’organisme. Les données des sous-groupes peuvent être supprimées ou incomplètes et ne sont pas automatiquement additionnables.'),
  table(L('Published subgroups, ','Sous-groupes publiés, ')+data.year,[L('Subgroup','Sous-groupe'),L('Employees','Employés'),L('Share (%)','Part (%)')],rows,'organization-subgroups'),
  L('Treasury Board Secretariat subgroup data','Données du Conseil du Trésor sur les sous-groupes'),source.tbs);
}

function psesTables(name){
 const all=findEntry(D.model.PSES_DEPT,name)||{},by=findEntry(D.model.EEG_DEPT,name)||{},yoy=findEntry(D.model.YOY,name)||{};
 if(!Object.keys(all).length&&!Object.keys(by).length)return '';
 const selectedGroup=selectGroup('org'),key=surveyGroup(selectedGroup),qmeta=D.model.PSES_QMETA||{},qs=Object.keys(qmeta);
 const label=q=>lang()?(D.model.EEG_QMETA_FR[q]||qmeta[q]?.[1]||q):(qmeta[q]?.[1]||q);
 const rows=qs.map(q=>[q+' · '+label(q),P(all[q]),...(key!=='all'?[P(by[key]?.[q])]:[])]);
 const title=L('2024 employee survey by respondent group: ','Sondage de 2024 selon le groupe de répondants : ')+deptName(name);
 const body=table(title,[L('Question and response','Question et réponse'),L('All respondents (%)','Tous les répondants (%)'),...(key!=='all'?[groupWord(selectedGroup)+' (%)']:[])],rows,'organization-survey-2024');
 const yearRows=qs.filter(q=>yoy[q]).map(q=>[q+' · '+label(q),P(yoy[q].a),P(yoy[q].b),number(yoy[q].a)!==null&&number(yoy[q].b)!==null?N(yoy[q].b-yoy[q].a)+' '+L('percentage points','points de pourcentage'):missing()]);
 return sCard('org-survey',L('Employee experiences: 2024 Public Service Employee Survey','Expérience des employés : Sondage auprès des fonctionnaires fédéraux de 2024'),
  L('Results show the published response percentage among respondents in the chosen group. The direction of a favourable outcome depends on the question; groups may overlap.','Les résultats indiquent le pourcentage de réponses publié pour le groupe choisi. Selon la question, un résultat plus élevé n’est pas nécessairement favorable; les groupes peuvent se chevaucher.'),
  body,L('Public Service Employee Survey','Sondage auprès des fonctionnaires fédéraux'),source.pses)+
 sCard('org-survey-change',L('Employee survey changes: 2022 to 2024, all respondents','Évolution du sondage : 2022 à 2024, tous les répondants'),
  L('These time comparisons are organization-wide, not necessarily broken down by the chosen group. A positive change is not automatically an improvement.','Ces comparaisons concernent l’ensemble de l’organisme et pas nécessairement le groupe choisi. Une variation positive n’est pas automatiquement une amélioration.'),
  table(L('Reported survey changes: ','Évolution des réponses : ')+deptName(name),
  [L('Question and response','Question et réponse'),L('2022 (%)','2022 (%)'),L('2024 (%)','2024 (%)'),L('Change','Variation')],yearRows,'organization-survey-trends'),
  L('Public Service Employee Survey','Sondage auprès des fonctionnaires fédéraux'),source.pses);
}

function staffingTables(name){
 const data=findEntry(D.snps.orgs,name)||{};if(!Object.keys(data).length)return '';
 const key=surveyGroup(selectGroup('org')),q=D.snps.questions;
 const rows=Object.keys(q).map(id=>[id+' · '+L(q[id].en,q[id].fr),P(data.all?.[id]),...(key!=='all'?[P(data[key]?.[id])]:[])]);
 return sCard('org-staffing',L('2025 staffing experiences','Expérience de la dotation en 2025'),
  L('Question denominators differ. Some questions only apply to respondents who participated in staffing activities. Results are not workforce representation.','Les dénominateurs varient selon la question. Certaines questions portent seulement sur les participants aux activités de dotation. Il ne s’agit pas de données sur la représentation de l’effectif.'),
  table(L('2025 Staffing and Non-Partisanship Survey: ','Sondage de 2025 sur la dotation : ')+deptName(name),
  [L('Question and response','Question et réponse'),L('All respondents (%)','Tous les répondants (%)'),...(key!=='all'?[groupWord(selectGroup('org'))+' (%)']:[])],rows,'organization-staffing-survey'),
  L('Public Service Commission, 2025 staffing survey','Commission de la fonction publique, sondage de 2025'),D.snps.dataset);
}

function hiringTable(name){
 const obj=findEntry(D.psc.hiring,name);if(!obj)return '';
 const rows=Object.keys(obj.years).sort().map(year=>{
  const v=obj.years[year];return [year,...v.map(x=>x==='x'?L('Suppressed','Supprimé'):N(x))];
 });
 return sCard('org-appointments',L('4. Appointments by equity self-identification','4. Nominations selon l’auto-identification aux fins de l’équité'),
 L('The Commission publishes appointment counts for people who self-identified as belonging to at least one employment equity group and those who did not. It does not identify the specific groups in this table. Suppressed counts are not zero.','La Commission publie le nombre de nominations de personnes s’étant auto-identifiées comme membres d’au moins un groupe visé par l’équité et de celles ne l’ayant pas fait. Ce tableau ne précise pas les groupes. Les nombres supprimés ne sont pas des zéros.'),
 table(L('Appointments by fiscal year: ','Nominations selon l’exercice : ')+deptName(name),
 [L('Fiscal year','Exercice'),L('Self-identified as a member of an equity group','Auto-identification à un groupe visé'),L('Did not self-identify','Sans auto-identification')],rows,'org-psc-appointments'),
 L('Public Service Commission staffing dashboard','Tableau de bord de la dotation de la Commission de la fonction publique'),source.psc);
}
const goalNames={
 indigenous_recruitment:['Indigenous recruitment','Recrutement autochtone'],
 black_recruitment:['Black recruitment','Recrutement des personnes noires'],
 racialized_recruitment:['Racialized recruitment','Recrutement des personnes racisées'],
 indigenous_promotion:['Indigenous promotions','Promotions des personnes autochtones'],
 black_promotion:['Black promotions','Promotions des personnes noires'],
 racialized_promotion:['Racialized promotions','Promotions des personnes racisées'],
 inclusion:['Inclusion','Inclusion']
};
function ctaTables(name){
 const doc=recordFor(name);if(!doc)return '';
 const letters=doc?.letter?.commitments||[];
 const targets=doc?.letter?.targets||[];
 const assessment=doc?.self_assessment;
 const goalRows=Object.entries(assessment?.goals||{}).map(([k,v])=>[L(...(goalNames[k]||[k,k])),v.status==='set'?L('Goal reported as set','Objectif déclaré comme fixé'):v.status==='underway'?L('Work underway','Travaux en cours'):L('No goal stated','Aucun objectif indiqué'),v.text||missing()]);
 const progress=(assessment?.progress||[]).map((v,i)=>[String(i+1),v]);
 const barriers=(assessment?.barriers||[]).map((v,i)=>[String(i+1),v]);
 return sCard('org-cta',L('5. Call to Action commitments and self-assessment','5. Engagements liés à l’appel à l’action et autoévaluation'),
 L('These are summaries of what organizations reported in 2021 and 2024. They are not independently verified achievements. The original letters and assessments are linked below.','Il s’agit de résumés des déclarations des organismes en 2021 et 2024, et non de réalisations vérifiées de façon indépendante. Les lettres et les autoévaluations originales sont accessibles ci-dessous.'),
 table(L('2021 stated commitments: ','Engagements déclarés en 2021 : ')+deptName(name),[L('Item','Élément'),L('Published commitment summary','Résumé de l’engagement publié')],letters.map((x,i)=>[String(i+1),x]),'org-call-to-action-commitments')+
 (targets.length?table(L('Targets stated in the 2021 letter','Objectifs de la lettre de 2021'),[L('Item','Élément'),L('Target','Objectif')],targets.map((x,i)=>[String(i+1),String(x)]),'org-cta-targets'):'')+
 table(L('2024 reported goals: ','Objectifs déclarés en 2024 : ')+deptName(name),[L('Area','Domaine'),L('Reported status','État déclaré'),L('Details from the summary','Détails du résumé')],goalRows,'org-call-to-action-goals')+
 table(L('2024 reported progress','Progrès déclarés en 2024'),[L('Item','Élément'),L('Reported action or progress','Action ou progrès déclaré')],progress,'org-call-to-action-progress')+
 table(L('2024 reported barriers','Obstacles déclarés en 2024'),[L('Item','Élément'),L('Reported barrier','Obstacle déclaré')],barriers,'org-call-to-action-barriers')+
 (doc?.letter?.url?'<p class="gce-source">'+link(doc.letter.url,L('2021 original letter','Lettre originale de 2021'))+'</p>':'')+(doc?.self_assessment?.url?'<p class="gce-source">'+link(doc.self_assessment.url,L('2024 original self-assessment','Autoévaluation originale de 2024'))+'</p>':''),
 L('Privy Council Office documents','Documents du Bureau du Conseil privé'),doc?.self_assessment?.url||doc?.letter?.url||'call-to-action.html');
}
function plansTable(name){
 const p=planFor(name);if(!p)return '';
 const terms=[
 ['Anti-racism','Antiracisme'],['Employment equity','Équité en matière d’emploi'],['Inclusion','Inclusion'],['Diversity','Diversité'],['Accessibility','Accessibilité'],['Reconciliation','Réconciliation']
 ];
 const rows=p?terms.map((g,i)=>[L(g[0],g[1]),N(p.t?.[i]),N(p.i?.[i])]):[];
 return sCard('org-plans',L('6. Terms in the 2026–27 departmental plan','6. Termes dans le plan ministériel de 2026-2027'),
 L('These counts show occurrences of six topics in the complete departmental plan and in its Internal Services section. A mention is not evidence of an action or result.','Ces nombres représentent les mentions de six thèmes dans l’ensemble du plan ministériel et dans sa section Services internes. Une mention ne démontre ni une action ni un résultat.'),
 table(L('2026–27 departmental plan term counts: ','Mentions dans le plan ministériel de 2026-2027 : ')+deptName(name),
 [L('Topic','Thème'),L('Whole plan: mentions','Plan entier : mentions'),L('Internal Services: mentions','Services internes : mentions')],rows,'org-departmental-plan'),
 L('Published 2026–27 departmental plan','Plan ministériel publié de 2026-2027'),p?.url||'departmental-plans-2026-27/');
}
/* 2024 Public Service Employee Survey by second-level organizational unit.
   Source rows are [branch ID, demographic index, question index, ...schema fields].
   Code 9999 and null are unavailable, not zero. */
let branchMetaPromise=null,branchRequest=0;
const branchDataCache=new Map();
function branchMeta(){
 if(!branchMetaPromise)branchMetaPromise=fetch('explorer.html').then(r=>{if(!r.ok)throw Error('metadata HTTP '+r.status);return r.text();}).then(html=>{
  const match=html.match(/<script type="application\/json" id="eq-branch-meta">([\s\S]*?)<\/script>/);
  if(!match)throw Error('2024 branch metadata absent');
  const data=JSON.parse(match[1]);
  if(!Array.isArray(data.departments)||!Array.isArray(data.questions)||!Array.isArray(data.demographics)||!Array.isArray(data.schema))throw Error('2024 branch metadata incomplete');
  return data;
 }).catch(e=>{branchMetaPromise=null;throw e;});
 return branchMetaPromise;
}
const branchValue=v=>v===9999||v===null||v===undefined||v===''?missing():N(v);
function branchLabel(d,list){return lang()?d?.fr||d?.en||'':d?.en||d?.fr||'';}
function branchRow(r,meta,dept){
 const branch=dept.branches.find(x=>String(x.id)===String(r[0]));
 const demo=meta.demographics[r[1]],q=meta.questions[r[2]];
 return {branch:branchLabel(branch),group:branchLabel(demo),question:branchLabel(q),code:q?.id||'',values:r.slice(3)};
}
function branchCsv(rows,meta,dept){
 const cols=[L('Branch or second-level unit','Direction ou unité de deuxième niveau'),L('Respondent group','Groupe de répondants'),L('Survey question','Question du sondage'),...meta.schema.map(x=>x)];
 const lines=[cols];
 rows.forEach(r=>{const a=branchRow(r,meta,dept);lines.push([a.branch,a.group,a.question,...a.values.map(branchValue)]);});
 const quoted=v=>'"'+String(v===null?'':v).replace(/"/g,'""')+'"';
 const blob=new Blob(['\ufeff'+lines.map(row=>row.map(quoted).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const href=URL.createObjectURL(blob),el=document.createElement('a');
 el.href=href;el.download='GC-Equity-2024-branch-results.csv';document.body.append(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(href),3000);
}
function branchFullTable(host,rows,meta,dept,request){
 const keys=meta.schema,heads=[L('Branch','Direction'),L('Employee group','Groupe d’employés'),L('Question','Question'),...keys.map(k=>{
  if(/^ANS[1-7]$/.test(k))return L('Response option ','Option de réponse ')+k.slice(-1)+' (%)';
  return ({MOSTPOS:L('Most positive (%)','Plus positive (%)'),NEUTRAL:L('Neutral (%)','Neutre (%)'),MOSTNEG:L('Most negative (%)','Plus négative (%)'),AGREE:L('Agreement measure (%)','Mesure de l’accord (%)'),SCORE100:L('Score out of 100','Note sur 100'),ANSCOUNT:L('Published response count','Nombre publié de réponses')})[k]||k;
 })];
 const first='<thead><tr>'+heads.map(x=>'<th scope="col">'+escape(x)+'</th>').join('')+'</tr></thead>';
 host.innerHTML='<div class="gce-table-actions"><button type="button" id="gce-branch-download">'+escape(L('Download all branch results (CSV)','Télécharger tous les résultats des directions (CSV)'))+'</button></div>'+
 '<div class="gce-table-wrap" role="region" tabindex="0" aria-label="'+escape(L('Complete 2024 branch survey response table','Tableau complet des réponses du sondage de 2024 par direction'))+'"><table id="gce-branch-complete" data-gcw-ready="yes"><caption>'+escape(L('2024 survey response options, by organizational unit, respondent group and question','Options de réponse au sondage de 2024, selon l’unité, le groupe et la question'))+'</caption>'+first+'<tbody id="gce-branch-rows"></tbody></table></div>'+
 '<p id="gce-branch-count" class="gce-footnote" role="status" aria-live="polite"></p><div id="gce-branch-sentinel" class="gce-branch-sentinel" aria-hidden="true"></div>';
 const tbody=$('gce-branch-rows'),count=$('gce-branch-count'),sentinel=$('gce-branch-sentinel');
 let next=0,observer=null,appending=false;
 function addBatch(){
  if(appending||request!==branchRequest||!tbody?.isConnected)return;
  appending=true;const stop=Math.min(next+200,rows.length);let html='';
  for(let i=next;i<stop;i++){
   const item=branchRow(rows[i],meta,dept);
   html+='<tr><th scope="row">'+escape(item.branch)+'</th><td>'+escape(item.group)+'</td><td>'+escape(item.question)+'</td>'+item.values.map(x=>'<td>'+escape(branchValue(x))+'</td>').join('')+'</tr>';
  }
  tbody.insertAdjacentHTML('beforeend',html);next=stop;
  count.textContent=L('Displayed results: ','Résultats affichés : ')+N(next)+' / '+N(rows.length);
  appending=false;
  if(next===rows.length){observer?.disconnect();sentinel.remove();}
 }
 $('gce-branch-download')?.addEventListener('click',()=>branchCsv(rows,meta,dept));
 addBatch();
 if(next<rows.length&&typeof IntersectionObserver!=='undefined'){
  observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting))addBatch();},{root:null,rootMargin:'1200px'});
  observer.observe(sentinel);
 }else if(next<rows.length){
  // Automatic growth for browsers without IntersectionObserver.
  let t=0;
  window.addEventListener('scroll',function grow(){if(request!==branchRequest||next>=rows.length){window.removeEventListener('scroll',grow);return;}if(++t%2===0)addBatch();},{passive:true});
 }
}
async function renderBranches(name){
 const id=++branchRequest;
 const host=$('org-branches');if(!host||!name)return;
 host.innerHTML='<h3>'+escape(L('7. Branch and organizational-unit survey results, 2024','7. Résultats du sondage par direction et unité organisationnelle, 2024'))+'</h3>'+
 '<p class="gce-explain">'+escape(L('The source reports 2024 survey results by second organizational level and respondent group. Percentages and response categories are those provided by the original data; a missing or suppressed result is not zero.','La source présente les résultats de 2024 par deuxième niveau organisationnel et groupe de répondants. Les pourcentages et catégories proviennent des données originales; un résultat manquant ou supprimé ne vaut pas zéro.'))+'</p>'+
 '<p role="status">'+escape(L('Loading branch results…','Chargement des résultats par direction…'))+'</p>';
 try{
  const meta=await branchMeta();
  if(id!==branchRequest)return;
  const dept=meta.departments.find(d=>norm(d.en)===norm(name)||norm(d.fr)===norm(name));
  if(!dept){host.innerHTML='<h3>'+escape(L('7. Branch survey results, 2024','7. Résultats du sondage par direction, 2024'))+'</h3><p>'+escape(L('This organization has no second-level unit results in the published file used by this collection.','Cet organisme ne possède aucun résultat au deuxième niveau organisationnel dans le fichier publié utilisé ici.'))+'</p>';return;}
  let data=branchDataCache.get(dept.id);
  if(!data){
   if(typeof DecompressionStream==='undefined')throw Error('gzip browser support unavailable');
   const response=await fetch('data/pses-2024-branches/'+encodeURIComponent(dept.id)+'.json.gz');
   if(!response.ok)throw Error('2024 branch data HTTP '+response.status);
   data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
   if(!Array.isArray(data))throw Error('branch rows are not a list');
   branchDataCache.set(dept.id,data);
  }
  if(id!==branchRequest)return;
  const important=/^Q(12|24|42|43|45|47|49|52|53|58|63|65|70|72)(?:_|$)/;
  const focus=data.filter(r=>important.test(meta.questions[r[2]]?.id||''));
  const metric=k=>meta.schema.indexOf(k)+3;
  const keyRows=focus.map(r=>{
   const a=branchRow(r,meta,dept);
   return [a.branch,a.group,a.question,branchValue(r[metric('MOSTPOS')]),branchValue(r[metric('AGREE')]),branchValue(r[metric('MOSTNEG')]),branchValue(r[metric('SCORE100')]),branchValue(r[metric('ANSCOUNT')])];
  });
  host.innerHTML='<h3>'+escape(L('7. Branch and organizational-unit survey results, 2024','7. Résultats du sondage par direction et unité organisationnelle, 2024'))+'</h3>'+
   '<p class="gce-explain">'+escape(L('Each row identifies the second-level unit, the respondent group, and the full question. Summary measures appear only where that question has a published value. Unavailable and suppressed values are not zero.','Chaque ligne précise l’unité de deuxième niveau, le groupe de répondants et la question complète. Les indicateurs sommaires figurent seulement si une valeur est publiée. Les valeurs manquantes et supprimées ne valent pas zéro.'))+'</p>'+
   '<p class="gce-summary">'+escape(L('Published organizational units: ','Unités organisationnelles publiées : ')+N(dept.branches.length)+' · '+L('Source data rows: ','Lignes de données sources : ')+N(data.length))+'</p>'+
   table(L('2024 workplace survey by branch and respondent group: ','Sondage de 2024 par direction et groupe : ')+deptName(name),
   [L('Branch or unit','Direction ou unité'),L('Respondent group','Groupe de répondants'),L('Question','Question'),L('Most positive response (%)','Réponse la plus positive (%)'),L('Agreement measure (%)','Mesure de l’accord (%)'),L('Most negative response (%)','Réponse la plus négative (%)'),L('Score (out of 100)','Note (sur 100)'),L('Published responses','Réponses publiées')],keyRows,'2024-branch-key-questions')+
   '<h3>'+escape(L('All 2024 survey questions and published response categories by branch','Toutes les questions du sondage de 2024 et les catégories de réponses publiées par direction'))+'</h3>'+
   '<p class="gce-explain">'+escape(L('The columns “Response option 1” to “Response option 7” retain the source-coded answer order. Options differ by question, so they must not be assumed to mean the same answer across questions. The remaining columns are the original named measures. Results appear automatically as this table is scrolled.','Les colonnes « Option de réponse 1 » à « Option de réponse 7 » conservent l’ordre de codage de la source. Les options changent selon la question et ne représentent donc pas nécessairement la même réponse. Les autres colonnes reprennent les indicateurs nommés dans la source. Les résultats apparaissent automatiquement pendant le défilement.'))+'</p>'+
   '<div id="gce-branch-full"></div>'+
   '<p class="gce-source">'+L('Source','Source')+': '+link(meta.sourceCsv||meta.source||'https://open.canada.ca/',L('2024 Public Service Employee Survey, second organizational level','Sondage auprès des fonctionnaires fédéraux de 2024, deuxième niveau organisationnel'))+'.</p>';
  branchFullTable($('gce-branch-full'),data,meta,dept,id);
 }catch(error){
  if(id!==branchRequest)return;
  host.innerHTML='<h3>'+escape(L('7. Branch survey data, 2024','7. Données du sondage par direction, 2024'))+'</h3><p role="alert">'+escape(L('The branch source file could not be loaded in this browser. Other organization tables remain available.','Impossible de charger le fichier source des directions dans ce navigateur. Les autres tableaux de l’organisme demeurent disponibles.'))+'</p>';
  console.warn('Branch survey:',error);
 }
}

function renderOrg(){
 if(!D)return;const out=$('org-output');if(!out)return;
 selected=$('org-picker')?.value||'';
 if(!selected){out.innerHTML='';return;}
 const name=selected;const p=D.model.DEPTS.find(z=>norm(z[0])===norm(name));
 const meta='<p class="gce-summary">'+escape(deptName(name))+(p?' · '+L('Published workforce 2025','Effectif publié en 2025')+': '+N(p[1]):'')+'</p>';
 const s=sCard('org-coverage',L('Published data coverage','Données publiées disponibles'),
 L('Different datasets cover different populations and years. The presence of an organization in the directory does not mean every dataset applies to it.','Les sources couvrent des populations et des années différentes. La présence d’un organisme dans le répertoire ne signifie pas que chaque jeu de données le concerne.'),
 statusTable(name),L('Official federal organization directory','Répertoire fédéral officiel des organismes'),'https://www.canada.ca/en/government/dept.html');
 out.innerHTML=meta+s+representation(name)+trendTables(name)+subgroupTables(name)+psesTables(name)+staffingTables(name)+hiringTable(name)+ctaTables(name)+plansTable(name);
 const branchArea=document.createElement('section');branchArea.className='gce-data-block';branchArea.id='org-branches';out.append(branchArea);renderBranches(name);
 const url=new URL(location.href);url.searchParams.set('org',name);history.replaceState(null,'',url.pathname+url.search+url.hash);
}
function publicTables(){
 const m=D.model;let out='';
 // Workforce statistics by year.
 const rep=m.rep.filter(r=>r.row_type==='representation').sort((a,b)=>b.period_or_benchmark.localeCompare(a.period_or_benchmark));
 out+=sCard('public-representation',L('Representation in the core public administration, 2017–2025','Représentation dans l’administration publique centrale, 2017-2025'),
 L('Employee counts and shares are published for each year. The four groups can overlap; do not add their counts together.','Les effectifs et les parts sont publiés pour chaque année. Les quatre groupes peuvent se chevaucher : leurs nombres ne doivent pas être additionnés.'),
 table(L('Representation by year: Treasury Board','Représentation selon l’année : Conseil du Trésor'),
 [L('Date','Date'),L('All employees','Tout l’effectif'),L('Women (number)','Femmes (nombre)'),L('Women (%)','Femmes (%)'),L('Indigenous (number)','Autochtones (nombre)'),L('Indigenous (%)','Autochtones (%)'),L('Disability (number)','Handicap (nombre)'),L('Disability (%)','Handicap (%)'),L('Racialized (number)','Racisés (nombre)'),L('Racialized (%)','Racisés (%)')],
 rep.map(r=>[r.period_or_benchmark,N(r.all_employees_number),N(r.women_number),P(r.women_pct),N(r.indigenous_peoples_number),P(r.indigenous_peoples_pct),N(r.persons_with_disabilities_number),P(r.persons_with_disabilities_pct),N(r.members_of_visible_minorities_number),P(r.members_of_visible_minorities_pct)]),'public-workforce-trends'),
 L('Treasury Board Secretariat, employment equity annual statistics','Secrétariat du Conseil du Trésor, statistiques annuelles sur l’équité'),source.tbs);
 // Executive data by level 2025.
 const ex=m.executives.filter(r=>r.as_of_march_31==='2025'&&/^EX \d\d|^Overall EX/.test(r.level));
 out+=sCard('public-executives',L('Executive representation by EX level, 2025','Représentation des cadres selon le niveau EX, 2025'),
 L('Each row is an executive classification level, not a department. Workforce availability benchmarks for executives are a separate comparison population.','Chaque ligne représente un niveau de classification des cadres, et non un ministère. Les valeurs de disponibilité des cadres correspondent à une population de comparaison distincte.'),
 table(L('Executive representation, March 31, 2025','Représentation des cadres au 31 mars 2025'),
 [L('Executive level','Niveau de direction'),L('All executives','Tous les cadres'),L('Women (%)','Femmes (%)'),L('Indigenous (%)','Autochtones (%)'),L('Disability (%)','Handicap (%)'),L('Racialized (%)','Racisés (%)')],
 ex.map(r=>[r.level,N(r.executive_employees),P(r.women_pct),P(r.indigenous_peoples_pct),P(r.persons_with_disabilities_pct),P(r.members_of_visible_minorities_pct)]),'public-executive-2025'),
 L('Treasury Board Secretariat','Secrétariat du Conseil du Trésor'),source.tbs);

 // Detailed group subgroups and overlapping identities from the published workforce dataset.
 for(const g of [['i','Indigenous subgroups','Sous-groupes autochtones'],['v','Racialized subgroups','Sous-groupes racisés'],['d','Disability subgroups','Sous-groupes de handicap'],['w','Women and intersecting identities','Femmes et identités croisées']]){
  const item=m.SUBG[g[0]];
  if(!item?.rows?.length)continue;
  const rows=item.rows.map(x=>[x.name,x.n===null?missing():N(x.n),P(x.p),x.ex===null?missing():P(x.ex)]);
  out+=sCard('public-subgroups-'+g[0],L(g[1],g[2])+' · 2025',
   L('Shares and counts are reproduced as published. Categories may overlap, be incomplete or have unavailable values; do not sum them to reconstruct group totals.','Les parts et les nombres sont reproduits tels que publiés. Les catégories peuvent se chevaucher, être incomplètes ou comporter des données manquantes. Ne les additionnez pas pour reconstituer des totaux.')+(!lang()&&item.note?' '+item.note:''),
   table(L('Subgroup representation, 2025: ','Représentation des sous-groupes, 2025 : ')+L(g[1],g[2]),
   [L('Published subgroup','Sous-groupe publié'),L('Employees (count)','Employés (nombre)'),g[0]==='w'?L('Share of women (%)','Part des femmes (%)'):L('Share of workforce (%)','Part de l’effectif (%)'),L('Executive representation (%)','Représentation des cadres (%)')],rows,'public-subgroups-'+g[0]),
   L('Treasury Board Secretariat, employment equity data','Secrétariat du Conseil du Trésor, données sur l’équité'),source.tbs);
 }

 // Employee surveys overall across equity groups 2024.
 const qs=Object.keys(m.PSES_QMETA),qmeta=m.PSES_QMETA,by=m.EEG_DEPT['Public Service']||{},all=m.PSES_DEPT['Public Service']||{};
 out+=sCard('public-survey',L('2024 Public Service Employee Survey by employee group','Sondage auprès des fonctionnaires de 2024 selon le groupe'),
 L('Each cell is a response percentage among that group’s survey respondents. The meaning of a higher percentage depends on the question. Respondent groups can overlap.','Chaque cellule indique le pourcentage de réponses des répondants du groupe. Le sens d’un pourcentage plus élevé dépend de la question. Les groupes peuvent se chevaucher.'),
 table(L('Public service survey responses, 2024','Réponses au sondage dans la fonction publique, 2024'),
 [L('Question and response','Question et réponse'),L('All respondents','Tous les répondants'),L('Women','Femmes'),L('Disability','Handicap'),L('Indigenous','Autochtones'),L('Racialized','Racisés'),L('Black','Noirs')],
 qs.map(q=>[q+' · '+(lang()?m.EEG_QMETA_FR[q]||qmeta[q][1]:qmeta[q][1]),...['all','woman','pwd','ind','rac','black'].map(k=>P(k==='all'?all[q]:by[k]?.[q]))]),'public-survey-2024'),
 L('2024 Public Service Employee Survey','Sondage auprès des fonctionnaires fédéraux de 2024'),source.pses);
 // Changes 2022-24.
 const yoy=m.YOY['Public Service']||{};
 out+=sCard('public-survey-change',L('Employee survey changes: 2022 and 2024','Évolution des sondages : 2022 et 2024'),
 L('These are published results for comparable questions in each year. A larger share is not necessarily a better outcome; see the question.','Ces résultats publiés portent sur des questions comparables. Une part plus grande n’est pas nécessairement un meilleur résultat : il faut lire la question.'),
 table(L('Public service survey changes by question','Évolution des réponses selon la question'),
 [L('Question and response','Question et réponse'),L('2022 (%)','2022 (%)'),L('2024 (%)','2024 (%)'),L('Change (percentage points)','Variation (points de pourcentage)')],
 Object.keys(yoy).map(q=>[q+' · '+(lang()?m.EEG_QMETA_FR[q]||qmeta[q]?.[1]:qmeta[q]?.[1]||q),P(yoy[q].a),P(yoy[q].b),N(yoy[q].b-yoy[q].a)]),'public-survey-change'),
 L('Public Service Employee Survey','Sondage auprès des fonctionnaires fédéraux'),source.pses);
 // Public service staffing surveys.
 const staffing=D.snps.orgs['Federal Public Service']||D.snps.orgs['Public Service']||findEntry(D.snps.orgs,'Federal Public Service'),q=D.snps.questions;
 out+=sCard('public-staffing-survey',L('2025 Staffing and Non-Partisanship Survey','Sondage sur la dotation et l’impartialité politique de 2025'),
 L('Questions have different respondent bases. Some questions apply only to people who participated in staffing processes. Missing published values are shown as unavailable, not zero.','Les questions n’ont pas toutes les mêmes répondants. Certaines visent uniquement les participants aux processus de dotation. Les valeurs non publiées sont indiquées comme indisponibles et non comme zéro.'),
 table(L('Staffing survey by employee group, 2025','Sondage sur la dotation selon le groupe, 2025'),
 [L('Question and response','Question et réponse'),L('All respondents','Tous les répondants'),L('Women','Femmes'),L('Disability','Handicap'),L('Indigenous','Autochtones'),L('Racialized','Racisés'),L('Black','Noirs')],
 Object.keys(q).map(code=>[code+' · '+L(q[code].en,q[code].fr),...['all','woman','pwd','ind','rac','black'].map(k=>P(staffing?.[k]?.[code]))]),'public-staffing-survey'),
 L('Public Service Commission, 2025 survey','Commission de la fonction publique, sondage de 2025'),D.snps.dataset);
 // Staffing funnel by fiscal year.
 const ps=D.psc,years=Object.keys(ps.appointments).filter(y=>ps.applicants[y]).sort();
 out+=sCard('public-applicants',L('Applicants and appointments by employment equity group','Candidatures et nominations selon le groupe visé par l’équité'),
 L('These figures compare each group’s percentage among applicants and among appointments in a fiscal year. Applicants and appointees are distinct populations.','Ces chiffres comparent la part du groupe parmi les candidatures et parmi les nominations au cours d’un exercice. Les postulants et les personnes nommées sont des populations distinctes.'),
 table(L('Public Service Commission staffing pipeline','Cheminement de la dotation selon la Commission de la fonction publique'),
 [L('Fiscal year','Exercice'),...['w','i','d','v'].flatMap(g=>[L(ps.groups[g][0],ps.groups[g][1])+' · '+L('applicants (%)','candidatures (%)'),L(ps.groups[g][0],ps.groups[g][1])+' · '+L('appointments (%)','nominations (%)')])],
 years.map(y=>[y,...['w','i','d','v'].flatMap(g=>[P(ps.applicants[y]?.[g]),P(ps.appointments[y]?.[g])])]),'public-staffing-pipeline'),
 L('Public Service Commission staffing open data','Données ouvertes sur la dotation de la Commission de la fonction publique'),source.psc);
 // Student pipeline
 const stud=ps.students,syears=Object.keys(stud.hires).filter(y=>stud.applicants[y]).sort();
 out+=sCard('public-students',L('Student applicants and hires by group','Candidatures et embauches d’étudiants selon le groupe'),
 L('The two percentages describe different stages of student recruitment. Interpret them as shares of applicants and hires, not as headcounts.','Les deux pourcentages décrivent des étapes différentes du recrutement étudiant : parts des candidatures et des embauches, non nombres de personnes.'),
 table(L('Student staffing, by fiscal year','Dotation étudiante selon l’exercice'),
 [L('Fiscal year','Exercice'),...['w','i','d','v'].flatMap(g=>[L(ps.groups[g][0],ps.groups[g][1])+' · '+L('applicants','candidatures'),L(ps.groups[g][0],ps.groups[g][1])+' · '+L('hires','embauches')])],
 syears.map(y=>[y,...['w','i','d','v'].flatMap(g=>[P(stud.applicants[y]?.[g]),P(stud.hires[y]?.[g])])]),'public-students'),
 L('Public Service Commission open data','Données ouvertes de la Commission de la fonction publique'),source.psc);
 // Salary source (separate independent derived project)
 const salary=D.salary.slice().sort((a,b)=>Number(b.Year)-Number(a.Year));
 out+=sCard('public-pay',L('Median salaries by employee group, 2017–2025','Salaires médians selon le groupe, 2017-2025'),
 L('These are figures from an independent published analysis and not an official Treasury Board salary series. Compare with its methods, scope and estimates before drawing conclusions.','Ces chiffres proviennent d’une analyse indépendante publiée et non d’une série salariale officielle du Conseil du Trésor. Vérifiez la méthode, la portée et les estimations avant de conclure.'),
 table(L('Median salary in dollars by group','Salaire médian en dollars selon le groupe'),
 [L('Year','Année'),L('All employees ($)','Tous les employés ($)'),L('Black ($)','Noirs ($)'),L('Racialized ($)','Racisés ($)'),L('Indigenous ($)','Autochtones ($)'),L('Disability ($)','Handicap ($)')],
 salary.map(r=>[r.Year,N(r['All Employees']),N(r['Black Employees']),N(r['Visible Minority Employees']),N(r['Indigenous Employees']),N(r['Employees with Disabilities'])]),'public-salary'),
 L('Independent Disproportionality Index project','Projet indépendant Indice de disproportion'),'https://employment-equity.github.io/');
 // Disproportionality
 const di=D.di.filter(r=>r.year_di==='2025');
 out+=sCard('public-pay-index',L('Salary distribution: independent Disproportionality Index, 2025','Répartition salariale : indice indépendant de disproportion, 2025'),
 L('A value of 1 means the group’s share in the salary band matches its overall workforce share under this project’s method. Values above or below 1 describe relative concentration, not discrimination findings.','Une valeur de 1 signifie que la part du groupe dans la tranche salariale correspond à sa part de l’effectif selon la méthode du projet. Les valeurs supérieures ou inférieures à 1 montrent une concentration relative, et non une conclusion de discrimination.'),
 table(L('2025 salary distribution index by group','Indice de répartition salariale en 2025 selon le groupe'),
 [L('Salary band','Tranche salariale'),L('All employees','Tous'),L('Black','Noirs'),L('Racialized','Racisés'),L('Indigenous','Autochtones'),L('Disability','Handicap')],
 di.map(r=>[r.quintile, N(r.di_all),N(r.di_black),N(r.di_vm),N(r.di_indigenous),N(r.di_pwd)]),'public-pay-index'),
 L('Independent Disproportionality Index project','Projet indépendant Indice de disproportion'),'https://employment-equity.github.io/');
 // Call to Action and plans organization comparison from same source.
 const stats=D.cta.counts;
 out+=sCard('public-cta',L('Clerk’s Call to Action: reported documents','Appel à l’action du greffier : documents déclarés'),
 L('The counts show the number of organizations represented in the site’s collection of 2021 letters and 2024 self-assessments. A document is evidence of a reported commitment, not independently verified progress.','Les nombres indiquent les organismes ayant une lettre de 2021 ou une autoévaluation de 2024 dans cette collection. Un document constitue une déclaration d’engagement, et non une preuve indépendante de progrès.'),
 table(L('Coverage of published Call to Action documents','Portée des documents publiés de l’appel à l’action'),
 [L('Document group','Groupe de documents'),L('Organizations','Organismes')],
 [[L('Organizations represented','Organismes représentés'),N(stats.organizations)],[L('2021 letters','Lettres de 2021'),N(stats.letters)],[L('2024 self-assessments','Autoévaluations de 2024'),N(stats.self_assessments)],[L('Organizations with both','Organismes ayant les deux'),N(stats.both)]],'public-cta-coverage'),
 L('Privy Council Office Call to Action records','Dossiers de l’appel à l’action du Bureau du Conseil privé'),'call-to-action.html');
 out+=sCard('public-cta-orgs',L('Call to Action records by organization','Dossiers de l’appel à l’action selon l’organisme'),
 L('This table shows which published documents are included. Select an organization in the first section for its reported commitments, goals and barriers as tables.','Le tableau indique les documents publiés qui sont inclus. Sélectionnez un organisme dans la première section pour consulter ses engagements, objectifs et obstacles déclarés dans des tableaux.'),
 table(L('Organization document coverage','Documents disponibles selon l’organisme'),
 [L('Organization','Organisme'),L('2021 letter','Lettre de 2021'),L('2024 self-assessment','Autoévaluation de 2024')],
 D.cta.organizations.map(o=>[lang()?o.name_fr:o.name_en,o.letter?L('Available','Disponible'):L('Not in collection','Absent'),o.self_assessment?L('Available','Disponible'):L('Not in collection','Absent')]),'public-cta-organizations'),
 L('Privy Council Office publications','Publications du Bureau du Conseil privé'),'call-to-action.html');
 // Published departmental-plan mentions across organizations; all 90 on page.
 const terms=[['Anti-racism','Antiracisme'],['Equity','Équité'],['Inclusion','Inclusion'],['Diversity','Diversité'],['Accessibility','Accessibilité'],['Reconciliation','Réconciliation']];
 out+=sCard('public-plans',L('Departmental plans, 2026–27: term counts across organizations','Plans ministériels de 2026-2027 : mentions par organisme'),
 L('Counts are mentions in the whole published plan, not ratings or proof of implementation. Each term is counted in English and French in the underlying analysis.','Les nombres sont des mentions dans le plan entier, non des notes ou des preuves de mise en œuvre. L’analyse sous-jacente compte chaque terme en anglais et en français.'),
 table(L('2026–27 plans: mentions in each complete plan','Plans de 2026-2027 : mentions dans chaque plan entier'),
 [L('Organization','Organisme'),...terms.map(x=>L(x[0],x[1])),L('All six terms','Les six termes')],
 m.plans.map(p=>[deptName(p.name),...p.t.map(N),N(p.tt)]),'public-departmental-plan-mentions'),
 L('Departmental plan analysis and definitions','Analyse et définitions des plans ministériels'),'departmental-plans-2026-27/');
 // Complete source inventory, displayed inline as a table rather than another click.
 const inv=D.inventory.filter(r=>r.File&&!/^(main-principal \(1\)\.csv)$/i.test(r.File));
 out+=sCard('public-source-inventory',L('Source file inventory','Inventaire des fichiers sources'),
 L('File titles and topics are reproduced from the site inventory. A listed file does not mean that every organization has results in that file.','Les titres et sujets proviennent de l’inventaire du site. La présence d’un fichier ne signifie pas que tous les organismes y figurent.'),
 table(L('Available and catalogued source files','Fichiers sources disponibles et répertoriés'),
 [L('File','Fichier'),L('Title','Titre'),L('Topic','Sujet'),L('Type','Type')],
 inv.map(r=>[r.File,r.Title,lang()?r['Topic (French)']:r.Topic,lang()?r['Type (French)']:r.Type]),'gc-equity-source-inventory'),
 L('Site source catalogue and methods','Catalogue de sources et méthodes du site'),'sources.html');
 $('public-output').innerHTML=out;
}
function populatePicker(){
 const names=[...new Set([...(D.orglist.organizations||[]),...Object.keys(D.series.orgs||{}),...Object.keys(D.model.PSES_DEPT||{}).filter(x=>x!=='Public Service'),...D.model.plans.map(x=>x.name),...D.cta.organizations.map(x=>x.name_en)])].sort((a,b)=>a.localeCompare(b,lang()?'fr':'en'));
 const picker=$('org-picker');const old=picker.value||selected||new URL(location.href).searchParams.get('org')||'';
 picker.innerHTML='<option value="">'+escape(L('Select a department or agency','Sélectionner un ministère ou organisme'))+'</option>'+names.map(n=>'<option value="'+escape(n)+'">'+escape(deptName(n))+'</option>').join('');
 if(names.includes(old)){picker.value=old;selected=old;}
}
function updateStatic(){
 document.querySelectorAll('[data-gce-en]').forEach(el=>{const value=lang()?el.dataset.gceFr:el.dataset.gceEn;if(el.tagName==='INPUT')el.placeholder=value;else el.textContent=value;});
}
function downloadTable(btn){
 const entry=tableStore.get(btn.dataset.table);if(!entry)return;
 const clean=s=>String(s??'').replace(/\s+/g,' ').trim(),quote=s=>'"'+clean(s).replace(/"/g,'""')+'"';
 const lines=[[entry.caption],entry.heads,...entry.rows];
 const csv='\ufeff'+lines.map(row=>row.map(quote).join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=u;a.download=(entry.filename||'gc-equity')+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
}
root.addEventListener('click',e=>{const btn=e.target.closest('.gce-download');if(btn)downloadTable(btn);const n=e.target.closest('.gce-page-next');if(n)paginate(n,1);const p=e.target.closest('.gce-page-prev');if(p)paginate(p,-1);});
$('org-picker')?.addEventListener('change',()=>renderOrg());
$('org-group-picker')?.addEventListener('change',()=>renderOrg());
$('public-group-picker')?.addEventListener('change',()=>publicTables());
let rerenderTimer;
const update=()=>{if(!D)return;updateStatic();updateGroupLabels();populatePicker();renderOrg();publicTables();};
new MutationObserver(()=>{clearTimeout(rerenderTimer);rerenderTimer=setTimeout(update,50);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
(async()=>{try{
 updateStatic();D=await load();updateGroupLabels();populatePicker();publicTables();renderOrg();$('gce-loading').hidden=true;
}catch(e){const status=$('gce-loading');if(status)status.textContent=L('The published data could not be loaded. Please reload the page.','Impossible de charger les données publiées. Veuillez recharger la page.');console.error('GC Equity data tables:',e);}})();
})();