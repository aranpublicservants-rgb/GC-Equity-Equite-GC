(function(){
'use strict';
const DIR='data/october-2026/';
const FILES={
ind:'TBS_Indigenous_subgroups_by_department_2025.csv',
pwd:'TBS_disability_subgroups_by_department_2024.csv',
rep:'TBS_EE_representation_with_WFA_2017-2025.csv',
ex:'TBS_EE_executives_by_EX_level_with_WFA_2017-2025.csv',
di:'DI_di_disproportionality_index_2017-2025.csv',
med:'DI_medians_salary_by_group_2017-2025.csv',
count:'DI_cleaned_imputed_salary_counts_2017-2025.csv',
imputed:'DI_imputation_estimates_NOT_TBS_PUBLISHED.csv'
};
const SOURCE={
tbs:'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics.html',
di:'https://employment-equity.github.io/',
psc:'https://www5.psc-cfp.gc.ca/dsad-dsda/staffing-dashboard/index-en.html',
pses:'https://hrdatahub-centrededonneesrh.tbs-sct.gc.ca/PSES/Home/Index?GoCTemplateCulture=en-CA'
};
const state={lang:'en',files:{},orgs:[],last:null,errors:[]};
const el=id=>document.getElementById(id);
const tr=(en,fr)=>state.lang==='fr'?(fr||en):en;
const safe=v=>String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const isNum=v=>v!==undefined&&v!==null&&String(v).trim()!==''&&Number.isFinite(Number(v));
const num=v=>isNum(v)?Number(v):null;
const fmt=v=>isNum(v)?Number(v).toLocaleString(state.lang==='fr'?'fr-CA':'en-CA'):(v===''||v===null||v===undefined?tr('Not published','Non publié'):String(v));
const pct=v=>isNum(v)?fmt(v)+'%':fmt(v);
const entry=(title,description)=>'<div class="stat"><span>'+safe(title)+'</span><div class="metric tabular">'+safe(description)+'</div></div>';
const link=(url,label)=>'<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer">'+safe(label)+'</a>';
const localSource=(key,label)=>link(DIR+FILES[key],label||FILES[key]);
const note=(s,warning)=>'<div class="note'+(warning?' warning':'')+'">'+s+'</div>';
const readDate=(row)=>row&&row.period_or_benchmark||'';
function csvParse(raw){
 const s=String(raw||'').replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];if(quoted){if(c==='"'&&s[i+1]==='"'){field+='"';i++}else if(c==='"'){quoted=false}else field+=c;}
 else if(c==='"'){quoted=true}else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));field='';if(row.some(x=>x!==''))rows.push(row);row=[];}else field+=c;}
 row.push(field.replace(/\r$/,''));if(row.some(x=>x!==''))rows.push(row);if(!rows.length)return[];
 const header=rows.shift().map(v=>v.replace(/^\uFEFF/,'').trim());return rows.map(values=>Object.fromEntries(header.map((h,i)=>[h,values[i]||''])));
}
function data(key){return state.files[key]||[]}
function mainOrgRows(key){return data(key).filter(r=>r.department_or_agency&&isNum(r.all_employees)&&!/^(grand total|total|all departments|core public administration|federal public service)/i.test(r.department_or_agency.trim()));}
function normalize(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function findOrg(key,name){
 const rows=mainOrgRows(key);
 let r=rows.find(x=>x.department_or_agency===name);if(r)return r;
 const s=normalize(name).replace(/\b(includes|only|civilian staff|public service employees)\b.*$/,'').trim();
 return rows.find(x=>normalize(x.department_or_agency).replace(/\b(includes|only|civilian staff|public service employees)\b.*$/,'').trim()===s)||null;
}
function groupInfo(key){
 const fields={
 women:['women','Women','Femmes','Women','',null],
 indigenous:['indigenous_peoples','Indigenous Peoples','Peuples autochtones','Indigenous Employees','indigenous', 'indigenous_peoples_pct'],
 disability:['persons_with_disabilities','Persons with disabilities','Personnes en situation de handicap','Employees with Disabilities','pwd','persons_with_disabilities_pct'],
 racialized:['members_of_visible_minorities','Members of visible minorities (published category)','Membres des minorités visibles (catégorie publiée)','Visible Minority Employees','',null],
 black:[null,'Black employees','Employés noirs','Black Employees','',null],
 first_nations:[null,'First Nations','Premières Nations',null,'ind','first_nations_pct'],
 metis:[null,'Métis','Métis',null,'ind','metis_pct'],
 inuit:[null,'Inuit','Inuit',null,'ind','inuit_pct']
 };
 const x=fields[key]||fields.women;return{prefix:x[0],label:tr(x[1],x[2]),medianLabel:x[3],deptDataset:x[4],deptField:x[5]};
}
const numericRows=(key,col)=>data(key).filter(r=>isNum(r[col]));
function renderedTable(headers,rows){
 if(!rows.length)return '<p class="muted">'+tr('No comparable rows available.','Aucune ligne comparable disponible.')+'</p>';
 return '<div class="tablewrap"><table><thead><tr>'+headers.map(s=>'<th scope="col">'+safe(s)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+safe(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function show(html,context){
 el('resultBody').innerHTML=html;el('results').hidden=false;el('toolsPanel').hidden=true;state.last=context;el('results').scrollIntoView({behavior:'smooth',block:'start'});
}
function rowStats(row,type){
 if(!row)return '<p class="muted">'+tr('No matching published departmental entry in this source.','Aucune entrée ministérielle correspondante dans cette source.')+'</p>';
 const first=type==='ind'?['inuit','metis','first_nations','other','indigenous_peoples']:['coordination_dexterity','mobility','speech_impairment','blind_visual_impairment','deaf_hard_of_hearing','other_disability','persons_with_disabilities'];
 const display={inuit:'Inuit',metis:'Métis',first_nations:'First Nations',other:'Other Indigenous identity',indigenous_peoples:'Indigenous Peoples',coordination_dexterity:'Coordination/dexterity',mobility:'Mobility',speech_impairment:'Speech',blind_visual_impairment:'Blind/visual',deaf_hard_of_hearing:'Deaf/hard of hearing',other_disability:'Other disability',persons_with_disabilities:'Persons with disabilities'};
 const rows=first.map(f=>[display[f],fmt(row[f+'_number']),pct(row[f+'_pct'])]);
 return '<div class="stats">'+entry(tr('Employees in the source population','Employés dans la population étudiée'),fmt(row.all_employees))+'</div>'+renderedTable([tr('Published subgroup','Sous-groupe publié'),tr('Count','Nombre'),tr('Share of this source population','Part dans cette population')],rows);
}
function showOrg(name){
 const ind=findOrg('ind',name),pwd=findOrg('pwd',name);
 const totalInd=data('ind').find(r=>r.department_or_agency==='Grand Total');
 const totalPwd=data('pwd').find(r=>r.department_or_agency==='Total');
 function benchmarkCard(row,overall,col,label){
   if(!row||!overall||!isNum(row[col])||!isNum(overall[col]))return'';
   const gap=(Number(row[col])-Number(overall[col])).toFixed(1);
   return '<div class="stats">'+entry(label+' — '+tr('organization','organisme'),pct(row[col]))+
     entry(label+' — '+tr('CPA overall, same year','administration centrale, même année'),pct(overall[col]))+
     entry(tr('Difference from CPA overall','Écart par rapport à l’ensemble'),(Number(gap)>0?'+':'')+gap+' '+tr('percentage points','points de pourcentage'))+'</div>';
 }
 const html='<h2>'+safe(name)+'</h2>'+
 '<p class="muted">'+tr('Available departmental subgroup datasets are shown below, each with its own reporting year. For PSES, recruitment, promotions, salary and other detailed records, use the preserved full explorer.','Les sous-groupes ministériels disponibles figurent ci-dessous avec leur année. Pour le SAFF, les promotions, les salaires et autres détails, ouvrir l’explorateur complet.')+'</p>'+
 '<h3>'+tr('Indigenous subgroups — March 31, 2025','Sous-groupes autochtones — 31 mars 2025')+'</h3>'+benchmarkCard(ind,totalInd,'indigenous_peoples_pct','Indigenous Peoples')+rowStats(ind,'ind')+
 '<p class="sources">'+localSource('ind',tr('Download source CSV','Télécharger le CSV'))+' · '+link(SOURCE.tbs,tr('Official source context','Contexte de la source officielle'))+'</p>'+
 '<h3>'+tr('Disability subgroups — March 31, 2024','Sous-groupes liés aux handicaps — 31 mars 2024')+'</h3>'+benchmarkCard(pwd,totalPwd,'persons_with_disabilities_pct','Persons with disabilities')+rowStats(pwd,'pwd')+
 '<p class="sources">'+localSource('pwd',tr('Download source CSV','Télécharger le CSV'))+' · '+link(SOURCE.tbs,tr('Official source context','Contexte de la source officielle'))+'</p>'+
 note(tr('These different-year snapshots must not be combined into one headcount. Published subgroup categories may overlap and suppressed values must remain suppressed. Organization names are matched conservatively; absent entries are not replaced with public-service totals.','Ces données provenant d’années différentes ne doivent pas être additionnées. Certains sous-groupes se chevauchent. Les valeurs supprimées restent supprimées.'),true)+
 '<h3>'+tr('More evidence for this department','Autres données pour ce ministère')+'</h3><p>'+tr('Open the complete preserved explorer for representation benchmarks, employee surveys, staffing, salary, executives and other sections. You may need to reselect the organization there.','Ouvrir l’explorateur complet pour la représentation, les sondages, la dotation, les salaires et les cadres. Il peut être nécessaire de sélectionner de nouveau l’organisme.')+'</p><p><a class="btn" href="explorer.html">'+tr('Open complete explorer','Ouvrir l’explorateur complet')+'</a></p>';
 show(html,{type:'org',name,ind,pwd});
}
function repRows(prefix){
 return data('rep').filter(r=>r.row_type==='representation'&&isNum(r[prefix+'_pct'])).map(r=>({year:(r.period_or_benchmark.match(/\b20\d\d\b/)||[])[0]||'',percent:Number(r[prefix+'_pct']),count:r[prefix+'_number']})).filter(r=>r.year).sort((a,b)=>a.year.localeCompare(b.year));
}
function repWfa(prefix){
 return data('rep').find(r=>r.row_type==='workforce_availability'&&/2025/.test(readDate(r))&&isNum(r[prefix+'_pct']))||null;
}
function medianOf(group,year){
 const r=data('med').find(x=>String(x.Year)===String(year));return r&&r[group]!==undefined?r[group]:null;
}
function medianBlock(info){
 const med=info.medianLabel,latest=medianOf(med,'2025'),all=medianOf('All Employees','2025');
 if(!med||!isNum(latest))return'';
 const gap=isNum(all)?Number(latest)-Number(all):null;
 return '<h3>'+tr('Salary median — 2025, independent DI analysis','Médiane salariale — 2025, analyse DI indépendante')+'</h3><div class="stats">'+
 entry(info.label+' — 2025',isNum(latest)?'$'+fmt(latest):fmt(latest))+
 entry(tr('All employees — 2025','Tous les employés — 2025'),isNum(all)?'$'+fmt(all):fmt(all))+
 (gap===null?'':entry(tr('Difference (group less all employees)','Différence (groupe moins ensemble)'),(gap<0?'−':'+')+'$'+fmt(Math.abs(gap))))+'</div>'+
 '<p class="sources">'+localSource('med','DI salary medians CSV')+' · '+link(SOURCE.di,'Independent DI project')+'</p>'+
 note(tr('These DI salary figures come from an independent analysis and are not equivalent to an official observed-pay finding. Salary gaps do not establish a cause.','Ces chiffres salariaux proviennent d’une analyse indépendante et ne prouvent pas une cause.'),true);
}
function showGroup(key){
 const info=groupInfo(key);let html='<h2>'+safe(info.label)+'</h2><p class="muted">'+tr('Source scopes differ: core public administration representation, executive population, departmental subgroups and independent salary estimates are not automatically comparable.','Les sources couvrent des populations différentes : représentation, cadres, sous-groupes ministériels et estimations salariales indépendantes ne sont pas automatiquement comparables.')+'</p>';
 if(info.prefix){
 const rows=repRows(info.prefix),last=rows[rows.length-1],wfa=repWfa(info.prefix);
 html+='<h3>'+tr('Representation across the core public administration','Représentation dans l’administration publique centrale')+'</h3>';
 if(last)html+='<div class="stats">'+entry(tr('Representation — '+last.year,'Représentation — '+last.year),pct(last.percent))+entry(tr('Employees — '+last.year,'Employés — '+last.year),fmt(last.count))+
 (wfa?entry(tr('Published workforce availability benchmark','Disponibilité publiée'),pct(wfa[info.prefix+'_pct'])):'')+'</div>';
 if(rows.length)html+='<div class="bars">'+rows.map(r=>'<div class="barrow"><span>'+safe(r.year)+'</span><div class="bartrack" role="img" aria-label="'+safe(r.year+' '+r.percent+'%')+'"><div class="barfill" style="width:'+Math.max(0,Math.min(100,r.percent))+'%"></div></div><strong class="tabular">'+safe(pct(r.percent))+'</strong></div>').join('')+'</div>';
 if(last&&wfa&&isNum(wfa[info.prefix+'_pct'])){const gap=last.percent-Number(wfa[info.prefix+'_pct']);html+=note(tr('Representation minus the labelled workforce-availability benchmark: ','Représentation moins la disponibilité publiée : ')+(gap>0?'+':'')+fmt(gap.toFixed(1))+' '+tr('percentage points','points de pourcentage')+'. '+safe(readDate(wfa))); }
 html+='<p class="sources">'+localSource('rep','Representation and WFA CSV')+' · '+link(SOURCE.tbs,'TBS official source context')+'</p>';
 const exec=data('ex').filter(r=>r.as_of_march_31==='2025'&&r.level!=='Overall EX WFA'&&isNum(r[info.prefix+'_pct']));
 if(exec.length){html+='<h3>'+tr('Executive representation — 2025','Représentation des cadres — 2025')+'</h3>'+renderedTable([tr('Level','Niveau'),tr('Group count','Nombre du groupe'),tr('Group share','Part du groupe')],exec.map(r=>[r.level,fmt(r[info.prefix+'_number']),pct(r[info.prefix+'_pct'])]))+
 '<p class="sources">'+localSource('ex','Executive representation CSV')+'</p>'+note(tr('Overall executive workforce availability is not a level-specific benchmark; it is not applied to individual EX levels.','La disponibilité globale des cadres ne s’applique pas individuellement à chaque niveau EX.'),true);}
 }else if(info.deptField){
 const source=mainOrgRows(info.deptDataset);
 const ranked=source.filter(r=>isNum(r[info.deptField])).sort((a,b)=>Number(b[info.deptField])-Number(a[info.deptField]));
 const label=key==='first_nations'?'First Nations':key==='metis'?'Métis':'Inuit';
 html+='<h3>'+safe(label)+' — '+tr('departmental subgroup snapshot, March 31, 2025','sous-groupe ministériel au 31 mars 2025')+'</h3>'+
 renderedTable([tr('Department/agency','Ministère/organisme'),tr('Count','Nombre'),tr('Share','Part')],ranked.map(r=>[r.department_or_agency,fmt(r[key+'_number']),pct(r[key+'_pct'])]))+
 '<p class="sources">'+localSource('ind','Indigenous subgroups CSV')+'</p>'+note(tr('These are percentages within each organization, not public-service-wide rates. Suppressed cells are omitted from numeric sorting.','Ces pourcentages concernent chaque organisme, et non l’ensemble de la fonction publique. Les cellules supprimées sont exclues du classement.'),true);
 }else{
 html+=note(tr('The selected small curated files do not contain a separate Black employee representation series or EX series. The independent salary analysis below is available; seek disaggregated survey and representation evidence in the full explorer.','Les fichiers sélectionnés ne contiennent pas de série distincte de représentation des employés noirs. Les salaires sont une analyse indépendante; consulter l’explorateur complet.'),true);
 }
 html+=medianBlock(info);
 const diKey={indigenous:'di_indigenous',disability:'di_pwd',racialized:'di_vm',black:'di_black'}[key];
 if(diKey){
 const bins=data('di').filter(r=>r.year_di==='2025'&&r.quintile_label&&r.quintile_label!=='NA'&&isNum(r[diKey]));
 if(bins.length){
 html+='<h3>'+tr('Salary disproportionality index — 2025 (independent analysis)','Indice de disproportion salariale — 2025 (analyse indépendante)')+'</h3>'+
 renderedTable([tr('Salary distribution segment','Segment salarial'),tr('Disproportionality index','Indice de disproportion')],bins.map(r=>[r.quintile_label,fmt(r[diKey])]))+
 '<p class="sources">'+localSource('di','DI index CSV')+' · '+link(SOURCE.di,'DI project')+'</p>';
 }}
 html+='<h3>'+tr('More relevant evidence','Autres données pertinentes')+'</h3><p>'+tr('Use the preserved explorer to examine employee experiences, hiring and promotion pathways, departmental differences, and historical datasets, with each source’s scope retained.','Utilisez l’explorateur préservé pour les expériences des employés, la dotation et les promotions, les différences entre organismes et les données historiques.')+'</p><p><a class="btn" href="explorer.html">'+tr('Explore the complete site','Explorer le site complet')+'</a></p>';
 show(html,{type:'group',key,info});
}
function answerQuestion(){
 const q=el('question').value.trim();if(!q){el('question').focus();return}
 const low=normalize(q);let found=state.orgs.find(o=>low.includes(normalize(o)));
 if(!found&&/\bisc\b/.test(low))found=state.orgs.find(o=>normalize(o)==='indigenous services canada');
 if(!found&&/\bssc\b/.test(low))found=state.orgs.find(o=>normalize(o)==='shared services canada');
 let key=null;
 for(const [k,pattern] of Object.entries({black:/\bblack\b|noir/,metis:/\bmetis\b/,inuit:/\binuit\b/,first_nations:/first nations|premieres nations/,indigenous:/indigen|autochton/,disability:/disabil|handicap/,racialized:/racial|visible minor|racis/,women:/women|woman|femme/})){if(pattern.test(low)){key=k;break}}
 const answers=[];let source='';
 if(/harass|discrimin|reprisal|pses|saff|mental health|well being|sant[eé] mentale/.test(low)){
 answers.push(tr('This curated subset does not contain the requested employee-survey response data. Open the preserved explorer for PSES and use the reported organization, question, group, year and suppression rules. I cannot infer a number from these files.','Ces fichiers ne contiennent pas les réponses au sondage demandées. Consultez le SAFF dans l’explorateur préservé.'));source='explorer.html';
 }else if(found&&(!key||['indigenous','inuit','metis','first_nations','disability'].includes(key))){
 const ind=findOrg('ind',found),pwd=findOrg('pwd',found);
 const fields=key==='inuit'?['inuit_pct','inuit_number']:key==='metis'?['metis_pct','metis_number']:key==='first_nations'?['first_nations_pct','first_nations_number']:key==='disability'?['persons_with_disabilities_pct','persons_with_disabilities_number']:['indigenous_peoples_pct','indigenous_peoples_number'];
 const r=key==='disability'?pwd:ind,year=key==='disability'?'2024':'2025';
 if(r){answers.push(found+' — '+year+': '+(key||'Indigenous Peoples')+' '+pct(r[fields[0]])+' ('+fmt(r[fields[1]])+' '+tr('employees in the published source population','employés de la population publiée')+').');answers.push(tr('Population denominator: ','Dénominateur : ')+fmt(r.all_employees)+'.');source=DIR+FILES[key==='disability'?'pwd':'ind'];}
 else{answers.push(tr('No matching department record is published in the selected subgroup CSV.','Aucune ligne ministérielle correspondante dans le CSV du sous-groupe.'));}
 }else if(/salary|median|pay|wage|salair|remuner/.test(low)&&key){
 const info=groupInfo(key),v=medianOf(info.medianLabel,'2025');
 if(isNum(v)){answers.push(info.label+' — '+tr('2025 independent-project salary median','médiane salariale 2025 d’un projet indépendant')+': $'+fmt(v)+'.');answers.push(tr('Not an official causal explanation or proof of pay discrimination.','Ce chiffre n’établit pas la cause d’un écart salarial.'));source=DIR+FILES.med;}
 }else if(key){
 const info=groupInfo(key);
 if(info.prefix){const rr=repRows(info.prefix),latest=rr[rr.length-1];if(latest){answers.push(info.label+': '+pct(latest.percent)+' '+tr('representation in the core public administration as of March 31, ','de représentation dans l’administration publique centrale au 31 mars ')+latest.year+'.');answers.push(tr('Published employee count: ','Effectif publié : ')+fmt(latest.count)+'.');source=DIR+FILES.rep;}}
 }
 if(!answers.length){answers.push(tr('I can search the selected October datasets for published representation, Indigenous or disability subgroup, executive and independent salary measures. This question cannot be answered reliably from the loaded subset.','Les fichiers sélectionnés permettent de consulter la représentation, certains sous-groupes, les cadres et les salaires indépendants. Cette question ne peut recevoir une réponse fiable à partir de ce sous-ensemble.'));source='explorer.html';}
 answers.push(tr('Source: ','Source : ')+source);answers.push(tr('A gap is a signal for further inquiry, not proof of cause.','Un écart constitue un signal à examiner, non une preuve de causalité.'));
 el('answer').textContent=answers.join('\n\n');
}
function makeDraft(){
 const mode=el('tooltype').value,subject=el('scope').value.trim()||tr('[Organization or demographic group]','[Organisme ou groupe]'),question=el('objective').value.trim()||tr('[Evidence question]','[Question]'),lines=[];
 const title={brief:'EQUITY EVIDENCE BRIEFING',presentation:'EQUITY EVIDENCE PRESENTATION',matrix:'EVIDENCE MATRIX',request:'REQUEST FOR DISAGGREGATED EVIDENCE'}[mode];
 lines.push(title,'','Subject: '+subject,'Purpose: '+question,'','Evidence available in curated October files:');
 const org=state.orgs.find(o=>normalize(o)===normalize(subject)||normalize(subject).includes(normalize(o)));
 if(org){
 const a=findOrg('ind',org),b=findOrg('pwd',org);
 if(a)lines.push('• Indigenous representation, March 31 2025: '+pct(a.indigenous_peoples_pct)+'; count '+fmt(a.indigenous_peoples_number)+'; denominator '+fmt(a.all_employees)+'. Source: '+DIR+FILES.ind);
 if(b)lines.push('• Persons with disabilities, March 31 2024: '+pct(b.persons_with_disabilities_pct)+'; count '+fmt(b.persons_with_disabilities_number)+'; denominator '+fmt(b.all_employees)+'. Source: '+DIR+FILES.pwd);
 }
 const group=Object.keys({women:1,indigenous:1,disability:1,racialized:1,black:1}).find(k=>normalize(subject).includes(normalize(groupInfo(k).label)));
 if(group){const p=groupInfo(group).prefix;const r=p?repRows(p):[];const latest=r[r.length-1];if(latest)lines.push('• '+groupInfo(group).label+' CPA representation, March 31 '+latest.year+': '+pct(latest.percent)+'; count '+fmt(latest.count)+'. Source: '+DIR+FILES.rep);}
 if(lines[lines.length-1]==='Evidence available in curated October files:')lines.push('• No verified figure has been selected for this subject. Add a traceable result from the explorer before publication.');
 if(mode==='brief')lines.push('','Issue / decision required:','Findings and comparison population:','Potential barrier mechanism (hypothesis; not established):','Evidence gaps:','Recommended follow-up:','Decision and accountability:');
 if(mode==='presentation')lines.push('','Slide 1 — Scope and question','Slide 2 — Published findings with denominators','Slide 3 — Experience and advancement pathways','Slide 4 — Missing and suppressed evidence','Slide 5 — Actions and source references');
 if(mode==='matrix')lines.push('','Measure | Group | Organization | Period | Value | Denominator | Comparator | Source | Limitation','[Add verified source-linked entries only]');
 if(mode==='request')lines.push('','To: Data steward / delegated authority','Please provide privacy-safe disaggregated data by organization, employee group, classification, level and reporting period where publishable.','Requested measures: hiring, acting, promotions, departures, performance ratings, grievances and workplace survey indicators, subject to lawful access.','Please include numerator, denominator, definitions, missingness, suppression and changes in methodology.','Publication/access restrictions: [Specify]','Requested format and deadline: [Specify]');
 lines.push('','Important limitations: No datasets were combined across different reporting years or populations. Suppressed values are not zero. Differences do not by themselves establish discrimination. Salary DI files are independent derived analyses, not official observed pay figures.','Source context: '+SOURCE.tbs+' | '+SOURCE.di,'Full data explorer: explorer.html');
 el('draft').value=lines.join('\n');
}
function downloadDraft(){
 const s=el('draft').value.trim();if(!s){el('draftstatus').textContent=tr('Generate a document first.','Générer un document d’abord.');return}
 const blob=new Blob([s],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='GC-Equity-Evidence-Draft.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function load(){
 let ok=0;
 await Promise.all(Object.entries(FILES).map(async([k,file])=>{
 try{const response=await fetch(DIR+file,{cache:'default'});if(!response.ok)throw Error('HTTP '+response.status);const text=await response.text();state.files[k]=csvParse(text);if(!state.files[k].length)throw Error('Empty table');ok++;}catch(e){state.errors.push(file+': '+e.message);state.files[k]=[];}}));
 const names=new Set([...mainOrgRows('ind'),...mainOrgRows('pwd')].map(r=>r.department_or_agency));state.orgs=Array.from(names).sort((a,b)=>a.localeCompare(b));
 const picker=el('org');picker.textContent='';
 const opt=document.createElement('option');opt.value='';opt.textContent=tr('Choose a department or agency…','Choisir un ministère ou organisme…');picker.appendChild(opt);
 state.orgs.forEach(name=>{let o=document.createElement('option');o.value=name;o.textContent=name;picker.appendChild(o)});
 const status=el('loadstatus');status.textContent=tr(ok+' of '+Object.keys(FILES).length+' curated October CSV files loaded. '+state.orgs.length+' distinct organization labels available.',''+ok+' fichiers CSV sur '+Object.keys(FILES).length+' chargés. '+state.orgs.length+' organismes distincts.');
 if(state.errors.length){status.classList.add('warning');status.textContent+=' '+tr('Unavailable: ','Indisponibles : ')+state.errors.join('; ')+'. '+tr('The preserved explorer remains available.','L’explorateur préservé reste accessible.');}
}
function setLang(lang){state.lang=lang;document.documentElement.lang=lang;document.querySelectorAll('[data-en][data-fr]').forEach(x=>x.textContent=x.getAttribute('data-'+lang));el('en').setAttribute('aria-pressed',String(lang==='en'));el('fr').setAttribute('aria-pressed',String(lang==='fr'));if(state.last){if(state.last.type==='org')showOrg(state.last.name);else showGroup(state.last.key);}}
el('en').addEventListener('click',()=>setLang('en'));el('fr').addEventListener('click',()=>setLang('fr'));
el('orgGo').addEventListener('click',()=>{const v=el('org').value;if(!v){el('org').focus();return}showOrg(v);});
el('groupGo').addEventListener('click',()=>showGroup(el('group').value));
el('toolGo').addEventListener('click',()=>{el('toolsPanel').hidden=false;el('results').hidden=true;el('toolsPanel').scrollIntoView({behavior:'smooth'});makeDraft();});
el('generate').addEventListener('click',makeDraft);el('download').addEventListener('click',downloadDraft);
el('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(el('draft').value);el('draftstatus').textContent=tr('Copied.','Copié.')}catch(e){el('draftstatus').textContent=tr('Copy manually from the text box.','Copiez le texte à partir du champ.')}});
el('back').addEventListener('click',()=>{el('results').hidden=true;document.querySelector('.grid').scrollIntoView({behavior:'smooth'})});
el('ask').addEventListener('click',answerQuestion);el('question').addEventListener('keydown',e=>{if(e.key==='Enter')answerQuestion()});
document.querySelectorAll('.qexample').forEach(b=>b.addEventListener('click',()=>{el('question').value=b.dataset.q;answerQuestion()}));
load();
})();