#!/usr/bin/env python3
"""Build the ISC reading page from retained, organization-specific source cells.

No other employer's figures are used. Published source partitions stay unchanged.
This script creates only the dedicated ISC page and its reading extracts.
"""
import base64
import copy
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

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'isc'
DATA = OUT / 'data'
DATA.mkdir(parents=True, exist_ok=True)
NAME = 'Indigenous Services Canada'
FRENCH = 'Services aux Autochtones Canada'
J = lambda p: json.loads((ROOT / p).read_text())
E = lambda s: html.escape(str(s), quote=True)
model = J('assets/workspace-data.json')
index = J('assets/department-profile-index.json')
profile = json.loads(gzip.decompress(base64.b64decode((ROOT / index['organizations'][NAME]['path']).read_bytes())))
series = J('data/tbs-departmental-representation-2017-2025.json')
rep = series['orgs'][NAME]
staffing = J('data/snps-2025-by-organization.json')
snps = staffing['orgs'][NAME]
cta = next(x for x in J('data/call-to-action-letters.json')['organizations'] if x.get('site_name') == NAME)
dept = next(x for x in model['DEPTS'] if x[0] == NAME)
women = J('data/isc-women-representation-2021-2025.json')
sources = {
 'pses': index['sources']['groups'],
 'overall': index['sources']['overallPublisherUrl'],
 'tbs': 'https://www.canada.ca/en/government/publicservice/wellness-inclusion-diversity-public-service/diversity-inclusion-public-service/employment-equity-annual-reports/employment-equity-public-service-canada-2024-2025.html',
 'staffing': staffing['dataset'],
 'plan': 'https://www.sac-isc.gc.ca/eng/1767990598033/1773090600238',
 'results': 'https://www.sac-isc.gc.ca/eng/1752155698379/1752155722243',
 'access': 'https://www.sac-isc.gc.ca/eng/1766002791478/1766002810081',
 'progress': 'https://www.sac-isc.gc.ca/eng/1734628941512/1734629096495',
 'misconduct': 'https://www.sac-isc.gc.ca/eng/1763483505015/1763484078770',
 'assessment': cta['self_assessment']['url'],
 'letter': cta['letter']['url'],
}
if not isinstance(sources['staffing'], str):
 sources['staffing'] = 'https://open.canada.ca/data/en/dataset/8766bf91-d14c-423b-a5d1-ac47f5b4dd22'

def write_json(path, data):
 path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

summary = {'definitions': index['definitions'], 'source': sources['pses'], 'groups': {
 name: {'en': name, 'fr': rec['fr'], 'questions': {q: {'value': v[0], 'n': v[1]} for q,v in rec['questions'].items()}}
 for name,rec in profile['groups'].items()}}
write_json(DATA / 'survey-summary.json', summary)

def norm(s):
 return re.sub('[^a-z0-9]', '', ''.join(c for c in unicodedata.normalize('NFKD', str(s)).lower() if not unicodedata.combining(c)))

files = []
seen = set()

def add_file(entry):
 if entry['path'] not in seen:
  seen.add(entry['path']); files.append(entry)

def csv_extract(key, en, fr, topic, headers, rows, source, original):
 if not rows:
  return
 buf = io.StringIO(newline='')
 writer = csv.writer(buf, lineterminator='\n'); writer.writerow(headers); writer.writerows(rows)
 raw = buf.getvalue().encode()
 path = 'data/' + key + '.csv.gz'
 (OUT / path).write_bytes(gzip.compress(raw, mtime=0))
 add_file({'id': key, 'en': en, 'fr': fr, 'topic': topic, 'path': path, 'format': 'csv.gz', 'rows': len(rows),
           'source': source, 'sourceFile': original, 'method': 'published-subset', 'scope': NAME,
           'sha256': hashlib.sha256((OUT / path).read_bytes()).hexdigest()})

headers = ['Department','Group (English)','Group (French)','Question','Question (English)','Question (French)','Published result (%)','Rounded responses','Source URL']
rows = [[NAME, 'All respondents', 'Ensemble des répondants', q, index['definitions'][q]['en'], index['definitions'][q]['fr'], *v] for q,v in profile['overall'].items()]
rows += [[NAME, name, rec['fr'], q, index['definitions'][q]['en'], index['definitions'][q]['fr'], *v] for name,rec in profile['groups'].items() for q,v in rec['questions'].items()]
rows=[r+[sources['overall'] if r[1]=='All respondents' else sources['pses']] for r in rows]
csv_extract('pses-2024-reading', 'PSES 2024 · 27 reading questions, overall and employee groups', 'SAFF 2024 · 27 questions, ensemble et groupes', 'surveys', headers, rows, sources['pses'], 'Retained department-profile source cells for 27 questions; overall and group source URLs are distinct')

files[0]['sources']=[sources['overall'],sources['pses']]
files[0]['method']='source-labelled-reading-extract'
restored = J('assets/restored-datasets.json')['files']
for rec in restored:
 part = rec.get('partitions', {}).get(NAME)
 if part:
  add_file({'id': 'retained-' + hashlib.sha256(part['path'].encode()).hexdigest()[:12],
            'en': rec['dataset'] + ' · ' + rec['title'], 'fr': rec['dataset'] + ' · ' + rec['title'],
            'topic': 'surveys', 'path': '../' + part['path'], 'format': 'csv.gz', 'rows': part['rows'],
            'source': rec['publisherUrl'], 'sourceFile': rec['originalName'], 'method': 'published-subset', 'scope': NAME})

# Retain all direct source rows that actually name ISC. No predecessor department
# or national results are substituted. Existing suppression-aligned files are used.
for rec in J('assets/assistant-catalogue.json')['datasets']:
 path = rec.get('path', '')
 field = rec.get('orgField')
 if NAME not in rec.get('organizations', []) or not field or path.startswith('partitioned:'):
  continue
 p = ROOT / path
 if not p.is_file() or not (path.endswith('.csv') or path.endswith('.csv.gz')):
  continue
 raw = gzip.decompress(p.read_bytes()) if path.endswith('.gz') else p.read_bytes()
 try:
  text = raw.decode('utf-8-sig')
 except UnicodeDecodeError:
  text = raw.decode('cp1252')
 reader = csv.reader(io.StringIO(text)); head = next(reader)
 if field not in head:
  continue
 ix = head.index(field)
 selected = [r for r in reader if len(r) > ix and norm(r[ix].removesuffix(' Total')) == norm(NAME)]
 topics = rec.get('topics', [])
 topic = 'staffing' if 'staffing' in topics else 'workforce' if any(t in topics for t in ['workforce','representation']) else 'surveys'
 csv_extract('source-' + hashlib.sha256(path.encode()).hexdigest()[:12], rec['en'], rec['fr'], topic, head, selected, rec['source'], path)

branch_meta = json.loads(re.search(r'<script type="application/json" id="eq-branch-meta">(.*?)</script>', (ROOT/'explorer.html').read_text(), re.S)[1])
branch_dept = next(x for x in branch_meta['departments'] if x['en'] == NAME)
branch = copy.deepcopy(next(x for x in J('dfo/data/catalogue.json')['files'] if x['format']=='branch-json.gz'))
branch.update({'path': '../data/pses-2024-branches/'+branch_dept['id']+'.json.gz', 'department':branch_dept,
               'rows':len(json.loads(gzip.decompress((ROOT/('data/pses-2024-branches/'+branch_dept['id']+'.json.gz')).read_bytes()))), 'scope':NAME})
add_file(branch)
csv_extract('women-representation-2021-2025', 'Women · published representation and counts, 2021 to 2025', 'Femmes · représentation et effectifs publiés, de 2021 à 2025', 'workforce', ['Department','Year','Published employees','Representation (%)','Departmental workforce availability (%)'], [[NAME,year,v['count'],v['representation'],v['wfa']] for year,v in sorted(women['years'].items())], women['source'], 'Treasury Board departmental women tables, 2021–2025')
catalogue = {'updated':'2026-11-19','organization':NAME,'records':sum(x['rows'] for x in files),'files':files}
write_json(DATA/'catalogue.json', catalogue)
write_json(DATA/'reading-evidence.json', {'reviewed':'2026-11-19','organization':NAME,'population':dept[1], 'representation':rep,
                                       'women2025':dept[2], 'womenCount2025':women['years']['2025']['count'], 'womenWfa2025':model['DEPT_WFA_2025'][NAME]['w'], 'overall':profile['overall'],'staffing':snps,'sources':sources})

def pick(l, en, fr):
 return fr if l == 'fr' else en

def pct(v, l):
 if v is None or str(v) in ['', '9999']:
  return pick(l,'Not available / not applicable','Non disponible / sans objet')
 if str(v).lower() in ['x','*','-1']:
  return pick(l,'Suppressed','Supprimé')
 return E(str(v).replace('.',',') if l=='fr' else v) + (' %' if l=='fr' else '%')

def link(url, text):
 return '<a href="'+E(url)+'">'+E(text)+'</a>'

def source(l, key, label=None):
 return '<p class="source">'+pick(l,'Source: ','Source : ')+link(sources[key], label or pick(l,'Published source and definitions','Source publiée et définitions'))+'</p>'

def table(l, caption, headers, rows, key):
 return '<div class="table-scroll" role="region" tabindex="0" aria-label="'+E(caption)+'"><table><caption>'+E(caption)+'</caption><thead><tr>'+''.join('<th scope="col">'+E(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join(('<th scope="row">' if i==0 else '<td>')+str(v)+('</th>' if i==0 else '</td>') for i,v in enumerate(row))+'</tr>' for row in rows)+'</tbody></table></div>'+source(l,key)

SECTIONS = [
 ('at-a-glance','apercu','Overview','Aperçu'),
 ('data-guide','guide-donnees','Ask about ISC data','Trouver des données sur SAC'),
 ('who-works','qui-travaille','Who works at ISC','L’effectif de SAC'),
 ('experience','experience-fr','Employee experience','Expérience des employés'),
 ('harassment','harcelement','Harassment and discrimination','Harcèlement et discrimination'),
 ('accommodation','mesures-adaptation','Workplace accommodation','Mesures d’adaptation'),
 ('hiring','embauche','Hiring and advancement','Embauche et avancement'),
 ('branches','unites','Organizational units','Unités organisationnelles'),
 ('promised','promesses','Commitments and employee networks','Engagements et réseaux d’employés'),
 ('planned','plans','Plans and reported results','Plans et résultats déclarés'),
 ('accessibility-plan','plan-accessibilite','Accessibility plan','Plan d’accessibilité'),
 ('recourse','recours','Recourse and decisions','Recours et décisions'),
 ('missing','manquant','Evidence gaps','Lacunes dans les données'),
 ('data-library','bibliotheque','All ISC datasets','Tous les jeux de données de SAC'),
 ('publications','publications-fr','Official publications and surveys','Publications et sondages officiels'),
 ('requests','demandes','Request or compare data','Demander ou comparer des données'),
 ('actions','agir','Turn evidence into action','Passer des données à l’action'),
 ('sources','sources-fr','Sources and definitions','Sources et définitions'),
]

groups = [('Indigenous','Peuples autochtones'),('Black','Personnes noires'),('Racialized','Personnes racisées'),('Person with a disability','Personnes en situation de handicap'),('2SLGBTQIA+','2ELGBTQIA+'),('Woman','Femmes'),('Man','Hommes')]

def survey_table(l, questions, caption):
 return table(l,caption,[pick(l,'Question','Question'),pick(l,'Published result','Résultat publié'),pick(l,'Rounded responses','Réponses arrondies')],
              [[E(index['definitions'][q][l]),pct(profile['overall'][q][0],l),E(profile['overall'][q][1])] for q in questions if q in profile['overall']], 'overall')

def group_table(l, questions, caption):
 rows=[]
 for name,fr in groups:
  rec=profile['groups'].get(name)
  if rec:
   rows.append([E(pick(l,name,fr))]+[pct(rec['questions'].get(q,['',''])[0],l) for q in questions])
 return table(l,caption,[pick(l,'Group','Groupe')]+questions, rows, 'pses')

def widget(l, kind):
 options=''.join('<option value="'+E(n)+'"'+(' selected' if n=='Person with a disability' else '')+'>'+E(g[l])+'</option>' for n,g in summary['groups'].items())
 return '<div class="survey-widget" data-kind="'+kind+'" data-lang="'+l+'"><label>'+pick(l,'Employee group','Groupe d’employés')+'<select>'+options+'</select></label><p class="small">'+pick(l,'Groups overlap. Response counts are rounded; suppressed and not-applicable values stay distinct.','Les groupes se chevauchent. Les effectifs sont arrondis; les valeurs supprimées et sans objet restent distinctes.')+'</p><div class="survey-result"></div></div>'+source(l,'pses')

def content(l, section):
 fr=l=='fr'; B=lambda a,b:pick(l,a,b)
 if section=='at-a-glance':
  cards=[('who-works','8,389','Population, March 31, 2025','Population, 31 mars 2025'),('experience','46%','Recourse without fear, Q42','Recours sans crainte, Q42'),('harassment','16%','Reported harassment, Q58','Harcèlement signalé, Q58'),('accommodation','64%','Any accommodation implemented, Q86','Une mesure mise en place, Q86')]
  return '<p class="lead">'+B('Read ISC workforce data, employee experiences, staffing results and published commitments together. Each table keeps its own reporting population and period.','Consultez les données sur l’effectif de SAC, l’expérience du personnel, la dotation et les engagements publiés. Chaque tableau conserve sa propre population et sa période.')+'</p><div class="stat-grid">'+''.join('<a class="stat-card" href="#'+next(s[1] if fr else s[0] for s in SECTIONS if s[0]==id)+'"><span class="stat">'+(v.replace(',',' ') if fr else v)+'</span><span>'+B(en,ft)+'</span></a>' for id,v,en,ft in cards)+'</div><p>'+B('The employment equity population differs from all-employee headcount, full-time equivalents, survey respondents and staffing-survey weighted totals. March 2025 equity figures reflect the departmental systems change in September 2020.','La population d’équité diffère de l’effectif total, des équivalents temps plein, des répondants aux sondages et des totaux pondérés du sondage sur la dotation. Les chiffres d’équité de mars 2025 tiennent compte du changement des systèmes ministériels de septembre 2020.')+'</p>'+source(l,'tbs')
 if section=='data-guide':
  return '<p>'+B('Choose a topic and an employee group. The guide retrieves published figures and links to the supporting records.','Choisissez un sujet et un groupe. Le guide présente les chiffres publiés et les liens vers les données justificatives.')+'</p><div class="isc-guide" data-lang="'+l+'"><div class="choice-chips" role="group" aria-label="'+B('Topic','Sujet')+'">'+''.join('<button type="button" data-guide-topic="'+k+'">'+B(en,ft)+'</button>' for k,en,ft in [('representation','Who works here','L’effectif'),('experience','Employee experience','Expérience du personnel'),('harassment','Harassment and discrimination','Harcèlement et discrimination'),('accommodation','Accommodation','Adaptation'),('hiring','Hiring and advancement','Embauche et avancement')])+'</div><label>'+B('Employee group','Groupe')+'<select class="guide-group"><option value="all">'+B('All respondents','Ensemble des répondants')+'</option>'+''.join('<option value="'+E(en)+'">'+B(en,ft)+'</option>' for en,ft in groups)+'</select></label><div class="isc-guide-answer" aria-live="polite"><p>'+B('Select a topic to begin.','Choisissez un sujet pour commencer.')+'</p></div></div>'
 if section=='who-works':
  rows=[]
  for k,en,ft in [('i','Indigenous peoples','Peuples autochtones'),('d','Persons with disabilities','Personnes en situation de handicap'),('v','Racialized employees','Personnes racisées'),('b','Black employees','Personnes noires')]:
   v=rep[k]['2025'];rows.append([B(en,ft),E(v[1]),pct(v[2],l),pct(v[3],l) if len(v)>3 else B('No benchmark in this source','Aucun point de référence dans cette source')])
  rows.insert(0,[B('Women','Femmes'),E(women['years']['2025']['count']),pct(dept[2],l),pct(model['DEPT_WFA_2025'][NAME]['w'],l)])
  out=table(l,B('Representation, March 31, 2025','Représentation, 31 mars 2025'),[B('Group','Groupe'),B('Published count','Nombre publié'),B('Representation','Représentation'),B('Departmental availability','Disponibilité ministérielle')],rows,'tbs')
  out+='<p>'+B('Persons with disabilities: 8.9% representation against 12.0% availability, a calculated difference of 3.1 percentage points below the benchmark. Racialized employees: 21.0% against 22.9%, a difference of 1.9 points below. Overall representation does not establish access at each level or the cause of a difference.','Personnes en situation de handicap : représentation de 8,9 % contre une disponibilité de 12,0 %, soit un écart calculé de 3,1 points sous le point de référence. Personnes racisées : 21,0 % contre 22,9 %, soit 1,9 point sous le point de référence. La représentation globale ne démontre pas l’accès à chaque niveau ni la cause d’un écart.')+'</p>'
  rows=[[str(y),pct(women['years'][str(y)]['representation'],l)]+[pct(rep[k].get(str(y),[None,None,None])[2],l) for k in ['i','d','v','b']] for y in range(2021,2026)]
  out+=table(l,B('Published representation, March 31, 2021 to 2025','Représentation publiée, 31 mars de 2021 à 2025'),['Year' if not fr else 'Année',B('Women','Femmes'),B('Indigenous','Autochtones'),B('Disability','Handicap'),B('Racialized','Personnes racisées'),B('Black','Personnes noires')],rows,'tbs')
  out+='<p class="source">'+link(women['source'],B('Published women’s representation and counts','Représentation et effectifs publiés des femmes'))+'</p>'
  out+='<p>'+B('The source does not supply a formal Black workforce-availability benchmark. Black employees are a subgroup of the racialized category in these tables. Groups can overlap. Do not add group counts or derive employee shortfalls from rounded percentages.','La source ne fournit aucun point de référence officiel de disponibilité pour les personnes noires. Elles forment un sous-groupe des personnes racisées dans ces tableaux. Les groupes peuvent se chevaucher. N’additionnez pas les effectifs et ne calculez pas de déficits à partir des pourcentages arrondis.')+'</p>'
  return out
 if section=='experience':
  return survey_table(l,['Q12','Q24','Q25','Q42','Q43','Q45','Q47','Q49','Q51','Q52','Q53','Q77','Q78','Q81'],B('PSES 2024 · ISC overall','SAFF 2024 · ensemble de SAC'))+'<p>'+B('Q51 measures an adverse mental-health impact of racism; a higher value means more reported harm. The other positive-response measures have the opposite direction. These survey results alone do not establish causation.','La Q51 mesure un effet négatif du racisme sur la santé mentale; une valeur plus élevée indique davantage d’effets négatifs signalés. Les autres mesures de réponses positives ont le sens inverse. Ces résultats ne démontrent pas à eux seuls un lien de causalité.')+'</p>'+widget(l,'experience')
 if section=='harassment':
  return survey_table(l,['Q58','Q65','Q63','Q70','Q72'],B('Harassment, discrimination and resolution, PSES 2024','Harcèlement, discrimination et résolution, SAFF 2024'))+group_table(l,['Q58','Q65','Q42'],B('Published employee-group results, 2024','Résultats publiés par groupe, 2024'))+'<p>'+B('Q58 and Q65 report experiences in the previous 12 months. Q72 has a rounded response total of 205 and concerns satisfaction with racism-complaint resolution. Survey prevalence, satisfaction and completed investigations use different bases.','Les Q58 et Q65 portent sur les expériences des 12 derniers mois. La Q72 repose sur un total arrondi de 205 réponses et porte sur la satisfaction quant au règlement des plaintes de racisme. La prévalence, la satisfaction et les enquêtes terminées utilisent des bases différentes.')+'</p>'+source(l,'overall')
 if section=='accommodation':
  return survey_table(l,['Q84','Q85','Q86','Q87','Q88','Q44e','Q73p','Q73q'],B('Workplace accommodation, PSES 2024','Mesures d’adaptation, SAFF 2024'))+'<p>'+B('Q86 concerns requesters; Q87 concerns people whose measures were implemented; Q88 concerns respondents answering the comfort question. These are not stages in a single funnel. Implementing any measure does not mean every need was met. Q44e and Q73p concern reported adverse effects, so higher values mean more difficulty.','La Q86 concerne les personnes ayant fait une demande; la Q87, celles dont les mesures ont été mises en place; la Q88, les personnes ayant répondu à la question sur l’aisance. Il ne s’agit pas d’étapes d’une même cohorte. La mise en place d’une mesure ne signifie pas que tous les besoins ont été satisfaits. Les Q44e et Q73p portent sur des effets négatifs; des valeurs plus élevées indiquent plus de difficultés.')+'</p>'+widget(l,'accommodation')+'<p>'+B('The 2024 accessibility progress report records over 700 disability-related requests following the May workplace-presence update. The 2026–2028 plan describes a Better Accommodation Project survey completed by 256 employees with disabilities and 90 managers. These administrative and consultation populations differ from PSES respondents.','Le rapport d’étape de 2024 fait état de plus de 700 demandes liées à un handicap après la mise à jour de mai sur la présence au travail. Le plan de 2026-2028 décrit un sondage du Projet pour de meilleures mesures d’adaptation auquel ont répondu 256 employés en situation de handicap et 90 gestionnaires. Ces populations administratives et de consultation diffèrent des répondants au SAFF.')+'</p>'+source(l,'progress')+source(l,'access')
 if section=='hiring':
  label={'all':('All respondents','Ensemble des répondants'),'woman':('Women','Femmes'),'man':('Men','Hommes'),'pwd':('Persons with disabilities','Personnes en situation de handicap'),'nopwd':('Without disabilities','Sans handicap'),'rac':('Racialized','Personnes racisées'),'nonrac':('Non-racialized','Personnes non racisées'),'ind':('Indigenous','Autochtones'),'nonind':('Non-Indigenous','Non-Autochtones'),'black':('Black','Personnes noires')}
  rows=[[B(*label[g])]+[pct(rec.get(q),l) for q in ['STA_14A','STA_13','STA_01A']] for g,rec in snps.items() if g in label]
  out=table(l,B('Staffing survey 2025 · ISC and employee groups','Sondage sur la dotation 2025 · SAC et groupes'),[B('Group','Groupe'),B('Experienced a bias or barrier · STA_14A','Préjugé ou obstacle subi · STA_14A'),B('Processes reduce bias · STA_13','Processus réduisant les préjugés · STA_13'),B('Transparent staffing · STA_01A','Dotation transparente · STA_01A')],rows,'staffing')
  out+='<p>'+B('Reference period: April 1, 2024 to March 31, 2025. STA_14A concerns advertised-process participants; STA_13 concerns all respondents. Transparency combines moderate and great extent. Percentages are calculated from published weighted shares or weighted totals using the source-specific rounding rules. They are not individual selection rates.','Période de référence : du 1er avril 2024 au 31 mars 2025. STA_14A concerne les participants à un processus annoncé; STA_13 concerne tous les répondants. La transparence combine « dans une certaine mesure » et « dans une grande mesure ». Les pourcentages sont calculés à partir des parts ou des totaux pondérés publiés, selon les règles d’arrondissement de la source. Il ne s’agit pas de probabilités individuelles de sélection.')+'</p>'
  out+='<p>'+B('In its 2024 self-assessment, ISC identifies retention and official-language requirements for management and executive positions as challenges. It describes second-official-language training for Indigenous employees. This is the department’s account, not a measured causal explanation of the survey differences.','Dans son autoévaluation de 2024, SAC décrit la rétention et les exigences linguistiques des postes de gestion et de direction comme des difficultés. Le document décrit une formation en langue seconde pour les employés autochtones. Il s’agit du constat du ministère, et non d’une explication causale mesurée des écarts du sondage.')+'</p>'+source(l,'assessment')
  return out
 if section=='branches':
  return '<p>'+B('Read results within the organizational units published for the 2024 survey. Unit names reflect the source period and may differ from the current structure. Branch results are not combined to reconstruct department or suppressed group results.','Consultez les unités organisationnelles publiées pour le sondage de 2024. Leurs noms correspondent à la période de la source et peuvent différer de la structure actuelle. Les résultats des unités ne sont pas combinés pour reconstituer les résultats ministériels ou les cellules supprimées.')+'</p>'+table(l,B('ISC organizational units in the retained branch file','Unités de SAC dans le fichier conservé'),[B('Published unit ID','Identifiant publié'),B('Published unit name','Nom publié')],[[E(x['id']),E(x[l])] for x in branch_dept['branches']],'pses')+'<p>'+link('#'+B('data-library','bibliotheque'),B('Open the branch dataset and choose a unit, question and employee group','Ouvrir le jeu de données des unités et choisir une unité, une question et un groupe'))+'</p>'
 if section=='promised':
  return table(l,B('Published commitments and reporting mechanisms','Engagements et mécanismes de rapport publiés'),[B('Source and period','Source et période'),B('What it describes','Description'),B('Evidence to request','Données à demander')],[
   [link(sources['letter'],B('2021 Call to Action letter','Lettre de 2021 liée à l’Appel à l’action')),B('Employee-network task force, leadership reporting, mentorship and Indigenous employee advancement measures.','Groupe de travail des réseaux, rapports à la direction, mentorat et avancement des employés autochtones.'),B('Dated decisions, measures and results.','Décisions, mesures et résultats datés.')],
   [link(sources['assessment'],B('2024 self-assessment','Autoévaluation de 2024')),B('Five-year recruitment goals through 2027, re-evaluated annually; work underway on inclusion goals.','Objectifs de recrutement sur cinq ans jusqu’en 2027, réévalués chaque année; travail en cours sur les objectifs d’inclusion.'),B('Numeric goals, group and level definitions, progress and written responses to networks.','Objectifs chiffrés, groupes et niveaux, progrès et réponses écrites aux réseaux.')],
   [link(sources['results'],B('2024–25 results report','Rapport sur les résultats de 2024-2025')),B('IDEA Task Force administered by the IDEA Secretariat within the Ombuds Office.','Groupe de travail IDEA administré par le Secrétariat IDEA au sein du Bureau de l’ombuds.'),B('Recommendations, management decisions and results for the barriers raised.','Recommandations, décisions de gestion et résultats pour les obstacles soulevés.')]],'assessment')+'<p>'+B('A published commitment or a description of a network does not establish that a barrier was removed. Compare each commitment with its own dated result and employee feedback.','Un engagement publié ou la description d’un réseau ne démontre pas qu’un obstacle a été supprimé. Comparez chaque engagement avec un résultat daté et les commentaires du personnel.')+'</p>'
 if section=='planned':
  return table(l,B('Plans, reported activities and employee outcomes','Plans, activités déclarées et résultats pour le personnel'),[B('Document','Document'),B('Published workforce content','Contenu publié sur l’effectif'),B('Interpretation','Interprétation')],[
   [link(sources['plan'],B('2026–27 Departmental Plan','Plan ministériel de 2026-2027')),B('Internal services identify systemic racism, discrimination and colonial legacies in internal policies and practices; planned HR work concerns cultural humility, Indigenous realities and professional growth.','Les Services internes mentionnent le racisme systémique, la discrimination et les héritages coloniaux dans les politiques et pratiques internes; les travaux RH prévus portent sur l’humilité culturelle, les réalités autochtones et le développement professionnel.'),B('Planned work, not demonstrated workforce outcomes.','Travaux prévus, et non résultats démontrés pour le personnel.')],
   [link(sources['results'],B('2024–25 results report','Rapport sur les résultats de 2024-2025')),B('Over 850 hours of Ombuds support; 59 Cultural Humility sessions reaching over 3,000 employees; participation in the Better Accommodation Project.','Plus de 850 heures de soutien de l’ombuds; 59 séances d’humilité culturelle ayant rejoint plus de 3 000 employés; participation au Projet pour de meilleures mesures d’adaptation.'),B('Reported service and learning activities; these counts do not measure whether discrimination or unmet accommodation needs declined.','Activités de service et d’apprentissage déclarées; ces nombres ne mesurent pas une baisse de la discrimination ou des besoins d’adaptation non satisfaits.')]],'results')+'<p>'+B('Program beneficiaries and GBA Plus program results have different populations from ISC employees. Do not present a community-service result as an employee-equity result.','Les bénéficiaires et les résultats des programmes en ACS Plus ont des populations différentes de celle des employés de SAC. Un résultat de service aux communautés n’est pas un résultat d’équité pour le personnel.')+'</p>'
 if section=='accessibility-plan':
  rows=[
   ['1',B('Promote the digital GC Workplace Accessibility Passport with information sessions.','Promouvoir le Passeport numérique pour l’accessibilité au travail avec des séances d’information.')],
   ['2',B('Offer ongoing training on the accommodation process, the social model, non-visible disabilities and employee rights.','Offrir une formation continue sur l’adaptation, le modèle social, les handicaps non visibles et les droits du personnel.')],
   ['3',B('Establish an internal-service working group to coordinate accommodation improvements.','Créer un groupe de travail des services internes pour coordonner les améliorations de l’adaptation.')],
   ['4',B('Apply a disability-inclusive impact assessment to decisions related to fiscal constraints.','Appliquer une analyse des répercussions tenant compte du handicap aux décisions liées aux contraintes budgétaires.')]]
  return '<p>'+B('The 2026–2028 plan applies to ISC and Indian Oil and Gas Canada. Its employment pillar adopts the social model and describes a yes-by-default approach for low-cost measures with less reliance on medical certification. These are stated approaches, not evidence that every request follows them.','Le plan de 2026-2028 s’applique à SAC et à Pétrole et gaz des Indiens du Canada. Son volet emploi adopte le modèle social et décrit une approche favorable par défaut aux mesures peu coûteuses, avec moins de recours aux certificats médicaux. Ce sont des approches annoncées, et non la preuve que chaque demande les suit.')+'</p>'+table(l,B('Employment commitments, accessibility plan 2026–2028','Engagements sur l’emploi, plan d’accessibilité 2026-2028'),[B('Commitment','Engagement'),B('Published planned action','Mesure prévue publiée')],rows,'access')+'<p>'+B('The plan also covers the built environment, technology, communications, procurement, program and service design, and transportation. Read the annual progress report separately. Compare accommodation commitments with Q86–88, waiting times, interim support and unmet needs.','Le plan couvre aussi l’environnement bâti, la technologie, les communications, l’approvisionnement, la conception des programmes et services, et le transport. Consultez séparément le rapport d’étape annuel. Comparez les engagements aux Q86 à Q88, aux délais, au soutien provisoire et aux besoins non satisfaits.')+'</p>'+source(l,'progress')
 if section=='recourse':
  return '<p>'+B('ISC’s first misconduct report provides administrative investigation examples for 2024–25. The examples below are the department’s reported conclusions, not published tribunal judgments or estimates of all workplace incidents.','Le premier rapport sur les inconduites de SAC fournit des exemples d’enquêtes administratives pour 2024-2025. Les exemples ci-dessous sont les conclusions déclarées par le ministère, et non des jugements publiés d’un tribunal ni des estimations de tous les incidents.')+'</p>'+table(l,B('ISC investigation examples, 2024–25','Exemples d’enquêtes de SAC, 2024-2025'),[B('Record','Dossier'),B('Reported conclusion','Conclusion déclarée'),B('Limit','Limite')],[
   [B('Three harassment or workplace-violence investigations','Trois enquêtes de harcèlement ou de violence au travail'),B('The report says none met the definition; it also records prevention recommendations.','Selon le rapport, aucune ne répondait à la définition; le document présente aussi des recommandations de prévention.'),B('This does not establish that employees experienced no harm or that no other incidents occurred.','Cela ne démontre pas l’absence de préjudice ou d’autres incidents.')],
   [B('Eight Values and Ethics Code investigations','Huit enquêtes sur le Code de valeurs et d’éthique'),B('All were reported as founded; corrective measures are described.','Toutes sont déclarées fondées; les mesures correctives sont décrites.'),B('These are completed administrative processes, not workforce prevalence.','Il s’agit de processus administratifs terminés, et non d’une mesure de prévalence.')]],'misconduct')+'<p>'+B('The report’s summary table and detailed narrative give different descriptions of financial misconduct cases. This page does not reconcile those entries or calculate a combined total.','Le tableau récapitulatif et le récit détaillé du rapport donnent des descriptions différentes des dossiers d’inconduite financière. Cette page ne réconcilie pas ces entrées et ne calcule pas de total combiné.')+'</p><p>'+link('https://aranpublicservants-rgb.github.io/aran-raar/recourse/'+('?lang=fr' if fr else ''),B('Recourse guide and union finder','Guide des recours et recherche du syndicat'))+'</p><p>'+B('Different processes have different roles and deadlines. An informal discussion does not automatically suspend a formal deadline. Check the applicable agreement or process with your union or adviser.','Les processus ont des rôles et des délais différents. Une discussion informelle ne suspend pas automatiquement un délai officiel. Vérifiez la convention ou le processus applicable avec votre syndicat ou un conseiller.')+'</p>'
 if section=='missing':
  rows=[(B('Executive and occupational representation','Représentation des cadres et des professions'),B('A current ISC group-by-level and occupation table has not been established in this reading page. Overall representation and executive survey answers are different measures.','Cette page n’établit pas de tableau actuel de SAC par groupe, niveau et profession. La représentation globale et les réponses des cadres au sondage sont des mesures différentes.')),
        (B('Accommodation outcomes','Résultats de l’adaptation'),B('The plan and consultation report do not establish complete waiting-time, interim-support or unmet-need results for every request.','Le plan et le rapport de consultation n’établissent pas les délais, le soutien provisoire et les besoins non satisfaits pour chaque demande.')),
        (B('Review recommendations and implementation','Recommandations des examens et mise en œuvre'),B('Request the full Employment Systems Review, response, dated action tracker and results; this page does not infer their contents.','Demandez l’examen complet des systèmes d’emploi, la réponse, un suivi daté et les résultats; cette page n’en déduit pas le contenu.')),
        (B('Staffing stages and departures','Étapes de dotation et départs'),B('The source library retains staffing and departure records with their own dimensions. A comparable ISC equity-group cross-tab for every stage is not established here.','La bibliothèque conserve les données de dotation et de départ selon leurs propres dimensions. Une ventilation comparable par groupe d’équité à chaque étape n’est pas établie ici.')),
        (B('Suppression and legal decisions','Suppression et décisions judiciaires'),B('Suppressed cells remain suppressed. No ISC-specific court or tribunal decision has been summarized in this page.','Les cellules supprimées restent supprimées. Cette page ne résume aucune décision judiciaire ou de tribunal propre à SAC.')),
        (B('Sections specific to other employers','Sections propres à d’autres employeurs'),B('Canadian Armed Forces, military conduct and Coast Guard transfer sections do not apply to ISC. Subgroup survey results are included under workforce and employee experience.','Les sections sur les Forces armées, la conduite militaire et le transfert de la Garde côtière ne s’appliquent pas à SAC. Les résultats des sous-groupes figurent dans les sections sur l’effectif et l’expérience.'))]
  return '<p>'+B('These are limits of the reviewed collection, not proof that a record does not exist elsewhere.','Il s’agit des limites de la collection examinée, et non de preuves qu’un document n’existe pas ailleurs.')+'</p>'+table(l,B('Evidence to obtain or clarify','Données à obtenir ou à préciser'),[B('Topic','Sujet'),B('Review limit and next evidence','Limite de l’examen et données à obtenir')],[[a,b] for a,b in rows],'assessment')
 if section=='data-library':
  return '<p>'+B(f'This register contains {len(files)} ISC-matched files and {catalogue["records"]:,} source records. Files and historical editions can overlap; records are not employee counts. The PSES reading extract contains 27 questions, not the complete survey. Other survey and staffing files retain their original scope.',f'Ce registre contient {len(files)} fichiers associés à SAC et {catalogue["records"]:,} lignes sources. Les fichiers et éditions historiques peuvent se chevaucher; les lignes ne sont pas des effectifs. L’extrait de lecture du SAFF contient 27 questions, et non le sondage complet. Les autres fichiers conservent leur propre portée.')+'</p><div class="library" data-lang="'+l+'"><div class="filters"><label>'+B('Topic','Sujet')+'<select class="topic-filter"><option value="all">'+B('All topics','Tous les sujets')+'</option>'+''.join('<option value="'+k+'">'+B(en,ft)+'</option>' for k,en,ft in [('workforce','Workforce','Effectif'),('surveys','Surveys','Sondages'),('staffing','Staffing','Dotation')])+'</select></label><label>'+B('Find a dataset','Trouver un jeu de données')+'<input class="file-search" type="search"></label></div><label>'+B('Dataset','Jeu de données')+'<select class="dataset-picker"></select></label><div class="data-view" aria-live="polite"></div></div>'
 if section=='publications':
  return '<p>'+B('The following sources were reviewed for this profile. The register is not an exhaustive list of ISC publications. Source titles and original documents may be in English.','Les sources suivantes ont été examinées pour ce profil. Le registre n’est pas une liste exhaustive des publications de SAC. Certains titres et documents originaux sont en anglais.')+'</p><ul>'+''.join('<li>'+link(sources[k],B(en,ft))+'</li>' for k,en,ft in [('plan','Departmental Plan 2026–27','Plan ministériel de 2026-2027'),('results','Departmental Results Report 2024–25','Rapport sur les résultats de 2024-2025'),('access','Accessibility Plan 2026–2028','Plan d’accessibilité de 2026-2028'),('progress','Accessibility progress report 2024','Rapport d’étape sur l’accessibilité de 2024'),('misconduct','Misconduct and wrongdoing report 2024–25','Rapport sur les inconduites et les actes répréhensibles de 2024-2025'),('assessment','Call to Action self-assessment 2024','Autoévaluation de 2024 liée à l’Appel à l’action'),('letter','Call to Action letter 2021','Lettre de 2021 liée à l’Appel à l’action'),('pses','Employee-group PSES source CSV','Fichier CSV du SAFF par groupe'),('staffing','Staffing survey 2025 and methods','Sondage sur la dotation de 2025 et méthodes')])+'</ul>'
 if section=='requests':
  return '<p>'+B('Prepare an aggregate data request with the source period, population, employee groups and outcome measures. Do not include identifiable case details.','Préparez une demande de données agrégées avec la période, la population, les groupes et les résultats à mesurer. N’incluez pas de détails permettant d’identifier une personne.')+'</p><label>'+B('Topic to clarify','Sujet à préciser')+'<select class="isc-request-topic">'+''.join('<option>'+B(en,ft)+'</option>' for en,ft in [('Executive and occupational representation','Représentation des cadres et des professions'),('Accommodation waiting times and unmet needs','Délais d’adaptation et besoins non satisfaits'),('Staffing stages, promotions and departures by group','Étapes de dotation, promotions et départs par groupe'),('Employment Systems Review and action status','Examen des systèmes d’emploi et suivi des mesures')])+'</select></label><button type="button" class="isc-request-build" data-lang="'+l+'">'+B('Build request','Préparer la demande')+'</button><label>'+B('Request draft','Brouillon de demande')+'<textarea class="isc-request-draft" rows="8"></textarea></label><button type="button" class="isc-request-download" data-lang="'+l+'">'+B('Download request','Télécharger la demande')+'</button><p>'+B('The request stays in your browser until you choose to share it.','La demande reste dans votre navigateur jusqu’à ce que vous choisissiez de la transmettre.')+'</p>'
 if section=='actions':
  rows=[
   [B('Representation','Représentation'),B('Disability: 8.9% against 12.0%; racialized: 21.0% against 22.9%, March 2025.','Handicap : 8,9 % contre 12,0 %; personnes racisées : 21,0 % contre 22,9 %, mars 2025.'),B('Review hiring and advancement by group, level and occupation with affected employees. Request stage-specific results.','Examiner l’embauche et l’avancement par groupe, niveau et profession avec les employés concernés. Demander les résultats par étape.')],
   [B('Reprisal and confidence','Représailles et confiance'),B('Q42: 46% feel able to start formal recourse without fear; Q72: 11% satisfaction, 205 rounded responses.','Q42 : 46 % estiment pouvoir exercer un recours sans crainte; Q72 : satisfaction de 11 %, 205 réponses arrondies.'),B('Ask employees and networks which process steps deter reporting. Record the management response and track confidence using the same questions.','Demander aux employés et aux réseaux quelles étapes découragent le signalement. Consigner la réponse de gestion et suivre la confiance avec les mêmes questions.')],
   [B('Accommodation','Adaptation'),B('Q86: 64% report any measure implemented; Q87: 70% satisfaction among recipients.','Q86 : 64 % déclarent la mise en place d’une mesure; Q87 : satisfaction de 70 % parmi les bénéficiaires.'),B('Track time to first support, interim measures and effectiveness against employment commitments 1–4. Keep the respondent bases separate.','Suivre le délai du premier soutien, les mesures provisoires et leur efficacité par rapport aux engagements 1 à 4. Garder les bases de répondants distinctes.')],
   [B('Staffing barriers','Obstacles en dotation'),B('STA_14A: 26% among Black advertised-process participants, compared with 14% overall, staffing survey 2025.','STA_14A : 26 % des participants noirs à un processus annoncé, contre 14 % dans l’ensemble, sondage de 2025.'),B('Review assessment and appointment practices with the affected group. The difference supports examining practices; it does not establish its cause.','Examiner les pratiques d’évaluation et de nomination avec le groupe concerné. L’écart justifie un examen; il n’en démontre pas la cause.')]]
  return '<p>'+B('These are proposed steps drawn from the named measures. They are not existing ISC commitments or findings of causation. For each step, record a responsible executive, a response date, the decision and a measure of the result.','Ces mesures proposées découlent des indicateurs nommés. Elles ne sont pas des engagements existants de SAC ni des conclusions causales. Pour chaque mesure, consignez le cadre responsable, la date de réponse, la décision et un indicateur de résultat.')+'</p>'+table(l,B('Evidence and proposed follow-up','Données et suivi proposé'),[B('Issue','Enjeu'),B('Measure and figure','Indicateur et chiffre'),B('Proposed action','Mesure proposée')],rows,'tbs')+source(l,'overall')+source(l,'staffing')
 if section=='sources':
  return '<ul>'+''.join('<li>'+B(en,ft)+'</li>' for en,ft in [
   ('Employment equity headcounts, all-employee population, FTEs, rounded PSES response counts and staffing-survey weighted totals use different definitions.','Les effectifs d’équité, la population totale, les ETP, les réponses arrondies du SAFF et les totaux pondérés du sondage sur la dotation ont des définitions différentes.'),
   ('Keep each source’s year, question, base and population. Do not add overlapping groups or estimate a suppressed count.','Conservez l’année, la question, la base et la population de chaque source. N’additionnez pas les groupes qui se chevauchent et n’estimez pas un effectif supprimé.'),
   ('X, x, *, -1, blank and 9999 follow the definitions of their source. A missing or suppressed result is not zero.','X, x, *, -1, une case vide et 9999 suivent les définitions de leur source. Une valeur manquante ou supprimée n’est pas zéro.'),
   ('A plan states intended work; a progress report describes the department’s reported activity. Neither alone establishes a change in employee outcomes.','Un plan présente les travaux prévus; un rapport d’étape décrit les activités déclarées par le ministère. Aucun ne démontre à lui seul un changement des résultats pour le personnel.'),
   ('Percentage-point differences on this page are arithmetic comparisons of published rounded percentages. They are not employee shortfalls.','Les écarts en points sont des comparaisons arithmétiques des pourcentages publiés et arrondis. Ils ne sont pas des déficits d’effectifs.')])+'</ul>'+source(l,'tbs')+source(l,'overall')+source(l,'pses')+source(l,'staffing')
 raise ValueError(section)

base=(ROOT/'dfo/index.html').read_text()
header=base[:base.index('<main id="main"')]
header=header.replace('<script src="guide-model.js" defer></script><script src="explore.js" defer></script>','<script src="guide.js" defer></script>')
header=header.replace('<script src="../assets/department-requests.js" defer></script>', '').replace('<link rel="stylesheet" href="site.css">','<link rel="stylesheet" href="site.css"><link rel="stylesheet" href="extra.css">')
header=header.replace('Equity at DFO | Équité au MPO','Equity at ISC | Équité à SAC').replace('Independent bilingual DFO equity evidence','Independent bilingual ISC equity evidence')
header=header.replace('content="#123443"','content="#123443"')
body=header+'<main id="main" tabindex="-1">'
for l in ['en','fr']:
 fr=l=='fr'; menus=''.join('<li>'+link('#'+s[1 if fr else 0],s[3 if fr else 2])+'</li>' for s in SECTIONS)
 opts=''.join('<option value="'+s[1 if fr else 0]+'">'+E(s[3 if fr else 2])+'</option>' for s in SECTIONS)
 body+='<div id="lang-'+l+'" lang="'+l+'"'+(' hidden' if fr else '')+'><div class="page-heading"><div class="container"><p class="eyebrow">GC Equity · '+pick(l,'Department profile','Profil ministériel')+'</p><h1>'+pick(l,'Equity at Indigenous Services Canada','L’équité à Services aux Autochtones Canada')+'</h1><p>'+pick(l,'Evidence reviewed November 19, 2026','Données examinées le 19 novembre 2026')+'</p>'+link('../index.html?org='+quote(NAME)+'&amp;view=table&amp;lang='+l,pick(l,'Back to the ISC organization view','Retour à la vue de SAC'))+'</div></div><div class="container"><label class="mobile-jump">'+pick(l,'Jump to a section','Aller à une section')+'<select>'+opts+'</select></label><div class="page-grid"><nav class="contents" aria-label="'+pick(l,'On this page','Sur cette page')+'"><p class="nav-title">'+pick(l,'On this page','Sur cette page')+'</p><ol>'+menus+'</ol></nav><article>'
 for s in SECTIONS:
  ident=s[1 if fr else 0]
  body+='<section aria-labelledby="'+ident+'"><h2 id="'+ident+'">'+s[3 if fr else 2]+'</h2>'+content(l,s[0])+'<div class="section-tools"><button type="button" class="print-section">'+pick(l,'Print this section','Imprimer cette section')+'</button>'+link('#'+('apercu' if fr else 'at-a-glance'),pick(l,'Back to top','Haut de la page'))+'</div></section>\n'
 body+='</article></div></div></div>'
body+='</main><footer class="site-footer"><div class="container"><p data-label-en="Independent ARAN resource. Not a Government of Canada publication." data-label-fr="Ressource indépendante du RAAR. Il ne s’agit pas d’une publication du gouvernement du Canada.">Independent ARAN resource. Not a Government of Canada publication.</p></div></footer><div id="notice" class="visually-hidden" role="status"></div></body></html>\n'
body=body.replace('&amp;amp;', '&amp;')
(OUT/'index.html').write_text(body)
(OUT/'site.css').write_text((ROOT/'dfo/site.css').read_text()+'\n.isc-request-draft{width:100%;font:inherit;min-height:10rem}.isc-guide-answer{margin-top:1rem}.isc-guide{padding:1rem;border:1px solid var(--line);border-radius:.5rem}\n')
app=(ROOT/'dfo/app.js').read_text().replace('DFO','ISC').replace('MPO','SAC').replace('dfo','isc').replace('Fisheries and Oceans Canada',NAME).replace('Équité au SAC','Équité à SAC')
app=re.sub(r'const en=\[.*?\];', 'const en='+json.dumps([s[0] for s in SECTIONS])+';',app,count=1)
app=re.sub(r'const fr=\[.*?\];', 'const fr='+json.dumps([s[1] for s in SECTIONS])+';',app,count=1)
app=app.replace("v==='X'?L('Suppressed (X)','Supprimé (X)',l):v", "['X','x','*','-1'].includes(v)?L('Suppressed','Supprimé',l):v")
app=app.replace("sourceFile==='official/EEINFODV-isc.csv'", "id==='pses-2024-reading'")
app=app.replace('<p class="source"><a href="\'+esc(file.source)+\'">\'+L(\'Published source and documentation\',\'Source publiée et documentation\',l)+\'</a></p>', '<p class="source">\'+(file.sources||[file.source]).map((u,i)=>\'<a href="\'+esc(u)+\'">\'+L(\'Published source \'+(i+1),\'Source publiée \'+(i+1),l)+\'</a>\').join(\' · \')+\'</p>')
app=app.replace("function usefulColumns(headers,l){", "function usefulColumns(headers,l){if(headers.includes('Group (English)'))return [l==='fr'?'Group (French)':'Group (English)','Question',l==='fr'?'Question (French)':'Question (English)','Published result (%)','Rounded responses'].map(h=>headers.indexOf(h));")
app=app.replace("function dimensions(headers,rows,l){", "function dimensions(headers,rows,l){if(headers.includes('Group (English)'))return [headers.indexOf(l==='fr'?'Group (French)':'Group (English)'),headers.indexOf('Question')];")
# Initialize each group selector through the same verified retrieval used on change.
app=app.replace("tableExports();setLanguage(lang,false);expandAnchor();", "tableExports();setLanguage(lang,false);expandAnchor();$$('.survey-widget select').forEach(s=>s.dispatchEvent(new Event('change')));")
(OUT/'app.js').write_text(app)
print(f'Built ISC: {len(SECTIONS)} bilingual sections, {len(files)} matched datasets, {catalogue["records"]:,} records; {len(profile["groups"])} employee groups.')
