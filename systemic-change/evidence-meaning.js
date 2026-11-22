/* Interpretation of published departmental evidence, not a causal model or legal finding.
   No thresholds for statistical significance are invented. All gaps use the published values. */
(function(g){
"use strict";
const labels={
Q12:["Feeling valued at work","Se sentir valorisé au travail"],
Q24:["Safety to discuss racism without retaliation","Sécurité de discuter du racisme sans représailles"],
Q25:["Safety to discuss racism without harm to mental health","Sécurité de discuter du racisme sans nuire à la santé mentale"],
Q42:["Confidence in recourse without retaliation","Confiance dans les recours sans représailles"],
Q43:["Support for career development","Soutien au perfectionnement professionnel"],
Q44e:["Accommodation issues affecting career progress","Problèmes d’adaptation nuisant à la carrière"],
Q45:["Perceived promotion opportunities","Possibilités de promotion perçues"],
Q47:["Respect for individual differences","Respect des différences individuelles"],
Q49:["Perceived anti-racism initiatives","Initiatives antiracistes perçues"],
Q51:["Negative mental-health impact of racism","Impact négatif du racisme sur la santé mentale"],
Q52:["Perceived positive impact of Call to Action","Impact positif perçu de l’Appel à l’action"],
Q53:["Respectful treatment","Traitement respectueux"],
Q58:["Experienced harassment in past 12 months","Harcèlement vécu au cours des 12 derniers mois"],
Q63:["Satisfaction with harassment resolution","Satisfaction à l’égard du règlement du harcèlement"],
Q65:["Experienced discrimination in past 12 months","Discrimination vécue au cours des 12 derniers mois"],
Q70:["Satisfaction with discrimination resolution","Satisfaction à l’égard du règlement de la discrimination"],
Q72:["Satisfaction with resolution of racism concerns","Satisfaction à l’égard du règlement des préoccupations liées au racisme"],
Q73p:["Stress related to accommodation issues","Stress lié aux problèmes d’adaptation"],
Q73q:["Stress related to harassment or discrimination","Stress lié au harcèlement ou à la discrimination"],
Q77:["Self-reported mental health","Santé mentale autodéclarée"],
Q78:["Supervisor support for mental health","Soutien du superviseur en santé mentale"],
Q81:["Psychologically healthy workplace","Milieu de travail sain sur le plan psychologique"],
Q84:["Requested workplace accommodation","Demande d’adaptation au travail"],
Q85:["Accommodation request related to disability","Demande d’adaptation liée à une incapacité"],
Q86:["Accommodation measures implemented","Mesures d’adaptation mises en œuvre"],
Q87:["Satisfaction with implemented accommodations","Satisfaction à l’égard des mesures mises en œuvre"],
Q88:["Comfort requesting accommodation","Aisance à demander une adaptation"],
STA_14A:["Experienced staffing bias or barriers","Préjugés ou obstacles vécus en dotation"],
STA_13:["Staffing processes reduce or remove barriers","Processus de dotation réduisant ou éliminant les obstacles"],
STA_01E:["Perceived fairness of selection","Équité perçue de la sélection"],
STA_01F:["Perceived fairness of non-advertised appointments","Équité perçue des nominations non annoncées"],
STA_01A:["Perceived staffing transparency","Transparence perçue de la dotation"],
STA_09C:["Received an appointment offer","Offre de nomination reçue"],
STA_04:["Acted for four months or longer","Intérim d’au moins quatre mois"]
};
const negative=new Set(["Q44e","Q51","Q58","Q65","Q73p","Q73q","STA_14A"]);
const neutral=new Set(["Q84","Q85","STA_04","STA_09C"]);
const pct=(v,fr)=>Number(v).toLocaleString(fr?"fr-CA":"en-CA",{maximumFractionDigits:2})+" %";
const pp=(v,fr)=>Math.abs(v).toLocaleString(fr?"fr-CA":"en-CA",{maximumFractionDigits:2})+(fr?" points de pourcentage":" percentage points");
const delta=(a,b)=>Math.round((a-b)*100)/100;
const numeric=v=>typeof v==="number"&&Number.isFinite(v);
const text=(a,b,fr)=>fr?b:a;
const name=(r,m,fr)=>labels[m.code]?.[fr?1:0]||r[2];
const favorable=m=>m.kind==="representation"?"higher":neutral.has(m.code)?"neutral":negative.has(m.code)?"lower":"higher";
function interpret(r,m={},fr=false){
 const tr=(a,b)=>text(a,b,fr),title=name(r,m,fr),kind=m.kind||"context";
 let category="context",claim="",why="",limit="",gap=null;
 if(["representation","survey","staffing"].includes(kind)){
  if(!numeric(m.value)){category="missing";claim=tr("No published value for this selection.","Aucune valeur publiée pour cette sélection.");why=tr("Request the matching breakdown or confirm the population and suppression rules.","Demander la ventilation correspondante ou vérifier la population et les règles de suppression.");}
  else if(kind==="representation"){
   claim=tr("Representation: ","Représentation : ")+pct(m.value,fr);
   if(numeric(m.reference)){gap=delta(m.value,m.reference);category=gap<0?"barrier":gap>0?"strength":"equal";claim+=tr("; estimated workforce availability: ","; disponibilité estimée : ")+pct(m.reference,fr)+". "+(gap===0?tr("At the published benchmark.","Au niveau de la référence publiée."):pp(gap,fr)+tr(gap<0?" below the benchmark.":" above the benchmark.",gap<0?" sous la référence.":" au-dessus de la référence."));why=gap<0?tr("Review representation by occupation and level, then recruitment, advancement and departures before choosing a correction.","Examiner la représentation par profession et niveau, puis recrutement, avancement et départs avant de choisir une correction."):tr("Examine distribution by level and occupation: an overall benchmark can conceal unequal career access.","Examiner la répartition par niveau et profession : une référence globale peut masquer un accès inégal à la carrière.");}
   else{category="missing";claim+=". "+tr("No comparable availability estimate is published here.","Aucune estimation comparable de disponibilité n’est publiée ici.");why=tr("Request a valid comparator or examine career-stage measures instead.","Demander une référence valide ou examiner les mesures par étape de carrière.");}
   limit=tr("Availability is an estimated benchmark, not a quota, a headcount shortage or proof of discrimination. Population and benchmark bases can change.","La disponibilité est une référence estimée, non un quota, un manque d’effectifs ou une preuve de discrimination. Les populations et bases peuvent changer.");
  }else{
   claim=pct(m.value,fr)+" — "+r[3]+".";
   if(numeric(m.reference)){gap=delta(m.value,m.reference);const dir=favorable(m);category=gap===0?"equal":dir==="neutral"?"context":((dir==="lower"&&gap>0)||(dir==="higher"&&gap<0))?"barrier":"strength";claim+=" "+tr("All respondents in this organization: ","Tous les répondants de cet organisme : ")+pct(m.reference,fr)+". "+(gap===0?tr("Same published percentage.","Même pourcentage publié."):pp(gap,fr)+tr(gap<0?" lower.":" higher.",gap<0?" de moins.":" de plus."));why=category==="barrier"?tr("This less favourable reported result warrants a process review with affected employees; use the linked action and evidence request.","Ce résultat déclaré moins favorable justifie un examen des processus avec les employés touchés; utiliser l’action et la demande de données liées."):category==="strength"?tr("This is a comparatively more favourable reported result. Examine which practices may help and whether the result holds for other groups.","Ce résultat déclaré est relativement plus favorable. Examiner les pratiques potentiellement utiles et vérifier le résultat pour les autres groupes."):tr("Investigate context and denominators before drawing conclusions; equal or different survey percentages alone do not establish equitable access.","Examiner contexte et dénominateurs avant de conclure; les pourcentages égaux ou différents ne démontrent pas à eux seuls l’équité d’accès.");}
   else{category="context";why=tr("This is the selected population's published result. Compare the same question for employee groups to investigate differences.","Il s’agit du résultat publié de la population choisie. Comparer la même question entre groupes pour examiner les écarts.");}
   if(m.base)why+=" "+tr("Respondent base: ","Population de répondants : ")+m.base+".";
   if(numeric(m.count))why+=" "+tr("Published response count: ","Nombre de réponses publié : ")+m.count.toLocaleString(fr?"fr-CA":"en-CA")+".";
   limit=kind==="survey"?tr("Self-reported survey responses; not case counts. Groups can overlap with all respondents; differences are descriptive, not tests of significance.","Réponses autodéclarées; non des nombres de cas. Les groupes peuvent recouper l’ensemble; les écarts sont descriptifs, non des tests de signification."):tr("Weighted survey percentages; respondent bases differ by question. An offer or acting share is not a promotion rate; differences are not causal findings.","Pourcentages pondérés; populations de répondants variables. Une proportion d’offres ou d’intérims n’est pas un taux de promotion; les écarts ne sont pas causaux.");
   if(neutral.has(m.code))limit+=" "+tr("Higher or lower is not automatically better for this measure.","Une valeur supérieure ou inférieure n’est pas automatiquement préférable pour cet indicateur.");
  }
 }else if(r[0].startsWith("CTA")){
  category=/reported barriers|obstacles déclarés/i.test(r[2])?"reported":"commitment";claim=r[4];why=category==="reported"?tr("The department identified this barrier in its own published reporting. Verify its current status, relevant process and accountable function.","Le ministère a identifié cet obstacle dans ses propres rapports publiés. Vérifier son état actuel, le processus et la fonction responsable."):tr("Check the original statement, implementation evidence, responsible function and outcome measure.","Vérifier la déclaration originale, la preuve de mise en œuvre, la fonction responsable et l’indicateur de résultat.");limit=tr("A dated self-report or commitment is not independent verification of current conditions or effectiveness.","Une déclaration ou un engagement daté ne vérifie pas indépendamment les conditions actuelles ou l’efficacité.");
 }else{
  claim=r[4]||tr("Not published","Non publié");category=claim==="—"?"missing":"context";
  why=r[0].startsWith("TBS executive")?tr("This is an overall workforce count. Request executive representation by group and level to investigate advancement.","Il s’agit d’un effectif global. Demander la représentation des cadres par groupe et niveau pour examiner l’avancement."):r[0].startsWith("TBS first official language")?tr("This is first-official-language composition, not evidence of bilingual proficiency or equitable training access. Request training and position-profile data.","Il s’agit de la composition selon la première langue officielle, non des compétences bilingues ou de l’équité de formation. Demander les données de formation et de profils."):r[0].startsWith("PSC appointments")?tr("Appointment counts by self-identification; request group-specific eligible populations and stage outcomes before assessing access.","Nominations selon l’auto-identification; demander les populations admissibles par groupe et résultats par étape avant d’évaluer l’accès."):tr("Read the original source and verify reporting scope before interpreting results.","Consulter la source originale et vérifier la portée avant d’interpréter les résultats.");
  if(r[0].startsWith("PSC appointments")&&r[5]&&r[5]!=="—")claim+=" / "+r[5]+" — "+tr("self-identified / did not self-identify","auto-identification / sans auto-identification");
  limit=tr("These counts or documents do not by themselves establish a disparity, causal barrier or success.","Ces nombres ou documents ne démontrent pas à eux seuls un écart, un obstacle causal ou un succès.");
 }
 return {title,category,claim,why,limit,gap,kind};
}
function highlights(rows,meta,org,codes=[],fr=false){
 let list=rows.map((r,i)=>({r,m:meta[i]||{},i,...interpret(r,meta[i]||{},fr)})).filter(x=>x.r[0].endsWith(" — "+org)||x.m.organization===org);
 if(codes.length)list=list.filter(x=>codes.includes(x.m.code));
 // Keep latest representation observation per group, rather than treating each year as a new issue.
 const latest=new Map();for(const x of list.filter(x=>x.kind==="representation")){const k=x.m.key;if(!latest.has(k)||String(latest.get(k).r[1])<String(x.r[1]))latest.set(k,x)}
 list=list.filter(x=>x.kind!=="representation"||latest.get(x.m.key)===x);
 const unique=a=>{const seen=new Set();return a.filter(x=>{const k=x.m.code||x.m.key||x.r[2];if(seen.has(k))return false;seen.add(k);return true})};
 const rank=(a,b)=>Math.abs(b.gap??0)-Math.abs(a.gap??0);
 const barriers=unique(list.filter(x=>x.category==="barrier").sort(rank)).slice(0,3);
 const strengths=unique(list.filter(x=>x.category==="strength").sort(rank)).slice(0,2);
 const reports=list.filter(x=>x.category==="reported").slice(0,2);
 const commitments=list.filter(x=>x.category==="commitment").slice(0,2);
 const missing=unique(list.filter(x=>x.category==="missing")).slice(0,2);
 const context=unique(list.filter(x=>x.category==="context"||x.category==="equal")).slice(0,3);
 return {barriers,strengths,reports,commitments,missing,context,matched:list.length,available:list.filter(x=>x.category!=="missing").length};
}
g.GCEEvidenceMeaning={interpret,highlights,labels};
})(typeof window==="undefined"?globalThis:window);