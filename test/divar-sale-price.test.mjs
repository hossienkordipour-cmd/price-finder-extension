import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
let content=await readFile(new URL('../content/content.js',import.meta.url),'utf8');
if(process.argv.includes('--without-fix')) content=content.replace('/^قیمت(?:\\s+(?:پایه|کل))?$/', '/^قیمت$/');
content=content.replace('function extractDivar() {','window.testExtractDivar = extractDivar; function extractDivar() {');
const browser=await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
try {
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>req.isNavigationRequest()?req.respond({status:200,contentType:'text/html',body:'<meta charset="utf-8"><h1>روا مدل۸۷ تمیز</h1><div class="kt-unexpandable-row"><p id="label" class="kt-unexpandable-row__title">قیمت پایه</p><p id="amount" class="kt-unexpandable-row__value">‏۳۷۲,۰۰۰,۰۰۰ تومان</p></div><div id="extra"></div><p>قسط ۱۰,۰۰۰,۰۰۰ تومان، قیمت در توضیحات ۸۰۰,۰۰۰,۰۰۰ تومان</p>'}):req.abort());
  await page.goto('https://divar.ir/v/roa/gaNDvAq_');
  await page.evaluate(()=>{window.messages=[];window.chrome={runtime:{sendMessage(m){window.messages.push(m)},getManifest(){return{name:'PIQO DEV'}},getURL(){return'about:blank'},onMessage:{addListener(){}}},storage:{local:{get(k,cb){cb({})},set(){}}}}});
  await page.addScriptTag({content});
  await page.waitForFunction(()=>window.messages.some(m=>m.product));
  assert.equal(await page.evaluate(()=>window.testExtractDivar().price),372000000,'Actual ROA base price row must be read');
  for(const [label,amount,expected] of [
    ['قیمت','۲۲۰,۰۰۰,۰۰۰ تومان (مقطوع)',220000000],
    ['قیمت کل','۳,۷۲۰,۰۰۰,۰۰۰ ریال',372000000],
    ['‏قيمت‌پايه :','٣٧٢٬٠٠٠٬٠٠٠ تومان',372000000],
    ['قیمت پایه','توافقی',null],['قیمت','مجانی',null],['قیمت','۳۷۲,۰۰۰,۰۰۰',null],
    ['قیمت هر متر مربع','۳۷۲,۰۰۰,۰۰۰ تومان',null],['ودیعه','۳۷۲,۰۰۰,۰۰۰ تومان',null],
    ['اجارهٔ ماهانه','۳۷۲,۰۰۰,۰۰۰ تومان',null],['قسط ماهانه','۳۷۲,۰۰۰,۰۰۰ تومان',null],
    ['کارکرد','۳۰۰۰۰۰',null],['قیمت پیشنهادی در توضیحات','۳۷۲,۰۰۰,۰۰۰ تومان',null],
  ]) {
    const actual=await page.evaluate(({label,amount})=>{document.querySelector('#label').textContent=label;document.querySelector('#amount').textContent=amount;return window.testExtractDivar().price;},{label,amount});
    assert.equal(actual,expected,label+' / '+amount);
  }
  await page.evaluate(()=>{document.querySelector('#label').textContent='قیمت پایه';document.querySelector('#amount').textContent='۳۷۲,۰۰۰,۰۰۰ تومان';document.querySelector('#extra').innerHTML='<div class="kt-unexpandable-row"><p class="kt-unexpandable-row__title">قیمت کل</p><p class="kt-unexpandable-row__value">۳۰۰,۰۰۰,۰۰۰ تومان</p></div>';});
  assert.equal(await page.evaluate(()=>window.testExtractDivar().price),null,'Conflicting total-price rows stay unknown');
  await page.evaluate(()=>document.querySelector('#extra').style.display='none');
  assert.equal(await page.evaluate(()=>window.testExtractDivar().price),372000000,'Hidden rows are ignored');
  console.log('Divar sale-price labels, units, negotiable, rent/installment exclusions and conflicts passed');
}finally{await browser.close()}
