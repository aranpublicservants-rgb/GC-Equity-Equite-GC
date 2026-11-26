/* Shared PSES branch results, for every department profile. No inferred or combined values.
   Results load when the section comes into view and open on a default comparison: question 65
   for racialized and non-racialized employees, falling back to the first group pair with
   published values. Suppressed and missing values always display as unavailable, never as zero. */
(()=>{
"use strict";
const script=document.currentScript, base=new URL("../",script.src);
const slug=location.pathname.replace(base.pathname,"").replace(/\/index\.html$|\/$/g,"");
const fr=()=>document.documentElement.lang.toLowerCase().startsWith("fr");
const t=(a,b)=>fr()?b:a;
const get=p=>fetch(new URL(p,base)).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()});
const el=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e};
const root=el("div");root.id="branch-results";root.style.cssText="padding:1rem;border:1px solid currentColor;border-radius:.5rem;margin:1rem 0;scroll-margin-top:5rem;max-width:100%;box-sizing:border-box";
/* Questions listed first, in numeric order: the same key set the organization view uses. */
const KEY_QUESTIONS=["Q12","Q24","Q42","Q43","Q45","Q47","Q49","Q52","Q53","Q58","Q63","Q65","Q70","Q72"];
const DEFAULT_QUESTION="Q65",DEFAULT_PAIR="Racialized";
const SECTION_IDS=["branches","unites","secteurs","branch-results"];
/* Source categories, in the order the department pages list employee groups. */
const PAIRS=[
 ["Indigenous","Indigenous and non-Indigenous employees","Employés autochtones et non autochtones"],
 ["Black","Black employees and employees who are not Black","Employés noirs et employés qui ne sont pas noirs"],
 ["Racialized","Racialized and non-racialized employees","Employés racisés et non racisés"],
 ["Persons with disability","Employees with and without a disability","Personnes en situation de handicap et sans handicap"],
 ["2SLBGTQIA+","2SLGBTQIA+ employees and employees who are not 2SLGBTQIA+","Personnes 2ELGBTQIA+ et personnes qui ne le sont pas"],
 ["Woman","Women and employees who are not women","Femmes et personnes qui ne sont pas des femmes"],
 ["Executives","Executives and non-executives","Cadres supérieurs et autres employés"],
 ["Middle Managers","Middle managers and other employees","Gestionnaires intermédiaires et autres employés"],
 ["First official language","First official language: English and French","Première langue officielle : anglais et français"]
];
const MEASURES=[
 ["MOSTPOS","Most positive (%)","Les plus positives (%)",true],
 ["NEUTRAL","Neutral (%)","Neutres (%)",true],
 ["MOSTNEG","Most negative (%)","Les plus négatives (%)",true],
 ["AGREE","Affirmative (%)","Affirmatives (%)",true],
 ["SCORE100","Average score (out of 100)","Note moyenne (sur 100)",false],
 ["ANSCOUNT","Answer count","Nombre de réponses",false]
];
const SUMMARY=MEASURES.filter(m=>m[0]!=="ANSCOUNT");
let record,known=false,meta,rows,pairs=[],loading=false,err=false,pair="",question="",branch="",observer=null;
const valid=(v,percent)=>!(v===null||v===undefined||v===""||String(v)==="9999"||!Number.isFinite(Number(v))||Number(v)<0||(percent&&Number(v)>100));
const format=(v,percent)=>valid(v,percent)?Number(v).toLocaleString(fr()?"fr-CA":"en-CA",{maximumFractionDigits:1}):t("Unavailable","Indisponible");
const field=name=>3+meta.schema.indexOf(name);
const rank=code=>{const m=String(code).match(/=\s*(\d+)/);return m?Number(m[1]):99};
const published=r=>!!r&&SUMMARY.some(([name,,,percent])=>valid(r[field(name)],percent));
const autoLoad=()=>navigator.connection?.saveData!==true&&typeof IntersectionObserver==="function";
function buildPairs(){
 const byCategory=new Map();
 meta.demographics.forEach((d,i)=>{if(!byCategory.has(d.category))byCategory.set(d.category,[]);byCategory.get(d.category).push(i)});
 for(const list of byCategory.values())list.sort((a,b)=>rank(meta.demographics[a].code)-rank(meta.demographics[b].code));
 const out=[];
 for(const [key,en,frText] of PAIRS)if(byCategory.has(key)){out.push({key,en,fr:frText,members:byCategory.get(key)});byCategory.delete(key)}
 for(const [key,members] of byCategory)out.push({key,en:members.map(i=>meta.demographics[i].en.trim()).join(" and "),fr:members.map(i=>meta.demographics[i].fr.trim()).join(" et "),members});
 return out;
}
function hasComparison(p,q){
 const found=new Map();
 for(const r of rows)if(String(r[2])===q&&p.members.includes(r[1])&&published(r)){const k=String(r[0]),seen=(found.get(k)||new Set()).add(r[1]);found.set(k,seen);if(seen.size===p.members.length)return true}
 return false;
}
/* A link can open one comparison: ?branch-question=Q65&branch-group=Racialized&branch=200#branch-results.
   Values that do not exist for this organization are ignored and the usual defaults apply. */
function chooseDefaults(){
 pairs=buildPairs();
 const want=new URLSearchParams(location.search);
 const asked=meta.questions.findIndex(q=>q.id===want.get("branch-question"));
 const qi=asked>=0?asked:meta.questions.findIndex(q=>q.id===DEFAULT_QUESTION);
 question=String(qi>=0?qi:Math.max(0,meta.questions.findIndex(q=>KEY_QUESTIONS.includes(q.id))));
 const preferred=pairs.find(p=>p.key===DEFAULT_PAIR)||pairs[0];
 const usable=pairs.find(p=>p.key===want.get("branch-group"))||[preferred,...pairs.filter(p=>p!==preferred)].find(p=>p&&hasComparison(p,question));
 pair=(usable||preferred).key;
 const unit=want.get("branch");branch=unit&&record.branches.some(b=>String(b.id)===unit)?unit:"";
}
function mount(){
 const h=document.getElementById(fr()?"unites":"branches")|| (fr()?document.getElementById("secteurs"):null);
 if(h&&h.closest("section")){if(root.parentNode!==h.closest("section"))h.after(root)}
 else {const lib=document.getElementById(fr()?"bibliotheque":"data-library");if(lib?.closest("section")){const section=lib.closest("section");if(root.parentNode!==section.parentNode)section.before(root)}else if(!root.isConnected)document.querySelector("main")?.append(root)}
}
function render(){
 root.replaceChildren();root.append(el("h3",t("Compare survey results by branch and employee group","Comparer les résultats du sondage par direction et groupe d’employés")));
 if(!known){root.append(el("p",t("Checking published coverage…","Vérification des données publiées…")));return}
 if(!record){root.append(el("p",t("No separate branch-level extract is indexed for this organization. This does not mean zero responses or zero barriers. Department-wide results are available elsewhere on this page when published.","Aucun extrait par direction n’est indexé pour cet organisme. Cela ne signifie pas qu’il n’y a aucune réponse ni aucun obstacle. Les résultats de l’ensemble de l’organisme figurent ailleurs sur cette page lorsqu’ils sont publiés.")));return}
 root.append(el("p",t("2024 Public Service Employee Survey (PSES). Each branch shows an employee group next to its comparison group. Change the question, group or branch to narrow the results. The organization is fixed to the department you selected.","Sondage auprès des fonctionnaires fédéraux (SAFF) de 2024. Chaque direction présente un groupe d’employés à côté de son groupe de comparaison. Modifiez la question, le groupe ou la direction pour préciser les résultats. L’organisme est celui que vous avez sélectionné.")));
 const link=el("a",t("Official source and methodology","Source officielle et méthode"));link.href=fr()?"https://ouvert.canada.ca/data/fr/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f":"https://open.canada.ca/data/en/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f";root.append(link);
 if(!rows){
  const status=el("p",loading?t("Loading branch results…","Chargement des résultats par direction…"):err?t("The source could not be loaded. No values have been estimated.","La source n’a pas pu être chargée. Aucune valeur n’a été estimée."):autoLoad()?t("Branch results load when this section opens.","Les résultats par direction se chargent à l’ouverture de cette section."):t("Select the button to load branch results.","Sélectionnez le bouton pour charger les résultats par direction."));status.setAttribute("role","status");root.append(status);
  const btn=el("button",loading?t("Loading…","Chargement…"):err?t("Try again","Réessayer"):t("Load branch results now","Charger les résultats maintenant"));btn.type="button";btn.disabled=loading;btn.style.cssText="display:block;margin:.8rem 0;padding:.6rem;font:inherit";btn.onclick=load;root.append(btn);
  watch();return;
 }
 const controls=el("div");controls.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr));gap:1rem;margin-top:.8rem";
 function select(id,label,build,value,fn){const wrap=el("div"),l=el("label",label),s=el("select");l.htmlFor=id;s.id=id;s.style.cssText="display:block;width:100%;max-width:100%;padding:.45rem;font:inherit";build(s);s.value=value;s.onchange=()=>{fn(s.value);results()};wrap.append(l,s);controls.append(wrap)}
 const opt=(v,n)=>{const o=el("option",n);o.value=String(v);return o};
 select("gce-branch-question",t("Survey question","Question du sondage"),s=>{
  const key=el("optgroup"),rest=el("optgroup");key.label=t("Frequently used questions","Questions fréquemment utilisées");rest.label=t("All other questions","Toutes les autres questions");
  meta.questions.forEach((q,i)=>(KEY_QUESTIONS.includes(q.id)?key:rest).append(opt(i,t(q.en,q.fr).trim())));s.append(key,rest);
 },question,v=>question=v);
 select("gce-branch-group",t("Employee group","Groupe d’employés"),s=>{for(const p of pairs)s.append(opt(p.key,t(p.en,p.fr)))},pair,v=>pair=v);
 select("gce-branch-unit",t("Branch or unit","Direction ou unité"),s=>{s.append(opt("",t("All published branches","Toutes les directions publiées")));for(const b of record.branches)s.append(opt(b.id,t(b.en,b.fr)))},branch,v=>branch=v);
 root.append(controls);
 root.append(el("p",t("Suppressed and missing values are shown as unavailable, never as zero. Columns the survey does not publish for the selected question are hidden. Affirmative means agree, yes or option selected, as grouped by the survey. Do not combine branches or overlapping groups, or use answer counts to reconstruct suppressed cells.","Les valeurs supprimées ou manquantes sont indiquées comme indisponibles, jamais comme zéro. Les colonnes que le sondage ne publie pas pour la question choisie sont masquées. Une réponse affirmative signifie d’accord, oui ou option choisie, selon le regroupement du sondage. Ne combinez pas les directions ni les groupes qui se chevauchent et ne reconstituez pas les cellules supprimées à partir des nombres de réponses.")));
 const status=el("p");status.id="gce-branch-status";status.setAttribute("role","status");root.append(status);
 const output=el("div");output.id="gce-branch-output";root.append(output);results();
}
function results(){
 const out=document.getElementById("gce-branch-output"),status=document.getElementById("gce-branch-status");if(!out||!status)return;out.replaceChildren();
 const p=pairs.find(x=>x.key===pair)||pairs[0],q=meta.questions[Number(question)];if(!p||!q)return;
 const forQuestion=rows.filter(r=>String(r[2])===question);
 /* Columns follow what the source publishes for this question anywhere in the department, so they stay stable when the group or branch changes. */
 let columns=MEASURES.filter(([name,,,percent])=>name==="ANSCOUNT"||forQuestion.some(r=>valid(r[field(name)],percent)));
 if(columns.length===1){
  const answers=meta.schema.filter(f=>/^ANS\d$/.test(f));
  if(forQuestion.some(r=>answers.some(f=>valid(r[field(f)],true)))){status.textContent=t("The survey publishes this question only as separate answer options, without summary percentages. Open the complete branch file in the data library on this page for those values.","Le sondage publie cette question uniquement par option de réponse, sans pourcentage sommaire. Consultez le fichier complet par direction dans la bibliothèque de données de cette page.");return}
  columns=MEASURES.filter(([name])=>["MOSTPOS","MOSTNEG","AGREE","ANSCOUNT"].includes(name));
 }
 const names=new Map(record.branches.map(b=>[String(b.id),t(b.en,b.fr)]));
 const chosen=record.branches.map(b=>String(b.id)).filter(id=>!branch||id===branch).sort((a,b)=>(names.get(a)||"").localeCompare(names.get(b)||"",fr()?"fr":"en"));
 const lookup=new Map();for(const r of forQuestion)if(p.members.includes(r[1]))lookup.set(String(r[0])+"|"+r[1],r);
 /* The question and group appear above the scrolling table so they wrap on phones; the caption repeats them for screen readers. */
 const questionText=el("p",t(q.en,q.fr).trim());questionText.style.cssText="margin:.8rem 0 .2rem;font-weight:600";
 const groupText=el("p",t(p.en,p.fr)+" · "+t("published results by branch","résultats publiés par direction"));groupText.style.cssText="margin:0 0 .5rem";
 const table=el("table");table.style.cssText="border-collapse:collapse;width:100%;min-width:34rem";
 const caption=el("caption",questionText.textContent+" · "+groupText.textContent);caption.style.cssText="position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap";table.append(caption);
 const sticky="position:sticky;left:0;box-shadow:inset -1px 0 0 #c9d4d7;";
 const thead=el("thead"),header=el("tr");[t("Branch","Direction"),t("Employee group","Groupe d’employés"),...columns.map(c=>t(c[1],c[2]))].forEach((label,i)=>{const th=el("th",label);th.scope="col";if(i===0)th.style.cssText=sticky+"z-index:2;min-width:9rem";header.append(th)});thead.append(header);table.append(thead);
 let count=0;const visual=[];
 for(const id of chosen){
  const body=el("tbody");
  p.members.forEach((member,i)=>{
   const tr=el("tr"),r=lookup.get(id+"|"+member),groupName=t(meta.demographics[member].en,meta.demographics[member].fr).trim();
   if(i===0){const th=el("th",names.get(id)||id);th.scope="rowgroup";th.rowSpan=p.members.length;th.style.cssText=sticky+"z-index:1;background:#fff;min-width:9rem;overflow-wrap:normal;word-break:normal";tr.append(th)}
   const g=el("th",groupName);g.scope="row";g.style.cssText="min-width:7rem;overflow-wrap:normal;word-break:normal";tr.append(g);
   const cells=columns.map(([name,,,percent])=>valid(r?.[field(name)],percent)?Number(r[field(name)]):format(null));
   for(const [name,,,percent] of columns){const td=el("td",format(r?.[field(name)],percent));td.style.whiteSpace="nowrap";tr.append(td)}
   visual.push([names.get(id)||id,groupName,...cells]);
   if(published(r))count++;
   body.append(tr);
  });
  table.append(body);
 }
 /* Charts read these complete rows, because the branch name spans both rows of each branch. Unavailable cells stay text and are never plotted. */
 table._gceVisualData={headers:[t("Branch","Direction"),t("Employee group","Groupe d’employés"),...columns.map(c=>t(c[1],c[2]))],rows:visual,title:table.caption.textContent,lang:fr()?"fr":"en",scope:"filtered",chart:{kind:"heatmap",x:0,column:1,measure:2+Math.max(0,columns.findIndex(c=>c[0]===mainMeasure(columns))),limit:100}};
 const wrap=el("div");wrap.className="table-scroll";wrap.style.cssText="overflow-x:auto;max-width:100%";wrap.tabIndex=0;wrap.setAttribute("role","region");wrap.setAttribute("aria-label",t("Branch survey results table","Tableau des résultats par direction"));wrap.append(table);out.append(questionText,groupText,findings(p,chosen,lookup,columns,names),wrap);window.GCEquityVisuals?.update(table);
 const n=chosen.length,total=n*p.members.length;
 status.textContent=count?t(n+(n===1?" branch shown. ":" branches shown. ")+count+" of "+total+" group results are published.",n+(n===1?" direction affichée. ":" directions affichées. ")+count+" résultats de groupe publiés sur "+total+"."):t("No published values for this selection. Suppressed or missing results are shown as unavailable, not zero.","Aucune valeur publiée pour cette sélection. Les résultats supprimés ou manquants sont indiqués comme indisponibles, et non comme zéro.");
}
/* Descriptive findings for the selected question and groups: the range across branches for each group,
   and the largest gap between the two groups within one branch. Published values only; missing and
   suppressed values are excluded, never treated as zero. Not significance or causation findings. */
/* The main measure for a question: positive answers on agreement scales, the most negative answers on yes/no and extent questions, as the survey groups them. */
function mainMeasure(columns){const has=n=>columns.some(c=>c[0]===n);return has("NEUTRAL")&&has("MOSTPOS")?"MOSTPOS":["MOSTNEG","MOSTPOS","AGREE","SCORE100"].find(has)}
function findings(p,chosen,lookup,columns,names){
 const box=el("section");box.append(el("h4",t("What stands out in this selection","Ce qui ressort de cette sélection")));
 /* Agreement scales start from positive answers; yes/no and extent questions from the most negative answers, as the survey groups them. */
 const key=mainMeasure(columns);
 const lines=[];
 if(key){
  const percent=key!=="SCORE100",i=field(key),n=field("ANSCOUNT");
  const noun={MOSTPOS:["most positive answers","réponses les plus positives"],MOSTNEG:["most negative answers","réponses les plus négatives"],AGREE:["affirmative answers","réponses affirmatives"],SCORE100:["average score out of 100","note moyenne sur 100"]}[key];
  const num=v=>format(v,percent)+(percent?t("%"," %"):"");
  const answers=r=>valid(r[n],false)?t(format(r[n],false)+" answers",format(r[n],false)+" réponses"):t("answer count unavailable","nombre de réponses indisponible");
  const unit=d=>format(d,false)+(percent?t(d===1?" percentage point":" percentage points",d<2?" point de pourcentage":" points de pourcentage"):t(d===1?" point":" points",d<2?" point":" points"));
  const branchName=id=>names.get(String(id))||String(id),member=m=>t(meta.demographics[m].en,meta.demographics[m].fr).trim();
  const a=field("AGREE"),both=[...lookup.values()].filter(r=>valid(r[i],percent)&&valid(r[a],true));
  const affirmative=key!=="AGREE"&&both.length>0&&both.every(r=>Number(r[i])===Number(r[a]));
  lines.push(t("Measure: "+noun[0]+"."+(affirmative?" In this selection these are the answers the survey counts as affirmative (agree, yes or option selected).":""),"Mesure : "+noun[1]+"."+(affirmative?" Dans cette sélection, ce sont les réponses que le sondage compte comme affirmatives (d’accord, oui ou option choisie).":"")));
  for(const m of p.members){
   const list=chosen.map(id=>lookup.get(id+"|"+m)).filter(r=>r&&valid(r[i],percent)).sort((a,b)=>Number(a[i])-Number(b[i]));
   if(list.length<2)continue;const low=list[0],high=list.at(-1),d=Math.round((Number(high[i])-Number(low[i]))*100)/100;if(!d)continue;
   lines.push(t(member(m)+": lowest in "+branchName(low[0])+" at "+num(low[i])+" ("+answers(low)+"), highest in "+branchName(high[0])+" at "+num(high[i])+" ("+answers(high)+"). Range of "+unit(d)+".",member(m)+" : valeur la plus basse dans "+branchName(low[0])+", soit "+num(low[i])+" ("+answers(low)+"), et la plus élevée dans "+branchName(high[0])+", soit "+num(high[i])+" ("+answers(high)+"). Étendue de "+unit(d)+"."));
  }
  if(p.members.length===2){
   let best=null;
   for(const id of chosen){const a=lookup.get(id+"|"+p.members[0]),b=lookup.get(id+"|"+p.members[1]);if(!a||!b||!valid(a[i],percent)||!valid(b[i],percent))continue;const d=Math.round(Math.abs(Number(a[i])-Number(b[i]))*100)/100;if(d&&(!best||d>best.d))best={id,a,b,d}}
   if(best)lines.push(t("Largest gap between the two groups in one branch: "+branchName(best.id)+", where the result is "+num(best.a[i])+" for "+member(p.members[0])+" and "+num(best.b[i])+" for "+member(p.members[1])+", a gap of "+unit(best.d)+".","Écart le plus important entre les deux groupes dans une direction : "+branchName(best.id)+", où le résultat est de "+num(best.a[i])+" pour "+member(p.members[0])+" et de "+num(best.b[i])+" pour "+member(p.members[1])+", soit un écart de "+unit(best.d)+"."));
  }
 }
 if(lines.length<2)box.append(el("p",t("No range or gap can be calculated from two distinct published values in this selection.","Aucune étendue ni aucun écart ne peut être calculé à partir de deux valeurs publiées distinctes dans cette sélection.")));
 else for(const line of lines)box.append(el("p",line));
 box.append(el("p",t("These are descriptive differences between published values, not significance or causation findings. Groups and branches may overlap; missing and suppressed values are excluded, never treated as zero.","Il s’agit d’écarts descriptifs entre des valeurs publiées, et non de résultats de signification ou de causalité. Les groupes et les directions peuvent se chevaucher; les valeurs manquantes ou supprimées sont exclues, jamais traitées comme nulles.")));
 /* Question 65 has a page comparing the same groups in every branch of every organization in the file. */
 if(meta.questions[Number(question)]?.id==="Q65"){const line=el("p"),a=el("a",t("Compare these groups on this question in the branches of all organizations","Comparer ces groupes pour cette question dans les directions de toutes les organisations"));const u=new URL("branch-gaps/",base);u.searchParams.set("pair",p.key);if(fr())u.searchParams.set("lang","fr");a.href=u.href;a.id="gce-branch-gaps-link";line.append(a);box.append(line)}
 return box;
}
function watch(){
 if(observer||rows||loading||err||!record)return;
 if(SECTION_IDS.includes(location.hash.slice(1))&&navigator.connection?.saveData!==true){load();return}
 if(!autoLoad())return;
 observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer?.disconnect();observer=null;load()}},{rootMargin:"200px 0px"});
 observer.observe(root);
}
async function load(){if(loading||rows||!record)return;observer?.disconnect();observer=null;loading=true;err=false;render();try{const [m,res]=await Promise.all([get("assets/department-branch-definitions.json"),fetch(new URL("data/pses-2024-branches/"+record.id+".json.gz",base))]);if(!res.ok)throw Error("Source unavailable");const bytes=await res.arrayBuffer();const view=new Uint8Array(bytes),gz=view[0]===31&&view[1]===139;if(gz&&typeof DecompressionStream!=="function")throw Error("Browser does not support gzip");const raw=gz?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text():new TextDecoder().decode(bytes);const data=JSON.parse(raw);if(!Array.isArray(data)||!data.every(r=>Array.isArray(r)&&r.length>=3+m.schema.length))throw Error("Unexpected source format");meta=m;rows=data;chooseDefaults()}catch(e){err=true;rows=undefined}finally{loading=false;render();if(rows&&location.hash==="#branch-results")root.scrollIntoView({block:"start"})}}
window.addEventListener("hashchange",()=>{if(SECTION_IDS.includes(location.hash.slice(1)))load()});
mount();render();get("assets/department-branch-index.json").then(d=>{record=d[slug];known=true;render()}).catch(()=>{known=true;root.replaceChildren(el("p",t("Branch coverage could not be checked. Reload the page to retry.","La couverture des données par direction n’a pas pu être vérifiée. Rechargez la page.")))});
document.addEventListener("gce-department-coverage-updated",()=>{mount();render()});
new MutationObserver(()=>{mount();render()}).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
})();
