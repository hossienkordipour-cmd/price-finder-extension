import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import puppeteer from 'puppeteer-core';
const root=resolve(process.env.PIQO_BACKEND_DIR||'C:/Users/User/Documents/Codex/piqo-api','admin/dist');
let fail=false;const queries=[];
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
 if(url.pathname.startsWith('/v1/admin/')){
  res.setHeader('Content-Type','application/json');
  if(url.pathname.endsWith('/session'))res.end(JSON.stringify({csrf:'test',runtime_environment:'development'}));
  else if(url.pathname.endsWith('/usage')){queries.push(url.search);if(fail){res.statusCode=503;res.end('{}');return;}res.end(JSON.stringify({active_sessions:3,generated_at:new Date().toISOString(),total_searches:4,classified_searches:2,categories:[{category:'phone',searches:2,share:.5},{category:'unknown',searches:2,share:.5}],trend:[{period:'2026-10-25',searches:1},{period:'2026-10-26',searches:3}]}));}
  else{res.statusCode=404;res.end('{}');}return;
 }
 const file=url.pathname.startsWith('/assets/')||url.pathname.startsWith('/fonts/')?resolve(root,'.'+url.pathname):resolve(root,'index.html');
 if(!file.startsWith(root+sep)){res.statusCode=404;res.end();return;}
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[extname(file)])||'text/html');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('dist/qa',{recursive:true});
 for(const width of [1440,375]){
  fail=false;await page.setViewport({width,height:960});await page.goto('http://127.0.0.1:'+server.address().port+'/usage',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('progress');assert.equal(await page.$eval('.metric',e=>e.textContent),'۳');
  assert.equal((await page.$$('progress')).length,2);assert.ok((await page.$eval('main',e=>e.textContent)).includes('نامشخص'));
  const selects=await page.$$('select');await selects[2].select('week');await page.waitForFunction(()=>document.querySelector('main')?.textContent.includes('روند هفتگی'));
  await page.waitForSelector('progress');assert.ok(queries.some(q=>q.includes('bucket=week')));
  await page.evaluate(()=>{const label=document.createElement('p');label.textContent='دادهٔ آزمایشی — فقط تست';document.querySelector('main').prepend(label);});
  await page.evaluate(()=>document.fonts.ready);

  await page.screenshot({path:resolve('dist/qa',`usage-${width}.png`),fullPage:true});
  const bounds=await page.$eval('h1',e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}));assert.ok(bounds.left>=0&&bounds.right<=width+1,'Heading stays inside viewport');
  fail=true;await page.click('.page-heading button');await page.waitForSelector('[role=alert]');
  // Refresh clears the stale response rather than presenting it as live.
  assert.equal(await page.$('.metric'),null);
 }
 assert.deepEqual(errors,[]);console.log('Usage UI: desktop/mobile, category shares, weekly filter, chart/table, failure state and no page errors passed');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
