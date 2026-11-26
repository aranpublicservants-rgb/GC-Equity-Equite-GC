/* Question selection and answer state for the existing Recourse Assistant. */
(function(root,factory){
  const flow=factory();
  if(typeof module==='object'&&module.exports)module.exports=flow;
  else root.RecourseFlow=flow;
})(typeof window==='object'?window:this,function(){'use strict';
const opt=(id,en,fr,exclusive=false)=>({id,en,fr,exclusive});
const unsure=()=>opt('unsure','I’m not sure','Je ne sais pas',true);
const other=()=>opt('other','Something else','Autre chose');
const issues=[
 opt('discrimination','Racism or discrimination','Racisme ou discrimination'),
 opt('disability','Disability accommodation','Accommodement lié au handicap'),
 opt('religion','Religious accommodation','Accommodement religieux'),
 opt('accommodation','Another accommodation need','Autre besoin d’accommodement'),
 opt('harassment','Harassment, bullying or violence','Harcèlement, intimidation ou violence'),
 opt('reprisal','Retaliation after speaking up','Représailles après avoir parlé'),
 opt('staffing','Hiring, promotion or a staffing decision','Embauche, promotion ou décision de dotation'),
 opt('pay','Pay, leave, benefits or pension','Paye, congés, avantages ou pension'),
 opt('discipline','Discipline, investigation or job loss','Discipline, enquête ou perte d’emploi'),
 opt('workforce','Workforce adjustment or layoff','Réaménagement des effectifs ou mise en disponibilité'),
 opt('language','Official-language requirements or rights','Exigences ou droits linguistiques'),
 opt('union','A problem with union representation','Problème de représentation syndicale'),
 opt('informal','Confidential advice or support','Conseils confidentiels ou soutien'),
 other(),unsure()
];
const grounds=[
 opt('race','Race','Race'),opt('origin','National or ethnic origin','Origine nationale ou ethnique'),
 opt('colour','Colour','Couleur'),opt('religion','Religion or religious belief','Religion ou croyance religieuse'),
 opt('disability','Disability, including a health condition','Handicap, y compris un état de santé'),
 opt('sex','Sex, pregnancy or childbirth','Sexe, grossesse ou accouchement'),
 opt('sexual_orientation','Sexual orientation','Orientation sexuelle'),opt('gender','Gender identity or expression','Identité ou expression de genre'),
 opt('age','Age','Âge'),opt('marital','Marital status','État matrimonial'),opt('family','Family or caregiving responsibilities','Situation de famille ou responsabilités de proche aidant'),
 opt('genetic','Genetic characteristics','Caractéristiques génétiques'),
 opt('record','A pardoned conviction or suspended record','Condamnation avec pardon ou suspension du casier'),
 opt('none','No ground identified','Aucun motif identifié',true),other(),unsure(),
 opt('private','I’d rather not say','Je préfère ne pas le préciser',true)
];
const q=(id,en,fr,options,extra={})=>({id,en,fr,options,multiple:false,...extra});
const schemas={
 issue:q('issue','What would you like help with?','Quel soutien recherchez-vous?',issues,{label:['Main concern','Préoccupation principale'],help:['Choose the main concern for now. You can add another later.','Choisissez d’abord la préoccupation principale. Vous pourrez en ajouter une autre.']}),
 additional:q('additional','What else should we take into account?','Que faut-il aussi prendre en compte?',issues.filter(x=>!['unsure','other'].includes(x.id)).concat(opt('none','No other concern','Aucune autre préoccupation',true)),{multiple:true,label:['Other concerns','Autres préoccupations']}),
 details:q('details','Which description is closest to the problem?','Quelle description se rapproche du problème?',issues.filter(x=>!['informal'].includes(x.id)),{label:['More about the concern','Précisions sur la préoccupation']}),
 grounds:q('grounds','What do you think the treatment is connected to?','À quoi le traitement vous semble-t-il lié?',grounds,{multiple:true,label:['Grounds or circumstances','Motifs ou circonstances'],help:['Choose all that fit. You do not need to establish discrimination here.','Choisissez tout ce qui convient. Vous n’avez pas à établir la discrimination ici.'],source:'https://www.chrc-ccdp.gc.ca/individuals/human-rights/about-discrimination'}),
 situation:q('situation','Where does the unfair treatment show up?','Où le traitement injuste se manifeste-t-il?',[
 opt('comments','Comments, exclusion or day-to-day treatment','Commentaires, exclusion ou traitement quotidien'),
 opt('opportunities','Assignments, training or career opportunities','Tâches, formation ou possibilités de carrière'),
 opt('staffing','Hiring, assessment or promotion','Embauche, évaluation ou promotion'),
 opt('discipline','Performance assessment or discipline','Évaluation du rendement ou discipline'),
 opt('pay','Pay, leave or benefits','Paye, congés ou avantages'),
 opt('accommodation','A rule, work arrangement or accommodation','Règle, organisation du travail ou accommodement'),
 opt('pattern','A recurring pattern affecting several people','Tendance récurrente touchant plusieurs personnes'),other(),unsure()
 ],{multiple:true,label:['What is happening','Ce qui se passe']}),
 urgency:q('urgency','Is anything urgent right now?','Y a-t-il une urgence actuellement?',[
 opt('danger','Immediate physical danger','Danger physique immédiat'),
 opt('deadline','A notice or filing deadline may be close','Un avis ou un délai de dépôt pourrait être imminent'),
 opt('job','My job, pay or immediate working conditions are at risk','Mon emploi, ma paye ou mes conditions immédiates sont menacés'),
 opt('ongoing','It is ongoing, without an immediate emergency','La situation se poursuit, sans urgence immédiate'),
 opt('no','No immediate urgency','Aucune urgence immédiate'),unsure()
 ],{label:['Urgency','Urgence']}),
 harassment:q('harassment','Which behaviour is concerning you?','Quel comportement vous préoccupe?',[
 opt('bullying','Repeated bullying, humiliation or exclusion','Intimidation, humiliation ou exclusion répétées'),
 opt('sexual','Sexual comments, conduct or harassment','Commentaires, comportements ou harcèlement sexuels'),
 opt('threats','Threats, physical violence or intimidation','Menaces, violence physique ou intimidation'),
 opt('online','Messages, online conduct or cyberbullying','Messages, comportements en ligne ou cyberintimidation'),
 opt('conflict','Conflict or disrespect that I want to understand','Conflit ou manque de respect que je veux comprendre'),other(),unsure()
 ],{multiple:true,label:['Behaviour','Comportement']}),
 request:q('request','What has happened with the accommodation request?','Où en est la demande d’accommodement?',[
 opt('not_requested','I have not made a request yet','Je n’ai pas encore fait de demande'),
 opt('pending','I asked and am waiting for a response','J’ai fait une demande et j’attends une réponse'),
 opt('denied','It was refused','Elle a été refusée'),
 opt('partial','An adjustment was offered but it does not meet the need','Une mesure a été proposée, mais elle ne répond pas au besoin'),
 opt('changed','An existing arrangement was removed or changed','Une mesure existante a été retirée ou modifiée'),
 opt('information','I was asked for medical or other supporting information','On m’a demandé des renseignements médicaux ou justificatifs'),unsure()
 ],{label:['Accommodation request','Demande d’accommodement']}),
 adjustment:q('adjustment','What type of adjustment or barrier is involved?','Quel type de mesure ou d’obstacle est en cause?',[
 opt('schedule','Hours, breaks, prayer time or religious observance','Horaire, pauses, prière ou observance religieuse'),
 opt('location','Work location, telework or commuting','Lieu de travail, télétravail ou déplacement'),
 opt('duties','Duties, workload or how the work is done','Tâches, charge de travail ou méthodes de travail'),
 opt('access','Physical access, equipment or technology','Accès physique, équipement ou technologie'),
 opt('communication','Communication, sensory or learning needs','Communication, besoins sensoriels ou d’apprentissage'),
 opt('leave','Leave, treatment or a return to work','Congé, traitement ou retour au travail'),
 opt('practice','Dress, food or another religious practice','Tenue, alimentation ou autre pratique religieuse'),other(),unsure()
 ],{multiple:true,label:['Adjustment or barrier','Mesure ou obstacle'],help:['A general description is enough. Do not provide a diagnosis or medical records.','Une description générale suffit. Ne fournissez pas de diagnostic ni de dossier médical.']}),
 staffing:q('staffing','What kind of staffing process is involved?','De quel processus de dotation s’agit-il?',[
 opt('internal','An internal appointment or promotion','Nomination ou promotion interne'),
 opt('external','An external recruitment process','Recrutement externe'),
 opt('serlo','Selection for retention or layoff (SERLO)','Sélection pour maintien en poste ou mise en disponibilité (SMPMD)'),
 opt('unknown','I do not know whether it was internal or external','Je ne sais pas si le processus était interne ou externe')
 ],{label:['Staffing process','Processus de dotation']}),
 staffing_event:q('staffing_event','Which part of the process concerns you?','Quelle partie du processus vous préoccupe?',[
 opt('screened','I was screened out or found ineligible','Ma candidature a été éliminée ou jugée inadmissible'),
 opt('assessment','An assessment, interview or test','Évaluation, entrevue ou test'),
 opt('appointment','The selection or appointment decision','Décision de sélection ou de nomination'),
 opt('access','An accommodation or accessibility barrier','Obstacle à l’accommodement ou à l’accessibilité'),
 opt('language','Language requirements or assessment','Exigences ou évaluation linguistiques'),
 opt('reasons','I need reasons, records or feedback','J’ai besoin de motifs, de documents ou de rétroaction'),other(),unsure()
 ],{multiple:true,label:['Staffing concern','Préoccupation de dotation']}),
 reprisal:q('reprisal','What happened before the negative treatment?','Qu’est-ce qui a précédé le traitement défavorable?',[
 opt('concern','I raised a workplace concern','J’ai soulevé une préoccupation au travail'),
 opt('grievance','I filed or helped with a grievance or human rights complaint','J’ai déposé ou aidé à déposer un grief ou une plainte en droits de la personne'),
 opt('disclosure','I made a disclosure of wrongdoing','J’ai fait une divulgation d’actes répréhensibles'),
 opt('safety','I raised a health, safety, harassment or violence concern','J’ai signalé une préoccupation de santé, sécurité, harcèlement ou violence'),
 opt('union','I took part in union activity','J’ai participé à une activité syndicale'),
 opt('accommodation','I asked for accommodation','J’ai demandé un accommodement'),other(),unsure()
 ],{multiple:true,label:['What preceded the treatment','Ce qui a précédé le traitement']}),
 discipline:q('discipline','Which action or process are you facing?','Quelle mesure ou procédure vous concerne?',[
 opt('investigation','An investigation or allegations','Enquête ou allégations'),
 opt('performance','A performance assessment or improvement plan','Évaluation du rendement ou plan d’amélioration'),
 opt('warning','A warning or reprimand','Avertissement ou réprimande'),
 opt('suspension','Suspension, demotion or financial penalty','Suspension, rétrogradation ou sanction financière'),
 opt('dismissal','Dismissal or termination','Licenciement ou cessation d’emploi'),
 opt('probation','A probation decision','Décision liée au stage probatoire'),other(),unsure()
 ],{label:['Employment action','Mesure d’emploi']}),
 pay:q('pay','What payment or benefit is affected?','Quelle rémunération ou prestation est touchée?',[
 opt('salary','Salary, overtime or allowances','Salaire, heures supplémentaires ou indemnités'),
 opt('phoenix','Phoenix pay errors or damages','Erreurs de paye ou dommages liés à Phénix'),
 opt('leave','Leave or leave pay','Congés ou rémunération des congés'),
 opt('benefits','Health or disability insurance benefits','Assurance santé ou invalidité'),
 opt('pension','Pension or retirement benefits','Pension ou prestations de retraite'),other(),unsure()
 ],{multiple:true,label:['Payment or benefit','Rémunération ou prestation']}),
 workforce:q('workforce','What notice or workforce-adjustment stage are you at?','À quelle étape du réaménagement des effectifs êtes-vous?',[
 opt('affected','I have an affected letter','J’ai reçu un avis de situation touchée'),
 opt('surplus','I am surplus or have an opting decision','Je suis excédentaire ou dois choisir une option'),
 opt('serlo','I am being assessed for retention or layoff','Je suis évalué pour le maintien en poste ou la mise en disponibilité'),
 opt('layoff','I have a layoff notice','J’ai reçu un avis de mise en disponibilité'),
 opt('options','I need help understanding options or alternation','Je veux comprendre les options ou l’échange de postes'),other(),unsure()
 ],{label:['Workforce-adjustment stage','Étape du réaménagement']}),
 language:q('language','Which language issue is involved?','Quelle question linguistique est en cause?',[
 opt('profile','The language profile of a position','Profil linguistique d’un poste'),
 opt('test','A language test or assessment','Test ou évaluation linguistique'),
 opt('work','My ability to use my official language at work','Possibilité d’utiliser ma langue officielle au travail'),
 opt('access','Career access or accommodation related to language','Accès à la carrière ou accommodement lié à la langue'),other(),unsure()
 ],{multiple:true,label:['Language concern','Question linguistique']}),
 employer:q('employer','Which workplace setting applies to you?','Quel milieu de travail correspond à votre situation?',[
 opt('federal','A federal department or public service agency','Ministère ou organisme de la fonction publique fédérale'),
 opt('crown','A Crown corporation','Société d’État'),
 opt('uniformed','The Canadian Armed Forces or RCMP','Forces armées canadiennes ou GRC'),
 opt('parliament','A parliamentary employer','Employeur parlementaire'),
 opt('regulated','Another federally regulated employer','Autre employeur sous réglementation fédérale'),
 opt('other','A provincial, municipal or other workplace','Milieu provincial, municipal ou autre'),unsure()
 ],{label:['Workplace setting','Milieu de travail'],help:['Different employers can have different recourse systems. You can also type the organization’s name.','Les employeurs peuvent avoir des régimes de recours différents. Vous pouvez aussi écrire le nom de l’organisation.']}),
 service:q('service','Which role applies?','Quel rôle correspond à votre situation?',[
 opt('caf','Canadian Armed Forces member','Membre des Forces armées canadiennes'),
 opt('rcmp','RCMP regular member','Membre régulier de la GRC'),
 opt('civilian','Civilian public service employee','Employé civil de la fonction publique'),unsure()
 ],{label:['Service role','Rôle']}),
 employment:q('employment','What is your employment situation?','Quelle est votre situation d’emploi?',[
 opt('indeterminate','Indeterminate employee','Emploi pour une période indéterminée'),
 opt('term','Term or acting employee','Emploi pour une durée déterminée ou nomination intérimaire'),
 opt('executive','Executive or another unrepresented position','Poste de direction ou autre poste non représenté'),
 opt('casual','Casual employee or student','Emploi occasionnel ou étudiant'),
 opt('contractor','Contractor','Travail à contrat'),
 opt('former','Former employee','Ancien employé'),
 opt('applicant','Applicant who is not currently an employee','Candidat qui n’est pas actuellement employé'),unsure()
 ],{label:['Employment situation','Situation d’emploi']}),
 union:q('union','Do you have a union or a collective agreement?','Avez-vous un syndicat ou une convention collective?',[
 opt('yes','Yes','Oui'),opt('no','No','Non'),unsure()
 ],{label:['Union or collective agreement','Syndicat ou convention collective']}),
 union_support:q('union_support','What has happened with union support?','Où en est le soutien syndical?',[
 opt('not_contacted','I have not contacted the union yet','Je n’ai pas encore contacté le syndicat'),
 opt('waiting','I contacted the union and am waiting','J’ai contacté le syndicat et j’attends'),
 opt('helping','The union is helping me','Le syndicat m’aide'),
 opt('refused','The union declined or stopped helping','Le syndicat a refusé ou cessé de m’aider'),
 opt('concern','I am concerned about how the union is representing me','La façon dont le syndicat me représente me préoccupe'),unsure()
 ],{label:['Union support','Soutien syndical']}),
 notice:q('notice','Have you received a written decision, refusal or notice?','Avez-vous reçu une décision, un refus ou un avis écrit?',[
 opt('yes','Yes','Oui'),opt('verbal','Only a verbal decision so far','Seulement une décision verbale'),
 opt('ongoing','The situation is ongoing without a single decision','La situation se poursuit sans décision unique'),
 opt('no','No decision or notice yet','Aucune décision ni aucun avis pour le moment'),unsure()
 ],{label:['Decision or notice','Décision ou avis']}),
 timing:q('timing','When did you receive it or learn about the decision?','Quand avez-vous reçu l’avis ou pris connaissance de la décision?',[
 opt('today','Today','Aujourd’hui'),opt('week','Within the last 7 days','Au cours des 7 derniers jours'),
 opt('fortnight','Between 8 and 15 days ago','Il y a entre 8 et 15 jours'),
 opt('older','More than 15 days ago','Il y a plus de 15 jours'),unsure()
 ],{date:true,label:['Timing','Date ou période'],help:['Use an approximate period or enter the date. This does not calculate a filing deadline.','Choisissez une période approximative ou indiquez une date. Cela ne calcule pas le délai de dépôt.']}),
 tried:q('tried','What have you already tried?','Qu’avez-vous déjà essayé?',[
 opt('none','I have not taken a step yet','Je n’ai pas encore entrepris de démarche',true),
 opt('manager','Spoke with a manager','Parlé à un gestionnaire'),opt('hr','Contacted HR or the accommodation team','Contacté les RH ou l’équipe d’accommodement'),
 opt('union','Contacted the union','Contacté le syndicat'),opt('informal','Contacted an ombuds or informal conflict service','Contacté un ombuds ou un service de gestion informelle'),
 opt('grievance','Started a grievance or formal employment complaint','Déposé un grief ou une plainte formelle liée à l’emploi'),
 opt('rights','Contacted a human rights commission','Contacté une commission des droits de la personne'),
 opt('prevention','Reported harassment or violence through the employer’s process','Signalé le harcèlement ou la violence par le processus de l’employeur'),
 opt('records','Asked for reasons or records','Demandé les motifs ou des documents'),other(),unsure()
 ],{multiple:true,label:['Steps already taken','Démarches déjà entreprises']}),
 response:q('response','What response have you received so far?','Quelle réponse avez-vous reçue jusqu’ici?',[
 opt('waiting','I am waiting or there has been a delay','J’attends ou il y a un retard'),
 opt('denied','My request or complaint was refused','Ma demande ou ma plainte a été refusée'),
 opt('partial','There was a response but the problem remains','Il y a eu une réponse, mais le problème persiste'),
 opt('active','A meeting, investigation or review is underway','Une rencontre, une enquête ou un examen est en cours'),
 opt('resolved','It was resolved and I want to understand the outcome','La situation est réglée et je veux comprendre le résultat'),unsure()
 ],{label:['Response so far','Réponse reçue']}),
 goal:q('goal','What would you most like help with now?','Quel soutien vous serait le plus utile maintenant?',[
 opt('advice','Understand my options or get confidential advice','Comprendre mes options ou obtenir des conseils confidentiels'),
 opt('stop','Stop the treatment or feel safer at work','Faire cesser le traitement ou me sentir en sécurité'),
 opt('accommodation','Obtain an effective accommodation','Obtenir un accommodement efficace'),
 opt('review','Have a decision reviewed or corrected','Faire examiner ou corriger une décision'),
 opt('financial','Understand compensation or financial remedies','Comprendre l’indemnisation ou les réparations financières'),
 opt('deadline','Protect my filing deadlines','Protéger mes délais de dépôt'),
 opt('message','Prepare a message to someone I choose','Préparer un message à la personne de mon choix'),
 opt('cases','Understand similar decisions','Comprendre des décisions comparables'),other(),unsure()
 ],{multiple:true,label:['What you want to achieve','Ce que vous souhaitez obtenir']})
};
const values=(a,key)=>a[key]?.values||[];
const has=(a,key,id)=>values(a,key).includes(id);
const answered=(a,key)=>Object.prototype.hasOwnProperty.call(a,key);
function derive(a){
 const main=values(a,'issue')[0],all=new Set([main,...values(a,'details'),...values(a,'additional')].filter(x=>x&&!['none','unsure','other','written','skipped'].includes(x)));
 const gs=new Set(values(a,'grounds'));
 if(all.has('disability'))gs.add('disability');if(all.has('religion'))gs.add('religion');
 const ts=new Set();
 for(const x of all)if(x!=='discrimination')ts.add(x);
 if(['race','origin','colour'].some(g=>gs.has(g)))ts.add('race');
 for(const g of ['disability','religion','sex','family','age','genetic','marital','sexual_orientation','gender','record'])if(gs.has(g))ts.add(g);
 if(has(a,'situation','comments'))ts.add('harassment');
 if(has(a,'situation','staffing'))ts.add('staffing');if(has(a,'situation','discipline'))ts.add('discipline');if(has(a,'situation','pay'))ts.add('pay');
 if(has(a,'staffing_event','language'))ts.add('language');
 if(has(a,'union_support','refused')||has(a,'union_support','concern'))ts.add('union');
 const accommodation=all.has('disability')||all.has('religion')||all.has('accommodation')||has(a,'situation','accommodation')||has(a,'reprisal','accommodation')||has(a,'staffing_event','access')||has(a,'goal','accommodation');
 if(accommodation)ts.add('accommodation');
 return {main,issues:[...all],grounds:[...gs],topics:[...ts],accommodation,
   protectedConcern:[...gs].some(x=>!['none','unsure','other','private','written','skipped'].includes(x)),
   discrimination:all.has('discrimination'),employer:values(a,'employer')[0]||'unsure',employment:values(a,'employment')[0]||'unsure',
   union:values(a,'union')[0]||(has(a,'employment','executive')?'no':'unsure'),service:values(a,'service')[0]||'unsure'};
}
function questions(a){
 const f=derive(a),t=new Set(f.topics),out=[schemas.issue];
 if(!answered(a,'issue'))return out;
 if(['other','unsure','written','skipped'].includes(f.main))out.push(schemas.details);
 if(answered(a,'additional'))out.push(schemas.additional);
 const mainHarassment=f.issues.includes('harassment');
 if(mainHarassment)out.push(schemas.urgency,schemas.harassment);
 if(f.discrimination||mainHarassment||f.issues.includes('accommodation'))out.push(schemas.grounds);
 if(f.discrimination)out.push(schemas.situation);
 if(!mainHarassment&&f.main!=='informal')out.push({...schemas.urgency,options:schemas.urgency.options.filter(x=>x.id!=='danger'||t.has('harassment')||t.has('reprisal')||f.discrimination)});
 if(f.accommodation)out.push(schemas.request,schemas.adjustment);
 if(t.has('staffing'))out.push(schemas.staffing,schemas.staffing_event);
 if(t.has('reprisal'))out.push(schemas.reprisal);
 if(t.has('discipline'))out.push(schemas.discipline);
 if(t.has('pay'))out.push(schemas.pay);
 if(t.has('workforce'))out.push(schemas.workforce);
 if(t.has('language'))out.push(schemas.language);
 out.push(schemas.employer);
 if(f.employer==='uniformed')out.push(schemas.service);
 if(f.service!=='caf')out.push(schemas.employment);
 if(f.service!=='caf'&&!['applicant','executive'].includes(f.employment))out.push(schemas.union);
 if(f.union==='yes'||t.has('union'))out.push(schemas.union_support);
 out.push(schemas.notice);
 if(has(a,'notice','yes')||has(a,'notice','verbal'))out.push(schemas.timing);
 const unionContacted=['waiting','helping','refused','concern'].some(x=>has(a,'union_support',x));
 out.push(unionContacted?{...schemas.tried,en:'Apart from the union, what else have you tried?',fr:'En dehors du syndicat, qu’avez-vous essayé?',options:schemas.tried.options.filter(x=>x.id!=='union').map(x=>x.id==='none'?{...x,en:'No other step yet',fr:'Aucune autre démarche pour le moment'}:x)}:schemas.tried);
 if(values(a,'tried').some(x=>!['none','unsure','written','skipped'].includes(x)))out.push(schemas.response);
 out.push(schemas.goal);
 return [...new Map(out.map(x=>[x.id,x])).values()];
}
const next=a=>questions(a).find(x=>!answered(a,x.id))||null;
function setAnswer(a,id,selected,text='',date=''){
 const out=JSON.parse(JSON.stringify(a)),before=values(a,id).join('|'),chosen=[...new Set(selected)];
 const schema=schemas[id];
 if(!schema)throw Error('Unknown question');
 const valid=new Set(schema.options.map(x=>x.id).concat(['written','skipped','exact']));
 if(chosen.some(x=>!valid.has(x)))throw Error('Unknown answer');
 if(!schema.multiple&&chosen.length!==1)throw Error('Choose one answer');
 if(schema.multiple&&chosen.length>1&&schema.options.some(x=>x.exclusive&&chosen.includes(x.id)))throw Error('Exclusive answer cannot be combined');
 if(['issue','details'].includes(id)&&before&&before!==chosen.join('|'))for(const key of ['details','grounds','situation','urgency','harassment','request','adjustment','staffing','staffing_event','reprisal','discipline','pay','workforce','language','additional','notice','timing','tried','response','goal','union_support'])if(key!==id)delete out[key];
 out[id]={values:chosen,text:String(text).slice(0,1600),date:String(date).slice(0,10)};
 // Keep context that the user has provided; remove dependent answers when the answer changes.
 if(before&&before!==chosen.join('|')){
  if(id==='union'&&!chosen.includes('yes'))delete out.union_support;
  if(id==='notice'&&!chosen.some(x=>['yes','verbal'].includes(x)))delete out.timing;
  if(id==='tried'&&chosen.every(x=>['none','unsure'].includes(x)))delete out.response;
  if(id==='employer'&&!chosen.includes('uniformed'))delete out.service;
 }
 return out;
}
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ');
const matchFirst=(text,patterns)=>patterns.find(x=>x[1].test(text))?.[0];
function infer(text){
 const s=normalize(text),out={};
 const issue=matchFirst(s,[['reprisal',/retaliat|reprisal|represaill/],['harassment',/harass|harcel|bully|intimid|violence|threat/],['discrimination',/racis|discriminat|racial|ethnic|microaggress|ableis|anti.black|sexis/],['disability',/disabilit|handicap|medical accommodation|accommod.*(?:health|medical)|adhd|autis/],['religion',/relig|prayer|hijab|turban|sabbath|ramadan/],['accommodation',/accommod|adaptation/],['staffing',/staffing|promotion|hiring|screened out|appointment|dotation|embauche|nomination|concours/],['workforce',/layoff|workforce adjustment|serlo|mise en disponibilite|reamenagement/],['discipline',/disciplin|dismiss|terminated|suspend|licenc|investigat|enquete|performance/],['pay',/pay error|phoenix|salary|overtime|pension|benefit|paie|paye|salaire|conge/],['language',/official.language|langue officielle|bilingual|linguist/]]);
 if(issue)out.issue=[issue];
 const gs=[];
 for(const [id,rx] of [['race',/racis|racial|race\b|anti.black|black employee|as a black/],['origin',/ethnic|national origin|origine/],['colour',/skin colo[u]?r|couleur de peau/],['disability',/disabilit|handicap|ableis|adhd|autis/],['religion',/relig|faith|prayer|hijab|turban|ramadan|sabbath/],['sex',/sexism|sexist|pregnan|grossesse|sexual harass|harcelement sexuel/],['family',/caregiv|childcare|family status|situation de famille/],['age',/because of my age|age discrimination|en raison de mon age/],['gender',/gender identity|identite de genre|transgender|transgenre/],['sexual_orientation',/sexual orientation|orientation sexuelle|homophob/],['marital',/marital status|etat matrimonial/],['genetic',/genetic|genetiqu/],['record',/pardoned|record suspension|casier.*suspend|pardon/]]){
  const matches=[...s.matchAll(new RegExp(rx.source,'g'))];
  const positive=matches.some(m=>{const prefix=s.slice(Math.max(0,m.index-50),m.index).split(/[.,;]| but | mais /).pop();return !/(?:\bno|\bnot|\bwithout|pas de|pas un|aucun|n ai pas|don t have)(?:\s+(?:a|any|un|une|de|d|because|due|to|related|based|on|have|medical|physical|visible|of|my|mon|ma)){0,5}\s*$/.test(prefix)});
  if(positive)gs.push(id);
 }
 if(gs.length)out.grounds=gs;
 if(/(?:not sure|unsure|don.t know|ne sais pas|incertain).{0,45}(?:union|syndic|collective)|(?:union|syndic).{0,30}(?:unsure|not sure|ne sais pas)/.test(s))out.union=['unsure'];
 else if(/(?:no|not|without|pas de|aucun).{0,12}(?:union|syndic)|non.union|unrepresented|non represente/.test(s))out.union=['no'];
 else if(/(?:have|in|represented by|part of|covered by|membre|represente|ai un).{0,15}(?:a |my |the |un |le )?(?:union|syndic|collective agreement)|unionized|syndique/.test(s))out.union=['yes'];
 if(/\b(?:isc|cirnac|cra|esdc|ircc|tbs|pspc|ssc|dfo|dnd)\b|indigenous services|services aux autochtones|revenue agency|agence du revenu|statistics canada|statistique canada|federal department|ministere federal|public service agency/.test(s))out.employer=['federal'];
 if(/(?:armed forces|\bcaf\b|military|forces armees|\bfac\b).{0,12}(?:member|membre)|membre.{0,15}(?:forces armees|\bfac\b)/.test(s)){out.employer=['uniformed'];out.service=['caf']}
 else if(/(?:rcmp|\bgrc\b).{0,15}(?:regular|regulier)|(?:regular|regulier).{0,15}(?:rcmp|\bgrc\b)/.test(s)){out.employer=['uniformed'];out.service=['rcmp']}
 if(/(?:union|syndic).{0,50}(?:refus|declin|won.t help|not help|representation)/.test(s)&&!out.issue)out.issue=['union'];
 if(/union.{0,30}(?:refus|declin|won.t help)|syndic.{0,30}(?:refus|ne m.aide)/.test(s)){out.union=['yes'];out.union_support=['refused']}
 if(/(?:accommod|request|demande).{0,40}(?:denied|refused|refus)/.test(s))out.request=['denied'];
 return out;
}
function parse(id,text){
 const s=normalize(text),def=schemas[id];if(!def)return ['written'];
 if(/^(?:not sure|unsure|i don.t know|je ne sais pas|incertain|aucune idee)[.! ]*$/.test(s))return [def.options.some(x=>x.id==='unsure')?'unsure':'written'];
 if(id==='union'){
  if(/not sure|unsure|don.t know|ne sais pas/.test(s))return ['unsure'];
  if(/\bno\b|\bnot\b|without|\bnon\b|pas|aucun|unrepresented/.test(s))return ['no'];
  if(/\byes\b|\boui\b|unionized|syndique|i have|j.ai/.test(s))return ['yes'];
 }
 if(id==='notice'){
  if(/verbal|oral/.test(s))return ['verbal'];
  if(/\bno\b|\bnon\b|not yet|pas encore/.test(s))return ['no'];
  if(/\byes\b|\boui\b|received|recu|letter|lettre|decision/.test(s))return ['yes'];
 }
 if(id==='grounds'){
  const gs=infer(text).grounds||[];
  if(/\b(?:no|none|aucun)\b/.test(s)&&!gs.length)return ['none'];
  if(gs.length)return gs;
 }
 if(id==='issue'||id==='details')return infer(text).issue||['other'];
 if(id==='employer'){
  if(infer(text).employer)return infer(text).employer;
  const hit=matchFirst(s,[['uniformed',/rcmp|gendarmerie|\bgrc\b|armed forces|forces armees|military/],['crown',/crown|societe d.etat|canada post|cbc|radio.canada|via rail/],['parliament',/parliament|parlement|senate|senat/],['regulated',/bank|banque|airline|air transport|telecom/],['other',/province|provincial|municipal/]]);
  if(hit)return [hit];
 }
 if(id==='timing'){
  const v=matchFirst(s,[['today',/today|aujourd/],['week',/last week|this week|last 7|cette semaine/],['fortnight',/two weeks|deux semaines|8.*15/],['older',/last month|last year|mois dernier|annee derniere|more than 15/]]);if(v)return [v];
 }
 // Exact or sufficiently distinctive choice text can be typed in either language.
 const found=def.options.filter(o=>{
  if(['unsure','other','private','none'].includes(o.id))return false;
  return [o.en,o.fr].some(t=>{const n=normalize(t);return s===n||(s.length>=9&&n.length>=9&&(s.includes(n)||n.includes(s)))})
 });
 if(found.length)return (def.multiple?found:found.slice(0,1)).map(o=>o.id);
 return ['written'];
}
function summary(a,lang='en'){
 return questions(a).filter(x=>answered(a,x.id)).map(def=>{
  const answer=a[def.id];const selected=answer.values.map(id=>def.options.find(x=>x.id===id)).filter(Boolean).map(o=>o[lang]);
  const detail=answer.date||answer.text;
  return {id:def.id,label:(def.label||[def.en,def.fr])[lang==='fr'?1:0],value:selected.join(', ')+(detail?(selected.length?' · ':'')+detail:'')};
 });
}
return {schemas,issues,grounds,values,has,answered,derive,questions,next,setAnswer,infer,parse,summary};
});
