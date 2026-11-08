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
 findingsIntro:['These conclusions compare what organizations committed to and reported in the Call to Action with what published data show. They are listed by priority: first by how directly they relate to what the Call to Action asked leaders to do (recruit, appoint and sponsor, combat racism and discrimination at work, and measure progress), then by the size of the gap, then by the strength of the evidence. They describe patterns in published data. They do not show that a commitment caused a change, or that discrimination occurred in a particular process or organization.',
  'Ces conclusions comparent ce que les organisations se sont engagées à faire et ont déclaré dans le cadre de l’appel à l’action avec ce que montrent les données publiées. Elles sont classées par priorité'+NB+': d’abord selon leur lien direct avec ce que l’appel à l’action demandait aux leaders (recruter, nommer et parrainer, combattre le racisme et la discrimination au travail, et mesurer les progrès), puis selon l’ampleur de l’écart, puis selon la solidité des données. Elles décrivent des tendances dans les données publiées. Elles ne montrent pas qu’un engagement a causé un changement, ni qu’il y a eu de la discrimination dans un processus ou une organisation en particulier.'],
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
// Conclusions shown under "What the data point to", in priority order. Each figure comes from a data file used on this
// page or on the linked pages; scripts/check-site.py recalculates them and fails if a figure no longer matches the data.
// French strings are written with ordinary spaces; frt() adds the non-breaking spaces of French typography.
// Each source: English label, French label, address, 1 for a page on this site, and the French address of an outside page.
const SRC={
 staffing:['Hiring and staffing data from the Public Service Commission','Données sur l’embauche et la dotation de la Commission de la fonction publique','staffing.html#applicants',1],
 audit:['Public Service Commission: Audit of Employment Equity Representation in Recruitment (2021)','Commission de la fonction publique : Vérification portant sur la représentation des groupes visés par l’équité en matière d’emploi lors du recrutement (2021)','https://www.canada.ca/en/public-service-commission/services/publications/audit-of-employment-equity-representation-in-recruitment.html',0,'https://www.canada.ca/fr/commission-fonction-publique/services/publications/verification-representation-groupes-vises-equite-matiere-demploi-lors-du-recrutement.html'],
 flows:['Data explorer: hiring, promotions and separations','Explorateur de données : embauches, promotions et départs','explorer.html#flows',1],
 pses:['Treasury Board: 2024 Public Service Employee Survey results','Conseil du Trésor : résultats du Sondage auprès des fonctionnaires fédéraux de 2024','https://www.canada.ca/en/treasury-board-secretariat/services/innovation/public-service-employee-survey/2024-25.html',0,'https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/sondage-fonctionnaires-federaux/2024-25.html'],
 psesx:['Data explorer: employee survey','Explorateur de données : sondage auprès des fonctionnaires','explorer.html#pses',1],
 yoy:['Data explorer: changes since the 2022 survey','Explorateur de données : changements depuis le sondage de 2022','explorer.html#yoy',1],
 ex:['Data explorer: executives','Explorateur de données : cadres','explorer.html#ex',1],
 exsrc:['Treasury Board: distribution of executive employees by designated group','Conseil du Trésor : répartition des cadres selon le groupe désigné','https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/distribution-public-service-canada-executive-employees.html',0,'https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/statistiques-ressources-humaines/statistiques-diversite-inclusion/distribution-fonction-publique-canada-cadres-employes.html'],
 snapshot:['Treasury Board: Employment Equity Demographic Snapshot 2024-25','Conseil du Trésor : aperçu démographique de l’équité en matière d’emploi 2024-2025','https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/employment-equity-demographic-snapshot-2024-2025.html',0,'https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/statistiques-ressources-humaines/statistiques-diversite-inclusion/apercu-donnees-demographiques-equite-matiere-emploi-2024-2025.html'],
 sa:['Privy Council Office: responses to the 2024 self-assessment','Bureau du Conseil privé : réponses à l’autoévaluation de 2024','https://www.canada.ca/en/privy-council/corporate/about-call-action/self-assessment-forward-direction.html',0,'https://www.canada.ca/fr/conseil-prive/organisation/a-propos-appel-action/autoevaluation-orientations-suivre.html'],
 form:['Privy Council Office: the 2024 self-assessment questionnaire','Bureau du Conseil privé : questionnaire d’autoévaluation de 2024','https://www.canada.ca/en/privy-council/corporate/about-call-action/message-call-to-action-and-values-ethics-self-assessments/call-to-action-self-assessments.html',0,'https://www.canada.ca/fr/conseil-prive/organisation/a-propos-appel-action/message-autoevaluations-appel-action-et-valeurs-ethique/autoevaluations-appel-action.html'],
 indig:['Data explorer: Indigenous Peoples','Explorateur de données : Autochtones','explorer.html#indigenous',1],
 black:['Data explorer: Black employees','Explorateur de données : employés noirs','explorer.html#black',1],
 salary:['Data explorer: salary','Explorateur de données : rémunération','explorer.html#salary',1],
 rep:['Treasury Board: representation and workforce availability','Conseil du Trésor : représentation et disponibilité au sein de la population active','https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/representation-public-service-canada-designated-group-fiscal-year-workforce-availability-estimates.html',0,'https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/statistiques-ressources-humaines/statistiques-diversite-inclusion/representation-groupes-designes-fonction-publique-canada-exercice-estimations-disponibilite-sein-population-active.html'],
 compare:['Compare organizations, on this page','Comparer les organisations, sur cette page','#compare',1],
 method:['How to read this page','Comment lire cette page','#method',1],
 plans:['Term mentions in departmental plans, 2026-27','Mentions de termes dans les plans ministériels, 2026-2027','departmental-plans-2026-27/index.html',1],
};
const LEVEL={strong:['Strong evidence','Niveau de preuve élevé'],moderate:['Moderate evidence','Niveau de preuve moyen'],limited:['Limited evidence','Niveau de preuve faible']};
const FINDINGS=[
 {level:'strong',src:['staffing','audit','flows'],
  t:['Racialized and Black candidates make up a smaller share of people appointed than of people who apply','Les candidats racisés et noirs représentent une plus petite part des personnes nommées que des personnes qui postulent'],
  b:['In every year from 2013-14 to 2022-23, members of visible minorities made up a smaller share of appointments to the public service than of applicants to advertised processes. In 2022-23, they were 30.6% of applicants and 26.9% of appointments. When the Public Service Commission followed 15,285 applications through each hiring stage, in processes that closed in 2016-17, the share of Black candidates fell from 10.3% of applications to 6.6% of appointments. The share of members of visible minorities fell from 30.4% to 24.7%.',
   'Chaque année de 2013-2014 à 2022-2023, les membres des minorités visibles représentaient une plus petite part des nominations à la fonction publique que des postulants aux processus annoncés. En 2022-2023, ils formaient 30,6 % des postulants et 26,9 % des nominations. Lorsque la Commission de la fonction publique a suivi 15 285 candidatures à chaque étape de l’embauche, dans des processus clos en 2016-2017, la part des candidats noirs est passée de 10,3 % des candidatures à 6,6 % des nominations. La part des membres des minorités visibles est passée de 30,4 % à 24,7 %.'],
  e:['The evidence is strong on the direction of the gap, because two Commission sources measured in different ways point the same way. The annual tables count applicants and appointees with different self-identification sources, so the size of the gap is approximate. For Indigenous candidates and persons with disabilities, the two sources differ. The audit found that their shares fell by the appointment stage (from 3.5% to 2.9%, and from 4.4% to 2.4%), while the annual tables show higher shares among appointments than among applicants. The audit predates the Call to Action, and the annual tables end in 2022-23.',
   'Le niveau de preuve est élevé quant au sens de l’écart, parce que deux sources de la Commission, mesurées de façons différentes, vont dans le même sens. Les tableaux annuels dénombrent les postulants et les personnes nommées à partir de sources d’auto-identification différentes; l’ampleur de l’écart est donc approximative. Pour les candidats autochtones et les personnes en situation de handicap, les deux sources diffèrent. L’audit a constaté que leur part diminuait avant la nomination (de 3,5 % à 2,9 %, et de 4,4 % à 2,4 %), tandis que les tableaux annuels montrent des parts plus élevées parmi les nominations que parmi les postulants. L’audit est antérieur à l’appel à l’action, et les tableaux annuels s’arrêtent en 2022-2023.']},
 {level:'strong',src:['pses','psesx'],
  t:['The largest gaps in workplace experience are on racism, harassment and discrimination','Les plus grands écarts dans l’expérience au travail touchent le racisme, le harcèlement et la discrimination'],
  b:['In the 2024 Public Service Employee Survey, 51% of Black employees said they would feel safe speaking about racism without fear of reprisal, compared with 78% of non-racialized employees. Black employees were also more likely to say they had been a victim of discrimination in the past 12 months (15%, compared with 8%). Persons with disabilities reported the highest rates of harassment (22%) and discrimination (21%), compared with 10% and 7% of employees without disabilities. Indigenous employees reported rates of 20% and 16%, compared with 11% and 9% of non-Indigenous employees.',
   'Dans le Sondage auprès des fonctionnaires fédéraux de 2024, 51 % des employés noirs ont dit qu’ils se sentiraient en sécurité de parler de racisme sans crainte de représailles, comparativement à 78 % des employés non racisés. Les employés noirs étaient aussi plus nombreux à dire avoir été victimes de discrimination au cours des 12 derniers mois (15 %, comparativement à 8 %). Les personnes en situation de handicap ont déclaré les taux les plus élevés de harcèlement (22 %) et de discrimination (21 %), comparativement à 10 % et 7 % des employés sans handicap. Les employés autochtones ont déclaré des taux de 20 % et 16 %, comparativement à 11 % et 9 % des employés non autochtones.'],
  e:['The evidence is strong. These are results for the whole public service, and the differences range from 7 to 27 percentage points. They are what employees reported, and the survey does not show where the experiences happened or what caused them.',
   'Le niveau de preuve est élevé. Il s’agit de résultats pour l’ensemble de la fonction publique, et les écarts vont de 7 à 27 points de pourcentage. Ces résultats reflètent ce que les employés ont déclaré, et le sondage ne montre pas où les expériences ont eu lieu ni ce qui les a causées.']},
 {level:'strong',src:['ex','exsrc','sa','flows'],
  t:['Racialized and Black employees remain less represented among executives, and fewer organizations set promotion goals than recruitment goals','Les employés racisés et noirs demeurent moins représentés parmi les cadres, et moins d’organisations ont fixé des objectifs de promotion que de recrutement'],
  b:['On March 31, 2025, racialized employees were 23.9% of employees and 17.3% of executives. Black employees were 5.1% of employees and 3.2% of executives. In the 2024 self-assessments, organizations reported promotion goals about half as often as recruitment goals (35 compared with 70 of 91 for Indigenous employees, 33 compared with 62 for racialized employees, and 19 compared with 38 for Black employees). In 2024-25, racialized employees received 25.4% of promotions and Black employees 5.8%, above their shares of employees.',
   'Au 31 mars 2025, les employés racisés formaient 23,9 % de l’effectif et 17,3 % des cadres. Les employés noirs formaient 5,1 % de l’effectif et 3,2 % des cadres. Dans les autoévaluations de 2024, les organisations ont déclaré des objectifs de promotion environ deux fois moins souvent que des objectifs de recrutement (35 contre 70 sur 91 pour les employés autochtones, 33 contre 62 pour les employés racisés et 19 contre 38 pour les employés noirs). En 2024-2025, les employés racisés ont obtenu 25,4 % des promotions et les employés noirs, 5,8 %, soit plus que leur part de l’effectif.'],
  e:['The evidence is strong for the gaps. Racialized executives are above the availability estimate for executive jobs (15.6%), so the gap is between their share of executives and their share of the workforce. There is no availability estimate for Black employees. One year of promotion data cannot show whether the executive gap is closing.',
   'Le niveau de preuve est élevé en ce qui concerne les écarts. La part des cadres racisés dépasse l’estimation de la disponibilité pour les postes de direction (15,6 %); l’écart se situe donc entre leur part des cadres et leur part de l’effectif. Il n’existe pas d’estimation de la disponibilité pour les employés noirs. Une seule année de données sur les promotions ne permet pas de savoir si l’écart chez les cadres se réduit.']},
 {level:'strong',src:['indig','rep','sa'],
  t:['Indigenous recruitment was the goal set most often, but Indigenous representation changed the least','Le recrutement d’Autochtones est l’objectif le plus souvent fixé, mais la représentation des Autochtones est celle qui a le moins changé'],
  b:['Of the 91 organizations that completed a self-assessment, 70 reported an Indigenous recruitment goal, more than for any other group. Indigenous representation in the core public administration rose from 5.2% in 2021 to 5.5% in 2025, the smallest increase of the four groups on this page, and it fell in 16 of the 52 organizations with published values for both years. In 2024-25, Indigenous employees made up 4.4% of people hired and 5.9% of people who left, compared with 5.5% of employees. There were 458 Inuit employees in 2025, 0.2% of the workforce.',
   'Sur les 91 organisations qui ont rempli une autoévaluation, 70 ont déclaré un objectif de recrutement d’Autochtones, plus que pour tout autre groupe. La représentation des Autochtones dans l’administration publique centrale est passée de 5,2 % en 2021 à 5,5 % en 2025, la plus faible hausse des quatre groupes présentés sur cette page, et elle a diminué dans 16 des 52 organisations ayant des valeurs publiées pour les deux années. En 2024-2025, les employés autochtones représentaient 4,4 % des personnes embauchées et 5,9 % des personnes qui sont parties, comparativement à 5,5 % de l’effectif. On comptait 458 employés inuits en 2025, soit 0,2 % de l’effectif.'],
  e:['The evidence is strong. Indigenous representation remains above the availability estimate of 4.0%, so the finding concerns the pace of change. Hiring and departure shares are for one year.',
   'Le niveau de preuve est élevé. La représentation des Autochtones demeure supérieure à l’estimation de la disponibilité de 4,0 %; la conclusion porte donc sur le rythme du changement. Les parts des embauches et des départs portent sur une seule année.']},
 {level:'strong',src:['compare','rep','sa'],
  t:['Representation rose for all three groups in most organizations, but four remain below their own availability for every group','La représentation a augmenté pour les trois groupes dans la plupart des organisations, mais quatre demeurent sous leur propre disponibilité pour chaque groupe'],
  b:['Of the 50 organizations with published values for Indigenous employees, persons with disabilities and racialized employees in both 2021 and 2025, 33 saw representation rise for all three groups and none saw it fall for all three. In 2025, four organizations were below their own availability for all three groups: National Defence (civilian staff), the Royal Canadian Mounted Police (public service employees), Veterans Affairs Canada and the Secretariat of the National Security and Intelligence Committee of Parliamentarians. In their 2024 self-assessments, National Defence, the Royal Canadian Mounted Police and Veterans Affairs Canada each reported recruitment goals for Indigenous and racialized employees. The Secretariat did not complete a self-assessment.',
   'Sur les 50 organisations ayant des valeurs publiées pour les employés autochtones, les personnes en situation de handicap et les employés racisés en 2021 et en 2025, 33 ont vu leur représentation augmenter pour les trois groupes, et aucune ne l’a vue diminuer pour les trois. En 2025, quatre organisations se situaient sous leur propre disponibilité pour les trois groupes : la Défense nationale (personnel civil), la Gendarmerie royale du Canada (employés de la fonction publique), Anciens Combattants Canada et le Secrétariat du Comité des parlementaires sur la sécurité nationale et le renseignement. Dans leur autoévaluation de 2024, la Défense nationale, la Gendarmerie royale du Canada et Anciens Combattants Canada ont chacun déclaré des objectifs de recrutement pour les employés autochtones et racisés. Le Secrétariat n’a pas rempli d’autoévaluation.'],
  e:['The evidence is strong for the three large organizations, which together employ more than 42,000 people. The Secretariat has 8 employees, so its figures can change with a single hire. Representation below availability shows where to look more closely. It does not show the cause.',
   'Le niveau de preuve est élevé pour les trois grandes organisations, qui emploient ensemble plus de 42 000 personnes. Le Secrétariat compte 8 employés; ses chiffres peuvent donc changer avec une seule embauche. Une représentation inférieure à la disponibilité indique où regarder de plus près. Elle n’en montre pas la cause.']},
 {level:'strong',src:['black','salary','snapshot'],
  t:['More Black employees work in the public service, but a smaller share of them earn $100,000 or more','Plus d’employés noirs travaillent dans la fonction publique, mais une plus petite part d’entre eux gagne 100 000 $ ou plus'],
  b:['Black representation in the core public administration rose from 3.8% in 2021 to 5.1% in 2025, and it rose in 47 of the 52 organizations with published values for both years. On March 31, 2025, 28.5% of Black employees earned $100,000 or more, compared with 41.5% of all employees, and 40.8% were in the $50,000 to $74,999 band, compared with 27.9%. Of the 91 self-assessments, 39 reported a recruitment or promotion goal for Black employees.',
   'La représentation des employés noirs dans l’administration publique centrale est passée de 3,8 % en 2021 à 5,1 % en 2025, et elle a augmenté dans 47 des 52 organisations ayant des valeurs publiées pour les deux années. Au 31 mars 2025, 28,5 % des employés noirs gagnaient 100 000 $ ou plus, comparativement à 41,5 % de l’ensemble des employés, et 40,8 % se situaient dans la tranche de 50 000 $ à 74 999 $, comparativement à 27,9 %. Sur les 91 autoévaluations, 39 déclaraient un objectif de recrutement ou de promotion pour les employés noirs.'],
  e:['The evidence is strong for the pattern. There is no availability estimate for Black employees, so representation cannot be compared with a benchmark. The salary tables do not show why the distributions differ. Occupation, level and years of service all affect pay.',
   'Le niveau de preuve est élevé quant à la tendance. Il n’existe pas d’estimation de la disponibilité pour les employés noirs; la représentation ne peut donc pas être comparée à une valeur de référence. Les tableaux salariaux ne montrent pas pourquoi les répartitions diffèrent. La profession, le niveau et les années de service influent tous sur la rémunération.']},
 {level:'strong',src:['rep','psesx','form'],
  t:['Persons with disabilities are the only designated group below availability, and report the least favourable workplace experience','Les personnes en situation de handicap forment le seul groupe désigné sous la disponibilité, et elles déclarent l’expérience au travail la moins favorable'],
  b:['Representation of persons with disabilities rose from 5.6% in 2021 to 9.0% in 2025. The largest increase was in the other disability category, which includes mental health-related, cognitive and chronic conditions where published (3.7% to 6.9%). The availability estimate rose to 12.0% in 2024, when Treasury Board began using the 2022 Canadian Survey on Disability. In 2025, 35 of 63 organizations were at 0.85 or less of their own availability. Persons with disabilities were the least likely to believe they have opportunities for promotion (42%, compared with 54% of employees without disabilities). The 2024 self-assessment asked about recruitment and promotion goals for Indigenous, Black and other racialized people only.',
   'La représentation des personnes en situation de handicap est passée de 5,6 % en 2021 à 9,0 % en 2025. La plus forte hausse touche la catégorie des autres handicaps, qui comprend les troubles liés à la santé mentale, les troubles cognitifs et les maladies chroniques lorsqu’ils sont publiés (de 3,7 % à 6,9 %). L’estimation de la disponibilité est passée à 12,0 % en 2024, lorsque le Conseil du Trésor a commencé à utiliser l’Enquête canadienne sur l’incapacité de 2022. En 2025, 35 des 63 organisations se situaient à 0,85 ou moins de leur propre disponibilité. Les personnes en situation de handicap étaient les moins nombreuses à croire avoir des possibilités de promotion (42 %, comparativement à 54 % des employés sans handicap). L’autoévaluation de 2024 portait seulement sur les objectifs de recrutement et de promotion des Autochtones, des personnes noires et des autres personnes racisées.'],
  e:['The evidence is strong. Representation relies on employees choosing to self-identify, and availability comes from the Canadian Survey on Disability, so the two are measured differently.',
   'Le niveau de preuve est élevé. La représentation dépend de l’auto-identification volontaire des employés, et la disponibilité provient de l’Enquête canadienne sur l’incapacité; les deux sont donc mesurées différemment.']},
 {level:'moderate',src:['compare','form','rep'],
  t:['Representation rose by about the same amount whether or not an organization reported a goal','La représentation a augmenté à peu près autant, qu’une organisation ait déclaré un objectif ou non'],
  b:['From 2021 to 2025, racialized representation rose by an average of 4.9 percentage points in the 42 organizations whose 2024 self-assessment reported a recruitment or promotion goal for racialized employees, and by 5.0 points in the 15 that did not. For Black employees, the average rise was 1.5 points in both groups (24 and 26 organizations). For Indigenous employees, it was 0.3 points where a goal was reported (42 organizations) and 0.0 points where none was (7).',
   'De 2021 à 2025, la représentation des employés racisés a augmenté en moyenne de 4,9 points de pourcentage dans les 42 organisations dont l’autoévaluation de 2024 déclarait un objectif de recrutement ou de promotion pour les employés racisés, et de 5,0 points dans les 15 autres. Pour les employés noirs, la hausse moyenne était de 1,5 point dans les deux groupes (24 et 26 organisations). Pour les employés autochtones, elle était de 0,3 point lorsqu’un objectif était déclaré (42 organisations) et de 0,0 point sinon (7).'],
  e:['The evidence is moderate. This is a simple comparison of averages that does not account for organization size, starting point or the number of people hired. The self-assessment asked about goals for 2023-24 or later years, so much of the period compared came before those goals. Organizations that share one row in the Treasury Board tables are left out.',
   'Le niveau de preuve est moyen. Il s’agit d’une simple comparaison de moyennes qui ne tient pas compte de la taille des organisations, de leur point de départ ni du nombre de personnes embauchées. L’autoévaluation portait sur les objectifs pour 2023-2024 ou les années suivantes; une bonne partie de la période comparée précède donc ces objectifs. Les organisations qui partagent une même ligne dans les tableaux du Conseil du Trésor sont exclues.']},
 {level:'moderate',src:['yoy','pses'],
  t:['Fewer employees said the Call to Action had a positive impact in 2024 than in 2022','En 2024, moins d’employés qu’en 2022 ont dit que l’appel à l’action avait eu une incidence positive'],
  b:['In the Public Service Employee Survey, the share of employees who said the Call to Action has had a positive impact fell from 49% in 2022 to 43% in 2024. Related results also fell, including feeling safe speaking about racism without fear of reprisal (77% to 72%) and agreeing that the department implements anti-racism initiatives (69% to 65%). In 2024, Black employees (50%) and racialized employees (49%) were more likely than non-racialized employees (43%) to say the Call to Action had a positive impact. Persons with disabilities (37%) and Indigenous employees (39%) were less likely than their comparison groups (45% and 44%).',
   'Dans le Sondage auprès des fonctionnaires fédéraux, la part des employés qui ont dit que l’appel à l’action avait eu une incidence positive est passée de 49 % en 2022 à 43 % en 2024. Des résultats connexes ont aussi diminué, dont le fait de se sentir en sécurité de parler de racisme sans crainte de représailles (de 77 % à 72 %) et d’être d’accord pour dire que le ministère met en œuvre des initiatives de lutte contre le racisme (de 69 % à 65 %). En 2024, les employés noirs (50 %) et les employés racisés (49 %) étaient plus nombreux que les employés non racisés (43 %) à dire que l’appel à l’action avait eu une incidence positive. Les personnes en situation de handicap (37 %) et les employés autochtones (39 %) l’étaient moins que leurs groupes de comparaison (45 % et 44 %).'],
  e:['The evidence is moderate. These are two survey cycles, and most other results also fell between 2022 and 2024, including feeling valued at work (72% to 67%).',
   'Le niveau de preuve est moyen. Il s’agit de deux cycles du sondage, et la plupart des autres résultats ont aussi diminué de 2022 à 2024, dont le sentiment d’être valorisé au travail (de 72 % à 67 %).']},
 {level:'strong',src:['rep','compare','flows'],
  t:['Racialized representation rose in almost every organization, and so did its benchmark','La représentation des employés racisés a augmenté dans presque toutes les organisations, tout comme sa valeur de référence'],
  b:['Racialized representation rose from 18.9% in 2021 to 23.9% in 2025, and it rose in 57 of the 60 organizations with published values for both years. In 2024-25, racialized employees made up 27.2% of people hired and 16.6% of people who left. The availability estimate rose from 15.7% to 22.7% when Treasury Board added permanent residents in 2022 and began using the 2021 Census in 2024. In 2025, 12 of 67 organizations were at 0.85 or less of their own availability, compared with 8 of 60 in 2021.',
   'La représentation des employés racisés est passée de 18,9 % en 2021 à 23,9 % en 2025, et elle a augmenté dans 57 des 60 organisations ayant des valeurs publiées pour les deux années. En 2024-2025, les employés racisés représentaient 27,2 % des personnes embauchées et 16,6 % des personnes qui sont parties. L’estimation de la disponibilité est passée de 15,7 % à 22,7 % lorsque le Conseil du Trésor a ajouté les résidents permanents en 2022, puis a commencé à utiliser le Recensement de 2021 en 2024. En 2025, 12 des 67 organisations se situaient à 0,85 ou moins de leur propre disponibilité, comparativement à 8 sur 60 en 2021.'],
  e:['The evidence is strong for the rise in representation. Because the benchmark rose, an organization could fall below it without its representation going down.',
   'Le niveau de preuve est élevé en ce qui concerne la hausse de la représentation. Comme la valeur de référence a augmenté, une organisation pouvait passer sous celle-ci sans que sa représentation diminue.']},
 {level:'strong',src:['method','sa','staffing'],
  t:['Gaps in the data make progress hard to track, and organizations said so','Des lacunes dans les données rendent les progrès difficiles à suivre, et les organisations l’ont signalé'],
  b:['In the summaries of the 2024 self-assessments, 64 of 91 organizations named a data problem among their barriers, such as missing disaggregated data or out-of-date self-identification. Of the 100 organizations on this page, 28 are not in the Treasury Board departmental tables, 9 have a 2021 letter but no 2024 self-assessment, and 10 have a self-assessment but no letter. There is no availability estimate for Black employees, and the Public Service Commission’s annual tables on applicants and appointments by group end in 2022-23.',
   'Dans les résumés des autoévaluations de 2024, 64 des 91 organisations mentionnaient un problème de données parmi leurs obstacles, par exemple l’absence de données désagrégées ou une auto-identification qui n’est pas à jour. Sur les 100 organisations présentées sur cette page, 28 ne figurent pas dans les tableaux ministériels du Conseil du Trésor, 9 ont une lettre de 2021 mais pas d’autoévaluation de 2024, et 10 ont une autoévaluation mais pas de lettre. Il n’existe pas d’estimation de la disponibilité pour les employés noirs, et les tableaux annuels de la Commission de la fonction publique sur les postulants et les nominations selon le groupe s’arrêtent en 2022-2023.'],
  e:['The evidence is strong, because these are counts of what is and is not published. The count of data barriers is based on the short summaries of the self-assessments on this page.',
   'Le niveau de preuve est élevé, parce qu’il s’agit de dénombrements de ce qui est publié ou non. Le nombre d’obstacles liés aux données repose sur les brefs résumés des autoévaluations présentés sur cette page.']},
 {level:'limited',src:['plans'],
  t:['Departmental plans for 2026-27 mention inclusion and diversity far more often than anti-racism','Les plans ministériels de 2026-2027 mentionnent l’inclusion et la diversité beaucoup plus souvent que la lutte contre le racisme'],
  b:['In the English text of the 90 departmental plans for 2026-27 on this site, words for inclusion appear 1,156 times and words for diversity 1,031 times, and both appear in every plan. Words for anti-racism appear 83 times, in 27 of the 90 plans.',
   'Dans le texte anglais des 90 plans ministériels de 2026-2027 présentés sur ce site, les mots liés à l’inclusion figurent 1 156 fois et ceux liés à la diversité, 1 031 fois, et les deux figurent dans chaque plan. Les mots liés à la lutte contre le racisme figurent 83 fois, dans 27 des 90 plans.'],
  e:['The evidence is limited. Counts describe the wording of the plans. They do not measure actions, spending or results.',
   'Le niveau de preuve est faible. Les comptes décrivent la formulation des plans. Ils ne rendent pas compte des actions, des dépenses ni des résultats.']},
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
  'Les conclusions de la section Ce que les données indiquent utilisent aussi les données de la Commission de la fonction publique sur les postulants et les nominations, les résultats du Sondage auprès des fonctionnaires fédéraux de 2022 et de 2024, les tableaux du Conseil du Trésor sur l’équité en matière d’emploi pour 2024-2025 (cadres, embauches, promotions, départs et salaires), et les mentions de termes dans les plans ministériels de 2026-2027.'
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
  'The conclusions under What the data point to also use the Public Service Commission’s data on applicants and appointments, the 2022 and 2024 Public Service Employee Survey results, Treasury Board employment equity tables for 2024-25 (executives, hiring, promotions, departures and salaries), and term mentions in the 2026-27 departmental plans.'
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
  '<li><a href="data/snps-2025-by-organization.json">snps-2025-by-organization.json</a>'+esc(tr(': seven staffing questions from the 2025 survey by organization and group, calculated from the Public Service Commission files.',NB+': sept questions sur la dotation tirées du sondage de 2025, par organisation et par groupe, calculées à partir des fichiers de la Commission de la fonction publique.'))+'</li></ul>'+
  '<p class="cta-small">'+esc(tr('Summaries compiled ','Résumés compilés le ')+CTA.compiled+tr('. Treasury Board and survey data retrieved ','. Données du Conseil du Trésor et des sondages récupérées le ')+SER.retrieved+'.')+'</p>';
}

function syncURL(){try{const u=new URL(location.href);u.searchParams.set('org',state.org);if(state.group!=='v')u.searchParams.set('group',state.group);else u.searchParams.delete('group');history.replaceState(history.state,'',u.href);}catch(e){}}
function renderFindings(){
 const host=$('cta-findings');if(!host)return;
 // Pages on this site keep their folder (local() keeps only the file name) and the visitor's language.
 const rel=p=>{const i=p.search(/[?#]/),u=new URL(p,location.href);if(fr())u.searchParams.set('lang','fr');else u.searchParams.delete('lang');return (i<0?p:p.slice(0,i))+u.search+u.hash;};
 const L=k=>{const s=SRC[k],href=s[3]?(s[2].charAt(0)==='#'?s[2]:rel(s[2])):(fr()&&s[4]?s[4]:s[2]);return '<a href="'+esc(href)+'"'+(s[3]?'':' target="_blank" rel="noopener noreferrer"')+'>'+esc(tr(s[0],frt(s[1])))+'</a>';};
 host.innerHTML=FINDINGS.map((f,i)=>'<li class="cta-finding"><p class="cta-rank">'+esc(tr('Priority ','Priorité ')+(i+1))+'</p><h3>'+esc(tr(f.t[0],frt(f.t[1])))+'</h3>'+
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
