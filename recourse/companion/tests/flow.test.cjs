const assert=require('node:assert/strict');
const F=require('../conversation-flow.js');
let checks=0;
const check=(fn)=>{fn();checks++};
const answer=(a,id,v)=>F.setAnswer(a,id,Array.isArray(v)?v:[v]);
check(()=>assert.equal(F.next({}).id,'issue'));
check(()=>{const a=answer({},'issue','discrimination');assert.equal(F.next(a).id,'grounds');assert(F.next(a).options.some(x=>x.id==='origin'));assert(F.next(a).multiple)});
check(()=>{let a=answer({},'issue','discrimination');a=answer(a,'grounds',['race','origin','disability']);assert.equal(F.next(a).id,'situation');assert.deepEqual(F.derive(a).grounds,['race','origin','disability']);assert.equal(F.derive(a).protectedConcern,true)});
check(()=>{let a=answer({},'issue','discrimination');a=answer(a,'grounds','race');a=answer(a,'situation','accommodation');assert(F.questions(a).some(x=>x.id==='request'));assert(F.questions(a).some(x=>x.id==='adjustment'))});
check(()=>assert.throws(()=>answer(answer({},'issue','discrimination'),'grounds',['race','unsure'])));
check(()=>assert.throws(()=>answer({},'issue',['pay','disability'])));
check(()=>{let a=answer({},'issue','pay');a=answer(a,'union','no');assert(!F.questions(a).some(x=>x.id==='union_support'))});
check(()=>{let a=answer({},'issue','pay');a=answer(a,'union','yes');assert(F.questions(a).some(x=>x.id==='union_support'))});
check(()=>{let a=answer({},'issue','discrimination');a=answer(a,'union','yes');a=answer(a,'union_support','helping');const q=F.questions(a).find(x=>x.id==='tried');assert(q.en.startsWith('Apart from'));assert(!q.options.some(x=>x.id==='union'))});
check(()=>{let a=answer({},'issue','staffing');a=answer(a,'employment','applicant');assert(!F.questions(a).some(x=>x.id==='union'))});
check(()=>{let a=answer({},'issue','discipline');a=answer(a,'employer','uniformed');a=answer(a,'service','caf');assert(!F.questions(a).some(x=>x.id==='union'));assert(!F.questions(a).some(x=>x.id==='employment'))});
check(()=>{let a=answer({},'issue','discipline');a=answer(a,'employment','executive');assert(!F.questions(a).some(x=>x.id==='union'));assert.equal(F.derive(a).union,'no')});
check(()=>{let a=answer({},'issue','staffing');a=answer(a,'staffing_event','access');assert(F.questions(a).some(x=>x.id==='request'))});
check(()=>{let a=answer({},'issue','pay');a=answer(a,'notice','no');assert(!F.questions(a).some(x=>x.id==='timing'));a=answer(a,'notice','yes');assert(F.questions(a).some(x=>x.id==='timing'))});
check(()=>{let a=answer({},'issue','pay');a=answer(a,'notice','yes');a=F.setAnswer(a,'timing',['exact'],'','2026-11-10');a=answer(a,'notice','no');assert(!a.timing)});
check(()=>{let a=answer({},'issue','discrimination');a=answer(a,'grounds',['race','disability']);a=answer(a,'situation','accommodation');a=answer(a,'request','denied');a=answer(a,'union','no');a=answer(a,'issue','pay');assert(!a.grounds);assert(!a.request);assert.equal(F.derive(a).protectedConcern,false);assert.equal(F.derive(a).union,'no')});
check(()=>{let a=answer({},'issue','other');assert.equal(F.next(a).id,'details');a=answer(a,'details','staffing');assert(F.questions(a).some(x=>x.id==='staffing'))});
check(()=>assert.deepEqual(F.parse('union','No, I do not have a union'),['no']));
check(()=>assert.deepEqual(F.parse('union','I am not sure whether I have a union'),['unsure']));
check(()=>assert.deepEqual(F.parse('union','Oui, je suis syndiqué'),['yes']));
check(()=>assert.deepEqual(F.infer('I am not unionized').union,['no']));
check(()=>assert.deepEqual(F.infer('I work at ISC and have a union.').employer,['federal']));
check(()=>assert.deepEqual(F.infer('My accommodation was denied').issue,['accommodation']));
check(()=>assert.deepEqual(F.infer('My accommodation was denied').request,['denied']));
check(()=>assert.deepEqual(F.parse('grounds','This relates to my ethnic identity and disability'),['origin','disability']));
check(()=>assert(!F.infer('I have no disability but I am facing racial discrimination').grounds.includes('disability')));
check(()=>assert(F.infer('I am not appreciated because of my race').grounds.includes('race')));
check(()=>assert.deepEqual(F.parse('details','I am being harassed'),['harassment']));
check(()=>assert.deepEqual(F.parse('union','<script>alert(1)</script>'),['written']));
check(()=>{let a=answer({},'issue','pay');a=answer(a,'tried','grievance');assert(F.questions(a).some(x=>x.id==='response'));a=answer(a,'tried','none');assert(!F.questions(a).some(x=>x.id==='response'))});
for(const issue of F.issues){
 check(()=>{let a=answer({},'issue',issue.id),iterations=0,seen=new Set();for(let q;(q=F.next(a));){assert(!seen.has(q.id),'Repeated '+q.id);seen.add(q.id);const choice=q.options.find(x=>x.id==='unsure')||q.options.find(x=>x.id==='none')||q.options[0];a=answer(a,q.id,choice.id);assert(++iterations<30)}assert.equal(F.next(a),null);assert(F.summary(a,'fr').length>3)})
}
console.log('PASS: '+checks+' adaptive-flow checks, including all starting concerns.');
