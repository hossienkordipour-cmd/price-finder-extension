import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
let html = await readFile(new URL('../sidebar/sidebar.html', import.meta.url), 'utf8');
for (const asset of ['primary-logo.png','assets/logo-character.png']) {
  html=html.replace(`src="${asset}"`,`src="data:image/png;base64,${(await readFile(new URL('../sidebar/'+asset,import.meta.url))).toString('base64')}"`);
}
let css = await readFile(new URL('../sidebar/sidebar.css', import.meta.url), 'utf8');
for (const font of ['Regular','SemiBold','Bold','ExtraBold']) {
  const asset=`YekanBakhFaNum-${font}.woff2`;
  css=css.replace(`url('${asset}')`,`url('data:font/woff2;base64,${(await readFile(new URL('../sidebar/'+asset,import.meta.url))).toString('base64')}')`);
}
if (process.argv.includes('--without-fix')) css += '\n.header { position: static !important; }';
const script = await readFile(new URL('../sidebar/sidebar.js', import.meta.url), 'utf8');
const closeHandler = script.slice(script.indexOf('document.getElementById("popup-close-btn").addEventListener'),script.indexOf('\ndocument.getElementById("manual-search-form")'));
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  for (const height of [800,400]) for (const grid of [false,true]) {
    const page = await browser.newPage();
    await page.setViewport({width:420,height});
    await page.setRequestInterception(true); page.on('request',request=>request.abort());
    await page.setContent('<iframe id="panel" style="position:fixed;right:8px;top:8px;width:380px;height:calc(100vh - 16px);border:0"></iframe>');
    await page.evaluate(()=>window.addEventListener('message',event=>{if(event.data==='CLOSE_PIQO_POPUP')document.querySelector('#panel').remove();}));
    await page.$eval('#panel',(el,markup)=>el.srcdoc=markup,html.replace('<link rel="stylesheet" href="sidebar.css" />',`<style>${css}</style>`).replace('<script src="sidebar.js"></script>',''));
    const frame = await (await page.$('#panel')).contentFrame();
    await frame.waitForSelector('.header');
    await frame.evaluate(()=>document.fonts.ready);
    await frame.evaluate(grid=>{
      document.querySelector('#empty-state').classList.add('hidden');
      document.querySelector('#results-state').classList.remove('hidden');
      const list=document.querySelector('#results-list');
      list.classList.toggle('grid-view',grid);
      list.innerHTML=Array.from({length:30},(_,i)=>`<a class="result-card" href="#"><div class="card-image-wrapper"></div><div class="card-content"><div class="card-title">محصول آزمایشی ${i+1}</div><div class="card-store">فروشگاه</div><div class="card-price">۳۰۰٬۰۰۰</div></div></a>`).join('');
    },grid);
    await frame.addScriptTag({content:closeHandler});
    for (const distance of [600,100000]) {
      await frame.evaluate(y=>window.scrollTo(0,y),distance);
      await frame.waitForFunction(()=>window.scrollY>0);
      const report=await frame.evaluate(()=>{
        const el=document.querySelector('#popup-close-btn'),rect=el.getBoundingClientRect();
        return {top:rect.top,bottom:rect.bottom,height:innerHeight,hit:el.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)),overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.ok(report.top>=0&&report.bottom<=report.height,`Close visible at height ${height}, grid ${grid}: ${JSON.stringify(report)}`);
      assert.equal(report.hit,true,'Results must not cover the close button');
      assert.equal(report.overflow,false,'No horizontal overflow');
      assert.equal(await frame.$eval('.header-logo',el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true,'Logo stays in viewport');
    }
    if (process.argv.includes('--screenshot') && height===800 && !grid) {
      const path=join(tmpdir(),'piqo-r07-sticky-header.png');
      await (await page.$('#panel')).screenshot({path});
      console.log('Screenshot: '+path);
    }
    if (grid) {
      await frame.focus('#popup-close-btn');
      await page.keyboard.press('Enter');
    } else await frame.click('#popup-close-btn');
    await page.waitForFunction(()=>!document.querySelector('#panel'));
    await page.close();
  }
  console.log('R07 header stays visible and close works after scrolling: list/grid, tall/short iframe');
} finally { await browser.close(); }
