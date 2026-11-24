/* Shared views of published data. Every mark represents source cells; no aggregation or imputation. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document){root.GCEquityVisuals=api;api.start(root);}
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const missing=/^(?:x|\*|9999|suppressed.*|supprime.*|not published.*|non publie.*|not applicable.*|sans objet.*|unavailable.*|non disponible.*|no benchmark.*|aucun.*|n\/a|\.\.)$/i;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isPeriod=s=>/^(?:year|annee|exercice|fiscal.?year|survey.?year|surveyr|period|periode|reporting period|reference period|month|mois|date|month_end_date|month_year_e)$/i.test(norm(s));
 const difference=s=>/difference|ecart|percentage.point|points? de pourcentage/.test(norm(s));
 function numeric(v,lang='en',allowNegativeOne=false){
  if(v===null||v===undefined)return null;
  let s=String(v).trim();if(!s||missing.test(norm(s))||(!allowNegativeOne&&s==='-1'))return null;
  s=s.replace(/[\u00a0\u202f\s]/g,'').replace(/%$/,'').replace(/^\$/,'').replace(/\$$/,'').replace(/−/g,'-');
  if(lang.startsWith('fr'))s=s.replace(/,/g,'.');else if(/^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s))s=s.replace(/,/g,'');
  if(!/^-?\d+(?:\.\d+)?$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)?n:null;
 }
 function missingLabel(v,lang='en'){
  const raw=String(v??'').trim(),fr=lang.startsWith('fr');
  if(/^(?:x|\*|-1)$/i.test(raw)||/suppressed|supprime/.test(norm(raw)))return fr?'Supprimé':'Suppressed';
  if(raw==='9999'||/not applicable|sans objet/.test(norm(raw)))return fr?'Sans objet':'Not applicable';
  if(!raw)return fr?'Non publié':'Not published';
  return raw;
 }
 function metricKind(header,values,lang){
  const h=norm(header),vals=values.filter(v=>String(v??'').trim()&&!missing.test(norm(v)));
  if(isPeriod(h)||/^(?:id|code|question|level\d.*|bycond.*|eelevel\d.*|branch id|unit id|index|rank|rang)$/.test(h)||/\b(?:identifier|identifiant|code|id)\b/.test(h))return null;
  const hasPercent=vals.some(v=>/%/.test(String(v)));
  if(difference(h))return 'points';
  if(hasPercent||/%|percentage|pourcentage|representation|availability|disponibilite|\bwfa\b|\bdpa\b|positive|negative|\bagree\b|mostpos|mostneg|answer[1-7]|reponse.*\(%\)|published result|resultat publie|weighted result|resultat pondere/.test(h))return 'percent';
  if(/ratio|index|indice|disproportionality|score/.test(h)||/^(value|valeur|n|nb|weighted_response|weighted response)$/.test(h))return 'number';
  if(/share|part ponderee|shr_w_resp/.test(h))return 'share';
  if(/salary|salaire|\$/.test(h))return 'money';
  if(/employees|employes|effectif|headcount|population|count|nombre|respondent|repondant|responses|reponses|total_w_resp|weighted total|total pondere|\bfte\b|\betp\b|\btotal\b|applicants|postulants|appointments|nominations|hired|embauches/.test(h))return 'count';
  if(/^20\d{2}(?:[-–/]\d{2,4})?(?:\s*\(%\))?$/.test(h)&&vals.some(v=>numeric(v,lang)!==null))return hasPercent?'percent':'number';
  return null;
 }
 function profile(headers,rows,opts={}){
  const lang=opts.lang||'en',raw=opts.rawHeaders||headers,metrics=[],dimensions=[];
  for(let i=0;i<headers.length;i++){
   const values=rows.slice(0,500).map(r=>r[i]);let kind=metricKind(raw[i]||headers[i],values,lang)||metricKind(headers[i],values,lang);
   if(!kind&&opts.allowNumericFallback&&!isPeriod(headers[i])&&!/id|code|question|year|annee|date|period|periode|exercice/.test(norm(headers[i]))&&/appointments|nominations|headcount|population|employees|employes|effectif|executive|cadres/.test(norm(opts.title))&&values.some(v=>numeric(v,lang)!==null))kind='number';
   if(kind&&values.some(v=>numeric(v,lang,difference(headers[i]))!==null)){
    // Bare response counts must never inherit a percent unit from another measure.
    if(/count|rounded responses|reponses arrondies|anscount|respondent base/.test(norm(raw[i]+' '+headers[i])))kind='count';
    if(kind==='percent'&&values.some(v=>{const n=numeric(v,lang);return n!==null&&(n<0||n>100);}))continue;
    metrics.push({index:i,label:String(headers[i]),kind});
   }else if(!/\b(?:id|identifier|identifiant)\b|^level\d|^bycond|^eelevel\d/.test(norm(raw[i]||headers[i]))&&values.some(v=>String(v??'').trim())){
    // Literal numbers are categories only for a documented period or question code.
    if(isPeriod(raw[i]||headers[i])||values.some(v=>numeric(v,lang)===null&&!missing.test(norm(v))))dimensions.push({index:i,label:String(headers[i]),period:isPeriod(raw[i]||headers[i])});
   }
  }
  return {headers,rawHeaders:raw,rows,lang,metrics,dimensions,title:opts.title||'',scope:opts.scope||'table',sources:(Array.isArray(opts.sources)?opts.sources:opts.sources?[opts.sources]:[]).map(s=>typeof s==='string'?{url:s,label:s}:s)};
 }
 function points(p,settings={}){
  const x=Number(settings.x??p.dimensions[0]?.index??0),m=p.metrics.find(m=>m.index===Number(settings.measure))||p.metrics[0];
  if(!m)return {rows:[],metrics:[],total:0,x};
  const comparison=p.metrics.find(c=>c.index===Number(settings.compare)&&c.index!==m.index&&c.kind===m.kind);
  const metrics=[m,...(comparison?[comparison]:[])],q=norm(settings.search||'');
  let rows=p.rows.filter(r=>(!q||norm(r.join(' ')).includes(q))&&Object.entries(settings.filters||{}).every(([i,v])=>!v||String(r[Number(i)]??'')===v));
  if(settings.sort==='high'||settings.sort==='low')rows=[...rows].sort((a,b)=>{const va=numeric(a[m.index],p.lang,difference(m.label)),vb=numeric(b[m.index],p.lang,difference(m.label));if(va===null)return vb===null?0:1;if(vb===null)return -1;return (va-vb)*(settings.sort==='high'?-1:1);});
  const uniqueCategories=new Set(rows.map(r=>String(r[x]??''))).size===rows.length;
  const total=rows.length,limit=Math.min(250,Math.max(1,Number(settings.limit)||40));
  rows=rows.slice(0,limit).map((raw,i)=>({label:String(raw[x]??''),raw,index:i,values:metrics.map(m=>numeric(raw[m.index],p.lang,difference(m.label)))}));
  return {rows,metrics,total,x,uniqueCategories};
 }
 function defaultDimension(p){
  const candidates=p.dimensions.filter(d=>!(/\(french\)|\(francais\)|_f$|_fr$/.test(norm(d.label))&&!p.lang.startsWith('fr'))&&!(/\(english\)|\(anglais\)|_e$|_en$/.test(norm(d.label))&&p.lang.startsWith('fr')));
  const changing=candidates.filter(d=>new Set(p.rows.slice(0,1000).map(r=>String(r[d.index]??''))).size>1);
  const active=changing.length?changing:candidates;
  return (active.find(d=>/branch|unit|unite|sector|secteur/.test(norm(d.label)))||active.find(d=>/group|groupe/.test(norm(d.label)))||active.find(d=>d.period)||active[0]||p.dimensions[0])?.index??0;
 }
 function trendAllowed(p,pts){return p.dimensions.some(d=>d.index===pts.x&&d.period)&&pts.rows.length>1&&new Set(pts.rows.map(r=>r.label)).size===pts.rows.length&&pts.rows.every(r=>/^\d{4}(?:[-–/]\d{2,4}|-\d{2}-\d{2})?$/.test(r.label));}
 function completeResponses(p){
  const groups=[/strongly agree|tout a fait d.accord/,/somewhat agree|plutot d.accord/,/neither agree|ni d.accord/,/somewhat disagree|plutot en desaccord/,/strongly disagree|tout a fait en desaccord/];
  const matches=groups.map(re=>p.metrics.find(m=>m.kind==='percent'&&re.test(norm(m.label))));
  if(matches.some(x=>!x))return null;
  return p.rows.length&&p.rows.every(row=>{const ns=matches.map(m=>numeric(row[m.index],p.lang));return ns.every(n=>n!==null&&n>=0&&n<=100)&&Math.abs(ns.reduce((a,b)=>a+b,0)-100)<=1;})?matches:null;
 }
 function pivot(p,pts,column){
  const ci=Number(column);if(!Number.isInteger(ci)||ci===pts.x||!p.dimensions.some(d=>d.index===ci))return null;
  const cells=new Map(),labels=[],columns=[];
  for(const r of pts.rows){const a=r.label,b=String(r.raw[ci]??''),key=JSON.stringify([a,b]);if(cells.has(key))return null;cells.set(key,r);if(!labels.includes(a))labels.push(a);if(!columns.includes(b))columns.push(b);}
  return columns.length>1&&columns.length<=20&&labels.length<=60?{cells,labels,columns}:null;
 }
 function csvText(headers,rows){const quote=v=>{let s=String(v??'');if(/^\s*[=+@]/.test(s)||/^\s*-(?!\d+(?:\.\d+)?$)/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\ufeff'+[headers,...rows].map(r=>r.map(quote).join(',')).join('\r\n');}
 const api={numeric,missingLabel,metricKind,profile,points,defaultDimension,trendAllowed,completeResponses,pivot,csvText};
 function start(win){
  const doc=win.document,ownScript=doc.currentScript,assetURL=new URL('data-visuals.css',ownScript?.src||new URL('assets/',doc.baseURI));
  if(!doc.getElementById('gce-visual-style')){const link=doc.createElement('link');link.id='gce-visual-style';link.rel='stylesheet';link.href=assetURL.href;doc.head.append(link);}
  const widgets=new WeakMap(),active=new Set(),pending=new Set(),observed=new WeakSet();let sequence=0,timer,lazy;
  const nearby=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom> -300&&r.top<win.innerHeight+500;};
  const watch=table=>{if(observed.has(table))return;observed.add(table);if(lazy)lazy.observe(table);else enhance(table);};
  const L=(l,en,fr)=>l.startsWith('fr')?fr:en;
  const strip=s=>{const t=doc.createElement('template');t.innerHTML=String(s??'');return t.content.textContent.trim();};
  const language=table=>table.closest('[lang]')?.lang||doc.documentElement.lang||'en';
  function sourceLinks(table){
   const wrap=table.closest('.table-scroll,.gce-table-wrap,.gcw-table-wrap,.tblwrap,.eq-table-scroll,.eq-native-table-wrap,.scroll')||table;let n=wrap.nextElementSibling,out=[];
   for(let i=0;n&&i<7;i++,n=n.nextElementSibling){if(n.matches('h2,h3,h4,table,.table-scroll,.gce-table-wrap'))break;if(n.matches('.source,.gce-source')||n.querySelector('.source,.gce-source'))for(const a of n.querySelectorAll('a[href]'))if(/^https?:/.test(a.href))out.push({url:a.href,label:a.textContent.trim()});}
   return out;
  }
  function dataFor(table){
   const supplied=table._gceVisualData||win.GCEChartTableData?.(table);
   const heads=supplied?.headers||[...(table.tHead?.rows[table.tHead.rows.length-1]?.cells||table.rows[0]?.cells||[])].map(c=>c.textContent.trim());
   if(!heads.length)return null;
   const rows=supplied?.rows||[...table.tBodies].flatMap(b=>[...b.rows].filter(r=>r.cells.length===heads.length).map(r=>[...r.cells].map(c=>c.textContent.trim())));
   const title=supplied?.title||table.caption?.textContent.trim()||table.closest('[aria-label]')?.getAttribute('aria-label')||L(language(table),'Published data','Données publiées');
   const pager=table.closest('.dp-data-view,.gce-data-block,.gce-org-source,.gce-added-body,.library,.gce-restored-section,.branch-explorer')?.querySelector('.pager,.gce-pager');
   return profile(heads.map(strip),rows,{...supplied,lang:supplied?.lang||language(table),title,allowNumericFallback:!supplied,scope:supplied?.scope||(pager?'displayed':'table'),sources:supplied?.sources||sourceLinks(table)});
  }
  function node(tag,cls,text){const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  const finite=n=>n!==null&&Number.isFinite(n),colors=['#12685f','#285b96','#8c456f','#98611b','#5e608c'];
  function formatted(v,kind,l){if(!finite(v))return L(l,'Not published / suppressed','Non publié / supprimé');return v.toLocaleString(l,{maximumFractionDigits:4})+(kind==='percent'?(l.startsWith('fr')?' %':'%'):kind==='points'?L(l,' percentage points',' points de pourcentage'):'');}
  function svgPlot(p,pts,state,details){
   const l=p.lang,m=pts.metrics[0],kind=state.kind,stack=kind==='stacked'?completeResponses(p):null,matrix=kind==='heatmap'?pivot(p,pts,state.column):null;
   const metrics=kind==='heatmap'&&!matrix?p.metrics.filter(v=>v.kind===m.kind).slice(0,6):stack||pts.metrics;
   let rows=pts.rows;if(kind==='trend')rows=[...rows].sort((a,b)=>a.label.localeCompare(b.label));
   const legendWide=metrics.some(c=>String(c.label).length>30),legendRows=legendWide?metrics.length:Math.ceil(metrics.length/2),width=1100,left=400,right=100,top=Math.max(95,legendRows*23+50),bottom=50,step=kind==='heatmap'?72:Math.max(78,metrics.length*26+20),height=kind==='trend'?480:top+Math.max(1,matrix?matrix.labels.length:rows.length)*step+bottom;
   const ns=rows.flatMap(r=>metrics.map(c=>numeric(r.raw[c.index],l,difference(c.label)))).filter(finite),min=Math.min(0,...ns),max=m.kind==='percent'?100:Math.max(1,...ns),span=max-min||1,x=v=>left+(v-min)/span*(width-left-right),baseline=x(0);
   const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','group');svg.setAttribute('aria-label',p.title);svg.classList.add('dv-svg');
   let markup='<rect width="1100" height="'+height+'" fill="white"/><title>'+esc(p.title)+'</title><desc>'+esc(L(l,'Published cells only. Exact values and source-row details follow the chart.','Cellules publiées seulement. Les valeurs exactes et détails des lignes suivent le graphique.'))+'</desc>';
   const text=(x,y,s,anchor='start',size=17)=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-family="system-ui,sans-serif" font-size="'+Math.max(20,size)+'" fill="#183440">'+esc(s)+'</text>';
   const label=(s,y)=>{const words=String(s).split(/\s+/),lines=[''];for(const word of words){if((lines[lines.length-1]+' '+word).trim().length>35&&lines.length<3)lines.push(word);else lines[lines.length-1]+=(lines[lines.length-1]?' ':'')+word;}if(lines.join(' ').length>125)lines[lines.length-1]=lines[lines.length-1].slice(0,36)+'…';return lines.slice(0,3).map((s,i)=>text(8,y+i*23,s)).join('');};
   const record=(r,c,value)=>{const fields=p.headers.map((h,i)=>h+': '+String(r.raw[i]??'')).join(' · ');return r.label+' · '+c.label+': '+(finite(value)?formatted(value,c.kind,l):missingLabel(r.raw[c.index],l))+' · '+fields;};
   const marks=[];
   function mark(r,c,value,body){const id=marks.length,full=record(r,c,value);marks.push(full);return '<g tabindex="0" role="button" data-point="'+id+'" aria-label="'+esc(full)+'"><title>'+esc(full)+'</title>'+body+'</g>';}
   const unitName=c=>c.kind==='percent'?'%':c.kind==='points'?L(l,'points','points'):L(l,'source units','unités sources'),legendText=c=>{const name=String(c.label),short=name.length>80?name.slice(0,79)+'…':name;return legendWide&&/\((%|points)\)\s*$/.test(short)?short:(legendWide?short:name.slice(0,37))+' · '+unitName(c);};const series=metrics.map((c,i)=>legendWide?text(8,25+i*23,legendText(c)):text(left+(i%2)*300,25+Math.floor(i/2)*23,legendText(c))).join('');markup+=series;
   if(kind==='heatmap'){
    const columns=matrix?matrix.columns:metrics.map(v=>v.label),labels=matrix?matrix.labels:rows.map(r=>r.label),cellWidth=(width-left-right)/Math.max(1,columns.length);
    columns.forEach((c,i)=>markup+=text(left+i*cellWidth+cellWidth/2,top-20,String(c).slice(0,22),'middle',15));
    labels.forEach((name,ri)=>{const y=top+ri*step;markup+=label(name,y+20);columns.forEach((name,ci)=>{const row=matrix?matrix.cells.get(JSON.stringify([labels[ri],name])):rows[ri],metric=matrix?m:metrics[ci],v=row?numeric(row.raw[metric.index],l,difference(metric.label)):null;const ratio=finite(v)?Math.max(0,Math.min(1,(v-min)/span)):0;const fill=finite(v)?'rgb('+[230-190*ratio,243-133*ratio,240-140*ratio].map(Math.round).join(',')+')':'#f1f1f1';const body='<rect x="'+(left+ci*cellWidth)+'" y="'+y+'" width="'+(cellWidth-3)+'" height="56" fill="'+fill+'"/>'+text(left+ci*cellWidth+cellWidth/2,y+34,finite(v)?formatted(v,metric.kind,l):row?missingLabel(row.raw[metric.index],l):L(l,'Not plotted','Non affiché'),'middle',15).replace('fill="#183440"','fill="'+(ratio>.9?'white':'#000000')+'"');markup+=row?mark(row,metric,v,body):body;});});
    markup+=text(8,height-14,L(l,'Colour indicates numeric magnitude, not a performance rating.','La couleur indique la valeur numérique, sans évaluation du rendement.'), 'start',15);
   }else if(kind==='trend'){
    const y=v=>height-bottom-(v-min)/span*(height-top-bottom),xx=i=>left+i*(width-left-right)/Math.max(1,rows.length-1);
    for(let i=0;i<=4;i++){const v=min+span*i/4;markup+='<line x1="'+left+'" x2="'+(width-right)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#cbd7da"/>'+text(left-12,y(v)+6,formatted(v,m.kind,l),'end',15);}
    metrics.forEach((c,k)=>{let path='';rows.forEach((r,i)=>{const v=numeric(r.raw[c.index],l,difference(c.label));if(!finite(v)){path+='|';return;}path+=(path.endsWith('|')||!path?'M':'L')+xx(i)+','+y(v)+' ';});for(const part of path.split('|').filter(Boolean))markup+='<path d="'+part+'" fill="none" stroke="'+colors[k]+'" stroke-width="3"/>';rows.forEach((r,i)=>{const v=numeric(r.raw[c.index],l,difference(c.label));if(finite(v))markup+=mark(r,c,v,'<circle cx="'+xx(i)+'" cy="'+y(v)+'" r="7" fill="'+colors[k]+'"/>'+text(xx(i),y(v)-12,formatted(v,c.kind,l),'middle',15));});});rows.forEach((r,i)=>markup+=text(xx(i),height-bottom+28,r.label,'middle',15));
   }else if(stack){
    rows.forEach((r,ri)=>{const y=top+ri*step;markup+=label(r.label,y+20);let offset=0;stack.forEach((c,k)=>{const v=numeric(r.raw[c.index],l),x0=left+offset/100*(width-left-right),w=v/100*(width-left-right);markup+=mark(r,c,v,'<rect x="'+x0+'" y="'+y+'" width="'+w+'" height="30" fill="'+colors[k]+'"/>');offset+=v;});});
   }else{
    for(let i=0;i<=4;i++){const v=min+span*i/4;markup+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="'+(top-8)+'" y2="'+(height-bottom)+'" stroke="#d4dfe1"/>'+text(x(v),height-bottom+29,formatted(v,m.kind,l),'middle',15);}
    rows.forEach((r,ri)=>{const y=top+ri*step;markup+=label(r.label,y+17);metrics.forEach((c,k)=>{const v=numeric(r.raw[c.index],l,difference(c.label)),yy=y+k*23;let body;if(!finite(v))body=text(left+8,yy+17,missingLabel(r.raw[c.index],l), 'start',15);else if(kind==='dots')body='<line x1="'+baseline+'" x2="'+x(v)+'" y1="'+(yy+10)+'" y2="'+(yy+10)+'" stroke="'+colors[k]+'" stroke-width="2"/><circle cx="'+x(v)+'" cy="'+(yy+10)+'" r="7" fill="'+colors[k]+'"/>'+text(x(v)+(v<0?-12:12),yy+16,formatted(v,c.kind,l),v<0?'end':'start',15);else body='<rect x="'+Math.min(baseline,x(v))+'" y="'+yy+'" width="'+Math.abs(x(v)-baseline)+'" height="18" fill="'+colors[k]+'"/>'+text(x(v)+(v<0?-10:10),yy+16,formatted(v,c.kind,l),v<0?'end':'start',15);markup+=mark(r,c,v,body);});});
   }
   const sourceText=p.sources.map(s=>typeof s==='string'?s:s.url).join(' · ');markup+='<metadata>'+esc(JSON.stringify({title:p.title,source:sourceText,measure:m.label,filters:state.filters,plottedRows:rows.length,matchingRows:pts.total}))+'</metadata>';
   svg.innerHTML=markup;
   const select=e=>{const target=e.target.closest('[data-point]');if(!target)return;svg.querySelectorAll('[data-selected]').forEach(n=>n.removeAttribute('data-selected'));target.setAttribute('data-selected','true');details.textContent=marks[Number(target.dataset.point)];};
   svg.addEventListener('focusin',select);svg.addEventListener('click',select);svg.addEventListener('pointerover',select);svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(e);}});
   return svg;
  }
  function save(name,blob){const url=URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
  function mount(table,p){
   const host=node('section','dv-widget');host.setAttribute('aria-label',L(p.lang,'Data view options','Options de visualisation'));const wrapper=table.closest('.table-scroll,.gce-table-wrap,.gcw-table-wrap,.tblwrap,.eq-table-scroll,.eq-native-table-wrap,.scroll')||table;const older=wrapper.previousElementSibling;if(older?.matches('.dp-bars,.isc-bars'))older.hidden=true;wrapper.before(host);
   const primary=p.metrics.find(m=>/representation/.test(norm(m.label)))||p.metrics.find(m=>m.kind==='percent'&&/published result|resultat publie|positive|agree/.test(norm(m.label)))||p.metrics[0];const benchmark=p.metrics.find(m=>m.kind===primary.kind&&m.index!==primary.index&&/availability|disponibilite|\bwfa\b|\bdpa\b|all respondents in this|tous les repondants de/.test(norm(m.label)));
   const state={view:'table',kind:'bars',measure:primary.index,compare:benchmark?.index??'',x:defaultDimension(p),column:'',search:'',limit:40,sort:'source',filters:{}};
   try{const saved=JSON.parse(win.localStorage.getItem('gc-equity-visual-view-v1')||'null');if(['table','chart','both'].includes(saved?.view))state.view=saved.view;}catch(e){}
   if(doc.getElementById('prefer-tables')?.checked||doc.body.classList.contains('dp-tables-only')||doc.body.classList.contains('prefer-tables'))state.view='table';
   const w={table,host,wrapper,state,p,signature:'',controls:null,dirty:false};host._gceSourceTable=table;widgets.set(table,w);active.add(w);if(lazy)lazy.observe(host);build(w);return w;
  }
  function build(w){
   const {host,state,p}=w,l=p.lang;host.replaceChildren();const id='dv-'+(++sequence),toolbar=node('div','dv-toolbar'),group=node('div','dv-views');group.setAttribute('role','group');group.setAttribute('aria-label',L(l,'View this dataset','Afficher ce jeu de données'));
   const views={};for(const mode of ['table','chart','both']){const b=node('button','',L(l,{table:'Table',chart:'Chart',both:'Both'}[mode],{table:'Tableau',chart:'Graphique',both:'Les deux'}[mode]));b.type='button';b.setAttribute('aria-pressed',String(state.view===mode));b.addEventListener('click',()=>{state.view=mode;try{win.localStorage.setItem('gc-equity-visual-view-v1',JSON.stringify({view:mode}));}catch(e){}display(w);});group.append(b);views[mode]=b;}
   toolbar.append(group);host.append(toolbar);const controls=node('div','dv-controls');host.append(controls);
   const field=(title,key,options,callback)=>{const lab=node('label','',title),s=node('select');s.id=id+'-'+key;s.setAttribute('aria-label',title);lab.htmlFor=s.id;for(const [value,label]of options){const o=node('option','',label);o.value=String(value);s.append(o);}s.value=String(state[key]);if(s.value===''){s.selectedIndex=0;state[key]=s.value;}s.addEventListener('change',()=>{state[key]=s.value;callback?callback():render(w);});lab.append(s);controls.append(lab);return s;};
   const measurement=p.metrics.find(m=>m.index===Number(state.measure))||p.metrics[0];state.measure=measurement.index;
   const measures=field(L(l,'Measure','Indicateur'),'measure',p.metrics.map(m=>[m.index,m.label]),()=>{state.compare='';build(w);});
   const compare=field(L(l,'Compare with','Comparer avec'),'compare',[['',L(l,'One measure','Un seul indicateur')],...p.metrics.filter(m=>m.index!==Number(state.measure)&&m.kind===measurement.kind).map(m=>[m.index,m.label])]);
   const x=field(L(l,'Categories / time','Catégories / période'),'x',p.dimensions.map(d=>[d.index,d.label]),()=>{state.filters={};state.column='';build(w);});
   const chart=field(L(l,'Chart type','Type de graphique'),'kind',[['bars',L(l,'Bars','Barres')],['dots',L(l,'Dots','Points')],['heatmap',L(l,'Heatmap','Carte thermique')],['trend',L(l,'Trend over time','Évolution dans le temps')],...(completeResponses(p)?[['stacked',L(l,'Complete response distribution','Répartition complète des réponses')]]:[])]);
   const col=field(L(l,'Heatmap columns','Colonnes de la carte thermique'),'column',[['',L(l,'Comparable measures','Indicateurs comparables')],...p.dimensions.filter(d=>d.index!==Number(state.x)).map(d=>[d.index,d.label])]);
   field(L(l,'Order','Ordre'),'sort',[['source',L(l,'Source order','Ordre de la source')],['high',L(l,'Largest first','Valeurs décroissantes')],['low',L(l,'Smallest first','Valeurs croissantes')]]);
   field(L(l,'Maximum rows to plot','Nombre maximal de lignes'),'limit',[[20,'20'],[40,'40'],[100,'100'],[250,'250']]);
   const searchLabel=node('label','',L(l,'Find chart rows','Rechercher des lignes')),search=node('input');search.type='search';search.value=state.search;search.addEventListener('input',()=>{state.search=search.value;render(w);});searchLabel.append(search);controls.append(searchLabel);
   const filterPanel=node('details','dv-filters'),summary=node('summary','',L(l,'Filter chart rows','Filtrer les lignes du graphique')),filterBox=node('div','dv-filter-grid');filterPanel.append(summary,filterBox);controls.append(filterPanel);
   for(const d of p.dimensions.filter(d=>d.index!==Number(state.x))){if(/\(french\)|\(francais\)|_f$|_fr$/.test(norm(d.label))&&!l.startsWith('fr')||/\(english\)|\(anglais\)|_e$|_en$/.test(norm(d.label))&&l.startsWith('fr'))continue;const unique=new Set();for(const row of p.rows){const v=String(row[d.index]??'');if(v)unique.add(v);if(unique.size>300)break;}if(unique.size<2||unique.size>300)continue;const values=[...unique].sort((a,b)=>a.localeCompare(b,l,{numeric:true}));const lab=node('label','',d.label),s=node('select');s.append(new Option(L(l,'All source rows','Toutes les lignes sources'),''));values.forEach(v=>s.append(new Option(v,v)));s.value=state.filters[d.index]||'';s.addEventListener('change',()=>{state.filters[d.index]=s.value;render(w);});lab.append(s);filterBox.append(lab);}
   filterPanel.hidden=!filterBox.children.length;
   const advanced=node('details','dv-advanced'),advancedTitle=node('summary','',L(l,'More chart options','Autres options du graphique')),advancedBox=node('div','dv-extra-grid');advanced.append(advancedTitle,advancedBox);for(const field of [...controls.children])if(field===searchLabel||field===filterPanel||field.querySelector('select[id$=\"-sort\"],select[id$=\"-limit\"]'))advancedBox.append(field);controls.append(advanced);
   const note=node('p','dv-note'),figure=node('figure','dv-figure'),caption=node('figcaption','',p.title),frame=node('div','dv-frame'),details=node('output','dv-details',L(l,'Select a mark or focus it with the keyboard for its exact value and source-row details.','Sélectionnez un point ou utilisez le clavier pour consulter sa valeur exacte et sa ligne source.'));details.setAttribute('aria-live','polite');figure.append(caption,frame,details);
   const source=node('p','dv-source');p.sources.forEach((s,i)=>{const u=typeof s==='string'?s:s.url;try{const url=new URL(u,doc.baseURI);if(!['https:','http:'].includes(url.protocol))return;const a=node('a','',L(l,'Source '+(i+1),'Source '+(i+1)));a.href=url.href;source.append(i?' · ':'',a);}catch(e){}});figure.append(source);host.append(note,figure);
   const downloads=node('div','dv-downloads');for(const type of ['svg','png']){const b=node('button','',L(l,'Download chart ('+type.toUpperCase()+')','Télécharger le graphique ('+type.toUpperCase()+')'));b.type='button';b.addEventListener('click',async()=>{const svg=frame.querySelector('svg');if(!svg)return;const copy=doc.createElementNS('http://www.w3.org/2000/svg','svg'),totalHeight=svg.viewBox.baseVal.height+150;copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('viewBox','0 0 1100 '+totalHeight);copy.setAttribute('width','1100');copy.setAttribute('height',totalHeight);copy.innerHTML='<rect width=\"1100\" height=\"'+totalHeight+'\" fill=\"white\"/>';const g=doc.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('transform','translate(0,70)');for(const child of svg.children)g.append(child.cloneNode(true));copy.append(g);for(const [text,y]of [[p.title.slice(0,130),30],[L(l,'Source data and definitions: ','Données sources et définitions : ')+location.href,svg.viewBox.baseVal.height+112]]){const t=doc.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x','8');t.setAttribute('y',y);t.setAttribute('font-size','18');t.setAttribute('fill','#183440');t.textContent=text;copy.append(t);}const blob=new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml;charset=utf-8'});if(type==='svg'){save('gc-equity-chart.svg',blob);return;}const url=URL.createObjectURL(blob),image=new Image();try{await new Promise((yes,no)=>{image.onload=yes;image.onerror=no;image.src=url;});const canvas=doc.createElement('canvas');canvas.width=1100;canvas.height=totalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(png)save('gc-equity-chart.png',png);}catch(e){details.textContent=L(l,'Use the SVG download or print this page.','Utilisez le téléchargement SVG ou imprimez cette page.');}finally{URL.revokeObjectURL(url);}});downloads.append(b);}
   const records=node('button','',L(l,'Download chart rows (CSV)','Télécharger les lignes du graphique (CSV)'));records.type='button';records.addEventListener('click',()=>{const pts=points(w.p,state);save('gc-equity-chart-rows.csv',new Blob([csvText(w.p.headers,pts.rows.map(r=>r.raw))],{type:'text/csv;charset=utf-8'}));});downloads.append(records);host.append(downloads);
   const method=node('p','dv-method',L(l,'Each mark uses a published source row. Groups may overlap; rows are never added or averaged. Question wording, response bases, reporting periods and populations can differ. A higher value is not always better. Missing and suppressed values are not zero.','Chaque point représente une ligne source publiée. Les groupes peuvent se chevaucher; aucune somme ni moyenne des lignes n’est calculée. Les questions, bases, périodes et populations peuvent différer. Une valeur élevée n’est pas toujours préférable. Les valeurs absentes ou supprimées ne sont pas des zéros.'));host.append(method);
   w.controls={views,controls,note,figure,frame,details,downloads,method,compare,col,chart};display(w);
  }
  function display(w){const {state,controls:c,wrapper}=w,show=state.view!=='table';for(const [view,b]of Object.entries(c.views))b.setAttribute('aria-pressed',String(state.view===view));wrapper.toggleAttribute('data-dv-hidden',state.view==='chart');for(const n of [c.controls,c.note,c.figure,c.downloads,c.method])n.hidden=!show;if(show)render(w);}
  function render(w){
   const {p,state,controls:c}=w,l=p.lang,pts=points(p,state);c.frame.replaceChildren();c.col.closest('label').hidden=state.kind!=='heatmap';c.compare.closest('label').hidden=state.kind==='stacked'||state.kind==='heatmap';
   const trend=trendAllowed(p,pts);c.chart.querySelector('option[value="trend"]').disabled=!trend;
   let reason='';if(!pts.uniqueCategories&&['bars','dots','stacked'].includes(state.kind))reason=L(l,'Several source rows share this category. Use the table filters or More chart options to select one question, group, period or population per category. No totals or averages are calculated.','Plusieurs lignes partagent cette catégorie. Utilisez les filtres du tableau ou Autres options du graphique pour choisir une question, un groupe, une période ou une population par catégorie. Aucune somme ni moyenne n’est calculée.');if(state.kind==='trend'&&!trend)reason=L(l,'Choose a year or period column with one source row per period. Use the filters to separate groups, questions or populations.','Choisissez une colonne de période avec une ligne par période. Filtrez les groupes, questions ou populations.');
   if(state.kind==='heatmap'&&state.column!==''&&!pivot(p,pts,state.column))reason=L(l,'This selection has repeated cells or too many categories. Filter to one row per category pair; no sum or average is calculated.','Cette sélection contient des cellules répétées ou trop de catégories. Filtrez pour obtenir une ligne par paire; aucune somme ni moyenne n’est calculée.');
   if(state.kind==='heatmap'&&state.column===''&&p.metrics.filter(m=>m.kind===pts.metrics[0]?.kind).length<2)reason=L(l,'Choose a second category for the heatmap columns, or use bars or dots.','Choisissez une deuxième catégorie pour les colonnes, ou utilisez des barres ou des points.');
   if(!pts.rows.length||!pts.rows.some(r=>r.values.some(finite)))reason=L(l,'No published numeric values match these chart filters. Missing or suppressed cells are not plotted as zero.','Aucune valeur numérique publiée ne correspond aux filtres. Les cellules absentes ou supprimées ne sont pas représentées par zéro.');
   c.note.textContent=(p.scope==='displayed'?L(l,'This chart uses the currently displayed table rows. ','Ce graphique utilise les lignes affichées du tableau. '):L(l,'This chart uses matching source rows, including rows beyond the table’s current page. ','Ce graphique utilise les lignes correspondantes, y compris celles au-delà de la page du tableau. '))+L(l,'Plotting ','Affichage de ')+Math.min(pts.rows.length,pts.total).toLocaleString(l)+' / '+pts.total.toLocaleString(l)+L(l,' rows. Refine the filters or change the row limit.',' lignes. Précisez les filtres ou modifiez la limite.');
   if(reason){c.frame.append(node('p','dv-empty',reason));c.downloads.querySelectorAll('button').forEach(b=>b.disabled=true);return;}
   c.downloads.querySelectorAll('button').forEach(b=>b.disabled=false);c.frame.append(svgPlot(p,pts,state,c.details));
  }
  function enhance(table){
   if(!table.isConnected||table.closest('.dv-widget,.gcw-dialog,.evidence-chart,[data-no-visual]'))return;
   const p=dataFor(table);if(!p)return;let w=widgets.get(table);if(w)w.dirty=false;
   if(!p.metrics.length||!p.dimensions.length){if(w){w.wrapper.removeAttribute('data-dv-hidden');w.host.remove();active.delete(w);widgets.delete(table);}return;}
   if(!w)w=mount(table,p);else{const changed=w.p.headers.join('|')!==p.headers.join('|')||w.p.lang!==p.lang;w.p=p;if(changed)w.state.filters={};build(w);}
  }
  const queue=table=>{pending.add(table);clearTimeout(timer);timer=setTimeout(()=>{for(const t of pending){const w=widgets.get(t);if(w){if(nearby(w.host))enhance(t);else w.dirty=true;}else if(nearby(t))enhance(t);else watch(t);}pending.clear();for(const w of active)if(!w.table.isConnected){w.host.remove();active.delete(w);}},90);};
  api.update=(table,data)=>{if(data)table._gceVisualData=data;queue(table);};api.enhance=enhance;
  function init(){if('IntersectionObserver'in win)lazy=new win.IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){const table=e.target._gceSourceTable||e.target,w=widgets.get(table);if(!w||w.dirty)enhance(table);}},{rootMargin:'400px'});doc.querySelectorAll('main table,article table').forEach(watch);const observer=new MutationObserver(changes=>{for(const c of changes){const element=c.target.nodeType===1?c.target:c.target.parentElement;if(element?.closest('.dv-widget'))continue;const table=element?.closest('table');if(table)queue(table);for(const n of c.addedNodes)if(n.nodeType===1&&!n.closest('.dv-widget')){if(n.matches('table'))queue(n);n.querySelectorAll?.('table').forEach(queue);}}});observer.observe(doc.body,{childList:true,subtree:true,characterData:true});new MutationObserver(()=>{for(const w of active)queue(w.table);}).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});}
  doc.addEventListener('change',event=>{if(event.target.id==='prefer-tables'&&event.target.checked)for(const w of active){w.state.view='table';display(w);}});
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
 }
 api.start=start;return api;
});
