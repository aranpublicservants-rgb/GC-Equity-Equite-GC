// Automated WCAG 2.1 A and AA checks (axe-core) on every published page, in English on a
// desktop and in French on a phone. Writes a JSON report; exits 1 if a page has violations
// of a rule not listed in the accepted baseline file given as the second argument.
// Usage: node tests/site-accessibility-browser.cjs <report.json> [baseline.json]
const {chromium,devices}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),prefix='/GC-Equity-Equite-GC/';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.csv':'text/csv','.gz':'application/gzip','.svg':'image/svg+xml','.png':'image/png','.b64':'text/plain'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://x');if(!u.pathname.startsWith(prefix)){res.writeHead(404);return res.end();}let f=path.resolve(root,decodeURIComponent(u.pathname.slice(prefix.length)));if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(b);});});
const pages=execSync('git ls-files "*.html"',{cwd:root}).toString().split('\n').filter(p=>p&&!/^(archive-source|lib|vendor|tests)\//.test(p)).filter(p=>{const s=fs.readFileSync(path.join(root,p),'utf8');return !/http-equiv=["']?refresh/i.test(s)&&!(s.length<4000&&/location\.replace\(/.test(s))&&!/^racialized-executives\//.test(p);}).filter(p=>!process.env.A11Y_ONLY||process.env.A11Y_ONLY.split(',').includes(p));
const axeSource=fs.readFileSync(require.resolve('axe-core'),'utf8');
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+prefix;const browser=await chromium.launch({headless:true});const report={};
 const modes=[['en',{viewport:{width:1280,height:900}}],['fr',{...devices['Pixel 5']}]];
 for(const [lang,opts] of modes){const ctx=await browser.newContext(opts);let i=0;
  async function worker(){const page=await ctx.newPage();while(i<pages.length){const p=pages[i++];const url=base+p.replace(/index\.html$/,'')+'?lang='+lang;
   try{await page.goto(url,{waitUntil:'load',timeout:60000});await page.waitForTimeout(800);await page.evaluate(axeSource);
    const v=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']})).violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length,target:x.nodes[0]?.target?.join(' ')})));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+3);
    if(v.length||overflow)report[p+' '+lang]={violations:v,overflow};
   }catch(e){report[p+' '+lang]={error:String(e.message).slice(0,200)};}}
   await page.close();}
  await Promise.all([worker(),worker(),worker(),worker()]);await ctx.close();console.log('done',lang);}
 await browser.close();server.close();
 fs.writeFileSync(process.argv[2]||'a11y-report.json',JSON.stringify(report,null,1));
 const rules={};for(const r of Object.values(report))for(const v of r.violations||[])rules[v.id]=(rules[v.id]||0)+1;
 const overflow=Object.entries(report).filter(([,r])=>r.overflow).map(([k])=>k),errors=Object.entries(report).filter(([,r])=>r.error).map(([k])=>k);
 console.log('PAGES',pages.length,'x 2 modes; rules',JSON.stringify(rules),'overflow',overflow.length,'load errors',errors.length);
 const baseline=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3],'utf8')):{rules:[],overflow:[]};
 const newRules=Object.keys(rules).filter(r=>!baseline.rules.includes(r)),newOverflow=overflow.filter(k=>!baseline.overflow.includes(k));
 if(newRules.length||newOverflow.length||errors.length){console.log('NEW PROBLEMS',JSON.stringify({newRules,newOverflow,errors}));process.exit(1);}
})().catch(e=>{console.error(e);server.close();process.exit(1);});
