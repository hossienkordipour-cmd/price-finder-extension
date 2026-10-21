import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
const source=await readFile(new URL('../content/content.js',import.meta.url),'utf8');
const start=source.indexOf('function togglePiqoPopup(');
const end=source.indexOf('// Listen for close request', start);
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || (process.platform==='darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'),headless:true});
try {
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>req.respond({status:200,contentType:'text/html',body:req.url().endsWith('/panel') ? '<h1>PIQO panel loaded</h1>' : '<body></body>'}));
  await page.goto('https://fixture.test/');
  await page.evaluate(()=>{
    window.panelOpenMessages=[];
    window.chrome={runtime:{getURL:()=> 'https://fixture.test/panel',sendMessage:message=>{window.panelOpenMessages.push(message);return Promise.resolve();}}};
    // Reproduce external code adding empty srcdoc to the panel frame.
    const append=document.body.appendChild.bind(document.body);
    document.body.appendChild=node=>{if(node.tagName==='IFRAME') node.setAttribute('srcdoc',''); return append(node);};
  });
  await page.addScriptTag({content:source.slice(start,end)});
  await page.evaluate(()=>togglePiqoPopup(false));
  const loaded=()=>document.querySelector('iframe')?.contentDocument?.body?.textContent.includes('PIQO panel loaded');
  await page.waitForFunction(loaded,{timeout:3000});
  assert.equal(await page.$eval('iframe',e=>e.hasAttribute('srcdoc')),false);
  await page.$eval('iframe',e=>e.setAttribute('srcdoc',''));
  await page.waitForFunction(loaded,{timeout:3000});
  await page.evaluate(()=>{togglePiqoPopup(false); togglePiqoPopup(false);});
  assert.equal(await page.$eval('iframe',e=>e.style.opacity),'1');
  assert.equal(await page.$$eval('iframe',frames=>frames.length),1);
  assert.equal(await page.evaluate(()=>window.panelOpenMessages.filter(message=>message.type==='PIQO_OPENED').length),2);
  console.log('PASS: panel survives empty srcdoc on insertion and later mutation; close/reopen keeps one working frame');
} finally {await browser.close();}
