/* Shared PSES branch results, for every department profile. No inferred or combined values. */
(()=>{
"use strict";
const script=document.currentScript, base=new URL("../",script.src);
const slug=location.pathname.replace(base.pathname,"").replace(/\/index\.html$|\/$/g,"");
const fr=()=>document.documentElement.lang.toLowerCase().startsWith("fr");
const t=(a,b)=>fr()?b:a;
const get=p=>fetch(new URL(p,base)).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()});
const el=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e};
const root=el("div");root.id="branch-results";root.style.cssText="padding:1rem;border:1px solid currentColor;border-radius:.5rem;margin:1rem 0;scroll-margin-top:5rem";
let record,known=false,meta,rows,loading=false,err=false,group="",question="",branch="";
function mount(){
 const h=document.getElementById(fr()?"unites":"branches")|| (fr()?document.getElementById("secteurs"):null);
 if(h&&h.closest("section")){if(root.parentNode!==h.closest("section"))h.after(root)}
 else {const lib=document.getElementById(fr()?"bibliotheque":"data-library");if(lib?.closest("section")){const section=lib.closest("section");if(root.parentNode!==section.parentNode)section.before(root)}else if(!root.isConnected)document.querySelector("main")?.append(root)}
}
function render(){
 root.replaceChildren();root.append(el("h3",t("Explore employee survey results by branch and group","Explorer les résultats du sondage par direction et groupe")));
 const intro=el("p",t("2024 Public Service Employee Survey (PSES). Select an employee group, survey question and, optionally, a branch. The organization is fixed to the department you selected.","Sondage auprès des fonctionnaires fédéraux (SAFF) de 2024. Choisissez un groupe d’employés, une question et, au besoin, une direction. L’organisme est celui que vous avez sélectionné."));root.append(intro);
 if(!known){root.append(el("p",t("Checking published coverage…","Vérification des données publiées…")));return}
 if(!record){root.append(el("p",t("No separate branch-level extract is indexed for this organization. This does not mean zero responses or zero barriers. Department-wide results are available elsewhere on this page when published.","Aucun extrait par direction n’est indexé pour cet organisme. Cela ne signifie pas qu’il n’y a aucune réponse ni aucun obstacle. Les résultats de l’ensemble de l’organisme figurent ailleurs sur cette page lorsqu’ils sont publiés.")));return}
 const link=el("a",t("Official source and methodology","Source officielle et méthode"));link.href="https://open.canada.ca/data/en/dataset/7f625e97-9d02-4c12-a756-1ddebb50e69f";root.append(link);
 if(!rows){const btn=el("button",loading?t("Loading…","Chargement…"):t("Load branch-level survey results","Charger les résultats par direction"));btn.type="button";btn.disabled=loading;btn.style.cssText="display:block;margin:.8rem 0;padding:.6rem;font:inherit";btn.onclick=load;root.append(btn);if(err)root.append(el("p",t("The source could not be loaded. Try again. No values have been estimated.","La source n’a pas pu être chargée. Réessayez. Aucune valeur n’a été estimée.")));return}
 const controls=el("div");controls.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr));gap:1rem";
 function select(id,label,options,value,fn){const wrap=el("div"),l=el("label",label),s=el("select");l.htmlFor=id;s.id=id;s.style.cssText="display:block;width:100%;max-width:100%;padding:.45rem;font:inherit";for(const [v,n] of options){const o=el("option",n);o.value=String(v);s.append(o)}s.value=value;s.onchange=()=>{fn(s.value);results()};wrap.append(l,s);controls.append(wrap)}
 select("gce-branch-group",t("Employee group","Groupe d’employés"),[["",t("Select a group","Choisir un groupe")],...meta.demographics.map((d,i)=>[i,t(d.category+" — "+d.en,d.categoryFr+" — "+d.fr)])],group,v=>group=v);
 select("gce-branch-question",t("Survey question","Question du sondage"),[["",t("Select a question","Choisir une question")],...meta.questions.map((q,i)=>[i,t(q.en,q.fr)])],question,v=>question=v);
 select("gce-branch-unit",t("Branch or unit","Direction ou unité"),[["",t("All published branches","Toutes les directions publiées")],...record.branches.map(b=>[b.id,t(b.en,b.fr)])],branch,v=>branch=v);
 root.append(controls);
 const note=el("p",t("Missing and suppressed values are shown as unavailable. Do not combine branches or overlapping groups, or use response counts to reconstruct suppressed cells. Positive, neutral and negative percentages are shown only where the source provides them.","Les valeurs manquantes et supprimées sont indiquées comme indisponibles. Ne combinez pas les directions ni les groupes qui se chevauchent et ne reconstituez pas les cellules supprimées. Les pourcentages positifs, neutres et négatifs sont présentés uniquement lorsqu’ils figurent dans la source."));root.append(note);
 const output=el("div");output.id="gce-branch-output";output.setAttribute("aria-live","polite");root.append(output);results();
}
function results(){const out=document.getElementById("gce-branch-output");if(!out)return;out.replaceChildren();if(group===""||question===""){out.append(el("p",t("Choose a group and a question to see results.","Choisissez un groupe et une question pour voir les résultats.")));return}
 const names=new Map(record.branches.map(b=>[String(b.id),t(b.en,b.fr)]));
 const selected=rows.filter(r=>String(r[1])===group&&String(r[2])===question&&(!branch||String(r[0])===branch)).sort((a,b)=>(names.get(String(a[0]))||"").localeCompare(names.get(String(b[0]))||"",fr()?"fr":"en"));
 if(!selected.length){out.append(el("p",t("No published rows for this selection.","Aucune ligne publiée pour cette sélection.")));return}
 const table=el("table");table.style.cssText="border-collapse:collapse;width:100%";const cap=el("caption",t("Published results for the selected employee group and question","Résultats publiés pour le groupe et la question choisis"));table.append(cap);
 const header=el("tr"),thead=el("thead");for(const label of [t("Branch","Direction"),t("Most positive (%)","Les plus positives (%)"),t("Neutral (%)","Neutres (%)"),t("Most negative (%)","Les plus négatives (%)"),t("Answer count","Nombre de réponses")]){let th=el("th",label);th.scope="col";header.append(th)}thead.append(header);table.append(thead);
 const tbody=el("tbody");const format=(v,percent)=>{if(v===null||v===undefined||v===""||String(v)==="9999"||!Number.isFinite(Number(v))||Number(v)<0||(percent&&Number(v)>100))return t("Unavailable","Indisponible");return Number(v).toLocaleString(fr()?"fr-CA":"en-CA",{maximumFractionDigits:1})};
 for(const r of selected){let tr=el("tr"),th=el("th",names.get(String(r[0]))||String(r[0]));th.scope="row";tr.append(th);for(const field of ["MOSTPOS","NEUTRAL","MOSTNEG","ANSCOUNT"]){tr.append(el("td",format(r[3+meta.schema.indexOf(field)],field!=="ANSCOUNT")))}tbody.append(tr)}table.append(tbody);const wrap=el("div");wrap.style.overflowX="auto";wrap.tabIndex=0;wrap.setAttribute("role","region");wrap.setAttribute("aria-label",t("Branch survey results table","Tableau des résultats par direction"));wrap.append(table);out.append(wrap);
}
async function load(){if(loading)return;loading=true;err=false;render();try{const [m,res]=await Promise.all([get("assets/department-branch-definitions.json"),fetch(new URL("data/pses-2024-branches/"+record.id+".json.gz",base))]);if(!res.ok)throw Error("Source unavailable");const bytes=await res.arrayBuffer();if(typeof DecompressionStream!=="function")throw Error("Browser does not support gzip");const raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();const data=JSON.parse(raw);if(!Array.isArray(data)||!data.every(r=>Array.isArray(r)&&r.length>=3+m.schema.length))throw Error("Unexpected source format");meta=m;rows=data}catch(e){err=true}finally{loading=false;render()}}
mount();render();get("assets/department-branch-index.json").then(d=>{record=d[slug];known=true;render()}).catch(()=>{known=true;root.replaceChildren(el("p",t("Branch coverage could not be checked. Reload the page to retry.","La couverture des données par direction n’a pas pu être vérifiée. Rechargez la page.")))});
new MutationObserver(()=>{mount();render()}).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
})();
