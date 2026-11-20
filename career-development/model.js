(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./content.js'));else root.CareerModel=factory(root.CareerContent);})(typeof globalThis==='object'?globalThis:this,function(C){
'use strict';
const t=(value,lang='en')=>value?.[lang]??value?.en??String(value??'');
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function datePlus(value,days){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';
 const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d,12));
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return '';
 date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);
}
function guide(goalId,status){
 const goal=C.goals.find(g=>g.id===goalId);if(!goal)return null;
 const selected=C.statuses.some(s=>s.id===status)?status:'employee';
 const sources=[...goal.sources];
 if(selected==='student')sources.push('bridging','students');
 if(selected==='casual')sources.push('casual','jobs');
 if(selected==='agency')sources.push('deployment');
 if(selected==='external')sources.push('jobs');
 let steps=goal.steps,section=goal.section;
 if(goalId==='move'&&['student','casual','external'].includes(selected)){
  steps=[C.p('Start with jobs open to your situation and check the area of selection.','Commencez par les emplois ouverts à votre situation et vérifiez la zone de sélection.'),C.p('Match your evidence to the qualifications in the job advertisement.','Comparez vos exemples aux qualifications de l’offre d’emploi.'),C.p('Ask the hiring contact about the available appointment options.','Demandez à la personne responsable de l’embauche quelles options de nomination sont possibles.')];
  section='applications';sources.splice(0,sources.length,'jobs','qualifications',selected==='student'?'bridging':selected==='casual'?'casual':'apply');
 }
 return {goal,steps,section,note:C.statusNotes[selected],sources:[...new Set(sources)]};
}
function filterResources(resources,query='',topic='all',savedOnly=false,saved=[]){
 const words=normalize(query).trim().split(/\s+/).filter(Boolean);
 return resources.filter(r=>(topic==='all'||r.topics.includes(topic))&&(!savedOnly||saved.includes(r.id))&&words.every(w=>normalize([r.title.en,r.title.fr,r.desc.en,r.desc.fr,r.publisher,r.tags||''].join(' ')).includes(w)));
}
function csv(rows){
 const cell=v=>{let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 return '\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
}
function evidenceText(fields,lang){return ['criterion','situation','task','action','result'].filter(k=>String(fields[k]||'').trim()).map(k=>t(C.ui[k],lang)+'\n'+String(fields[k]).trim()).join('\n\n');}
function draftMessage(f,lang){
 const fr=lang==='fr',topic=String(f.topic||'').trim(),context=String(f.context||'').trim(),ask=String(f.ask||'').trim();
 const text={
 learning:fr?'J’aimerais discuter de mon plan d’apprentissage et de perfectionnement. Pouvons-nous convenir d’une activité, d’une occasion de mise en pratique, du temps à y consacrer et d’une date de suivi?':'I would like to discuss my learning and development plan. Could we agree on a learning activity, a chance to apply it, the time required and a review date?',
 mentor:fr?'Seriez-vous disponible pour une courte discussion de mentorat? J’aimerais apprendre de votre expérience et préciser ma prochaine étape professionnelle. Nous pourrions commencer par une rencontre de 20 minutes, selon vos disponibilités.':'Would you be available for a short mentoring conversation? I would like to learn from your experience and clarify my next career step. We could start with a 20-minute conversation at a time that works for you.',
 mobility:fr?'J’aimerais en savoir plus sur une occasion de mobilité. Pourrions-nous discuter des tâches, des qualifications recherchées, du mécanisme de dotation et de l’échéancier? Je souhaite aussi comprendre les approbations nécessaires.':'I would like to learn more about a mobility opportunity. Could we discuss the duties, qualifications, staffing mechanism and timing? I would also like to understand the approvals required.',
 pool:fr?'Je vous écris pour confirmer les renseignements concernant le bassin auquel ma candidature est associée. Pourriez-vous préciser les qualifications évaluées, la portée et la durée du bassin ainsi que la personne qu’un gestionnaire intéressé devrait contacter?':'I am writing to confirm the details of the pool associated with my application. Could you clarify the qualifications assessed, the pool’s scope and duration, and whom an interested hiring manager should contact?',
 feedback:fr?'J’aimerais obtenir une rétroaction pour orienter mon perfectionnement. Pourrions-nous discuter de ce que j’ai bien démontré, de ce qui manque dans mes exemples et d’une action concrète pour progresser?':'I would appreciate feedback to guide my development. Could we discuss what I demonstrated well, what was missing from my examples and a practical action to improve?',
 language:fr?'J’aimerais discuter d’un plan pour développer ma langue officielle seconde. Pourrions-nous examiner les exigences du travail visé, les possibilités de formation, le temps de pratique et les modalités d’évaluation?':'I would like to discuss a plan to develop my second official language. Could we review the requirements of the work I am interested in, available learning options, practice time and testing arrangements?',
 accommodation:fr?'J’ai besoin de mesures d’adaptation pour participer à l’évaluation. Pourriez-vous m’indiquer la marche à suivre, la personne responsable, les renseignements nécessaires et le moyen sécurisé de les transmettre? J’aimerais confirmer les mesures avant l’évaluation.':'I need accommodation to participate in the assessment. Could you confirm the process, the responsible contact, the information required and a secure way to provide it? I would like to confirm the arrangements before the assessment.'
 };
 const out=[text[f.kind]||text.learning];
 if(topic)out.push((fr?'Mon domaine d’intérêt : ':'My area of interest: ')+topic);
 if(context)out.push((fr?'Contexte : ':'Context: ')+context);
 if(ask)out.push((fr?'Ma demande : ':'My request: ')+ask);
 return out.join('\n\n');
}
function planText(plan,lang){
 const l=k=>t(C.ui[k],lang),out=[l('plan'),'',l('planGoal')+': '+(plan.goal||''),l('startDate')+': '+(plan.start||''),l('reviewDate')+': '+(plan.review||''),''];
 plan.actions.forEach((a,i)=>out.push((i+1)+'. '+a.text,l('stage')+': '+l('day'+a.stage),l('due')+': '+a.due,l('status')+': '+l(a.status),l('evidenceLabel')+': '+a.evidence,l('supportLabel')+': '+a.support,''));
 out.push(l('notes'),plan.notes||'');return out.join('\n');
}
function planCsv(plan,lang){const l=k=>t(C.ui[k],lang),rows=plan.actions.map(a=>[plan.goal,plan.start,plan.review,a.text,l('day'+a.stage),a.due,l(a.status),a.evidence,a.support,plan.notes]);if(!rows.length)rows.push([plan.goal,plan.start,plan.review,'','','','','','',plan.notes]);return csv([[l('planGoal'),l('startDate'),l('reviewDate'),l('actionLabel'),l('stage'),l('due'),l('status'),l('evidenceLabel'),l('supportLabel'),l('notes')],...rows]);}
return {t,normalize,datePlus,guide,filterResources,csv,evidenceText,draftMessage,planText,planCsv};
});
