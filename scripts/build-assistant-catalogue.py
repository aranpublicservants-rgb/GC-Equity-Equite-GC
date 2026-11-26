"""Index existing published sources without recalculating workforce values."""
import csv,gzip,hashlib,json,re,sys,unicodedata
from pathlib import Path
R=Path(__file__).resolve().parent.parent
J=lambda p:json.loads((R/p).read_text())
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFD',str(s)).encode('ascii','ignore').decode().lower()).replace('civilianstaffonly','').replace('publicserviceemployees','')
m=J('assets/workspace-data.json');h=J('assets/hosted-datasets.json');psc=J('data/psc/catalogue.json');ix=J('assets/psc-organization-index.json');rest=J('assets/restored-datasets.json');sc=J('assets/organization-source-scopes.json');added=J('assets/added-sources.json');entries=[];seen={};orgs={};aliases={}
def org(n,fr=''):
 n=re.sub(r' Total$','',str(n)).strip();k=norm(n)
 if not k or k in ['federalpublicservice','publicservice','publicservicetotal','total','allorganizations']:return
 if k not in orgs:orgs[k]={'en':n,'fr':fr or m.get('DEPT_FR',{}).get(n,n)}
 if fr and fr!=n:aliases.setdefault(n,set()).add(fr)
for n,fr in m.get('DEPT_FR',{}).items():org(n,fr)
for o in added['organizations'].values():
 org(o['en'],(o.get('fr') or [''])[0]);aliases.setdefault(o['en'],set()).update(o.get('fr') or [])
for n in J('assets/federal-organizations-2026-10-15.json')['organizations']:
 if isinstance(n,str):org(n)
fields=['organization_e','department_e','dept_e','Department or agency','Ministère ou organisme','Organization','Organisation','organization','Department','DEPARTMENT_EN','DEPT_EN','DEPT_E','DEPT_NAME_E','DEPARTMENT','Organization name','Department Name','department_name_en']
def inspect(path):
 p=R/path
 if not p.is_file() or not re.search(r'\.csv(?:\.gz)?$',path,re.I):return {},[],''
 try:
  with (gzip.open if path.endswith('.gz') else open)(p,'rt',encoding='utf-8-sig',errors='replace',newline='') as f:
   reader=csv.reader(f);head=next(reader,[])
   if len([v for v in head if v])<2:head=next(reader,[])
   head=[v.strip() for v in head];field=next((x for x in fields if x in head),None);values={};sample=[]
   for i,row in enumerate(reader):
    if i<50:sample.extend(str(v) for v in row)
    if field and len(row)>head.index(field):
     n=row[head.index(field)].strip()
     if n:values[n]=True;org(n)
    if i>=20000 or (i>=100 and p.stat().st_size>2000000):break
   return values,head,' '.join(sample)[:6000]
 except (OSError,csv.Error,StopIteration):return {},[],''
def tags(title,path,head,sample):
 text=' '.join([title,path,' '.join(head)]).lower();topics=[];detail=[];groups=[]
 for k,pat in {'experience':'survey|pses|saff|snps|sdip|harassment|violence','staffing':'staffing|appointment|hiring|promotion|separation|recruit|movement|advertisement|applicant|student|referral|priority|dotation','workforce':'population|number of employees|workforce|age band|tenure|first official language','pay':'salary|salaries|salaire|remuneration|disproportionality'}.items():
  if re.search(pat,text):topics.append(k)
 if re.search('representation|workforce availability|tbs_ee_|employment equity|disproportionality',text) and not re.search('applicant|appointment|hiring|staffing|separation|movement',title.lower()):topics.append('representation')
 for k,pat in {'executives':'executiv|ex_level|ex level|cadre','region':'region|province|geographic','occupation':'occupation|classification|job group','availability':'availability|wfa|benchmark|disproportionality','trend':'trend|history|2017.2025|2010.2026|by year|fiscal.year','hiring':'hiring|appointment|recruit|applicant','promotion':'promotion','departures':'separation|departure','language':'language|lingu|fol_|langue','age':'age.band|age.group|average.age','tenure':'tenure|indeterminate|term','harassment':'harassment|harcel|violence','discrimination':'discrimination|racism|racisme','accommodation':'accommod|adaptation|accessib','barriers':'barrier|bias|fairness|transparen|obstacle','salary':'salary|salaries|salaire','estimate':'estimate|derived|disproportionality'}.items():
  if re.search(pat,text):detail.append(k)
 text+=' '+sample.lower()
 for k,pat in {'w':r'\bwomen\b|\bfemmes\b|\bfemale\b','i':'indigenous|autochtone|first.nations|inuit|metis','d':'disabil|handicap','v':'raciali|racis|visible.minorit|minorites.visibles','b':r'\bblack\b|\bnoirs?\b','lgbt':'2slgbt|2elgbt|sexual.orientation|gender.identity','man':r'\bmen\b|\bhommes\b|\bmale\b'}.items():
  if re.search(pat,text):groups.append(k)
 return topics or ['staffing' if '/psc/' in path else 'workforce'],detail,groups
TR={'By department (including all departments)':'Par organisme, y compris l’ensemble des organismes','Employment Equity':'Équité en matière d’emploi','List of departments':'Liste des organismes','List of questions':'Liste des questions','Response profile data':'Profil des répondants','Supplemental salary imputation estimates':'Estimations supplémentaires de salaires imputés','Data Visualization Dataset':'Données de visualisation','Data Visualization Dataset (Dataset B)':'Données de visualisation, ensemble B','Data Visualization Dataset (dataset A)':'Données de visualisation, ensemble A','Representation by employment-equity occupational group, 2017–18':'Représentation par catégorie professionnelle de l’équité en emploi, 2017-2018'}
def french(title):
 if title in TR:return TR[title]
 translations=[('By department and by Employment Equity Group:','Par organisme et groupe d’équité :'),('By department and by','Par organisme et'),('Population of the federal public service executives and non-executives by department or agency','Effectif des cadres et non-cadres de la fonction publique par organisme'),('Population of the federal public service by','Effectif de la fonction publique selon'),('and executive level','et le niveau de direction'),('Percentage of student applicants to advertised processes and student hiring activities to the public service, by Employment Equity designated group and fiscal year','Parts des candidatures et embauches étudiantes par groupe d’équité et exercice'),('Percentage of applicants to advertised processes, by Employment Equity designated group and fiscal year','Part des candidatures aux processus annoncés par groupe d’équité et exercice'),('Percentage of appointments to the public service to indeterminate positions and terms of three months and over','Part des nominations à la fonction publique pour une période indéterminée ou une durée d’au moins trois mois'),('by employment equity designated group and geographic area','par groupe d’équité et région'),('by employment equity designated group, sex and fiscal year','par groupe d’équité, sexe et exercice'),('by employment equity designated group and fiscal year','par groupe d’équité et exercice'),('Indigenous Peoples','Peuples autochtones'),('Persons with disabilities','Personnes en situation de handicap'),('Visible minorities','Minorités visibles'),('Women','Femmes'),('First Official Language','première langue officielle'),('first official language','première langue officielle'),('Indigenous subgroup','sous-groupe autochtone'),('Occupational group','groupe professionnel'),('Age group','groupe d’âge'),('age band','catégorie d’âge'),('Years of Service','années de service'),('visible minority subgroup','sous-groupe racisé'),('type of disability','type de handicap'),('family status','situation de famille'),('marital status','état matrimonial'),('sexual orientation','orientation sexuelle'),('2SLGBTQIA+ identity','identité 2ELGBTQIA+'),('province or territory of work','province ou territoire de travail'),('region of work','région de travail'),('executive level','niveau de direction'),('Tenure','durée d’emploi'),('Region','région'),('diploma','diplôme'),('identity','identité'),('religion','religion'),('sex','sexe')]
 for en,fr in translations:title=title.replace(en,fr)
 return title

def add(path,en,fr='',source='sources.html',period=None,publisher=None,field=None,coverage=None,partitions=None,scope=None,topics=None,details=None,groups=None,view=None,kind='source',scan=True,originalBytes=0):
 if any(part in path for part in ('/esdc-wfa-benchmarks/', '/harassment-violence-occurrences/', '/esdc-federally-regulated-ee-annual-report-')):return None
 if path in seen:return seen[path]
 vals,head,sample=inspect(path) if scan else ({},[],'');field=field or next((x for x in fields if x in head),None);ts,ds,gs=tags(en,path,head,sample);covered=list(coverage or vals)
 for n in covered:org(n)
 e={'id':'ds-'+hashlib.sha256(path.encode()).hexdigest()[:12],'path':path,'en':en,'fr':fr or french(en),'source':source,'period':period or ['See source','Voir la source'],'publisher':publisher or ['Published source','Source publiée'],'topics':topics or ts,'details':details if details is not None else ds,'groups':groups if groups is not None else gs,'kind':kind,'view':view,'bytes':(R/path).stat().st_size if (R/path).is_file() else 0,'originalBytes':originalBytes}
 if field:e['orgField']=field
 if covered:e['organizations']=covered
 if partitions:e['partitions']=partitions
 if scope:e['organizationScope']=scope;e['organizations']=[scope];org(scope)
 e['scopes']=['org'] if scope else ['public','org'] if field or partitions else ['public']
 if field and not partitions:e['publicContext']=True
 if re.search('by Employment Equity Group:|women-|women\\.',en+' '+path,re.I):e['strictGroups']=True
 e['population']=['Check the population and definitions in the original source','Vérifiez la population et les définitions dans la source originale']
 if '/harassment-violence-occurrences/' in path:e['population']=['Federal jurisdiction, including employers outside the public service','Compétence fédérale, y compris des employeurs hors fonction publique']
 elif '/psc/' in path:e['population']=['Source-specific Public Service Employment Act population','Population visée par la Loi sur l’emploi dans la fonction publique selon la source']
 entries.append(e);seen[path]=e;return e
for f in psc['files']:
 i=next((x for x in ix['files'] if x['file']==f['file']),{})
 add(f['path'],f['en'],f['fr'],f['url'],' – '.join(f.get('years',[])),[psc['publisher'],psc['publisher_fr']],i.get('field'),list(i.get('organizations',{})),view='org-additional-psc' if i else 'public-data-library')
for category,files in h['hostedAdditional'].items():
 for f in files:add(f['path'],f.get('titleEn') or f['name'],f.get('titleFr') or f.get('titleEn') or f['name'],kind='derived' if f.get('kind')=='derived' else 'source',view='public-data-library')
for f in rest['files']+sc.get('files',[]):
 override=next((o for o in sc['scopeOverrides'] if f.get('originalName','').startswith(o['namePrefix'])),{});scope=f.get('organizationScope') or override.get('organizationScope');path=f.get('path') or 'partitioned:'+f['originalName'];title=f.get('title') or f.get('dataset') or f['originalName'];dataset=f.get('dataset','');en=title;fr=french(title)
 if re.match(r'20\d\d Staffing',dataset):en=dataset[:4]+' staffing survey: '+title;fr='Sondage sur la dotation de '+dataset[:4]+' : '+fr
 e=add(path,en,fr,f.get('publisherUrl','sources.html'),field=f.get('organizationField'),partitions={k:v['path'] for k,v in f.get('partitions',{}).items()},scope=scope,view='org-restored-surveys' if 'Survey' in dataset else 'org-restored-workforce',scan=bool(f.get('path')),originalBytes=f.get('sourceBytes',0))
 if f.get('partitions'):
  e['organizations']=list(f['partitions']);pub=next((k for k in f['partitions'] if norm(k)=='federalpublicservice'),None)
  if pub:e['publicPath']=f['partitions'][pub]['path'];e['publicOrganization']=pub;e['scopes']=['public','org']
  else:e['scopes']=['org']
for t in added['tables']:
 for lang in ['en','fr']:
  side=t[lang];add(side['path'],t['titleEn'],t['titleFr'],t['url'],t.get('periodText') or ' – '.join(t['period']),t['publisher'],side.get('field'),[o['en'] for o in added['organizations'].values() if t['id'] in o['t']] if t['scope']=='org' else None,view='org-added-sources' if t['scope']=='org' else 'public-added-sources')
for p in added['packages']:
 for f in p['files']:add(f['path'],p['titleEn']+': '+(f.get('titleEn') or f.get('name') or Path(f['path']).name),p['titleFr']+' : '+(f.get('titleFr') or f.get('name') or Path(f['path']).name),f.get('sourceUrl') or p['url'],p.get('periodText'),p['publisher'],view='public-added-sources',originalBytes=f.get('originalBytes',0))
for path,en,fr,topics,details,gs,view in [
 ('data/tbs-departmental-representation-2017-2025.json','Departmental representation and workforce availability, 2017–2025','Représentation et disponibilité par organisme, 2017-2025',['representation'],['availability','trend'],['w','i','d','v','b'],'org-representation'),
 ('data/snps-2025-by-organization.json','2025 staffing survey by organization and employee group','Sondage sur la dotation de 2025 par organisme et groupe',['experience','staffing'],['barriers'],['w','i','d','v','b','man'],'org-staffing'),
 ('data/psc/psc-equity.json','Staffing, hiring, promotion and departure indicators','Indicateurs de dotation, d’embauche, de promotion et de départ',['staffing'],['hiring','promotion','departures'],['w','i','d','v','b'],'org-psc-mobility'),
 ('data/call-to-action-letters.json','Call to Action letters, commitments and self-assessments','Lettres, engagements et autoévaluations liés à l’appel à l’action',['commitments'],[],[],'org-cta'),
 ('data/call-to-action-comparisons.json','Call to Action commitments compared with results','Comparaison des engagements et des résultats liés à l’appel à l’action',['commitments'],[],[],'org-cta-outcomes'),
 ('assets/workspace-data.json','Published workforce, executive and employee survey summary tables','Tableaux sommaires sur l’effectif, les cadres et les sondages',['representation','workforce','experience','pay','plans'],['executives','trend','discrimination','harassment','accommodation'],['w','i','d','v','b','man','lgbt'],'department-data')]:
 e=add(path,en,fr,topics=topics,details=details,groups=gs,view=view,kind='summary',scan=False);e['scopes']=['public','org'];e['organizations']=list(m['DEPT_FR']);e['preview']='dashboard'
 if 'representation-2017' in path:e['organizations']=list(J(path)['orgs'])
 if 'snps-2025' in path:e['organizations']=list(J(path)['orgs'])
 if 'call-to-action-letters' in path:e['organizations']=[o.get('site_name') or o.get('plan_name') or o['name_en'] for o in J(path)['organizations']]
# The 27-question department-level survey reading profiles use original cells.
profile=J('assets/department-profile-index.json')
e=add('assets/department-profile-index.json','2024 employee experience: accommodation, mental health, harassment and discrimination','Expérience des employés en 2024 : adaptation, santé mentale, harcèlement et discrimination',source=profile['sources']['groups'],period='2024',partitions={n:v['path'] for n,v in profile['organizations'].items()},topics=['experience'],details=['harassment','discrimination','accommodation','barriers'],groups=['w','i','d','v','b','man','lgbt'],view='org-profile-surveys',kind='summary',scan=False)
e['scopes']=['org'];e['organizations']=list(profile['organizations']);e['preview']='dashboard'
for name,record in profile['organizations'].items():org(name,record['fr'])
# Branch-level survey and the separately verified DFO source collection.
branch=json.loads(re.search(r'<script type="application/json" id="eq-branch-meta">(.*?)</script>',(R/'explorer.html').read_text(),re.S)[1])
e=add('explorer.html','2024 employee survey by organization, branch and employee group','Sondage de 2024 par organisme, direction et groupe',source='branch-equity.html',period='2024',topics=['experience'],details=['harassment','discrimination','accommodation','barriers'],groups=['w','i','d','v','b','man','lgbt'],view='org-branches',kind='summary',scan=False)
e['scopes']=['org'];e['organizations']=[d['en'] for d in branch['departments']];e['preview']='dashboard'
source_entries={f['originalName']:seen[f.get('path') or 'partitioned:'+f['originalName']] for f in rest['files'] if (f.get('path') or 'partitioned:'+f['originalName']) in seen}
for f in J('dfo/data/catalogue.json')['files']:
 original=seen.get(f['sourceFile']) or source_entries.get(f['sourceFile'])
 en,fr=f['en'],f['fr'];period=original.get('period') if original else None
 topics={'accessibility':['experience','plans'],'recourse':['experience'],'representation':['representation'],'workforce':['workforce'],'staffing':['staffing'],'survey':['experience'],'surveys':['experience'],'pses':['experience'],'snps':['experience','staffing'],'plans':['plans'],'commitments':['commitments']}.get(f.get('topic'))
 if f.get('topic') in ['survey','surveys'] and re.search('snps|staffing',f['sourceFile']+' '+en,re.I):topics=['experience','staffing']
 if original:
  topics=original['topics'];en,fr=original['en'],original['fr']
 elif re.search(r'snps-(20\d\d)',f['sourceFile']):
  year=re.search(r'snps-(20\d\d)',f['sourceFile'])[1];en=year+' staffing survey: '+en;fr='Sondage sur la dotation de '+year+' : '+fr;period=year
 e=add('dfo/'+f['path'],en,fr,source=f.get('source') or 'dfo/',period=period,scope='Fisheries and Oceans Canada',topics=topics,details=original['details'] if original else None,groups=original['groups'] if original else None,view='org-survey',kind='extract',scan=False)
 e['population']=['DFO-specific records in the published source collection','Dossiers propres au MPO dans la collection de sources publiées']
native=J('data/tbs-women-departmental-2025.json')
e=add('data/tbs-women-departmental-2025.json','Women: published departmental counts, representation and availability, 2025','Femmes : effectifs, représentation et disponibilité ministériels publiés, 2025',source=native['source'],period='2025',topics=['representation','workforce'],details=['availability'],groups=['w'],view='org-representation',kind='summary',scan=False)
e['scopes']=['org'];e['organizations']=list(native['orgs']);e['preview']='dashboard'
for n in native['orgs']:org(n)
result={'schema':1,'generated':'2026-11-17','organizations':sorted(orgs.values(),key=lambda o:o['en']),'aliases':[{'en':n,'names':sorted(v)} for n,v in sorted(aliases.items())],'datasets':entries}
out=json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n';target=R/'assets/assistant-catalogue.json';compressed=R/'assets/assistant-catalogue.json.gz'
if '--check' in sys.argv:assert target.read_text()==out and gzip.decompress(compressed.read_bytes()).decode()==out,'Assistant catalogue is stale'
else:target.write_text(out);compressed.write_bytes(gzip.compress(out.encode(),mtime=0))
print(f'Assistant catalogue: {len(entries)} datasets; {len(orgs)} organization names; {compressed.stat().st_size} compressed bytes')
