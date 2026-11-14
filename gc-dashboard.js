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
  ['ctaComparisons','data/call-to-action-comparisons.json','json'],
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
function findRow(rows,name){return (rows||[]).find(r=>norm(r.department_or_agency)===norm(name))||null;}
function recordFor(name){return D.cta.organizations.find(o=>[o.site_name,o.pses_name,o.plan_name,o.snps_name,o.name_en].some(n=>norm(n)===norm(name)))||null;}
function planFor(name){return D.model.plans.find(p=>norm(p.name)===norm(name))||null;}
function deptName(name){if(!lang())return name;return D.model.DEPT_FR[name]||D.model.planOrgs[name]?.nameFr||recordFor(name)?.name_fr||name;}
function statusTable(name){
 const coverage=[
 [L('Treasury Board workforce representation, 2017–2025','Représentation de l’effectif du Conseil du Trésor, 2017-2025'),!!findEntry(D.series.orgs,name),L('Core public administration','Administration publique centrale')],
 [L('2024 employee survey, organization','Sondage de 2024 auprès des employés, par organisme'),!!findEntry(D.model.PSES_DEPT,name),L('Survey respondents','Répondants au sondage')],
 [L('2025 staffing experiences by group','Expérience de la dotation de 2025 selon le groupe'),!!findEntry(D.snps.orgs,name),L('Staffing survey respondents','Répondants au sondage sur la dotation')],
 [L('PSEA workforce by organization','Effectif selon la LEFP par organisme'),D.pscPopulation.some(x=>norm(x.organization_e)===norm(name)),L('PSEA workforce','Effectif assujetti à la LEFP')],
 [L('Appointments by first official language','Nominations selon la première langue officielle'),D.pscOfficialLanguage.some(x=>norm(x.department_e)===norm(name)),L('Appointees in staffing data','Personnes nommées dans les données de dotation')],
 [L('Appointments by equity self-identification','Nominations selon l’auto-identification aux fins de l’équité'),!!findEntry(D.psc.hiring,name),L('Public Service Commission appointments','Nominations selon la Commission de la fonction publique')],
 [L('Clerk’s Call to Action documents','Documents de l’Appel à l’action du greffier'),!!recordFor(name),L('Published organizational responses','Réponses publiées des organismes')],
 [L('2026–27 departmental plan','Plan ministériel de 2026-2027'),!!planFor(name),L('Organizations with published plans','Organismes ayant publié un plan')]
 ];
 return table(L('Published source coverage for ','Couverture des sources publiées pour ')+deptName(name),
 [L('Dataset','Jeu de données'),L('Available for this organization','Disponible pour cet organisme'),L('Population in this source','Population visée par la source')],
 coverage.map(x=>[x[0],x[1]?L('Published here','Publié ici'):L('Not in selected source collection','Absent des sources retenues'),x[2]]),'organization-data-coverage');
}
function representation(name){
 const rec=findEntry(D.series.orgs,name),d=D.model.DEPTS.find(z=>norm(z[0])===norm(name));
 if(!rec&&!d)return '';
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
 L('These are organization-wide summaries of what was reported in 2021 and 2024, not group-specific measurements or independently verified achievements. The original letters and assessments are linked below.','Il s’agit de résumés concernant l’ensemble de l’organisme déclarés en 2021 et 2024, et non de mesures propres au groupe choisi ni de réalisations vérifiées de façon indépendante. Les documents originaux sont accessibles ci-dessous.'),
 table(L('2021 stated commitments: ','Engagements déclarés en 2021 : ')+deptName(name),[L('Item','Élément'),L('Published commitment summary','Résumé de l’engagement publié')],letters.map((x,i)=>[String(i+1),x]),'org-call-to-action-commitments')+
 (targets.length?table(L('Targets stated in the 2021 letter','Objectifs de la lettre de 2021'),[L('Item','Élément'),L('Target','Objectif')],targets.map((x,i)=>[String(i+1),String(x)]),'org-cta-targets'):'')+
 table(L('2024 reported goals: ','Objectifs déclarés en 2024 : ')+deptName(name),[L('Area','Domaine'),L('Reported status','État déclaré'),L('Details from the summary','Détails du résumé')],goalRows,'org-call-to-action-goals')+
 table(L('2024 reported progress','Progrès déclarés en 2024'),[L('Item','Élément'),L('Reported action or progress','Action ou progrès déclaré')],progress,'org-call-to-action-progress')+
 table(L('2024 reported barriers','Obstacles déclarés en 2024'),[L('Item','Élément'),L('Reported barrier','Obstacle déclaré')],barriers,'org-call-to-action-barriers')+
 (doc?.letter?.url?'<p class="gce-source">'+link(doc.letter.url,L('2021 original letter','Lettre originale de 2021'))+'</p>':'')+(doc?.self_assessment?.url?'<p class="gce-source">'+link(doc.self_assessment.url,L('2024 original self-assessment','Autoévaluation originale de 2024'))+'</p>':''),
 L('Privy Council Office documents','Documents du Bureau du Conseil privé'),doc?.self_assessment?.url||doc?.letter?.url||'call-to-action.html');
}
const extraSourceCache=new Map();
let extraOrgRequest=0;
function optionalCsv(path){
 if(!extraSourceCache.has(path))extraSourceCache.set(path,fetch(path).then(r=>{if(!r.ok)throw Error(path+': HTTP '+r.status);return r.text();}).then(csvParse).catch(e=>{extraSourceCache.delete(path);throw e;}));
 return extraSourceCache.get(path);
}
async function renderAdditionalOrgData(name){
 const token=++extraOrgRequest,host=$('org-additional-psc');if(!host||!name)return;
 host.innerHTML='<p class="gce-explain" role="status">'+escape(L('Checking additional published organizational staffing and regional data…','Vérification des autres données publiées sur la dotation et les régions de l’organisme…'))+'</p>';
 try{
  const [regions,mobility]=await Promise.all([
   optionalCsv('data/psc/ar2d.csv'),
   optionalCsv('data/psc/internal_mob.csv')
  ]);
  if(token!==extraOrgRequest||!host.isConnected||selectGroup('org')!=='all')return;
  let html='';
  const orgRegions=regions.filter(x=>norm(x.organization_e)===norm(name));
  if(orgRegions.length){
   const latest=[...new Set(orgRegions.map(x=>x.month_end_date))].sort().at(-1);
   const rs=orgRegions.filter(x=>x.month_end_date===latest).sort((a,b)=>a.geo_region_e.localeCompare(b.geo_region_e));
   if(rs.length)html+=sCard('org-psc-region',L('Public Service Employment Act workforce by region, ','Effectif selon la LEFP par région, ')+latest,
    L('These are employees in the Public Service Commission population, shown by work region for this organization at the stated date. They are not broken down by equity group and are not Treasury Board core-public-administration representation.','Il s’agit de l’effectif assujetti à la LEFP selon la région de travail dans cet organisme à la date indiquée. Ces données ne sont pas ventilées selon le groupe visé par l’équité et ne correspondent pas à la représentation de l’administration publique centrale selon le Conseil du Trésor.'),
    table(L('PSEA employees by region: ','Employés assujettis à la LEFP selon la région : ')+deptName(name),
    [L('Region','Région'),L('Published employee count','Effectif publié')],rs.map(x=>[lang()?x.geo_region_f||x.geo_region_e:x.geo_region_e,N(x.n)]),'organization-psc-regional-workforce'),
    L('Public Service Commission regional PSEA population data','Commission de la fonction publique, effectif selon la LEFP par région'),'data/psc/ar2d.csv');
  }
  const orgMoves=mobility.filter(x=>norm(x.department_e)===norm(name)&&x.quarter==='Q1');
  if(orgMoves.length){
   const fy=[...new Set(orgMoves.map(x=>x.fiscal_year))].sort().at(-1),moves=orgMoves.filter(x=>x.fiscal_year===fy);
   if(moves.length)html+=sCard('org-psc-mobility',L('Staffing movements recorded in ','Mouvements de dotation déclarés dans ')+fy,
    L('The Public Service Commission publishes separate counts of acting appointments, promotions and lateral/downward movements. These are staffing events, not necessarily unique people, and cannot be treated as equity-group promotion rates.','La Commission de la fonction publique publie des nombres distincts de nominations intérimaires, de promotions et de mouvements latéraux ou régressifs. Il s’agit d’activités de dotation, pas nécessairement de personnes distinctes; ces nombres ne sont pas des taux de promotion selon le groupe visé par l’équité.'),
    table(L('Reported staffing movements: ','Mouvements de dotation déclarés : ')+deptName(name)+' ('+fy+')',
    [L('Movement type','Type de mouvement'),L('Published annual count','Nombre annuel publié')],
    moves.map(x=>[lang()?x.mob_type_f||x.mob_type_e:x.mob_type_e,N(x.count)]),'organization-psc-mobility'),
    L('Public Service Commission staffing dashboard, internal mobility','Commission de la fonction publique, tableau de bord de la dotation, mobilité interne'),'data/psc/internal_mob.csv');
  }
  host.innerHTML=html;
 }catch(e){
  if(token!==extraOrgRequest||!host.isConnected)return;
  host.innerHTML='<p class="gce-unavailable">'+escape(L('Additional region or mobility tables are temporarily unavailable. Other verified tables remain accessible.','Les tableaux supplémentaires sur les régions ou la mobilité sont temporairement indisponibles. Les autres tableaux vérifiés demeurent accessibles.'))+'</p>';
  console.warn('PSC optional organization sources:',e);
 }
}

function ctaComparisonOrg(name){
 const sourceData=D.ctaComparisons;
 const rec=sourceData?.organizations?.find(o=>norm(o.name_en)===norm(name)||norm(o.name_fr)===norm(name));
 if(!rec)return '';
 let out='';
 const g=selectGroup('org'),groupsAvailable=g==='all'?['i','v','d','b']:['i','v','d','b'].includes(g)?[g]:[];
 if(groupsAvailable.length){
  const metrics=groupsAvailable.map(key=>[
   groupWord(key),
   P(rec['rep_'+key+'_2021']),P(rec['rep_'+key+'_2023']),P(rec['rep_'+key+'_2025']),
   key==='b'?L('No Black-specific benchmark','Aucune valeur de référence propre au groupe des employés noirs'):P(rec['wfa_'+key+'_2025'])
  ]);
  out+=sCard('org-cta-outcomes',L('Published equity representation in this organization: 2021, 2023 and 2025','Représentation publiée dans cet organisme : 2021, 2023 et 2025'),
   L('Representation figures and workforce availability estimates are attributed to this organization alone. They are not public service totals. Comparing years does not identify the cause of a change.','Les chiffres de représentation et les estimations de disponibilité sont attribués à cet organisme seulement. Il ne s’agit pas de totaux pour la fonction publique. Une comparaison entre les années ne permet pas de déterminer les causes de la variation.'),
   table(L('Equity representation outcomes: ','Résultats de représentation en matière d’équité : ')+deptName(name),
   [L('Employee group','Groupe d’employés'),L('2021 representation (%)','Représentation 2021 (%)'),L('2023 representation (%)','Représentation 2023 (%)'),L('2025 representation (%)','Représentation 2025 (%)'),L('2025 workforce availability (%)','Disponibilité 2025 (%)')],
   metrics,'organization-call-to-action-representation'),
   L('Site’s organization-level Call to Action comparison dataset','Données comparatives de l’appel à l’action selon l’organisme'),'data/call-to-action-comparisons.json');
 }
 const categories=Object.entries(sourceData.categories||{});
 if(categories.length){
  const label=v=>v===true?L('Mention detected in document','Mention relevée dans le document'):
    v===false?L('No mention detected','Aucune mention relevée'):L('No comparable document coded','Aucun document comparable codé');
  out+=sCard('org-cta-coding',L('Issues and initiatives mentioned in this organization’s Call to Action documents','Thèmes et initiatives mentionnés dans les documents de cet organisme sur l’appel à l’action'),
   L('These columns are automated keyword classifications of the organization’s own 2021 letter and 2024 self-assessment, not proof that a program exists or was effective. An undetected mention is not evidence that an action never occurred.','Les colonnes sont issues d’un classement automatisé par mots-clés de la lettre de 2021 et de l’autoévaluation de 2024 de cet organisme. Elles ne prouvent ni l’existence ni l’efficacité d’un programme. L’absence de mention détectée ne signifie pas qu’aucune mesure n’a été prise.'),
   table(L('Coded mentions in organization documents: ','Mentions codées dans les documents de l’organisme : ')+deptName(name),
   [L('Topic or initiative','Thème ou initiative'),L('2021 letter','Lettre de 2021'),L('2024 self-assessment','Autoévaluation de 2024')],
   categories.map(([key,meta])=>[L(meta.en,meta.fr),label(rec['L_'+key]),label(rec['S_'+key])]),'organization-call-to-action-keyword-codes'),
   L('Method and locally published comparison dataset','Méthode et données comparatives publiées ici'),'data/call-to-action-comparisons.json');
 }
 return out;
}

function pscPopulationOrg(name){
 const rows=D.pscPopulation.filter(r=>norm(r.organization_e)===norm(name)&&r.description_e==='Population').sort((a,b)=>String(a.month_year_e).localeCompare(String(b.month_year_e)));
 if(!rows.length)return '';
 return sCard('org-psc-population',L('Public Service Employment Act workforce size','Effectif assujetti à la Loi sur l’emploi dans la fonction publique'),
  L('Published Public Service Commission organization population counts at the reporting date shown. This series has a different legal and organizational scope from Treasury Board employment-equity representation.','Effectifs publiés par la Commission de la fonction publique à la date indiquée. Cette série a une portée juridique et organisationnelle différente de celle du Conseil du Trésor sur la représentation en matière d’équité.'),
  table(L('PSEA workforce counts for ','Effectif selon la LEFP pour ')+deptName(name),
  [L('Reporting month and year','Mois et année de référence'),L('Reported employees','Effectif déclaré')],
  rows.map(r=>[lang()?r.month_year_f||r.month_year_e:r.month_year_e,N(r.n)]),'organization-psc-psea-workforce'),
  L('Public Service Commission workforce by organization','Commission de la fonction publique, effectif par organisme'),'data/psc/CFPPSC_AR2C.csv');
}
function pscLanguageOrg(name){
 const matches=D.pscOfficialLanguage.filter(r=>norm(r.department_e)===norm(name));
 if(!matches.length)return '';
 const years=[...new Set(matches.map(r=>r.fiscal_year))].sort();
 const cols=[['Anglophones','Anglophones'],['Francophones','Francophones']];
 const other=[...new Set(matches.map(r=>r.fol_e))].filter(x=>!cols.some(z=>z[0]===x));
 const labels=cols.concat(other.map(x=>[x,x]));
 const rows=years.map(y=>[y,...labels.map(([k])=>{const entry=matches.find(r=>r.fiscal_year===y&&r.fol_e===k);return entry?N(entry.count):missing();})]);
 return sCard('org-official-language',L('Appointments by first official language','Nominations selon la première langue officielle'),
  L('Counts of appointments in this Public Service Commission staffing source, by the appointee’s first official language and fiscal year. They are not counts of all employees or of bilingual positions.','Nombres de nominations dans cette source de la Commission de la fonction publique, selon la première langue officielle de la personne nommée et l’exercice. Il ne s’agit ni du nombre total d’employés ni du nombre de postes bilingues.'),
  table(L('Appointments by first official language for ','Nominations selon la première langue officielle pour ')+deptName(name),
   [L('Fiscal year','Exercice'),...labels.map(x=>x[0])],rows,'organization-first-official-language-appointments'),
  L('Public Service Commission staffing dashboard, first official language','Commission de la fonction publique, tableau de bord de la dotation, première langue officielle'),'data/psc/demo_fol.csv');
}
function renderSourceCatalogue(){
 const host=$('public-source-inventory');if(!host||!D)return;
 const categories=[['onpage','Data shown on this page','Données présentées dans cette page'],['psc','55 Public Service Commission data files','55 fichiers de données de la Commission de la fonction publique'],['snps','2023 and 2025 staffing survey source files','Fichiers sources des sondages sur la dotation de 2023 et 2025'],['archive','Archived source inventory','Inventaire des sources archivées']];
 const onpage=[
 ['Workforce representation and availability','Représentation de l’effectif et disponibilité','#public-representation','2017–2025'],
 ['Long-term equity representation','Représentation à long terme','#public-history','1998–2025'],
 ['Executive representation','Représentation des cadres','#public-executives','2025'],
 ['Hiring, promotions and separations','Embauches, promotions et départs','#public-workforce-flow','2024–25'],
 ['2024 employee survey by department and public service','Sondage auprès des fonctionnaires de 2024, par organisme et pour la fonction publique','#public-survey','2024'],
 ['2024 branch and respondent-group survey','Sondage de 2024 selon la direction et le groupe de répondants','#department-data','2024'],
 ['2025 staffing survey','Sondage sur la dotation de 2025','#public-staffing-survey','2025'],
 ['PSC applicant, appointment and student series','Séries sur les candidatures, nominations et étudiants','#public-applicants','2013–2023'],
 ['PSC region and first official language','PSC : région et première langue officielle','#public-regions','2011–2025'],
 ['PSEA workforce and tenure','Effectif et durée d’emploi selon la LEFP','#public-psea-tenure','2007–2025'],
 ['Published salary distribution by group','Répartition salariale publiée selon le groupe','#public-salary-bands','2025'],
 ['Independent salary estimates and index','Estimations et indice salariaux indépendants','#public-pay','2017–2025'],
 ['Clerk’s Call to Action commitments and self-assessments','Engagements et autoévaluations liés à l’Appel à l’action du greffier','#public-cta','2021–2024'],
 ['2026–27 departmental plan mentions','Mentions dans les plans ministériels de 2026-2027','#public-plans','2026–27']
 ].map(([en,fr,href,year])=>({kind:'onpage',en,fr,href,year,location:'onpage'}));
 const local=(D.pscCatalog.files||[]).map(x=>({kind:'psc',en:x.en||x.file,fr:x.fr||x.en||x.file,href:x.path,year:(x.years||[]).join('–')||'',file:x.file,location:'local'}));
 const external=(D.pscCatalog.snps||[]).map(x=>({kind:'snps',en:x.en||x.file,fr:x.fr||x.en||x.file,href:x.url||'',year:x.year||'',file:x.file,location:'external'}));
 const known=new Map(local.map(x=>[x.file.toLowerCase(),x.href]));
 const archived=(D.inventory||[]).filter(x=>x.File&&!/^(main-principal \(1\)\.csv)$/i.test(x.File)).map(x=>({
  kind:'archive',en:x.Title||x.File,fr:x.Title||x.File,href:known.get(x.File.toLowerCase())||'',
  year:x.Topic||'',file:x.File,location:known.has(x.File.toLowerCase())?'local':'reference'
 }));
 const data=onpage.concat(local,external,archived);
 const kindCount=key=>data.filter(x=>x.kind===key).length;
 host.innerHTML='<h3>'+escape(L('Dataset finder: included tables and source files','Recherche de données : tableaux inclus et fichiers sources'))+'</h3>'+
 '<p class="gce-explain">'+escape(L('The full tables are shown on this page. This catalogue also identifies additional Public Service Commission files, official survey downloads, and archive references. A catalogue entry is not a claim that its entire file is visualized or hosted here.','Les tableaux intégrés se trouvent dans cette page. Ce catalogue répertorie aussi d’autres fichiers de la Commission de la fonction publique, des téléchargements officiels des sondages et des références archivées. Une entrée au catalogue ne signifie pas que tout le fichier est visualisé ou hébergé ici.'))+'</p>'+
 '<div class="gce-filter-panel"><div><label for="gce-source-kind">'+escape(L('Dataset collection','Collection de données'))+'</label><select id="gce-source-kind">'+categories.map(([k,en,fr])=>'<option value="'+k+'">'+escape(L(en,fr))+' ('+kindCount(k)+')</option>').join('')+'</select></div>'+
 '<div><label for="gce-source-search">'+escape(L('Search titles and file names','Rechercher un titre ou un nom de fichier'))+'</label><input type="search" id="gce-source-search" placeholder="'+escape(L('Search a dataset','Rechercher des données'))+'"></div></div>'+
 '<div class="gce-table-wrap" role="region" tabindex="0" aria-label="'+escape(L('Dataset file catalogue','Catalogue des fichiers de données'))+'"><table id="gce-source-table" data-gcw-ready="yes"><caption>'+escape(L('Verified source and dataset inventory','Inventaire des données et sources vérifiées'))+'</caption><thead><tr>'+
 [L('Dataset or file','Données ou fichier'),L('Period or topic','Période ou sujet'),L('Available here','Disponible ici')].map(x=>'<th scope="col">'+escape(x)+'</th>').join('')+'</tr></thead><tbody id="gce-source-rows"></tbody></table></div>'+
 '<div class="gce-pager"><button type="button" id="gce-source-prev" disabled>'+escape(L('Previous','Précédent'))+'</button><span id="gce-source-count" role="status" aria-live="polite"></span><button type="button" id="gce-source-next">'+escape(L('Next','Suivant'))+'</button></div>';
 const kind=$('gce-source-kind'),search=$('gce-source-search'),body=$('gce-source-rows');
 let filtered=[],page=0;
 function filter(){
  const term=norm(search.value);
  filtered=data.filter(x=>x.kind===kind.value&&(!term||norm([x.en,x.fr,x.file,x.year].join(' ')).includes(term)));
  page=0;draw();
 }
 function draw(){
  body.innerHTML=filtered.slice(page*15,(page+1)*15).map(x=>{
   const name=escape(L(x.en,x.fr));
   const label=x.href?link(x.href,L(x.en,x.fr)):name;
   const status=x.location==='onpage'?L('Table on this page','Tableau dans cette page'):
     x.location==='local'?L('Data file stored in this repository','Fichier de données dans le dépôt'):
     x.location==='external'?L('Official source only','Source officielle seulement'):L('Catalogue reference; source not hosted','Référence du catalogue; source non hébergée');
   return '<tr><th scope="row">'+label+(x.file?'<div class="gce-file-name">'+escape(x.file)+'</div>':'')+'</th><td>'+escape(x.year||'')+'</td><td>'+escape(status)+'</td></tr>';
  }).join('');
  $('gce-source-count').textContent=filtered.length?L('Items ','Éléments ')+(page*15+1)+'–'+Math.min((page+1)*15,filtered.length)+' / '+filtered.length:L('No matching datasets.','Aucune donnée correspondante.');
  $('gce-source-prev').disabled=page===0;
  $('gce-source-next').disabled=(page+1)*15>=filtered.length;
 }
 kind.addEventListener('change',filter);search.addEventListener('input',filter);
 $('gce-source-prev').addEventListener('click',()=>{if(page>0){page--;draw();}});
 $('gce-source-next').addEventListener('click',()=>{if((page+1)*15<filtered.length){page++;draw();}});
 filter();
}

function publicTenureTable(){
 const data=D.pscTenure.filter(r=>r.description_e?.includes('Public Service Employment Act')&&String(r.month_end_date).endsWith('-03-31'));
 if(!data.length)return '';
 const yrs=[...new Set(data.map(r=>r.month_end_date))].sort().slice(-10);
 const types=[['Indeterminate','Indeterminate','Période indéterminée'],['Term','Term','Durée déterminée'],['Casual','Casual','Emploi occasionnel'],['Student','Student','Étudiant']];
 return sCard('public-psea-tenure',L('Public Service Employment Act workforce by employment tenure','Effectif selon la durée d’emploi sous la Loi sur l’emploi dans la fonction publique'),
  L('Published workforce counts by employment tenure, a separate Public Service Commission population from the Treasury Board core public administration. These are counts, not employment equity breakdowns.','Nombres d’employés publiés selon la durée d’emploi dans la population de la Commission de la fonction publique, distincte de l’administration publique centrale du Conseil du Trésor. Il s’agit d’effectifs, non de ventilations par groupe d’équité.'),
  table(L('PSEA workforce counts by tenure, March of each year','Effectif de la LEFP selon la durée d’emploi, mars de chaque année'),
   [L('Reporting date','Date de référence'),...types.map(x=>L(x[1],x[2]))],
   yrs.map(y=>[y,...types.map(t=>{const z=data.find(r=>r.month_end_date===y&&r.tenure_e===t[0]);return z?N(z.n):missing()})]),'public-psea-workforce-by-tenure'),
  L('Public Service Commission, PSEA workforce by tenure','Commission de la fonction publique, effectif selon la durée d’emploi'),'data/psc/ar2a.csv');
}

function plansTable(name){
 const p=planFor(name);if(!p)return '';
 const terms=[
 ['Anti-racism','Antiracisme'],['Employment equity','Équité en matière d’emploi'],['Inclusion','Inclusion'],['Diversity','Diversité'],['Accessibility','Accessibilité'],['Reconciliation','Réconciliation']
 ];
 const rows=p?terms.map((g,i)=>[L(g[0],g[1]),N(p.t?.[i]),N(p.i?.[i])]):[];
 return sCard('org-plans',L('6. Terms in the 2026–27 departmental plan','6. Termes dans le plan ministériel de 2026-2027'),
 L('These counts are organization-wide mentions of six topics in the complete plan and its Internal Services section, not measurements for the selected employee group. A mention is not proof of action or results.','Ces nombres sont les mentions de six thèmes dans le plan entier et sa section Services internes, sans ventilation selon le groupe d’employés choisi. Une mention ne prouve ni une action ni un résultat.'),
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
 const labels={
 MOSTPOS:[L('Most positive (%)','Plus positive (%)'), 'MOSTPOS'],
 NEUTRAL:[L('Neutral (%)','Neutre (%)'), 'NEUTRAL'],
 MOSTNEG:[L('Most negative (%)','Plus négative (%)'), 'MOSTNEG'],
 AGREE:[L('Agreement measure (%)','Mesure de l’accord (%)'), 'AGREE'],
 SCORE100:[L('Score (out of 100)','Note (sur 100)'), 'SCORE100'],
 ANSCOUNT:[L('Published response count','Nombre de réponses publié'), 'ANSCOUNT']
 };
 const options=(items,value='',text='')=>'<option value="'+escape(value)+'">'+escape(text||value)+'</option>'+items.map(([v,n])=>'<option value="'+escape(v)+'">'+escape(n)+'</option>').join('');
 const demoGroups=meta.demographics.map((d,i)=>[String(i),branchLabel(d)]).sort((a,b)=>a[1].localeCompare(b[1]));
 const metaQs=meta.questions.map((q,i)=>[String(i),q.id+' · '+branchLabel(q)]);
 const codes=['Q12','Q24','Q42','Q43','Q45','Q47','Q49','Q52','Q53','Q58','Q63','Q65','Q70','Q72'];
 const focus=new Set(meta.questions.map((q,i)=>codes.some(prefix=>new RegExp('^'+prefix+'(?:_|$)').test(q.id))?i:null).filter(x=>x!==null));
 const selected=selectGroup('org'),map={w:'Woman',i:'Indigenous',nonind:'Non-Indigenous',d:'Person with disability',nopwd:'Person without a disability',v:'Racialized',nonrac:'Non-racialized',b:'Black',lgbt:'2SLGBTQIA+'};
 const preferred=meta.demographics.findIndex(x=>x.en===map[selected]);
 const branches=dept.branches.map(b=>[String(b.id),branchLabel(b)]).sort((a,b)=>a[1].localeCompare(b[1]));
 host.innerHTML='<div class="gce-filter-panel">'+
 '<div><label for="gce-branch-unit">'+escape(L('Branch or unit','Direction ou unité'))+'</label><select id="gce-branch-unit">'+options(branches,'',L('All published units','Toutes les unités publiées'))+'</select></div>'+
 '<div><label for="gce-branch-group">'+escape(L('Respondent group','Groupe de répondants'))+'</label><select id="gce-branch-group">'+options(demoGroups,'',L('All published respondent groups','Tous les groupes de répondants publiés'))+'</select></div>'+
 '<div><label for="gce-branch-question">'+escape(L('Survey question','Question du sondage'))+'</label><select id="gce-branch-question"><option value="key">'+escape(L('Workplace experience questions','Questions sur l’expérience au travail'))+'</option><option value="all">'+escape(L('All questions (207 in source)','Toutes les questions (207 dans la source)'))+'</option>'+metaQs.map(([v,n])=>'<option value="'+escape(v)+'">'+escape(n)+'</option>').join('')+'</select></div>'+
 '</div>'+
 '<p class="gce-explain">'+escape(L('Choose a unit, group or question to narrow the results. Only 18 rows appear at once. “Response option” codes depend on the question and are not interchangeable. Suppressed and unpublished values are never treated as zero.','Choisissez une unité, un groupe ou une question pour préciser les résultats. Seulement 18 lignes sont affichées à la fois. Les codes des options de réponse dépendent de la question et ne sont pas interchangeables. Les valeurs supprimées ou non publiées ne sont jamais considérées comme des zéros.'))+'</p>'+
 '<div class="gce-table-actions"><button type="button" id="gce-branch-download" class="gce-download">'+escape(L('Download filtered results (CSV)','Télécharger les résultats filtrés (CSV)'))+'</button></div>'+
 '<div class="gce-table-wrap" role="region" tabindex="0" aria-label="'+escape(L('2024 branch survey results','Résultats du sondage de 2024 par direction'))+'">'+
 '<table id="gce-branch-complete" data-gcw-ready="yes"><caption>'+escape(L('2024 Public Service Employee Survey by second-level unit, question and respondent group','Sondage auprès des fonctionnaires fédéraux de 2024 selon la direction, la question et le groupe de répondants'))+'</caption><thead><tr>'+
 [L('Branch','Direction'),L('Respondent group','Groupe de répondants'),L('Survey question','Question du sondage'),labels.MOSTPOS[0],labels.MOSTNEG[0],labels.AGREE[0],labels.SCORE100[0],labels.ANSCOUNT[0]].map(x=>'<th scope="col">'+escape(x)+'</th>').join('')+
 '</tr></thead><tbody id="gce-branch-rows"></tbody></table></div>'+
 '<div class="gce-pager"><button type="button" id="gce-branch-prev" disabled>'+escape(L('Previous','Précédent'))+'</button><span id="gce-branch-count" role="status" aria-live="polite"></span><button type="button" id="gce-branch-next">'+escape(L('Next','Suivant'))+'</button></div>';
 const unit=$('gce-branch-unit'),group=$('gce-branch-group'),question=$('gce-branch-question');
 if(preferred>=0)group.value=String(preferred);
 const indices=Object.fromEntries(Object.values(labels).map(x=>[x[1],meta.schema.indexOf(x[1])+3]));
 const tbody=$('gce-branch-rows'),status=$('gce-branch-count');let current=[],page=0;
 function update(){
  if(request!==branchRequest||!host.isConnected)return;
  const filterUnit=unit.value,filterGroup=group.value,filterQuestion=question.value;
  current=rows.filter(r=>
   (!filterUnit||String(r[0])===filterUnit)&&
   (!filterGroup||String(r[1])===filterGroup)&&
   (filterQuestion==='all'||(filterQuestion==='key'?focus.has(r[2]):String(r[2])===filterQuestion)));
  page=0;show();
 }
 function show(){
  if(request!==branchRequest||!tbody.isConnected)return;
  const slice=current.slice(page*PAGE_ROWS,(page+1)*PAGE_ROWS);
  tbody.innerHTML=slice.map(r=>{
   const a=branchRow(r,meta,dept);
   return '<tr><th scope="row">'+escape(a.branch)+'</th><td>'+escape(a.group)+'</td><td>'+escape(a.question)+'</td>'+
    ['MOSTPOS','MOSTNEG','AGREE','SCORE100','ANSCOUNT'].map(k=>'<td>'+escape(branchValue(r[indices[k]]))+'</td>').join('')+'</tr>';
  }).join('');
  status.textContent=current.length?pageText(page,current.length):L('No published rows match these selections.','Aucune ligne publiée ne correspond à ces choix.');
  $('gce-branch-prev').disabled=page===0;
  $('gce-branch-next').disabled=(page+1)*PAGE_ROWS>=current.length;
 }
 for(const el of [unit,group,question])el.addEventListener('change',update);
 $('gce-branch-prev').addEventListener('click',()=>{if(page>0){page--;show();}});
 $('gce-branch-next').addEventListener('click',()=>{if((page+1)*PAGE_ROWS<current.length){page++;show();}});
 $('gce-branch-download').addEventListener('click',()=>branchCsv(current,meta,dept));
 update();
}
async function renderBranches(name){
 const id=++branchRequest,host=$('org-branches');if(!host||!name)return;
 host.innerHTML='<h3>'+escape(L('2024 employee survey by branch','Sondage de 2024 selon la direction'))+'</h3><p role="status">'+escape(L('Loading published branch results…','Chargement des résultats publiés par direction…'))+'</p>';
 try{
  const meta=await branchMeta();if(id!==branchRequest)return;
  const dept=meta.departments.find(d=>norm(d.en)===norm(name)||norm(d.fr)===norm(name));
  if(!dept){host.innerHTML='';return;}
  let data=branchDataCache.get(dept.id);
  if(!data){
   if(typeof DecompressionStream==='undefined')throw Error('Browser gzip support unavailable');
   const response=await fetch('data/pses-2024-branches/'+encodeURIComponent(dept.id)+'.json.gz');
   if(!response.ok)throw Error('2024 branch source HTTP '+response.status);
   data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
   if(!Array.isArray(data))throw Error('Branch rows not in expected list');
   branchDataCache.set(dept.id,data);
  }
  if(id!==branchRequest)return;
  host.innerHTML='<h3>'+escape(L('2024 Public Service Employee Survey by branch','Sondage auprès des fonctionnaires fédéraux de 2024 selon la direction'))+'</h3>'+
   '<p class="gce-explain">'+escape(L('These are second-level organizational units from the original published survey. Each question and respondent group has its own response percentages. The data are not a survey of all employees in the unit.','Il s’agit des unités organisationnelles de deuxième niveau du sondage publié. Chaque question et groupe de répondants a ses propres pourcentages. Les données ne constituent pas un recensement de tous les employés de l’unité.'))+'</p>'+
   '<div id="gce-branch-full"></div>'+
   '<p class="gce-source">'+L('Source','Source')+': '+link(meta.sourceCsv||meta.source||'https://open.canada.ca/',L('2024 Public Service Employee Survey, second organizational level','Sondage auprès des fonctionnaires fédéraux de 2024, deuxième niveau organisationnel'))+'.</p>';
  branchFullTable($('gce-branch-full'),data,meta,dept,id);
 }catch(error){
  if(id!==branchRequest)return;
  host.innerHTML='<h3>'+escape(L('2024 branch survey data','Résultats du sondage de 2024 par direction'))+'</h3><p role="alert">'+escape(L('Branch data could not be loaded in this browser. Other tables remain available.','Impossible de charger les données des directions dans ce navigateur. Les autres tableaux demeurent disponibles.'))+'</p>';console.warn('2024 branch survey:',error);
 }
}

function renderOrg(){
 if(!D)return;const out=$('org-output');if(!out)return;
 selected=$('org-picker')?.value||'';
 const showDepartment=!!selected;
 const global=document.getElementById('equity-data'),related=document.getElementById('related-public-resources');
 if(global)global.hidden=showDepartment;
 if(related)related.hidden=showDepartment;
 if(!selected){
  extraOrgRequest++;branchRequest++;
  window.GCEOrgSources?.render(null);
  out.innerHTML='';
  const url=new URL(location.href);url.searchParams.delete('org');
  history.replaceState(null,'',url.pathname+url.search+url.hash);
  return;
 }
 const name=selected;const p=D.model.DEPTS.find(z=>norm(z[0])===norm(name));
 const meta='<p class="gce-summary">'+escape(deptName(name))+(p?' · '+L('Published workforce 2025','Effectif publié en 2025')+': '+N(p[1]):'')+'</p>';
 const s=sCard('org-coverage',L('Published data coverage for the selected organization','Données publiées disponibles pour l’organisme sélectionné'),
 L('Only records explicitly attributed to this organization are included here. Each source may use a different workforce population and reporting period. Public service-wide figures appear only in the separate equity section when no organization is selected.','Seules les données explicitement attribuées à cet organisme figurent ici. Les sources peuvent utiliser des populations et périodes de référence différentes. Les chiffres visant l’ensemble de la fonction publique sont affichés dans la section générale lorsqu’aucun organisme n’est sélectionné.'),
 statusTable(name),L('Federal government department and agency directory','Répertoire des ministères et organismes fédéraux'),'https://www.canada.ca/en/government/dept.html');
 out.innerHTML=meta+s+representation(name)+trendTables(name)+subgroupTables(name)+
 (selectGroup('org')==='all'?pscPopulationOrg(name)+pscLanguageOrg(name):'')+
 psesTables(name)+staffingTables(name)+(selectGroup('org')==='all'?hiringTable(name):'')+
 ctaTables(name)+ctaComparisonOrg(name)+plansTable(name);
 if(selectGroup('org')==='all'){
  const extra=document.createElement('div');extra.id='org-additional-psc';out.append(extra);renderAdditionalOrgData(name);
 }else extraOrgRequest++;
 const branchArea=document.createElement('section');branchArea.className='gce-data-block';branchArea.id='org-branches';out.append(branchArea);
 renderBranches(name);
 const allSources=document.createElement('div');allSources.id='org-complete-sources';out.append(allSources);
 window.GCEOrgSources?.render(name,selectGroup('org'));
 const url=new URL(location.href);url.searchParams.set('org',name);
 if(/^#(?:equity-data|public-|related-public-resources)/.test(url.hash))url.hash='department-data';
 history.replaceState(null,'',url.pathname+url.search+url.hash);
}
function publicTables(){
 const m=D.model;let out='';
 // Public service-wide historical workforce representation and selected equity group.
 const current=selectGroup('public'),rep=m.rep.filter(r=>r.row_type==='representation').sort((a,b)=>Number(a.period_or_benchmark.slice(-4))-Number(b.period_or_benchmark.slice(-4)));
 const latest=rep[rep.length-1],repCols={w:['women_number','women_pct'],i:['indigenous_peoples_number','indigenous_peoples_pct'],d:['persons_with_disabilities_number','persons_with_disabilities_pct'],v:['members_of_visible_minorities_number','members_of_visible_minorities_pct']};
 const field=repCols[current];
 let repRows=[],repHead=[];
 if(current==='all'){
  repHead=[L('Employee group','Groupe d’employés'),L('Employees, 2025','Employés en 2025'),L('Workforce share, 2025 (%)','Part de l’effectif en 2025 (%)')];
  repRows=[['w',L('Women','Femmes')],['i',L('Indigenous employees','Employés autochtones')],['d',L('Employees with disabilities','Employés en situation de handicap')],['v',L('Racialized employees','Employés racisés')]].map(([k,label])=>[label,N(latest[repCols[k][0]]),P(latest[repCols[k][1]])]);
  const black=m.SUBG.v.rows.find(x=>x.name==='Black');if(black)repRows.push([L('Black employees (racialized subgroup)','Employés noirs (sous-groupe racisé)'),N(black.n),P(black.p)]);
 }else if(field){
  repHead=[L('Year','Année'),L('Total employees','Effectif total'),L('Group employees','Employés du groupe'),L('Group share (%)','Part du groupe (%)')];
  repRows=rep.map(r=>[r.period_or_benchmark,N(r.all_employees_number),N(r[field[0]]),P(r[field[1]])]);
 }else if(current==='b'){
  const black=m.SUBG.v.rows.find(x=>x.name==='Black');
  repHead=[L('Year','Année'),L('Employees in group','Employés du groupe'),L('Share of workforce (%)','Part de l’effectif (%)')];
  if(black)repRows=[['2025',N(black.n),P(black.p)]];
 }
 if(repRows.length)out+=sCard('public-representation',L('Workforce representation, 2025 and historical series','Représentation au sein de l’effectif, en 2025 et au fil du temps'),
  L('Treasury Board representation data for the core public administration. Other respondent groups do not necessarily have a corresponding published workforce series. Groups overlap.','Données du Conseil du Trésor sur la représentation dans l’administration publique centrale. Les autres groupes de répondants n’ont pas nécessairement de série correspondante sur l’effectif. Les groupes se chevauchent.'),
  table(L('Published workforce representation','Représentation publiée au sein de l’effectif'),repHead,repRows,'public-workforce-representation'),
  L('Treasury Board Secretariat annual equity statistics','Statistiques annuelles sur l’équité du Conseil du Trésor'),source.tbs);
 // 1998–2025 long historical series not represented by the annual file.
 const historical=m.HIST;
 const historicalKeys=current==='all'?['w','i','d','v']:['w','i','d','v'].includes(current)?[current]:[];
 if(historicalKeys.length)out+=sCard('public-history',L('Long-term workforce representation, 1998–2025','Représentation à long terme au sein de l’effectif, 1998-2025'),
  L('A selected set of historical years. These are workforce representation percentages, not an annual series for every year. The reporting population and definitions have evolved.','Un ensemble d’années historiques sélectionnées. Il s’agit de pourcentages de représentation au sein de l’effectif, et non d’une série annuelle complète. La population et les définitions ont évolué.'),
  table(L('Representation across selected historical years','Représentation selon les années historiques choisies'),
  [L('Year','Année'),...historicalKeys.map(k=>groupWord(k)+' (%)')],
  historical.years.map((y,i)=>[String(y),...historicalKeys.map(k=>P(historical[k]?.[i]))]),'public-historical-representation'),
  L('Treasury Board employment equity historical tables','Tableaux historiques de l’équité du Conseil du Trésor'),source.tbs);
 // EX representation at level; source does not report a full subgroup series for every group.
 const ex=m.executives.filter(r=>r.as_of_march_31==='2025'&&/^EX \d\d|^Overall EX/.test(r.level));
 const exKeys={w:'women_pct',i:'indigenous_peoples_pct',d:'persons_with_disabilities_pct',v:'members_of_visible_minorities_pct'};
 if(current==='all'||exKeys[current]||current==='b'){
  const col=current==='all'?['w','i','d','v']:[current];
  out+=sCard('public-executives',L('Executive representation by classification, 2025','Représentation des cadres selon la classification, 2025'),
   L('Shares are the published proportion of each executive group at that classification level. The executive workforce availability estimate is distinct from representation.','Les parts représentent la proportion publiée du groupe à chaque niveau de direction. La disponibilité de la main-d’œuvre des cadres se distingue de la représentation.'),
   table(L('Executive representation at March 31, 2025','Représentation des cadres au 31 mars 2025'),
   [L('Executive level','Niveau de direction'),L('Executive employees','Effectif de direction'),...col.map(k=>groupWord(k)+' (%)')],
   ex.filter(r=>/^EX \d\d/.test(r.level)).map((r,i)=>[r.level,N(r.executive_employees),...col.map(k=>k==='b'?P(m.EXLEV.black?.[i]):P(r[exKeys[k]]))]),'public-executive-levels'),
   L('Treasury Board, executive representation','Conseil du Trésor, représentation des cadres'),source.tbs);
 }
 // Group-specific workforce subgroups, deliberately not stacked on the overview.
 const sg=current==='b'?'v':current;
 if(['i','v','d','w'].includes(sg)){
  const item=m.SUBG[sg],rows=(item?.rows||[]).filter(x=>current!=='b'||x.name==='Black').map(x=>[x.name,x.n===null?missing():N(x.n),P(x.p),x.ex===null?missing():P(x.ex)]);
  if(rows.length)out+=sCard('public-subgroups',L('Selected group and published subgroups, 2025','Groupe choisi et sous-groupes publiés, 2025'),
   L('Subgroup counts and percentages are reported as published. Subgroup data may be incomplete or suppressed, and are not necessarily additive.','Les nombres et pourcentages des sous-groupes sont reproduits tels que publiés. Les données peuvent être incomplètes ou supprimées et ne sont pas nécessairement additionnables.'),
   table(L('Subgroup representation, 2025','Représentation des sous-groupes, 2025'),
   [L('Subgroup','Sous-groupe'),L('Employees','Employés'),sg==='w'?L('Share of women (%)','Part des femmes (%)'):L('Share of workforce (%)','Part de l’effectif (%)'),L('Executive representation (%)','Représentation des cadres (%)')],rows,'public-subgroup-representation'),
   L('Treasury Board Secretariat subgroup statistics','Statistiques sur les sous-groupes du Conseil du Trésor'),source.tbs);
 }
 // Official published 2024–25 workforce lifecycle shares.
 if(current==='all'||['w','i','d','v','b'].includes(current)){
  const k=current==='all'?['w','i','d','v','b']:[current],f=m.FLOW25;
  out+=sCard('public-workforce-flow',L('Hiring, promotions and separations, 2024–25','Embauches, promotions et départs, 2024-2025'),
   L('Each percentage is the group’s share of the employees at that stage (workforce, hires, promotions or separations); the denominators differ. These are not individual promotion or separation rates.','Chaque pourcentage représente la part du groupe dans une population différente (effectif, embauches, promotions ou départs). Il ne s’agit pas de taux individuels de promotion ou de départ.'),
   table(L('Published employment cycle by equity group, 2024–25','Cycle de l’emploi publié selon le groupe, 2024-2025'),
   [L('Group','Groupe'),L('Workforce share (%)','Part de l’effectif (%)'),L('Share of hires (%)','Part des embauches (%)'),L('Share of promotions (%)','Part des promotions (%)'),L('Share of separations (%)','Part des départs (%)')],
   k.map(g=>[groupWord(g),P(f[g]?.rep),P(f[g]?.h),P(f[g]?.p),P(f[g]?.s)]),'public-workforce-flow'),
   L('Treasury Board 2024–25 Employment Equity demographic snapshot','Aperçu démographique de l’équité en matière d’emploi 2024-2025'),source.tbs);
 }
 // Public Service Employee Survey: group-specific responses with overall comparison.
 const sgKey=surveyGroup(current),qs=Object.keys(m.PSES_QMETA),qmeta=m.PSES_QMETA,by=m.EEG_DEPT['Public Service']||{},all=m.PSES_DEPT['Public Service']||{};
 const questionName=q=>q+' · '+(lang()?m.EEG_QMETA_FR[q]||qmeta[q]?.[1]:qmeta[q]?.[1]||q);
 out+=sCard('public-survey',L('2024 employee experiences by respondent group','Expérience des employés en 2024, selon le groupe de répondants'),
 L('Percentages refer to respondents who gave the stated response. Harassment and discrimination are adverse outcomes; higher percentages for these questions are not better. Respondent groups may overlap.','Les pourcentages portent sur les répondants ayant donné la réponse indiquée. Le harcèlement et la discrimination sont des expériences négatives; un pourcentage plus élevé n’est pas préférable. Les groupes peuvent se chevaucher.'),
 table(L('Public service survey responses, 2024','Réponses au sondage dans la fonction publique, 2024'),
 [L('Question and response','Question et réponse'),L('All respondents (%)','Tous les répondants (%)'),...(sgKey!=='all'?[groupWord(current)+' (%)']:[])],
 qs.map(q=>[questionName(q),P(all[q]),...(sgKey!=='all'?[P(by[sgKey]?.[q])]:[])]),'public-survey-2024'),
 L('2024 Public Service Employee Survey','Sondage auprès des fonctionnaires fédéraux de 2024'),source.pses);
 const yoy=m.YOY['Public Service']||{};
 out+=sCard('public-survey-change',L('Change in survey results, 2022 to 2024','Évolution des résultats du sondage, 2022 à 2024'),
 L('Comparisons are for all public service respondents, not broken down by the selected group. A positive numerical change is not necessarily a favourable outcome.','Ces comparaisons portent sur tous les répondants de la fonction publique, sans ventilation par le groupe choisi. Une augmentation numérique n’est pas nécessairement un résultat favorable.'),
 table(L('Public service survey changes','Évolution des réponses dans la fonction publique'),
 [L('Question and response','Question et réponse'),L('2022 (%)','2022 (%)'),L('2024 (%)','2024 (%)'),L('Change (percentage points)','Variation (points de pourcentage)')],
 Object.keys(yoy).map(q=>[questionName(q),P(yoy[q].a),P(yoy[q].b),N(yoy[q].b-yoy[q].a)]),'public-survey-change'),
 L('Public Service Employee Survey','Sondage auprès des fonctionnaires fédéraux'),source.pses);
 // 2025 staffing survey: respondent group with aggregate benchmark.
 const staff=D.snps.orgs['Federal Public Service']||D.snps.orgs['Public Service']||findEntry(D.snps.orgs,'Federal Public Service'),questions=D.snps.questions;
 if(staff)out+=sCard('public-staffing-survey',L('2025 staffing experiences by employee group','Expérience de la dotation en 2025 selon le groupe'),
 L('Questions use different respondent populations; some apply only to people involved in staffing. Missing values are not zero.','Les questions concernent des populations de répondants différentes; certaines visent seulement les personnes ayant participé à la dotation. Les valeurs manquantes ne valent pas zéro.'),
 table(L('2025 Staffing and Non-Partisanship Survey','Sondage sur la dotation et l’impartialité politique de 2025'),
 [L('Question and measured response','Question et réponse mesurée'),L('All respondents (%)','Tous les répondants (%)'),...(sgKey!=='all'?[groupWord(current)+' (%)']:[])],
 Object.keys(questions).map(id=>[id+' · '+L(questions[id].en,questions[id].fr),P(staff.all?.[id]),...(sgKey!=='all'?[P(staff[sgKey]?.[id])]:[])]),'public-staffing-2025'),
 L('Public Service Commission, 2025 survey','Commission de la fonction publique, sondage de 2025'),D.snps.dataset);
 // Public Service Commission employment equity funnel, 2013–2023; don't mix with 2024–25 annual TBS flow.
 const ps=D.psc,years=Object.keys(ps.appointments).filter(y=>ps.applicants[y]).sort();
 const eeKeys=['w','i','d','v'],picked=eeKeys.includes(current)?[current]:current==='all'?eeKeys:[];
 if(picked.length){
  const head=current==='all'?[L('Employee group','Groupe d’employés'),L('Applicant share (%)','Part des candidatures (%)'),L('Appointee share (%)','Part des nominations (%)')]:
   [L('Fiscal year','Exercice'),L('Applicant share (%)','Part des candidatures (%)'),L('Appointee share (%)','Part des nominations (%)')];
  const rows=current==='all'?picked.map(k=>[groupWord(k),P(ps.applicants[years[years.length-1]]?.[k]),P(ps.appointments[years[years.length-1]]?.[k])]):
   years.map(y=>[y,P(ps.applicants[y]?.[current]),P(ps.appointments[y]?.[current])]);
  out+=sCard('public-applicants',L('Applicants and appointments by employment equity group','Candidatures et nominations selon le groupe visé par l’équité'),
   L('These are separate percentage shares among applicants and appointees to processes covered by Public Service Commission data; they are not applicant success rates. The latest year in this series is 2022–23.','Ces parts portent sur deux populations distinctes, les candidatures et les nominations selon les données de la Commission de la fonction publique; il ne s’agit pas de taux de réussite individuels. La dernière année de cette série est 2022-2023.'),
   table(L('Public Service Commission applicant and appointment shares','Parts des candidatures et des nominations selon la Commission de la fonction publique'),head,rows,'public-psc-applicants-appointments'),
   L('Public Service Commission staffing open data','Données ouvertes de la Commission de la fonction publique'),source.psc);
  const students=ps.students,yearsStudents=Object.keys(students.hires).filter(y=>students.applicants[y]).sort();
  const srows=current==='all'?picked.map(k=>[groupWord(k),P(students.applicants[yearsStudents.at(-1)]?.[k]),P(students.hires[yearsStudents.at(-1)]?.[k])]):
   yearsStudents.map(y=>[y,P(students.applicants[y]?.[current]),P(students.hires[y]?.[current])]);
  out+=sCard('public-students',L('Student applicants and student hires','Candidatures et embauches d’étudiants'),
   L('Shares among student applicants and student hires, not numbers of students. These denominators differ.','Parts parmi les étudiants qui présentent leur candidature et les étudiants embauchés, et non nombres d’étudiants. Les dénominateurs sont différents.'),
   table(L('Student recruitment by group','Recrutement étudiant selon le groupe'),
   current==='all'?[L('Employee group','Groupe d’employés'),L('Student applicant share (%)','Part des candidatures étudiantes (%)'),L('Student hire share (%)','Part des embauches étudiantes (%)')]:
   [L('Fiscal year','Exercice'),L('Student applicant share (%)','Part des candidatures étudiantes (%)'),L('Student hire share (%)','Part des embauches étudiantes (%)')],srows,'public-student-hiring'),
   L('Public Service Commission student staffing data','Données de la Commission de la fonction publique sur la dotation étudiante'),source.psc);
 }
 // Regional appointment share by equity group, latest published year in this source.
 const regions=ps.by_region,regYear=Object.keys(regions||{}).sort().at(-1);
 if(regYear&&picked.length){
  const reg=regions[regYear],cols=current==='all'?picked:[current];
  out+=sCard('public-regions',L('Equity-group appointment shares by region','Parts des nominations selon le groupe visé par l’équité et la région'),
   L('The percentage is the equity group’s share among appointments in the named region in the stated year. Different regions can have different numbers of appointments.','Le pourcentage représente la part des nominations du groupe dans la région indiquée et pour l’année indiquée. Les volumes de nominations varient selon la région.'),
   table(L('Regional appointment shares, ','Parts des nominations par région, ')+regYear,
   [L('Region','Région'),...cols.map(k=>groupWord(k)+' (%)')],Object.keys(reg).sort().map(region=>[region,...cols.map(k=>P(reg[region]?.[k]))]),'public-regional-appointments'),
   L('Public Service Commission staffing data','Données sur la dotation de la Commission de la fonction publique'),source.psc);
 }
 // By sex of appointees, 2022–23; not interchangeable with workforce gender statistics.
 const sexYear=Object.keys(ps.by_sex||{}).sort().at(-1),sex=ps.by_sex?.[sexYear]||{};
 if(sexYear&&(current==='all'||['i','v','d'].includes(current))){
  const keys=current==='all'?['i','d','v']:[current];
  out+=sCard('public-appointment-sex',L('Appointments within equity groups by sex','Nominations au sein des groupes visés par l’équité selon le sexe'),
   L('Women’s and men’s percentages within each listed equity group of appointees; these figures are not the sex distribution of the entire public service.','Pourcentages de femmes et d’hommes parmi les personnes nommées au sein de chaque groupe indiqué; ils ne représentent pas la répartition par sexe de l’ensemble de la fonction publique.'),
   table(L('Appointments by sex and group, ','Nominations selon le sexe et le groupe, ')+sexYear,
   [L('Equity group','Groupe visé par l’équité'),L('Women (%)','Femmes (%)'),L('Men (%)','Hommes (%)')],
   keys.map(k=>[groupWord(k),P(sex[k]?.women),P(sex[k]?.men)]),'public-appointments-by-sex'),
   L('Public Service Commission, staffing data','Commission de la fonction publique, données sur la dotation'),source.psc);
 }
 // Treasury Board 2025 published salary brackets; percentages are within each group.
 const salChoices={i:'Indigenous Peoples',d:'Persons with disabilities',v:'Racialized (visible minority)',b:'Black'};
 const salaryBands=['Under $50,000','$50,000–$74,999','$75,000–$99,999','$100,000 or more'];
 const salRows=m.SGSAL.filter(r=>current==='all'?['All employees','Indigenous Peoples','Persons with disabilities','Racialized (visible minority)','Black'].includes(r[0]):r[0]==='All employees'||r[0]===salChoices[current]);
 if(salChoices[current]||current==='all'){
  out+=sCard('public-salary-bands',L('Published salary distribution by employee group, 2025','Répartition salariale publiée selon le groupe, 2025'),
   L('Each cell is the percentage of employees in that group whose salary falls in the stated band. The bands describe groups; they do not compare equal jobs or establish pay discrimination.','Chaque cellule indique le pourcentage des employés du groupe dont le salaire se situe dans la tranche indiquée. Ces données ne comparent pas les emplois équivalents et n’établissent pas l’existence de discrimination salariale.'),
   table(L('Salary bands by equity group, March 31, 2025','Tranches salariales selon le groupe visé par l’équité, 31 mars 2025'),
   [L('Employee group','Groupe d’employés'),...salaryBands.map((x,i)=>lang()?['Moins de 50 000 $','50 000 $ à 74 999 $','75 000 $ à 99 999 $','100 000 $ ou plus'][i]+' (%)':x+' (%)')],
   salRows.map(r=>[r[0],...r.slice(1).map(P)]),'public-salary-bands'),
   L('Treasury Board 2024–25 demographic snapshot, salary bands','Conseil du Trésor, aperçu démographique de 2024-2025, tranches salariales'),source.tbs);
 }
 // The following dataset is an independent derived analysis and NOT the TBS salary series.
 const medianField={i:'Indigenous Employees',d:'Employees with Disabilities',v:'Visible Minority Employees',b:'Black Employees'};
 const salary=D.salary.slice().sort((a,b)=>Number(b.Year)-Number(a.Year)),fieldMedian=medianField[current];
 if(current==='all'||fieldMedian){
  const head=current==='all'?[L('Employee group','Groupe d’employés'),L('Derived median salary in 2025 ($)','Salaire médian dérivé en 2025 ($)')]:
   [L('Year','Année'),L('All employees ($)','Tous les employés ($)'),groupWord(current)+' ($)'];
  const row=current==='all'?[
   [L('All employees','Tous les employés'),N(salary[0]?.['All Employees'])],
   ...[['b','Black Employees'],['v','Visible Minority Employees'],['i','Indigenous Employees'],['d','Employees with Disabilities']].map(([k,field])=>[groupWord(k),N(salary[0]?.[field])])
  ]:salary.map(r=>[r.Year,N(r['All Employees']),N(r[fieldMedian])]);
  out+=sCard('public-pay',L('Median salary analysis, 2017–2025 (derived estimates)','Analyse des salaires médians, 2017-2025 (estimations dérivées)'),
   L('These are calculations from a separate analytical project, not a Treasury Board official salary table. Do not treat derived figures as published official workforce salaries.','Il s’agit de calculs d’un projet analytique distinct, et non d’un tableau salarial officiel du Conseil du Trésor. Ne considérez pas ces données dérivées comme des salaires officiels publiés.'),
   table(L('Derived median salary estimates','Estimations dérivées du salaire médian'),head,row,'public-derived-median-salary'),
   L('Source file: independent derived salary data','Fichier source : données salariales dérivées indépendantes'),'data/october-2026/DI_medians_salary_by_group_2017-2025.csv');
 }
 const idxField={i:'di_indigenous',d:'di_pwd',v:'di_vm',b:'di_black'},band=D.di.filter(r=>r.year_di==='2025');
 if(current==='all'||idxField[current]){
  const keys=current==='all'?['b','v','i','d']:[current];
  out+=sCard('public-pay-index',L('Independent salary disproportionality index, 2025','Indice indépendant de disproportion salariale, 2025'),
   L('An index of 1 is equal to the project’s workforce reference concentration in that salary band. It is a derived screening indicator, not a finding of discrimination or an official Treasury Board index.','Un indice de 1 correspond à la concentration de référence de l’effectif dans cette tranche. Il s’agit d’un indicateur dérivé de dépistage et non d’une conclusion de discrimination ou d’un indice officiel du Conseil du Trésor.'),
   table(L('Salary distribution index by band and group','Indice de répartition salariale selon la tranche et le groupe'),
   [L('Salary band','Tranche salariale'),L('All employees (index)','Tous les employés (indice)'),...keys.map(k=>groupWord(k)+' ('+L('index','indice')+')')],
   band.map(r=>[r.quintile,N(r.di_all),...keys.map(k=>N(r[idxField[k]]))]),'public-derived-pay-index'),
   L('Independent derived index file','Fichier de l’indice dérivé indépendant'),'data/october-2026/DI_di_disproportionality_index_2017-2025.csv');
 }
 if(current==='all')out+=publicTenureTable();
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
 // The full dataset catalogue is filtered and paginated, never rendered as one giant list.
 out+='<section class="gce-data-block" id="public-source-inventory"></section>';
 $('public-output').innerHTML=out;
 renderSourceCatalogue();
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
root.addEventListener('click',e=>{
 const a=e.target.closest('a[href^="#"]');if(!a||!selected)return;
 const href=a.getAttribute('href');
 if(/^#(?:equity-data|public-|related-public-resources)/.test(href)){
  const picker=$('org-picker');if(picker){picker.value='';renderOrg();}
 }
});
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