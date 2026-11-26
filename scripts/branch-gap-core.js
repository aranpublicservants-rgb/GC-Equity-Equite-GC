/* Q65 comparisons, using only published affirmative responses in the branch extract. */
function q65Groups(meta){
 const by=new Map();
 for(const [i,d] of meta.demographics.entries()){
  const rank=Number(String(d.code).match(/=\s*(\d+)\s*$/)?.[1]);
  if(![1,2].includes(rank))continue;
  if(!by.has(d.category))by.set(d.category,[]);
  by.get(d.category).push({i,rank,en:d.en.trim(),fr:d.fr.trim(),code:d.code});
 }
 return [...by.entries()].sort((a,b)=>a[0].localeCompare(b[0],'en')).map(([key,members])=>{
  members.sort((a,b)=>a.rank-b.rank);if(members.length!==2||members[0].rank!==1||members[1].rank!==2)throw Error('Invalid comparison category: '+key);
  return {key,members};
 });
}
function buildQ65Organization(slug,record,meta,rows){
 if(!Array.isArray(rows)||rows.length!==record.count)throw Error('Unexpected branch extract size for '+slug);
 const q=meta.questions.findIndex(x=>x.id==='Q65'),a=3+meta.schema.indexOf('AGREE'),yes=3+meta.schema.indexOf('ANS1'),n=3+meta.schema.indexOf('ANSCOUNT');
 if(q<0||a<3||yes<3||n<3)throw Error('Q65 schema missing');
 const pct=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=100?Number(x):null;
 const count=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isSafeInteger(Number(x))&&Number(x)>=0&&Number(x)!==9999?Number(x):null;
 const branches=new Set(record.branches.map(b=>String(b.id))),lookup=new Map();
 for(const row of rows){if(Number(row[2])!==q)continue;const id=String(row[0]),g=Number(row[1]);if(!branches.has(id)||!meta.demographics[g])throw Error('Unexpected branch or group in '+slug);
  const v=pct(row[a]),check=pct(row[yes]);if(v!==null&&check!==null&&v!==check)throw Error('Q65 affirmative and Yes disagree in '+slug);
  const key=id+'|'+g;if(lookup.has(key))throw Error('Duplicate Q65 cell in '+slug);
  lookup.set(key,{v,n:count(row[n])});
 }
 const groups=q65Groups(meta),result=[];
 for(const id of branches)for(const group of groups){
  const x=lookup.get(id+'|'+group.members[0].i),y=lookup.get(id+'|'+group.members[1].i);
  if(x?.v==null||y?.v==null)continue;
  result.push([id,group.key,x.v,y.v,x.n,y.n,Math.round((x.v-y.v)*100)/100]);
 }
 return {slug,sourceId:String(record.id),branches:branches.size,possible:branches.size*groups.length,rows:result};
}
