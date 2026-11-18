
(function(){
"use strict";
var fr=document.documentElement.lang==="fr";
var checks=Array.from(document.querySelectorAll(".review-check"));
var progress=document.getElementById("check-progress");
function updateChecks(){var n=checks.filter(function(c){return c.checked;}).length;progress.textContent=fr?n+" élément"+(n>1?"s":"")+" sur "+checks.length+" coché"+(n>1?"s":""):n+" of "+checks.length+" items checked";}
checks.forEach(function(c){c.addEventListener("change",updateChecks);});
document.querySelectorAll("[data-print]").forEach(function(b){b.hidden=false;b.addEventListener("click",function(){window.print();});});
var reset=document.querySelector("[data-reset-checks]");
if(reset){reset.hidden=false;reset.addEventListener("click",function(){checks.forEach(function(c){c.checked=false;});var notes=document.getElementById("check-notes");if(notes)notes.value="";updateChecks();});}
updateChecks();
var form=document.getElementById("hazard-form"),status=document.getElementById("form-status");
function getRows(){return Array.from(form.querySelectorAll("input,textarea")).map(function(el){return [form.querySelector('label[for="'+el.id+'"]').textContent,el.value];});}
function saveFile(content,type,name){var url=URL.createObjectURL(new Blob([content],{type:type}));var a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},5000);status.textContent=fr?"Téléchargement demandé. Vérifiez les téléchargements de votre navigateur.":"Download requested. Check your browser’s downloads.";}
function csvCell(value){var text=String(value);if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
var checklistButton=document.getElementById("download-checklists");
if(checklistButton){checklistButton.hidden=false;checklistButton.addEventListener("click",function(){var title=fr?"Vérification des mesures et des données":"Measure and data review";var rows=checks.map(function(c){return (c.checked?"[x] ":"[ ] ")+c.parentElement.querySelector("span").textContent;});var notes=document.getElementById("check-notes");saveFile(title+"\n\n"+rows.join("\n")+"\n\n"+(fr?"Notes et suivi":"Notes and follow-up")+"\n"+(notes?notes.value:""),"text/plain;charset=utf-8",fr?"listes-verification-prevention.txt":"prevention-review-checklists.txt");});}
var txtButton=document.getElementById("download-record"),csvButton=document.getElementById("download-csv");
txtButton.hidden=false;csvButton.hidden=false;
txtButton.addEventListener("click",function(){var title=fr?"Fiche de prévention des risques":"Hazard prevention record";saveFile(title+"\n\n"+getRows().map(function(r){return r[0]+"\n"+r[1];}).join("\n\n"),"text/plain;charset=utf-8",fr?"fiche-prevention.txt":"hazard-prevention-record.txt");});
csvButton.addEventListener("click",function(){var rows=[[fr?"Champ":"Field",fr?"Renseignement":"Entry"]].concat(getRows());saveFile("\ufeff"+rows.map(function(r){return r.map(csvCell).join(",");}).join("\r\n"),"text/csv;charset=utf-8",fr?"fiche-prevention.csv":"hazard-prevention-record.csv");});
form.addEventListener("submit",function(e){e.preventDefault();});
form.addEventListener("reset",function(){status.textContent=fr?"Champs effacés.":"Fields cleared.";});
var filter=document.getElementById("source-filter"),refStatus=document.getElementById("source-status"),references=Array.from(document.querySelectorAll(".reference"));
function filterSources(){var n=0;references.forEach(function(r){var show=filter.value==="all"||r.dataset.group===filter.value;r.hidden=!show;if(show)n++;});refStatus.textContent=fr?n+" sources affichées":n+" sources shown";}
filter.addEventListener("change",filterSources);filterSources();
document.querySelectorAll('a[href^="#r"]').forEach(function(link){link.addEventListener("click",function(){filter.value="all";filterSources();});});
var contents=document.getElementById("contents");
if(window.matchMedia("(max-width:960px)").matches)contents.open=false;
document.querySelectorAll(".contents a").forEach(function(link){link.addEventListener("click",function(){if(window.matchMedia("(max-width:960px)").matches)contents.open=false;});});
var language=document.querySelector(".language");
if(language)language.addEventListener("click",function(){language.href=language.dataset.base+window.location.hash;});
var openBeforePrint=[];
window.addEventListener("beforeprint",function(){openBeforePrint=Array.from(document.querySelectorAll("details")).map(function(d){return [d,d.open];});openBeforePrint.forEach(function(pair){pair[0].open=true;});});
window.addEventListener("afterprint",function(){openBeforePrint.forEach(function(pair){pair[0].open=pair[1];});});
})();
