import puppeteer from 'puppeteer-core';
import {readFile} from 'node:fs/promises';

const contentScript = await readFile(new URL('../content/content.js',import.meta.url),'utf8');

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
try {
  for (const id of ['11801878', '15948785']) {
    const page = await browser.newPage();
    await page.setViewport({width:1440,height:1000});
    try {
      await page.goto(`https://www.digikala.com/product/dkp-${id}/`, {waitUntil:'domcontentloaded',timeout:25000});
      await page.waitForSelector('h1', {timeout:15000});
      await page.evaluate(()=>{
        window.detected=[];
        window.chrome={runtime:{sendMessage(message){window.detected.push(message);},getManifest(){return {name:'PIQO DEV'};},getURL(){return 'about:blank';},onMessage:{addListener(){}}},storage:{local:{get(_key,callback){callback({});},set(){}}}};
      });
      await page.addScriptTag({content:contentScript});
      await page.waitForFunction(()=>window.detected.some(message=>message.product?.price>0),{timeout:8000});
      const report = await page.evaluate(() => ({
        title:document.title,
        h1:document.querySelector('h1')?.textContent,
        extracted:window.detected.filter(message=>message.product).at(-1)?.product,
        displayed:[...document.querySelectorAll('[data-testid="price-final"]')].map(el=>({value:el.textContent,unitIcon:el.parentElement?.querySelector('dds-icon')?.getAttribute('name')})),
      }));
      console.log(JSON.stringify({id,report}));
    } catch (error) { console.log(JSON.stringify({id,error:error.message})); }
    finally { await page.close(); }
  }
} finally { await browser.close(); }
