/* GC Equity: where differences appear, and tools to present the data.
 * Overview: the employment cycle table. Data sections: number and share of employees, executives by level,
 * employees in each salary range, and subgroups in each organization. Department page: a link to the chosen
 * organization and a count of organizations below their own workforce availability. Presentations page:
 * a PowerPoint builder, and Word (.docx) files for the briefing note and the data request.
 * Every figure comes from published data already on this site. Nothing is estimated here; values that a source
 * suppressed stay suppressed. Files are built in the browser: nothing is sent anywhere.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const isFr=()=>String(document.documentElement.getAttribute('lang')||'en').toLowerCase().indexOf('fr')===0;
const tr=(en,fr)=>isFr()?fr:en;
const NB='\u00a0';
const esc=v=>String(v===null||v===undefined?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const get=f=>{try{const v=f();return v===undefined?null:v;}catch(e){return null;}};
const isNum=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const loc=()=>isFr()?'fr-CA':'en-CA';
const dec=(x,d)=>{const s=Number(x).toFixed(d);return isFr()?s.replace('.',','):s;};
const num=x=>isNum(x)?Number(x).toLocaleString(loc()):tr('Not published','Non publié');
const pc=(x,d)=>isNum(x)?dec(x,d===undefined?1:d)+(isFr()?NB+'%':'%'):tr('Not published','Non publié');
const ratio=x=>dec(x,2);
const signed=(x,d)=>(x>0?'+':x<0?'−':'')+dec(Math.abs(x),d===undefined?1:d);
const march31=y=>isFr()?'31 mars '+y:'March 31, '+y;
const fy=s=>isFr()?String(s).replace(/^(\d{4})-(\d{2})$/,(m,a,b)=>a+'-'+a.slice(0,2)+b):String(s);
const orgName=n=>{const m=get(()=>DEPT_FR);return isFr()&&m&&m[n]?m[n]:n;};
const SITE_TBS={en:'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics.html',fr:'https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/statistiques-ressources-humaines/statistiques-diversite-inclusion.html'};
const tbsLink=()=>'<a href="'+(isFr()?SITE_TBS.fr:SITE_TBS.en)+'" target="_blank" rel="noopener">'+tr('Treasury Board of Canada Secretariat, diversity and inclusion statistics','Secrétariat du Conseil du Trésor du Canada, statistiques sur la diversité et l’inclusion')+'</a>';

/* ------------------------------------------------------------------ data files */
const DIR='data/october-2026/';
const FILES={rep:'TBS_EE_representation_with_WFA_2017-2025.csv',ex:'TBS_EE_executives_by_EX_level_with_WFA_2017-2025.csv',
 count:'DI_cleaned_imputed_salary_counts_2017-2025.csv',imputed:'DI_imputation_estimates_NOT_TBS_PUBLISHED.csv',
 di:'DI_di_disproportionality_index_2017-2025.csv',med:'DI_medians_salary_by_group_2017-2025.csv',
 ind:'TBS_Indigenous_subgroups_by_department_2025.csv',pwd:'TBS_disability_subgroups_by_department_2024.csv'};
function csvParse(s){
 s=String(s).replace(/^\ufeff/,'');
 const rows=[];let row=[],f='',q=false;
 for(let i=0;i<s.length;i++){const c=s[i];
  if(q){if(c==='"'){if(s[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
  else if(c==='"')q=true;else if(c===','){row.push(f);f='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(f);f='';if(row.length>1||row[0]!=='')rows.push(row);row=[];}
  else f+=c;}
 if(f!==''||row.length){row.push(f);rows.push(row);}
 const head=(rows.shift()||[]).map(h=>h.trim());
 return rows.map(r=>{const o={};head.forEach((h,i)=>{o[h]=r[i]===undefined?'':r[i];});return o;});
}
const data={};const loading={};
function load(k){
 if(data[k])return Promise.resolve(data[k]);
 if(!loading[k])loading[k]=fetch(DIR+FILES[k]).then(r=>{if(!r.ok)throw new Error(r.status+' '+FILES[k]);return r.text();}).then(t=>{data[k]=csvParse(t);return data[k];});
 return loading[k];
}
const loadAll=keys=>Promise.all(keys.map(load));
const fileLink=(k,label)=>'<a href="'+DIR+FILES[k]+'" download>'+label+'</a>';
const failed=e=>'<p>'+tr('This information could not be loaded: ','Impossible de charger cette information : ')+esc(e&&e.message||e)+'</p>';

/* ------------------------------------------------------------------ table helpers */
// Copy and CSV buttons, as on the other tables of the site.
function tools(wrap){
 if(!wrap||wrap.previousElementSibling&&wrap.previousElementSibling.classList.contains('tbltools'))return;
 const table=wrap.querySelector('table');if(!table||typeof tableToCSV!=='function')return;
 const bar=document.createElement('div');bar.className='tbltools';
 const b1=document.createElement('button');b1.type='button';b1.dataset.role='copytbl';
 const b2=document.createElement('button');b2.type='button';b2.dataset.role='csvtbl';
 const label=()=>{b1.textContent=tr('Copy','Copier');b2.textContent=tr('Download CSV','Télécharger CSV');};label();
 b1.addEventListener('click',async()=>{let ok=false;try{ok=await safeCopy(tableToCSV(table).replace(/,/g,'\t'));}catch(e){}b1.textContent=ok?tr('Copied','Copié'):tr('Select and copy manually','Sélectionnez et copiez manuellement');setTimeout(label,1800);});
 b2.addEventListener('click',()=>{try{const cap=(table.caption&&table.caption.textContent)||table.id||'table';download('equity-'+cap.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)+'.csv',tableToCSV(table));}catch(e){}});
 bar.append(b1,b2);wrap.parentNode.insertBefore(bar,wrap);
}
function tableHtml(id,caption,head,rows,opts){
 opts=opts||{};
 return '<div class="tblwrap'+(opts.tall?' gt-tall':'')+'"><table class="gt-table" id="'+id+'"><caption>'+caption+'</caption><thead><tr>'+
  head.map((h,i)=>'<th scope="col"'+(i>0&&opts.num!==false?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>'+
  rows.map(r=>'<tr'+(r.cls?' class="'+r.cls+'"':'')+'>'+r.cells.map((c,i)=>i===0?'<th scope="row">'+c+'</th>':'<td class="num'+(r.cc&&r.cc[i]?' '+r.cc[i]:'')+'">'+c+'</td>').join('')+'</tr>').join('')+
  '</tbody></table></div>';
}
function mount(el,html){el.innerHTML=html;el.querySelectorAll('.tblwrap').forEach(tools);}
function goLinks(root){
 root.querySelectorAll('[data-gt-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const id=a.getAttribute('data-gt-go');if(typeof window.go==='function')window.go(id);}));
}

/* ------------------------------------------------------------------ the five groups */
const G5=[['w','Women','Femmes'],['i','Indigenous Peoples','Peuples autochtones'],['d','Persons with disabilities','Personnes en situation de handicap'],['v','Racialized employees','Employés racisés'],['black','Black employees','Employés noirs']];
const gLabel=k=>{const g=G5.find(x=>x[0]===k);return g?(isFr()?g[2]:g[1]):k;};
const LOW=0.85, HIGH=1.15;   // the screening rule used for the salary index on this site

/* Share of each group earning $100,000 or more, March 31, 2025. Treasury Board publishes this share for every group
   except women; for women it is the sum of the three published salary bands of $100,000 and over. */
function hundredK(){
 const SG=get(()=>SGSAL)||[],S6=get(()=>SAL6)||{};
 const row=n=>{const r=SG.find(x=>x[0]===n);return r&&isNum(r[4])?Number(r[4]):null;};
 const sum=a=>a&&a.length===6&&a.slice(3).every(isNum)?Math.round((a[3]+a[4]+a[5])*10)/10:null;
 return {all:row('All employees'),w:sum(S6.w),i:row('Indigenous Peoples'),d:row('Persons with disabilities'),v:row('Racialized (visible minority)'),black:row('Black')};
}

/* The employment cycle: for each group and stage, the group's share compared with a benchmark. */
function cycle(){
 const W=get(()=>WFA)||{},C=get(()=>CPA)||{},F=get(()=>FLOW25)||{},E=get(()=>EX)||{},H=hundredK();
 const stages=[
  {k:'rep',go:'overview',low:true,en:'Employees compared with workforce availability, March 31, 2025',fr:'Effectif comparé à la disponibilité au sein de la population active, 31 mars 2025',
   hen:'Share of employees ÷ availability',hfr:'Part de l’effectif ÷ disponibilité',a:k=>C[k],b:k=>W[k],ae:'of employees',af:'de l’effectif'},
  {k:'hire',go:'flows',low:true,en:'Hires compared with workforce availability, 2024-25',fr:'Embauches comparées à la disponibilité, 2024-2025',
   hen:'Share of hires ÷ availability',hfr:'Part des embauches ÷ disponibilité',a:k=>F[k]&&F[k].h,b:k=>W[k],ae:'of hires',af:'des embauches'},
  {k:'promo',go:'flows',low:true,en:'Promotions compared with share of employees, 2024-25',fr:'Promotions comparées à la part de l’effectif, 2024-2025',
   hen:'Share of promotions ÷ share of employees',hfr:'Part des promotions ÷ part de l’effectif',a:k=>F[k]&&F[k].p,b:k=>F[k]&&F[k].rep},
  {k:'ex',go:'ex',low:true,en:'Executives compared with share of employees, March 31, 2025',fr:'Cadres comparés à la part de l’effectif, 31 mars 2025',
   hen:'Share of executives ÷ share of employees',hfr:'Part des cadres ÷ part de l’effectif',a:k=>E[k],b:k=>C[k]},
  {k:'pay',go:'salary',low:true,en:'Earning $100,000 or more, compared with all employees, March 31, 2025',fr:'Salaire de 100 000 $ ou plus, comparé à l’ensemble des employés, 31 mars 2025',
   hen:'Share of the group ÷ share of all employees',hfr:'Part du groupe ÷ part de l’ensemble des employés',a:k=>H[k],b:()=>H.all},
  {k:'sep',go:'flows',low:false,en:'Separations compared with share of employees, 2024-25',fr:'Départs comparés à la part de l’effectif, 2024-2025',
   hen:'Share of separations ÷ share of employees; a higher ratio means more employees leaving',hfr:'Part des départs ÷ part de l’effectif; un ratio plus élevé signifie plus de départs',a:k=>F[k]&&F[k].s,b:k=>F[k]&&F[k].rep}
 ];
 return stages.map(st=>({st,cells:G5.map(([k])=>{
  const a=st.a(k),b=st.b(k);
  if(!isNum(a))return {k,a:null,b,r:null,flag:false};
  if(!isNum(b))return {k,a:Number(a),b:null,r:null,flag:false};
  const r=Number(a)/Number(b);
  return {k,a:Number(a),b:Number(b),r,flag:st.low?r<=LOW:r>=HIGH};
 })}));
}
const stageLabel=st=>isFr()?st.fr:st.en;
const stageShort=st=>({rep:tr('employees compared with availability','effectif comparé à la disponibilité'),hire:tr('hires compared with availability','embauches comparées à la disponibilité'),promo:tr('promotions compared with share of employees','promotions comparées à la part de l’effectif'),ex:tr('executives compared with share of employees','cadres comparés à la part de l’effectif'),pay:tr('earning $100,000 or more compared with all employees','salaire de 100 000 $ ou plus comparé à l’ensemble des employés'),sep:tr('separations compared with share of employees','départs comparés à la part de l’effectif')})[st.k];
const flagText=st=>st.low?tr('0.85 or less','0,85 ou moins'):tr('1.15 or more','1,15 ou plus');

function cycleCell(st,c){
 if(c.r===null){
  if(c.a===null)return {html:tr('Not published','Non publié'),cls:''};
  return {html:'<span class="gt-na">'+tr('No published availability','Aucune disponibilité publiée')+'</span><span class="gt-in">'+pc(c.a)+' '+(isFr()?st.af||'':st.ae||'')+'</span>',cls:''};
 }
 const mark=c.flag?'<span aria-hidden="true" class="gt-mark">'+(st.low?' ▼':' ▲')+'</span><span class="gt-sr"> ('+tr('marked','signalé')+')</span>':'';
 return {html:'<span class="gt-r">'+ratio(c.r)+mark+'</span><span class="gt-in">'+pc(c.a)+' ÷ '+pc(c.b)+'</span>',cls:c.flag?'gt-flag':''};
}
function markedList(rows,only){
 const items=[];
 G5.forEach(([k],gi)=>{
  if(only&&only!==k)return;
  const f=rows.filter(x=>x.cells[gi].flag).map(x=>stageShort(x.st)+' ('+ratio(x.cells[gi].r)+')');
  if(f.length)items.push('<li><span class="gt-gname">'+esc(gLabel(k))+'</span>'+(isFr()?NB+': ':': ')+f.join('; ')+'.</li>');
 });
 return items;
}
function renderCycle(){
 const host=$('gcCycleCard');if(!host)return;
 const rows=cycle();
 const head=[tr('Stage of employment','Étape de l’emploi')].concat(G5.map(([k])=>esc(gLabel(k))));
 const body=rows.map(x=>{
  const cells=x.cells.map(c=>cycleCell(x.st,c));
  return {cells:['<span class="gt-stage">'+stageLabel(x.st)+'</span><span class="gt-how">'+(isFr()?x.st.hfr:x.st.hen)+'. <a href="#" data-gt-go="'+x.st.go+'">'+tr('See the data','Voir les données')+'</a></span>'].concat(cells.map(c=>c.html)),cc:[''].concat(cells.map(c=>c.cls))};
 });
 const marked=markedList(rows);
 mount(host,'<h3>'+tr('Where differences appear across the employment cycle','Où se trouvent les écarts dans le cycle d’emploi')+'</h3>'+
  '<p class="howto">'+tr('Each number compares a group’s share at one stage of employment with a benchmark: workforce availability for employees and hires, the group’s share of employees for promotions, executives and separations, and all employees for pay. 1.00 means the same rate as the benchmark. Below 1.00, the group is less present at that stage; above 1.00, more present.',
   'Chaque nombre compare la part d’un groupe à une étape de l’emploi avec un point de comparaison : la disponibilité au sein de la population active pour l’effectif et les embauches, la part du groupe dans l’effectif pour les promotions, les cadres et les départs, et l’ensemble des employés pour la rémunération. 1,00 signifie le même taux que le point de comparaison. Sous 1,00, le groupe est moins présent à cette étape; au-dessus de 1,00, il est plus présent.')+'</p>'+
  '<p class="howto">'+tr('Marked in red with ▼: a ratio of 0.85 or less. For separations, marked with ▲: a ratio of 1.15 or more, which means more employees leaving. This is the screening rule used for the salary index on this site. It is not a test of statistical significance or a legal standard, and it does not show the cause of a difference.',
   'Marqué en rouge avec ▼ : un ratio de 0,85 ou moins. Pour les départs, marqué avec ▲ : un ratio de 1,15 ou plus, ce qui signifie plus de départs. Il s’agit de la règle de repérage utilisée pour l’indice salarial sur ce site. Ce n’est pas un test de signification statistique ni une norme juridique, et cela n’indique pas la cause d’un écart.')+'</p>'+
  tableHtml('gtCycleTable',tr('Ratios by group and stage of employment, core public administration','Ratios selon le groupe et l’étape de l’emploi, administration publique centrale'),head,body)+
  (marked.length?'<h4>'+tr('Marked results','Résultats signalés')+'</h4><ul class="gt-marked">'+marked.join('')+'</ul>':'')+
  '<p class="gc-small">'+tr('Black employees are a subgroup of racialized employees. Treasury Board does not publish workforce availability for them. For women, the share earning $100,000 or more is the sum of the three published salary bands of $100,000 and over.',
   'Les employés noirs forment un sous-groupe des employés racisés. Le Conseil du Trésor ne publie pas de disponibilité pour eux. Pour les femmes, la part gagnant 100 000 $ ou plus est la somme des trois tranches salariales publiées de 100 000 $ et plus.')+'</p>'+
  '<p class="eq-source-foot">'+tr('Sources: ','Sources : ')+tbsLink()+tr('; Employment Equity Demographic Snapshot 2024-2025 (representation, hires, promotions, separations, executives and salary bands); workforce availability for March 31, 2025.','; Aperçu démographique de l’équité en matière d’emploi 2024-2025 (représentation, embauches, promotions, départs, cadres et tranches salariales); disponibilité au sein de la population active au 31 mars 2025.')+'</p>');
 goLinks(host);
}

/* ------------------------------------------------------------------ number and share of employees, 2017 to 2025 */
const REP_COLS=[['women','w'],['indigenous_peoples','i'],['persons_with_disabilities','d'],['members_of_visible_minorities','v']];
function renderRepTable(){
 const host=$('gcRepTable');if(!host)return;
 load('rep').then(rows=>{
  const reps=rows.filter(r=>r.row_type==='representation');
  const yr=r=>(String(r.period_or_benchmark).match(/(20\d\d)\s*$/)||[])[1]||r.period_or_benchmark;
  const head=[tr('Date','Date'),tr('All employees','Ensemble des employés')].concat(REP_COLS.map(([c,k])=>esc(gLabel(k))));
  const body=reps.map(r=>({cells:[march31(yr(r)),num(r.all_employees_number)].concat(REP_COLS.map(([c])=>num(r[c+'_number'])+' ('+pc(r[c+'_pct'])+')'))}));
  mount(host,'<p class="howto">'+tr('The number of employees in each group, with the group’s share of all employees in brackets. Compare each year with the workforce availability estimate in use that year, in the next table.','Le nombre d’employés de chaque groupe, avec la part du groupe dans l’ensemble des employés entre parenthèses. Comparez chaque année avec l’estimation de la disponibilité en vigueur cette année-là, dans le tableau suivant.')+'</p>'+
   tableHtml('gtRepTable',tr('Employees in each designated group, core public administration, 2017 to 2025','Employés de chaque groupe désigné, administration publique centrale, de 2017 à 2025'),head,body)+
   '<p class="eq-source-foot">'+tr('Source: ','Source : ')+tbsLink()+'. '+fileLink('rep',tr('Download the published table (CSV)','Télécharger le tableau publié (CSV)'))+'</p>');
 }).catch(e=>{host.innerHTML=failed(e);});
}

/* ------------------------------------------------------------------ executives by level, 2017 to 2025 */
let exYear=null;
function exLevelName(l){if(l==='Executives')return tr('All executives','Ensemble des cadres');if(l==='Unknown')return tr('Level not reported','Niveau non déclaré');return esc(String(l).replace(/^EX (\d+)$/,'EX-$1'));}
function renderEx(){
 const host=$('gcExCard');if(!host)return;
 load('ex').then(rows=>{
  const years=[...new Set(rows.map(r=>r.as_of_march_31))].filter(y=>/^\d{4}$/.test(y)).sort().reverse();
  if(!exYear||!years.includes(exYear))exYear=years[0];
  const y=exYear;
  const lv=rows.filter(r=>r.as_of_march_31===y&&r.level!=='Overall EX WFA');
  const wfa=rows.find(r=>r.as_of_march_31===y&&r.level==='Overall EX WFA');
  const EXL=get(()=>EXLEV);const withBlack=y==='2025'&&EXL&&EXL.black;
  const blackIdx={'EX 01':0,'EX 02':1,'EX 03':2,'EX 04':3,'EX 05':4,'Executives':5};
  const head=[tr('Level','Niveau'),tr('Executives','Cadres')].concat(REP_COLS.map(([c,k])=>esc(gLabel(k)))).concat(withBlack?[esc(gLabel('black'))]:[]);
  const body=lv.map(r=>{
   const total=r.level==='Executives';
   const cc=[''];const cells=[exLevelName(r.level),num(r.executive_employees)];cc.push('');
   REP_COLS.forEach(([c])=>{const p=r[c+'_pct'],w=wfa&&wfa[c+'_pct'];cells.push(num(r[c+'_number'])+' ('+pc(p)+')');cc.push(total&&isNum(p)&&isNum(w)&&Number(p)<Number(w)?'below-mark':'');});
   if(withBlack){const v=EXL.black[blackIdx[r.level]];cells.push(isNum(v)?pc(v):tr('Suppressed','Supprimé'));cc.push('');}
   return {cells,cc,cls:total?'gc-total':''};
  });
  if(wfa)body.push({cells:[tr('Executive workforce availability','Disponibilité pour les postes de cadres'),''].concat(REP_COLS.map(([c])=>pc(wfa[c+'_pct']))).concat(withBlack?[tr('Not published','Non publiée')]:[]),cls:'gt-bench'});
  mount(host,'<h3>'+tr('Executives by level, 2017 to 2025','Cadres selon le niveau, de 2017 à 2025')+'</h3>'+
   '<p class="howto">'+tr('The number of executives in each group at each level, from EX-01, the entry level, to EX-05, with the share in brackets. Executive workforce availability is an estimate for all executives together. There is no estimate for each level. Red bold marks a group whose share of all executives is below that availability. A share that falls from one level to the next shows where to look more closely.',
    'Le nombre de cadres de chaque groupe à chaque niveau, de EX-01, le niveau d’entrée, à EX-05, avec la part entre parenthèses. La disponibilité pour les postes de cadres est une estimation pour l’ensemble des cadres. Il n’y a pas d’estimation pour chaque niveau. Le rouge gras marque un groupe dont la part de l’ensemble des cadres est inférieure à cette disponibilité. Une part qui diminue d’un niveau à l’autre indique où regarder de plus près.')+'</p>'+
   '<div class="controls"><div class="ctl"><label for="gtExYear">'+tr('Date','Date')+'</label><select id="gtExYear">'+years.map(v=>'<option value="'+v+'"'+(v===y?' selected':'')+'>'+march31(v)+'</option>').join('')+'</select></div></div>'+
   '<div aria-live="polite">'+tableHtml('gtExTable',tr('Executives by level and group, ','Cadres selon le niveau et le groupe, ')+march31(y),head,body)+'</div>'+
   (withBlack?'<p class="gc-small">'+tr('Black employees: shares published for March 31, 2025, in the Employment Equity Demographic Snapshot. Treasury Board does not publish executive workforce availability for them.','Employés noirs : parts publiées pour le 31 mars 2025 dans l’Aperçu démographique de l’équité en matière d’emploi. Le Conseil du Trésor ne publie pas de disponibilité des cadres pour eux.')+'</p>':'<p class="gc-small">'+tr('Shares for Black executives by level are available on this site for March 31, 2025 only.','Les parts des cadres noirs selon le niveau ne sont disponibles sur ce site que pour le 31 mars 2025.')+'</p>')+
   '<p class="eq-source-foot">'+tr('Source: ','Source : ')+tbsLink()+'. '+fileLink('ex',tr('Download the published table (CSV)','Télécharger le tableau publié (CSV)'))+'</p>');
  const s=$('gtExYear');if(s)s.addEventListener('change',()=>{exYear=s.value;renderEx();setTimeout(()=>{const n=$('gtExYear');if(n)n.focus();},0);});
 }).catch(e=>{host.innerHTML=failed(e);});
}

/* ------------------------------------------------------------------ employees in each salary range, 2017 to 2025 */
let salYear=null;
function parseBand(s){
 s=String(s||'').replace(/,/g,'');let m;
 if((m=s.match(/^Under (\d+)/i)))return [0,+m[1]];
 if((m=s.match(/^(\d+) to (\d+)/i)))return [+m[1],+m[2]+1];
 if((m=s.match(/^(\d+) and over/i)))return [+m[1],Infinity];
 return null;
}
function estimated(imp,col,year,band){
 const b=parseBand(band);if(!b)return false;
 return imp.some(r=>r.Year===year&&r.Group===col&&(x=>x&&x[0]>=b[0]&&x[1]<=b[1])(parseBand(r.salary_range)));
}
function bandLabel(s){
 const t=String(s).trim();let m;
 const money=n=>isFr()?n.replace(/,/g,NB)+NB+'$':'$'+n;
 if(/^total$/i.test(t))return tr('Total','Total');
 if((m=t.match(/^Under ([\d,]+)$/i)))return tr('Under ','Moins de ')+money(m[1]);
 if((m=t.match(/^([\d,]+) to ([\d,]+)$/i)))return money(m[1])+tr(' to ',' à ')+money(m[2]);
 if((m=t.match(/^([\d,]+) and over$/i)))return money(m[1])+tr(' and over',' et plus');
 return esc(t);
}
const SAL_COLS=[['count_all','All employees','Ensemble des employés'],['count_black','Black employees','Employés noirs'],['count_vm','Racialized employees','Employés racisés'],['count_indigenous','Indigenous employees','Employés autochtones'],['count_pwd','Persons with disabilities','Personnes en situation de handicap'],['count_non_vm','Non-racialized employees','Employés non racisés']];
function renderSalCounts(){
 const host=$('gcSalCountsCard');if(!host)return;
 loadAll(['count','imputed']).then(([rows,imp])=>{
  const years=[...new Set(rows.map(r=>r.Year))].filter(y=>/^\d{4}$/.test(y)).sort().reverse();
  if(!salYear||!years.includes(salYear))salYear=years[0];
  const y=salYear;let any=false;
  const body=rows.filter(r=>r.Year===y).map(r=>{
   const total=/^total$/i.test(String(r.salary_range).trim());
   return {cells:[bandLabel(r.salary_range)].concat(SAL_COLS.map(([c])=>{const est=!total&&c!=='count_all'&&estimated(imp,c,y,r.salary_range);if(est)any=true;return num(r[c])+(est?' *':'');})),cls:total?'gc-total':''};
  });
  mount(host,'<h3>'+tr('Employees in each salary range, 2017 to 2025','Employés dans chaque tranche salariale, de 2017 à 2025')+'</h3>'+
   '<p class="howto">'+tr('The counts behind the salary index above, in the salary ranges Treasury Board publishes. Where Treasury Board suppressed a small count, the independent project estimated it; each estimate is marked with an asterisk and is not Government of Canada data.','Les nombres sur lesquels repose l’indice salarial ci-dessus, dans les tranches publiées par le Conseil du Trésor. Lorsque le Conseil du Trésor a supprimé un petit nombre, le projet indépendant l’a estimé; chaque estimation est marquée d’un astérisque et n’est pas une donnée du gouvernement du Canada.')+'</p>'+
   '<div class="controls"><div class="ctl"><label for="gtSalYear">'+tr('Date','Date')+'</label><select id="gtSalYear">'+years.map(v=>'<option value="'+v+'"'+(v===y?' selected':'')+'>'+march31(v)+'</option>').join('')+'</select></div></div>'+
   '<div aria-live="polite">'+tableHtml('gtSalTable',tr('Employees in each salary range by group, ','Employés dans chaque tranche salariale selon le groupe, ')+march31(y),[tr('Salary range','Tranche salariale')].concat(SAL_COLS.map(c=>isFr()?c[2]:c[1])),body,{tall:true})+'</div>'+
   (any?'<p class="gc-small">'+tr('* Includes a value estimated by the independent project to replace a small count that Treasury Board did not publish.','* Comprend une valeur estimée par le projet indépendant pour remplacer un petit nombre que le Conseil du Trésor n’a pas publié.')+'</p>':'')+
   '<p class="eq-source-foot">'+tr('Source: ','Source : ')+'<a href="https://employment-equity.github.io/" target="_blank" rel="noopener">'+tr('Disproportionality Index project','Projet sur l’indice de disproportion')+'</a>, '+tr('from Treasury Board tables','à partir des tableaux du Conseil du Trésor')+'. '+tr('Download: ','Télécharger : ')+fileLink('count',tr('counts by salary range','nombres par tranche'))+' · '+fileLink('imputed',tr('estimated values','valeurs estimées'))+' (CSV)</p>');
  const s=$('gtSalYear');if(s)s.addEventListener('change',()=>{salYear=s.value;renderSalCounts();setTimeout(()=>{const n=$('gtSalYear');if(n)n.focus();},0);});
 }).catch(e=>{host.innerHTML=failed(e);});
}

/* ------------------------------------------------------------------ subgroups in each organization */
const SUBS=[
 ['ind','first_nations','First Nations','Premières Nations'],['ind','metis','Métis','Métis'],['ind','inuit','Inuit','Inuit'],['ind','other','Other Indigenous identity','Autre identité autochtone'],['ind','indigenous_peoples','All Indigenous Peoples','Ensemble des Autochtones'],
 ['pwd','coordination_dexterity','Coordination or dexterity','Coordination ou dextérité'],['pwd','mobility','Mobility','Mobilité'],['pwd','speech_impairment','Speech impairment','Trouble de la parole'],['pwd','blind_visual_impairment','Blind or visual impairment','Cécité ou déficience visuelle'],['pwd','deaf_hard_of_hearing','Deaf or hard of hearing','Surdité ou malentendance'],['pwd','other_disability','Other disability','Autre handicap'],['pwd','persons_with_disabilities','All persons with disabilities','Ensemble des personnes en situation de handicap']];
let subKey='first_nations';
function renderSubOrg(){
 const host=$('gcSubOrgCard');if(!host)return;
 loadAll(['ind','pwd']).then(()=>{
  const sub=SUBS.find(x=>x[1]===subKey)||SUBS[0];
  const file=sub[0],field=sub[1],year=file==='ind'?'2025':'2024';
  const all=data[file].filter(r=>r.department_or_agency&&!/^source:/i.test(r.department_or_agency.trim()));
  const isTot=r=>/^(grand total|total)$/i.test(String(r.department_or_agency).trim());
  const tot=all.find(isTot);
  const orgs=all.filter(r=>!isTot(r)).sort((a,b)=>(isNum(b[field+'_pct'])?+b[field+'_pct']:-1)-(isNum(a[field+'_pct'])?+a[field+'_pct']:-1)||(+b.all_employees||0)-(+a.all_employees||0));
  const body=(tot?[{cells:[tr('Core public administration','Administration publique centrale'),num(tot.all_employees),num(tot[field+'_number']),pc(tot[field+'_pct'])],cls:'gc-total'}]:[])
   .concat(orgs.map(r=>({cells:[esc(orgName(r.department_or_agency)),num(r.all_employees),num(r[field+'_number']),pc(r[field+'_pct'])]})));
  const opt=(f,label)=>'<optgroup label="'+label+'">'+SUBS.filter(x=>x[0]===f).map(x=>'<option value="'+x[1]+'"'+(x[1]===subKey?' selected':'')+'>'+(isFr()?x[3]:x[2])+'</option>').join('')+'</optgroup>';
  mount(host,'<h3>'+tr('Subgroups in each organization','Sous-groupes dans chaque organisation')+'</h3>'+
   '<p class="howto">'+tr('Treasury Board publishes the number of First Nations, Métis and Inuit employees in each organization for March 31, 2025, and the number of employees with each type of disability for March 31, 2024. Choose a subgroup. Organizations are listed from the highest share to the lowest; suppressed values are listed last and are not zero.','Le Conseil du Trésor publie le nombre d’employés des Premières Nations, métis et inuits dans chaque organisation au 31 mars 2025, et le nombre d’employés selon le type de handicap au 31 mars 2024. Choisissez un sous-groupe. Les organisations sont classées de la part la plus élevée à la plus faible; les valeurs supprimées figurent en dernier et ne sont pas des zéros.')+'</p>'+
   '<div class="controls"><div class="ctl"><label for="gtSubSel">'+tr('Subgroup','Sous-groupe')+'</label><select id="gtSubSel">'+opt('ind',tr('Indigenous Peoples, March 31, 2025','Peuples autochtones, 31 mars 2025'))+opt('pwd',tr('Type of disability, March 31, 2024','Type de handicap, 31 mars 2024'))+'</select></div></div>'+
   '<div aria-live="polite">'+tableHtml('gtSubTable',esc(isFr()?sub[3]:sub[2])+tr(' in each organization, ',' dans chaque organisation, ')+march31(year),[tr('Organization','Organisation'),tr('All employees','Ensemble des employés'),tr('Employees in the subgroup','Employés du sous-groupe'),tr('Share of the organization','Part de l’organisation')],body,{tall:true})+'</div>'+
   '<p class="gc-small">'+tr('Indigenous subgroups and types of disability are for different years. Employees can report more than one type of disability, so the types do not add up to the total.','Les sous-groupes autochtones et les types de handicap portent sur des années différentes. Une personne peut déclarer plus d’un type de handicap; les types ne s’additionnent donc pas pour donner le total.')+'</p>'+
   '<p class="eq-source-foot">'+tr('Source: ','Source : ')+tbsLink()+'. '+tr('Download: ','Télécharger : ')+fileLink('ind',tr('Indigenous subgroups','sous-groupes autochtones'))+' · '+fileLink('pwd',tr('types of disability','types de handicap'))+' (CSV)</p>');
  const s=$('gtSubSel');if(s)s.addEventListener('change',()=>{subKey=s.value;renderSubOrg();setTimeout(()=>{const n=$('gtSubSel');if(n)n.focus();},0);});
 }).catch(e=>{host.innerHTML=failed(e);});
}

/* ------------------------------------------------------------------ organizations below their own availability */
function renderAllDeptSummary(){
 const host=$('gcAllDeptSummary');if(!host)return;
 const D=get(()=>DEPTS),W=get(()=>DEPT_WFA_2025);if(!D||!W){host.textContent='';return;}
 const cols={w:2,i:3,d:4,v:5};
 const res=Object.keys(cols).map(k=>{let below=0,n=0;D.forEach(d=>{const v=d[cols[k]],a=W[d[0]]&&W[d[0]][k];if(isNum(v)&&isNum(a)){n++;if(Number(v)<Number(a))below++;}});return {k,below,n};}).sort((a,b)=>b.below/b.n-a.below/a.n);
 const part=r=>isFr()?gLabel(r.k).toLowerCase().replace(/^employés/,'les employés').replace(/^femmes/,'les femmes').replace(/^peuples autochtones/,'les Autochtones').replace(/^personnes/,'les personnes')+' dans '+r.below+' organisations sur '+r.n:gLabel(r.k).replace(/^Women/,'women').replace(/^Racialized/,'racialized').replace(/^Persons/,'persons')+' in '+r.below+' of '+r.n+' organizations';
 const list=res.map(part);
 host.textContent=tr('Representation is below the organization’s own workforce availability for ','La représentation est inférieure à la disponibilité propre à l’organisation pour ')+list.slice(0,-1).join(isFr()?', ':', ')+tr(' and ',' et ')+list[list.length-1]+'. '+tr('Organizations with a suppressed value, or without published availability for a group, are not counted for that group.','Les organisations dont la valeur est supprimée, ou sans disponibilité publiée pour un groupe, ne sont pas comptées pour ce groupe.');
}

/* ------------------------------------------------------------------ links to share */
async function copyText(text){
 try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);return true;}}catch(e){}
 try{const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}catch(e){return false;}
}
function linkButton(id,labelFn,urlFn){
 const b=document.createElement('button');b.type='button';b.id=id;b.className='gt-link-btn';b.textContent=labelFn();
 const st=document.createElement('span');st.className='gt-sr';st.setAttribute('role','status');
 b.addEventListener('click',async()=>{const ok=await copyText(urlFn());b.textContent=ok?tr('Link copied','Lien copié'):tr('Copy failed. The link is in the address bar.','La copie a échoué. Le lien figure dans la barre d’adresse.');st.textContent=b.textContent;setTimeout(()=>{b.textContent=labelFn();},2200);});
 const wrap=document.createElement('span');wrap.append(b,st);return wrap;
}
const baseUrl=()=>location.href.split('#')[0].split('?')[0];
const langQ=()=>isFr()?'lang=fr':'lang=en';
function orgLink(){
 const card=$('opCard'),sel=$('opOrg');if(!card||!sel)return;
 const title=card.querySelector('.eq-org-title');
 if(!title||!sel.value||$('gtOrgLink'))return;
 const w=linkButton('gtOrgLink',()=>tr('Copy a link to this organization','Copier un lien vers cette organisation'),()=>baseUrl()+'?'+langQ()+'#org='+encodeURIComponent(sel.value));
 w.firstChild.id='gtOrgLink';w.className='gt-link-wrap';title.insertAdjacentElement('afterend',w);
}
function groupLink(){
 const sel=$('gcGroup'),box=document.querySelector('#gcGroupPicker .gc-pick');if(!sel||!box)return;
 let w=$('gtGroupLinkWrap');
 if(!w){w=linkButton('gtGroupLink',()=>tr('Copy a link to this group','Copier un lien vers ce groupe'),()=>baseUrl()+'?'+langQ()+'&group='+encodeURIComponent(sel.value)+'#data');w.id='gtGroupLinkWrap';w.className='gt-link-wrap';box.appendChild(w);}
 w.hidden=!sel.value||sel.value==='all';
}

/* ================================================================== Word (.docx) */
function loadLib(){
 if(window.PptxGenJS&&window.JSZip)return Promise.resolve();
 if(loadLib.p)return loadLib.p;
 loadLib.p=new Promise((res,rej)=>{const s=document.createElement('script');s.src='lib/pptxgen.bundle.js';s.onload=()=>window.JSZip&&window.PptxGenJS?res():rej(new Error('library'));s.onerror=()=>{loadLib.p=null;rej(new Error(tr('The file builder could not be loaded.','Le générateur de fichiers n’a pas pu être chargé.')));};document.head.appendChild(s);});
 return loadLib.p;
}
const x=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
function run(t,b){return '<w:r>'+(b?'<w:rPr><w:b/></w:rPr>':'')+'<w:t xml:space="preserve">'+x(t)+'</w:t></w:r>';}
function para(t,style,numId){return '<w:p><w:pPr>'+(style?'<w:pStyle w:val="'+style+'"/>':'')+(numId?'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="'+numId+'"/></w:numPr>':'')+'</w:pPr>'+run(t)+'</w:p>';}
function docTable(rows){
 const n=Math.max(...rows.map(r=>r.length));const w=Math.floor(9360/n);
 return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>'+
  Array.from({length:n},()=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>'+
  rows.map((r,i)=>'<w:tr>'+(i===0?'<w:trPr><w:tblHeader/></w:trPr>':'')+Array.from({length:n},(_,j)=>'<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="TableText"/></w:pPr>'+run(r[j]||'',i===0)+'</w:p></w:tc>').join('')+'</w:tr>').join('')+'</w:tbl>'+para('');
}
// Turn the plain text of the builders into headings, paragraphs, lists and tables.
function textToBlocks(text){
 const L=String(text||'').replace(/\r/g,'').split('\n');const out=[];let i=0;
 while(i<L.length&&!L[i].trim())i++;
 if(i<L.length){out.push({t:'title',s:L[i].trim()});i++;}
 for(;i<L.length;i++){
  const raw=L[i],s=raw.trim();if(!s)continue;
  if(s.split(' | ').length>=3){const rows=[];while(i<L.length&&L[i].trim().split(' | ').length>=3){rows.push(L[i].trim().split(' | '));i++;}i--;out.push({t:'table',rows});continue;}
  const indented=/^\s+/.test(raw);
  let m;
  if((m=s.match(/^[-•]\s+(.*)$/))){out.push({t:'bullet',s:m[1]});continue;}
  const prevBlank=i===0||!L[i-1].trim(),nextFilled=i+1<L.length&&L[i+1].trim();
  const heading=!indented&&prevBlank&&nextFilled&&s.length<140&&!/[.?!:;,]$/.test(s)&&(!/:/.test(s)||/^(annex|annexe)\b/i.test(s));
  if(heading){out.push({t:'h1',s});continue;}
  if((m=s.match(/^(\d+)\.\s+(.*)$/))&&(indented||/[.?!:;)]$/.test(s))){out.push({t:'num',s:m[2],start:+m[1]});continue;}
  out.push({t:'p',s});
 }
 return out;
}
function buildDocx(blocks,title){
 const lang=isFr()?'fr-CA':'en-CA';let nums=[],body='',listOpen=false,numId=2;
 blocks.forEach(b=>{
  if(b.t!=='num')listOpen=false;
  if(b.t==='title')body+=para(b.s,'Title');
  else if(b.t==='h1')body+=para(b.s,'Heading1');
  else if(b.t==='bullet')body+=para(b.s,'ListParagraph',1);
  else if(b.t==='num'){if(!listOpen||b.start===1){numId++;nums.push(numId);listOpen=true;}body+=para(b.s,'ListParagraph',numId);}
  else if(b.t==='table')body+=docTable(b.rows);
  else body+=para(b.s);
 });
 const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
 const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+W+'><w:body>'+body+'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+W+'>'+
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="'+lang+'"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="1B2A41"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="1B2A41"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="17"/><w:szCs w:val="17"/></w:rPr></w:style>'+
  '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'+
  '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders></w:tblPr></w:style>'+
  '</w:styles>';
 const numbering='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering '+W+'>'+
  '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'+
  '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'+
  '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'+
  nums.map(n=>'<w:num w:numId="'+n+'"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>').join('')+'</w:numbering>';
 const zip=new window.JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
 zip.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>');
 zip.file('word/document.xml',doc);zip.file('word/styles.xml',styles);zip.file('word/numbering.xml',numbering);
 zip.file('docProps/core.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'+x(title)+'</dc:title><dc:language>'+lang+'</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">'+new Date().toISOString().replace(/\.\d+Z$/,'Z')+'</dcterms:created></cp:coreProperties>');
 return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
function saveBlob(blob,name){
 const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
}
const fileSlug=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'document';
function wordButton(btnId,textId,nameFn){
 const b=$(btnId);if(!b||b.dataset.gt)return;b.dataset.gt='1';
 const st=document.createElement('span');st.className='gt-status';st.setAttribute('role','status');b.insertAdjacentElement('afterend',st);
 b.addEventListener('click',()=>{
  const ta=$(textId);const text=ta&&ta.value;if(!text||!text.trim()){st.textContent=tr('There is no text to save yet.','Il n’y a pas encore de texte à enregistrer.');return;}
  st.textContent=tr('Preparing the Word file…','Préparation du fichier Word…');
  loadLib().then(()=>{const blocks=textToBlocks(text);const title=(blocks[0]&&blocks[0].s)||'';return buildDocx(blocks,title);})
   .then(blob=>{saveBlob(blob,nameFn()+'.docx');st.textContent=tr('The Word file is ready in your downloads.','Le fichier Word se trouve dans vos téléchargements.');})
   .catch(e=>{st.textContent=(e&&e.message)||tr('The Word file could not be created.','Le fichier Word n’a pas pu être créé.');});
 });
}

/* ================================================================== PowerPoint */
const DECK_GROUPS=[['','All employment equity groups','Tous les groupes visés par l’équité en matière d’emploi'],['w','Women','Femmes'],['i','Indigenous Peoples','Peuples autochtones'],['d','Persons with disabilities','Personnes en situation de handicap'],['v','Racialized employees','Employés racisés'],['black','Black employees','Employés noirs']];
// survey comparisons: group, comparison group (as on the department page)
const PAIRS=[['woman','man','w'],['ind','nonind','i'],['pwd','nopwd','d'],['rac','nonrac','v'],['black','nonrac','black']];
const EEGL={woman:['Women','Femmes'],man:['Men','Hommes'],ind:['Indigenous employees','Employés autochtones'],nonind:['Non-Indigenous employees','Employés non autochtones'],pwd:['Persons with disabilities','Personnes en situation de handicap'],nopwd:['Persons without disabilities','Personnes sans handicap'],rac:['Racialized employees','Employés racisés'],nonrac:['Non-racialized employees','Employés non racisés'],black:['Black employees','Employés noirs']};
const eegL=k=>EEGL[k]?(isFr()?EEGL[k][1]:EEGL[k][0]):k;
function qText(q){const fr=get(()=>EEG_QMETA_FR),en=get(()=>EEG_QMETA);return isFr()&&fr&&fr[q]?fr[q]:(en&&en[q]?en[q][1]:q);}
const qNeg=q=>{const en=get(()=>EEG_QMETA);return !!(en&&en[q]&&en[q][0]==='neg');};
function surveyGaps(rec,focus){
 if(!rec)return [];
 const out=[];
 PAIRS.forEach(([g,c,k])=>{
  if(focus&&focus!==k)return;
  const A=rec[g],B=rec[c];if(!A||!B)return;
  Object.keys(A).forEach(q=>{if(!isNum(A[q])||!isNum(B[q]))return;const d=Number(A[q])-Number(B[q]);const adverse=qNeg(q)?d:-d;if(adverse>0)out.push({q,g,c,a:+A[q],b:+B[q],adverse});});
 });
 return out.sort((p,q)=>q.adverse-p.adverse);
}
function deckState(){
 const scope=($('gtDeckScope')||{}).value||'',focus=($('gtDeckGroup')||{}).value||'';
 const inc=k=>{const c=$('gtDeck_'+k);return !c||c.checked;};
 return {scope,focus,inc};
}
function slidePlan(s){
 const org=!!s.scope;const p=[];
 p.push(tr('Title','Titre'));
 if(s.inc('rep'))p.push(org?tr('Representation compared with the organization’s workforce availability','Représentation comparée à la disponibilité de l’organisation'):tr('Representation compared with workforce availability','Représentation comparée à la disponibilité'));
 if(!org&&s.inc('cycle'))p.push(tr('Where differences appear across the employment cycle','Où se trouvent les écarts dans le cycle d’emploi'));
 if(s.inc('survey'))p.push(tr('Employee survey, 2024: largest differences between groups','Sondage auprès des employés, 2024 : plus grands écarts entre les groupes'));
 if(org&&s.inc('survey'))p.push(tr('Employee survey, 2024: this organization and the public service','Sondage auprès des employés, 2024 : cette organisation et la fonction publique'));
 if(org&&s.inc('change'))p.push(tr('Survey results that became less favourable, 2022 to 2024','Résultats du sondage devenus moins favorables, de 2022 à 2024'));
 if(!org&&s.inc('pay'))p.push(tr('Executives and pay','Cadres et rémunération'));
 if(s.inc('limits'))p.push(tr('What the data cannot show','Ce que les données ne peuvent pas montrer'));
 if(s.inc('questions'))p.push(tr('Questions to ask','Questions à poser'));
 p.push(tr('Sources','Sources'));
 return p;
}
function renderDeckCard(){
 const host=$('gcDeckCard');if(!host)return;
 const D=get(()=>DEPTS)||[];const keep=deckState();
 const names=D.map(d=>d[0]).sort((a,b)=>orgName(a).localeCompare(orgName(b),loc()));
 const box=(k,en,fr,orgOnly,psOnly)=>'<label class="gt-check'+(orgOnly?' gt-org-only':'')+(psOnly?' gt-ps-only':'')+'"><input type="checkbox" id="gtDeck_'+k+'" checked> '+tr(en,fr)+'</label>';
 host.innerHTML='<h3>'+tr('Build a PowerPoint presentation','Préparer une présentation PowerPoint')+'</h3>'+
  '<p class="howto">'+tr('Choose what the presentation covers. The slides use the published figures on this site. Each slide names its source in a footnote, and the speaker notes explain how to read it. You can edit every chart, table and sentence in PowerPoint. The file is built in your browser; nothing is sent anywhere.',
   'Choisissez ce que couvre la présentation. Les diapositives utilisent les chiffres publiés sur ce site. Chaque diapositive indique sa source dans une note, et les notes du présentateur expliquent comment la lire. Vous pouvez modifier chaque graphique, tableau et phrase dans PowerPoint. Le fichier est créé dans votre navigateur; rien n’est envoyé ailleurs.')+'</p>'+
  '<div class="controls"><div class="ctl"><label for="gtDeckScope">'+tr('The presentation covers','La présentation porte sur')+'</label><select id="gtDeckScope"><option value="">'+tr('The whole public service','L’ensemble de la fonction publique')+'</option>'+names.map(n=>'<option value="'+esc(n)+'">'+esc(orgName(n))+'</option>').join('')+'</select></div>'+
  '<div class="ctl"><label for="gtDeckGroup">'+tr('Focus','Groupe ciblé')+'</label><select id="gtDeckGroup">'+DECK_GROUPS.map(g=>'<option value="'+g[0]+'">'+(isFr()?g[2]:g[1])+'</option>').join('')+'</select></div></div>'+
  '<fieldset class="gt-deck-set"><legend>'+tr('Slides to include','Diapositives à inclure')+'</legend>'+
   box('rep','Representation','Représentation')+box('cycle','Employment cycle','Cycle d’emploi',false,true)+box('survey','Employee survey','Sondage auprès des employés')+
   box('change','Changes since 2022','Évolution depuis 2022',true)+box('pay','Executives and pay','Cadres et rémunération',false,true)+box('limits','What the data cannot show','Ce que les données ne peuvent pas montrer')+box('questions','Questions to ask','Questions à poser')+'</fieldset>'+
  '<p class="gt-plan" id="gtDeckPlan"></p>'+
  '<p><button type="button" class="eq-primary" id="gtDeckBuild">'+tr('Download the presentation (.pptx)','Télécharger la présentation (.pptx)')+'</button></p>'+
  '<p class="gt-status" id="gtDeckStatus" role="status"></p>';
 const sc=$('gtDeckScope'),gr=$('gtDeckGroup');
 if(keep.scope&&names.includes(keep.scope))sc.value=keep.scope;gr.value=keep.focus;
 const plan=()=>{const s=deckState();host.classList.toggle('gt-deck-org',!!s.scope);const p=slidePlan(s);$('gtDeckPlan').textContent=tr('Slides: ','Diapositives : ')+p.map((t,i)=>(i+1)+'. '+t).join(' · ');};
 host.querySelectorAll('select,input').forEach(e=>e.addEventListener('change',plan));plan();
 $('gtDeckBuild').addEventListener('click',()=>{
  const st=$('gtDeckStatus');st.textContent=tr('Preparing the presentation…','Préparation de la présentation…');
  loadLib().then(()=>buildDeck(deckState())).then(name=>{st.textContent=tr('The presentation is ready in your downloads: ','La présentation se trouve dans vos téléchargements : ')+name;})
   .catch(e=>{st.textContent=tr('The presentation could not be created. ','La présentation n’a pas pu être créée. ')+((e&&e.message)||'');});
 });
}
// colours: dark text, teal for results, gold for benchmarks, dark red for marked results (with a symbol as well)
const C_INK='1B2A41',C_TEAL='0E7C7B',C_GOLD='A88A2A',C_RED='9C0006',C_GREY='5B6B7F';
function buildDeck(s){
 const fr=isFr(),lang=fr?'fr-CA':'en-CA';
 const pptx=new window.PptxGenJS();pptx.layout='LAYOUT_WIDE';
 const D=get(()=>DEPTS)||[],W=get(()=>WFA)||{},C=get(()=>CPA)||{},E=get(()=>EX)||{},EEG=get(()=>EEG_DEPT)||{},PSD=get(()=>PSES_DEPT)||{},Y=get(()=>YOY)||{},DW=get(()=>DEPT_WFA_2025)||{},BD=get(()=>BLACK_DEPT)||{};
 const org=s.scope?D.find(d=>d[0]===s.scope):null;const orgN=org?orgName(org[0]):'';
 const focusL=s.focus?gLabel(s.focus):'';
 const today=new Date().toISOString().slice(0,10);
 const title=org?(fr?'Équité en matière d’emploi : '+orgN:'Employment equity: '+orgN):tr('Employment equity in the federal public service','L’équité en matière d’emploi dans la fonction publique fédérale');
 pptx.title=title;pptx.subject=tr('Published employment equity data','Données publiées sur l’équité en matière d’emploi');pptx.author='GC Equity / Équité-GC';
 const T={fontFace:'Arial',color:C_INK,lang};
 const srcTBS=tr('Source: Treasury Board of Canada Secretariat, diversity and inclusion statistics, March 31, 2025.','Source : Secrétariat du Conseil du Trésor du Canada, statistiques sur la diversité et l’inclusion, 31 mars 2025.');
 const srcPSES=tr('Source: 2024 Public Service Employee Survey, results by employment equity group.','Source : Sondage auprès des fonctionnaires fédéraux de 2024, résultats selon le groupe d’équité en matière d’emploi.');
 let n=0;
 function slide(head,source,notes){
  const sl=pptx.addSlide();n++;
  sl.background={color:'FFFFFF'};
  sl.addShape(pptx.ShapeType.rect,{x:0,y:0,w:13.333,h:0.12,fill:{color:C_TEAL},line:{color:C_TEAL}});
  if(head)sl.addText(head,Object.assign({},T,{x:0.6,y:0.35,w:12.1,h:0.9,fontSize:26,bold:true,valign:'top',fit:'shrink'}));
  if(source)sl.addText(source,Object.assign({},T,{x:0.6,y:6.85,w:11.2,h:0.45,fontSize:10,color:C_GREY,valign:'bottom'}));
  sl.addText(String(n),Object.assign({},T,{x:12.2,y:6.95,w:0.6,h:0.35,fontSize:10,color:C_GREY,align:'right'}));
  if(notes)sl.addNotes(notes);
  return sl;
 }
 const bullets=(sl,items,o)=>sl.addText(items.map(t=>({text:t,options:{bullet:{indent:18},breakLine:true}})),Object.assign({},T,{x:0.7,y:1.45,w:11.9,h:5.2,fontSize:18,valign:'top',paraSpaceAfter:8},o||{}));
 const P=(v)=>v==null||!isNum(v)?tr('Not published','Non publié'):dec(v,1)+(fr?NB+'%':'%');
 const PI=(v)=>v==null||!isNum(v)?tr('Not published','Non publié'):(Number.isInteger(Number(v))?dec(v,0):dec(v,1))+(fr?NB+'%':'%');
 const cap1=t=>t.charAt(0).toUpperCase()+t.slice(1);
 const cell=(t,o)=>({text:String(t),options:Object.assign({fontFace:'Arial',fontSize:13,color:C_INK,valign:'middle',margin:0.06},o||{})});
 const hcell=t=>cell(t,{bold:true,fill:{color:'E8EEF2'}});

 // 1. title
 const s1=slide(null,null,tr('This presentation uses published Government of Canada data gathered on the GC Equity site. Check each figure against the source named on the slide before you present it.','Cette présentation utilise des données publiées du gouvernement du Canada rassemblées sur le site Équité-GC. Vérifiez chaque chiffre auprès de la source nommée sur la diapositive avant de la présenter.'));
 s1.addText(title,Object.assign({},T,{x:0.8,y:2.0,w:11.7,h:1.5,fontSize:36,bold:true,fit:'shrink'}));
 s1.addText((focusL?focusL+' · ':'')+tr('Published data: workforce on March 31, 2025, and the 2024 employee survey','Données publiées : effectif au 31 mars 2025 et sondage de 2024 auprès des employés'),Object.assign({},T,{x:0.8,y:3.55,w:11.7,h:0.8,fontSize:18,color:C_GREY}));
 s1.addText(tr('Prepared on ','Préparé le ')+today+tr(' with GC Equity, an independent site that uses published Government of Canada data.',' avec Équité-GC, un site indépendant qui utilise des données publiées du gouvernement du Canada.'),Object.assign({},T,{x:0.8,y:5.9,w:11.7,h:0.6,fontSize:12,color:C_GREY}));

 // 2. representation
 if(s.inc('rep')){
  const keys=['w','i','d','v'];
  const repV=org?keys.map(k=>org[{w:2,i:3,d:4,v:5}[k]]):keys.map(k=>C[k]);
  const own=org?DW[org[0]]||{}:null;
  const benV=org?keys.map(k=>isNum(own[k])?own[k]:null):keys.map(k=>W[k]);
  const okIdx=keys.map((k,i)=>isNum(repV[i])&&isNum(benV[i]));
  const labels=keys.filter((k,i)=>okIdx[i]).map(gLabel);
  const head=org?tr('Representation compared with the organization’s workforce availability','Représentation comparée à la disponibilité de l’organisation'):tr('Representation compared with workforce availability','Représentation comparée à la disponibilité');
  const below=keys.map((k,i)=>okIdx[i]&&repV[i]<benV[i]?gLabel(k)+' ('+P(repV[i])+tr(' compared with ',' comparativement à ')+P(benV[i])+')':null).filter(Boolean);
  const sl=slide(head,srcTBS+(org?tr(' Workforce availability for this organization: departmental estimates, 2025.',' Disponibilité pour cette organisation : estimations ministérielles, 2025.'):''),
   tr('The bars show each group’s share of employees on March 31, 2025, next to workforce availability, the share of qualified people available in the labour market. Treasury Board describes availability as a starting point. Representation below availability shows where to look more closely; it does not show the cause.','Les barres montrent la part de chaque groupe dans l’effectif au 31 mars 2025, à côté de la disponibilité au sein de la population active, soit la part des personnes qualifiées disponibles sur le marché du travail. Le Conseil du Trésor décrit la disponibilité comme un point de départ. Une représentation inférieure à la disponibilité indique où regarder de plus près; elle n’en indique pas la cause.'));
  if(labels.length){
   sl.addChart(pptx.ChartType.bar,[{name:tr('Representation','Représentation'),labels,values:repV.filter((v,i)=>okIdx[i])},{name:tr('Workforce availability','Disponibilité'),labels,values:benV.filter((v,i)=>okIdx[i])}],
    {x:0.6,y:1.35,w:7.4,h:5.3,barDir:'bar',barGrouping:'clustered',chartColors:[C_TEAL,C_GOLD],showValue:true,dataLabelFormatCode:'0.0',dataLabelFontSize:11,catAxisLabelFontSize:12,valAxisLabelFontSize:10,valAxisMinVal:0,showLegend:true,legendPos:'b',legendFontSize:12,catAxisOrientation:'maxMin',
     altText:tr('Bar chart. ','Graphique à barres. ')+keys.filter((k,i)=>okIdx[i]).map((k)=>{const i=keys.indexOf(k);return gLabel(k)+': '+P(repV[i])+tr(', availability ',', disponibilité ')+P(benV[i]);}).join('; ')});
  }
  const side=[];
  side.push(below.length?tr('Below availability: ','Sous la disponibilité : ')+below.join('; ')+'.':tr('Every group with published figures is at or above availability.','Chaque groupe dont les chiffres sont publiés atteint ou dépasse la disponibilité.'));
  const blackRep=org?(BD[org[0]]?BD[org[0]][1]:null):C.black;
  if(isNum(blackRep))side.push(tr('Black employees: ','Employés noirs : ')+P(blackRep)+tr(' of employees. Treasury Board does not publish workforce availability for them.',' de l’effectif. Le Conseil du Trésor ne publie pas de disponibilité pour eux.'));
  if(org)side.push(tr('Public service: women ','Fonction publique : femmes ')+P(C.w)+tr(', Indigenous Peoples ',', Autochtones ')+P(C.i)+tr(', persons with disabilities ',', personnes en situation de handicap ')+P(C.d)+tr(', racialized employees ',', employés racisés ')+P(C.v)+'.');
  if(s.focus&&s.focus!=='black'){const i=keys.indexOf(s.focus);if(i>=0)side.unshift(focusL+(fr?NB+': ':': ')+P(repV[i])+tr(' of employees; availability ',' de l’effectif; disponibilité ')+P(benV[i])+'.');}
  sl.addText(side.map(t=>({text:t,options:{breakLine:true}})),Object.assign({},T,{x:8.3,y:1.5,w:4.5,h:5.1,fontSize:15,valign:'top',paraSpaceAfter:10}));
 }

 // 3. employment cycle (whole public service)
 if(!org&&s.inc('cycle')){
  const rows=cycle();const ks=G5.map(g=>g[0]);
  const show=s.focus?[s.focus]:ks;
  const head=[hcell(tr('Stage','Étape'))].concat(show.map(k=>hcell(gLabel(k))));
  const body=rows.map(r=>[cell(cap1(stageShort(r.st)),{fontSize:12})].concat(show.map(k=>{const c=r.cells[ks.indexOf(k)];if(c.r===null)return cell(c.a===null?tr('Not published','Non publié'):tr('No availability','Aucune disponibilité'),{fontSize:11,color:C_GREY,align:'center'});
   return cell(ratio(c.r)+(c.flag?(r.st.low?' ▼':' ▲'):''),{align:'center',bold:c.flag,color:c.flag?C_RED:C_INK,fill:c.flag?{color:'FBE9E7'}:undefined});})));
  const sl=slide(tr('Where differences appear across the employment cycle','Où se trouvent les écarts dans le cycle d’emploi'),
   tr('Source: Treasury Board of Canada Secretariat, Employment Equity Demographic Snapshot 2024-2025; workforce availability for March 31, 2025.','Source : Secrétariat du Conseil du Trésor du Canada, Aperçu démographique de l’équité en matière d’emploi 2024-2025; disponibilité au 31 mars 2025.'),
   tr('Each number compares a group’s share at one stage with a benchmark. 1.00 means the same rate as the benchmark; below 1.00, the group is less present at that stage. Hires and representation are compared with workforce availability; promotions, executives and separations with the group’s share of employees; pay with all employees. Marked: 0.85 or less, or for separations 1.15 or more. This is a screening rule. It is not a test of significance, and it does not show the cause of a difference.',
    'Chaque nombre compare la part d’un groupe à une étape avec un point de comparaison. 1,00 signifie le même taux; sous 1,00, le groupe est moins présent à cette étape. L’effectif et les embauches sont comparés à la disponibilité; les promotions, les cadres et les départs, à la part du groupe dans l’effectif; la rémunération, à l’ensemble des employés. Signalé : 0,85 ou moins, ou pour les départs 1,15 ou plus. Il s’agit d’une règle de repérage. Ce n’est pas un test de signification, et elle n’indique pas la cause d’un écart.'));
  sl.addTable([head].concat(body),{x:0.6,y:1.35,w:12.1,colW:[4.6].concat(show.map(()=>7.5/show.length)),border:{type:'solid',pt:0.75,color:'B7C2CC'},autoPage:false});
  sl.addText(tr('1.00 = same rate as the benchmark. ▼ marks 0.85 or less; ▲ marks separations at 1.15 or more.','1,00 = même taux que le point de comparaison. ▼ signale 0,85 ou moins; ▲ signale des départs de 1,15 ou plus.'),Object.assign({},T,{x:0.6,y:6.2,w:12.1,h:0.5,fontSize:12,color:C_GREY}));
 }

 // 4. survey: largest differences between groups
 if(s.inc('survey')){
  const rec=org?EEG[Object.keys(EEG).find(k=>k===org[0])]:EEG['Public Service'];
  const gaps=surveyGaps(rec,s.focus).slice(0,7);
  const sl=slide(tr('Employee survey, 2024: largest differences between groups','Sondage auprès des employés, 2024 : plus grands écarts entre les groupes'),srcPSES+(org?'':tr(' Whole public service.',' Ensemble de la fonction publique.')),
   tr('Each row compares a group with its comparison group on one question, in the less favourable direction for the group. Black employees are compared with non-racialized employees. Differences are in percentage points between published percentages; they are not tests of statistical significance. Small groups may have suppressed results.','Chaque ligne compare un groupe à son groupe de comparaison pour une question, dans le sens le moins favorable au groupe. Les employés noirs sont comparés aux employés non racisés. Les écarts sont exprimés en points de pourcentage entre des pourcentages publiés; il ne s’agit pas de tests de signification statistique. Les résultats des petits groupes peuvent être supprimés.'));
  if(gaps.length){
   const head=[hcell(tr('Question','Question')),hcell(tr('Group','Groupe')),hcell(tr('Result','Résultat')),hcell(tr('Comparison','Comparaison')),hcell(tr('Difference','Écart'))];
   const body=gaps.map(g=>[cell(g.q+' · '+qText(g.q),{fontSize:12}),cell(eegL(g.g),{fontSize:12}),cell(PI(g.a),{align:'center'}),cell(eegL(g.c)+(fr?NB+': ':': ')+PI(g.b),{fontSize:12}),cell(dec(g.adverse,0)+(g.adverse<2&&fr?' point':tr(' points',' points')),{align:'center',bold:g.adverse>=3,color:g.adverse>=3?C_RED:C_INK})]);
   sl.addTable([head].concat(body),{x:0.6,y:1.35,w:12.1,colW:[4.9,2.2,1.3,2.4,1.3],border:{type:'solid',pt:0.75,color:'B7C2CC'},autoPage:false});
  } else sl.addText(tr('No survey results by group are published for this choice.','Aucun résultat du sondage par groupe n’est publié pour ce choix.'),Object.assign({},T,{x:0.7,y:1.6,w:11.9,h:1,fontSize:18}));
  if(org){
   const o=PSD[Object.keys(PSD).find(k=>k===org[0])]||null,ps=PSD['Public Service']||{};
   const qs=['Q65','Q58','Q42','Q45','Q43','Q24','Q47','Q12'].filter(q=>o&&isNum(o[q])&&isNum(ps[q]));
   const sl2=slide(tr('Employee survey, 2024: this organization and the public service','Sondage auprès des employés, 2024 : cette organisation et la fonction publique'),srcPSES,
    tr('For harassment and discrimination, a higher percentage is less favourable. For the other questions, a lower percentage is less favourable.','Pour le harcèlement et la discrimination, un pourcentage plus élevé est moins favorable. Pour les autres questions, un pourcentage plus faible est moins favorable.'));
   if(qs.length){
    const head=[hcell(tr('Question','Question')),hcell(orgN),hcell(tr('Public service','Fonction publique')),hcell(tr('Difference','Écart'))];
    const body=qs.map(q=>{const d=o[q]-ps[q],adv=qNeg(q)?d>0:d<0;const big=adv&&Math.abs(d)>=3;return [cell(q+' · '+qText(q),{fontSize:12}),cell(PI(o[q]),{align:'center'}),cell(PI(ps[q]),{align:'center'}),cell(signed(d,0)+(adv?tr(' (less favourable)',' (moins favorable)'):''),{align:'center',bold:big,color:big?C_RED:C_INK})];});
    sl2.addTable([head].concat(body),{x:0.6,y:1.35,w:12.1,colW:[6.1,2,2,2],border:{type:'solid',pt:0.75,color:'B7C2CC'},autoPage:false});
   } else sl2.addText(tr('Results for this organization are not published.','Les résultats de cette organisation ne sont pas publiés.'),Object.assign({},T,{x:0.7,y:1.6,w:11.9,h:1,fontSize:18}));
  }
 }

 // 5. changes since 2022 (organization)
 if(org&&s.inc('change')){
  const yy=Y[Object.keys(Y).find(k=>k===org[0])]||null;
  const ch=yy?Object.keys(yy).filter(q=>yy[q]&&isNum(yy[q].a)&&isNum(yy[q].b)).map(q=>{const d=yy[q].b-yy[q].a;return {q,a:yy[q].a,b:yy[q].b,d,worse:qNeg(q)?d:-d};}).filter(r=>r.worse>0).sort((p,q)=>q.worse-p.worse).slice(0,6):[];
  const sl=slide(tr('Survey results that became less favourable, 2022 to 2024','Résultats du sondage devenus moins favorables, de 2022 à 2024'),tr('Source: 2022 and 2024 Public Service Employee Surveys, results for this organization.','Source : Sondages auprès des fonctionnaires fédéraux de 2022 et de 2024, résultats de cette organisation.'),
   tr('These are results for all respondents in the same organization in two survey cycles. Changes may reflect changes in who responded.','Ce sont les résultats de tous les répondants de la même organisation pour deux cycles. Les changements peuvent refléter des changements parmi les répondants.'));
  if(ch.length){
   const head=[hcell(tr('Question','Question')),hcell('2022'),hcell('2024'),hcell(tr('Change','Variation'))];
   sl.addTable([head].concat(ch.map(r=>[cell(r.q+' · '+qText(r.q),{fontSize:12}),cell(PI(r.a),{align:'center'}),cell(PI(r.b),{align:'center'}),cell(signed(r.d,0)+(Math.abs(r.d)<2&&fr?' point':tr(' points',' points')),{align:'center',bold:Math.abs(r.d)>=3,color:Math.abs(r.d)>=3?C_RED:C_INK})])),{x:0.6,y:1.35,w:12.1,colW:[7.1,1.6,1.6,1.8],border:{type:'solid',pt:0.75,color:'B7C2CC'},autoPage:false});
  } else sl.addText(tr('No result became less favourable, or the results are not published.','Aucun résultat n’est devenu moins favorable, ou les résultats ne sont pas publiés.'),Object.assign({},T,{x:0.7,y:1.6,w:11.9,h:1,fontSize:18}));
 }

 // 6. executives and pay (whole public service)
 if(!org&&s.inc('pay')){
  const H=hundredK();const ks=s.focus?[s.focus]:['w','i','d','v','black'];
  const labels=ks.map(gLabel);
  const sl=slide(tr('Executives and pay','Cadres et rémunération'),tr('Source: Treasury Board of Canada Secretariat, Employment Equity Demographic Snapshot 2024-2025, March 31, 2025.','Source : Secrétariat du Conseil du Trésor du Canada, Aperçu démographique de l’équité en matière d’emploi 2024-2025, 31 mars 2025.'),
   tr('Left: each group’s share of executives next to its share of all employees. Right: the share of each group earning $100,000 or more, next to all employees ('+P(H.all)+'). For women, that share is the sum of the three published salary bands of $100,000 and over.','À gauche : la part de chaque groupe parmi les cadres, à côté de sa part de l’effectif. À droite : la part de chaque groupe gagnant 100 000 $ ou plus, à côté de l’ensemble des employés ('+P(H.all)+'). Pour les femmes, cette part est la somme des trois tranches salariales publiées de 100 000 $ et plus.'));
  sl.addChart(pptx.ChartType.bar,[{name:tr('Share of executives','Part des cadres'),labels,values:ks.map(k=>E[k])},{name:tr('Share of employees','Part de l’effectif'),labels,values:ks.map(k=>C[k])}],
   {x:0.5,y:1.35,w:6.2,h:5.3,barDir:'bar',barGrouping:'clustered',chartColors:[C_TEAL,C_GOLD],showValue:true,dataLabelFormatCode:'0.0',dataLabelFontSize:10,catAxisLabelFontSize:11,valAxisLabelFontSize:9,valAxisMinVal:0,showLegend:true,legendPos:'b',legendFontSize:11,catAxisOrientation:'maxMin',
    altText:tr('Bar chart. Share of executives and share of employees. ','Graphique à barres. Part des cadres et part de l’effectif. ')+ks.map(k=>gLabel(k)+': '+P(E[k])+', '+P(C[k])).join('; ')});
  sl.addChart(pptx.ChartType.bar,[{name:tr('Earning $100,000 or more','Gagnant 100 000 $ ou plus'),labels:[tr('All employees','Ensemble des employés')].concat(labels),values:[H.all].concat(ks.map(k=>H[k]))}],
   {x:6.9,y:1.35,w:6.0,h:5.3,barDir:'bar',chartColors:[C_TEAL],showValue:true,dataLabelFormatCode:'0.0',dataLabelFontSize:10,catAxisLabelFontSize:11,valAxisLabelFontSize:9,valAxisMinVal:0,showLegend:true,legendPos:'b',legendFontSize:11,catAxisOrientation:'maxMin',
    altText:tr('Bar chart. Share earning $100,000 or more; all employees ','Graphique à barres. Part gagnant 100 000 $ ou plus; ensemble des employés ')+P(H.all)+'. '+ks.map(k=>gLabel(k)+': '+P(H[k])).join('; ')});
 }

 // 7. limits
 if(s.inc('limits')){
  const sl=slide(tr('What the data cannot show','Ce que les données ne peuvent pas montrer'),null,tr('Say these limits out loud when you present the data.','Mentionnez ces limites lorsque vous présentez les données.'));
  bullets(sl,[tr('The cause of a difference. The data show where to look more closely; they are not a finding of discrimination.','La cause d’un écart. Les données indiquent où regarder de plus près; elles ne constituent pas une conclusion de discrimination.'),
   tr('Results by branch, region, level or staffing process, unless the organization provides them.','Les résultats par direction, région, niveau ou processus de dotation, à moins que l’organisation ne les fournisse.'),
   tr('Values suppressed to protect privacy. A suppressed value is not zero.','Les valeurs supprimées pour protéger la vie privée. Une valeur supprimée n’est pas un zéro.'),
   tr('People who did not self-identify. Representation counts only employees who self-identified.','Les personnes qui ne se sont pas auto-identifiées. La représentation ne compte que les employés qui se sont auto-identifiés.'),
   tr('Acting appointments, applicants and assessment results by group, which are not in these tables.','Les nominations intérimaires, les candidatures et les résultats d’évaluation par groupe, qui ne figurent pas dans ces tableaux.')]);
 }
 // 8. questions
 if(s.inc('questions')){
  const sl=slide(tr('Questions to ask','Questions à poser'),null,tr('These questions follow the duty in section 5 of the Employment Equity Act to identify and remove barriers.','Ces questions découlent de l’obligation prévue à l’article 5 de la Loi sur l’équité en matière d’emploi de cerner et d’éliminer les obstacles.'));
  bullets(sl,[tr('What analysis explains these results?','Quelle analyse explique ces résultats?'),
   tr('What data exist by group, subgroup, branch, level, region and year, including acting appointments and promotions?','Quelles données existent par groupe, sous-groupe, direction, niveau, région et année, y compris les nominations intérimaires et les promotions?'),
   tr('What has been done to remove the barriers, and how is progress measured?','Qu’a-t-on fait pour éliminer les obstacles, et comment mesure-t-on les progrès?'),
   tr('Who is accountable for results, and what will be reported back, and when?','Qui est responsable des résultats, et que communiquera-t-on, et quand?')]);
 }
 // 9. sources
 const src=slide(tr('Sources','Sources'),null,tr('Links to the published sources used in this presentation.','Liens vers les sources publiées utilisées dans cette présentation.'));
 const links=[[tr('Treasury Board of Canada Secretariat: diversity and inclusion statistics','Secrétariat du Conseil du Trésor du Canada : statistiques sur la diversité et l’inclusion'),fr?SITE_TBS.fr:SITE_TBS.en],
  [tr('2024 Public Service Employee Survey results','Résultats du Sondage auprès des fonctionnaires fédéraux de 2024'),fr?'https://www.canada.ca/fr/secretariat-conseil-tresor/services/innovation/sondage-fonctionnaires-federaux.html':'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/public-service-employee-survey.html'],
  [tr('Employment Equity Act','Loi sur l’équité en matière d’emploi'),fr?'https://laws-lois.justice.gc.ca/fra/lois/e-5.401/':'https://laws-lois.justice.gc.ca/eng/acts/e-5.401/'],
  [tr('GC Equity, the site used to prepare this presentation','Équité-GC, le site utilisé pour préparer cette présentation'),location.href.split('#')[0].split('?')[0].replace(/explorer\.html$/,'')]];
 src.addText(links.map(([t,u])=>({text:t,options:{hyperlink:{url:u},breakLine:true,bullet:{indent:18}}})),Object.assign({},T,{x:0.7,y:1.45,w:11.9,h:4.8,fontSize:18,valign:'top',paraSpaceAfter:10}));
 const name=fileSlug(org?org[0]:tr('public-service','fonction-publique')).slice(0,50)+'-'+tr('equity-data','donnees-equite')+'-'+today+'.pptx';
 return pptx.writeFile({fileName:name}).then(()=>name);
}

/* ------------------------------------------------------------------ styles */
const css=document.createElement('style');
css.textContent=[
 '.gt-sr{display:inline-block;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;vertical-align:top}',
 '.gt-table tbody th[scope=row]{text-align:left;text-transform:none;letter-spacing:normal;font:600 14px/1.4 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink)}',
 '#gtCycleTable tbody th[scope=row]{min-width:220px;max-width:300px}',
 '#gtCycleTable td{vertical-align:top;text-align:center;min-width:92px}',
 '#gtCycleTable .gt-r{display:block;font:700 17px/1.2 var(--mono,monospace)}',
 '#gtCycleTable .gt-in,#gtCycleTable .gt-na{display:block;font-size:12px;color:var(--ink-soft);margin-top:2px;white-space:nowrap}',
 '#gtCycleTable .gt-na{white-space:normal}',
 '#gtCycleTable td.gt-flag{background:rgba(163,0,0,.08)}',
 '#gtCycleTable td.gt-flag .gt-r,#gtCycleTable td.gt-flag .gt-mark{color:var(--rust,#a30000)}',
 '#gtCycleTable .gt-mark{font-size:13px;font-weight:700}',
 '.gt-stage{display:block}',
 '.gt-how{display:block;font-weight:400;font-size:12.5px;color:var(--ink-soft);margin-top:2px}',
 'html:not([data-theme]) .gt-how a,html[data-theme="light"] .gt-how a{color:#0A6463}',
 '.gt-marked{margin:4px 0 10px;padding-left:20px;line-height:1.55}',
 '.gt-gname{font-weight:600}',
 '.gt-table tr.gt-bench th,.gt-table tr.gt-bench td{font-style:italic;color:var(--ink-soft)}',
 '.gt-tall{max-height:560px;overflow-y:auto}',
 '.gt-link-wrap{display:inline-block;margin:4px 0 10px}',
 '.gt-link-btn{font:inherit;font-size:13.5px;padding:6px 12px;border:1.5px solid var(--line,#c9d1d9);border-radius:7px;background:transparent;color:inherit;cursor:pointer}',
 '.gt-link-btn:focus-visible{outline:3px solid var(--focus,#1a5fb4);outline-offset:2px}',
 '.gt-deck-set{border:1px solid var(--line,#c9d1d9);border-radius:8px;padding:8px 12px 10px;margin:10px 0}',
 '.gt-deck-set legend{font-weight:600;padding:0 4px}',
 '.gt-check{display:inline-block;margin:4px 18px 4px 0;white-space:nowrap}',
 '#gcDeckCard:not(.gt-deck-org) .gt-org-only,#gcDeckCard.gt-deck-org .gt-ps-only{display:none}',
 '.gt-status{margin:6px 0 0;font-size:13.5px}',
 '.gt-plan{font-size:13.5px;line-height:1.5;color:var(--ink-soft);margin:4px 0 12px}',
 '@media (max-width:640px){#gtCycleTable td{min-width:84px}.gt-check{white-space:normal}}'
].join('\n');
document.head.appendChild(css);

/* ------------------------------------------------------------------ start */
function renderAll(){
 try{renderCycle();}catch(e){}
 try{renderAllDeptSummary();}catch(e){}
 try{renderDeckCard();}catch(e){}
 ['gcRepTable','gcExCard','gcSalCountsCard','gcSubOrgCard'].forEach(id=>{const el=$(id);if(el&&el.dataset.gtSeen)lazy[id]();});
 try{groupLink();}catch(e){}
 const b=$('gtOrgLink');if(b)b.textContent=tr('Copy a link to this organization','Copier un lien vers cette organisation');
 const g=$('gtGroupLink');if(g)g.textContent=tr('Copy a link to this group','Copier un lien vers ce groupe');
}
const lazy={gcRepTable:renderRepTable,gcExCard:renderEx,gcSalCountsCard:renderSalCounts,gcSubOrgCard:renderSubOrg};
function watch(){
 const io=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const id=e.target.id;if(!e.target.dataset.gtSeen){e.target.dataset.gtSeen='1';lazy[id]();}io.unobserve(e.target);}}),{rootMargin:'900px 0px'}):null;
 Object.keys(lazy).forEach(id=>{const el=$(id);if(!el)return;if(io)io.observe(el);else{el.dataset.gtSeen='1';lazy[id]();}});
 // details elements: render when opened, if not yet seen
 document.querySelectorAll('details').forEach(d=>d.addEventListener('toggle',()=>{Object.keys(lazy).forEach(id=>{const el=$(id);if(el&&d.contains(el)&&!el.dataset.gtSeen){el.dataset.gtSeen='1';lazy[id]();}});}));
 // The tables are small: draw the rest once the page is idle, so they are ready for search, printing and copying.
 const rest=()=>Object.keys(lazy).forEach(id=>{const el=$(id);if(el&&!el.dataset.gtSeen){el.dataset.gtSeen='1';lazy[id]();}});
 setTimeout(()=>{if(window.requestIdleCallback)window.requestIdleCallback(rest,{timeout:4000});else rest();},2500);
}
function start(){
 renderAll();watch();
 wordButton('briefWord','briefText',()=>tr('briefing-note-','note-information-')+fileSlug((($('briefDept')||$('briefOrg')||{}).value)||''));
 wordButton('rqWord','rqText',()=>tr('data-request-','demande-donnees-')+fileSlug((($('rqOrg')||{}).value)||''));
 const card=$('opCard');if(card&&typeof MutationObserver!=='undefined'){new MutationObserver(()=>{try{orgLink();}catch(e){}}).observe(card,{childList:true});orgLink();}
 const gs=$('gcGroup');if(gs)gs.addEventListener('change',()=>setTimeout(groupLink,0));
 const op=$('opOrg');if(op)op.addEventListener('change',()=>setTimeout(()=>{const a=$('cmpA'),b=$('cmpB');if(a&&b&&a.value===b.value&&a.value!=='-1'){b.value='-1';b.dispatchEvent(new Event('change'));}},400));
 setTimeout(groupLink,600);
 document.addEventListener('langchange',()=>setTimeout(renderAll,0));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();

/* shared with the group page (gc-equity-additions.js) */
window.GCTOOLS={cycle,G5,gLabel,stageShort,ratio,pc,surveyGaps,eegL,qText,qNeg,hundredK,LOW,HIGH,markedList};
})();
