(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CareerTools=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const p=(en,fr)=>({en,fr}),norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const board={id:'6b0028a96cc4917121895c48',url:'https://trello.com/b/tEFkjri8/career-development-in-the-public-service'};
const headings=[
{id:'6b0028ac17a48725b392eac8',name:p('Learning and training','Apprentissage et formation'),rx:/\b(courses?|cours|training|formation|certification|csps|efpc|learning plan|plan d.apprentissage)\b/g,weight:2},
{id:'6b0028add0121c584e3cb5cf',name:p('Jobs, advancement and staffing','Emplois, avancement et dotation'),rx:/\b(jobs?|emplois?|staffing|dotation|resume|curriculum|interview|entrevue|merit|merite|nomination|appointment|screening|preselection|cover letter)\b/g,weight:3},
{id:'6b0028ae8bafa6a8fd66970a',name:p('Talent management and development plans','Gestion des talents et plans de perfectionnement'),rx:/\b(talent|competenc\w*|performance|rendement|pma|egr|development plan|plan de perfectionnement|plan de developpement)\b/g,weight:4},
{id:'6b0028afb3776ca7a6fc1e91',name:p('Mentoring, networks and communities','Mentorat, réseaux et communautés'),rx:/\b(mentor\w*|mentorat|network\w*|reseau\w*|communit\w*|communaut\w*|coaching|coach)\b/g,weight:4},
{id:'6b0028b0b5b4c31b27536e38',name:p('Mobility and temporary opportunities','Mobilité et possibilités temporaires'),rx:/\b(mobilit\w*|acting|interim\w*|secondment\w*|detachement\w*|assignment\w*|affectation\w*|deployment\w*|mutation\w*|shadowing|micro.mission\w*)\b/g,weight:4},
{id:'6b0028b11c410a856992dce3',name:p('Language training','Formation linguistique'),rx:/\b(language|linguisti\w*|bilingual\w*|bilingu\w*|french|francais|english|anglais|sle|els|langue seconde|second language)\b/g,weight:5},
{id:'6b0028abd8ea28b260c63133',name:p('Start here','Commencez ici'),rx:null,weight:0}];
function classify(name,text,note){const data=norm([name,note,String(text||'').slice(0,12000)].join(' ')),rank=headings.map((h,i)=>({i,score:h.rx?Math.min((data.match(h.rx)||[]).length,5)*h.weight:0})).sort((a,b)=>b.score-a.score),best=rank[0],next=rank[1];return {index:!best.score||best.score===next.score?6:best.i,uncertain:best.score-next.score<3,metadataOnly:!String(text||'').trim()};}
function excerpt(text){return String(text||'').replace(/\u0000/g,'').trim().replace(/[ \t]+/g,' ').slice(0,650);}
function cardDescription(name,text,note,lang){const out=[];if(note.trim())out.push((lang==='fr'?'Note : ':'Note: ')+note.trim());if(text.trim())out.push((lang==='fr'?'Extrait du document :\n':'Document excerpt:\n')+excerpt(text));out.push((lang==='fr'?'Fichier source : ':'Source file: ')+name);return out.join('\n\n');}
function trelloUrl(index,title){if(!headings[index]||!String(title).trim())throw new Error('Invalid draft');const u=new URL('https://trello.com/add-card');u.searchParams.set('url','https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/career-development/#upload');u.searchParams.set('source','https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/career-development/');u.searchParams.set('idBoard',board.id);u.searchParams.set('idList',headings[index].id);u.searchParams.set('name',String(title).trim().slice(0,300));return u.href;}
function xmlText(xml,Parser){if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Unsupported XML');const doc=new Parser().parseFromString(xml,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('Invalid XML');return [...doc.getElementsByTagNameNS('*','p')].map(p=>[...p.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('')).join('\n');}
const topics=[
{id:'language',goal:'language',rx:/lang|biling|french|francais|english|anglais|sle|els/i,ids:['sle','self-assessment','language-learning','validity'],facts:['langProfileBody','langPracticeBody','langResultsBody']},
{id:'accommodation',goal:'apply',rx:/accommod|adaptation|handicap|disabil/i,ids:['accommodation'],facts:['accommodationBody']},
{id:'student',goal:'apply',rx:/student|etudiant|bridg|integration|fswep|pfete|diplom/i,ids:['students','bridging','jobs']},
{id:'casual',goal:'apply',rx:/casual|occasionnel/i,ids:['casual','jobs']},
{id:'mobility',goal:'move',rx:/mobil|acting|interim|deploy|mutation|secondment|detachement|assignment|affectation|different role|autre role|move/i,ids:['assignment','deployment','acting','exchange']},
{id:'mentor',goal:'connect',rx:/mentor|network|reseau|coach|communit|communaut|connection|contact/i,ids:['mentoring','fyn','gccollab'],facts:['mentorBody','coachBody','networkBody']},
{id:'leadership',goal:'lead',rx:/leader|executive|cadre|\bex\b/i,ids:['klc','leadership','qualifications']},
{id:'application',goal:'apply',rx:/appl|postul|entrevue|interview|pool|bassin|merit|merite|resume|job|emploi|promotion|opportunit|candidat|dotation|staffing|\bcv\b/i,ids:['apply','pool','jobs','qualifications'],facts:['app1','app2','app3','poolBody']},
{id:'learn',goal:'learn',rx:/learn|apprenti|train|formation|skill|competenc|talent|pma|egr|rendement|performance/i,ids:['pma','catalogue','learning','groups']}];
function topicFor(question){return topics.find(t=>t.rx.test(norm(question)))||null;}
function contextFor(question,lang,C,R,M){const topic=topicFor(question);if(!topic)return {topic:null,context:'',sources:[]};const sources=R.filter(r=>topic.ids.includes(r.id));let facts=topic.facts?.map(k=>M.t(C.ui[k],lang))||[];if(topic.id==='mobility')facts=C.routes.map(r=>M.t(r.title,lang)+': '+M.t(r.body,lang)+' '+M.t(r.check,lang));if(['student','casual'].includes(topic.id))facts=[M.t(C.statusNotes[topic.id],lang)];if(['learn','leadership'].includes(topic.id))facts=C.learningCards.map(r=>M.t(r.title,lang)+': '+M.t(r.body,lang));return {topic,context:facts.join('\n'),sources};}
return {board,headings,classify,excerpt,cardDescription,trelloUrl,xmlText,topicFor,contextFor};
});
