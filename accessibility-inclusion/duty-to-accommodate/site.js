
(function(){
"use strict";
let lang=new URLSearchParams(location.search).get("lang")==="fr"?"fr":"en";
let data=[],filtered=[],shown=12,ready=false;
const el=id=>document.getElementById(id);
const msg=(en,fr)=>lang==="fr"?fr:en;
function safe(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function href(v){return /^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(v||"")?v:""}
function numeric(v){if(v===""||v==null)return null;let n=Number(v);return Number.isFinite(n)?n:null}
function formatted(v){return v===null?"—":v.toLocaleString(lang==="fr"?"fr-CA":"en-CA",{maximumFractionDigits:1})}
function parseCSV(csv){
  csv=csv.replace(/^\uFEFF/,"");let rows=[],row=[],cell="",quoted=false;
  for(let i=0;i<csv.length;i++){
    const c=csv[i];
    if(quoted){
      if(c==='"'&&csv[i+1]==='"'){cell+='"';i++}
      else if(c==='"'){quoted=false}
      else{cell+=c}
    }else{
      if(c==='"'){quoted=true}
      else if(c===","){row.push(cell);cell=""}
      else if(c==="\n"){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell=""}
      else{cell+=c}
    }
  }
  if(row.length||cell){row.push(cell);rows.push(row)}
  const head=rows.shift()||[];
  return rows.filter(x=>x.length>5).map(x=>Object.fromEntries(head.map((k,i)=>[k,x[i]||""])));
}
const metricNames={
  q87_satis_2024:["Satisfaction with measures received","Satisfaction envers les mesures reçues","q87_n_2024"],
  q86_impl_2024:["At least one measure put in place","Au moins une mesure mise en place","q86_n_2024"],
  q88_comfort_2024:["Comfort requesting accommodation","Aisance à demander une mesure","q88_n_2024"],
  q84_req_2024:["Requested accommodation","A demandé une mesure","q84_n_2024"],
  pwd_Q65_2024:["Discrimination reported by employees with disabilities","Discrimination déclarée par les employés handicapés",null],
  nopwd_Q65_2024:["Discrimination reported by employees without disabilities","Discrimination déclarée par les employés non handicapés",null],
  pwd_Q58_2024:["Harassment reported by employees with disabilities","Harcèlement déclaré par les employés handicapés",null]
};
function link(u,text){
  let url=href(u);
  return url?'<a target="_blank" rel="noopener noreferrer" href="'+safe(url)+'">'+safe(text)+'</a>':"";
}
function calculate(){
  const query=el("orgSearch").value.trim().toLocaleLowerCase();
  const key=el("metricSelect").value;
  const desc=el("sortSelect").value==="high";
  filtered=data.filter(x=>!query||x.organization.toLocaleLowerCase().includes(query)).sort((a,b)=>{
    let x=numeric(a[key]),y=numeric(b[key]);
    if(x===null)return y===null?a.organization.localeCompare(b.organization):1;
    if(y===null)return -1;
    return (desc?y-x:x-y)||a.organization.localeCompare(b.organization);
  });
}
function render(){
  if(!ready)return;
  calculate();
  const key=el("metricSelect").value,def=metricNames[key];
  el("metricTh").textContent=def[lang==="fr"?1:0]+" (%)";
  el("resultsCount").textContent=msg(filtered.length+" of "+data.length+" organizations",filtered.length+" organisations sur "+data.length);
  el("metricExplain").textContent=msg("Selected: "+def[0]+". Survey samples vary. High percentages are not always good outcomes.",
    "Indicateur : "+def[1]+". Les échantillons varient. Les pourcentages élevés ne sont pas toujours favorables.");
  el("orgTbody").innerHTML=filtered.slice(0,shown).map(r=>{
    let value=numeric(r[key]),sample=def[2]?numeric(r[def[2]]):null,days=numeric(r.audit_avg_calendar_days_to_case_closure);
    let urls=[link(r.pses_source_url,msg("PSES data","Données du SAFF")),link(r.plan_source_url,msg("Accessibility plan","Plan d'accessibilité")),link(r.audit_source_url,msg("Auditor General","Vérificatrice générale"))].filter(Boolean).join(" · ");
    let note=r.social_model_plan_reviewed==="yes"?
      msg("A selected accessibility plan was checked for social-model wording. This is not a rating of the organization.","Un plan a été examiné pour la mention du modèle social. Ce n'est pas une note donnée à l'organisation."):
      msg("Plan wording not reviewed in this dataset.","Les termes du plan n'ont pas été examinés dans ce jeu de données.");
    return '<tr><td><strong>'+safe(r.organization)+'</strong><details><summary>'+msg("View sources","Voir les sources")+'</summary><p class="fine">'+safe(note)+'</p><p>'+urls+'</p></details></td><td class="num">'+(value===null?"—":formatted(value)+"%")+'</td><td class="num">'+formatted(sample)+'</td><td class="num">'+(days===null?"—":formatted(days)+" "+msg("days","jours"))+'</td></tr>';
  }).join("")||'<tr><td colspan="4">'+msg("No results. Try another search.","Aucun résultat. Essayez une autre recherche.")+"</td></tr>";
  el("moreRows").hidden=filtered.length<=12;
  el("moreRows").textContent=shown<filtered.length?msg("Show more","Afficher plus"):msg("Show fewer","Afficher moins");
  el("moreRows").setAttribute("aria-expanded",String(shown>=filtered.length));
}
function exportCSV(){
  let key=el("metricSelect").value,den=metricNames[key][2];
  const columns=["Organization","Indicator","Percent","Sample_n","Audited_2026","Case_closure_days","PSES_source","Plan_source"];
  const rows=[columns];
  filtered.forEach(r=>rows.push([r.organization,metricNames[key][0],r[key],den?r[den]:"",r.audited_2026,r.audit_avg_calendar_days_to_case_closure,r.pses_source_url,r.plan_source_url]));
  let body=rows.map(row=>row.map(x=>'"'+String(x||"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
  let url=URL.createObjectURL(new Blob(["\uFEFF"+body],{type:"text/csv;charset=utf-8"}));
  let a=document.createElement("a");a.href=url;a.download="dta-organization-comparison.csv";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  el("exportStatus").textContent=msg("CSV downloaded.","Fichier CSV téléchargé.");
}
function letter(){
  const en="Subject: Workplace accommodation request\n\nHello,\n\nI would like to discuss a workplace barrier that affects my ability to participate fully at work: [describe the work situation and barrier].\n\nA possible adjustment would be: [suggest a solution or ask to review options together].\n\nPlease confirm the next step and expected timing. If the assessment takes time, I would also like to discuss interim support. I can provide relevant information about my work-related needs through the appropriate confidential channel.\n\nThank you.";
  const fr="Objet : Demande d'adaptation au travail\n\nBonjour,\n\nJ'aimerais discuter d'un obstacle qui nuit à ma pleine participation au travail : [décrire la situation et l'obstacle].\n\nUne solution possible serait : [proposer un changement ou demander d'examiner les options ensemble].\n\nMerci de confirmer la prochaine étape et le délai prévu. Si l'analyse prend du temps, j'aimerais discuter d'une mesure provisoire. Je peux fournir les renseignements pertinents sur mes besoins de travail par le canal confidentiel approprié.\n\nMerci.";
  el("letterText").textContent=msg(en,fr);
}
function setLang(l){
  lang=l;document.documentElement.lang=l;
  document.title=msg("Workplace accommodation: evidence and employee guidance","Adaptation au travail : données et démarches");
  document.querySelectorAll("[data-en][data-fr]").forEach(e=>{e.textContent=e.getAttribute("data-"+l)});
  el("enLang").setAttribute("aria-pressed",String(l==="en"));
  el("frLang").setAttribute("aria-pressed",String(l==="fr"));
  document.querySelectorAll("a[data-local]").forEach(a=>{let base=a.getAttribute("data-local");a.href=base+(l==="fr"?"?lang=fr":"")});
  let u=new URL(location.href);if(l==="fr")u.searchParams.set("lang","fr");else u.searchParams.delete("lang");
  history.replaceState(null,"",u.pathname+u.search+u.hash);
  letter();render();
}
function copy(){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(el("letterText").textContent).then(()=>el("copyStatus").textContent=msg("Example copied.","Exemple copié.")).catch(()=>el("copyStatus").textContent=msg("Select the text and copy it.","Sélectionnez le texte et copiez-le."));
  }else el("copyStatus").textContent=msg("Select the text and copy it.","Sélectionnez le texte et copiez-le.");
}
document.addEventListener("DOMContentLoaded",()=>{
  el("enLang").addEventListener("click",()=>setLang("en"));
  el("frLang").addEventListener("click",()=>setLang("fr"));
  ["orgSearch","metricSelect","sortSelect"].forEach(id=>el(id).addEventListener(id==="orgSearch"?"input":"change",()=>{shown=12;render()}));
  el("moreRows").addEventListener("click",()=>{shown=shown<filtered.length?shown+12:12;render()});
  el("exportRows").addEventListener("click",exportCSV);
  el("copyLetter").addEventListener("click",copy);
  setLang(lang);
  fetch("data.csv").then(r=>{if(!r.ok)throw Error(String(r.status));return r.text()})
    .then(csv=>{data=parseCSV(csv).filter(r=>r.record_type==="organization");ready=true;el("loadStatus").hidden=true;el("tableArea").hidden=false;render()})
    .catch(()=>{el("loadStatus").textContent=msg("Data unavailable. Download the source CSV from the link below.","Données indisponibles. Téléchargez le fichier CSV source ci-dessous.")});
});
})();
