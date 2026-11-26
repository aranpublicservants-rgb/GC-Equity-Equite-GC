/* GC Equity: ask an AI chatbot about the data.
 * The visitor types a question and picks a chatbot. The question is copied to the clipboard and the
 * chatbot opens in a new tab without prompt text in the URL. The visitor chooses whether to paste.
 * No account or API key is stored here; no prompt is transmitted by this site.
 * Usage: GCAI.render(container, {question: lang => '...', about: () => '...', heading: false})
 */
(function(){
'use strict';
const BOTS=[
 {id:'chatgpt',name:'ChatGPT',owner:'OpenAI',link:()=>'https://chatgpt.com/',pasteOnly:true},
 {id:'claude',name:'Claude',owner:'Anthropic',link:()=>'https://claude.ai/new',pasteOnly:true},
 {id:'copilot',name:'Copilot',owner:'Microsoft',link:()=>'https://copilot.com/',pasteOnly:true},
 {id:'gemini',name:'Gemini',owner:'Google',link:()=>'https://gemini.google.com/app',pasteOnly:true}
];
const isFr=()=>String(document.documentElement.getAttribute('lang')||'en').toLowerCase().indexOf('fr')===0;
const tr=(en,fr)=>isFr()?fr:en;
const boxes=[];
let count=0;

function siteAddress(){
 try{const u=new URL(location.href);if(!/^https?:$/.test(u.protocol))return '';u.hash='';u.search='';return u.href.replace(/[^/]*$/,'');}catch(e){return '';}
}
function fullPrompt(question,about){
 const site=siteAddress();
 if(isFr())return question+'\n\nContexte : j’utilise Équité-GC'+(site?' ('+site+')':'')+', un site indépendant qui présente des données publiées du gouvernement du Canada sur l’équité en matière d’emploi dans la fonction publique fédérale.'+(about?' La page que je consulte porte sur : '+about+'.':'')+' Répondez à l’aide de sources officielles publiées, comme les statistiques du Secrétariat du Conseil du Trésor du Canada et le Sondage auprès des fonctionnaires fédéraux. Citez vos sources et indiquez quand l’information n’est pas publiée. Un écart entre des groupes ne prouve pas à lui seul une discrimination ni une signification statistique. Ne traitez jamais les valeurs manquantes ou supprimées comme nulles et ne les reconstituez pas. La part des nominations ne représente pas une probabilité d’embauche. Les engagements ne sont pas des résultats vérifiés. Indiquez la période et la population exactes.';
 return question+'\n\nContext: I am using GC Equity'+(site?' ('+site+')':'')+', an independent website that presents published Government of Canada data on employment equity in the federal public service.'+(about?' The page I am viewing covers: '+about+'.':'')+' Please answer using official published sources, such as Treasury Board of Canada Secretariat statistics and the Public Service Employee Survey. Cite your sources and say when information is not published. A difference between groups is not, on its own, proof of discrimination or statistical significance. Never treat missing or suppressed values as zero, or reconstruct suppressed results. Appointment share is not hiring probability. Commitments are not verified outcomes. State the exact source period and population.';
}
function copyText(text){
 if(navigator.clipboard&&window.isSecureContext){return navigator.clipboard.writeText(text).then(()=>true,()=>legacyCopy(text));}
 return Promise.resolve(legacyCopy(text));
}
function legacyCopy(text){
 try{const t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.position='fixed';t.style.top='-1000px';t.style.opacity='0';document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();return ok;}catch(e){return false;}
}
function addStyles(){
 if(document.getElementById('gcai-style'))return;
 const s=document.createElement('style');s.id='gcai-style';
 s.textContent=[
  '.gcai{margin:0}',
  '.gcai label{display:block;font-weight:700;margin:0 0 6px}',
  '.gcai textarea{box-sizing:border-box;width:100%;min-height:84px;font:inherit;font-size:16px;line-height:1.5;padding:10px 12px;border:1px solid var(--line,#8a9ba8);border-radius:8px;background:var(--card,#fff);color:var(--ink,#1c2d42);resize:vertical}',
  '.gcai-note{font-size:14px;line-height:1.55;margin:10px 0 12px;color:var(--ink-soft,#3d4f60)}',
  '.gcai-bots{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0}',
  '.gcai-bots .gcai-lead{font-weight:700;margin-right:2px}',
  '.gcai-bot{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:104px;padding:8px 16px;border-radius:8px;border:2px solid var(--teal,#0a6463);color:var(--teal,#0a6463);background:var(--card,#fff);font-weight:700;text-decoration:none}',
  '.gcai-bot:hover{background:var(--teal,#0a6463);color:#fff}',
  '.gcai-bot:focus-visible,.gcai textarea:focus-visible{outline:3px solid #bf7827;outline-offset:2px}',
  '.gcai-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
  '.gcai-status{min-height:1.5em;margin:10px 0 0;font-size:14px;font-weight:600}',
  'html[data-theme="dark"] .gcai-bot{color:#9fe0dc;border-color:#9fe0dc;background:transparent}',
  'html[data-theme="dark"] .gcai-bot:hover{background:#9fe0dc;color:#0d1b2a}',
  'html[data-theme="contrast"] .gcai-bot{color:#000;border-color:#000;background:#fff}',
  'html[data-theme="contrast"] .gcai-bot:hover{background:#000;color:#fff}'
 ].join('\n');
 document.head.appendChild(s);
}
function texts(){
 return {
  label:tr('Your question','Votre question'),
  note:tr('The question is copied on your device. The selected service opens without the question in its URL. Paste only published public information into an organization-approved tool, if permitted. Never include personal, protected, classified or confidential information. Check every answer against the original sources.','La question est copiée sur votre appareil. Le service choisi s’ouvre sans la question dans son adresse URL. Collez uniquement des renseignements publics publiés dans un outil autorisé par votre organisme, si permis. N’incluez jamais de renseignements personnels, protégés, classifiés ou confidentiels. Vérifiez chaque réponse dans les sources originales.'),
  lead:tr('Ask:','Demander à :'),
  newTab:tr(' (opens in a new tab)',' (s’ouvre dans un nouvel onglet)'),
  empty:tr('Type a question first.','Tapez d’abord une question.'),
  copied:(bot)=>bot.pasteOnly?tr('Your question was copied. Paste it into the '+bot.name+' message box.','Votre question a été copiée. Collez-la dans la zone de message de '+bot.name+'.'):tr('Your question was copied. If it does not appear in '+bot.name+', paste it into the message box.','Votre question a été copiée. Si elle n’apparaît pas dans '+bot.name+', collez-la dans la zone de message.'),
  notCopied:(bot)=>tr('Copy your question, then paste it into the '+bot.name+' message box.','Copiez votre question, puis collez-la dans la zone de message de '+bot.name+'.')
 };
}
function render(container,opts){
 if(!container)return null;
 addStyles();
 opts=opts||{};
 prune(container);
 const n=++count,qid='gcaiQ'+n,nid='gcaiN'+n,lid='gcaiL'+n;
 const box={el:container,opts,edited:false};
 container.innerHTML='<div class="gcai"><label for="'+qid+'"></label><textarea id="'+qid+'" rows="3"></textarea>'+
  '<p class="gcai-note" id="'+nid+'"></p><div class="gcai-bots" role="group" aria-labelledby="'+lid+'"><span class="gcai-lead" id="'+lid+'"></span>'+
  BOTS.map(b=>'<a class="gcai-bot" data-bot="'+b.id+'" href="'+b.link('')+'" target="_blank" rel="noopener noreferrer" aria-describedby="'+nid+'">'+b.name+'<span class="gcai-sr"></span></a>').join('')+
  '</div><p class="gcai-status" role="status" aria-live="polite"></p></div>';
 box.q=container.querySelector('textarea');box.status=container.querySelector('.gcai-status');
 box.q.addEventListener('input',()=>{box.edited=true;update(box);});
 container.querySelectorAll('.gcai-bot').forEach(a=>a.addEventListener('click',e=>{
  const bot=BOTS.find(b=>b.id===a.dataset.bot),t=texts();
  const question=box.q.value.trim();
  if(!question){e.preventDefault();box.status.textContent=t.empty;box.q.focus();return;}
  const text=fullPrompt(question,typeof box.opts.about==='function'?box.opts.about():box.opts.about);
  a.href=bot.link();
  copyText(text).then(ok=>{box.status.textContent=ok?t.copied(bot):t.notCopied(bot);});
 }));
 boxes.push(box);
 refreshBox(box);
 return box;
}
function defaultQuestion(box){const q=box.opts.question;return typeof q==='function'?(q()||''):(q||'');}
function update(box){
 box.el.querySelectorAll('.gcai-bot').forEach(a=>{const bot=BOTS.find(b=>b.id===a.dataset.bot);a.href=bot.link();});
}
function refreshBox(box){
 const t=texts();
 box.el.querySelector('label').textContent=t.label;
 box.el.querySelector('.gcai-note').textContent=t.note;
 box.el.querySelector('.gcai-lead').textContent=t.lead;
 box.el.querySelectorAll('.gcai-sr').forEach(s=>{s.textContent=t.newTab;});
 box.q.placeholder=box.opts.placeholder?(typeof box.opts.placeholder==='function'?box.opts.placeholder():box.opts.placeholder):'';
 if(!box.edited)box.q.value=defaultQuestion(box);
 box.status.textContent='';
 update(box);
}
// Forget boxes that were removed from the page or are about to be drawn again in the same place.
function prune(reused){for(let i=boxes.length-1;i>=0;i--){if(boxes[i].el===reused||!document.contains(boxes[i].el))boxes.splice(i,1);}}
function refresh(){prune(null);boxes.forEach(refreshBox);}
document.addEventListener('langchange',()=>setTimeout(refresh,0));
window.GCAI={render,refresh,bots:BOTS.map(b=>b.name)};
})();
