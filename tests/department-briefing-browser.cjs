// Briefing notes on organization pages repeat the guide's published figures and sources.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.gz':'application/gzip','.b64':'text/plain'};
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://x').pathname));if(!f.startsWith(root)){res.writeHead(403);return res.end();}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';const browser=await chromium.launch({headless:true});
try{for(const [l,topicLabel,kind] of [['en','experience','txt'],['fr','experience','doc'],['en','workforce','txt']]){
 const ctx=await browser.newContext({acceptDownloads:true}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'agriculture-and-agri-food-canada/?lang='+l+'&group=Woman');
 const guide=page.locator('.dp-guide:visible').first();
 await guide.locator('[data-guide-topic="'+topicLabel+'"]').click();
 await guide.locator('[data-guide-brief="'+kind+'"]').waitFor({timeout:60000});
 const shown=await guide.locator('.dp-guide-answer tbody tr').allTextContents();
 const [dl]=await Promise.all([page.waitForEvent('download'),guide.locator('[data-guide-brief="'+kind+'"]').click()]);
 const text=fs.readFileSync(await dl.path(),'utf8');
 assert.match(dl.suggestedFilename(),new RegExp('\\.'+kind+'$'));
 assert.match(text,l==='fr'?/NOTE DE BREFFAGE/:/BRIEFING NOTE/);
 assert.match(text,l==='fr'?/Agriculture et Agroalimentaire Canada/:/Agriculture and Agri-Food Canada/);
 assert.match(text,l==='fr'?/SOURCES/:/SOURCES/);
 assert.ok(shown.length>0,'guide shows figures');
 const plain=text.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&');
 for(const row of await guide.locator('.dp-guide-answer tbody tr th').allTextContents())assert.ok(plain.includes(row.trim()),'measure repeated: '+row);
 assert.ok(await page.locator('.dp-trend:visible').count()>0,'results over time shown');
 if(topicLabel==='workforce')assert.ok(await guide.locator('.gce-source-date').count()>0,'source date shown under the table');
 assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS briefing note',l,topicLabel,kind,shown.length,'rows');await ctx.close();}
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exit(1);});
