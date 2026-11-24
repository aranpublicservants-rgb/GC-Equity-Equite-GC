/* Where the data agree: patterns across published sources, and survey gaps over time.
   Reads data/where-data-agree.json, built by scripts/build-where-data-agree.py. Every figure on the page comes from that file.
   French strings are written with ordinary spaces; frt() adds the non-breaking spaces of French typography. */
(function(){
'use strict';
const NB=' ';
const $=id=>document.getElementById(id);
const fr=()=>document.documentElement.lang.toLowerCase().startsWith('fr');
const frt=s=>String(s).replace(/(\d) (?=\d{3}(?!\d))/g,'$1'+NB).replace(/ ([:;?!%»])/g,NB+'$1').replace(/« /g,'«'+NB);
const tr=(en,f)=>fr()?frt(f):en;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const int=v=>Number(v).toLocaleString(fr()?'fr-CA':'en-CA');
const pct=v=>has(v)?int(v)+(fr()?NB+'%':'%'):tr('Not published','Non publié');
const signed=v=>has(v)?(v>0?'+':v<0?'−':'')+int(Math.abs(v)):'';
const local=p=>{const u=new URL(p,location.href);if(fr())u.searchParams.set('lang','fr');else u.searchParams.delete('lang');return u.pathname.split('/').pop()+u.search+u.hash;};

const TEXT={
 eyebrow:['Equity across the public service','Équité dans l’ensemble de la fonction publique'],
 title:['Where the data agree','Là où les données concordent'],
 lede:['Government sources measure equity in different ways: who works where, what employees say in two separate surveys, and who gets hired. This page puts them side by side for every federal organization to find patterns that no single source shows. A pattern tells you where to look first. It does not prove discrimination, and it does not tell you what happened to any one person.',
  'Les sources gouvernementales mesurent l’équité de différentes façons : qui travaille où, ce que disent les employés dans deux sondages distincts, et qui est embauché. Cette page les place côte à côte pour chaque organisation fédérale afin de repérer des tendances qu’aucune source ne montre à elle seule. Une tendance indique où regarder en premier. Elle ne prouve pas la discrimination et ne dit pas ce qui est arrivé à une personne en particulier.'],
 meta:['Sources: Treasury Board workforce data to March 31, 2025; Public Service Employee Survey, 2019 to 2024; Staffing and Non-Partisanship Survey, 2025; Public Service Commission staffing data. The comparisons are calculated by this site from the published figures. They are not Government of Canada statistics.',
  'Sources : données du Conseil du Trésor sur l’effectif jusqu’au 31 mars 2025; Sondage auprès des fonctionnaires fédéraux, de 2019 à 2024; Sondage sur la dotation et l’impartialité politique de 2025; données de dotation de la Commission de la fonction publique. Les comparaisons sont calculées par ce site à partir des chiffres publiés. Il ne s’agit pas de statistiques du gouvernement du Canada.'],
 jumpStart:['Start here','Pour commencer'],
 jumpStaffing:['Staffing fairness since 2021','L’équité en dotation depuis 2021'],
 staffingTitle:['Has staffing fairness changed since 2021?','L’équité en dotation a-t-elle changé depuis 2021?'],
 staffingIntro:['The Public Service Commission asked employees in 2021 and again in 2025 whether staffing in their work unit is fair and open. Choose a group and a question to see each organization’s result in both years. The 2021 survey has no question matching the 2025 question on bias or barriers, so these two matched questions are the closest comparison.','La Commission de la fonction publique a demandé aux employés, en 2021 puis en 2025, si la dotation dans leur unité de travail est équitable et transparente. Choisissez un groupe et une question pour voir le résultat de chaque organisation pour les deux années. Le sondage de 2021 ne comporte aucune question correspondant à celle de 2025 sur les préjugés ou les obstacles; ces deux questions appariées sont donc la comparaison la plus proche.'],
 sgroupLabel:['Employee group','Groupe d’employés'], sqLabel:['Question','Question'],
 startTitle:['Start here','Pour commencer'],
 startIntro:['Pick the group you want to look at, then pick a question. Each question takes you to the table that answers it, already set to that group.','Choisissez le groupe qui vous intéresse, puis une question. Chaque question vous mène au tableau qui y répond, déjà réglé sur ce groupe.'],
 startGroup:['Employee group','Groupe d’employés'],
 jumpFindings:['What stands out','Ce qui ressort'], jumpAgree:['Where both surveys agree','Là où les deux sondages concordent'],
 jumpGaps:['Is the gap growing?','L’écart se creuse-t-il?'], jumpLinks:['Every link we checked','Tous les liens vérifiés'],
 jumpMethod:['How to read this page','Comment lire cette page'], jumpSources:['Sources and data files','Sources et fichiers de données'],
 statsLabel:['Summary','Résumé'], loading:['Loading the data…','Chargement des données…'],
 findingsTitle:['What stands out','Ce qui ressort'],
 findingsIntro:['These patterns come from comparing results across federal organizations. Each one says how many organizations it covers, how strong it is and whether it could be chance.',
  'Ces tendances viennent de la comparaison des résultats entre les organisations fédérales. Chacune indique combien d’organisations elle couvre, sa force et si elle pourrait être due au hasard.'],
 agreeTitle:['Where both surveys point to the same organizations','Là où les deux sondages désignent les mêmes organisations'],
 agreeIntro:['Choose a group. The table lists the organizations in the top third on two results for that group: the share who said they had been discriminated against at work in the past 12 months (2024 Public Service Employee Survey), and the share who said they faced bias or barriers in a staffing process they took part in (2025 Staffing and Non-Partisanship Survey). The change in the group’s representation from 2023 to 2025 is shown where Treasury Board publishes it.',
  'Choisissez un groupe. Le tableau présente les organisations qui se classent dans le tiers supérieur pour deux résultats de ce groupe : la part des personnes qui ont dit avoir été victimes de discrimination au travail au cours des 12 derniers mois (Sondage auprès des fonctionnaires fédéraux de 2024), et la part de celles qui ont dit avoir fait face à des préjugés ou à des obstacles dans un processus de dotation auquel elles ont participé (Sondage sur la dotation et l’impartialité politique de 2025). La variation de la représentation du groupe de 2023 à 2025 figure lorsque le Conseil du Trésor la publie.'],
 groupLabel:['Employee group','Groupe d’employés'], questionLabel:['Survey question','Question du sondage'], showLabel:['Show','Afficher'], aboutLabel:['Results about','Résultats sur'],
 download:['Download this table (CSV)','Télécharger ce tableau (CSV)'], downloadAll:['Download every link with its numbers (CSV)','Télécharger tous les liens avec leurs chiffres (CSV)'],
 gapsTitle:['Is the gap growing?','L’écart se creuse-t-il?'],
 gapsIntro:['A gap is how many percentage points worse a group’s result is than the result of a comparison group in the same organization. A positive gap means the group is worse off. Choose a group and a question to see where the gap grew, shrank or stayed about the same.',
  'L’écart correspond au nombre de points de pourcentage dont le résultat d’un groupe est moins favorable que celui d’un groupe de comparaison de la même organisation. Un écart positif signifie que le groupe est désavantagé. Choisissez un groupe et une question pour voir où l’écart s’est creusé, s’est réduit ou est resté à peu près le même.'],
 linksTitle:['Every link we checked','Tous les liens vérifiés'],
 linksIntro:['Every pair of results that come from two different sources, compared across organizations. Choose a group to see the results about that group, or show every link, including the ones that could be chance.',
  'Chaque paire de résultats provenant de deux sources différentes, comparée d’une organisation à l’autre. Choisissez un groupe pour voir les résultats qui le concernent, ou affichez tous les liens, y compris ceux qui pourraient être dus au hasard.'],
 methodTitle:['How to read this page','Comment lire cette page'], sourcesTitle:['Sources and data files','Sources et fichiers de données'],
};
const GROUP={
 black:{t:['Black employees','Employés noirs'],s:['Black employees','employés noirs'],c:['non-racialized employees','employés non racisés']},
 rac:{t:['Racialized employees','Employés racisés'],s:['racialized employees','employés racisés'],c:['non-racialized employees','employés non racisés']},
 ind:{t:['Indigenous employees','Employés autochtones'],s:['Indigenous employees','employés autochtones'],c:['non-Indigenous employees','employés non autochtones']},
 pwd:{t:['Persons with disabilities','Personnes en situation de handicap'],s:['persons with disabilities','personnes en situation de handicap'],c:['persons without disabilities','personnes sans handicap']},
 woman:{t:['Women','Femmes'],s:['women','femmes'],c:['men','hommes']},
 nonrac:{t:['Non-racialized employees','Employés non racisés'],s:['non-racialized employees','employés non racisés']},
 all:{t:['All employees','Tous les employés'],s:['all employees','tous les employés']},
};
const G=(k,form='t')=>tr(GROUP[k][form][0],GROUP[k][form][1]);
const QSHORT={
 Q65:['Were discriminated against at work in the past 12 months','Ont été victimes de discrimination au travail au cours des 12 derniers mois'],
 Q58:['Were harassed at work in the past 12 months','Ont été victimes de harcèlement au travail au cours des 12 derniers mois'],
 Q53:['My department or agency treats me with respect','Mon ministère ou organisme me traite avec respect'],
 Q12:['I feel valued at work','Je me sens valorisé(e) au travail'],
 Q45:['I have opportunities for promotion','J’ai des possibilités de promotion'],
 Q43:['My department or agency supports career development','Mon ministère ou organisme soutient le perfectionnement professionnel'],
 Q42:['I can start a formal recourse process without fear of reprisal','Je peux amorcer un processus de recours officiel sans crainte de représailles'],
 Q47:['My department or agency respects individual differences','Mon ministère ou organisme respecte les différences individuelles'],
 Q63:['Satisfied with how harassment matters are resolved','Satisfaits du règlement des questions de harcèlement'],
 Q70:['Satisfied with how discrimination matters are resolved','Satisfaits du règlement des questions de discrimination'],
 Q81:['My workplace is psychologically healthy','Mon milieu de travail est sain sur le plan psychologique'],
};
const STRENGTH={none:['very weak','très faible'],weak:['weak','faible'],moderate:['moderate','modéré'],strong:['strong','fort']};
const strengthOf=r=>{const a=Math.abs(r);return a<0.15?'none':a<0.3?'weak':a<0.5?'moderate':'strong';};
const S=r=>tr(STRENGTH[strengthOf(r)][0],STRENGTH[strengthOf(r)][1]);
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const chanceSentence=p=>p<0.05?tr('unlikely to be chance','peu susceptible d’être dû au hasard'):tr('could be chance','pourrait être dû au hasard');
const chanceCell=p=>p<0.05?tr('Unlikely','Peu probable'):tr('Yes','Oui');
const LABEL={grew:['Gap grew','L’écart s’est creusé'],shrank:['Gap shrank','L’écart s’est réduit'],same:['About the same','À peu près pareil'],unsure:['Changed, but too few answers to be sure','A changé, mais trop peu de réponses pour en être sûr']};
const SRCNAME={tbs:['Treasury Board workforce data','Données du Conseil du Trésor sur l’effectif'],pses:['Public Service Employee Survey','Sondage auprès des fonctionnaires fédéraux'],snps:['2025 Staffing and Non-Partisanship Survey','Sondage sur la dotation et l’impartialité politique de 2025'],psc:['Public Service Commission staffing data','Données de dotation de la Commission de la fonction publique']};
const LINKS={
 rep:['Treasury Board: representation and workforce availability','Conseil du Trésor : représentation et disponibilité au sein de la population active','https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/representation-public-service-canada-designated-group-fiscal-year-workforce-availability-estimates.html','https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/statistiques-ressources-humaines/statistiques-diversite-inclusion/representation-groupes-designes-fonction-publique-canada-exercice-estimations-disponibilite-sein-population-active.html'],
 pses:['Treasury Board: 2024 Public Service Employee Survey results','Conseil du Trésor : résultats du Sondage auprès des fonctionnaires fédéraux de 2024','https://www.canada.ca/en/treasury-board-secretariat/services/innovation/public-service-employee-survey/2024-25.html','https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/sondage-fonctionnaires-federaux/2024-25.html'],
 pses24:['Open Government: 2024 Public Service Employee Survey open dataset (main dataset and employment equity groups)','Gouvernement ouvert : ensemble de données ouvertes du Sondage auprès des fonctionnaires fédéraux de 2024 (ensemble principal et groupes visés par l’équité)','https://open.canada.ca/data/en/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f','https://ouvert.canada.ca/data/fr/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f'],
 pses22:['Open Government: 2022-2023 Public Service Employee Survey open dataset (employment equity groups)','Gouvernement ouvert : ensemble de données ouvertes du Sondage auprès des fonctionnaires fédéraux de 2022-2023 (groupes visés par l’équité)','https://open.canada.ca/data/en/dataset/9f9501f3-8188-4386-87ba-50730a979044','https://ouvert.canada.ca/data/fr/dataset/9f9501f3-8188-4386-87ba-50730a979044'],
 snps:['Public Service Commission: 2025 Staffing and Non-Partisanship Survey open data','Commission de la fonction publique : données ouvertes du Sondage sur la dotation et l’impartialité politique de 2025','https://open.canada.ca/data/en/dataset/8766bf91-d14c-423b-a5d1-ac47f5b4dd22','https://ouvert.canada.ca/data/fr/dataset/8766bf91-d14c-423b-a5d1-ac47f5b4dd22'],
 staffing:['This site: hiring and staffing data','Ce site : données sur l’embauche et la dotation','staffing.html',''],
 cta:['This site: Call to Action commitments and results','Ce site : engagements et résultats liés à l’appel à l’action','call-to-action.html',''],
 snps21:['Public Service Commission: 2021 Staffing and Non-Partisanship Survey open data','Commission de la fonction publique : données ouvertes du Sondage sur la dotation et l’impartialité politique de 2021','https://open.canada.ca/data/en/dataset/90705678-982e-49db-8f1b-13e93ede3a95','https://ouvert.canada.ca/data/fr/dataset/90705678-982e-49db-8f1b-13e93ede3a95'],
 tbsind:['This site’s copy of the Treasury Board table: Indigenous employees by First Nations, Métis and Inuit, by organization, 2025 (CSV)','Copie sur ce site du tableau du Conseil du Trésor : employés autochtones selon les Premières Nations, les Métis et les Inuits, par organisation, 2025 (CSV)','data/october-2026/TBS_Indigenous_subgroups_by_department_2025.csv',''],
 tbsdis:['This site’s copy of the Treasury Board table: persons with disabilities by type of disability, by organization, 2024 (CSV)','Copie sur ce site du tableau du Conseil du Trésor : personnes en situation de handicap selon le type d’incapacité, par organisation, 2024 (CSV)','data/october-2026/TBS_disability_subgroups_by_department_2024.csv',''],
 file:['This page’s data file, with every comparison (JSON)','Fichier de données de cette page, avec chaque comparaison (JSON)','data/where-data-agree.json',''],
 inputs:['The organization results it starts from (JSON)','Les résultats par organisation utilisés au départ (JSON)','data/call-to-action-comparisons.json',''],
 snpsfile:['2025 staffing survey results by organization and group (JSON)','Résultats du sondage de dotation de 2025 par organisation et par groupe (JSON)','data/snps-2025-by-organization.json',''],
 script:['The script that calculates every figure on this page','Le script qui calcule chaque chiffre de cette page','https://github.com/aranpublicservants-rgb/GC-Equity-Equite-GC/blob/main/scripts/build-where-data-agree.py',''],
};
const link=k=>{const s=LINKS[k],internal=!/^https?:/.test(s[2]);const href=internal?(/\.html/.test(s[2])?local(s[2]):s[2]):(fr()&&s[3]?s[3]:s[2]);return '<a href="'+esc(href)+'"'+(internal?'':' target="_blank" rel="noopener noreferrer"')+'>'+esc(tr(s[0],s[1]))+'</a>';};

let D=null;
const state={sg:'woman',sq:'STA_01E',ssort:'change',sdir:1,agree:'black',gg:'ind',gq:'Q65',show:'all',sort:'change',dir:-1,lg:'all',ls:'clear'};

function mlabel(k){const m=D.measures[k];return m?tr(m.en,m.fr):k;}
function orgName(k){const n=D.trends.names[k];return n?(fr()?n[0]:n[1]):k;}

/* ---------------- summary and findings ---------------- */
function trendOrgCount(){return Object.keys(D.trends.orgs).filter(k=>k!=='Public Service'&&Object.values(D.trends.orgs[k]).some(g=>Object.values(g).some(it=>it.y&&it.y['2024']))).length;}
function renderStats(){
 const s=D.scan;
 const items=[[int(s.tests),tr('pairs of results from different sources compared','paires de résultats de sources différentes comparées')],
  [int(s.p05),tr('showed a link. Chance alone would give about ','montraient un lien. Le hasard seul en donnerait environ ')+int(Math.round(s.chance05))],
  [int(s.clear),tr('links stand out even after allowing for chance','liens ressortent même en tenant compte du hasard')],
  [int(trendOrgCount()),tr('organizations followed over time in the employee survey','organisations suivies dans le temps dans le sondage auprès des fonctionnaires')]];
 $('wda-stats').innerHTML=items.map(([b,t])=>'<li><b>'+esc(b)+'</b>'+esc(t)+'</li>').join('');
}
function mini(head,rows,caption){
 return '<div class="wda-scroll" tabindex="0" role="region" aria-label="'+esc(caption)+'"><table class="wda-mini"><caption>'+esc(caption)+'</caption><thead><tr>'+head.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+
  rows.map(r=>'<tr><th scope="row">'+esc(r[0])+'</th>'+r.slice(1).map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function card(title,paras,table,why){
 return '<li class="wda-finding"><h3>'+esc(title)+'</h3>'+paras.map(p=>'<p>'+esc(p)+'</p>').join('')+(table||'')+(why?'<p class="wda-why">'+esc(why)+'</p>':'')+'</li>';
}
function listNames(arr){
 const n=arr.map(x=>fr()?x.fr:x.en);if(n.length<2)return n.join('');
 return n.slice(0,-1).join(', ')+tr(' and ',' et ')+n[n.length-1];
}
function renderFindings(){
 const out=[];
 // 1. Two surveys
 const sv=D.checks.surveys,b=sv.black,nr=sv.nonrac;
 if(b){
  const rows=['black','rac','ind','pwd','woman','nonrac'].filter(g=>sv[g]).map(g=>[G(g),int(sv[g].n),cap(S(sv[g].r)),chanceCell(sv[g].p)]);
  out.push(card(tr('Two separate surveys point to the same organizations','Deux sondages distincts désignent les mêmes organisations'),
   [tr('Where more Black employees said they had been discriminated against at work in the 2024 Public Service Employee Survey, more Black employees also said they faced bias or barriers in a staffing process in the 2025 Staffing and Non-Partisanship Survey. The link is '+S(b.r)+' across '+int(b.n)+' organizations and '+chanceSentence(b.p)+'.',
     'Là où davantage d’employés noirs ont dit avoir été victimes de discrimination au travail dans le Sondage auprès des fonctionnaires fédéraux de 2024, davantage d’employés noirs ont aussi dit avoir fait face à des préjugés ou à des obstacles dans un processus de dotation dans le Sondage sur la dotation et l’impartialité politique de 2025. Le lien est '+S(b.r)+' dans '+int(b.n)+' organisations et '+chanceSentence(b.p)+'.')],
   mini([tr('Group','Groupe'),tr('Organizations','Organisations'),tr('How strong','Force du lien'),tr('Could it be chance?','Hasard possible?')],rows,tr('Discrimination at work (2024) compared with bias or barriers in staffing (2025), for the same group','Discrimination au travail (2024) comparée aux préjugés ou obstacles en dotation (2025), pour le même groupe')),
   tr('Treasury Board and the Public Service Commission run these surveys separately, a year apart, and ask different questions. When both point to the same organizations, the result does not rest on one survey.'+(nr?' For non-racialized employees, the link is '+S(nr.r)+' and '+chanceSentence(nr.p)+'.':''),
      'Le Conseil du Trésor et la Commission de la fonction publique mènent ces sondages séparément, à un an d’intervalle, avec des questions différentes. Quand les deux désignent les mêmes organisations, le résultat ne repose pas sur un seul sondage.'+(nr?' Pour les employés non racisés, le lien est '+S(nr.r)+' et '+chanceSentence(nr.p)+'.':''))));
 }
 // 2. Indigenous representation and the workplace for everyone
 const ic=D.checks.indigenous,left=D.checks.indigenous_left_out;
 if(ic&&ic.Q58&&ic.Q58.all){
  const QI={Q58:['Were harassed','Ont été victimes de harcèlement'],Q65:['Were discriminated against','Ont été victimes de discrimination'],Q63:['Satisfied with how harassment is resolved','Satisfaits du règlement du harcèlement'],Q70:['Satisfied with how discrimination is resolved','Satisfaits du règlement de la discrimination']};
  const dir=r=>r>0?tr('higher','plus élevé'):tr('lower','plus bas');
  const rows=['Q58','Q65','Q63','Q70'].filter(q=>ic[q]&&ic[q].all).map(q=>{const a=ic[q].all,l=ic[q].left_out;return [tr(QI[q][0],QI[q][1]),dir(a.r),int(a.n),cap(S(a.r)),chanceCell(a.p),l?int(l.n):'',l?cap(S(l.r)):'',l?chanceCell(l.p):''];});
  const k=left.length;
  out.push(card(tr('Indigenous employees more often work where harassment and discrimination are higher for everyone','Les employés autochtones travaillent plus souvent là où le harcèlement et la discrimination sont plus élevés pour tout le monde'),
   [tr('In organizations where Indigenous employees make up a larger share of the workforce, non-Indigenous employees also report more harassment and discrimination, and are less satisfied with how both are resolved (2024 Public Service Employee Survey). The pattern still holds when these '+k+' organizations are left out: '+listNames(left)+'.',
     'Dans les organisations où les employés autochtones représentent une plus grande part de l’effectif, les employés non autochtones déclarent aussi davantage de harcèlement et de discrimination, et sont moins satisfaits de la façon dont ces situations sont réglées (Sondage auprès des fonctionnaires fédéraux de 2024). La tendance tient toujours quand ces '+k+' organisations sont exclues : '+listNames(left)+'.')],
   mini([tr('Result for non-Indigenous employees','Résultat des employés non autochtones'),tr('Where Indigenous representation is higher, this is','Là où la représentation autochtone est plus élevée, ce résultat est'),tr('Organizations','Organisations'),tr('How strong','Force du lien'),tr('Could it be chance?','Hasard possible?'),tr('Organizations, '+k+' left out','Organisations, '+k+' exclues'),tr('How strong','Force du lien'),tr('Could it be chance?','Hasard possible?')],rows,
    tr('Indigenous representation, March 31, 2025, compared with results for non-Indigenous employees, 2024','Représentation autochtone au 31 mars 2025, comparée aux résultats des employés non autochtones, 2024')),
   tr('Representation tables show where Indigenous employees work. They do not show the conditions in those workplaces. This pattern links the two.','Les tableaux de représentation montrent où travaillent les employés autochtones. Ils ne montrent pas les conditions dans ces milieux de travail. Cette tendance relie les deux.')));
 }
 // 3. Black employees' view of the Call to Action
 const bc=D.checks.black_cta;
 if(bc&&bc.black){
  const a=bc.black,n=bc.nonrac;
  out.push(card(tr('Black employees’ view of the Call to Action follows the change in Black representation','L’avis des employés noirs sur l’appel à l’action suit l’évolution de la représentation des employés noirs'),
   [tr('Where the share of Black employees grew more from 2021 to 2025, Black employees were more likely to say the Call to Action had a positive impact in their organization (2024 Public Service Employee Survey). The link is '+S(a.r)+' across '+int(a.n)+' organizations and '+chanceSentence(a.p)+'.'+(n?' For non-racialized employees in the same organizations, it is '+S(n.r)+' and '+chanceSentence(n.p)+'.':''),
     'Là où la part des employés noirs a le plus augmenté de 2021 à 2025, les employés noirs étaient plus nombreux à dire que l’appel à l’action avait eu un effet positif dans leur organisation (Sondage auprès des fonctionnaires fédéraux de 2024). Le lien est '+S(a.r)+' dans '+int(a.n)+' organisations et '+chanceSentence(a.p)+'.'+(n?' Pour les employés non racisés des mêmes organisations, il est '+S(n.r)+' et '+chanceSentence(n.p)+'.':''))],
   '',
   tr('Black employees’ answers followed the measured change more closely than the answers of non-racialized employees did.','Les réponses des employés noirs suivaient de plus près le changement mesuré que celles des employés non racisés.')));
 }
 // 4. Organizations on the list for most groups
 const groups=Object.keys(D.agree),count={},names={};
 groups.forEach(g=>D.agree[g].orgs.forEach(o=>{count[o.en]=(count[o.en]||0)+1;names[o.en]=o;}));
 const many=Object.keys(count).filter(k=>count[k]>=3).sort((x,y)=>count[y]-count[x]||x.localeCompare(y));
 if(many.length){
  const by={};many.forEach(k=>{(by[count[k]]=by[count[k]]||[]).push(names[k]);});
  const parts=Object.keys(by).map(Number).sort((x,y)=>y-x).map(c=>{const l=listNames(by[c]),pl=by[c].length>1;
   return c===groups.length?tr(l+(pl?' are':' is')+' in the top third on both surveys for all '+c+' groups in the table below.',l+(pl?' se classent':' se classe')+' dans le tiers supérieur des deux sondages pour les '+c+' groupes du tableau ci-dessous.')
    :tr(l+(pl?' are':' is')+' there for '+c+' groups.',l+(pl?' y figurent':' y figure')+' pour '+c+' groupes.');});
  out.push(card(tr('A few organizations are on the list for most groups','Quelques organisations figurent sur la liste pour la plupart des groupes'),[parts.join(' ')],'',
   tr('Being on the list means both surveys point to the organization for that group. It is a reason to look more closely at its staffing processes and its workplace.','Figurer sur la liste signifie que les deux sondages désignent l’organisation pour ce groupe. C’est une raison d’examiner de plus près ses processus de dotation et son milieu de travail.')));
 }
 // 5. Why the comparisons are worth reading
 const s=D.scan,ratio=(s.p05/s.chance05).toLocaleString(fr()?'fr-CA':'en-CA',{maximumFractionDigits:1});
 out.push(card(tr('Results from different sources agree more often than chance','Les résultats de sources différentes concordent plus souvent que le hasard ne le voudrait'),
  [tr('This site compared '+int(s.tests)+' pairs of results that come from two different sources. By chance alone, about '+int(Math.round(s.chance05))+' would look linked. '+int(s.p05)+' did, about '+ratio+' times as many. '+int(s.clear)+' links stand out even after allowing for chance.',
    'Ce site a comparé '+int(s.tests)+' paires de résultats provenant de deux sources différentes. Le hasard seul en ferait paraître environ '+int(Math.round(s.chance05))+' liées. Il y en a eu '+int(s.p05)+', soit environ '+ratio+' fois plus. '+int(s.clear)+' liens ressortent même en tenant compte du hasard.'),
   tr('The Call to Action page asks a different question: whether what organizations wrote in their letters and self-assessments goes with their results. There, '+int(s.cta_p05)+' of '+int(s.cta_tests)+' comparisons looked linked, close to the '+int(Math.round(s.cta_chance05))+' that chance alone would give.',
    'La page sur l’appel à l’action pose une autre question : ce que les organisations ont écrit dans leurs lettres et autoévaluations va-t-il de pair avec leurs résultats? Là, '+int(s.cta_p05)+' des '+int(s.cta_tests)+' comparaisons semblaient liées, près des '+int(Math.round(s.cta_chance05))+' que le hasard seul donnerait.')],'',
  tr('Measured results from different agencies line up with each other. What organizations wrote about their actions mostly does not line up with results.','Les résultats mesurés par différents organismes concordent entre eux. Ce que les organisations ont écrit sur leurs mesures concorde peu avec les résultats.')));
 $('wda-findings').innerHTML=out.join('');
}

/* ---------------- where both surveys agree ---------------- */
function fillSelect(el,opts,val){el.innerHTML=opts.map(([v,t])=>'<option value="'+esc(v)+'"'+(v===val?' selected':'')+'>'+esc(t)+'</option>').join('');}
function agreeRows(){const a=D.agree[state.agree];return a.orgs.map(o=>[fr()?o.fr:o.en,o.pses,o.pses_n,o.snps,o.rep_change,o.id]);}
function renderAgree(){
 fillSelect($('wda-agree-group'),Object.keys(D.agree).map(g=>[g,G(g)]),state.agree);
 const a=D.agree[state.agree],g=state.agree;
 $('wda-agree-status').textContent=tr(a.orgs.length+' of the '+a.orgs_with_both+' organizations with both results are in the top third on both. Top third: '+a.cut_pses+'% or more on the 2024 survey and '+a.cut_snps+'% or more on the 2025 survey.',
  a.orgs.length+' des '+a.orgs_with_both+' organisations qui ont les deux résultats se classent dans le tiers supérieur pour les deux. Tiers supérieur : '+a.cut_pses+' % ou plus au sondage de 2024 et '+a.cut_snps+' % ou plus au sondage de 2025.');
 $('wda-agree-caption').textContent=tr('Organizations in the top third on both surveys: '+G(g,'s'),'Organisations dans le tiers supérieur des deux sondages : '+G(g,'s'));
 const hasRep=g!=='woman';
 $('wda-agree-head').innerHTML='<tr><th scope="col">'+esc(tr('Organization','Organisation'))+'</th><th scope="col" class="num">'+esc(tr('Discriminated against at work, 2024 (%)','Victimes de discrimination au travail, 2024 (%)'))+'</th><th scope="col" class="num">'+esc(tr('People who answered, 2024','Personnes ayant répondu, 2024'))+'</th><th scope="col" class="num">'+esc(tr('Faced bias or barriers in staffing, 2025 (%)','Préjugés ou obstacles en dotation, 2025 (%)'))+'</th>'+(hasRep?'<th scope="col" class="num">'+esc(tr('Change in representation, 2023 to 2025 (points)','Variation de la représentation, de 2023 à 2025 (points)'))+'</th>':'')+'</tr>';
 $('wda-agree-body').innerHTML=agreeRows().map(r=>'<tr><th scope="row"><a href="'+esc(local('call-to-action.html?org='+encodeURIComponent(r[5])+'#record'))+'">'+esc(r[0])+'</a></th><td class="num">'+esc(pct(r[1]))+'</td><td class="num">'+esc(has(r[2])?int(r[2]):'')+'</td><td class="num">'+esc(pct(r[3]))+'</td>'+(hasRep?'<td class="num">'+(has(r[4])?esc(signed(Number(r[4].toFixed(1)))):'<span class="wda-na">'+esc(tr('Not published','Non publié'))+'</span>')+'</td>':'')+'</tr>').join('')||'<tr><td colspan="5">'+esc(tr('No organization is in the top third on both.','Aucune organisation ne se classe dans le tiers supérieur pour les deux.'))+'</td></tr>';
 $('wda-agree-note').textContent=tr('Survey results for small groups can change a lot from year to year, so read them with the number of people who answered the 2024 survey. The 2025 staffing survey does not publish the number of people who answered for each group, and its question was asked only of people who took part in an advertised staffing process.'+(hasRep?'':' Treasury Board does not publish representation of women in the departmental series used here.')+' Each organization name opens its Call to Action record.',
  'Les résultats des petits groupes peuvent beaucoup varier d’une année à l’autre; lisez-les avec le nombre de personnes ayant répondu au sondage de 2024. Le sondage de dotation de 2025 ne publie pas le nombre de répondants de chaque groupe, et sa question n’a été posée qu’aux personnes ayant participé à un processus de dotation annoncé.'+(hasRep?'':' Le Conseil du Trésor ne publie pas la représentation des femmes dans la série ministérielle utilisée ici.')+' Le nom de chaque organisation ouvre son dossier sur l’appel à l’action.');
}

/* ---------------- gaps over time ---------------- */
const TGROUPS=['ind','pwd','black','rac','woman'];
function gapItems(){
 const g=state.gg,q=state.gq,rows=[];
 Object.keys(D.trends.orgs).forEach(k=>{const it=((D.trends.orgs[k]||{})[g]||{})[q];if(it&&it.y&&it.y['2024']&&has(it.y['2024'][4]))rows.push({k,it});});
 return rows;
}
function renderGaps(){
 fillSelect($('wda-gap-group'),TGROUPS.map(g=>[g,tr(GROUP[g].t[0]+' compared with '+GROUP[g].c[0],GROUP[g].t[1]+' par rapport aux '+GROUP[g].c[1])]),state.gg);
 fillSelect($('wda-gap-q'),Object.keys(QSHORT).map(q=>[q,tr(QSHORT[q][0],QSHORT[q][1])]),state.gq);
 fillSelect($('wda-gap-show'),[['all',tr('All organizations','Toutes les organisations')],['grew',tr(LABEL.grew[0],LABEL.grew[1])],['shrank',tr(LABEL.shrank[0],LABEL.shrank[1])],['same',tr(LABEL.same[0],LABEL.same[1])],['unsure',tr(LABEL.unsure[0],LABEL.unsure[1])]],state.show);
 const g=state.gg,q=state.gq,years=D.trends.groups[g].years,qs=tr(QSHORT[q][0],QSHORT[q][1]);
 const all=gapItems(),ps=all.find(r=>r.k==='Public Service'),orgs=all.filter(r=>r.k!=='Public Service');
 const c={grew:0,shrank:0,same:0,unsure:0};orgs.forEach(r=>{if(r.it.label)c[r.it.label]++;});
 let sum=tr('For “'+qs+'”, the gap between '+G(g,'s')+' and '+GROUP[g].c[0]+' grew in '+c.grew+' organizations, shrank in '+c.shrank+' and stayed about the same in '+c.same+'. In '+c.unsure+' more, it moved by '+D.rules.change_points+' points or more, but too few people answered to be sure.',
  'Pour « '+qs+' », l’écart entre les '+GROUP[g].s[1]+' et les '+GROUP[g].c[1]+' s’est creusé dans '+c.grew+' organisations, s’est réduit dans '+c.shrank+' et est resté à peu près le même dans '+c.same+'. Dans '+c.unsure+' autres, il a varié de '+D.rules.change_points+' points ou plus, mais trop peu de personnes ont répondu pour en être sûr.');
 if(ps&&ps.it.from){const y0=ps.it.from;sum+=' '+tr('Across the public service, the gap was '+signed(ps.it.y[y0][4])+' points in '+y0+' and '+signed(ps.it.y['2024'][4])+' in 2024.','Dans l’ensemble de la fonction publique, l’écart était de '+signed(ps.it.y[y0][4])+' points en '+y0+' et de '+signed(ps.it.y['2024'][4])+' en 2024.');}
 $('wda-gap-status').textContent=sum;
 $('wda-gap-caption').textContent=tr('Gap by year in points: '+G(g,'s')+' compared with '+GROUP[g].c[0]+', “'+qs+'”','Écart par année, en points : '+GROUP[g].s[1]+' par rapport aux '+GROUP[g].c[1]+', « '+qs+' »');
 const sortBtn=(k,label)=>'<button type="button" class="wda-sort" data-sort="'+k+'">'+esc(label)+(state.sort===k?(state.dir<0?' ▼':' ▲'):'')+'</button>';
 $('wda-gap-head').innerHTML='<tr><th scope="col">'+sortBtn('name',tr('Organization','Organisation'))+'</th>'+years.map(y=>'<th scope="col" class="num">'+esc(y)+'</th>').join('')+'<th scope="col" class="num">'+sortBtn('change',tr('Change','Variation'))+'</th><th scope="col">'+esc(tr('What changed','Ce qui a changé'))+'</th></tr>';
 let rows=orgs.filter(r=>state.show==='all'||r.it.label===state.show);
 rows.sort((a,b)=>{if(state.sort==='name')return state.dir*orgName(a.k).localeCompare(orgName(b.k),fr()?'fr':'en');const x=a.it.change,y=b.it.change;if(!has(x)&&!has(y))return orgName(a.k).localeCompare(orgName(b.k));if(!has(x))return 1;if(!has(y))return -1;return state.dir*(x-y)||orgName(a.k).localeCompare(orgName(b.k));});
 if(ps)rows=[ps].concat(rows);
 const cellOf=v=>{if(!v)return '<td class="num"><span class="wda-na">'+esc(tr('Not published','Non publié'))+'</span></td>';const [av,,cv,,gap]=v;
  return '<td class="num">'+(has(gap)?esc(signed(gap)):'<span class="wda-na">'+esc(tr('Not published','Non publié'))+'</span>')+'<span class="wda-sub">'+esc((has(av)?pct(av):'..')+' / '+(has(cv)?pct(cv):'..'))+'</span></td>';};
 $('wda-gap-body').innerHTML=rows.map(r=>{const it=r.it,isPS=r.k==='Public Service';
  return '<tr'+(isPS?' class="wda-ps"':'')+'><th scope="row">'+esc(isPS?tr('Public service as a whole','Ensemble de la fonction publique'):orgName(r.k))+'</th>'+years.map(y=>cellOf(it.y[y])).join('')+
   '<td class="num">'+(has(it.change)?esc(signed(it.change)):'<span class="wda-na">'+esc(tr('Not available','Non disponible'))+'</span>')+'</td><td>'+(it.label?'<span class="wda-tag '+it.label+'">'+esc(tr(LABEL[it.label][0],LABEL[it.label][1]))+'</span>':'')+'</td></tr>';}).join('')||'<tr><td colspan="'+(years.length+3)+'">'+esc(tr('No organization matches this choice.','Aucune organisation ne correspond à ce choix.'))+'</td></tr>';
 const qm=D.trends.question_match_2022,qfull=D.trends.questions[q],early=years[0];
 const notes=[tr('Each cell shows the gap in points, with the group’s result and the comparison group’s result below it. A positive gap means the group’s result is worse. “..” means the result was not published, usually because fewer than 10 people answered. Full question: '+qfull.en,'Chaque cellule présente l’écart en points, avec le résultat du groupe et celui du groupe de comparaison en dessous. Un écart positif signifie que le résultat du groupe est moins favorable. « .. » signifie que le résultat n’a pas été publié, généralement parce que moins de 10 personnes ont répondu. Question complète : '+qfull.fr)];
 if(early==='2019')notes.push(tr('The results for 2019, 2020 and 2022 come from the 2024 survey file, which carries the earlier results under the same questions.','Les résultats de 2019, 2020 et 2022 proviennent du fichier du sondage de 2024, qui reprend les résultats antérieurs sous les mêmes questions.'));
 else notes.push(tr('The 2022 results come from the 2022 survey file for employment equity groups. Its questions were matched to the 2024 questions by wording. For all employees, every matched 2022 result equals the 2022 value in the 2024 survey file ('+int(qm.cells_equal)+' of '+int(qm.cells_equal+qm.cells_different)+').','Les résultats de 2022 proviennent du fichier du sondage de 2022 sur les groupes visés par l’équité. Ses questions ont été jumelées à celles de 2024 selon leur libellé. Pour l’ensemble des employés, chaque résultat de 2022 jumelé est égal à la valeur de 2022 du fichier du sondage de 2024 ('+int(qm.cells_equal)+' sur '+int(qm.cells_equal+qm.cells_different)+').'));
 if(g==='black'||g==='rac')notes.push(tr('In 2022, Treasury Board labelled the comparison group “White”. This page uses the 2024 label, non-racialized employees, for both years.','En 2022, le Conseil du Trésor désignait le groupe de comparaison par « Blancs ». Cette page utilise l’appellation de 2024, employés non racisés, pour les deux années.'));
 notes.push(tr('What changed: a change of '+D.rules.change_points+' points or more is labelled as a gap that grew or shrank when it is unlikely to be chance, given how many people answered in each year.','Ce qui a changé : une variation de '+D.rules.change_points+' points ou plus est présentée comme un écart qui s’est creusé ou réduit lorsqu’elle est peu susceptible d’être due au hasard, compte tenu du nombre de personnes ayant répondu chaque année.'));
 $('wda-gap-note').innerHTML='<ul class="wda-list">'+notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>';
}

/* ---------------- every link ---------------- */
function linkRows(){
 const s=D.scan,rule=D.rules.clear_q;
 return s.pairs.filter(p=>{const [a,b,,,pv,qv]=p;
  if(state.lg!=='all'){const ga=D.measures[a].group,gb=D.measures[b].group;if(ga!==state.lg&&gb!==state.lg)return false;}
  return state.ls==='every'||(state.ls==='clear'?qv<rule:pv<0.05);});
}
const chanceScan=(p,q)=>q<D.rules.clear_q?tr('Unlikely','Peu probable'):p<0.05?tr('Possibly','Possiblement'):tr('Yes','Oui');
function renderLinks(){
 fillSelect($('wda-link-group'),[['all',tr('All results','Tous les résultats')],['black',G('black')],['rac',G('rac')],['ind',G('ind')],['pwd',G('pwd')]],state.lg);
 fillSelect($('wda-link-show'),[['clear',tr('Clear links only','Liens clairs seulement')],['possible',tr('Clear and possible links','Liens clairs et possibles')],['every',tr('Every comparison','Toutes les comparaisons')]],state.ls);
 const rows=linkRows();
const inView=p=>{if(state.lg==='all')return true;const [a,b]=p;return D.measures[a].group===state.lg||D.measures[b].group===state.lg;};
 const possibleOnly=state.ls==='clear'?D.scan.pairs.filter(p=>inView(p)&&p[4]<0.05&&p[5]>=D.rules.clear_q).length:0;
 const top=rows[0],dirTxt=r=>r>0?tr('same direction','même sens'):tr('opposite directions','sens opposés');
 $('wda-link-status').textContent=tr(rows.length+' shown, of '+D.scan.tests+' comparisons.',rows.length+' affichés, sur '+D.scan.tests+' comparaisons.')+(possibleOnly?' '+tr(possibleOnly+' more are possible links that could be chance. Choose “Clear and possible links” to see them.',possibleOnly+' autres sont des liens possibles qui pourraient être dus au hasard. Choisissez « Liens clairs et possibles » pour les voir.'):'')+(top?' '+tr('Most certain link in this view: “'+cap(mlabel(top[0]))+'” and “'+mlabel(top[1])+'” ('+S(top[3])+', '+dirTxt(top[3])+', '+int(top[2])+' organizations).','Lien le plus certain dans cet affichage : « '+cap(mlabel(top[0]))+' » et « '+mlabel(top[1])+' » ('+S(top[3])+', '+dirTxt(top[3])+', '+int(top[2])+' organisations).'):'');
 $('wda-link-caption').textContent=tr('Links between results from different sources','Liens entre des résultats de sources différentes');
 $('wda-link-head').innerHTML='<tr><th scope="col">'+esc(tr('Result','Résultat'))+'</th><th scope="col">'+esc(tr('Compared with','Comparé à'))+'</th><th scope="col" class="num">'+esc(tr('Organizations','Organisations'))+'</th><th scope="col">'+esc(tr('How strong','Force du lien'))+'</th><th scope="col">'+esc(tr('Direction','Sens'))+'</th><th scope="col">'+esc(tr('Could it be chance?','Hasard possible?'))+'</th></tr>';
 const src=k=>tr(SRCNAME[D.measures[k].src][0],SRCNAME[D.measures[k].src][1]);
 $('wda-link-body').innerHTML=rows.map(([a,b,n,r,p,q])=>'<tr><th scope="row">'+esc(cap(mlabel(a)))+'<span class="wda-sub">'+esc(src(a))+'</span></th><td>'+esc(cap(mlabel(b)))+'<span class="wda-sub">'+esc(src(b))+'</span></td><td class="num">'+esc(int(n))+'</td><td>'+esc(cap(S(r)))+'</td><td>'+esc(r>0?tr('Same direction','Même sens'):tr('Opposite directions','Sens opposés'))+'</td><td>'+esc(chanceScan(p,q))+'</td></tr>').join('')||'<tr><td colspan="6">'+esc(tr('No link matches this choice.','Aucun lien ne correspond à ce choix.'))+'</td></tr>';
}

/* ---------------- method and sources ---------------- */
function renderStart(){
 const sel=$('wda-start-group');if(!sel)return;
 const cur=sel.value||state.agree||'black';
 fillSelect(sel,['black','rac','ind','pwd','woman'].map(g=>[g,G(g)]),cur);
 const g=sel.value,gs=G(g,'s');
 const qs=[
  ['agree',tr('Which organizations stand out on both surveys for '+gs+'?','Quelles organisations ressortent dans les deux sondages pour les '+gs+'?'),tr('Shows where the 2024 discrimination result and the 2025 staffing-barrier result are both in the top third.','Montre où le résultat de 2024 sur la discrimination et celui de 2025 sur les obstacles en dotation sont tous deux dans le tiers supérieur.')],
  ['gaps',tr('Is the gap for '+gs+' getting bigger?','L’écart pour les '+gs+' s’accroît-il?'),tr('Shows where the gap with the comparison group grew, shrank or stayed the same.','Montre où l’écart avec le groupe de comparaison s’est creusé, réduit ou est resté le même.')],
  ['links',tr('What else moves together with the results for '+gs+'?','Qu’est-ce qui varie en même temps que les résultats des '+gs+'?'),tr('Shows the links between sources that are clear after allowing for chance.','Montre les liens entre les sources qui sont clairs une fois le hasard pris en compte.')]];
 if(g!=='black')qs.splice(2,0,['staffing',tr('Has staffing fairness changed since 2021 for '+gs+'?','L’équité en dotation a-t-elle changé depuis 2021 pour les '+gs+'?'),tr('Shows each organization’s 2021 and 2025 staffing results for this group.','Montre les résultats de dotation de 2021 et de 2025 de chaque organisation pour ce groupe.')]);
 $('wda-start-list').innerHTML=qs.map(q=>'<li><button type="button" class="gcw-btn wda-start-btn" data-go="'+q[0]+'">'+esc(q[1])+'</button><span class="wda-sub">'+esc(q[2])+'</span></li>').join('')+'<li><button type="button" class="gcw-btn wda-start-btn" id="wda-brief-btn">'+esc(tr('Print a one-page brief for this group','Imprimer une note d’une page pour ce groupe'))+'</button><span class="wda-sub">'+esc(tr('Collects the top organizations, the gap trend, the clear links and the staffing change for this group on one page.','Réunit sur une page les principales organisations, l’évolution de l’écart, les liens clairs et le changement en dotation pour ce groupe.'))+'</span></li>';
}
function goStart(target){
 const g=$('wda-start-group').value;
 if(target==='agree'){state.agree=g;renderAgree();}
 else if(target==='gaps'){state.gg=g;state.show='all';renderGaps();}
 else if(target==='staffing'){state.sg=g;renderStaffing();}
 else{state.lg=g==='woman'?'all':g;state.ls='clear';renderLinks();}
 syncURL();
 const h=$(target+'-title');h.setAttribute('tabindex','-1');h.scrollIntoView({behavior:'smooth',block:'start'});h.focus({preventScroll:true});
}
/* ---------------- staffing survey, 2021 to 2025 ---------------- */
const SGROUPS=['woman','pwd','rac','ind'];
function staffingRows(){
 const g=state.sg,q=state.sq,T=D.staffing_trend,rows=[];
 Object.keys(T.groups[g]||{}).forEach(k=>{const c=T.groups[g][k][q];if(c&&c[0]!==null)rows.push({k,c});});
 return rows;
}
function renderStaffing(){
 if(!$('wda-staff-body'))return;
 const T=D.staffing_trend,g=state.sg,q=state.sq,qd=T.questions[q];
 fillSelect($('wda-staff-group'),SGROUPS.map(x=>[x,G(x)]),g);
 fillSelect($('wda-staff-q'),Object.keys(T.questions).map(k=>[k,tr(T.questions[k].en,T.questions[k].fr)]),q);
 const all=staffingRows(),ps=all.find(r=>r.k==='Public Service'),orgs=all.filter(r=>r.k!=='Public Service'&&has(r.c[3]));
 const fell=orgs.filter(r=>r.c[3]<=-5).length,rose=orgs.filter(r=>r.c[3]>=5).length;
 let sum=tr('Of '+orgs.length+' organizations with both results, the result fell by 5 points or more in '+fell+' and rose by 5 points or more in '+rose+'.','Sur les '+orgs.length+' organisations qui ont les deux résultats, le résultat a baissé de 5 points ou plus dans '+fell+' et a augmenté de 5 points ou plus dans '+rose+'.');
 if(ps&&has(ps.c[2]))sum+=' '+tr('Across the public service, the result went from '+ps.c[0]+'% in 2021 to '+ps.c[2]+'% in 2025 for '+G(g,'s')+'.','Dans l’ensemble de la fonction publique, le résultat est passé de '+ps.c[0]+' % en 2021 à '+ps.c[2]+' % en 2025 pour les '+G(g,'s')+'.');
 $('wda-staff-status').textContent=sum;
 $('wda-staff-caption').textContent=tr('Staffing results, 2021 and 2025: '+G(g,'s'),'Résultats en dotation, 2021 et 2025 : '+G(g,'s'));
 const sb=(k,label)=>'<button type="button" class="wda-sort" data-ssort="'+k+'">'+esc(label)+(state.ssort===k?(state.sdir<0?' ▼':' ▲'):'')+'</button>';
 $('wda-staff-head').innerHTML='<tr><th scope="col">'+sb('name',tr('Organization','Organisation'))+'</th><th scope="col" class="num">'+esc(tr('2021 (%)','2021 (%)'))+'</th><th scope="col" class="num">'+esc(tr('People covered, 2021','Personnes visées, 2021'))+'</th><th scope="col" class="num">'+esc(tr('2025 (%)','2025 (%)'))+'</th><th scope="col" class="num">'+sb('change',tr('Change (points)','Variation (points)'))+'</th></tr>';
 const nm=k=>k==='Public Service'?tr('Public service as a whole','Ensemble de la fonction publique'):(T.names[k]?(fr()?T.names[k][0]:T.names[k][1]):k);
 orgs.sort((a,b)=>state.ssort==='name'?state.sdir*nm(a.k).localeCompare(nm(b.k),fr()?'fr':'en'):state.sdir*(a.c[3]-b.c[3])||nm(a.k).localeCompare(nm(b.k)));
 const noChange=all.filter(r=>r.k!=='Public Service'&&!has(r.c[3]));
 const line=r=>'<tr'+(r.k==='Public Service'?' class="wda-ps"':'')+'><th scope="row">'+esc(nm(r.k))+'</th><td class="num">'+esc(pct(r.c[0]))+'</td><td class="num">'+esc(int(r.c[1]))+'</td><td class="num">'+(has(r.c[2])?esc(pct(r.c[2])):'<span class="wda-na">'+esc(tr('Not published','Non publié'))+'</span>')+'</td><td class="num">'+(has(r.c[3])?esc(signed(r.c[3])):'<span class="wda-na">'+esc(tr('Not available','Non disponible'))+'</span>')+'</td></tr>';
 $('wda-staff-body').innerHTML=(ps?line(ps):'')+orgs.map(line).join('')+noChange.map(line).join('');
 const notes=[tr('Full question, 2025: '+qd.en+'. The 2021 question was matched to it by wording.','Question complète, 2025 : '+qd.fr+'. La question de 2021 lui a été appariée selon le libellé.'),
  tr('Each result is the share who answered “to a moderate extent” or “to a great extent”, with “don’t know” answers kept in the total. 2021 results are calculated here from the Commission’s weighted counts. 2025 results are the Commission’s published figures.','Chaque résultat est la part des réponses « dans une mesure modérée » ou « dans une grande mesure », les réponses « ne sais pas » restant dans le total. Les résultats de 2021 sont calculés ici à partir des nombres pondérés de la Commission. Ceux de 2025 sont les chiffres publiés par la Commission.'),
  tr('“People covered” is the Commission’s weighted count for 2021. The 2025 file does not give the number of people who answered each group, so a large change in a small group can be chance. Read big swings with that count in mind.','« Personnes visées » est le nombre pondéré de la Commission pour 2021. Le fichier de 2025 n’indique pas le nombre de répondants de chaque groupe; une forte variation dans un petit groupe peut donc être due au hasard. Lisez les grandes variations en tenant compte de ce nombre.'),
  tr('The 2021 survey covered staffing from March 2020 to March 2021, during the COVID-19 pandemic. The 2021 files have no results for Black employees, so that group is not shown here.','Le sondage de 2021 portait sur la dotation de mars 2020 à mars 2021, pendant la pandémie de COVID-19. Les fichiers de 2021 ne contiennent pas de résultats pour les employés noirs; ce groupe n’est donc pas présenté ici.')];
 $('wda-staff-note').innerHTML='<ul class="wda-list">'+notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>';
}

/* ---------------- one-page brief ---------------- */
function briefHtml(){
 const g=$('wda-start-group').value,gs=G(g,'s'),rule=D.rules.clear_q,nm=o=>fr()?o.fr:o.en;
 const a=D.agree[g],top=a.orgs.slice(0,8);
 const gq='Q65',c={grew:0,shrank:0,same:0,unsure:0};
 if(TGROUPS.includes(g))Object.keys(D.trends.orgs).forEach(k=>{if(k==='Public Service')return;const it=((D.trends.orgs[k]||{})[g]||{})[gq];if(it&&it.y&&it.y['2024']&&has(it.y['2024'][4])&&it.label)c[it.label]++;});
 const ps=TGROUPS.includes(g)?((D.trends.orgs['Public Service']||{})[g]||{})[gq]:null;
 const links=D.scan.pairs.filter(p=>p[5]<rule&&(D.measures[p[0]].group===g||D.measures[p[1]].group===g)).slice(0,6);
 const st=(D.staffing_trend.groups[g]||{})['Public Service'];
 let h='<h2>'+esc(tr('Brief: '+gs,'Note : '+gs))+'</h2><p class="wda-sub">'+esc(tr('From “Where the data agree”, GC Equity. All figures are published results or are calculated from them.','Tiré de « Là où les données concordent », Équité GC. Tous les chiffres sont des résultats publiés ou calculés à partir de ceux-ci.'))+'</p>';
 h+='<h3>'+esc(tr('Organizations in the top third on both surveys','Organisations dans le tiers supérieur des deux sondages'))+'</h3><p>'+esc(tr(a.orgs.length+' of '+a.orgs_with_both+' organizations with both results. Up to eight shown. Discrimination at work (2024 survey), then bias or barriers in staffing (2025 survey).',a.orgs.length+' sur '+a.orgs_with_both+' organisations qui ont les deux résultats. Jusqu’à huit sont présentées. Discrimination au travail (sondage de 2024), puis préjugés ou obstacles en dotation (sondage de 2025).'))+'</p><ul>'+top.map(o=>'<li>'+esc(nm(o)+(fr()?' : ':': ')+pct(o.pses)+' / '+pct(o.snps))+'</li>').join('')+'</ul>';
 if(TGROUPS.includes(g)){const qs=tr(QSHORT[gq][0],QSHORT[gq][1]);h+='<h3>'+esc(tr('Is the gap growing?','L’écart se creuse-t-il?'))+'</h3><p>'+esc(tr('For “'+qs+'”, the gap between '+gs+' and '+GROUP[g].c[0]+' grew in '+c.grew+' organizations, shrank in '+c.shrank+' and stayed about the same in '+c.same+'.'+(ps&&ps.from?' Across the public service the gap was '+signed(ps.y[ps.from][4])+' points in '+ps.from+' and '+signed(ps.y['2024'][4])+' in 2024.':''),'Pour « '+qs+' », l’écart entre les '+GROUP[g].s[1]+' et les '+GROUP[g].c[1]+' s’est creusé dans '+c.grew+' organisations, s’est réduit dans '+c.shrank+' et est resté à peu près le même dans '+c.same+'.'+(ps&&ps.from?' Dans l’ensemble de la fonction publique, l’écart était de '+signed(ps.y[ps.from][4])+' points en '+ps.from+' et de '+signed(ps.y['2024'][4])+' en 2024.':'')))+'</p>';}
 if(links.length)h+='<h3>'+esc(tr('Links between sources that are clear after allowing for chance','Liens entre sources clairs une fois le hasard pris en compte'))+'</h3><ul>'+links.map(p=>'<li>'+esc(cap(mlabel(p[0]))+(fr()?' et ':' and ')+mlabel(p[1])+' ('+S(p[3])+', '+int(p[2])+' '+tr('organizations','organisations')+')')+'</li>').join('')+'</ul>';
 if(st&&st.STA_01E&&has(st.STA_01E[2]))h+='<h3>'+esc(tr('Staffing fairness since 2021','L’équité en dotation depuis 2021'))+'</h3><p>'+esc(tr('Across the public service, '+st.STA_01E[0]+'% of '+gs+' said selection in their work unit is fair in 2021, and '+st.STA_01E[2]+'% in 2025.','Dans l’ensemble de la fonction publique, '+st.STA_01E[0]+' % des '+gs+' ont dit que la sélection dans leur unité de travail est équitable en 2021, et '+st.STA_01E[2]+' % en 2025.'))+'</p>';
 h+='<p class="wda-sub">'+esc(tr('A link is not proof. It shows where to look. It does not show what happened to any one person, or why. Source and full tables: ','Un lien n’est pas une preuve. Il montre où regarder. Il ne montre pas ce qui est arrivé à une personne en particulier, ni pourquoi. Source et tableaux complets : ')+location.origin+location.pathname)+'</p>';
 return h;
}
function printBrief(){
 let box=$('wda-brief');if(!box){box=document.createElement('section');box.id='wda-brief';box.className='wda-brief';document.body.appendChild(box);}
 box.innerHTML=briefHtml();
 document.body.classList.add('wda-print-brief');
 const done=()=>{document.body.classList.remove('wda-print-brief');window.removeEventListener('afterprint',done);};
 window.addEventListener('afterprint',done);
 window.print();
}
function renderMethod(){
 const items=[
  ['Each comparison looks across federal organizations. It asks: where one result is higher, is the other result usually higher too, or lower?','Chaque comparaison porte sur l’ensemble des organisations fédérales. Elle pose la question suivante : là où un résultat est plus élevé, l’autre est-il habituellement plus élevé lui aussi, ou plus bas?'],
  ['Same direction means that where one result is higher, the other tends to be higher too. Opposite directions means that where one is higher, the other tends to be lower.','Même sens signifie que là où un résultat est plus élevé, l’autre tend à l’être aussi. Sens opposés signifie que là où l’un est plus élevé, l’autre tend à être plus bas.'],
  ['How strong: very weak, weak, moderate or strong. Behind each word is a rank correlation from −1 to 1, which is in the CSV file. Under 0.15 is very weak, from 0.15 weak, from 0.3 moderate and from 0.5 strong, the same words the data explorer on this site uses.','Force du lien : très faible, faible, modéré ou fort. Derrière chaque mot se trouve une corrélation de rangs, de −1 à 1, qui figure dans le fichier CSV. Moins de 0,15 est très faible, à partir de 0,15 faible, à partir de 0,3 modéré et à partir de 0,5 fort, comme dans l’explorateur de données de ce site.'],
  ['Size: large and small organizations are compared fairly. Each comparison removes the effect of the number of employees, so size alone does not create a link.','Taille : les grandes et les petites organisations sont comparées équitablement. Chaque comparaison retire l’effet du nombre d’employés, de sorte que la taille seule ne crée pas de lien.'],
  ['Chance: when hundreds of pairs are checked, some links appear by luck. “Unlikely” means the link stands out from what luck alone would produce across all '+int(D.scan.tests)+' comparisons. “Possibly” means it would pass one test on its own but not this stricter check. In the findings at the top, each result is a single planned check, so “unlikely” there means it would happen by chance less than 1 time in 20.','Hasard : quand des centaines de paires sont vérifiées, certains liens apparaissent par chance. « Peu probable » signifie que le lien ressort de ce que la chance seule produirait sur l’ensemble des '+int(D.scan.tests)+' comparaisons. « Possiblement » signifie qu’il passerait un seul test, mais pas cette vérification plus stricte. Dans les constats du haut, chaque résultat est une vérification prévue à l’avance; « peu probable » y signifie qu’il se produirait par hasard moins d’une fois sur 20.'],
  ['A link is not proof. It shows where to look. It does not show what happened to any one person, or why. Some links may come from the kind of work an organization does, such as frontline security work.','Un lien n’est pas une preuve. Il montre où regarder. Il ne montre pas ce qui est arrivé à une personne en particulier, ni pourquoi. Certains liens peuvent venir du type de travail d’une organisation, par exemple le travail de sécurité de première ligne.'],
  ['Top third: the organizations with the highest results, about one in three of those that have both results published.','Tiers supérieur : les organisations qui ont les résultats les plus élevés, environ une sur trois parmi celles dont les deux résultats sont publiés.'],
  ['Gap: the group’s result compared with the comparison group’s result, turned so that a positive number always means the group is worse off. For example, if 14% of Indigenous employees and 9% of non-Indigenous employees said they were discriminated against, the gap is 5 points.','Écart : le résultat du groupe comparé à celui du groupe de comparaison, présenté de sorte qu’un nombre positif signifie toujours que le groupe est désavantagé. Par exemple, si 14 % des employés autochtones et 9 % des employés non autochtones ont dit avoir été victimes de discrimination, l’écart est de 5 points.'],
  ['What changed: a change of '+D.rules.change_points+' points or more, the same reading rule used elsewhere on this site, is labelled as growing or shrinking when it is unlikely to be chance given how many people answered in each year. This is an approximate check. Smaller changes are labelled about the same.','Ce qui a changé : une variation de '+D.rules.change_points+' points ou plus, la même règle de lecture qu’ailleurs sur ce site, est présentée comme un écart qui se creuse ou se réduit lorsqu’elle est peu susceptible d’être due au hasard compte tenu du nombre de personnes ayant répondu chaque année. Il s’agit d’une vérification approximative. Les variations plus petites sont présentées comme à peu près pareilles.'],
  ['Charts: under each table, Chart shows the same rows as bars, dots, a heatmap or a trend over time. Choose Compare with to plot two results side by side. Each mark is one published row. Select a mark to see its exact value and source row. Blank or suppressed cells are not plotted as zero.','Graphiques : sous chaque tableau, Graphique affiche les mêmes lignes en barres, en points, en carte thermique ou en évolution dans le temps. Choisissez Comparer avec pour afficher deux résultats côte à côte. Chaque marque correspond à une ligne publiée. Sélectionnez une marque pour voir sa valeur exacte et sa ligne source. Les cellules vides ou supprimées ne sont pas affichées comme des zéros.'],
  ['Types of workforce share: besides the overall shares, the comparisons include Treasury Board’s published shares of First Nations and Métis employees (2025) and of employees by type of disability (2024): mobility, deaf or hard of hearing, blind or visually impaired, and other. Inuit employees are left out because most organizations have too few to compare. These shares are measured against all employees, so a higher share means more employees of that type, not a better or worse result.','Types de part de l’effectif : en plus des parts globales, les comparaisons incluent les parts publiées par le Conseil du Trésor pour les employés des Premières Nations et métis (2025) et pour les employés selon le type d’incapacité (2024) : mobilité, surdité ou malentendance, cécité ou déficience visuelle, et autre. Les employés inuits sont exclus parce que la plupart des organisations en comptent trop peu pour une comparaison. Ces parts sont calculées par rapport à l’ensemble des employés : une part plus élevée signifie plus d’employés de ce type, et non un meilleur ou un moins bon résultat.'],
  ['Missing values: results that were not published, usually because fewer than 10 people answered, stay blank. Nothing is estimated or filled in.','Valeurs manquantes : les résultats non publiés, généralement parce que moins de 10 personnes ont répondu, restent vides. Rien n’est estimé ni ajouté.'],
  ['Every comparison is calculated by this site from the published figures in the files below, by a script that anyone can run again. They are not Government of Canada statistics.','Chaque comparaison est calculée par ce site à partir des chiffres publiés dans les fichiers ci-dessous, au moyen d’un script que tout le monde peut exécuter de nouveau. Il ne s’agit pas de statistiques du gouvernement du Canada.'],
 ];
 $('wda-method').innerHTML='<ul class="wda-list">'+items.map(i=>'<li>'+esc(tr(i[0],i[1]))+'</li>').join('')+'</ul>';
}
function renderSources(){
 $('wda-sources').innerHTML='<h3>'+esc(tr('Published sources','Sources publiées'))+'</h3><ul class="wda-list">'+['rep','tbsind','tbsdis','pses','pses24','pses22','snps','snps21'].map(k=>'<li>'+link(k)+'</li>').join('')+'</ul>'+
  '<h3>'+esc(tr('On this site','Sur ce site'))+'</h3><ul class="wda-list">'+['file','inputs','snpsfile','script','cta','staffing'].map(k=>'<li>'+link(k)+'</li>').join('')+'</ul>';
}

/* ---------------- downloads ---------------- */
function csvText(rows){return '﻿'+rows.map(r=>r.map(v=>{const s=v===null||v===undefined?'':String(v);return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\r\n');}
function save(name,rows){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csvText(rows)],{type:'text/csv;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function bind(){
 $('wda-start-list').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)goStart(b.dataset.go);});
 $('wda-start-group').addEventListener('change',()=>renderStart());
 $('wda-start-list').addEventListener('click',e=>{if(e.target.closest('#wda-brief-btn'))printBrief();});
 $('wda-staff-group').addEventListener('change',e=>{state.sg=e.target.value;renderStaffing();});
 $('wda-staff-q').addEventListener('change',e=>{state.sq=e.target.value;renderStaffing();});
 $('wda-staff-head').addEventListener('click',e=>{const b=e.target.closest('[data-ssort]');if(!b)return;const k=b.dataset.ssort;if(state.ssort===k)state.sdir*=-1;else{state.ssort=k;state.sdir=1;}renderStaffing();const nb=document.querySelector('#wda-staff-head [data-ssort="'+k+'"]');if(nb)nb.focus();});
 $('wda-staff-csv').addEventListener('click',()=>{const T=D.staffing_trend,g=state.sg,q=state.sq;save('where-data-agree-staffing-'+g+'-'+q+'.csv',[[tr('Organization','Organisation'),tr('2021 (%)','2021 (%)'),tr('People covered, 2021 (weighted)','Personnes visées, 2021 (pondéré)'),tr('2025 (%)','2025 (%)'),tr('Change (points)','Variation (points)')]].concat(staffingRows().map(r=>[r.k==='Public Service'?tr('Public service as a whole','Ensemble de la fonction publique'):(T.names[r.k]?(fr()?T.names[r.k][0]:T.names[r.k][1]):r.k),r.c[0],r.c[1],r.c[2]===null?'':r.c[2],r.c[3]===null?'':r.c[3]])));});
 $('wda-agree-group').addEventListener('change',e=>{state.agree=e.target.value;renderAgree();syncURL();});
 $('wda-gap-group').addEventListener('change',e=>{state.gg=e.target.value;renderGaps();syncURL();});
 $('wda-gap-q').addEventListener('change',e=>{state.gq=e.target.value;renderGaps();syncURL();});
 $('wda-gap-show').addEventListener('change',e=>{state.show=e.target.value;renderGaps();});
 $('wda-gap-head').addEventListener('click',e=>{const b=e.target.closest('[data-sort]');if(!b)return;const k=b.dataset.sort;if(state.sort===k)state.dir*=-1;else{state.sort=k;state.dir=k==='change'?-1:1;}renderGaps();const nb=document.querySelector('#wda-gap-head [data-sort="'+k+'"]');if(nb)nb.focus();});
 $('wda-link-group').addEventListener('change',e=>{state.lg=e.target.value;renderLinks();});
 $('wda-link-show').addEventListener('change',e=>{state.ls=e.target.value;renderLinks();});
 $('wda-agree-csv').addEventListener('click',()=>{const g=state.agree;save('where-data-agree-surveys-'+g+'.csv',[[tr('Organization','Organisation'),tr('Discriminated against at work, 2024 (%)','Victimes de discrimination au travail, 2024 (%)'),tr('People who answered, 2024','Personnes ayant répondu, 2024'),tr('Faced bias or barriers in staffing, 2025 (%)','Préjugés ou obstacles en dotation, 2025 (%)'),tr('Change in representation, 2023 to 2025 (points)','Variation de la représentation, de 2023 à 2025 (points)')]].concat(agreeRows().map(r=>r.slice(0,5))));});
 $('wda-gap-csv').addEventListener('click',()=>{const g=state.gg,q=state.gq,years=D.trends.groups[g].years;const head=[tr('Organization','Organisation')];years.forEach(y=>head.push(y+' '+tr('group (%)','groupe (%)'),y+' '+tr('group answers','réponses du groupe'),y+' '+tr('comparison (%)','comparaison (%)'),y+' '+tr('comparison answers','réponses de comparaison'),y+' '+tr('gap (points)','écart (points)')));head.push(tr('Change (points)','Variation (points)'),tr('What changed','Ce qui a changé'));
  save('where-data-agree-gaps-'+g+'-'+q+'.csv',[head].concat(gapItems().map(r=>{const it=r.it,row=[r.k==='Public Service'?tr('Public service as a whole','Ensemble de la fonction publique'):orgName(r.k)];years.forEach(y=>{const v=it.y[y]||[];row.push(...[0,1,2,3,4].map(i=>v[i]??''));});row.push(it.change??'',it.label?tr(LABEL[it.label][0],LABEL[it.label][1]):'');return row;})));});
 $('wda-link-csv').addEventListener('click',()=>{save('where-data-agree-every-link.csv',[[tr('Result','Résultat'),tr('Source','Source'),tr('Compared with','Comparé à'),tr('Source','Source'),tr('Organizations','Organisations'),tr('Rank correlation, adjusted for size','Corrélation de rangs, ajustée selon la taille'),'p',tr('False discovery rate (q)','Taux de fausses découvertes (q)'),tr('How strong','Force du lien'),tr('Could it be chance?','Hasard possible?')]].concat(D.scan.pairs.map(([a,b,n,r,p,q])=>[cap(mlabel(a)),tr(SRCNAME[D.measures[a].src][0],SRCNAME[D.measures[a].src][1]),cap(mlabel(b)),tr(SRCNAME[D.measures[b].src][0],SRCNAME[D.measures[b].src][1]),n,r,p,q,cap(S(r)),chanceScan(p,q)])));});
}
function syncURL(){const u=new URL(location.href);u.searchParams.set('group',state.gg);u.searchParams.set('q',state.gq);u.searchParams.set('both',state.agree);history.replaceState(history.state,'',u.href);}
function render(){
 document.querySelectorAll('[data-i18n]').forEach(el=>{const t=TEXT[el.dataset.i18n];if(t)el.textContent=tr(t[0],t[1]);});
 document.querySelectorAll('[data-i18n-label]').forEach(el=>{const t=TEXT[el.dataset.i18nLabel];if(t)el.setAttribute('aria-label',tr(t[0],t[1]));});
 document.title=tr('Where the data agree | GC Equity','Là où les données concordent | Équité GC');
 if(!D)return;
 renderStart();renderStats();renderFindings();renderAgree();renderGaps();renderStaffing();renderLinks();renderMethod();renderSources();
}
window._applyLang=function(){render();};
async function load(){
 render();
 try{const r=await fetch(new URL('data/where-data-agree.json',location.href));if(!r.ok)throw Error(r.status);D=await r.json();}
 catch(err){$('wda-loading').textContent=tr('The data could not be loaded. Reload the page to try again.','Les données n’ont pas pu être chargées. Rechargez la page pour réessayer.');return;}
 const p=new URLSearchParams(location.search);
 if(TGROUPS.includes(p.get('group')))state.gg=p.get('group');
 if(QSHORT[p.get('q')])state.gq=p.get('q');
 if(D.agree[p.get('both')])state.agree=p.get('both');
 $('wda-loading').hidden=true;
 render();bind();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
