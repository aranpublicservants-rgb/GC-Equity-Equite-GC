/* Searchable official publication register and administrative source context. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],L=(a,b,l)=>l==='fr'?b:a;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let publications;const load=()=>publications??=fetch('data/publications.json').then(r=>{if(!r.ok)throw Error('Source register unavailable');return r.json();});
$$('.publication-register').forEach(box=>{
 const l=box.dataset.lang;let all=[],filtered=[],page=0;const size=15;
 async function start(){box.setAttribute('aria-busy','true');try{
  const d=await load();all=d.sources;
  box.innerHTML='<div class="filter-grid"><label>'+L('Find a publication or survey','Trouver une publication ou un sondage',l)+'<input class="publication-search" type="search"></label><label>'+L('Population','Population',l)+'<select class="publication-population"><option value="all">'+L('All populations','Toutes les populations',l)+'</option><option value="civilian">'+L('Civilian employees','Personnel civil',l)+'</option><option value="military">'+L('CAF members','Membres des FAC',l)+'</option><option value="mixed">'+L('Departmental or mixed','Ministérielle ou mixte',l)+'</option><option value="public">'+L('Public opinion','Opinion publique',l)+'</option><option value="programs">'+L('Program populations','Populations des programmes',l)+'</option><option value="family">'+L('Families','Familles',l)+'</option></select></label></div><p class="publication-status" role="status"></p><div class="publication-results"></div><div class="data-toolbar"><button type="button" class="publication-prev">'+L('Previous sources','Sources précédentes',l)+'</button><button type="button" class="publication-next">'+L('More sources','Autres sources',l)+'</button></div>';
  function draw(reset=false){if(reset)page=0;const q=norm($('.publication-search',box).value).split(/\s+/).filter(Boolean),pop=$('.publication-population',box).value;filtered=all.filter(x=>(pop==='all'||x.populationType===pop)&&q.every(t=>norm([x.en,x.fr,x.notes?.en,x.notes?.fr,x.period,x.category].join(' ')).includes(t)));const rows=filtered.slice(page*size,(page+1)*size);
   $('.publication-results',box).innerHTML='<ul class="publication-list">'+rows.map(x=>'<li><h3><a href="'+esc(x.url?.[l]||x.url?.en||x.url)+'">'+esc(x[l])+'</a></h3><p class="small">'+esc(x.population?.[l]||L('See the source population','Consulter la population de la source',l))+(x.period?' · '+esc(x.period):'')+'</p>'+(x.notes?.[l]?'<p>'+esc(x.notes[l])+'</p>':'')+'</li>').join('')+'</ul>';
   $('.publication-status',box).textContent=filtered.length?L('Sources ','Sources ',l)+(page*size+1)+'–'+Math.min((page+1)*size,filtered.length)+' / '+filtered.length:L('No sources match. Clear the search or change the population.','Aucune source correspondante. Effacez la recherche ou changez la population.',l);$('.publication-prev',box).disabled=page===0;$('.publication-next',box).disabled=(page+1)*size>=filtered.length;
  }
  $('.publication-search',box).addEventListener('input',()=>draw(true));$('.publication-population',box).addEventListener('change',()=>draw(true));$('.publication-prev',box).addEventListener('click',()=>{page--;draw();});$('.publication-next',box).addEventListener('click',()=>{page++;draw();});draw();
 }catch(e){box.innerHTML='<p role="alert">'+L('The register could not load. The direct source links in each evidence section remain available.','Le registre n’a pas pu être chargé. Les liens directs de chaque section restent disponibles.',l)+'</p>';}finally{box.removeAttribute('aria-busy');}}
 if('IntersectionObserver'in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){start();io.disconnect();}},{rootMargin:'300px'});io.observe(box);}else start();
});
$$('.defence-evidence').forEach(box=>{
 const l=box.dataset.lang;
 fetch('data/administrative-context.json').then(r=>{if(!r.ok)throw Error('Context unavailable');return r.json();}).then(d=>{
  if(!d.cards?.length)return;
  box.innerHTML=d.cards.map(card=>'<div class="keybox"><h3>'+esc(card[l])+'</h3><p>'+esc(card.description[l])+'</p>'+(card.rows?.length?'<div class="table-scroll" tabindex="0" role="region" aria-label="'+esc(card[l])+'"><table><caption>'+esc(card[l])+'</caption><thead><tr><th scope="col">'+L('Measure','Mesure',l)+'</th><th scope="col">'+L('Published result','Résultat publié',l)+'</th></tr></thead><tbody>'+card.rows.map(r=>'<tr><th scope="row">'+esc(r[l])+'</th><td>'+esc(r.value)+'</td></tr>').join('')+'</tbody></table></div>':'')+'<p class="source"><a href="'+esc(card.source[l])+'">'+L('Official source','Source officielle',l)+'</a></p>'+(card.caution?.[l]?'<p class="small">'+esc(card.caution[l])+'</p>':'')+'</div>').join('');
 }).catch(()=>{});
});
})();
