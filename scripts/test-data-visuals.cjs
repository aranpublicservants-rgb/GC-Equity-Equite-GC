'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const V=require('../assets/data-visuals.js');

test('published values retain suppression, zero, language and measure units',()=>{
 for(const v of [null,undefined,'','X','x','*','-1','9999','Suppressed (X)','Supprimé','Not published / not applicable'])assert.equal(V.numeric(v),null,String(v));
 assert.equal(V.numeric('0%'),0);
 assert.equal(V.numeric('1,234.5%'),1234.5);
 assert.equal(V.numeric('1\u202f234,5 %','fr'),1234.5);
 assert.equal(V.numeric('-1','en',true),-1);
 const p=V.profile(['Group','Representation','Availability','Rounded responses','Year','Branch ID'],[['Black','4.2%','5.1%',20,2024,200],['Indigenous','X','4.0%',0,2024,201]]);
 assert.deepEqual(p.metrics.map(m=>[m.index,m.kind]),[[1,'percent'],[2,'percent'],[3,'count']]);
 assert.ok(!p.metrics.some(m=>m.index>=4));
 const pts=V.points(p,{measure:1,compare:3});
 assert.equal(pts.metrics.length,1,'respondent counts cannot share a representation percentage scale');
 assert.deepEqual(pts.rows.map(r=>r.values),[[4.2],[null]]);
});

test('filtering uses full matching source rows rather than a table page and does not aggregate',()=>{
 const rows=Array.from({length:165},(_,i)=>['Group '+i,i%100,i%2?'2024':'2025']);
 const p=V.profile(['Group','Published result (%)','Year'],rows,{scope:'filtered'});
 const all=V.points(p,{measure:1,limit:250});assert.equal(all.total,165);assert.equal(all.rows.length,165);
 const selected=V.points(p,{measure:1,limit:20,filters:{2:'2025'}});assert.equal(selected.total,83);assert.equal(selected.rows.length,20);
 assert.deepEqual(selected.rows[0].raw,rows[0]);
 assert.equal(V.points(p,{search:'Group 164',measure:1}).rows[0].raw[1],64);
 assert.equal(V.points(p,{measure:1,compare:1}).metrics.length,1);
});

test('trends require unique periods and retain missing values as gaps',()=>{
 const p=V.profile(['Year','Representation (%)'],[[2021,5],[2022,'X'],[2023,0]]);
 const pts=V.points(p,{x:0,measure:1});assert.ok(V.trendAllowed(p,pts));assert.equal(pts.rows[1].values[0],null);assert.equal(pts.rows[2].values[0],0);
 const duplicated=V.profile(['Year','Representation (%)'],[[2024,5],[2024,10]]);assert.equal(V.trendAllowed(duplicated,V.points(duplicated)),false);
 const groups=V.profile(['Group','Representation (%)'],[['Black',5],['Indigenous',10]]);assert.equal(V.trendAllowed(groups,V.points(groups)),false);
});

test('heatmaps reject repeated source cells instead of silently adding or averaging them',()=>{
 const p=V.profile(['Branch','Group','Published result (%)'],[['A','Black',10],['A','Indigenous','X'],['B','Black',0],['B','Indigenous',30]]);
 const m=V.pivot(p,V.points(p,{x:0,measure:2}),1);assert.equal(m.cells.size,4);assert.equal(m.cells.get('["B","Black"]').values[0],0);assert.equal(m.cells.get('["A","Indigenous"]').values[0],null);
 const duplicate=V.profile(p.headers,[...p.rows,['A','Black',20]]);assert.equal(V.pivot(duplicate,V.points(duplicate,{x:0,measure:2}),1),null);
});

test('stacked distributions require all five labelled response categories and complete published shares',()=>{
 const headers=['Question','Strongly agree (%)','Somewhat agree (%)','Neither agree nor disagree (%)','Somewhat disagree (%)','Strongly disagree (%)'];
 assert.equal(V.completeResponses(V.profile(headers,[['Q1',20,30,10,20,20]])).length,5);
 assert.equal(V.completeResponses(V.profile(headers,[['Q1',20,30,'X',20,20]])),null);
 assert.equal(V.completeResponses(V.profile(headers,[['Q1',20,30,0,20,20]])),null);
 assert.equal(V.completeResponses(V.profile(['Group','POSITIVE','NEGATIVE'],[['Black',60,20]])),null);
 assert.equal(V.completeResponses(V.profile(['Group','ANSWER1','ANSWER2','ANSWER3','ANSWER4','ANSWER5'],[['Black',20,20,20,20,20]])),null,'response codes alone do not establish a common response distribution');
});

test('source metadata, original cell strings and spreadsheet-safe exports survive chart preparation',()=>{
 const rows=[['=HYPERLINK("bad")','0%','X'],['Personne','12,5 %','9999']];
 const p=V.profile(['Groupe','Résultat publié','Réponses arrondies'],rows,{lang:'fr',sources:'https://example.org/source'});
 assert.deepEqual(p.sources,[{url:'https://example.org/source',label:'https://example.org/source'}]);
 assert.deepEqual(V.points(p,{measure:1}).rows.map(r=>r.raw),rows);
 const csv=V.csvText(p.headers,p.rows);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('"X"'));assert.ok(csv.includes('"9999"'));assert.ok(csv.includes('"12,5 %"'));
});


test('raw source categories skip constant employers and repeated labels require explicit filtering',()=>{
 const p=V.profile(['Department','Group (English)','Group (French)','Question','Published result (%)'],[['Health Canada','Black','Personnes noires','Q12',20],['Health Canada','Black','Personnes noires','Q42',30],['Health Canada','Woman','Femmes','Q12',40]]);
 assert.equal(V.defaultDimension(p),1);
 assert.equal(V.points(p,{x:1,measure:4,limit:1}).uniqueCategories,false,'row limits must not conceal duplicates elsewhere in the matching data');
 assert.equal(V.points(p,{x:1,measure:4,filters:{3:'Q12'}}).uniqueCategories,true);
 assert.equal(V.missingLabel('X'),'Suppressed');assert.equal(V.missingLabel('9999','fr'),'Sans objet');assert.equal(V.missingLabel('No formal benchmark in this source'),'No formal benchmark in this source');
});

test('a table can ask for a starting chart, and only values that fit the table are kept',()=>{
 const rows=[['Branch A','Racialized',91,9,175],['Branch A','Non-racialized',94,6,445],['Branch B','Racialized','Unavailable','Unavailable','Unavailable'],['Branch B','Non-racialized',91,9,25]];
 const p=V.profile(['Branch','Employee group','Most positive (%)','Most negative (%)','Answer count'],rows,{chart:{kind:'heatmap',x:0,column:1,measure:3,limit:100}});
 assert.deepEqual(p.chart,{kind:'heatmap',x:0,column:1,measure:3,limit:100});
 assert.deepEqual(p.dimensions.map(d=>d.index),[0,1]);
 assert.ok(p.metrics.some(m=>m.index===3));
 const pts=V.points(p,{x:0,measure:3,limit:100});
 assert.equal(pts.uniqueCategories,false,'two groups per branch need heatmap columns');
 const grid=V.pivot(p,pts,1);
 assert.deepEqual(grid.labels,['Branch A','Branch B']);assert.deepEqual(grid.columns,['Racialized','Non-racialized']);
 assert.equal(V.numeric(grid.cells.get(JSON.stringify(['Branch B','Racialized'])).raw[3]),null,'an unavailable cell is never plotted as zero');
 assert.equal(V.profile(['A','B (%)'],[['x',1]]).chart,null);
});


test('chart families classify related views without combining source rows',()=>{
 assert.equal(V.chartFamily('Workforce representation'), 'representation');
 assert.equal(V.chartFamily('Représentation des cadres'), 'executives');
 assert.equal(V.chartFamily('Mesures d’adaptation au travail'), 'accommodation');
 assert.equal(V.chartFamily('Harassment and discrimination'), 'harassment');
 assert.equal(V.chartFamily('Hiring and advancement'), 'career');
 assert.equal(V.chartFamily('Organizational units'), 'branches');
 assert.equal(V.chartFamily('Plans and reported results'), 'accountability');
 const a=V.profile(['Group','Published result (%)'],[['A','X'],['B','0%']]);
 const b=V.profile(['Group','Published result (%)'],[['A','99%']]);
 assert.deepEqual(V.points(a).rows.map(x=>x.values[0]),[null,0]);
 assert.deepEqual(V.points(b).rows.map(x=>x.values[0]),[99]);
});
