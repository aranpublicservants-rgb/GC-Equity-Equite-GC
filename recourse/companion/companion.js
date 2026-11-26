/* Adaptive conversation, source-based guidance and the existing on-device language engine. */
(()=>{'use strict';
const $=id=>document.getElementById(id),F=window.RecourseFlow;
const state={lang:'en',answers:{},notes:[],turns:[],history:[],topics:new Set(),cases:[],lastConcern:'',currentPlan:null,engine:null,enginePromise:null,inferencing:false,answerVersion:0,editId:null,forceComplete:false,pending:new Set(),pendingId:null,chosenDraft:null,casesStatus:'loading',allowAI:false};
const bilingual=(en,fr)=>state.lang==='fr'?fr:en;
const elem=(tag,text,parent,className)=>{const x=document.createElement(tag);if(text!==null&&text!==undefined)x.textContent=text;if(className)x.className=className;if(parent)parent.appendChild(x);return x;};
const urlOk=v=>typeof v==='string'&&/^(https:\/\/|\.{1,2}\/)/.test(v);
const sourceLink=(parent,label,url)=>{if(!urlOk(url))return;const x=elem('a',label,parent);x.href=url;if(url.startsWith('https://')){x.target='_blank';x.rel='noopener noreferrer'}return x;};
const clean=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=x=>clean(x).split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>3).slice(0,35);
const L=pair=>pair[state.lang==='fr'?1:0];
const routeUrl=route=>state.lang==='fr'?(route.url_fr||route.url):route.url;
const value=id=>F.values(state.answers,id),has=(id,x)=>F.has(state.answers,id,x);
const facts=()=>F.derive(state.answers);
const routes={
rights:{label:['Human-rights complaint','Plainte en droits de la personne'],
body:['The Canadian Human Rights Commission receives complaints involving prohibited grounds. A complaint is normally made within 12 months of the incident, subject to exceptions. The Commission screens complaints; the Canadian Human Rights Tribunal decides referred cases.',
'La Commission canadienne des droits de la personne reçoit les plaintes liées aux motifs interdits. Le délai habituel est de 12 mois après les faits, sous réserve d’exceptions. La Commission examine les plaintes; le Tribunal se prononce sur les causes renvoyées.'],url:'https://www.chrc-ccdp.gc.ca/node/73'},
accommodation:{label:['Individual accommodation process','Processus d’accommodement individuel'],
body:['Explain the barrier and practical adjustments sought. Ask for an individualized assessment and written response. Medical information should be limited to what is necessary. Religious practices or beliefs may also require accommodation up to undue hardship.',
'Décrivez l’obstacle et les mesures recherchées. Demandez une évaluation individuelle et une réponse écrite. Les renseignements médicaux devraient être limités au nécessaire. Les croyances ou pratiques religieuses peuvent aussi nécessiter un accommodement jusqu’à la contrainte excessive.'],
url:'https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/working-government-canada-duty-accommodate-right-non-discrimination/duty-accommodate-general-process-managers.html'},
staffing:{label:['Staffing complaint, where eligible','Plainte de dotation, si admissible'],
body:['Some internal federal appointments and related decisions may be challenged at the FPSLREB. A qualifying staffing complaint generally must be filed within 15 calendar days of the relevant notice; processes and deadlines vary for other staffing situations.',
'Certaines nominations internes fédérales peuvent être contestées devant la CRTEFP. Une plainte admissible est généralement déposée dans les 15 jours civils suivant l’avis pertinent; d’autres situations ont des règles différentes.'],
url:'https://www.fpslreb-crtespf.gc.ca/en/resources/guides/staffing-complaints-guide.html'},
grievance:{label:['Grievance or union advice','Grief ou conseils syndicaux'],
body:['A grievance may address workplace decisions, discipline, accommodation or collective-agreement provisions. Ask your bargaining agent or qualified adviser which procedure and deadline applies to you.',
'Un grief peut porter sur une décision de travail, la discipline, l’accommodement ou la convention collective. Demandez à une personne syndicale ou compétente quelle procédure et quel délai s’appliquent à votre situation.'],
url:'https://www.fpslreb-crtespf.gc.ca/en/resources/faq.html'},
harassment:{label:['Harassment and violence process','Processus de harcèlement et violence'],
body:['Your employer may have obligations to respond to, prevent and investigate workplace harassment or violence. The process is different from a human-rights damages complaint, and each mechanism has its own purpose.',
'L’employeur peut avoir des obligations de réaction, de prévention et d’enquête en matière de harcèlement ou de violence au travail. Ce processus diffère d’une plainte en droits de la personne demandant une indemnité.'],
url:'https://www.canada.ca/en/employment-social-development/programs/workplace-health-safety/harassment-violence-prevention.html'},
reprisal:{label:['Disclosure and reprisal protections','Divulgation et protection contre les représailles'],
body:['A protected disclosure of wrongdoing may engage the Public Sector Integrity Commissioner or the organization’s designated senior officer. Ordinary workplace retaliation and a disclosure reprisal are not necessarily the same legal route.',
'Une divulgation protégée d’actes répréhensibles peut relever du Commissaire à l’intégrité ou de l’agent supérieur désigné. Les représailles au travail et celles liées à une divulgation ne suivent pas nécessairement le même recours.'],
url:'https://www.psic-ispc.gc.ca/en'},
language:{label:['Official-languages complaint','Plainte relative aux langues officielles'],
body:['Language-of-work rights and linguistic designations may fall under the Official Languages Act. The Commissioner can investigate; staffing decisions may also have separate mechanisms.',
'Les droits liés à la langue de travail et les exigences linguistiques peuvent relever de la Loi sur les langues officielles. Le commissaire peut enquêter; certaines décisions de dotation ont aussi des recours distincts.'],
url:'https://www.clo-ocol.gc.ca/en'},
informal:{label:['Informal assistance or neutral support','Soutien informel ou neutre'],
body:['You can ask an organizational ombuds, where available, for confidential, independent, impartial and informal support. You can also contact your informal conflict management service. Ombuds support is voluntary and does not constitute official notice or a formal filing. Ask about confidentiality limits and check filing deadlines separately.',
'Vous pouvez demander à un ombuds organisationnel, lorsqu’il existe, un soutien confidentiel, indépendant, impartial et informel. Vous pouvez aussi consulter le service de gestion informelle des conflits. La démarche auprès de l’ombuds est volontaire et ne constitue ni un avis officiel ni un dépôt formel. Renseignez-vous sur les limites de confidentialité et vérifiez les délais de dépôt séparément.'],
linkLabel:['Find your ICMS office','Trouver votre bureau SGIC'],
links:[{"label":["Find your organizational ombuds (GCwiki)","Trouver votre ombuds organisationnel (GCwiki)"],"url":"https://wiki.gccollab.ca/Federal_Public_Service_Organizational_Ombuds_Community/Contact_us","url_fr":"https://wiki.gccollab.ca/Communaut%C3%A9_des_ombuds_organisationnels_de_la_fonction_publique/Liste_des_ombuds_par_minist%C3%A8re_ou_agence"},{"label":["About the Ombuds Community (GCwiki)","La communauté des ombuds (GCwiki)"],"url":"https://wiki.gccollab.ca/Federal_Public_Service_Organizational_Ombuds_Community","url_fr":"https://wiki.gccollab.ca/Communaut%C3%A9_des_ombuds_organisationnels_de_la_fonction_publique"}],
url:'https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/harassment-violence/informal-conflict-management-system-services/contact-icms-office.html'}
};

Object.assign(routes,{
 external:{label:['External recruitment: check the PSC process','Recrutement externe : vérifier le processus de la CFP'],body:['An external federal appointment concern can have a different investigation route from an internal staffing complaint. Keep the posted criteria, screening reason and relevant notice; confirm the Public Service Commission’s jurisdiction and process.','Une préoccupation liée à une nomination externe fédérale peut suivre une voie d’enquête différente d’une plainte de dotation interne. Conservez les critères affichés, les motifs d’élimination et l’avis; confirmez la compétence et le processus de la Commission de la fonction publique.'],url:'https://www.canada.ca/en/public-service-commission/services/oversight-activities/investigations/appointment-process-investigations.html'},
 representation:{label:['Concern about union representation','Préoccupation liée à la représentation syndicale'],body:['Ask the union for its reasons, any internal review process and any filing deadline. Where the duty of fair representation applies, arbitrary, discriminatory or bad-faith representation may be challenged. A disagreement with the union’s decision does not itself establish a breach.','Demandez au syndicat ses motifs, les possibilités de révision interne et les délais. Lorsque le devoir de représentation équitable s’applique, une représentation arbitraire, discriminatoire ou de mauvaise foi peut être contestée. Le désaccord avec la décision du syndicat n’établit pas en soi un manquement.'],url:'https://www.fpslreb-crtespf.gc.ca/en/resources/faq.html'},
 employer:{label:['Confirm your employer’s recourse system','Confirmer le régime de recours de votre employeur'],body:['Crown corporations, parliamentary employers, military members and police members do not all use the same complaint or grievance procedures as federal public service employees. Confirm the legal employer, employment status and applicable process before choosing a filing route.','Les sociétés d’État, employeurs parlementaires, militaires et policiers n’utilisent pas tous les mêmes recours que les employés de la fonction publique fédérale. Confirmez l’employeur juridique, le statut d’emploi et le processus applicable avant de choisir un recours.'],url:'../#union'},
 other:{label:['Confirm the correct human rights or labour authority','Confirmer l’autorité compétente en droits de la personne ou en travail'],body:['The federal public service procedures may not apply to this workplace. Identify the legal employer and the province or federal jurisdiction before filing. Ask the relevant human rights or labour authority which process covers your concern.','Les processus de la fonction publique fédérale peuvent ne pas s’appliquer à ce milieu. Identifiez l’employeur juridique et la compétence provinciale ou fédérale avant de déposer une plainte. Demandez à l’autorité compétente en droits de la personne ou en travail quel processus s’applique.'],url:'https://www.chrc-ccdp.gc.ca/node/73'},
 benefits:{label:['Check the plan or payment decision','Vérifier le régime ou la décision de paiement'],body:['For an insurance or pension decision, read the decision letter and the plan’s review or appeal instructions. A plan appeal and an employment grievance can have different rules. Identify the administrator, the decision date and what review is available.','Pour une décision d’assurance ou de pension, consultez la lettre et les instructions de révision ou d’appel du régime. L’appel d’un régime et un grief d’emploi peuvent suivre des règles différentes. Identifiez l’administrateur, la date et les possibilités de révision.'],url:'../#finder'},
 investigation:{label:['Prepare for the investigation or employment meeting','Se préparer à l’enquête ou à la rencontre liée à l’emploi'],body:['Ask for the purpose of the meeting, the allegations or decision being considered, the process and any response date. Seek representation or advice. An investigation, discipline and a harassment-prevention process can have different purposes and review routes.','Demandez l’objet de la rencontre, les allégations ou la décision envisagée, le processus et toute date de réponse. Cherchez de la représentation ou des conseils. L’enquête, la discipline et la prévention du harcèlement peuvent avoir des buts et des recours différents.'],url:'../#finder'}
});
function chosenRoutes(){
 const f=facts(),t=new Set(f.topics),out=[];
 if(!F.answered(state.answers,'issue'))return out;
 if(f.employer==='other')return ['other'];
 if(f.accommodation)out.push('accommodation');
 if(t.has('staffing'))out.push(has('staffing','external')?'external':'staffing');
 if(t.has('harassment'))out.push('harassment');
 if(t.has('reprisal')&&has('reprisal','disclosure'))out.push('reprisal');
 if(t.has('language'))out.push('language');
 if(f.protectedConcern||f.discrimination)out.push('rights');
 if(t.has('union'))out.push('representation');
 if(['crown','parliament','regulated'].includes(f.employer)||(f.employer==='uniformed'&&f.service!=='civilian')||['casual','contractor','applicant'].includes(f.employment))out.push('employer');
 else if(f.main!=='informal')out.push('grievance');
 if(t.has('pay')&&(has('pay','benefits')||has('pay','pension')))out.push('benefits');
 if(t.has('discipline')&&has('discipline','investigation'))out.push('investigation');
 out.push('informal');return [...new Set(out)];
}
function createGuidance(){
 const f=facts(),t=new Set(f.topics),steps=[],nextSteps=[],unknown=[];
 const add=(en,fr)=>steps.push(bilingual(en,fr));
 if(has('urgency','danger'))add('If there is immediate physical danger, get to a safe place and call 911. Ask the employer’s safety or designated response service about immediate protective measures.','En cas de danger physique immédiat, mettez-vous en sécurité et composez le 911. Demandez au service de sécurité ou au service désigné de l’employeur quelles mesures de protection immédiates sont possibles.');
 if(has('notice','yes')||has('notice','verbal')||has('urgency','deadline')||has('urgency','job'))add('Keep the notice or decision and the date you received it or learned of it. Verify the actual filing instructions promptly; a verbal decision or earlier awareness can also matter.','Conservez l’avis ou la décision et la date de réception ou de prise de connaissance. Vérifiez rapidement les instructions de dépôt; une décision verbale ou une connaissance antérieure peut aussi compter.');
 if(f.accommodation){
  if(has('request','not_requested'))add('Describe the workplace barrier, the change you need and how it would help you do the work. Ask how to make an accommodation request and who will respond.','Décrivez l’obstacle au travail, la mesure nécessaire et son utilité pour accomplir le travail. Demandez comment présenter la demande et qui y répondra.');
  else if(has('request','denied')||has('request','partial')||has('request','changed'))add('Ask for the reasons for the accommodation decision in writing, the alternatives considered and how to request a review. Explain which barrier remains.','Demandez par écrit les motifs de la décision d’accommodement, les solutions examinées et les possibilités de révision. Précisez l’obstacle qui persiste.');
  else if(has('request','pending'))add('Ask for an acknowledgement, the next decision step and an expected response date. Explain any immediate barrier and whether an interim adjustment could help.','Demandez un accusé de réception, la prochaine étape et une date de réponse prévue. Décrivez tout obstacle immédiat et l’utilité possible d’une mesure provisoire.');
  else add('Keep a record of the accommodation requested, the employer’s response and the remaining barrier. Ask for an individualized discussion of effective adjustments.','Conservez la demande d’accommodement, la réponse de l’employeur et l’obstacle restant. Demandez un échange individuel sur des mesures efficaces.');
  if(f.grounds.includes('disability')||has('request','information'))add('Ask what supporting information is necessary, why it is needed and who will receive it. Use the designated secure process and avoid unnecessary medical or diagnostic details.','Demandez quels renseignements justificatifs sont nécessaires, pourquoi et à qui ils seront transmis. Utilisez le processus sécurisé désigné et évitez les renseignements médicaux ou diagnostiques inutiles.');
  if(f.grounds.includes('religion'))add('Describe the workplace requirement that conflicts with the belief or practice and the adjustment sought. You can describe the effect without sharing more personal detail than necessary.','Décrivez l’exigence de travail incompatible avec la croyance ou la pratique et la mesure recherchée. Vous pouvez expliquer les effets sans donner plus de renseignements personnels que nécessaire.');
 }
 if(t.has('race')||f.discrimination)add('Record the specific words, conduct or decisions that concerned you, their effects and any recurring pattern you have observed. Include relevant examples or comparisons that you can lawfully retain.','Notez les propos, comportements ou décisions en cause, leurs effets et toute tendance observée. Incluez les exemples ou comparaisons pertinents que vous pouvez conserver légalement.');
 if(t.has('staffing'))add(has('staffing','external')?'Keep the job advertisement, published criteria and exact screening or assessment reason. Ask which Public Service Commission investigation process, if any, applies.':'Keep the actual staffing or retention notice, assessment information and the date you received it. Confirm the process and eligibility before relying on a staffing-complaint deadline.',has('staffing','external')?'Conservez l’affiche, les critères publiés et le motif exact d’élimination ou d’évaluation. Demandez quel processus d’enquête de la CFP s’applique, le cas échéant.':'Conservez l’avis de dotation ou de maintien en poste, les renseignements d’évaluation et la date de réception. Confirmez le processus et l’admissibilité avant de vous fier à un délai de plainte de dotation.');
 if(t.has('reprisal'))add('Keep a chronology of the concern, complaint, safety report or disclosure and the negative treatment that followed. Identify what was reported and who knew about it so the correct protection can be checked.','Conservez une chronologie de la préoccupation, plainte, déclaration de sécurité ou divulgation et du traitement défavorable qui a suivi. Précisez ce qui a été signalé et qui le savait pour vérifier la protection applicable.');
 if(t.has('pay'))add('Keep the payment statements, the plan or agreement provision and any written decision. Identify the amount or benefit affected and the administrator handling it.','Conservez les relevés de paiement, la disposition du régime ou de la convention et toute décision écrite. Précisez le montant ou la prestation touchés et l’administrateur responsable.');
 if(t.has('workforce'))add('Keep every affected, surplus, opting or layoff letter and the applicable workforce-adjustment provisions. Confirm the stage and the response required before choosing an option.','Conservez chaque avis de situation touchée, d’excédentaire, d’option ou de mise en disponibilité ainsi que les dispositions applicables. Confirmez l’étape et la réponse requise avant de choisir une option.');
 if(f.union==='yes'){
  if(has('union_support','helping'))add('Ask your representative to confirm the applicable route, who will take the next step and any filing date. Keep your own copies and proof of delivery.','Demandez à votre représentant de confirmer le recours, la personne responsable de la prochaine étape et les dates de dépôt. Conservez vos copies et preuves de transmission.');
  else if(has('union_support','refused')||has('union_support','concern'))add('Ask the union for its reasons in writing and the internal review or appeal options. Check any separate deadline for a representation complaint without assuming an internal discussion stops it.','Demandez au syndicat ses motifs écrits et les possibilités de révision ou d’appel interne. Vérifiez tout délai distinct de plainte en représentation sans présumer que les échanges internes le suspendent.');
  else add('Contact your union with a short summary, any decision and its date. Ask what representation it can provide and which filing deadline needs attention first.','Contactez votre syndicat avec un bref résumé, la décision et sa date. Demandez quelle représentation il peut offrir et quel délai exige une attention prioritaire.');
 }else if(F.answered(state.answers,'union')||f.employment==='executive')add(f.union==='no'?'Ask the employer’s official recourse contact or a qualified adviser which procedures are available for your employment status. Not having a union does not by itself determine whether a grievance or another remedy is available.':'Check the appointment letter, substantive job group, bargaining-unit information or pay statement and confirm representation with the union or employer. Do not delay checking a deadline while doing so.',f.union==='no'?'Demandez au contact officiel des recours de l’employeur ou à une personne compétente quels processus sont disponibles selon votre statut. L’absence de syndicat ne détermine pas à elle seule si un grief ou une autre réparation est possible.':'Vérifiez la lettre de nomination, le groupe d’attache, les renseignements d’unité de négociation ou le relevé de paye et confirmez la représentation. Vérifiez les délais pendant cette démarche.');
 if(!steps.length)add('Write a short description of what happened, when it happened and what you would like to change. Keep relevant notices and records through permitted channels.','Décrivez brièvement les faits, les dates et le changement souhaité. Conservez les avis et documents pertinents par les moyens autorisés.');
 add('Check the applicable filing deadline while you consider informal support. Informal conversations, requests for records and mediation do not automatically stop that deadline.','Vérifiez le délai de dépôt pendant que vous examinez le soutien informel. Les échanges informels, les demandes de documents et la médiation ne suspendent pas automatiquement ce délai.');
 if(has('response','waiting'))nextSteps.push(bilingual('Ask the office handling the matter for a written status, the next required step and any response date. Confirm how to preserve your rights if the delay continues.','Demandez au bureau responsable un état écrit du dossier, la prochaine étape et toute date de réponse. Confirmez comment préserver vos droits si le retard se poursuit.'));
 else if(has('response','denied')||has('response','partial'))nextSteps.push(bilingual('Keep the reasons and response date. Ask which review, grievance or complaint route can address that decision and verify its deadline before waiting for another informal reply.','Conservez les motifs et la date de réponse. Demandez quel mécanisme de révision, grief ou plainte peut viser cette décision et vérifiez le délai avant d’attendre une autre réponse informelle.'));
 else if(has('response','active'))nextSteps.push(bilingual('Confirm what the current process can decide, who represents you and what you must provide next. Ask whether another applicable deadline continues to run.','Confirmez ce que le processus peut décider, qui vous représente et ce que vous devez fournir ensuite. Demandez si un autre délai applicable continue de courir.'));
 else if(F.answered(state.answers,'issue'))nextSteps.push(bilingual('If the first approach does not resolve the concern, keep the response and check the next eligible review or formal route. You do not have to confront the person involved before seeking confidential advice.','Si la première démarche ne règle pas la situation, conservez la réponse et vérifiez la prochaine révision ou voie formelle admissible. Vous n’avez pas à confronter la personne en cause avant de chercher des conseils confidentiels.'));
 if((f.protectedConcern||f.discrimination)&&f.employer!=='other')nextSteps.push(bilingual('The Canadian Human Rights Commission may require another reasonably available grievance or review process first. Check the Commission’s filing requirements while other steps continue; do not assume they suspend its time limit.','La Commission canadienne des droits de la personne peut exiger d’abord un grief ou un examen raisonnablement disponible. Vérifiez ses exigences de dépôt pendant les autres démarches; ne présumez pas qu’elles suspendent son délai.'));
 if(has('goal','financial'))nextSteps.push(bilingual('Identify what remedy the relevant decision-maker can order and keep a record of losses and expenses. A previous award or settlement does not establish the amount available in your case.','Identifiez les réparations que l’organisme compétent peut ordonner et conservez un relevé des pertes et dépenses. Une indemnité ou un règlement antérieur ne détermine pas le montant disponible dans votre dossier.'));
 for(const id of ['employer','employment','union','notice','timing','grounds']){
  const active=F.questions(state.answers).find(q=>q.id===id);if(!active)continue;
  if(!F.answered(state.answers,id)||value(id).some(x=>['unsure','written','skipped','unknown'].includes(x)))unknown.push(L(active.label||[active.en,active.fr]));
 }
 return {steps:[...new Set(steps)],keys:chosenRoutes(),nextSteps,unknown};
}
function entry(role,text,pair){
 const item={role,en:pair?pair[0]:text,fr:pair?pair[1]:text};state.turns.push(item);
 const log=$('conversation-log'),outer=elem('div',null,log,'turn '+role);
 const label=elem('div',role==='user'?bilingual('You','Vous'):bilingual('Recourse Assistant','Assistant aux recours'),outer,'turn-label');
 label.dataset.en=role==='user'?'You':'Recourse Assistant';label.dataset.fr=role==='user'?'Vous':'Assistant aux recours';
 const content=elem('p',L([item.en,item.fr]),outer,'answer-text');content.dataset.en=item.en;content.dataset.fr=item.fr;
 log.scrollTop=log.scrollHeight;return content;
}
function activeQuestion(){
 if(state.editId){const q=F.schemas[state.editId];if(q)return q;state.editId=null}
 return state.forceComplete?null:F.next(state.answers);
}
function focusQuestion(){
 const h=$('question-heading');h.focus({preventScroll:true});
 const panel=$('question-panel'),r=panel.getBoundingClientRect();
 if(r.top<0||r.top>innerHeight*.55)panel.scrollIntoView({block:'start',behavior:'auto'});
}
function renderQuestion(focus=false){
 const q=activeQuestion(),root=$('suggestions');root.replaceChildren();$('question-source').replaceChildren();$('date-answer').hidden=true;
 $('continue-answer').hidden=true;$('skip-question').hidden=!q;$('previous-question').hidden=!q;
 $('show-guidance').hidden=!F.answered(state.answers,'issue')||!q;
 if(!q){
  state.pendingId=null;
  $('question-progress').textContent=bilingual('YOUR GUIDANCE IS READY','VOS DÉMARCHES POSSIBLES SONT PRÊTES');
  $('question-heading').textContent=bilingual('What would you like to do next?','Que souhaitez-vous faire maintenant?');
  $('question-help').textContent=bilingual('Read your guidance below. You can keep refining it, ask a question or prepare a message.','Consultez vos démarches ci-dessous. Vous pouvez les préciser, poser une question ou préparer un message.');
  for(const [id,en,fr] of [['resume','Answer remaining questions','Répondre aux questions restantes'],['review','Review or change my answers','Revoir ou modifier mes réponses'],['additional','Add another concern','Ajouter une préoccupation'],['message','Prepare a message','Préparer un message'],['cases','See related decisions','Voir les décisions connexes'],['next','What if the first step does not work?','Que faire si la première démarche échoue?']]){
   if(id==='resume'&&!F.next(state.answers))continue;
   const b=elem('button',bilingual(en,fr),root);b.type='button';b.dataset.action=id;b.addEventListener('click',()=>followUp(id));
  }
 }else{
  const order=F.questions(state.answers),index=order.findIndex(x=>x.id===q.id);
  $('question-progress').textContent=(state.editId?bilingual('REVIEW AN ANSWER','REVOIR UNE RÉPONSE'):bilingual('QUESTION ','QUESTION ')+(index>=0?index+1:order.filter(x=>F.answered(state.answers,x.id)).length+1))+' · '+L(q.label||[q.en,q.fr]);
  $('question-heading').textContent=L([q.en,q.fr]);
  const help=q.help?L(q.help):(q.multiple?bilingual('Choose all that fit, then continue. You can also write a response below.','Choisissez tout ce qui convient, puis continuez. Vous pouvez aussi écrire une réponse ci-dessous.'):bilingual('Choose one answer, or write your response below.','Choisissez une réponse ou écrivez ci-dessous.'));
  $('question-help').textContent=help;
  if(state.pendingId!==q.id)state.pending=new Set(value(q.id).filter(x=>q.options.some(o=>o.id===x)));state.pendingId=q.id;
  for(const option of q.options){
   const selected=state.pending.has(option.id),b=elem('button',L([option.en,option.fr]),root);b.type='button';b.dataset.answer=option.id;b.setAttribute('aria-pressed',String(selected));
   b.addEventListener('click',()=>{
    if(!q.multiple){answerQuestion(q.id,[option.id]);return}
    if(state.pending.has(option.id))state.pending.delete(option.id);
    else {if(option.exclusive)state.pending.clear();else for(const o of q.options)if(o.exclusive)state.pending.delete(o.id);state.pending.add(option.id)}
    for(const node of root.querySelectorAll('button[data-answer]'))node.setAttribute('aria-pressed',String(state.pending.has(node.dataset.answer)));
    $('continue-answer').disabled=state.pending.size===0;
   });
  }
  $('continue-answer').hidden=!q.multiple;$('continue-answer').disabled=state.pending.size===0;
  if(q.date){$('date-answer').hidden=false;$('decision-date').value=state.answers.timing?.date||''}
  if(q.source)sourceLink($('question-source'),bilingual('About the grounds protected by the Canadian Human Rights Act','Les motifs protégés par la Loi canadienne sur les droits de la personne'),q.source);
  $('previous-question').disabled=index<=0;
 }
 if(focus)focusQuestion();
}
function answerLabel(id,selected,lang){const def=F.questions(state.answers).find(q=>q.id===id)||F.schemas[id];return selected.map(v=>def.options.find(x=>x.id===v)?.[lang]||(v==='skipped'?(lang==='fr'?'Question passée':'Question skipped'):v==='exact'?(lang==='fr'?'Date indiquée':'Date provided'):(lang==='fr'?'Réponse écrite':'Written response'))).join(', ')}
function acknowledge(id){
 if(id==='urgency'&&has('urgency','danger'))return ['If there is immediate physical danger, get to a safe place and call 911. You can stop here and use the protective steps in your guidance below.','En cas de danger physique immédiat, mettez-vous en sécurité et composez le 911. Vous pouvez arrêter ici et consulter les mesures de protection ci-dessous.'];
 if(id==='issue')return ['We can work through this at your pace. I’ll ask a few questions to understand what matters in your situation.','Nous pouvons avancer à votre rythme. Quelques questions permettront de préciser ce qui compte dans votre situation.'];
 if(id==='grounds')return ['Thank you. More than one ground can be relevant. Let’s look at how the treatment is affecting your work.','Merci. Plusieurs motifs peuvent être pertinents. Examinons les effets du traitement sur votre travail.'];
 if(id==='union'&&has('union','no'))return ['I’ll take that into account and focus on the support and procedures that may be available without union representation.','J’en tiendrai compte pour examiner le soutien et les processus possibles sans représentation syndicale.'];
 if(id==='union'&&has('union','unsure'))return ['That is okay. Your guidance will include how to confirm who represents your position.','Ce n’est pas un problème. Vos démarches comprendront comment confirmer la représentation de votre poste.'];
 if(id==='union_support'&&has('union_support','refused'))return ['That can leave you feeling without support. We can look at the reasons, review options and any separate filing requirements.','Cela peut donner le sentiment d’être sans soutien. Nous pouvons examiner les motifs, les possibilités de révision et les exigences de dépôt distinctes.'];
 if(id==='request'&&has('request','denied'))return ['I’ll include what to ask about the refusal and how to check the next review or recourse step.','J’inclurai les questions à poser sur le refus et les démarches de révision ou de recours à vérifier.'];
 return ['I’ve added that to your guidance below.','J’ai ajouté cette réponse à vos démarches ci-dessous.'];
}
function updateAll(focus=false){
 state.topics=new Set(facts().topics);state.currentPlan=F.answered(state.answers,'issue')?createGuidance():null;
 renderGuidance();renderCases();renderQuestion(focus);$('prepare-message').disabled=!F.answered(state.answers,'issue');$('enable-wording').disabled=!F.answered(state.answers,'issue');state.answerVersion++;
 showStatus(bilingual('Your guidance has been updated.','Vos démarches ont été mises à jour.'));
}
function answerQuestion(id,selected,text='',date=''){
 const wasComplete=!F.next(state.answers);
 state.answers=F.setAnswer(state.answers,id,selected,text,date);state.editId=null;state.forceComplete=false;
 const pair=[answerLabel(id,selected,'en')+(date?' · '+date:'')+(text?' · '+text:''),answerLabel(id,selected,'fr')+(date?' · '+date:'')+(text?' · '+text:'')];
 entry('user',L(pair),pair);state.history.push({role:'user',content:L(pair)});
 if(text){state.notes.push(text);state.lastConcern=state.notes.join(' ').slice(-5000)}
 const ack=acknowledge(id);entry('assistant',L(ack),ack);state.history.push({role:'assistant',content:L(ack)});
 if(id==='urgency'&&selected.includes('danger'))state.forceComplete=true;
 updateAll(true);
 if(!F.next(state.answers))completeConversation(!wasComplete);
}
function completeConversation(generate=true){
 const f=facts();
 const pair=[f.protectedConcern?'We have enough context for a useful starting plan about the treatment you described. Your steps, possible routes, points to verify and related decisions are below. You can change an answer or add another detail at any time.':'Your starting plan is ready below. It brings together practical steps, possible routes and the points that still need checking. You can change an answer or add another detail at any time.',f.protectedConcern?'Nous avons assez de contexte pour établir des démarches utiles sur le traitement décrit. Les étapes, recours possibles, points à vérifier et décisions connexes figurent ci-dessous. Vous pouvez modifier une réponse ou ajouter un détail en tout temps.':'Vos démarches de départ sont prêtes ci-dessous. Elles regroupent les étapes pratiques, recours possibles et points à vérifier. Vous pouvez modifier une réponse ou ajouter un détail en tout temps.'];
 const answer=entry('assistant',L(pair),pair);state.history.push({role:'assistant',content:L(pair)});
 if(has('goal','cases'))$('cases-details').open=true;
 if(generate&&state.allowAI)startAI(state.lastConcern||F.summary(state.answers,state.lang).map(x=>x.value).join('; '),L(pair),answer,state.answerVersion);
}
function handle(message){
 const input=String(message||'').trim().slice(0,1600);if(!input)return;
 if(emergency(input))return;
 const q=activeQuestion(),inferred=F.infer(input);
 // Explicit facts in a typed account can answer later questions without repeating them.
 for(const [id,vals] of Object.entries(inferred))if(id!==q?.id&&!F.answered(state.answers,id))state.answers=F.setAnswer(state.answers,id,vals);
 if(q){
  const date=q.id==='timing'&&/^\d{4}-\d{2}-\d{2}$/.test(input)?input:'';
  let selected=date?['exact']:F.parse(q.id,input);
  if(q.multiple&&state.pending.size&&!selected.some(v=>q.options.some(o=>o.id===v&&o.exclusive)))selected=[...new Set([...state.pending,...selected.filter(v=>v!=='written')])];
  answerQuestion(q.id,selected.length?selected:['written'],input,date);
 }else{
  entry('user',input);state.history.push({role:'user',content:input});state.notes.push(input);state.lastConcern=state.notes.join(' ').slice(-5000);state.forceComplete=false;
  const pair=['I’ve kept that detail. The guidance below has been updated; any new question will help clarify the next step.','J’ai conservé ce détail. Les démarches ci-dessous sont mises à jour; toute nouvelle question servira à préciser la prochaine étape.'];entry('assistant',L(pair),pair);
  updateAll(true);if(!F.next(state.answers))completeConversation(true);
 }
}
function followUp(id){
 if(id==='resume'){state.forceComplete=false;state.editId=null;renderQuestion(true);return}
 if(id==='additional'){state.editId='additional';state.forceComplete=false;renderQuestion(true);return}
 if(id==='review'){$('answer-summary').open=true;$('answer-summary').scrollIntoView({block:'start'});return}
 if(id==='message'){prepareDraft();$('share-section').scrollIntoView({block:'start'});return}
 if(id==='cases'){$('cases-details').open=true;$('cases-details').scrollIntoView({block:'start'});return}
 if(id==='next'){
  const pair=[(state.currentPlan?.nextSteps||[]).join('\n\n'),(state.currentPlan?.nextSteps||[]).join('\n\n')];entry('assistant',L(pair),pair);$('reference-section').scrollIntoView({block:'start'});
 }
}
function renderAnswers(){
 const root=$('answer-list');root.replaceChildren();const answers=F.summary(state.answers,state.lang);$('answer-summary').hidden=!answers.length;
 for(const item of answers){const row=elem('div',null,root,'answer-row'),body=elem('p',null,row);elem('strong',item.label,body);elem('span',item.value||bilingual('Not specified','Non précisé'),body);const b=elem('button',bilingual('Change','Modifier'),row,'text-button');b.type='button';b.setAttribute('aria-label',bilingual('Change: ','Modifier : ')+item.label);b.addEventListener('click',()=>{state.editId=item.id;state.forceComplete=false;renderQuestion(true)})}
}
function renderGuidance(){
 const root=$('route-results');root.replaceChildren();renderAnswers();$('plan-actions').hidden=!state.currentPlan;
 if(!state.currentPlan){$('plan-progress').textContent=bilingual('Your practical steps and source links will appear as you answer.','Les étapes pratiques et les sources apparaîtront au fil de vos réponses.');elem('p',bilingual('Start with the concern that is on your mind. You can skip any question.','Commencez par votre préoccupation. Vous pouvez passer une question.'),root,'small-note');return}
 const g=state.currentPlan,f=facts(),complete=!F.next(state.answers);
 $('plan-progress').textContent=complete?bilingual('Your starting plan is ready. The routes below depend on the facts and the rules that apply to your position.','Vos démarches de départ sont prêtes. Les recours dépendent des faits et des règles applicables à votre poste.'):bilingual('This guidance will become more specific as you answer the next questions. You can use it now or keep going.','Ces démarches se préciseront au fil des prochaines réponses. Vous pouvez déjà les utiliser ou poursuivre.');
 const caution=elem('article',null,root,'route-card caution');elem('h3',bilingual('Keep time limits in view','Gardez les délais à l’esprit'),caution);
 elem('p',bilingual('Check the actual rule for your employer, issue and decision. Informal help does not automatically stop filing deadlines.','Vérifiez la règle applicable à votre employeur, à la question et à la décision. Le soutien informel ne suspend pas automatiquement les délais.'),caution);sourceLink(caution,bilingual('Check filing instructions and time limits','Vérifier les instructions et les délais'), '../#deadlines');
 const d=elem('article',null,root,'route-card');elem('h3',bilingual('Your next steps','Vos prochaines étapes'),d);const list=elem('ol',null,d);g.steps.forEach(x=>elem('li',x,list));
 if(g.nextSteps.length){const more=elem('article',null,root,'route-card');elem('h3',bilingual('If the situation is not resolved','Si la situation n’est pas réglée'),more);g.nextSteps.forEach(x=>elem('p',x,more));if(f.protectedConcern||f.discrimination)sourceLink(more,bilingual('Commission: complaint requirements','Commission : exigences liées aux plaintes'),routes.rights.url)}
 for(const key of g.keys){const r=routes[key];if(!r)continue;const card=elem('article',null,root,'route-card');elem('h3',L(r.label),card);
  let body=L(r.body);
  if(key==='rights'&&!f.protectedConcern)body=bilingual('This route needs a connection to a prohibited ground and federal jurisdiction. If the ground or employer’s jurisdiction is unclear, ask the Commission about its requirements before filing.','Ce recours exige un lien avec un motif interdit et une compétence fédérale. Si le motif ou la compétence sont incertains, demandez à la Commission quelles exigences s’appliquent avant de déposer une plainte.');
  if(key==='grievance'&&!F.answered(state.answers,'employer'))body=bilingual('If your position is covered by the federal public service grievance system, a grievance may be relevant. Confirm your employer, employment status, representation and the applicable deadline first.','Si votre poste relève du régime de griefs de la fonction publique fédérale, un grief peut être pertinent. Confirmez d’abord l’employeur, le statut, la représentation et le délai applicable.');
  if(key==='accommodation'&&!f.grounds.includes('disability'))body=bilingual('Explain the workplace requirement, the barrier it creates and the adjustment sought. Ask for an individualized assessment and a written response. The accommodation process and possible recourse depend on the applicable law and employment arrangements.','Décrivez l’exigence, l’obstacle créé et la mesure recherchée. Demandez une évaluation individuelle et une réponse écrite. Le processus et les recours dépendent du droit et des conditions d’emploi applicables.');
  elem('p',body,card);sourceLink(card,r.linkLabel?L(r.linkLabel):bilingual('Read the relevant guidance','Consulter le guide pertinent'),routeUrl(r));
  for(const link of r.links||[])sourceLink(elem('p',null,card),L(link.label),routeUrl(link));
 }
 if(g.unknown.length){const u=elem('article',null,root,'route-card');elem('h3',bilingual('Details still to confirm','Détails à confirmer'),u);elem('p',g.unknown.join(' · '),u);elem('p',bilingual('An unsure answer is fine. Confirm these details with the relevant office or adviser before relying on a particular filing route.','Il est normal de ne pas savoir. Confirmez ces détails auprès du bureau ou conseiller compétent avant de vous fier à un recours précis.'),u)}
 if(has('goal','financial')){const money=elem('article',null,root,'route-card');elem('h3',bilingual('Costs and possible financial remedies','Coûts et réparations financières possibles'),money);sourceLink(money,bilingual('See payment types, recourse costs and sources','Consulter les types de paiements, les coûts et les sources'),'../#costs');sourceLink(elem('p',null,money),bilingual('Check what a decision-maker can order','Vérifier les réparations possibles'),'../#decisions')}
}
function scoreCase(c){
 const f=facts(),groundMap={race:'race',origin:'race',colour:'race',religion:'religion',disability:'disability',sex:'sex',family:'family',age:'age',gender:'gender-identity',sexual_orientation:'sexual-orientation'};
 const issueMap={discrimination:['race','group'],accommodation:['accommodation','telework'],harassment:['harassment','investigation'],staffing:['staffinternal','staffexternal','serlo'],reprisal:['reprisal'],pay:['pay','benefits'],discipline:['discipline','performance'],workforce:['serlo','wfa'],language:['language'],union:['union']};
 let subject=0;for(const g of f.grounds)if(groundMap[g]&&(c.grounds||[]).includes(groundMap[g]))subject+=16;
 for(const t of f.topics)for(const i of issueMap[t]||[])if((c.issues||[]).includes(i))subject+=5;
 if(!subject)return 0;
 let result=subject;if(c.scope==='Federal public service')result+=7;if(c.scope==='Not an employment dispute')result-=30;
 const text=clean([c.title,c.what,c.outcome].join(' '));words(state.lastConcern).slice(0,8).forEach(w=>{if(text.includes(w))result+=1});return result;
}
function related(){
 if(!F.answered(state.answers,'issue'))return [];
 const candidates=state.cases.map(c=>({case:c,score:scoreCase(c)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 const out=[],seen=new Set();
 for(const status of ['allowed','dismissed']){const x=candidates.find(x=>x.case.status===status);if(x){out.push(x.case);seen.add(x.case.id)}}
 for(const x of candidates)if(out.length<3&&!seen.has(x.case.id)){out.push(x.case);seen.add(x.case.id)}
 return out;
}
function renderCases(){
 const root=$('related-cases');root.replaceChildren();if(state.casesStatus==='loading'){elem('p',bilingual('Loading related decisions…','Chargement des décisions connexes…'),root,'small-note');return}if(state.casesStatus==='error'){elem('p',bilingual('Related decisions could not load. Your guidance remains available. Try again or open the decision library.','Impossible de charger les décisions connexes. Vos démarches restent disponibles. Réessayez ou consultez la bibliothèque.'),root,'small-note');const retry=elem('button',bilingual('Try again','Réessayer'),root,'secondary-button');retry.type='button';retry.addEventListener('click',loadCases);return}const found=related();
 if(!found.length){elem('p',bilingual('As your concern becomes clearer, related decisions will appear here. You can also search the full library.','Des décisions connexes apparaîtront à mesure que votre préoccupation se précise. Vous pouvez aussi consulter la bibliothèque complète.'),root,'small-note');return}
 for(const c of found){const d=elem('article',null,root,'case-card');elem('h3',c.title,d);elem('p',[c.citation,c.body,c.scope].filter(Boolean).join(' · '),d,'meta');elem('p',state.lang==='fr'?(c.what_fr||c.what):c.what,d);const details=elem('details',null,d);elem('summary',bilingual('Reasons and outcome','Motifs et résultat'),details);elem('p',state.lang==='fr'?(c.factors_fr||c.factors):c.factors,details);elem('p',state.lang==='fr'?(c.outcome_fr||c.outcome):c.outcome,details);if(c.sourceNote)elem('p',state.lang==='fr'?(c.sourceNote_fr||c.sourceNote):c.sourceNote,details,'small-note');if(c.finding==='not-separately-classified')elem('p',bilingual('The discrimination finding has not been separately classified.','La conclusion sur la discrimination n’a pas été classifiée séparément.'),d,'meta');if(['secondary-summary','representative-statement'].includes(c.sourceType))elem('p',bilingual('This source is a published summary or statement, not independently verified full reasons.','Cette source est un résumé ou une déclaration publiée, et non une décision intégrale vérifiée indépendamment.'),d,'meta');sourceLink(d,bilingual('Read the source','Lire la source'),state.lang==='fr'?(c.url_fr||c.url):c.url)}
}
async function loadCases(){state.casesStatus='loading';renderCases();try{const response=await fetch('../data/cases.json',{credentials:'omit'});if(!response.ok)throw Error('unavailable');const data=await response.json();state.cases=(data.cases||[]).filter(c=>c&&c.id&&c.title&&c.citation&&c.url&&c.what);state.casesStatus='ready'}catch(e){state.cases=[];state.casesStatus='error'}renderCases()}
function showStatus(message){$('assistant-state').textContent=message}
function promptFor(message){
 const plan=state.currentPlan||createGuidance();return JSON.stringify({currentConcern:message,answers:F.summary(state.answers,state.lang),personalDetailsToVerify:plan.unknown,practicalSteps:plan.steps,ifUnresolved:plan.nextSteps,sourceLinkedRoutes:plan.keys.map(key=>({route:L(routes[key].label),description:L(routes[key].body),url:routeUrl(routes[key]),additionalSources:(routes[key].links||[]).map(link=>({label:L(link.label),url:routeUrl(link)}))})),relatedDecisions:related().map(c=>({citation:c.citation,what:state.lang==='fr'?c.what_fr:c.what,outcome:state.lang==='fr'?c.outcome_fr:c.outcome,source:state.lang==='fr'?(c.url_fr||c.url):c.url,sourceType:c.sourceType,sourceNote:state.lang==='fr'?(c.sourceNote_fr||c.sourceNote):c.sourceNote}))}).slice(0,13500);
}
const systemPrompt=language=>'You are an automated, equity-informed support companion for Canadian federal public servants. Respond with care and respect, taking concerns about racism, disability, religion, harassment and power imbalance seriously without declaring a legal violation proven. The structured questionnaire has already gathered answers. The interface controls all follow-up questions and answer choices. Do not ask a new question or invent missing facts. Summarize the practical next step using ONLY the supplied source-linked guidance. Do not invent deadlines, rights, outcomes, eligibility, contacts or remedies. Do not tell the person to contact ARAN, send a report, or connect with a peer. No private information leaves the conversation. Write in '+language+' in 70–130 words with two short paragraphs. Refer the person to their detailed guidance below. Do not output internal reasoning, thinking tags, headings or model names.';
const critical=/suicid|kill myself|harm myself|end my life|me tuer|me suicid|en finir avec ma vie|immediate physical danger|danger immediat/i;
function emergency(text){
 if(!critical.test(text))return false;
 const reply=bilingual('If anyone is in immediate danger, call 911. In Canada, call or text 988 for suicide crisis support. You deserve immediate support from a real person.','En cas de danger immédiat, composez le 911. Au Canada, appelez ou textez le 988 pour obtenir du soutien en situation de crise suicidaire. Vous méritez l’aide immédiate d’une personne réelle.');
 entry('assistant',reply);$('assistant-state').textContent='';return true;
}
async function ensureAI(){
 if(state.engine)return state.engine;
 if(state.enginePromise)return state.enginePromise;
 if(!navigator.gpu)return null;
 state.enginePromise=(async()=>{
   try{
     const lib=await import('https://esm.run/@mlc-ai/web-llm@0.2.88');
     if(!lib.CreateMLCEngine)throw Error('library unavailable');
     const engine=await lib.CreateMLCEngine('Qwen3-0.6B-q4f16_1-MLC',{initProgressCallback:()=>{}});
     state.engine=engine;return engine;
   }catch(e){return null}
 })();
 return state.enginePromise;
}
async function startAI(message,baseline,answer,version){
 if(state.inferencing)return;
 if(!navigator.gpu){showStatus(bilingual('Guidance and sources are ready.','Les conseils et les sources sont prêts.'));return}
 showStatus(bilingual('Considering your question…','Examen de votre question…'));
 const engine=await ensureAI();
 if(!engine){showStatus(bilingual('Guidance and sources are ready.','Les conseils et les sources sont prêts.'));return}
 if(version!==state.answerVersion){showStatus('');return}
 state.inferencing=true;
 try{
   const context=promptFor(message);
   const output=await engine.chat.completions.create({messages:[{role:'system',content:systemPrompt(state.lang==='fr'?'French':'English')},{role:'user',content:'/no_think\nUse this source-based context and respond to the person: '+context}],temperature:0.15,max_tokens:430});
   const raw=output?.choices?.[0]?.message?.content||'';
   const finalText=raw.includes('</think>')?raw.split('</think>').slice(-1)[0]:raw;
   const text=finalText.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<think>[\s\S]*$/gi,'').replace(/<\/?think>/gi,'').trim();
   if(text&&version===state.answerVersion&&text.length>=35){
     answer.textContent=text;answer.dataset[state.lang]=text;
     if(state.history.length&&state.history[state.history.length-1].role==='assistant')state.history[state.history.length-1].content=text;
   }
 }catch(e){}finally{state.inferencing=false;showStatus('')}
}

function messageText(audience){
 const intro=audience==='union'?bilingual('I would appreciate advice on workplace recourse, representation and any applicable filing deadlines.','Je souhaiterais obtenir des conseils sur les recours au travail, la représentation et les délais de dépôt.'):
 audience==='manager'?bilingual('I would like to discuss a workplace concern and request a respectful review of the situation.','J’aimerais discuter d’une préoccupation au travail et demander un examen respectueux de la situation.'):
 audience==='advisor'?bilingual('I would appreciate a confidential conversation about my workplace concern and the options available.','Je souhaiterais avoir une conversation confidentielle au sujet de ma préoccupation au travail et de mes options.'):
 bilingual('I am dealing with a concern at work and would appreciate your perspective and support.','Je vis une situation préoccupante au travail et j’apprécierais votre écoute et votre soutien.');
 const selected=F.summary(state.answers,state.lang).filter(x=>['issue','details','grounds','situation','request','adjustment','staffing','staffing_event','reprisal','discipline','pay','workforce','language','notice','timing','goal'].includes(x.id));
 const factsText=selected.map(x=>x.label+': '+x.value).join('\n');
 const written=state.notes.slice(0,2).join('\n').slice(0,1000);
 return bilingual('Hello,','Bonjour,')+'\n\n'+intro+'\n\n'+factsText+(written?'\n\n'+bilingual('In my own words:','Dans mes mots :')+'\n'+written:'')+'\n\n'+bilingual('I would like to understand which steps are available, what needs attention first and what information would help. Could we discuss how to proceed?','Je souhaite comprendre les démarches disponibles, les priorités et les renseignements utiles. Pourrions-nous discuter de la suite?')+'\n\n'+bilingual('Thank you.','Merci.');
}
function prepareDraft(){
 $('draft-panel').hidden=false;$('draft-text').value=messageText($('audience').value);$('draft-status').textContent=bilingual('Review and edit before copying.','Relisez et modifiez avant de copier.');$('draft-text').focus();
}
async function copyDraft(){const text=$('draft-text').value.trim();if(!text)return;try{await navigator.clipboard.writeText(text);$('draft-status').textContent=bilingual('Copied. You choose who receives it.','Copié. Vous choisissez le destinataire.')}catch(e){$('draft-text').focus();$('draft-text').select();$('draft-status').textContent=bilingual('Select the text and copy it.','Sélectionnez le texte et copiez-le.')}}
function guidanceText(){
 const lines=[bilingual('My recourse guidance','Mes démarches de recours'),...F.summary(state.answers,state.lang).map(x=>x.label+': '+x.value)]; for(const card of $('route-results').children){lines.push(card.innerText);for(const a of card.querySelectorAll('a'))lines.push(a.href)} return lines.join('\n\n');
}
async function copyGuidance(){
 const text=guidanceText();
 try{await navigator.clipboard.writeText(text);$('plan-status').textContent=bilingual('Guidance copied.','Démarches copiées.')}catch(e){$('plan-status').textContent=bilingual('Select the guidance text and copy it.','Sélectionnez le texte des démarches et copiez-le.')}
}
function language(to,focus=false){
 state.lang=to;state.answerVersion++;document.documentElement.lang=to;
 for(const node of document.querySelectorAll('[data-en][data-fr]'))node.textContent=node.getAttribute('data-'+to);
 $('switch-language').textContent=to==='en'?'Français':'English';$('switch-language').lang=to==='en'?'fr':'en';
 $('user-message').placeholder=$('user-message').getAttribute('data-placeholder-'+to);
 if(F.answered(state.answers,'issue'))state.currentPlan=createGuidance();
 renderGuidance();renderCases();renderQuestion(focus);$('prepare-message').disabled=!F.answered(state.answers,'issue');$('enable-wording').disabled=!F.answered(state.answers,'issue');
}
function initialize(){
 if(!F){$('assistant-state').textContent='The question choices could not load. Please refresh the page.';return}
 language(new URLSearchParams(location.search).get('lang')==='fr'?'fr':'en');
 const greeting=['I’m here to help you understand your options. You can choose answers, add details or skip a question. Start with what is concerning you.','Je suis ici pour vous aider à comprendre vos options. Vous pouvez choisir des réponses, ajouter des détails ou passer une question. Commencez par ce qui vous préoccupe.'];entry('assistant',L(greeting),greeting);
 loadCases();
 $('message-form').addEventListener('submit',e=>{e.preventDefault();const text=$('user-message').value.trim();if(!text){$('user-message').focus();return}$('user-message').value='';handle(text)});
 $('continue-answer').addEventListener('click',()=>{const q=activeQuestion();if(q&&state.pending.size)answerQuestion(q.id,[...state.pending])});
 $('skip-question').addEventListener('click',()=>{const q=activeQuestion();if(q)answerQuestion(q.id,q.options.some(x=>x.id==='unsure')?['unsure']:['skipped'])});
 $('previous-question').addEventListener('click',()=>{const q=activeQuestion(),all=F.questions(state.answers),i=all.findIndex(x=>x.id===q?.id);if(i>0){state.editId=all[i-1].id;renderQuestion(true)}});
 $('show-guidance').addEventListener('click',()=>{state.forceComplete=true;state.editId=null;renderQuestion();$('reference-section').scrollIntoView({block:'start'});$('reference-heading').focus({preventScroll:true})});
 $('use-date').addEventListener('click',()=>{const date=$('decision-date').value;if(!date){$('decision-date').focus();return}answerQuestion('timing',['exact'],'',date)});
 $('switch-language').addEventListener('click',()=>language(state.lang==='en'?'fr':'en',true));
 $('clear').addEventListener('click',()=>{state.answers={};state.notes=[];state.turns=[];state.history=[];state.topics=new Set();state.lastConcern='';state.currentPlan=null;state.answerVersion++;state.editId=null;state.forceComplete=false;state.pending=new Set();state.pendingId=null;$('conversation-log').replaceChildren();$('draft-panel').hidden=true;$('draft-text').value='';$('user-message').value='';$('answer-summary').open=false;showStatus('');language(state.lang);entry('assistant',L(greeting),greeting);renderQuestion(true)});
 $('prepare-message').addEventListener('click',prepareDraft);$('audience').addEventListener('change',prepareDraft);$('copy-draft').addEventListener('click',copyDraft);
 $('download-guidance').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([guidanceText()],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=state.lang==='fr'?'mes-demarches-recours.txt':'my-recourse-guidance.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('plan-status').textContent=bilingual('Guidance downloaded.','Démarches téléchargées.')});$('enable-wording').addEventListener('click',()=>{state.allowAI=true;completeConversation(true)});$('copy-guidance').addEventListener('click',copyGuidance);$('print-guidance').addEventListener('click',()=>window.print());
}
initialize();
})();

