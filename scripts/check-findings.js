// Check that each finding on the Call to Action page states the same figures in English and French, that its evidence
// sentences match its level, and that it names a source defined on the page. Run by scripts/check-site.py.
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
if(process.argv.includes('--json')){process.stdout.write(JSON.stringify(FINDINGS));process.exit(0);}
// Numbers are compared after each language's own format is normalized: English uses a comma between thousands and a
// decimal point; French uses a space between thousands, a decimal comma and full years (2022-2023).
const nums=(s,lang)=>{
 s=lang==='en'?s.replace(/(\d),(?=\d{3}(?!\d))/g,'$1'):s.replace(/(\d)[ \u00a0\u202f](?=\d{3}(?!\d))/g,'$1').replace(/(\d),(\d)/g,'$1.$2').replace(/(\d{4})-\d{2}(\d{2})\b/g,'$1-$2');
 return (s.match(/\d+(\.\d+)?/g)||[]).sort().join(' ');
};
const LEVEL_FR={strong:'élevé',moderate:'moyen',limited:'faible'};
let problems=[];
FINDINGS.forEach((f,i)=>{
 ['t','b','e'].forEach(k=>{const en=nums(f[k][0],'en'),fr=nums(f[k][1],'fr');if(en!==fr)problems.push('conclusion '+(i+1)+' '+k+': English '+en+' / French '+fr);});
 if(!['strong','moderate','limited'].includes(f.level))problems.push('conclusion '+(i+1)+': unknown evidence level');
 if(!f.src.length||f.src.some(s=>!SRC[s]))problems.push('conclusion '+(i+1)+': unknown source');
 if(!f.e[0].startsWith('The evidence is '+f.level))problems.push('conclusion '+(i+1)+': evidence sentence does not match its level');
 if(!f.e[1].startsWith('Le niveau de preuve est '+LEVEL_FR[f.level]))problems.push('conclusion '+(i+1)+': French evidence sentence does not match its level');
 if(/\u2014/.test(f.t.join('')+f.b.join('')+f.e.join('')))problems.push('conclusion '+(i+1)+': em dash');
});
if(problems.length){console.error(problems.join('\n'));process.exit(1);}
console.log('PASS: '+FINDINGS.length+' Call to Action findings state the same figures in English and French');
