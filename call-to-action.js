/* Call to Action page: the 2021 letters and 2024 self-assessments beside published workforce and survey data. */
(function(){
'use strict';
const NB=' ';
const $=id=>document.getElementById(id);
const fr=()=>document.documentElement.lang.toLowerCase().startsWith('fr');
const tr=(en,f)=>fr()?f:en;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const LOW=0.85, GAP=3;   // screening rules used across this site: ratio of 0.85 or less; survey difference of 3 points or more
const YEARS=['2021','2022','2023','2024','2025'];

const TEXT={
 eyebrow:['Call to Action on Anti-Racism, Equity, and Inclusion','Appel à l’action en faveur de la lutte contre le racisme, de l’équité et de l’inclusion'],
 title:['Call to Action: commitments and results by organization','Appel à l’action'+NB+': engagements et résultats par organisation'],
 lede:['In 2021, deputy heads published open letters on how they were carrying out the Clerk of the Privy Council’s Call to Action. In 2024, organizations answered a self-assessment on the forward direction of the Call to Action, including whether they had set recruitment and promotion goals. This page places each organization’s commitments and goals beside published workforce and survey data, so you can see where results changed and where gaps remain.',
  'En 2021, les administrateurs généraux ont publié des lettres ouvertes sur la mise en œuvre de l’appel à l’action du greffier du Conseil privé. En 2024, les organisations ont répondu à une autoévaluation sur l’orientation future de l’appel à l’action, notamment pour indiquer si elles avaient fixé des objectifs de recrutement et de promotion. Cette page présente les engagements et les objectifs de chaque organisation à côté des données publiées sur l’effectif et des résultats de sondages, pour voir où les résultats ont changé et où des écarts demeurent.'],
 meta:['Letters: 2021. Self-assessments: April 2024. Workforce data: March 31, 2021, to March 31, 2025. Surveys: 2024 Public Service Employee Survey and 2025 Staffing and Non-Partisanship Survey.',
  'Lettres'+NB+': 2021. Autoévaluations'+NB+': avril 2024. Données sur l’effectif'+NB+': du 31 mars 2021 au 31 mars 2025. Sondages'+NB+': Sondage auprès des fonctionnaires fédéraux de 2024 et Sondage sur la dotation et l’impartialité politique de 2025.'],
 jumpCompare:['Compare organizations','Comparer les organisations'], jumpRecord:['Organization record','Dossier de l’organisation'],
 jumpMethod:['How to read this page','Comment lire cette page'], jumpSources:['Sources and data files','Sources et fichiers de données'],
 loading:['Loading the letters, self-assessments and data…','Chargement des lettres, des autoévaluations et des données…'],
 compareTitle:['Compare organizations','Comparer les organisations'],
 compareIntro:['Choose an employee group. For each organization, the table shows the 2024 goals reported for that group, its representation in 2021 and 2025, and two survey results compared with a comparison group in the same organization.',
  'Choisissez un groupe d’employés. Pour chaque organisation, le tableau présente les objectifs de 2024 déclarés pour ce groupe, sa représentation en 2021 et en 2025, et deux résultats de sondage comparés à un groupe de comparaison de la même organisation.'],
 groupLabel:['Employee group','Groupe d’employés'], filterLabel:['Show','Afficher'], searchLabel:['Find an organization','Trouver une organisation'],
 download:['Download this table (CSV)','Télécharger ce tableau (CSV)'],
 recordTitle:['Organization record','Dossier de l’organisation'],
 recordIntro:['Read what an organization committed to, the goals it reported, and the published results for the same organization.','Consultez les engagements d’une organisation, les objectifs qu’elle a déclarés et les résultats publiés pour cette même organisation.'],
 orgLabel:['Organization','Organisation'], rgroupLabel:['Survey results for','Résultats de sondage pour'],
 methodTitle:['How to read this page','Comment lire cette page'], sourcesTitle:['Sources and data files','Sources et fichiers de données'],
 jumpFindings:['What the data point to','Ce que les données indiquent'], findingsTitle:['What the data point to','Ce que les données indiquent'],
 findingsIntro:['These findings compare what organizations reported in the Call to Action, in their 2021 letters and 2024 self-assessments, with published results for the same organizations from Treasury Board representation tables, the Public Service Employee Survey, the Staffing and Non-Partisanship Survey and Public Service Commission hiring data. They are listed from the strongest link to the weakest. Across 3,413 comparisons of this kind, 207 met the usual 5% threshold for a difference, while chance alone would produce about 171, so any single difference may be a chance result. None of these findings shows that an action caused a result.',
  'Ces constats comparent ce que les organisations ont déclaré dans le cadre de l’appel à l’action, dans leurs lettres de 2021 et leurs autoévaluations de 2024, avec les résultats publiés pour les mêmes organisations dans les tableaux de représentation du Conseil du Trésor, le Sondage auprès des fonctionnaires fédéraux, le Sondage sur la dotation et l’impartialité politique et les données d’embauche de la Commission de la fonction publique. Ils sont classés du lien le plus solide au plus faible. Sur 3'+NB+'413 comparaisons de ce type, 207 ont atteint le seuil habituel de 5'+NB+'% pour un écart, alors que le hasard seul en produirait environ 171. Un écart pris isolément peut donc être le fruit du hasard. Aucun de ces constats ne montre qu’une mesure a causé un résultat.'],
};
const GROUPS=[
 {k:'i',en:'Indigenous Peoples',fr:'Peuples autochtones',goal:'indigenous',pses:['ind','nonind'],cmp:['non-Indigenous respondents','répondants non autochtones']},
 {k:'v',en:'Racialized employees (members of visible minorities)',fr:'Employés racisés (membres des minorités visibles)',short:['Racialized employees','Employés racisés'],goal:'racialized',pses:['rac','nonrac'],cmp:['non-racialized respondents','répondants non racisés']},
 {k:'b',en:'Black employees',fr:'Employés noirs',goal:'black',pses:['black','nonrac'],cmp:['non-racialized respondents','répondants non racisés']},
 {k:'d',en:'Persons with disabilities',fr:'Personnes en situation de handicap',goal:null,pses:['pwd','nopwd'],cmp:['respondents without disabilities','répondants sans handicap']},
];
const gName=(g,short)=>short&&g.short?tr(g.short[0],g.short[1]):tr(g.en,g.fr);
const FILTERS=[
 ['all','All organizations','Toutes les organisations'],
 ['goal','A recruitment or promotion goal set in 2024','Un objectif de recrutement ou de promotion fixé en 2024'],
 ['nogoal','Self-assessment with no recruitment or promotion goal set','Autoévaluation sans objectif de recrutement ni de promotion fixé'],
 ['marked','Representation marked in 2025 (0.85 or less of availability)','Représentation signalée en 2025 (0,85 ou moins de la disponibilité)'],
 ['down','Representation lower in 2025 than in 2021','Représentation plus faible en 2025 qu’en 2021'],
 ['survey','A survey result marked','Un résultat de sondage signalé'],
 ['goalmarked','Goal set, and representation or a survey result marked','Objectif fixé, et représentation ou résultat de sondage signalé'],
];
const STATUS={set:['Set','Fixé'],underway:['Work under way','En cours'],none:['None stated','Aucun indiqué']};
const PSES_Q=['Q52','Q49','Q24','Q65','Q58','Q45'];
const SNPS_Q=['STA_14A','STA_13','STA_01E','STA_01F','STA_01A','STA_09C','STA_04'];
const TERMS=[['Anti-racism','Antiracisme'],['Equity','Équité'],['Inclusion','Inclusion'],['Diversity','Diversité'],['Accessibility','Accessibilité'],['Reconciliation','Réconciliation']];
// Numeric representation targets with a date, as stated in the 2021 letters, that the Treasury Board tables can check.
const CHECKS={
 'canadian-radio-television-telecommunications-commission':{year:'2024',items:[['i',5.0],['v',21.2],['d',9.5]],
  en:'The 2021 letter set commission-wide aspirational targets for March 2024. Women’s figures are not in the departmental series used here.',
  fr:'La lettre de 2021 fixait des cibles ambitieuses pour l’ensemble du Conseil pour mars 2024. Les chiffres pour les femmes ne figurent pas dans la série ministérielle utilisée ici.'},
 'statistics-canada':{year:'2025',items:[['w','wfa'],['i','wfa'],['v','wfa'],['d','wfa']],
  en:'The 2021 letter set a target to meet workforce availability for all equity groups by 2025.',
  fr:'La lettre de 2021 fixait comme cible d’atteindre la disponibilité de la main-d’œuvre pour tous les groupes visés d’ici 2025.'},
 'correctional-service-canada':{year:'2025',items:[['w','wfa'],['d','wfa']],
  en:'The 2021 letter set a target to meet workforce availability for women and persons with disabilities by 2025.',
  fr:'La lettre de 2021 fixait comme cible d’atteindre la disponibilité de la main-d’œuvre pour les femmes et les personnes en situation de handicap d’ici 2025.'},
};
// Findings shown under "What the data point to", from the strongest link to the weakest. Each compares what organizations
// reported in the Call to Action with published results; the figures come from data/call-to-action-comparisons.json,
// built by scripts/build-cta-comparisons.py. scripts/check-site.py fails if a figure no longer matches that file.
// French strings are written with ordinary spaces; frt() adds the non-breaking spaces of French typography.
// Each source: English label, French label, address, 1 for a page or file on this site, and the French address of an outside page.
const SRC={
 letters:['Privy Council Office: letters on the implementation of the Call to Action (2021)','Bureau du Conseil privé : lettres sur la mise en œuvre de l’appel à l’action (2021)','https://www.canada.ca/en/privy-council/corporate/clerk/call-to-action-anti-racism-equity-inclusion-federal-public-service/letters-implementation.html',0,'https://www.canada.ca/fr/conseil-prive/organisation/greffier/appel-action-faveur-lutte-contre-racisme-equite-inclusion-fonction-publique-federale/lettres-mise-en-oeuvre.html'],
 sa:['Privy Council Office: responses to the 2024 self-assessment','Bureau du Conseil privé : réponses à l’autoévaluation de 2024','https://www.canada.ca/en/privy-council/corporate/about-call-action/self-assessment-forward-direction.html',0,'https://www.canada.ca/fr/conseil-prive/organisation/a-propos-appel-action/autoevaluation-orientations-suivre.html'],
 form:['Privy Council Office: the 2024 self-assessment questionnaire','Bureau du Conseil privé : questionnaire d’autoévaluation de 2024','https://www.canada.ca/en/privy-council/corporate/about-call-action/message-call-to-action-and-values-ethics-self-assessments/call-to-action-self-assessments.html',0,'https://www.canada.ca/fr/conseil-prive/organisation/a-propos-appel-action/message-autoevaluations-appel-action-et-valeurs-ethique/autoevaluations-appel-action.html'],
 rep:['Treasury Board: representation and workforce availability','Conseil du Trésor : représentation et disponibilité au sein de la population active','https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/representation-public-service-canada-designated-group-fiscal-year-workforce-availability-estimates.html',0,'https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/statistiques-ressources-humaines/statistiques-diversite-inclusion/representation-groupes-designes-fonction-publique-canada-exercice-estimations-disponibilite-sein-population-active.html'],
 pses:['Treasury Board: 2024 Public Service Employee Survey results','Conseil du Trésor : résultats du Sondage auprès des fonctionnaires fédéraux de 2024','https://www.canada.ca/en/treasury-board-secretariat/services/innovation/public-service-employee-survey/2024-25.html',0,'https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/sondage-fonctionnaires-federaux/2024-25.html'],
 yoy:['Data explorer: changes since the 2022 survey','Explorateur de données : changements depuis le sondage de 2022','explorer.html#yoy',1],
 snps:['Public Service Commission: 2025 Staffing and Non-Partisanship Survey open data','Commission de la fonction publique : données ouvertes du Sondage sur la dotation et l’impartialité politique de 2025','https://open.canada.ca/data/en/dataset/8766bf91-d14c-423b-a5d1-ac47f5b4dd22',0,'https://ouvert.canada.ca/data/fr/dataset/8766bf91-d14c-423b-a5d1-ac47f5b4dd22'],
 staffingorg:['Hiring and staffing data: appointments by organization','Données sur l’embauche et la dotation : nominations par organisation','staffing.html#organizations',1],
 comparisons:['Every comparison, organization by organization, with the keywords used (JSON)','Chaque comparaison, organisation par organisation, avec les mots-clés utilisés (JSON)','data/call-to-action-comparisons.json',1],
};
const LEVEL={strong:['Strong evidence','Niveau de preuve élevé'],moderate:['Moderate evidence','Niveau de preuve moyen'],limited:['Limited evidence','Niveau de preuve faible']};
const FINDINGS=[
 {level:'strong',src:['letters','sa','comparisons'],
  t:['From 2021 to 2024, what organizations reported moved from training and plans to sponsorship and data','De 2021 à 2024, les déclarations des organisations sont passées de la formation et des plans au parrainage et aux données'],
  b:['Bias or anti-racism training was among the commitments in 45 of the 90 letters in 2021 and in the progress reported in 4 of the 91 self-assessments in 2024. Of the 81 organizations that have both documents, 41 described training in 2021 and 1 of them described it again in 2024. Action plans or strategies went from 60 letters to 24 self-assessments, and listening sessions from 24 to 8. Sponsorship programs went the other way, from 25 letters to 46 self-assessments, and data or dashboards from 26 to 42.',
   'La formation sur les préjugés ou la lutte contre le racisme figurait parmi les engagements de 45 des 90 lettres en 2021 et parmi les progrès déclarés dans 4 des 91 autoévaluations en 2024. Sur les 81 organisations qui ont les deux documents, 41 décrivaient de la formation en 2021, et 1 seule d’entre elles l’a décrite de nouveau en 2024. Les plans d’action ou stratégies sont passés de 60 lettres à 24 autoévaluations, et les séances d’écoute, de 24 à 8. Les programmes de parrainage ont suivi le chemin inverse, de 25 lettres à 46 autoévaluations, tout comme les données ou les tableaux de bord, de 26 à 42.'],
  e:['The evidence is strong, because these are counts of what the documents say. The 2021 letters and the 2024 self-assessment asked different questions, and the summaries on this page are short, so a theme that is missing in 2024 does not show that the work stopped.',
   'Le niveau de preuve est élevé, parce qu’il s’agit de dénombrements de ce que disent les documents. Les lettres de 2021 et l’autoévaluation de 2024 posaient des questions différentes, et les résumés présentés sur cette page sont brefs. Un thème absent en 2024 ne montre donc pas que le travail a cessé.']},
 {level:'strong',src:['sa','form','rep','comparisons'],
  t:['Most recruitment goals were set by organizations already at or above availability, and the group most often below availability was outside the goal question','La plupart des objectifs de recrutement ont été fixés par des organisations qui atteignaient déjà la disponibilité, et le groupe le plus souvent sous la disponibilité ne faisait pas partie de la question sur les objectifs'],
  b:['Of the 44 organizations that reported having set an Indigenous recruitment goal and have published figures, 36 were already at or above their Indigenous availability in 2023. Of the 43 that reported having set a racialized recruitment goal, 36 were at or above their availability. Persons with disabilities were below availability in 43 of the 55 organizations that completed a self-assessment and have published figures, but the 2024 question on recruitment and promotion goals covered only Indigenous, Black and other racialized employees. There is no availability estimate for Black employees.',
   'Sur les 44 organisations qui ont déclaré avoir fixé un objectif de recrutement d’Autochtones et qui ont des chiffres publiés, 36 atteignaient ou dépassaient déjà leur disponibilité pour les Autochtones en 2023. Sur les 43 qui ont déclaré avoir fixé un objectif de recrutement d’employés racisés, 36 atteignaient ou dépassaient leur disponibilité. Les personnes en situation de handicap étaient sous la disponibilité dans 43 des 55 organisations qui ont rempli une autoévaluation et qui ont des chiffres publiés, mais la question de 2024 sur les objectifs de recrutement et de promotion ne portait que sur les employés autochtones, noirs et autres employés racisés. Il n’existe pas d’estimation de la disponibilité pour les employés noirs.'],
  e:['The evidence is strong, because it sets each organization’s reported goals beside its own published representation. Goals may target levels or occupations where gaps remain, which the overall figures do not show.',
   'Le niveau de preuve est élevé, parce que la comparaison met les objectifs déclarés de chaque organisation à côté de sa propre représentation publiée. Des objectifs peuvent viser des niveaux ou des professions où des écarts subsistent, ce que les chiffres globaux ne montrent pas.']},
 {level:'moderate',src:['snps','letters','comparisons'],
  t:['Where organizations reported bias or anti-racism training, fewer racialized employees said they faced bias in staffing','Là où les organisations ont déclaré de la formation sur les préjugés ou la lutte contre le racisme, moins d’employés racisés ont dit avoir fait face à des préjugés en dotation'],
  b:['In the 29 organizations that reported bias or anti-racism training in their 2021 letter or 2024 self-assessment, 15.2% of racialized respondents who took part in an advertised staffing process said they faced biases or barriers that disadvantaged them, on average. In the 18 organizations that did not report such training, the share was 21.8%. The results come from the 2025 Staffing and Non-Partisanship Survey.',
   'Dans les 29 organisations qui ont déclaré de la formation sur les préjugés ou la lutte contre le racisme dans leur lettre de 2021 ou leur autoévaluation de 2024, 15,2 % des répondants racisés ayant participé à un processus de dotation annoncé ont dit avoir fait face à des préjugés ou à des obstacles qui les ont désavantagés, en moyenne. Dans les 18 organisations qui n’ont pas déclaré une telle formation, la part était de 21,8 %. Les résultats proviennent du Sondage sur la dotation et l’impartialité politique de 2025.'],
  e:['The evidence is moderate. The difference holds among organizations of 500 to 4,999 employees (8.5 points) and of 5,000 or more (1.2 points), passes the chance check (p = 0.004) and remains after accounting for size. Most of the training was reported in 2021, four years before the survey, and the survey covers only organizations with enough racialized respondents.',
   'Le niveau de preuve est moyen. L’écart se maintient dans les organisations de 500 à 4 999 employés (8,5 points) et de 5 000 employés ou plus (1,2 point), passe la vérification du hasard (p = 0,004) et demeure après la prise en compte de la taille. La plupart des formations ont été déclarées en 2021, quatre ans avant le sondage, et le sondage ne couvre que les organisations comptant assez de répondants racisés.']},
 {level:'moderate',src:['rep','comparisons'],
  t:['Where organizations reported self-identification campaigns, representation of persons with disabilities rose more','Là où les organisations ont déclaré des campagnes d’auto-identification, la représentation des personnes en situation de handicap a augmenté davantage'],
  b:['In the 16 organizations that reported a self-identification campaign in 2021 or 2024, representation of persons with disabilities rose by 5.4 points from 2021 to 2025, on average, compared with 3.5 points in the 36 organizations that did not.',
   'Dans les 16 organisations qui ont déclaré une campagne d’auto-identification en 2021 ou en 2024, la représentation des personnes en situation de handicap a augmenté de 5,4 points de 2021 à 2025, en moyenne, comparativement à 3,5 points dans les 36 organisations qui ne l’ont pas fait.'],
  e:['The evidence is moderate. The difference holds in each size group, passes the chance check (p = 0.006) and remains after accounting for size and 2021 levels. A campaign can raise representation by encouraging employees who already work there to self-identify, and the data cannot separate this from hiring.',
   'Le niveau de preuve est moyen. L’écart se maintient dans chaque groupe de taille, passe la vérification du hasard (p = 0,006) et demeure après la prise en compte de la taille et des niveaux de 2021. Une campagne peut faire augmenter la représentation en incitant des employés déjà en poste à s’auto-identifier, et les données ne permettent pas de distinguer cet effet de l’embauche.']},
 {level:'moderate',src:['yoy','pses','comparisons'],
  t:['Where 2021 letters described leadership or talent development programs, employees’ views of the Call to Action fell more by 2024','Là où les lettres de 2021 décrivaient des programmes de perfectionnement en leadership ou de gestion des talents, l’opinion des employés sur l’appel à l’action a reculé davantage en 2024'],
  b:['In the 25 organizations whose 2021 letters described leadership or talent development programs, the share of employees who said the Call to Action had a positive impact fell by 8.8 points from 2022 to 2024, on average. In the 52 organizations whose letters did not, it fell by 3.3 points. The first group started slightly higher in 2022 (51.8% compared with 49.6%).',
   'Dans les 25 organisations dont la lettre de 2021 décrivait des programmes de perfectionnement en leadership ou de gestion des talents, la part des employés qui ont dit que l’appel à l’action avait eu une incidence positive a diminué de 8,8 points de 2022 à 2024, en moyenne. Dans les 52 organisations dont la lettre n’en décrivait pas, elle a diminué de 3,3 points. Le premier groupe partait d’un peu plus haut en 2022 (51,8 % comparativement à 49,6 %).'],
  e:['The evidence is moderate. The difference holds in each size group, passes the chance check (p = 0.004) and, after accounting for size and 2022 levels, the drop is still 5.0 points larger. The data do not show why.',
   'Le niveau de preuve est moyen. L’écart se maintient dans chaque groupe de taille, passe la vérification du hasard (p = 0,004) et, après la prise en compte de la taille et des niveaux de 2022, la baisse demeure plus forte de 5,0 points. Les données ne montrent pas pourquoi.']},
 {level:'moderate',src:['pses','comparisons'],
  t:['Where organizations named Black employees in their documents, more employees overall said the Call to Action had a positive impact, and fewer Black employees did','Là où les organisations nommaient les employés noirs dans leurs documents, plus d’employés dans l’ensemble ont dit que l’appel à l’action avait eu une incidence positive, et moins d’employés noirs l’ont dit'],
  b:['In the 58 organizations whose letter or self-assessment named Black employees, 46.7% of employees said the Call to Action had a positive impact in 2024, on average, compared with 42.4% in the 28 organizations that did not. Among Black employees, the shares were 44.5% and 49.1% (44 and 14 organizations with published results for Black employees).',
   'Dans les 58 organisations dont la lettre ou l’autoévaluation nommait les employés noirs, 46,7 % des employés ont dit que l’appel à l’action avait eu une incidence positive en 2024, en moyenne, comparativement à 42,4 % dans les 28 organisations qui ne le faisaient pas. Chez les employés noirs, les parts étaient de 44,5 % et de 49,1 % (44 et 14 organisations ayant des résultats publiés pour les employés noirs).'],
  e:['The evidence is moderate for all employees, because the difference holds in each size group, passes the chance check (p = 0.023) and remains after accounting for size. For Black employees the evidence is limited, because the difference does not hold across size groups or pass the chance check.',
   'Le niveau de preuve est moyen pour l’ensemble des employés, parce que l’écart se maintient dans chaque groupe de taille, passe la vérification du hasard (p = 0,023) et demeure après la prise en compte de la taille. Pour les employés noirs, le niveau de preuve est faible, parce que l’écart ne se maintient pas d’un groupe de taille à l’autre et ne passe pas la vérification du hasard.']},
 {level:'moderate',src:['pses','sa','comparisons'],
  t:['Where a racialized recruitment goal was set, racialized employees were as likely as their colleagues to see opportunities for promotion','Là où un objectif de recrutement d’employés racisés était fixé, les employés racisés étaient aussi nombreux que leurs collègues à voir des possibilités de promotion'],
  b:['In the 50 organizations whose 2024 self-assessment reported that a recruitment goal for racialized employees was set, the share of racialized employees who believe they have opportunities for promotion was 0.2 points higher than among non-racialized employees, on average (2024 survey). In the 14 organizations that had not set such a goal, it was 3.1 points lower.',
   'Dans les 50 organisations dont l’autoévaluation de 2024 indiquait qu’un objectif de recrutement d’employés racisés était fixé, la part des employés racisés qui croient avoir des possibilités de promotion était supérieure de 0,2 point à celle des employés non racisés, en moyenne (sondage de 2024). Dans les 14 organisations qui n’avaient pas fixé un tel objectif, elle était inférieure de 3,1 points.'],
  e:['The evidence is moderate. The difference holds in each size group, passes the chance check (p = 0.035) and remains after accounting for size. The link is indirect, because the goal was about recruitment and the survey question is about promotion. Only 14 organizations had not set a racialized recruitment goal.',
   'Le niveau de preuve est moyen. L’écart se maintient dans chaque groupe de taille, passe la vérification du hasard (p = 0,035) et demeure après la prise en compte de la taille. Le lien est indirect, parce que l’objectif portait sur le recrutement et que la question du sondage porte sur la promotion. Seulement 14 organisations n’avaient pas fixé d’objectif de recrutement d’employés racisés.']},
 {level:'moderate',src:['pses','comparisons'],
  t:['Where organizations reported an employment systems review, more employees said the Call to Action had a positive impact','Là où les organisations ont déclaré une étude des systèmes d’emploi, plus d’employés ont dit que l’appel à l’action avait eu une incidence positive'],
  b:['In the 26 organizations that reported an employment systems review in 2021 or 2024, 48.0% of employees said the Call to Action had a positive impact in 2024, on average, compared with 44.2% in the 60 organizations that did not.',
   'Dans les 26 organisations qui ont déclaré une étude des systèmes d’emploi en 2021 ou en 2024, 48,0 % des employés ont dit que l’appel à l’action avait eu une incidence positive en 2024, en moyenne, comparativement à 44,2 % dans les 60 organisations qui ne l’ont pas fait.'],
  e:['The evidence is moderate. The difference holds in each size group, passes the chance check (p = 0.041) and remains after accounting for size, but it is close to the threshold.',
   'Le niveau de preuve est moyen. L’écart se maintient dans chaque groupe de taille, passe la vérification du hasard (p = 0,041) et demeure après la prise en compte de la taille, mais il est près du seuil.']},
 {level:'limited',src:['rep','form','comparisons'],
  t:['Representation changed by about the same amount after 2023 whether or not an organization had set a recruitment goal','Après 2023, la représentation a varié à peu près autant, qu’une organisation ait fixé un objectif de recrutement ou non'],
  b:['From 2023 to 2025, the years around the 2024 self-assessment, Indigenous representation changed by +0.2 points where a recruitment goal was set (42 organizations) and by −0.3 points where none was set (7). For racialized employees the changes were +2.7 and +2.2 points (43 and 15 organizations), and for Black employees +0.8 and +0.7 points (23 and 29).',
   'De 2023 à 2025, les années qui entourent l’autoévaluation de 2024, la représentation des Autochtones a varié de +0,2 point là où un objectif de recrutement était fixé (42 organisations) et de −0,3 point là où aucun ne l’était (7). Pour les employés racisés, les variations étaient de +2,7 et de +2,2 points (43 et 15 organisations), et pour les employés noirs, de +0,8 et de +0,7 point (23 et 29).'],
  e:['The evidence is limited. None of these differences passes the chance check, and only 7 of the organizations compared had not set an Indigenous recruitment goal.',
   'Le niveau de preuve est faible. Aucun de ces écarts ne passe la vérification du hasard, et seulement 7 des organisations comparées n’avaient pas fixé d’objectif de recrutement d’Autochtones.']},
 {level:'limited',src:['rep','staffingorg','comparisons'],
  t:['Organizations that described targeted recruitment in 2021 did not see clearly larger gains in representation or hiring','Les organisations qui décrivaient du recrutement ciblé en 2021 n’ont pas connu de hausses nettement plus fortes de la représentation ou de l’embauche'],
  b:['In the 28 organizations whose 2021 letters described targeted recruitment, inventories or outreach, racialized representation rose by 5.1 points from 2021 to 2025, on average, compared with 4.5 points in the 26 that did not. Between the three years before the Call to Action (2018-19 to 2020-21) and the three latest years (2022-23 to 2024-25), the share of appointments that went to people who self-identified as members of an employment equity group rose by 9.5 points in these organizations and by 8.9 points in the others (23 organizations in each group).',
   'Dans les 28 organisations dont la lettre de 2021 décrivait du recrutement ciblé, des répertoires ou des activités de sensibilisation, la représentation des employés racisés a augmenté de 5,1 points de 2021 à 2025, en moyenne, comparativement à 4,5 points dans les 26 autres. Entre les trois années qui ont précédé l’appel à l’action (de 2018-2019 à 2020-2021) et les trois dernières années (de 2022-2023 à 2024-2025), la part des nominations de personnes auto-identifiées comme membres d’un groupe visé par l’équité en matière d’emploi a augmenté de 9,5 points dans ces organisations et de 8,9 points dans les autres (23 organisations dans chaque groupe).'],
  e:['The evidence is limited. Neither difference passes the chance check, and the hiring difference does not hold across size groups.',
   'Le niveau de preuve est faible. Aucun des deux écarts ne passe la vérification du hasard, et l’écart sur l’embauche ne se maintient pas d’un groupe de taille à l’autre.']},
 {level:'limited',src:['pses','comparisons'],
  t:['Organizations that reported sponsorship programs did not show clearly better views of promotion opportunities among racialized or Black employees','Les organisations qui ont déclaré des programmes de parrainage n’affichaient pas d’opinions nettement meilleures sur les possibilités de promotion chez les employés racisés ou noirs'],
  b:['In the 42 organizations that reported sponsorship programs in 2021 or 2024, the share of racialized employees who believe they have opportunities for promotion was 0.1 points higher than among non-racialized employees, on average, compared with 0.7 points lower in the 23 organizations that did not. For Black employees, the differences were 0.4 points higher and 3.6 points lower (39 and 19 organizations).',
   'Dans les 42 organisations qui ont déclaré des programmes de parrainage en 2021 ou en 2024, la part des employés racisés qui croient avoir des possibilités de promotion était supérieure de 0,1 point à celle des employés non racisés, en moyenne, comparativement à 0,7 point de moins dans les 23 organisations qui ne l’ont pas fait. Pour les employés noirs, les écarts étaient de 0,4 point de plus et de 3,6 points de moins (39 et 19 organisations).'],
  e:['The evidence is limited. Neither difference passes the chance check, and the difference for Black employees does not hold across size groups.',
   'Le niveau de preuve est faible. Aucun des deux écarts ne passe la vérification du hasard, et l’écart pour les employés noirs ne se maintient pas d’un groupe de taille à l’autre.']},
 {level:'limited',src:['pses','comparisons'],
  t:['Organizations that reported equity commitments in executive performance agreements did not show clearly more positive views of the Call to Action','Les organisations qui ont déclaré des engagements en matière d’équité dans les ententes de rendement des cadres n’affichaient pas d’opinions nettement plus positives sur l’appel à l’action'],
  b:['In the 49 organizations that reported equity commitments in executive performance agreements in 2021 or 2024, 46.9% of employees said the Call to Action had a positive impact in 2024, on average, compared with 43.3% in the 37 organizations that did not.',
   'Dans les 49 organisations qui ont déclaré des engagements en matière d’équité dans les ententes de rendement des cadres en 2021 ou en 2024, 46,9 % des employés ont dit que l’appel à l’action avait eu une incidence positive en 2024, en moyenne, comparativement à 43,3 % dans les 37 organisations qui ne l’ont pas fait.'],
  e:['The evidence is limited. The difference appears only among organizations with fewer than 500 employees and does not pass the chance check.',
   'Le niveau de preuve est faible. L’écart n’apparaît que dans les organisations de moins de 500 employés et ne passe pas la vérification du hasard.']},
];
const frt=s=>s.replace(/(\d) (?=\d{3}(?!\d))/g,'$1'+NB).replace(/ ([:%$])/g,NB+'$1');
let CTA,SER,SN,WS,state={group:'v',filter:'all',q:'',sort:'name',dir:1,org:null,rgroup:'v'};

function num(v,d=1){return Number(v).toLocaleString(fr()?'fr-CA':'en-CA',{minimumFractionDigits:d,maximumFractionDigits:d});}
function pct(v,d=1){return has(v)?num(v,d)+(fr()?NB+'%':'%'):'';}
function pts(v){if(!has(v))return '';const s=num(Math.abs(v),1);return (v>0?'+':v<0?'-':'')+s;}
function ratio(v){return has(v)?num(v,2):'';}
function na(en,f){return '<span class="cta-na">'+esc(tr(en,f))+'</span>';}
function mark(){return ' <span class="cta-mark" aria-hidden="true">▼</span><span class="gcw-sr">'+esc(tr(' marked',' signalé'))+'</span>';}
function name(o){return fr()&&o.name_fr?o.name_fr:o.name_en;}
function siteFR(n){return (fr()&&WS.DEPT_FR&&WS.DEPT_FR[n])||n;}
function local(p){const u=new URL(p,location.href);if(fr())u.searchParams.set('lang','fr');else u.searchParams.delete('lang');return u.pathname.split('/').pop()+u.search+u.hash;}

/* Representation from the Treasury Board departmental tables. */
function rep(o,g,year){
 if(g==='w'){if(year!=='2025'||!o.site_name)return null;const r=(WS.DEPTS||[]).find(x=>x[0]===o.site_name);const w=(WS.DEPT_WFA_2025||{})[o.site_name];return r?{rep:r[2],wfa:w?w.w:null}:null;}
 const s=o.site_name&&SER.orgs[o.site_name];if(!s||!s[g]||!s[g][year])return null;const a=s[g][year];
 return g==='b'?{all:a[0],n:a[1],rep:a[2],wfa:null}:{all:a[0],n:a[1],rep:a[2],wfa:a[3]};
}
function goalStatus(o,g,kind){
 if(!o.self_assessment)return null;if(!g.goal)return 'na';
 const v=o.self_assessment.goals[g.goal+'_'+kind];return v?v.status:'none';
}
function survey(table,key,g){const t=table&&key&&table[key];if(!t)return null;const a=t[g.pses[0]],b=t[g.pses[1]];return {a,b};}
function psesVal(o,g,q){const t=survey(WS.EEG_DEPT,o.pses_name,g);if(!t||!t.a||!t.b||!has(t.a[q])||!has(t.b[q]))return null;return {a:t.a[q],b:t.b[q]};}
function snpsVal(o,g,q){const t=survey(SN.orgs,o.snps_name,g);if(!t||!t.a||!t.b||!has(t.a[q])||!has(t.b[q]))return null;return {a:t.a[q],b:t.b[q]};}
function psesDir(q){return ((WS.PSES_QMETA||{})[q]||['pos'])[0];}
function worse(v,dir){if(!v)return false;const d=v.a-v.b;return dir==='neg'?d>=GAP:d<=-GAP;}

function rowFor(o,g){
 const r21=rep(o,g.k,'2021'),r25=rep(o,g.k,'2025');
 const change=r21&&r25&&has(r21.rep)&&has(r25.rep)?Math.round((r25.rep-r21.rep)*10)/10:null;
 const ratioV=r25&&has(r25.rep)&&has(r25.wfa)&&r25.wfa>0?r25.rep/r25.wfa:null;
 const ps=psesVal(o,g,'Q52'),sn=snpsVal(o,g,'STA_14A');
 const rec=goalStatus(o,g,'recruitment'),pro=goalStatus(o,g,'promotion');
 return {o,r21,r25,change,ratio:ratioV,ps,sn,rec,pro,
  goal:rec==='set'||pro==='set',nogoal:!!o.self_assessment&&g.goal&&rec!=='set'&&pro!=='set'&&rec!=='underway'&&pro!=='underway',
  marked:ratioV!==null&&ratioV<=LOW,down:change!==null&&change<0,
  surveyMarked:worse(ps,'pos')||worse(sn,'neg')};
}
function passes(r){
 const f=state.filter;
 if(state.q){const q=norm(state.q);if(!norm(r.o.name_en).includes(q)&&!norm(r.o.name_fr||'').includes(q))return false;}
 if(f==='goal')return r.goal; if(f==='nogoal')return r.nogoal; if(f==='marked')return r.marked; if(f==='down')return r.down;
 if(f==='survey')return r.surveyMarked; if(f==='goalmarked')return r.goal&&(r.marked||r.surveyMarked); return true;
}
function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}

function statusBadge(s){
 if(s===null)return na('No self-assessment','Aucune autoévaluation');
 if(s==='na')return na('Not asked in 2024','Non demandé en 2024');
 return '<span class="cta-status '+s+'">'+esc(tr(STATUS[s][0],STATUS[s][1]))+'</span>';
}
function pairCell(v,dir){if(!v)return na('Not published','Non publié');return esc(num(v.a,0))+' / '+esc(num(v.b,0))+(worse(v,dir)?mark():'');}
const COLS=[
 ['name',()=>tr('Organization','Organisation')],
 ['docs',()=>tr('Documents','Documents')],
 ['rec',()=>tr('Recruitment goal, 2024','Objectif de recrutement, 2024')],
 ['pro',()=>tr('Promotion goal, 2024','Objectif de promotion, 2024')],
 ['r21',()=>tr('Representation, March 31, 2021','Représentation, 31 mars 2021')],
 ['r25',()=>tr('Representation, March 31, 2025','Représentation, 31 mars 2025')],
 ['change',()=>tr('Change, percentage points','Variation, points de pourcentage')],
 ['wfa',()=>tr('Workforce availability, 2025','Disponibilité de la main-d’œuvre, 2025')],
 ['ratio',()=>tr('2025 representation ÷ availability','Représentation 2025 ÷ disponibilité')],
 ['ps',()=>tr('Call to Action had a positive impact, 2024 survey (group / comparison, %)','L’appel à l’action a eu un effet positif, sondage de 2024 (groupe / comparaison, %)')],
 ['sn',()=>tr('Disadvantaged by biases or barriers in staffing, 2025 survey (group / comparison, %)','Désavantagés par des préjugés ou des obstacles en dotation, sondage de 2025 (groupe / comparaison, %)')],
];
const NUMERIC=new Set(['r21','r25','change','wfa','ratio','ps','sn']);
function sortValue(r,k){
 if(k==='name')return norm(name(r.o));
 if(k==='docs')return (r.o.letter?2:0)+(r.o.self_assessment?1:0);
 if(k==='rec'||k==='pro'){const s=r[k];return s==='set'?3:s==='underway'?2:s==='none'?1:0;}
 if(k==='r21')return r.r21&&has(r.r21.rep)?r.r21.rep:null; if(k==='r25')return r.r25&&has(r.r25.rep)?r.r25.rep:null;
 if(k==='change')return r.change; if(k==='wfa')return r.r25&&has(r.r25.wfa)?r.r25.wfa:null; if(k==='ratio')return r.ratio;
 if(k==='ps')return r.ps?r.ps.a-r.ps.b:null; if(k==='sn')return r.sn?r.sn.a-r.sn.b:null; return null;
}
function cell(r,k,g){
 const o=r.o;
 if(k==='docs'){const p=[];if(o.letter)p.push(tr('Letter','Lettre'));if(o.self_assessment)p.push(tr('Self-assessment','Autoévaluation'));return '<span class="cta-docs">'+esc(p.join(', ')||'')+'</span>';}
 if(k==='rec'||k==='pro')return statusBadge(r[k]);
 if(!o.site_name&&(k==='r21'||k==='r25'||k==='change'||k==='wfa'||k==='ratio'))return k==='r21'?na('Not in the Treasury Board tables','Absente des tableaux du Conseil du Trésor'):'';
 if(k==='r21'||k==='r25'){const v=r[k];if(!v)return na('No data','Aucune donnée');return has(v.rep)?esc(pct(v.rep)):na('Not published','Non publié');}
 if(k==='change')return r.change===null?'':esc(pts(r.change));
 if(k==='wfa'){if(g.k==='b')return na('No benchmark','Aucune valeur de référence');return r.r25&&has(r.r25.wfa)?esc(pct(r.r25.wfa)):'';}
 if(k==='ratio')return r.ratio===null?'':esc(ratio(r.ratio))+(r.ratio<=LOW?mark():'');
 if(k==='ps')return pairCell(r.ps,'pos');
 if(k==='sn')return pairCell(r.sn,'neg');
 return '';
}
function renderCompare(){
 const g=GROUPS.find(x=>x.k===state.group);
 let rows=CTA.organizations.map(o=>rowFor(o,g)).filter(passes);
 const k=state.sort,dir=state.dir;
 rows.sort((a,b)=>{const x=sortValue(a,k),y=sortValue(b,k);if(x===null&&y===null)return norm(name(a.o)).localeCompare(norm(name(b.o)));if(x===null)return 1;if(y===null)return -1;return (x<y?-1:x>y?1:0)*dir||norm(name(a.o)).localeCompare(norm(name(b.o)));});
 $('cta-compare-caption').textContent=tr('2024 goals and published results for ','Objectifs de 2024 et résultats publiés pour les ')+gName(g).replace(/^./,c=>fr()?c.toLowerCase():c);
 $('cta-compare-head').innerHTML='<tr>'+COLS.map(([key,label])=>'<th scope="col"'+(NUMERIC.has(key)?' class="num"':'')+' aria-sort="'+(state.sort===key?(state.dir===1?'ascending':'descending'):'none')+'"><button type="button" class="cta-sort" data-sort="'+key+'">'+esc(label())+'</button></th>').join('')+'</tr>';
 $('cta-compare-body').innerHTML=rows.map(r=>'<tr><th scope="row"><a href="'+esc(local('call-to-action.html?org='+encodeURIComponent(r.o.id)+'#record'))+'" data-org="'+esc(r.o.id)+'">'+esc(name(r.o))+'</a></th>'+COLS.slice(1).map(([key])=>'<td'+(NUMERIC.has(key)?' class="num"':'')+'>'+cell(r,key,g)+'</td>').join('')+'</tr>').join('')||'<tr><td colspan="'+COLS.length+'">'+esc(tr('No organization matches these choices.','Aucune organisation ne correspond à ces choix.'))+'</td></tr>';
 $('cta-count').textContent=tr(rows.length+' of '+CTA.organizations.length+' organizations shown.',rows.length+' organisations affichées sur '+CTA.organizations.length+'.');
 const ps=WS.EEG_DEPT&&WS.EEG_DEPT['Public Service'],sn=SN.orgs['Federal Public Service'],base=SER.orgs['Public Service'];
 const psv=ps&&ps[g.pses[0]]&&ps[g.pses[1]]?ps[g.pses[0]].Q52+' / '+ps[g.pses[1]].Q52:'';
 const snv=sn&&sn[g.pses[0]]&&sn[g.pses[1]]?sn[g.pses[0]].STA_14A+' / '+sn[g.pses[1]].STA_14A:'';
 const b21=base&&base[g.k]&&base[g.k]['2021'],b25=base&&base[g.k]&&base[g.k]['2025'];
 $('cta-compare-note').innerHTML=esc(tr('Comparison group: ','Groupe de comparaison'+NB+': ')+tr(g.cmp[0],g.cmp[1])+'. ')+
  esc(tr('Whole public service: representation ','Ensemble de la fonction publique'+NB+': représentation de ')+(b21?pct(b21[2]):'')+tr(' in 2021 and ',' en 2021 et de ')+(b25?pct(b25[2]):'')+tr(' in 2025',' en 2025')+(g.k!=='b'&&b25?tr(' (availability ',' (disponibilité de ')+pct(b25[3])+')':'')+tr('; Call to Action positive impact ','; effet positif de l’appel à l’action'+NB+': ')+psv+tr('; disadvantaged in staffing ','; désavantagés en dotation'+NB+': ')+snv+'. ')+
  esc(tr('▼ marks representation at 0.85 or less of availability, or a survey result 3 or more points less favourable than the comparison group. This is a screening rule, not a test of statistical significance, and it does not show a cause. Survey cells show the group’s result, then the comparison group’s result.',
   '▼ signale une représentation de 0,85 ou moins de la disponibilité, ou un résultat de sondage moins favorable d’au moins 3 points que celui du groupe de comparaison. C’est une règle de repérage, et non un test de signification statistique; elle n’indique pas la cause. Les cellules de sondage présentent le résultat du groupe, puis celui du groupe de comparaison.'));
 lastRows=rows;
}
let lastRows=[];
function csv(){
 const g=GROUPS.find(x=>x.k===state.group);
 const head=[tr('Organization','Organisation'),tr('2021 letter','Lettre de 2021'),tr('2024 self-assessment','Autoévaluation de 2024'),tr('Recruitment goal 2024','Objectif de recrutement 2024'),tr('Promotion goal 2024','Objectif de promotion 2024'),tr('Representation 2021 (%)','Représentation 2021 (%)'),tr('Representation 2025 (%)','Représentation 2025 (%)'),tr('Change (points)','Variation (points)'),tr('Availability 2025 (%)','Disponibilité 2025 (%)'),tr('Representation / availability 2025','Représentation / disponibilité 2025'),tr('CTA positive impact, group (%)','Effet positif, groupe (%)'),tr('CTA positive impact, comparison (%)','Effet positif, comparaison (%)'),tr('Disadvantaged in staffing, group (%)','Désavantagés en dotation, groupe (%)'),tr('Disadvantaged in staffing, comparison (%)','Désavantagés en dotation, comparaison (%)')];
 const st=s=>s===null?tr('No self-assessment','Aucune autoévaluation'):s==='na'?tr('Not asked','Non demandé'):tr(STATUS[s][0],STATUS[s][1]);
 const lines=[[tr('Group: ','Groupe : ')+gName(g)],head].concat(lastRows.map(r=>[name(r.o),r.o.letter?r.o.letter.url:'',r.o.self_assessment?r.o.self_assessment.url:'',st(r.rec),st(r.pro),r.r21&&has(r.r21.rep)?r.r21.rep:'',r.r25&&has(r.r25.rep)?r.r25.rep:'',r.change??'',r.r25&&has(r.r25.wfa)?r.r25.wfa:'',r.ratio===null?'':r.ratio.toFixed(2),r.ps?r.ps.a:'',r.ps?r.ps.b:'',r.sn?r.sn.a:'',r.sn?r.sn.b:'']));
 const text='﻿'+lines.map(l=>l.map(v=>{v=String(v);if(/^[=+\-@]/.test(v)&&!/^-?\d/.test(v))v="'"+v;return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.download='call-to-action-'+g.k+'-'+(fr()?'fr':'en')+'.csv';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);
}

/* One organization. */
function list(items){return items&&items.length?'<ul class="cta-list">'+items.map(x=>'<li lang="en">'+esc(x)+'</li>').join('')+'</ul>':'';}
function frNote(){return fr()?'<p class="cta-langnote">'+esc('Les résumés des lettres et des autoévaluations sont offerts en anglais seulement. Les documents originaux sont publiés dans les deux langues officielles sur Canada.ca.')+'</p>':'';}
function letterCard(o){
 const le=o.letter;
 if(!le)return '<div class="cta-card"><h3>'+esc(tr('2021 letter','Lettre de 2021'))+'</h3><p>'+esc(tr('No 2021 letter for this organization appears in the Privy Council Office collection.','Aucune lettre de 2021 de cette organisation ne figure dans la collection du Bureau du Conseil privé.'))+'</p></div>';
 return '<div class="cta-card"><h3>'+esc(tr('2021 letter','Lettre de 2021'))+'</h3>'+(le.author?'<p>'+esc(tr('Signed by: ','Signée par'+NB+': '))+'<span lang="en">'+esc(le.author)+'</span></p>':'')+
  '<h4>'+esc(tr('Commitments described in the letter','Engagements décrits dans la lettre'))+'</h4>'+(le.commitments.length?list(le.commitments):'<p>'+esc(tr('The letter lists no commitments.','La lettre n’énumère aucun engagement.'))+'</p>')+
  (le.targets.length?'<h4>'+esc(tr('Numbers and targets stated in the letter','Chiffres et cibles indiqués dans la lettre'))+'</h4>'+list(le.targets):'<p class="cta-small">'+esc(tr('The letter states no numeric representation target.','La lettre n’indique aucune cible chiffrée de représentation.'))+'</p>')+
  '<p><a href="'+esc(le.url)+'" target="_blank" rel="noopener noreferrer">'+esc(tr('Read the full letter on Canada.ca','Lire la lettre complète sur Canada.ca'))+'</a></p></div>';
}
function saCard(o){
 const sa=o.self_assessment;
 if(!sa)return '<div class="cta-card"><h3>'+esc(tr('2024 self-assessment','Autoévaluation de 2024'))+'</h3><p>'+esc(tr('No 2024 self-assessment for this organization appears in the Privy Council Office collection.','Aucune autoévaluation de 2024 de cette organisation ne figure dans la collection du Bureau du Conseil privé.'))+'</p></div>';
 const rows=GROUPS.filter(g=>g.goal).map(g=>{
  const c=k=>{const v=sa.goals[g.goal+'_'+k];return '<td>'+statusBadge(v.status)+(v.text?'<p lang="en">'+esc(v.text)+'</p>':'')+'</td>';};
  return '<tr><th scope="row">'+esc(gName(g,true))+'</th>'+c('recruitment')+c('promotion')+'</tr>';}).join('');
 const inc=sa.goals.inclusion;
 return '<div class="cta-card"><h3>'+esc(tr('2024 self-assessment','Autoévaluation de 2024'))+'</h3>'+
  '<div class="cta-scroll table-scroll" tabindex="0" role="region" aria-label="'+esc(tr('Goals reported in the self-assessment','Objectifs déclarés dans l’autoévaluation'))+'"><table class="cta-goals"><caption>'+esc(tr('Recruitment and promotion goals reported in the self-assessment','Objectifs de recrutement et de promotion déclarés dans l’autoévaluation'))+'</caption><thead><tr><th scope="col">'+esc(tr('Group','Groupe'))+'</th><th scope="col">'+esc(tr('Recruitment','Recrutement'))+'</th><th scope="col">'+esc(tr('Promotion','Promotion'))+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<h4>'+esc(tr('Inclusion goals','Objectifs d’inclusion'))+'</h4><p>'+statusBadge(inc.status)+'</p>'+(inc.text?'<p lang="en">'+esc(inc.text)+'</p>':'')+
  (sa.progress.length?'<h4>'+esc(tr('Progress reported','Progrès déclarés'))+'</h4>'+list(sa.progress):'')+
  (sa.barriers.length?'<h4>'+esc(tr('Barriers named','Obstacles nommés'))+'</h4>'+list(sa.barriers):'')+
  '<p><a href="'+esc(sa.url)+'" target="_blank" rel="noopener noreferrer">'+esc(tr('Read the full self-assessment on Canada.ca','Lire l’autoévaluation complète sur Canada.ca'))+'</a></p></div>';
}
function repTable(o){
 const s=o.site_name&&SER.orgs[o.site_name];
 if(!s)return '<h4>'+esc(tr('Representation','Représentation'))+'</h4><p>'+esc(tr('This organization is not in the Treasury Board departmental tables, which cover the core public administration. Separate agencies publish their own employment equity reports.','Cette organisation ne figure pas dans les tableaux ministériels du Conseil du Trésor, qui portent sur l’administration publique centrale. Les organismes distincts publient leurs propres rapports sur l’équité en matière d’emploi.'))+'</p>';
 const body=GROUPS.map(g=>{
  const v=YEARS.map(y=>rep(o,g.k,y));
  const r21=v[0],r25=v[4];
  const ch=r21&&r25&&has(r21.rep)&&has(r25.rep)?Math.round((r25.rep-r21.rep)*10)/10:null;
  const rt=r25&&has(r25.rep)&&has(r25.wfa)&&r25.wfa>0?r25.rep/r25.wfa:null;
  return '<tr><th scope="row">'+esc(gName(g,true))+'</th>'+v.map(x=>'<td class="num">'+(!x?na('No data','Aucune donnée'):has(x.rep)?esc(pct(x.rep)):na('Not published','Non publié'))+'</td>').join('')+
   '<td class="num">'+(ch===null?'':esc(pts(ch)))+'</td><td class="num">'+(g.k==='b'?na('No benchmark','Aucune'):r25&&has(r25.wfa)?esc(pct(r25.wfa)):'')+'</td><td class="num">'+(rt===null?'':esc(ratio(rt))+(rt<=LOW?mark():''))+'</td></tr>';}).join('');
 const lab=s.labels?Object.entries(s.labels).filter(([y])=>YEARS.includes(y)):[];
 const labNote=lab.length?esc(tr('Treasury Board labels for this row: ','Libellés du Conseil du Trésor pour cette ligne'+NB+': '))+[...new Set(lab.map(([,l])=>l))].map(l=>'<span lang="en">'+esc(l)+'</span>').join(', ')+'. ':'';
 const shared=CTA.organizations.filter(x=>x!==o&&x.site_name===o.site_name);
 const sharedNote=shared.length?esc(tr('Treasury Board publishes one row for this organization and ','Le Conseil du Trésor publie une seule ligne pour cette organisation et ')+shared.map(name).join(tr(' and ',' et '))+tr('. The figures cover the whole row. ','. Les chiffres portent sur l’ensemble de la ligne. ')):'';
 return '<h4>'+esc(tr('Representation, March 31, 2021 to 2025','Représentation, du 31 mars 2021 au 31 mars 2025'))+'</h4>'+
  '<div class="cta-scroll table-scroll" tabindex="0" role="region" aria-label="'+esc(tr('Representation by year','Représentation par année'))+'"><table><caption>'+esc(tr('Representation in ','Représentation à ')+siteFR(o.site_name)+tr(', core public administration',', administration publique centrale'))+'</caption><thead><tr><th scope="col">'+esc(tr('Group','Groupe'))+'</th>'+YEARS.map(y=>'<th scope="col" class="num">'+y+'</th>').join('')+'<th scope="col" class="num">'+esc(tr('Change 2021 to 2025, points','Variation 2021 à 2025, points'))+'</th><th scope="col" class="num">'+esc(tr('Availability, 2025','Disponibilité, 2025'))+'</th><th scope="col" class="num">'+esc(tr('2025 ÷ availability','2025 ÷ disponibilité'))+'</th></tr></thead><tbody>'+body+'</tbody></table></div>'+
  '<p class="cta-small">'+sharedNote+labNote+esc(tr('Each year uses the availability benchmark published with it, and the benchmark changed in 2022 and 2024, so the change since 2021 is a change in representation, not in the gap. Treasury Board publishes no availability benchmark for Black employees.','Chaque année utilise la disponibilité publiée avec elle; la valeur de référence a changé en 2022 et en 2024. La variation depuis 2021 est donc une variation de la représentation, et non de l’écart. Le Conseil du Trésor ne publie aucune disponibilité pour les employés noirs.'))+'</p>';
}
function checksBlock(o){
 const c=CHECKS[o.id];if(!c)return '';
 const lbl={w:['Women','Femmes'],i:['Indigenous Peoples','Peuples autochtones'],v:['Members of visible minorities','Membres des minorités visibles'],d:['Persons with disabilities','Personnes en situation de handicap']};
 const rows=c.items.map(([g,t])=>{const v=rep(o,g,c.year);const target=t==='wfa'?(v&&v.wfa):t;const met=v&&has(v.rep)&&has(target)?v.rep>=target:null;
  return '<tr><th scope="row">'+esc(tr(lbl[g][0],lbl[g][1]))+'</th><td class="num">'+(has(target)?esc(pct(target))+(t==='wfa'?' <span class="cta-small">'+esc(tr('(availability)','(disponibilité)'))+'</span>':''):'')+'</td><td class="num">'+(v&&has(v.rep)?esc(pct(v.rep)):na('Not published','Non publié'))+'</td><td>'+(met===null?'':esc(met?tr('At or above the target','Égale ou supérieure à la cible'):tr('Below the target','Sous la cible'))+(met?'':mark()))+'</td></tr>';}).join('');
 return '<h4>'+esc(tr('Targets in the letter that the tables can check','Cibles de la lettre que les tableaux permettent de vérifier'))+'</h4><p>'+esc(tr(c.en,c.fr))+'</p>'+
  '<div class="cta-scroll table-scroll" tabindex="0" role="region" aria-label="'+esc(tr('Targets and results','Cibles et résultats'))+'"><table><caption>'+esc(tr('Target compared with representation as of March 31, ','Cible comparée à la représentation au 31 mars ')+c.year)+'</caption><thead><tr><th scope="col">'+esc(tr('Group','Groupe'))+'</th><th scope="col" class="num">'+esc(tr('Target','Cible'))+'</th><th scope="col" class="num">'+esc(tr('Representation','Représentation'))+'</th><th scope="col">'+esc(tr('Result','Résultat'))+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function surveyTable(o,kind){
 const g=GROUPS.find(x=>x.k===state.rgroup);
 const isP=kind==='pses',key=isP?o.pses_name:o.snps_name,table=isP?WS.EEG_DEPT:SN.orgs;
 const title=isP?tr('2024 Public Service Employee Survey','Sondage auprès des fonctionnaires fédéraux de 2024'):tr('2025 Staffing and Non-Partisanship Survey','Sondage sur la dotation et l’impartialité politique de 2025');
 if(!key||!table[key])return '<h4>'+esc(title)+'</h4><p>'+esc(tr('No results are published for this organization in this survey.','Aucun résultat n’est publié pour cette organisation dans ce sondage.'))+'</p>';
 const t=table[key],all=isP?(WS.PSES_DEPT||{})[key]:t.all;
 const qs=isP?PSES_Q:SNPS_Q;
 const label=q=>isP?(fr()?(WS.EEG_QMETA_FR||{})[q]:(WS.PSES_QMETA[q]||[])[1]):(fr()?SN.questions[q].fr:SN.questions[q].en);
 const dir=q=>isP?psesDir(q):SN.questions[q].dir;
 const A=t[g.pses[0]],B=t[g.pses[1]];
 const body=qs.map(q=>{const a=A&&has(A[q])?A[q]:null,b=B&&has(B[q])?B[q]:null,d=a!==null&&b!==null?a-b:null,w=d!==null&&(dir(q)==='neg'?d>=GAP:d<=-GAP);
  return '<tr><th scope="row">'+esc(label(q))+(isP?'':'<span class="cta-small"> ('+esc(fr()?SN.questions[q].base_fr:SN.questions[q].base)+')</span>')+'</th><td class="num">'+(a===null?na('Not published','Non publié'):esc(pct(a,0)))+'</td><td class="num">'+(b===null?na('Not published','Non publié'):esc(pct(b,0)))+'</td><td class="num">'+(d===null?'':esc((d>0?'+':d<0?'-':'')+num(Math.abs(d),0))+(w?mark():''))+'</td><td class="num">'+(all&&has(all[q])?esc(pct(all[q],0)):'')+'</td></tr>';}).join('');
 return '<h4>'+esc(title)+'</h4><div class="cta-scroll table-scroll" tabindex="0" role="region" aria-label="'+esc(title)+'"><table><caption>'+esc(gName(g,true)+tr(' compared with ',' comparés aux ')+tr(g.cmp[0],g.cmp[1])+tr(', percentage of respondents',', pourcentage des répondants'))+'</caption><thead><tr><th scope="col">'+esc(tr('Question','Question'))+'</th><th scope="col" class="num">'+esc(gName(g,true))+'</th><th scope="col" class="num">'+esc(tr('Comparison group','Groupe de comparaison'))+'</th><th scope="col" class="num">'+esc(tr('Difference, points','Écart, points'))+'</th><th scope="col" class="num">'+esc(tr('All respondents in this organization','Tous les répondants de l’organisation'))+'</th></tr></thead><tbody>'+body+'</tbody></table></div>'+
  '<p class="cta-small">'+esc(isP?tr('Source: 2024 Public Service Employee Survey results by organization and employee group, as used across this site. ▼ marks a result 3 or more points less favourable than the comparison group.','Source'+NB+': résultats du Sondage auprès des fonctionnaires fédéraux de 2024 par organisation et groupe d’employés, tels qu’utilisés sur ce site. ▼ signale un résultat moins favorable d’au moins 3 points que celui du groupe de comparaison.'):(fr()?SN.method_fr+' '+SN.period_fr+'.':SN.method+' '+SN.period+'.')+' '+tr('A missing result was not published. Results for small groups change more from year to year.','Un résultat absent n’a pas été publié. Les résultats des petits groupes varient davantage d’une année à l’autre.'))+'</p>';
}
function planBlock(o){
 const p=o.plan_name&&(WS.plans||[]).find(x=>x.name===o.plan_name);
 if(!p)return '';
 return '<h4>'+esc(tr('2026–27 departmental plan','Plan ministériel 2026-2027'))+'</h4><p>'+esc(tr('Mentions of six terms in the whole plan. A count measures wording, not a commitment or a result.','Mentions de six termes dans l’ensemble du plan. Un nombre mesure les mots employés, et non un engagement ou un résultat.'))+'</p>'+
  '<p>'+TERMS.map((t,i)=>'<span class="cta-pill">'+esc(tr(t[0],t[1]))+tr(': ',NB+': ')+esc(has(p.t[i])?num(p.t[i],0):tr('not available','non disponible'))+'</span>').join('')+'</p>'+
  '<p><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">'+esc(tr('Read the plan','Lire le plan'))+'</a> · <a href="'+esc(local('departmental-plans-2026-27/index.html?q='+encodeURIComponent(p.name)))+'">'+esc(tr('Compare all plans','Comparer tous les plans'))+'</a></p>';
}
function renderRecord(){
 const o=CTA.organizations.find(x=>x.id===state.org)||CTA.organizations[0];
 state.org=o.id;
 const emp=o.employer==='cpa'?tr('Core public administration: Treasury Board is the employer.','Administration publique centrale'+NB+': le Conseil du Trésor est l’employeur.'):o.employer==='separate'?tr('Separate agency: the organization is its own employer.','Organisme distinct'+NB+': l’organisation est son propre employeur.'):'';
 const exKey=o.site_name||o.pses_name;
 const explorerLink=exKey?'<a class="gcw-btn" href="'+esc(local('explorer.html?org='+encodeURIComponent(exKey)+'#orgprofile'))+'">'+esc(tr('Open this organization’s full data','Ouvrir toutes les données de cette organisation'))+'</a>':'';
 $('cta-record').innerHTML='<div class="cta-card"><h3 id="cta-record-name" tabindex="-1">'+esc(name(o))+'</h3>'+(emp?'<p class="cta-small">'+esc(emp)+'</p>':'')+frNote()+'<p class="cta-small">'+esc(tr('Summaries are short. Read the original document for the full text.','Les résumés sont brefs. Consultez le document original pour le texte intégral.'))+'</p></div>'+
  '<div class="cta-two">'+letterCard(o)+saCard(o)+'</div>'+
  '<div class="cta-card" id="cta-results"><h3>'+esc(tr('What the published data show for this organization','Ce que montrent les données publiées pour cette organisation'))+'</h3>'+repTable(o)+checksBlock(o)+surveyTable(o,'pses')+surveyTable(o,'snps')+planBlock(o)+
   (o.notes?'<h4>'+esc(tr('Other details from the documents','Autres précisions tirées des documents'))+'</h4><p lang="en">'+esc(o.notes)+'</p>':'')+
   '<div class="cta-btnrow">'+explorerLink+'</div></div>';
}

function renderStatic(){
 document.querySelectorAll('[data-i18n]').forEach(el=>{const t=TEXT[el.dataset.i18n];if(t)el.textContent=tr(t[0],t[1]);});
 document.title=tr('Call to Action: commitments and results by organization | GC Equity','Appel à l’action'+NB+': engagements et résultats par organisation | Équité-GC');
 $('cta-search').placeholder=tr('Name or part of a name','Nom ou partie d’un nom');
 $('cta-group').innerHTML=GROUPS.map(g=>'<option value="'+g.k+'"'+(g.k===state.group?' selected':'')+'>'+esc(gName(g))+'</option>').join('');
 $('cta-rgroup').innerHTML=GROUPS.map(g=>'<option value="'+g.k+'"'+(g.k===state.rgroup?' selected':'')+'>'+esc(gName(g,true))+'</option>').join('');
 $('cta-filter').innerHTML=FILTERS.map(f=>'<option value="'+f[0]+'"'+(f[0]===state.filter?' selected':'')+'>'+esc(tr(f[1],f[2]))+'</option>').join('');
 const sorted=[...CTA.organizations].sort((a,b)=>norm(name(a)).localeCompare(norm(name(b))));
 $('cta-org').innerHTML=sorted.map(o=>'<option value="'+esc(o.id)+'"'+(o.id===state.org?' selected':'')+'>'+esc(name(o))+'</option>').join('');
 const withData=CTA.organizations.filter(o=>o.site_name&&SER.orgs[o.site_name]).length;
 $('cta-stats').innerHTML=[[CTA.counts.organizations,tr('organizations','organisations')],[CTA.counts.letters,tr('letters, 2021','lettres, 2021')],[CTA.counts.self_assessments,tr('self-assessments, 2024','autoévaluations, 2024')],[withData,tr('in the Treasury Board departmental tables','dans les tableaux ministériels du Conseil du Trésor')]].map(([n,l])=>'<li><b>'+esc(n)+'</b>'+esc(l)+'</li>').join('');
 $('cta-method').innerHTML=methodHTML();
 $('cta-sources').innerHTML=sourcesHTML();
}
function methodHTML(){
 const items=fr()?[
  'Les engagements, objectifs, progrès et obstacles sont de brefs résumés des documents publiés par le Bureau du Conseil privé. L’état de chaque objectif (fixé, en cours ou aucun indiqué) est tiré de ces résumés. Un objectif inscrit dans un document ne prouve pas qu’il a été atteint.',
  'La représentation provient des tableaux ministériels du Secrétariat du Conseil du Trésor au 31 mars de chaque année. Ils couvrent l’administration publique centrale et reposent sur l’auto-identification volontaire. Les données du Conseil du Trésor emploient le terme de la Loi sur l’équité en matière d’emploi, membres des minorités visibles; ce site parle d’employés racisés.',
  'La disponibilité de la main-d’œuvre a changé en 2022 (ajout des résidents permanents) et en 2024 (Recensement de 2021). Chaque année est comparée à sa propre valeur de référence. La variation de 2021 à 2025 est une variation de la représentation, et non de l’écart.',
  '▼ signale une représentation égale ou inférieure à 0,85 fois la disponibilité, ou un résultat de sondage moins favorable d’au moins 3 points que celui du groupe de comparaison de la même organisation. C’est la règle de repérage utilisée sur tout le site. Ce n’est pas un test de signification statistique, et cela n’établit pas de discrimination ni de cause.',
  'Il n’existe pas de disponibilité de la main-d’œuvre pour les employés noirs, parce qu’ils ne forment pas un groupe désigné distinct en vertu de la Loi. La part des employés noirs est présentée seule.',
  'Les organismes distincts, comme l’Agence du revenu du Canada, l’Agence canadienne d’inspection des aliments et Parcs Canada, ne figurent pas dans les tableaux ministériels. Leurs résultats de sondage sont présentés lorsqu’ils sont publiés.',
  'Le Conseil du Trésor publie une seule ligne pour le Commissariat à l’information et le Commissariat à la protection de la vie privée, et une seule pour Diversification de l’économie de l’Ouest Canada, qui comprend Développement économique Pacifique Canada et Développement économique Canada pour les Prairies. Ces organisations présentent les chiffres de l’ensemble de la ligne.',
  'Une valeur non publiée n’est jamais remplacée par zéro ni estimée. Les petites organisations ont souvent des valeurs supprimées et des résultats qui varient beaucoup d’une année à l’autre.',
  'Les données décrivent la situation avant et après les documents. Elles ne montrent pas si un engagement a causé un changement; l’embauche, les départs et l’auto-identification influent tous sur la représentation.',
  'Pour la section Ce que les données indiquent, chaque type de mesure a été repéré par mots-clés dans les résumés présentés sur cette page, et chaque organisation compte une fois. Chaque écart a été vérifié de trois façons, en se demandant s’il va dans le même sens dans chacun des trois groupes de taille (moins de 500, de 500 à 4'+NB+'999 et 5'+NB+'000 employés ou plus), s’il passe une vérification du hasard qui redistribue 3'+NB+'000 fois les organisations ayant déclaré la mesure, et s’il demeure après la prise en compte de la taille. Un niveau de preuve moyen signifie qu’un écart a passé ces trois vérifications. Un niveau de preuve faible signifie qu’il ne les a pas toutes passées. Le niveau de preuve élevé est réservé aux dénombrements directs tirés des documents et des tableaux publiés, qui ne nécessitent aucun test statistique.'
 ]:[
  'Commitments, goals, progress and barriers are short summaries of the documents the Privy Council Office published. The status of each goal (set, work under way, or none stated) is read from those summaries. A goal stated in a document is not evidence that it was met.',
  'Representation comes from the Treasury Board of Canada Secretariat departmental tables as of March 31 of each year. They cover the core public administration and are based on voluntary self-identification. Treasury Board data use the Employment Equity Act term members of visible minorities; this site says racialized employees.',
  'The workforce availability benchmark changed in 2022 (permanent residents added) and in 2024 (2021 Census). Each year is compared with its own benchmark. The change from 2021 to 2025 is a change in representation, not a change in the gap.',
  '▼ marks representation at 0.85 or less of availability, or a survey result 3 or more points less favourable than the comparison group in the same organization. This is the screening rule used across this site. It is not a test of statistical significance, and it does not establish discrimination or a cause.',
  'There is no workforce availability benchmark for Black employees, because they are not a separate designated group under the Act. The share of Black employees is shown on its own.',
  'Separate agencies, such as the Canada Revenue Agency, the Canadian Food Inspection Agency and Parks Canada, are not in the departmental tables. Their survey results are shown where published.',
  'Treasury Board publishes one row for the Office of the Information Commissioner and the Office of the Privacy Commissioner, and one for Western Economic Diversification Canada, which includes Pacific Economic Development Canada and Prairies Economic Development Canada. Those organizations show the figures for the whole row.',
  'An unpublished value is never replaced with zero or estimated. Small organizations often have suppressed values and results that move a lot from year to year.',
  'The data describe the situation before and after the documents. They do not show whether a commitment caused a change; hiring, departures and self-identification all affect representation.',
  'For What the data point to, each kind of action was found by keyword in the summaries on this page, and each organization counts once. Each difference was checked in three ways, by asking whether it points the same way in each of three size groups (fewer than 500, 500 to 4,999 and 5,000 or more employees), whether it passes a chance check that reshuffles 3,000 times which organizations reported the action, and whether it remains after accounting for size. Moderate evidence means a difference passed all three checks. Limited evidence means it did not pass all of them. Strong evidence is kept for direct counts from the documents and the published tables, which need no statistical test.'
 ];
 return '<ul class="cta-list">'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
}
function sourcesHTML(){
 const L=(u,en,f,ufr)=>'<li><a href="'+esc(fr()&&ufr?ufr:u)+'" target="_blank" rel="noopener noreferrer">'+esc(tr(en,f))+'</a></li>';
 const p=SER.pages;
 return '<ul class="cta-sources">'+
  L('https://www.canada.ca/en/privy-council/corporate/clerk/call-to-action-anti-racism-equity-inclusion-federal-public-service.html','Privy Council Office: Call to Action on Anti-Racism, Equity, and Inclusion in the Federal Public Service','Bureau du Conseil privé'+NB+': appel à l’action en faveur de la lutte contre le racisme, de l’équité et de l’inclusion dans la fonction publique fédérale','https://www.canada.ca/fr/conseil-prive/organisation/greffier/appel-action-faveur-lutte-contre-racisme-equite-inclusion-fonction-publique-federale.html')+
  L('https://www.canada.ca/en/privy-council/corporate/clerk/call-to-action-anti-racism-equity-inclusion-federal-public-service/letters-implementation.html','Privy Council Office: letters on the implementation of the Call to Action (2021)','Bureau du Conseil privé'+NB+': lettres sur la mise en œuvre de l’appel à l’action (2021)','https://www.canada.ca/fr/conseil-prive/organisation/greffier/appel-action-faveur-lutte-contre-racisme-equite-inclusion-fonction-publique-federale/lettres-mise-en-oeuvre.html')+
  L('https://www.canada.ca/en/privy-council/corporate/about-call-action/self-assessment-forward-direction.html','Privy Council Office: responses to the self-assessment on the forward direction of the Call to Action (2024)','Bureau du Conseil privé'+NB+': réponses à l’autoévaluation sur l’orientation future de l’appel à l’action (2024)','https://www.canada.ca/fr/conseil-prive/organisation/a-propos-appel-action/autoevaluation-orientations-suivre.html')+
  L(p.i.url,'Treasury Board: representation of Indigenous Peoples by department or agency, with departmental workforce availability','Conseil du Trésor'+NB+': représentation des Autochtones par ministère ou organisme, avec la disponibilité ministérielle')+
  L(p.v.url,'Treasury Board: representation of members of visible minorities by department or agency, with departmental workforce availability','Conseil du Trésor'+NB+': représentation des membres des minorités visibles par ministère ou organisme, avec la disponibilité ministérielle')+
  L(p.d.url,'Treasury Board: representation of persons with disabilities by department or agency, with departmental workforce availability','Conseil du Trésor'+NB+': représentation des personnes en situation de handicap par ministère ou organisme, avec la disponibilité ministérielle')+
  L(p.b.url,'Treasury Board: members of visible minorities by sub-group and department or agency (Black employees)','Conseil du Trésor'+NB+': membres des minorités visibles par sous-groupe et par ministère ou organisme (employés noirs)')+
  L((WS.sources&&WS.sources.psesData)||'https://open.canada.ca/data/en/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f','2024 Public Service Employee Survey open data','Données ouvertes du Sondage auprès des fonctionnaires fédéraux de 2024','https://ouvert.canada.ca/data/fr/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f')+
  L(fr()?SN.dataset_fr:SN.dataset,'Public Service Commission: 2025 Staffing and Non-Partisanship Survey open data','Commission de la fonction publique'+NB+': données ouvertes du Sondage sur la dotation et l’impartialité politique de 2025')+
  '<li><a href="'+esc(local('staffing.html'))+'">'+esc(tr('Hiring and staffing data from the Public Service Commission, on this site','Données sur l’embauche et la dotation de la Commission de la fonction publique, sur ce site'))+'</a></li>'+
  '</ul><h3>'+esc(tr('Data files used on this page','Fichiers de données utilisés sur cette page'))+'</h3><ul class="cta-sources">'+
  '<li><a href="data/call-to-action-letters.json">call-to-action-letters.json</a>'+esc(tr(': summaries of the 2021 letters and 2024 self-assessments, with links to each original.',NB+': résumés des lettres de 2021 et des autoévaluations de 2024, avec un lien vers chaque original.'))+'</li>'+
  '<li><a href="data/tbs-departmental-representation-2017-2025.json">tbs-departmental-representation-2017-2025.json</a>'+esc(tr(': Treasury Board departmental representation and availability, March 31, 2017 to 2025, read from the four pages above.',NB+': représentation ministérielle et disponibilité du Conseil du Trésor, du 31 mars 2017 au 31 mars 2025, tirées des quatre pages ci-dessus.'))+'</li>'+
  '<li><a href="data/call-to-action-comparisons.json">call-to-action-comparisons.json</a>'+esc(tr(': the findings under What the data point to, with the keywords, size groups, every comparison and the values for each organization.',NB+': les constats de la section Ce que les données indiquent, avec les mots-clés, les groupes de taille, chaque comparaison et les valeurs de chaque organisation.'))+'</li>'+
  '<li><a href="data/snps-2025-by-organization.json">snps-2025-by-organization.json</a>'+esc(tr(': seven staffing questions from the 2025 survey by organization and group, calculated from the Public Service Commission files.',NB+': sept questions sur la dotation tirées du sondage de 2025, par organisation et par groupe, calculées à partir des fichiers de la Commission de la fonction publique.'))+'</li></ul>'+
  '<p class="cta-small">'+esc(tr('Summaries compiled ','Résumés compilés le ')+CTA.compiled+tr('. Treasury Board and survey data retrieved ','. Données du Conseil du Trésor et des sondages récupérées le ')+SER.retrieved+'.')+'</p>';
}

function syncURL(){try{const u=new URL(location.href);u.searchParams.set('org',state.org);if(state.group!=='v')u.searchParams.set('group',state.group);else u.searchParams.delete('group');history.replaceState(history.state,'',u.href);}catch(e){}}
function renderFindings(){
 const host=$('cta-findings');if(!host)return;
 // Pages on this site keep their folder (local() keeps only the file name) and the visitor's language; data files open as they are.
 const rel=p=>{const i=p.search(/[?#]/),base=i<0?p:p.slice(0,i);if(!/\.html$/.test(base))return p;const u=new URL(p,location.href);if(fr())u.searchParams.set('lang','fr');else u.searchParams.delete('lang');return base+u.search+u.hash;};
 const L=k=>{const s=SRC[k],href=s[3]?(s[2].charAt(0)==='#'?s[2]:rel(s[2])):(fr()&&s[4]?s[4]:s[2]);return '<a href="'+esc(href)+'"'+(s[3]?'':' target="_blank" rel="noopener noreferrer"')+'>'+esc(tr(s[0],frt(s[1])))+'</a>';};
 host.innerHTML=FINDINGS.map((f,i)=>'<li class="cta-finding"><p class="cta-rank">'+esc(tr('Priority ','Priorité ')+(i+1))+' <span class="cta-status cta-level">'+esc(tr(LEVEL[f.level][0],LEVEL[f.level][1]))+'</span></p><h3>'+esc(tr(f.t[0],frt(f.t[1])))+'</h3>'+
  '<p>'+esc(tr(f.b[0],frt(f.b[1])))+'</p><p class="cta-small">'+esc(tr(f.e[0],frt(f.e[1])))+'</p>'+
  '<p class="cta-small">'+esc(tr('Sources: ','Sources'+NB+': '))+f.src.map(L).join('; ')+'</p></li>').join('');
}
function render(){renderStatic();renderFindings();renderCompare();renderRecord();}
window._applyLang=function(){render();};

function bind(){
 $('cta-group').addEventListener('change',e=>{state.group=e.target.value;state.rgroup=e.target.value;$('cta-rgroup').value=state.rgroup;renderCompare();renderRecord();syncURL();});
 $('cta-filter').addEventListener('change',e=>{state.filter=e.target.value;renderCompare();});
 $('cta-search').addEventListener('input',e=>{state.q=e.target.value.trim();renderCompare();});
 $('cta-org').addEventListener('change',e=>{state.org=e.target.value;renderRecord();syncURL();});
 $('cta-rgroup').addEventListener('change',e=>{state.rgroup=e.target.value;renderRecord();});
 $('cta-download').addEventListener('click',csv);
 $('cta-compare-head').addEventListener('click',e=>{const b=e.target.closest('[data-sort]');if(!b)return;const k=b.dataset.sort;if(state.sort===k)state.dir*=-1;else{state.sort=k;state.dir=NUMERIC.has(k)?-1:1;}renderCompare();const nb=document.querySelector('[data-sort="'+k+'"]');if(nb)nb.focus();});
 $('cta-compare-body').addEventListener('click',e=>{const a=e.target.closest('a[data-org]');if(!a)return;e.preventDefault();state.org=a.dataset.org;$('cta-org').value=state.org;renderRecord();syncURL();$('record').scrollIntoView();const h=$('cta-record-name');if(h)h.focus({preventScroll:true});});
}
async function load(){
 const get=p=>fetch(new URL(p,location.href)).then(r=>{if(!r.ok)throw Error(p+' '+r.status);return r.json();});
 try{
  [CTA,SER,SN,WS]=await Promise.all([get('data/call-to-action-letters.json'),get('data/tbs-departmental-representation-2017-2025.json'),get('data/snps-2025-by-organization.json'),get('assets/workspace-data.json')]);
 }catch(err){
  // The conclusions do not depend on the data files, so they stay readable if a file cannot be loaded.
  const fail=()=>{document.querySelectorAll('[data-i18n]').forEach(el=>{const t=TEXT[el.dataset.i18n];if(t)el.textContent=tr(t[0],t[1]);});renderFindings();$('cta-loading').textContent=tr('The data could not be loaded. Reload the page to try again.','Les données n’ont pas pu être chargées. Rechargez la page pour réessayer.');};
  fail();window._applyLang=fail;return;
 }
 const p=new URLSearchParams(location.search);
 const org=p.get('org');if(org&&CTA.organizations.some(o=>o.id===org))state.org=org;else if(org){const m=CTA.organizations.find(o=>o.site_name===org||o.pses_name===org||o.name_en===org);if(m)state.org=m.id;}
 const g=p.get('group');if(GROUPS.some(x=>x.k===g)){state.group=g;state.rgroup=g;}
 if(!state.org){const pco=CTA.organizations.find(o=>o.id==='privy-council-office');state.org=(pco||CTA.organizations[0]).id;}
 $('cta-loading').hidden=true;
 render();bind();
 if(location.hash==='#record'&&org)setTimeout(()=>{$('record').scrollIntoView();},60);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
