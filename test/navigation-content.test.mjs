import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
const content=await readFile(new URL('../content/content.js',import.meta.url),'utf8');
const browser=await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
try {
  for(const [host,first,second] of [['etkala.ir','/products/1/','/products/2/'],['www.digikala.com','/product/dkp-1/','/product/dkp-2/'],['www.technolife.com','/product-1/','/product-2/'],['shop.example','/products/1/','/products/2/']]) {
    const page=await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request',req=>req.isNavigationRequest()?req.respond({status:200,contentType:'text/html',body:'<meta charset="utf-8"><h1>کالای اول</h1><img alt="product-image-0" src="/photo.webp"><script type="application/ld+json">{"@type":"Product","name":"کالای اول"}</script>'}):req.abort());
    await page.goto('https://'+host+first);
    await page.evaluate(()=>{window.messages=[];window.chrome={runtime:{sendMessage(m){window.messages.push(m)},getManifest(){return{name:'PIQO DEV'}},getURL(){return'about:blank'},onMessage:{addListener(){}}},storage:{local:{get(k,cb){cb({})},set(){}}}}});
    await page.addScriptTag({content});
    await page.waitForFunction(()=>window.messages.some(m=>m.product?.name==='کالای اول'));
    await page.evaluate(path=>{history.pushState({},'',path);document.querySelector('h1').textContent='کالای دوم';document.querySelector('script[type="application/ld+json"]').textContent=JSON.stringify({'@type':'Product',name:'کالای دوم'});},second);
    await page.waitForFunction(()=>window.messages.some(m=>m.product?.name==='کالای دوم'));
    const report=await page.evaluate(()=>({events:window.messages.map(m=>({type:m.type,url:m.url,name:m.product?.name})),product:window.messages.filter(m=>m.product).at(-1).product}));
    const reset=report.events.findIndex(m=>m.type==='PAGE_CHANGED'&&m.url.endsWith(second));
    assert.ok(reset>=0&&reset<report.events.findIndex(m=>m.name==='کالای دوم'),host+' clears page before new product');
    assert.equal(report.product.navigationUrl,'https://'+host+second);
    await page.evaluate(()=>{history.pushState({},'','/category');document.body.innerHTML='<h1>دسته بندی</h1>';});
    await page.waitForFunction(()=>window.messages.some(m=>m.type==='PAGE_CHANGED'&&m.url.endsWith('/category')));
    assert.equal(await page.$('#piqo-widget-container'),null,host+' removes old widget on non-product');
    await page.close();
  }
  console.log('SPA product changes and non-product invalidation passed on four site extractors');
}finally{await browser.close()}
