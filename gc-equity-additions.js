/* GC Equity: department, group and briefing pages.
 * Department page: Indigenous subgroups (March 31, 2025) and types of disability (March 31, 2024) for the
 * chosen organization; the organization is carried into the other organization lists on the page.
 * Group page: a group chooser, then a short summary of where differences appear for that group, followed by the
 * detailed tables with the group shaded.
 * Every page: a link to the main page, and the AI chatbot box (gc-ai.js).
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
const NBSP=' ';
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
const pct=v=>isNum(v)?Number(v).toLocaleString(loc(),{minimumFractionDigits:1,maximumFractionDigits:2})+(isFr()?NBSP+'%':'%'):notNumber(v);
const ratio=v=>isNum(v)?Number(v).toLocaleString(loc(),{minimumFractionDigits:2,maximumFractionDigits:2}):notNumber(v);
const dollars=n=>isFr()?String(n).replace(/,/g,NBSP)+NBSP+'$':'$'+n;
const money=v=>isNum(v)?dollars(Number(v).toLocaleString('en-CA')):notNumber(v);
const march31=y=>isFr()?'31 mars '+y:'March 31, '+y;

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
 // The department page uses the subgroup tables; the group summary uses the salary index and medians.
 if(!loading)loading=Promise.all(Object.entries(FILES).filter(([k])=>['ind','pwd','di','med'].includes(k)).map(([k,f])=>fetch(DIR+f).then(r=>{if(!r.ok)throw Error(f+' (HTTP '+r.status+')');return r.text();}).then(t=>{data[k]=csvParse(t);})))
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
function focusHeading(el){
 if(!el)return;
 const h=/^H[1-6]$/.test(el.tagName)?el:el.querySelector('h2,h3,h4');if(!h)return;
 if(!h.hasAttribute('tabindex'))h.setAttribute('tabindex','-1');
 try{h.focus({preventScroll:true});}catch(e){h.focus();}
}

/* ------------------------------------------------------------------ styles */
const css=document.createElement('style');
css.textContent=[
 '.gc-extra h4{font-size:17px;margin:22px 0 8px;line-height:1.35}',
 '.gc-extra .gc-small{font-size:14px;margin:4px 0 8px;color:var(--ink-soft,#3d4f60)}',
 '.gc-note{font-size:14px;line-height:1.55;border-left:4px solid var(--teal,#0a6463);padding:8px 12px;margin:12px 0;background:var(--teal-soft,#e4f2f1);color:var(--ink,#1c2d42)}',
 '.gc-extra .eq-source-foot{font-size:13.5px}',
 '.gc-wrap{margin:8px 0 8px}',
 '.eq-native-table-wrap.gc-tall{max-height:460px;overflow-y:auto}',
 '.gc-table tr.gc-total th,.gc-table tr.gc-total td{font-weight:700;background:var(--teal-soft,#e4f2f1)}',
 '#gcGroupPicker{margin:14px 0 22px}',
 '.gc-pick label{display:block;font-weight:700;margin:0 0 6px}',
 '.gc-pick select,.gc-year select{font:inherit;font-size:16px;min-height:44px;padding:8px 10px;border-radius:8px;border:1px solid var(--line,#8a9ba8);background:var(--card,#fff);color:var(--ink,#1c2d42);max-width:100%}',
 '.gc-pick select{min-width:320px}',
 '.gc-year{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 4px}',
 '.gc-year label{font-weight:700}',
 '#gcGroupOut>h3{font-size:25px;margin:26px 0 10px}',
 '.gc-gsec{margin:0 0 6px;padding-top:4px;scroll-margin-top:100px}',
 '.gc-toc{margin:8px 0 18px;padding:14px 18px 8px;border:1px solid var(--line,#c9d4d8);border-radius:10px;background:var(--card,#fff)}',
 '.gc-toc h4{margin:0 0 8px!important;font-size:16px}',
 '.gc-toc-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4px 36px}',
 '.gc-toc-h{margin:0 0 2px;font-size:14px;font-weight:700;color:var(--ink-soft,#3d4f60)}',
 '.gc-toc ul{margin:0 0 10px;padding-left:20px}',
 '.gc-toc li{margin:4px 0}',
 '.gc-gsec.card{margin:0 0 16px}',
 '.gc-gsec.card>h4{margin-top:0!important}',
 '.gc-pick select:focus-visible,.gc-year select:focus-visible,.gc-mainlink:focus-visible,.gc-toc a:focus-visible{outline:3px solid #bf7827;outline-offset:2px}',
 '[tabindex="-1"]:focus{outline:none}',
 '.gc-status{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
 '#gcShadeNote{font-weight:600}',
 '.gc-gsub{font-size:15.5px;margin:16px 0 6px}',
 '.gc-glance{margin:0 0 6px;padding-left:20px;line-height:1.55}',
 '.gc-glance li{margin:5px 0}',
 '.gc-ghead{font-weight:600}',
 '.gc-flag-note{color:var(--rust,#a30000);font-weight:700;white-space:nowrap}',
 'html[data-theme="dark"] .gc-flag-note{color:#FF8F8F}',
 'html:not([data-theme]) .gc-hl{background:#fff2c2!important;color:#1c2d42!important;font-weight:700}',
 'html[data-theme="dark"] .gc-hl{background:#3d3000!important;color:#fff!important;font-weight:700}',
 'html[data-theme="contrast"] .gc-hl{outline:3px solid currentColor!important;outline-offset:-3px;font-weight:700}',
 '.gc-mainlink{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px 0 0;margin-right:auto;font:700 15px/1.2 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;letter-spacing:normal;text-transform:none;color:#fff;text-decoration:underline;text-underline-offset:3px}',
 /* Group page: data sections wait until a group is chosen; sections about one other group are left out. */
 'body.eq-public-all.gc-pending #main>section.view.active:not(#view-publicintro){display:none!important}',
 'body.gc-pending #view-publicintro .eq-after-compare,body.gc-pending #view-publicintro .eq-small{display:none}',
 'body[data-gc-group="women"] #view-indigenous,body[data-gc-group="pwd"] #view-indigenous,body[data-gc-group="racialized"] #view-indigenous,body[data-gc-group="black"] #view-indigenous{display:none!important}',
 'body[data-gc-group="women"] #view-black,body[data-gc-group="pwd"] #view-black,body[data-gc-group="indigenous"] #view-black,body[data-gc-group="first_nations"] #view-black,body[data-gc-group="metis"] #view-black,body[data-gc-group="inuit"] #view-black{display:none!important}',
 /* Colour contrast (WCAG 2.1 AA). The header and several panels keep a light background in the dark theme. */
 'html[data-theme="dark"] header.site{background:#0B0F14;color:#E8ECF1}',
 'html[data-theme="dark"] caption,html[data-theme="dark"] th,html[data-theme="dark"] .profile-strip>div{background:#232A34}',
 'html[data-theme="dark"] .scopebar,html[data-theme="dark"] .request-box{background:#15323A;border-color:#2C4A50}',
 'html[data-theme="dark"] .scopebar .sl{color:#C9D3DC}',
 'html[data-theme="dark"] .scopebar .here{background:#46B8B5;color:#0B0F14}',
 'html[data-theme="dark"] .scopebar a{background:transparent;color:#8FDCD9;border-color:#46B8B5}',
 'html[data-theme="dark"] .tbltools button,html[data-theme="dark"] .actionbar button,html[data-theme="dark"] .chips button:not([aria-pressed="true"]),html[data-theme="dark"] .entry-card,html[data-theme="dark"] .navpanel,html[data-theme="dark"] .hero-bars{background:var(--card)}',
 'html[data-theme="dark"] .chips button[aria-pressed="true"]{background:var(--teal);border-color:var(--teal);color:#0B0F14}',
 'html[data-theme="dark"] .eq-primary,html[data-theme="dark"] .eq-primary:hover{color:#0B0F14}',
 'html[data-theme="dark"] span[style*="color:#9C0006" i]{color:#FF8F8F!important}',
 'html[data-theme="dark"] span[style*="color:#006100" i]{color:#6FD49B!important}',
 'html[data-theme="dark"] .signal-note{color:#EADFB8}',
 'html:not([data-theme]) .banner a,html:not([data-theme]) .snps-context a,html:not([data-theme]) .howto a{color:#0A6463}',
 '.conf-entered{color:#5C4708}',
 '@media (max-width:700px){.gc-toc-cols{grid-template-columns:1fr}}',
 '@media (max-width:600px){.gc-pick select{min-width:0;width:100%}#gcGroupOut>h3{font-size:22px}.gc-table thead th{min-width:70px}.gc-table tbody th{min-width:112px;max-width:160px}.gc-table td,.gc-table th{padding:8px 8px}}'
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
 let h='<div class="eq-section-head"><h3>'+tr('Indigenous subgroups and types of disability','Sous-groupes autochtones et types de handicap')+'</h3><p>'+tr('Counts for this organization, with the share for the whole core public administration.','Nombres pour cet organisme, avec la part pour l’ensemble de l’administration publique centrale.')+'</p></div>';
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
 {key:'racialized',en:'Racialized employees (members of visible minorities)',fr:'Employés racisés (membres des minorités visibles)',s_en:'racialized employees (members of visible minorities)',s_fr:'les employés racisés (membres des minorités visibles)',rep:'members_of_visible_minorities',ex:'members_of_visible_minorities',di:'vm',med:'Visible Minority Employees',demo:['rac','nonrac'],views:['black'],re:/^\s*(racialized|racis[ée]|members of visible minorit|all visible minorit|visible minorit|membres (des|de) minorit[ée]s visibles|minorit[ée]s visibles|employ[ée]s racis)/i},
 {key:'black',en:'Black employees',fr:'Employés noirs',s_en:'Black employees',s_fr:'les employés noirs',di:'black',med:'Black Employees',demo:['black','nonrac'],views:['black'],re:/^\s*(black|noir(e|s|es)?\b|employ[ée]s noirs|personnes noires)/i}
];
const label=g=>isFr()?g.fr:g.en;
let choice='';      // '', a group key, or 'all'
let current=null;   // the chosen group, or null for '' and 'all'

function sectionWrap(id,title,body){return '<section class="gc-gsec card" id="'+id+'" aria-labelledby="'+id+'-h"><h4 id="'+id+'-h">'+title+'</h4>'+body+'</section>';}
/* Where differences appear for the chosen group: the figures, with a link to the section that has the full table.
   Each dataset has one table on this site; this summary does not repeat the tables. */
const CYCLE_KEY={women:'w',indigenous:'i',pwd:'d',racialized:'v',black:'black'};
const SURVEY_PAIR={women:['woman','man'],indigenous:['ind','nonind'],pwd:['pwd','nopwd'],racialized:['rac','nonrac'],black:['black','nonrac'],first_nations:['fn','nonind'],metis:['metis','nonind'],inuit:['inuit','nonind']};
const SUB_ROW={first_nations:'First Nations',metis:'Metis',inuit:'Inuit'};
const gget=f=>{try{const v=f();return v===undefined?null:v;}catch(e){return null;}};
const sep=()=>isFr()?NBSP+': ':': ';
function stageText(st,c){
 const a=pct(c.a),b=pct(c.b),r=ratio(c.r);
 const T={
  rep:[a+' of employees, compared with workforce availability of '+b+'.',a+' de l’effectif, comparativement à une disponibilité de '+b+'.'],
  hire:[a+' of hires, compared with workforce availability of '+b+'.',a+' des embauches, comparativement à une disponibilité de '+b+'.'],
  promo:[a+' of promotions, compared with '+b+' of employees.',a+' des promotions, comparativement à '+b+' de l’effectif.'],
  ex:[a+' of executives, compared with '+b+' of employees.',a+' des cadres, comparativement à '+b+' de l’effectif.'],
  pay:[a+' earn $100,000 or more, compared with '+b+' of all employees.',a+' gagnent 100'+NBSP+'000'+NBSP+'$ ou plus, comparativement à '+b+' de l’ensemble des employés.'],
  sep:[a+' of separations, compared with '+b+' of employees.',a+' des départs, comparativement à '+b+' de l’effectif.']
 }[st.k];
 return tr(T[0],T[1])+' '+tr('Ratio ','Ratio de ')+r+(st.k==='sep'?tr('; a higher ratio means more employees leaving.','; un ratio plus élevé signifie plus de départs.'):'.');
}
const STAGE_HEAD={rep:['Representation, March 31, 2025','Représentation, 31 mars 2025'],hire:['Hiring, 2024-25','Embauches, 2024-2025'],promo:['Promotions, 2024-25','Promotions, 2024-2025'],ex:['Executives, March 31, 2025','Cadres, 31 mars 2025'],pay:['Pay, March 31, 2025','Rémunération, 31 mars 2025'],sep:['Separations, 2024-25','Départs, 2024-2025']};
const goLink=(id,en,fr)=>' <a href="#" data-gc-go="'+id+'">'+tr(en,fr)+'</a>';
function item(head,text,flag,low){
 return '<li class="'+(flag?'gc-flag-item':'')+'"><span class="gc-ghead">'+head+'</span>'+sep()+text+
  (flag?' <span class="gc-flag-note">'+(low?'▼ ':'▲ ')+tr('Marked: ','Signalé'+NBSP+': ')+(low?tr('0.85 or less.','0,85 ou moins.'):tr('1.15 or more.','1,15 ou plus.'))+'</span>':'')+'</li>';
}
function glanceEmployment(g){
 const T=window.GCTOOLS;const k=CYCLE_KEY[g.key];const out=[];
 if(T&&k){
  const gi=T.G5.findIndex(x=>x[0]===k);
  T.cycle().forEach(r=>{
   const c=r.cells[gi],h=tr(STAGE_HEAD[r.st.k][0],STAGE_HEAD[r.st.k][1]);
   if(c.r!==null){out.push(item(h,stageText(r.st,c),c.flag,r.st.low));return;}
   if(c.a===null)return;
   const what=r.st.k==='rep'?tr(' of employees.',' de l’effectif.'):r.st.k==='hire'?tr(' of hires.',' des embauches.'):'.';
   out.push(item(h,pct(c.a)+what+' '+tr('Treasury Board does not publish workforce availability for this group.','Le Conseil du Trésor ne publie pas de disponibilité pour ce groupe.'),false,true));
  });
 }
 if(SUB_ROW[g.key]){
  const S=gget(()=>SUBG),SG=gget(()=>SGSAL)||[];
  const row=S&&S.i&&S.i.rows?S.i.rows.find(r=>r.name===SUB_ROW[g.key]):null;
  const all=SG.find(r=>r[0]==='All employees'),sal=SG.find(r=>r[0]===SUB_ROW[g.key]);
  if(row){
   out.push(item(tr('Representation, March 31, 2025','Représentation, 31 mars 2025'),num(row.n)+' '+tr('employees, ','employés, ')+pct(row.p)+tr(' of employees. Workforce availability is published for Indigenous Peoples as a whole (4.0%). It is not published for each subgroup.',' de l’effectif. La disponibilité est publiée pour l’ensemble des Autochtones (4,0'+NBSP+'%). Elle n’est pas publiée pour chaque sous-groupe.'),false,true));
   if(isNum(row.ex))out.push(item(tr('Executives, March 31, 2025','Cadres, 31 mars 2025'),pct(row.ex)+tr(' of executives, compared with ',' des cadres, comparativement à ')+pct(row.p)+tr(' of employees.',' de l’effectif.'),false,true));
  }
  if(sal&&all){
   if(isNum(sal[4])&&isNum(all[4])){const r=sal[4]/all[4];out.push(item(tr('Pay, March 31, 2025','Rémunération, 31 mars 2025'),pct(sal[4])+tr(' earn $100,000 or more, compared with ',' gagnent 100'+NBSP+'000'+NBSP+'$ ou plus, comparativement à ')+pct(all[4])+tr(' of all employees. Ratio ',' de l’ensemble des employés. Ratio de ')+ratio(r)+'.',r<=0.85,true));}
   else out.push(item(tr('Pay, March 31, 2025','Rémunération, 31 mars 2025'),tr('The share earning $100,000 or more is suppressed for this subgroup.','La part gagnant 100'+NBSP+'000'+NBSP+'$ ou plus est supprimée pour ce sous-groupe.'),false,true));
  }
 }
 return out;
}
function glanceSurvey(g){
 const pair=SURVEY_PAIR[g.key];if(!pair)return [];
 const EEG=gget(()=>EEG_DEPT),SUB=gget(()=>IND_SUB);
 const ps=EEG&&EEG['Public Service']||{},subPS=SUB&&SUB['Public Service']||{};
 const A=['fn','metis','inuit'].includes(pair[0])?subPS[pair[0]]:ps[pair[0]],B=ps[pair[1]];
 if(!A||!B)return [];
 const T=window.GCTOOLS;if(!T)return [];
 const cmpName={man:tr('men','les hommes'),nonind:tr('non-Indigenous employees','les employés non autochtones'),nopwd:tr('persons without disabilities','les personnes sans handicap'),nonrac:tr('non-racialized employees','les employés non racisés')}[pair[1]];
 const rows=Object.keys(A).filter(q=>isNum(A[q])&&isNum(B[q])).map(q=>{const d=A[q]-B[q];return {q,a:A[q],b:B[q],adv:T.qNeg(q)?d:-d};});
 const pick=rows.filter(r=>r.q==='Q65'||r.q==='Q58').concat(rows.filter(r=>r.q!=='Q65'&&r.q!=='Q58'&&r.adv>0).sort((x,y)=>y.adv-x.adv).slice(0,3));
 const pv=v=>Number(v).toLocaleString(loc(),{maximumFractionDigits:1})+(isFr()?NBSP+'%':'%');
 return pick.map(r=>'<li><span class="gc-ghead">'+r.q+' · '+esc(T.qText(r.q))+'</span>'+sep()+pv(r.a)+tr(', compared with ',', comparativement à ')+pv(r.b)+tr(' for ',' pour ')+cmpName+'. '+
  (()=>{const n=Math.abs(r.a-r.b),pts=n===1?tr(' point',' point'):tr(' points',n<2?' point':' points');return r.adv>0?tr(n+pts+' less favourable.','Écart de '+n+pts+', moins favorable.'):r.adv<0?tr(n+pts+' more favourable.','Écart de '+n+pts+', plus favorable.'):tr('No difference.','Aucun écart.');})()+'</li>');
}
function glanceSalary(g){
 if(!g.di)return [];
 const di=(data.di||[]).filter(r=>r.year_di==='2025'&&r.quintile&&r.quintile!=='NA');
 const top=di.find(r=>r.quintile_label==='Top 20th'),bottom=di.find(r=>r.quintile_label==='Bottom 20th');
 const med=(data.med||[]).find(r=>r.Year==='2025');
 const out=[];
 const who=g.diAll?tr('Indigenous employees as a whole','l’ensemble des employés autochtones'):'';
 if(top&&bottom)out.push('<li><span class="gc-ghead">'+tr('Salary index, 2025','Indice salarial, 2025')+'</span>'+sep()+(who?who+(isFr()?NBSP+': ':': '):'')+ratio(top['di_'+g.di])+tr(' in the highest fifth of salaries and ',' dans le cinquième supérieur des salaires et ')+ratio(bottom['di_'+g.di])+tr(' in the lowest. An index of 1.00 means the same concentration as all employees.',' dans le cinquième inférieur. Un indice de 1,00 signifie la même concentration que l’ensemble des employés.')+'</li>');
 if(med&&isNum(med[g.med])&&isNum(med['All Employees']))out.push('<li><span class="gc-ghead">'+tr('Estimated median salary, 2025','Salaire médian estimé, 2025')+'</span>'+sep()+(who?who+(isFr()?NBSP+': ':': '):'')+money(med[g.med])+tr(', compared with ',', comparativement à ')+money(med['All Employees'])+tr(' for all employees.',' pour l’ensemble des employés.')+'</li>');
 return out;
}
function glance(g){
 const emp=glanceEmployment(g),sur=glanceSurvey(g),sal=glanceSalary(g);
 let h='';
 if(emp.length)h+='<h5 class="gc-gsub">'+tr('Employment, hiring, promotion, pay and separations','Effectif, embauches, promotions, rémunération et départs')+'</h5><ul class="gc-glance">'+emp.join('')+'</ul>'+
  '<p class="gc-small">'+tr('A ratio compares the group with a benchmark; 1.00 means the same rate. Marked results meet the screening rule used on this site. They show where to look more closely. They do not show the cause.','Un ratio compare le groupe avec un point de comparaison; 1,00 signifie le même taux. Les résultats signalés répondent à la règle de repérage utilisée sur ce site. Ils indiquent où regarder de plus près. Ils n’en indiquent pas la cause.')+goLink('overview','See the employment cycle table','Voir le tableau du cycle d’emploi')+'</p>';
 if(sur.length)h+='<h5 class="gc-gsub">'+tr('Employee survey, 2024','Sondage auprès des employés, 2024')+'</h5><ul class="gc-glance">'+sur.join('')+'</ul><p class="gc-small">'+tr('Differences are between published percentages. They are not tests of statistical significance.','Les écarts sont calculés entre des pourcentages publiés. Il ne s’agit pas de tests de signification statistique.')+goLink(g.key==='black'?'black':(['indigenous','first_nations','metis','inuit'].includes(g.key)?'indigenous':'demo'),'See the survey results','Voir les résultats du sondage')+'</p>';
 if(sal.length)h+='<h5 class="gc-gsub">'+tr('Salary estimates, 2025','Estimations salariales, 2025')+'</h5><ul class="gc-glance">'+sal.join('')+'</ul><p class="gc-small">'+tr('These are estimates from an independent analysis of Treasury Board statistics. They are not Government of Canada data.','Ce sont des estimations tirées d’une analyse indépendante des statistiques du Conseil du Trésor. Ce ne sont pas des données du gouvernement du Canada.')+goLink('di','See the salary index','Voir l’indice salarial')+'</p>';
 if(!h)h='<p>'+tr('No summary is available for this group.','Aucun résumé n’est disponible pour ce groupe.')+'</p>';
 return h;
}
// Detailed sections that matter for each group, in page order. Their titles come from the page itself.
function detailLinks(g){
 const ids=['groups','profile','flows','ex','salary','di','snps','demo'].concat(g.views||[]);
 const order=['groups','profile','snps','flows','ex','salary','di','demo','intersect','indigenous','black'];
 return order.filter(id=>ids.includes(id)).map(id=>{const sec=$('view-'+id);const h=sec&&sec.querySelector('h2');return h?{id,title:h.textContent.replace(/\s+/g,' ').trim()}:null;}).filter(Boolean);
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
function shadeNote(){
 const host=document.querySelector('#view-publicintro .eq-small');if(!host)return;
 let p=$('gcShadeNote');
 if(!p){p=document.createElement('p');p.id='gcShadeNote';p.className='eq-small';host.insertAdjacentElement('afterend',p);}
 p.hidden=!current;
 p.textContent=current?tr('The group you chose is shaded in these tables.','Le groupe choisi est ombré dans ces tableaux.'):'';
}
function applyChoice(){
 document.body.classList.toggle('gc-pending',!choice);
 if(choice)document.body.setAttribute('data-gc-group',choice);else document.body.removeAttribute('data-gc-group');
 shadeNote();
}
function setChoice(value){
 if(value!=='all'&&!GROUPS.some(g=>g.key===value))value='';
 choice=value;current=GROUPS.find(g=>g.key===value)||null;
 const sel=$('gcGroup');if(sel&&sel.value!==value)sel.value=value;
 applyChoice();setUrlGroup(value);renderGroup();
}
function renderGroup(){
 const out=$('gcGroupOut'),status=$('gcGroupStatus');if(!out)return;
 if(!current){
  out.innerHTML='';highlight();
  if(status)status.textContent=choice==='all'?tr('Showing results for all groups.','Résultats pour tous les groupes.'):'';
  return;
 }
 const g=current;
 out.innerHTML='<p>'+tr('Loading…','Chargement…')+'</p>';
 load().then(()=>{
  if(current!==g)return;
  const title=tr('Where differences appear','Où se trouvent les écarts');
  const parts=[{id:'gc-g-glance',title,html:sectionWrap('gc-g-glance',title,glance(g))}];
  const details=detailLinks(g);
  const toc='<nav class="gc-toc" aria-labelledby="gcTocTitle"><h4 id="gcTocTitle">'+tr('On this page','Sur cette page')+'</h4><div class="gc-toc-cols">'+
   '<div><p class="gc-toc-h" id="gcTocSum">'+tr('Summary','Résumé')+'</p><ul aria-labelledby="gcTocSum">'+parts.map(p=>'<li><a href="#'+p.id+'" data-gc-scroll="'+p.id+'">'+p.title+'</a></li>').join('')+'<li><a href="#gc-g-ai" data-gc-scroll="gc-g-ai">'+tr('Ask an AI chatbot','Poser une question à un agent conversationnel')+'</a></li></ul></div>'+
   (details.length?'<div><p class="gc-toc-h" id="gcTocDet">'+tr('Detailed results','Résultats détaillés')+'</p><ul aria-labelledby="gcTocDet">'+details.map(d=>'<li><a href="#'+d.id+'" data-gc-go="'+d.id+'">'+esc(d.title)+'</a></li>').join('')+'</ul></div>':'')+'</div></nav>';
  out.innerHTML='<h3 id="gcGroupTitle">'+esc(label(g))+'</h3>'+toc+parts.map(p=>p.html).join('')+
   sectionWrap('gc-g-ai',tr('Ask an AI chatbot about this group','Poser une question à un agent conversationnel sur ce groupe'),'<div class="gc-ai-host"></div>');
  if(window.GCAI)window.GCAI.render(out.querySelector('.gc-ai-host'),{
   question:()=>tr('What do published data show about '+g.s_en+' in the federal public service? Where are the largest gaps?','Que montrent les données publiées sur '+g.s_fr+' dans la fonction publique fédérale? Où se trouvent les plus grands écarts?'),
   about:()=>label(g)
  });
  if(status)status.textContent=tr('Showing results for: ','Résultats affichés pour : ')+label(g);
  setDemo(g);
  scheduleHighlight();
 }).catch(e=>{out.innerHTML=loadError(e);});
}
function labelGroupPicker(){
 const sel=$('gcGroup');if(!sel)return;
 $('gcGroupLabel').textContent=tr('Employment equity group','Groupe visé par l’équité en matière d’emploi');
 const keep=sel.value;
 sel.innerHTML='<option value="">'+tr('Choose a group…','Choisir un groupe…')+'</option>'+GROUPS.map(g=>'<option value="'+g.key+'">'+esc(label(g))+'</option>').join('')+'<option value="all">'+tr('All groups','Tous les groupes')+'</option>';
 sel.value=keep;
}
function buildGroupPicker(){
 const host=$('view-publicintro');if(!host||$('gcGroupPicker'))return;
 const box=document.createElement('div');box.id='gcGroupPicker';box.className='gc-extra';
 box.innerHTML='<div class="gc-pick card"><label for="gcGroup" id="gcGroupLabel"></label><select id="gcGroup"></select></div><p id="gcGroupStatus" class="gc-status" role="status"></p><div id="gcGroupOut"></div>';
 const after=host.querySelector(':scope > .lede')||host.querySelector(':scope > h2');
 if(after)after.insertAdjacentElement('afterend',box);else host.insertBefore(box,host.firstChild);
 labelGroupPicker();
 $('gcGroup').addEventListener('change',e=>setChoice(e.target.value));
 box.addEventListener('click',e=>{
  const s=e.target.closest('[data-gc-scroll]');
  if(s){const t=$(s.getAttribute('data-gc-scroll'));if(t){e.preventDefault();t.scrollIntoView({block:'start'});focusHeading(t);}return;}
  const g=e.target.closest('[data-gc-go]');
  if(g&&typeof window.go==='function'){e.preventDefault();const id=g.getAttribute('data-gc-go');window.go(id);focusHeading($('view-'+id));}
 });
 let start='';try{start=new URLSearchParams(location.search).get('group')||'';}catch(e){}
 const hash=(location.hash||'').replace(/^#/,'').split(/[?&]/)[0];
 const deep=hash&&hash!=='publicintro'&&hash!=='data'&&typeof PAGE_OF!=='undefined'&&PAGE_OF[hash]==='data';
 setChoice(start||(deep?'all':''));
 if(deep&&start)setTimeout(()=>settleOn(hash),400);
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
 // After the first span, which the page hides with a :first-child rule.
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
 let n=0,steady=0,stopped=false;
 const stop=()=>{stopped=true;};
 const events=['wheel','touchstart','keydown','mousedown'];
 events.forEach(e=>window.addEventListener(e,stop,{once:true,passive:true}));
 // A long page can take a few seconds to scroll on a phone: keep checking until the section has stayed in place.
 const fix=()=>{
  if(stopped)return;
  const top=el.getBoundingClientRect().top;
  if(top<-4||top>140){steady=0;el.scrollIntoView({block:'start'});}else steady++;
  if(++n<24&&steady<3)setTimeout(fix,250);else events.forEach(e=>window.removeEventListener(e,stop));
 };
 setTimeout(fix,60);
}
// The main page replaces the explorer's own start screen. Opening a public-service section
// directly (from the menu or search) shows all groups.
function wrapNavigation(){
 if(typeof window.go==='function'&&!window.go.__gcMain){
  const original=window.go;
  const wrapped=function(id){
   if(id==='home'){location.href=mainHref();return;}
   const page=(typeof PAGE_OF!=='undefined'&&PAGE_OF)?PAGE_OF[id]:'';
   if(page==='data'&&id!=='publicintro'&&!choice&&$('gcGroup'))setChoice('all');
   const r=original.apply(this,arguments);
   try{settleOn(id);}catch(e){}
   return r;
  };
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
 const title=()=>{$('gcBuilderAiTitle').textContent=tr('Ask an AI chatbot for help','Demander de l’aide à un agent conversationnel');};
 title();document.addEventListener('langchange',()=>setTimeout(title,0));
 window.GCAI.render(box.querySelector('.gc-ai-host'),{
  question:()=>tr('Help me outline a short briefing note on employment equity in the federal public service. Use published data and say what is not published.','Aidez-moi à préparer le plan d’une courte note d’information sur l’équité en matière d’emploi dans la fonction publique fédérale. Utilisez les données publiées et indiquez ce qui n’est pas publié.'),
  about:()=>tr('briefing notes and presentations','notes d’information et présentations')
 });
}
// A card link written around block content is split by the browser into an empty extra link;
// remove those so keyboard and screen reader users do not land on a link with no name.
function removeEmptyLinks(){
 document.querySelectorAll('a.entry-card').forEach(a=>{if(!a.textContent.trim()&&!a.querySelector('img,svg'))a.remove();});
}

function init(){
 wrapNavigation();
 addMainLink();
 removeEmptyLinks();
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
 document.addEventListener('langchange',()=>setTimeout(()=>{labelMainLink();labelGroupPicker();shadeNote();if(current)renderGroup();renderOrgExtra();},0));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
