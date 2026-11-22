/* Shared source adapters — static files already present on GC Equity.
   No credentials, telemetry, data submissions or external APIs. */
(function(g){
"use strict";
const src=document.currentScript,base=new URL("../",src.src);
const path={
 registry:"assets/department-pages.json",
 rep:"data/tbs-departmental-representation-2017-2025.json",
 cta:"data/call-to-action-letters.json",
 pubs:"assets/department-publication-links.json",
 snps:"data/snps-2025-by-organization.json",
 psesIndex:"assets/department-profile-index.json",
 population:"data/open-canada-2026-11/tbs-fps-population-2010-2026/population-of-the-federal-public-service-by-department-or-agency-march-2026-en.csv",
 tenure:"data/open-canada-2026-11/tbs-fps-population-2010-2026/population-of-the-federal-public-service-by-department-and-tenure-march-2026-en.csv",
 province:"data/open-canada-2026-11/tbs-fps-population-2010-2026/population-of-the-federal-public-service-by-department-and-province-march-2026-en.csv",
 sex:"data/open-canada-2026-11/tbs-fps-population-2010-2026-suppression-aligned/population-of-the-federal-public-service-by-department-and-sex-march-2026-en.csv",
 age:"data/open-canada-2026-11/tbs-fps-population-2010-2026-suppression-aligned/population-of-the-federal-public-service-by-department-and-age-band-march-2026-en.csv"
};
const cache=new Map(),normalize=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[\u2019']/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const url=k=>new URL(path[k]||k,base).href;
const number=x=>x===null||x===undefined||String(x).trim()===""||/^(?:x|\*|-1|9999|n\/a|suppressed|—)$/i.test(String(x).trim())?null:Number.isFinite(Number(x))?Number(x):null;
function parseCSV(s){const lines=[],head=[],rows=[];let row=[],v="",quoted=false;for(let i=0;i<s.length;i++){const ch=s[i];if(quoted){if(ch==='"'&&s[i+1]==='"'){v+='"';i++}else if(ch==='"')quoted=false;else v+=ch;}else if(ch==='"')quoted=true;else if(ch===","){row.push(v);v=""}else if(ch==="\r"||ch==="\n"){if(ch==="\r"&&s[i+1]==="\n")i++;row.push(v);if(row.some(x=>x!==""))lines.push(row);row=[];v=""}else v+=ch;}if(row.length||v){row.push(v);lines.push(row)}const fields=(lines.shift()||[]).map(x=>x.replace(/^\ufeff/,"").trim());return lines.map(r=>Object.fromEntries(fields.map((k,j)=>[k,r[j]??""])))}
async function get(k){if(!cache.has(k)){const p=url(k);cache.set(k,fetch(p).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return p.toLowerCase().endsWith(".csv")?r.text().then(parseCSV):r.json()}).catch(ex=>{cache.delete(k);throw ex}))}return cache.get(k)}
const organizations=async()=>((await get("registry")).organizations||[]);
function aliases(o,reg){if(!o)return[];const alt=(reg?.identityAliases||[]).filter(v=>normalize(v.canonical)===normalize(o.en)).map(x=>x.alias);return [o.en,o.fr,o.id,...(o.aliases||[]),...alt].filter(Boolean).map(normalize)}
function matched(rows,o,key="Department or agency",reg){if(!o)return[];const match=new Set(aliases(o,reg));const exact=rows.filter(r=>r[key]===o.en);if(exact.length)return exact;return rows.filter(r=>match.has(normalize(r[key])))}
function find(data,o,reg){if(!data||!o)return null;const cols=Object.entries(data);const exact=cols.find(([k])=>k===o.en);if(exact)return exact[1];const matches=cols.filter(([k])=>aliases(o,reg).includes(normalize(k)));return matches.length===1?matches[0][1]:null}
async function profile(index,o,reg){if(!index||!o)return null;const found=find(index.organizations,o,reg);if(!found?.path)return null;const key=found.path;if(!cache.has(key)){cache.set(key,fetch(url(key)).then(async res=>{if(!res.ok)throw Error("HTTP "+res.status);const str=(await res.text()).trim();if(!("DecompressionStream" in window))throw Error("Browser lacks gzip decompression support");const bytes=Uint8Array.from(atob(str),c=>c.charCodeAt(0));const decoded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).json();if(!aliases(o,reg).includes(normalize(decoded.organization)))throw Error("Unexpected organization");return decoded}).catch(err=>{cache.delete(key);throw err}))}return cache.get(key)}
const format=(x,lang="en",max=1)=>number(x)===null?"—":number(x).toLocaleString(lang==="fr"?"fr-CA":"en-CA",{maximumFractionDigits:max});
const percent=(x,l="en")=>number(x)===null?"—":format(x,l,2)+" %";
const delta=(a,b)=>number(a)===null||number(b)===null?null:Math.round((a-b)*100)/100;
const pp=(a,l)=>a===null?"—":(a>0?"+":"")+format(a,l,2)+(l==="fr"?" points":" pp");
function save(filename,rows,asCsv=true){const content=asCsv?"\ufeff"+rows.map(r=>r.map(v=>{let s=String(v??"");if(/^\s*[=+@]/.test(s)||/^\s*-(?!\d+(?:[.,]\d+)?$)/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}).join(",")).join("\r\n"):String(rows);const link=document.createElement("a"),blob=new Blob([content],{type:asCsv?"text/csv;charset=utf-8":"text/plain;charset=utf-8"});const u=URL.createObjectURL(blob);link.href=u;link.download=filename;document.body.append(link);link.click();setTimeout(()=>{URL.revokeObjectURL(u);link.remove()},1500)}
g.GCEExtraData={get,url,path,parseCSV,number,format,percent,delta,pp,save,normalize,aliases,matched,find,organizations,profile};
})(window);