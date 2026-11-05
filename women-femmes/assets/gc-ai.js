/* Women public servants data hub: ask an AI chatbot about the data (adapted from GC Equity).
 * The visitor types a question and picks a chatbot. The question is copied to the clipboard and the
 * chatbot opens in a new tab, with the question filled in where that chatbot accepts it from a link.
 * Nothing is sent anywhere until the visitor picks a chatbot, and no account or key is stored here.
 * Usage: GCAI.render(container, {question: lang => '...', about: () => '...', heading: false})
 */
(function(){
'use strict';
const BOTS=[
 {id:'chatgpt',name:'ChatGPT',owner:'OpenAI',link:q=>'https://chatgpt.com/?q='+encodeURIComponent(q)},
 {id:'claude',name:'Claude',owner:'Anthropic',link:q=>'https://claude.ai/new?q='+encodeURIComponent(q)},
 {id:'copilot',name:'Copilot',owner:'Microsoft',link:q=>'https://copilot.microsoft.com/?q='+encodeURIComponent(q)},
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
 if(isFr())return question+'\n\nContexte : j’utilise le site « Les femmes dans la fonction publique fédérale : obstacles intersectionnels »'+(site?' ('+site+')':'')+', un site indépendant qui présente des données publiées du gouvernement du Canada sur les femmes dans la fonction publique fédérale, y compris les femmes qui appartiennent aussi à un autre groupe visé par l’équité.'+(about?' La page que je consulte porte sur : '+about+'.':'')+' Répondez à l’aide de sources officielles publiées, comme les statistiques du Secrétariat du Conseil du Trésor du Canada et le Sondage auprès des fonctionnaires fédéraux. Citez vos sources et indiquez quand l’information n’est pas publiée. Un écart entre des groupes ne prouve pas à lui seul une discrimination.';
 return question+'\n\nContext: I am using the site “Women in the federal public service: intersectional barriers”'+(site?' ('+site+')':'')+', an independent website that presents published Government of Canada data on women in the federal public service, including women who also belong to another equity group.'+(about?' The page I am viewing covers: '+about+'.':'')+' Please answer using official published sources, such as Treasury Board of Canada Secretariat statistics and the Public Service Employee Survey. Cite your sources and say when information is not published. A difference between groups is not, on its own, proof of discrimination.';
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
  note:tr('The chatbot opens in a new tab. Your question goes to the company that runs it (OpenAI, Anthropic, Microsoft or Google), and you may need to sign in. Do not include personal or confidential information. Check answers against the data on this site.','L’agent conversationnel s’ouvre dans un nouvel onglet. Votre question est transmise à l’entreprise qui l’exploite (OpenAI, Anthropic, Microsoft ou Google), et une connexion peut être demandée. N’indiquez aucun renseignement personnel ou confidentiel. Vérifiez les réponses à l’aide des données de ce site.'),
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
  a.href=bot.link(text);
  copyText(text).then(ok=>{box.status.textContent=ok?t.copied(bot):t.notCopied(bot);});
 }));
 boxes.push(box);
 refreshBox(box);
 return box;
}
function defaultQuestion(box){const q=box.opts.question;return typeof q==='function'?(q()||''):(q||'');}
function update(box){
 const question=box.q.value.trim();
 const text=question?fullPrompt(question,typeof box.opts.about==='function'?box.opts.about():box.opts.about):'';
 box.el.querySelectorAll('.gcai-bot').forEach(a=>{const bot=BOTS.find(b=>b.id===a.dataset.bot);a.href=bot.link(text);});
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
