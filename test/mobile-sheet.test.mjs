import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {tmpdir} from 'node:os';
import puppeteer from 'puppeteer-core';
const content=await readFile(new URL('../content/content.js',import.meta.url),'utf8');
const start=content.indexOf('function togglePiqoPopup(');
const popupCode=content.slice(start,content.indexOf('\nfunction injectFloatingButton()',start));
const allowed=['sidebar.html','sidebar.css','sidebar.js','primary-logo.png','assets/logo-character.png',...['Regular','SemiBold','Bold','ExtraBold'].map(w=>`YekanBakhFaNum-${w}.woff2`)];
const files=new Map(await Promise.all(allowed.map(async name=>['/sidebar/'+name,await readFile(new URL('../sidebar/'+name,import.meta.url))])));
files.set('/fixture.jpg',await readFile(new URL('../tutorial/assets/airpods-pro.jpg',import.meta.url)));
const server=http.createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/product') {res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html lang="fa" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#fafafa;font-family:Arial}header{background:white;padding:24px;font-size:24px}main{padding:24px}img{width:100%;max-width:480px}#piqo-widget-container{position:fixed;right:0;top:40%;z-index:2147483647}button{padding:12px}</style><header>فروشگاه نمونه</header><main><h1>هدفون بی‌سیم اپل AirPods Pro</h1><p>۱۲٬۴۹۰٬۰۰۰ تومان</p><img src="/fixture.jpg" alt=""><div style="height:1400px"></div></main><div id="piqo-widget-container"><button id="piqo-main-btn" aria-expanded="false">پیکو</button></div></html>');return;}
  if(!files.has(path)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg'})[extname(path)]);
  res.end(files.get(path));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const previews=join(tmpdir(),'piqo-mobile-sheet');await mkdir(previews,{recursive:true});
let browser;
try{
  browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.evaluateOnNewDocument(()=>{
    window.chrome={runtime:{getURL:path=>location.origin+'/'+path,onMessage:{addListener(){}},sendMessage(message,callback){
      const response=message.type==='GET_RECENT_HISTORY'?{history:[]}:{tabId:1,url:location.origin+'/product',state:null};
      callback?.(response);return Promise.resolve(response);
    }},tabs:{query(_options,callback){callback([{id:1,url:location.origin+'/product'}]);}}};
  });
  for(const [width,height] of [[390,844],[320,568],[600,800],[1280,800]]){
    await page.setViewport({width,height});await page.goto(origin+'/product');
    await page.addScriptTag({content:popupCode});
    await page.evaluate(()=>{document.documentElement.style.overflow='auto';document.querySelector('#piqo-main-btn').onclick=()=>togglePiqoPopup(false);});
    await page.click('#piqo-main-btn');
    await page.waitForSelector('#piqo-popup-iframe');
    const frame=await (await page.$('#piqo-popup-iframe')).contentFrame();
    await frame.waitForSelector('#sheet-handle');await frame.evaluate(()=>document.fonts.ready);
    const mobile=width<=600;
    await frame.waitForFunction(expected=>document.body.classList.contains('mobile-sheet')===expected,{},mobile);
    await page.waitForFunction(()=>{const m=new DOMMatrix(getComputedStyle(document.querySelector('iframe')).transform);return m.m41===0&&m.m42===0;});
    await frame.evaluate(origin=>{
      currentProduct={name:'هدفون بی‌سیم اپل مدل AirPods Pro',store:'دیجی‌کالا',price:12490000,image:origin+'/fixture.jpg'};
      currentProductEl.innerHTML=generateCardHtml(currentProduct,true);currentProductEl.classList.remove('hidden');
      document.querySelector('#guide-state').classList.add('hidden');document.querySelector('#empty-state').classList.add('hidden');
      resultsState.classList.remove('hidden');updateGuideNavigation();
      resultsListEl.innerHTML=Array.from({length:18},(_,i)=>generateCardHtml({...currentProduct,store:'فروشگاه '+(i+1),price:10890000+i*10000,url:origin+'/product'})).join('');
      document.querySelector('#results-count').textContent='۱۸ محصول';
    },origin);
    const geometry=await page.$eval('#piqo-popup-iframe',el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};});
    if(process.env.PIQO_MOBILE_AUDIT==='1'){
      await frame.evaluate(origin=>{
        allResults=Array.from({length:18},(_,i)=>({...currentProduct,store:'فروشگاه '+(i+1),price:10890000+i*10000,url:origin+'/product',condition:i%2?'used':'new',matchScore:i}));
        renderResults(allResults,false);
      },origin);
      await frame.click('#sort-filter .dropdown-header');
      await frame.click('#sort-filter [data-value="cheap"]');
      assert.equal(await frame.$eval('#sort-filter',el=>el.dataset.value),'cheap');
      await frame.click('#condition-filter .dropdown-header');
      await frame.click('#condition-filter [data-value="used"]');
      assert.match(await frame.$eval('#results-count',el=>el.textContent),/۹/);
      await frame.click('#condition-filter .clear-filter');
      assert.match(await frame.$eval('#results-count',el=>el.textContent),/۱۸/);
      await frame.click('.grid-icon-btn');
      assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Grid does not overflow horizontally');
      await frame.click('.grid-icon-btn');
      if(width===390){
        await page.evaluate(()=>{
          const probe=document.createElement('button');probe.id='background-focus-probe';probe.textContent='Background action';
          document.querySelector('#piqo-widget-container').before(probe);
        });
        await page.focus('#piqo-main-btn');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
        console.log('AUDIT background focus while mobile sheet is open:',await page.evaluate(()=>({active:document.activeElement.id,backdrop:getComputedStyle(document.querySelector('#piqo-popup-backdrop')).display})));
        await page.setViewport({width:844,height:390});
        await frame.waitForFunction(()=>!document.body.classList.contains('mobile-sheet'));
        console.log('AUDIT rotated phone 844x390:',await page.$eval('iframe',el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,mobile:el.piqoMobile,backdrop:getComputedStyle(document.querySelector('#piqo-popup-backdrop')).display})));
        await page.screenshot({path:join(previews,'audit-landscape.png')});
        await page.setViewport({width,height});await frame.waitForFunction(()=>document.body.classList.contains('mobile-sheet'));
      }
      console.log(`AUDIT filters, result count and list/grid passed at ${width}x${height}`);
    }
    if(mobile){
      assert.equal(geometry.x,0);assert.equal(geometry.width,width);assert.equal(geometry.bottom,height);
      assert.ok(Math.abs(geometry.height-height*.76)<2);
      assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'hidden');
      assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow inside phone sheet');
      await page.screenshot({path:join(previews,`mobile-${width}.png`)});
      await frame.click('#guide-nav-btn');
      assert.equal(await frame.$eval('body',el=>el.classList.contains('guide-page')),true);
      assert.equal(await frame.$eval('#sheet-handle',el=>getComputedStyle(el).display),'flex','Handle is available on the guide page');
      await frame.click('#guide-nav-btn');
      await frame.click('#sheet-handle');
      await page.waitForFunction(h=>Math.abs(document.querySelector('iframe').getBoundingClientRect().height-h*.94)<2,{},height);
      await frame.waitForFunction(()=>document.querySelector('#sheet-handle').getAttribute('aria-expanded')==='true');
      await frame.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
      const close=await frame.$eval('#popup-close-btn',el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom};});
      assert.ok(close.top>=0&&close.bottom<100,'Close button remains sticky while results scroll');
      if(width===390){
        await frame.evaluate(()=>window.scrollTo(0,0));
        const parent=await page.$eval('iframe',el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y}));
        const handle=await frame.$eval('#sheet-handle',el=>({x:el.getBoundingClientRect().x+el.clientWidth/2,y:el.getBoundingClientRect().y+el.clientHeight/2}));
        await page.mouse.move(parent.x+handle.x,parent.y+handle.y);await page.mouse.down();
        await page.mouse.move(parent.x+handle.x,parent.y+handle.y+100,{steps:8});await page.mouse.up();
        await page.waitForFunction(()=>document.querySelector('iframe').style.opacity==='0');
        await page.evaluate(()=>togglePiqoPopup(false));
      }
      await frame.click('#popup-close-btn');
      await page.waitForFunction(()=>document.querySelector('iframe').style.display==='none');
      assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'auto','Original page scrolling is restored');
      await page.click('#piqo-main-btn');
      await page.click('#piqo-popup-backdrop',{offset:{x:10,y:10}});
      await page.waitForFunction(()=>document.querySelector('iframe').style.opacity==='0');
      // Rapid reopen must survive the previous close timeout.
      await page.evaluate(()=>togglePiqoPopup(false));
      await new Promise(resolve=>setTimeout(resolve,350));
      assert.equal(await page.$eval('iframe',el=>el.style.display),'block');
      await page.setViewport({width:1000,height:800});
      await frame.waitForFunction(()=>!document.body.classList.contains('mobile-sheet'));
      assert.equal(await page.$eval('iframe',el=>el.getBoundingClientRect().width),382);
      assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'auto');
      await page.setViewport({width,height});await frame.waitForFunction(()=>document.body.classList.contains('mobile-sheet'));
      await frame.focus('#popup-close-btn');await page.keyboard.press('Escape');
      await page.waitForFunction(()=>document.querySelector('iframe').style.opacity==='0');
    }else{
      assert.equal(geometry.width,382);assert.equal(geometry.x,width-390);
      assert.equal(await frame.$eval('#sheet-handle',el=>getComputedStyle(el).display),'none');
      assert.equal(await page.$eval('#piqo-popup-backdrop',el=>getComputedStyle(el).display),'none');
    }
    await page.evaluate(()=>{const frame=document.querySelector('iframe');frame.piqoDestroy();frame.remove();});
    assert.equal(await page.$('#piqo-popup-backdrop'),null,'Removing UI cleans the backdrop');
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'auto');
  }
  await page.setViewport({width:390,height:844});await page.goto(origin+'/product');
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.addScriptTag({content:popupCode});await page.evaluate(()=>togglePiqoPopup(false));
  assert.equal(await page.$eval('iframe',el=>getComputedStyle(el).transitionDuration),'0s','Sheet opening honors reduced motion');
  await page.evaluate(()=>{const frame=document.querySelector('iframe');frame.piqoDestroy();frame.remove();});
  assert.deepEqual(errors,[]);
  console.log(`PASS: original extension bottom sheet, 320/390/600px, desktop unchanged, expand, scrolling, close, outside click, Escape, rapid reopen, resize and cleanup. Previews: ${previews}`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
