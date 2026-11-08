// Check that each conclusion on the Call to Action page states the same figures in English and French, and that each
// conclusion names a source defined on the page. Run by scripts/check-site.py.
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','call-to-action.js'),'utf8');
function block(name){
 const start=src.indexOf('const '+name+'=');
 if(start<0)throw new Error(name+' not found in call-to-action.js');
 const eq=src.indexOf('=',start),close=src[eq+1]==='['?']':'}';
 const end=src.indexOf('\n'+close+';',eq);
 if(end<0)throw new Error(name+' is not closed in call-to-action.js');
 return src.slice(eq+1,end+2);
}
const NB=' ';
const FINDINGS=eval('('+block('FINDINGS')+')');
const SRC=eval('('+block('SRC')+')');
// Normalize French number formats (decimal comma, spaces between thousands, 2022-2023) to compare with English.
const nums=s=>(s.replace(/(\d)[  ,](?=\d{3}(?!\d))/g,'$1').replace(/(\d),(\d)/g,'$1.$2').replace(/(\d{4})-\d{2}(\d{2})\b/g,'$1-$2').match(/\d+(\.\d+)?/g)||[]).sort().join(' ');
let problems=[];
FINDINGS.forEach((f,i)=>{
 ['t','b','e'].forEach(k=>{if(nums(f[k][0])!==nums(f[k][1]))problems.push('conclusion '+(i+1)+' '+k+': English '+nums(f[k][0])+' / French '+nums(f[k][1]));});
 if(!['strong','moderate','limited'].includes(f.level))problems.push('conclusion '+(i+1)+': unknown evidence level');
 if(!f.src.length||f.src.some(s=>!SRC[s]))problems.push('conclusion '+(i+1)+': unknown source');
 if(!f.e[0].startsWith('The evidence is '+f.level))problems.push('conclusion '+(i+1)+': evidence sentence does not match its level');
});
if(problems.length){console.error(problems.join('\n'));process.exit(1);}
console.log('PASS: '+FINDINGS.length+' Call to Action conclusions state the same figures in English and French');
