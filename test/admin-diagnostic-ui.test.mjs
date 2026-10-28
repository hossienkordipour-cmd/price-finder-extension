import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import puppeteer from 'puppeteer-core';

// Isolated fixture UI: never writes telemetry or sessions into the user's database.
const root=resolve(process.env.PIQO_BACKEND_DIR||'C:/Users/User/Documents/Codex/piqo-api','admin/dist');
const error={event_name:'request_finished',source:'affilio',status:'http_error',http_status:503,error_code:'AFFILIO_NOT_CONFIGURED',build_channel:'dev',target_environment:'production',operation:'piqo_search',occurred_at:new Date().toISOString()};
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Cache-Control','no-store');
 if(path.startsWith('/v1/admin/')) {
  res.setHeader('Content-Type','application/json');
  let body;
  if(path.endsWith('/session')) body={csrf:'fixture-only',runtime_environment:'development'};
  else if(path.endsWith('/overview')) body={summary:{},sources:[{source:'affilio',samples:1,errors:1,last_received:new Date().toISOString(),last_error:error}]};
  else if(path.endsWith('/searches')) body={items:[{search_id:'fixture',extension_version:'1.1.0',build_channel:'dev',requests:1,outcome:'failed'}]};
  else if(path.endsWith('/searches/fixture')) body={events:[error,{...error,error_code:undefined,build_channel:undefined,target_environment:undefined,operation:undefined}]};
  else {res.statusCode=404;body={};}
  res.end(JSON.stringify(body));return;
 }
 const file=path.startsWith('/assets/')?resolve(root,'.'+path):resolve(root,'index.html');
 if(!file.startsWith(root+sep)){res.statusCode=404;res.end();return;}
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'}[extname(file)])||'text/html');res.end(await readFile(file));}
 catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:'+server.address().port;
 const qa=resolve('dist/qa');await mkdir(qa,{recursive:true});
 for(const width of [1440,375]){
  await page.setViewport({width,height:960});
  await page.goto(base+'/searches',{waitUntil:'networkidle0'});
  await page.waitForSelector('.table-wrap button');await page.click('.table-wrap button');
  await page.waitForSelector('.request-detail summary');
  const content=await page.$eval('main.dashboard',el=>el.textContent);
  assert.ok(content.includes('HTTP 503'));assert.ok(content.includes('AFFILIO_NOT_CONFIGURED'));
  assert.ok(content.includes('API اصلی پیکو'));assert.ok(content.includes('نوع ساخت نامشخص'));
  await page.click('.request-detail summary');
  assert.equal(await page.$eval('.request-detail details',el=>el.open),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Table overflow must stay inside its scroll container');
  await page.screenshot({path:resolve(qa,`admin-errors-${width}.png`),fullPage:true});
  await page.goto(base+'/sources',{waitUntil:'networkidle0'});
  assert.ok((await page.$eval('main.dashboard',el=>el.textContent)).includes('AFFILIO_NOT_CONFIGURED'));
 }
 assert.deepEqual(errors,[]);
 console.log('Admin diagnostic UI: desktop/mobile, known/legacy errors, environment labels, expandable guidance, contained overflow and no page errors passed');
} finally {await browser?.close();await new Promise(r=>server.close(r));}
