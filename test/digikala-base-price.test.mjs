import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import puppeteer from 'puppeteer-core';

const content = process.argv.includes('--baseline') ? execFileSync('git',['show','HEAD:content/content.js'],{encoding:'utf8'}) : await readFile(new URL('../content/content.js',import.meta.url),'utf8');
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'),headless:true});
const fixture = `<!doctype html><meta charset="utf-8"><h1 data-testid="pdp-title">هدفون Anker R50i A3949</h1>
<section><span data-testid="price-final">۴۰۵,۹۰۰</span><dds-icon name="value-toman"></dds-icon><p>بیمه</p></section>
<article id="selected-offer"><span class="line-through" data-testid="price-no-discount">۴,۵۴۵,۲۰۰</span>
<div><span data-testid="price-final"><div>۳,۰۰۳,۱۰۰</div></span><dds-icon name="value-toman"></dds-icon></div>
<div><button data-testid="add-to-cart" data-cro-id="pdp-add-to-cart" data-add-to-cart-variant-id="selected">افزودن به سبد خرید</button></div></article>
<article><span data-testid="price-final">۲,۸۵۹,۰۰۰</span><dds-icon name="value-toman"></dds-icon><button data-testid="add-to-cart">افزودن به سبد خرید</button></article>
<p>قسط ماهانه <span>۵۰,۰۰۰ تومان</span></p>`;

try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',request=>request.isNavigationRequest()?request.respond({status:200,contentType:'text/html',body:fixture}):request.abort());
  await page.goto('https://www.digikala.com/product/dkp-11801878/');
  await page.evaluate(()=>{
    window.detected=[];
    window.chrome={runtime:{sendMessage(message){window.detected.push(message);},getManifest(){return {name:'PIQO DEV'};},getURL(){return 'about:blank';},onMessage:{addListener(){}}},storage:{local:{get(_key,callback){callback({});},set(){}}}};
  });
  await page.addScriptTag({content});
  await page.waitForFunction(()=>window.detected.some(m=>m.type==='PRODUCT_DETECTED'));
  assert.equal(await page.evaluate(()=>window.detected.at(-1).product.price),3_003_100,'read current selling price with toman icon, not insurance, installments or another seller');
  await page.evaluate(()=>{document.querySelector('#selected-offer [data-testid="price-final"]').textContent='۲,۹۲۷,۱۰۰';});
  await page.waitForFunction(()=>window.detected.at(-1).product.price===2_927_100,{timeout:3000});
  console.log('PASS: same-URL selection price updates');
  await page.evaluate(()=>{document.querySelector('#selected-offer [data-testid="price-final"]').remove();});
  await page.waitForFunction(()=>window.detected.at(-1).product.price===null,{timeout:3000});
  console.log('PASS: unknown selected price remains unknown despite other prices');
  await page.evaluate(()=>{
    const price=document.createElement('span'); price.dataset.testid='price-final'; price.textContent='۳۰,۰۳۱,۰۰۰';
    const container=document.createElement('div'); container.append(price); container.append(document.createTextNode('ریال'));
    document.querySelector('#selected-offer').prepend(container);
  });
  await page.waitForFunction(()=>window.detected.at(-1).product.price===3_003_100,{timeout:3000});
  console.log('PASS: explicit rial converted once');
  await page.evaluate(()=>{document.querySelector('[data-cro-id="pdp-add-to-cart"]').disabled=true;});
  await page.waitForFunction(()=>window.detected.at(-1).product.price===null,{timeout:3000});
  console.log('PASS: unavailable offer cannot use another seller price');

  await page.evaluate(()=>{
    const offer=document.querySelector('#selected-offer');
    offer.innerHTML=`<div><dds-price-group>
      <dds-price slot="original-price" unit="toman" variant="original">۹,۰۰۰,۰۰۰</dds-price>
      <dds-price slot="price" unit="toman" variant="price">۸,۱۰۰,۰۰۰</dds-price>
    </dds-price-group><div><button data-testid="add-to-cart" data-cro-id="pdp-add-to-cart" data-add-to-cart-variant-id="dds-selected">خرید</button></div></div>
    <section>ارسال <dds-price slot="price" unit="toman" variant="price">۲۷۰,۰۰۰</dds-price></section>`;
  });
  await page.waitForFunction(()=>window.detected.at(-1).product.price===8_100_000,{timeout:3000});
  assert.equal(await page.evaluate(()=>window.detected.at(-1).product.variantId),'dds-selected');
  console.log('PASS: DDS selected price excludes shipping, original and unrelated prices');
  await page.evaluate(()=>{
    const price=document.querySelector('#selected-offer dds-price[slot="price"]');
    price.setAttribute('unit','rial'); price.textContent='۸۰,۰۰۰,۰۰۰';
  });
  await page.waitForFunction(()=>window.detected.at(-1).product.price===8_000_000,{timeout:3000});
  await page.evaluate(()=>{document.querySelector('#selected-offer [data-cro-id="pdp-add-to-cart"]').disabled=true;});
  await page.waitForFunction(()=>window.detected.at(-1).product.price===null,{timeout:3000});
  console.log('PASS: DDS rial conversion and unavailable selected offer');

  await page.evaluate(()=>{
    const button=document.querySelector('#selected-offer [data-cro-id="pdp-add-to-cart"]');
    button.disabled=false;
    button.setAttribute('data-add-to-cart-variant-id','new-color');
    const price=document.querySelector('#selected-offer dds-price[slot="price"]');
    price.setAttribute('unit','toman'); price.textContent='۲,۷۵۰,۰۰۰';
  });
  await page.waitForFunction(()=>window.detected.at(-1).product.price===2_750_000 && window.detected.at(-1).product.variantId==='new-color',{timeout:3000});
  console.log('PASS: DDS variant change refreshes price and variant on same URL');
  await page.evaluate(()=>document.querySelector('#selected-offer dds-price[slot="price"]').remove());
  await page.waitForFunction(()=>window.detected.at(-1).product.price===null,{timeout:3000});
  console.log('PASS: missing DDS selling price cannot become shipping price');

  const panel=await browser.newPage();
  const panelHtml=await readFile(new URL('../sidebar/sidebar.html',import.meta.url),'utf8');
  const panelScript=await readFile(new URL('../sidebar/sidebar.js',import.meta.url),'utf8');
  await panel.setRequestInterception(true);
  panel.on('request',request=>request.abort());
  await panel.setContent(panelHtml.replace(/<script[\s\S]*?<\/script>/g,''));
  await panel.evaluate(()=>{
    window.chrome={runtime:{onMessage:{addListener(listener){window.onPiqoMessage=listener;}},sendMessage(message,callback){
      if(message.type==='GET_TAB_STATE')callback({tabId:1,state:{requestId:1,currentProduct:{name:'R50i',store:'دیجی‌کالا',price:null},searchResults:[]}});
    }}};
  });
  await panel.addScriptTag({content:panelScript});
  assert.ok((await panel.$eval('#current-product',el=>el.textContent)).includes('قیمت نامشخص'));
  await panel.evaluate(()=>window.onPiqoMessage({type:'PRODUCT_METADATA_UPDATED',tabId:1,requestId:1,product:{name:'R50i',store:'دیجی‌کالا',price:3003100}}));
  assert.ok((await panel.$eval('#current-product',el=>el.textContent)).includes((3003100).toLocaleString('fa-IR')));
  await panel.evaluate(()=>window.onPiqoMessage({type:'PRODUCT_METADATA_UPDATED',tabId:1,requestId:1,product:{name:'R50i',store:'دیجی‌کالا',price:null}}));
  assert.ok((await panel.$eval('#current-product',el=>el.textContent)).includes('قیمت نامشخص'));
  console.log('PASS: panel reflects updated and unknown base price');
} finally { await browser.close(); }
