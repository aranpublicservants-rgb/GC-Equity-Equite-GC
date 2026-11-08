/* Hiring and staffing data from the Public Service Commission.
 * Reads data/psc/psc-equity.json and data/psc/catalogue.json, built by scripts/build-psc-data.py from the Commission's
 * CSV files in data/psc/. Values are shown as published, rounded to one decimal place. A value the file does not contain
 * is shown as not published, and a count the Commission suppressed is shown as suppressed; neither is shown as zero. */
(function(){
'use strict';
const NB=' ';
const $=id=>document.getElementById(id);
const fr=()=>document.documentElement.lang.toLowerCase().startsWith('fr');
const tr=(en,f)=>fr()?f:en;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const LOW=0.85;   // screening rule used across this site: a ratio of 0.85 or less is marked
const ORDER=['v','i','d','w'];
const SPECIAL=['Public Service - Total','Public Service - Average','Large - Average','Medium - Average','Small - Average','Micro - Average'];
const SPECIAL_LABEL={
 'Public Service - Total':['Public service, total','Fonction publique, total'],
 'Public Service - Average':['Public service, average','Fonction publique, moyenne'],
 'Large - Average':['Large organizations (over 2,000 employees), average','Grandes organisations (plus de 2'+NB+'000 employés), moyenne'],
 'Medium - Average':['Medium organizations (500 to 2,000 employees), average','Organisations moyennes (de 500 à 2'+NB+'000 employés), moyenne'],
 'Small - Average':['Small organizations (100 to 500 employees), average','Petites organisations (de 100 à 500 employés), moyenne'],
 'Micro - Average':['Micro organizations (under 100 employees), average','Micro-organisations (moins de 100 employés), moyenne'],
};
const TEXT={
 eyebrow:['Public Service Commission of Canada · Open data','Commission de la fonction publique du Canada · Données ouvertes'],
 title:['Hiring and staffing data from the Public Service Commission','Données sur l’embauche et la dotation de la Commission de la fonction publique'],
 lede:['The Public Service Commission publishes data on applications, appointments and staffing in organizations subject to the Public Service Employment Act. This page shows the tables that report on employment equity groups, and lists every Commission data file on this site with a link to its official source.',
  'La Commission de la fonction publique publie des données sur les candidatures, les nominations et la dotation dans les organisations assujetties à la Loi sur l’emploi dans la fonction publique. Cette page présente les tableaux qui portent sur les groupes visés par l’équité en matière d’emploi et énumère chaque fichier de données de la Commission offert sur ce site, avec un lien vers sa source officielle.'],
 jumpFunnel:['Applicants and appointments','Postulants et nominations'], jumpDetail:['By sex and region','Selon le sexe et la région'],
 jumpStudents:['Students','Étudiants'], jumpOrg:['By organization','Par organisation'], jumpFiles:['All data files','Tous les fichiers de données'], jumpMethod:['How to read these tables','Comment lire ces tableaux'],
 loading:['Loading the Commission’s data…','Chargement des données de la Commission…'],
 funnelTitle:['Applicants and appointments by employment equity group','Postulants et nominations selon le groupe visé par l’équité en matière d’emploi'],
 funnelIntro:['For each fiscal year, the group’s share of applicants to advertised processes, beside its share of appointments to the public service (indeterminate positions and terms of three months or more). A ratio below 1.00 means the group made up a smaller share of appointments than of applicants.',
  'Pour chaque exercice, la part du groupe parmi les postulants aux processus annoncés, à côté de sa part des nominations à la fonction publique (postes pour une période indéterminée et postes pour une période déterminée de trois mois ou plus). Un ratio inférieur à 1,00 signifie que le groupe représentait une plus petite part des nominations que des postulants.'],
 groupLabel:['Employment equity group','Groupe visé par l’équité en matière d’emploi'],
 detailTitle:['Appointments by group, sex and region','Nominations selon le groupe, le sexe et la région'],
 detailIntro:['How each group’s appointments to the public service were divided between women and men, and each group’s share of appointments in each region.','La répartition entre les femmes et les hommes des nominations à la fonction publique de chaque groupe, et la part de chaque groupe dans les nominations de chaque région.'],
 sgroupLabel:['Group','Groupe'], yearLabel:['Fiscal year','Exercice'],
 regionNote:['Regions with few appointments can show large changes from one year to the next.','Dans les régions où il y a peu de nominations, les pourcentages peuvent beaucoup varier d’une année à l’autre.'],
 studentsTitle:['Students: applicants and hires','Étudiants'+NB+': postulants et embauches'],
 studentsIntro:['Each group’s share of students who applied to advertised processes, and of students hired.','La part de chaque groupe parmi les étudiants qui ont postulé à des processus annoncés et parmi les étudiants embauchés.'],
 orgTitle:['Appointments by organization and employment equity self-identification','Nominations selon l’organisation et l’auto-identification aux fins de l’équité en matière d’emploi'],
 orgIntro:['From the Commission’s staffing dashboard: appointments in each organization, divided by whether the person self-identified as a member of an employment equity group in the Treasury Board employment equity data bank. The file does not say which groups are included.',
  'Tiré du tableau de bord de la dotation de la Commission'+NB+': les nominations dans chaque organisation, selon que la personne s’est auto-identifiée ou non comme membre d’un groupe visé par l’équité en matière d’emploi dans la banque de données sur l’équité en matière d’emploi du Conseil du Trésor. Le fichier n’indique pas quels groupes sont compris.'],
 orgLabel:['Organization','Organisation'],
 filesTitle:['All Public Service Commission data files on this site','Tous les fichiers de données de la Commission de la fonction publique sur ce site'],
 filesIntro:['Each file is a copy of the Commission’s published file. Each copy was checked against the SHA-256 checksum recorded in the site’s source inventory. The Staffing and Non-Partisanship Survey files are too large to copy here, so they are linked to their official source. The 2025 survey results used on this site are summarized in a separate file.',
  'Chaque fichier est une copie du fichier publié par la Commission. Chaque copie a été vérifiée à l’aide de la somme de contrôle SHA-256 inscrite dans l’inventaire des sources du site. Les fichiers du Sondage sur la dotation et l’impartialité politique sont trop volumineux pour être copiés ici; ils sont donc liés à leur source officielle. Les résultats du sondage de 2025 utilisés sur ce site sont résumés dans un fichier distinct.'],
 filterLabel:['Find a file','Trouver un fichier'],
 methodTitle:['How to read these tables','Comment lire ces tableaux'],
 download:['Download this table (CSV)','Télécharger ce tableau (CSV)'],
};
let D,C,state={group:'v',sgroup:'v',year:null,stgroup:'v',org:'Public Service - Total',q:''};

function num(v,d=1){return Number(v).toLocaleString(fr()?'fr-CA':'en-CA',{minimumFractionDigits:d,maximumFractionDigits:d});}
function pct(v){return has(v)?num(v,1)+(fr()?NB+'%':'%'):'';}
function ratio(v){return has(v)?num(v,2):'';}
function na(){return '<span class="cta-na">'+esc(tr('Not published','Non publié'))+'</span>';}
function supp(){return '<span class="cta-na">'+esc(tr('Suppressed','Supprimé'))+'</span>';}
function mark(){return ' <span class="cta-mark" aria-hidden="true">▼</span><span class="gcw-sr">'+esc(tr(' marked',' signalé'))+'</span>';}
function fy(y){return fr()?y:String(y).replace(/^(\d{4})-\d{2}(\d{2})$/,'$1-$2');}
function longDate(iso){return new Date(iso+'T12:00:00Z').toLocaleDateString(fr()?'fr-CA':'en-CA',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});}
const MONTHS={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function period(v){
 if(/^\d{4}-\d{4}$/.test(v))return fy(v);
 if(/^\d{4}-\d{2}-\d{2}$/.test(v))return longDate(v);
 const m=/^([A-Z][a-z]{2})-(\d{2})$/.exec(v);
 if(m&&m[1] in MONTHS)return new Date(Date.UTC(2000+Number(m[2]),MONTHS[m[1]],15)).toLocaleDateString(fr()?'fr-CA':'en-CA',{year:'numeric',month:'long',timeZone:'UTC'});
 return v;
}
function range(a,b){return a===b?period(a):period(a)+' '+tr('to','à')+' '+period(b);}
function local(p){const u=new URL(p,location.href);if(fr())u.searchParams.set('lang','fr');else u.searchParams.delete('lang');return u.pathname.split('/').pop()+u.search+u.hash;}
// Official French titles are copied as published; on screen, a space before a colon or percent sign does not break.
function typo(t){return fr()?String(t||'').replace(/ ([:%])/g,NB+'$1'):String(t||'');}
function link(u,label){return '<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';}
const gName=k=>{const g=D.groups[k];return fr()?g[1]:g[0];};
function years(...tables){return [...new Set(tables.flatMap(t=>Object.keys(t)))].sort();}
function lastBoth(a,b){return years(a,b).filter(y=>a[y]&&b[y]).pop();}

function table(id,caption,head,rows,opts){
 opts=opts||{};
 const n=i=>i>0&&!opts.text;
 return '<div class="cta-scroll table-scroll" tabindex="0" role="region" aria-labelledby="'+id+'-cap"><table id="'+id+'" data-gcw-ready="yes"'+(opts.cls?' class="'+opts.cls+'"':'')+'><caption id="'+id+'-cap">'+esc(caption)+'</caption><thead><tr>'+
  head.map((h,i)=>'<th scope="col"'+(n(i)?' class="num"':'')+'>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+
  rows.map(r=>'<tr>'+r.map((c,i)=>i===0?'<th scope="row">'+c+'</th>':'<td'+(n(i)?' class="num"':'')+'>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function csvOf(id){
 const t=$(id);if(!t)return '';
 const q=s=>{s=String(s||'').replace(/\s+/g,' ').replace(/ ?▼ (marked|signalé)$/,'').trim();return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 const lines=[q(t.caption?t.caption.textContent:'')];
 [...t.rows].forEach(r=>lines.push([...r.cells].map(c=>q(c.textContent)).join(',')));
 lines.push(q(tr('Source: Public Service Commission of Canada, open data, retrieved ','Source'+NB+': Commission de la fonction publique du Canada, données ouvertes, téléchargées le ')+longDate(D.retrieved)+'.'));
 return lines.join('\r\n');
}
function download(id,name){
 const blob=new Blob(['﻿'+csvOf(id)],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
function options(sel,list,value){sel.innerHTML=list.map(([v,l])=>'<option value="'+esc(v)+'"'+(v===value?' selected':'')+'>'+esc(l)+'</option>').join('');}
function shareRow(label,a,b){
 const r=has(a)&&has(b)&&a>0?b/a:null;
 return [esc(label),has(a)?esc(pct(a)):na(),has(b)?esc(pct(b)):na(),r===null?'':esc(ratio(r))+(r<=LOW?mark():'')];
}

function renderFunnel(){
 const A=D.applicants,P=D.appointments,g=state.group;
 const y=lastBoth(A,P);
 $('st-latest').innerHTML=table('st-latest-t',tr('Share of applicants and of appointments by group, ','Part des postulants et des nominations selon le groupe, ')+fy(y),
  [tr('Group','Groupe'),tr('Applicants to advertised processes','Postulants aux processus annoncés'),tr('Appointments to the public service','Nominations à la fonction publique'),tr('Appointments ÷ applicants','Nominations ÷ postulants')],
  ORDER.map(k=>shareRow(gName(k),(A[y]||{})[k],(P[y]||{})[k])));
 $('st-funnel').innerHTML=table('st-funnel-t',tr('Share of applicants and of appointments by fiscal year: ','Part des postulants et des nominations selon l’exercice'+NB+': ')+gName(g),
  [tr('Fiscal year','Exercice'),tr('Applicants to advertised processes','Postulants aux processus annoncés'),tr('Appointments to the public service','Nominations à la fonction publique'),tr('Appointments ÷ applicants','Nominations ÷ postulants')],
  years(A,P).map(yy=>shareRow(fy(yy),(A[yy]||{})[g],(P[yy]||{})[g])));
 const first=years(A).find(yy=>has(A[yy].w));
 $('st-funnel-note').textContent=tr('The applicant files have no figures for women before '+fy(first)+'. ▼ marks a ratio of 0.85 or less.','Les fichiers sur les postulants ne contiennent pas de données sur les femmes avant '+fy(first)+'. ▼ signale un ratio de 0,85 ou moins.');
}
function renderDetail(){
 const g=state.sgroup;
 $('st-sex').innerHTML=table('st-sex-t',tr('How appointments of this group were divided between women and men: ','Répartition des nominations de ce groupe entre les femmes et les hommes'+NB+': ')+gName(g),
  [tr('Fiscal year','Exercice'),tr('Women','Femmes'),tr('Men','Hommes')],
  years(D.by_sex).map(y=>{const v=(D.by_sex[y]||{})[g]||{};return [esc(fy(y)),has(v.women)?esc(pct(v.women)):na(),has(v.men)?esc(pct(v.men)):na()];}));
 const y=state.year,last=['Outside Canada','Unknown'];
 const name=r=>fr()?D.regions[r]:r;
 const regs=Object.keys(D.regions).sort((a,b)=>(last.indexOf(a)-last.indexOf(b))||name(a).localeCompare(name(b),fr()?'fr':'en'));
 $('st-region').innerHTML=table('st-region-t',tr('Each group’s share of appointments to the public service, by region, ','Part de chaque groupe dans les nominations à la fonction publique, selon la région, ')+fy(y),
  [tr('Region','Région')].concat(ORDER.map(gName)),
  regs.map(r=>{const v=(D.by_region[y]||{})[r]||{};return [esc(name(r))].concat(ORDER.map(k=>has(v[k])?esc(pct(v[k])):na()));}));
}
function renderStudents(){
 const S=D.students,g=state.stgroup;
 $('st-students').innerHTML=table('st-students-t',tr('Share of student applicants and of student hires by fiscal year: ','Part des étudiants postulants et des étudiants embauchés selon l’exercice'+NB+': ')+gName(g),
  [tr('Fiscal year','Exercice'),tr('Student applicants','Étudiants postulants'),tr('Students hired','Étudiants embauchés'),tr('Hires ÷ applicants','Embauches ÷ postulants')],
  years(S.applicants,S.hires).map(y=>shareRow(fy(y),(S.applicants[y]||{})[g],(S.hires[y]||{})[g])));
}
function orgLabel(n){const s=SPECIAL_LABEL[n];if(s)return tr(s[0],s[1]);const o=D.hiring[n];return fr()&&o&&o.fr?o.fr:n;}
function renderOrg(){
 const o=D.hiring[state.org];if(!o)return;
 const tot=D.hiring['Public Service - Total'],avg=/ - Average$/.test(state.org);
 const count=v=>v==='x'?supp():has(v)?esc(num(v,0)):na();
 const share=c=>c&&has(c[0])&&has(c[1])&&(c[0]+c[1])>0?100*c[0]/(c[0]+c[1]):null;
 const rows=Object.keys(o.years).sort().map(y=>{const c=o.years[y],s=avg?null:share(c),t=share((tot.years||{})[y]);
  return [esc(fy(y)),count(c[0]),count(c[1]),s===null?'':esc(pct(s)),t===null?'':esc(pct(t))];});
 $('st-org-table').innerHTML=table('st-org-t',tr('Appointments by employment equity self-identification: ','Nominations selon l’auto-identification aux fins de l’équité en matière d’emploi'+NB+': ')+orgLabel(state.org),
  [tr('Fiscal year','Exercice'),tr('Self-identified as a member of an employment equity group','Auto-identifiés comme membres d’un groupe visé'),tr('Did not self-identify','Non auto-identifiés'),tr('Share who self-identified','Part des personnes auto-identifiées'),tr('Share for the public service','Part pour la fonction publique')],rows);
 $('st-org-note').textContent=avg?tr('The Commission publishes averages as whole numbers, so no share is calculated for an average.','La Commission publie les moyennes en nombres entiers; aucune part n’est donc calculée pour une moyenne.'):
  tr('Suppressed: the Commission did not publish the count, to protect confidentiality. A suppressed count is not zero.','Supprimé'+NB+': la Commission n’a pas publié le nombre, pour protéger la confidentialité. Un nombre supprimé n’est pas un zéro.');
}
function size(b){return b>=1048576?num(b/1048576,1)+NB+tr('MB','Mo'):num(Math.max(1,Math.round(b/1024)),0)+NB+tr('KB','Ko');}
function renderFiles(){
 const q=state.q.trim().toLowerCase();
 const match=f=>!q||[f.file,f.en,f.fr].some(s=>String(s||'').toLowerCase().includes(q));
 const ds=id=>{const d=id&&C.datasets[id];return d?typo(fr()?d.fr:d.en):tr('Public Service Commission annual report tables','Tableaux du rapport annuel de la Commission de la fonction publique');};
 const files=C.files.filter(match).sort((a,b)=>(b.equity-a.equity)||a.file.localeCompare(b.file));
 $('st-files').innerHTML=table('st-files-t',tr('Commission data files copied to this site','Fichiers de données de la Commission copiés sur ce site'),
  [tr('File','Fichier'),tr('Contents','Contenu'),tr('Period','Période'),tr('Rows','Lignes'),tr('Size','Taille'),tr('Links','Liens')],
  files.map(f=>['<code>'+esc(f.file)+'</code>',esc(typo(fr()?f.fr:f.en))+(f.equity?' <span class="cta-pill">'+esc(tr('Employment equity','Équité en matière d’emploi'))+'</span>':'')+'<br><span class="cta-small">'+esc(ds(f.dataset))+'</span>',
   f.years?esc(range(f.years[0],f.years[1])):'',esc(num(f.rows,0)),esc(size(f.bytes)),
   '<a href="'+esc(f.path)+'" download aria-label="'+esc(tr('Download ','Télécharger ')+f.file)+'">'+esc(tr('Download','Télécharger'))+'</a><br>'+
   '<a href="'+esc(f.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(tr('Official source for ','Source officielle de ')+f.file)+'">'+esc(tr('Official source','Source officielle'))+'</a>']),{text:true,cls:'st-files'});
 const snps=C.snps.filter(match);
 $('st-snps').innerHTML=table('st-snps-t',tr('Staffing and Non-Partisanship Survey files, linked to their official source','Fichiers du Sondage sur la dotation et l’impartialité politique, liés à leur source officielle'),
  [tr('File','Fichier'),tr('Contents','Contenu'),tr('Survey','Sondage'),tr('Size','Taille'),tr('Link','Lien')],
  snps.map(s=>['<code>'+esc(s.file)+'</code>',esc(typo(fr()?s.fr:s.en)),esc(s.year),esc(size(s.bytes)),
   '<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(tr('Official source for ','Source officielle de ')+s.file+' ('+s.year+')')+'">'+esc(tr('Official source','Source officielle'))+'</a>']),{text:true,cls:'st-files'});
 $('st-files-count').textContent=tr(files.length+' of '+C.files.length+' copied files and '+snps.length+' of '+C.snps.length+' survey files shown.',
  files.length+' fichiers copiés sur '+C.files.length+' et '+snps.length+' fichiers du sondage sur '+C.snps.length+' affichés.');
}
function methodHTML(){
 const items=fr()?[
  'Les pourcentages de postulants proviennent de l’auto-déclaration des personnes qui postulent, au moyen du Système de ressourcement de la fonction publique, à des processus externes annoncés pour des postes pour une période indéterminée ou déterminée de trois mois ou plus. Pour les Autochtones, les personnes en situation de handicap et les membres des minorités visibles, les pourcentages de nominations proviennent de l’auto-identification des employés dans la banque de données sur l’équité en matière d’emploi du Conseil du Trésor, jumelée aux dossiers d’embauche et de dotation de la Commission. Les chiffres sur les femmes proviennent du fichier des titulaires du Conseil du Trésor. Les postulants et les nominations sont donc mesurés différemment. L’écart entre eux indique où regarder de plus près; ce n’est pas un taux exact de perte de candidats.',
  'Les nominations comprennent les processus annoncés et non annoncés, pour des postes pour une période indéterminée et des postes pour une période déterminée de trois mois ou plus. Les nominations dans les organismes distincts ne sont pas comprises.',
  'La Commission a modifié sa méthode de déclaration en 2017-2018. Comparez les années avant et après ce changement avec prudence. Les données sur les femmes parmi les postulants ne peuvent pas être présentées avant 2016-2017, en raison d’un changement dans la saisie des données.',
  '▼ signale un ratio de 0,85 ou moins, la règle de repérage utilisée sur tout le site. Ce n’est pas un test de signification statistique, et cela n’établit pas de discrimination ni de cause.',
  'Les pourcentages sont arrondis à une décimale; les ratios sont calculés à partir des valeurs publiées non arrondies. Une valeur non publiée n’est jamais remplacée par zéro.',
  'Le tableau de bord de la dotation ne contient pas d’information sur l’équité en matière d’emploi pour les organismes distincts. Il supprime les catégories comportant de petits nombres pour des raisons de confidentialité, et les micro-organisations pour des raisons de qualité des données. Ses chiffres ne devraient pas correspondre aux données sur les ressources humaines d’une organisation.',
  'Dans son audit de 2021 sur la représentation en matière d’équité en emploi dans le recrutement, la Commission a suivi les mêmes candidatures à chaque étape, dans des processus clos en 2016-2017. La part des candidats noirs est passée de 10,3'+NB+'% des candidatures à 6,6'+NB+'% des nominations. Les résultats de l’audit par étape figurent dans l’explorateur de données.'
 ]:[
  'Applicant percentages come from the self-declaration of people who apply through the Public Service Resourcing System to external advertised processes for indeterminate positions or terms of three months or more. For Indigenous peoples, persons with disabilities and members of visible minorities, appointment percentages come from employees’ self-identification in the Treasury Board employment equity data bank, matched to the Commission’s hiring and staffing files. Figures for women come from the Treasury Board incumbent file. Applicants and appointments are therefore measured differently. The difference between them shows where to look more closely; it is not an exact rate at which candidates are lost.',
  'Appointments include advertised and non-advertised processes, for indeterminate positions and terms of three months or more. Appointments to separate agencies are not included.',
  'The Commission changed its reporting method in 2017-18. Compare years before and after the change with care. Applicant figures for women cannot be reported before 2016-17 because of a change in how the data were captured.',
  '▼ marks a ratio of 0.85 or less, the screening rule used across this site. It is not a test of statistical significance, and it does not establish discrimination or a cause.',
  'Percentages are rounded to one decimal place; ratios are calculated from the unrounded published values. A value that was not published is never replaced with zero.',
  'The staffing dashboard has no employment equity information for separate agencies. It suppresses categories with small counts for confidentiality reasons, and micro organizations for data quality reasons. Its figures are not expected to match an organization’s own human resources data.',
  'In its 2021 audit of employment equity representation in recruitment, the Commission followed the same applications through each stage, in processes that closed in 2016-17. The share of Black candidates fell from 10.3% of applications to 6.6% of appointments. The audit’s results by stage are in the data explorer.'
 ];
 const extra=[
  [tr('Public Service Commission: employment equity designated groups under the Public Service Employment Act (supporting documentation for tables AR4A to AR4E)','Commission de la fonction publique'+NB+': documentation à l’appui des données sur les groupes visés par l’équité en matière d’emploi en vertu de la Loi sur l’emploi dans la fonction publique (tableaux AR4A à AR4E)'),
   tr('https://www.canada.ca/en/public-service-commission/services/publications/employment-equity-designated-groups-public-service-employment-act.html','https://www.canada.ca/fr/commission-fonction-publique/services/publications/groupes-vises-equite-matiere-emploi-vertu-loi-emploi.html')],
  [tr('Public Service Commission: staffing dashboard supporting documentation','Commission de la fonction publique'+NB+': documentation à l’appui du tableau de bord de la dotation'),
   tr('https://www.canada.ca/en/public-service-commission/services/publications/staffing-dashboard.html','https://www.canada.ca/fr/commission-fonction-publique/services/publications/tableau-de-bord-dotation.html')],
  [tr('Public Service Commission: Audit of Employment Equity Representation in Recruitment (2021)','Commission de la fonction publique'+NB+': Vérification portant sur la représentation des groupes visés par l’équité en matière d’emploi lors du recrutement (2021)'),
   tr('https://www.canada.ca/en/public-service-commission/services/publications/audit-of-employment-equity-representation-in-recruitment.html','https://www.canada.ca/fr/commission-fonction-publique/services/publications/verification-representation-groupes-vises-equite-matiere-demploi-lors-du-recrutement.html')],
 ];
 return '<ul class="cta-list">'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
  '<h3>'+esc(tr('Sources','Sources'))+'</h3><ul class="cta-list cta-sources">'+
  Object.values(C.datasets).map(d=>'<li>'+link(fr()?d.url_fr:d.url,tr('Open Government Portal: ','Portail du gouvernement ouvert'+NB+': ')+typo(fr()?d.fr:d.en))+'</li>').join('')+
  extra.map(([l,u])=>'<li>'+link(u,l)+'</li>').join('')+'</ul>'+
  '<h3>'+esc(tr('Related pages on this site','Pages connexes sur ce site'))+'</h3><ul class="cta-list">'+
  '<li><a href="'+esc(local('explorer.html#flows'))+'">'+esc(tr('Data explorer: hiring, promotions, separations and representation at each stage of recruitment','Explorateur de données'+NB+': embauches, promotions, départs et représentation à chaque étape du recrutement'))+'</a></li>'+
  '<li><a href="'+esc(local('call-to-action.html#findings'))+'">'+esc(tr('Call to Action: what the data point to','Appel à l’action'+NB+': ce que les données indiquent'))+'</a></li>'+
  '<li><a href="'+esc(local('sources.html'))+'">'+esc(tr('All data sources','Toutes les sources de données'))+'</a></li></ul>'+
  '<h3>'+esc(tr('Data files used on this page','Fichiers de données utilisés sur cette page'))+'</h3><ul class="cta-list">'+
  '<li><a href="data/psc/psc-equity.json">psc-equity.json</a>'+esc(tr(': the employment equity tables (AR4A to AR4E) and appointments by self-identification, read from the Commission’s files.',NB+': les tableaux sur l’équité en matière d’emploi (AR4A à AR4E) et les nominations selon l’auto-identification, tirés des fichiers de la Commission.'))+'</li>'+
  '<li><a href="data/psc/catalogue.json">catalogue.json</a>'+esc(tr(': every Commission file on this page, with its official link, period, size and SHA-256 checksum.',NB+': chaque fichier de la Commission présenté sur cette page, avec son lien officiel, sa période, sa taille et sa somme de contrôle SHA-256.'))+'</li></ul>';
}
function renderStatic(){
 document.querySelectorAll('[data-i18n]').forEach(el=>{const t=TEXT[el.dataset.i18n];if(t)el.textContent=tr(t[0],t[1]);});
 document.title=tr('Hiring and staffing data from the Public Service Commission | GC Equity','Données sur l’embauche et la dotation de la Commission de la fonction publique | Équité-GC');
 const A=years(D.applicants),P=years(D.appointments),H=years(...Object.values(D.hiring).map(o=>o.years));
 $('st-meta').textContent=tr('Applicants: '+range(A[0],A[A.length-1])+'. Appointments by group: '+range(P[0],P[P.length-1])+'. Appointments by organization: '+range(H[0],H[H.length-1])+'. Files retrieved '+longDate(D.retrieved)+'.',
  'Postulants'+NB+': '+range(A[0],A[A.length-1])+'. Nominations selon le groupe'+NB+': '+range(P[0],P[P.length-1])+'. Nominations par organisation'+NB+': '+range(H[0],H[H.length-1])+'. Fichiers téléchargés le '+longDate(D.retrieved)+'.');
 $('st-filter').placeholder=tr('File name or contents','Nom ou contenu du fichier');
 options($('st-group'),ORDER.map(k=>[k,gName(k)]),state.group);
 options($('st-sgroup'),['v','i','d'].map(k=>[k,gName(k)]),state.sgroup);
 options($('st-year'),years(D.by_region).reverse().map(y=>[y,fy(y)]),state.year);
 options($('st-stgroup'),ORDER.map(k=>[k,gName(k)]),state.stgroup);
 const orgs=Object.keys(D.hiring).filter(n=>!SPECIAL.includes(n)).sort((a,b)=>orgLabel(a).localeCompare(orgLabel(b),fr()?'fr':'en'));
 $('st-org').innerHTML='<optgroup label="'+esc(tr('Public service and organization size','Fonction publique et taille des organisations'))+'">'+SPECIAL.filter(n=>D.hiring[n]).map(n=>'<option value="'+esc(n)+'"'+(n===state.org?' selected':'')+'>'+esc(orgLabel(n))+'</option>').join('')+'</optgroup>'+
  '<optgroup label="'+esc(tr('Organizations','Organisations'))+'">'+orgs.map(n=>'<option value="'+esc(n)+'"'+(n===state.org?' selected':'')+'>'+esc(orgLabel(n))+'</option>').join('')+'</optgroup>';
 $('st-method').innerHTML=methodHTML();
}
function render(){renderStatic();renderFunnel();renderDetail();renderStudents();renderOrg();renderFiles();}
function bind(){
 const on=(id,key,fn)=>$(id).addEventListener('change',e=>{state[key]=e.target.value;fn();});
 on('st-group','group',renderFunnel);on('st-sgroup','sgroup',renderDetail);on('st-year','year',renderDetail);on('st-stgroup','stgroup',renderStudents);on('st-org','org',renderOrg);
 $('st-filter').addEventListener('input',e=>{state.q=e.target.value;renderFiles();});
 $('st-dl-funnel').addEventListener('click',()=>download('st-funnel-t','psc-applicants-appointments-'+state.group+'.csv'));
 $('st-dl-org').addEventListener('click',()=>download('st-org-t','psc-appointments-self-identification.csv'));
}
window._applyLang=function(){if(D)render();};
async function load(){
 const get=p=>fetch(new URL(p,location.href)).then(r=>{if(!r.ok)throw Error(p+' '+r.status);return r.json();});
 try{[D,C]=await Promise.all([get('data/psc/psc-equity.json'),get('data/psc/catalogue.json')]);}
 catch(err){$('st-loading').textContent=tr('The data could not be loaded. Reload the page to try again.','Les données n’ont pas pu être chargées. Rechargez la page pour réessayer.');return;}
 state.year=years(D.by_region).pop();
 const p=new URLSearchParams(location.search),org=p.get('org'),g=p.get('group');
 if(org&&D.hiring[org])state.org=org;
 if(ORDER.includes(g)){state.group=g;state.stgroup=g;if(g!=='w')state.sgroup=g;}
 $('st-loading').hidden=true;
 document.querySelectorAll('.st-after').forEach(el=>{el.hidden=false;});
 render();bind();
 if(location.hash){const t=document.getElementById(location.hash.slice(1));if(t)setTimeout(()=>t.scrollIntoView(),60);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
