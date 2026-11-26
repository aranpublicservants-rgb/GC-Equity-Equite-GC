

(()=>{'use strict';
const D=JSON.parse(document.getElementById('data-json').textContent);
const $=id=>document.getElementById(id);
const T=(a,b)=>document.documentElement.lang==='fr'?b:a;
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label)=>'<a href="'+E(url)+'" target="_blank" rel="noopener noreferrer">'+E(label)+'</a>';
const topic=$('decision-topic'),body=$('decision-body'),q=$('decision-search');
const ground=$('case-ground'),status=$('case-status'),scope=$('case-scope');
let showAll=false;
const groundNames={race:['Race, colour or origin','Race, couleur ou origine'],religion:['Religion or creed','Religion ou croyance'],disability:['Disability','Handicap'],sex:['Sex','Sexe'],age:['Age','Âge'],family:['Family status','Situation de famille'],retaliation:['Retaliation','Représailles']};
const statusNames={allowed:['Allowed','Accueilli'],dismissed:['Dismissed','Rejeté'],mixed:['Partially successful or mixed findings','Partiellement accueilli ou conclusions mixtes'],review:['Judicial review / decision set aside or challenged','Contrôle judiciaire / décision annulée ou contestée'],precedent:['General legal precedent','Précédent juridique général']};
const scopeNames={'Federal public service':['Federal public service','Fonction publique fédérale'],'Federal public sector':['Other federal public-sector employment','Autre emploi du secteur public fédéral'],'Other federally regulated employment':['Other federally regulated employment','Autre emploi de compétence fédérale'],'General legal precedent':['General legal precedent','Précédent juridique général'],'Not an employment dispute':['Not an employment dispute','Litige non lié à l’emploi']};
for(const x of D.issues){const o=document.createElement('option');o.value=x.id;o.textContent=T(x.en,x.fr);topic.appendChild(o)}
for(const name of [...new Set(D.cases.map(x=>x.body))].sort()){const o=document.createElement('option');o.value=name;o.textContent=name;body.appendChild(o)}
for(const [el,names] of [[ground,groundNames],[status,statusNames],[scope,scopeNames]])for(const key of Object.keys(names)){const o=document.createElement('option');o.value=key;o.textContent=T(...names[key]);el.appendChild(o)}
const text=x=>[x.en,x.fr,x.body,x.body_fr,x.can,x.can_fr,x.limits,x.limits_fr,x.factors,x.factors_fr,x.title,x.citation,x.what,x.what_fr,x.outcome,x.outcome_fr,x.scope,x.status,x.sourceType,...(x.grounds||[])].filter(Boolean).join(' ').toLocaleLowerCase();
const caseMatch=x=>(!topic.value||x.issues.includes(topic.value))&&(!body.value||x.body===body.value)&&(!ground.value||x.grounds?.includes(ground.value))&&(!status.value||x.status===status.value)&&(!scope.value||x.scope===scope.value)&&(!q.value.trim()||text(x).includes(q.value.trim().toLocaleLowerCase()));
function render(){
for(const o of topic.options){if(!o.value)continue;const x=D.issues.find(y=>y.id===o.value);o.textContent=T(x.en,x.fr)}
for(const [el,names] of [[ground,groundNames],[status,statusNames],[scope,scopeNames]])for(const o of el.options){if(o.value&&names[o.value])o.textContent=T(...names[o.value])}
const query=q.value.trim().toLocaleLowerCase(),focus=topic.value;
const remedies=D.remedies.filter(x=>(!focus||x.issues.includes(focus))&&(!query||text(x).includes(query)));
const cases=D.cases.filter(caseMatch);
$('remedy-count').textContent=T(remedies.length+' remedy pathway(s) match.',remedies.length+' voie(s) de réparation correspondent.');
$('case-count').textContent=T(cases.length+' of '+D.cases.length+' indexed cases match.',cases.length+' décisions correspondantes sur '+D.cases.length+'.');
const visible=showAll?remedies:remedies.slice(0,6);
$('remedy-more').hidden=remedies.length<=6;
$('remedy-more').textContent=T(showAll?'Show fewer pathways':'Show all '+remedies.length+' pathways',showAll?'Afficher moins de voies':'Afficher les '+remedies.length+' voies');
$('remedy-results').innerHTML=visible.map(x=>'<article class="card"><h4>'+E(T(x.en,x.fr))+'</h4><p class="case-tag">'+E(T(x.body,x.body_fr))+'</p><p><strong>'+E(T('What may be ordered:','Ce qui peut être ordonné :'))+'</strong> '+E(T(x.can,x.can_fr))+'</p><p><strong>'+E(T('What this cannot guarantee:','Ce qui n’est pas garanti :'))+'</strong> '+E(T(x.limits,x.limits_fr))+'</p><details><summary>'+E(T('Factors considered','Facteurs examinés'))+'</summary><p>'+E(T(x.factors,x.factors_fr))+'</p></details><p>'+link(D.sources[x.source],T('Read the official rule or guidance','Consulter la règle ou le guide officiel'))+'</p></article>').join('')||'<p>'+E(T('No matching pathway. Clear filters or try another term.','Aucune voie correspondante. Effacez les filtres ou essayez un autre mot.'))+'</p>';
$('case-results').innerHTML=cases.map(x=>'<article class="card"><h4>'+E(x.title)+'</h4><p class="case-tag">'+E(x.citation)+' · '+E(x.body)+'</p><p><strong>'+E(T('Outcome:','Résultat :'))+'</strong> '+E(T(...(statusNames[x.status]||['Decision','Décision'])))+'</p><p class="hint">'+E(T(...(scopeNames[x.scope]||[x.scope,x.scope])))+' · '+E((x.grounds||[]).map(k=>T(...(groundNames[k]||[k,k]))).join(', ')||T('Other legal issue','Autre question juridique'))+'</p><p>'+E(T(x.what,x.what_fr))+'</p><p><strong>'+E(T('Why the case succeeded or did not:','Pourquoi la cause a été accueillie ou rejetée :'))+'</strong> '+E(T(x.factors,x.factors_fr))+'</p><p><strong>'+E(T('Decision and remedy:','Décision et réparation :'))+'</strong> '+E(T(x.outcome,x.outcome_fr))+'</p><p>'+link(x.url,T(x.sourceType==='full-decision'?'Read full decision':'Read official case record or summary',x.sourceType==='full-decision'?'Lire la décision intégrale':'Lire le dossier ou le résumé officiel'))+'</p></article>').join('')||'<p>'+E(T('No matching cases. Clear a filter or search an official database below.','Aucune décision correspondante. Effacez un filtre ou consultez une base officielle ci-dessous.'))+'</p>';
$('decision-portals').innerHTML=D.decisionPortals.map(x=>'<li>'+link(x.url,T(x.en,x.fr))+'<small>'+E(T(x.body,x.body_fr))+'</small></li>').join('');
}
for(const id of ['decision-search','decision-topic','decision-body','case-ground','case-status','case-scope'])$(id).addEventListener(id==='decision-search'?'input':'change',()=>{showAll=false;render()});
$('remedy-more').addEventListener('click',()=>{showAll=!showAll;render()});
$('language').addEventListener('click',render);
$('case-download').addEventListener('click',()=>{
const rows=D.cases.filter(caseMatch);
const cols=['Citation','Case','Decision-maker','Protected ground','Outcome category','Employment context','Issue','Reasons','Decision and remedy','Official source','Source type'];
const quote=v=>'"'+String(v??'').replace(/"/g,'""').replace(/\s+/g,' ').trim()+'"';
const csv='\uFEFF'+[cols,...rows.map(x=>[x.citation,x.title,x.body,(x.grounds||[]).join('; '),x.status,x.scope,T(x.what,x.what_fr),T(x.factors,x.factors_fr),T(x.outcome,x.outcome_fr),x.url,x.sourceType])].map(row=>row.map(quote).join(',')).join('\r\n');
const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
a.href=url;a.download='recourse-case-law.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
})();
