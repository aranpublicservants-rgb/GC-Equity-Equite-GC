/* Shared departmental evidence workspace for the GC Equity department evidence explorer and the history timeline.
   Each figure stays within its own organization, source, population and period. Nothing typed by visitors is stored or sent. */
(function() {
 "use strict";
 const script = document.currentScript,
  root = new URL("../", script.src),
  slug = location.pathname.replace(/\/index\.html$/, "/").split("/").filter(Boolean).slice(-1)[0],
  params = new URLSearchParams(location.search);
 const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
 } [c]));
 const fr = () => document.documentElement.lang.startsWith("fr"),
  L = (a, b) => fr() ? b : a,
  t = a => a[fr() ? 1 : 0],
  norm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
 const val = x => x === null || x === undefined || String(x).trim() === "" || /^(x|9999|-1|suppressed|n\/a)$/i.test(String(x).trim()) || !Number.isFinite(
  Number(x)) ? null : Number(x);
 const NA = () => L("Not published", "Non publié"),
  isNA = v => v === null || v === undefined || v === "" || v === String.fromCharCode(8212) || v === "Not published" || v === "Non publié";
 const loc = () => fr() ? "fr-CA" : "en-CA",
  pctTxt = (v, digits) => v.toLocaleString(loc(), digits === undefined ? {
   maximumFractionDigits: 2
  } : {
   minimumFractionDigits: digits,
   maximumFractionDigits: digits
  }) + (fr() ? "\u00a0%" : "%");
 const pct = x => val(x) === null ? NA() : pctTxt(val(x));
 const num = x => val(x) === null ? NA() : val(x).toLocaleString(loc(), {
  maximumFractionDigits: 2
 });
 const signed = (x, digits = 1) => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toLocaleString(loc(), {
  maximumFractionDigits: digits
 });
 const diff = (a, b) => val(a) === null || val(b) === null ? null : Math.round((val(a) - val(b)) * 100) / 100;
 const ptWord = x => fr() ? (Math.abs(x) < 2 ? "point" : "points") : (Math.abs(x) === 1 ? "point" : "points");
 const pp = x => x === null ? NA() : signed(x, 2) + " " + ptWord(x);
 const COL = () => fr() ? "\u00a0: " : ": ";
 const SEP = " · ";
 const url = p => new URL(p, root).href,
  link = (p, s) => '<a href="' + e(/^https?:/.test(p) ? p : url(p)) + '">' + e(s) + '</a>';
 const SRC = {
  directory: "assets/department-pages.json",
  rep: "data/tbs-departmental-representation-2017-2025.json",
  women: "women-femmes/data/csv/women-by-organization-2025.csv",
  pses: "assets/department-profile-index.json",
  snps: "data/snps-2025-by-organization.json",
  cta: "data/call-to-action-letters.json",
  pubs: "assets/department-publication-links.json",
  psc: "assets/psc-organization-index.json",
  cat: "data/psc/catalogue.json",
  hiring: "data/psc/psc-equity.json",
  ex: "data/restored/16c75ddc-475b-4e62-b883-d5517181c9cf.csv",
  added: "assets/added-sources.json",
  pop: "data/open-canada-2026-11/tbs-fps-population-2010-2026/population-of-the-federal-public-service-by-department-or-agency-march-2026-en.csv",
  tenure: "data/open-canada-2026-11/tbs-fps-population-2010-2026/population-of-the-federal-public-service-by-department-and-tenure-march-2026-en.csv",
  province: "data/open-canada-2026-11/tbs-fps-population-2010-2026/population-of-the-federal-public-service-by-department-and-province-march-2026-en.csv"
 };
 /* Publisher page for the population tables (TBS, Federal public service statistics), cited instead of the copies kept on this site. */
 const WOMEN_PAGE = () => L("https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/employment-equity-public-service-representation-women-department-agency-departmental-workforce-availability-estimates.html", "https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/statistiques-ressources-humaines/statistiques-diversite-inclusion/representation-femmes-fonction-publique-canada-ministere-organisme-estimations-disponibilite-sein-population-active.html");
 const POP_PAGE = () => L("https://open.canada.ca/data/en/dataset/f0d12b41-54dc-4784-ad2b-83dffed2ab84", "https://ouvert.canada.ca/data/fr/dataset/f0d12b41-54dc-4784-ad2b-83dffed2ab84");
 const EE_REPORT = () => L("https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/employment-equity-annual-reports/employment-equity-public-service-canada-2024-2025.html", "https://www.canada.ca/fr/gouvernement/fonctionpublique/mieux-etre-inclusion-diversite-fonction-publique/diversite-equite-matiere-emploi/equite-emploi-rapports-annuel/equite-emploi-fonction-publique-canada-2024-2025.html");
 const SNAPSHOT = () => L("https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/employment-equity-demographic-snapshot-2024-2025.html", "https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/statistiques-ressources-humaines/statistiques-diversite-inclusion/apercu-donnees-demographiques-equite-matiere-emploi-2024-2025.html");
 const cache = new Map();

 function load(k) {
  if (!cache.has(k)) {
   const p = SRC[k] || k;
   cache.set(k, fetch(url(p)).then(r => {
    if (!r.ok) throw Error("HTTP " + r.status);
    return p.endsWith(".csv") ? r.text() : r.json()
   }).catch(err => {
    cache.delete(k);
    throw err
   }));
  }
  return cache.get(k)
 }

 function csv(s) {
  let rows = [],
   row = [],
   v = "",
   q = false;
  for (let i = 0; i < s.length; i++) {
   const c = s[i];
   if (q) {
    if (c === '"' && s[i + 1] === '"') {
     v += '"';
     i++
    } else if (c === '"') q = false;
    else v += c
   } else if (c === '"') q = true;
   else if (c === ",") {
    row.push(v);
    v = ""
   } else if (c === "\r" || c === "\n") {
    if (c === "\r" && s[i + 1] === "\n") i++;
    row.push(v);
    if (row.some(x => x !== "")) rows.push(row);
    row = [];
    v = ""
   } else v += c
  }
  if (row.length || v) {
   row.push(v);
   rows.push(row)
  }
  const h = (rows.shift() || []).map(x => x.replace(/^\ufeff/, "").trim());
  return rows.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])))
 }
 const groups = {
  w: ["Women", "Femmes"],
  i: ["Indigenous employees", "Employés autochtones"],
  d: ["Employees with disabilities", "Employés en situation de handicap"],
  v: ["Members of visible minorities", "Membres des minorités visibles"],
  b: ["Black employees", "Employés noirs"]
 };
 const sg = {
  all: ["All respondents", "Tous les répondants"],
  woman: groups.w,
  man: ["Men", "Hommes"],
  pwd: groups.d,
  nopwd: ["Persons without disabilities", "Personnes sans handicap"],
  ind: groups.i,
  nonind: ["Non-Indigenous", "Non-autochtones"],
  rac: ["Racialized employees", "Employés racisés"],
  nonrac: ["Non-racialized", "Non racisés"],
  black: groups.b
 };
 const lenses = {
  overview: ["Main findings", "Principaux constats"],
  rep: ["Representation and availability", "Représentation et disponibilité"],
  career: ["Career development and access", "Perfectionnement et accès à la carrière"],
  staff: ["Staffing experiences", "Expériences de dotation"],
  safety: ["Harassment, discrimination and speaking up", "Harcèlement, discrimination et prise de parole"],
  accom: ["Accommodation", "Adaptation"],
  health: ["Mental health and safety", "Santé mentale et sécurité"],
  culture: ["Inclusion, respect and recognition", "Inclusion, respect et reconnaissance"],
  language: ["Official languages", "Langues officielles"],
  cta: ["Commitments and accountability", "Engagements et responsabilisation"],
  austerity: ["Scenario and safeguards", "Scénario et mesures de protection"],
  workforce: ["Workforce change", "Évolution de l’effectif"],
  regions: ["Where employees work", "Lieux de travail"],
  pay: ["Salary ranges (public service)", "Échelles salariales (fonction publique)"],
  sources: ["Departmental datasets and publications", "Jeux de données et publications ministériels"],
  all: ["All evidence", "Toutes les données"]
 };
 const EXPLORER = slug === "department-evidence-explorer",
  AUSTERITY = slug === "equity-under-austerity",
  STANDALONE = EXPLORER || AUSTERITY,
  HISTORY = location.pathname.includes("GC-Equity-History");
 const focus = {
  "barrier-breaker": ["rep", "staff", "career", "accom", "safety", "language", "culture", "cta", "health", "sources"],
  "federal-glass-ceiling": ["career", "rep", "staff", "language", "accom", "culture", "sources"],
  "what-worked": ["cta", "career", "staff", "rep", "culture", "accom", "health", "safety", "language", "sources"],
  "official-languages-equity": ["language", "career", "staff", "rep", "cta", "sources"],
  "equitable-staffing-lab": ["staff", "career", "rep", "accom", "language", "cta", "sources"],
  "discretion-navigator": ["staff", "accom", "language", "career", "culture", "safety", "cta", "sources"],
  "equity-impact-simulator": ["rep", "career", "staff", "accom", "health", "safety", "language", "culture", "cta", "sources"],
  "federal-equity-audit": ["rep", "staff", "career", "cta", "safety", "accom", "health", "culture", "language", "sources"],
  "from-commitment-to-action": ["cta", "rep", "career", "staff", "culture", "safety", "accom", "health", "language", "sources"],
  "invisible-work-project": ["culture", "career", "health", "safety", "cta", "staff", "sources"],
  "managers-equity-toolkit": ["staff", "accom", "career", "safety", "health", "culture", "language", "rep", "cta", "sources"],
  "equity-under-austerity": ["austerity", "workforce", "rep", "accom", "career", "cta", "sources"],
  "department-evidence-explorer": ["overview", "rep", "safety", "accom", "career", "staff", "culture", "health", "language", "workforce", "regions", "pay", "cta",
   "sources"
  ]
 };
 const qsets = {
  career: ["Q43", "Q45", "Q44e", "Q12"],
  safety: ["Q58", "Q65", "Q24", "Q42", "Q63", "Q70", "Q72"],
  accom: ["Q84", "Q85", "Q86", "Q87", "Q88", "Q44e", "Q73p"],
  health: ["Q25", "Q51", "Q73p", "Q73q", "Q77", "Q78", "Q81"],
  culture: ["Q12", "Q47", "Q49", "Q52", "Q53", "Q24", "Q42"],
  language: ["Q43", "Q45"],
  staff: ["Q43", "Q45"],
  cta: ["Q49", "Q52", "Q24", "Q65"],
  overview: ["Q58", "Q65", "Q24", "Q42", "Q72", "Q86", "Q87", "Q88", "Q43", "Q45", "Q12", "Q53"],
  rep: []
 };
 const sqsets = {
  career: ["STA_04", "STA_09C", "STA_01E", "STA_01F", "STA_01A", "STA_14A", "STA_13"],
  staff: ["STA_14A", "STA_13", "STA_01A", "STA_01E", "STA_01F", "STA_09C", "STA_04"],
  language: ["STA_04", "STA_09C", "STA_01A"],
  accom: ["STA_14A", "STA_13"],
  culture: ["STA_01A", "STA_01E"],
  cta: ["STA_13", "STA_14A"],
  overview: ["STA_14A", "STA_13", "STA_01E", "STA_01A", "STA_04"],
  rep: [],
  safety: [],
  health: []
 };
 /* Direction of each measure: "up" means a higher value is less favourable, "down" means a lower value is less favourable. */
 const direction = q => /^(Q58|Q65|Q44e|Q51|Q73p|Q73q|STA_14A)$/.test(q) ? "up" : /^(Q84|Q85)$/.test(q) ? "" : "down";
 /* Plain-language wording of the survey measures used in the main findings. */
 const QTEXT = {
  Q12: ["agreed that they feel valued at work", "étaient d’accord pour dire qu’ils se sentent valorisés au travail"],
  Q24: ["agreed they would feel safe to speak about racism at work without fear of reprisal", "étaient d’accord pour dire qu’ils se sentiraient en sécurité de parler du racisme au travail sans crainte de représailles"],
  Q25: ["agreed they would feel safe to speak about racism without harm to their mental health", "étaient d’accord pour dire qu’ils pourraient parler du racisme sans effet négatif sur leur santé mentale"],
  Q42: ["agreed they can start a formal recourse process without fear of reprisal", "étaient d’accord pour dire qu’ils peuvent entreprendre un recours officiel sans crainte de représailles"],
  Q43: ["agreed that their department supports career development", "étaient d’accord pour dire que leur ministère appuie le perfectionnement professionnel"],
  Q44e: ["said accommodation issues affected their career progress", "ont indiqué que des enjeux d’adaptation ont nui à leur progression de carrière"],
  Q45: ["agreed they have opportunities for promotion", "étaient d’accord pour dire qu’ils ont des possibilités de promotion"],
  Q47: ["agreed that their department respects individual differences", "étaient d’accord pour dire que leur ministère respecte les différences individuelles"],
  Q49: ["agreed that their department implements anti-racism initiatives", "étaient d’accord pour dire que leur ministère met en œuvre des initiatives de lutte contre le racisme"],
  Q51: ["agreed that racism in their department has harmed their mental health", "étaient d’accord pour dire que le racisme dans leur ministère a nui à leur santé mentale"],
  Q52: ["agreed that the Call to Action has had a positive impact", "étaient d’accord pour dire que l’Appel à l’action a eu un effet positif"],
  Q53: ["agreed that their department treats them with respect", "étaient d’accord pour dire que leur ministère les traite avec respect"],
  Q58: ["reported being a victim of harassment on the job in the past 12 months", "ont déclaré avoir été victimes de harcèlement au travail au cours des 12 derniers mois"],
  Q63: ["were satisfied with how harassment matters are resolved", "étaient satisfaits du règlement des questions de harcèlement"],
  Q65: ["reported being a victim of discrimination on the job in the past 12 months", "ont déclaré avoir été victimes de discrimination au travail au cours des 12 derniers mois"],
  Q70: ["were satisfied with how discrimination matters are resolved", "étaient satisfaits du règlement des questions de discrimination"],
  Q72: ["were satisfied with how concerns or complaints about racism are resolved", "étaient satisfaits du règlement des préoccupations ou plaintes liées au racisme"],
  Q73p: ["said accommodation issues cause them work-related stress", "ont indiqué que des enjeux d’adaptation leur causent du stress au travail"],
  Q73q: ["said harassment or discrimination causes them work-related stress", "ont indiqué que le harcèlement ou la discrimination leur cause du stress au travail"],
  Q77: ["rated their mental health positively", "ont évalué positivement leur santé mentale"],
  Q78: ["agreed that their supervisor supports their mental health", "étaient d’accord pour dire que leur superviseur appuie leur santé mentale"],
  Q81: ["described their workplace as psychologically healthy", "ont décrit leur milieu de travail comme psychologiquement sain"],
  Q86: ["said accommodation measures were implemented (among those who requested them)", "ont indiqué que des mesures d’adaptation ont été prises (parmi ceux qui en ont demandé)"],
  Q87: ["were satisfied with the accommodation measures implemented", "étaient satisfaits des mesures d’adaptation prises"],
  Q88: ["would feel comfortable asking their supervisor for accommodation", "se sentiraient à l’aise de demander des mesures d’adaptation à leur superviseur"]
 };
 /* Designated groups shown first in survey findings, using the survey's own labels. */
 const DESIGNATED = ["Indigenous", "Black", "Racialized", "Person with a disability", "Woman", "2SLGBTQIA+"];
 const RESP = {
  "Indigenous": ["Indigenous respondents", "Répondants autochtones"],
  "Black": ["Black respondents", "Répondants noirs"],
  "Racialized": ["Racialized respondents", "Répondants racisés"],
  "Person with a disability": ["Respondents with a disability", "Répondants en situation de handicap"],
  "Woman": ["Women respondents", "Répondantes"]
 };
 const A = (lens, id, title, change, owner, measure, request) => ({
  lens,
  id,
  title,
  change,
  owner,
  measure,
  request
 });
 const actions = [
  A("rep", "r1", ["Review workforce availability gaps", "Examiner les écarts de disponibilité"], [
   "Identify job families and levels contributing to the gap; review essential criteria and departure patterns before choosing a recruitment or retention intervention.",
   "Repérer les familles d’emplois et niveaux contribuant à l’écart; examiner critères essentiels et départs avant de choisir une intervention."
  ], ["Employment equity / workforce planning", "Équité en emploi / planification"], [
   "Representation and availability by comparable population; recruitment and departure rates with denominators.",
   "Représentation et disponibilité pour des populations comparables; taux d’embauche et de départ avec dénominateurs."
  ], ["Current count, availability methodology, five-year series, level and occupation by group.",
   "Effectif actuel, méthode de disponibilité, série quinquennale, niveau et profession par groupe."
  ]),
  A("rep", "r2", ["Review distribution rather than overall totals", "Examiner la répartition plutôt que le total"], [
   "Identify concentration in lower levels or particular occupations; test whether feeder groups have comparable access to advancement.",
   "Repérer la concentration aux niveaux inférieurs ou dans certaines professions; vérifier l’accès comparable de la relève à l’avancement."
  ], ["HR analytics / talent management", "Analytique RH / gestion des talents"], [
   "Shares by classification and executive level; transition rates from feeder groups.",
   "Proportions par classification et niveau de cadre; taux de transition de la relève."
  ], ["Group-by-level counts, eligible feeder population and appointments; suppress small cells.",
   "Effectifs par groupe et niveau, relève admissible et nominations; supprimer les petites cellules."
  ]),
  A("career", "c1", ["Make acting opportunities visible", "Rendre les intérims visibles"], [
   "Pilot a transparent expression of interest; define relevant criteria, consider equivalent experience and document decisions.",
   "Piloter un appel d’intérêt transparent; définir des critères pertinents, considérer l’expérience équivalente et documenter les décisions."
  ], ["Delegated managers / staffing", "Gestionnaires délégués / dotation"], [
   "Access to acting roles by group, duration and classification; subsequent appointments.",
   "Accès aux intérims par groupe, durée et classification; nominations ultérieures."
  ], ["Acting assignments by group, applicants, selection decisions and duration, with privacy controls.",
   "Intérims par groupe, candidatures, décisions et durée, avec protection des renseignements."
  ]),
  A("career", "c2", ["Make development allocation transparent", "Rendre le perfectionnement transparent"], [
   "Publish eligibility and allocation criteria; provide protected time and accessible formats; evaluate who receives repeat opportunities.",
   "Publier l’admissibilité et les critères d’attribution; fournir du temps protégé et des formats accessibles; évaluer les possibilités répétées."
  ], ["Talent management / learning", "Gestion des talents / apprentissage"], ["Training applications, acceptance, protected hours and completion by group.",
   "Demandes de formation, acceptation, heures protégées et achèvement par groupe."
  ], ["Training requests, wait lists, approvals, expenditure and development plans.",
   "Demandes, listes d’attente, approbations, dépenses et plans de perfectionnement."
  ]),
  A("career", "c3", ["Test feeder-to-executive progression", "Examiner la progression de la relève aux cadres"], [
   "Compare access to stretch assignments, sponsorship and appointments across eligible populations; review requirements that rely on prior access.",
   "Comparer l’accès aux affectations enrichies, au parrainage et aux nominations pour les populations admissibles; examiner les exigences fondées sur l’accès antérieur."
  ], ["Executive talent / staffing", "Talents des cadres / dotation"], [
   "Feeder-to-EX transition rate and stage-specific progression, not promotion share alone.",
   "Taux de transition relève-cadres et progression par étape, non seule part des promotions."
  ], ["Number eligible, applicants, qualified pools and appointed employees by level and group.",
   "Nombre admissible, candidatures, bassins qualifiés et nominations par niveau et groupe."
  ]),
  A("staff", "s1", ["Review screening criteria before advertising", "Examiner les critères avant l’affichage"], [
   "Require a job-relevance rationale for each essential criterion; remove unnecessary prior acting or sector-specific experience requirements where appropriate.",
   "Exiger une justification liée au poste pour chaque critère essentiel; retirer les exigences d’intérim ou d’expérience sectorielle non nécessaires."
  ], ["Delegated hiring manager / staffing advisor", "Gestionnaire d’embauche délégué / conseiller en dotation"], [
   "Screening conversion by stage, group and qualification; record reasons.",
   "Taux de passage à la présélection par étape, groupe et qualification; consigner les motifs."
  ], ["Poster, screening grid, aggregate applicants and outcomes per stage.",
   "Affiche, grille de présélection, candidatures et résultats agrégés par étape."]),
  A("staff", "s2", ["Evaluate assessments for biases and barriers", "Évaluer les biais et obstacles des évaluations"], [
   "Document pre-use review under PSEA s. 36(2) where applicable; test timing, format, language and scoring; take reasonable steps to remove or mitigate barriers.",
   "Documenter l’examen préalable selon le par. 36(2) de la LEFP lorsqu’applicable; vérifier temps, format, langue et notation; prendre des mesures raisonnables d’atténuation."
  ], ["Assessment board / staffing authority", "Comité d’évaluation / autorité de dotation"], [
   "Assessment methods reviewed, mitigations recorded, qualification results by stage.", "Méthodes examinées, atténuations consignées, résultats par étape."
  ], ["Assessment design, barrier review, scoring rubric and accommodation process.",
   "Conception, examen des obstacles, grille de notation et processus d’adaptation."
  ]),
  A("staff", "s3", ["Examine non-advertised appointment patterns", "Examiner les nominations non annoncées"], [
   "Review documented choice of process and merit rationale; compare access to opportunities with advertised processes. Non-advertised staffing is not inherently unlawful.",
   "Examiner la justification documentée du choix du processus et du mérite; comparer l’accès aux processus annoncés. La dotation non annoncée n’est pas intrinsèquement illégale."
  ], ["Staffing oversight / delegated executive", "Surveillance de la dotation / cadre délégué"], [
   "Type of process, appointment distribution, rationale quality and candidate feedback.",
   "Type de processus, répartition des nominations, qualité des motifs et rétroaction."
  ], ["Advertised/non-advertised records, classification and aggregate self-identification.",
   "Dossiers annoncés/non annoncés, classification et auto-identification agrégée."
  ]),
  A("staff", "s4", ["Review selection and feedback decisions", "Examiner sélection et rétroaction"], [
   "Use structured scoring and recorded evidence; calibrate panel decisions and give meaningful feedback within confidentiality limits.",
   "Utiliser une notation structurée fondée sur les preuves; harmoniser les décisions du comité et offrir une rétroaction utile dans les limites de confidentialité."
  ], ["Selection board / delegated manager", "Comité de sélection / gestionnaire délégué"], ["Selection-stage rates and quality of documented rationale.",
   "Taux de sélection et qualité des motifs documentés."
  ], ["Qualification results, selection rationale and anonymized feedback themes.", "Résultats de qualification, motifs de sélection et thèmes anonymisés."]),
  A("accom", "a1", ["Reduce avoidable documentation and delays", "Réduire les documents et délais évitables"], [
   "Map intake-to-implementation steps; use functional needs, request only necessary information and consider effective interim measures.",
   "Cartographier les étapes de la demande à la mise en œuvre; utiliser les besoins fonctionnels, demander seulement les renseignements nécessaires et envisager des mesures provisoires."
  ], ["Accommodation centre / managers", "Centre d’adaptation / gestionnaires"], [
   "Median time to implement, repeated requests, unresolved cases and satisfaction.", "Délai médian, demandes répétées, cas non résolus et satisfaction."
  ], ["Aggregate request dates, implementation dates and process reasons; no diagnoses.",
   "Dates agrégées des demandes et mises en œuvre et raisons procédurales; aucun diagnostic."
  ]),
  A("accom", "a2", ["Review portable and accessible solutions", "Examiner les solutions transférables et accessibles"], [
   "Offer voluntary accessibility passport; arrange continuity when managers change and verify accessibility of tools before procurement.",
   "Proposer le passeport volontaire; assurer la continuité lors d’un changement de gestionnaire et vérifier l’accessibilité avant l’achat."
  ], ["Accessibility lead / procurement / IT", "Responsable accessibilité / achats / TI"], [
   "Time to restore supports after transfer; accessibility defects resolved.",
   "Délai de rétablissement du soutien après transfert; défauts d’accessibilité corrigés."
  ], ["Accommodation continuity process, accessibility testing and feedback.", "Processus de continuité, essais d’accessibilité et rétroaction."]),
  A("accom", "a3", ["Review accommodation-related career effects", "Examiner les effets de l’adaptation sur la carrière"], [
   "Audit whether assessment, training or assignment formats exclude employees needing accommodations; arrange accessible equivalents.",
   "Vérifier si les formats d’évaluation, de formation ou d’affectation excluent les personnes ayant besoin d’adaptation; prévoir des équivalents accessibles."
  ], ["Staffing / accessibility / learning", "Dotation / accessibilité / apprentissage"], [
   "Accessible opportunities, completion and reported career effects.", "Possibilités accessibles, achèvement et effets déclarés sur la carrière."
  ], ["Anonymized barriers at each career stage and accommodation timelines.", "Obstacles anonymisés par étape de carrière et délais d’adaptation."]),
  A("safety", "h1", ["Review retaliation and reporting barriers", "Examiner les représailles et obstacles au signalement"], [
   "Provide clear confidential intake routes and explain their limits; review manager response, escalation and follow-up without requiring network volunteers to handle cases.",
   "Offrir des voies de signalement confidentielles et expliquer leurs limites; examiner réponse des gestionnaires, escalade et suivi sans imposer les dossiers aux bénévoles."
  ], ["Labour relations / designated recipient / OHS", "Relations de travail / destinataire désigné / SST"], [
   "Confidence in recourse, time to acknowledgement and aggregate prevention actions.",
   "Confiance dans les recours, délai d’accusé de réception et mesures de prévention agrégées."
  ], ["Anonymized themes, reporting process map, prevention actions; no individual files.",
   "Thèmes anonymisés, cartographie du signalement, prévention; aucun dossier individuel."
  ]),
  A("safety", "h2", ["Investigate recurring discriminatory practices", "Examiner les pratiques discriminatoires récurrentes"], [
   "Distinguish survey experience from established findings; review recurring process themes with affected employees and responsible authorities, and test preventive changes.",
   "Distinguer les expériences du sondage des conclusions établies; examiner les thèmes récurrents avec les employés et autorités responsables et tester des changements préventifs."
  ], ["Employment equity / OHS / functional authorities", "Équité en emploi / SST / autorités fonctionnelles"], [
   "Specific practices reviewed, changes implemented and repeat survey patterns.",
   "Pratiques examinées, changements mis en œuvre et tendances ultérieures des sondages."
  ], ["Privacy-safe trend evidence, relevant procedures and prevention plan.", "Tendances respectant la vie privée, procédures et plan de prévention."]),
  A("health", "mh1", ["Review psychosocial hazards and controls", "Examiner les risques psychosociaux et les mesures de contrôle"], [
   "Consult the applicable workplace partners on harassment and violence prevention; identify organizational hazards, prioritize prevention and review effectiveness.",
   "Consulter les partenaires du lieu de travail applicables à la prévention du harcèlement et de la violence; repérer les risques organisationnels, prioriser la prévention et vérifier l’efficacité."
  ], ["OHS / workplace applicable partners", "SST / partenaires applicables du lieu de travail"], [
   "Prevention measures implemented, psychological safety measures and follow-up dates.",
   "Mesures de prévention mises en œuvre, sécurité psychologique et dates de suivi."
  ], ["Workplace assessment, prevention plan and anonymized employee feedback.",
   "Évaluation du lieu de travail, plan de prévention et rétroaction anonymisée."
  ]),
  A("health", "mh2", ["Review workload and supervisory support", "Examiner la charge et le soutien des superviseurs"], [
   "Review work allocation and access to support; identify controllable workload factors rather than focusing only on individual resilience.",
   "Examiner la répartition du travail et l’accès au soutien; repérer les facteurs de charge contrôlables plutôt que la seule résilience individuelle."
  ], ["Operations / management / OHS", "Opérations / gestion / SST"], ["Workload distribution, timely support and psychological safety feedback.",
   "Répartition de la charge, soutien rapide et rétroaction sur la sécurité psychologique."
  ], ["Aggregate workload and overtime indicators, feedback and workplace changes.",
   "Indicateurs agrégés de charge et d’heures supplémentaires, rétroaction et changements."
  ]),
  A("culture", "cu1", ["Recognize network and equity contributions", "Reconnaître les contributions aux réseaux et à l’équité"], [
   "Agree on contribution scope, time and priorities; recognize job-relevant competencies in performance discussions; do not assume a pay or rating entitlement.",
   "Convenir de la portée, du temps et des priorités; reconnaître les compétences liées au travail dans les discussions de rendement; ne pas présumer d’un droit à la rémunération ou à une cote."
  ], ["Executive champion / managers / networks", "Champion cadre / gestionnaires / réseaux"], [
   "Allocated time, agreed outputs and decisions informed; assess workload impact.",
   "Temps alloué, livrables convenus et décisions éclairées; évaluer la charge."
  ], ["Anonymized network workload and deliverables, recognition arrangements, feedback.",
   "Charge et livrables anonymisés des réseaux, modalités de reconnaissance et rétroaction."
  ]),
  A("culture", "cu2", ["Move consultation before decisions", "Consulter avant les décisions"], [
   "Create a decision log that records consultation, responses and reasons; communicate which changes were made and which were not.",
   "Créer un registre des décisions consignant consultation, réponses et motifs; communiquer les changements effectués ou non."
  ], ["Decision owner / employee networks", "Responsable de décision / réseaux"], [
   "Recommendations answered, actions implemented and employee assessment of usefulness.",
   "Recommandations ayant reçu réponse, actions réalisées et utilité selon les employés."
  ], ["Consultation timeline, anonymized recommendations, decision record and follow-up.",
   "Calendrier des consultations, recommandations anonymisées, registre et suivi."
  ]),
  A("language", "l1", ["Review objective linguistic profiles", "Examiner les profils linguistiques objectifs"], [
   "Document actual duties, service and language-of-work obligations before establishing profiles; verify mandated minimums with HR and never waive applicable requirements informally.",
   "Documenter fonctions réelles et obligations de service et langue de travail avant les profils; vérifier les minimums obligatoires avec les RH et ne jamais y déroger informellement."
  ], ["Official languages / classification / staffing", "Langues officielles / classification / dotation"], [
   "Profiles with documented functional rationale and required review.", "Profils avec justification fonctionnelle et examen requis."
  ], ["Position profiles, duties, designated regions, applicable language policy and vacancy data.",
   "Profils de poste, fonctions, régions désignées, politique linguistique et vacances."
  ]),
  A("language", "l2", ["Measure access to language training", "Mesurer l’accès à la formation linguistique"], [
   "Publish eligibility and prioritization criteria; offer protected learning time and accessible learning options; examine regional and workload differences.",
   "Publier critères d’admissibilité et de priorité; offrir du temps protégé et des options accessibles; examiner les différences régionales et de charge."
  ], ["Official languages / learning / managers", "Langues officielles / apprentissage / gestionnaires"], [
   "Requests, acceptance, wait times, completion and qualification outcomes by relevant group.",
   "Demandes, acceptation, délais, achèvement et qualifications par groupe pertinent."
  ], ["Aggregate training demand, approval, costs, wait lists and outcomes. First official language is not bilingual proficiency.",
   "Demande, approbation, coûts, listes d’attente et résultats agrégés. La première langue officielle n’est pas la compétence bilingue."
  ]),
  A("cta", "ct1", ["Translate commitments into measurable actions", "Traduire les engagements en mesures vérifiables"], [
   "Extract a specific commitment, identify responsible authority, baseline, target, deadline and actual implementation evidence; separate activity from outcome.",
   "Extraire un engagement précis, désigner l’autorité, la référence, la cible, l’échéance et la preuve de mise en œuvre; distinguer activité et résultat."
  ], ["Deputy head / accountable executive", "Administrateur général / cadre responsable"], [
   "Commitments with dated evidence, target and outcome measure; report unresolved gaps.",
   "Engagements avec preuve datée, cible et résultat; signaler les lacunes."
  ], ["Original commitment, current plan, implementation records and outcome data.",
   "Engagement original, plan actuel, dossiers de mise en œuvre et données de résultats."
  ]),
  A("cta", "ct2", ["Follow up reported barriers and goals", "Suivre les obstacles et objectifs déclarés"], [
   "Review the 2024 reported barrier with the responsible function and affected employees; establish a specific corrective action and reporting cadence.",
   "Examiner l’obstacle déclaré en 2024 avec la fonction responsable et les employés touchés; établir une mesure corrective et une fréquence de suivi."
  ], ["Accountable executive / functional owner", "Cadre responsable / fonction responsable"], [
   "Barriers with completed corrective action and evaluation evidence, not just meeting counts.",
   "Obstacles avec correction terminée et preuve d’évaluation, non seul nombre de réunions."
  ], ["Self-assessment, updated goals, decision records and evidence of implementation.",
   "Autoévaluation, objectifs actualisés, décisions et preuves de mise en œuvre."
  ]),
  A("sources", "ds1", ["Request missing disaggregated evidence", "Demander les données ventilées manquantes"], [
   "Ask for an existing aggregate table with definitions, period, coverage and suppression rules; avoid requesting identifiable information or inferring suppressed cells.",
   "Demander un tableau agrégé existant avec définitions, période, couverture et règles de suppression; éviter les renseignements identifiants et les déductions de cellules supprimées."
  ], ["HR analytics / data steward", "Analytique RH / responsable des données"], ["Evidence requested and received, gaps documented and updated sources.",
   "Données demandées et reçues, lacunes documentées et sources actualisées."
  ], ["Specify group, organization, year, classification, numerator/denominator and limitations.",
   "Préciser groupe, organisme, année, classification, numérateur/dénominateur et limites."
  ])
 ];
 const host = document.createElement("section");
 host.id = "dept-evidence-workspace";
 host.setAttribute("aria-labelledby", "dew-title");
 const before = document.getElementById("main") || document.querySelector("main");
 if (!before) return;
 if (HISTORY) before.after(host);
 else if (STANDALONE) before.append(host);
 else before.before(host);
 if (location.pathname.includes("GC-Equity-History")) {
  host.style.setProperty("--text", "var(--ink, #172b36)");
  host.style.setProperty("--panel", "var(--card, #fff)");
  host.style.setProperty("--line", "var(--rule2, #c7d3da)");
  host.style.setProperty("--muted", "var(--ink2, #475966)");
  host.style.setProperty("--accent", "var(--link, #005b64)");
 }
 const css = document.createElement("style");
 css.textContent =
  "#dept-evidence-workspace{max-width:1100px;margin:auto;padding:1rem;color:var(--text)}#dept-evidence-workspace .dew-box{background:var(--panel);border:1px solid var(--line);padding:1rem;border-radius:.65rem;margin:.8rem 0}#dept-evidence-workspace .dew-columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:1rem}#dept-evidence-workspace .dew-scroll{overflow:auto;max-height:40rem}#dept-evidence-workspace th{position:sticky;top:0;background:var(--panel)}#dept-evidence-workspace .dew-tabs{display:flex;flex-wrap:wrap;gap:.4rem}#dept-evidence-workspace .dew-tabs button[aria-pressed=true]{background:#005b64;color:white}#dept-evidence-workspace .dew-bar{display:block;height:.5rem;background:var(--accent);border-radius:.25rem;margin:.2rem 0}#dept-evidence-workspace .dew-small{font-size:.9rem;color:var(--muted)}#dept-evidence-workspace .dew-actions label{display:flex;align-items:flex-start;gap:.5rem}#dept-evidence-workspace .dew-actions input[type=checkbox]{width:auto;margin-top:.4rem}#dept-evidence-workspace textarea{width:100%;min-height:6rem}#dept-evidence-workspace .dew-sticky{scroll-margin-top:1rem}#dept-evidence-workspace caption{text-align:left;font-weight:650;padding:.4rem 0}#dept-evidence-workspace .dew-findings{border-left:4px solid var(--accent)}#dept-evidence-workspace .dew-findings li{margin:.35rem 0}#dept-evidence-workspace .dew-tabs button{font:inherit;padding:.45rem .7rem;border:1px solid var(--line);border-radius:.35rem;background:var(--panel);color:var(--text);cursor:pointer}#dept-evidence-workspace select{max-width:100%}#dept-evidence-workspace .dew-big{font-size:1.6rem;font-weight:700;margin:.4rem 0}#dept-evidence-workspace #dew-reduction{display:block;width:8rem;min-height:44px;font:inherit;padding:.4rem;margin:.25rem 0 .5rem}#dept-evidence-workspace .dew-questions li{margin:.45rem 0}#dept-evidence-workspace details>summary{cursor:pointer;font-weight:650}";
 document.head.append(css);
 let dir, org = "",
  peer = "",
  lens = (focus[slug] || [location.pathname.includes("GC-Equity-History") ? "cta" : "rep"])[0],
  group = "all",
  pg = "all",
  austY1 = "",
  austY2 = "",
  reduction = 5,
  year = "all",
  query = "",
  chosen = new Set(),
  evidence = [],
  citations = [],
  ticket = 0,
  oldLang = document.documentElement.lang,
  report = "",
  records = {},
  currentPses = null,
  extraNote = "";
 const $ = id => document.getElementById("dew-" + id),
  options = (xs, v) => xs.map(([k, n]) => '<option value="' + e(k) + '" ' + (String(k) === String(v) ? "selected" : "") + '>' + e(n) + '</option>').join("");

 function names(o) {
  if (!o) return [];
  const more = dir.identityAliases.filter(a => norm(a.canonical) === norm(o.en)).map(a => a.alias);
  return [...new Set([o.en, o.fr, ...(o.aliases || []), ...more].filter(Boolean).map(norm))]
 }

 function match(obj, o) {
  if (!obj || !o) return null;
  if (Object.prototype.hasOwnProperty.call(obj, o.en)) return obj[o.en];
  const keys = Object.keys(obj).filter(k => names(o).includes(norm(k)));
  return keys.length === 1 ? obj[keys[0]] : null
 }

 function findRow(list, o, key) {
  if (!o) return null;
  const exact = list.filter(x => x[key] === o.en);
  if (exact.length === 1) return exact[0];
  const rows = list.filter(x => names(o).includes(norm(x[key])));
  return rows.length === 1 ? rows[0] : null
 }

 function ctaMatch(list, o) {
  if (!o) return null;
  const exact = list.filter(x => x.id === o.id || x.name_en === o.en);
  if (exact.length === 1) return exact[0];
  const rows = list.filter(x => [x.name_en, x.name_fr].some(n => names(o).includes(norm(n))));
  return rows.length === 1 ? rows[0] : null
 }
 const getOrg = id => dir?.organizations.find(o => o.id === id),
  name = o => o ? L(o.en, o.fr) : "";

 function addEvidence(dataset, period, q, g, a, b, gap, n, source, meta = {}) {
  const label = dataset.includes(SEP) ? dataset : dataset + SEP + (meta.organization || name(getOrg(org)));
  evidence.push([label, period, q, g, a, b, gap, n, source]);
  rowInfo.push(meta);
  if (source) citations.push(source)
 }

 function table(headers, rows, caption) {
  const cap = caption || L("Data table", "Tableau de données");
  return '<div class="dew-scroll" tabindex="0" role="region" aria-label="' + e(cap) + '"><table>' + (caption ? '<caption>' + e(caption) + '</caption>' : '') + '<thead><tr>' +
   headers.map(h => '<th scope="col">' + e(h) + '</th>').join("") + '</tr></thead><tbody>' + rows.map(r => "<tr>" + r.map((c, j) => j === 0 ?
    '<th scope="row">' + e(c) + '</th>' : '<td>' + e(c) + '</td>').join("") + "</tr>").join("") + '</tbody></table></div>'
 }
 const missing = () => '<p class="notice">' + e(L(
  "No matching published records in this source. Missing or suppressed data are not zero; use the evidence request below.",
  "Aucun dossier publié correspondant dans cette source. Les données manquantes ou supprimées ne valent pas zéro; utiliser la demande de données ci-dessous."
  )) + '</p>';
 const sec = (title, body) => '<section class="dew-box"><h3>' + e(title) + '</h3>' + body + '</section>';
 const sourceNote = (p, title) => '<p class="dew-small">' + link(p, title) + '</p>';
 const guard = async k => {
  const current = sourceStatus;
  try {
   const x = await load(k);
   current[k] = "ok";
   return x
  } catch {
   current[k] = "failed";
   return null
  }
 };

 function getProfile(index, o) {
  const r = match(index?.organizations, o);
  if (!r) return Promise.resolve(null);
  if (!cache.has(r.path)) {
   const p = fetch(url(r.path)).then(async res => {
    if (!res.ok) throw Error("HTTP " + res.status);
    const b = Uint8Array.from(atob((await res.text()).trim()), c => c.charCodeAt(0));
    if (!window.DecompressionStream) throw Error("gzip unsupported");
    return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).json()
   }).catch(err => {
    cache.delete(r.path);
    throw err
   });
   cache.set(r.path, p)
  }
  return cache.get(r.path).then(p => names(o).includes(norm(p.organization)) ? p : null).catch(() => null)
 }

 function renderBars(rows, labelIndex, valueIndex, caption) {
  const points = rows.filter(r => !isNA(r[valueIndex])).map(r => [r[labelIndex], Number(String(r[valueIndex]).replace(/\s/g, "").replace(",", ".").replace(
   "%", ""))]).filter(r => Number.isFinite(r[1]) && r[1] >= 0 && r[1] <= 100);
  if (!points.length) return "";
  return "<details><summary>" + e(caption) + "</summary>" + points.map(([k, v]) => "<div><span>" + e(k) + COL() + pct(v) +
   "</span><span class=\"dew-bar\" aria-hidden=\"true\" style=\"width:" + v + "%\"></span></div>").join("") + "</details>"
 }

 function repr(d, w, o, p) {
  const a = match(d?.orgs, o),
   b = match(d?.orgs, p),
   wa = findRow(w || [], o, "Organization"),
   wb = findRow(w || [], p, "Organization");
  const rows = [],
   years = year === "all" ? ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"] : [year];
  for (const k of Object.keys(groups)) {
   for (const y of years) {
    let x = k === "w" ? (y === "2025" && wa ? [wa.Employees, null, wa["Women (%)"], wa["Departmental workforce availability for women (%)"]] : null) : a?.[k]
     ?.[y],
     z = k === "w" ? (y === "2025" && wb ? [wb.Employees, null, wb["Women (%)"], wb["Departmental workforce availability for women (%)"]] : null) : b?.[k]?.[
     y];
    if (!x && !z) continue;
    const gap = diff(x?.[2], x?.[3]);
    const s = k === "w" ? WOMEN_PAGE() : d?.pages?.[k]?.url || url(SRC.rep);
    rows.push([t(groups[k]), y, num(x?.[1]), pct(x?.[2]), pct(x?.[3]), pp(gap), ...(p ? [pct(z?.[2]), pp(diff(z?.[2], z?.[3]))] : [])]);
    addEvidence("TBS representation", y, t(groups[k]), t(groups[k]), pct(x?.[2]), pct(x?.[3]), pp(gap), num(x?.[1]), s, {
     kind: "representation",
     organization: name(o),
     key: k,
     value: val(x?.[2]),
     reference: val(x?.[3])
    });
    if (p) addEvidence("TBS representation" + SEP + name(p), y, t(groups[k]), t(groups[k]), pct(z?.[2]), pct(z?.[3]), pp(diff(z?.[2], z?.[3])), num(z?.[1]), s, {
     kind: "representation",
     organization: name(p),
     key: k,
     value: val(z?.[2]),
     reference: val(z?.[3])
    })
   }
  }
  const headers = [L("Group", "Groupe"), L("Year", "Année"), L("Employees in the group", "Employés du groupe"), L("Representation", "Représentation"), L(
   "Workforce availability", "Disponibilité de l’effectif"), L("Difference (points)", "Écart (points)"), ...(p ? [name(p) + SEP + L("representation", "représentation"), name(p) + SEP + L(
   "difference (points)", "écart (points)")] : [])];
  return rows.length ? '<p>' + e(L(
   "Figures as of March 31 of each year. Workforce availability estimates the qualified labour market; it is not a hiring target. Its basis changed in 2019, 2022 and 2024, so compare each year with its own estimate. No availability estimate is published for Black employees.",
   "Données au 31 mars de chaque année. La disponibilité estime le bassin de main-d’œuvre qualifiée; ce n’est pas une cible d’embauche. Sa base a changé en 2019, en 2022 et en 2024; comparer chaque année avec sa propre estimation. Aucune disponibilité n’est publiée pour les employés noirs."
   )) + '</p>' + renderBars(rows.map(r => [r[0] + SEP + r[1], r[3]]), 0, 1, L("Show representation as bars",
   "Afficher la représentation en barres")) + table(headers, rows, L("Representation and workforce availability by year", "Représentation et disponibilité par année")) + sourceNote(SRC.rep, L("TBS representation and workforce availability by department",
   "SCT, représentation et disponibilité par ministère")) + sourceNote(SRC.women, L("Women by organization (2025)", "Femmes selon l’organisme (2025)")) : missing()
 }

 function survey(index, p1, p2, o, p) {
  if (!index) return missing();
  const qs = lens === "all" ? Object.keys(index.definitions) : qsets[lens] || [];
  if (!qs.length) return "";
  const g = pg === "all" ? null : pg,
   rec = (x) => g ? x?.groups?.[g]?.questions : x?.overall;
  const a = rec(p1) || {},
   b = rec(p2) || {};
  const label = g ? (fr() ? p1?.groups?.[g]?.fr || p2?.groups?.[g]?.fr || g : g) : L("All respondents", "Tous les répondants");
  const rows = qs.filter(q => index.definitions[q]).map(q => {
   const def = index.definitions[q],
    x = a[q] || [],
    all = p1?.overall?.[q] || [],
    z = b[q] || [],
    kind = def.field === "ANSWER1" ? L("Yes", "Oui") : def.field === "NEGATIVE" ? L("Negative", "Négatives") : L("Positive", "Positives");
   const s = g ? index.sources.groups : index.sources.overallPublisherUrl;
   addEvidence("PSES", "2024", q + " " + L(def.en, def.fr), label, pct(x[0]), pct(all[0]), pp(diff(x[0], all[0])), num(x[1]), s, {
    kind: "survey",
    organization: name(o),
    code: q,
    value: val(x[0]),
    reference: g ? val(all[0]) : null,
    count: val(x[1]),
    field: def.field,
    group: g || "all"
   });
   if (p) addEvidence("PSES" + SEP + name(p), "2024", q + " " + L(def.en, def.fr), label, pct(z[0]), pct(p2?.overall?.[q]?.[0]), pp(diff(z[0], p2?.overall?.[q]
    ?.[0])), num(z[1]), s, {
    kind: "survey",
    organization: name(p),
    code: q,
    value: val(z[0]),
    reference: g ? val(p2?.overall?.[q]?.[0]) : null,
    count: val(z[1]),
    field: def.field,
    group: g || "all"
   });
   return [q + " · " + L(def.en, def.fr), kind, pct(x[0]), num(x[1]), pct(all[0]), pp(diff(x[0], all[0])), ...(p ? [pct(z[0]), num(z[1])] : [])]
  });
  if (!g && p1) {
   const keys = ["Woman", "Man", "Indigenous", "Non-Indigenous", "Person with a disability", "Person without a disability", "Racialized", "Non-racialized",
    "Black", "2SLGBTQIA+"
   ];
   for (const k of keys) {
    const info = p1.groups?.[k];
    if (!info) continue;
    for (const q of qs) {
     const d = index.definitions[q];
     if (!d) continue;
     const x = info.questions?.[q] || [],
      a = p1.overall?.[q] || [];
     addEvidence("PSES", "2024", q + " " + L(d.en, d.fr), L(k, info.fr || k), pct(x[0]), pct(a[0]), pp(diff(x[0], a[0])), num(x[1]), index.sources.groups, {
      kind: "survey",
      organization: name(o),
      code: q,
      value: val(x[0]),
      reference: val(a[0]),
      count: val(x[1]),
      field: d.field,
      group: k,
      overview: true
     })
    }
   }
  }
  return (!p1 && !p2 ? missing() : "") + '<p>' + e(L(
   "Percentages of respondents, not numbers of cases. Groups overlap. Differences are descriptive and are not tests of statistical significance. For some questions a higher value is less favourable, such as reports of harassment.",
   "Pourcentages de répondants, non nombres de cas. Les groupes se chevauchent. Les écarts sont descriptifs et ne sont pas des tests de signification statistique. Pour certaines questions, une valeur plus élevée est moins favorable, comme les déclarations de harcèlement."
   )) + '</p>' + renderBars(rows, 0, 2, L("Show these percentages as bars", "Afficher ces pourcentages en barres")) + table([L("Question",
   "Question"), L("Response type", "Type de réponse"), label, L("Responses (n)", "Réponses (n)"), L("All respondents", "Tous les répondants"), L("Difference (points)",
   "Écart (points)"), ...(p ? [name(p), L("Responses (comparison)", "Réponses (comparaison)")] : [])], rows, L("2024 employee survey results", "Résultats du sondage de 2024")) + sourceNote(g ? index.sources.groups : index
   .sources.overallPublisherUrl, L("2024 Public Service Employee Survey (open data)", "Sondage auprès des fonctionnaires fédéraux de 2024 (données ouvertes)"))
 }

 function staffing(d, o, p) {
  if (!d) return missing();
  const a = match(d.orgs, o),
   b = match(d.orgs, p);
  const qs = lens === "all" ? Object.keys(d.questions) : sqsets[lens] || [];
  if (!qs.length) return "";
  const label = t(sg[group]);
  const rows = qs.map(q => {
   const def = d.questions[q],
    x = a?.[group]?.[q],
    all = a?.all?.[q],
    z = b?.[group]?.[q];
   addEvidence("SNPS", "2025", q + " " + L(def.en, def.fr), label, pct(x), pct(all), pp(diff(x, all)), "", d.dataset, {
    kind: "staffing",
    organization: name(o),
    code: q,
    value: val(x),
    reference: group === "all" ? null : val(all),
    base: L(def.base, def.base_fr),
    group
   });
   if (p) addEvidence("SNPS" + SEP + name(p), "2025", q + " " + L(def.en, def.fr), label, pct(z), pct(b?.all?.[q]), pp(diff(z, b?.all?.[q])), "", d.dataset, {
    kind: "staffing",
    organization: name(p),
    code: q,
    value: val(z),
    reference: group === "all" ? null : val(b?.all?.[q]),
    base: L(def.base, def.base_fr),
    group
   });
   return [q + " · " + L(def.en, def.fr), L(def.base, def.base_fr), pct(x), pct(all), pp(diff(x, all)), ...(p ? [pct(z), pct(b?.all?.[q])] : [])]
  });
  if (group === "all" && a) {
   for (const k of Object.keys(sg).filter(k => k !== "all" && a[k]))
    for (const q of qs) {
     const def = d.questions[q],
      x = a[k]?.[q],
      all = a.all?.[q];
     addEvidence("SNPS", "2025", q + " " + L(def.en, def.fr), t(sg[k]), pct(x), pct(all), pp(diff(x, all)), "", d.dataset, {
      kind: "staffing",
      organization: name(o),
      code: q,
      value: val(x),
      reference: val(all),
      base: L(def.base, def.base_fr),
      group: k,
      overview: true
     })
    }
  }
  return (!a && !b ? missing() : "") + '<p>' + e(L(
   "Weighted survey percentages; the respondent base differs by question. A share who received an offer or acted in a position is not a promotion rate.",
   "Pourcentages pondérés; la population de répondants varie selon la question. La part des personnes ayant reçu une offre ou occupé un poste par intérim n’est pas un taux de promotion."
   )) + '</p>' + renderBars(rows, 0, 2, L("Show these percentages as bars", "Afficher ces pourcentages en barres")) + table([L("Question",
   "Question"), L("Respondent base", "Population de répondants"), label, L("All respondents", "Tous les répondants"), L("Difference (points)", "Écart (points)"), ...(p ? [
   name(p), name(p) + SEP + L("all respondents", "tous les répondants")
  ] : [])], rows, L("2025 staffing survey results", "Résultats du sondage sur la dotation de 2025")) + sourceNote(L(d.dataset, d.dataset_fr), L("Public Service Commission, 2025 Staffing and Non-Partisanship Survey", "Commission de la fonction publique, Sondage sur la dotation et l’impartialité politique de 2025"))
 }

 function commitments(d, o, p) {
  if (!d) return missing();
  let out = "";
  /* French summaries are used when every item has one; otherwise the English summaries are shown and marked as English. */
  const pick = (en, frArr) => fr() && Array.isArray(frArr) && frArr.length === (en || []).length && frArr.every(Boolean) ? {
   arr: frArr,
   en: false
  } : {
   arr: en || [],
   en: fr()
  };
  const goalNames = {
   indigenous_recruitment: ["Recruitment of Indigenous employees", "Recrutement d’employés autochtones"],
   black_recruitment: ["Recruitment of Black employees", "Recrutement d’employés noirs"],
   racialized_recruitment: ["Recruitment of racialized employees", "Recrutement d’employés racisés"],
   indigenous_promotion: ["Promotion of Indigenous employees", "Promotion d’employés autochtones"],
   black_promotion: ["Promotion of Black employees", "Promotion d’employés noirs"],
   racialized_promotion: ["Promotion of racialized employees", "Promotion d’employés racisés"],
   inclusion: ["Inclusion", "Inclusion"]
  };
  for (const x of [o, p].filter(Boolean)) {
   const z = ctaMatch(d.organizations, x);
   out += '<h4>' + e(name(x)) + '</h4>';
   if (!z) {
    out += missing();
    continue
   }
   const status = v => v.status === "set" ? L("goal reported as set", "objectif déclaré comme fixé") : v.status === "underway" ? L("work reported as under way",
    "travaux déclarés en cours") : L("no goal stated", "aucun objectif indiqué");
   const blocks = [
    ["2021", L("Commitments", "Engagements"), pick(z.letter?.commitments, z.letter?.commitments_fr), z.letter?.url],
    ["2021", L("Targets stated", "Cibles déclarées"), pick(z.letter?.targets, z.letter?.targets_fr), z.letter?.url],
    ["2024", L("Goals", "Objectifs"), {
     arr: Object.entries(z.self_assessment?.goals || {}).map(([k, v]) => ({
      pre: t(goalNames[k] || [k.replace(/_/g, " "), k.replace(/_/g, " ")]) + COL() + status(v),
      body: (fr() ? v.text_fr || v.text : v.text) || "",
      en: fr() && !v.text_fr && !!v.text
     })),
     en: false
    }, z.self_assessment?.url],
    ["2024", L("Reported progress", "Progrès déclarés"), pick(z.self_assessment?.progress, z.self_assessment?.progress_fr), z.self_assessment?.url],
    ["2024", L("Reported barriers", "Obstacles déclarés"), pick(z.self_assessment?.barriers, z.self_assessment?.barriers_fr), z.self_assessment?.url]
   ];
   const li = v => typeof v === "string" ? '<li>' + e(v) + '</li>' : '<li>' + e(v.pre) + (v.body ? ". " + (v.en ? '<span lang="en">' + e(v.body) + '</span>' : e(v
    .body)) : "") + '</li>',
    plain = v => typeof v === "string" ? v : v.pre + (v.body ? ". " + v.body : "");
   for (const [yr, title, p, s] of blocks) {
    const arr = p.arr;
    if (!arr?.length) continue;
    out += '<details ' + (title === L("Reported barriers", "Obstacles déclarés") ? 'open' : '') + '><summary>' + e(yr + SEP + title + " (" + arr.length +
      ")") + '</summary><ol' + (p.en ? ' lang="en"' : '') + '>' + arr.map(li).join("") + '</ol>' + sourceNote(s, yr === "2021" ? L(
      "2021 letter on the Call to Action", "Lettre de 2021 sur l’Appel à l’action") : L("2024 self-assessment", "Autoévaluation de 2024")) + '</details>';
    for (const v of arr) addEvidence("CTA" + SEP + name(x), yr, title, "", plain(v), "", "", "", s)
   }
  }
  return '<p>' + e(L(
   "Short summaries of the published letters and self-assessments. A reported goal or action is not evidence that it was achieved.",
   "Brefs résumés des lettres et autoévaluations publiées, traduits des résumés anglais pour ce site; ce ne sont pas des traductions officielles. Un objectif ou une mesure déclarés ne prouvent pas qu’ils ont été réalisés."
   )) + '</p>' + out
 }

 function hiring(d, o, p) {
  if (!d) return missing();
  let out = "";
  for (const x of [o, p].filter(Boolean)) {
   const a = match(d.hiring, x);
   if (!a?.years) continue;
   const rows = Object.entries(a.years).sort((a, b) => b[0].localeCompare(a[0])).map(([y, v]) => {
    addEvidence("PSC appointments" + SEP + name(x), y, L("Appointments by equity self-identification", "Nominations selon l’auto-identification"), "", num(v[
     0]), num(v[1]), "", "", url(SRC.hiring));
    return [y, num(v[0]), num(v[1])]
   });
   out += '<h4>' + e(name(x)) + '</h4>' + table([L("Fiscal year", "Exercice"), L("Self-identified in at least one employment equity group",
    "Auto-identifiés à au moins un groupe d’équité en emploi"), L("Did not self-identify", "Sans auto-identification")], rows, L("Appointments by fiscal year", "Nominations par exercice"))
  }
  return out ? '<p>' + e(L("Appointment counts, not unique employees or group-specific promotion rates. No individual equity-group breakdown in this table.",
    "Nombres de nominations, non personnes uniques ni taux de promotion par groupe. Aucune ventilation par groupe d’équité dans ce tableau.")) + '</p>' + out +
   sourceNote(SRC.hiring, L("Public Service Commission staffing data", "Données de dotation de la Commission de la fonction publique")) : missing()
 }

 function executives(raw, o, p) {
  if (!raw) return missing();
  const list = csv(raw);
  const rows = list.filter(r => [o, p].filter(Boolean).some(x => names(x).includes(norm(r["Department or agency"])))).sort((a, b) => String(b.Year).localeCompare(String(a.Year))).map(r => {
   addEvidence("TBS executive population", r.Year, r.Executives, r["Department or agency"], num(r["Number of employees"]), "", "", "", url(SRC.ex), {
    kind: "count",
    organization: r["Department or agency"]
   });
   return [r["Department or agency"], r.Year, r.Universe, r.Executives, num(r["Number of employees"])]
  }).sort((a, b) => String(b[1]).localeCompare(String(a[1])));
  return rows.length ? '<p>' + e(L(
    "Total numbers of executives and non-executives by year. This table does not give representation by group, and its population can differ from the employment equity population.",
    "Nombres totaux de cadres et de non-cadres par année. Ce tableau ne donne pas la représentation par groupe, et sa population peut différer de celle de l’équité en emploi."
    )) + '</p>' + table([L("Organization", "Organisme"), L("Year", "Année"), L("Universe", "Univers"), L("Category", "Catégorie"), L("Count", "Nombre")],
   rows, L("Executives and non-executives by year", "Cadres et non-cadres par année")) + sourceNote(L("https://open.canada.ca/data/en/dataset/3aeb9234-2cce-4495-970e-a177d23199ae", "https://ouvert.canada.ca/data/fr/dataset/3aeb9234-2cce-4495-970e-a177d23199ae"), L("TBS, federal public service executive and non-executive statistics", "SCT, statistiques sur les cadres et les non-cadres de la fonction publique fédérale")) : missing()
 }

 function languages(raw, o, p) {
  if (!raw) return missing();
  const rows = csv(raw).filter(r => [o, p].filter(Boolean).some(x => names(x).includes(norm(r["Department or agency"])))).sort((a, b) => String(b.Year).localeCompare(String(a.Year))).map(r => {
   const n = r["First official language"],
    label = n === "English" ? L("English", "Anglais") : n === "French" ? L("French", "Français") : n === "Unknown" ? L("Unknown", "Inconnue") : n;
   const v = num(r["Number of employees"]);
   addEvidence("TBS first official language", r.Year, label, r["Department or agency"], v, "", "", "", url(
    "data/open-canada-2026-11/tbs-fps-population-2010-2026-suppression-aligned/population-of-the-federal-public-service-by-department-and-first-official-language-march-2026-en.csv"
    ), {
    kind: "count",
    organization: r["Department or agency"]
   });
   return [r["Department or agency"], r.Year, label, v]
  }).sort((a, b) => String(b[1]).localeCompare(String(a[1])));
  return rows.length ? '<p>' + e(L(
   "Employees in March of each year from 2010 to 2026 by first official language. First official language is not second-language proficiency or access to training. Suppressed counts stay unavailable.",
   "Employés en mars de chaque année de 2010 à 2026 selon la première langue officielle. La première langue officielle ne reflète ni la compétence en langue seconde ni l’accès à la formation. Les nombres supprimés restent non disponibles."
   )) + '</p>' + table([L("Organization", "Organisme"), L("Year", "Année"), L("First official language", "Première langue officielle"), L("Employees",
   "Employés")], rows, L("Employees by first official language", "Employés selon la première langue officielle")) + sourceNote(POP_PAGE(),
   L("TBS, population of the federal public service by first official language", "SCT, population de la fonction publique fédérale selon la première langue officielle")) : missing()
 }

 function inventory(pubs, psc, cat, added, o) {
  const docs = match(pubs?.organizations, o),
   files = psc?.files || [],
   catalog = cat?.files || [];
  let out = docs?.plan ? '<p>' + link(docs.plan, L("Official departmental plan", "Plan ministériel officiel")) + '</p>' : "";
  out += (docs?.publications || []).map(d => '<p>' + link(d.url, d.title) + '</p>').join("");
  const list = [];
  for (const f of files) {
   const hits = Object.entries(f.organizations || {}).filter(([n]) => names(o).includes(norm(n)));
   if (hits.length !== 1) continue;
   const c = catalog.find(x => x.file === f.file),
    label = c ? L(c.en, c.fr) : f.file;
   if (lens === "language" && !/lang|lingu|fol/i.test(label + " " + f.file + " " + f.columns.join(" "))) continue;
   list.push([label, hits[0][0], hits[0][1], c?.years?.join(" – ") || "", url("data/psc/" + f.file), c?.url || ""])
  }
  const ao = match(added?.organizations, o) || Object.values(added?.organizations || {}).find(x => names(o).includes(norm(x.en)));
  if (ao) {
   for (const f of added.tables || []) {
    if (f.scope !== "org" || !ao.t?.[f.id]) continue;
    const label = L(f.titleEn, f.titleFr);
    if (lens === "language" && !/lang|lingu|fol/i.test(label + " " + f.id)) continue;
    const path = (fr() ? f.fr?.path : f.en?.path) || f.en?.path || f.fr?.path;
    list.push([label, ao.en, L("Indexed", "Indexé"), (f.period || []).join(" – "), path ? url(path) : "", f.url || ""])
   }
  }
  if (list.length) {
   out += '<p>' + e(L(
     "Source inventory: row counts are source records, not employee counts. Files can contain multiple organizations; use the linked department profile for filtered tables.",
     "Inventaire\u00a0: les nombres de lignes sont des enregistrements sources, non des employés. Les fichiers peuvent contenir plusieurs organismes; utiliser le profil ministériel pour les tableaux filtrés."
     )) + '</p><div class="dew-scroll"><table><thead><tr>' + [L("Dataset", "Jeu de données"), L("Published label", "Libellé publié"), L("Rows / coverage",
     "Lignes / couverture"), L("Period", "Période"), L("Files and source", "Fichiers et source")].map(h => '<th>' + e(h) + '</th>').join("") +
    '</tr></thead><tbody>' + list.map(r => '<tr>' + r.slice(0, 4).map(v => '<td>' + e(v) + '</td>').join("") + '<td>' + (r[4] ? link(r[4], L("File",
     "Fichier")) : "") + (r[5] ? " · " + link(r[5], L("Publisher", "Éditeur")) : "") + '</td></tr>').join("") + '</tbody></table></div>';
   for (const r of list) citations.push(r[4], r[5])
  }
  return out || missing()
 }

 /* Rows of the TBS population tables for one organization. */
 function popRows(raw, o) {
  if (!raw || !o) return [];
  const keys = names(o);
  return csv(raw).filter(r => keys.includes(norm(r["Department or agency"])))
 }
 const one = v => v.toLocaleString(loc(), {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
 });
 /* Share of a total, shown to one decimal. Small non-zero shares read "less than 0.1%" instead of 0.0%. */
 const share = (n, d) => {
  const v = n / d * 100;
  return v > 0 && v < 0.05 ? L("less than 0.1%", "moins de 0,1\u00a0%") : one(v) + (fr() ? "\u00a0%" : "%")
 };

 function workforce(pop, ten, o) {
  const rows = popRows(pop, o).map(r => [Number(r.Year), val(r["Number of employees"])]).filter(r => r[1] !== null).sort((a, b) => b[0] - a[0]);
  if (!rows.length) return missing();
  const [last, prev] = rows;
  let out = "";
  if (prev) {
   const change = last[1] - prev[1],
    share = prev[1] ? change / prev[1] * 100 : null;
   out += '<p>' + e(L(name(o) + " had " + num(last[1]) + " employees in March " + last[0] + ", " + (change === 0 ? "the same as" : num(Math.abs(change)) + (
     change < 0 ? " fewer than" : " more than")) + " in March " + prev[0] + (share === null || change === 0 ? "" : " (" + signed(Math.round(share * 10) /
     10) + "%)") + ".", name(o) + " comptait " + num(last[1]) + " employés en mars " + last[0] + ", " + (change === 0 ? "autant qu’" : num(Math.abs(change)) +
    (change < 0 ? " de moins qu’" : " de plus qu’")) + "en mars " + prev[0] + (share === null || change === 0 ? "" : " (" + signed(Math.round(share * 10) /
     10) + "\u00a0%)") + ".")) + '</p>';
   addEvidence("TBS population", String(last[0]), L("Employees", "Employés"), "", num(last[1]), num(prev[1]), signed(change, 0), "", POP_PAGE(), {
    kind: "headcount",
    organization: name(o),
    value: last[1],
    reference: prev[1],
    year: last[0],
    previous: prev[0]
   })
  }
  out += table([L("Year (March)", "Année (mars)"), L("Employees", "Employés")], rows.map(r => [String(r[0]), num(r[1])]), L("Employees by year",
   "Employés par année"));
  const tenure = popRows(ten, o),
   years = [...new Set(tenure.map(r => Number(r.Year)))].sort((a, b) => b - a).slice(0, 2);
  if (years.length) {
   const types = [...new Set(tenure.filter(r => years.includes(Number(r.Year))).map(r => r.Tenure))].sort();
   const total = y => rows.find(r => r[0] === y)?.[1] ?? null;
   const label = x => ({
    Indeterminate: L("Indeterminate", "Durée indéterminée"),
    Term: L("Term", "Durée déterminée"),
    Casual: L("Casual", "Occasionnel"),
    Student: L("Student", "Étudiant"),
    Unknown: L("Unknown", "Inconnu")
   } [x] || x);
   const trows = types.map(tp => {
    const cells = years.map(y => val(tenure.find(r => Number(r.Year) === y && r.Tenure === tp)?.["Number of employees"]));
    const sh = total(years[0]) && cells[0] !== null ? share(cells[0], total(years[0])) : NA();
    addEvidence("TBS tenure", String(years[0]), label(tp), "", num(cells[0]), years[1] ? num(cells[1]) : "", years[1] && cells[0] !== null && cells[1] !== null ?
     signed(cells[0] - cells[1], 0) : "", "", POP_PAGE(), {
      kind: "tenure",
      organization: name(o)
     });
    return [label(tp), ...cells.map(num), sh, years[1] && cells[0] !== null && cells[1] !== null ? signed(cells[0] - cells[1], 0) : NA()]
   });
   out += '<h4>' + e(L("Employment type", "Type d’emploi")) + '</h4>' + table([L("Employment type", "Type d’emploi"), ...years.map(String), L("Share in ",
    "Part en ") + years[0], L("Change", "Variation")], trows, L("Employees by employment type", "Employés par type d’emploi")) + '<p class="dew-small">' + e(L(
    "Shares use the organization’s total for the year. Year-to-year differences are net changes; they do not show who left, retired or transferred.",
    "Les parts sont calculées sur l’effectif total de l’année. Les écarts d’une année à l’autre sont des variations nettes; ils n’indiquent pas qui est parti, a pris sa retraite ou a été muté."
    )) + '</p>'
  }
  const moves = [
   [L("Hires", "Embauches"), "19,720", "57.2", "4.4", "8.6", "27.2", "6.4"],
   [L("Promotions", "Promotions"), "25,449", "62.6", "5.8", "9.3", "25.4", "5.8"],
   [L("Separations", "Départs"), "15,472", "57.5", "5.9", "8.7", "16.6", "4.0"]
  ].map(r => [r[0], num(Number(r[1].replace(/,/g, ""))), ...r.slice(2).map(v => pctTxt(Number(v), 1))]);
  out += '<h4>' + e(L("Public service context: hires, promotions and separations, 2024–25", "Contexte de la fonction publique\u00a0: embauches, promotions et départs, 2024-2025")) +
   '</h4>' + table([L("Movement", "Mouvement"), L("Total", "Total"), t(groups.w), L("Indigenous Peoples", "Peuples autochtones"), L("Persons with disabilities",
    "Personnes en situation de handicap"), t(groups.v), t(groups.b)], moves, L("Core public administration, 2024–25: share of each movement by group",
    "Administration publique centrale, 2024-2025\u00a0: part de chaque mouvement selon le groupe")) + '<p class="dew-small">' + e(L(
    "Core public administration, not this organization. Each percentage is the group’s share of that movement, not a rate. Groups overlap.",
    "Administration publique centrale, non cet organisme. Chaque pourcentage est la part du groupe dans ce mouvement, non un taux. Les groupes se chevauchent.")) +
   '</p>' + sourceNote(EE_REPORT(), L("TBS, Employment Equity in the Public Service of Canada 2024–2025, Tables 5 to 7",
    "SCT, L’équité en matière d’emploi dans la fonction publique du Canada 2024-2025, tableaux 5 à 7"));
  return out + sourceNote(POP_PAGE(), L("TBS, population of the federal public service (open data)", "SCT, population de la fonction publique fédérale (données ouvertes)"))
 }

 /* Equity under austerity. Published headcounts for two chosen years, an explicitly hypothetical uniform reduction,
    the 2025 representation figures to protect and the change in employment types. The scenario is arithmetic only. */
 const AUST_QUESTIONS = [
  ["How much did departmental headcount change?", "De combien l’effectif ministériel a-t-il changé?",
   "The headcount series shows net changes, not layoffs or their causes. Check transfers and changes in employment type before linking a reduction to austerity.",
   "La série d’effectifs indique des variations nettes, non des licenciements ni leurs causes. Vérifier les mutations et les changements de type d’emploi avant de lier une réduction à l’austérité."],
  ["Do published representation shares show an equity risk?", "Les proportions publiées révèlent-elles un risque pour l’équité?",
   "Representation shares show existing gaps, not who would be selected for a reduction. Ask for the affected jobs by occupation and level before estimating any impact.",
   "Les proportions de représentation montrent des écarts existants, non les personnes visées par une réduction. Demander les postes touchés par profession et par niveau avant d’estimer un effet."],
  ["Which job groups would a proposed change affect?", "Quels groupes professionnels un changement proposé toucherait-il?",
   "A change may fall mainly on some occupations or units. Ask for job-level plans and check which employees have real access to alternatives.",
   "Un changement peut toucher surtout certaines professions ou unités. Demander les plans par poste et vérifier quels employés ont réellement accès à d’autres options."],
  ["What would a hypothetical reduction mean in numbers?", "Que représenterait une réduction hypothétique en chiffres?",
   "The scenario applies one percentage to the whole headcount. It does not model a decision, departures, effects on groups or redeployment.",
   "Le scénario applique un seul pourcentage à l’ensemble de l’effectif. Il ne modélise ni une décision, ni des départs, ni des effets sur les groupes, ni des réaffectations."],
  ["How will accommodation continuity be protected?", "Comment la continuité des mesures d’adaptation sera-t-elle protégée?",
   "Before carrying out a change, require continuity of accommodations, accessibility checks and a named support process for affected roles.",
   "Avant de mettre en œuvre un changement, exiger la continuité des mesures d’adaptation, des vérifications d’accessibilité et un processus de soutien désigné pour les postes touchés."],
  ["Could career opportunities shrink unevenly?", "Les possibilités de carrière pourraient-elles diminuer inégalement?",
   "Acting roles, language training and development can change even when overall representation stays the same. Ask how they were shared out before and after the decision.",
   "Les intérims, la formation linguistique et le perfectionnement peuvent changer même si la représentation globale reste la même. Demander leur répartition avant et après la décision."],
  ["What should leaders measure before deciding?", "Que doivent mesurer les dirigeants avant de décider?",
   "Decision owners should record the baseline, the affected population, the options, a privacy-safe impact assessment, the consultation and when results will be reviewed.",
   "Les responsables de la décision devraient consigner la situation de départ, la population touchée, les options, une évaluation des effets respectueuse de la vie privée, la consultation et la date d’examen des résultats."],
  ["How will employees and networks be consulted?", "Comment les employés et les réseaux seront-ils consultés?",
   "Consult employee representatives while the decision can still change. Record the concerns raised, the responses and the mitigation chosen, not only the number of meetings.",
   "Consulter les représentants des employés tant que la décision peut encore changer. Consigner les préoccupations soulevées, les réponses et les mesures d’atténuation retenues, pas seulement le nombre de réunions."]
 ];

 function austerity(pop, ten, rep, o) {
  const rows = popRows(pop, o).map(r => [Number(r.Year), val(r["Number of employees"])]).filter(r => r[1] !== null).sort((a, b) => b[0] - a[0]);
  if (!rows.length) return missing();
  const yrs = rows.map(r => r[0]);
  if (!yrs.includes(Number(austY2))) austY2 = String(yrs[0]);
  if (!yrs.includes(Number(austY1)) || Number(austY1) >= Number(austY2)) austY1 = String(yrs.find(y => y < Number(austY2)) ?? yrs[yrs.length - 1]);
  const n1 = rows.find(r => r[0] === Number(austY1))?.[1] ?? null,
   n2 = rows.find(r => r[0] === Number(austY2))?.[1] ?? null,
   change = n1 !== null && n2 !== null ? n2 - n1 : null,
   rel = change !== null && n1 ? Math.round(change / n1 * 1000) / 10 : null,
   opts = sel => yrs.map(y => '<option value="' + y + '"' + (String(y) === sel ? " selected" : "") + '>' + y + '</option>').join("");
  let out = '<div class="dew-columns"><div><label for="dew-y1">' + e(L("From (March)", "De (mars)")) + '</label><select id="dew-y1">' + opts(austY1) +
   '</select></div><div><label for="dew-y2">' + e(L("To (March)", "À (mars)")) + '</label><select id="dew-y2">' + opts(austY2) + '</select></div></div>';
  out += '<h4>' + e(L("Observed workforce change, not separations", "Variation observée de l’effectif, non le nombre de départs")) + '</h4><p>' + e(L(
   name(o) + " had " + num(n1) + " employees in March " + austY1 + " and " + num(n2) + " in March " + austY2 + (change === null ? "." : ", a net change of " + signed(
    change, 0) + (rel === null ? "" : " (" + signed(rel) + "%)") + "."),
   name(o) + " comptait " + num(n1) + " employés en mars " + austY1 + " et " + num(n2) + " en mars " + austY2 + (change === null ? "." : ", soit une variation nette de " +
    signed(change, 0) + (rel === null ? "" : " (" + signed(rel) + " %)") + "."))) + '</p><p class="dew-small">' + e(L(
   "Net change combines hiring, departures, transfers and reorganizations. This series does not show which equity groups were affected or why the number changed.",
   "La variation nette combine les embauches, les départs, les mutations et les réorganisations. Cette série n’indique ni les groupes d’équité touchés ni la raison du changement."
   )) + '</p>';
  addEvidence("TBS population", austY1 + "–" + austY2, L("Employees", "Employés"), "", num(n2), num(n1), change === null ? NA() : signed(change, 0), "", POP_PAGE(), {
   kind: "headcount-range",
   organization: name(o)
  });
  const left = n2 === null ? null : Math.round(n2 * (1 - reduction / 100)),
   cut = reduction.toLocaleString(loc(), {
    maximumFractionDigits: 1
   });
  out += '<h4>' + e(L("Scenario: a hypothetical reduction", "Scénario : une réduction hypothétique")) + '</h4><label for="dew-reduction">' + e(L(
   "Reduction to test (%, 0 to 50)", "Réduction à tester (%, de 0 à 50)")) + '</label><input id="dew-reduction" type="number" min="0" max="50" step="0.5" value="' +
   e(String(reduction)) + '">' + (left === null ? '<p>' + e(L("No published headcount for this year.", "Aucun effectif publié pour cette année.")) + '</p>' :
    '<p class="dew-big">' + e(num(left)) + '</p><p>' + e(L("Employees left if " + cut + "% of the March " + austY2 + " headcount were removed evenly. This is arithmetic for discussion. It is not a forecast, a planned reduction or a choice of employees.",
     "Employés restants si " + cut + " % de l’effectif de mars " + austY2 + " étaient retranchés uniformément. Il s’agit d’un calcul pour la discussion. Ce n’est ni une prévision, ni une réduction prévue, ni un choix d’employés."
     )) + '</p>');
  if (left !== null) addEvidence(L("Hypothetical scenario", "Scénario hypothétique"), austY2, L("Employees left after a hypothetical " + cut + "% reduction",
   "Employés restants après une réduction hypothétique de " + cut + " %"), "", num(left), num(n2), "", "", POP_PAGE(), {
   kind: "scenario",
   organization: name(o)
  });
  const a = match(rep?.orgs, o),
   prot = ["i", "v", "b", "d"].map(k => {
    const x = a?.[k]?.["2025"];
    if (!x) return null;
    const g = diff(x[2], x[3]);
    addEvidence("TBS representation", "2025", t(groups[k]), "", pct(x[2]), pct(x[3]), pp(g), num(x[0]), url(SRC.rep), {
     kind: "rep-protect",
     organization: name(o)
    });
    return [t(groups[k]), pct(x[2]), pct(x[3]), pp(g)]
   }).filter(Boolean);
  out += '<h4>' + e(L("2025 representation to protect during a change", "Représentation en 2025 à protéger lors d’un changement")) + '</h4>' + (prot.length ? table([L(
    "Group", "Groupe"), L("Representation", "Représentation"), L("Workforce availability", "Disponibilité au sein de la population active"), L("Difference",
    "Écart")], prot, L("Representation and workforce availability, March 2025", "Représentation et disponibilité au sein de la population active, mars 2025")) +
   '<p class="dew-small">' + e(L("These are the published 2025 figures. They are not estimates of who a reduction would affect.",
    "Il s’agit des chiffres publiés de 2025. Ce ne sont pas des estimations des personnes qu’une réduction toucherait.")) + '</p>' : missing());
  const tenure = popRows(ten, o),
   tl = x => ({
    Indeterminate: L("Indeterminate", "Durée indéterminée"),
    Term: L("Term", "Durée déterminée"),
    Casual: L("Casual", "Occasionnel"),
    Student: L("Student", "Étudiant"),
    Unknown: L("Unknown", "Inconnu")
   } [x] || x),
   tv = (y, tp) => val(tenure.find(r => String(r.Year) === String(y) && r.Tenure === tp)?.["Number of employees"]),
   types = [...new Set(tenure.filter(r => [austY1, austY2].includes(String(r.Year))).map(r => r.Tenure))].sort();
  if (types.length) out += '<h4>' + e(L("Change in employment type", "Variation par type d’emploi")) + '</h4>' + table([L("Employment type", "Type d’emploi"), austY1, austY2,
   L("Net difference", "Différence nette")], types.map(tp => {
    const x = tv(austY1, tp),
     y = tv(austY2, tp);
    return [tl(tp), num(x), num(y), x !== null && y !== null ? signed(y - x, 0) : NA()]
   }), L("Employees by employment type, March " + austY1 + " and " + austY2, "Employés par type d’emploi, mars " + austY1 + " et " + austY2)) +
   '<p class="dew-small">' + e(L("Counts include people who joined and left; the same people are not followed over time.",
    "Les nombres comprennent les arrivées et les départs; on ne suit pas les mêmes personnes dans le temps.")) + '</p>';
  out += '<h4>' + e(L("Questions to settle before a decision", "Questions à régler avant une décision")) + '</h4><ol class="dew-questions">' + AUST_QUESTIONS.map(q =>
   '<li><strong>' + e(L(q[0], q[1])) + '</strong> ' + e(L(q[2], q[3])) + '</li>').join("") + '</ol>';
  out += '<h4>' + e(L("Steps for decision owners", "Étapes pour les responsables de la décision")) + '</h4><ul>' + [
   ["Get classified headcounts, staffing plans and the occupations affected before any reduction.",
    "Obtenir les effectifs par classification, les plans de dotation et les professions touchées avant toute réduction."],
   ["Test the effects on careers, accessibility and equity with the responsible authorities and with employees.",
    "Vérifier les effets sur les carrières, l’accessibilité et l’équité avec les autorités responsables et avec les employés."],
   ["Publish the baseline, the mitigation decision and a quarterly review of actual results.",
    "Publier la situation de départ, la décision d’atténuation et un examen trimestriel des résultats réels."]
  ].map(x => '<li>' + e(L(x[0], x[1])) + '</li>').join("") + '</ul>';
  return out
 }

 function bindScenario() {
  const y1 = $("y1"),
   y2 = $("y2"),
   cut = $("reduction");
  const redo = async id => {
   sync();
   await renderData();
   $(id)?.focus()
  };
  if (y1) y1.onchange = () => {
   austY1 = y1.value;
   redo("y1")
  };
  if (y2) y2.onchange = () => {
   austY2 = y2.value;
   redo("y2")
  };
  if (cut) cut.onchange = () => {
   const v = Number(cut.value);
   reduction = Number.isFinite(v) ? Math.min(50, Math.max(0, Math.round(v * 2) / 2)) : 5;
   redo("reduction")
  }
 }

 function regions(prov, pop, o) {
  const rows = popRows(prov, o);
  if (!rows.length) return missing();
  const years = [...new Set(rows.map(r => Number(r.Year)))].sort((a, b) => b - a).slice(0, 2),
   y = years[0];
  const totals = popRows(pop, o),
   total = val(totals.find(r => Number(r.Year) === y)?.["Number of employees"]);
  const label = x => x === "Unknown" ? L("Unknown", "Inconnu") : x;
  const cur = rows.filter(r => Number(r.Year) === y).map(r => [r["Province or territory of work"], val(r["Number of employees"])]).filter(r => r[1] !== null)
   .sort((a, b) => (a[0] === "Unknown") - (b[0] === "Unknown") || b[1] - a[1]);
  const prevOf = reg => years[1] ? val(rows.find(r => Number(r.Year) === years[1] && r["Province or territory of work"] === reg)?.["Number of employees"]) :
   null;
  const shown = cur.reduce((a, r) => a + r[1], 0);
  const trows = cur.map(([reg, n]) => {
   const sh = total ? share(n, total) : NA();
   addEvidence("TBS region of work", String(y), label(reg), "", num(n), total ? sh : "", "", "", POP_PAGE(), {
    kind: "region",
    organization: name(o),
    region: reg,
    value: n,
    reference: total
   });
   const p = prevOf(reg);
   return [label(reg), num(n), sh, years[1] ? (p === null ? NA() : num(p)) : NA()]
  });
  return '<p>' + e(L("March " + y + ". The National Capital Region is reported separately and is not included in the Ontario or Quebec counts.", "Mars " + y +
    ". La région de la capitale nationale est déclarée séparément et n’est pas comprise dans les nombres de l’Ontario ou du Québec.")) + '</p>' + table([L(
     "Province or territory of work", "Province ou territoire de travail"), L("Employees", "Employés"), L("Share of total", "Part du total"), years[1] ? L(
     "Employees in ", "Employés en ") + years[1] : L("Previous year", "Année précédente")], trows, L("Employees by province or territory of work",
    "Employés par province ou territoire de travail")) + (total && shown !== total ? '<p class="dew-small">' + e(L("The rows add to " + num(shown) +
    " of the " + num(total) + " employees in the organization total for the year.", "Les lignes totalisent " + num(shown) + " des " + num(total) +
    " employés de l’effectif total de l’année.")) + '</p>' : "") + sourceNote(POP_PAGE(), L("TBS, population of the federal public service by province or territory of work",
    "SCT, population de la fonction publique fédérale par province ou territoire de travail"))
 }
 /* TBS Employment Equity Demographic Snapshot 2024-2025, Figure 2: core public administration, March 31, 2025. */
 const SALARY = [
  ["all", ["All employees", "Tous les employés"], [1.1, 27.9, 29.5, 24.2, 12.5, 4.8]],
  ["w", ["Women", "Femmes"], [1.4, 32.8, 28.8, 22.4, 10.5, 4.2]],
  ["i", ["Indigenous Peoples", "Peuples autochtones"], [1.1, 30.1, 31.8, 23.9, 9.3, 3.8]],
  ["d", ["Persons with disabilities", "Personnes en situation de handicap"], [1.2, 29.1, 28.3, 23.7, 12.0, 5.7]],
  ["v", ["Members of visible minorities", "Membres des minorités visibles"], [0.9, 31.8, 29.5, 22.6, 11.5, 3.7]],
  ["b", ["Black employees", "Employés noirs"], [0.9, 40.8, 29.8, 17.9, 8.1, 2.5]]
 ];

 function pay() {
  const bands = [L("Under $50,000", "Moins de 50\u00a0000\u00a0$"), L("$50,000 to $74,999", "50\u00a0000\u00a0$ à 74\u00a0999\u00a0$"), L("$75,000 to $99,999", "75\u00a0000\u00a0$ à 99\u00a0999\u00a0$"), L(
   "$100,000 to $124,999", "100\u00a0000\u00a0$ à 124\u00a0999\u00a0$"), L("$125,000 to $149,999", "125\u00a0000\u00a0$ à 149\u00a0999\u00a0$"), L("$150,000 and over", "150\u00a0000\u00a0$ et plus")];
  const top = v => Math.round((v[4] + v[5]) * 10) / 10,
   all = top(SALARY[0][2]);
  const rows = SALARY.map(([k, g, v]) => [t(g), ...v.map(x => pctTxt(x, 1)), pctTxt(top(v), 1), k === "all" ? "" : signed(Math.round((top(v) - all) * 10) /
   10) + " " + L("points", "points")]);
  const gaps = SALARY.slice(1).map(([k, g, v]) => [t(g), Math.round((top(v) - all) * 10) / 10]).filter(x => x[1] < 0).sort((a, b) => a[1] - b[1]);
  return '<p>' + e(L("Core public administration, March 31, 2025. These are national figures; no departmental salary distribution is published in this source.",
    "Administration publique centrale, 31 mars 2025. Ce sont des chiffres nationaux; cette source ne publie pas de répartition salariale par ministère.")) +
   '</p>' + (gaps.length ? '<p>' + e(L("In salary ranges of $125,000 or more: ", "Dans les échelles de 125\u00a0000\u00a0$ ou plus\u00a0: ") + gaps.map(([g, d]) => g + " " +
    signed(d) + " " + L("points", "points")).join("; ") + L(" compared with all employees (" + pctTxt(all, 1) + ").", " par rapport à l’ensemble des employés (" +
     pctTxt(all, 1) + ").")) + '</p>' : "") + table([L("Group", "Groupe"), ...bands, L("$125,000 or more", "125\u00a0000\u00a0$ ou plus"), L(
    "Difference from all employees", "Écart avec l’ensemble")], rows, L("Share of each group in each salary range", "Part de chaque groupe dans chaque échelle salariale")) +
   '<p class="dew-small">' + e(L(
    "Each row adds to about 100%. The $125,000 or more column adds the two top ranges. Differences in salary ranges reflect occupation, level and length of service; they are not pay gaps for the same work.",
    "Chaque ligne totalise environ 100\u00a0%. La colonne 125\u00a0000\u00a0$ ou plus additionne les deux échelles supérieures. Les écarts reflètent la profession, le niveau et l’ancienneté; ce ne sont pas des écarts de salaire pour un même travail."
    )) + '</p>' + sourceNote(SNAPSHOT(), L("TBS, Employment Equity Demographic Snapshot 2024–2025, Figure 2", "SCT, Aperçu des données démographiques sur l’équité en matière d’emploi 2024-2025, figure 2"))
 }
 /* TBS, Employment Equity in the Public Service of Canada 2024-2025: core public administration, Tables 1, 2 and 6. */
 const CAREERS = [
  [["Women", "Femmes"], [56.8, 55.9, 62.6, 54.9, 41.8]],
  [["Indigenous Peoples", "Peuples autochtones"], [5.5, 5.6, 5.8, 4.0, 3.9]],
  [["Persons with disabilities", "Personnes en situation de handicap"], [9.0, 10.9, 9.3, 12.0, 5.3]],
  [["Members of visible minorities", "Membres des minorités visibles"], [23.9, 17.3, 25.4, 22.7, 15.6]],
  [["Black employees", "Employés noirs"], [5.1, 3.2, 5.8, null, null]]
 ];

 function careerContext() {
  return '<p>' + e(L("Core public administration, March 31, 2025 for workforce and executives, and 2024–25 for promotions. National figures, not this organization.",
    "Administration publique centrale, 31 mars 2025 pour l’effectif et les cadres, et 2024-2025 pour les promotions. Chiffres nationaux, non ceux de cet organisme.")) +
   '</p>' + table([L("Group", "Groupe"), L("Workforce", "Effectif"), L("Executives", "Cadres"), L("Share of promotions", "Part des promotions"), L(
    "Workforce availability", "Disponibilité de l’effectif"), L("Executive availability", "Disponibilité des cadres")], CAREERS.map(([g, v]) => [t(g), ...v.map(x =>
    x === null ? NA() : pctTxt(x, 1))]), L("Workforce, executive and promotion shares by group", "Parts de l’effectif, des cadres et des promotions selon le groupe")) +
   '<p class="dew-small">' + e(L("A share of promotions is not a promotion rate. No availability estimate is published for Black employees. Groups overlap.",
    "Une part des promotions n’est pas un taux de promotion. Aucune disponibilité n’est publiée pour les employés noirs. Les groupes se chevauchent.")) + '</p>' +
   sourceNote(EE_REPORT(), L("TBS, Employment Equity in the Public Service of Canada 2024–2025, Tables 1, 2 and 6",
    "SCT, L’équité en matière d’emploi dans la fonction publique du Canada 2024-2025, tableaux 1, 2 et 6"))
 }
 /* Main findings: each one compares a group with all employees or respondents of the same organization, source and year. */
 function computeFindings() {
  const local = name(getOrg(org)),
   out = [];
  const mine = rowInfo.map((m, i) => [m, evidence[i]]).filter(([m]) => m && m.organization === local);
  const rep = mine.filter(([m]) => m.kind === "representation");
  if (rep.length) {
   const yr = Math.max(...rep.map(([m, r]) => Number(r[1])).filter(Number.isFinite));
   const cur = rep.filter(([m, r]) => Number(r[1]) === yr && m.value !== null);
   const below = cur.filter(([m]) => m.reference !== null && m.value < m.reference).sort((a, b) => (a[0].value - a[0].reference) - (b[0].value - b[0]
    .reference));
   const above = cur.filter(([m]) => m.reference !== null && m.value >= m.reference);
   const noref = cur.filter(([m]) => m.reference === null);
   const items = below.map(([m, r]) => ({
    text: (g => L(t(groups[m.key]) + COL() + pct(m.value) + " of employees in " + yr + ", against workforce availability of " + pct(m.reference) + " (" + num(g) +
     " " + ptWord(g) + " below).", t(groups[m.key]) + COL() + pct(m.value) + " des employés en " + yr + ", par rapport à une disponibilité de " + pct(m
     .reference) + " (" + num(g) + " " + ptWord(g) + " de moins)."))(Math.round((m.reference - m.value) * 10) / 10),
    source: r[8]
   }));
   if (above.length) items.push({
    text: L("At or above availability in " + yr + ": ", "Égal ou supérieur à la disponibilité en " + yr + COL()) + above.map(([m]) => t(groups[m.key]) + " " + pct(
     m.value) + L(" (availability ", " (disponibilité ") + pct(m.reference) + ")").join("; ") + ".",
    source: above[0][1][8]
   });
   if (noref.length) items.push({
    text: noref.map(([m]) => t(groups[m.key]) + COL() + pct(m.value) + L(" of employees in ", " des employés en ") + yr + L(
     ". No availability estimate is published for this group.", ". Aucune disponibilité n’est publiée pour ce groupe.")).join(" "),
    source: noref[0][1][8]
   });
   if (items.length) out.push({
    title: L("Is each group represented at its workforce availability?", "Chaque groupe est-il représenté selon sa disponibilité?"),
    items
   })
  }
  const survey = mine.filter(([m]) => m.kind === "survey" && m.value !== null && m.reference !== null && direction(m.code) && QTEXT[m.code] && (m.group ===
   pg || m.overview && DESIGNATED.includes(m.group)));
  if (survey.length) {
   const bad = survey.map(([m, r]) => [m, r, direction(m.code) === "up" ? m.value - m.reference : m.reference - m.value]).filter(x => x[2] > 0).sort((a, b) =>
    b[2] - a[2]).slice(0, 6);
   if (bad.length) out.push({
    title: L("Which groups report less favourable results in the 2024 employee survey?",
     "Quels groupes déclarent des résultats moins favorables au sondage de 2024 auprès des employés?"),
    items: bad.map(([m, r, d]) => ({
     text: (RESP[m.group] ? t(RESP[m.group]) : fr() ? r[3] : m.group) + L(": " + pct(m.value) + " " + QTEXT[m.code][0] + ", against " + pct(m.reference) +
      " of all respondents (" + num(d) + " " + ptWord(d) + " " + (direction(m.code) === "up" ? "higher" : "lower") + "; " + num(m.count) +
      " responses, question " + m.code.slice(1) + ").", COL() + pct(m.value) + " " + QTEXT[m.code][1] + ", par rapport à " + pct(m.reference) +
      " de l’ensemble des répondants (" + num(d) + " " + ptWord(d) + " de " + (direction(m.code) === "up" ? "plus" : "moins") + "; " + num(m.count) +
      " réponses, question " + m.code.slice(1) + ")."),
     source: r[8]
    }))
   })
  }
  const staff = mine.filter(([m]) => m.kind === "staffing" && m.value !== null && m.reference !== null && m.group !== "all" && (m.overview || m.group ===
   group) && ["woman", "pwd", "ind", "rac", "black"].includes(m.group));
  if (staff.length) {
   const bad = staff.map(([m, r]) => [m, r, direction(m.code) === "up" ? m.value - m.reference : m.reference - m.value]).filter(x => x[2] > 0).sort((a, b) =>
    b[2] - a[2]).slice(0, 4);
   if (bad.length) out.push({
    title: L("Which groups report less favourable staffing experiences (2025 staffing survey)?",
     "Quels groupes déclarent des expériences de dotation moins favorables (sondage de 2025)?"),
    items: bad.map(([m, r, d]) => ({
     text: t(sg[m.group]) + COL() + pct(m.value) + " (" + r[2].replace(/^STA_\w+ /, "") + L("), against ", "), par rapport à ") + pct(m.reference) + L(
      " of all respondents (" + num(d) + " " + ptWord(d) + " less favourable).", " de l’ensemble des répondants (écart défavorable de " + num(d) + " " +
      ptWord(d) + ")."),
     source: r[8]
    }))
   })
  }
  const hc = mine.find(([m]) => m.kind === "headcount");
  if (hc) {
   const [m, r] = hc,
    d = m.value - m.reference;
   out.push({
    title: L("How has the workforce changed?", "Comment l’effectif a-t-il évolué?"),
    items: [{
     text: L(num(m.value) + " employees in March " + m.year + ", " + (d === 0 ? "unchanged from" : num(Math.abs(d)) + (d < 0 ? " fewer than in" :
      " more than in")) + " March " + m.previous + (m.reference && d !== 0 ? " (" + signed(Math.round(d / m.reference * 1000) / 10) + "%)" : "") + ".", num(m
      .value) + " employés en mars " + m.year + ", " + (d === 0 ? "sans changement depuis" : num(Math.abs(d)) + (d < 0 ? " de moins qu’en" : " de plus qu’en")) +
      " mars " + m.previous + (m.reference && d !== 0 ? " (" + signed(Math.round(d / m.reference * 1000) / 10) + "\u00a0%)" : "") + "."),
     source: r[8]
    }]
   })
  }
  const reg = mine.filter(([m]) => m.kind === "region" && m.reference).sort((a, b) => b[0].value - a[0].value).slice(0, 3);
  if (reg.length) out.push({
   title: L("Where do employees work?", "Où les employés travaillent-ils?"),
   items: [{
    text: reg.map(([m]) => (m.region === "Unknown" ? L("Unknown", "Inconnu") : m.region) + COL() + num(m.value) + " (" + share(m.value, m.reference) + ")").join(
     "; ") + ".",
    source: reg[0][1][8]
   }]
  });
  return out
 }

 function findingsPanel() {
  const f = computeFindings();
  if (!f.length) return "";
  return '<section class="dew-box dew-findings" aria-labelledby="dew-findings-title"><h3 id="dew-findings-title">' + e(L("Main findings for ",
    "Principaux constats pour ") + name(getOrg(org))) + '</h3><p class="dew-small">' + e(L(
    "Each finding compares a group with all employees or respondents in the same organization, source and year. Larger differences come first.",
    "Chaque constat compare un groupe à l’ensemble des employés ou des répondants du même organisme, de la même source et de la même année. Les écarts les plus grands viennent en premier."
    )) + '</p>' + f.map(s => '<h4>' + e(s.title) + '</h4><ul>' + s.items.map(i => '<li>' + e(i.text) + (i.source ? ' ' + link(i.source, L("Source",
    "Source")) : "") + '</li>').join("") + '</ul>').join("") + '</section>'
 }

 function download(name, rows, asCSV = false) {
  const a = document.createElement("a"),
   s = asCSV ? "\ufeff" + rows.map(r => r.map(v => {
    let x = String(v ?? "");
    if (/^\s*[=+@]/.test(x) || /^\s*-(?!\d)/.test(x)) x = "'" + x;
    return '"' + x.replace(/"/g, '""') + '"'
   }).join(",")).join("\r\n") : rows;
  a.href = URL.createObjectURL(new Blob([s], {
   type: asCSV ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8"
  }));
  a.download = name;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
 }
 /* Indicator-to-process crosswalk: a diagnostic prompt, never a causal finding. */
 let selectedIndicator = -1;
 const indicatorMap = {
  Q12: ["cu1", "cu2"],
  Q24: ["h1", "h2", "cu2"],
  Q25: ["mh1", "h1"],
  Q42: ["h1"],
  Q43: ["c2", "c3"],
  Q44e: ["a3"],
  Q45: ["c1", "c3"],
  Q47: ["cu2"],
  Q49: ["ct1", "h2"],
  Q51: ["mh1", "h2"],
  Q52: ["ct1", "ct2"],
  Q53: ["cu2", "h2"],
  Q58: ["h1", "mh1"],
  Q63: ["h1"],
  Q65: ["h2", "h1"],
  Q70: ["h1", "h2"],
  Q72: ["h1", "h2"],
  Q73p: ["a1", "mh1"],
  Q73q: ["mh1", "h2"],
  Q77: ["mh2", "mh1"],
  Q78: ["mh2"],
  Q81: ["mh1", "mh2"],
  Q84: ["a1", "a2"],
  Q85: ["a1"],
  Q86: ["a1", "a2"],
  Q87: ["a1", "a2"],
  Q88: ["a1", "h1"],
  STA_14A: ["s1", "s2", "s4"],
  STA_13: ["s2", "s4"],
  STA_01A: ["s1", "s3", "s4"],
  STA_01E: ["s4", "s2"],
  STA_01F: ["s3", "s4"],
  STA_09C: ["s1", "s2", "s4"],
  STA_04: ["c1", "c3"]
 };

 function linkedActions(r) {
  if (!r) return [];
  const code = r[2]?.match(/^(Q\d+[a-z]?|STA_\w+)\b/)?.[1];
  if (code && indicatorMap[code]) return indicatorMap[code];
  if (r[0].startsWith("TBS representation")) return ["r1", "r2"];
  if (r[0].startsWith("CTA")) return ["ct1", "ct2"];
  if (r[0].startsWith("PSC appointments")) return ["s1", "s4"];
  if (r[0].startsWith("TBS first official language")) return ["l1", "l2"];
  if (r[0].startsWith("TBS executive population")) return ["c3", "r2"];
  return ["ds1"]
 }

 function indicatorPanel() {
  const local = name(getOrg(org));
  const usable = evidence.map((r, j) => [j, r]).filter(([j, r]) => !isNA(r[4]) && (!r[0].includes(SEP) || r[0].endsWith(SEP + local)));
  return usable.length ? '<section class="dew-box"><h3>' + e(L("Link a result to processes to review", "Relier un résultat aux processus à examiner")) +
   '</h3><p>' + e(L(
    "Choose a published result to see the processes that could be reviewed. The link points to where to look; it does not explain why the result occurred.",
    "Choisir un résultat publié pour voir les processus qui pourraient être examinés. Le lien indique où regarder; il n’explique pas la cause du résultat."
    )) + '</p><label for="dew-indicator">' + e(L("Published indicator or commitment", "Indicateur ou engagement publié")) +
   '</label><select id="dew-indicator">' + options([
    ["-1", L("Select one evidence item", "Sélectionner un élément de preuve")], ...usable.map(([j, r]) => [j, r[1] + " · " + r[2] + " · " + r[4]])
   ], selectedIndicator) + '</select><div id="dew-indicator-detail"></div></section>' : ""
 }

 function showIndicator() {
  const box = $("indicator-detail");
  if (!box) return;
  const r = evidence[selectedIndicator];
  if (!r) {
   box.innerHTML = "";
   return
  }
  const ids = linkedActions(r),
   aa = actions.filter(a => ids.includes(a.id));
  box.innerHTML = '<dl><dt>' + e(L("Selected evidence", "Preuve sélectionnée")) + '</dt><dd>' + e(r[2]) + '</dd><dt>' + e(L(
    "Value and comparison (where published)", "Valeur et comparaison (si publiées)")) + '</dt><dd>' + e(r[4] + (r[5] && !isNA(r[5]) ? " / " + r[5] : "") + (r[
    6] && !isNA(r[6]) ? SEP + r[6] : "")) + '</dd></dl>' + (r[8] ? sourceNote(r[8], L("Original source", "Source originale")) : "") + '<p>' + e(L(
    "Suggested processes to review", "Processus proposés à examiner")) + '</p><ul>' + aa.map(a => '<li><strong>' + e(t(a.title)) + '.</strong> ' + e(t(a.change)) + '</li>').join("") + '</ul><button id="dew-add-linked">' + e(L("Add these review actions to the brief", "Ajouter ces actions à la note")) +
   '</button><p id="dew-add-status" role="status"></p>';
  $("add-linked").onclick = () => {
   ids.forEach(id => chosen.add(id));
   notify("actions");
   host.querySelectorAll("[data-action]").forEach(el => {
    el.checked = chosen.has(el.dataset.action)
   });
   $("add-status").textContent = L("Added recommended review actions to your brief. You can edit the selection below or in other evidence topics.",
    "Actions d’examen ajoutées à votre note. Vous pouvez modifier la sélection ci-dessous ou dans d’autres thèmes.")
  }
 }

 function actionPanel() {
  const subset = actions.filter(a => lens === "all" || a.lens === lens || a.lens === "sources");
  const body = '<p>' + e(L(
    "Choose the process changes to review. Each one names who could own it, what to measure and what evidence to request. They are proposals for local review.",
    "Choisir les changements de processus à examiner. Chacun indique qui pourrait en être responsable, quoi mesurer et quelles données demander. Ce sont des propositions à examiner localement."
    )) + '</p><div class="dew-actions">' + subset.map(a => '<details open><summary>' + e(t(a.title)) +
    '</summary><label><input type="checkbox" data-action="' + e(a.id) + '" ' + (chosen.has(a.id) ? "checked" : "") + '>' + e(L("Include in action plan",
     "Inclure dans le plan")) + '</label><dl><dt>' + e(L("Process change", "Modification du processus")) + '</dt><dd>' + e(t(a.change)) + '</dd><dt>' + e(L(
     "Proposed responsible function", "Fonction responsable proposée")) + '</dt><dd>' + e(t(a.owner)) + '</dd><dt>' + e(L("Measure", "Indicateur")) +
    '</dt><dd>' + e(t(a.measure)) + '</dd><dt>' + e(L("Evidence request", "Demande de données")) + '</dt><dd>' + e(t(a.request)) + '</dd></dl></details>')
   .join("") + '</div><label for="dew-note">' + e(L("Local context, owner, deadline and decision (no names or personal information)",
    "Contexte local, responsable, échéance et décision (sans noms ni renseignements personnels)")) + '</label><textarea id="dew-note" maxlength="2500">' + e(extraNote) +
   '</textarea><div class="dew-tabs"><button id="dew-build">' + e(L("Create the brief", "Produire la note")) +
   '</button><button id="dew-export">' + e(L("Download the brief (.txt)", "Télécharger la note (.txt)")) + '</button><button id="dew-csv">' + e(L(
    "Download displayed evidence (.csv)", "Télécharger les données affichées (.csv)")) +
   '</button></div><pre id="dew-report" style="white-space:pre-wrap;overflow-wrap:anywhere" aria-live="polite">' + e(report) + '</pre>';
  return sec(L("Create a brief", "Produire une note"), body)
 }

 function build() {
  const o = getOrg(org),
   p = getOrg(peer),
   today = new Date().toISOString().slice(0, 10);
  const lines = [L("Departmental equity evidence brief", "Note ministérielle sur les données d’équité"), name(o), L("Prepared", "Préparée le") + COL() + today, L(
   "Topic", "Thème") + COL() + t(lenses[lens])];
  if (p) lines.push(L("Comparison organization", "Organisme de comparaison") + COL() + name(p));
  const f = computeFindings();
  if (f.length) {
   lines.push("", L("Main findings", "Principaux constats"));
   for (const s of f) {
    lines.push(s.title);
    for (const i of s.items) lines.push("- " + i.text + (i.source ? " (" + i.source + ")" : ""))
   }
  }
  if (evidence[selectedIndicator]) lines.push("", L("Selected result", "Résultat choisi") + COL() + evidence[selectedIndicator].filter(x => !isNA(x) && x !== "")
   .join(" | "));
  const picked = actions.filter(a => chosen.has(a.id));
  if (picked.length) {
   lines.push("", L("Proposed actions, to validate locally", "Actions proposées, à valider localement"));
   for (const a of picked) lines.push(t(a.title), t(a.change), L("Responsible function", "Fonction responsable") + COL() + t(a.owner), L("Measure", "Indicateur") +
    COL() + t(a.measure), L("Evidence to request", "Données à demander") + COL() + t(a.request), "")
  }
  if (extraNote.trim()) lines.push("", L("Local context and decision", "Contexte local et décision") + COL() + extraNote.trim());
  lines.push("", L("Evidence shown on the page", "Données affichées"), ...evidence.map(r => r.filter(x => x !== "").join(" | ")), "", L("Sources", "Sources"),
   ...[...new Set(citations.filter(Boolean))], "", L(
    "Missing or suppressed values are not zero. These results describe differences; they do not establish causes or legal compliance.",
    "Les valeurs manquantes ou supprimées ne valent pas zéro. Ces résultats décrivent des écarts; ils n’établissent ni les causes ni la conformité."));
  report = lines.join("\n");
  $("report").textContent = report;
  return report
 }

 function bindActions() {
  if ($("indicator")) {
   $("indicator").onchange = () => {
    selectedIndicator = Number($("indicator").value);
    showIndicator()
   };
   showIndicator()
  }
  host.querySelectorAll("[data-action]").forEach(el => el.onchange = () => {
   el.checked ? chosen.add(el.dataset.action) : chosen.delete(el.dataset.action);
   notify("actions")
  });
  $("note").oninput = () => {
   extraNote = $("note").value
  };
  $("build").onclick = build;
  $("export").onclick = () => download("departmental-equity-action-" + org + ".txt", build());
  $("csv").onclick = () => download("departmental-evidence-" + org + ".csv", [
   [L("Dataset", "Jeu"), L("Period", "Période"), L("Measure", "Indicateur"), L("Group", "Groupe"), L("Published value", "Valeur publiée"), L(
    "Reference value", "Valeur de référence"), L("Difference", "Écart"), L("Count / responses", "Nombre / réponses"), L("Source", "Source")], ...evidence
  ], true)
 }

 function sync() {
  const u = new URL(location.href);
  for (const [k, v] of Object.entries({
    org,
    peer,
    lens,
    sg: group,
    pg,
    year,
    from: AUSTERITY ? austY1 : "",
    to: AUSTERITY ? austY2 : "",
    cut: AUSTERITY && reduction !== 5 ? String(reduction) : ""
   })) {
   if (v && v !== "all") u.searchParams.set(k, v);
   else u.searchParams.delete(k)
  }
  history.replaceState(null, "", u.pathname + u.search + u.hash)
 }
 async function renderData() {
  const key = ++ticket,
   o = getOrg(org),
   p = getOrg(peer);
  evidence = [];
  rowInfo = [];
  dataReady = false;
  citations = [];
  report = "";
  selectedIndicator = -1;
  sourceStatus = {};
  sourceRequests = [];
  notify("loading");
  if (!o) {
   $("result").innerHTML = '<p class="notice">' + e(L("Choose an organization to see its published results.",
    "Choisir un organisme pour voir ses résultats publiés.")) + '</p>';
   return
  }
  $("result").innerHTML = '<p role="status">' + e(L("Loading this organization’s data…", "Chargement des données de l’organisme…")) + '</p>';
  const ov = lens === "overview",
   needRep = ["all", "rep", "career", "cta", "overview"].includes(lens),
   needRepData = needRep || lens === "austerity",
   needSurvey = (qsets[lens]?.length || lens === "all"),
   needStaff = (sqsets[lens]?.length || lens === "all"),
   needCta = ["all", "cta", "language", "culture"].includes(lens),
   needInventory = ["all", "sources", "language"].includes(lens),
   needHiring = ["all", "career", "staff"].includes(lens),
   needEx = ["all", "career", "rep"].includes(lens),
   needPop = ["all", "overview", "workforce", "regions", "austerity"].includes(lens),
   needTenure = ["all", "workforce", "austerity"].includes(lens),
   needProvince = ["all", "regions"].includes(lens);
  sourceRequests = [...(needRep ? ["rep", "women"] : needRepData ? ["rep"] : []), ...(needSurvey ? ["pses"] : []), ...(needStaff ? ["snps"] : []), ...(needCta ? ["cta"] : []), ...(
   needInventory ? ["pubs", "psc", "cat", "added"] : []), ...(needHiring ? ["hiring"] : []), ...(needEx ? ["ex"] : []), ...(["language", "all"].includes(
   lens) ? ["firstLanguage"] : []), ...(needPop ? ["pop"] : []), ...(needTenure ? ["tenure"] : []), ...(needProvince ? ["province"] : [])];
  const [rep, w, index, snps, cta, pubs, psc, cat, added, hi, ex, fol, pop, ten, prov] = await Promise.all([needRepData ? guard("rep") : null, needRep ? guard(
    "women") : null, needSurvey ? guard("pses") : null, needStaff ? guard("snps") : null, needCta ? guard("cta") : null, needInventory ? guard("pubs") : null,
   needInventory ? guard("psc") : null, needInventory ? guard("cat") : null, needInventory ? guard("added") : null, needHiring ? guard("hiring") : null,
   needEx ? guard("ex") : null, ["language", "all"].includes(lens) ? guard(
    "data/open-canada-2026-11/tbs-fps-population-2010-2026-suppression-aligned/population-of-the-federal-public-service-by-department-and-first-official-language-march-2026-en.csv"
    ) : null, needPop ? guard("pop") : null, needTenure ? guard("tenure") : null, needProvince ? guard("province") : null
  ]);
  const [p1, p2] = index ? await Promise.all([getProfile(index, o), p ? getProfile(index, p) : null]) : [null, null];
  if (key !== ticket) return;
  if (needSurvey && index) sourceStatus.profile = p1 ? "ok" : "unavailable";
  if (["language", "all"].includes(lens)) sourceStatus.firstLanguage = fol ? "ok" : "failed";
  if (index) {
   const g = Object.entries({
    ...p2?.groups,
    ...p1?.groups
   });
   const label = ([k, v]) => L(k, v.fr || k);
   const first = DESIGNATED.map(k => g.find(x => x[0] === k)).filter(Boolean),
    rest = g.filter(x => !DESIGNATED.includes(x[0]) && !/not selected$/i.test(x[0])).sort((a, b) => label(a).localeCompare(label(b))),
    complements = g.filter(x => /not selected$/i.test(x[0])).sort((a, b) => label(a).localeCompare(label(b)));
   const grp = (title, list) => list.length ? '<optgroup label="' + e(title) + '">' + options(list.map(x => [x[0], label(x)]), pg) + '</optgroup>' : "";
   $("pg").innerHTML = options([
    ["all", L("All respondents (show designated groups in findings)", "Tous les répondants (groupes désignés dans les constats)")]
   ], pg) + grp(L("Designated and priority groups", "Groupes désignés et prioritaires"), first) + grp(L("Other published groups", "Autres groupes publiés"), rest) +
    grp(L("Groups defined by an answer not selected", "Groupes définis par une réponse non choisie"), complements) + (!g.some(([k]) => k === pg) && pg !==
     "all" ? options([
      [pg, pg + " (" + L("not published for this organization", "non publié pour cet organisme") + ")"]
     ], pg) : "")
  }
  let out = "";
  if (needRep) out += sec(t(lenses.rep), repr(rep, w ? csv(w) : [], o, p));
  if (needSurvey) out += sec(L("2024 Public Service Employee Survey: selected questions", "Sondage auprès des fonctionnaires fédéraux de 2024\u00a0: questions choisies"), survey(
   index, p1, p2, o, p));
  if (needStaff) out += sec(L("2025 Staffing and Non-Partisanship Survey: selected questions", "Sondage sur la dotation et l’impartialité politique de 2025\u00a0: questions choisies"),
   staffing(snps, o, p));
  if (needHiring) out += sec(L("Appointments by self-identification (Public Service Commission)", "Nominations selon l’auto-identification (Commission de la fonction publique)"),
   hiring(hi, o, p));
  if (needEx) out += sec(L("Executive and non-executive employees", "Cadres et non-cadres"), executives(ex, o, p));
  if (lens === "career") out += sec(L("Public service context: careers and executives", "Contexte de la fonction publique\u00a0: carrières et cadres"), careerContext());
  if (needPop && !ov) {
   if (["all", "workforce"].includes(lens)) out += sec(t(lenses.workforce), workforce(pop, ten, o));
   if (["all", "regions"].includes(lens)) out += sec(t(lenses.regions), regions(prov, pop, o));
  } else if (ov) workforce(pop, null, o);
  if (lens === "austerity") out = sec(t(lenses.austerity), austerity(pop, ten, rep, o)) + out;
  if (lens === "pay" || lens === "all") out += sec(t(lenses.pay), pay());
  if (needCta) out += sec(t(lenses.cta), commitments(cta, o, p));
  if (["language", "all"].includes(lens)) out += sec(L("Employees by first official language", "Employés selon la première langue officielle"), languages(fol, o,
   p));
  if (needInventory) out += sec(t(lenses.sources), inventory(pubs, psc, cat, added, o));
  if (lens === "language") out = '<p class="notice">' + e(L(
   "These sources do not publish departmental figures on language training approvals, wait times or second-language results. The survey and staffing results below give context only.",
   "Ces sources ne publient pas de données ministérielles sur les approbations de formation linguistique, les délais ou les résultats en langue seconde. Les résultats ci-dessous donnent seulement du contexte."
   )) + '</p>' + out;
  const findings = findingsPanel();
  if (ov) out = findings + (findings ? "" : missing()) + '<details class="dew-box"><summary>' + e(L("Tables behind these findings",
   "Tableaux à l’appui de ces constats")) + '</summary>' + out + '</details>';
  else out = findings + out;
  $("result").innerHTML = out + (ov ? "" : indicatorPanel()) + actionPanel();
  bindActions();
  bindScenario();
  dataReady = true;
  notify("ready");
 }

 /* Integration API for the local guided assistant. Never sends data off the site. */
 const publicState = () => ({
  d: dir,
  org,
  peer,
  lens,
  group,
  pg,
  year,
  rows: evidence.map(r => [...r]),
  actions: actions.map(a => ({
   ...a
  })),
  chosen: [...chosen],
  note: extraNote,
  sourceStatus: {
   ...sourceStatus
  },
  sourceRequests: [...sourceRequests],
  rowInfo: rowInfo.map(x => ({
   ...x
  })),
  ready: dataReady
 });
 let sourceStatus = {},
  sourceRequests = [],
  rowInfo = [],
  dataReady = false;
 const notify = (stage) => document.dispatchEvent(new CustomEvent("gce-evidence-change", {
  detail: {
   stage
  }
 }));
 window.GCEEvidenceWorkspace = {
  state: publicState,
  setSelection(x) {
   const beforeOrg = org;
   if (x.org !== undefined && (x.org === "" || dir?.organizations.some(o => o.id === x.org))) org = x.org;
   if (org !== beforeOrg) {
    chosen.clear();
    extraNote = "";
    pg = "all";
    group = "all";
    peer = ""
   }
   if (x.peer !== undefined) peer = x.peer !== org && dir?.organizations.some(o => o.id === x.peer) ? x.peer : "";
   if (x.lens && lenses[x.lens]) lens = x.lens;
   if (x.group && sg[x.group]) group = x.group;
   if (x.pg !== undefined) pg = x.pg;
   if (x.year !== undefined) year = x.year;
   sync();
   render()
  },
  selectActions(ids) {
   ids.forEach(id => {
    if (actions.some(a => a.id === id)) chosen.add(id)
   });
   host.querySelectorAll("[data-action]").forEach(el => el.checked = chosen.has(el.dataset.action));
   notify("actions")
  },
  removeAction(id) {
   chosen.delete(id);
   host.querySelectorAll("[data-action]").forEach(el => el.checked = chosen.has(el.dataset.action));
   notify("actions")
  },
  linkedActions(r) {
   return linkedActions(r)
  },
  refresh() {
   renderData()
  },
  sourceUrl: p => url(p),
  lenses,
  groups: sg,
  download,
  focus() {
   host.scrollIntoView({
    block: "start"
   })
  }
 };

 function loadAssistant() {
  const a = document.createElement("script");
  a.src = url("systemic-change/investigation-paths.js?v=20261122-7");
  a.onload = () => {
   const j = document.createElement("script");
   j.src = url("systemic-change/evidence-meaning.js?v=20261122-7");
   j.onload = j.onerror = () => {
    const b = document.createElement("script");
    b.src = url("systemic-change/assistant-enhancements.js?v=20261122-7");
    document.head.append(b)
   };
   document.head.append(j)
  };
  a.onerror = () => {
   const b = document.createElement("script");
   b.src = url("systemic-change/assistant-enhancements.js?v=20261122-7");
   document.head.append(b)
  };
  document.head.append(a)
 }

 /* Organizations offered in the selector: those with published representation or employee survey figures. */
 const withData = o => (o.sections || []).some(x => x === "who-works" || x === "experience");

 function render() {
  const o = getOrg(org),
   p = getOrg(peer),
   choices = [
    ["", L("Choose a department or agency", "Choisir un ministère ou organisme")], ...dir.organizations.filter(x => withData(x) || x.id === org || x.id ===
     peer).map(x => [x.id, name(x)]).sort((a, b) => a[1].localeCompare(b[1], loc()))
   ];
  const lensesHere = [...new Set([...(focus[slug] || Object.keys(lenses).filter(k => k !== "all" && k !== "overview" && k !== "austerity")), lens, ...(STANDALONE ? [] : ["all"])])];
  const intro = AUSTERITY ? L(
   "Choose a department or agency. The first topic compares its published headcount between two years and lets you test an explicitly hypothetical reduction. The other topics show the published figures to protect during a workforce change.",
   "Choisir un ministère ou un organisme. Le premier thème compare son effectif publié entre deux années et permet de tester une réduction explicitement hypothétique. Les autres thèmes présentent les chiffres publiés à protéger lors d’un changement d’effectif."
   ) : EXPLORER ? L(
   "Choose a department or agency. The page starts with its main findings, then each topic shows the published figures, their source and the processes to review.",
   "Choisir un ministère ou un organisme. La page commence par ses principaux constats; chaque thème présente ensuite les chiffres publiés, leur source et les processus à examiner."
   ) : L("Choose a department or agency to see its published results next to the timeline.",
   "Choisir un ministère ou un organisme pour voir ses résultats publiés à côté de la chronologie.");
  host.innerHTML = '<h2 id="dew-title">' + e(STANDALONE ? L("Choose an organization", "Choisir un organisme") : L("Your department’s evidence",
    "Les données de votre organisme")) + '</h2><p>' + e(intro) + '</p><div class="dew-box"><div class="dew-columns"><div><label for="dew-org">' + e(L(
    "Department or agency", "Ministère ou organisme")) + '</label><select id="dew-org">' + options(choices, org) + '</select></div><div><label for="dew-peer">' +
   e(L("Comparison organization (optional)", "Organisme de comparaison (facultatif)")) + '</label><select id="dew-peer">' + options([
    ["", L("No comparison", "Aucune comparaison")], ...choices.slice(1).filter(x => x[0] !== org)
   ], peer) + '</select></div><div><label for="dew-year">' + e(L("Representation year", "Année de représentation")) + '</label><select id="dew-year">' +
   options([
    ["all", L("2017 to 2025 (all years)", "2017 à 2025 (toutes les années)")], ...Array.from({
     length: 9
    }, (_, i) => [String(2025 - i), String(2025 - i)])
   ], year) + '</select></div></div><h3>' + e(L("Topic", "Thème")) + '</h3><div class="dew-tabs" role="group" aria-label="' + e(L("Topic", "Thème")) + '">' +
   lensesHere.map(k => '<button type="button" data-lens="' + e(k) + '" aria-pressed="' + (k === lens) + '">' + e(t(lenses[k])) + '</button>').join("") +
   '</div><div class="dew-columns"><div><label for="dew-pg">' + e(L("Employee survey group (2024)", "Groupe du Sondage auprès des fonctionnaires fédéraux (2024)")) +
   '</label><select id="dew-pg">' + options([
    ["all", L("All respondents (show designated groups in findings)", "Tous les répondants (groupes désignés dans les constats)")], ...(pg !== "all" ? [
     [pg, pg]
    ] : [])
   ], pg) + '</select></div><div><label for="dew-sg">' + e(L("Staffing survey group (2025)", "Groupe du sondage sur la dotation (2025)")) +
   '</label><select id="dew-sg">' + options(Object.entries(sg).map(([k, v]) => [k, t(v)]), group) + '</select></div></div>' + (o ? '<p>' + link(o.path +
    "?lang=" + (fr() ? "fr" : "en"), L("Full profile of ", "Profil complet\u00a0: ") + name(o)) + (p ? SEP + link(p.path + "?lang=" + (fr() ? "fr" : "en"), L(
    "Full profile of ", "Profil complet\u00a0: ") + name(p)) : "") + '</p>' : "") + '<p class="dew-small">' + e(L(
    "Your choices are kept in the page address so you can share the view. Notes stay in this browser tab. Do not enter names or personal information.",
    "Vos choix sont conservés dans l’adresse de la page pour la partager. Les notes restent dans cet onglet. Ne saisissez ni noms ni renseignements personnels."
    )) + '</p></div><div id="dew-result" aria-live="polite"></div>';
  $("org").onchange = () => {
   org = $("org").value;
   if (org === peer) peer = "";
   pg = "all";
   group = "all";
   chosen.clear();
   extraNote = "";
   sync();
   render()
  };
  $("peer").onchange = () => {
   peer = $("peer").value;
   sync();
   render()
  };
  $("year").onchange = () => {
   year = $("year").value;
   sync();
   renderData()
  };
  $("pg").onchange = () => {
   pg = $("pg").value;
   sync();
   renderData()
  };
  $("sg").onchange = () => {
   group = $("sg").value;
   sync();
   renderData()
  };
  host.querySelectorAll("[data-lens]").forEach(b => b.onclick = () => {
   lens = b.dataset.lens;
   sync();
   render();
   const btn = host.querySelector('[data-lens="' + lens + '"]');
   if (btn) btn.focus()
  });
  renderData();
  notify("render")
 }
 load("directory").then(d => {
  dir = d;
  const req = params.get("org") || "";
  org = d.organizations.find(o => o.id === req || o.en === req)?.id || "";
  peer = d.organizations.find(o => o.id === params.get("peer") && o.id !== org)?.id || "";
  const f = focus[slug] || Object.keys(lenses);
  if (lenses[params.get("lens")]) lens = params.get("lens");
  if (sg[params.get("sg")]) group = params.get("sg");
  pg = params.get("pg") || "all";
  year = /^20(?:1[7-9]|2[0-5])$/.test(params.get("year") || "") ? params.get("year") : "all";
  if (AUSTERITY) {
   austY1 = /^20\d\d$/.test(params.get("from") || "") ? params.get("from") : "";
   austY2 = /^20\d\d$/.test(params.get("to") || "") ? params.get("to") : "";
   const c = Number(params.get("cut"));
   if (params.get("cut") && Number.isFinite(c)) reduction = Math.min(50, Math.max(0, c))
  }
  render();
  if (HISTORY) loadAssistant();
  new MutationObserver(() => {
   if (oldLang !== document.documentElement.lang) {
    oldLang = document.documentElement.lang;
    sync();
    render()
   }
  }).observe(document.documentElement, {
   attributes: true,
   attributeFilter: ["lang"]
  });
  document.addEventListener("click", ev => {
   const a = ev.target.closest("a");
   if (!a || !org) return;
   let u;
   try {
    u = new URL(a.href)
   } catch {
    return
   }
   if (u.origin === location.origin && (u.pathname.includes("/systemic-change/") || u.pathname.includes(
    "/GC-Equity-History-Histoire-de-l-equite-au-GC/"))) {
    u.searchParams.set("org", org);
    if (peer) u.searchParams.set("peer", peer);
    if (group !== "all") u.searchParams.set("sg", group);
    if (pg !== "all") u.searchParams.set("pg", pg);
    a.href = u.href
   }
  })
 }).catch(() => {
  host.innerHTML = '<p class="notice">' + e(L("Department directory unavailable. Retry or open GC Equity directly.",
   "Répertoire ministériel indisponible. Réessayer ou ouvrir Équité-GC directement.")) + ' ' + link(root.href, "GC Equity / Équité-GC") + '</p>'
 });
})();