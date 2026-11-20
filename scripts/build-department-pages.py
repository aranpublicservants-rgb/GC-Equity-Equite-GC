#!/usr/bin/env python3
"""Generate source-isolated bilingual department pages and the route register.

The identity crosswalk records exact, source-specific labels. Suppressed cells
are preserved, and missing datasets never fall back to a national or other row.
The three specialist pages keep their reviewed departmental content.
"""
import base64
import csv
import gzip
import hashlib
import html
import io
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import quote

R=Path(__file__).resolve().parents[1]
J=lambda p:json.loads((R/p).read_text())
E=lambda s:html.escape(str(s if s is not None else ''),quote=True)
N=lambda s:re.sub('[^a-z0-9]','',unicodedata.normalize('NFD',str(s)).encode('ascii','ignore').decode().lower())
def read_csv(path):
 raw=(R/path).read_bytes()
 if path.endswith('.gz'):raw=gzip.decompress(raw)
 try:text=raw.decode('utf-8-sig')
 except UnicodeDecodeError:text=raw.decode('cp1252')
 return list(csv.DictReader(io.StringIO(text)))

cross=J('data/department-identity-crosswalk.json')
model=J('assets/workspace-data.json')
series=J('data/tbs-departmental-representation-2017-2025.json')
pses=J('assets/department-profile-index.json')
snps=J('data/snps-2025-by-organization.json')
cta=J('data/call-to-action-letters.json')['organizations']
psc=J('data/psc/psc-equity.json')
catalogue=J('assets/assistant-catalogue.json')
publications=J('assets/department-publication-links.json')['organizations']
women=read_csv('women-femmes/data/csv/women-by-organization-2025.csv')
women_native=J('data/tbs-women-departmental-2025.json')['orgs']
indigenous=read_csv('data/october-2026/TBS_Indigenous_subgroups_by_department_2025.csv')
disability=read_csv('data/october-2026/TBS_disability_subgroups_by_department_2024.csv')
execrows=read_csv('data/restored/16c75ddc-475b-4e62-b883-d5517181c9cf.csv')
branchmeta=json.loads(re.search(r'<script type="application/json" id="eq-branch-meta">(.*?)</script>',(R/'explorer.html').read_text(),re.S)[1])
template=J('data/department-page-template.json')['sections']
template=[x for x in template if x['id'] not in ['identities','caf','conduct','coast-guard']]
frids={'at-a-glance':'apercu','data-guide':'guide-donnees','who-works':'qui-travaille','experience':'experience-fr','harassment':'harcelement','accommodation':'mesures-adaptation','hiring':'embauche','branches':'unites','promised':'engagements','planned':'plans','accessibility-plan':'plan-accessibilite','recourse':'recours','missing':'lacunes','data-library':'bibliotheque','publications':'publications-fr','requests':'demandes','actions':'agir','sources':'sources-fr'}
special={'Fisheries and Oceans Canada':'dfo','National Defence':'dnd','Indigenous Services Canada':'isc'}
short={'Employment and Social Development Canada':'esdc','Canada Revenue Agency':'cra','Royal Canadian Mounted Police (public service employees)':'rcmp','Health Canada':'health-canada','Canadian Heritage':'canadian-heritage','Statistics Canada':'statistics-canada','Crown-Indigenous Relations and Northern Affairs Canada':'cirnac'}
source={'tbs':'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics.html','women':'https://www.canada.ca/en/treasury-board-secretariat/services/innovation/human-resources-statistics/diversity-inclusion-statistics/employment-equity-public-service-representation-women-department-agency-departmental-workforce-availability-estimates.html','pses':pses['sources']['groups'],'overall':pses['sources']['overallPublisherUrl'],'staffing':snps['dataset'],'psc':'https://www.canada.ca/en/public-service-commission.html','directory':'https://www.canada.ca/en/government/dept.html','recourse':'https://aranpublicservants-rgb.github.io/aran-raar/recourse/'}
if not str(source['staffing']).startswith('https://'):raise ValueError('Staffing publisher URL missing')

def same_names(rec,field):
 return rec.get('sources',{}).get(field,[])
def find(mapping,names):
 matches=[(k,v) for k,v in mapping.items() if N(k) in {N(x) for x in names}]
 if len(matches)>1 and any(v!=matches[0][1] for _,v in matches[1:]):
  raise ValueError('Ambiguous source identity: '+str([x[0] for x in matches]))
 return matches[0] if matches else (None,None)
def row_matches(row,field,names):return N(row.get(field,'')) in {N(x) for x in names}
def matched_catalogue(rec):
 names={N(x) for x in rec['datasetNames']}
 found=[]
 for f in catalogue['datasets']:
  if f.get('organizationScope') and N(f['organizationScope']) not in names:continue
  if any(N(n) in names for n in f.get('organizations',[])):
   found.append(f)
 return found
def profile_for(names):
 key,entry=find(pses['organizations'],names)
 if not entry:return None,None
 d=json.loads(gzip.decompress(base64.b64decode((R/entry['path']).read_bytes())))
 assert d['organization']==key
 return entry,d

def record(rec):
 names=rec['datasetNames'];keys={N(x) for x in names}
 rkey,rep=find(series['orgs'],same_names(rec,'tbsRepresentation'))
 entry,profile=profile_for(same_names(rec,'psesDetailed'))
 _,summary=find(model['PSES_DEPT'],same_names(rec,'psesSummary'))
 _,staff=find(snps['orgs'],same_names(rec,'snps2025'))
 owncta=[o for o in cta if any(N(x) in keys for x in [o.get('name_en'),o.get('site_name'),o.get('pses_name'),o.get('plan_name'),o.get('snps_name')] if x)]
 # Explicit shared-population protections in the crosswalk take precedence over
 # the old selector's source aliases.
 if rec.get('combinedPopulation'):owncta=[o for o in owncta if N(o['name_en'])==N(rec['en'])]
 if len(owncta)>1:owncta=[o for o in owncta if N(o['name_en'])==N(rec['en'])]
 owncta=owncta[0] if len(owncta)==1 else None
 plan=next((p for p in model['plans'] if p['name'] in same_names(rec,'departmentalPlan')),None)
 pubs=[v for n,v in publications.items() if n in same_names(rec,'departmentalPlan')]
 publist=[]
 for p in pubs:
  for x in p.get('publications',[]):
   if x['url'] not in [y['url'] for y in publist]:publist.append(x)
 w=next((dict(w) for w in women if row_matches(w,'Organization',same_names(rec,'tbsRepresentation'))),None)
 if w:
  _,native=find(women_native,same_names(rec,'tbsRepresentation'))
  if native:w['Published count']=native['count']
 workforce=next((x for x in model['DEPTS'] if N(x[0]) in {N(n) for n in same_names(rec,'tbsRepresentation')}),None)
 _,hiring=find(psc['hiring'],same_names(rec,'pscIndexed'))
 branch=next((x for x in branchmeta['departments'] if N(x['en']) in {N(n) for n in same_names(rec,'psesDetailed')+same_names(rec,'psesSummary')}),None)
 matched=matched_catalogue(rec)
 all_values=profile['overall'] if profile else {q:[str(v),''] for q,v in (summary or {}).items()}
 return {'id':rec['id'],'en':rec['en'],'fr':rec['fr'],'path':rec['path'],'datasetNames':names,'sourceNames':rec.get('sources',{}),
 'combinedPopulation':rec.get('combinedPopulation',False),'scope':rec.get('scope',{}),'populationNote':rec.get('populationNote',{}),
 'representationName':rkey,'representation':rep or {},'women':w,'workforce':workforce,'psesEntry':entry,'psesOrganization':profile['organization'] if profile else None,'overall':all_values,
 'history':find(model['YOY'],same_names(rec,'psesSummary'))[1] or {},'staffing':staff or {},'hiring':hiring or {},'cta':owncta,'plan':plan,'publications':publist,
 'branch':branch,'catalogueCount':len(matched),'rawCatalogueCount':sum(1 for f in matched if f.get('partitions') or re.search(r'\.csv(?:\.gz)?$',f['path'])),
 'indigenousSubgroups':next((x for x in indigenous if row_matches(x,'department_or_agency',same_names(rec,'tbsRepresentation'))),None),
 'disabilitySubgroups':next((x for x in disability if row_matches(x,'department_or_agency',same_names(rec,'tbsRepresentation'))),None),
 'executivePopulation':[x for x in execrows if row_matches(x,'Department or agency',names)],'directoryUrl':rec.get('officialUrl') or source['directory']}

def L(l,en,fr):return fr if l=='fr' else en
def link(url,label,**attrs):return '<a href="'+E(url)+'"'+''.join(' '+k+'="'+E(v)+'"' for k,v in attrs.items())+'>'+E(label)+'</a>'
def published(v):return v is not None and str(v).strip() not in ['', 'X','x','*','-1','9999']
def cell(v,l,percent=False):
 if str(v) in ['X','x','*','-1']:return L(l,'Suppressed','Supprimé')
 if not published(v):return L(l,'Not published / not applicable','Non publié / sans objet')
 if percent:return E(str(v).replace('.',',') if l=='fr' else v)+(' %' if l=='fr' else '%')
 return E(v)
def sources(l,urls):
 urls=urls if isinstance(urls,list) else [urls]
 return '<p class="source">'+L(l,'Source: ','Source : ')+' · '.join(link(u,L(l,'Published source '+str(i+1),'Source publiée '+str(i+1))) for i,u in enumerate(dict.fromkeys(urls)))+'</p>'
def table(l,caption,heads,rows,urls,attrs=''):
 if not rows:return '<p class="note">'+L(l,'No matching published cells in the retained collection.','Aucune cellule publiée correspondante dans la collection conservée.')+'</p>'
 return '<div class="table-scroll" role="region" tabindex="0" aria-label="'+E(caption)+'" '+attrs+'><table><caption>'+E(caption)+'</caption><thead><tr>'+''.join('<th scope="col">'+E(h)+'</th>' for h in heads)+'</tr></thead><tbody>'+''.join('<tr>'+''.join(('<th scope="row">' if i==0 else '<td>')+str(v)+('</th>' if i==0 else '</td>') for i,v in enumerate(row))+'</tr>' for row in rows)+'</tbody></table></div>'+sources(l,urls)
def bars(l,rows):
 out=''
 for label,v in rows:
  if published(v):
   try:n=float(v)
   except (ValueError,TypeError):continue
   if not 0<=n<=100:continue
   out+='<div class="dp-bar"><span>'+E(label)+'</span><div><span style="width:'+str(n)+'%"></span></div><span>'+cell(v,l,True)+'</span></div>'
 return '<div class="dp-bars" aria-hidden="true">'+out+'</div>' if out else ''
def survey(d,l,qs,title):
 valid=[q for q in qs if q in pses['definitions']]
 rows=[[E(pses['definitions'][q][l]),cell(d['overall'].get(q,[None,None])[0],l,True),cell(d['overall'].get(q,[None,None])[1],l)] for q in valid]
 source_url=source['overall']
 chart=bars(l,[(q,d['overall'].get(q,[None])[0]) for q in qs[:4]])
 return '<div class="dp-survey" data-questions="'+','.join(valid)+'">'+chart+table(l,title,[L(l,'Question','Question'),L(l,'Published result','Résultat publié'),L(l,'Rounded responses','Réponses arrondies')],rows,source_url)+'</div>'

groupnames={'i':['Indigenous peoples','Peuples autochtones'],'d':['Persons with disabilities','Personnes en situation de handicap'],'v':['Racialized employees','Personnes racisées'],'b':['Black employees','Personnes noires']}
goals={'indigenous_recruitment':['Indigenous recruitment','Recrutement autochtone'],'black_recruitment':['Black recruitment','Recrutement des personnes noires'],'racialized_recruitment':['Racialized recruitment','Recrutement des personnes racisées'],'indigenous_promotion':['Indigenous promotions','Promotions des personnes autochtones'],'black_promotion':['Black promotions','Promotions des personnes noires'],'racialized_promotion':['Racialized promotions','Promotions des personnes racisées'],'inclusion':['Inclusion','Inclusion']}
status={'set':['Reported goals set','Objectifs déclarés comme établis'],'underway':['Work reported underway','Travaux déclarés en cours'],'none':['No goal recorded in this response','Aucun objectif consigné dans cette réponse']}

def available_sections(d):
 have={'at-a-glance','data-guide','missing','data-library','publications','requests','actions','sources'}
 if d['representation'] or d['women'] or d['executivePopulation']:have.add('who-works')
 if d['overall']:have.update(['experience','harassment'])
 if any(q in d['overall'] for q in ['Q84','Q86','Q87','Q88']):have.add('accommodation')
 if d['staffing'] or d['hiring'] or d['rawCatalogueCount']:have.add('hiring')
 if d['branch']:have.add('branches')
 if d['cta']:have.add('promised')
 if d['plan']:have.add('planned')
 if any(re.search(r'accessib',x['title'],re.I) for x in d['publications']):have.add('accessibility-plan')
 if d['overall'] or d['representation']:have.add('recourse')
 return [s for s in template if s['id'] in have]

def title(s,d,l):
 if s['id']=='data-guide':return L(l,'Ask about '+d['en']+' data','Trouver des données sur cet organisme')
 if s['id']=='who-works':return L(l,'Who works at '+d['en'],'L’effectif de cet organisme')
 if s['id']=='data-library':return L(l,'All '+d['en']+' datasets','Tous les jeux de données de cet organisme')
 return s[l].replace('{dept}',d[l])

def content(s,d,l,sections):
 B=lambda en,fr:L(l,en,fr);key=s['id'];ids=lambda x:frids[x] if l=='fr' else x
 if key=='at-a-glance':
  cards=[]
  if d['workforce']:cards.append(('who-works',str(d['workforce'][1]),B('Employment equity population, March 31, 2025','Population d’équité, 31 mars 2025')))
  for q,label,ft,anchor in [('Q58','Reported harassment, PSES 2024','Harcèlement déclaré, SAFF 2024','harassment'),('Q65','Reported discrimination, PSES 2024','Discrimination déclarée, SAFF 2024','harassment'),('Q42','Recourse without fear, PSES 2024','Recours sans crainte, SAFF 2024','experience'),('Q86','Any accommodation implemented, PSES 2024','Une mesure d’adaptation mise en place, SAFF 2024','accommodation')]:
   v=d['overall'].get(q,[None])[0]
   if published(v):cards.append((anchor,cell(v,l,True),B(label,ft)))
  intro='<p class="lead">'+B('Read this organization’s workforce, employee experiences and published commitments together. Each source keeps its own reporting population, reference year and definitions.','Consultez ensemble les données sur l’effectif, l’expérience du personnel et les engagements publiés de cet organisme. Chaque source conserve sa propre population, son année et ses définitions.')+'</p>'
  if not cards:intro+='<p class="note">'+B('The directory includes entities that are not separate public-service employers. This collection has no matched workforce or employee-survey reading figures for this entry. The evidence gaps and source register explain the coverage.','Le répertoire comprend des entités qui ne sont pas des employeurs distincts de la fonction publique. Cette collection ne contient pas de chiffres de lecture associés à cette entrée sur l’effectif ou les sondages. Les lacunes et le registre expliquent la couverture.')+'</p>'
  intro+='<div class="stat-grid">'+''.join('<a class="stat-card" href="#'+ids(a)+'"><span class="stat">'+v+'</span><span>'+E(t)+'</span></a>' for a,v,t in cards[:4])+'</div>'
  if d['populationNote']:intro+='<p class="scope-note">'+E(d['populationNote'].get(l) or d['populationNote'].get('en',''))+'</p>'
  return intro+sources(l,([source['tbs']] if d['representation'] else [])+([source['overall']] if d['overall'] else []) or [d['directoryUrl']])
 if key=='data-guide':
  return '<p>'+B('Choose a topic. Follow-up choices retrieve the selected organization’s published measures and source records.','Choisissez un sujet. Les choix suivants présentent les mesures et les données publiées de l’organisme sélectionné.')+'</p><div class="dp-guide"><div class="choice-chips" role="group" aria-label="'+B('Data topic','Sujet de données')+'">'+''.join('<button type="button" data-guide-topic="'+topic+'" aria-pressed="false">'+B(en,fr)+'</button>' for topic,en,fr in [('workforce','Workforce','Effectif'),('experience','Employee experience','Expérience du personnel'),('accommodation','Accommodation','Adaptation'),('hiring','Hiring and advancement','Embauche et avancement'),('commitments','Commitments and results','Engagements et résultats'),('sources','Source records','Données sources')])+'</div><div class="dp-guide-answer" aria-live="polite"><p>'+B('Select a topic to begin.','Choisissez un sujet pour commencer.')+'</p></div></div>'
 if key=='who-works':
  rows=[];urls=[]
  if d['women']:
   w=d['women'];rows.append([B('Women','Femmes'),cell(w.get('Published count'),l),cell(w.get('Women (%)'),l,True),cell(w.get('Departmental workforce availability for women (%)'),l,True)]);urls.append(source['women'])
  for k,names in groupnames.items():
   v=d['representation'].get(k,{}).get('2025')
   if v:rows.append([B(*names),cell(v[1],l),cell(v[2],l,True),cell(v[3],l,True) if len(v)>3 else B('No formal benchmark in this source','Aucun point de référence officiel dans cette source')]);urls.append(series['pages'][k]['url'])
  out=table(l,B('Representation and departmental availability, March 31, 2025','Représentation et disponibilité ministérielle, 31 mars 2025'),[B('Group','Groupe'),B('Published employees','Effectifs publiés'),B('Representation','Représentation'),B('Availability','Disponibilité')],rows,urls or source['tbs'],'data-representation="true"')
  out+='<p>'+B('These are core-public-administration employment equity populations. Students, casual workers and other excluded employment categories are not added. Groups overlap. A representation difference does not establish its cause or an individual’s chance of hiring. Do not calculate employee shortfalls from rounded shares.','Il s’agit des populations d’équité de l’administration publique centrale. Les étudiants, les occasionnels et les autres catégories exclues ne sont pas ajoutés. Les groupes se chevauchent. Un écart ne démontre pas sa cause ni une probabilité individuelle d’embauche. Ne calculez pas de déficits d’effectifs à partir des parts arrondies.')+'</p>'
  years=sorted({y for k,v in d['representation'].items() if k!='labels' for y in v})
  if years:
   out+=table(l,B('Published representation by year','Représentation publiée par année'),[B('Year','Année')]+[B(*groupnames[k])+' (%)' for k in ['i','d','v','b']],[[y]+[cell(d['representation'].get(k,{}).get(y,[None,None,None])[2],l,True) for k in ['i','d','v','b']] for y in years],urls or source['tbs'])
  for data,year,heading in [(d['indigenousSubgroups'],'2025',B('Indigenous subgroups','Sous-groupes autochtones')),(d['disabilitySubgroups'],'2024',B('Disability subgroups','Sous-groupes liés au handicap'))]:
   if data:
    sub_labels={'inuit':['Inuit','Inuit'],'metis':['Métis','Métis'],'first_nations':['First Nations','Premières Nations'],'other':['Other Indigenous identity','Autre identité autochtone'],'indigenous_peoples':['Indigenous peoples','Peuples autochtones'],'coordination_dexterity':['Coordination or dexterity','Coordination ou dextérité'],'mobility':['Mobility','Mobilité'],'speech_impairment':['Speech impairment','Trouble de la parole'],'blind_visual_impairment':['Blindness or visual impairment','Cécité ou déficience visuelle'],'deaf_hard_of_hearing':['Deaf or hard of hearing','Surdité ou difficulté auditive'],'other_disability':['Other disability','Autre handicap'],'persons_with_disabilities':['Persons with disabilities','Personnes en situation de handicap']}
    rows=[[B(*sub_labels.get(k[:-4],[k[:-4],k[:-4]])),cell(v,l,True),cell(data.get(k[:-4]+'_number'),l)] for k,v in data.items() if k.endswith('_pct')]
    path='data/october-2026/'+('TBS_Indigenous_subgroups_by_department_2025.csv' if year=='2025' else 'TBS_disability_subgroups_by_department_2024.csv')
    out+='<h3>'+heading+' · '+year+'</h3>'+table(l,heading+' · '+year,[B('Published category','Catégorie publiée'),B('Share','Part'),B('Published count','Effectif publié')],rows,'../'+path)+'<p>'+B('Keep this subgroup table’s year and population separate. Categories may overlap; missing and suppressed cells are not zero.','Conservez l’année et la population propres à ce tableau. Les catégories peuvent se chevaucher; les cellules manquantes ou supprimées ne valent pas zéro.')+'</p>'
  if d['executivePopulation']:
   out+='<h3>'+B('Executive headcount','Effectif des cadres')+'</h3>'+table(l,B('Published executive population by year','Population publiée des cadres par année'),[B('Year','Année'),B('Universe','Univers'),B('Category','Catégorie'),B('Employees','Effectif')],[[E(x['Year']),E(x['Universe']),E(x['Executives']),cell(x['Number of employees'],l)] for x in d['executivePopulation'] if x['Executives']=='Executives'],'../data/restored/16c75ddc-475b-4e62-b883-d5517181c9cf.csv')+'<p>'+B('This is an executive headcount, not executive representation by equity group.','Il s’agit d’un effectif de cadres, et non de leur représentation par groupe d’équité.')+'</p>'
  return out
 if key=='experience':
  out=survey(d,l,['Q12','Q24','Q25','Q42','Q43','Q45','Q47','Q49','Q51','Q52','Q53','Q77','Q78','Q81'],B('Employee experience, PSES 2024','Expérience des employés, SAFF 2024'))
  out+='<p>'+B('Q51 measures a negative mental-health impact of racism. Higher values mean more reported harm. Q77 combines excellent and very good mental health. These survey results do not establish clinical diagnoses or causation.','La Q51 mesure une incidence négative du racisme sur la santé mentale. Une valeur élevée indique davantage de préjudices signalés. La Q77 combine une santé mentale excellente et très bonne. Ces résultats n’établissent ni diagnostic clinique ni causalité.')+'</p>'
  if d['history']:
   rows=[[q,cell(v.get('a'),l,True),cell(v.get('b'),l,True)] for q,v in d['history'].items()]
   out+=table(l,B('Overall survey comparison, 2022 and 2024','Comparaison du sondage global, 2022 et 2024'),['Question','2022','2024'],rows,source['overall'])+'<p>'+B('The historical comparison concerns all respondents, independently of the group selected above. Changes are descriptive and do not explain causes.','La comparaison historique concerne tous les répondants, indépendamment du groupe choisi ci-dessus. Les changements sont descriptifs et n’expliquent pas leurs causes.')+'</p>'
  return out
 if key=='harassment':return survey(d,l,['Q58','Q65','Q24','Q42','Q63','Q70','Q72'],B('Harassment, discrimination and recourse confidence, PSES 2024','Harcèlement, discrimination et confiance dans les recours, SAFF 2024'))+'<p>'+B('Q58 and Q65 concern reported experiences in the previous 12 months. Q72 concerns satisfaction with racism-complaint resolution and may have a small or suppressed base. Survey responses, formal complaints and substantiated investigations are different measures.','Les Q58 et Q65 portent sur les expériences déclarées des 12 derniers mois. La Q72 porte sur la satisfaction quant au règlement des plaintes de racisme; sa base peut être petite ou supprimée. Les réponses, les plaintes officielles et les enquêtes fondées sont des mesures différentes.')+'</p>'
 if key=='accommodation':return survey(d,l,['Q84','Q85','Q86','Q87','Q88','Q44e','Q73p','Q73q'],B('Workplace accommodation, PSES 2024','Mesures d’adaptation, SAFF 2024'))+'<p>'+B('Q86 concerns requesters; Q87 concerns people whose measures were implemented; Q88 measures comfort requesting accommodation. These are different bases, not stages in one cohort. Any measure implemented does not mean every need was met. Q44e and Q73p concern adverse career effects and stress.','La Q86 concerne les personnes ayant fait une demande; la Q87, celles dont les mesures ont été mises en place; la Q88, l’aisance à demander une adaptation. Ce sont des bases différentes, et non les étapes d’une même cohorte. La mise en place d’une mesure ne signifie pas que tous les besoins sont satisfaits. Les Q44e et Q73p portent sur les effets négatifs sur la carrière et le stress.')+'</p>'
 if key=='hiring':
  out=''
  if d['staffing']:
   rows=[[q+' · '+E(meta[l]),cell(d['staffing'].get('all',{}).get(q),l,True),E(meta['base_fr' if l=='fr' else 'base'])] for q,meta in snps['questions'].items()]
   out+='<div class="dp-staffing">'+table(l,B('Staffing survey 2025','Sondage sur la dotation de 2025'),[B('Question','Question'),B('Weighted result','Résultat pondéré'),B('Respondent base','Base de répondants')],rows,source['staffing'])+'</div><p>'+E(snps['method_fr' if l=='fr' else 'method'])+'</p><p>'+B('Experiences cover April 1, 2024 to March 31, 2025. Staffing-survey groups have their own definitions; they are not workforce headcounts or individual selection rates.','Les expériences couvrent la période du 1er avril 2024 au 31 mars 2025. Les groupes du sondage ont leurs propres définitions; ils ne sont ni des effectifs ni des probabilités individuelles de sélection.')+'</p>'
  if d['hiring']:
   out+=table(l,B('Appointments by equity self-identification','Nominations selon l’auto-identification aux fins de l’équité'),[B('Fiscal year','Exercice'),B('Identified with at least one equity group','Auto-identification à au moins un groupe d’équité'),B('Did not self-identify','Sans auto-identification')],[[year]+[cell(v,l) for v in vals] for year,vals in d['hiring']['years'].items()],source['psc'])+'<p>'+B('This table does not identify specific equity groups. Suppressed counts remain suppressed. It does not measure an individual’s hiring probability.','Ce tableau ne précise pas les groupes d’équité particuliers. Les effectifs supprimés restent supprimés. Il ne mesure pas une probabilité individuelle d’embauche.')+'</p>'
  return out+'<p>'+link('#'+ids('data-library'),B('Read all matched staffing, appointment, promotion and departure source files','Consulter les fichiers associés sur la dotation, les nominations, les promotions et les départs'))+'</p>'
 if key=='branches':
  branch=d['branch'];rows=[[E(x['id']),E(x[l])] for x in branch['branches']]
  return '<p>'+B('Unit names are those published for the 2024 survey and may differ from the current structure. Choose the branch source in the data library to filter published rows. Do not reconstruct department or suppressed group results by combining branches.','Les unités sont celles du sondage de 2024 et peuvent différer de la structure actuelle. Choisissez le fichier des unités dans la bibliothèque pour filtrer les lignes publiées. Ne reconstituez pas les résultats ministériels ou supprimés en combinant les unités.')+'</p>'+table(l,B('Organizational units, PSES 2024','Unités organisationnelles, SAFF 2024'),['ID',B('Published unit','Unité publiée')],rows,branchmeta['sourceCsv'])
 if key=='promised':
  c=d['cta'];out='<p>'+B('These are the organization’s dated reported commitments and self-assessment. They do not establish that a barrier was removed.','Il s’agit des engagements et de l’autoévaluation datés de l’organisme. Ils ne démontrent pas qu’un obstacle a été supprimé.')+'</p>'
  a=c.get('self_assessment')
  if a:
   rows=[[B(*goals.get(k,[k,k])),B(*status[v['status']])] for k,v in a['goals'].items()]
   out+=table(l,B('Reported goal status, 2024','État déclaré des objectifs, 2024'),[B('Area','Domaine'),B('Status reported by the organization','État déclaré par l’organisme')],rows,a['url'])
  if c.get('letter'):out+='<p>'+link(c['letter']['url'],B('Read the 2021 original commitments','Consulter les engagements originaux de 2021'))+'</p>'
  if a:out+='<p>'+link(a['url'],B('Read the original 2024 progress, barriers and employee-network account','Consulter les progrès, les obstacles et le rôle des réseaux dans le texte original de 2024'))+'</p>'
  if l=='en' and a:
   for field,label in [('barriers','Barriers reported by the organization'),('progress','Actions reported by the organization')]:
    vals=a.get(field,[])
    if vals:out+='<details><summary>'+label+'</summary><ul>'+''.join('<li>'+E(v)+'</li>' for v in vals)+'</ul></details>'+sources(l,a['url'])
  return out
 if key=='planned':
  return '<p>'+B('The departmental plan states intended work. Its Internal Services section can describe workforce actions, while program results concern different populations. Mentions of equity or inclusion are not implementation outcomes.','Le plan ministériel décrit les travaux prévus. Les Services internes peuvent présenter des mesures sur l’effectif, tandis que les résultats des programmes concernent d’autres populations. Les mentions d’équité ou d’inclusion ne sont pas des résultats de mise en œuvre.')+'</p><p>'+link(d['plan']['url'],B('Read the organization’s 2026–27 Departmental Plan','Consulter le plan ministériel de 2026-2027 de l’organisme'))+'</p>'+sources(l,d['plan']['url'])+'<p>'+B('Compare dated commitments with measured employee and staffing results above. This page does not infer a departmental-results finding from a plan.','Comparez les engagements datés aux résultats mesurés auprès du personnel et en dotation ci-dessus. Cette page ne déduit pas de résultat ministériel à partir d’un plan.')+'</p>'
 if key=='accessibility-plan':
  pubs=[p for p in d['publications'] if re.search('accessib',p['title'],re.I)]
  return '<p>'+B('These official accessibility links were indexed from the organization’s own plan. A link register is not a substantive review of every commitment or a finding that the plan was implemented.','Ces liens officiels ont été indexés à partir du plan de l’organisme. Un registre de liens n’est pas un examen de chaque engagement ni un constat de mise en œuvre.')+'</p><ul>'+''.join('<li>'+link(p['url'],p['title'],lang=p.get('lang','en'))+'</li>' for p in pubs)+'</ul><p>'+B('Use the original plan and progress report to check dates, responsible offices, consultation findings, waiting times, interim support and unmet needs. Compare them with the accommodation questions where available.','Utilisez le plan et le rapport d’étape pour vérifier les dates, les responsables, les consultations, les délais, le soutien provisoire et les besoins non satisfaits. Comparez-les aux questions sur l’adaptation disponibles.')+'</p>'
 if key=='recourse':
  return '<p>'+B('This page does not provide a department-specific inventory of court or tribunal decisions. The linked guide helps identify the process that applies to the person’s employment status and concern. An administrative report, a grievance and an adjudicated finding are different records.','Cette page ne fournit pas de répertoire ministériel des décisions judiciaires ou des tribunaux. Le guide aide à trouver le processus applicable au statut d’emploi et à la préoccupation de la personne. Un rapport administratif, un grief et une conclusion d’un tribunal sont des dossiers différents.')+'</p><p>'+link(source['recourse']+('?lang=fr' if l=='fr' else ''),B('Recourse guide and union finder','Guide des recours et recherche du syndicat'))+'</p><p>'+B('Confirm the applicable process and deadline with the responsible office or a representative. Informal discussions do not automatically extend formal deadlines.','Vérifiez le processus et le délai applicables auprès du bureau responsable ou d’un représentant. Les discussions informelles ne prolongent pas automatiquement les délais officiels.')+'</p>'+sources(l,source['recourse'])
 if key=='missing':
  present={x['id'] for x in sections};rows=[]
  for item in template:
   if item['id'] not in present:rows.append([E(title(item,d,l)),B('No matching source in this reading collection. Check the issuing organization’s original records.','Aucune source correspondante dans cette collection de lecture. Consultez les documents originaux de l’organisme.')])
  rows.extend([[B('Executive equity cross-tabs','Ventilations de l’équité chez les cadres'),B('An executive total does not establish equity-group representation by level or occupation. Request a dated, privacy-safe cross-tab.','Un effectif de cadres n’établit pas leur représentation par groupe, niveau ou profession. Demandez une ventilation datée respectant la vie privée.')],[B('Accessibility outcomes and decisions','Résultats de l’accessibilité et décisions'),B('A complete departmental commitment tracker, accommodation timeliness series and case inventory have not been established by this page.','Cette page n’établit pas un suivi complet des engagements, une série des délais d’adaptation ou un répertoire des décisions ministérielles.')],[B('Population and suppressed cells','Population et cellules supprimées'),B('National, combined-department and predecessor populations cannot replace this organization’s missing cells. Suppressed counts are never reconstructed.','Les populations nationales, regroupées ou des prédécesseurs ne remplacent pas les cellules manquantes de cet organisme. Les effectifs supprimés ne sont jamais reconstitués.')]])
  return '<p>'+B('These are limits of the reviewed collection, not proof that records do not exist. Military and Coast Guard sections are kept on the specialist pages where those populations apply. Employee subgroups are included in the workforce and survey sections when published.','Il s’agit des limites de la collection examinée, et non de preuves que des documents n’existent pas. Les sections militaires et de la Garde côtière restent sur les pages spécialisées où ces populations s’appliquent. Les sous-groupes figurent dans les sections sur l’effectif et les sondages lorsqu’ils sont publiés.')+'</p>'+table(l,B('Evidence to obtain or clarify','Données à obtenir ou à préciser'),[B('Topic','Sujet'),B('Evidence gap','Lacune')],rows,[d['directoryUrl']])
 if key=='data-library':
  return '<p>'+B('Read the source files whose published organization labels match this page. National totals and other employers’ rows are not substituted. Files and historical editions can overlap; rows are not employee counts.','Consultez les fichiers dont les libellés d’organisme publiés correspondent à cette page. Aucun total national ni résultat d’un autre employeur ne les remplace. Les fichiers et éditions peuvent se chevaucher; les lignes ne sont pas des effectifs.')+'</p><div class="dp-library"><label>'+B('Find a dataset','Trouver un jeu de données')+'<input class="dp-file-search" type="search"></label><label>'+B('Dataset','Jeu de données')+'<select class="dp-file-picker"><option>'+B('Loading the source register…','Chargement du registre…')+'</option></select></label><div class="dp-data-view" aria-live="polite"></div></div>'
 if key=='publications':
  links=[]
  if d['plan']:links.append((d['plan']['url'],B('Departmental Plan 2026–27','Plan ministériel de 2026-2027')))
  if d['cta']:
   for k,en,fr in [('letter','Original Call to Action letter, 2021','Lettre originale liée à l’Appel à l’action, 2021'),('self_assessment','Original Call to Action self-assessment, 2024','Autoévaluation originale liée à l’Appel à l’action, 2024')]:
    if d['cta'].get(k):links.append((d['cta'][k]['url'],B(en,fr)))
  links.extend((p.get('urlFr',p['url']) if l=='fr' else p['url'],p.get('titleFr',p['title']) if l=='fr' else p['title']) for p in d['publications'])
  if d['overall']:links.append((source['overall'],B('PSES 2024 overall source (CSV)','Source globale du SAFF 2024 (CSV)')))
  if d['psesEntry']:links.append((source['pses'],B('PSES 2024 employee-group source (CSV)','Source du SAFF 2024 par groupe (CSV)')))
  if d['staffing']:links.append((source['staffing'],B('Staffing survey 2025 and methodology','Sondage sur la dotation de 2025 et méthodes')))
  if not links:links.append((d['directoryUrl'],B('Official organization directory or landing page','Répertoire ou page officielle de l’organisme')))
  return '<p>'+B('Original reports and survey methods relevant to this page. Related publication titles retain the language in which they were indexed. A listed link does not establish a complete substantive review.','Rapports originaux et méthodes des sondages pertinents pour cette page. Les titres connexes conservent leur langue d’indexation. Un lien répertorié n’établit pas un examen de fond complet.')+'</p><ul>'+''.join('<li>'+link(u,t)+'</li>' for u,t in dict.fromkeys(links))+'</ul>'
 if key=='requests':
  return '<p>'+B('Prepare an aggregate request using this organization’s name, reporting period, population, groups and outcome measures. Keep personal case details out of the request.','Préparez une demande agrégée en précisant l’organisme, la période, la population, les groupes et les résultats à mesurer. Évitez les détails de dossiers personnels.')+'</p><div class="dp-request"><label>'+B('Topic','Sujet')+'<select class="dp-request-topic">'+''.join('<option>'+B(en,fr)+'</option>' for en,fr in [('Representation by group, level and occupation','Représentation par groupe, niveau et profession'),('Accommodation waiting times, interim support and unmet needs','Délais d’adaptation, soutien provisoire et besoins non satisfaits'),('Staffing, promotion and departure stages by group','Étapes de dotation, de promotion et de départ par groupe'),('Review recommendations, action owners and results','Recommandations, responsables et résultats des mesures')])+'</select></label><button class="dp-request-build" type="button">'+B('Build request','Préparer la demande')+'</button><label>'+B('Request draft','Brouillon de demande')+'<textarea class="dp-request-text" rows="8"></textarea></label><div class="data-toolbar"><button class="dp-request-copy" type="button">'+B('Copy request','Copier la demande')+'</button><button class="dp-request-download" type="button">'+B('Download request','Télécharger la demande')+'</button></div><p role="status" class="dp-request-status"></p></div><h3>'+B('Compare percentages','Comparer des pourcentages')+'</h3><p>'+B('Use percentages from the same group, source, population and period.','Utilisez des pourcentages du même groupe, de la même source, de la même population et de la même période.')+'</p><div class="dp-comparison"><label>'+B('Representation (%)','Représentation (%)')+'<input class="dp-actual" type="number" min="0" max="100" step="any"></label><label>'+B('Availability (%)','Disponibilité (%)')+'<input class="dp-benchmark" type="number" min="0" max="100" step="any"></label><button class="dp-compare" type="button">'+B('Calculate percentage-point difference','Calculer l’écart en points')+'</button><p class="dp-comparison-result" role="status"></p></div><p>'+B('The result is a percentage-point difference, not a count of missing employees. Do not enter suppressed values as zero.','Le résultat est un écart en points, et non un nombre d’employés manquants. Ne saisissez pas zéro pour une valeur supprimée.')+'</p>'
 if key=='actions':
  rows=[]
  for k,names in groupnames.items():
   v=d['representation'].get(k,{}).get('2025',[])
   if len(v)>3 and published(v[2]) and published(v[3]) and v[2]<v[3]:rows.append([B(*names),cell(v[2],l,True)+' / '+cell(v[3],l,True),B('Review representation by occupation and level, then examine the relevant staffing stages with affected employees.','Examiner la représentation par profession et niveau, puis les étapes de dotation pertinentes avec les employés concernés.')])
  for q,threshold,en,fr,step,stepfr in [('Q42',100,'Recourse without fear','Recours sans crainte','Ask employees and networks which steps deter reporting. Record a management response and track the same confidence measure.','Demander aux employés et réseaux quelles étapes découragent le signalement. Consigner une réponse de gestion et suivre le même indicateur de confiance.'),('Q86',100,'Any accommodation implemented','Une mesure d’adaptation mise en place','Track waiting time, interim support, effectiveness and unmet needs separately from the survey implementation percentage.','Suivre séparément les délais, le soutien provisoire, l’efficacité et les besoins non satisfaits.')]:
   v=d['overall'].get(q,[None])[0]
   if published(v):rows.append([B(en,fr),q+' · '+cell(v,l,True),B(step,stepfr)])
  out='<p>'+B('These are proposed follow-up steps tied to the named measures. They are not existing organizational commitments or findings of causation. Record an accountable executive, response date, decision and outcome measure for each step.','Ces suivis proposés sont liés aux indicateurs nommés. Ils ne sont ni des engagements existants de l’organisme ni des conclusions causales. Consignez pour chaque suivi un cadre responsable, une date de réponse, une décision et un indicateur de résultat.')+'</p>'
  if rows:return out+table(l,B('Evidence and proposed follow-up','Données et suivi proposé'),[B('Measure','Indicateur'),B('Published figure','Chiffre publié'),B('Proposed follow-up','Suivi proposé')],rows,([series['pages'][k]['url'] for k in ['i','d','v']]+[source['overall']]))
  return '<p>'+B('This page has no matched measure from which to propose a numerical finding. Use the request builder to obtain a dated baseline and the source definitions before drawing a conclusion.','Cette page ne contient aucun indicateur correspondant permettant de proposer un constat chiffré. Utilisez la demande de données pour obtenir une base datée et les définitions avant de tirer une conclusion.')+'</p>'
 if key=='sources':
  return '<ul>'+''.join('<li>'+B(en,fr)+'</li>' for en,fr in [('Headcounts, employment equity populations, FTEs, PSES rounded responses and staffing weighted totals are different measures.','Les effectifs, les populations d’équité, les ETP, les réponses arrondies du SAFF et les totaux pondérés de dotation sont des mesures différentes.'),('X, x, *, -1, blank and 9999 follow their source definitions. Missing and suppressed cells are never zero.','X, x, *, -1, une case vide et 9999 suivent les définitions de leur source. Les cellules manquantes et supprimées ne valent jamais zéro.'),('Groups can overlap. Do not add subgroup counts or reconstruct suppressed cells.','Les groupes peuvent se chevaucher. N’additionnez pas les sous-groupes et ne reconstituez pas les cellules supprimées.'),('The disability subgroup table is dated 2024; other subgroup or representation tables may be dated 2025. Keep their years and populations distinct.','Le tableau des sous-groupes liés au handicap date de 2024; d’autres tableaux peuvent dater de 2025. Gardez les années et populations distinctes.'),('A plan describes intended work. A self-assessment describes the organization’s reported progress. Compare each with measured outcomes.','Un plan décrit les travaux prévus. Une autoévaluation décrit les progrès déclarés par l’organisme. Comparez chaque document aux résultats mesurés.'),('Only explicit source labels are matched. A predecessor, combined entity, national total or other employer cannot fill missing results.','Seuls les libellés explicites sont associés. Un prédécesseur, une entité regroupée, un total national ou un autre employeur ne remplace pas un résultat manquant.')])+'</ul>'+sources(l,[source['tbs'],source['overall'],source['staffing']])
 raise ValueError(key)

base=(R/'dfo/index.html').read_text();header=base[:base.index('<main id="main"')]
header=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',header)
header=header.replace('href="site.css"','href="../assets/department-page.css"')
header=header.replace('</head>','<script src="../assets/department-page.js" defer></script></head>')
common={'definitions':pses['definitions'],'staffingQuestions':snps['questions'],'staffingMethod':{'en':snps['method'],'fr':snps['method_fr']},'sources':source,'frids':frids}
(R/'assets/department-page-model.json').write_text(json.dumps(common,ensure_ascii=False,separators=(',',':'))+'\n')
branchdefs={k:v for k,v in branchmeta.items() if k!='departments'}
(R/'assets/department-branch-definitions.json').write_text(json.dumps(branchdefs,ensure_ascii=False,separators=(',',':'))+'\n')
registry=[];used=set();counts={'representation':0,'surveys':0,'staffing':0,'plans':0,'noReadingFigures':0}
for rec in cross['organizations']:
 name=rec['en'];slug=special.get(name) or short.get(name) or re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode().lower()).strip('-')[:100]
 if slug in used:slug+='-'+hashlib.sha256(name.encode()).hexdigest()[:8]
 used.add(slug);rec=dict(rec,id=slug,path=slug+'/')
 d=record(rec);sections=available_sections(d);d['sections']=[s['id'] for s in sections]
 entry={'id':slug,'en':name,'fr':rec['fr'],'path':slug+'/','aliases':rec['datasetNames'],'sections':d['sections'],'specialized':name in special,'catalogueCount':d['catalogueCount']}
 if name in special:
  special_html=(R/slug/'index.html').read_text()
  en_block=re.search(r'<div id="lang-en"[^>]*>(.*?)<div id="lang-fr"',special_html,re.S)
  if en_block:entry['sections']=re.findall(r'<h2[^>]*id="([^"]+)"',en_block[1])
 registry.append(entry)
 for k,flag in [('representation',bool(d['representation'])),('surveys',bool(d['overall'])),('staffing',bool(d['staffing'])),('plans',bool(d['plan'])),('noReadingFigures',not(d['overall'] or d['representation']))]:counts[k]+=int(flag)
 if name in special:continue
 folder=R/slug;folder.mkdir(exist_ok=True)
 h=header.replace('Equity at DFO | Équité au MPO',E('Equity at '+name+' | GC Equity')).replace('Independent bilingual DFO equity evidence: representation, staffing, employee surveys, accommodation, commitments, results and downloadable source data.',E('Published equity evidence for '+name+': workforce, employee experiences, staffing and source records.'))
 body=h+'<main id="main" tabindex="-1">'
 for l in ['en','fr']:
  fr=l=='fr';ident=lambda key:frids[key] if fr else key
  links=''.join('<li>'+link('#'+ident(s['id']),title(s,d,l))+'</li>' for s in sections)
  opts=''.join('<option value="'+ident(s['id'])+'">'+E(title(s,d,l))+'</option>' for s in sections)
  body+='<div id="lang-'+l+'" lang="'+l+'"'+(' hidden' if fr else '')+'><div class="page-heading"><div class="container"><p class="eyebrow">GC Equity · '+L(l,'Department profile','Profil ministériel')+'</p><h1>'+E(d[l])+'</h1><p>'+L(l,'Workforce, employee experiences and published commitments','Effectif, expérience du personnel et engagements publiés')+'</p><p>'+link('../index.html?org='+quote(name)+'&view=table&lang='+l,L(l,'Back to this organization’s comparison tables','Retour aux tableaux comparatifs de cet organisme'))+'</p></div></div><div class="container"><div class="dp-selectors"><label>'+L(l,'Department or agency','Ministère ou organisme')+'<select class="dp-organization" aria-label="'+L(l,'Department or agency','Ministère ou organisme')+'"><option>'+E(d[l])+'</option></select></label><label>'+L(l,'Employee group for survey and staffing tables','Groupe pour les tableaux des sondages et de dotation')+'<select class="dp-group"><option value="all">'+L(l,'All respondents','Tous les répondants')+'</option></select></label></div><label class="mobile-jump">'+L(l,'Jump to a section','Aller à une section')+'<select>'+opts+'</select></label><div class="page-grid"><nav class="contents" aria-label="'+L(l,'On this page','Sur cette page')+'"><p class="nav-title">'+L(l,'On this page','Sur cette page')+'</p><ol>'+links+'</ol></nav><article>'
  for sec in sections:
   ident_=ident(sec['id']);body+='<section aria-labelledby="'+ident_+'"><h2 id="'+ident_+'">'+E(title(sec,d,l))+'</h2>'+content(sec,d,l,sections)+'<div class="section-tools"><button class="print-section" type="button">'+L(l,'Print this section','Imprimer cette section')+'</button>'+link('#'+ident('at-a-glance'),L(l,'Back to top','Haut de la page'))+'</div></section>\n'
  body+='</article></div></div></div>'
 body+='</main><footer class="site-footer"><div class="container"><p data-label-en="Independent ARAN resource using published sources. Not a Government of Canada publication." data-label-fr="Ressource indépendante du RAAR utilisant des sources publiées. Il ne s’agit pas d’une publication du gouvernement du Canada.">Independent ARAN resource using published sources. Not a Government of Canada publication.</p></div></footer><div id="notice" class="visually-hidden" role="status"></div><script id="dp-data" type="application/json">'+json.dumps(d,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+'</script></body></html>\n'
 assert '\u2014' not in body,(name,'em dash in visitor content')
 (folder/'index.html').write_text(body)
registry={'schema':1,'generated':'2026-11-19','selectorLabels':cross.get('selectorLabels',[]),'identityAliases':cross.get('identityAliases',[]),'organizations':registry,'coverage':counts,'method':'All organizations in the existing selector have a dedicated bilingual route. Source-specific labels and combined populations are preserved. Missing sources are described in Evidence gaps.'}
(R/'assets/department-pages.json').write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n')
sitemap=R/'sitemap.xml';text=sitemap.read_text()
for entry in registry['organizations']:
 url='https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/'+entry['path']
 if '<loc>'+url+'</loc>' not in text:text=text.replace('</urlset>','<url><loc>'+url+'</loc></url>\n</urlset>')
for alias in cross.get('identityAliases',[]):
 oldslug=re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',alias['alias']).encode('ascii','ignore').decode().lower()).strip('-')[:100]
 target=next(x for x in registry['organizations'] if x['en']==alias['canonical'])['path']
 folder=R/oldslug
 if folder.is_dir() and (folder/'index.html').exists() and 'dp-data' in (folder/'index.html').read_text():
  destination='../'+target
  (folder/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>'+E(alias['canonical'])+'</title><meta http-equiv="refresh" content="0;url='+E(destination)+'"><link rel="canonical" href="'+E(destination)+'"><p>'+link(destination,'Open the department profile / Ouvrir le profil ministériel')+'</p><script>location.replace('+json.dumps(destination)+'+location.search+location.hash);</script></html>\n')
 oldurl='https://aranpublicservants-rgb.github.io/GC-Equity-Equite-GC/'+oldslug+'/'
 text=text.replace('<url><loc>'+oldurl+'</loc></url>\n','')
sitemap.write_text(text)
print(json.dumps({'pages':len(registry['organizations']),'generated':len(registry['organizations'])-3,'coverage':counts},ensure_ascii=False))
