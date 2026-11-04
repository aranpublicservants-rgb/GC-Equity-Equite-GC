/* GC Equity: additions to the data explorer.
 * 1. Department page: Indigenous subgroups (March 31, 2025) and types of disability (March 31, 2024)
 *    for the chosen organization. The organization is also carried into the other organization lists.
 * 2. Public-service page: choose an employment equity group to see its representation, executives,
 *    salary and subgroup data, with that group highlighted in every table on the page.
 * 3. A link back to the main page, which replaces the explorer's own start screen.
 * 4. An "ask an AI chatbot" box on the department, group and briefing pages (see gc-ai.js).
 * Figures come from the published files in data/october-2026/. Nothing is estimated or filled in here.
 */
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
const TBS={en:'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics.html',fr:'https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/statistiques-ressources-humaines/statistiques-diversite-inclusion.html'};
const DI_URL='https://employment-equity.github.io/';
const $=id=>document.getElementById(id);
const isFr=()=>String(document.documentElement.getAttribute('lang')||'en').toLowerCase().indexOf('fr')===0;
const tr=(en,fr)=>isFr()?fr:en;
const loc=()=>isFr()?'fr-CA':'en-CA';
const esc=v=>String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const strip=s=>String(s).replace(/<[^>]*>/g,'');
const isNum=v=>v!==undefined&&v!==null&&String(v).trim()!==''&&Number.isFinite(Number(v));

/* ------------------------------------------------------------- formatting */
function notNumber(v){
 const s=String(v===undefined||v===null?'':v).trim();
 if(/^suppressed$/i.test(s))return tr('Suppressed','Supprimé');
 if(s===''||/^(n\/a|na)$/i.test(s))return tr('Not published','Non publié');
 const m=s.match(/^ANOMALY: TBS page shows (\d+)/i);
 if(m)return tr('Not used: the source shows '+m[1]+', which does not fit the other figures','Non utilisé : la source indique '+m[1]+', ce qui ne concorde pas avec les autres chiffres');
 return esc(s);
}
const num=v=>isNum(v)?Number(v).toLocaleString(loc()):notNumber(v);
const pct=v=>isNum(v)?Number(v).toLocaleString(loc(),{minimumFractionDigits:1,maximumFractionDigits:2})+(isFr()?' %':'%'):notNumber(v);
const ratio=v=>isNum(v)?Number(v).toLocaleString(loc(),{minimumFractionDigits:2,maximumFractionDigits:2}):notNumber(v);
const dollars=n=>isFr()?String(n).replace(/,/g,' ')+' $':'$'+n;
const money=v=>isNum(v)?dollars(Number(v).toLocaleString('en-CA')):notNumber(v);
const march31=y=>isFr()?'31 mars '+y:'March 31, '+y;
function bandText(s){
 s=String(s||'').trim();let m;
 if(/^total$/i.test(s))return tr('All salary ranges','Toutes les tranches salariales');
 if((m=s.match(/^Under ([\d,]+)$/i)))return tr('Under ','Moins de ')+dollars(m[1]);
 if((m=s.match(/^([\d,]+) to ([\d,]+)$/i)))return dollars(m[1])+tr(' to ',' à ')+dollars(m[2]);
 if((m=s.match(/^([\d,]+) and over$/i)))return dollars(m[1])+tr(' and over',' et plus');
 return esc(s);
}
function rangeText(s){
 s=String(s||'');
 if(!isFr())return esc(s);
 return esc(s.replace(/\$([\d,]+)/g,(x,n)=>n.replace(/,/g,' ')+' $').replace(/^Less than /,'Moins de ').replace(/^Over /,'Plus de ').replace(/ to /,' à '));
}
const FIFTHS={'Bottom 20th':['lowest fifth','cinquième inférieur'],'20th to 40th':['second fifth','deuxième cinquième'],'40th to 60th':['middle fifth','cinquième du milieu'],'60th to 80th':['fourth fifth','quatrième cinquième'],'Top 20th':['highest fifth','cinquième supérieur']};
function benchText(s){
 s=String(s||'');
 if(!isFr())return esc(s.replace(/ - population data as of March 31 (\d{4})/,', population as of March 31, $1'));
 return esc(s.replace(/^(\d{4}) Census and (\d{4}) Canadian Survey on Disability/,'Recensement de $1 et Enquête canadienne sur l’incapacité de $2')
  .replace(/^(\d{4}) National Household Survey and (\d{4}) Canadian Survey on Disability/,'Enquête nationale auprès des ménages de $1 et Enquête canadienne sur l’incapacité de $2')
  .replace('(citizens and permanent residents)','(citoyens et résidents permanents)')
  .replace('(Canadian citizens only)','(citoyens canadiens seulement)')
  .replace(/ - population data as of March 31 (\d{4})/,', population au 31 mars $1'));
}

/* ------------------------------------------------------------------- data */
function csvParse(s){
 const out=[];let row=[],v='',q=false;s=String(s).replace(/^﻿/,'');
 for(let i=0;i<s.length;i++){const c=s[i];
  if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
  else if(c==='"')q=true;else if(c===','){row.push(v);v='';}
  else if(c==='\n'){row.push(v.replace(/\r$/,''));if(row.some(x=>x!==''))out.push(row);row=[];v='';}
  else v+=c;}
 if(v!==''||row.length){row.push(v.replace(/\r$/,''));if(row.some(x=>x!==''))out.push(row);}
 const head=(out.shift()||[]).map(h=>h.trim());
 return out.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]===undefined?'':r[i]])));
}
const data={};let loading=null;
function load(){
 if(!loading)loading=Promise.all(Object.entries(FILES).map(([k,f])=>fetch(DIR+f).then(r=>{if(!r.ok)throw Error(f+' (HTTP '+r.status+')');return r.text();}).then(t=>{data[k]=csvParse(t);})))
  .catch(e=>{loading=null;throw e;});
 return loading;
}
const loadError=e=>'<p>'+tr('This information could not be loaded: ','Impossible de charger cette information : ')+esc(e&&e.message||e)+'</p>';

/* Organization names: the same organization can appear under a slightly different name in a table. */
const orgKey=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’`]/g,"'").replace(/&/g,'and').replace(/\s*\([^)]*\)\s*$/,'').replace(/\s+/g,' ').trim().toLowerCase();
const ALIAS={
 'housing, infrastructure and communities canada':['infrastructure canada'],
 'office of the secretary to the governor general':["office of the governor general's secretary"],
 'pacific economic development canada':['western economic diversification canada'],
 'prairies economic development canada':['western economic diversification canada'],
 'office of the information commissioner of canada':['offices of the information and privacy commissioners of canada'],
 'office of the privacy commissioner of canada':['offices of the information and privacy commissioners of canada'],
 'supreme court of canada':['registrar of the supreme court of canada']
};
const isTotal=r=>/^(grand total|total)$/i.test(String(r.department_or_agency||'').trim());
const orgRows=k=>(data[k]||[]).filter(r=>r.department_or_agency&&!/^source:/i.test(r.department_or_agency.trim())&&!isTotal(r));
const totalRow=k=>(data[k]||[]).find(isTotal)||null;
function findOrg(k,name){
 const rows=orgRows(k),key=orgKey(name);
 let r=rows.find(x=>orgKey(x.department_or_agency)===key);if(r)return r;
 for(const a of (ALIAS[key]||[])){r=rows.find(x=>orgKey(x.department_or_agency)===a);if(r)return r;}
 return null;
}

/* ------------------------------------------------------------ table maker */
// Same look as the explorer's plain tables (sticky row labels, sideways scrolling on a phone).
function table(caption,head,rows,opts){
 opts=opts||{};
 const th=head.map(h=>'<th scope="col">'+h+'</th>').join('');
 const body=rows.map(r=>'<tr'+(r.cls?' class="'+r.cls+'"':'')+'>'+r.cells.map((c,i)=>i===0?'<th scope="row">'+c+'</th>':'<td>'+c+'</td>').join('')+'</tr>').join('');
 return '<div class="eq-native-table-wrap gc-wrap'+(opts.tall?' gc-tall':'')+'" tabindex="0" role="region" aria-label="'+esc(strip(caption))+'"><table class="eq-native-table gc-table"><caption>'+caption+'</caption><thead><tr>'+th+'</tr></thead><tbody>'+body+'</tbody></table></div>';
}
const tbsLink=()=>'<a href="'+(isFr()?TBS.fr:TBS.en)+'" target="_blank" rel="noopener">'+tr('Treasury Board of Canada Secretariat, diversity and inclusion statistics','Secrétariat du Conseil du Trésor du Canada, statistiques sur la diversité et l’inclusion')+'</a>';
const fileLink=(k,label)=>'<a href="'+DIR+FILES[k]+'" download>'+(label||esc(FILES[k]))+'</a>';

/* ------------------------------------------------------------------ styles */
const css=document.createElement('style');
css.textContent=[
 '.gc-extra h4{font-size:17px;margin:20px 0 8px;line-height:1.35}',
 '.gc-extra .gc-small{font-size:14px;margin:4px 0 8px;color:var(--ink-soft,#3d4f60)}',
 '.gc-note{font-size:14px;line-height:1.55;border-left:4px solid var(--teal,#0a6463);padding:8px 12px;margin:12px 0;background:var(--teal-soft,#e4f2f1);color:var(--ink,#1c2d42)}',
 '.gc-extra .eq-source-foot{font-size:13.5px}',
 '.gc-wrap{margin:8px 0 8px}',
 '.eq-native-table-wrap.gc-tall{max-height:460px;overflow-y:auto}',
 '.gc-table tr.gc-total th,.gc-table tr.gc-total td{font-weight:700;background:var(--teal-soft,#e4f2f1)}',
 '#gcGroupPicker{margin:6px 0 26px}',
 '#gcGroupPicker h3{margin-top:0}',
 '.gc-pick label{display:block;font-weight:700;margin:0 0 6px}',
 '.gc-pick select,.gc-year select{font:inherit;font-size:16px;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--line,#8a9ba8);background:var(--card,#fff);color:var(--ink,#1c2d42);max-width:100%}',
 '.gc-pick select{min-width:300px}',
 '.gc-year{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}',
 '.gc-year label{font-weight:700}',
 '#gcGroupOut>h3{font-size:24px;margin:24px 0 6px}',
 '.gc-jumps{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 4px;padding:0;list-style:none}',
 '.gc-jumps button{font:inherit;font-size:14px;min-height:40px;padding:8px 12px;border-radius:8px;border:1px solid var(--teal,#0a6463);background:transparent;color:inherit;cursor:pointer}',
 '.gc-jumps button:hover{background:var(--teal-soft,#e4f2f1)}',
 '.gc-jumps button:focus-visible,.gc-pick select:focus-visible,.gc-year select:focus-visible,.gc-mainlink:focus-visible{outline:3px solid #bf7827;outline-offset:2px}',
 '.gc-status{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
 'html:not([data-theme]) .gc-hl{background:#fff2c2!important;color:#1c2d42!important;font-weight:700}',
 'html[data-theme="dark"] .gc-hl{background:#3d3000!important;color:#fff!important;font-weight:700}',
 'html[data-theme="contrast"] .gc-hl{outline:3px solid currentColor!important;outline-offset:-3px;font-weight:700}',
 '.gc-mainlink{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px 0 0;margin-right:auto;font:700 15px/1.2 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;letter-spacing:normal;text-transform:none;color:#fff;text-decoration:underline;text-underline-offset:3px}',
 /* The header takes its colour from --ink, which turns light in the dark theme and hid the white title. */
 'html[data-theme="dark"] header.site{background:#0B0F14;color:#E8ECF1}',
 '@media (max-width:600px){.gc-pick select{min-width:0;width:100%}#gcGroupOut>h3{font-size:21px}.gc-table thead th{min-width:70px}.gc-table tbody th{min-width:112px;max-width:160px}.gc-table td,.gc-table th{padding:8px 8px}}'
].join('\n');
document.head.appendChild(css);

/* ===================================================== department page ===== */
const IND_TYPES=[['first_nations','First Nations','Premières Nations'],['metis','Métis','Métis'],['inuit','Inuit','Inuit'],['other','Other Indigenous identity','Autre identité autochtone'],['indigenous_peoples','All Indigenous Peoples','Ensemble des Autochtones']];
const PWD_TYPES=[['coordination_dexterity','Coordination or dexterity','Coordination ou dextérité'],['mobility','Mobility','Mobilité'],['speech_impairment','Speech impairment','Trouble de la parole'],['blind_visual_impairment','Blind or visual impairment','Cécité ou déficience visuelle'],['deaf_hard_of_hearing','Deaf or hard of hearing','Surdité ou malentendance'],['other_disability','Other disability','Autre handicap'],['persons_with_disabilities','All persons with disabilities','Ensemble des personnes en situation de handicap']];
function orgDisplay(name){const s=$('opOrg');const o=s&&[...s.options].find(x=>x.value===name);return o&&o.textContent.trim()||name;}
function subgroupTable(k,types,row,total,year,name){
 const head=[tr('Subgroup','Sous-groupe'),tr('Employees in this organization','Employés de cet organisme'),tr('Share of this organization','Part de l’effectif de l’organisme'),tr('Share, core public administration','Part, administration publique centrale')];
 const rows=types.map(([f,en,fr],i)=>({cells:[isFr()?fr:en,num(row[f+'_number']),pct(row[f+'_pct']),total?pct(total[f+'_pct']):notNumber('')],cls:i===types.length-1?'gc-total':''}));
 const cap=esc(orgDisplay(name))+tr(', '+march31(year)+' (all employees: ',', '+march31(year)+' (ensemble des employés : ')+num(row.all_employees)+')';
 return table(cap,head,rows);
}
function namedAs(row,name){
 return orgKey(row.department_or_agency)===orgKey(name)?'':'<p class="gc-small">'+tr('Listed in this table as: ','Nom dans ce tableau : ')+esc(row.department_or_agency)+'</p>';
}
const notListed=year=>'<p>'+tr('This organization is not listed in the Treasury Board table for '+march31(year)+'. The table covers the core public administration, so separate agencies, such as the Canada Revenue Agency, are not included.','Cet organisme ne figure pas dans le tableau du Conseil du Trésor au '+march31(year)+'. Le tableau porte sur l’administration publique centrale; les organismes distincts, comme l’Agence du revenu du Canada, n’y figurent pas.')+'</p>';
function orgSectionHtml(name){
 const ind=findOrg('ind',name),pwd=findOrg('pwd',name);
 let h='<div class="eq-section-head"><h3>'+tr('Indigenous subgroups and types of disability','Sous-groupes autochtones et types de handicap')+'</h3><p>'+tr('Published counts for this organization, with the same share for the whole core public administration.','Chiffres publiés pour cet organisme, avec la même part pour l’ensemble de l’administration publique centrale.')+'</p></div>';
 h+='<h4>'+tr('Indigenous Peoples by subgroup, March 31, 2025','Peuples autochtones selon le sous-groupe, 31 mars 2025')+'</h4>';
 h+=ind?namedAs(ind,name)+subgroupTable('ind',IND_TYPES,ind,totalRow('ind'),2025,name):notListed(2025);
 h+='<h4>'+tr('Persons with disabilities by type of disability, March 31, 2024','Personnes en situation de handicap selon le type de handicap, 31 mars 2024')+'</h4>';
 h+=pwd?namedAs(pwd,name)+subgroupTable('pwd',PWD_TYPES,pwd,totalRow('pwd'),2024,name)+'<p class="gc-small">'+tr('A person can report more than one type of disability, so the types add up to more than the total.','Une personne peut déclarer plus d’un type de handicap; la somme des types dépasse donc le total.')+'</p>':notListed(2024);
 h+='<p class="gc-note">'+tr('The two tables are for different years, so do not add them together. A suppressed value hides a small count to protect privacy. It is not zero.','Les deux tableaux portent sur des années différentes; ne pas les additionner. Une valeur supprimée cache un petit nombre pour protéger la vie privée. Ce n’est pas un zéro.')+'</p>';
 h+='<p class="eq-source-foot">'+tr('Source: ','Source : ')+tbsLink()+'. '+tr('Download the tables: ','Télécharger les tableaux : ')+fileLink('ind',tr('Indigenous subgroups (CSV)','Sous-groupes autochtones (CSV)'))+' · '+fileLink('pwd',tr('Types of disability (CSV)','Types de handicap (CSV)'))+'</p>';
 return h;
}
function drawOrgAI(name){
 const card=$('opCard');if(!card||!window.GCAI)return;
 let sec=$('gc-d-ai');
 const key=name+'|'+(isFr()?'fr':'en');
 if(sec&&sec.dataset.key===key&&card.contains(sec))return;
 if(!sec){sec=document.createElement('section');sec.id='gc-d-ai';sec.className='eq-dept-dataset gc-extra';}
 sec.dataset.key=key;
 sec.innerHTML='<div class="eq-section-head"><h3>'+tr('Ask an AI chatbot about this organization','Poser une question à un agent conversationnel sur cet organisme')+'</h3></div><div class="gc-ai-host"></div>';
 if(sec.parentNode!==card)card.appendChild(sec);
 const display=()=>orgDisplay(name);
 window.GCAI.render(sec.querySelector('.gc-ai-host'),{
  question:()=>tr('What do published data show about employment equity at '+display()+'? Where are the largest gaps between employee groups?','Que montrent les données publiées sur l’équité en matière d’emploi pour cet organisme : '+display()+'? Où se trouvent les plus grands écarts entre les groupes d’employés?'),
  about:display
 });
}
function syncOrgLists(name){
 const norm=s=>orgKey(s).replace(/[^a-z0-9]/g,'');
 const want=[norm(name),norm(orgDisplay(name))];
 ['deptSel','yoyOrg','indDept','cmpA','briefOrg'].forEach(id=>{
  const s=$(id);if(!s||!s.options.length)return;
  const hit=o=>o&&(want.includes(norm(o.value))||want.includes(norm(o.textContent)));
  if(hit(s.options[s.selectedIndex]))return;
  const o=[...s.options].find(hit);
  if(o){s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));}
 });
}
function renderOrgExtra(){
 const sel=$('opOrg'),card=$('opCard');if(!sel||!card)return;
 const name=sel.value;
 let sec=$('gc-d-subgroups');
 if(!name){if(sec)sec.remove();const a=$('gc-d-ai');if(a)a.remove();return;}
 const key=name+'|'+(isFr()?'fr':'en');
 if(sec&&sec.dataset.key===key&&card.contains(sec)){drawOrgAI(name);return;}
 if(!sec){sec=document.createElement('section');sec.id='gc-d-subgroups';sec.className='eq-dept-dataset gc-extra';}
 sec.dataset.key=key;
 const anchor=$('eq-d-representation');
 if(anchor&&anchor.parentNode===card){if(anchor.nextElementSibling!==sec)anchor.insertAdjacentElement('afterend',sec);}
 else if(sec.parentNode!==card)card.appendChild(sec);
 sec.innerHTML='<p>'+tr('Loading…','Chargement…')+'</p>';
 drawOrgAI(name);
 syncOrgLists(name);
 load().then(()=>{if(sel.value===name&&sec.dataset.key===key)sec.innerHTML=orgSectionHtml(name);}).catch(e=>{sec.innerHTML=loadError(e);});
}

/* ========================================================= group page ===== */
const GROUPS=[
 {key:'women',en:'Women',fr:'Femmes',s_en:'women',s_fr:'les femmes',rep:'women',ex:'women',demo:['woman','man'],re:/^\s*(women|femmes)\b/i},
 {key:'indigenous',en:'Indigenous Peoples',fr:'Peuples autochtones',s_en:'Indigenous Peoples',s_fr:'les Autochtones',rep:'indigenous_peoples',ex:'indigenous_peoples',di:'indigenous',med:'Indigenous Employees',ind:'indigenous_peoples',demo:['ind','nonind'],views:['indigenous'],re:/^\s*(indigenous|autochtones?\b|peuples autochtones|employ[ée]s autochtones)/i},
 {key:'first_nations',en:'First Nations',fr:'Premières Nations',s_en:'First Nations employees',s_fr:'les employés des Premières Nations',ind:'first_nations',di:'indigenous',med:'Indigenous Employees',diAll:true,demo:['ind','nonind'],views:['indigenous'],re:/^\s*(first nations|premi[eè]res nations)/i},
 {key:'metis',en:'Métis',fr:'Métis',s_en:'Métis employees',s_fr:'les employés métis',ind:'metis',di:'indigenous',med:'Indigenous Employees',diAll:true,demo:['ind','nonind'],views:['indigenous'],re:/^\s*m[ée]tis\b/i},
 {key:'inuit',en:'Inuit',fr:'Inuit',s_en:'Inuit employees',s_fr:'les employés inuits',ind:'inuit',di:'indigenous',med:'Indigenous Employees',diAll:true,demo:['ind','nonind'],views:['indigenous'],re:/^\s*inuit/i},
 {key:'pwd',en:'Persons with disabilities',fr:'Personnes en situation de handicap',s_en:'persons with disabilities',s_fr:'les personnes en situation de handicap',rep:'persons_with_disabilities',ex:'persons_with_disabilities',di:'pwd',med:'Employees with Disabilities',pwd:true,demo:['pwd','nopwd'],views:['intersect'],re:/^\s*(persons? (with|w\/) (a )?disabilit|employees with disabilit|disabilit(y|ies)\b|personnes (en situation de |ayant un )?handicap|handicap)/i},
 {key:'racialized',en:'Racialized employees (members of visible minorities)',fr:'Employés racisés (membres des minorités visibles)',s_en:'racialized employees (members of visible minorities)',s_fr:'les employés racisés (membres des minorités visibles)',rep:'members_of_visible_minorities',ex:'members_of_visible_minorities',di:'vm',med:'Visible Minority Employees',demo:['rac','nonrac'],re:/^\s*(racialized|racis[ée]|members of visible minorit|all visible minorit|visible minorit|membres (des|de) minorit[ée]s visibles|minorit[ée]s visibles|employ[ée]s racis)/i},
 {key:'black',en:'Black employees',fr:'Employés noirs',s_en:'Black employees',s_fr:'les employés noirs',di:'black',med:'Black Employees',demo:['black','nonrac'],views:['black'],re:/^\s*(black|noir(e|s|es)?\b|employ[ée]s noirs|personnes noires)/i}
];
const label=g=>isFr()?g.fr:g.en;
let current=null;

function secRepresentation(g){
 let h='<h4>'+tr('Representation in the core public administration, 2017 to 2025','Représentation dans l’administration publique centrale, 2017 à 2025')+'</h4>';
 if(!g.rep)return h+'<p>'+tr('The Treasury Board representation series reports the four designated groups only. ','La série du Conseil du Trésor sur la représentation ne porte que sur les quatre groupes désignés. ')+(g.ind?tr('See the subgroup table by department below.','Voir le tableau des sous-groupes par ministère ci-dessous.'):tr('See the salary data below and the Black employees section of this page.','Voir les données salariales ci-dessous et la section sur les employés noirs de cette page.'))+'</p>';
 const reps=data.rep.filter(r=>r.row_type==='representation');
 const wfa=data.rep.filter(r=>r.row_type==='workforce_availability');
 const year=r=>(String(r.period_or_benchmark).match(/(20\d\d)\s*$/)||[])[1]||r.period_or_benchmark;
 h+=table(esc(label(g))+tr(': employees and share of all employees',' : nombre d’employés et part de l’ensemble des employés'),[tr('Date','Date'),tr('Employees','Employés'),tr('Share of all employees','Part de l’ensemble des employés')],reps.map(r=>({cells:[march31(year(r)),num(r[g.rep+'_number']),pct(r[g.rep+'_pct'])]})));
 h+=table(tr('Workforce availability, the benchmark for representation','Disponibilité au sein de la population active, le point de comparaison de la représentation'),[tr('Benchmark source','Source du point de comparaison'),tr('Availability','Disponibilité')],wfa.map(r=>({cells:[benchText(r.period_or_benchmark),pct(r[g.rep+'_pct'])]})));
 h+='<p class="gc-small">'+tr('Compare each year with the benchmark for that year. Benchmarks changed in 2023, when they began to use the 2021 Census and the 2022 Canadian Survey on Disability.','Comparez chaque année avec le point de comparaison de cette année. Les points de comparaison ont changé en 2023, lorsqu’ils ont commencé à utiliser le Recensement de 2021 et l’Enquête canadienne sur l’incapacité de 2022.')+'</p>';
 h+='<p class="eq-source-foot">'+tr('Source: ','Source : ')+tbsLink()+'. '+fileLink('rep',tr('Download the table (CSV)','Télécharger le tableau (CSV)'))+'</p>';
 return h;
}
function exLevelName(l){if(l==='Executives')return tr('All executives','Ensemble des cadres');if(l==='Unknown')return tr('Level not reported','Niveau non déclaré');return esc(String(l).replace(/^EX (\d+)$/,'EX-$1'));}
function exLevels(g,y){
 const rows=data.ex.filter(r=>r.as_of_march_31===y&&r.level!=='Overall EX WFA');
 const wfa=data.ex.find(r=>r.as_of_march_31===y&&r.level==='Overall EX WFA');
 return table(tr('Executives by level, ','Cadres selon le niveau, ')+march31(y),[tr('Level','Niveau'),tr('All executives','Ensemble des cadres'),esc(label(g)),tr('Share','Part')],rows.map(r=>({cells:[exLevelName(r.level),num(r.executive_employees),num(r[g.ex+'_number']),pct(r[g.ex+'_pct'])],cls:r.level==='Executives'?'gc-total':''})))+
  (wfa?'<p class="gc-small">'+tr('Executive workforce availability for this group in '+y+': ','Disponibilité des cadres pour ce groupe en '+y+' : ')+pct(wfa[g.ex+'_pct'])+'. '+tr('This benchmark applies to all executives together, not to each level.','Ce point de comparaison s’applique à l’ensemble des cadres, et non à chaque niveau.')+'</p>':'');
}
function secExecutives(g){
 if(!g.ex)return '';
 const years=[...new Set(data.ex.map(r=>r.as_of_march_31))].filter(y=>/^\d{4}$/.test(y)).sort().reverse();
 const trend=years.map(y=>{const t=data.ex.find(r=>r.as_of_march_31===y&&r.level==='Executives'),w=data.ex.find(r=>r.as_of_march_31===y&&r.level==='Overall EX WFA');return {cells:[march31(y),t?num(t[g.ex+'_number']):notNumber(''),t?pct(t[g.ex+'_pct']):notNumber(''),w?pct(w[g.ex+'_pct']):notNumber('')]};});
 return '<h4>'+tr('Executives, 2017 to 2025','Cadres supérieurs, 2017 à 2025')+'</h4>'+
  table(tr('All executives, each year','Ensemble des cadres, chaque année'),[tr('Date','Date'),esc(label(g)),tr('Share of executives','Part des cadres'),tr('Executive availability','Disponibilité des cadres')],trend)+
  '<div class="gc-year"><label for="gcExYear">'+tr('Show executive levels for','Afficher les niveaux de cadres pour')+'</label><select id="gcExYear">'+years.map(y=>'<option value="'+y+'">'+march31(y)+'</option>').join('')+'</select></div>'+
  '<div id="gcExLevels">'+exLevels(g,years[0])+'</div>'+
  '<p class="eq-source-foot">'+tr('Source: ','Source : ')+tbsLink()+'. '+fileLink('ex',tr('Download the table (CSV)','Télécharger le tableau (CSV)'))+'</p>';
}
function parseBand(s){
 s=String(s||'').replace(/,/g,'');let m;
 if((m=s.match(/^Under (\d+)/i)))return [0,+m[1]];
 if((m=s.match(/^(\d+) to (\d+)/i)))return [+m[1],+m[2]+1];
 if((m=s.match(/^(\d+) and over/i)))return [+m[1],Infinity];
 return null;
}
function estimatedIn(col,year,band){
 const b=parseBand(band);if(!b)return false;
 return (data.imputed||[]).some(r=>r.Year===year&&r.Group===col&&(x=>x&&x[0]>=b[0]&&x[1]<=b[1])(parseBand(r.salary_range)));
}
function salaryYear(g,y){
 const glabel=g.diAll?tr('Indigenous employees','Employés autochtones'):esc(label(g));
 const di=data.di.filter(r=>r.year_di===y&&r.quintile&&r.quintile!=='NA');
 const col='count_'+g.di;
 let flagged=false;
 const counts=data.count.filter(r=>r.Year===y).map(r=>{const est=!/^total$/i.test(r.salary_range)&&estimatedIn(col,y,r.salary_range);if(est)flagged=true;return {cells:[bandText(r.salary_range),num(r.count_all),num(r[col])+(est?' *':'')],cls:/^total$/i.test(r.salary_range)?'gc-total':''};});
 if(!di.length&&!counts.length)return '<p>'+tr('No salary ranges are published for this date.','Aucune tranche salariale n’est publiée pour cette date.')+'</p>';
 return table(tr('Where employees sit in the salary range, ','Répartition dans l’échelle salariale, ')+march31(y),[tr('Salary range','Tranche salariale'),tr('All employees','Ensemble des employés'),glabel,tr('Index (1.00 = same as all employees)','Indice (1,00 = comme l’ensemble)')],di.map(r=>{const f=FIFTHS[r.quintile_label];return {cells:[rangeText(r.quintile)+(f?' <span class="gc-small">('+(isFr()?f[1]:f[0])+')</span>':''),pct(r.per_all),pct(r['per_'+g.di]),ratio(r['di_'+g.di])]};}))+
  '<p class="gc-small">'+tr('Each fifth holds about one fifth of all employees. An index above 1.00 means the group is more concentrated in that range than employees overall; below 1.00, less concentrated.','Chaque cinquième regroupe environ le cinquième de l’ensemble des employés. Un indice supérieur à 1,00 signifie que le groupe est plus concentré dans cette tranche que l’ensemble des employés; inférieur à 1,00, moins concentré.')+'</p>'+
  table(tr('Number of employees in each salary range, ','Nombre d’employés dans chaque tranche salariale, ')+march31(y),[tr('Salary range','Tranche salariale'),tr('All employees','Ensemble des employés'),glabel],counts,{tall:true})+
  (flagged?'<p class="gc-small">'+tr('* Includes a value estimated by the independent project to replace a small count that the Treasury Board did not publish.','* Comprend une valeur estimée par le projet indépendant pour remplacer un petit nombre que le Conseil du Trésor n’a pas publié.')+'</p>':'');
}
function secSalary(g){
 const head='<h4>'+tr('Salary, 2017 to 2025 (independent estimates)','Salaires, 2017 à 2025 (estimations indépendantes)')+'</h4>';
 if(!g.di)return head+'<p>'+tr('The independent salary analysis on this site does not report this group separately.','L’analyse salariale indépendante présentée sur ce site ne présente pas ce groupe séparément.')+'</p>';
 const glabel=g.diAll?tr('Indigenous employees','Employés autochtones'):esc(label(g));
 const years=[...new Set(data.di.map(r=>r.year_di))].filter(y=>/^\d{4}$/.test(y)).sort().reverse();
 const meds=data.med.filter(r=>/^\d{4}$/.test(r.Year)).sort((a,b)=>b.Year.localeCompare(a.Year)).map(r=>({cells:[march31(r.Year),money(r['All Employees']),money(r[g.med])]}));
 return head+(g.diAll?'<p class="gc-note">'+tr('Salary data are published for Indigenous employees as a whole, not for First Nations, Métis or Inuit employees separately. The tables below are for all Indigenous employees.','Les données salariales portent sur l’ensemble des employés autochtones, et non sur les Premières Nations, les Métis ou les Inuits séparément. Les tableaux ci-dessous portent sur l’ensemble des employés autochtones.')+'</p>':'')+
  table(tr('Estimated median salary','Salaire médian estimé'),[tr('Date','Date'),tr('All employees','Ensemble des employés'),glabel],meds)+
  '<div class="gc-year"><label for="gcSalYear">'+tr('Show salary ranges for','Afficher les tranches salariales pour')+'</label><select id="gcSalYear">'+years.map(y=>'<option value="'+y+'">'+march31(y)+'</option>').join('')+'</select></div>'+
  '<div id="gcSalOut">'+salaryYear(g,years[0])+'</div>'+
  '<p class="gc-note">'+tr('These salary figures come from an independent analysis of Treasury Board of Canada Secretariat statistics. They are estimates, not Government of Canada data.','Ces chiffres salariaux proviennent d’une analyse indépendante des statistiques du Secrétariat du Conseil du Trésor du Canada. Ce sont des estimations, et non des données du gouvernement du Canada.')+'</p>'+
  '<p class="eq-source-foot">'+tr('Source: ','Source : ')+'<a href="'+DI_URL+'" target="_blank" rel="noopener">'+tr('Disproportionality Index project','Projet sur l’indice de disproportion')+'</a>. '+tr('Download: ','Télécharger : ')+fileLink('med',tr('median salaries','salaires médians'))+' · '+fileLink('di',tr('index by salary range','indice par tranche'))+' · '+fileLink('count',tr('counts by salary range','nombres par tranche'))+' · '+fileLink('imputed',tr('estimated values','valeurs estimées'))+' (CSV)</p>';
}
function deptTable(g,k,field,year){
 const t=totalRow(k);
 const rows=orgRows(k).slice().sort((a,b)=>(isNum(b[field+'_pct'])?+b[field+'_pct']:-1)-(isNum(a[field+'_pct'])?+a[field+'_pct']:-1)||(+b.all_employees||0)-(+a.all_employees||0));
 const out=rows.map(r=>({cells:[esc(r.department_or_agency),num(r.all_employees),num(r[field+'_number']),pct(r[field+'_pct'])]}));
 if(t)out.unshift({cells:[tr('Core public administration','Administration publique centrale'),num(t.all_employees),num(t[field+'_number']),pct(t[field+'_pct'])],cls:'gc-total'});
 return table(tr('All organizations in the published table, highest share first','Tous les organismes du tableau publié, de la part la plus élevée à la plus faible'),[tr('Department or agency','Ministère ou organisme'),tr('All employees','Ensemble des employés'),esc(label(g)),tr('Share of the organization','Part de l’effectif')],out,{tall:true})+
  '<p class="gc-small">'+tr('Shares are within each organization. Suppressed values are listed last; they are not zero.','Les parts sont calculées dans chaque organisme. Les valeurs supprimées figurent en dernier; ce ne sont pas des zéros.')+'</p>'+
  '<p class="eq-source-foot">'+tr('Source: ','Source : ')+tbsLink()+'. '+fileLink(k,tr('Download the table (CSV)','Télécharger le tableau (CSV)'))+'</p>';
}
function secDepartments(g){
 if(g.ind)return '<h4>'+esc(label(g))+tr(' by department or agency, March 31, 2025',' par ministère ou organisme, 31 mars 2025')+'</h4>'+deptTable(g,'ind',g.ind,2025);
 if(g.pwd)return '<h4>'+tr('Persons with disabilities by department or agency, March 31, 2024','Personnes en situation de handicap par ministère ou organisme, 31 mars 2024')+'</h4>'+deptTable(g,'pwd','persons_with_disabilities',2024);
 return '';
}
const JUMP_FALLBACK={groups:['Groups & subgroups','Groupes et sous-groupes'],profile:['Where people work','Lieux de travail'],flows:['Hiring & promotion','Embauche et promotion'],ex:['Executives','Cadres'],salary:['Salary','Salaires'],di:['Salary DI tracker','Suivi de l’indice salarial'],snps:['2025 Staffing Survey','Sondage sur la dotation 2025'],demo:['Demographic gaps','Écarts démographiques'],intersect:['Intersectional results','Résultats intersectionnels'],indigenous:['Indigenous public servants','Fonctionnaires autochtones'],black:['Black employees','Employés noirs']};
function jumpLabel(id){
 try{if(typeof EXPLORER_NAV!=='undefined'){for(const grp of EXPLORER_NAV){for(const it of grp[2]){if(it[0]===id)return isFr()?it[2]:it[1];}}}}catch(e){}
 const f=JUMP_FALLBACK[id];return f?(isFr()?f[1]:f[0]):id;
}
function jumps(g){
 const order=['groups','profile','flows','ex','salary','di','snps','demo','intersect','indigenous','black'];
 const want=new Set(['groups','profile','flows','ex','salary','di','snps','demo'].concat(g.views||[]));
 return order.filter(id=>want.has(id)&&$('view-'+id)).map(id=>'<li><button type="button" data-gc-go="'+id+'">'+esc(jumpLabel(id))+'</button></li>').join('');
}
function setDemo(g){
 if(!g.demo)return;
 try{ensureView('demo');}catch(e){}
 [['demoA',g.demo[0]],['demoB',g.demo[1]]].forEach(([id,v])=>{const s=$(id);if(s&&[...s.options].some(o=>o.value===v)&&s.value!==v){s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}));}});
}
function highlight(){
 document.querySelectorAll('.gc-hl').forEach(e=>e.classList.remove('gc-hl'));
 if(!current)return;
 const re=current.re;
 document.querySelectorAll('section.view.active table:not(.gc-table)').forEach(t=>{
  const head=t.tHead&&t.tHead.rows.length?t.tHead.rows[t.tHead.rows.length-1]:null;
  if(head)[...head.cells].forEach((c,i)=>{if(i>0&&re.test(c.textContent)){c.classList.add('gc-hl');[...t.tBodies].forEach(b=>[...b.rows].forEach(r=>{if(r.cells[i])r.cells[i].classList.add('gc-hl');}));}});
  [...t.tBodies].forEach(b=>[...b.rows].forEach(r=>{const first=r.cells[0];if(first&&re.test(first.textContent))[...r.cells].forEach(c=>c.classList.add('gc-hl'));}));
 });
}
let hlTimer=null;
const scheduleHighlight=()=>{clearTimeout(hlTimer);hlTimer=setTimeout(highlight,150);};
function setUrlGroup(key){
 try{const u=new URL(location.href);if(key)u.searchParams.set('group',key);else u.searchParams.delete('group');if(u.href!==location.href)history.replaceState(history.state,'',u.href);}catch(e){}
}
function renderGroup(){
 const out=$('gcGroupOut'),sel=$('gcGroup'),status=$('gcGroupStatus');if(!out||!sel)return;
 current=GROUPS.find(g=>g.key===sel.value)||null;
 setUrlGroup(current&&current.key);
 if(!current){out.innerHTML='';if(status)status.textContent='';highlight();return;}
 const g=current;
 out.innerHTML='<p>'+tr('Loading…','Chargement…')+'</p>';
 load().then(()=>{
  if(current!==g)return;
  out.innerHTML='<h3>'+esc(label(g))+'</h3>'+
   '<p>'+tr('Published data for this group across the federal public service. The group is also highlighted in every table further down this page.','Données publiées pour ce groupe dans l’ensemble de la fonction publique fédérale. Le groupe est aussi mis en évidence dans chaque tableau plus bas sur cette page.')+'</p>'+
   '<p class="gc-small">'+tr('Go to this group’s results in:','Voir les résultats de ce groupe dans :')+'</p><ul class="gc-jumps">'+jumps(g)+'</ul>'+
   secRepresentation(g)+secExecutives(g)+secSalary(g)+secDepartments(g)+
   '<p class="gc-note">'+tr('A gap is a reason to look further. It is not, on its own, proof of discrimination or of its cause. Groups overlap, so do not add them together.','Un écart justifie un examen plus poussé. À lui seul, il ne prouve ni la discrimination ni sa cause. Les groupes se chevauchent; ne pas les additionner.')+'</p>'+
   '<h4>'+tr('Ask an AI chatbot about this group','Poser une question à un agent conversationnel sur ce groupe')+'</h4><div class="gc-ai-host"></div>';
  const ex=$('gcExYear');if(ex)ex.addEventListener('change',()=>{$('gcExLevels').innerHTML=exLevels(g,ex.value);});
  const sy=$('gcSalYear');if(sy)sy.addEventListener('change',()=>{$('gcSalOut').innerHTML=salaryYear(g,sy.value);});
  if(window.GCAI)window.GCAI.render(out.querySelector('.gc-ai-host'),{
   question:()=>tr('What do published data show about '+g.s_en+' in the federal public service? Where are the largest gaps?','Que montrent les données publiées sur '+g.s_fr+' dans la fonction publique fédérale? Où se trouvent les plus grands écarts?'),
   about:()=>label(g)
  });
  if(status)status.textContent=tr('Showing published data for: ','Données publiées affichées pour : ')+label(g);
  setDemo(g);
  scheduleHighlight();
 }).catch(e=>{out.innerHTML=loadError(e);});
}
function labelGroupPicker(){
 const sel=$('gcGroup');if(!sel)return;
 $('gcGroupHeading').textContent=tr('Choose an employment equity group','Choisir un groupe visé par l’équité en matière d’emploi');
 $('gcGroupHelp').textContent=tr('See the published data for one group across the federal public service: representation, executives, salary and subgroups. The group is then highlighted in every table on this page.','Consultez les données publiées pour un groupe dans l’ensemble de la fonction publique fédérale : représentation, cadres, salaires et sous-groupes. Le groupe est ensuite mis en évidence dans chaque tableau de cette page.');
 $('gcGroupLabel').textContent=tr('Employment equity group','Groupe visé par l’équité en matière d’emploi');
 const keep=sel.value;
 sel.innerHTML='<option value="">'+tr('Choose a group…','Choisir un groupe…')+'</option>'+GROUPS.map(g=>'<option value="'+g.key+'">'+esc(label(g))+'</option>').join('');
 sel.value=keep;
}
function buildGroupPicker(){
 const host=$('view-publicintro');if(!host||$('gcGroupPicker'))return;
 const box=document.createElement('section');box.id='gcGroupPicker';box.className='card gc-extra';box.setAttribute('aria-labelledby','gcGroupHeading');
 box.innerHTML='<h3 id="gcGroupHeading"></h3><p id="gcGroupHelp"></p><div class="gc-pick"><label for="gcGroup" id="gcGroupLabel"></label><select id="gcGroup"></select></div><p id="gcGroupStatus" class="gc-status" role="status"></p><div id="gcGroupOut"></div>';
 const after=host.querySelector(':scope > .actionbar')||host.querySelector(':scope > h2');
 if(after)after.insertAdjacentElement('afterend',box);else host.insertBefore(box,host.firstChild);
 labelGroupPicker();
 $('gcGroup').addEventListener('change',renderGroup);
 box.addEventListener('click',e=>{const b=e.target.closest('[data-gc-go]');if(b&&typeof window.go==='function')window.go(b.getAttribute('data-gc-go'));});
 let start='';try{start=new URLSearchParams(location.search).get('group')||'';}catch(e){}
 if(GROUPS.some(g=>g.key===start)){$('gcGroup').value=start;renderGroup();}
}

/* ============================================ main page, builder and start */
function mainHref(){return 'index.html'+(isFr()?'?lang=fr':'');}
function labelMainLink(){
 document.querySelectorAll('a.gc-mainlink').forEach(a=>{a.href=mainHref();const t=a.querySelector('.gc-mainlink-t');if(t)t.textContent=tr('Main page','Page principale');});
}
function addMainLink(){
 if(document.querySelector('a.gc-mainlink'))return;
 const bar=document.querySelector('header.site .eyebrow');if(!bar)return;
 const a=document.createElement('a');a.className='gc-mainlink';a.href=mainHref();
 a.innerHTML='<span aria-hidden="true">←</span><span class="gc-mainlink-t"></span>';
 // After the first span, which the page hides on purpose with a :first-child rule.
 const first=bar.firstElementChild;
 if(first&&first.tagName==='SPAN')first.insertAdjacentElement('afterend',a);else bar.insertBefore(a,bar.firstChild);
 labelMainLink();
}
// Sections further down a long page draw themselves as they come into view, which pushes the
// target down while a smooth scroll is still moving. Keep correcting the position for a moment,
// and stop as soon as the visitor scrolls or types.
function settleOn(id){
 const page=(typeof PAGE_OF!=='undefined'&&PAGE_OF)?PAGE_OF[id]:'';
 if(page!=='data'&&page!=='departments')return;
 if(id==='publicintro'||id==='orgprofile')return;
 const el=$('view-'+id);if(!el)return;
 let n=0,stopped=false;
 const stop=()=>{stopped=true;};
 const events=['wheel','touchstart','keydown','mousedown'];
 events.forEach(e=>window.addEventListener(e,stop,{once:true,passive:true}));
 const fix=()=>{
  if(stopped)return;
  const top=el.getBoundingClientRect().top;
  if(top<-4||top>140)el.scrollIntoView({block:'start'});
  if(++n<8)setTimeout(fix,250);else events.forEach(e=>window.removeEventListener(e,stop));
 };
 setTimeout(fix,60);
}
// The main page replaces the explorer's own start screen.
function useMainPageAsHome(){
 if(typeof window.go==='function'&&!window.go.__gcMain){
  const original=window.go;
  const wrapped=function(id){if(id==='home'){location.href=mainHref();return;}const r=original.apply(this,arguments);try{settleOn(id);}catch(e){}return r;};
  wrapped.__gcMain=true;window.go=wrapped;
 }
 const home=$('view-home');
 if(home&&home.classList.contains('active'))location.replace(mainHref());
}
function addBuilderAI(){
 const v=$('view-bhome');if(!v||$('gc-b-ai')||!window.GCAI)return;
 const box=document.createElement('div');box.id='gc-b-ai';box.className='card gc-extra';
 box.innerHTML='<h3 id="gcBuilderAiTitle"></h3><div class="gc-ai-host"></div>';
 v.appendChild(box);
 const title=()=>{$('gcBuilderAiTitle').textContent=tr('Ask an AI chatbot for help with a briefing note or presentation','Demander de l’aide à un agent conversationnel pour une note d’information ou une présentation');};
 title();document.addEventListener('langchange',()=>setTimeout(title,0));
 window.GCAI.render(box.querySelector('.gc-ai-host'),{
  question:()=>tr('Help me outline a short briefing note on employment equity in the federal public service. Use published data and say what is not published.','Aidez-moi à préparer le plan d’une courte note d’information sur l’équité en matière d’emploi dans la fonction publique fédérale. Utilisez les données publiées et indiquez ce qui n’est pas publié.'),
  about:()=>tr('briefing notes and presentations','notes d’information et présentations')
 });
}

function init(){
 useMainPageAsHome();
 addMainLink();
 const card=$('opCard'),sel=$('opOrg');
 if(card&&sel){
  let t=null;const later=()=>{clearTimeout(t);t=setTimeout(renderOrgExtra,60);};
  new MutationObserver(later).observe(card,{childList:true});
  sel.addEventListener('change',later);
  if(sel.value)later();
 }
 buildGroupPicker();
 addBuilderAI();
 const main=$('main');
 if(main)new MutationObserver(m=>{
  if(!current)return;
  if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&!(n.closest&&n.closest('#gcGroupPicker')))))scheduleHighlight();
 }).observe(main,{childList:true,subtree:true});
 document.addEventListener('langchange',()=>setTimeout(()=>{labelMainLink();labelGroupPicker();if(current)renderGroup();renderOrgExtra();},0));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
