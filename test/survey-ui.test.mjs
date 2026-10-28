import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const html=await readFile(new URL('../sidebar/sidebar.html',import.meta.url),'utf8');
const section=html.slice(html.indexOf('<section id="piqo-survey"'),html.indexOf('</section>',html.indexOf('<section id="piqo-survey"'))+10);
const files={ '/survey.js':await readFile(new URL('../survey.js',import.meta.url),'utf8'),'/survey-ui.js':await readFile(new URL('../sidebar/survey-ui.js',import.meta.url),'utf8'),'/survey.css':await readFile(new URL('../sidebar/survey.css',import.meta.url),'utf8') };
const backendDirectory=process.env.PIQO_BACKEND_DIR||resolve(fileURLToPath(new URL('../',import.meta.url)),'../../Codex/piqo-api');
const backend=spawn(process.execPath,['--import','tsx','--input-type=module','--eval',`
 import {PGlite} from '@electric-sql/pglite';
 import {buildApp} from './src/app.ts';import {loadConfig} from './src/config.ts';
 const pg=new PGlite();await pg.waitReady;
 const app=await buildApp({config:loadConfig(),monitoringDb:{query:(s,p)=>pg.query(s,p),close:()=>pg.close()}});
 await app.listen({host:'127.0.0.1',port:0});
 console.log('PIQO_TEST_PORT:'+app.server.address().port);
`],{cwd:backendDirectory,env:{...process.env,NODE_ENV:'test',REDIS_URL:'',MONITORING_DATABASE_URL:'',MONITORING_LOCAL_DB:'',DIVAR_RELAY_URL:'',DIVAR_RELAY_TOKEN:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
const backendPort=await new Promise((resolve,reject)=>{
 let output='',error='';const timer=setTimeout(()=>{backend.kill();reject(new Error('Test API startup timed out'));},15000);
 backend.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/PIQO_TEST_PORT:(\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]));}});
 backend.stderr.on('data',chunk=>{error+=chunk;});
 backend.on('error',err=>{clearTimeout(timer);reject(err);});
 backend.on('exit',()=>{clearTimeout(timer);reject(new Error('Test API exited: '+error.slice(-1000)));});
});
const server=createServer((req,res)=>{
 if(req.url==='/host') {res.setHeader('Content-Type','text/html');res.end('<iframe src="/harness" style="display:none;width:390px;height:800px;border:0" title="test"></iframe>');return;}
 if(files[req.url]) {res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'text/javascript');res.end(files[req.url]);return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.end(`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/survey.css"><body style="font-family:Tahoma,sans-serif"><p>آزمون محلی — دادهٔ آزمایشی</p>${section}<script type="module">
 import {createSurvey} from '/survey.js';
 const store={piqoSurveyV1:{count:5,days:['2026-10-01','2026-10-02','2026-10-03']}};
 const wire=[];let offline=true;
 const survey=createSurvey({storage:{get:async k=>({[k]:store[k]}),set:async v=>Object.assign(store,v)},version:'1.1.0',endpoint:'http://127.0.0.1:${backendPort}/v1/surveys',fetcher:async(url,options)=>{wire.push(JSON.parse(options.body));if(offline){offline=false;throw new Error('offline');}return fetch(url,options);}});
 window.chrome={runtime:{sendMessage:async message=>message.type==='SURVEY_CLAIM'?{survey_id:await survey.claim()}:survey.submit(message.payload)}};
 window.test={store,wire};await import('/survey-ui.js');await window.piqoOfferSurvey();
 </script></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:390,height:844});
 await page.goto('http://127.0.0.1:'+server.address().port+'/host',{waitUntil:'domcontentloaded'});
 const frame=page.frames().find(f=>f.url().endsWith('/harness'));
 await frame.waitForFunction(()=>Boolean(window.test));
 assert.equal(await frame.evaluate(()=>window.test.store.piqoSurveyV1.invites),undefined,'A hidden iframe cannot consume an invitation');
 await page.$eval('iframe',el=>el.style.display='block');
 await frame.waitForFunction(()=>!document.getElementById('piqo-survey').hidden);
 await mkdir(new URL('../dist/qa/',import.meta.url),{recursive:true});
 await page.screenshot({path:new URL('../dist/qa/survey-harness.png',import.meta.url).pathname.replace(/^\/(?=[A-Z]:)/,'')});
 await frame.click('input[value=no]');await frame.type('#survey-reason','تست محلی — دادهٔ آزمایشی');
 await frame.click('button[type=submit]');
 await frame.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('تأیید نشد'));
 assert.equal(await frame.$eval('textarea',el=>el.readOnly),true);
 await frame.click('button[type=submit]');
 await frame.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('ثبت شد'));
 const result=await frame.evaluate(()=>window.test);
 assert.equal(result.store.piqoSurveyV1.answered,true);assert.deepEqual(result.wire[0],result.wire[1]);assert.equal(result.wire.length,2);
 assert.deepEqual(errors,[]);
 console.log('Survey UI -> isolated real API: eligible invitation, offline failure, frozen manual retry, durable success, Persian layout and no page errors passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));backend.kill();}
