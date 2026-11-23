/* GC Equity: disclose missing section coverage in generated department profiles.
   This module adds status, not fabricated numbers. Specialist DFO/DND/ISC pages
   retain their bespoke sections. The generator defines the same section contract. */
(()=>{'use strict';
const dataNode=document.getElementById('dp-data');if(!dataNode)return;
let D;try{D=JSON.parse(dataNode.textContent)}catch{return}
const has=(id,root)=>!!root.querySelector('article>section>h2#'+id);
const ids=['at-a-glance','data-guide','who-works','experience','harassment','accommodation','hiring','branches','promised','planned','accessibility-plan','recourse','missing','data-library','publications','requests','actions','sources'];
const frids={'at-a-glance':'apercu','data-guide':'guide-donnees','who-works':'qui-travaille',experience:'experience-fr',harassment:'harcelement',accommodation:'mesures-adaptation',hiring:'embauche',branches:'unites',promised:'engagements',planned:'plans','accessibility-plan':'plan-accessibilite',recourse:'recours',missing:'lacunes','data-library':'bibliotheque',publications:'publications-fr',requests:'demandes',actions:'agir',sources:'sources-fr'};
const titles={
'who-works':['Workforce and representation','Effectif et représentation'],
'experience':['Employee experience','Expérience du personnel'],
'harassment':['Harassment and discrimination','Harcèlement et discrimination'],
'accommodation':['Workplace accommodation','Mesures d’adaptation au travail'],
'hiring':['Hiring and advancement','Embauche et avancement'],
'branches':['Organizational units','Unités organisationnelles'],
'promised':['Published commitments','Engagements publiés'],
'planned':['Departmental plans and results','Plans ministériels et résultats'],
'accessibility-plan':['Accessibility plans and progress','Plans d’accessibilité et rapports d’étape'],
'recourse':['Recourse and decisions','Recours et décisions']
};
const message={
'who-works':['A comparable employer-specific workforce row has not been matched in this collection. National or parent-organization headcounts are not substituted.','Aucune donnée comparable sur l’effectif propre à cet employeur n’a été associée dans cette collection. Les effectifs nationaux ou ceux d’un organisme parent ne les remplacent pas.'],
'experience':['No matched employer-specific employee survey result is available here. That is not evidence of a positive or negative employee experience.','Aucun résultat correspondant de sondage du personnel de cet employeur n’est disponible ici. Ce n’est pas une preuve d’une expérience positive ou négative.'],
'harassment':['This collection has no separately matched harassment or discrimination survey results for this reporting entity. Do not treat missing results as zero.','Cette collection ne comporte pas de résultats de sondage sur le harcèlement ou la discrimination associés séparément à cette entité. Les données manquantes ne valent pas zéro.'],
'accommodation':['An employer-specific accommodation result was not matched. The survey questions on requests, implementation and satisfaction have different respondent bases and cannot be inferred from another organization.','Aucun résultat de mesures d’adaptation propre à cet employeur n’a été associé. Les questions sur les demandes, la mise en œuvre et la satisfaction ont des bases différentes et ne peuvent être déduites des données d’un autre organisme.'],
'hiring':['An employer-specific applicant-to-appointment or promotion series by equity group has not been matched here. The number self-identifying with any equity group does not identify individual groups or selection rates.','Aucune série associée à cet employeur ne suit les candidatures, nominations ou promotions par groupe d’équité. Le nombre de personnes s’identifiant à au moins un groupe d’équité ne précise ni les groupes individuels ni les taux de sélection.'],
'branches':['No separate branch-level survey extract is indexed for this entity. Department-wide or other organizations’ results must not be assigned to branches.','Aucun extrait de sondage par direction n’est indexé pour cette entité. Les résultats ministériels ou d’autres organismes ne peuvent être attribués aux directions.'],
'promised':['This reading collection has no matched employer-specific commitment entry. This does not establish that the organization has made no commitment.','Cette collection ne contient aucun engagement associé à cet employeur. Cela ne signifie pas que l’organisme n’a pris aucun engagement.'],
'planned':['No department-specific plan has been matched in this reading collection. Some entities report through a parent institution or a different statutory reporting process.','Aucun plan ministériel propre à cet organisme n’a été associé dans cette collection. Certaines entités relèvent d’une institution mère ou d’un autre régime de rapports.'],
'accessibility-plan':['An official accessibility plan or progress report has not been linked to this entity in this collection. This is a source-indexing gap, not a finding of non-compliance or non-publication.','Aucun plan d’accessibilité ni rapport d’étape officiel n’a été lié à cette entité dans la collection. Il s’agit d’une lacune d’indexation et non d’un constat de non-conformité ou de non-publication.'],
'recourse':['This profile has no verified employer-specific adjudication inventory. The linked decision library is non-exhaustive; cases about program delivery are not automatically workplace findings.','Ce profil ne contient pas de répertoire vérifié des décisions visant l’employeur. La bibliothèque liée n’est pas exhaustive et les affaires de prestation de services ne constituent pas automatiquement des décisions concernant le milieu de travail.']
};
const review=['who-works','experience','harassment','accommodation','hiring','branches','promised','planned','accessibility-plan','recourse'];
const sourceUrl='https://aranpublicservants-rgb.github.io/aran-raar/recourse/cases/';
function safeUrl(url){try{const u=new URL(url,location.href);return u.protocol==='https:'?u.href:null}catch{return null}}
function buildSection(key,lang){const i=lang==='fr'?1:0,id=lang==='fr'?frids[key]:key;const section=document.createElement('section');section.className='dp-coverage-gap';section.setAttribute('aria-labelledby',id);section.dataset.sourceStatus='not-indexed';const h=document.createElement('h2');h.id=id;h.textContent=titles[key][i];section.append(h);const state=document.createElement('p');state.className='dp-coverage-state';state.textContent=lang==='fr'?'État des données : source propre à cet organisme non associée':'Evidence status: employer-specific source not matched';section.append(state);const p=document.createElement('p');p.textContent=message[key][i];section.append(p);const refs=document.createElement('p');refs.className='source';const a=document.createElement('a');a.href=key==='recourse'?sourceUrl:(safeUrl(D.directoryUrl)||new URL('../sources.html',location.href).href);a.textContent=key==='recourse'?(lang==='fr'?'Consulter la bibliothèque des décisions':'Consult the decision library'):(lang==='fr'?'Consulter le répertoire officiel de l’organisme':'Consult the organization’s official directory');refs.append(a);section.append(refs);const back=document.createElement('p');const link=document.createElement('a');link.href=lang==='fr'?'#lacunes':'#missing';link.textContent=lang==='fr'?'Consulter les lacunes dans les données':'See evidence gaps and limitations';back.append(link);section.append(back);return section}
for(const language of ['en','fr']){const root=document.getElementById('lang-'+language),article=root?.querySelector('.page-grid article');if(!root||!article)continue;
 const col=language==='fr'?1:0;const added=[];
 for(const key of review){const id=language==='fr'?frids[key]:key;if(has(id,root))continue;
  const next=ids.slice(ids.indexOf(key)+1).map(x=>language==='fr'?frids[x]:x).map(x=>article.querySelector('section>h2#'+x)?.parentElement).find(Boolean);
  const node=buildSection(key,language);
  if(next)article.insertBefore(node,next);else article.append(node);
  added.push(id);
 }
 if(!added.length)continue;
 const sections=[...article.querySelectorAll(':scope>section')],nav=root.querySelector('nav.contents ol'),jump=root.querySelector('.mobile-jump select');
 if(nav){nav.replaceChildren();for(const section of sections){const h=section.querySelector('h2[id]');if(!h)continue;const li=document.createElement('li'),a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;li.append(a);nav.append(li)}}
 if(jump){const old=jump.value;jump.replaceChildren();for(const section of sections){const h=section.querySelector('h2[id]');if(!h)continue;const option=new Option(h.textContent,h.id);jump.add(option)}if([...jump.options].some(x=>x.value===old))jump.value=old}
 if('IntersectionObserver' in window){const io=new IntersectionObserver(items=>{for(const item of items){if(!item.isIntersecting)continue;root.querySelectorAll('.contents a').forEach(a=>{if(a.hash==='#'+item.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')})}},{rootMargin:'-5% 0px -75% 0px'});for(const id of added){const h=document.getElementById(id);if(h)io.observe(h)}}
 document.dispatchEvent(new CustomEvent('gce-department-coverage-updated',{detail:{language,added:added.length}}));
}
})();
